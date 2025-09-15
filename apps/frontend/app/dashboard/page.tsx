// path: apps/frontend/app/dashboard/page.tsx
'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Users,
  Wrench,
  Calendar,
  FileText,
  Package,
  Settings,
  Car,
  Truck,
  Shield,
  TrendingUp,
  DollarSign,
  Clock,
  CheckCircle,
  AlertTriangle,
  Activity,
  BarChart3,
  Zap,
  Star,
  CreditCard,
} from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/lib/hooks/use-auth';
import styles from './dashboard.module.css';

type NavigatorExtra = Navigator & {
  connection?: { saveData?: boolean };
  deviceMemory?: number;
  hardwareConcurrency?: number;
};

function detectLowPerf(): boolean {
  if (typeof window === 'undefined') return false;
  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  const nav = navigator as NavigatorExtra;
  const saveData = nav?.connection?.saveData ?? false;
  const lowMemory = typeof nav?.deviceMemory === 'number' ? nav.deviceMemory <= 4 : false;
  const lowCPU = typeof nav?.hardwareConcurrency === 'number' ? nav.hardwareConcurrency <= 4 : false;

  // Allow manual override via localStorage: set item 'VFX' to 'off' or 'on'
  const override = (typeof window !== 'undefined' && window.localStorage?.getItem('VFX')) || null;
  if (override === 'off') return true;
  if (override === 'on') return false;

  return prefersReducedMotion || saveData || lowMemory || lowCPU;
}

