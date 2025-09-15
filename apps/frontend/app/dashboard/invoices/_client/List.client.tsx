// path: apps/frontend/app/dashboard/invoices/_client/List.client.tsx
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FileText, Plus, RefreshCw, Search, Filter, AlertTriangle, BarChart3, Download } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { invoicesAPI } from '@/lib/api/invoices';
import type {
  Invoice,
  InvoiceStatus,
  InvoicesQuery,
  PaginatedInvoicesResponse,
  InvoicesStats,
} from '@/lib/types/invoices';
import { useAuth } from '@/lib/hooks/use-auth';

const STATUS_OPTIONS: Array<{ value: InvoiceStatus | 'ALL'; label: string }> = [
  { value: 'ALL', label: 'Все' },
  { value: 'ISSUED', label: 'Выставлен' },
  { value: 'PAID', label: 'Оплачен' },
  { value: 'CANCELED', label: 'Отменён' },
];

function useQueryState<T extends Record<string, string | undefined>>() {
  const router = useRouter();
  const sp = useSearchParams();

  const state = useMemo(() => {
    const obj = {} as Record<string, string>;
    sp.forEach((v, k) => {
      obj[k] = v;
    });
    return obj as T;
  }, [sp]);

  function patch(next: Partial<T>) {
    const params = new URLSearchParams(sp);
    Object.entries(next).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') params.delete(k);
      else params.set(k, String(v));
    });
    router.replace(`?${params.toString()}`);
  }

  return [state, patch] as const;
}

