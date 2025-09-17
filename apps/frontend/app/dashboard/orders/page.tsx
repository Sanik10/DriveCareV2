// path: apps/frontend/app/dashboard/orders/page.tsx
'use client';

import { useEffect, useMemo, useState, type ComponentProps } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppLayout } from '@/components/app/AppLayout';
import { 
  Wrench, 
  Plus, 
  Search, 
  RefreshCw, 
  ChevronRight, 
  LayoutGrid, 
  List,
  Sparkles,
  TrendingUp,
  Filter
} from 'lucide-react';
import { useAuth } from '@/lib/hooks/use-auth';
import { ordersAPI } from '@/lib/api/orders';
import type { OrdersQuery, PaginatedOrdersResponse, OrderStatus, OrderResponse } from '@/lib/types/orders';
import { OrderCreateDialog } from '@/components/orders/order-create-dialog';
import { OrderKanban } from '@/components/orders/order-kanban';
import { StatusBadge } from '@/components/ui/status-badge';

export default function OrdersListPage() {
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PaginatedOrdersResponse | null>(null);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [openCreate, setOpenCreate] = useState(false);
  const [view, setView] = useState<'list' | 'board'>('board'); // по дефолту — Канбан
  const [kanbanRefreshKey, setKanbanRefreshKey] = useState(0);

  useEffect(() => setIsMounted(true), []);

  const query: OrdersQuery = useMemo(
    () => ({
      search: search || undefined,
      status: (status || undefined) as OrderStatus | undefined,
      page,
      limit,
    }),
    [search, status, page, limit],
  );

  useEffect(() => {
    if (!isMounted) return;
    if (authLoading) return;
    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }
    if (view !== 'list') return; // для списка — загрузка, канбан грузится сам внутри

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

  const onCreated = async () => {
    if (view === 'list') {
      setPage(1);
      const res = await ordersAPI.getOrders({ ...query, page: 1 });
      setData(res);
    } else {
      setKanbanRefreshKey((k) => k + 1);
    }
  };

  if (!isMounted) return null;
  if (authLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-muted-foreground">Загрузка...</span>
          </div>
        </div>
      </AppLayout>
    );
  }
  if (!isAuthenticated || !user) return null;

  const items = data?.items || [];

  const headerActions = (
    <div className="flex items-center gap-2">
      {/* View Toggle */}
      <Card className="p-1 glass-subtle border-border/30">
        <div className="flex items-center">
          <Button
            variant={view === 'board' ? 'default' : 'ghost'}
            size="sm"
            className={cn(
              "rounded-xl transition-all duration-300 text-xs px-3",
              view === 'board' 
                ? 'bg-gradient-primary text-white shadow-glass' 
                : 'btn-ghost-fixed hover:bg-muted/50'
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
                : 'btn-ghost-fixed hover:bg-muted/50'
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
        onClick={() => (view === 'list' ? setPage(1) : setKanbanRefreshKey((k) => k + 1))}
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
  );

  return (
    <AppLayout 
      title="Заказы" 
      description="Управление заказ-нарядами"
      icon={Wrench}
      actions={headerActions}
    >
      <div className="container mx-auto px-6 py-6 space-y-6">
        {/* Kanban Feature Badge */}
        {view === 'board' && (
          <Card className="p-4 glass border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-3xl">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-primary">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-primary">Интерактивная Канбан-доска</h3>
                <p className="text-sm text-muted-foreground">
                  Перетаскивайте заказы между колонками для изменения статусов. Удерживайте пробел для режима фокуса.
                </p>
              </div>
              <div className="ml-auto">
                <TrendingUp className="w-6 h-6 text-secondary" />
              </div>
            </div>
          </Card>
        )}

        {/* Search & Filters */}
        <Card className="p-4 glass border-border/30 rounded-3xl surface-glow">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Поиск по номеру/описанию/клиенту/авто"
                className="pl-9 h-10 rounded-2xl border-border/50 focus:border-primary/50 transition-all duration-300"
              />
              <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            </div>
            
            <div className="relative">
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as OrderStatus | '');
                  setPage(1);
                }}
                className="w-full h-10 rounded-2xl border border-border/50 bg-background text-sm px-3 focus:border-primary/50 transition-all duration-300"
              >
                <option value="">Все статусы</option>
                <option value="new">Новый</option>
                <option value="in_progress">В работе</option>
                <option value="awaiting_parts">Ожидание запчастей</option>
                <option value="completed">Завершен</option>
                <option value="canceled">Отменен</option>
              </select>
              <Filter className="w-4 h-4 absolute right-3 top-3 text-muted-foreground pointer-events-none" />
            </div>

            {view === 'list' && (
              <div className="flex gap-2">
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(parseInt(e.target.value, 10));
                    setPage(1);
                  }}
                  className="w-28 h-10 rounded-2xl border border-border/50 bg-background text-sm px-3 focus:border-primary/50 transition-all duration-300"
                >
                  {[10, 20, 50].map((n) => (
                    <option key={n} value={n}>
                      {n} / стр
                    </option>
                  ))}
                </select>
                <Button 
                  variant="outline" 
                  className="rounded-2xl btn-outline-fixed"
                  onClick={() => setPage(1)}
                >
                  Применить
                </Button>
              </div>
            )}
          </div>
        </Card>

        {/* Content */}
        {view === 'board' ? (
          <OrderKanban
            search={search}
            refreshKey={kanbanRefreshKey}
            onOrderOpen={(id) => router.push(`/dashboard/orders/${id}`)}
          />
        ) : (
          <Card className="p-0 glass border-border/30 rounded-3xl surface-glow overflow-hidden">
            {loading ? (
              <div className="p-6 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-surface-1/40 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : error ? (
              <div className="p-6 text-center text-destructive">{error}</div>
            ) : items.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground">
                <Wrench className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <h3 className="font-semibold mb-2">Заказы не найдены</h3>
                <p className="text-sm">Попробуйте изменить параметры поиска</p>
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {items.map((o) => (
                  <OrderRow key={o.id} order={o} />
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Pagination */}
        {view === 'list' && data && data.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Всего: {data.total || 0} заказов
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                className="rounded-2xl btn-outline-fixed"
                disabled={page <= 1} 
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Назад
              </Button>
              <span className="text-sm px-3 py-1 rounded-xl bg-surface-1/60">
                {page} / {data.totalPages}
              </span>
              <Button 
                variant="outline" 
                className="rounded-2xl btn-outline-fixed"
                disabled={page >= data.totalPages} 
                onClick={() => setPage((p) => p + 1)}
              >
                Далее
              </Button>
            </div>
          </div>
        )}
      </div>

      <OrderCreateDialog open={openCreate} onOpenChange={setOpenCreate} onCreated={onCreated} />
    </AppLayout>
  );
}

function OrderRow({ order }: { order: OrderResponse }) {
  type StatusBadgeProps = ComponentProps<typeof StatusBadge>;
  const badgeStatus = order.status as StatusBadgeProps['status'];

  return (
    <Link href={`/dashboard/orders/${order.id}`} className="block hover:bg-surface-1/30 transition-all duration-300 group">
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-primary/20 flex items-center justify-center group-hover:scale-105 transition-transform">
            <span className="text-primary text-sm font-semibold">
              {order.orderNumber.split('-').pop()}
            </span>
          </div>
          <div>
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

function cn(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
