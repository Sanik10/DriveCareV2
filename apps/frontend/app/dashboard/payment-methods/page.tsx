// path: apps/frontend/app/dashboard/payment-methods/page.tsx
'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useAuth } from '@/lib/hooks/use-auth';

import { CreditCard, Search, RefreshCw, Pencil, Power, Trash2, Plus } from 'lucide-react';
import { paymentMethodsAPI } from '@/lib/api/payment-methods';
import type {
  PaymentMethodType,
  PaymentMethodResponse,
  PaymentMethodsQuery,
  PaginatedPaymentMethodsUI,
} from '@/lib/types/payment-methods';

const PAYMENT_METHOD_TYPES: { value: PaymentMethodType; label: string }[] = [
  { value: 'cash', label: 'Наличные' },
  { value: 'card', label: 'Банковская карта' },
  { value: 'bank_transfer', label: 'Банковский перевод' },
  { value: 'installments', label: 'Рассрочка' },
  { value: 'corporate', label: 'Корпоративный' },
  { value: 'digital_wallet', label: 'Цифровой кошелёк' },
  { value: 'cryptocurrency', label: 'Криптовалюта' },
];

const SORT_OPTIONS = [
  { value: '', label: 'Без сортировки' },
  { value: 'name:ASC', label: 'Название (A→Z)' },
  { value: 'name:DESC', label: 'Название (Z→A)' },
  { value: 'type:ASC', label: 'Тип (A→Z)' },
  { value: 'type:DESC', label: 'Тип (Z→A)' },
  { value: 'createdAt:DESC', label: 'Новые сверху' },
  { value: 'createdAt:ASC', label: 'Старые сверху' },
  { value: 'updatedAt:DESC', label: 'Недавно изменённые' },
  { value: 'updatedAt:ASC', label: 'Давно изменённые' },
  { value: 'transactionCount:DESC', label: 'Транзакций (DESC)' },
  { value: 'transactionCount:ASC', label: 'Транзакций (ASC)' },
];

