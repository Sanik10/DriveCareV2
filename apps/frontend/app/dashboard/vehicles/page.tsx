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
  Calendar
} from 'lucide-react';
import { useAuth } from '@/lib/hooks/use-auth';
import { vehiclesAPI } from '@/lib/api/vehicles';
import { vehiclesCatalogueAPI } from '@/lib/api/vehicles-catalogue';
import { cn } from '@/lib/utils';
import type { 
  VehiclesQuery, 
  PaginatedVehiclesResponse, 
  VehicleResponse 
} from '@/lib/types/vehicles';
import type { 
  CatalogueBrand, 
  CatalogueModel, 
  CatalogueType 
} from '@/lib/types/vehicles-catalogue';
import { VehicleCreateDialog } from '@/components/vehicles/vehicle-create-dialog';

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
  }), [search, page, limit, modelId, vehicleTypeId]);

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
            <span className="text-muted-foreground">Загрузка...</span>
          </div>
        </div>
      </AppLayout>
    );
  }
  if (!isAuthenticated || !user) return null;

  const items = data?.items || [];
  
  // Filter by service status
  const filteredItems = items.filter(vehicle => {
    if (serviceFilter === 'all') return true;
    if (serviceFilter === 'overdue') return vehicle.needsService;
    if (serviceFilter === 'soon') return !vehicle.needsService && (vehicle.daysUntilService !== undefined && vehicle.daysUntilService <= 30);
    if (serviceFilter === 'ok') return !vehicle.needsService && (vehicle.daysUntilService === undefined || vehicle.daysUntilService > 30);
    return true;
  });

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
        <Card className="p-4 glass border-emerald-500/20 bg-gradient-to-r from-emerald-500/5 to-service-ok/5 rounded-3xl">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-r from-emerald-500 to-service-ok">
              <Car className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-emerald-600 dark:text-emerald-400">Интерактивные карточки ТС</h3>
              <p className="text-sm text-muted-foreground">
                Цветовые индикаторы ТО: зеленый (актуально), желтый (скоро), красный (просрочено). Клик для детального просмотра.
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Badge variant="outline" className="bg-service-ok/10 text-service-ok border-service-ok/20">
                ТО OK
              </Badge>
              <Badge variant="outline" className="bg-service-soon/10 text-service-soon border-service-soon/20">
                Скоро
              </Badge>
              <Badge variant="outline" className="bg-service-overdue/10 text-service-overdue border-service-overdue/20">
                Просрочено
              </Badge>
            </div>
          </div>
        </Card>

        {/* Search & Filters */}
        <Card className="p-4 glass border-border/30 rounded-3xl surface-glow">
          <div className="space-y-4">
            {/* Top row - Search and Service Filter */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="relative md:col-span-2">
                <Input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Поиск по номеру, VIN, модели или владельцу"
                  className="pl-9 h-10 rounded-2xl border-border/50 focus:border-primary/50 transition-all duration-300"
                />
                <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant={serviceFilter === 'all' ? 'default' : 'outline'}
                  className="rounded-xl flex-1 text-xs"
                  onClick={() => setServiceFilter('all')}
                >
                  Все
                </Button>
                <Button
                  variant={serviceFilter === 'ok' ? 'default' : 'outline'}
                  className="rounded-xl flex-1 text-xs bg-service-ok/10 text-service-ok border-service-ok/20 hover:bg-service-ok/20"
                  onClick={() => setServiceFilter('ok')}
                >
                  <CheckCircle className="w-3 h-3 mr-1" />
                  ТО OK
                </Button>
                <Button
                  variant={serviceFilter === 'soon' ? 'default' : 'outline'}
                  className="rounded-xl flex-1 text-xs bg-service-soon/10 text-service-soon border-service-soon/20 hover:bg-service-soon/20"
                  onClick={() => setServiceFilter('soon')}
                >
                  <Clock className="w-3 h-3 mr-1" />
                  Скоро
                </Button>
                <Button
                  variant={serviceFilter === 'overdue' ? 'default' : 'outline'}
                  className="rounded-xl flex-1 text-xs bg-service-overdue/10 text-service-overdue border-service-overdue/20 hover:bg-service-overdue/20"
                  onClick={() => setServiceFilter('overdue')}
                >
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Просрочено
                </Button>
              </div>
            </div>

            {/* Bottom row - Catalogue Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
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
              
              <div className="flex items-center gap-2">
                <select
                  value={limit}
                  onChange={(e) => { setLimit(parseInt(e.target.value, 10)); setPage(1); }}
                  className="w-20 h-10 rounded-xl border border-border/50 bg-background text-sm px-2 focus:border-primary/50 transition-all duration-300"
                >
                  {[12, 24, 48].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <div className="flex items-center text-sm text-muted-foreground">
                  <Filter className="w-4 h-4 mr-2" />
                  Ctrl/Cmd + K
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Vehicle Cards Grid */}
        <Card className="p-0 glass border-border/30 rounded-3xl surface-glow overflow-hidden">
          {loading ? (
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="h-48 bg-surface-1/40 rounded-3xl animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="p-6 text-center text-destructive">{error}</div>
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

function VehicleCard({ vehicle }: { vehicle: VehicleResponse }) {
  const model = `${vehicle.model?.brand?.name || ''} ${vehicle.model?.name || ''}`.trim() || 'Автомобиль';
  const owner = vehicle.customer 
    ? [vehicle.customer.firstName, vehicle.customer.lastName].filter(Boolean).join(' ') 
      || vehicle.customer.companyName 
      || 'Клиент'
    : 'Не указан';

  // Service status logic
  const getServiceStatus = () => {
    if (vehicle.needsService) return 'overdue';
    if (vehicle.daysUntilService !== undefined && vehicle.daysUntilService <= 30) return 'soon';
    return 'ok';
  };

  const serviceStatus = getServiceStatus();
  const serviceStatusConfig = {
    ok: {
      color: 'text-service-ok',
      bg: 'bg-service-ok/10',
      border: 'border-service-ok/20',
      icon: CheckCircle,
      text: 'ТО актуально',
      glow: false,
    },
    soon: {
      color: 'text-service-soon',
      bg: 'bg-service-soon/10',
      border: 'border-service-soon/20',
      icon: Clock,
      text: `ТО через ${vehicle.daysUntilService} дн.`,
      glow: false,
    },
    overdue: {
      color: 'text-service-overdue',
      bg: 'bg-service-overdue/10',
      border: 'border-service-overdue/20',
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
        "block group transition-all duration-300 hover:scale-[1.02]",
        config.glow && "animate-glow-pulse"
      )}
    >
      <Card className={cn(
        "p-4 h-48 glass border-border/30 rounded-3xl surface-glow group-hover:border-primary/30 transition-all duration-300",
        config.glow && "border-service-overdue/30 shadow-lg shadow-service-overdue/20"
      )}>
        <div className="flex flex-col h-full">
          {/* Header with status */}
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 group-hover:scale-105 transition-transform">
              <Car className="w-5 h-5 text-emerald-500" />
            </div>
            <Badge 
              variant="outline" 
              className={cn(
                "text-xs px-2 py-1 rounded-xl",
                config.color,
                config.bg,
                config.border
              )}
            >
              <StatusIcon className="w-3 h-3 mr-1" />
              {config.text}
            </Badge>
          </div>

          {/* Vehicle info */}
          <div className="flex-1 space-y-2">
            <h3 className="font-semibold text-base line-clamp-1 group-hover:text-primary transition-colors">
              {model}
            </h3>
            
            <div className="space-y-1 text-xs text-muted-foreground">
              {(vehicle.licensePlate || vehicle.vin) && (
                <div className="flex items-center gap-1">
                  <Hash className="w-3 h-3" />
                  <span className="line-clamp-1">
                    {vehicle.licensePlate || vehicle.vin}
                  </span>
                </div>
              )}
              
              {vehicle.mileage && (
                <div className="flex items-center gap-1">
                  <Gauge className="w-3 h-3" />
                  <span>{vehicle.mileage.toLocaleString()} км</span>
                </div>
              )}
              
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                <span className="line-clamp-1">{owner}</span>
              </div>

              {vehicle.serviceHistoryCount !== undefined && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>Ремонтов: {vehicle.serviceHistoryCount}</span>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="pt-2 mt-auto border-t border-border/20">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Добавлен: {new Date(vehicle.createdAt).toLocaleDateString('ru-RU')}</span>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-xl h-6 px-2 opacity-0 group-hover:opacity-100 transition-all duration-300"
              >
                Подробнее
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
