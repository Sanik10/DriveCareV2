// path: apps/frontend/app/dashboard/security/page.tsx
'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield, 
  Smartphone, 
  Monitor, 
  Tablet,
  AlertTriangle, 
  CheckCircle, 
  Key, 
  LogOut, 
  RefreshCw,
  Sparkles,
  TrendingUp,
  Zap,
  Users,
  Lock
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AppLayout } from '@/components/app/AppLayout';
import { useAuth } from '@/lib/hooks/use-auth';
import { securityAPI } from '@/lib/api/security';
import type { SessionDevice } from '@/lib/types/security';
import { DeviceSessionCard } from '@/components/security/device-session-card';
import { TwoFactorAuthCard } from '@/components/security/two-factor-auth-card';
import { LogoutConfirmDialog } from '@/components/security/logout-confirm-dialog';
import { cn } from '@/lib/utils';

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
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-muted-foreground">Проверка авторизации...</span>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!isAuthenticated || !user) return null;

  const headerActions = (
    <div className="flex items-center gap-2">
      <Button 
        variant="outline" 
        onClick={handleRefresh} 
        disabled={isRefreshing || loadingRef.current}
        className="rounded-2xl btn-outline-fixed"
      >
        <RefreshCw className={cn("w-4 h-4 mr-2", isRefreshing && "animate-spin")} />
        Обновить
      </Button>
      <Button 
        variant="destructive" 
        onClick={() => confirmLogout()}
        className="rounded-2xl"
      >
        <LogOut className="w-4 h-4 mr-2" />
        Выйти везде
      </Button>
    </div>
  );

  return (
    <AppLayout
      title="Безопасность"
      description="Управление устройствами и двухфакторной аутентификацией"
      icon={Shield}
      actions={headerActions}
    >
      <div className="container mx-auto px-6 py-6 space-y-6">
        {/* Security Feature Badge */}
        <Card className="p-4 glass border-red-500/20 bg-gradient-to-r from-red-500/5 to-orange-500/5 rounded-3xl">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-r from-red-500 to-orange-500">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-red-600 dark:text-red-400">QR-коды и управление устройствами</h3>
              <p className="text-sm text-muted-foreground">
                Двухфакторная аутентификация с QR-кодами, мониторинг активных сессий и быстрое отключение устройств.
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Badge variant="outline" className="bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800/30">
                <CheckCircle className="w-3 h-3 mr-1" />
                2FA {twoFAEnabled ? 'ON' : 'OFF'}
              </Badge>
              <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/30">
                <Users className="w-3 h-3 mr-1" />
                {sessions.length} устройств
              </Badge>
            </div>
          </div>
        </Card>

        {/* Two Factor Authentication */}
        <TwoFactorAuthCard enabled={twoFAEnabled} onStatusChange={handle2FAStatusChange} />

        {/* Active Devices */}
        <Card className="p-6 glass border-border/30 rounded-3xl surface-glow">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-gradient-to-r from-blue-500/20 to-purple-500/20">
              <Smartphone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Активные устройства</h3>
              <p className="text-sm text-muted-foreground">
                Устройства, с которых выполнен вход в ваш аккаунт ({sessions.length} {sessionsCountLabel})
              </p>
            </div>
            <div className="ml-auto">
              <TrendingUp className="w-6 h-6 text-secondary" />
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 bg-surface-1/40 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8">
              <Smartphone className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="font-medium mb-2">Активных сессий не найдено</h3>
              <p className="text-sm text-muted-foreground">
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
        </Card>

        {/* Security Recommendations */}
        <Card className="p-6 glass border-border/30 rounded-3xl surface-glow">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20">
              <Shield className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Рекомендации по безопасности</h3>
              <p className="text-sm text-muted-foreground">Следуйте этим советам для защиты аккаунта</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <SecurityTip
              icon={CheckCircle}
              title="Включите 2FA"
              description="Двухфакторная аутентификация защитит ваш аккаунт даже при компрометации пароля"
              color="emerald"
              completed={twoFAEnabled}
            />

            <SecurityTip
              icon={AlertTriangle}
              title="Следите за сессиями"
              description="Регулярно проверяйте список активных устройств и отключайте неизвестные"
              color="amber"
            />

            <SecurityTip
              icon={Key}
              title="Используйте сильные пароли"
              description="Минимум 8 символов с буквами, цифрами и специальными символами"
              color="blue"
            />

            <SecurityTip
              icon={LogOut}
              title="Выходите с общих компьютеров"
              description="Всегда завершайте сессию при работе на чужих устройствах"
              color="purple"
            />
          </div>
        </Card>

        {/* Security Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 glass border-border/30 rounded-2xl hover:scale-[1.02] transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-500/20">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Активных устройств</div>
                <div className="text-xl font-bold">{sessions.length}</div>
              </div>
            </div>
          </Card>

          <Card className={cn(
            "p-4 glass border-border/30 rounded-2xl hover:scale-[1.02] transition-all duration-300",
            twoFAEnabled ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"
          )}>
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-xl",
                twoFAEnabled ? "bg-green-500/20" : "bg-red-500/20"
              )}>
                <Lock className={cn(
                  "w-5 h-5",
                  twoFAEnabled ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                )} />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">2FA статус</div>
                <div className="text-xl font-bold">{twoFAEnabled ? 'Включен' : 'Отключен'}</div>
              </div>
            </div>
          </Card>

          <Card className="p-4 glass border-border/30 rounded-2xl hover:scale-[1.02] transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-500/20">
                <Zap className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Текущий сеанс</div>
                <div className="text-xl font-bold">
                  {sessions.find(s => s.isCurrentDevice) ? 'Активен' : 'Неизвестен'}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <LogoutConfirmDialog
        isOpen={logoutDialog.isOpen}
        onClose={() => setLogoutDialog({ isOpen: false })}
        onConfirm={executeLogout}
        deviceName={logoutDialog.deviceName}
        isAllDevices={logoutDialog.isAllDevices}
      />
    </AppLayout>
  );
}

// Security Tip Component
function SecurityTip({
  icon: Icon,
  title,
  description,
  color = 'default',
  completed = false
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  color?: 'default' | 'emerald' | 'amber' | 'blue' | 'purple';
  completed?: boolean;
}) {
  const colorStyles = {
    default: 'bg-surface-1/40 border-border/30',
    emerald: 'bg-emerald-500/10 border-emerald-500/20',
    amber: 'bg-amber-500/10 border-amber-500/20',
    blue: 'bg-blue-500/10 border-blue-500/20',
    purple: 'bg-purple-500/10 border-purple-500/20',
  };

  const iconColorStyles = {
    default: 'text-muted-foreground',
    emerald: 'text-emerald-600 dark:text-emerald-400',
    amber: 'text-amber-600 dark:text-amber-400',
    blue: 'text-blue-600 dark:text-blue-400',
    purple: 'text-purple-600 dark:text-purple-400',
  };

  const titleColorStyles = {
    default: '',
    emerald: 'text-emerald-700 dark:text-emerald-400',
    amber: 'text-amber-700 dark:text-amber-400',
    blue: 'text-blue-700 dark:text-blue-400',
    purple: 'text-purple-700 dark:text-purple-400',
  };

  const descriptionColorStyles = {
    default: 'text-muted-foreground',
    emerald: 'text-emerald-600 dark:text-emerald-500',
    amber: 'text-amber-600 dark:text-amber-500',
    blue: 'text-blue-600 dark:text-blue-500',
    purple: 'text-purple-600 dark:text-purple-500',
  };

  return (
    <div className={cn(
      'p-4 rounded-2xl border transition-all duration-300 hover:scale-[1.02]',
      colorStyles[color],
      completed && 'ring-1 ring-emerald-500/20'
    )}>
      <div className="flex items-start gap-3">
        <div className={cn(
          'p-1.5 rounded-lg mt-0.5',
          color === 'emerald' ? 'bg-emerald-500/20' :
          color === 'amber' ? 'bg-amber-500/20' :
          color === 'blue' ? 'bg-blue-500/20' :
          color === 'purple' ? 'bg-purple-500/20' :
          'bg-surface-1/40'
        )}>
          <Icon className={cn('w-4 h-4', iconColorStyles[color])} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className={cn('font-medium text-sm', titleColorStyles[color])}>
              {title}
            </h4>
            {completed && (
              <CheckCircle className="w-4 h-4 text-emerald-500" />
            )}
          </div>
          <p className={cn('text-sm', descriptionColorStyles[color])}>
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}
