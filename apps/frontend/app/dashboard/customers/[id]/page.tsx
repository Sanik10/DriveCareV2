// path: apps/frontend/app/dashboard/customers/[id]/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/lib/hooks/use-auth';
import { customersAPI } from '@/lib/api/customers';
import { vehiclesAPI } from '@/lib/api/vehicles';
import type { CustomerResponse } from '@/lib/types/customers';
import type { VehicleResponse } from '@/lib/types/vehicles';
import { ArrowLeft, Home, RefreshCw, Users, Phone, Mail, Car, Trash2, AlertTriangle } from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { OrderCreateDialog } from '@/components/orders/order-create-dialog';

export default function CustomerDetailsPage() {
  const params = useParams<{ id: string }>();
  const id = useMemo(() => (Array.isArray(params?.id) ? params.id[0] : params?.id) as string, [params]);
  const router = useRouter();
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();

  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customer, setCustomer] = useState<CustomerResponse | null>(null);
  const [vehicles, setVehicles] = useState<VehicleResponse[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  const [openDelete, setOpenDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [openOrderCreate, setOpenOrderCreate] = useState(false);
  const [duplicateHint, setDuplicateHint] = useState<{ count: number; search: string } | null>(null);

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
    async function loadAll() {
      setLoading(true);
      setError(null);
      try {
        const [c, v] = await Promise.all([
          customersAPI.getCustomer(id),
          vehiclesAPI.getCustomerVehicles(id).catch(() => []),
        ]);
        if (!cancelled) {
          setCustomer(c);
          setVehicles(Array.isArray(v) ? v : []);
          // duplicates by email/phone
          const search = c.email || c.phone || '';
          if (search) {
            try {
              const dup = await customersAPI.getCustomers({ search, page: 1, limit: 5 });
              const others = dup.items.filter((i) => i.id !== c.id);
              if (others.length > 0) setDuplicateHint({ count: others.length, search });
              else setDuplicateHint(null);
            } catch {
              setDuplicateHint(null);
            }
          } else {
            setDuplicateHint(null);
          }
        }
      } catch (e) {
        try {
          const parsed = JSON.parse((e as Error).message) as { message?: string };
          setError(parsed.message || 'Ошибка загрузки клиента');
        } catch {
          setError('Ошибка загрузки клиента');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadAll();
    return () => {
      cancelled = true;
    };
  }, [isMounted, authLoading, isAuthenticated, user, router, id]);

  const handleRefresh = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [c, v] = await Promise.all([
        customersAPI.getCustomer(id),
        vehiclesAPI.getCustomerVehicles(id).catch(() => []),
      ]);
      setCustomer(c);
      setVehicles(Array.isArray(v) ? v : []);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    if (!id) return;
    setActionLoading(true);
    setError(null);
    try {
      const { blob, filename } = await customersAPI.exportCustomer(id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename || `customer_${id}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      try {
        const parsed = JSON.parse((e as Error).message) as { message?: string };
        setError(parsed.message || 'Ошибка экспорта');
      } catch {
        setError('Ошибка экспорта');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeConsent = async () => {
    if (!id) return;
    setActionLoading(true);
    setError(null);
    try {
      const updated = await customersAPI.revokeConsent(id);
      setCustomer(updated);
    } catch (e) {
      try {
        const parsed = JSON.parse((e as Error).message) as { message?: string };
        setError(parsed.message || 'Не удалось отозвать согласие');
      } catch {
        setError('Не удалось отозвать согласие');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const roleObj = (user as unknown as { role?: string | { name?: string } } | null)?.role;
  const roleName = (typeof roleObj === 'string' ? roleObj : roleObj?.name || '').toLowerCase();
  const canDelete = ['owner', 'company_owner', 'admin', 'company_admin', 'superadmin'].includes(roleName);

  const confirmDelete = async () => {
    if (!id) return;
    setDeleting(true);
    setError(null);
    try {
      await customersAPI.deleteCustomer?.(id);
      router.push('/dashboard/customers');
    } catch (e) {
      try {
        const parsed = JSON.parse((e as Error).message) as { message?: string };
        setError(parsed.message || 'Не удалось удалить клиента');
      } catch {
        setError('Не удалось удалить клиента');
      }
    } finally {
      setDeleting(false);
      setOpenDelete(false);
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

  const fullName =
    [customer?.firstName, customer?.lastName].filter(Boolean).join(' ') || customer?.companyName || 'Клиент';

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-surface-1">
      <div className="fixed inset-0 bg-gradient-surface -z-10"></div>
      <div className="fixed top-0 right-0 w-96 h-96 bg-gradient-primary opacity-5 rounded-full blur-3xl -z-10"></div>
      <div className="fixed bottom-0 left-0 w-64 h-64 bg-secondary/10 rounded-full blur-3xl -z-10"></div>

      <header className="border-b border-border/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/dashboard/customers">
              <Button variant="ghost">
                <ArrowLeft className="w-4 h-4 mr-2" /> Назад
              </Button>
            </Link>
            <h1 className="text-xl font-bold">Клиент: {fullName}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setOpenOrderCreate(true)}>Создать заказ</Button>
            <Link href="/dashboard">
              <Button variant="ghost">
                <Home className="w-4 h-4 mr-2" /> В дашборд
              </Button>
            </Link>
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="w-4 h-4 mr-2" /> Обновить
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-6 space-y-6">
        {duplicateHint && (
          <Card className="p-3 border-amber-400/30 bg-amber-500/5 text-amber-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Возможные дубли: {duplicateHint.count}. Проверьте
            <Link
              href={`/dashboard/customers?search=${encodeURIComponent(duplicateHint.search)}`}
              className="underline ml-1"
            >
              поиск по “{duplicateHint.search}”
            </Link>
          </Card>
        )}

        {loading ? (
          <div className="space-y-4">
            <div className="h-28 bg-surface-1 rounded-md animate-pulse" />
            <div className="h-40 bg-surface-1 rounded-md animate-pulse" />
          </div>
        ) : error ? (
          <Card className="p-6 text-center text-destructive">{error}</Card>
        ) : !customer ? (
          <Card className="p-6 text-center text-muted-foreground">Клиент не найден</Card>
        ) : (
          <>
            <Card className="p-6 backdrop-blur-sm bg-card/80 border-border/50">
              <div className="grid md:grid-cols-3 gap-6">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                    <Users className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground mb-1">Имя</div>
                    <div className="font-medium">{fullName}</div>
                  </div>
                </div>

                <div>
                  <div className="text-sm text-muted-foreground mb-1">Контакты</div>
                  <div className="text-sm flex flex-col gap-1">
                    {customer.phone && (
                      <span className="inline-flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" /> {customer.phone}
                      </span>
                    )}
                    {customer.email && (
                      <span className="inline-flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" /> {customer.email}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Link href={`/dashboard/orders/new?customerId=${customer.id}`}>
                    <Button>Создать заказ</Button>
                  </Link>
                  <Button variant="outline" onClick={handleExport} disabled={actionLoading}>
                    Экспорт
                  </Button>
                  <Button variant="outline" onClick={handleRevokeConsent} disabled={actionLoading}>
                    Отозвать согласие
                  </Button>
                  {canDelete && (
                    <Button variant="destructive" onClick={() => setOpenDelete(true)} disabled={deleting}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Удалить
                    </Button>
                  )}
                </div>
              </div>
            </Card>

            <Card className="p-6 backdrop-blur-sm bg-card/80 border-border/50">
              <div className="flex items-center justify-between mb-4">
                <div className="text-lg font-semibold">Автомобили</div>
                <div className="text-sm text-muted-foreground">Всего: {vehicles.length}</div>
              </div>
              {vehicles.length === 0 ? (
                <div className="text-sm text-muted-foreground">У клиента пока нет автомобилей</div>
              ) : (
                <div className="grid md:grid-cols-2 gap-3">
                  {vehicles.map((v) => {
                    const model = `${v.model?.brand?.name || ''} ${v.model?.name || ''}`.trim();
                    const history =
                      typeof v.serviceHistoryCount === 'number' ? ` · История: ${v.serviceHistoryCount}` : '';
                    const serviceBadge = v.needsService
                      ? ' · ТО!'
                      : typeof v.daysUntilService === 'number'
                      ? ` · ТО через ${v.daysUntilService} д.`
                      : '';
                    return (
                      <div
                        key={v.id}
                        className="p-3 rounded-md border border-border/50 hover:bg-surface-1/60 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <Link href={`/dashboard/vehicles/${v.id}`} className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-emerald-500/20 flex items-center justify-center">
                              <Car className="w-4 h-4 text-emerald-500" />
                            </div>
                            <div>
                              <div className="font-medium">{model}</div>
                              <div className="text-xs text-muted-foreground">
                                {v.licensePlate || v.vin || '—'} · Пробег: {v.mileage ?? '—'}
                                {history}
                                {serviceBadge}
                              </div>
                            </div>
                          </Link>
                          <Button size="sm" onClick={() => setOpenOrderCreate(true)}>
                            Заказ
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </>
        )}
      </main>

      <ConfirmDialog
        open={openDelete}
        onOpenChange={setOpenDelete}
        title="Удалить клиента?"
        description="Будет выполнена мягкая запись: isDeleted=true (ретеншн сохранится). Продолжить?"
        confirmText="Удалить"
        variant="destructive"
        loading={deleting}
        onConfirm={confirmDelete}
      />

      {/* Create Order from Customer */}
      <OrderCreateDialog
        open={openOrderCreate}
        onOpenChange={setOpenOrderCreate}
        initialCustomerId={customer?.id}
        onCreated={(o) => router.push(`/dashboard/orders/${o.id}`)}
      />
    </div>
  );
}
