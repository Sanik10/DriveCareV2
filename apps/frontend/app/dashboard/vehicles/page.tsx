// path: apps/frontend/app/dashboard/vehicles/page.tsx
"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Car, Search, RefreshCw, ChevronRight, Plus } from 'lucide-react';
import { useAuth } from '@/lib/hooks/use-auth';
import { vehiclesAPI } from '@/lib/api/vehicles';
import type { VehiclesQuery, PaginatedVehiclesResponse, VehicleResponse } from '@/lib/types/vehicles';
import { VehicleCreateDialog } from '@/components/vehicles/vehicle-create-dialog';
import { vehiclesCatalogueAPI } from '@/lib/api/vehicles-catalogue';
import type { CatalogueBrand, CatalogueModel, CatalogueType } from '@/lib/types/vehicles-catalogue';

export default function VehiclesListPage() {
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PaginatedVehiclesResponse | null>(null);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

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
          const parsed = JSON.parse((e as Error).message) as { message?: string };
          if (!cancelled) setError(parsed.message || 'Ошибка загрузки автомобилей');
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

  const onCreated = async () => {
    setPage(1);
    const res = await vehiclesAPI.getVehicles({ ...query, page: 1 });
    setData(res);
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
            <div className="p-2 rounded-lg bg-emerald-500/20">
              <Car className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Автомобили</h1>
              <p className="text-xs text-muted-foreground">Учет ТС и базовые данные</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard">
              <Button variant="ghost">В дашборд</Button>
            </Link>
            <Button variant="outline" onClick={() => setPage(1)}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Обновить
            </Button>
            <Button onClick={() => setOpenCreate(true)}>
              <Plus className="w-4 h-4 mr-2" /> Новое ТС
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-6 space-y-6">
        <Card className="p-4 backdrop-blur-sm bg-card/80 border-border/50">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="relative md:col-span-2">
              <Input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Поиск по номеру / VIN / модели"
                className="pl-9"
              />
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
            </div>
            <div className="flex gap-2">
              <select
                value={brandId}
                onChange={(e) => { setBrandId(e.target.value); setModelId(''); setPage(1); }}
                className="w-full h-9 rounded-md border border-border bg-background text-sm px-3"
              >
                <option value="">Бренд</option>
                {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <select
                value={modelId}
                onChange={(e) => { setModelId(e.target.value); setPage(1); }}
                className="w-full h-9 rounded-md border border-border bg-background text-sm px-3"
              >
                <option value="">Модель</option>
                {filteredModels.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              <select
                value={vehicleTypeId}
                onChange={(e) => { setVehicleTypeId(e.target.value); setPage(1); }}
                className="w-full h-9 rounded-md border border-border bg-background text-sm px-3"
              >
                <option value="">Тип</option>
                {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="flex gap-2">
              <select
                value={limit}
                onChange={(e) => { setLimit(parseInt(e.target.value, 10)); setPage(1); }}
                className="w-28 h-9 rounded-md border border-border bg-background text-sm px-3"
              >
                {[10, 20, 50].map((n) => (
                  <option key={n} value={n}>{n} / стр</option>
                ))}
              </select>
              <Button variant="outline" onClick={() => setPage(1)}>Применить</Button>
            </div>
          </div>
        </Card>

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
            <div className="p-10 text-center text-muted-foreground">
              Автомобили не найдены
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {items.map((v) => <VehicleRow key={v.id} vehicle={v} />)}
            </div>
          )}
        </Card>

        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Всего: {data?.total || 0}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
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

      <VehicleCreateDialog
        open={openCreate}
        onOpenChange={setOpenCreate}
        onCreated={onCreated}
      />
    </div>
  );
}

function VehicleRow({ vehicle }: { vehicle: VehicleResponse }) {
  const model = `${vehicle.model?.brand?.name || ''} ${vehicle.model?.name || ''}`.trim();
  const serviceBadge = vehicle.needsService
    ? ' · ТО просрочено'
    : (typeof vehicle.daysUntilService === 'number' ? ` · ТО через ${vehicle.daysUntilService} д.` : '');
  const history = typeof vehicle.serviceHistoryCount === 'number' ? ` · История: ${vehicle.serviceHistoryCount}` : '';

  return (
    <Link href={`/dashboard/vehicles/${vehicle.id}`} className="block hover:bg-surface-1/60 transition-colors">
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
            <Car className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <div className="font-medium">
              {model}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {vehicle.licensePlate || vehicle.vin || 'ТС'} · Пробег: {vehicle.mileage ?? '—'}{history}{serviceBadge}
            </div>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground ml-2" />
      </div>
    </Link>
  );
}
