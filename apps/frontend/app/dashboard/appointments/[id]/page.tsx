// path: apps/frontend/app/dashboard/appointments/[id]/page.tsx
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { ComponentType } from 'react';
import { toast } from 'sonner';
import {
  CalendarDays,
  Calendar,
  CheckCircle2,
  Loader2,
  RefreshCw,
  XCircle,
  Clock,
  PencilLine,
  Star,
  User,
  Car,
  Phone,
  Mail,
  MessageSquare,
  Wrench,
  Zap,
  Timer,
  AlertTriangle,
} from 'lucide-react';

import { AppLayout } from '@/components/app/AppLayout';
import { NavigationHeader } from '@/components/platform/NavigationHeader';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageContentCard } from '@/components/app/PageContentCard';
import { cn } from '@/lib/utils';

import { useAuth } from '@/lib/hooks/use-auth';
import { appointmentsAPI } from '@/lib/api/appointments';

import type { Appointment, AppointmentStatus } from '@/lib/types/appointments';
import { APPOINTMENT_PRIORITY_LABELS, APPOINTMENT_STATUS_LABELS } from '@/lib/types/appointments';

import { AppointmentRescheduleDialog } from '@/components/appointments/appointment-reschedule-dialog';
import { AppointmentCancelDialog } from '@/components/appointments/appointment-cancel-dialog';
import { AppointmentCompleteDialog } from '@/components/appointments/appointment-complete-dialog';
import { AppointmentRatingDialog } from '@/components/appointments/appointment-rating-dialog';

function fmtDate(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('ru-RU');
}

