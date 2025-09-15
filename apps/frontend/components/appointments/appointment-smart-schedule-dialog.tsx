// path: apps/frontend/components/appointments/appointment-smart-schedule-dialog.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { appointmentsAPI } from '@/lib/api/appointments';
import type { AppointmentPriority, SmartScheduleRequest, SmartScheduleResponse, SmartScheduleSlot } from '@/lib/types/appointments';
import { toast } from 'sonner';

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  params: {
    customerId?: string;
    vehicleId?: string;
    serviceIds: string[];
    priority?: AppointmentPriority;
    preferredMechanicId?: string;
  };
  onSelectSlot: (slot: { startTime: string; endTime: string; mechanicId?: string; estimatedDuration?: number }) => void;
};

function toIsoString(d: string | Date): string {
  const dt = typeof d === 'string' ? new Date(d) : d;
  return isNaN(dt.getTime()) ? '' : dt.toISOString();
}

function fmtDateTime(iso: string | Date) {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
}

export function AppointmentSmartScheduleDialog({ open, onOpenChange, params, onSelectSlot }: Props) {
  const [loading, setLoading] = useState(false);
  const [allowWeekends, setAllowWeekends] = useState(false);
  const [maxWaitingDays, setMaxWaitingDays] = useState<number>(7);
  const [preferredDate, setPreferredDate] = useState<string>('');
  const [preferredTimeStart, setPreferredTimeStart] = useState<string>('');
  const [preferredTimeEnd, setPreferredTimeEnd] = useState<string>('');

  const [data, setData] = useState<SmartScheduleResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canSearch = useMemo(() => {
    return !!params.customerId && !!params.vehicleId && params.serviceIds.length > 0 && !!params.priority;
  }, [params]);

  useEffect(() => {
    if (!open) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }
  }, [open]);

  const onSearch = async () => {
    if (!canSearch) {
      toast.error('Заполните клиента, авто, услуги и приоритет');
      return;
    }
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const payload: SmartScheduleRequest = {
        customerId: params.customerId!,
        vehicleId: params.vehicleId!,
        serviceIds: params.serviceIds,
        priority: params.priority!,
        preferredMechanicId: params.preferredMechanicId || undefined,
        maxWaitingDays,
        allowWeekends,
        preferredDate: preferredDate || undefined,
        preferredTimeStart: preferredTimeStart || undefined,
        preferredTimeEnd: preferredTimeEnd || undefined,
      };
      const res = await appointmentsAPI.smartSchedule(payload);
      setData(res);
      if ((!res.recommendedSlots || res.recommendedSlots.length === 0) && (!res.alternatives || res.alternatives.length === 0)) {
        toast.message('Подбор не дал результатов', { description: 'Попробуйте изменить параметры' });
      }
    } catch (e) {
      const msg = (e as Error)?.message || 'Не удалось получить рекомендации';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const renderSlot = (s: SmartScheduleSlot, key: string) => (
    <div key={key} className="flex items-center justify-between px-3 py-2 border-b last:border-b-0">
      <div className="text-sm">
        <div className="font-medium">
          {fmtDateTime(s.startTime)} — {fmtDateTime(s.endTime)}
        </div>
        <div className="text-xs text-muted-foreground">
          Механик: {s.mechanicName || s.mechanicId} • Длительность: {s.estimatedDuration} мин • Стоимость: {Math.round(s.totalCost).toLocaleString('ru-RU')} ₽
        </div>
        {s.recommendationReason ? (
          <div className="text-xs text-muted-foreground">Причина: {s.recommendationReason}</div>
        ) : null}
      </div>
      <Button
        size="sm"
        className="rounded-xl"
        onClick={() =>
          onSelectSlot({
            startTime: toIsoString(s.startTime),
            endTime: toIsoString(s.endTime),
            mechanicId: s.mechanicId,
            estimatedDuration: s.estimatedDuration,
          })
        }
      >
        Выбрать
      </Button>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => !loading && onOpenChange(v)}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Умное планирование</DialogTitle>
          <DialogDescription>Подбор оптимального времени с учетом предпочтений и загрузки</DialogDescription>
        </DialogHeader>

        {/* Параметры подбора */}
        <div className="grid md:grid-cols-5 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Предпочт. дата</label>
            <Input type="date" value={preferredDate} onChange={(e) => setPreferredDate(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">С (чч:мм)</label>
            <Input placeholder="09:00" value={preferredTimeStart} onChange={(e) => setPreferredTimeStart(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">По (чч:мм)</label>
            <Input placeholder="17:00" value={preferredTimeEnd} onChange={(e) => setPreferredTimeEnd(e.target.value)} />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Ожидание (дн.)</label>
            <Input
              type="number"
              min={1}
              max={30}
              value={maxWaitingDays}
              onChange={(e) => setMaxWaitingDays(Math.max(1, Math.min(30, Number(e.target.value) || 1)))}
            />
          </div>
          <div className="flex items-end">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="accent-primary"
                checked={allowWeekends}
                onChange={(e) => setAllowWeekends(e.target.checked)}
              />
              Выходные ок
            </label>
          </div>
        </div>

        <div className="mt-3">
          <Button variant="outline" onClick={onSearch} disabled={loading}>
            {loading ? 'Подбираем…' : 'Подобрать слоты'}
          </Button>
        </div>

        {/* Результаты */}
        {error && <div className="text-sm text-destructive">{error}</div>}

        {data && (
          <div className="mt-4 grid md:grid-cols-2 gap-4">
            <div className="rounded-xl border">
              <div className="px-3 py-2 text-xs text-muted-foreground bg-muted/20">Рекомендованные</div>
              <div className="max-h-64 overflow-auto">
                {(data.recommendedSlots || []).map((s, i) => renderSlot(s, `rec-${i}`))}
              </div>
            </div>
            <div className="rounded-xl border">
              <div className="px-3 py-2 text-xs text-muted-foreground bg-muted/20">Альтернативы</div>
              <div className="max-h-64 overflow-auto">
                {(data.alternatives || []).map((s, i) => renderSlot(s, `alt-${i}`))}
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 mt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            Закрыть
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
