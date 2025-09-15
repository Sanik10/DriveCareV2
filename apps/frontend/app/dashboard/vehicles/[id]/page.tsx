// path: apps/frontend/app/dashboard/vehicles/[id]/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/hooks/use-auth';
import { vehiclesAPI } from '@/lib/api/vehicles';
import type { VehicleResponse } from '@/lib/types/vehicles';
import { ArrowLeft, Home, RefreshCw, Car, Gauge, User, Trash2, Clipboard } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { OrderCreateDialog } from '@/components/orders/order-create-dialog';

export default function VehicleDetailsPage() {
  const params = useParams<{ id: string }>();
  const id = useMemo(() => (Array.isArray(params?.id) ? params.id[0] : params?.id) as string, [params]);
  const router = useRouter();
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();

  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vehicle, setVehicle] = useState<VehicleResponse | null>(null);
  const [updating, setUpdating] = useState(false);
  const [mileage, setMileage] = useState<string>('');
  const [openDelete, setOpenDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [openOrderCreate, setOpenOrderCreate] = useState(false);
  const [copyBlink, setCopyBlink] = useState(false);

  useEffect(() => setIsMounted(true), []);

  useEffect(() => {
    if (!isMounted) return;
    if (authLoading) return;
    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }
    if (!id) return;

    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const v = await vehiclesAPI.getVehicle(id);
        if (!cancelled) {
          setVehicle(v);
          setMileage(typeof v.mileage === 'number' ? String(v.mileage) : '');
        }
      } catch (e) {
        try {
          const parsed = JSON.parse((e as Error).message) as { message?: string };
          setError(parsed.message || 'Ошибка загрузки ТС');
        } catch {
          setError('Ошибка загрузки ТС');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [isMounted, authLoading, isAuthenticated, user, router, id]);

  const handleRefresh = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const v = await vehiclesAPI.getVehicle(id);
      setVehicle(v);
      setMileage(typeof v.mileage === 'number' ? String(v.mileage) : '');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMileage = async () => {
    if (!id) return;
    const m = parseInt(mileage, 10);
    if (Number.isNaN(m) || m < 0) {
      setError('Некорректный пробег');
      return;
    }
    setUpdating(true);
    setError(null);
    try {
      const v = await vehiclesAPI.updateMileage(id, m);
      setVehicle(v);
    } catch (e) {
      try {
        const parsed = JSON.parse((e as Error).message) as { message?: string };
        setError(parsed.message || 'Ошибка обновления пробега');
      } catch {
        setError('Ошибка обновления пробега');
      }
    } finally {
      setUpdating(false);
    }
  };

  const roleObj = (user as unknown as { role?: string | { name?: string } } | null)?.role;
  const roleName = (typeof roleObj === 'string' ? roleObj : roleObj?.name || '').toLowerCase();
  const canDelete = ['owner', 'company_owner', 'admin', 'company_admin', 'superadmin'].includes(roleName);

  const handleDelete = async () => {
    if (!id) return;
    setDeleting(true);
    setError(null);
    try {
      await vehiclesAPI.deleteVehicle(id);
      router.push('/dashboard/vehicles');
    } catch (e) {
      try {
        const parsed = JSON.parse((e as Error).message) as { message?: string };
        setError(parsed.message || 'Не удалось удалить ТС');
      } catch {
        setError('Не удалось удалить ТС');
      }
    } finally {
      setDeleting(false);
      setOpenDelete(false);
    }
  };

  const copyText = async (t?: string | null) => {
    if (!t) return;
    try {
      await navigator.clipboard.writeText(t);
      setCopyBlink(true);
      setTimeout(() => setCopyBlink(false), 600);
    } catch (err) {
      void err; // avoid no-empty rule while ignoring clipboard errors
    }
  };

  const serviceInfo = (() => {
    if (!vehicle) return '';
    if (vehicle.needsService) return 'ТО просрочено';
    if (typeof vehicle.daysUntilService === 'number') return `ТО через ${vehicle.daysUntilService} дн.`;
    return '';
  })();

  if (!isMounted) return null;
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }
  if (!isAuthenticated || !user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-surface-1">
      <div className="fixed inset-0 bg-gradient-surface -z-10"></div>
      <div className="fixed top-0 right-0 w-96 h-96 bg-gradient-primary opacity-5 rounded-full blur-3xl -z-10"></div>
      <div className="fixed bottom-0 left-0 w-64 h-64 bg-secondary/10 rounded-full blur-3xl -z-10"></div>

      <header className="border-b border-border/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/dashboard/vehicles">
              <Button variant="ghost">
                <ArrowLeft className="w-4 h-4 mr-2" /> Назад
              </Button>
            </Link>
            <h1 className="text-xl font-bold">
              ТС: {vehicle ? `${vehicle.model?.brand?.name ?? ''} ${vehicle.model?.name ?? ''}`.trim() : '...'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {vehicle?.customer?.id && <Button onClick={() => setOpenOrderCreate(true)}>Создать заказ</Button>}
            <Link href="/dashboard">
              <Button variant="ghost">
                <Home className="w-4 h-4 mr-2" /> В дашборд
              </Button>
            </Link>
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="w-4 h-4 mr-2" /> Обновить
            </Button>
            {canDelete && (
              <Button variant="destructive" onClick={() => setOpenDelete(true)}>
                <Trash2 className="w-4 h-4 mr-2" /> Удалить
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-6 space-y-6">
        {loading ? (
          <div className="space-y-4">
            <div className="h-28 bg-surface-1 rounded-md animate-pulse" />
            <div className="h-40 bg-surface-1 rounded-md animate-pulse" />
          </div>
        ) : error ? (
          <Card className="p-6 text-center text-destructive">{error}</Card>
        ) : !vehicle ? (
          <Card className="p-6 text-center text-muted-foreground">ТС не найдено</Card>
        ) : (
          <>
            <Card className="p-6 backdrop-blur-sm bg-card/80 border-border/50">
              <div className="grid md:grid-cols-3 gap-6">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                    <Car className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Модель</div>
                    <div className="font-medium">
                      {vehicle.model?.brand?.name} {vehicle.model?.name}
                    </div>
                    <div className="text-xs text-muted-foreground inline-flex items-center gap-2">
                      <span
                        className={copyBlink ? 'font-semibold text-foreground' : 'cursor-pointer hover:underline'}
                        onClick={() => copyText(vehicle.licensePlate || vehicle.vin)}
                        title="Клик для копирования"
                      >
                        {vehicle.licensePlate || vehicle.vin || '—'}
                      </span>
                      <Clipboard className="w-3.5 h-3.5 opacity-60" />
                    </div>
                    {!!serviceInfo && (
                      <div className={vehicle.needsService ? 'text-xs text-rose-400 mt-1' : 'text-xs text-amber-400 mt-1'}>
                        {serviceInfo}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground mb-1">Владелец</div>
                  {vehicle.customer ? (
                    <Link
                      href={`/dashboard/customers/${vehicle.customer.id}`}
                      className="inline-flex items-center gap-2 text-sm hover:underline"
                    >
                      <User className="w-4 h-4" />
                      {[vehicle.customer.firstName, vehicle.customer.lastName].filter(Boolean).join(' ') ||
                        vehicle.customer.companyName ||
                        'Клиент'}
                    </Link>
                  ) : (
                    <div className="text-sm text-muted-foreground">—</div>
                  )}
                </div>

                <div>
                  <div className="text-sm text-muted-foreground mb-1">Пробег</div>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Input value={mileage} onChange={(e) => setMileage(e.target.value)} className="pr-10" placeholder="Пробег" />
                      <Gauge className="absolute right-2 top-2.5 w-4 h-4 text-muted-foreground" />
                    </div>
                    <Button size="sm" onClick={handleUpdateMileage} disabled={updating}>
                      Обновить
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </>
        )}
      </main>

      <ConfirmDialog
        open={openDelete}
        onOpenChange={setOpenDelete}
        title="Удалить ТС?"
        description="Будет выполнена деактивация автомобиля (мягкое удаление). Данные сохранятся для ретеншна."
        confirmText="Удалить"
        variant="destructive"
        loading={deleting}
        onConfirm={handleDelete}
      />

      <OrderCreateDialog
        open={openOrderCreate}
        onOpenChange={setOpenOrderCreate}
        initialVehicleId={id}
        initialCustomerId={vehicle?.customer?.id}
        onCreated={(o) => router.push(`/dashboard/orders/${o.id}`)}
      />
    </div>
  );
}
