// path: apps/frontend/app/dashboard/appointments/page.tsx
'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  CalendarDays,
  Plus,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle,
  Search,
  Filter,
  AlertTriangle,
} from 'lucide-react';

import { AppLayout } from '@/components/app/AppLayout';
import { NavigationHeader } from '@/components/platform/NavigationHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

import { PageFiltersCard, PageFiltersRow } from '@/components/app/PageFiltersCard';
import { PageContentCard } from '@/components/app/PageContentCard';
import { StatsCard, StatsGrid } from '@/components/app/StatsCard';

import { useAuth } from '@/lib/hooks/use-auth';
import { appointmentsAPI } from '@/lib/api/appointments';
import { workSchedulesAPI } from '@/lib/api/work-schedules';
import { cn } from '@/lib/utils';

import type { Appointment, AppointmentStatus, AppointmentsQuery } from '@/lib/types/appointments';
import type { WorkSchedule } from '@/lib/types/work-schedules';
import { APPOINTMENT_STATUS_LABELS } from '@/lib/types/appointments';

import { AppointmentCreateDialog } from '@/components/appointments/appointment-create-dialog';
import { MechanicSelect, type MechanicOption } from '@/components/appointments/selects/MechanicSelect';

type CalendarView = 'day' | 'week' | 'month';

const VIEW_LABELS: Record<CalendarView, string> = {
  day: 'День',
  week: 'Неделя',
  month: 'Месяц',
};

