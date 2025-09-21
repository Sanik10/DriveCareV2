// path: apps/frontend/app/dashboard/customers/[id]/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AppLayout } from '@/components/app/AppLayout';
import { CustomerTimeline } from '@/components/customers/CustomerTimeline';
import type { TimelineEvent } from '@/lib/types/customers';
import { useAuth } from '@/lib/hooks/use-auth';
import { customersAPI } from '@/lib/api/customers';
import { vehiclesAPI } from '@/lib/api/vehicles';
import { appointmentsAPI } from '@/lib/api/appointments';
import { cn } from '@/lib/utils';
import type { CustomerResponse } from '@/lib/types/customers';
import type { VehicleResponse } from '@/lib/types/vehicles';
import { 
  Users, 
  Phone, 
  Mail, 
  Car, 
  Trash2, 
  AlertTriangle,
  Calendar,
  Plus,
  Download,
  Shield
} from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { OrderCreateDialog } from '@/components/orders/order-create-dialog';
import { Badge } from '@/components/ui/badge';

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
  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  const [openDelete, setOpenDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [openOrderCreate, setOpenOrderCreate] = useState(false);
  const [duplicateHint, setDuplicateHint] = useState<{ count: number; search: string } | null>(null);

  useEffect(() => setIsMounted(true), []);

  type OrderLite = {
    id: string;
    number?: string;
    title?: string;
    description?: string;
    createdAt?: string;
    updatedAt?: string;
    status?: string;
    totalAmount?: number;
  };

  type InvoiceLite = {
    id: string;
    number?: string;
    createdAt?: string;
    updatedAt?: string;
    status?: string;
    total?: number;
    totalAmount?: number;
  };

  type PaymentLite = {
    id: string;
    amount?: number;
    method?: string;
    createdAt?: string;
    processedAt?: string;
    status?: string;
  };

  // Реальная сборка таймлайна: сначала пробуем бэкенд-эндпоинт, иначе — сборка из доступных API
  const buildTimelineFallback = async (c: CustomerResponse, v: VehicleResponse[]): Promise<TimelineEvent[]> => {
    const events: TimelineEvent[] = [];

    // Регистрация клиента
    events.push({
      id: `profile-${c.id}`,
      type: 'profile',
      title: 'Регистрация клиента',
      description: c.companyName ? `Юрлицо: ${c.companyName}` : 'Физлицо',
      date: c.createdAt,
      status: 'success',
    });

    // Автомобили клиента
    v.forEach((vehicle) => {
      const label = `${vehicle.model?.brand?.name || ''} ${vehicle.model?.name || ''}`.trim();
      events.push({
        id: `vehicle-${vehicle.id}`,
        type: 'vehicle',
        title: 'Добавлен автомобиль',
        description: `${label || 'ТС'} (${vehicle.licensePlate || vehicle.vin || '—'})`,
        date: vehicle.createdAt || c.createdAt,
        status: 'info',
        relatedId: vehicle.id,
      });
    });

    // Записи на сервис (appointments)
    try {
      const appointments = await appointmentsAPI.findByCustomer(c.id);
      (appointments || []).forEach((a) => {
        events.push({
          id: `apt-${a.id}`,
          type: 'appointment',
          title: `Запись: ${a.status === 'COMPLETED' ? 'Завершена' : 'Планируется'}`,
          description: `${a.vehicleInfo || ''} • Механик: ${a.mechanicName || '—'}`,
          date: a.startTime || a.createdAt || c.createdAt,
          status: a.status === 'COMPLETED' ? 'success' : a.status === 'CANCELED' ? 'warning' : 'info',
          relatedId: a.id,
          metadata: { status: a.status, priority: a.priority },
        });
      });
    } catch {
      // ignore
    }

    // Заказы, счета, платежи — по возможности (best effort), без жесткой завязки на типы модулей
    try {
      const ordersMod = (await import('@/lib/api/orders').catch(() => null)) as unknown as {
        ordersAPI?: {
          list?: (q: unknown) => Promise<{ items?: OrderLite[] }>;
          findByCustomer?: (customerId: string) => Promise<OrderLite[]>;
        };
      } | null;

      let orders: OrderLite[] = [];
      if (ordersMod?.ordersAPI?.list) {
        const res = await ordersMod.ordersAPI.list({ customerId: c.id, page: 1, limit: 50, sortField: 'createdAt', sortOrder: 'desc' });
        orders = res?.items ?? [];
      } else if (ordersMod?.ordersAPI?.findByCustomer) {
        orders = (await ordersMod.ordersAPI.findByCustomer(c.id)) ?? [];
      }

      orders.forEach((o) => {
        events.push({
          id: `order-${o.id}`,
          type: 'order',
          title: `Заказ-наряд #${o.number || o.id.slice(0, 6)}`,
          description: o.title || o.description || 'Заказ клиента',
          date: o.createdAt || o.updatedAt || c.createdAt,
          status: o.status === 'COMPLETED' || o.status === 'CLOSED' ? 'success' : 'info',
          amount: typeof o.totalAmount === 'number' ? o.totalAmount : undefined,
          relatedId: o.id,
        });
      });
    } catch {
      // ignore
    }

    try {
      const invoicesMod = (await import('@/lib/api/invoices').catch(() => null)) as unknown as {
        invoicesAPI?: { list?: (q: unknown) => Promise<{ items?: InvoiceLite[] }> };
      } | null;

      if (invoicesMod?.invoicesAPI?.list) {
        const res = await invoicesMod.invoicesAPI.list({ customerId: c.id, page: 1, limit: 50, sortField: 'createdAt', sortOrder: 'desc' });
        const items: InvoiceLite[] = res?.items ?? [];
        items.forEach((inv) => {
          events.push({
            id: `invoice-${inv.id}`,
            type: 'invoice',
            title: `Счет #${inv.number || inv.id.slice(0, 6)}`,
            description: inv.status ? `Статус: ${inv.status}` : 'Выставлен счет',
            date: inv.createdAt || inv.updatedAt || c.createdAt,
            status: inv.status === 'PAID' ? 'success' : inv.status === 'OVERDUE' ? 'warning' : 'info',
            amount: typeof inv.total === 'number' ? inv.total : typeof inv.totalAmount === 'number' ? inv.totalAmount : undefined,
            relatedId: inv.id,
          });
        });
      }
    } catch {
      // ignore
    }

    try {
      const paymentsMod = (await import('@/lib/api/payments').catch(() => null)) as unknown as {
        paymentsAPI?: { list?: (q: unknown) => Promise<{ items?: PaymentLite[] }> };
      } | null;

      if (paymentsMod?.paymentsAPI?.list) {
        const res = await paymentsMod.paymentsAPI.list({ customerId: c.id, page: 1, limit: 50, sortField: 'createdAt', sortOrder: 'desc' });
        const items: PaymentLite[] = res?.items ?? [];
        items.forEach((p) => {
          events.push({
            id: `payment-${p.id}`,
            type: 'payment',
            title: `Платеж ${p.status || ''}`.trim(),
            description: p.method ? `Метод: ${p.method}` : undefined,
            date: p.createdAt || p.processedAt || c.createdAt,
            status: p.status === 'succeeded' || p.status === 'PAID' ? 'success' : p.status === 'failed' ? 'error' : 'info',
            amount: typeof p.amount === 'number' ? p.amount : undefined,
            relatedId: p.id,
          });
        });
      }
    } catch {
      // ignore
    }

    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

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
        if (cancelled) return;

        const vehiclesArr = Array.isArray(v) ? v : [];
        setCustomer(c);
        setVehicles(vehiclesArr);

        // Timeline: сначала пробуем серверный /timeline, иначе строим из доступных API
        try {
          const tl = await customersAPI.getTimeline(id);
          if (!cancelled) {
            setTimelineEvents((tl?.events || []) as TimelineEvent[]);
          }
        } catch {
          const events = await buildTimelineFallback(c, vehiclesArr);
          if (!cancelled) setTimelineEvents(events);
        }

        // Check duplicates
        const search = c.email || c.phone || '';
        if (search) {
          try {
            const dup = await customersAPI.getCustomers({ search, page: 1, limit: 5 });
            const others = dup.items.filter((i) => i.id !== c.id);
            if (!cancelled) setDuplicateHint(others.length > 0 ? { count: others.length, search } : null);
          } catch {
            if (!cancelled) setDuplicateHint(null);
          }
        } else {
          if (!cancelled) setDuplicateHint(null);
        }
      } catch (e) {
        try {
          const parsed = JSON.parse((e as Error).message) as { message?: string };
          if (!cancelled) setError(parsed.message || 'Ошибка загрузки клиента');
        } catch {
          if (!cancelled) setError('Ошибка загрузки клиента');
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

  const fullName =
    [customer?.firstName, customer?.lastName].filter(Boolean).join(' ') || customer?.companyName || 'Клиент';

  const headerActions = (
    <div className="flex items-center gap-2">
      <Button 
        variant="outline"
        className="rounded-2xl btn-outline-fixed"
        onClick={() => setOpenOrderCreate(true)}
      >
        <Plus className="w-4 h-4 mr-2" />
        Создать заказ
      </Button>
    </div>
  );

  return (
    <AppLayout 
      title={`Клиент: ${fullName}`}
      description="Профиль клиента и история взаимодействий"
      icon={Users}
      actions={headerActions}
    >
      <div className="container mx-auto px-6 py-6 space-y-6">
        {/* Duplicate Warning */}
        {duplicateHint && (
          <Card className="p-3 border-amber-400/30 bg-amber-500/5 text-amber-400 flex items-center gap-2 rounded-2xl">
            <AlertTriangle className="w-4 h-4" />
            Возможные дубли: {duplicateHint.count}. Проверьте
            <Link
              href={`/dashboard/customers?search=${encodeURIComponent(duplicateHint.search)}`}
              className="underline ml-1 hover:text-amber-300 transition-colors"
            >
              поиск по &ldquo;{duplicateHint.search}&rdquo;
            </Link>
          </Card>
        )}

        {loading ? (
          <div className="space-y-4">
            <div className="h-28 bg-surface-1/40 rounded-3xl animate-pulse" />
            <div className="h-40 bg-surface-1/40 rounded-3xl animate-pulse" />
          </div>
        ) : error ? (
          <Card className="p-6 text-center text-destructive glass border-border/30 rounded-3xl">{error}</Card>
        ) : !customer ? (
          <Card className="p-6 text-center text-muted-foreground glass border-border/30 rounded-3xl">
            Клиент не найден
          </Card>
        ) : (
          <>
            {/* Customer Info */}
            <Card className="p-6 glass border-border/30 rounded-3xl surface-glow">
              <div className="grid lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  {/* Basic Info */}
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-accent/20 flex items-center justify-center">
                      <Users className="w-8 h-8 text-accent" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold mb-2">{fullName}</h2>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        {customer.phone && (
                          <span className="inline-flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            {customer.phone}
                          </span>
                        )}
                        {customer.email && (
                          <span className="inline-flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            {customer.email}
                          </span>
                        )}
                        <span className="inline-flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Клиент с {new Date(customer.createdAt).toLocaleDateString('ru-RU')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                  <Button 
                    className="w-full rounded-2xl bg-gradient-primary hover:opacity-90 transition-all duration-300 hover:scale-[1.02]"
                    onClick={() => setOpenOrderCreate(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Создать заказ
                  </Button>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant="outline" 
                      className="rounded-xl btn-outline-fixed"
                      onClick={handleExport} 
                      disabled={actionLoading}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Экспорт
                    </Button>
                    <Button 
                      variant="outline" 
                      className="rounded-xl btn-outline-fixed"
                      onClick={handleRevokeConsent} 
                      disabled={actionLoading}
                    >
                      <Shield className="w-4 h-4 mr-1" />
                      Согласие
                    </Button>
                  </div>

                  {canDelete && (
                    <Button 
                      variant="destructive" 
                      className="w-full rounded-2xl"
                      onClick={() => setOpenDelete(true)} 
                      disabled={deleting}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Удалить клиента
                    </Button>
                  )}
                </div>
              </div>
            </Card>

            {/* Vehicles */}
            <Card className="p-6 glass border-border/30 rounded-3xl surface-glow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Car className="w-5 h-5 text-emerald-500" />
                  <h3 className="text-lg font-semibold">Автомобили</h3>
                </div>
                <Badge variant="outline" className="text-sm">
                  {vehicles.length} ТС
                </Badge>
              </div>
              
              {vehicles.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Car className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>У клиента пока нет автомобилей</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {vehicles.map((v) => {
                    const model = `${v.model?.brand?.name || ''} ${v.model?.name || ''}`.trim();
                    const history =
                      typeof v.serviceHistoryCount === 'number' ? ` • История: ${v.serviceHistoryCount}` : '';
                    const serviceBadge = v.needsService
                      ? ' • ТО просрочено!'
                      : typeof v.daysUntilService === 'number'
                      ? ` • ТО через ${v.daysUntilService} д.`
                      : '';
                    
                    return (
                      <Link
                        key={v.id}
                        href={`/dashboard/vehicles/${v.id}`}
                        className="p-4 rounded-2xl border border-border/50 hover:bg-surface-1/30 transition-all duration-300 group glass-subtle"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                            <Car className="w-6 h-6 text-emerald-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium">{model || 'Автомобиль'}</div>
                            <div className="text-xs text-muted-foreground line-clamp-1">
                              {v.licensePlate || v.vin || '—'} • Пробег: {v.mileage ?? '—'}
                              {history}
                              {serviceBadge && (
                                <span className={cn(
                                  v.needsService ? 'text-destructive' : 'text-amber-500'
                                )}>
                                  {serviceBadge}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </Card>

            {/* Timeline - Main Feature */}
            <CustomerTimeline 
              events={timelineEvents}
              loading={loading}
            />
          </>
        )}
      </div>

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

      <OrderCreateDialog
        open={openOrderCreate}
        onOpenChange={setOpenOrderCreate}
        initialCustomerId={customer?.id}
        onCreated={(o) => router.push(`/dashboard/orders/${o.id}`)}
      />
    </AppLayout>
  );
}
