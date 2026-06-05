// path: apps/frontend/app/dashboard/page.tsx
'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2, Users, Wrench, Calendar, FileText, Package, Settings, Car, Truck, 
  Shield, DollarSign, Clock, Activity, Star, BookOpen, ArrowUpRight, Package2, 
  AlertCircle, Inbox, LogOut
} from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge, OrderStatus } from '@/components/ui/status-badge';
import { useAuth } from '@/lib/hooks/use-auth';
import { dashboardAPI, DashboardStats } from '@/lib/api/dashboard';
import { getRoleLabel } from '@/lib/utils/role-labels';
import { StatsCard, StatsGrid } from '@/components/app/StatsCard';

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `₽${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `₽${(value / 1_000).toFixed(1)}K`;
  return `₽${value.toLocaleString('ru-RU')}`;
}

function getOrderCustomerLabel(order: any): string {
  const v = order?.customerName ?? order?.customer
  if (typeof v === "string" && v.trim()) return v.trim()

  if (v && typeof v === "object") {
    const fullName = [v.firstName, v.lastName].filter(Boolean).join(" ").trim()
    return fullName || v.name || v.title || "Клиент"
  }

  return "Клиент"
}

function getOrderVehicleLabel(order: any): string {
  const v = order?.vehicleInfo ?? order?.vehicle ?? order?.car ?? order?.auto
  if (!v) return "Нет авто"
  if (typeof v === "string") return v

  if (v && typeof v === "object") {
    const brand = v.brand ?? v.make ?? v.manufacturer
    const model = v.model ?? v.modelName
    const plate = v.plateNumber ?? v.plate ?? v.regNumber

    const head = [brand, model].filter(Boolean).join(" ").trim()
    if (head && plate) return `${head} • ${plate}`
    return head || plate || v.vin || "Автомобиль"
  }

  return String(v)
}

function getOrderAmount(order: any): number {
  const raw = order?.amount ?? order?.totalAmount ?? order?.total ?? 0
  return Number(raw) || 0
}

function getOrderStatus(order: any): any {
  // На случай, если статус приходит объектом
  const s = order?.status
  if (typeof s === "string") return s
  if (s && typeof s === "object") return s.code ?? s.name ?? s.status ?? "draft"
  return "draft"
}

function formatRelativeRu(iso?: string) {
  if (!iso) return ""
  const d = new Date(iso)
  const diffMs = Date.now() - d.getTime()
  if (!Number.isFinite(diffMs)) return ""

  const minutes = Math.round(diffMs / 60000)
  const rtf = new Intl.RelativeTimeFormat("ru", { numeric: "auto" })

  if (Math.abs(minutes) < 60) return rtf.format(-minutes, "minute")
  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) return rtf.format(-hours, "hour")
  const days = Math.round(hours / 24)
  return rtf.format(-days, "day")
}

function KPISkeleton() {
  return (
    <Card className="h-[124px] p-lg flex flex-col justify-between w-full">
      <div className="flex justify-between items-center w-full">
        <div className="h-4 w-20 bg-muted animate-pulse rounded-md" />
        <div className="h-4 w-4 bg-muted animate-pulse rounded-md" />
      </div>
      <div className="space-y-2 mt-auto w-full">
        <div className="h-7 w-24 bg-muted animate-pulse rounded-md" />
        <div className="h-3 w-32 bg-muted animate-pulse rounded-md" />
      </div>
    </Card>
  );
}

function RecentOrdersWidget() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardAPI.getRecentOrdersSafe().then((data) => {
      setOrders(data);
      setLoading(false);
    });
  }, []);

  return (
    <Card className="flex flex-col h-full w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-sm border-b border-border/50">
        <div className="flex items-center gap-sm text-foreground">
          <Wrench className="w-4 h-4 text-muted-foreground" />
          <CardTitle className="text-base">Последние заказы</CardTitle>
        </div>
        <Button variant="ghost" size="sm" asChild className="h-8 -mr-3 text-muted-foreground hover:text-foreground">
          <Link href="/dashboard/orders">Все <ArrowUpRight className="w-3 h-3 ml-1" /></Link>
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-xs p-md pt-sm w-full">
        {loading ? (
          [1, 2, 3].map((i) => <div key={i} className="h-14 bg-surface-2 animate-pulse rounded-md w-full" />)
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-section text-center w-full">
            <div className="p-md rounded-full border bg-surface-2 text-muted-foreground mb-md"><Inbox className="w-5 h-5" /></div>
            <p className="text-sm font-medium text-foreground mb-xs">Заказов пока нет</p>
            <Button variant="primary" size="sm" asChild><Link href="/dashboard/orders/new">Создать заказ</Link></Button>
          </div>
        ) : (
          orders.slice(0, 5).map((order) => (
            <Link key={order.id} href={`/dashboard/orders/${order.id}`} className="block w-full">
              <div className="flex items-center justify-between p-sm rounded-md hover:bg-surface-2 transition-colors group cursor-pointer border border-transparent hover:border-border/50 w-full">
                <div className="flex items-center gap-md min-w-0 flex-1">
                  <div className="w-8 h-8 rounded bg-surface-2 border flex items-center justify-center flex-shrink-0 text-muted-foreground group-hover:text-primary transition-colors">
                    <Wrench className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex items-baseline gap-sm min-w-0">
                      {order.orderNumber && (
                        <span className="text-xs font-mono text-muted-foreground shrink-0">
                          {order.orderNumber}
                        </span>
                      )}

                      <span className="text-sm font-medium text-foreground truncate">
                        {getOrderCustomerLabel(order)}
                      </span>
                    </div>

                    <span className="text-xs text-muted-foreground truncate">
                      {getOrderVehicleLabel(order)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end flex-shrink-0 ml-md">
                  <span className="text-sm font-semibold tabular-nums">
                    {formatCurrency(getOrderAmount(order))}
                  </span>

                  <div className="mt-1 flex items-center gap-sm">
                    <StatusBadge status={getOrderStatus(order) as OrderStatus} />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatRelativeRu(order.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function LowStockWidget() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardAPI.getLowStockAlertsSafe().then((data) => {
      setAlerts(data);
      setLoading(false);
    });
  }, []);

  return (
    <Card className="flex flex-col h-full w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-sm border-b border-border/50">
        <div className="flex items-center gap-sm text-foreground">
          <Package2 className="w-4 h-4 text-muted-foreground" />
          <CardTitle className="text-base">Внимание: Остатки</CardTitle>
        </div>
        {alerts.length > 0 && <Badge variant="error" className="h-5">{alerts.length}</Badge>}
      </CardHeader>
      <CardContent className="flex flex-col gap-xs p-md pt-sm w-full">
        {loading ? (
          [1, 2, 3].map((i) => <div key={i} className="h-12 bg-surface-2 animate-pulse rounded-md w-full" />)
        ) : alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-section text-center w-full">
            <div className="p-md rounded-full border bg-surface-2 text-muted-foreground mb-md"><Activity className="w-5 h-5" /></div>
            <p className="text-sm font-medium text-foreground">Все запчасти в наличии</p>
          </div>
        ) : (
          alerts.slice(0, 5).map((alert) => (
            <div key={alert.id} className="flex items-center justify-between p-sm rounded-md bg-status-error/5 border border-status-error/20 w-full">
              <div className="flex items-center gap-md min-w-0 flex-1">
                <AlertCircle className="w-4 h-4 text-status-error flex-shrink-0" />
                <span className="text-sm font-medium text-foreground truncate">{alert.partName}</span>
              </div>
              <span className="text-xs font-medium text-status-error whitespace-nowrap ml-md">
                {alert.currentStock} / {alert.minThreshold} шт
              </span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { user, isLoading, isAuthenticated, error, logout, checkAuth } = useAuth();
  const router = useRouter();
  const redirectAttempted = useRef(false);
  const [isMounted, setIsMounted] = useState(false);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => { setIsMounted(true); }, []);

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
      dashboardAPI.getStatsSafe().then((data) => {
        setStats(data);
        setStatsLoading(false);
      });
    }
  }, [isAuthenticated, user]);

  const isPlatformAdmin = useMemo(() => {
    const role = user?.role?.name?.toLowerCase();
    return role === 'superadmin' || role === 'platform_admin';
  }, [user?.role?.name]);

  if (!isMounted) return null;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-center">
        <Activity className="w-8 h-8 text-primary animate-pulse mb-md" />
        <p className="text-sm font-medium text-foreground">Загрузка рабочего пространства</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-xl">
        <Card className="max-w-md w-full p-section text-center">
          <AlertCircle className="w-8 h-8 text-status-error mx-auto mb-md" />
          <h3 className="font-semibold text-lg mb-xs">Ошибка подключения</h3>
          <p className="text-sm text-muted-foreground mb-lg">{error}</p>
          <div className="flex flex-col gap-sm">
            <Button onClick={() => checkAuth(true)} variant="primary">Попробовать снова</Button>
            <Button onClick={() => router.push('/login')} variant="ghost">Войти заново</Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border w-full">
        <div className="container mx-auto px-lg h-14 flex items-center justify-between">
          <div className="flex items-center gap-md">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center text-primary-foreground">
              <Building2 className="w-3.5 h-3.5" />
            </div>
            <span className="font-semibold text-sm tracking-tight">DriveCare Workspace</span>
          </div>

          <div className="flex items-center gap-md">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium leading-none">{user.firstName} {user.lastName}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{getRoleLabel(user.role?.name || 'viewer')}</p>
            </div>
            <Button onClick={logout} variant="ghost" size="icon" title="Выйти" className="text-muted-foreground hover:text-status-error">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-lg py-xl max-w-7xl w-full">
        <div className="mb-section w-full">
          <h1 className="text-2xl font-bold tracking-tight mb-xs">Обзор бизнеса</h1>
          <p className="text-sm text-muted-foreground">Добро пожаловать. Ключевые показатели автосервиса на сегодня.</p>
        </div>

        <StatsGrid cols={4}>
          {statsLoading ? (
            [1, 2, 3, 4].map((i) => <KPISkeleton key={i} />)
          ) : stats ? (
            <>
              <StatsCard title="Активные клиенты" value={stats.activeCustomers} icon={Users} suffix="чел." />

              <StatsCard
                title="Всего заказов"
                value={stats.totalOrders}
                icon={Wrench}
                suffix="шт."
                meta={`В работе: ${stats.pendingOrders}`}
              />

              <StatsCard
                title="Выручка (30 дней)"
                value={formatCurrency(stats.monthlyRevenue)}
                icon={DollarSign}
                meta={`Всего: ${formatCurrency(stats.totalRevenue)}`}
              />

              <StatsCard title="Низкие остатки" value={stats.lowStockItems} icon={Package2} suffix="позиций" />
            </>
          ) : null}
        </StatsGrid>

        {/* Добавлено w-full для виджетов */}
        <div className="grid lg:grid-cols-2 gap-lg mb-section w-full">
          <RecentOrdersWidget />
          <LowStockWidget />
        </div>

        <div className="mb-lg w-full">
          <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-md">Управление</h2>
          {/* Добавлено w-full для грида модулей */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-md w-full">
            
            {[
              { title: 'Заказы', desc: 'Управление ремонтом', icon: Wrench, href: '/dashboard/orders' },
              { title: 'Клиенты', desc: 'База и история', icon: Users, href: '/dashboard/customers' },
              { title: 'Автомобили', desc: 'Учет ТС', icon: Car, href: '/dashboard/vehicles' },
              { title: 'Услуги', desc: 'Каталог работ', icon: Activity, href: '/dashboard/services' },
              { title: 'Записи', desc: 'Планирование', icon: Calendar, href: '/dashboard/appointments' },
              { title: 'Счета', desc: 'Оплаты и биллинг', icon: FileText, href: '/dashboard/invoices' },
              { title: 'Безопасность', desc: 'Доступ и 2FA', icon: Shield, href: '/dashboard/security' },
              { title: 'Сотрудники', desc: 'Штат и роли', icon: Users, href: '/dashboard/users' },
            ].map((module, idx) => (
              // ЛЮТЫЙ ХАК ДЛЯ SAFARI: flex flex-col w-full h-full на Link, flex-1 на Card
              <Link key={idx} href={module.href} className="flex flex-col w-full h-full">
                <Card className="p-lg flex flex-col hover:border-primary/40 transition-colors cursor-pointer shadow-sm group w-full flex-1">
                  <div className="w-8 h-8 rounded-md bg-surface-2 border text-muted-foreground flex items-center justify-center mb-md group-hover:text-primary transition-colors">
                    <module.icon className="w-4 h-4" />
                  </div>
                  <h3 className="font-medium text-sm text-foreground">{module.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{module.desc}</p>
                </Card>
              </Link>
            ))}

            {[
              { title: 'Склад', desc: 'Управление запасами', icon: Package },
              { title: 'Поставщики', desc: 'Закупки деталей', icon: Truck },
              { title: 'Настройки', desc: 'Конфигурация', icon: Settings },
            ].map((module, idx) => (
              <Card key={`soon-${idx}`} className="p-lg flex flex-col bg-surface-2/50 border-dashed opacity-70 w-full h-full">
                <div className="w-8 h-8 rounded-md bg-surface-2 border text-muted-foreground flex items-center justify-center mb-md">
                  <module.icon className="w-4 h-4" />
                </div>
                <h3 className="font-medium text-sm text-foreground">{module.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">В разработке</p>
                </div>
              </Card>
            ))}

          </div>
        </div>

        {isPlatformAdmin && (
          <div className="mb-section pt-lg border-t border-border w-full">
            <h2 className="text-sm font-semibold text-status-progress uppercase tracking-wider mb-md">Платформа (Admin)</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-md w-full">
              <Link href="/platform/tariffs" className="flex flex-col w-full h-full">
                <Card className="p-lg flex flex-col hover:border-status-progress/40 transition-colors cursor-pointer shadow-sm group w-full flex-1">
                  <div className="w-8 h-8 rounded-md bg-status-progress/10 text-status-progress border border-status-progress/20 flex items-center justify-center mb-md">
                    <Star className="w-4 h-4" />
                  </div>
                  <h3 className="font-medium text-sm text-foreground">Тарифы (Backoffice)</h3>
                  <p className="text-xs text-muted-foreground mt-1">Управление планами</p>
                </Card>
              </Link>
              <Link href="/platform/catalogue" className="flex flex-col w-full h-full">
                <Card className="p-lg flex flex-col hover:border-status-progress/40 transition-colors cursor-pointer shadow-sm group w-full flex-1">
                  <div className="w-8 h-8 rounded-md bg-status-progress/10 text-status-progress border border-status-progress/20 flex items-center justify-center mb-md">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <h3 className="font-medium text-sm text-foreground">Каталог (Backoffice)</h3>
                  <p className="text-xs text-muted-foreground mt-1">Бренды и модели ТС</p>
                </Card>
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
