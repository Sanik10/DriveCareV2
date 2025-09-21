// path: apps/frontend/app/dashboard/vehicles/page.tsx
"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AppLayout } from '@/components/app/AppLayout';
import { 
  Car, 
  Search, 
  RefreshCw, 
  Plus, 
  Filter,
  AlertTriangle,
  CheckCircle,
  Clock,
  Gauge,
  Hash,
  User,
  Calendar,
  Sparkles,
  TrendingUp,
  Zap
} from 'lucide-react';
import { useAuth } from '@/lib/hooks/use-auth';
import { vehiclesAPI } from '@/lib/api/vehicles';
import { vehiclesCatalogueAPI } from '@/lib/api/vehicles-catalogue';
import { cn } from '@/lib/utils';
import type { 
  VehiclesQuery, 
  PaginatedVehiclesResponse, 
  VehicleResponse,
  EngineType
} from '@/lib/types/vehicles';
import type { 
  CatalogueBrand, 
  CatalogueModel, 
  CatalogueType 
} from '@/lib/types/vehicles-catalogue';
import { VehicleCreateDialog } from '@/components/vehicles/vehicle-create-dialog';

const ENGINE_TYPES: { value: EngineType; label: string }[] = [
  { value: 'petrol', label: 'Бензин' },
  { value: 'diesel', label: 'Дизель' },
  { value: 'hybrid', label: 'Гибрид' },
  { value: 'electric', label: 'Электро' },
];