export default function DashboardPage() {
  const { user, isLoading, isAuthenticated, error, logout, checkAuth, clearError } = useAuth();
  const router = useRouter();
  const redirectAttempted = useRef(false);
  const [isMounted, setIsMounted] = useState(false);
  const [vfxDisabled, setVfxDisabled] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // Determine if visual effects should be disabled for performance
    setVfxDisabled(detectLowPerf());
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    if (!isLoading && !isAuthenticated && !user && !error && !redirectAttempted.current) {
      redirectAttempted.current = true;
      router.push('/login');
    }
  }, [isMounted, isLoading, isAuthenticated, user, error, router]);

  useEffect(() => {
    if (isAuthenticated && user) {
      redirectAttempted.current = false;
    }
  }, [isAuthenticated, user]);

  const handleRetry = () => {
    clearError();
    checkAuth(true);
  };

  // Memoized quick stats must be declared before any early return
  const quickStats = useMemo(
    () => [
      { icon: Users, label: 'Клиенты', value: '247', color: 'primary' as const },
      { icon: Wrench, label: 'Заказы', value: '89', color: 'secondary' as const },
      { icon: DollarSign, label: 'Выручка', value: '₽1.2M', color: 'emerald-500' as const },
      { icon: TrendingUp, label: 'Рост', value: '+23%', color: 'accent' as const },
    ],
    []
  );

  if (!isMounted) return null;

  if (isLoading) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <div
          className="fixed inset-0 -z-10"
          style={{
            background: `
              radial-gradient(ellipse 600px 400px at 50% 30%, rgba(99, 102, 241, 0.08) 0%, transparent 70%),
              radial-gradient(ellipse 500px 500px at 80% 70%, rgba(14, 165, 233, 0.06) 0%, transparent 70%)
            `,
          }}
        />
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-6">
            <div className="relative">
              <div className="w-16 h-16 border-3 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
              <div
                className="absolute inset-0 w-16 h-16 border-2 border-secondary/20 border-b-secondary rounded-full animate-spin mx-auto"
                style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}
              />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-medium">Загрузка DriveCare</p>
              <p className="text-muted-foreground">Подготовка рабочего пространства...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        <div
          className="fixed inset-0 -z-10"
          style={{
            background: `radial-gradient(ellipse 600px 400px at 50% 50%, rgba(239, 68, 68, 0.05) 0%, transparent 70%)`,
          }}
        />
        <div className="flex items-center justify-center min-h-screen p-6">
          <Card className="p-8 max-w-md text-center space-y-6 glass border-border/30 rounded-3xl">
            <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-10 h-10 text-destructive" />
            </div>
            <div className="space-y-3">
              <h3 className="font-semibold text-xl">Ошибка подключения</h3>
              <p className="text-muted-foreground">{error}</p>
            </div>
            <div className="flex items-center justify-center gap-4">
              <Button onClick={handleRetry} className="rounded-2xl bg-gradient-primary hover:opacity-90">
                Попробовать снова
              </Button>
              <Link href="/login">
                <Button className="rounded-2xl btn-outline-fixed">Войти заново</Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background (lightweight gradients only) */}
      <div
        className="fixed inset-0 -z-10"
        style={{
          background: `
            radial-gradient(ellipse 700px 500px at 20% 20%, rgba(99, 102, 241, 0.08) 0%, transparent 70%),
            radial-gradient(ellipse 600px 600px at 80% 30%, rgba(14, 165, 233, 0.06) 0%, transparent 70%),
            radial-gradient(ellipse 500px 400px at 50% 90%, rgba(168, 85, 247, 0.05) 0%, transparent 70%)
          `,
        }}
      />

      {/* Optional lightweight VFX (auto-disabled on low perf) */}
      {!vfxDisabled && (
        <div className="fixed inset-0 -z-10 pointer-events-none">
          {/* Main glow nodes (reduced count) */}
          <div
            className={`absolute rounded-full ${styles.dataHubMain}`}
            style={{
              width: '160px',
              height: '160px',
              filter: 'blur(36px)',
              top: '15%',
              right: '10%',
              background:
                'radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, rgba(14, 165, 233, 0.08) 60%, transparent 100%)',
              willChange: 'transform',
            }}
          />
          <div
            className={`absolute rounded-full ${styles.dataNode1}`}
            style={{
              width: '110px',
              height: '110px',
              filter: 'blur(28px)',
              top: '62%',
              left: '8%',
              background:
                'radial-gradient(circle, rgba(0, 212, 170, 0.10) 0%, rgba(14, 165, 233, 0.06) 60%, transparent 100%)',
              willChange: 'transform',
            }}
          />

          {/* Minimal data stream */}
          <div
            className={`absolute ${styles.dataStream1}`}
            style={{
              width: '140px',
              height: '2px',
              top: '25%',
              right: '14%',
              background:
                'linear-gradient(45deg, rgba(99, 102, 241, 0.3) 0%, rgba(14, 165, 233, 0.15) 100%)',
              transform: 'rotate(-30deg)',
              willChange: 'opacity, transform',
              boxShadow: '0 0 6px rgba(99, 102, 241, 0.2)',
            }}
          />
        </div>
      )}

      {/* Header */}
      <header className="relative z-10 border-b border-border/30 backdrop-blur-md glass-subtle">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-gradient-primary shadow-glass">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gradient-primary">DriveCare</h1>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Activity className={`w-3 h-3 ${styles.dashboardPulse}`} />
                  Панель управления
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium flex items-center gap-2">
                  <span className={`w-2 h-2 bg-primary rounded-full ${styles.userStatusIndicator}`} />
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-muted-foreground">{user.role?.name || 'Пользователь'}</p>
              </div>
              <Button onClick={logout} className="rounded-2xl btn-ghost-fixed transition-all duration-300 hover:scale-105">
                Выйти
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-6 py-8">
        <div className="space-y-8">
          {/* Welcome Section */}
          <div className="text-center space-y-6">
            <div className="space-y-3">
              {!vfxDisabled && (
                <div className="flex items-center justify-center gap-3 mb-4">
                  <Star className={`w-6 h-6 text-primary ${styles.welcomeStar}`} />
                  <div
                    className={`w-12 h-0.5 bg-gradient-to-r from-primary to-secondary ${styles.welcomeLine}`}
                  />
                  <TrendingUp className={`w-6 h-6 text-secondary ${styles.welcomeTrend}`} />
                </div>
              )}
              <h2 className="text-4xl font-bold">
                Добро пожаловать, <span className="text-gradient-primary">{user.firstName}</span>!
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Ваша система управления автосервисом готова к работе. Начните с настройки основных разделов и просмотра
                аналитики.
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {quickStats.map((s, idx) => {
              const Icon = s.icon;
              const colorClass =
                s.color === 'primary'
                  ? 'text-primary bg-primary/20'
                  : s.color === 'secondary'
                  ? 'text-secondary bg-secondary/20'
                  : s.color === 'accent'
                  ? 'text-accent bg-accent/20'
                  : 'text-emerald-500 bg-emerald-500/20';
              return (
                <Card
                  key={idx}
                  className="p-4 glass border-border/30 rounded-2xl hover:shadow-glass transition-all duration-300 group"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl ${colorClass} flex items-center justify-center group-hover:scale-110 transition-transform`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{s.label}</p>
                      <p
                        className={`text-xl font-bold ${
                          s.color === 'emerald-500'
                            ? 'text-emerald-500'
                            : s.color === 'accent'
                            ? 'text-accent'
                            : s.color === 'secondary'
                            ? 'text-secondary'
                            : 'text-primary'
                        }`}
                      >
                        {s.value}
                      </p>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Main Modules Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Security */}
            <Link href="/dashboard/security">
              <Card
                className={`p-6 glass border-border/30 hover:shadow-glass-lg transition-all duration-500 group cursor-pointer rounded-3xl surface-glow ${styles.dashboardCardPriority}`}
              >
                <div className="space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-primary flex items-center justify-center group-hover:scale-110 transition-all duration-300 shadow-glass">
                    <Shield className="w-7 h-7 text-white" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">Безопасность</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Управление устройствами и двухфакторной аутентификацией
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-primary">
                    <CheckCircle className="w-3 h-3" />
                    <span>Активно</span>
                  </div>
                </div>
              </Card>
            </Link>

            {/* Orders */}
            <Link href="/dashboard/orders">
              <Card className="p-6 glass border-border/30 hover:shadow-glass-lg transition-all duration-500 group cursor-pointer rounded-3xl surface-glow">
                <div className="space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-secondary/20 border border-secondary/30 flex items-center justify-center group-hover:scale-110 transition-all duration-300">
                    <Wrench className="w-7 h-7 text-secondary" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">Заказы</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Управление заказами на ремонт и обслуживание
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="w-full rounded-2xl bg-secondary/10 hover:bg-secondary/20 text-secondary border-secondary/30"
                  >
                    Открыть
                  </Button>
                </div>
              </Card>
            </Link>

            {/* Customers */}
            <Link href="/dashboard/customers">
              <Card className="p-6 glass border-border/30 hover:shadow-glass-lg transition-all duration-500 group cursor-pointer rounded-3xl surface-glow">
                <div className="space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-accent/20 border border-accent/30 flex items-center justify-center group-hover:scale-110 transition-all duration-300">
                    <Users className="w-7 h-7 text-accent" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">Клиенты</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">База клиентов и история обслуживания</p>
                  </div>
                  <Button size="sm" className="w-full rounded-2xl bg-accent/10 hover:bg-accent/20 text-accent border-accent/30">
                    Открыть
                  </Button>
                </div>
              </Card>
            </Link>

            {/* Vehicles */}
            <Link href="/dashboard/vehicles">
              <Card className="p-6 glass border-border/30 hover:shadow-glass-lg transition-all duration-500 group cursor-pointer rounded-3xl surface-glow">
                <div className="space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center group-hover:scale-110 transition-all duration-300">
                    <Car className="w-7 h-7 text-emerald-500" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">Автомобили</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">Учет автомобилей и техническая информация</p>
                  </div>
                  <Button
                    size="sm"
                    className="w-full rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 border-emerald-500/30"
                  >
                    Открыть
                  </Button>
                </div>
              </Card>
            </Link>

            {/* Payment Methods */}
            <Link href="/dashboard/payment-methods">
              <Card className="p-6 glass border-border/30 hover:shadow-glass-lg transition-all duration-500 group cursor-pointer rounded-3xl surface-glow">
                <div className="space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center group-hover:scale-110 transition-all duration-300">
                    <CreditCard className="w-7 h-7 text-indigo-500" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">Способы оплаты</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">Методы оплаты и интеграции</p>
                  </div>
                  <Button
                    size="sm"
                    className="w-full rounded-2xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500 border-indigo-500/30"
                  >
                    Открыть
                  </Button>
                </div>
              </Card>
            </Link>

            {/* Invoices */}
            <Link href="/dashboard/invoices">
              <Card className="p-6 glass border-border/30 hover:shadow-glass-lg transition-all duration-500 group cursor-pointer rounded-3xl surface-glow">
                <div className="space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center group-hover:scale-110 transition-all duration-300">
                    <FileText className="w-7 h-7 text-indigo-500" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">Счета</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">Выставление счетов и управление оплатой</p>
                  </div>
                  <Button size="sm" className="w-full rounded-2xl">
                    Открыть
                  </Button>
                </div>
              </Card>
            </Link>

            {/* Appointments (подключено к дэшборду) */}
            <Link href="/dashboard/appointments">
              <Card className="p-6 glass border-border/30 hover:shadow-glass-lg transition-all duration-500 group cursor-pointer rounded-3xl surface-glow">
                <div className="space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center group-hover:scale-110 transition-all duration-300">
                    <Calendar className="w-7 h-7 text-purple-500" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">Записи</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">Планирование и управление записями</p>
                  </div>
                  <Button
                    size="sm"
                    className="w-full rounded-2xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-500 border-purple-500/30"
                  >
                    Открыть
                  </Button>
                </div>
              </Card>
            </Link>

            {/* Inventory */}
            <Card
              className={`p-6 glass border-border/30 hover:shadow-glass-lg transition-all duration-500 group rounded-3xl surface-glow ${styles.dashboardCardComingSoon}`}
            >
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center group-hover:scale-110 transition-all duration-300">
                  <Package className="w-7 h-7 text-orange-500" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">Склад</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">Управление запасами и остатками</p>
                </div>
                <Button size="sm" className="w-full rounded-2xl" disabled>
                  <Clock className="w-3 h-3 mr-2" />
                  Скоро
                </Button>
              </div>
            </Card>

            {/* Suppliers */}
            <Card
              className={`p-6 glass border-border/30 hover:shadow-glass-lg transition-all duration-500 group rounded-3xl surface-glow ${styles.dashboardCardComingSoon}`}
            >
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-slate-500/20 border border-slate-500/30 flex items-center justify-center group-hover:scale-110 transition-all duration-300">
                  <Truck className="w-7 h-7 text-slate-500" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">Поставщики</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">Управление поставщиками запчастей</p>
                </div>
                <Button size="sm" className="w-full rounded-2xl" disabled>
                  <Clock className="w-3 h-3 mr-2" />
                  Скоро
                </Button>
              </div>
            </Card>

            {/* Settings */}
            <Card
              className={`p-6 glass border-border/30 hover:shadow-glass-lg transition-all duration-500 group rounded-3xl surface-glow ${styles.dashboardCardComingSoon}`}
            >
              <div className="space-y-4">
                <div className="w-14 h-14 rounded-2xl bg-teал-500/20 border border-teal-500/30 flex items-center justify-center group-hover:scale-110 transition-all duration-300">
                  <Settings className="w-7 h-7 text-teal-500" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">Настройки</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">Настройка компании и пользователей</p>
                </div>
                <Button size="sm" className="w-full rounded-2xl" disabled>
                  <Clock className="w-3 h-3 mr-2" />
                  Скоро
                </Button>
              </div>
            </Card>
          </div>

          {/* Development Notice */}
          <Card className="p-8 glass border-border/30 text-center rounded-3xl surface-glow">
            <div className="space-y-6">
              <div
                className={`w-20 h-20 rounded-full bg-gradient-primary/20 flex items-center justify-center mx-auto ${styles.devNoticeGlow}`}
              >
                <Building2 className="w-10 h-10 text-primary" />
              </div>
              <div className="space-y-3">
                <h3 className="text-xl font-semibold flex items-center justify-center gap-2">
                  <Zap className="w-5 h-5 text-primary" />
                  DriveCare в активной разработке
                </h3>
                <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                  Мы работаем над полнофункциональной системой управления автосервисом. Новые возможности добавляются
                  каждую неделю.
                </p>
              </div>
              <div className="flex items-center justify-center gap-4">
                <Link href="/dashboard">
                  <Button className="rounded-2xl btn-outline-fixed transition-all duration-300 hover:scale-105">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Обновить
                  </Button>
                </Link>
                <Button
                  onClick={logout}
                  className="rounded-2xl bg-gradient-primary hover:opacity-90 transition-all duration-300 hover:scale-105"
                >
                  Выйти из системы
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
