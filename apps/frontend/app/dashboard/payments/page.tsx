// path: apps/frontend/app/dashboard/payments/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/hooks/use-auth';
import { paymentsAPI } from '@/lib/api/payments';
import type { PaginatedPaymentsResponse, Payment, PaymentStatus, CompanyBalance } from '@/lib/types/payments';
import { RefreshCw, CreditCard, Filter, ArrowUpRight } from 'lucide-react';

const STATUSES: Array<{ value?: PaymentStatus; label: string }> = [
  { label: 'Любой статус' },
  { label: 'Ожидает', value: 'pending' },
  { label: 'В обработке', value: 'processing' },
  { label: 'Успешно', value: 'processed' },
  { label: 'Отмена', value: 'canceled' },
  { label: 'Ошибка', value: 'failed' },
  { label: 'Возврат', value: 'refunded' },
  { label: 'Частичный возврат', value: 'partially_refunded' },
  { label: 'Спор', value: 'disputed' },
  { label: 'Чарджбек', value: 'chargeback' },
  { label: 'Истёк', value: 'expired' },
];

function fmtMoney(amount: number, currency: string) {
  try {
    return amount.toLocaleString('ru-RU', { style: 'currency', currency: currency || 'RUB', currencyDisplay: 'symbol' });
  } catch {
    return `${amount.toFixed(2)} ${currency || 'RUB'}`;
  }
}

function fmtDate(d: string | Date) {
  const dt = typeof d === 'string' ? new Date(d) : d;
  return isNaN(dt.getTime()) ? '-' : dt.toLocaleString('ru-RU');
}

export default function PaymentsListPage() {
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const [isMounted, setIsMounted] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PaginatedPaymentsResponse | null>(null);
  const [balance, setBalance] = useState<CompanyBalance | null>(null);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<PaymentStatus | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  useEffect(() => setIsMounted(true), []);

  const query = useMemo(
    () => ({
      search: search || undefined,
      status,
      page,
      limit,
      sortField: 'paymentDate' as const,
      sortOrder: 'desc' as const,
    }),
    [search, status, page, limit],
  );

  useEffect(() => {
    if (!isMounted) return;
    if (authLoading) return;
    if (!isAuthenticated || !user) return;

    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const [list, bal] = await Promise.all([
          paymentsAPI.list(query),
          paymentsAPI.getBalance().catch(() => null),
        ]);
        if (!cancelled) {
          setData(list);
          setBalance(bal);
        }
      } catch (e) {
        const msg = (e as Error)?.message || 'Ошибка загрузки платежей';
        if (!cancelled) setError(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isMounted, authLoading, isAuthenticated, user, query]);

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
      <div className="fixed inset-0 bg-gradient-surface -z-10" />
      <div className="fixed top-0 right-0 w-96 h-96 bg-gradient-primary opacity-5 rounded-full blur-3xl -z-10" />
      <div className="fixed bottom-0 left-0 w-64 h-64 bg-secondary/10 rounded-full blur-3xl -z-10" />

      <header className="border-b border-border/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-primary">
              <CreditCard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">Платежи</h1>
              <p className="text-xs text-muted-foreground">Листинг платежей и баланс компании</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setPage(1)}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Обновить
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-6 space-y-6">
        {/* Баланс */}
        <Card className="p-4 backdrop-blur-sm bg-card/80 border-border/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Чистый баланс:</span>
              <span className="text-lg font-semibold">
                {balance ? fmtMoney(balance.netBalance, 'RUB') : '—'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div>
                Получено:{' '}
                <span className="font-medium">
                  {balance ? fmtMoney(balance.totalReceived, 'RUB') : '—'}
                </span>
              </div>
              <div>
                Возвраты:{' '}
                <span className="font-medium">
                  {balance ? fmtMoney(balance.totalRefunded, 'RUB') : '—'}
                </span>
              </div>
              <div>
                Ожидает:{' '}
                <span className="font-medium">
                  {balance ? fmtMoney(balance.pendingAmount, 'RUB') : '—'}
                </span>
              </div>
              <div className="text-muted-foreground">
                Обновлено: {balance ? fmtDate(balance.lastUpdated) : '—'}
              </div>
            </div>
          </div>
        </Card>

        {/* Фильтры */}
        <Card className="p-4 backdrop-blur-sm bg-card/80 border-border/50">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative md:col-span-2">
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Поиск по транзакции/примечаниям/gateway ID"
                className="pl-9"
              />
              <Filter className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
            </div>
            <select
              value={status || ''}
              onChange={(e) => {
                const val = e.target.value as PaymentStatus | '';
                setStatus(val ? (val as PaymentStatus) : undefined);
                setPage(1);
              }}
              className="w-full h-9 rounded-md border border-border bg-background text-sm px-3"
            >
              {STATUSES.map((s) => (
                <option key={s.label} value={s.value || ''}>
                  {s.label}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(parseInt(e.target.value, 10));
                  setPage(1);
                }}
                className="w-28 h-9 rounded-md border border-border bg-background text-sm px-3"
              >
                {[10, 20, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n} / стр
                  </option>
                ))}
              </select>
              <Button variant="outline" onClick={() => setPage(1)}>
                Применить
              </Button>
            </div>
          </div>
        </Card>

        {/* Листинг */}
        <Card className="p-0 backdrop-blur-sm bg-card/80 border-border/50 overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-14 bg-surface-1 rounded-md animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="p-6 text-center text-destructive">{error}</div>
          ) : items.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">Платежи не найдены</div>
          ) : (
            <div className="divide-y divide-border/60">
              {items.map((p: Payment) => (
                <div key={p.id} className="p-4 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="font-medium">
                      {fmtMoney(p.amount, p.currency)}{' '}
                      <span className="text-xs text-muted-foreground">· {p.statusDisplay || p.status}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Дата: {fmtDate(p.paymentDate)} · Счет:{' '}
                      {p.invoice?.invoiceNumber ? (
                        <Link className="text-primary hover:underline" href={`/dashboard/invoices/${p.invoiceId}`}>
                          {p.invoice.invoiceNumber}
                        </Link>
                      ) : (
                        p.invoiceId.slice(0, 8)
                      )}{' '}
                      · Метод: {p.paymentMethod?.name || p.paymentMethod?.type || '—'}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/dashboard/payments/${p.id}`}>
                      <Button variant="outline" size="sm">
                        Открыть <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Пагинация */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">Всего: {data?.total || 0}</div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              disabled={(data?.page || 1) <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Назад
            </Button>
            <div className="text-sm">
              Стр. {data?.page || 1} / {data?.totalPages || 1}
            </div>
            <Button
              variant="outline"
              disabled={(data?.page || 1) >= (data?.totalPages || 1)}
              onClick={() => setPage((p) => p + 1)}
            >
              Далее
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
