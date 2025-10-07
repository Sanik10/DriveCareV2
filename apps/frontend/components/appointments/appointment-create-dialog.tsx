// path: apps/frontend/components/appointments/appointment-create-dialog.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { Calendar } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { appointmentsAPI } from '@/lib/api/appointments';
import type {
  Appointment,
  AppointmentPriority,
  AvailabilitySlot,
  CreateAppointmentRequest,
} from '@/lib/types/appointments';
import { toast } from 'sonner';
import { CustomerSelect, type CustomerOption } from '@/components/appointments/selects/CustomerSelect';
import { VehicleSelect, type VehicleOption } from '@/components/appointments/selects/VehicleSelect';
import { MechanicSelect, type MechanicOption } from '@/components/appointments/selects/MechanicSelect';
import { ServicesMultiSelect, type ServiceOption } from '@/components/appointments/selects/ServicesMultiSelect';
import { AppointmentSmartScheduleDialog } from '@/components/appointments/appointment-smart-schedule-dialog';
import { Kbd } from '@/components/ui/kbd';

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: (appointment: Appointment) => void;
};

const PRIORITIES: { value: AppointmentPriority; label: string }[] = [
  { value: 'LOW', label: 'Низкий' },
  { value: 'NORMAL', label: 'Обычный' },
  { value: 'HIGH', label: 'Высокий' },
  { value: 'URGENT', label: 'Срочно' },
];

