// path: apps/frontend/app/dashboard/appointments/page.tsx
'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { AppLayout } from '@/components/app/AppLayout';
import { PageFeatureBadge } from '@/components/app/PageFeatureBadge';
import { PageFiltersCard, PageFiltersRow } from '@/components/app/PageFiltersCard';
import { StatsCard, StatsGrid } from '@/components/app/StatsCard';
import { useAuth } from '@/lib/hooks/use-auth';
import { appointmentsAPI } from '@/lib/api/appointments';
import { workSchedulesAPI } from '@/lib/api/work-schedules';
import { cn } from '@/lib/utils';
import type {
  Appointment,
  AppointmentStatus,
  AppointmentsQuery,
} from '@/lib/types/appointments';
import type { WorkSchedule } from '@/lib/types/work-schedules';
import { APPOINTMENT_STATUS_LABELS } from '@/lib/types/appointments';
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
  Sparkles,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';
import { AppointmentCreateDialog } from '@/components/appointments/appointment-create-dialog';
import { MechanicSelect, type MechanicOption } from '@/components/appointments/selects/MechanicSelect';

type CalendarView = 'day' | 'week' | 'month';

const VIEW_LABELS: Record<CalendarView, string> = {
  day: 'День',
  week: 'Неделя', 
  month: 'Месяц'
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

  // ✅ Все useState
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Appointment[]>([]);
  const [view, setView] = useState<CalendarView>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<AppointmentStatus | ''>('');
  const [mechanic, setMechanic] = useState<MechanicOption | null>(null);
  const [openCreate, setOpenCreate] = useState(false);
  const [showAllHours, setShowAllHours] = useState(false);
  const [scheduleMap, setScheduleMap] = useState<Record<number, { intervals: Array<{ start: number; end: number }>; minHour: number; maxHour: number }>>({});

  // ✅ Все useMemo (НО БЕЗ loadAppointments - он будет useCallback ниже)
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
    return items.filter(apt => {
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
    const inProgress = filteredAppointments.filter(apt => apt.status === 'IN_PROGRESS').length;
    const urgent = filteredAppointments.filter(apt => apt.priority === 'URGENT').length;
    const completed = filteredAppointments.filter(apt => apt.status === 'COMPLETED').length;
    return { total, inProgress, urgent, completed };
  }, [filteredAppointments]);

  // ✅ useCallback функции (ДО headerActions!)
  const getDayHourRange = useCallback((date: Date): { min: number; max: number } => {
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
  }, [scheduleMap, filteredAppointments]);

  const loadAppointments = useCallback(async () => {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  }, [search, status, mechanic?.id, rangeStartStr, rangeEndStr]);

  const updateAllHours = useCallback((val: boolean) => {
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
  }, [pathname, router, searchParams]);

  const isWorkingHour = useCallback((date: Date, hour: number): boolean => {
    const conf = scheduleMap[date.getDay()];
    if (!conf || conf.intervals.length === 0) {
      return true;
    }
    return conf.intervals.some((itv) => hour >= itv.start && hour < itv.end);
  }, [scheduleMap]);

  // ✅ useMemo которые зависят от useCallback
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

  // ✅ headerActions ПОСЛЕ loadAppointments
  const headerActions = useMemo(() => (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        className="rounded-2xl btn-outline-fixed"
        onClick={() => loadAppointments()}
      >
        <RefreshCw className="w-4 h-4 mr-2" />
        Обновить
      </Button>
      {canCreate && (
        <Button 
          className="rounded-2xl bg-gradient-primary hover:opacity-90 transition-all duration-300 hover:scale-[1.02]"
          onClick={() => setOpenCreate(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Новая запись
        </Button>
      )}
    </div>
  ), [canCreate, loadAppointments]);

  // ✅ Все useEffect
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

        const tmp: Record<number, { intervals: Array<{ start: number; end: number }>; minHour: number; maxHour: number }> = {};
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
          const tmp: Record<number, { intervals: Array<{ start: number; end: number }>; minHour: number; maxHour: number }> = {};
          for (let d = 0; d <= 6; d++) {
            tmp[d] = { intervals: [], minHour: -1, maxHour: -1 };
          }
          setScheduleMap(tmp);
        }
      }
    };

    void fetchSchedules();
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      loadAppointments();
    }
  }, [isAuthenticated, loadAppointments]);

  // ✅ Обычные функции (не хуки)
  const navigateDate = (direction: 'prev' | 'next' | 'today') => {
    const newDate = new Date(currentDate);
    if (direction === 'today') {
      setCurrentDate(new Date());
      return;
    }
    switch (view) {
      case 'day': newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1)); break;
      case 'week': newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7)); break;
      case 'month': newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1)); break;
    }
    setCurrentDate(newDate);
  };

  const getSlotAppointments = (date: Date, timeSlot?: string) => {
    const dateStr = toYMD(date);
    return filteredAppointments.filter(apt => {
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
    if (appointments.some(apt => apt.status === 'IN_PROGRESS')) return 'busy';
    if (appointments.some(apt => apt.priority === 'URGENT')) return 'urgent';
    return 'booked';
  };

  const statusColors = {
    free: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/30 hover:bg-emerald-100 dark:hover:bg-emerald-950/30',
    booked: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/30 hover:bg-blue-100 dark:hover:bg-blue-950/30',
    busy: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/30 hover:bg-amber-100 dark:hover:bg-amber-950/30',
    urgent: 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/30 hover:bg-red-100 dark:hover:bg-red-950/30 animate-pulse',
  };

  const nonWorkingClass = 'opacity-60 grayscale-[15%] hover:grayscale-0 border-dashed border-muted/50';

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

  // ✅ Условные return
  if (authLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-muted-foreground">Загрузка календаря...</span>
          </div>
        </div>
      </AppLayout>
    );
  }

  // ✅ Финальный рендер
  return (
    <AppLayout 
      title="Календарь записей" 
      description="Интерактивная календарная сетка с цветовым кодированием времени"
      icon={CalendarDays}
      actions={headerActions}
    >
      <div className="container mx-auto px-6 py-6 space-y-6">
        
        {/* Feature Badge */}
        <PageFeatureBadge
          variant="emerald-green"
          icon={Sparkles}
          title="Календарная сетка с динамичными часами"
          description="Поддержка 24/7 и ночных смен. Нерабочие часы подсвечиваются, но не блокируются — всё рекомендательно."
          aside={
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Все 24 часа</span>
                <Switch checked={showAllHours} onCheckedChange={updateAllHours} />
              </div>
              <TrendingUp className="w-6 h-6 text-secondary" />
            </div>
          }
        />

        {!hasAnySchedule && !showAllHours && (
          <Card className="p-3 glass border-amber-400/30 bg-amber-500/5 text-amber-600 dark:text-amber-400 rounded-2xl">
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangle className="w-4 h-4" />
              Расписание не задано — показаны дефолтные бизнес‑часы ({getEnvDefaultRange().min}:00–{getEnvDefaultRange().max}:00)
            </div>
          </Card>
        )}

        {/* Stats */}
        <StatsGrid cols={4}>
          <StatsCard
            title="Всего записей"
            value={stats.total}
            icon={CalendarDays}
            color="blue"
          />
          <StatsCard
            title="В работе"
            value={stats.inProgress}
            icon={Clock}
            color="amber"
            highlight={stats.inProgress > 0}
          />
          <StatsCard
            title="Срочные"
            value={stats.urgent}
            icon={AlertTriangle}
            color="red"
            highlight={stats.urgent > 0}
          />
          <StatsCard
            title="Завершено"
            value={stats.completed}
            icon={CheckCircle}
            color="emerald"
          />
        </StatsGrid>

        {/* Filters */}
        <PageFiltersCard>
          <PageFiltersRow>
            {/* Navigation */}
            <div className="flex items-center gap-2">
              <Button variant="outline" className="rounded-xl btn-outline-fixed" onClick={() => navigateDate('prev')}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="outline" className="rounded-xl btn-outline-fixed min-w-[120px]" onClick={() => navigateDate('today')}>
                Сегодня
              </Button>
              <Button variant="outline" className="rounded-xl btn-outline-fixed" onClick={() => navigateDate('next')}>
                <ChevronRight className="w-4 h-4" />
              </Button>
              <div className="text-lg font-semibold ml-4">{formatDateHeader()}</div>
            </div>

            {/* View Toggles */}
            <div className="flex items-center gap-1 bg-surface-1/50 rounded-xl p-1">
              {(['day', 'week', 'month'] as CalendarView[]).map((v) => (
                <Button
                  key={v}
                  variant={view === v ? 'default' : 'ghost'}
                  size="sm"
                  className={cn(
                    "rounded-lg text-xs transition-all duration-300",
                    view === v && "bg-gradient-primary text-white shadow-glass"
                  )}
                  onClick={() => setView(v)}
                >
                  {VIEW_LABELS[v]}
                </Button>
              ))}
            </div>

            {/* Search & Filters */}
            <div className="flex items-center gap-2 ml-auto">
              <div className="relative">
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Поиск записей..."
                  className="w-48 h-8 rounded-xl text-sm pl-8"
                />
                <Search className="w-4 h-4 absolute left-2.5 top-2 text-muted-foreground" />
              </div>
              <div className="relative">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as AppointmentStatus | '')}
                  className="h-8 rounded-xl border border-border/50 bg-background text-sm px-3 pr-8 appearance-none"
                >
                  <option value="">Все статусы</option>
                  {(Object.keys(APPOINTMENT_STATUS_LABELS) as AppointmentStatus[]).map((s) => (
                    <option key={s} value={s}>
                      {APPOINTMENT_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
                <Filter className="w-3 h-3 absolute right-2.5 top-2.5 text-muted-foreground pointer-events-none" />
              </div>
              <div className="w-56">
                <MechanicSelect value={mechanic} onChange={setMechanic} placeholder="Фильтр: мастер" />
              </div>
            </div>
          </PageFiltersRow>
        </PageFiltersCard>

        {/* Calendar Grid */}
        <Card className="p-0 glass border-border/30 rounded-3xl surface-glow overflow-hidden">
          {loading ? (
            <div className="p-6 text-center">
              <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-2" />
              <span className="text-muted-foreground">Загрузка календаря...</span>
            </div>
          ) : (
            <div className="p-6">
              {view === 'month' && <MonthView 
                currentDate={currentDate}
                appointments={filteredAppointments}
                onSlotClick={handleSlotClick}
                getSlotStatus={getSlotStatus}
                statusColors={statusColors}
              />}
              
              {view === 'week' && <WeekView 
                currentDate={currentDate}
                appointments={filteredAppointments}
                onSlotClick={handleSlotClick}
                getSlotStatus={getSlotStatus}
                statusColors={statusColors}
                timeSlots={timeSlots}
                isWorkingHour={isWorkingHour}
                nonWorkingClass={nonWorkingClass}
                isTodayCurrent={isTodayCurrent}
                currentHour={currentHour}
                nowSlotClass={nowSlotClass}
              />}
              
              {view === 'day' && <DayView 
                currentDate={currentDate}
                appointments={filteredAppointments}
                onSlotClick={handleSlotClick}
                getSlotStatus={getSlotStatus}
                statusColors={statusColors}
                timeSlots={timeSlots}
                isWorkingHour={isWorkingHour}
                nonWorkingClass={nonWorkingClass}
                isTodayCurrent={isTodayCurrent}
                currentHour={currentHour}
                nowSlotClass={nowSlotClass}
              />}
            </div>
          )}
        </Card>
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
  statusColors 
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
      const dayAppointments = appointments.filter(apt => {
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
    <div className="space-y-2">
      <div className="grid grid-cols-7 gap-2 mb-4">
        {weekdays.map(day => (
          <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-2">
            {week.map(({ date, appointments: dayAppointments, isCurrentMonth, isToday }) => {
              const status = getSlotStatus(date);
              return (
                <div
                  key={date.toISOString()}
                  className={cn(
                    "min-h-[80px] p-2 rounded-2xl border transition-all duration-300 cursor-pointer hover:scale-[1.02] hover:shadow-glass",
                    statusColors[status],
                    !isCurrentMonth && "opacity-50",
                    isToday && "ring-2 ring-primary/50"
                  )}
                  onClick={onSlotClick}
                >
                  <div className={cn(
                    "text-sm font-medium mb-1",
                    isToday && "text-primary font-bold"
                  )}>
                    {date.getDate()}
                  </div>
                  
                  <div className="space-y-1">
                    {dayAppointments.slice(0, 2).map((apt: Appointment) => (
                      <Link
                        key={apt.id}
                        href={`/dashboard/appointments/${apt.id}`}
                        className="block text-xs p-1 rounded bg-white/60 dark:bg-black/20 hover:bg-white/80 dark:hover:bg-black/40 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="font-medium truncate">{apt.customerName}</div>
                        <div className="text-muted-foreground truncate">
                          {new Date(apt.startTime).toLocaleTimeString('ru-RU', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      </Link>
                    ))}
                    
                    {dayAppointments.length > 2 && (
                      <div className="text-xs text-muted-foreground text-center">
                        +{dayAppointments.length - 2} еще
                      </div>
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
    <div className="space-y-2">
      <div className="grid grid-cols-8 gap-2 mb-4">
        <div className="text-sm font-medium text-muted-foreground py-2">Время</div>
        {weekDates.map((date, index) => (
          <div key={date.toISOString()} className="text-center">
            <div className="text-sm font-medium text-muted-foreground">{weekdays[index]}</div>
            <div className={cn(
              "text-lg font-bold",
              date.toDateString() === todayStr && "text-primary"
            )}>
              {date.getDate()}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-1 max-h-[600px] overflow-y-auto pr-1">
        {timeSlots.map(timeSlot => {
          const slotHour = parseInt(timeSlot.split(':')[0], 10);
          return (
            <div key={timeSlot} className="grid grid-cols-8 gap-2">
              <div className={cn(
                "text-sm text-muted-foreground py-2 font-mono rounded-md px-1",
                isTodayCurrent && slotHour === currentHour && nowSlotClass
              )}>
                {timeSlot}
              </div>
              {weekDates.map(date => {
                const status = getSlotStatus(date, timeSlot);
                const working = isWorkingHour(date, slotHour);
                const isNow = date.toDateString() === todayStr && slotHour === currentHour;

                const slotAppointments = appointments.filter(apt => {
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
                      "min-h-[40px] p-1 rounded-xl border cursor-pointer transition-all duration-300 hover:scale-[1.02]",
                      statusColors[status],
                      !working && nonWorkingClass,
                      isNow && nowSlotClass
                    )}
                    onClick={onSlotClick}
                    title={!working ? 'Вне рабочего времени (рекомендация). Создание записи не блокируется.' : undefined}
                  >
                    {slotAppointments.map(apt => (
                      <Link
                        key={apt.id}
                        href={`/dashboard/appointments/${apt.id}`}
                        className="block text-xs p-1 rounded bg-white/60 dark:bg-black/20 hover:bg-white/80 dark:hover:bg-black/40 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="font-medium truncate">{apt.customerName}</div>
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
    return appointments.filter(apt => new Date(apt.startTime).toDateString() === dateStr);
  }, [appointments, currentDate]);

  return (
    <div className="space-y-2">
      <div className="text-center mb-6">
        <div className="text-2xl font-bold">
          {currentDate.toLocaleDateString('ru-RU', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </div>
      </div>

      <div className="space-y-1 max-h-[600px] overflow-y-auto pr-1">
        {timeSlots.map(timeSlot => {
          const slotHour = parseInt(timeSlot.split(':')[0], 10);
          const status = getSlotStatus(currentDate, timeSlot);
          const working = isWorkingHour(currentDate, slotHour);
          const isNow = isTodayCurrent && slotHour === currentHour;

          const slotAppointments = dayAppointments.filter(apt => {
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
                "flex items-center gap-4 min-h-[60px] p-4 rounded-2xl border cursor-pointer transition-all duration-300 hover:scale-[1.01] hover:shadow-glass",
                statusColors[status],
                !working && nonWorkingClass,
                isNow && nowSlotClass
              )}
              onClick={onSlotClick}
              title={!working ? 'Вне рабочего времени (рекомендация). Создание записи не блокируется.' : undefined}
            >
              <div className="text-lg font-mono font-medium w-20">{timeSlot}</div>
              <div className="flex-1 space-y-2">
                {slotAppointments.length === 0 ? (
                  <div className="text-muted-foreground italic">Свободно</div>
                ) : (
                  slotAppointments.map(apt => (
                    <Link
                      key={apt.id}
                      href={`/dashboard/appointments/${apt.id}`}
                      className="block p-3 rounded-xl bg-white/60 dark:bg-black/20 hover:bg-white/80 dark:hover:bg-black/40 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{apt.customerName}</div>
                          <div className="text-sm text-muted-foreground">{apt.vehicleInfo}</div>
                          <div className="text-sm text-muted-foreground">{apt.mechanicName}</div>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className="text-xs">
                            {APPOINTMENT_STATUS_LABELS[apt.status]}
                          </Badge>
                          {apt.priority === 'URGENT' && (
                            <Badge variant="destructive" className="text-xs ml-1">
                              СРОЧНО
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
