// path: apps/frontend/app/dashboard/invoices/_client/List.client.tsx
'use client';

import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AppLayout } from '@/components/app/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  FileText, 
  Plus, 
  RefreshCw, 
  Search, 
  Filter, 
  AlertTriangle, 
  BarChart3, 
  Download,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';

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

const STATUS_COLORS = {
  ISSUED: {
    bg: 'bg-amber-50 dark:bg-amber-950/20',
    border: 'border-amber-200 dark:border-amber-800/30',
    text: 'text-amber-700 dark:text-amber-300',
    pulse: false,
  },
  PAID: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/20',
    border: 'border-emerald-200 dark:border-emerald-800/30',
    text: 'text-emerald-700 dark:text-emerald-300',
    pulse: false,
  },
  CANCELED: {
    bg: 'bg-red-50 dark:bg-red-950/20',
    border: 'border-red-200 dark:border-red-800/30',
    text: 'text-red-700 dark:text-red-300',
    pulse: false,
  },
} as const;

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

  // Auto-refresh every 30 seconds (silent)
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const listAbortRef = useRef<AbortController | null>(null);
  const statsAbortRef = useRef<AbortController | null>(null);
  const typeaheadAbortRef = useRef<AbortController | null>(null);

  const page = Number(qs.page ?? 1);
  const effectiveSearch = qs.search ?? '';
  const status = (qs.status as InvoiceStatus | 'ALL' | undefined) ?? 'ALL';

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (listAbortRef.current) listAbortRef.current.abort();
    const controller = new AbortController();
    listAbortRef.current = controller;

    if (!opts?.silent) setLoading(true);
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
      if ((e as any)?.name === 'AbortError') return;
      setError((e as Error)?.message || 'Не удалось загрузить счета');
      setData(null);
    } finally {
      if (!opts?.silent) setLoading(false);
      listAbortRef.current = null;
    }
  }, [page, effectiveSearch, status]);

  const loadStats = useCallback(async (opts?: { silent?: boolean }) => {
    if (!canSeeStats) {
      setStats(null);
      return;
    }
    if (statsAbortRef.current) statsAbortRef.current.abort();
    const controller = new AbortController();
    statsAbortRef.current = controller;
    try {
      const s = await invoicesAPI.statsDashboard();
      setStats(s);
    } catch {
      if (!opts?.silent) setStats(null);
    } finally {
      statsAbortRef.current = null;
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
    return () => {
      listAbortRef.current?.abort();
      statsAbortRef.current?.abort();
    };
  }, [load, loadStats]);

  // Silent auto-refresh (no toggle)
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      void load({ silent: true });
      if (canSeeStats) void loadStats({ silent: true });
    }, 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
  }, [load, loadStats, canSeeStats]);

  // Typeahead suggestions (abortable)
  useEffect(() => {
    if (typeaheadAbortRef.current) typeaheadAbortRef.current.abort();
    const controller = new AbortController();
    typeaheadAbortRef.current = controller;

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

    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [searchInput]);

  const canCreate = ['company_owner', 'company_admin', 'manager'].includes(user?.role?.name || '');

  const headerActions = (
    <div className="flex items-center gap-2">
      {canSeeStats && (
        <Button 
          variant="outline" 
          onClick={downloadOverdue} 
          className="rounded-2xl btn-outline-fixed"
        >
          <Download className="w-4 h-4 mr-2" />
          Просрочки
        </Button>
      )}
      {canCreate && (
        <Link href="/dashboard/invoices/new">
          <Button className="rounded-2xl bg-gradient-primary hover:opacity-90 transition-all duration-300 hover:scale-[1.02]">
            <Plus className="w-4 h-4 mr-2" />
            Новый счёт
          </Button>
        </Link>
      )}
    </div>
  );

  return (
    <AppLayout 
      title="Счета" 
      description="Статусы оплаты с прогресс-барами и автообновлением"
      icon={FileText}
      actions={headerActions}
    >
      <div className="container mx-auto px-6 py-6 space-y-6">
        {/* Invoice Payments Feature Badge */}
        <Card className="p-4 glass border-indigo-500/20 bg-gradient-to-r from-indigo-500/5 to-primary/5 rounded-3xl">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-r from-indigo-500 to-primary">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-indigo-600 dark:text-indigo-400">Интерактивные статусы оплаты</h3>
              <p className="text-sm text-muted-foreground">
                Прогресс-бары частичных оплат и автообновление каждые 30 сек.
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/30">
                <CheckCircle className="w-3 h-3 mr-1" />
                Оплачено
              </Badge>
              <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/30">
                <Clock className="w-3 h-3 mr-1" />
                Ожидает
              </Badge>
            </div>
          </div>
        </Card>

        {/* Stats Dashboard for manager+ */}
        {canSeeStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard
              title="Всего счетов"
              value={stats?.total || 0}
              icon={FileText}
              color="blue"
            />
            <StatsCard
              title="Оплачено"
              value={stats?.paid || 0}
              icon={CheckCircle}
              color="emerald"
              amount={stats?.paidAmount}
            />
            <StatsCard
              title="Ожидает оплаты"
              value={stats?.pending || 0}
              icon={Clock}
              color="amber"
              amount={stats?.pendingAmount}
            />
            <StatsCard
              title="Просрочено"
              value={stats?.overdueCount || 0}
              icon={AlertTriangle}
              color="red"
              pulse={!!stats?.overdueCount}
            />
          </div>
        )}

        {/* Search & Filters */}
        <Card className="p-4 glass border-border/30 rounded-3xl surface-glow">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="relative md:col-span-2">
                <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  className="pl-9 h-10 rounded-2xl border-border/50 focus:border-primary/50 transition-all duration-300"
                  placeholder="Поиск по номеру счёта, заказу или клиенту…"
                  value={searchInput}
                  onFocus={() => setShowSug(true)}
                  onBlur={() => setTimeout(() => setShowSug(false), 200)}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                    patchQs({ search: e.target.value, page: '1' });
                  }}
                />
                {showSug && suggestions.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full rounded-2xl border border-border/50 bg-background shadow-lg glass overflow-hidden">
                    {suggestions.map((s) => (
                      <Link key={s.id} href={`/dashboard/invoices/${s.id}`}>
                        <div className="px-4 py-3 text-sm hover:bg-surface-1/30 transition-colors cursor-pointer">
                          <div className="font-medium">{s.invoiceNumber}</div>
                          <div className="text-xs text-muted-foreground">
                            {s.status} • {formatMoney(s.totalAmount)}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative">
                <Filter className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                <select
                  className="w-full h-10 pl-9 pr-3 rounded-2xl bg-background border border-border/50 text-sm focus:border-primary/50 transition-all duration-300"
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
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button 
                  variant="ghost" 
                  className="rounded-xl" 
                  onClick={() => patchQs({ search: '', status: 'ALL', page: '1' })}
                >
                  Сбросить фильтры
                </Button>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  Обновление каждые 30 сек
                </div>
              </div>

              {data && (
                <div className="text-sm text-muted-foreground">
                  Найдено: {data.total} счетов
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Invoice List */}
        <Card className="p-0 glass border-border/30 rounded-3xl surface-glow overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-24 bg-surface-1/40 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <div className="flex items-center justify-center gap-3 text-destructive mb-4">
                <AlertTriangle className="w-6 h-6" />
                <p className="text-lg font-medium">{error}</p>
              </div>
              <Button onClick={() => load()} className="rounded-2xl">
                <RefreshCw className="w-4 h-4 mr-2" />
                Повторить
              </Button>
            </div>
          ) : (data?.items ?? []).length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h3 className="font-semibold mb-2">Счета не найдены</h3>
              <p className="text-sm mb-4">
                {status !== 'ALL' 
                  ? `Нет счетов со статусом "${STATUS_OPTIONS.find(o => o.value === status)?.label}"`
                  : 'Попробуйте изменить параметры поиска или создайте первый счёт'
                }
              </p>
              {canCreate && (
                <Link href="/dashboard/invoices/new">
                  <Button className="rounded-2xl bg-gradient-primary hover:opacity-90">
                    <Plus className="w-4 h-4 mr-2" />
                    Создать счёт
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="p-6 space-y-3">
              {(data?.items ?? []).map((invoice) => (
                <InvoiceCard key={invoice.id} invoice={invoice} />
              ))}
            </div>
          )}
        </Card>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Страница {data.page} из {data.totalPages} • Всего: {data.total} счетов
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="rounded-2xl btn-outline-fixed"
                disabled={data.page <= 1}
                onClick={() => patchQs({ page: String(data.page - 1) })}
              >
                Назад
              </Button>
              <span className="text-sm px-3 py-1 rounded-xl bg-surface-1/60">
                {data.page} / {data.totalPages}
              </span>
              <Button
                variant="outline"
                className="rounded-2xl btn-outline-fixed"
                disabled={data.page >= data.totalPages}
                onClick={() => patchQs({ page: String(data.page + 1) })}
              >
                Далее
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

// Stats Card Component
function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  color, 
  amount, 
  pulse 
}: {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: 'blue' | 'emerald' | 'amber' | 'red';
  amount?: number;
  pulse?: boolean;
}) {
  const colorMap = {
    blue: 'bg-blue-500/20 text-blue-500',
    emerald: 'bg-emerald-500/20 text-emerald-500',
    amber: 'bg-amber-500/20 text-amber-500',
    red: 'bg-red-500/20 text-red-500',
  };

  return (
    <Card className={cn(
      "p-4 glass border-border/30 rounded-2xl",
      pulse && "animate-pulse border-red-300 dark:border-red-700"
    )}>
      <div className="flex items-center gap-3">
        <div className={cn("p-2 rounded-xl", colorMap[color])}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="text-sm text-muted-foreground">{title}</div>
          <div className="text-xl font-bold">{value.toLocaleString('ru-RU')}</div>
          {amount !== undefined && (
            <div className="text-xs text-muted-foreground">
              {formatMoney(amount)}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

// Invoice Card Component with Payment Progress
function InvoiceCard({ invoice }: { invoice: Invoice }) {
  const isOverdue = invoice.isOverdue;
  const progressPercentage = Math.round(((invoice.paidAmount || 0) / (invoice.totalAmount || 1)) * 100);
  
  const statusConfig = STATUS_COLORS[invoice.status as InvoiceStatus] || STATUS_COLORS.ISSUED;

  return (
    <Link href={`/dashboard/invoices/${invoice.id}`}>
      <Card className={cn(
        "p-4 rounded-2xl glass border-border/30 hover:border-primary/30 transition-all duration-300 hover:scale-[1.01] group",
        isOverdue && "border-red-300 dark:border-red-700 shadow-lg shadow-red-500/10 animate-pulse"
      )}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          {/* Invoice Info */}
          <div className="lg:col-span-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-500/20 group-hover:scale-105 transition-transform">
                <FileText className="w-5 h-5 text-indigo-500" />
              </div>
              <div>
                <div className="font-semibold group-hover:text-primary transition-colors">
                  {invoice.invoiceNumber || '—'}
                </div>
                <div className="text-xs text-muted-foreground">
                  Заказ: {invoice.order?.orderNumber || invoice.orderId.slice(0, 8)}
                </div>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="lg:col-span-2">
            <Badge className={cn(
              "rounded-xl text-xs font-medium border",
              statusConfig.bg,
              statusConfig.border,
              statusConfig.text
            )}>
              {invoice.status === 'ISSUED' && <Clock className="w-3 h-3 mr-1" />}
              {invoice.status === 'PAID' && <CheckCircle className="w-3 h-3 mr-1" />}
              {invoice.status === 'CANCELED' && <XCircle className="w-3 h-3 mr-1" />}
              {getStatusLabel(invoice.status as InvoiceStatus)}
            </Badge>
            {isOverdue && (
              <div className="text-xs text-red-500 mt-1 font-medium">
                Просрочен на {invoice.daysUntilDue ? Math.abs(invoice.daysUntilDue) : '?'} дн.
              </div>
            )}
          </div>

          {/* Payment Progress */}
          <div className="lg:col-span-3">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Оплачено</span>
                <span className="font-medium">{progressPercentage}%</span>
              </div>
              <div className="w-full bg-surface-1/60 rounded-full h-2 overflow-hidden">
                <div 
                  className={cn(
                    "h-2 transition-all duration-500 ease-out rounded-full",
                    progressPercentage === 100 ? "bg-emerald-500" : "bg-gradient-to-r from-primary to-secondary"
                  )}
                  style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{formatMoney(invoice.paidAmount)}</span>
                <span>{formatMoney(invoice.totalAmount)}</span>
              </div>
            </div>
          </div>

          {/* Amounts */}
          <div className="lg:col-span-2">
            <div className="text-right">
              <div className="font-bold text-lg">{formatMoney(invoice.totalAmount)}</div>
              {(invoice.remainingAmount || 0) > 0 && (
                <div className="text-sm text-muted-foreground">
                  Остаток: {formatMoney(invoice.remainingAmount)}
                </div>
              )}
            </div>
          </div>

          {/* Due Date */}
          <div className="lg:col-span-2">
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Срок оплаты</div>
              <div className={cn(
                "font-medium",
                isOverdue && "text-red-500"
              )}>
                {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('ru-RU') : '—'}
              </div>
              {invoice.daysUntilDue !== undefined && (
                <div className={cn(
                  "text-xs",
                  invoice.daysUntilDue < 0 ? "text-red-500" : 
                  invoice.daysUntilDue <= 3 ? "text-amber-500" : "text-muted-foreground"
                )}>
                  {invoice.daysUntilDue < 0 
                    ? `Просрочен на ${Math.abs(invoice.daysUntilDue)} дн.`
                    : invoice.daysUntilDue === 0 
                      ? "Сегодня"
                      : `Через ${invoice.daysUntilDue} дн.`
                  }
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}

// Helper functions
function formatMoney(amount?: number): string {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return '—';
  try {
    return amount.toLocaleString('ru-RU', { 
      style: 'currency', 
      currency: 'RUB', 
      maximumFractionDigits: 0 
    });
  } catch {
    return `${amount.toFixed(0)} ₽`;
  }
}

function getStatusLabel(status: InvoiceStatus): string {
  const labels = {
    ISSUED: 'Выставлен',
    PAID: 'Оплачен',
    CANCELED: 'Отменён',
  };
  return labels[status] || status;
}
