// path: apps/frontend/app/dashboard/orders/[id]/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AppLayout } from '@/components/app/AppLayout';
import { useAuth } from '@/lib/hooks/use-auth';
import { ordersAPI } from '@/lib/api/orders';
import type {
  OrderResponse,
  OrderServiceResponse,
  OrderPartResponse,
  OrderStatus,
} from '@/lib/types/orders';
import {
  ArrowLeft,
  RefreshCw,
  Shield,
  Calendar,
  BadgePercent,
  Truck,
  CheckCircle2,
  Plus,
  Pencil,
  Trash2,
  Play,
  Flag,
  UserPlus,
  Save,
  Wrench,
  Clock,
  Car,
  User,
  Phone,
  MapPin,
  Sparkles,
  TrendingUp,
  DollarSign,
  Zap,
  Settings,
} from 'lucide-react';
import { OrderServiceAddDialog } from '@/components/orders/order-service-add-dialog';
import { OrderPartAddDialog } from '@/components/orders/order-part-add-dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const STATUS_LABELS: Record<OrderStatus, string> = {
  new: 'Новый',
  in_progress: 'В работе',
  awaiting_parts: 'Ожидание запчастей',
  completed: 'Завершен',
  canceled: 'Отменен',
};

const STATUS_COLORS = {
  new: { bg: 'bg-sky-500/10', text: 'text-sky-600 dark:text-sky-400', border: 'border-sky-500/20' },
  in_progress: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/20' },
  awaiting_parts: { bg: 'bg-violet-500/10', text: 'text-violet-600 dark:text-violet-400', border: 'border-violet-500/20' },
  completed: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/20' },
  canceled: { bg: 'bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-500/20' },
} as const;