function fmtTime(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

type TrackingInfo = {
  progress: number;
  currentStep?: string;
};

type SystemBadgeVariant = 'active' | 'pending' | 'progress' | 'error' | 'draft';

function appointmentStatusVariant(status?: AppointmentStatus): SystemBadgeVariant {
  switch (status) {
    case 'DRAFT':
      return 'draft';
    case 'SCHEDULED':
    case 'CONFIRMED':
      return 'pending';
    case 'IN_PROGRESS':
      return 'progress';
    case 'COMPLETED':
      return 'active';
    case 'CANCELED':
    case 'NO_SHOW':
      return 'error';
    default:
      return 'draft';
  }
}

function priorityVariant(priority?: Appointment['priority']): SystemBadgeVariant {
  switch (priority) {
    case 'LOW':
      return 'draft';
    case 'NORMAL':
      return 'progress';
    case 'HIGH':
      return 'pending';
    case 'URGENT':
      return 'error';
    default:
      return 'draft';
  }
}

export default function AppointmentDetailsPage() {
  const params = useParams<{ id: string }>();
  const id = useMemo(
    () => (Array.isArray(params?.id) ? params.id[0] : params?.id) as string,
    [params]
  );

  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [item, setItem] = useState<Appointment | null>(null);
  const [actionLoading, setActionLoading] = useState<
    'confirm' | 'cancel' | 'reschedule' | 'complete' | 'rating' | null
  >(null);

  const [openReschedule, setOpenReschedule] = useState(false);
  const [openCancel, setOpenCancel] = useState(false);
  const [openComplete, setOpenComplete] = useState(false);
  const [openRating, setOpenRating] = useState(false);

  const [tracking, setTracking] = useState<TrackingInfo | null>(null);

  const canManage = useMemo(() => {
    const r = (user?.role?.name || '').toLowerCase();
    return ['company_owner', 'company_admin', 'manager', 'owner', 'admin'].includes(r);
  }, [user?.role?.name]);

  const canComplete = useMemo(() => {
    const r = (user?.role?.name || '').toLowerCase();
    return canManage || ['mechanic', 'lead_mechanic'].includes(r);
  }, [user?.role?.name, canManage]);

  const status = item?.status as AppointmentStatus | undefined;

  const canConfirm = canManage && status === 'SCHEDULED';
  const canCancel = canManage && !!status && ['DRAFT', 'SCHEDULED', 'CONFIRMED'].includes(status);
  const canReschedule = canManage && !!status && ['DRAFT', 'SCHEDULED', 'CONFIRMED'].includes(status);
  const canActionComplete = canComplete && status === 'IN_PROGRESS';
  const canRate = status === 'COMPLETED';

  const refresh = useCallback(async () => {
    if (!id) return;
    try {
      const a = await appointmentsAPI.get(id);
      setItem(a);
    } catch {
      // ignore (не шумим тостами на ручном refresh — они есть в load)
    }
  }, [id]);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const a = await appointmentsAPI.get(id);
      setItem(a);
    } catch (e) {
      const msg = (e as Error)?.message || 'Не удалось загрузить запись';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    void load();
  }, [authLoading, isAuthenticated, load, router]);

  // Autopoll tracking widget
  useEffect(() => {
    if (!isAuthenticated || !id) return;

    const terminal: AppointmentStatus[] = ['COMPLETED', 'CANCELED', 'NO_SHOW'];
    if (status && terminal.includes(status)) {
      setTracking(null);
      return;
    }

    let stopped = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const fetchTracking = async () => {
      try {
        const tr = await appointmentsAPI.tracking(id);
        if (!stopped && tr) setTracking(tr as TrackingInfo);
      } catch {
        // silent
      }
    };

    void fetchTracking();
    timer = setInterval(fetchTracking, 15000);

    return () => {
      stopped = true;
      if (timer) clearInterval(timer);
    };
  }, [id, isAuthenticated, status]);

  const doConfirm = useCallback(async () => {
    if (!item) return;
    setActionLoading('confirm');
    try {
      const upd = await appointmentsAPI.confirm(item.id);
      setItem(upd);
      toast.success('Запись подтверждена');
    } catch (e) {
      toast.error((e as Error)?.message || 'Не удалось подтвердить запись');
    } finally {
      setActionLoading(null);
    }
  }, [item]);

  const doCancel = useCallback(
    async (reason: string) => {
      if (!item) return;
      setActionLoading('cancel');
      try {
        const upd = await appointmentsAPI.cancel(item.id, reason);
        setItem(upd);
        toast.success('Запись отменена');
      } catch (e) {
        toast.error((e as Error)?.message || 'Не удалось отменить запись');
        throw e;
      } finally {
        setActionLoading(null);
      }
    },
    [item]
  );

  const doReschedule = useCallback(
    async (startIso: string, endIso: string) => {
      if (!item) return;
      setActionLoading('reschedule');
      try {
        const upd = await appointmentsAPI.reschedule(item.id, startIso, endIso);
        setItem(upd);
        toast.success('Запись перенесена');
      } catch (e) {
        toast.error((e as Error)?.message || 'Не удалось перенести запись');
        throw e;
      } finally {
        setActionLoading(null);
      }
    },
    [item]
  );

  const doComplete = useCallback(
    async (data: { finalCost?: number; mechanicNotes?: string }) => {
      if (!item) return;
      setActionLoading('complete');
      try {
        const upd = await appointmentsAPI.complete(item.id, {
          finalCost: typeof data.finalCost === 'number' && Number.isFinite(data.finalCost) ? data.finalCost : undefined,
          mechanicNotes: data.mechanicNotes?.trim() || undefined,
        });
        setItem(upd);
        toast.success('Запись завершена');
      } catch (e) {
        toast.error((e as Error)?.message || 'Не удалось завершить запись');
        throw e;
      } finally {
        setActionLoading(null);
      }
    },
    [item]
  );

  const doRating = useCallback(
    async (rating: number, feedback?: string) => {
      if (!item) return;
      setActionLoading('rating');
      try {
        const upd = await appointmentsAPI.addRating(item.id, rating, feedback);
        setItem(upd);
        toast.success('Спасибо за оценку!');
      } catch (e) {
        toast.error((e as Error)?.message || 'Не удалось добавить оценку');
        throw e;
      } finally {
        setActionLoading(null);
      }
    },
    [item]
  );

  const checkTracking = useCallback(async () => {
    if (!id) return;
    try {
      const tr = await appointmentsAPI.tracking(id);
      toast.message('Статус записи', {
        description: `${tr.currentStep || '—'} • Прогресс: ${Math.round(tr.progress)}%`,
      });
    } catch (e) {
      toast.error((e as Error)?.message || 'Не удалось получить трекинг');
    }
  }, [id]);

  if (authLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex items-center gap-sm">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-muted-foreground">Загрузка записи...</span>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!isAuthenticated) return null;

  const headerActions = (
    <div className="flex items-center gap-sm">
      <Button variant="secondary" size="sm" onClick={refresh}>
        <RefreshCw className="w-4 h-4 mr-xs" />
        Обновить
      </Button>
    </div>
  );

  // Primary action: строго одна primary-кнопка на странице
  const primaryAction = canConfirm
    ? { label: 'Подтвердить', onClick: doConfirm, loadingKey: 'confirm' as const, icon: CheckCircle2 }
    : canActionComplete
      ? { label: 'Завершить', onClick: () => setOpenComplete(true), loadingKey: 'complete' as const, icon: Clock }
      : null;

  return (
    <AppLayout>
      <div className="container mx-auto px-lg py-xl flex flex-col gap-lg">
        <NavigationHeader
          title={`Запись ${item?.id ? item.id.slice(0, 8) : '…'}`}
          subtitle={
            item
              ? `${item.customerName || 'Клиент'} · ${fmtDate(item.startTime)} ${fmtTime(item.startTime)}–${fmtTime(
                  item.endTime
                )}`
              : 'Детали записи и управление статусом'
          }
          icon={<CalendarDays className="w-5 h-5" />}
          backHref="/dashboard/appointments"
          backLabel="К календарю"
          actions={headerActions}
        />

        <PageContentCard
          loading={loading}
          error={error}
          empty={!loading && !error && !item}
          emptyState={{
            icon: CalendarDays,
            title: 'Запись не найдена',
            description: 'Возможно, запись была удалена или у вас нет прав доступа.',
            action: {
              label: 'К календарю',
              onClick: () => router.push('/dashboard/appointments'),
            },
          }}
          onRetry={load}
          loadingRows={6}
        >
          {!item ? null : (
            <div className="flex flex-col gap-lg">
              {/* Top: Who / What / When / Next */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
                {/* Status + next steps */}
                <Card className="p-lg">
                  <div className="flex items-start justify-between gap-md">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground">Статус</div>
                      <div className="mt-sm flex flex-wrap items-center gap-sm">
                        <Badge variant={appointmentStatusVariant(item.status)}>
                          {APPOINTMENT_STATUS_LABELS[item.status || 'DRAFT']}
                        </Badge>
                        <Badge variant={priorityVariant(item.priority)}>
                          {APPOINTMENT_PRIORITY_LABELS[item.priority || 'NORMAL']}
                        </Badge>
                      </div>
                    </div>

                    {item.priority === 'URGENT' && (
                      <div className="shrink-0">
                        <Badge variant="error">Срочно</Badge>
                      </div>
                    )}
                  </div>

                  <div className="mt-lg flex flex-wrap gap-sm">
                    {primaryAction && (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={primaryAction.onClick}
                        disabled={actionLoading === primaryAction.loadingKey}
                      >
                        {actionLoading === primaryAction.loadingKey ? (
                          <Loader2 className="w-4 h-4 mr-xs animate-spin" />
                        ) : (
                          <primaryAction.icon className="w-4 h-4 mr-xs" />
                        )}
                        {primaryAction.label}
                      </Button>
                    )}

                    {canReschedule && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setOpenReschedule(true)}
                        disabled={actionLoading === 'reschedule'}
                      >
                        {actionLoading === 'reschedule' ? (
                          <Loader2 className="w-4 h-4 mr-xs animate-spin" />
                        ) : (
                          <PencilLine className="w-4 h-4 mr-xs" />
                        )}
                        Перенести
                      </Button>
                    )}

                    {canCancel && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setOpenCancel(true)}
                        disabled={actionLoading === 'cancel'}
                      >
                        {actionLoading === 'cancel' ? (
                          <Loader2 className="w-4 h-4 mr-xs animate-spin" />
                        ) : (
                          <XCircle className="w-4 h-4 mr-xs" />
                        )}
                        Отменить
                      </Button>
                    )}

                    {canRate && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setOpenRating(true)}
                        disabled={actionLoading === 'rating'}
                      >
                        {actionLoading === 'rating' ? (
                          <Loader2 className="w-4 h-4 mr-xs animate-spin" />
                        ) : (
                          <Star className="w-4 h-4 mr-xs" />
                        )}
                        Оценить
                      </Button>
                    )}
                  </div>

                  {!canManage && (
                    <div className="mt-lg text-xs text-muted-foreground">
                      Недостаточно прав для управления статусами записи.
                    </div>
                  )}
                </Card>

                {/* Participants */}
                <Card className="p-lg">
                  <div className="flex items-center gap-sm">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <div className="text-sm font-semibold text-foreground">Участники</div>
                  </div>

                  <div className="mt-md space-y-sm">
                    <AppointmentInfoRow icon={User} label="Клиент" value={item.customerName || item.customerId || '—'} />
                    {item.contactPhone && <AppointmentInfoRow icon={Phone} label="Телефон" value={item.contactPhone} />}
                    {item.contactEmail && <AppointmentInfoRow icon={Mail} label="Email" value={item.contactEmail} />}
                    <div className="pt-sm mt-sm border-t border-border/50" />
                    <AppointmentInfoRow icon={Car} label="Автомобиль" value={item.vehicleInfo || item.vehicleId || '—'} />
                    <AppointmentInfoRow icon={Wrench} label="Механик" value={item.mechanicName || item.mechanicId || '—'} />
                  </div>
                </Card>

                {/* When / details */}
                <Card className="p-lg">
                  <div className="flex items-center gap-sm">
                    <Timer className="w-4 h-4 text-muted-foreground" />
                    <div className="text-sm font-semibold text-foreground">Расписание</div>
                  </div>

                  <div className="mt-md space-y-sm">
                    <AppointmentInfoRow icon={Calendar} label="Дата" value={fmtDate(item.startTime)} />
                    <AppointmentInfoRow
                      icon={Clock}
                      label="Время"
                      value={`${fmtTime(item.startTime)} — ${fmtTime(item.endTime)}`}
                    />

                    <div className="pt-sm mt-sm border-t border-border/50" />

                    <AppointmentInfoRow
                      icon={MessageSquare}
                      label="Описание работ"
                      value={item.description || '—'}
                      multiline
                    />

                    {item.customerNotes && (
                      <AppointmentInfoRow
                        icon={MessageSquare}
                        label="Заметки клиента"
                        value={item.customerNotes}
                        multiline
                      />
                    )}
                  </div>
                </Card>
              </div>

              {/* Bottom: tracking / money / rating */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
                {/* Live tracking */}
                <Card className="p-lg lg:col-span-2">
                  <div className="flex items-start justify-between gap-md">
                    <div className="min-w-0">
                      <div className="flex items-center gap-sm">
                        <Zap className="w-4 h-4 text-muted-foreground" />
                        <div className="text-sm font-semibold text-foreground">Live-трекинг</div>
                      </div>
                      <div className="text-xs text-muted-foreground mt-xs">
                        Автообновление каждые 15 сек (если запись не в терминальном статусе)
                      </div>
                    </div>

                    <Button variant="secondary" size="sm" onClick={checkTracking}>
                      <RefreshCw className="w-4 h-4 mr-xs" />
                      Проверить
                    </Button>
                  </div>

                  <div className="mt-lg grid grid-cols-1 md:grid-cols-2 gap-lg">
                    <div className="min-w-0">
                      <div className="text-xs text-muted-foreground">Текущий этап</div>
                      <div className="text-sm font-medium text-foreground mt-xs truncate">
                        {tracking?.currentStep || 'Ожидание начала работ'}
                      </div>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Прогресс</span>
                        <span className="text-foreground font-medium tabular-nums">
                          {Math.round(tracking?.progress ?? 0)}%
                        </span>
                      </div>

                      <div className="mt-xs h-2 w-full rounded-md bg-surface-2 overflow-hidden border border-border/50">
                        <div
                          className="h-2 bg-status-progress"
                          style={{
                            width: `${Math.max(0, Math.min(100, Math.round(tracking?.progress ?? 0)))}%`,
                          }}
                        />
                      </div>

                      {!tracking && (
                        <div className="mt-xs text-xs text-muted-foreground flex items-center gap-xs">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Нет данных трекинга
                        </div>
                      )}
                    </div>
                  </div>
                </Card>

                {/* Cost & Rating */}
                <Card className="p-lg">
                  <div className="flex items-center gap-sm">
                    <Star className="w-4 h-4 text-muted-foreground" />
                    <div className="text-sm font-semibold text-foreground">Стоимость и оценка</div>
                  </div>

                  <div className="mt-md space-y-md">
                    <div className="rounded-md border bg-card p-md">
                      <div className="text-xs text-muted-foreground">Плановая стоимость</div>
                      <div className="text-sm font-semibold tabular-nums mt-xs">
                        {typeof item.estimatedCost === 'number'
                          ? `${item.estimatedCost.toLocaleString('ru-RU')} ₽`
                          : '—'}
                      </div>
                    </div>

                    <div className="rounded-md border bg-card p-md">
                      <div className="text-xs text-muted-foreground">Итоговая стоимость</div>
                      <div className="text-sm font-semibold tabular-nums mt-xs">
                        {typeof item.finalCost === 'number' ? `${item.finalCost.toLocaleString('ru-RU')} ₽` : '—'}
                      </div>
                    </div>

                    <div className="rounded-md border bg-card p-md">
                      <div className="text-xs text-muted-foreground">Оценка клиента</div>
                      {item.rating ? (
                        <div className="mt-sm">
                          <div className="flex items-center gap-sm">
                            <div className="flex items-center">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={cn(
                                    'w-4 h-4',
                                    i < item.rating! ? 'text-status-pending fill-current' : 'text-muted-foreground'
                                  )}
                                />
                              ))}
                            </div>
                            <span className="text-sm font-medium tabular-nums">{item.rating}/5</span>
                          </div>

                          {item.feedback && (
                            <div className="text-xs text-muted-foreground mt-sm whitespace-pre-wrap">
                              {item.feedback}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground mt-xs">—</div>
                      )}
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          )}
        </PageContentCard>

        {/* Dialogs */}
        <AppointmentRescheduleDialog
          open={openReschedule}
          onOpenChange={setOpenReschedule}
          startTime={item?.startTime || ''}
          endTime={item?.endTime || ''}
          onConfirm={doReschedule}
          loading={actionLoading === 'reschedule'}
        />

        <AppointmentCancelDialog
          open={openCancel}
          onOpenChange={setOpenCancel}
          onConfirm={doCancel}
          loading={actionLoading === 'cancel'}
        />

        <AppointmentCompleteDialog
          open={openComplete}
          onOpenChange={setOpenComplete}
          onConfirm={doComplete}
          loading={actionLoading === 'complete'}
          initialFinalCost={item?.estimatedCost ?? undefined}
        />

        <AppointmentRatingDialog
          open={openRating}
          onOpenChange={setOpenRating}
          onConfirm={doRating}
          loading={actionLoading === 'rating'}
          initialRating={5}
        />
      </div>
    </AppLayout>
  );
}

function AppointmentInfoRow({
  icon: Icon,
  label,
  value,
  multiline = false,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div className="flex items-start gap-sm p-sm rounded-md border bg-card">
      <div className="w-8 h-8 rounded-md bg-surface-2 border flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={cn('text-sm font-medium text-foreground mt-xs', multiline ? 'whitespace-pre-wrap' : 'truncate')}>
          {value}
        </div>
      </div>
    </div>
  );
}