export default function PaymentMethodsPage() {
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const roleName = user?.role?.name || '';
  const canManage = ['company_owner', 'company_admin', 'owner', 'admin'].includes(roleName);

  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PaginatedPaymentMethodsUI | null>(null);

  const [search, setSearch] = useState('');
  const [type, setType] = useState<PaymentMethodType | ''>('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortCombined, setSortCombined] = useState<string>('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => setIsMounted(true), []);

  const query: PaymentMethodsQuery = useMemo(() => {
    const q: PaymentMethodsQuery = {
      search: search || undefined,
      page,
      limit,
    };
    if (type) q.type = type;
    if (status !== 'all') q.isActive = status === 'active';
    if (sortCombined) {
      const [sortBy, sortOrder] = sortCombined.split(':');
      if (sortBy) q.sortBy = sortBy as PaymentMethodsQuery['sortBy'];
      if (sortOrder === 'ASC' || sortOrder === 'DESC') q.sortOrder = sortOrder;
    }
    return q;
  }, [search, page, limit, type, status, sortCombined]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await paymentMethodsAPI.getPaymentMethods(query);
      setData(res);
    } catch (e) {
      try {
        const parsed = JSON.parse((e as Error).message) as { message?: string; correlationId?: string };
        setError(parsed.message || 'Ошибка загрузки способов оплаты');
      } catch {
        setError('Ошибка загрузки способов оплаты');
      }
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    if (!isMounted) return;
    if (authLoading) return;
    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }

    let cancelled = false;
    const t = setTimeout(async () => {
      if (cancelled) return;
      await load();
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [isMounted, authLoading, isAuthenticated, user, router, load]);

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

  const toggleStatus = async (id: string) => {
    if (!canManage) return;
    setActionLoading(id);
    setError(null);
    try {
      await paymentMethodsAPI.toggleStatus(id);
      await load();
    } catch (e) {
      try {
        const parsed = JSON.parse((e as Error).message) as { message?: string };
        setError(parsed.message || 'Не удалось изменить статус');
      } catch {
        setError('Не удалось изменить статус');
      }
    } finally {
      setActionLoading(null);
    }
  };

  const confirmDelete = async () => {
    if (!canManage) return;
    const id = deleteId;
    if (!id) return;
    setDeleting(true);
    setError(null);
    try {
      await paymentMethodsAPI.remove(id);
      setDeleteId(null);
      await load();
    } catch (e) {
      try {
        const parsed = JSON.parse((e as Error).message) as { message?: string };
        setError(parsed.message || 'Не удалось удалить способ оплаты');
      } catch {
        setError('Не удалось удалить способ оплаты');
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-surface-1">
      {/* Background glows */}
      <div className="fixed inset-0 bg-gradient-surface -z-10"></div>
      <div className="fixed top-0 right-0 w-96 h-96 bg-gradient-primary opacity-5 rounded-full blur-3xl -z-10"></div>
      <div className="fixed bottom-0 left-0 w-64 h-64 bg-secondary/10 rounded-full blur-3xl -z-10"></div>

      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/20">
              <CreditCard className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Способы оплаты</h1>
              <p className="text-xs text-muted-foreground">Методы оплаты и интеграции</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard">
              <Button variant="ghost">В дашборд</Button>
            </Link>
            {canManage && (
              <Link href="/dashboard/payment-methods/new">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Добавить
                </Button>
              </Link>
            )}
            <Button variant="outline" onClick={() => setPage(1)}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Обновить
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-6 py-6 space-y-6">
        {/* Filters */}
        <Card className="p-4 backdrop-blur-sm bg-card/80 border-border/50">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative md:col-span-1">
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Поиск по названию/типу"
                className="pl-9"
              />
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
            </div>

            <div className="flex gap-2">
              <select
                value={type}
                onChange={(e) => {
                  setType(e.target.value as PaymentMethodType | '');
                  setPage(1);
                }}
                className="w-full h-9 rounded-md border border-border bg-background text-sm px-3"
              >
                <option value="">Все типы</option>
                {PAYMENT_METHOD_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>

              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as typeof status);
                  setPage(1);
                }}
                className="w-full h-9 rounded-md border border-border bg-background text-sm px-3"
              >
                <option value="all">Любой статус</option>
                <option value="active">Активные</option>
                <option value="inactive">Отключённые</option>
              </select>
            </div>

            <div className="flex gap-2">
              <select
                value={sortCombined}
                onChange={(e) => {
                  setSortCombined(e.target.value);
                  setPage(1);
                }}
                className="w-full h-9 rounded-md border border-border bg-background text-sm px-3"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value || 'none'} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

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
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPage(1)}>
                Применить
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setSearch('');
                  setType('');
                  setStatus('all');
                  setSortCombined('');
                  setLimit(10);
                  setPage(1);
                }}
              >
                Сброс
              </Button>
            </div>
          </div>
        </Card>

        {/* List */}
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
            <div className="p-10 text-center text-muted-foreground">Способы оплаты не найдены</div>
          ) : (
            <div className="divide-y divide-border/60">
              {items.map((m) => (
                <PaymentMethodRow
                  key={m.id}
                  method={m}
                  canManage={canManage}
                  onToggle={() => toggleStatus(m.id)}
                  onDelete={() => setDeleteId(m.id)}
                  actionLoading={actionLoading === m.id}
                />
              ))}
            </div>
          )}
        </Card>

        {/* Pagination */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">Всего: {data?.total || 0}</div>
          <div className="flex items-center gap-2">
            <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              Назад
            </Button>
            <div className="text-sm">
              Стр. {page} / {data?.totalPages || 1}
            </div>
            <Button
              variant="outline"
              disabled={page >= (data?.totalPages || 1)}
              onClick={() => setPage((p) => p + 1)}
            >
              Далее
            </Button>
          </div>
        </div>
      </main>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(v) => !v && setDeleteId(null)}
        title="Удалить способ оплаты?"
        description="Операция необратима. Продолжить?"
        confirmText="Удалить"
        variant="destructive"
        loading={deleting}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function PaymentMethodRow({
  method,
  canManage,
  onToggle,
  onDelete,
  actionLoading,
}: {
  method: PaymentMethodResponse;
  canManage: boolean;
  onToggle: () => void;
  onDelete: () => void;
  actionLoading: boolean;
}) {
  const statusBadge = method.isActive ? (
    <span className="text-xs px-2 py-1 rounded-full bg-green-500/15 text-green-600 dark:text-green-400 border border-green-500/20">
      Активен
    </span>
  ) : (
    <span className="text-xs px-2 py-1 rounded-full bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/20">
      Отключён
    </span>
  );

  const typeLabel =
    (method.type && typeof method.type === 'string'
      ? method.type
      : (method.type as string)) || '—';
  const fee =
    typeof method.processingFeePercent === 'number' ? `${method.processingFeePercent}%` : '—';

  const limits =
    method.limits &&
    (typeof method.limits.minAmount === 'number' ||
      typeof method.limits.maxAmount === 'number' ||
      typeof method.limits.dailyTransactionLimit === 'number')
      ? [
          typeof method.limits.minAmount === 'number' ? `мин. ${method.limits.minAmount}` : null,
          typeof method.limits.maxAmount === 'number' ? `макс. ${method.limits.maxAmount}` : null,
          typeof method.limits.dailyTransactionLimit === 'number'
            ? `в день: ${method.limits.dailyTransactionLimit}`
            : null,
        ]
          .filter(Boolean)
          .join(', ')
      : '—';

  const isConfigured = !!method.integrationStatus?.isConfigured;
  const gatewayType = method.integrationStatus?.gatewayType || '';
  const integrationText = canManage
    ? (isConfigured ? `${gatewayType || 'интеграция'}${method.integrationStatus?.testMode ? ' (test)' : ''}` : 'нет')
    : (isConfigured ? 'да' : 'нет');

  const txCount =
    typeof method.stats?.transactionCount === 'number' ? method.stats.transactionCount : undefined;

  return (
    <div className="p-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
          <CreditCard className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div className="space-y-0.5">
          <div className="font-medium">{method.name}</div>
          <div className="text-xs text-muted-foreground">
            Тип: {typeLabel} · Комиссия: {fee} · Лимиты: {limits}
            {typeof txCount === 'number' ? ` · Транзакций: ${txCount}` : ''}
            {` · Интеграция: ${integrationText}`}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {statusBadge}
        {canManage && (
          <>
            <Link href={`/dashboard/payment-methods/${method.id}`}>
              <Button variant="outline" size="sm">
                <Pencil className="w-4 h-4 mr-1" />
                Ред.
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={onToggle} disabled={actionLoading}>
              <Power className="w-4 h-4 mr-1" />
              {method.isActive ? 'Выкл.' : 'Вкл.'}
            </Button>
            <Button variant="destructive" size="sm" onClick={onDelete} disabled={actionLoading}>
              <Trash2 className="w-4 h-4 mr-1" />
              Удалить
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
