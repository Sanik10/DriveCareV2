// path: apps/frontend/app/dashboard/orders/page.tsx
'use client';

import { useEffect, useMemo, useState, type ComponentProps } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Building2, Plus, Search, RefreshCw, ChevronRight, LayoutGrid, List } from 'lucide-react';
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }
  if (!isAuthenticated || !user) return null;

  const items = data?.items || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-surface-1">
      <div className="fixed inset-0 bg-gradient-surface -z-10"></div>
      <div className="fixed top-0 right-0 w-96 h-96 bg-gradient-primary opacity-5 rounded-full blur-3xl -z-10"></div>
      <div className="fixed bottom-0 left-0 w-64 h-64 bg-secondary/10 rounded-full blur-3xl -z-10"></div>

      <header className="border-b border-border/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-primary">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">Заказы</h1>
              <p className="text-xs text-muted-foreground">Управление заказ-нарядами</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center rounded-md border border-border/50 p-0.5">
              <Button
                variant={view === 'board' ? 'default' : 'ghost'}
                size="sm"
                className="gap-1"
                onClick={() => setView('board')}
              >
                <LayoutGrid className="w-4 h-4" /> Канбан
              </Button>
              <Button
                variant={view === 'list' ? 'default' : 'ghost'}
                size="sm"
                className="gap-1"
                onClick={() => setView('list')}
              >
                <List className="w-4 h-4" /> Список
              </Button>
            </div>
            <Button
              variant="outline"
              onClick={() => (view === 'list' ? setPage(1) : setKanbanRefreshKey((k) => k + 1))}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Обновить
            </Button>
            <Button onClick={() => setOpenCreate(true)}>
              <Plus className="w-4 h-4 mr-2" /> Новый заказ
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-6 space-y-6">
        <Card className="p-4 backdrop-blur-sm bg-card/80 border-border/50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Поиск по номеру/описанию/клиенту/авто"
                className="pl-9"
              />
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
            </div>
            <div>
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as OrderStatus | '');
                  setPage(1);
                }}
                className="w-full h-9 rounded-md border border-border bg-background text-sm px-3"
              >
                <option value="">Все статусы</option>
                <option value="new">Новый</option>
                <option value="in_progress">В работе</option>
                <option value="awaiting_parts">Ожидание запчастей</option>
                <option value="completed">Завершен</option>
                <option value="canceled">Отменен</option>
              </select>
            </div>
            {view === 'list' && (
              <div className="flex gap-2">
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(parseInt(e.target.value, 10));
                    setPage(1);
                  }}
                  className="w-28 h-9 rounded-md border border-border bg-background text-sm px-3"
                >
                  {[10, 20, 50].map((n) => (
                    <option key={n} value={n}>
                      {n} / стр
                    </option>
                  ))}
                </select>
                <Button variant="outline" onClick={() => setPage(1)}>
                  Применить
                </Button>
              </div>
            )}
          </div>
        </Card>

        {view === 'board' ? (
          <OrderKanban
            search={search}
            refreshKey={kanbanRefreshKey}
            onOrderOpen={(id) => router.push(`/dashboard/orders/${id}`)}
          />
        ) : (
          <Card className="p-0 backdrop-blur-sm bg-card/80 border-border/50 overflow-hidden">
            {loading ? (
              <div className="p-6 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-surface-1 rounded-md animate-pulse" />
                ))}
              </div>
            ) : error ? (
              <div className="p-6 text-center text-destructive">{error}</div>
            ) : items.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground">Заказы не найдены</div>
            ) : (
              <div className="divide-y divide-border/60">
                {items.map((o) => (
                  <OrderRow key={o.id} order={o} />
                ))}
              </div>
            )}
          </Card>
        )}

        {view === 'list' && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">Всего: {data?.total || 0}</div>
            <div className="flex items-center gap-2">
              <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                Назад
              </Button>
              <div className="text-sm">
                Стр. {page} / {data?.totalPages || 1}
              </div>
              <Button variant="outline" disabled={page >= (data?.totalPages || 1)} onClick={() => setPage((p) => p + 1)}>
                Далее
              </Button>
            </div>
          </div>
        )}
      </main>

      <OrderCreateDialog open={openCreate} onOpenChange={setOpenCreate} onCreated={onCreated} />
    </div>
  );
}

function OrderRow({ order }: { order: OrderResponse }) {
  type StatusBadgeProps = ComponentProps<typeof StatusBadge>;
  const badgeStatus = order.status as StatusBadgeProps['status'];

  return (
    <Link href={`/dashboard/orders/${order.id}`} className="block hover:bg-surface-1/60 transition-colors">
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-gradient-primary/20 flex items-center justify-center">
            <span className="text-primary text-sm font-semibold">{order.orderNumber.split('-').pop()}</span>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <span className="font-medium">{order.orderNumber}</span>
              <StatusBadge status={badgeStatus} />
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {order.customer?.firstName || order.customer?.companyName || 'Клиент'} ·{' '}
              {order.vehicle?.licensePlate || order.vehicle?.vin || 'Авто'}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium">{(order.finalAmount || 0).toLocaleString('ru-RU')} ₽</div>
          <div className="text-xs text-muted-foreground">
            {new Date(order.createdAt).toLocaleDateString('ru-RU')}
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground ml-2" />
      </div>
    </Link>
  );
}
