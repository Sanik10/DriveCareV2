// path: apps/frontend/app/dashboard/payment-methods/page.tsx
'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/app/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/hooks/use-auth';

import { 
  CreditCard, 
  Search, 
  RefreshCw, 
  Pencil, 
  Power, 
  Trash2, 
  Plus,
  Settings,
  Zap,
  Shield,
  BarChart3,
  TestTube,
  Wallet,
  Banknote,
  Building2,
  Smartphone,
  Bitcoin,
  ToggleLeft,
  ToggleRight,
  Clock,
  CheckCircle,
  AlertTriangle,
  TrendingUp
} from 'lucide-react';

import { paymentMethodsAPI } from '@/lib/api/payment-methods';
import type {
  PaymentMethodType,
  PaymentMethodResponse,
  PaymentMethodsQuery,
  PaginatedPaymentMethodsUI,
} from '@/lib/types/payment-methods';

const PAYMENT_METHOD_TYPES: { value: PaymentMethodType; label: string; icon: typeof CreditCard; color: string }[] = [
  { value: 'cash', label: 'Наличные', icon: Banknote, color: 'emerald' },
  { value: 'card', label: 'Банковская карта', icon: CreditCard, color: 'blue' },
  { value: 'bank_transfer', label: 'Банковский перевод', icon: Building2, color: 'purple' },
  { value: 'installments', label: 'Рассрочка', icon: BarChart3, color: 'amber' },
  { value: 'corporate', label: 'Корпоративный', icon: Shield, color: 'slate' },
  { value: 'digital_wallet', label: 'Цифровой кошелёк', icon: Smartphone, color: 'indigo' },
  { value: 'cryptocurrency', label: 'Криптовалюта', icon: Bitcoin, color: 'orange' },
];