export default function VehiclesListPage() {
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PaginatedVehiclesResponse | null>(null);

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12); // Grid view - more per page
  const [serviceFilter, setServiceFilter] = useState<'all' | 'ok' | 'soon' | 'overdue'>('all');

  const [openCreate, setOpenCreate] = useState(false);

  // Catalogue filters
  const [brands, setBrands] = useState<CatalogueBrand[]>([]);
  const [models, setModels] = useState<CatalogueModel[]>([]);
  const [types, setTypes] = useState<CatalogueType[]>([]);
  const [brandId, setBrandId] = useState<string>('');
  const [modelId, setModelId] = useState<string>('');
  const [vehicleTypeId, setVehicleTypeId] = useState<string>('');

  // Extended filters
  const [engineType, setEngineType] = useState<EngineType | ''>('');
  const [yearFrom, setYearFrom] = useState<string>('');
  const [yearTo, setYearTo] = useState<string>('');
  const [hasServiceHistory, setHasServiceHistory] = useState<boolean | ''>('');

  useEffect(() => setIsMounted(true), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [b, m, t] = await Promise.all([
          vehiclesCatalogueAPI.brands(),
          vehiclesCatalogueAPI.models(),
          vehiclesCatalogueAPI.types(),
        ]);
        if (!cancelled) {
          setBrands(b);
          setModels(m);
          setTypes(t);
        }
      } catch {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filteredModels = useMemo(() => {
    if (!brandId) return models;
    return models.filter(m => (m.brandId === brandId) || (m.brand?.id === brandId));
  }, [models, brandId]);

  const query: VehiclesQuery = useMemo(() => ({
    search: search || undefined,
    page,
    limit,
    modelId: modelId || undefined,
    vehicleTypeId: vehicleTypeId || undefined,
    engineType: engineType || undefined,
    yearFrom: yearFrom ? parseInt(yearFrom, 10) : undefined,
    yearTo: yearTo ? parseInt(yearTo, 10) : undefined,
    hasServiceHistory: hasServiceHistory === '' ? undefined : !!hasServiceHistory,
  }), [search, page, limit, modelId, vehicleTypeId, engineType, yearFrom, yearTo, hasServiceHistory]);

  useEffect(() => {
    if (!isMounted) return;
    if (authLoading) return;
    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }

    let cancelled = false;
    const DEBOUNCE_MS = 300;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await vehiclesAPI.getVehicles(query);
        if (!cancelled) setData(res);
      } catch (e) {
        try {
          const parsed = JSON.parse((e as Error).message) as { message?: string; correlationId?: string };
          const msg = parsed.correlationId
            ? `${parsed.message || 'Ошибка загрузки автомобилей'} (corrId: ${parsed.correlationId})`
            : (parsed.message || 'Ошибка загрузки автомобилей');
          if (!cancelled) setError(msg);
        } catch {
          if (!cancelled) setError('Ошибка загрузки автомобилей');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isMounted, authLoading, isAuthenticated, user, router, query]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpenCreate(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onCreated = async () => {
    setPage(1);
    const res = await vehiclesAPI.getVehicles({ ...query, page: 1 });
    setData(res);
  };

  const handleRefresh = async () => {
    setPage(1);
    const res = await vehiclesAPI.getVehicles({ ...query, page: 1 });
    setData(res);
  };

  if (!isMounted) return null;
  if (authLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-muted-foreground">Загрузка автомобилей...</span>
          </div>
        </div>
      </AppLayout>
    );
  }
  if (!isAuthenticated || !user) return null;

  const items = data?.items || [];
  
  // Filter by service status client-side for better UX
  const filteredItems = items.filter(vehicle => {
    if (serviceFilter === 'all') return true;
    const serviceStatus = getVehicleServiceStatus(vehicle);
    return serviceFilter === serviceStatus;
  });

  // Service status stats
  const serviceStats = items.reduce((acc, vehicle) => {
    const status = getVehicleServiceStatus(vehicle);
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const headerActions = (
    <div className="flex items-center gap-2">
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
        Добавить ТС
      </Button>
    </div>
  );

  return (
    <AppLayout 
      title="Автомобили" 
      description="Учет ТС с контролем ТО и техническими характеристиками"
      icon={Car}
      actions={headerActions}
    >
      <div className="container mx-auto px-6 py-6 space-y-6">
        {/* Vehicle Cards Feature Badge */}
        <Card className="p-4 glass border-emerald-500/20 bg-gradient-to-r from-emerald-500/5 to-green-500/5 rounded-3xl">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-emerald-600 dark:text-emerald-400">Интерактивные карточки ТС</h3>
              <p className="text-sm text-muted-foreground">
                Цветовые индикаторы ТО: зеленый (актуально), желтый (скоро), красный (просрочено). Клик для детального просмотра.
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/30">
                <CheckCircle className="w-3 h-3 mr-1" />
                ТО OK
              </Badge>
              <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/30">
                <Clock className="w-3 h-3 mr-1" />
                Скоро
              </Badge>
              <Badge variant="outline" className="bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/30">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Просрочено
              </Badge>
            </div>
          </div>
        </Card>

        {/* Search & Filters */}
        <Card className="p-4 glass border-border/30 rounded-3xl surface-glow">
          <div className="space-y-4">
            {/* Top row - Search and Service Filter */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="relative">
                <Input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Поиск по номеру, VIN, модели или владельцу"
                  className="pl-9 h-10 rounded-2xl border-border/50 focus:border-primary/50 transition-all duration-300"
                />
                <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              </div>
              
              <div className="flex flex-wrap gap-2">
                <ServiceFilterButton
                  active={serviceFilter === 'all'}
                  onClick={() => setServiceFilter('all')}
                  count={items.length}
                >
                  Все
                </ServiceFilterButton>
                <ServiceFilterButton
                  active={serviceFilter === 'ok'}
                  onClick={() => setServiceFilter('ok')}
                  count={serviceStats.ok || 0}
                  variant="ok"
                >
                  <CheckCircle className="w-3 h-3 mr-1" />
                  ТО OK
                </ServiceFilterButton>
                <ServiceFilterButton
                  active={serviceFilter === 'soon'}
                  onClick={() => setServiceFilter('soon')}
                  count={serviceStats.soon || 0}
                  variant="soon"
                >
                  <Clock className="w-3 h-3 mr-1" />
                  Скоро
                </ServiceFilterButton>
                <ServiceFilterButton
                  active={serviceFilter === 'overdue'}
                  onClick={() => setServiceFilter('overdue')}
                  count={serviceStats.overdue || 0}
                  variant="overdue"
                >
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Просрочено
                </ServiceFilterButton>
              </div>
            </div>

            {/* Bottom row - Catalogue + Extended Filters */}
            <div className="grid grid-cols-1 lg:grid-cols-6 gap-3">
              <select
                value={brandId}
                onChange={(e) => { setBrandId(e.target.value); setModelId(''); setPage(1); }}
                className="h-10 rounded-2xl border border-border/50 bg-background text-sm px-3 focus:border-primary/50 transition-all duration-300"
              >
                <option value="">Все бренды</option>
                {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              
              <select
                value={modelId}
                onChange={(e) => { setModelId(e.target.value); setPage(1); }}
                className="h-10 rounded-2xl border border-border/50 bg-background text-sm px-3 focus:border-primary/50 transition-all duration-300"
              >
                <option value="">Все модели</option>
                {filteredModels.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              
              <select
                value={vehicleTypeId}
                onChange={(e) => { setVehicleTypeId(e.target.value); setPage(1); }}
                className="h-10 rounded-2xl border border-border/50 bg-background text-sm px-3 focus:border-primary/50 transition-all duration-300"
              >
                <option value="">Все типы</option>
                {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>

              <select
                value={engineType}
                onChange={(e) => { setEngineType((e.target.value as EngineType) || ''); setPage(1); }}
                className="h-10 rounded-2xl border border-border/50 bg-background text-sm px-3 focus:border-primary/50 transition-all duration-300"
              >
                <option value="">Двигатель</option>
                {ENGINE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>

              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Год от"
                  value={yearFrom}
                  onChange={(e) => { setYearFrom(e.target.value.replace(/[^\d]/g, '')); setPage(1); }}
                  className="h-10 rounded-2xl"
                />
                <Input
                  type="number"
                  placeholder="Год до"
                  value={yearTo}
                  onChange={(e) => { setYearTo(e.target.value.replace(/[^\d]/g, '')); setPage(1); }}
                  className="h-10 rounded-2xl"
                />
              </div>

              <div className="flex items-center justify-between gap-2 text-sm">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!hasServiceHistory}
                    onChange={(e) => { setHasServiceHistory(e.target.checked); setPage(1); }}
                  />
                  Есть история ТО
                </label>

                <select
                  value={limit}
                  onChange={(e) => { setLimit(parseInt(e.target.value, 10)); setPage(1); }}
                  className="h-10 rounded-2xl border border-border/50 bg-background text-sm px-3 focus:border-primary/50 transition-all duration-300"
                >
                  {[12, 24, 48].map((n) => (
                    <option key={n} value={n}>{n} шт</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <StatsCard
            title="Всего ТС"
            value={data?.total ?? 0}
            icon={Car}
            color="blue"
          />
          <StatsCard
            title="ТО актуально"
            value={serviceStats.ok || 0}
            icon={CheckCircle}
            color="emerald"
          />
          <StatsCard
            title="ТО скоро"
            value={serviceStats.soon || 0}
            icon={Clock}
            color="amber"
          />
          <StatsCard
            title="ТО просрочено"
            value={serviceStats.overdue || 0}
            icon={AlertTriangle}
            color="red"
            highlight={(serviceStats.overdue || 0) > 0}
          />
          <StatsCard
            title="Средний пробег"
            value={Math.round(data?.meta?.averageMileage ?? 0)}
            icon={Gauge}
            color="default"
          />
          <StatsCard
            title="Средний возраст, лет"
            value={Number((data?.meta?.averageAge ?? 0).toFixed(1))}
            icon={Calendar}
            color="default"
          />
        </div>

        {/* Vehicle Cards Grid */}
        <Card className="p-0 glass border-border/30 rounded-3xl surface-glow overflow-hidden">
          {loading ? (
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="h-48 bg-surface-1/40 rounded-3xl animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="p-6 text-center text-destructive">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Zap className="w-5 h-5" />
                <span className="font-medium">Ошибка загрузки</span>
              </div>
              <p>{error}</p>
              <Button onClick={handleRefresh} className="mt-4 rounded-2xl">
                <RefreshCw className="w-4 h-4 mr-2" />
                Повторить
              </Button>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">
              <Car className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h3 className="font-semibold mb-2">Автомобили не найдены</h3>
              <p className="text-sm mb-4">
                {serviceFilter !== 'all' 
                  ? `Нет автомобилей с выбранным статусом ТО`
                  : 'Попробуйте изменить параметры поиска или добавьте первое ТС'
                }
              </p>
              <Button 
                className="rounded-2xl bg-gradient-primary hover:opacity-90"
                onClick={() => setOpenCreate(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Добавить ТС
              </Button>
            </div>
          ) : (
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredItems.map((vehicle) => (
                <VehicleCard key={vehicle.id} vehicle={vehicle} />
              ))}
            </div>
          )}
        </Card>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Показано: {filteredItems.length} из {data.total} автомобилей
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

      <VehicleCreateDialog
        open={openCreate}
        onOpenChange={setOpenCreate}
        onCreated={onCreated}
      />
    </AppLayout>
  );
}

// Helper function to get vehicle service status
function getVehicleServiceStatus(vehicle: VehicleResponse): 'ok' | 'soon' | 'overdue' {
  if (vehicle.needsService) return 'overdue';
  if (vehicle.daysUntilService !== undefined && vehicle.daysUntilService <= 30) return 'soon';
  return 'ok';
}

// Service Filter Button Component
function ServiceFilterButton({
  active,
  onClick,
  count,
  variant = 'default',
  children
}: {
  active: boolean;
  onClick: () => void;
  count: number;
  variant?: 'default' | 'ok' | 'soon' | 'overdue';
  children: React.ReactNode;
}) {
  const { cn } = require('@/lib/utils');
  const variantStyles = {
    default: 'border-border/50',
    ok: 'border-emerald-200 dark:border-emerald-800/30 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300',
    soon: 'border-amber-200 dark:border-amber-800/30 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300',
    overdue: 'border-red-200 dark:border-red-800/30 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300',
  };

  return (
    <Button
      variant={active ? 'default' : 'outline'}
      className={cn(
        "rounded-xl flex-1 text-xs transition-all duration-300 relative",
        active && variant !== 'default' && variantStyles[variant],
        !active && variant !== 'default' && variantStyles[variant]
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-1">
        {children}
        <Badge variant="secondary" className="ml-1 text-xs px-1 py-0 h-4 min-w-4">
          {count}
        </Badge>
      </div>
    </Button>
  );
}

// Stats Card Component
function StatsCard({
  title,
  value,
  icon: Icon,
  color = 'default',
  highlight = false
}: {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color?: 'default' | 'blue' | 'emerald' | 'amber' | 'red';
  highlight?: boolean;
}) {
  const { cn } = require('@/lib/utils');
  const colorStyles = {
    default: 'from-surface-1/40 to-surface-2/40 border-border/30 text-muted-foreground',
    blue: 'from-blue-500/10 to-blue-600/5 border-blue-500/20 text-blue-600 dark:text-blue-400',
    emerald: 'from-emerald-500/10 to-emerald-600/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
    amber: 'from-amber-500/10 to-amber-600/5 border-amber-500/20 text-amber-600 dark:text-amber-400',
    red: 'from-red-500/10 to-red-600/5 border-red-500/20 text-red-600 dark:text-red-400',
  };

  return (
    <Card className={cn(
      'p-4 glass border rounded-2xl bg-gradient-to-br transition-all duration-300 hover:scale-[1.02]',
      colorStyles[color],
      highlight && 'animate-pulse'
    )}>
      <div className="flex items-center gap-3">
        <div className={cn(
          'p-2 rounded-xl',
          color === 'blue' && 'bg-blue-500/20',
          color === 'emerald' && 'bg-emerald-500/20',
          color === 'amber' && 'bg-amber-500/20',
          color === 'red' && 'bg-red-500/20',
          color === 'default' && 'bg-surface-1/40'
        )}>
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{title}</div>
          <div className="text-lg font-bold">{value}</div>
        </div>
      </div>
    </Card>
  );
}

// Enhanced Vehicle Card Component
function VehicleCard({ vehicle }: { vehicle: VehicleResponse }) {
  const { cn } = require('@/lib/utils');
  const model = `${vehicle.model?.brand?.name || ''} ${vehicle.model?.name || ''}`.trim() || 'Автомобиль';
  const owner = vehicle.customer 
    ? [vehicle.customer.firstName, vehicle.customer.lastName].filter(Boolean).join(' ') 
      || vehicle.customer.companyName 
      || 'Клиент'
    : 'Не указан';

  // Service status logic
  const serviceStatus = getVehicleServiceStatus(vehicle);

  const serviceStatusConfig = {
    ok: {
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      icon: CheckCircle,
      text: 'ТО актуально',
      glow: false,
    },
    soon: {
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      icon: Clock,
      text: `ТО через ${vehicle.daysUntilService || '?'} дн.`,
      glow: false,
    },
    overdue: {
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
      icon: AlertTriangle,
      text: 'ТО просрочено!',
      glow: true,
    },
  };

  const config = serviceStatusConfig[serviceStatus];
  const StatusIcon = config.icon;

  return (
    <Link 
      href={`/dashboard/vehicles/${vehicle.id}`}
      className={cn(
        "block group transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1",
        config.glow && "animate-pulse"
      )}
    >
      <Card className={cn(
        "p-4 h-52 glass border-border/30 rounded-3xl surface-glow group-hover:border-primary/30 transition-all duration-500 group-hover:shadow-glass-lg",
        config.glow && "border-red-500/30 shadow-lg shadow-red-500/10"
      )}>
        <div className="flex flex-col h-full">
          {/* Header with status */}
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-r from-emerald-500/20 to-primary/20 group-hover:scale-105 transition-transform duration-300">
              <Car className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <Badge 
              variant="outline" 
              className={cn(
                "text-xs px-2 py-1 rounded-xl border transition-all duration-300",
                config.color,
                config.bg,
                config.border,
                config.glow && "animate-pulse"
              )}
            >
              <StatusIcon className="w-3 h-3 mr-1" />
              <span className="hidden sm:inline">{config.text}</span>
              <span className="sm:hidden">{serviceStatus.toUpperCase()}</span>
            </Badge>
          </div>

          {/* Vehicle info */}
          <div className="flex-1 space-y-3">
            <h3 className="font-semibold text-base line-clamp-1 group-hover:text-primary transition-colors duration-300">
              {model}
            </h3>
            
            <div className="space-y-2 text-xs text-muted-foreground">
              {(vehicle.licensePlate || vehicle.vin) && (
                <div className="flex items-center gap-2">
                  <Hash className="w-3.5 h-3.5 text-muted-foreground/70" />
                  <span className="line-clamp-1 font-mono">
                    {vehicle.licensePlate || vehicle.vin}
                  </span>
                </div>
              )}
              
              {vehicle.mileage && (
                <div className="flex items-center gap-2">
                  <Gauge className="w-3.5 h-3.5 text-muted-foreground/70" />
                  <span>{vehicle.mileage.toLocaleString('ru-RU')} км</span>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-muted-foreground/70" />
                <span className="line-clamp-1">{owner}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-3 mt-auto border-t border-border/20">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {new Date(vehicle.createdAt).toLocaleDateString('ru-RU')}
              </span>
              <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center gap-1 text-primary">
                <span className="font-medium">Подробнее</span>
                <TrendingUp className="w-3 h-3" />
              </div>
            </div>
          </div>

          {/* Hover Effect Border */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10" />
        </div>
      </Card>
    </Link>
  );
}
