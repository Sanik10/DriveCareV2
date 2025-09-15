// path: apps/frontend/app/dashboard/security/page.tsx
'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Shield, Smartphone, Monitor, Tablet,
  AlertTriangle, CheckCircle, Key, LogOut, RefreshCw, Home,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/lib/hooks/use-auth';
import { securityAPI } from '@/lib/api/security';
import type { SessionDevice } from '@/lib/types/security';
import { DeviceSessionCard } from '@/components/security/device-session-card';
import { TwoFactorAuthCard } from '@/components/security/two-factor-auth-card';
import { LogoutConfirmDialog } from '@/components/security/logout-confirm-dialog';

interface ApiError {
  message: string;
  statusCode?: number;
}

const isDebug = () => {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem('DEBUG_SECURITY') === '1';
  } catch {
    return false;
  }
};

export default function SecurityPage() {
  const { user, logout, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [logoutDialog, setLogoutDialog] = useState<{
    isOpen: boolean;
    deviceId?: string;
    deviceName?: string;
    isAllDevices?: boolean;
  }>({ isOpen: false });

  const [isMounted, setIsMounted] = useState(false);
  const loadingRef = useRef(false);
  const isMountedRef = useRef(false);

  useEffect(() => setIsMounted(true), []);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isMounted) return;
    if (authLoading) return;
    if (!isAuthenticated && !user) {
      if (isDebug()) console.log('[SecurityPage] Not authenticated, redirect to /login');
      router.push('/login');
    }
  }, [isAuthenticated, user, authLoading, router, isMounted]);

  const getDeviceIcon = useCallback(
    (deviceType: string): React.ComponentType<{ className?: string }> => {
      switch (deviceType?.toLowerCase()) {
        case 'mobile':
          return Smartphone;
        case 'tablet':
          return Tablet;
        case 'desktop':
        default:
          return Monitor;
      }
    },
    []
  );

  const formatLastActive = useCallback((date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Только что';
    if (minutes < 60) return `${minutes} мин назад`;
    if (hours < 24) return `${hours} ч назад`;
    return `${days} дн назад`;
  }, []);

  const loadSessions = useCallback(
    async (forceRefresh = false) => {
      if (!isAuthenticated || !user || authLoading || !isMounted) return;
      if (loadingRef.current && !forceRefresh) return;

      try {
        loadingRef.current = true;
        setIsLoading(true);
        if (isDebug()) console.log('[SecurityPage] Loading sessions, forceRefresh:', forceRefresh);

        const sessionsData = await securityAPI.getSessions(forceRefresh);
        if (!isMountedRef.current) return;

        // Предпочтительно берём deviceId из sessionStorage (эпемерно), затем fallback на localStorage
        let currentDeviceId: string | undefined = undefined;
        try {
          if (typeof window !== 'undefined') {
            currentDeviceId =
              window.sessionStorage.getItem('deviceId') ||
              window.localStorage.getItem('deviceId') ||
              undefined;
          }
        } catch {
          // ignore
        }

        const sessionsWithCurrent: SessionDevice[] = sessionsData.map((session) => ({
          ...session,
          isCurrentDevice: currentDeviceId ? session.deviceId === currentDeviceId : false,
        }));

        setSessions(sessionsWithCurrent);
      } catch (error: unknown) {
        if (!isMountedRef.current) return;

        const plainMsg = (error as Error)?.message || '';
        // Совместимость с apiRequest: определяем 401 по текстовому сообщению
        if (plainMsg.includes('401')) {
          await logout();
          router.push('/login');
          return;
        }

        try {
          const errorData = JSON.parse(plainMsg) as ApiError;
          if (errorData.statusCode === 401) {
            await logout();
            router.push('/login');
            return;
          }
          if (errorData.statusCode === 429) {
            if (isDebug()) console.warn('[SecurityPage] 429 Too Many Requests for sessions');
            return;
          }
          toast.error(errorData.message || 'Ошибка загрузки сессий');
        } catch {
          toast.error('Ошибка загрузки сессий');
        }
      } finally {
        if (isMountedRef.current) setIsLoading(false);
        loadingRef.current = false;
      }
    },
    [isAuthenticated, user, authLoading, logout, router, isMounted]
  );

  // Initial load and mount flags
  useEffect(() => {
    isMountedRef.current = true;

    if (isAuthenticated && user && !authLoading && isMounted) {
      loadSessions();
      setTwoFAEnabled(Boolean(user.twoFactorEnabled));
    }

    return () => {
      isMountedRef.current = false;
      loadingRef.current = false;
    };
  }, [isAuthenticated, user, authLoading, loadSessions, isMounted]);

  // Keep 2FA status in sync with user changes
  useEffect(() => {
    if (user && isMounted) {
      setTwoFAEnabled(Boolean(user.twoFactorEnabled));
    }
  }, [user, isMounted]);

  const sessionsCountLabel = useMemo(() => {
    const n = sessions.length;
    if (n === 1) return 'устройство';
    if (n >= 2 && n <= 4) return 'устройства';
    return 'устройств';
  }, [sessions.length]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadSessions(true);
    setIsRefreshing(false);
    toast.success('Список устройств обновлен');
  };

  const handleLogoutDevice = async (deviceId: string) => {
    try {
      await securityAPI.logoutDevice({ deviceId });
      toast.success('Устройство отключено');
      await loadSessions(true);
    } catch (error: unknown) {
      try {
        const errorData = JSON.parse((error as Error).message) as ApiError;
        toast.error(errorData.message || 'Ошибка отключения устройства');
      } catch {
        toast.error('Ошибка отключения устройства');
      }
    }
  };

  const handleLogoutAllDevices = async () => {
    try {
      await securityAPI.logoutAllDevices();
      toast.success('Все устройства отключены');
      await logout();
      router.push('/');
    } catch (error: unknown) {
      try {
        const errorData = JSON.parse((error as Error).message) as ApiError;
        toast.error(errorData.message || 'Ошибка отключения устройств');
      } catch {
        toast.error('Ошибка отключения устройств');
      }
    }
  };

  const confirmLogout = (deviceId?: string, deviceName?: string) => {
    setLogoutDialog({
      isOpen: true,
      deviceId,
      deviceName,
      isAllDevices: !deviceId,
    });
  };

  const executeLogout = async () => {
    const { deviceId, isAllDevices } = logoutDialog;
    if (isAllDevices) {
      await handleLogoutAllDevices();
    } else if (deviceId) {
      await handleLogoutDevice(deviceId);
    }
    setLogoutDialog({ isOpen: false });
  };

  const handle2FAStatusChange = async (enabled: boolean) => {
    setTwoFAEnabled(enabled);
  };

  if (!isMounted) return null;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-surface-1 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Проверка авторизации...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-surface-1">
      {/* Lightweight background glows */}
      <div className="fixed inset-0 bg-gradient-surface -z-10"></div>
      <div className="fixed top-0 right-0 w-72 h-72 bg-gradient-primary opacity-5 rounded-full blur-3xl -z-10"></div>
      <div className="fixed bottom-0 left-0 w-56 h-56 bg-secondary/10 rounded-full blur-3xl -z-10"></div>

      <header className="border-b border-border/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 p-2 rounded-lg bg-gradient-primary">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  Безопасность
                </h1>
                <p className="text-xs text-muted-foreground">
                  Управление устройствами и двухфакторной аутентификацией
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link href="/dashboard">
                <Button variant="ghost">
                  <Home className="w-4 h-4 mr-2" />
                  В дашборд
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing || loadingRef.current}>
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Обновить
              </Button>
              <Button variant="destructive" size="sm" onClick={() => confirmLogout()}>
                <LogOut className="w-4 h-4 mr-2" />
                Выйти везде
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="space-y-8">
          <TwoFactorAuthCard enabled={twoFAEnabled} onStatusChange={handle2FAStatusChange} />

          <Card className="p-6 backdrop-blur-sm bg-card/80 border-border/50">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-primary" />
                    Активные устройства
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Устройства, с которых выполнен вход в ваш аккаунт
                  </p>
                </div>
                <div className="text-sm text-muted-foreground">
                  {sessions.length} {sessionsCountLabel}
                </div>
              </div>

              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-24 bg-surface-1 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-8">
                  <Smartphone className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Активных сессий не найдено</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Это может означать, что ваши сессии были отключены
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sessions.map((session) => (
                    <DeviceSessionCard
                      key={session.id}
                      session={session}
                      onLogout={() => confirmLogout(session.deviceId, session.deviceName)}
                      getDeviceIcon={getDeviceIcon}
                      formatLastActive={formatLastActive}
                    />
                  ))}
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6 backdrop-blur-sm bg-card/80 border-border/50">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Shield className="w-5 h-5 text-secondary" />
                Рекомендации по безопасности
              </h3>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-emerald-700 dark:text-emerald-400">Включите 2FA</h4>
                      <p className="text-sm text-emerald-600 dark:text-emerald-500 mt-1">
                        Двухфакторная аутентификация защитит ваш аккаунт даже при компрометации пароля
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-amber-700 dark:text-amber-400">Следите за сессиями</h4>
                      <p className="text-sm text-amber-600 dark:text-amber-500 mt-1">
                        Регулярно проверяйте список активных устройств и отключайте неизвестные
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <div className="flex items-start gap-3">
                    <Key className="w-5 h-5 text-blue-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-700 dark:text-blue-400">Используйте сильные пароли</h4>
                      <p className="text-sm text-blue-600 dark:text-blue-500 mt-1">
                        Минимум 8 символов с буквами, цифрами и специальными символами
                      </p>
                    </div>
                  </div>
                </div>

                <div className="п-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
                  <div className="flex items-start gap-3">
                    <LogOut className="w-5 h-5 text-purple-500 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-purple-700 dark:text-purple-400">
                        Выходите с общих компьютеров
                      </h4>
                      <p className="text-sm text-purple-600 dark:text-purple-500 mt-1">
                        Всегда завершайте сессию при работе на чужих устройствах
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </main>

      <LogoutConfirmDialog
        isOpen={logoutDialog.isOpen}
        onClose={() => setLogoutDialog({ isOpen: false })}
        onConfirm={executeLogout}
        deviceName={logoutDialog.deviceName}
        isAllDevices={logoutDialog.isAllDevices}
      />
    </div>
  );
}