export default function OrderDetailsPage() {
  const params = useParams<{ id: string }>();
  const id = useMemo(() => (Array.isArray(params?.id) ? params.id[0] : params?.id) as string, [params]);
  const router = useRouter();
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();

  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [services, setServices] = useState<OrderServiceResponse[]>([]);
  const [parts, setParts] = useState<OrderPartResponse[]>([]);
  const [updating, setUpdating] = useState(false);
  const [newStatus, setNewStatus] = useState<OrderStatus | ''>('');

  const [openAddService, setOpenAddService] = useState(false);
  const [openAddPart, setOpenAddPart] = useState(false);

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
        const [o, srv, prts] = await Promise.all([
          ordersAPI.getOrder(id),
          ordersAPI.getOrderServices(id),
          ordersAPI.getOrderParts(id),
        ]);
        if (!cancelled) {
          setOrder(o);
          setServices(srv.services || []);
          setParts(prts.parts || []);
          setNewStatus(o.status);
        }
      } catch (e) {
        try {
          const parsed = JSON.parse((e as Error).message) as { message?: string };
          setError(parsed.message || 'Ошибка загрузки заказа');
        } catch {
          setError('Ошибка загрузки заказа');
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
      const [o, srv, prts] = await Promise.all([
        ordersAPI.getOrder(id),
        ordersAPI.getOrderServices(id),
        ordersAPI.getOrderParts(id),
      ]);
      setOrder(o);
      setServices(srv.services || []);
      setParts(prts.parts || []);
      setNewStatus(o.status);
    } finally {
      setLoading(false);
    }
  };

  // FIX: принимаем статус как аргумент, чтобы избежать гонки setState -> чтение старого значения
  const handleUpdateStatus = async (statusArg?: OrderStatus) => {
    const statusToSet = statusArg ?? newStatus;
    if (!id || !statusToSet) return;
    setUpdating(true);
    setError(null);
    try {
      const updated = await ordersAPI.updateOrderStatus(id, statusToSet);
      setOrder(updated);
      setNewStatus(updated.status);
      toast.success('Статус заказа обновлен');
    } catch (e) {
      try {
        const parsed = JSON.parse((e as Error).message) as { message?: string };
        setError(parsed.message || 'Ошибка обновления статуса');
      } catch {
        setError('Ошибка обновления статуса');
      }
    } finally {
      setUpdating(false);
    }
  };

  const getUserId = (u: unknown): string | undefined => {
    if (u && typeof u === 'object' && 'id' in u) {
      const maybe = (u as { id?: unknown }).id;
      return typeof maybe === 'string' ? maybe : undefined;
    }
    return undefined;
  };

  const handleAssignMe = async () => {
    if (!id) return;
    const myId = getUserId(user);
    if (!myId) {
      toast.error('Не удалось определить текущего пользователя');
      return;
    }
    try {
      const updated = await ordersAPI.assignMechanic(id, myId);
      setOrder(updated);
      toast.success('Исполнитель назначен');
    } catch (e) {
      try {
        const parsed = JSON.parse((e as Error).message) as { message?: string };
        toast.error(parsed.message || 'Ошибка назначения исполнителя');
      } catch {
        toast.error('Ошибка назначения исполнителя');
      }
    }
  };

  const quickToInProgress = async () => {
    await handleUpdateStatus('in_progress');
  };
  const quickToCompleted = async () => {
    await handleUpdateStatus('completed');
  };

  const handleRecalculate = async () => {
    if (!id) return;
    setUpdating(true);
    setError(null);
    try {
      const o = await ordersAPI.recalculateTotals(id);
      setOrder(o);
      toast.success('Финансы пересчитаны');
    } catch (e) {
      try {
        const parsed = JSON.parse((e as Error).message) as { message?: string };
        setError(parsed.message || 'Ошибка пересчета');
      } catch {
        setError('Ошибка пересчета');
      }
    } finally {
      setUpdating(false);
    }
  };

  const onServiceAdded = async () => {
    if (!id) return;
    const [o, srv] = await Promise.all([ordersAPI.getOrder(id), ordersAPI.getOrderServices(id)]);
    setOrder(o);
    setServices(srv.services || []);
    toast.success('Услуга добавлена');
  };

  const onPartAdded = async () => {
    if (!id) return;
    const [o, prts] = await Promise.all([ordersAPI.getOrder(id), ordersAPI.getOrderParts(id)]);
    setOrder(o);
    setParts(prts.parts || []);
    toast.success('Запчасть добавлена');
  };

  if (!isMounted) return null;

  if (authLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-muted-foreground">Загрузка заказа...</span>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!isAuthenticated || !user) return null;

  const orderNumber = order?.orderNumber || '...';

  const headerActions = (
    <div className="flex items-center gap-2">
      <Link href="/dashboard/orders">
        <Button variant="outline" className="rounded-2xl btn-outline-fixed">
          <ArrowLeft className="w-4 h-4 mr-2" />
          К списку
        </Button>
      </Link>
      
      <Button variant="outline" onClick={handleRefresh} className="rounded-2xl btn-outline-fixed">
        <RefreshCw className="w-4 h-4 mr-2" />
        Обновить
      </Button>
    </div>
  );

  return (
    <AppLayout
      title={`Заказ ${orderNumber}`}
      description="Детали заказ-наряда и управление работами"
      icon={Wrench}
      actions={headerActions}
    >
      <div className="container mx-auto px-6 py-6 space-y-6">
        {/* Order Management Feature Badge */}
        <Card className="p-4 glass border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-3xl">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-primary">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-primary">Полное управление заказом</h3>
              <p className="text-sm text-muted-foreground">
                Добавление услуг и запчастей, назначение исполнителей, отслеживание прогресса и автоматический расчет стоимости.
              </p>
            </div>
            <div className="ml-auto">
              <TrendingUp className="w-6 h-6 text-secondary" />
            </div>
          </div>
        </Card>

        {loading ? (
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="p-6 glass border-border/30 rounded-3xl">
                <div className="space-y-4">
                  <div className="h-8 bg-surface-1/40 rounded-2xl animate-pulse" />
                  <div className="grid grid-cols-3 gap-4">
                    {[...Array(3)].map((_, j) => (
                      <div key={j} className="h-16 bg-surface-1/40 rounded-2xl animate-pulse" />
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card className="p-6 text-center text-destructive glass border-destructive/20 rounded-3xl">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Zap className="w-5 h-5" />
              <span className="font-medium">Ошибка загрузки</span>
            </div>
            <p>{error}</p>
            <Button onClick={handleRefresh} className="mt-4 rounded-2xl">
              <RefreshCw className="w-4 h-4 mr-2" />
              Повторить
            </Button>
          </Card>
        ) : !order ? (
          <Card className="p-8 text-center text-muted-foreground glass border-border/30 rounded-3xl">
            <Wrench className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">Заказ не найден</h3>
            <p className="text-sm">Возможно, заказ был удален или у вас нет прав доступа</p>
          </Card>
        ) : (
          <>
            {/* Order Header Card */}
            <Card className="p-6 glass border-border/30 rounded-3xl surface-glow">
              <div className="grid lg:grid-cols-3 gap-6">
                {/* Status & Controls */}
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      Управление статусом
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <StatusPill status={order.status} size="lg" />
                      <select
                        className="h-10 rounded-2xl border border-border/50 bg-background/80 text-sm px-3 focus:border-primary/50 transition-all duration-300"
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
                      >
                        <option value="new">Новый</option>
                        <option value="in_progress">В работе</option>
                        <option value="awaiting_parts">Ожидание запчастей</option>
                        <option value="completed">Завершен</option>
                        <option value="canceled">Отменен</option>
                      </select>
                      <Button
                        size="sm"
                        onClick={() => handleUpdateStatus()}
                        disabled={updating || !newStatus || newStatus === order.status}
                        className="rounded-xl"
                      >
                        <Save className="w-3.5 h-3.5 mr-1" />
                        Обновить
                      </Button>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex flex-wrap gap-2">
                    {order.status === 'new' && (
                      <Button size="sm" variant="outline" onClick={quickToInProgress} className="rounded-xl btn-outline-fixed">
                        <Play className="w-3.5 h-3.5 mr-1" /> В работу
                      </Button>
                    )}
                    {order.status === 'in_progress' && (
                      <Button size="sm" variant="outline" onClick={quickToCompleted} className="rounded-xl btn-outline-fixed">
                        <Flag className="w-3.5 h-3.5 mr-1" /> Готово
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={handleAssignMe} className="rounded-xl btn-outline-fixed">
                      <UserPlus className="w-3.5 h-3.5 mr-1" /> Назначить меня
                    </Button>
                  </div>
                </div>

                {/* Customer Info */}
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Клиент
                  </div>
                  <div className="p-3 rounded-2xl bg-surface-1/40 border border-border/30">
                    <div className="font-medium text-sm">
                      {order.customer?.firstName || order.customer?.companyName || 'Не указан'}
                    </div>
                    {order.customer?.phone && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Phone className="w-3 h-3" />
                        {order.customer.phone}
                      </div>
                    )}
                    {order.customer?.email && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {order.customer.email}
                      </div>
                    )}
                  </div>
                </div>

                {/* Vehicle Info */}
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                    <Car className="w-4 h-4" />
                    Автомобиль
                  </div>
                  <div className="p-3 rounded-2xl bg-surface-1/40 border border-border/30">
                    <div className="font-medium text-sm">
                      {order.vehicle?.model?.brand?.name} {order.vehicle?.model?.name}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 space-y-1">
                      {order.vehicle?.licensePlate && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {order.vehicle.licensePlate}
                        </div>
                      )}
                      {order.mileage && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Пробег: {order.mileage.toLocaleString('ru-RU')} км
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Financial Summary */}
            <Card className="p-6 glass border-border/30 rounded-3xl surface-glow">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-xl bg-gradient-to-r from-emerald-500/20 to-primary/20">
                  <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Финансовая сводка</h3>
                  <p className="text-sm text-muted-foreground">Расчет стоимости заказа</p>
                </div>
                <div className="ml-auto">
                  <Button variant="outline" onClick={handleRecalculate} disabled={updating} className="rounded-xl btn-outline-fixed">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Пересчитать
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <FinancialKpi 
                  title="Подытог" 
                  value={`${(order.totalAmount || 0).toLocaleString('ru-RU')} ₽`} 
                  icon={Shield} 
                  color="blue"
                />
                <FinancialKpi 
                  title="Скидка" 
                  value={`${(order.discountAmount || 0).toLocaleString('ru-RU')} ₽`} 
                  icon={BadgePercent} 
                  color="purple"
                />
                <FinancialKpi 
                  title="Налог" 
                  value={`${(order.taxAmount || 0).toLocaleString('ru-RU')} ₽`} 
                  icon={Calendar} 
                  color="amber"
                />
                <FinancialKpi 
                  title="Итого" 
                  value={`${(order.finalAmount || 0).toLocaleString('ru-RU')} ₽`} 
                  icon={CheckCircle2} 
                  color="emerald"
                  highlight
                />
              </div>
            </Card>

            {/* Services Section */}
            <Card className="p-6 glass border-border/30 rounded-3xl surface-glow">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-r from-blue-500/20 to-primary/20">
                    <Wrench className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Услуги</h3>
                    <p className="text-sm text-muted-foreground">Работы по заказу ({services.length})</p>
                  </div>
                </div>
                <Button onClick={() => setOpenAddService(true)} className="rounded-2xl bg-gradient-primary hover:opacity-90">
                  <Plus className="w-4 h-4 mr-2" /> Добавить услугу
                </Button>
              </div>
              
              {services.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Wrench className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Услуги пока не добавлены</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {services.map((s) => (
                    <ServiceRow key={s.id} service={s} orderId={id} onChanged={handleRefresh} />
                  ))}
                </div>
              )}
            </Card>

            {/* Parts Section */}
            <Card className="p-6 glass border-border/30 rounded-3xl surface-glow">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20">
                    <Truck className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Запчасти</h3>
                    <p className="text-sm text-muted-foreground">Материалы для заказа ({parts.length})</p>
                  </div>
                </div>
                <Button onClick={() => setOpenAddPart(true)} className="rounded-2xl bg-gradient-primary hover:opacity-90">
                  <Plus className="w-4 h-4 mr-2" /> Добавить запчасть
                </Button>
              </div>
              
              {parts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Truck className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Запчасти пока не добавлены</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {parts.map((p) => (
                    <PartRow key={p.id} part={p} orderId={id} onChanged={handleRefresh} />
                  ))}
                </div>
              )}
            </Card>

            {/* Dialogs */}
            <OrderServiceAddDialog
              orderId={id}
              open={openAddService}
              onOpenChange={setOpenAddService}
              onAdded={onServiceAdded}
            />
            <OrderPartAddDialog
              orderId={id}
              open={openAddPart}
              onOpenChange={setOpenAddPart}
              onAdded={onPartAdded}
            />
          </>
        )}
      </div>
    </AppLayout>
  );
}