function toIsoFromLocal(dateTimeLocal: string | undefined): string | undefined {
  if (!dateTimeLocal) return undefined;
  const d = new Date(dateTimeLocal);
  if (isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

function toLocalInputValue(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}`;
}

function fmtDateTime(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('ru-RU', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
}

type AvailStatus = 'idle' | 'checking' | 'ok' | 'empty' | 'error';

export function AppointmentCreateDialog({ open, onOpenChange, onCreated }: Props) {
  const [submitting, setSubmitting] = useState(false);

  const [customer, setCustomer] = useState<CustomerOption | null>(null);
  const [vehicle, setVehicle] = useState<VehicleOption | null>(null);
  const [mechanic, setMechanic] = useState<MechanicOption | null>(null);
  const [services, setServices] = useState<ServiceOption[]>([]);

  const [startLocal, setStartLocal] = useState<string>('');
  const [endLocal, setEndLocal] = useState<string>('');
  const [estimatedDuration, setEstimatedDuration] = useState<string>('60');

  const [priority, setPriority] = useState<AppointmentPriority>('NORMAL');
  const [description, setDescription] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [estimatedCost, setEstimatedCost] = useState<string>('');

  const todayISODate = useMemo(() => {
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }, []);
  const [availDate, setAvailDate] = useState<string>('');
  const [availStart, setAvailStart] = useState<string>('');
  const [availEnd, setAvailEnd] = useState<string>('');
  const [availStatus, setAvailStatus] = useState<AvailStatus>('idle');
  const [availError, setAvailError] = useState<string | null>(null);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);

  const [openSmart, setOpenSmart] = useState(false);

  useEffect(() => {
    if (!startLocal) return;
    const dur = Number(estimatedDuration);
    if (!isFinite(dur) || dur <= 0) return;
    const startDate = new Date(startLocal);
    if (isNaN(startDate.getTime())) return;
    const autoEnd = new Date(startDate.getTime() + dur * 60_000);
    const nextEnd = toLocalInputValue(autoEnd.toISOString());
    setEndLocal((prev) => prev || nextEnd);
  }, [startLocal, estimatedDuration]);

  useEffect(() => {
    if (!startLocal) return;
    try {
      const d = new Date(startLocal);
      if (!isNaN(d.getTime())) {
        const pad = (n: number) => String(n).padStart(2, '0');
        setAvailDate((prev) => prev || `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
        setAvailStart((prev) => prev || `${pad(d.getHours())}:${pad(d.getMinutes())}`);
      }
    } catch {
      // noop
    }
  }, [startLocal]);

  useEffect(() => {
    if (!endLocal) return;
    try {
      const d = new Date(endLocal);
      if (!isNaN(d.getTime())) {
        const pad = (n: number) => String(n).padStart(2, '0');
        setAvailEnd((prev) => prev || `${pad(d.getHours())}:${pad(d.getMinutes())}`);
      }
    } catch {
      // noop
    }
  }, [endLocal]);

  const canSubmit = useMemo(() => {
    const dur = Number(estimatedDuration);
    return (
      customer?.id &&
      vehicle?.id &&
      mechanic?.id &&
      services.length >= 1 &&
      startLocal &&
      endLocal &&
      isFinite(dur) &&
      dur > 0
    );
  }, [customer?.id, vehicle?.id, mechanic?.id, services, startLocal, endLocal, estimatedDuration]);

  const resetForm = () => {
    setCustomer(null);
    setVehicle(null);
    setMechanic(null);
    setServices([]);
    setStartLocal('');
    setEndLocal('');
    setEstimatedDuration('60');
    setPriority('NORMAL');
    setDescription('');
    setCustomerNotes('');
    setContactPhone('');
    setContactEmail('');
    setEstimatedCost('');
    setAvailDate('');
    setAvailStart('');
    setAvailEnd('');
    setSlots([]);
    setAvailStatus('idle');
    setAvailError(null);
    setOpenSmart(false);
  };

  const onCreate = async () => {
    if (!canSubmit) {
      toast.error('Заполните обязательные поля');
      return;
    }
    setSubmitting(true);
    try {
      const payload: CreateAppointmentRequest = {
        customerId: customer!.id,
        vehicleId: vehicle!.id,
        mechanicId: mechanic!.id,
        startTime: toIsoFromLocal(startLocal)!,
        endTime: toIsoFromLocal(endLocal)!,
        estimatedDuration: Number(estimatedDuration),
        serviceIds: services.map((s) => s.id),
        priority,
        description: description.trim() || undefined,
        customerNotes: customerNotes.trim() || undefined,
        contactPhone: contactPhone.trim() || undefined,
        contactEmail: contactEmail.trim() || undefined,
        estimatedCost: estimatedCost ? Number(estimatedCost) : undefined,
      };

      const created = await appointmentsAPI.create(payload);
      toast.success('Запись создана');
      onCreated?.(created);
      onOpenChange(false);
      resetForm();
    } catch (e) {
      const msg = (e as Error)?.message || 'Не удалось создать запись';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const onCheckAvailability = async () => {
    if (services.length < 1) {
      setAvailStatus('error');
      setAvailError('Укажите хотя бы одну услугу для проверки доступности');
      toast.error('Укажите хотя бы одну услугу для проверки доступности');
      return;
    }

    const dateStr = (availDate || todayISODate).trim();
    if (!dateStr) {
      setAvailStatus('error');
      setAvailError('Укажите дату для проверки');
      toast.error('Укажите дату для проверки');
      return;
    }

    const payload: {
      serviceIds: string[];
      date: string;
      timeRange?: { start: string; end: string };
    } = { serviceIds: services.map((s) => s.id), date: dateStr };

    if (availStart && availEnd) {
      payload.timeRange = { start: availStart, end: availEnd };
    }

    setAvailStatus('checking');
    setAvailError(null);

    try {
      const res = await appointmentsAPI.checkAvailability(payload);
      setSlots(res || []);
      if (!res || res.length === 0) {
        setAvailStatus('empty');
      } else {
        setAvailStatus('ok');
        toast.success(`Найдено слотов: ${res.length}`);
      }
    } catch (e) {
      const msg = (e as Error)?.message || 'Не удалось проверить доступность';
      setAvailError(msg);
      setAvailStatus('error');
      toast.error(msg);
    }
  };

  const applySlot = (s: AvailabilitySlot) => {
    setStartLocal(toLocalInputValue(s.startTime));
    setEndLocal(toLocalInputValue(s.endTime));
    toast.success('Слот выбран: время подставлено в форму');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !submitting && onOpenChange(v)}>
      {/* 🔥 ИСПРАВЛЕНО: увеличена высота и добавлен padding-bottom */}
      <DialogContent className="sm:max-w-3xl w-[95vw] max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-2">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Создать запись</DialogTitle>
              <DialogDescription>Заполните основные данные. Обязательные поля помечены *</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* 🔥 ИСПРАВЛЕНО: увеличен max-height и добавлен pb-20 для отступа от footer */}
        <div className="px-6 pb-20 overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <div className="text-sm text-muted-foreground mb-1">
                Клиент <span className="text-rose-500">*</span>
              </div>
              <CustomerSelect value={customer} onChange={(opt) => { setCustomer(opt); setVehicle(null); }} />
            </div>
            <div className="md:col-span-2">
              <div className="text-sm text-muted-foreground mb-1">
                Автомобиль <span className="text-rose-500">*</span>
              </div>
              <VehicleSelect customerId={customer?.id} value={vehicle} onChange={setVehicle} />
            </div>
            <div className="md:col-span-2">
              <div className="text-sm text-muted-foreground mb-1">
                Мастер <span className="text-rose-500">*</span>
              </div>
              <MechanicSelect value={mechanic} onChange={setMechanic} />
            </div>

            <div>
              <div className="text-sm text-muted-foreground mb-1">
                Начало <span className="text-rose-500">*</span>
              </div>
              <Input type="datetime-local" value={startLocal} onChange={(e) => setStartLocal(e.target.value)} />
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">
                Окончание <span className="text-rose-500">*</span>
              </div>
              <Input type="datetime-local" value={endLocal} onChange={(e) => setEndLocal(e.target.value)} />
            </div>

            <div>
              <div className="text-sm text-muted-foreground mb-1">
                Длительность (мин) <span className="text-rose-500">*</span>
              </div>
              <Input
                type="number"
                min={1}
                step={1}
                value={estimatedDuration}
                onChange={(e) => setEstimatedDuration(e.target.value)}
                placeholder="Напр., 60"
              />
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Приоритет</div>
              <select
                className="w-full h-10 rounded-md border border-border bg-background text-sm px-3"
                value={priority}
                onChange={(e) => setPriority(e.target.value as AppointmentPriority)}
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <div className="text-sm text-muted-foreground mb-1">
                Услуги <span className="text-rose-500">*</span>
              </div>
              <ServicesMultiSelect values={services} onChange={setServices} />
            </div>

            <div className="md:col-span-2">
              <div className="text-sm text-muted-foreground mb-1">Описание работ</div>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Опционально" />
            </div>
            <div className="md:col-span-2">
              <div className="text-sm text-muted-foreground mb-1">Заметки клиента</div>
              <Input value={customerNotes} onChange={(e) => setCustomerNotes(e.target.value)} placeholder="Опционально" />
            </div>

            <div>
              <div className="text-sm text-muted-foreground mb-1">Контактный телефон</div>
              <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+7..." />
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Контактный email</div>
              <Input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="email@example.com" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground mb-1">Оценочная стоимость (₽)</div>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={estimatedCost}
                onChange={(e) => setEstimatedCost(e.target.value)}
                placeholder="Напр., 5000"
              />
            </div>
          </div>

          {/* Collapsible sections */}
          <details className="mt-4 rounded-xl border border-border/30">
            <summary className="cursor-pointer select-none px-4 py-2 text-sm font-medium">Проверка доступности</summary>
            <div className="p-4 grid md:grid-cols-5 gap-3">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Дата</div>
                <Input
                  type="date"
                  value={availDate || todayISODate}
                  onChange={(e) => setAvailDate(e.target.value)}
                />
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">С (чч:мм)</div>
                <Input
                  placeholder="09:00"
                  value={availStart}
                  onChange={(e) => setAvailStart(e.target.value)}
                />
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">По (чч:мм)</div>
                <Input
                  placeholder="17:00"
                  value={availEnd}
                  onChange={(e) => setAvailEnd(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={onCheckAvailability}
                  disabled={availStatus === 'checking' || services.length === 0}
                >
                  {availStatus === 'checking' ? 'Проверяем...' : 'Проверить'}
                </Button>
              </div>

              {availStatus === 'checking' && (
                <div className="col-span-full flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  Идёт проверка доступности...
                </div>
              )}
              {availStatus === 'empty' && (
                <div className="col-span-full text-sm text-muted-foreground">
                  Свободных слотов не найдено. Попробуйте изменить дату или интервал.
                </div>
              )}
              {availStatus === 'error' && availError && (
                <div className="col-span-full text-sm text-destructive">Ошибка: {availError}</div>
              )}
            </div>

            {slots.length > 0 && (
              <div className="mt-3 mx-4 mb-4 rounded-xl border border-border/30 overflow-hidden">
                <div className="px-4 py-2 text-xs text-muted-foreground bg-muted/20">Найденные слоты</div>
                <div className="max-h-56 overflow-auto divide-y divide-border/30">
                  {slots.map((s, idx) => (
                    <div key={`${s.mechanicId}-${idx}`} className="flex items-center justify-between px-4 py-3 bg-card/50">
                      <div className="text-sm">
                        <div className="font-medium">
                          {fmtDateTime(s.startTime)} — {fmtDateTime(s.endTime)}
                        </div>
                        <div className="text-xs text-muted-foreground">Механик: {s.mechanicId}</div>
                      </div>
                      <Button size="sm" className="rounded-xl" onClick={() => applySlot(s)}>
                        Выбрать
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </details>

          <details className="mt-3 rounded-xl border border-border/30">
            <summary className="cursor-pointer select-none px-4 py-2 text-sm font-medium">Умное планирование (рекомендации)</summary>
            <div className="p-4">
              <Button
                variant="outline"
                onClick={() => setOpenSmart(true)}
                disabled={!customer?.id || !vehicle?.id || services.length === 0}
              >
                Подобрать время (Smart-Schedule)
              </Button>
            </div>
          </details>
        </div>

        {/* Sticky footer */}
        <DialogFooter className="gap-2 px-6 py-3 border-t bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 sticky bottom-0 z-50">
          <div className="hidden sm:flex items-center text-xs text-muted-foreground mr-auto">
            <span className="mr-2">Горячие клавиши:</span>
            <Kbd>Esc</Kbd>
            <span className="mx-1">—</span>
            <span className="mr-2">Закрыть</span>
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Отмена
          </Button>
          <Button onClick={onCreate} disabled={submitting || !canSubmit}>
            {submitting ? 'Создание...' : 'Создать'}
          </Button>
        </DialogFooter>
      </DialogContent>

      <AppointmentSmartScheduleDialog
        open={openSmart}
        onOpenChange={setOpenSmart}
        params={{
          customerId: customer?.id,
          vehicleId: vehicle?.id,
          serviceIds: services.map((s) => s.id),
          priority,
          preferredMechanicId: mechanic?.id,
        }}
        onSelectSlot={(slot) => {
          setStartLocal(toLocalInputValue(slot.startTime));
          setEndLocal(toLocalInputValue(slot.endTime));
          if (slot.estimatedDuration && slot.estimatedDuration > 0) {
            setEstimatedDuration(String(slot.estimatedDuration));
          }
          toast.success('Слот выбран из рекомендаций');
          setOpenSmart(false);
        }}
      />
    </Dialog>
  );
}
