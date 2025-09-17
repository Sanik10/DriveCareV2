// path: apps/frontend/app/dashboard/customers/[id]/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AppLayout } from '@/components/app/AppLayout';
import { CustomerTimeline, type TimelineEvent } from '@/components/customers/CustomerTimeline';
import { useAuth } from '@/lib/hooks/use-auth';
import { customersAPI } from '@/lib/api/customers';
import { vehiclesAPI } from '@/lib/api/vehicles';
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
import { cn } from '@/lib/utils';

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

  // Generate sample timeline events (in real app this would come from API)
  const generateTimelineEvents = (customer: CustomerResponse, vehicles: VehicleResponse[]): TimelineEvent[] => {
    const events: TimelineEvent[] = []
    
    // Customer registration
    events.push({
      id: `reg-${customer.id}`,
      type: 'profile',
      title: 'Регистрация клиента',
      description: 'Клиент зарегистрирован в системе',
      date: customer.createdAt,
      status: 'success'
    })

    // Vehicle registrations
    vehicles.forEach(vehicle => {
      events.push({
        id: `vehicle-${vehicle.id}`,
        type: 'vehicle',
        title: 'Добавлен автомобиль',
        description: `${vehicle.model?.brand?.name || ''} ${vehicle.model?.name || ''} (${vehicle.licensePlate || vehicle.vin})`,
        date: vehicle.createdAt || customer.createdAt,
        status: 'info',
        relatedId: vehicle.id
      })
    })

    // Sample orders (would come from orders API)
    const sampleOrders = [
      {
        date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        title: 'Заказ-наряд #1001',
        description: 'Диагностика и замена масла',
        amount: 5500,
        status: 'success' as const
      },
      {
        date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        title: 'Заказ-наряд #987',
        description: 'Замена тормозных колодок',
        amount: 8200,
        status: 'success' as const
      }
    ]

    sampleOrders.forEach((order, index) => {
      events.push({
        id: `order-${index}`,
        type: 'order',
        title: order.title,
        description: order.description,
        date: order.date,
        amount: order.amount,
        status: order.status,
        relatedId: `order-${index}`
      })
    })

    // Sample communications
    events.push({
      id: 'call-1',
      type: 'call',
      title: 'Исходящий звонок',
      description: 'Консультация по ремонту',
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'info'
    })

    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

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
          
          // Generate timeline events
          setTimelineEvents(generateTimelineEvents(c, Array.isArray(v) ? v : []))
          
          // Check for duplicates
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
                            <div className="font-medium">{model}</div>
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