const SORT_OPTIONS = [
  { value: '', label: 'По умолчанию' },
  { value: 'name:ASC', label: 'Название (A→Z)' },
  { value: 'name:DESC', label: 'Название (Z→A)' },
  { value: 'type:ASC', label: 'Тип (A→Z)' },
  { value: 'transactionCount:DESC', label: 'Популярные' },
  { value: 'createdAt:DESC', label: 'Новые сверху' },
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
  const [limit, setLimit] = useState(12); // Grid view - more items

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Real-time preview state
  const [previewChanges, setPreviewChanges] = useState<Record<string, { isActive: boolean }>>({});

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
      // Clear preview changes on successful load
      setPreviewChanges({});
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

  const toggleStatus = async (id: string) => {
    if (!canManage) return;
    
    // Optimistic update for preview
    const method = data?.items.find(m => m.id === id);
    if (method) {
      setPreviewChanges(prev => ({
        ...prev,
        [id]: { isActive: !method.isActive }
      }));
    }

    setActionLoading(id);
    setError(null);
    try {
      await paymentMethodsAPI.toggleStatus(id);
      await load();
    } catch (e) {
      // Revert preview on error
      setPreviewChanges(prev => {
        const newChanges = { ...prev };
        delete newChanges[id];
        return newChanges;
      });
      
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

  const getMethodConfig = (method: PaymentMethodResponse) => {
    const preview = previewChanges[method.id];
    const isActive = preview ? preview.isActive : method.isActive;
    const typeConfig = PAYMENT_METHOD_TYPES.find(t => t.value === method.type) || PAYMENT_METHOD_TYPES[1];
    
    return {
      ...typeConfig,
      isActive,
      isPreview: !!preview,
    };
  };

  const activeCount = data?.items.filter(m => {
    const config = getMethodConfig(m);
    return config.isActive;
  }).length || 0;

  const headerActions = (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        className="rounded-2xl btn-outline-fixed"
        onClick={() => setPage(1)}
      >
        <RefreshCw className="w-4 h-4 mr-2" />
        Обновить
      </Button>
      
      {canManage && (
        <Link href="/dashboard/payment-methods/new">
          <Button className="rounded-2xl bg-gradient-primary hover:opacity-90 transition-all duration-300 hover:scale-[1.02]">
            <Plus className="w-4 h-4 mr-2" />
            Добавить метод
          </Button>
        </Link>
      )}
    </div>
  );

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

  return (
    <AppLayout 
      title="Способы оплаты" 
      description="Интерактивные переключатели методов оплаты"
      icon={CreditCard}
      actions={headerActions}
    >
      <div className="container mx-auto px-6 py-6 space-y-6">
        {/* Payment Methods Feature Badge */}
        <Card className="p-4 glass border-purple-500/20 bg-gradient-to-r from-purple-500/5 to-primary/5 rounded-3xl">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-r from-purple-500 to-primary">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-purple-600 dark:text-purple-400">Интерактивные переключатели методов</h3>
              <p className="text-sm text-muted-foreground">
                Toggle switches, real-time preview изменений, тестовые транзакции, настройки комиссий и лимитов.
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/30">
                <Zap className="w-3 h-3 mr-1" />
                {activeCount} Активных
              </Badge>
              <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/30">
                <Settings className="w-3 h-3 mr-1" />
                Управление
              </Badge>
            </div>
          </div>
        </Card>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatsCard
            title="Всего методов"
            value={items.length}
            icon={CreditCard}
            color="blue"
          />
          <StatsCard
            title="Активных"
            value={activeCount}
            icon={CheckCircle}
            color="emerald"
          />
          <StatsCard
            title="Настроенных"
            value={items.filter(m => m.integrationStatus?.isConfigured).length}
            icon={Settings}
            color="purple"
          />
          <StatsCard
            title="Тестовых"
            value={items.filter(m => m.integrationStatus?.testMode).length}
            icon={TestTube}
            color="amber"
          />
        </div>

        {/* Search & Filters */}
        <Card className="p-4 glass border-border/30 rounded-3xl surface-glow">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="relative md:col-span-2">
                <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Поиск по названию, типу или описанию"
                  className="pl-9 h-10 rounded-2xl border-border/50 focus:border-primary/50 transition-all duration-300"
                />
              </div>

              <select
                value={type}
                onChange={(e) => {
                  setType(e.target.value as PaymentMethodType | '');
                  setPage(1);
                }}
                className="h-10 rounded-2xl border border-border/50 bg-background text-sm px-3 focus:border-primary/50 transition-all duration-300"
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
                className="h-10 rounded-2xl border border-border/50 bg-background text-sm px-3 focus:border-primary/50 transition-all duration-300"
              >
                <option value="all">Любой статус</option>
                <option value="active">Активные</option>
                <option value="inactive">Отключённые</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <select
                  value={sortCombined}
                  onChange={(e) => {
                    setSortCombined(e.target.value);
                    setPage(1);
                  }}
                  className="h-8 rounded-xl border border-border/50 bg-background text-sm px-2 focus:border-primary/50 transition-all duration-300"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value || 'none'} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                <Button
                  variant="ghost"
                  className="rounded-xl text-sm"
                  onClick={() => {
                    setSearch('');
                    setType('');
                    setStatus('all');
                    setSortCombined('');
                    setPage(1);
                  }}
                >
                  Сбросить фильтры
                </Button>
              </div>

              {data && (
                <div className="text-sm text-muted-foreground">
                  Найдено: {data.total} методов
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Payment Methods Grid */}
        <Card className="p-0 glass border-border/30 rounded-3xl surface-glow overflow-hidden">
          {loading ? (
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="h-48 bg-surface-1/40 rounded-3xl animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <div className="flex items-center justify-center gap-3 text-destructive mb-4">
                <AlertTriangle className="w-6 h-6" />
                <p className="text-lg font-medium">{error}</p>
              </div>
              <Button onClick={load} className="rounded-2xl">
                <RefreshCw className="w-4 h-4 mr-2" />
                Повторить
              </Button>
            </div>
          ) : items.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">
              <Wallet className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h3 className="font-semibold mb-2">Способы оплаты не найдены</h3>
              <p className="text-sm mb-4">
                {status !== 'all' 
                  ? `Нет методов со статусом "${status === 'active' ? 'активные' : 'отключённые'}"`
                  : 'Попробуйте изменить параметры поиска или добавьте первый метод оплаты'
                }
              </p>
              {canManage && (
                <Link href="/dashboard/payment-methods/new">
                  <Button className="rounded-2xl bg-gradient-primary hover:opacity-90">
                    <Plus className="w-4 h-4 mr-2" />
                    Добавить метод
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {items.map((method) => (
                <PaymentMethodCard
                  key={method.id}
                  method={method}
                  config={getMethodConfig(method)}
                  canManage={canManage}
                  onToggle={() => toggleStatus(method.id)}
                  onDelete={() => setDeleteId(method.id)}
                  actionLoading={actionLoading === method.id}
                />
              ))}
            </div>
          )}
        </Card>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Страница {data.page} из {data.totalPages} • Всего: {data.total} методов
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="rounded-2xl btn-outline-fixed"
                disabled={data.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
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
                onClick={() => setPage((p) => p + 1)}
              >
                Далее
              </Button>
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(v) => !v && setDeleteId(null)}
        title="Удалить способ оплаты?"
        description="Операция необратима. Все связанные транзакции останутся, но новые платежи этим методом будут недоступны."
        confirmText="Удалить"
        variant="destructive"
        loading={deleting}
        onConfirm={confirmDelete}
      />
    </AppLayout>
  );
}

// Stats Card Component
function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  color 
}: {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: 'blue' | 'emerald' | 'purple' | 'amber';
}) {
  const colorMap = {
    blue: 'bg-blue-500/20 text-blue-500',
    emerald: 'bg-emerald-500/20 text-emerald-500',
    purple: 'bg-purple-500/20 text-purple-500',
    amber: 'bg-amber-500/20 text-amber-500',
  };

  return (
    <Card className="p-4 glass border-border/30 rounded-2xl">
      <div className="flex items-center gap-3">
        <div className={cn("p-2 rounded-xl", colorMap[color])}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="text-sm text-muted-foreground">{title}</div>
          <div className="text-xl font-bold">{value}</div>
        </div>
      </div>
    </Card>
  );
}

// Payment Method Card Component
function PaymentMethodCard({
  method,
  config,
  canManage,
  onToggle,
  onDelete,
  actionLoading,
}: {
  method: PaymentMethodResponse;
  config: ReturnType<typeof PaymentMethodsPage.prototype.getMethodConfig>;
  canManage: boolean;
  onToggle: () => void;
  onDelete: () => void;
  actionLoading: boolean;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const Icon = config.icon;

  const colorMap = {
    emerald: { bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', text: 'text-emerald-500' },
    blue: { bg: 'bg-blue-500/20', border: 'border-blue-500/30', text: 'text-blue-500' },
    purple: { bg: 'bg-purple-500/20', border: 'border-purple-500/30', text: 'text-purple-500' },
    amber: { bg: 'bg-amber-500/20', border: 'border-amber-500/30', text: 'text-amber-500' },
    slate: { bg: 'bg-slate-500/20', border: 'border-slate-500/30', text: 'text-slate-500' },
    indigo: { bg: 'bg-indigo-500/20', border: 'border-indigo-500/30', text: 'text-indigo-500' },
    orange: { bg: 'bg-orange-500/20', border: 'border-orange-500/30', text: 'text-orange-500' },
  };

  const colors = colorMap[config.color as keyof typeof colorMap] || colorMap.blue;

  const isConfigured = method.integrationStatus?.isConfigured;
  const hasStats = method.stats && method.stats.transactionCount > 0;

  return (
    <Card 
      className={cn(
        "p-4 h-48 glass border-border/30 rounded-3xl surface-glow transition-all duration-300 group",
        "hover:border-primary/30 hover:scale-[1.02]",
        config.isActive && "ring-1 ring-primary/20",
        config.isPreview && "ring-2 ring-amber-500/50 ring-offset-2 ring-offset-background"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex flex-col h-full">
        {/* Header with toggle */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-xl border transition-all duration-300 group-hover:scale-105",
              colors.bg, colors.border
            )}>
              <Icon className={cn("w-5 h-5", colors.text)} />
            </div>
            
            {/* Interactive Toggle Switch */}
            {canManage && (
              <button
                onClick={onToggle}
                disabled={actionLoading}
                className={cn(
                  "relative w-12 h-6 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/50",
                  "transform hover:scale-105 active:scale-95",
                  config.isActive 
                    ? "bg-gradient-to-r from-emerald-500 to-primary"
                    : "bg-surface-1/60 border border-border/50"
                )}
              >
                <div className={cn(
                  "absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-lg transition-all duration-300",
                  "flex items-center justify-center",
                  config.isActive ? "left-6" : "left-0.5"
                )}>
                  {actionLoading ? (
                    <div className="w-3 h-3 border border-primary/30 border-t-primary rounded-full animate-spin" />
                  ) : config.isActive ? (
                    <CheckCircle className="w-3 h-3 text-emerald-500" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-surface-1" />
                  )}
                </div>
              </button>
            )}
          </div>

          {config.isPreview && (
            <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs">
              Превью
            </Badge>
          )}
        </div>

        {/* Method info */}
        <div className="flex-1 space-y-2">
          <h3 className="font-semibold text-base line-clamp-1 group-hover:text-primary transition-colors">
            {method.name}
          </h3>
          
          <div className="space-y-1 text-xs text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>Тип:</span>
              <span className="font-medium">{config.label}</span>
            </div>
            
            {method.processingFeePercent !== undefined && (
              <div className="flex items-center justify-between">
                <span>Комиссия:</span>
                <span className="font-medium">{method.processingFeePercent}%</span>
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <span>Интеграция:</span>
              <div className="flex items-center gap-1">
                {isConfigured ? (
                  <>
                    <CheckCircle className="w-3 h-3 text-emerald-500" />
                    <span className="text-emerald-600">Готова</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3 h-3 text-amber-500" />
                    <span className="text-amber-600">Нужна</span>
                  </>
                )}
              </div>
            </div>

            {hasStats && (
              <div className="flex items-center justify-between">
                <span>Транзакций:</span>
                <span className="font-medium">{method.stats!.transactionCount}</span>
              </div>
            )}
          </div>

          {/* Status indicators */}
          <div className="flex items-center gap-2 pt-2">
            {config.isActive ? (
              <Badge className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/30 text-xs">
                <Power className="w-3 h-3 mr-1" />
                Активен
              </Badge>
            ) : (
              <Badge className="bg-slate-50 dark:bg-slate-950/20 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800/30 text-xs">
                <Clock className="w-3 h-3 mr-1" />
                Отключён
              </Badge>
            )}

            {method.integrationStatus?.testMode && (
              <Badge className="bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/30 text-xs">
                <TestTube className="w-3 h-3 mr-1" />
                Тест
              </Badge>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className={cn(
          "pt-3 border-t border-border/20 transition-all duration-300",
          isHovered ? "opacity-100" : "opacity-60"
        )}>
          <div className="flex items-center justify-between">
            <Link href={`/dashboard/payment-methods/${method.id}`}>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-xl h-6 px-2 text-xs"
              >
                <Settings className="w-3 h-3 mr-1" />
                Настроить
              </Button>
            </Link>

            {canManage && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-xl h-6 px-2 text-xs hover:text-destructive"
                  onClick={onDelete}
                  disabled={actionLoading}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
