// path: apps/frontend/app/dashboard/appointments/[id]/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/hooks/use-auth';
import { appointmentsAPI } from '@/lib/api/appointments';
import type { Appointment, AppointmentStatus } from '@/lib/types/appointments';
import { APPOINTMENT_PRIORITY_LABELS, APPOINTMENT_STATUS_LABELS } from '@/lib/types/appointments';
import { toast } from 'sonner';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Loader2,
  RefreshCw,
  XCircle,
  Clock,
  PencilLine,
  Star,
} from 'lucide-react';
import { AppointmentRescheduleDialog } from '@/components/appointments/appointment-reschedule-dialog';
import { AppointmentCancelDialog } from '@/components/appointments/appointment-cancel-dialog';
import { AppointmentCompleteDialog } from '@/components/appointments/appointment-complete-dialog';
import { AppointmentRatingDialog } from '@/components/appointments/appointment-rating-dialog';

function fmtDateTime(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('ru-RU');
}

type TrackingInfo = {
  progress: number;
  currentStep?: string;
};

export default function AppointmentDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState<Appointment | null>(null);
  const [actionLoading, setActionLoading] = useState<'confirm' | 'cancel' | 'reschedule' | 'complete' | 'rating' | null>(null);

  const [openReschedule, setOpenReschedule] = useState(false);
  const [openCancel, setOpenCancel] = useState(false);
  const [openComplete, setOpenComplete] = useState(false);
  const [openRating, setOpenRating] = useState(false);

  const [tracking, setTracking] = useState<TrackingInfo | null>(null);

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
  }, [id, isAuthenticated]);

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
      throw e; // чтобы диалог мог остаться открытым при ошибке (поведение унифицировано)
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
      throw e; // чтобы диалог мог остаться открытым при ошибке
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
      throw e; // диалог оставляем открытым
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
      throw e; // диалог оставляем открытым
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

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }
  if (!item) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-surface-1">
      <div className="fixed inset-0 bg-gradient-surface -z-10" />

      <header className="border-b border-border/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/appointments">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Назад
              </Button>
            </Link>
            <div className="p-2 rounded-lg bg-indigo-500/20">
              <CalendarDays className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Запись {item.id.slice(0, 8)}</h1>
              <p className="text-xs text-muted-foreground">Детали записи и действия</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={refresh}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Обновить
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-6 space-y-6">
        {/* Основные сведения */}
        <Card className="p-6 rounded-3xl glass border-border/30">
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <div className="text-xs text-muted-foreground">Клиент</div>
              <div className="font-medium">{item.customerName || item.customerId}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Автомобиль</div>
              <div className="font-medium">{item.vehicleInfo || item.vehicleId}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Механик</div>
              <div className="font-medium">{item.mechanicName || item.mechanicId}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Время</div>
              <div className="font-medium">
                {fmtDateTime(item.startTime)} — {fmtDateTime(item.endTime)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Статус</div>
              <div className="font-medium">{APPOINTMENT_STATUS_LABELS[item.status]}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Приоритет</div>
              <div className="font-medium">{APPOINTMENT_PRIORITY_LABELS[item.priority]}</div>
            </div>
          </div>
        </Card>

        {/* Описание/Заметки */}
        <Card className="p-6 rounded-3xl glass border-border/30">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="text-xs text-muted-foreground">Описание работ</div>
              <div className="text-sm">{item.description || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Заметки клиента</div>
              <div className="text-sm">{item.customerNotes || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Контакты</div>
              <div className="text-sm">
                {item.contactPhone || '—'}
                {item.contactEmail ? ` • ${item.contactEmail}` : ''}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Оценка и отзыв</div>
              <div className="text-sm">
                {item.rating ? `★ ${item.rating}/5` : '—'}
                {item.feedback ? ` • ${item.feedback}` : ''}
              </div>
            </div>
          </div>
        </Card>

        {/* Трекинг (мини-виджет, автопуллинг) */}
        <Card className="p-6 rounded-3xl glass border-border/30">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs text-muted-foreground">Текущее состояние</div>
              <div className="text-sm">{tracking?.currentStep || '—'}</div>
            </div>
            <div className="flex-1 max-w-[420px]">
              <div className="h-2 w-full rounded-full bg-muted/40 overflow-hidden">
                <div
                  className="h-2 bg-indigo-500 transition-all"
                  style={{ width: `${Math.max(0, Math.min(100, Math.round(tracking?.progress ?? 0)))}%` }}
                />
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Прогресс: {Math.round(tracking?.progress ?? 0)}%
              </div>
            </div>
            <Button variant="outline" onClick={checkTracking} className="rounded-2xl">
              <RefreshCw className="w-4 h-4 mr-2" />
              Проверить сейчас
            </Button>
          </div>
        </Card>

        {/* Действия */}
        <Card className="p-6 rounded-3xl glass border-border/30">
          <div className="flex flex-wrap gap-3 items-center">
            <Button
              onClick={doConfirm}
              disabled={!canConfirm || actionLoading === 'confirm'}
              title={!canConfirm ? 'Доступно только для статуса «Запланирована»' : undefined}
              className="rounded-2xl"
            >
              {actionLoading === 'confirm' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-2" />
              )}
              Подтвердить
            </Button>

            <Button
              variant="outline"
              onClick={() => setOpenReschedule(true)}
              disabled={!canReschedule || actionLoading === 'reschedule'}
              title={!canReschedule ? 'Перенос доступен только для черновика/запланированной/подтверждённой' : undefined}
              className="rounded-2xl"
            >
              {actionLoading === 'reschedule' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <PencilLine className="w-4 h-4 mr-2" />
              )}
              Перенести
            </Button>

            <Button
              variant="ghost"
              className="text-destructive rounded-2xl"
              onClick={() => setOpenCancel(true)}
              disabled={!canCancel || actionLoading === 'cancel'}
              title={!canCancel ? 'Отмена недоступна для текущего статуса' : undefined}
            >
              {actionLoading === 'cancel' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4 mr-2" />
              )}
              Отменить
            </Button>

            <Button
              variant="secondary"
              onClick={() => setOpenComplete(true)}
              disabled={!canActionComplete || actionLoading === 'complete'}
              title={!canActionComplete ? 'Завершение доступно из статуса «В работе»' : undefined}
              className="rounded-2xl"
            >
              {actionLoading === 'complete' ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Clock className="w-4 h-4 mr-2" />
              )}
              Завершить
            </Button>

            <Button variant="outline" onClick={checkTracking} className="rounded-2xl">
              <RefreshCw className="w-4 h-4 mr-2" />
              Проверить статус
            </Button>

            {canRate && (
              <Button
                variant="outline"
                onClick={() => setOpenRating(true)}
                disabled={actionLoading === 'rating'}
                className="rounded-2xl"
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
        </Card>
      </main>

      {/* Dialogs */}
      <AppointmentRescheduleDialog
        open={openReschedule}
        onOpenChange={setOpenReschedule}
        startTime={item.startTime}
        endTime={item.endTime}
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
        initialFinalCost={item.estimatedCost ?? undefined}
      />
      <AppointmentRatingDialog
        open={openRating}
        onOpenChange={setOpenRating}
        onConfirm={doRating}
        loading={actionLoading === 'rating'}
        initialRating={5}
      />
    </div>
  );
}