// Local date to YYYY-MM-DD
function toYMD(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseStartHour(hhmm?: string): number | null {
  if (!hhmm || typeof hhmm !== 'string') return null;
  const [h, m] = hhmm.split(':').map((x) => parseInt(x || '0', 10));
  if (Number.isNaN(h) || h < 0 || h > 23) return null;
  if (Number.isNaN(m) || m < 0 || m > 59) return Math.max(0, Math.min(23, h));
  return Math.max(0, Math.min(23, h));
}

function parseEndHour(hhmm?: string): number | null {
  if (!hhmm || typeof hhmm !== 'string') return null;
  const [h, m] = hhmm.split(':').map((x) => parseInt(x || '0', 10));
  if (Number.isNaN(h) || h < 0 || h > 23) return null;
  if (Number.isNaN(m) || m < 0 || m > 59) return Math.max(0, Math.min(23, h));
  return Math.max(0, Math.min(23, m === 0 ? h : h + 1));
}

function makeTimeSlots(minHour: number, maxHour: number): string[] {
  const start = Math.max(0, Math.min(23, minHour));
  const end = Math.max(start, Math.min(23, maxHour));
  const arr: string[] = [];
  for (let h = start; h <= end; h++) {
    arr.push(`${String(h).padStart(2, '0')}:00`);
  }
  return arr;
}

function getEnvDefaultRange(): { min: number; max: number } {
  const min = Number(process.env.NEXT_PUBLIC_CALENDAR_DEFAULT_MIN_HOUR ?? 8);
  const max = Number(process.env.NEXT_PUBLIC_CALENDAR_DEFAULT_MAX_HOUR ?? 18);
  const safeMin = Number.isFinite(min) ? Math.max(0, Math.min(23, min)) : 8;
  const safeMax = Number.isFinite(max) ? Math.max(safeMin, Math.min(23, max)) : Math.max(safeMin, 18);
  return { min: safeMin, max: safeMax };
}

const LS_KEY_ALL_HOURS = 'dc.appts.showAllHours';

export default function AppointmentsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [items, setItems] = useState<Appointment[]>([]);
  const [view, setView] = useState<CalendarView>('week');
  const [currentDate, setCurrentDate] = useState(new Date());

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<AppointmentStatus | ''>('');
  const [mechanic, setMechanic] = useState<MechanicOption | null>(null);

  const [openCreate, setOpenCreate] = useState(false);

  const [showAllHours, setShowAllHours] = useState(false);
  const [scheduleMap, setScheduleMap] = useState<
    Record<number, { intervals: Array<{ start: number; end: number }>; minHour: number; maxHour: number }>
  >({});

  const canCreate = useMemo(() => {
    const r = user?.role?.name || '';
    return ['company_owner', 'company_admin', 'manager', 'owner', 'admin'].includes(r);
  }, [user?.role?.name]);

  const { rangeStartStr, rangeEndStr } = useMemo(() => {
    let start = new Date(currentDate);
    let end = new Date(currentDate);

    switch (view) {
      case 'day':
        break;
      case 'week': {
        const s = new Date(currentDate);
        const dayOfWeek = s.getDay();
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        s.setDate(s.getDate() + diff);
        const e = new Date(s);
        e.setDate(s.getDate() + 6);
        start = s;
        end = e;
        break;
      }
      case 'month': {
        const s = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const e = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        start = s;
        end = e;
        break;
      }
    }

    return {
      rangeStartStr: toYMD(start),
      rangeEndStr: toYMD(end),
    };
  }, [currentDate, view]);

  const filteredAppointments = useMemo(() => {
    return items.filter((apt) => {
      if (
        search &&
        !apt.customerName?.toLowerCase().includes(search.toLowerCase()) &&
        !apt.vehicleInfo?.toLowerCase().includes(search.toLowerCase()) &&
        !apt.mechanicName?.toLowerCase().includes(search.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [items, search]);

  const hasAnySchedule = useMemo(
    () => Object.values(scheduleMap).some((v) => v && v.minHour >= 0 && v.maxHour >= 0),
    [scheduleMap]
  );

  const stats = useMemo(() => {
    const total = filteredAppointments.length;
    const inProgress = filteredAppointments.filter((apt) => apt.status === 'IN_PROGRESS').length;
    const urgent = filteredAppointments.filter((apt) => apt.priority === 'URGENT').length;
    const completed = filteredAppointments.filter((apt) => apt.status === 'COMPLETED').length;
    return { total, inProgress, urgent, completed };
  }, [filteredAppointments]);

  const getDayHourRange = useCallback(
    (date: Date): { min: number; max: number } => {
      const dow = date.getDay();
      const conf = scheduleMap[dow];

      if (conf && conf.minHour >= 0 && conf.maxHour >= 0) {
        return { min: conf.minHour, max: conf.maxHour };
      }

      const dateStr = toYMD(date);
      const hours: number[] = [];
      filteredAppointments.forEach((apt) => {
        const aptDate = toYMD(new Date(apt.startTime));
        if (aptDate === dateStr) {
          hours.push(new Date(apt.startTime).getHours());
          hours.push(new Date(apt.endTime).getHours());
        }
      });

      if (hours.length > 0) {
        const min = Math.max(0, Math.min(...hours));
        const max = Math.min(23, Math.max(...hours));
        if (max >= min) return { min, max };
      }

      return getEnvDefaultRange();
    },
    [scheduleMap, filteredAppointments]
  );

  const loadAppointments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query: AppointmentsQuery = {
        search: search.trim() || undefined,
        status: (status || undefined) as AppointmentStatus | undefined,
        mechanicId: mechanic?.id || undefined,
        dateFrom: rangeStartStr,
        dateTo: rangeEndStr,
        sortField: 'startTime',
        sortOrder: 'asc',
        limit: 1000,
      };
      const res = await appointmentsAPI.list(query);
      setItems(res.items || []);
    } catch (e) {
      console.error('Failed to load appointments:', e);
      setError('Ошибка загрузки записей');
    } finally {
      setLoading(false);
    }
  }, [search, status, mechanic?.id, rangeStartStr, rangeEndStr]);

  const updateAllHours = useCallback(
    (val: boolean) => {
      setShowAllHours(val);
      try {
        localStorage.setItem(LS_KEY_ALL_HOURS, val ? '1' : '0');
      } catch {}

      try {
        const sp = new URLSearchParams(Array.from(searchParams?.entries?.() || []));
        if (val) sp.set('all', '1');
        else sp.delete('all');
        const qs = sp.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      } catch {}
    },
    [pathname, router, searchParams]
  );

  const isWorkingHour = useCallback(
    (date: Date, hour: number): boolean => {
      const conf = scheduleMap[date.getDay()];
      if (!conf || conf.intervals.length === 0) {
        return true;
      }
      return conf.intervals.some((itv) => hour >= itv.start && hour < itv.end);
    },
    [scheduleMap]
  );

  const timeSlots = useMemo(() => {
    if (showAllHours) return makeTimeSlots(0, 23);

    switch (view) {
      case 'day': {
        const { min, max } = getDayHourRange(currentDate);
        return makeTimeSlots(min, max);
      }
      case 'week': {
        const startOfWeek = new Date(currentDate);
        const dow = startOfWeek.getDay();
        const diff = dow === 0 ? -6 : 1 - dow;
        startOfWeek.setDate(startOfWeek.getDate() + diff);

        let min = 23;
        let max = 0;
        for (let i = 0; i < 7; i++) {
          const d = new Date(startOfWeek);
          d.setDate(startOfWeek.getDate() + i);
          const r = getDayHourRange(d);
          min = Math.min(min, r.min);
          max = Math.max(max, r.max);
        }

        if (max < min) {
          const def = getEnvDefaultRange();
          return makeTimeSlots(def.min, def.max);
        }

        return makeTimeSlots(min, max);
      }
      case 'month':
        return makeTimeSlots(8, 18);
    }
  }, [showAllHours, view, currentDate, getDayHourRange]);

  useEffect(() => {
    const urlVal = searchParams?.get('all');
    if (urlVal !== null) {
      const val = urlVal === '1';
      setShowAllHours(val);
      localStorage.setItem(LS_KEY_ALL_HOURS, val ? '1' : '0');
      return;
    }
    const ls = localStorage.getItem(LS_KEY_ALL_HOURS);
    if (ls === '1' || ls === '0') {
      setShowAllHours(ls === '1');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;

    const fetchSchedules = async () => {
      try {
        const res = await workSchedulesAPI.getSchedules({ isActive: true, page: 1, limit: 200 });
        const list = (res.items || []) as WorkSchedule[];

        const tmp: Record<
          number,
          { intervals: Array<{ start: number; end: number }>; minHour: number; maxHour: number }
        > = {};
        for (let d = 0; d <= 6; d++) {
          tmp[d] = { intervals: [], minHour: 23, maxHour: 0 };
        }

        list.forEach((s) => {
          if (s.isDayOff) return;
          const startH = parseStartHour(s.startTime);
          const endH = parseEndHour(s.endTime);
          if (startH === null || endH === null) return;
          if (endH <= startH) return;

          const day = s.dayOfWeek;
          tmp[day].intervals.push({ start: startH, end: endH });
          tmp[day].minHour = Math.min(tmp[day].minHour, startH);
          tmp[day].maxHour = Math.max(tmp[day].maxHour, endH);
        });

        for (let d = 0; d <= 6; d++) {
          if (tmp[d].intervals.length === 0) {
            tmp[d].minHour = -1;
            tmp[d].maxHour = -1;
          }
        }

        if (!cancelled) setScheduleMap(tmp);
      } catch (e) {
        if (!cancelled) {
          const tmp: Record<
            number,
            { intervals: Array<{ start: number; end: number }>; minHour: number; maxHour: number }
          > = {};
          for (let d = 0; d <= 6; d++) {
            tmp[d] = { intervals: [], minHour: -1, maxHour: -1 };
          }
          setScheduleMap(tmp);
        }
      }
    };

    void fetchSchedules();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      loadAppointments();
    }
  }, [isAuthenticated, loadAppointments]);

  const navigateDate = (direction: 'prev' | 'next' | 'today') => {
    const newDate = new Date(currentDate);
    if (direction === 'today') {
      setCurrentDate(new Date());
      return;
    }
    switch (view) {
      case 'day':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
        break;
    }
    setCurrentDate(newDate);
  };

  const getSlotAppointments = (date: Date, timeSlot?: string) => {
    const dateStr = toYMD(date);
    return filteredAppointments.filter((apt) => {
      const aptStart = new Date(apt.startTime);
      const aptEnd = new Date(apt.endTime);
      const aptDate = toYMD(aptStart);
      if (aptDate !== dateStr) return false;

      if (timeSlot && view !== 'month') {
        const slotHour = parseInt(timeSlot.split(':')[0], 10);
        const slotStart = new Date(date);
        slotStart.setHours(slotHour, 0, 0, 0);
        const slotEnd = new Date(date);
        slotEnd.setHours(Math.min(23, slotHour + 1), 0, 0, 0);
        return aptStart < slotEnd && aptEnd > slotStart;
      }
      return true;
    });
  };

  const getSlotStatus = (date: Date, timeSlot?: string) => {
    const appointments = getSlotAppointments(date, timeSlot);
    if (appointments.length === 0) return 'free';
    if (appointments.some((apt) => apt.status === 'IN_PROGRESS')) return 'busy';
    if (appointments.some((apt) => apt.priority === 'URGENT')) return 'urgent';
    return 'booked';
  };

  // Визуальная логика слотов: только системные токены (DS v1.1), без “кислотных” цветов/пульсаций.
  const slotStatusClasses: Record<'free' | 'booked' | 'busy' | 'urgent', string> = {
    free: cn('bg-card border-border', 'hover:bg-surface-2'),
    booked: cn('bg-status-progress/10 border-status-progress/20', 'hover:bg-status-progress/15'),
    busy: cn('bg-status-pending/10 border-status-pending/20', 'hover:bg-status-pending/15'),
    urgent: cn('bg-status-error/10 border-status-error/20', 'hover:bg-status-error/15'),
  };

  const nonWorkingClass = 'opacity-60 border-dashed border-border/50';

  const handleSlotClick = () => {
    if (canCreate) {
      setOpenCreate(true);
    }
  };

  const formatDateHeader = () => {
    const formatter = new Intl.DateTimeFormat('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: view === 'day' ? 'numeric' : undefined,
    });
    return formatter.format(currentDate);
  };

  const now = new Date();
  const isTodayCurrent = now.toDateString() === currentDate.toDateString();
  const currentHour = now.getHours();
  const nowSlotClass = 'ring-2 ring-primary/50';

  if (authLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex items-center gap-sm">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-muted-foreground">Загрузка календаря...</span>
          </div>
        </div>
      </AppLayout>
    );
  }

  const headerActions = (
    <div className="flex items-center gap-sm">
      <Button variant="secondary" size="sm" onClick={() => loadAppointments()}>
        <RefreshCw className="w-4 h-4 mr-xs" />
        Обновить
      </Button>

      {canCreate && (
        <Button variant="primary" size="sm" onClick={() => setOpenCreate(true)}>
          <Plus className="w-4 h-4 mr-xs" />
          Новая запись
        </Button>
      )}
    </div>
  );

  return (
    <AppLayout>
      <div className="container mx-auto px-lg py-xl flex flex-col gap-lg">
        <NavigationHeader
          title="Записи"
          subtitle="Календарь записей и управление загрузкой мастеров"
          icon={<CalendarDays className="w-5 h-5" />}
          actions={headerActions}
        />

        <StatsGrid cols={4}>
          <StatsCard title="Всего записей" value={stats.total} icon={CalendarDays} />
          <StatsCard title="В работе" value={stats.inProgress} icon={Clock} />
          <StatsCard title="Срочные" value={stats.urgent} icon={AlertTriangle} />
          <StatsCard title="Завершено" value={stats.completed} icon={CheckCircle} />
        </StatsGrid>

        <PageFiltersCard>
          <PageFiltersRow>
            {/* Left side: date navigation + view toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-md">
              <div className="flex items-center gap-sm">
                <Button variant="secondary" size="icon" onClick={() => navigateDate('prev')} title="Назад">
                  <ChevronLeft className="w-4 h-4" />
                </Button>

                <Button variant="secondary" size="sm" onClick={() => navigateDate('today')}>
                  Сегодня
                </Button>

                <Button variant="secondary" size="icon" onClick={() => navigateDate('next')} title="Вперёд">
                  <ChevronRight className="w-4 h-4" />
                </Button>

                <div className="text-sm font-semibold text-foreground sm:ml-sm">{formatDateHeader()}</div>
              </div>

              {/* View toggle (DS-паттерн как в Orders: segmented) */}
              <div className="inline-flex items-center rounded-md border bg-card p-xs">
                {(['day', 'week', 'month'] as CalendarView[]).map((v) => (
                  <Button
                    key={v}
                    variant={view === v ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-8"
                    onClick={() => setView(v)}
                  >
                    {VIEW_LABELS[v]}
                  </Button>
                ))}
              </div>
            </div>

            {/* Right side: filters */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-md w-full lg:w-auto lg:ml-auto">
              {/* Search */}
              <div className="relative w-full sm:w-[280px]">
                <label htmlFor="appointments-search" className="sr-only">
                  Поиск записей
                </label>
                <Input
                  id="appointments-search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Поиск по клиенту/авто/мастеру..."
                  className="pl-[36px]"
                />
                <Search className="w-4 h-4 absolute left-md top-1/2 -translate-y-1/2 text-muted-foreground" />
              </div>

              {/* Status */}
              <div className="relative w-full sm:w-[220px]">
                <label htmlFor="appointments-status" className="sr-only">
                  Статус
                </label>
                <select
                  id="appointments-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as AppointmentStatus | '')}
                  className={cn(
                    'h-10 w-full rounded-md border border-input bg-background text-sm px-md pr-[36px]',
                    'text-foreground hover:border-border/80'
                  )}
                >
                  <option value="">Все статусы</option>
                  {(Object.keys(APPOINTMENT_STATUS_LABELS) as AppointmentStatus[]).map((s) => (
                    <option key={s} value={s}>
                      {APPOINTMENT_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
                <Filter className="w-4 h-4 absolute right-md top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>

              {/* Mechanic */}
              <div className="w-full sm:w-[260px]">
                <MechanicSelect value={mechanic} onChange={setMechanic} placeholder="Фильтр: мастер" />
              </div>

              {/* 24h toggle */}
              <div className="flex items-center justify-between sm:justify-start gap-sm rounded-md border bg-card px-md h-10 w-full sm:w-auto">
                <span className="text-sm text-muted-foreground whitespace-nowrap">Все 24 часа</span>
                <Switch checked={showAllHours} onCheckedChange={updateAllHours} />
              </div>
            </div>
          </PageFiltersRow>
        </PageFiltersCard>

        {!hasAnySchedule && !showAllHours && (
          <Card className="p-md">
            <div className="flex items-start gap-sm text-sm">
              <div className="mt-[2px] p-xs rounded-md border bg-status-pending/10 text-status-pending border-status-pending/20">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="font-medium text-foreground">Расписание не задано</div>
                <div className="text-muted-foreground mt-xs">
                  Показаны дефолтные бизнес‑часы ({getEnvDefaultRange().min}:00–{getEnvDefaultRange().max}:00).
                  Создание записи не блокируется — это рекомендация.
                </div>
              </div>
            </div>
          </Card>
        )}

        <PageContentCard loading={loading} error={error} onRetry={loadAppointments} className="overflow-hidden">
          <div className="p-xl">
            {view === 'month' && (
              <MonthView
                currentDate={currentDate}
                appointments={filteredAppointments}
                onSlotClick={handleSlotClick}
                getSlotStatus={getSlotStatus}
                statusColors={slotStatusClasses}
              />
            )}

            {view === 'week' && (
              <WeekView
                currentDate={currentDate}
                appointments={filteredAppointments}
                onSlotClick={handleSlotClick}
                getSlotStatus={getSlotStatus}
                statusColors={slotStatusClasses}
                timeSlots={timeSlots}
                isWorkingHour={isWorkingHour}
                nonWorkingClass={nonWorkingClass}
                isTodayCurrent={isTodayCurrent}
                currentHour={currentHour}
                nowSlotClass={nowSlotClass}
              />
            )}

            {view === 'day' && (
              <DayView
                currentDate={currentDate}
                appointments={filteredAppointments}
                onSlotClick={handleSlotClick}
                getSlotStatus={getSlotStatus}
                statusColors={slotStatusClasses}
                timeSlots={timeSlots}
                isWorkingHour={isWorkingHour}
                nonWorkingClass={nonWorkingClass}
                isTodayCurrent={isTodayCurrent}
                currentHour={currentHour}
                nowSlotClass={nowSlotClass}
              />
            )}
          </div>
        </PageContentCard>
      </div>

      <AppointmentCreateDialog
        open={openCreate}
        onOpenChange={setOpenCreate}
        onCreated={() => {
          loadAppointments();
        }}
      />
    </AppLayout>
  );
}

type MonthDay = {
  date: Date;
  appointments: Appointment[];
  isCurrentMonth: boolean;
  isToday: boolean;
};

// Month View Component
function MonthView({
  currentDate,
  appointments,
  onSlotClick,
  getSlotStatus,
  statusColors,
}: {
  currentDate: Date;
  appointments: Appointment[];
  onSlotClick: () => void;
  getSlotStatus: (date: Date) => keyof typeof statusColors;
  statusColors: Record<string, string>;
}) {
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

  const startDate = new Date(firstDay);
  const dayOfWeek = startDate.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  startDate.setDate(startDate.getDate() + diff);

  const weeks: MonthDay[][] = [];
  const currentWeekDate = new Date(startDate);

  for (let week = 0; week < 6; week++) {
    const days: MonthDay[] = [];
    for (let day = 0; day < 7; day++) {
      const date = new Date(currentWeekDate);
      const dayAppointments = appointments.filter((apt) => {
        const aptDate = new Date(apt.startTime).toDateString();
        return aptDate === date.toDateString();
      });

      days.push({
        date: new Date(date),
        appointments: dayAppointments,
        isCurrentMonth: date.getMonth() === currentDate.getMonth(),
        isToday: date.toDateString() === new Date().toDateString(),
      });

      currentWeekDate.setDate(currentWeekDate.getDate() + 1);
    }
    weeks.push(days);
    if (currentWeekDate > lastDay && days.length === 6) break;
  }

  const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  return (
    <div className="space-y-md">
      <div className="grid grid-cols-7 gap-sm">
        {weekdays.map((day) => (
          <div key={day} className="text-center text-xs font-medium text-muted-foreground py-sm">
            {day}
          </div>
        ))}
      </div>

      <div className="space-y-sm">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-sm">
            {week.map(({ date, appointments: dayAppointments, isCurrentMonth, isToday }) => {
              const status = getSlotStatus(date);
              return (
                <div
                  key={date.toISOString()}
                  className={cn(
                    'min-h-[88px] p-sm rounded-md border cursor-pointer transition-colors',
                    statusColors[status],
                    !isCurrentMonth && 'opacity-50',
                    isToday && 'ring-2 ring-primary/50'
                  )}
                  onClick={onSlotClick}
                >
                  <div className={cn('text-sm font-medium mb-xs', isToday && 'text-primary')}>{date.getDate()}</div>

                  <div className="space-y-xs">
                    {dayAppointments.slice(0, 2).map((apt: Appointment) => (
                      <Link
                        key={apt.id}
                        href={`/dashboard/appointments/${apt.id}`}
                        className={cn(
                          'block text-xs rounded-md border border-border/50 bg-surface-2 px-sm py-xs',
                          'hover:bg-surface-1 transition-colors'
                        )}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="font-medium truncate text-foreground">{apt.customerName}</div>
                        <div className="text-muted-foreground truncate mt-xs">
                          {new Date(apt.startTime).toLocaleTimeString('ru-RU', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </Link>
                    ))}

                    {dayAppointments.length > 2 && (
                      <div className="text-xs text-muted-foreground text-center">+{dayAppointments.length - 2} еще</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// Week View Component
function WeekView({
  currentDate,
  appointments,
  onSlotClick,
  getSlotStatus,
  statusColors,
  timeSlots,
  isWorkingHour,
  nonWorkingClass,
  isTodayCurrent,
  currentHour,
  nowSlotClass,
}: {
  currentDate: Date;
  appointments: Appointment[];
  onSlotClick: () => void;
  getSlotStatus: (date: Date, time: string) => keyof typeof statusColors;
  statusColors: Record<string, string>;
  timeSlots: string[];
  isWorkingHour: (date: Date, hour: number) => boolean;
  nonWorkingClass: string;
  isTodayCurrent: boolean;
  currentHour: number;
  nowSlotClass: string;
}) {
  const startOfWeek = new Date(currentDate);
  const dayOfWeek = startOfWeek.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  startOfWeek.setDate(startOfWeek.getDate() + diff);

  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(startOfWeek);
    date.setDate(date.getDate() + i);
    return date;
  });

  const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const todayStr = new Date().toDateString();

  return (
    <div className="space-y-md">
      <div className="grid grid-cols-8 gap-sm">
        <div className="text-xs font-medium text-muted-foreground py-sm">Время</div>
        {weekDates.map((date, index) => (
          <div key={date.toISOString()} className="text-center">
            <div className="text-xs font-medium text-muted-foreground">{weekdays[index]}</div>
            <div className={cn('text-base font-semibold', date.toDateString() === todayStr && 'text-primary')}>
              {date.getDate()}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-xs max-h-[600px] overflow-y-auto pr-xs">
        {timeSlots.map((timeSlot) => {
          const slotHour = parseInt(timeSlot.split(':')[0], 10);

          return (
            <div key={timeSlot} className="grid grid-cols-8 gap-sm">
              <div
                className={cn(
                  'text-xs text-muted-foreground py-sm font-mono rounded-md px-sm border',
                  isTodayCurrent && slotHour === currentHour && nowSlotClass
                )}
              >
                {timeSlot}
              </div>

              {weekDates.map((date) => {
                const status = getSlotStatus(date, timeSlot);
                const working = isWorkingHour(date, slotHour);
                const isNow = date.toDateString() === todayStr && slotHour === currentHour;

                const slotAppointments = appointments.filter((apt) => {
                  const aptStart = new Date(apt.startTime);
                  const aptEnd = new Date(apt.endTime);
                  const slotStart = new Date(date);
                  slotStart.setHours(slotHour, 0, 0, 0);
                  const slotEnd = new Date(date);
                  slotEnd.setHours(Math.min(23, slotHour + 1), 0, 0, 0);
                  return aptStart < slotEnd && aptEnd > slotStart;
                });

                return (
                  <div
                    key={`${date.toISOString()}-${timeSlot}`}
                    className={cn(
                      'min-h-10 p-xs rounded-md border cursor-pointer transition-colors',
                      statusColors[status],
                      !working && nonWorkingClass,
                      isNow && nowSlotClass
                    )}
                    onClick={onSlotClick}
                    title={
                      !working
                        ? 'Вне рабочего времени (рекомендация). Создание записи не блокируется.'
                        : undefined
                    }
                  >
                    {slotAppointments.map((apt) => (
                      <Link
                        key={apt.id}
                        href={`/dashboard/appointments/${apt.id}`}
                        className={cn(
                          'block text-xs rounded-md border border-border/50 bg-surface-2 px-sm py-xs',
                          'hover:bg-surface-1 transition-colors'
                        )}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="font-medium truncate text-foreground">{apt.customerName}</div>
                      </Link>
                    ))}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Day View Component
function DayView({
  currentDate,
  appointments,
  onSlotClick,
  getSlotStatus,
  statusColors,
  timeSlots,
  isWorkingHour,
  nonWorkingClass,
  isTodayCurrent,
  currentHour,
  nowSlotClass,
}: {
  currentDate: Date;
  appointments: Appointment[];
  onSlotClick: () => void;
  getSlotStatus: (date: Date, time: string) => keyof typeof statusColors;
  statusColors: Record<string, string>;
  timeSlots: string[];
  isWorkingHour: (date: Date, hour: number) => boolean;
  nonWorkingClass: string;
  isTodayCurrent: boolean;
  currentHour: number;
  nowSlotClass: string;
}) {
  const dayAppointments = useMemo(() => {
    const dateStr = currentDate.toDateString();
    return appointments.filter((apt) => new Date(apt.startTime).toDateString() === dateStr);
  }, [appointments, currentDate]);

  return (
    <div className="space-y-md">
      <div className="text-center">
        <div className="text-xl font-semibold">
          {currentDate.toLocaleDateString('ru-RU', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </div>
      </div>

      <div className="space-y-xs max-h-[600px] overflow-y-auto pr-xs">
        {timeSlots.map((timeSlot) => {
          const slotHour = parseInt(timeSlot.split(':')[0], 10);
          const status = getSlotStatus(currentDate, timeSlot);
          const working = isWorkingHour(currentDate, slotHour);
          const isNow = isTodayCurrent && slotHour === currentHour;

          const slotAppointments = dayAppointments.filter((apt) => {
            const aptStart = new Date(apt.startTime);
            const aptEnd = new Date(apt.endTime);
            const slotStart = new Date(currentDate);
            slotStart.setHours(slotHour, 0, 0, 0);
            const slotEnd = new Date(currentDate);
            slotEnd.setHours(Math.min(23, slotHour + 1), 0, 0, 0);
            return aptStart < slotEnd && aptEnd > slotStart;
          });

          return (
            <div
              key={timeSlot}
              className={cn(
                'flex items-start gap-lg min-h-[60px] p-lg rounded-md border cursor-pointer transition-colors',
                statusColors[status],
                !working && nonWorkingClass,
                isNow && nowSlotClass
              )}
              onClick={onSlotClick}
              title={!working ? 'Вне рабочего времени (рекомендация). Создание записи не блокируется.' : undefined}
            >
              <div className="text-sm font-mono font-medium w-20 pt-xs">{timeSlot}</div>

              <div className="flex-1 space-y-sm min-w-0">
                {slotAppointments.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Свободно</div>
                ) : (
                  slotAppointments.map((apt) => (
                    <Link
                      key={apt.id}
                      href={`/dashboard/appointments/${apt.id}`}
                      className={cn(
                        'block p-md rounded-md border border-border/50 bg-surface-2',
                        'hover:bg-surface-1 transition-colors'
                      )}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-start justify-between gap-md">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">{apt.customerName}</div>
                          {apt.vehicleInfo && (
                            <div className="text-xs text-muted-foreground truncate mt-xs">{apt.vehicleInfo}</div>
                          )}
                          {apt.mechanicName && (
                            <div className="text-xs text-muted-foreground truncate mt-xs">{apt.mechanicName}</div>
                          )}
                        </div>

                        <div className="shrink-0 text-right">
                          <Badge variant="outline" className="text-xs">
                            {APPOINTMENT_STATUS_LABELS[apt.status]}
                          </Badge>

                          {apt.priority === 'URGENT' && (
                            <Badge variant="error" className="text-xs ml-xs">
                              Срочно
                            </Badge>
                          )}
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
