// path: apps/frontend/components/appointments/appointment-create-dialog.tsx
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Calendar } from 'lucide-react';
import { toast } from 'sonner';

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
import { Kbd } from '@/components/ui/kbd';

import { appointmentsAPI } from '@/lib/api/appointments';
import type {
  Appointment,
  AppointmentPriority,
  AvailabilitySlot,
  CreateAppointmentRequest,
} from '@/lib/types/appointments';

import { CustomerSelect, type CustomerOption } from '@/components/appointments/selects/CustomerSelect';
import { VehicleSelect, type VehicleOption } from '@/components/appointments/selects/VehicleSelect';
import { MechanicSelect, type MechanicOption } from '@/components/appointments/selects/MechanicSelect';
import { ServicesMultiSelect, type ServiceOption } from '@/components/appointments/selects/ServicesMultiSelect';

import { AppointmentSmartScheduleDialog } from '@/components/appointments/appointment-smart-schedule-dialog';
import { cn } from '@/lib/utils';

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: (appointment: Appointment) => void;

  /**
   * Опциональный контекст от календаря:
   * - initialDate: дата, по которой кликнули
   * - initialTimeSlot: "HH:MM" (например "10:00") для day/week
   * - initialMechanic: выбранный мастер из фильтра (если есть)
   */
  initialDate?: Date;
  initialTimeSlot?: string;
  initialMechanic?: MechanicOption | null;
};

