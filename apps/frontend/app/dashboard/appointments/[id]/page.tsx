// path: apps/frontend/app/dashboard/appointments/[id]/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AppLayout } from '@/components/app/AppLayout';
import { PageFeatureBadge } from '@/components/app/PageFeatureBadge';
import { useAuth } from '@/lib/hooks/use-auth';
import { appointmentsAPI } from '@/lib/api/appointments';
import type { Appointment, AppointmentStatus } from '@/lib/types/appointments';
import { APPOINTMENT_PRIORITY_LABELS, APPOINTMENT_STATUS_LABELS } from '@/lib/types/appointments';
import { toast } from 'sonner';
import {
  ArrowLeft,
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
  Sparkles,
  TrendingUp,
  Zap,
  Timer,
} from 'lucide-react';
import { AppointmentRescheduleDialog } from '@/components/appointments/appointment-reschedule-dialog';
import { AppointmentCancelDialog } from '@/components/appointments/appointment-cancel-dialog';
import { AppointmentCompleteDialog } from '@/components/appointments/appointment-complete-dialog';
import { AppointmentRatingDialog } from '@/components/appointments/appointment-rating-dialog';
import { cn } from '@/lib/utils';

function fmtDate(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('ru-RU');
}

function fmtTime(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

type TrackingInfo = {
  progress: number;
  currentStep?: string;
};

const STATUS_COLORS = {
  DRAFT: { bg: 'bg-slate-500/10', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-500/20' },
  SCHEDULED: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/20' },
  CONFIRMED: { bg: 'bg-green-500/10', text: 'text-green-600 dark:text-green-400', border: 'border-green-500/20' },
  IN_PROGRESS: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/20' },
  COMPLETED: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-500/20' },
  CANCELED: { bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', border: 'border-red-500/20' },
  NO_SHOW: { bg: 'bg-gray-500/10', text: 'text-gray-600 dark:text-gray-400', border: 'border-gray-500/20' },
} as const;

const PRIORITY_COLORS = {
  LOW: { bg: 'bg-green-500/10', text: 'text-green-600 dark:text-green-400', border: 'border-green-500/20' },
  NORMAL: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/20' },
  HIGH: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-500/20' },
  URGENT: { bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', border: 'border-red-500/20' },
} as const;

export default function AppointmentDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  // ✅ Все useState
  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState<Appointment | null>(null);
  const [actionLoading, setActionLoading] = useState<'confirm' | 'cancel' | 'reschedule' | 'complete' | 'rating' | null>(null);
  const [openReschedule, setOpenReschedule] = useState(false);
  const [openCancel, setOpenCancel] = useState(false);
  const [openComplete, setOpenComplete] = useState(false);
  const [openRating, setOpenRating] = useState(false);
  const [tracking, setTracking] = useState<TrackingInfo | null>(null);

  // ✅ Все useMemo
  const canManage = useMemo(() => {
    const r = user?.role?.name || '';
    return ['company_owner', 'company_admin', 'manager', 'owner', 'admin'].includes(r);
  }, [user?.role?.name]);

  const canComplete = useMemo(() => {
    const r = user?.role?.name || '';
    return canManage || ['mechanic', 'lead_mechanic'].includes(r);
  }, [user?.role?.name, canManage]);

  const status = item?.status as AppointmentStatus | undefined;

  const canConfirm = canManage && status === 'SCHEDULED';
  const canCancel = canManage && !!status && ['DRAFT', 'SCHEDULED', 'CONFIRMED'].includes(status);
  const canReschedule = canManage && !!status && ['DRAFT', 'SCHEDULED', 'CONFIRMED'].includes(status);
  const canActionComplete = canComplete && status === 'IN_PROGRESS';
  const canRate = status === 'COMPLETED';

  const statusConfig = STATUS_COLORS[status as keyof typeof STATUS_COLORS] || STATUS_COLORS.DRAFT;
  const priorityConfig = PRIORITY_COLORS[item?.priority as keyof typeof PRIORITY_COLORS] || PRIORITY_COLORS.NORMAL;

  const headerActions = useMemo(() => (
    <div className="flex items-center gap-2">
      <Link href="/dashboard/appointments">
        <Button variant="outline" className="rounded-2xl btn-outline-fixed">
          <ArrowLeft className="w-4 h-4 mr-2" />
          К календарю
        </Button>
      </Link>
      <Button variant="outline" onClick={() => refresh()} className="rounded-2xl btn-outline-fixed">
        <RefreshCw className="w-4 h-4 mr-2" />
        Обновить
      </Button>
    </div>
  ), []);

  // ✅ Все useEffect
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const a = await appointmentsAPI.get(id);
        if (!cancelled) setItem(a);
      } catch (e) {
        toast.error((e as Error)?.message || 'Не удалось загрузить запись');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isAuthenticated, authLoading, router]);

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

  // ✅ Функции-обработчики
  const refresh = async () => {
    try {
      const a = await appointmentsAPI.get(id);
      setItem(a);
    } catch {
      // ignore
    }
  };

  const doConfirm = async () => {
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
  };

  const doCancel = async (reason: string) => {
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
  };

  const doReschedule = async (startIso: string, endIso: string) => {
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
  };

  const doComplete = async (data: { finalCost?: number; mechanicNotes?: string }) => {
    if (!item) return;
    setActionLoading('complete');
    try {
      const upd = await appointmentsAPI.complete(item.id, {
        finalCost: typeof data.finalCost === 'number' && isFinite(data.finalCost) ? data.finalCost : undefined,
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
  };

  const doRating = async (rating: number, feedback?: string) => {
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
  };

  const checkTracking = async () => {
    try {
      const tr = await appointmentsAPI.tracking(id);
      toast.message('Статус записи', {
        description: `${tr.currentStep || '—'} • Прогресс: ${Math.round(tr.progress)}%`,
      });
    } catch (e) {
      toast.error((e as Error)?.message || 'Не удалось получить трекинг');
    }
  };

  // ✅ Условные return
  if (authLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-muted-foreground">Загрузка записи...</span>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!item && !loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <CalendarDays className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">Запись не найдена</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Возможно, запись была удалена или у вас нет прав доступа
            </p>
            <Link href="/dashboard/appointments">
              <Button className="rounded-2xl bg-gradient-primary hover:opacity-90">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Вернуться к календарю
              </Button>
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  // ✅ Финальный рендер
  return (
    <AppLayout
      title={`Запись ${item?.id.slice(0, 8) || '...'}`}
      description="Детали записи и управление статусом"
      icon={CalendarDays}
      actions={headerActions}
    >
      <div className="container mx-auto px-6 py-6 space-y-6">
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
        ) : (
          <>
            {/* Feature Badge */}
            <PageFeatureBadge
              variant="emerald-green"
              icon={Sparkles}
              title="Детальная карточка записи"
              description="Live-трекинг прогресса, управление статусами, оценки клиентов и автообновление данных."
              aside={<TrendingUp className="w-6 h-6 text-secondary" />}
            />

            {/* Header with Status */}
            <Card className="p-6 glass border-border/30 rounded-3xl surface-glow">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-r from-indigo-500/20 to-purple-500/20">
                    <CalendarDays className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold mb-2">Запись {item?.id.slice(0, 8)}</h1>
                    <div className="flex items-center gap-3">
                      <Badge 
                        variant="outline" 
                        className={cn(
                          'text-sm px-3 py-1 rounded-xl',
                          statusConfig.bg,
                          statusConfig.text,
                          statusConfig.border
                        )}
                      >
                        {APPOINTMENT_STATUS_LABELS[item?.status || 'DRAFT']}
                      </Badge>
                      <Badge 
                        variant="outline" 
                        className={cn(
                          'text-sm px-3 py-1 rounded-xl',
                          priorityConfig.bg,
                          priorityConfig.text,
                          priorityConfig.border
                        )}
                      >
                        {APPOINTMENT_PRIORITY_LABELS[item?.priority || 'NORMAL']}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex flex-wrap gap-2">
                  {canConfirm && (
                    <Button
                      onClick={doConfirm}
                      disabled={actionLoading === 'confirm'}
                      className="rounded-xl bg-gradient-primary hover:opacity-90"
                    >
                      {actionLoading === 'confirm' ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                      )}
                      Подтвердить
                    </Button>
                  )}

                  {canReschedule && (
                    <Button
                      variant="outline"
                      onClick={() => setOpenReschedule(true)}
                      disabled={actionLoading === 'reschedule'}
                      className="rounded-xl btn-outline-fixed"
                    >
                      {actionLoading === 'reschedule' ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <PencilLine className="w-4 h-4 mr-2" />
                      )}
                      Перенести
                    </Button>
                  )}

                  {canActionComplete && (
                    <Button
                      variant="secondary"
                      onClick={() => setOpenComplete(true)}
                      disabled={actionLoading === 'complete'}
                      className="rounded-xl"
                    >
                      {actionLoading === 'complete' ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Clock className="w-4 h-4 mr-2" />
                      )}
                      Завершить
                    </Button>
                  )}

                  {canCancel && (
                    <Button
                      variant="destructive"
                      onClick={() => setOpenCancel(true)}
                      disabled={actionLoading === 'cancel'}
                      className="rounded-xl"
                    >
                      {actionLoading === 'cancel' ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <XCircle className="w-4 h-4 mr-2" />
                      )}
                      Отменить
                    </Button>
                  )}

                  {canRate && (
                    <Button
                      variant="outline"
                      onClick={() => setOpenRating(true)}
                      disabled={actionLoading === 'rating'}
                      className="rounded-xl btn-outline-fixed"
                    >
                      {actionLoading === 'rating' ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Star className="w-4 h-4 mr-2" />
                      )}
                      Оценить
                    </Button>
                  )}
                </div>
              </div>
            </Card>

            {/* Main Information */}
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Customer & Vehicle Info */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="p-6 glass border-border/30 rounded-3xl surface-glow">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-xl bg-gradient-to-r from-blue-500/20 to-purple-500/20">
                      <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Участники</h3>
                      <p className="text-sm text-muted-foreground">Клиент, автомобиль и исполнитель</p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Customer */}
                    <div className="space-y-3">
                      <AppointmentInfoRow 
                        icon={User}
                        label="Клиент"
                        value={item?.customerName || item?.customerId || '—'}
                      />
                      {item?.contactPhone && (
                        <AppointmentInfoRow 
                          icon={Phone}
                          label="Телефон"
                          value={item.contactPhone}
                        />
                      )}
                      {item?.contactEmail && (
                        <AppointmentInfoRow 
                          icon={Mail}
                          label="Email"
                          value={item.contactEmail}
                        />
                      )}
                    </div>

                    {/* Vehicle & Mechanic */}
                    <div className="space-y-3">
                      <AppointmentInfoRow 
                        icon={Car}
                        label="Автомобиль"
                        value={item?.vehicleInfo || item?.vehicleId || '—'}
                      />
                      <AppointmentInfoRow 
                        icon={Wrench}
                        label="Механик"
                        value={item?.mechanicName || item?.mechanicId || '—'}
                      />
                    </div>
                  </div>
                </Card>

                {/* Schedule & Description */}
                <Card className="p-6 glass border-border/30 rounded-3xl surface-glow">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20">
                      <Timer className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Расписание и детали</h3>
                      <p className="text-sm text-muted-foreground">Время проведения и описание работ</p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <AppointmentInfoRow 
                        icon={Calendar}
                        label="Дата"
                        value={fmtDate(item?.startTime)}
                      />
                      <AppointmentInfoRow 
                        icon={Clock}
                        label="Время"
                        value={`${fmtTime(item?.startTime)} — ${fmtTime(item?.endTime)}`}
                      />
                    </div>

                    <div className="space-y-3">
                      <AppointmentInfoRow 
                        icon={MessageSquare}
                        label="Описание работ"
                        value={item?.description || '—'}
                        multiline
                      />
                      {item?.customerNotes && (
                        <AppointmentInfoRow 
                          icon={MessageSquare}
                          label="Заметки клиента"
                          value={item.customerNotes}
                          multiline
                        />
                      )}
                    </div>
                  </div>
                </Card>
              </div>

              {/* Sidebar - Tracking & Actions */}
              <div className="space-y-6">
                {/* Live Tracking */}
                <Card className="p-6 glass border-border/30 rounded-3xl surface-glow">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-xl bg-gradient-to-r from-green-500/20 to-emerald-500/20">
                      <Zap className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Live-трекинг</h3>
                      <p className="text-sm text-muted-foreground">Автообновление каждые 15 сек</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="text-sm text-muted-foreground mb-2">Текущий этап</div>
                      <div className="text-sm font-medium">
                        {tracking?.currentStep || 'Ожидание начала работ'}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-muted-foreground">Прогресс</span>
                        <span className="font-medium">
                          {Math.round(tracking?.progress ?? 0)}%
                        </span>
                      </div>
                      <div className="h-3 w-full rounded-full bg-muted/40 overflow-hidden">
                        <div
                          className="h-3 bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-300"
                          style={{ width: `${Math.max(0, Math.min(100, Math.round(tracking?.progress ?? 0)))}%` }}
                        />
                      </div>
                    </div>

                    <Button 
                      variant="outline" 
                      onClick={checkTracking} 
                      className="w-full rounded-2xl btn-outline-fixed"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Обновить статус
                    </Button>
                  </div>
                </Card>

                {/* Cost & Rating */}
                <Card className="p-6 glass border-border/30 rounded-3xl surface-glow">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20">
                      <Star className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Стоимость и оценка</h3>
                      <p className="text-sm text-muted-foreground">Финансовая информация</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {item?.estimatedCost && (
                      <div>
                        <div className="text-sm text-muted-foreground">Плановая стоимость</div>
                        <div className="text-lg font-semibold">
                          {item.estimatedCost.toLocaleString('ru-RU')} ₽
                        </div>
                      </div>
                    )}

                    {item?.finalCost && (
                      <div>
                        <div className="text-sm text-muted-foreground">Итоговая стоимость</div>
                        <div className="text-lg font-semibold">
                          {item.finalCost.toLocaleString('ru-RU')} ₽
                        </div>
                      </div>
                    )}

                    {item?.rating && (
                      <div>
                        <div className="text-sm text-muted-foreground mb-2">Оценка клиента</div>
                        <div className="flex items-center gap-2">
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={cn(
                                  "w-4 h-4",
                                  i < item.rating! ? "text-amber-400 fill-current" : "text-muted-foreground"
                                )}
                              />
                            ))}
                          </div>
                          <span className="text-sm font-medium">{item.rating}/5</span>
                        </div>
                        {item.feedback && (
                          <div className="text-sm text-muted-foreground mt-2 italic">
                            "{item.feedback}"
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            </div>
          </>
        )}
      </div>

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
    </AppLayout>
  );
}

// Appointment Info Row Component
function AppointmentInfoRow({
  icon: Icon,
  label,
  value,
  multiline = false
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-2xl bg-surface-1/40 border border-border/30 transition-all duration-300 hover:bg-surface-1/60">
      <div className="p-1.5 rounded-lg bg-background/50 mt-0.5">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground mb-1">{label}</div>
        <div className={cn(
          "text-sm font-medium",
          multiline ? "whitespace-pre-wrap" : "truncate"
        )}>
          {value}
        </div>
      </div>
    </div>
  );
}
