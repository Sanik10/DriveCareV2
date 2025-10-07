// path: apps/frontend/app/dashboard/orders/page.tsx
'use client';

import { useEffect, useMemo, useState, type ComponentProps } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppLayout } from '@/components/app/AppLayout';
import { PageFeatureBadge } from '@/components/app/PageFeatureBadge';
import { PageFiltersCard, PageFiltersRow } from '@/components/app/PageFiltersCard';
import { PageContentCard } from '@/components/app/PageContentCard';
import { StatsCard, StatsGrid } from '@/components/app/StatsCard';
import { PaginationControls } from '@/components/app/PaginationControls';
import { 
  Wrench, 
  Plus, 
  Search, 
  RefreshCw, 
  ChevronRight, 
  LayoutGrid, 
  List,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  DollarSign,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import { useAuth } from '@/lib/hooks/use-auth';
import { ordersAPI } from '@/lib/api/orders';
import { cn } from '@/lib/utils';
import type { OrdersQuery, PaginatedOrdersResponse, OrderStatus, OrderResponse } from '@/lib/types/orders';
import { OrderCreateDialog } from '@/components/orders/order-create-dialog';
import { OrderKanban } from '@/components/orders/order-kanban';
import { StatusBadge } from '@/components/ui/status-badge';

export default function OrdersListPage() {
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // ✅ ВСЕ useState в начале
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PaginatedOrdersResponse | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [openCreate, setOpenCreate] = useState(false);
  const [view, setView] = useState<'list' | 'board'>('board');
  const [kanbanRefreshKey, setKanbanRefreshKey] = useState(0);

  // ✅ ВСЕ useMemo ДО условных return
  const query: OrdersQuery = useMemo(
    () => ({
      search: search || undefined,
      status: (status || undefined) as OrderStatus | undefined,
      page,
      limit,
    }),
    [search, status, page, limit],
  );

  const items = useMemo(() => data?.items || [], [data]);

  const stats = useMemo(() => {
    const total = data?.total || 0;
    const newCount = items.filter(o => o.status === 'new').length;
    const inProgress = items.filter(o => o.status === 'in_progress').length;
    const awaitingParts = items.filter(o => o.status === 'awaiting_parts').length;
    const completed = items.filter(o => o.status === 'completed').length;
    const totalRevenue = items.reduce((sum, o) => sum + (o.finalAmount || 0), 0);

    return { total, newCount, inProgress, awaitingParts, completed, totalRevenue };
  }, [data, items]);

  const headerActions = useMemo(() => (
    <div className="flex items-center gap-2">
      {/* View Toggle */}
      <Card className="p-1 glass-subtle border-border/30 rounded-xl">
        <div className="flex items-center">
          <Button
            variant={view === 'board' ? 'default' : 'ghost'}
            size="sm"
            className={cn(
              "rounded-xl transition-all duration-300 text-xs px-3",
              view === 'board' 
                ? 'bg-gradient-primary text-white shadow-glass' 
                : 'hover:bg-muted/50'
            )}
            onClick={() => setView('board')}
          >
            <LayoutGrid className="w-4 h-4 mr-1" />
            Канбан
          </Button>
          <Button
            variant={view === 'list' ? 'default' : 'ghost'}
            size="sm"
            className={cn(
              "rounded-xl transition-all duration-300 text-xs px-3",
              view === 'list' 
                ? 'bg-gradient-primary text-white shadow-glass' 
                : 'hover:bg-muted/50'
            )}
            onClick={() => setView('list')}
          >
            <List className="w-4 h-4 mr-1" />
            Список
          </Button>
        </div>
      </Card>

      <Button
        variant="outline"
        className="rounded-2xl btn-outline-fixed"
        onClick={handleRefresh}
      >
        <RefreshCw className="w-4 h-4 mr-2" />
        Обновить
      </Button>
      
      <Button 
        className="rounded-2xl bg-gradient-primary hover:opacity-90 transition-all duration-300 hover:scale-[1.02]"
        onClick={() => setOpenCreate(true)}
      >
        <Plus className="w-4 h-4 mr-2" />
        Новый заказ
      </Button>
    </div>
  ), [view]);

  // ✅ ВСЕ useEffect
  useEffect(() => setIsMounted(true), []);

  useEffect(() => {
    if (!isMounted) return;
    if (authLoading) return;
    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }
    if (view !== 'list') return;

    let cancelled = false;
    const DEBOUNCE_MS = 300;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await ordersAPI.getOrders(query);
        if (!cancelled) setData(res);
      } catch (e) {
        try {
          const parsed = JSON.parse((e as Error).message) as { message?: string };
          if (!cancelled) setError(parsed.message || 'Ошибка загрузки заказов');
        } catch {
          if (!cancelled) setError('Ошибка загрузки заказов');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isMounted, authLoading, isAuthenticated, user, router, query, view]);

  // ✅ Функции
  const onCreated = async () => {
    if (view === 'list') {
      setPage(1);
      const res = await ordersAPI.getOrders({ ...query, page: 1 });
      setData(res);
    } else {
      setKanbanRefreshKey((k) => k + 1);
    }
  };

  function handleRefresh() {
    if (view === 'list') {
      setPage(1);
      ordersAPI.getOrders({ ...query, page: 1 })
        .then(setData)
        .catch(console.error);
    } else {
      setKanbanRefreshKey((k) => k + 1);
    }
  }

  // ✅ ТОЛЬКО ТЕПЕРЬ условные return
  if (!isMounted) return null;
  
  if (authLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-muted-foreground">Загрузка заказов...</span>
          </div>
        </div>
      </AppLayout>
    );
  }
  
  if (!isAuthenticated || !user) return null;

  return (
    <AppLayout 
      title="Заказы" 
      description="Управление заказ-нарядами с Канбан-доской"
      icon={Wrench}
      actions={headerActions}
    >
      <div className="container mx-auto px-6 py-6 space-y-6">
        
        {/* Feature Badge */}
        <PageFeatureBadge
          variant="orange-amber"
          icon={view === 'board' ? LayoutGrid : List}
          title={view === 'board' ? "Интерактивная Канбан-доска" : "Список заказов"}
          description={
            view === 'board' 
              ? "Перетаскивайте заказы между колонками для изменения статусов. Удерживайте пробел для режима фокуса."
              : "Табличное представление с фильтрацией по статусам, поиском и сортировкой."
          }
          aside={<TrendingUp className="w-6 h-6 text-secondary" />}
        />

        {/* Stats */}
        <StatsGrid cols={6}>
          <StatsCard
            title="Всего заказов"
            value={stats.total}
            icon={Wrench}
            color="blue"
          />
          <StatsCard
            title="Новые"
            value={stats.newCount}
            icon={Sparkles}
            color="cyan"
          />
          <StatsCard
            title="В работе"
            value={stats.inProgress}
            icon={Clock}
            color="amber"
            highlight={stats.inProgress > 0}
          />
          <StatsCard
            title="Ожидание запчастей"
            value={stats.awaitingParts}
            icon={AlertTriangle}
            color="purple"
          />
          <StatsCard
            title="Завершено"
            value={stats.completed}
            icon={CheckCircle}
            color="emerald"
          />
          <StatsCard
            title="Выручка"
            value={Math.round(stats.totalRevenue).toLocaleString('ru-RU')}
            icon={DollarSign}
            color="default"
            suffix="₽"
          />
        </StatsGrid>

        {/* Filters */}
        <PageFiltersCard>
          <PageFiltersRow>
            <div className="relative">
              <Input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Поиск по номеру/описанию/клиенту/авто..."
                className="pl-9 h-10 rounded-2xl border-border/50 focus:border-primary/50 transition-all duration-300"
              />
              <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            </div>
            
            <div className="flex items-center gap-2">
              <select
                value={status}
                onChange={(e) => { setStatus(e.target.value as OrderStatus | ''); setPage(1); }}
                className="h-10 rounded-2xl border border-border/50 bg-background text-sm px-3 focus:border-primary/50 transition-all duration-300"
              >
                <option value="">Все статусы</option>
                <option value="new">Новый</option>
                <option value="in_progress">В работе</option>
                <option value="awaiting_parts">Ожидание запчастей</option>
                <option value="completed">Завершен</option>
                <option value="canceled">Отменен</option>
              </select>

              {view === 'list' && (
                <select
                  value={limit}
                  onChange={(e) => { setLimit(parseInt(e.target.value, 10)); setPage(1); }}
                  className="h-10 rounded-2xl border border-border/50 bg-background text-sm px-3 focus:border-primary/50 transition-all duration-300"
                >
                  {[10, 20, 50].map((n) => (
                    <option key={n} value={n}>{n} / стр</option>
                  ))}
                </select>
              )}
            </div>
          </PageFiltersRow>
        </PageFiltersCard>

        {/* Content */}
        {view === 'board' ? (
          <OrderKanban
            search={search}
            refreshKey={kanbanRefreshKey}
            onOrderOpen={(id) => router.push(`/dashboard/orders/${id}`)}
          />
        ) : (
          <>
            <PageContentCard
              loading={loading}
              error={error}
              empty={items.length === 0}
              emptyState={{
                icon: Wrench,
                title: 'Заказы не найдены',
                description: search 
                  ? 'Попробуйте изменить параметры поиска' 
                  : 'Создайте первый заказ-наряд',
                action: {
                  label: 'Создать заказ',
                  onClick: () => setOpenCreate(true),
                  icon: Plus,
                },
              }}
              onRetry={handleRefresh}
              loadingRows={5}
            >
              <div className="divide-y divide-border/30">
                {items.map((o) => (
                  <OrderRow key={o.id} order={o} />
                ))}
              </div>
            </PageContentCard>

            {/* Pagination */}
            <PaginationControls
              page={page}
              totalPages={data?.totalPages || 1}
              total={data?.total || 0}
              showing={items.length}
              onPageChange={setPage}
              itemLabel="заказов"
            />
          </>
        )}
      </div>

      <OrderCreateDialog open={openCreate} onOpenChange={setOpenCreate} onCreated={onCreated} />
    </AppLayout>
  );
}

// Order Row Component (уникальный для Orders)
function OrderRow({ order }: { order: OrderResponse }) {
  type StatusBadgeProps = ComponentProps<typeof StatusBadge>;
  const badgeStatus = order.status as StatusBadgeProps['status'];

  return (
    <Link href={`/dashboard/orders/${order.id}`} className="block hover:bg-surface-1/30 transition-all duration-300 group">
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-orange-500/20 to-amber-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
            <span className="text-orange-600 dark:text-orange-400 text-sm font-semibold">
              {order.orderNumber.split('-').pop()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <span className="font-medium">{order.orderNumber}</span>
              <StatusBadge status={badgeStatus} />
            </div>
            <div className="text-xs text-muted-foreground">
              {order.customer?.firstName || order.customer?.companyName || 'Клиент'} ·{' '}
              {order.vehicle?.licensePlate || order.vehicle?.vin || 'Авто'}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium">
            {(order.finalAmount || 0).toLocaleString('ru-RU')} ₽
          </div>
          <div className="text-xs text-muted-foreground">
            {new Date(order.createdAt).toLocaleDateString('ru-RU')}
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground ml-2 group-hover:translate-x-1 transition-transform" />
      </div>
    </Link>
  );
}