const PRIORITIES: { value: AppointmentPriority; label: string }[] = [
  { value: 'LOW', label: 'Низкий' },
  { value: 'NORMAL', label: 'Обычный' },
  { value: 'HIGH', label: 'Высокий' },
  { value: 'URGENT', label: 'Срочно' },
];

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function toIsoFromLocal(dateTimeLocal: string | undefined): string | undefined {
  if (!dateTimeLocal) return undefined;
  const d = new Date(dateTimeLocal);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

function toLocalDateTimeValueFromDate(d: Date) {
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(
    d.getMinutes(),
  )}`;
}

function fmtDateTime(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  });
}

function roundUpToNextMinutes(date: Date, stepMinutes: number) {
  const d = new Date(date);
  const ms = stepMinutes * 60_000;
  const rounded = Math.ceil(d.getTime() / ms) * ms;
  return new Date(rounded);
}

function parseTimeSlotHHMM(timeSlot?: string): { h: number; m: number } | null {
  if (!timeSlot) return null;
  const [hh, mm] = String(timeSlot).split(':');
  const h = Number(hh);
  const m = Number(mm ?? '0');
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  if (h < 0 || h > 23) return null;
  if (m < 0 || m > 59) return null;
  return { h, m };
}

type AvailStatus = 'idle' | 'checking' | 'ok' | 'empty' | 'error';

type FieldErrors = Partial<{
  customer: string;
  vehicle: string;
  mechanic: string;
  services: string;
  startLocal: string;
  duration: string;
  estimatedCost: string;
}>;

function Field({
  label,
  required,
  error,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  error?: string | null;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-xs', className)}>
      <div className="text-sm text-muted-foreground">
        {label} {required ? <span className="text-status-error">*</span> : null}
      </div>
      {children}
      <div className={cn('text-xs min-h-[16px]', error ? 'text-status-error' : 'text-muted-foreground/0')}>
        {error || '—'}
      </div>
    </div>
  );
}

export function AppointmentCreateDialog({
  open,
  onOpenChange,
  onCreated,
  initialDate,
  initialTimeSlot,
  initialMechanic,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  // Required core fields
  const [customer, setCustomer] = useState<CustomerOption | null>(null);
  const [vehicle, setVehicle] = useState<VehicleOption | null>(null);
  const [mechanic, setMechanic] = useState<MechanicOption | null>(null);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [startLocal, setStartLocal] = useState<string>('');
  const [estimatedDuration, setEstimatedDuration] = useState<string>('60');

  // Optional fields (moved to "Дополнительно")
  const [priority, setPriority] = useState<AppointmentPriority>('NORMAL');
  const [description, setDescription] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [estimatedCost, setEstimatedCost] = useState<string>('');

  // Availability / Smart schedule (collapsed sections)
  const todayISODate = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }, []);

  const [availDate, setAvailDate] = useState<string>('');
  const [availStart, setAvailStart] = useState<string>('');
  const [availEnd, setAvailEnd] = useState<string>('');
  const [availStatus, setAvailStatus] = useState<AvailStatus>('idle');
  const [availError, setAvailError] = useState<string | null>(null);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);

  const [openSmart, setOpenSmart] = useState(false);

  const durationMinutes = useMemo(() => {
    const d = Number(estimatedDuration);
    return Number.isFinite(d) ? d : NaN;
  }, [estimatedDuration]);

  const endLocal = useMemo(() => {
    if (!startLocal) return '';
    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) return '';
    const start = new Date(startLocal);
    if (Number.isNaN(start.getTime())) return '';
    const end = new Date(start.getTime() + durationMinutes * 60_000);
    return toLocalDateTimeValueFromDate(end);
  }, [startLocal, durationMinutes]);

  // Prefill availability inputs from выбранного времени (но не затираем руками введённое)
  useEffect(() => {
    if (!open) return;
    if (!startLocal) return;

    const d = new Date(startLocal);
    if (Number.isNaN(d.getTime())) return;

    const dateStr = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    const startStr = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

    const end = endLocal ? new Date(endLocal) : null;
    const endStr =
      end && !Number.isNaN(end.getTime()) ? `${pad2(end.getHours())}:${pad2(end.getMinutes())}` : '';

    setAvailDate((prev) => prev || dateStr);
    setAvailStart((prev) => prev || startStr);
    setAvailEnd((prev) => prev || endStr);
  }, [open, startLocal, endLocal]);

  const errors: FieldErrors = useMemo(() => {
    const next: FieldErrors = {};

    if (!customer?.id) next.customer = 'Выберите клиента';
    if (!vehicle?.id) next.vehicle = 'Выберите автомобиль клиента';
    if (!mechanic?.id) next.mechanic = 'Выберите мастера';
    if (!services || services.length < 1) next.services = 'Укажите хотя бы одну услугу';

    if (!startLocal) next.startLocal = 'Укажите дату и время начала';
    else {
      const d = new Date(startLocal);
      if (Number.isNaN(d.getTime())) next.startLocal = 'Некорректная дата/время';
    }

    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) next.duration = 'Укажите длительность (мин)';
    if (Number.isFinite(durationMinutes) && durationMinutes > 24 * 60) next.duration = 'Слишком большая длительность';

    if (estimatedCost) {
      const n = Number(estimatedCost);
      if (!Number.isFinite(n) || n < 0) next.estimatedCost = 'Некорректная сумма';
    }

    // Доп. контроль: end должен считаться
    if (startLocal && Number.isFinite(durationMinutes) && durationMinutes > 0 && !endLocal) {
      next.duration = next.duration || 'Не удалось вычислить окончание';
    }

    return next;
  }, [customer?.id, vehicle?.id, mechanic?.id, services, startLocal, durationMinutes, endLocal, estimatedCost]);

  const canSubmit = useMemo(() => Object.keys(errors).length === 0, [errors]);

  const initForm = useCallback(() => {
    setAttemptedSubmit(false);
    setSubmitting(false);

    setCustomer(null);
    setVehicle(null);

    // мастер может подтягиваться из контекста фильтра
    setMechanic(initialMechanic ?? null);

    setServices([]);

    // префилл времени
    const base = initialDate ? new Date(initialDate) : roundUpToNextMinutes(new Date(), 30);

    if (initialDate) {
      const hm = parseTimeSlotHHMM(initialTimeSlot);
      if (hm) {
        base.setHours(hm.h, hm.m, 0, 0);
      } else {
        // month view: если времени нет — ставим "09:00" как разумный дефолт
        base.setHours(9, 0, 0, 0);
      }
    }

    setStartLocal(toLocalDateTimeValueFromDate(base));
    setEstimatedDuration('60');

    // optional
    setPriority('NORMAL');
    setDescription('');
    setCustomerNotes('');
    setContactPhone('');
    setContactEmail('');
    setEstimatedCost('');

    // availability
    setAvailDate('');
    setAvailStart('');
    setAvailEnd('');
    setSlots([]);
    setAvailStatus('idle');
    setAvailError(null);

    // smart schedule
    setOpenSmart(false);
  }, [initialDate, initialTimeSlot, initialMechanic]);

  // Инициализация при открытии, очистка при закрытии
  useEffect(() => {
    if (open) initForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleCreate = useCallback(async () => {
    setAttemptedSubmit(true);

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
    } catch (e) {
      const msg = (e as Error)?.message || 'Не удалось создать запись';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }, [
    canSubmit,
    customer,
    vehicle,
    mechanic,
    startLocal,
    endLocal,
    estimatedDuration,
    services,
    priority,
    description,
    customerNotes,
    contactPhone,
    contactEmail,
    estimatedCost,
    onCreated,
    onOpenChange,
  ]);

  // Hotkeys: Cmd/Ctrl+Enter = create, Esc = close (Radix сам закрывает по Esc, но мы блокируем при submitting)
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (submitting) return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        void handleCreate();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, submitting, handleCreate]);

  const handleCheckAvailability = useCallback(async () => {
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
  }, [services, availDate, availStart, availEnd, todayISODate]);

  const applySlot = useCallback((s: AvailabilitySlot) => {
    const start = new Date(s.startTime);
    const end = new Date(s.endTime);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      toast.error('Некорректный слот');
      return;
    }

    const dur = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60_000));
    setStartLocal(toLocalDateTimeValueFromDate(start));
    setEstimatedDuration(String(s.estimatedDuration && s.estimatedDuration > 0 ? s.estimatedDuration : dur));
    toast.success('Слот выбран: время подставлено в форму');
  }, []);

  return (
    <Dialog open={open} onOpenChange={(v) => !submitting && onOpenChange(v)}>
      <DialogContent className="sm:max-w-3xl w-[95vw] max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="px-xl pt-xl pb-md border-b">
          <div className="flex items-start gap-md">
            <div className="h-10 w-10 rounded-md border bg-surface-2 flex items-center justify-center text-muted-foreground">
              <Calendar className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <DialogTitle>Новая запись</DialogTitle>
              <DialogDescription>Заполните основные данные. Обязательные поля помечены *</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Body */}
        <div className="px-xl py-xl overflow-y-auto max-h-[calc(90vh-160px)]">
          <div className="grid md:grid-cols-2 gap-lg">
            <div className="md:col-span-2">
              <Field label="Клиент" required error={attemptedSubmit ? errors.customer : null}>
                <CustomerSelect
                  value={customer}
                  onChange={(opt) => {
                    setCustomer(opt);
                    setVehicle(null);
                  }}
                />
              </Field>
            </div>

            <div className="md:col-span-2">
              <Field label="Автомобиль" required error={attemptedSubmit ? errors.vehicle : null}>
                <VehicleSelect customerId={customer?.id} value={vehicle} onChange={setVehicle} />
              </Field>
            </div>

            <div className="md:col-span-2">
              <Field label="Мастер" required error={attemptedSubmit ? errors.mechanic : null}>
                <MechanicSelect value={mechanic} onChange={setMechanic} />
              </Field>
            </div>

            <div className="md:col-span-2">
              <Field label="Услуги" required error={attemptedSubmit ? errors.services : null}>
                <ServicesMultiSelect values={services} onChange={setServices} />
              </Field>
            </div>

            <Field label="Начало" required error={attemptedSubmit ? errors.startLocal : null}>
              <Input type="datetime-local" value={startLocal} onChange={(e) => setStartLocal(e.target.value)} />
            </Field>

            <Field label="Длительность (мин)" required error={attemptedSubmit ? errors.duration : null}>
              <Input
                type="number"
                min={1}
                step={1}
                value={estimatedDuration}
                onChange={(e) => setEstimatedDuration(e.target.value)}
                placeholder="Напр., 60"
              />
            </Field>

            <div className="md:col-span-2">
              <div className="flex items-center justify-between gap-md rounded-md border bg-card px-lg py-md">
                <div className="text-sm text-muted-foreground">Окончание (рассчитано)</div>
                <div className="text-sm font-medium text-foreground">{endLocal ? fmtDateTime(toIsoFromLocal(endLocal)) : '—'}</div>
              </div>
            </div>
          </div>

          {/* Дополнительно */}
          <details className="mt-xl rounded-md border">
            <summary className="cursor-pointer select-none px-lg py-md text-sm font-medium">Дополнительно</summary>

            <div className="px-lg pb-lg">
              <div className="grid md:grid-cols-2 gap-lg">
                <div>
                  <div className="text-sm text-muted-foreground mb-xs">Приоритет</div>
                  <select
                    className={cn(
                      'h-10 w-full rounded-md border border-input bg-background text-sm px-md',
                      'text-foreground hover:border-border/80',
                    )}
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as AppointmentPriority)}
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                  <div className="text-xs min-h-[16px] text-muted-foreground/0">—</div>
                </div>

                <Field label="Оценочная стоимость (₽)" error={attemptedSubmit ? errors.estimatedCost : null}>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={estimatedCost}
                    onChange={(e) => setEstimatedCost(e.target.value)}
                    placeholder="Напр., 5000"
                  />
                </Field>

                <div className="md:col-span-2">
                  <Field label="Описание работ">
                    <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Опционально" />
                  </Field>
                </div>

                <div className="md:col-span-2">
                  <Field label="Заметки клиента">
                    <Input
                      value={customerNotes}
                      onChange={(e) => setCustomerNotes(e.target.value)}
                      placeholder="Опционально"
                    />
                  </Field>
                </div>

                <Field label="Контактный телефон">
                  <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+7..." />
                </Field>

                <Field label="Контактный email">
                  <Input
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="email@example.com"
                  />
                </Field>
              </div>

              {/* Проверка доступности */}
              <details className="mt-lg rounded-md border">
                <summary className="cursor-pointer select-none px-lg py-md text-sm font-medium">
                  Проверка доступности
                </summary>

                <div className="p-lg grid md:grid-cols-5 gap-md">
                  <div>
                    <div className="text-xs text-muted-foreground mb-xs">Дата</div>
                    <Input type="date" value={availDate || todayISODate} onChange={(e) => setAvailDate(e.target.value)} />
                  </div>

                  <div>
                    <div className="text-xs text-muted-foreground mb-xs">С (чч:мм)</div>
                    <Input placeholder="09:00" value={availStart} onChange={(e) => setAvailStart(e.target.value)} />
                  </div>

                  <div>
                    <div className="text-xs text-muted-foreground mb-xs">По (чч:мм)</div>
                    <Input placeholder="17:00" value={availEnd} onChange={(e) => setAvailEnd(e.target.value)} />
                  </div>

                  <div className="flex items-end">
                    <Button
                      variant="secondary"
                      onClick={handleCheckAvailability}
                      disabled={availStatus === 'checking' || services.length === 0}
                    >
                      {availStatus === 'checking' ? 'Проверяем...' : 'Проверить'}
                    </Button>
                  </div>

                  {availStatus === 'checking' && (
                    <div className="col-span-full flex items-center gap-sm text-sm text-muted-foreground">
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
                    <div className="col-span-full text-sm text-status-error">Ошибка: {availError}</div>
                  )}
                </div>

                {slots.length > 0 && (
                  <div className="mx-lg mb-lg rounded-md border overflow-hidden">
                    <div className="px-lg py-md text-xs text-muted-foreground bg-surface-2">Найденные слоты</div>
                    <div className="max-h-56 overflow-auto divide-y divide-border">
                      {slots.map((s, idx) => (
                        <div
                          key={`${s.mechanicId}-${idx}`}
                          className="flex items-center justify-between gap-md px-lg py-md bg-card"
                        >
                          <div className="text-sm min-w-0">
                            <div className="font-medium truncate">
                              {fmtDateTime(s.startTime)} — {fmtDateTime(s.endTime)}
                            </div>
                            <div className="text-xs text-muted-foreground truncate mt-xs">Механик: {s.mechanicId}</div>
                          </div>

                          <Button size="sm" variant="secondary" onClick={() => applySlot(s)}>
                            Выбрать
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </details>

              {/* Smart schedule */}
              <details className="mt-md rounded-md border">
                <summary className="cursor-pointer select-none px-lg py-md text-sm font-medium">
                  Умное планирование (рекомендации)
                </summary>
                <div className="p-lg">
                  <Button
                    variant="secondary"
                    onClick={() => setOpenSmart(true)}
                    disabled={!customer?.id || !vehicle?.id || services.length === 0}
                  >
                    Подобрать время (Smart-Schedule)
                  </Button>
                  <div className="text-xs text-muted-foreground mt-sm">
                    Требуются: клиент, авто и минимум 1 услуга.
                  </div>
                </div>
              </details>
            </div>
          </details>
        </div>

        {/* Footer */}
        <DialogFooter className="gap-sm px-xl py-lg border-t bg-card">
          <div className="hidden sm:flex items-center text-xs text-muted-foreground mr-auto">
            <span className="mr-sm">Горячие клавиши:</span>
            <Kbd>Esc</Kbd>
            <span className="mx-xs">—</span>
            <span className="mr-md">Закрыть</span>
            <Kbd>Ctrl</Kbd>
            <span className="mx-xs">+</span>
            <Kbd>Enter</Kbd>
            <span className="mx-xs">—</span>
            <span>Создать</span>
          </div>

          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={submitting}>
            Отмена
          </Button>

          <Button variant="primary" onClick={handleCreate} disabled={submitting || !canSubmit}>
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
          const start = new Date(slot.startTime);
          const end = new Date(slot.endTime);
          if (!Number.isNaN(start.getTime())) {
            setStartLocal(toLocalDateTimeValueFromDate(start));
          }
          if (slot.estimatedDuration && slot.estimatedDuration > 0) {
            setEstimatedDuration(String(slot.estimatedDuration));
          } else if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
            const dur = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60_000));
            setEstimatedDuration(String(dur));
          }

          toast.success('Слот выбран из рекомендаций');
          setOpenSmart(false);
        }}
      />
    </Dialog>
  );
}