export default function List() {
  const { user } = useAuth();
  const [qs, patchQs] = useQueryState<{ page?: string; search?: string; status?: string }>();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PaginatedInvoicesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [stats, setStats] = useState<InvoicesStats | null>(null);
  const canSeeStats = ['company_owner', 'company_admin', 'manager'].includes(user?.role?.name || '');

  const [suggestions, setSuggestions] = useState<Invoice[]>([]);
  const [showSug, setShowSug] = useState(false);
  const [searchInput, setSearchInput] = useState('');

  const page = Number(qs.page ?? 1);
  const effectiveSearch = qs.search ?? '';
  const status = (qs.status as InvoiceStatus | 'ALL' | undefined) ?? 'ALL';

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query: InvoicesQuery = {
        page,
        limit: 20,
        search: effectiveSearch || undefined,
        status: status && status !== 'ALL' ? (status as InvoiceStatus) : undefined,
      };
      const res = await invoicesAPI.list(query);
      setData(res);
    } catch (e: unknown) {
      setError((e as Error)?.message || 'Не удалось загрузить счета');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [page, effectiveSearch, status]);

  const loadStats = useCallback(async () => {
    if (!canSeeStats) {
      setStats(null);
      return;
    }
    try {
      const s = await invoicesAPI.statsDashboard();
      setStats(s);
    } catch {
      setStats(null);
    }
  }, [canSeeStats]);

  const downloadOverdue = useCallback(async () => {
    try {
      const report = await invoicesAPI.overdueReport();
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `overdue-report-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      alert((e as Error)?.message || 'Не удалось получить отчёт');
    }
  }, []);

  useEffect(() => {
    setSearchInput(effectiveSearch);
  }, [effectiveSearch]);

  useEffect(() => {
    void load();
    void loadStats();
  }, [load, loadStats]);

  // Typeahead suggestions
  useEffect(() => {
    const t = setTimeout(async () => {
      if (!searchInput || searchInput.trim().length < 2) {
        setSuggestions([]);
        return;
      }
      try {
        const items = await invoicesAPI.search(searchInput.trim());
        setSuggestions(items.slice(0, 5));
      } catch {
        setSuggestions([]);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [searchInput]);

  const canCreate = ['company_owner', 'company_admin', 'manager'].includes(user?.role?.name || '');

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
            <FileText className="w-6 h-6 text-indigo-500" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Счета</h1>
            <p className="text-sm text-muted-foreground">Выставление и управление счетами</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {canSeeStats && (
            <Button variant="ghost" onClick={downloadOverdue} className="rounded-2xl">
              <Download className="w-4 h-4 mr-2" />
              Просрочки
            </Button>
          )}
          <Button variant="ghost" onClick={load} className="rounded-2xl">
            <RefreshCw className="w-4 h-4 mr-2" />
            Обновить
          </Button>
          {canCreate && (
            <Link href="/dashboard/invoices/new">
              <Button className="rounded-2xl">
                <Plus className="w-4 h-4 mr-2" />
                Новый счёт
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Stats for manager+ */}
      {canSeeStats && (
        <Card className="p-4 mb-6 rounded-3xl glass border-border/30">
          {stats ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Stat value={stats.total} label="Всего" />
              <Stat value={stats.paid} label="Оплачено" />
              <Stat value={stats.pending} label="Ожидает оплаты" />
              <Stat value={stats.overdueCount} label="Просрочено" />
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <BarChart3 className="w-4 h-4" />
              Нет данных статистики
            </div>
          )}
        </Card>
      )}

      {/* Filters */}
      <Card className="p-4 mb-6 rounded-3xl glass border-border/30">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <Input
              className="pl-9 rounded-2xl"
              placeholder="Поиск по номеру счёта или заказу…"
              value={searchInput}
              onFocus={() => setShowSug(true)}
              onBlur={() => setTimeout(() => setShowSug(false), 200)}
              onChange={(e) => {
                setSearchInput(e.target.value);
                patchQs({ search: e.target.value, page: '1' });
              }}
            />
            {showSug && suggestions.length > 0 && (
              <div className="absolute z-20 mt-1 w-full rounded-xl border border-border/50 bg-background shadow-sm">
                {suggestions.map((s) => (
                  <Link key={s.id} href={`/dashboard/invoices/${s.id}`}>
                    <div className="px-3 py-2 text-sm hover:bg-muted/30 rounded-xl cursor-pointer">
                      {s.invoiceNumber} <span className="text-muted-foreground">· {s.status}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <Filter className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <select
              className="w-full h-10 pl-9 pr-3 rounded-2xl bg-background border border-border/50 text-sm"
              value={status}
              onChange={(e) => patchQs({ status: e.target.value, page: '1' })}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3">
            <Button variant="ghost" className="rounded-2xl" onClick={() => patchQs({ search: '', status: 'ALL', page: '1' })}>
              Сбросить
            </Button>
          </div>
        </div>
      </Card>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
      ) : error ? (
        <Card className="p-8 text-center rounded-3xl glass border-border/30">
          <div className="flex items-center justify-center gap-3 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            <p>{error}</p>
          </div>
          <div className="mt-4">
            <Button onClick={load} className="rounded-2xl">
              Повторить
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {(data?.items ?? []).map((inv) => <InvoiceRow key={inv.id} invoice={inv} />)}

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">
                Стр. {data.page} из {data.totalPages} — всего {data.total}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  className="rounded-2xl"
                  disabled={data.page <= 1}
                  onClick={() => patchQs({ page: String(data.page - 1) })}
                >
                  Назад
                </Button>
                <Button
                  className="rounded-2xl"
                  disabled={data.page >= data.totalPages}
                  onClick={() => patchQs({ page: String(data.page + 1) })}
                >
                  Вперёд
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ value, label }: { value?: number; label: string }) {
  const v = typeof value === 'number' ? value : 0;
  return (
    <div className="p-3 rounded-2xl border border-border/40 glass">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-semibold">{v.toLocaleString('ru-RU')}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const map: Record<InvoiceStatus, { text: string; cls: string }> = {
    ISSUED: { text: 'Выставлен', cls: 'bg-amber-500/15 text-amber-500 border border-amber-500/30' },
    PAID: { text: 'Оплачен', cls: 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30' },
    CANCELED: { text: 'Отменён', cls: 'bg-rose-500/15 text-rose-500 border border-rose-500/30' },
  };
  const m = map[status] || map.ISSUED;
  return <span className={`px-2 py-1 rounded-xl text-xs font-medium ${m.cls}`}>{m.text}</span>;
}

function InvoiceRow({ invoice }: { invoice: Invoice }) {
  const amountFmt = (n: number | undefined) =>
    typeof n === 'number' ? n.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 2 }) : '—';

  return (
    <Link href={`/dashboard/invoices/${invoice.id}`}>
      <Card className="p-4 rounded-2xl glass border-border/30 hover:shadow-glass lg:hover:translate-y-[-1px] transition">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 items-center">
          <div className="col-span-2 md:col-span-2">
            <p className="font-medium">{invoice.invoiceNumber || '—'}</p>
            <p className="text-xs text-muted-foreground">
              Заказ: {invoice.order?.orderNumber || invoice.orderId.slice(0, 8)}
            </p>
          </div>
          <div className="hidden md:block">
            <StatusBadge status={invoice.status} />
          </div>
          <div>
            <p className="text-sm">К оплате</p>
            <p className="font-semibold">{amountFmt(invoice.totalAmount)}</p>
          </div>
          <div>
            <p className="text-sm">Срок оплаты</p>
            <p className="font-medium">{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('ru-RU') : '—'}</p>
          </div>
          <div className="justify-self-end">
            <Button className="rounded-2xl" variant="ghost">
              Открыть
            </Button>
          </div>
        </div>
      </Card>
    </Link>
  );
}
