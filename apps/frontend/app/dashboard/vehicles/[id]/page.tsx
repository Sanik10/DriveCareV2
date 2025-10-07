// path: apps/frontend/app/dashboard/vehicles/[id]/page.tsx
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
import { vehiclesAPI } from '@/lib/api/vehicles';
import type { VehicleResponse, EngineType } from '@/lib/types/vehicles';
import {
  ArrowLeft,
  RefreshCw,
  Car,
  Gauge,
  User,
  Trash2,
  Clipboard,
  Settings,
  AlertTriangle,
  CheckCircle,
  Clock,
  Calendar,
  Hash,
  Phone,
  Mail,
  Save,
  Plus,
  TrendingUp,
  Zap,
  Sparkles,
  BarChart3,
  FileText,
  Palette,
  NotebookPen,
} from 'lucide-react';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { OrderCreateDialog } from '@/components/orders/order-create-dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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
      toast.success('Пробег обновлен');
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
      toast.success('Скопировано в буфер обмена');
    } catch (err) {
      toast.error('Ошибка копирования');
    }
  };

  // Service status logic
  const getServiceStatus = () => {
    if (!vehicle) return 'unknown';
    if (vehicle.needsService) return 'overdue';
    if (vehicle.daysUntilService !== undefined && vehicle.daysUntilService <= 30) return 'soon';
    return 'ok';
  };

  const serviceStatus = getServiceStatus();
  const serviceInfo = (() => {
    if (!vehicle) return '';
    if (vehicle.needsService) return 'ТО просрочено';
    if (typeof vehicle.daysUntilService === 'number') return `ТО через ${vehicle.daysUntilService} дн.`;
    return 'ТО актуально';
  })();

  const serviceStatusConfig = {
    ok: {
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      icon: CheckCircle,
      glow: false,
    },
    soon: {
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      icon: Clock,
      glow: false,
    },
    overdue: {
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
      icon: AlertTriangle,
      glow: true,
    },
    unknown: {
      color: 'text-muted-foreground',
      bg: 'bg-muted/10',
      border: 'border-muted/20',
      icon: Settings,
      glow: false,
    }
  };

  const statusConfig = serviceStatusConfig[serviceStatus as keyof typeof serviceStatusConfig];
  const StatusIcon = statusConfig.icon;

  // Helpers for engine display
  const engineTypeLabel = (t?: EngineType | null) => {
    switch ((t || '').toString()) {
      case 'petrol': return 'Бензин';
      case 'diesel': return 'Дизель';
      case 'hybrid': return 'Гибрид';
      case 'electric': return 'Электро';
      default: return t || '';
    }
  };
  const formatEngineVolume = (n?: number | null) => {
    if (!n || !Number.isFinite(n)) return '';
    const liters = n.toFixed(1);
    return `${liters} л`;
  };

  if (!isMounted) return null;

  if (authLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-muted-foreground">Загрузка автомобиля...</span>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!isAuthenticated || !user) return null;

  const vehicleModel = vehicle ? `${vehicle.model?.brand?.name ?? ''} ${vehicle.model?.name ?? ''}`.trim() || 'Автомобиль' : 'Загрузка...';

  const headerActions = (
    <div className="flex items-center gap-2">
      <Link href="/dashboard/vehicles">
        <Button variant="outline" className="rounded-2xl btn-outline-fixed">
          <ArrowLeft className="w-4 h-4 mr-2" />
          К списку
        </Button>
      </Link>
      
      {vehicle?.customer?.id && (
        <Button onClick={() => setOpenOrderCreate(true)} className="rounded-2xl bg-gradient-primary hover:opacity-90">
          <Plus className="w-4 h-4 mr-2" />
          Создать заказ
        </Button>
      )}

      <Button variant="outline" onClick={handleRefresh} className="rounded-2xl btn-outline-fixed">
        <RefreshCw className="w-4 h-4 mr-2" />
        Обновить
      </Button>

      {canDelete && (
        <Button variant="destructive" onClick={() => setOpenDelete(true)} className="rounded-2xl">
          <Trash2 className="w-4 h-4 mr-2" />
          Удалить
        </Button>
      )}
    </div>
  );

  return (
    <AppLayout
      title={vehicleModel}
      description="Технические характеристики, статус ТО и управление пробегом"
      icon={Car}
      actions={headerActions}
    >
      <div className="container mx-auto px-6 py-6 space-y-6">
        {/* Vehicle Details Feature Badge */}
        <Card className="p-4 glass border-emerald-500/20 bg-gradient-to-r from-emerald-500/5 to-primary/5 rounded-3xl">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-r from-emerald-500 to-primary">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-emerald-600 dark:text-emerald-400">Полная карточка автомобиля</h3>
              <p className="text-sm text-muted-foreground">
                Технические характеристики, статус ТО и управление пробегом.
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {vehicle && (
                <Badge 
                  variant="outline" 
                  className={cn(
                    'text-xs rounded-xl',
                    statusConfig.color,
                    statusConfig.bg,
                    statusConfig.border
                  )}
                >
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {serviceInfo}
                </Badge>
              )}
              <TrendingUp className="w-6 h-6 text-secondary" />
            </div>
          </div>
        </Card>

        {loading ? (
          <div className="space-y-6">
            {[...Array(4)].map((_, i) => (
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
        ) : !vehicle ? (
          <Card className="p-8 text-center text-muted-foreground glass border-border/30 rounded-3xl">
            <Car className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">Автомобиль не найден</h3>
            <p className="text-sm">Возможно, ТС было удалено или у вас нет прав доступа</p>
          </Card>
        ) : (
          <>
            {/* Main Vehicle Info */}
            <Card className={cn(
              "p-6 glass border-border/30 rounded-3xl surface-glow transition-all duration-300",
              statusConfig.glow && "border-red-500/30 shadow-lg shadow-red-500/20"
            )}>
              <div className="grid lg:grid-cols-3 gap-6">
                {/* Vehicle Details */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-xl bg-gradient-to-r from-emerald-500/20 to-primary/20">
                      <Car className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Информация о ТС</h3>
                      <p className="text-sm text-muted-foreground">Основные характеристики</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <VehicleInfoRow 
                      icon={Car}
                      label="Модель"
                      value={`${vehicle.model?.brand?.name ?? ''} ${vehicle.model?.name ?? ''}`.trim()}
                    />
                    
                    {vehicle.licensePlate && (
                      <VehicleInfoRow 
                        icon={Hash}
                        label="Гос. номер"
                        value={vehicle.licensePlate}
                        clickable
                        onClick={() => copyText(vehicle.licensePlate)}
                        copyBlink={copyBlink}
                      />
                    )}
                    
                    {vehicle.vin && (
                      <VehicleInfoRow 
                        icon={Clipboard}
                        label="VIN"
                        value={vehicle.vin}
                        clickable
                        onClick={() => copyText(vehicle.vin)}
                        copyBlink={copyBlink}
                      />
                    )}
                    
                    {vehicle.year && (
                      <VehicleInfoRow 
                        icon={Calendar}
                        label="Год выпуска"
                        value={vehicle.year.toString()}
                      />
                    )}

                    {vehicle.color && (
                      <VehicleInfoRow
                        icon={Palette}
                        label="Цвет"
                        value={vehicle.color}
                      />
                    )}

                    {vehicle.engineType && (
                      <VehicleInfoRow
                        icon={Zap}
                        label="Тип двигателя"
                        value={engineTypeLabel(vehicle.engineType as EngineType)}
                      />
                    )}

                    {typeof vehicle.engineVolume === 'number' && vehicle.engineVolume > 0 && (
                      <VehicleInfoRow
                        icon={Gauge}
                        label="Объём двигателя"
                        value={formatEngineVolume(vehicle.engineVolume)}
                      />
                    )}
                  </div>
                </div>

                {/* Owner Information */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-xl bg-gradient-to-r from-blue-500/20 to-purple-500/20">
                      <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Владелец</h3>
                      <p className="text-sm text-muted-foreground">Контактная информация</p>
                    </div>
                  </div>

                  {vehicle.customer ? (
                    <div className="space-y-3">
                      <VehicleInfoRow 
                        icon={User}
                        label="Имя"
                        value={[vehicle.customer.firstName, vehicle.customer.lastName].filter(Boolean).join(' ') || vehicle.customer.companyName || 'Клиент'}
                        linkTo={`/dashboard/customers/${vehicle.customer.id}`}
                      />
                      
                      {vehicle.customer.phone && (
                        <VehicleInfoRow 
                          icon={Phone}
                          label="Телефон"
                          value={vehicle.customer.phone}
                          clickable
                          onClick={() => {
                            if (!vehicle.customer?.phone) {
                              toast.warning('У клиента не указан телефон');
                              return;
                            }
                            copyText(vehicle.customer.phone);
                          }}
                        />
                      )}
                      
                      {vehicle.customer.email && (
                        <VehicleInfoRow 
                          icon={Mail}
                          label="Email"
                          value={vehicle.customer.email}
                          clickable
                          onClick={() => {
                            if (!vehicle.customer?.email) {
                              toast.warning('У клиента не указана почта');
                              return;
                            }
                            copyText(vehicle.customer.email);
                          }}
                        />
                      )}
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      Владелец не указан
                    </div>
                  )}
                </div>

                {/* Service Status & Mileage */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={cn(
                      "p-2 rounded-xl",
                      statusConfig.bg,
                      statusConfig.border,
                      "border"
                    )}>
                      <StatusIcon className={cn("w-5 h-5", statusConfig.color)} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Техническое состояние</h3>
                      <p className="text-sm text-muted-foreground">Пробег и ТО</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Service Dates & Status */}
                    <div className="p-3 rounded-2xl bg-surface-1/40 border border-border/30 space-y-2">
                      <div className="flex items-center gap-2">
                        <StatusIcon className={cn("w-4 h-4", statusConfig.color)} />
                        <span className="text-sm font-medium">Статус ТО</span>
                      </div>
                      <div className={cn("text-sm", statusConfig.color)}>
                        {serviceInfo}
                      </div>
                      <div className="text-xs text-muted-foreground grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {vehicle.lastServiceDate && (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5" />
                            Последнее ТО: {new Date(vehicle.lastServiceDate).toLocaleDateString('ru-RU')}
                          </div>
                        )}
                        {vehicle.nextServiceDate && (
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5" />
                            Следующее ТО: {new Date(vehicle.nextServiceDate).toLocaleDateString('ru-RU')}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Mileage Update */}
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Gauge className="w-4 h-4" />
                        Пробег (км)
                      </div>
                      <div className="flex gap-2">
                        <Input 
                          value={mileage} 
                          onChange={(e) => setMileage(e.target.value.replace(/[^0-9]/g, ''))} 
                          placeholder="Пробег"
                          className="rounded-2xl"
                        />
                        <Button 
                          size="sm" 
                          onClick={handleUpdateMileage} 
                          disabled={updating}
                          className="rounded-xl"
                        >
                          <Save className="w-3.5 h-3.5 mr-1" />
                          {updating ? 'Сохранение...' : 'Обновить'}
                        </Button>
                      </div>
                    </div>

                    {/* Notes */}
                    {vehicle.notes && (
                      <div className="p-3 rounded-2xl bg-surface-1/40 border border-border/30">
                        <div className="flex items-center gap-2 mb-1">
                          <NotebookPen className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Примечания</span>
                        </div>
                        <div className="text-sm text-muted-foreground whitespace-pre-line">
                          {vehicle.notes}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* Service History (real data only summary for now) */}
            <Card className="p-6 glass border-border/30 rounded-3xl surface-glow">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20">
                  <BarChart3 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">История обслуживания</h3>
                  <p className="text-sm text-muted-foreground">
                    Записей: {typeof vehicle.serviceHistoryCount === 'number' ? vehicle.serviceHistoryCount : 0}
                  </p>
                </div>
                <div className="ml-auto">
                  <Link href={`/dashboard/orders?vehicleId=${encodeURIComponent(id)}`}>
                    <Button variant="outline" className="rounded-2xl btn-outline-fixed">
                      <FileText className="w-4 h-4 mr-2" />
                      История заказов
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                Детальная лента ТО будет подключена к БД. Сейчас отображается только количество записей.
              </div>
            </Card>

            {/* Quick Actions */}
            <Card className="p-6 glass border-border/30 rounded-3xl surface-glow">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20">
                  <Zap className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Быстрые действия</h3>
                  <p className="text-sm text-muted-foreground">Часто используемые операции</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Button 
                  variant="outline" 
                  className="rounded-2xl btn-outline-fixed h-auto p-4 flex-col"
                  onClick={() => setOpenOrderCreate(true)}
                  disabled={!vehicle.customer?.id}
                >
                  <Plus className="w-5 h-5 mb-2" />
                  <span className="text-sm">Новый заказ</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  className="rounded-2xl btn-outline-fixed h-auto p-4 flex-col"
                >
                  <Calendar className="w-5 h-5 mb-2" />
                  <span className="text-sm">Записать на ТО</span>
                </Button>
                
                <Link href={`/dashboard/orders?vehicleId=${encodeURIComponent(id)}`}>
                  <Button 
                    variant="outline" 
                    className="rounded-2xl btn-outline-fixed h-auto p-4 flex-col w-full"
                  >
                    <FileText className="w-5 h-5 mb-2" />
                    <span className="text-sm">История заказов</span>
                  </Button>
                </Link>
                
                <Button 
                  variant="outline" 
                  className="rounded-2xl btn-outline-fixed h-auto p-4 flex-col"
                >
                  <Settings className="w-5 h-5 mb-2" />
                  <span className="text-sm">Редактировать</span>
                </Button>
              </div>
            </Card>
          </>
        )}
      </div>

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
    </AppLayout>
  );
}

// Vehicle Info Row Component
function VehicleInfoRow({
  icon: Icon,
  label,
  value,
  linkTo,
  clickable = false,
  onClick,
  copyBlink = false
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  linkTo?: string;
  clickable?: boolean;
  onClick?: () => void;
  copyBlink?: boolean;
}) {
  const { cn } = require('@/lib/utils');
  const content = (
    <div className={cn(
      "flex items-center gap-3 p-3 rounded-2xl bg-surface-1/40 border border-border/30 transition-all duration-300",
      (linkTo || clickable) && "hover:bg-surface-1/60 cursor-pointer group"
    )}>
      <div className="p-1.5 rounded-lg bg-background/50">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={cn(
          "text-sm font-medium truncate",
          copyBlink && "text-primary font-semibold",
          (linkTo || clickable) && "group-hover:text-primary transition-colors"
        )}>
          {value}
        </div>
      </div>
      {(linkTo || clickable) && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <Clipboard className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
      )}
    </div>
  );

  if (linkTo) {
    return <Link href={linkTo}>{content}</Link>;
  }

  if (clickable && onClick) {
    return <button onClick={onClick} className="w-full text-left">{content}</button>;
  }

  return content;
}