// Enhanced Service Row Component
function ServiceRow({
  service,
  orderId,
  onChanged,
}: {
  service: OrderServiceResponse;
  orderId: string;
  onChanged: () => void;
}) {
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [q, setQ] = useState(String(service.quantity));
  const [price, setPrice] = useState(String(service.price));
  const [disc, setDisc] = useState(String(service.discountPercent));
  const [notes, setNotes] = useState(service.notes || '');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await ordersAPI.updateOrderService(orderId, service.id, {
        quantity: q ? parseInt(q, 10) : undefined,
        price: price ? parseFloat(price) : undefined,
        discountPercent: disc ? parseFloat(disc) : undefined,
        notes: notes || undefined,
      });
      setEditing(false);
      toast.success('Услуга обновлена');
      await onChanged();
    } catch (e) {
      try {
        const parsed = JSON.parse((e as Error).message) as { message?: string };
        toast.error(parsed.message || 'Ошибка обновления услуги');
      } catch {
        toast.error('Ошибка обновления услуги');
      }
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await ordersAPI.deleteOrderService(orderId, service.id);
      toast.success('Услуга удалена');
      await onChanged();
    } catch (e) {
      try {
        const parsed = JSON.parse((e as Error).message) as { message?: string };
        toast.error(parsed.message || 'Ошибка удаления услуги');
      } catch {
        toast.error('Ошибка удаления услуги');
      }
    } finally {
      setBusy(false);
    }
  };

  const start = async () => {
    setBusy(true);
    try {
      await ordersAPI.startService(orderId, service.id);
      toast.success('Услуга начата');
      await onChanged();
    } catch {
      toast.error('Ошибка старта услуги');
    } finally {
      setBusy(false);
    }
  };

  const complete = async () => {
    setBusy(true);
    try {
      await ordersAPI.completeService(orderId, service.id, notes || undefined);
      toast.success('Услуга завершена');
      await onChanged();
    } catch {
      toast.error('Ошибка завершения услуги');
    } finally {
      setBusy(false);
    }
  };

  const getUserId = (u: unknown): string | undefined => {
    if (u && typeof u === 'object' && 'id' in u) {
      const maybe = (u as { id?: unknown }).id;
      return typeof maybe === 'string' ? maybe : undefined;
    }
    return undefined;
  };

  const assignMe = async () => {
    const myId = getUserId(user);
    if (!myId) return toast.error('Не удалось определить текущего пользователя');
    setBusy(true);
    try {
      await ordersAPI.assignServiceMechanic(orderId, service.id, myId);
      toast.success('Механик назначен');
      await onChanged();
    } catch {
      toast.error('Ошибка назначения механика');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-4 rounded-2xl border border-border/30 bg-surface-1/20 hover:bg-surface-1/40 transition-all duration-300 group">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-500/20 to-primary/20 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Wrench className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm mb-1">{service.service?.name || 'Услуга'}</div>
            <div className="text-xs text-muted-foreground space-y-1">
              <div>Количество: {service.quantity} • Цена: {service.price.toLocaleString('ru-RU')} ₽</div>
              <div>Скидка: {service.discountPercent}% • Статус: {service.status || 'Планируется'}</div>
            </div>
            {editing && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mt-3">
                <Input 
                  value={q} 
                  onChange={(e) => setQ(e.target.value.replace(/[^\d]/g, ''))} 
                  placeholder="Кол-во"
                  className="rounded-xl"
                />
                <Input
                  value={price}
                  onChange={(e) => setPrice(e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.'))}
                  placeholder="Цена"
                  className="rounded-xl"
                />
                <Input
                  value={disc}
                  onChange={(e) => setDisc(e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.'))}
                  placeholder="Скидка %"
                  className="rounded-xl"
                />
                <Input 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)} 
                  placeholder="Заметки"
                  className="rounded-xl"
                />
              </div>
            )}
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-sm font-semibold mb-2">
            {service.totalAmount.toLocaleString('ru-RU')} ₽
          </div>
          <div className="flex items-center gap-1 flex-wrap justify-end">
            {!editing ? (
              <>
                <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="rounded-xl btn-outline-fixed">
                  <Pencil className="w-3.5 h-3.5 mr-1" /> Изменить
                </Button>
                <Button variant="outline" size="sm" onClick={assignMe} disabled={busy} className="rounded-xl btn-outline-fixed">
                  <UserPlus className="w-3.5 h-3.5 mr-1" /> Мой
                </Button>
                {service.status !== 'in_progress' && (
                  <Button variant="outline" size="sm" onClick={start} disabled={busy} className="rounded-xl btn-outline-fixed">
                    <Play className="w-3.5 h-3.5 mr-1" /> Старт
                  </Button>
                )}
                {service.status !== 'completed' && (
                  <Button variant="outline" size="sm" onClick={complete} disabled={busy} className="rounded-xl btn-outline-fixed">
                    <Flag className="w-3.5 h-3.5 mr-1" /> Готово
                  </Button>
                )}
                <Button variant="destructive" size="sm" onClick={remove} disabled={busy} className="rounded-xl">
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Удалить
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" onClick={save} disabled={busy} className="rounded-xl">
                  <Save className="w-3.5 h-3.5 mr-1" /> Сохранить
                </Button>
                <Button variant="outline" size="sm" onClick={() => setEditing(false)} disabled={busy} className="rounded-xl btn-outline-fixed">
                  Отмена
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Enhanced Part Row Component
function PartRow({
  part,
  orderId,
  onChanged,
}: {
  part: OrderPartResponse;
  orderId: string;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [q, setQ] = useState(String(part.quantity));
  const [price, setPrice] = useState(String(part.price));
  const [disc, setDisc] = useState(String(part.discountPercent));
  const [customerProvided, setCustomerProvided] = useState<boolean>(part.isCustomerProvided);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      await ordersAPI.updateOrderPart(orderId, part.id, {
        quantity: q ? parseInt(q, 10) : undefined,
        price: price ? parseFloat(price) : undefined,
        discountPercent: disc ? parseFloat(disc) : undefined,
      });
      setEditing(false);
      toast.success('Запчасть обновлена');
      await onChanged();
    } catch (e) {
      try {
        const parsed = JSON.parse((e as Error).message) as { message?: string };
        toast.error(parsed.message || 'Ошибка обновления запчасти');
      } catch {
        toast.error('Ошибка обновления запчасти');
      }
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await ordersAPI.deleteOrderPart(orderId, part.id);
      toast.success('Запчасть удалена');
      await onChanged();
    } catch (e) {
      try {
        const parsed = JSON.parse((e as Error).message) as { message?: string };
        toast.error(parsed.message || 'Ошибка удаления запчасти');
      } catch {
        toast.error('Ошибка удаления запчасти');
      }
    } finally {
      setBusy(false);
    }
  };

  const toggleProvided = async () => {
    setBusy(true);
    try {
      const updated = await ordersAPI.toggleCustomerProvided(orderId, part.id, !customerProvided);
      setCustomerProvided(updated.isCustomerProvided);
      toast.success(updated.isCustomerProvided ? 'Отмечено: запчасть клиента' : 'Отмечено: наша запчасть');
      await onChanged();
    } catch (e) {
      try {
        const parsed = JSON.parse((e as Error).message) as { message?: string };
        toast.error(parsed.message || 'Ошибка переключения источника запчасти');
      } catch {
        toast.error('Ошибка переключения источника запчасти');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-4 rounded-2xl border border-border/30 bg-surface-1/20 hover:bg-surface-1/40 transition-all duration-300 group">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 flex-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Truck className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm mb-1">{part.part?.name || 'Запчасть'}</div>
            <div className="text-xs text-muted-foreground space-y-1">
              <div>Количество: {part.quantity} • Цена: {part.price.toLocaleString('ru-RU')} ₽</div>
              <div className="flex items-center gap-2">
                <span>Скидка: {part.discountPercent}%</span>
                <Badge variant={part.isCustomerProvided ? "secondary" : "default"} className="text-xs">
                  {part.isCustomerProvided ? 'Клиентская' : 'Со склада'}
                </Badge>
              </div>
            </div>
            {editing && (
              <div className="grid grid-cols-3 gap-2 mt-3">
                <Input 
                  value={q} 
                  onChange={(e) => setQ(e.target.value.replace(/[^\d]/g, ''))} 
                  placeholder="Кол-во"
                  className="rounded-xl"
                />
                <Input
                  value={price}
                  onChange={(e) => setPrice(e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.'))}
                  placeholder="Цена"
                  className="rounded-xl"
                />
                <Input
                  value={disc}
                  onChange={(e) => setDisc(e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.'))}
                  placeholder="Скидка %"
                  className="rounded-xl"
                />
              </div>
            )}
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-sm font-semibold mb-2">
            {part.totalAmount.toLocaleString('ru-RU')} ₽
          </div>
          <div className="flex items-center gap-1 flex-wrap justify-end">
            {!editing ? (
              <>
                <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="rounded-xl btn-outline-fixed">
                  <Pencil className="w-3.5 h-3.5 mr-1" /> Изменить
                </Button>
                <Button variant="outline" size="sm" onClick={toggleProvided} disabled={busy} className="rounded-xl btn-outline-fixed">
                  {customerProvided ? 'Со склада' : 'Клиентская'}
                </Button>
                <Button variant="destructive" size="sm" onClick={remove} disabled={busy} className="rounded-xl">
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Удалить
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" onClick={save} disabled={busy} className="rounded-xl">
                  <Save className="w-3.5 h-3.5 mr-1" /> Сохранить
                </Button>
                <Button variant="outline" size="sm" onClick={() => setEditing(false)} disabled={busy} className="rounded-xl btn-outline-fixed">
                  Отмена
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Enhanced Status Pill Component
function StatusPill({ status, size = 'default' }: { status: OrderStatus; size?: 'default' | 'lg' }) {
  const colors = STATUS_COLORS[status];
  const sizeClasses = size === 'lg' ? 'px-3 py-1.5 text-sm' : 'px-2 py-0.5 text-xs';
  
  return (
    <span className={cn(
      'rounded-xl font-medium border transition-all duration-300',
      colors.bg,
      colors.text,
      colors.border,
      sizeClasses
    )}>
      {STATUS_LABELS[status]}
    </span>
  );
}

// Enhanced Financial KPI Component
function FinancialKpi({
  title,
  value,
  icon: Icon,
  color = 'default',
  highlight = false,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: 'default' | 'blue' | 'purple' | 'amber' | 'emerald';
  highlight?: boolean;
}) {
  const colorClasses = {
    default: 'from-surface-1/40 to-surface-2/40 border-border/30',
    blue: 'from-blue-500/10 to-blue-600/5 border-blue-500/20',
    purple: 'from-purple-500/10 to-purple-600/5 border-purple-500/20',
    amber: 'from-amber-500/10 to-amber-600/5 border-amber-500/20',
    emerald: 'from-emerald-500/10 to-emerald-600/5 border-emerald-500/20',
  };

  const iconColorClasses = {
    default: 'text-muted-foreground',
    blue: 'text-blue-600 dark:text-blue-400',
    purple: 'text-purple-600 dark:text-purple-400',
    amber: 'text-amber-600 dark:text-amber-400',
    emerald: 'text-emerald-600 dark:text-emerald-400',
  };

  return (
    <div className={cn(
      'p-4 rounded-2xl border bg-gradient-to-br transition-all duration-300 hover:scale-[1.02]',
      colorClasses[color],
      highlight && 'ring-1 ring-primary/20'
    )}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
        <Icon className={cn('w-4 h-4', iconColorClasses[color])} />
        <span>{title}</span>
      </div>
      <div className={cn(
        'text-lg font-bold',
        highlight ? 'text-emerald-600 dark:text-emerald-400' : ''
      )}>
        {value}
      </div>
    </div>
  );
}
