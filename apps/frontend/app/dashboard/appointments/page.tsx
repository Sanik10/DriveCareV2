// path: apps/frontend/app/dashboard/appointments/page.tsx
'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AppLayout } from '@/components/app/AppLayout';
import { useAuth } from '@/lib/hooks/use-auth';
import { appointmentsAPI } from '@/lib/api/appointments';
import { cn } from '@/lib/utils';
import type {
  Appointment,
  AppointmentPriority,
  AppointmentStatus,
  AppointmentsQuery,
} from '@/lib/types/appointments';
import { APPOINTMENT_STATUS_LABELS } from '@/lib/types/appointments';
import { 
  CalendarDays, 
  Plus, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  Clock,
  Users,
  Calendar,
  Zap,
  CheckCircle
} from 'lucide-react';
import { AppointmentCreateDialog } from '@/components/appointments/appointment-create-dialog';

type CalendarView = 'day' | 'week' | 'month';

const VIEW_LABELS: Record<CalendarView, string> = {
  day: 'День',
  week: 'Неделя', 
  month: 'Месяц'
};

// Time slots for day/week view
const TIME_SLOTS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  return `${hour}:00`;
});

export default function AppointmentsPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const canCreate = useMemo(() => {
    const r = user?.role?.name || '';
    return ['company_owner', 'company_admin', 'manager', 'owner', 'admin'].includes(r);
  }, [user?.role?.name]);

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Appointment[]>([]);

  // Calendar state
  const [view, setView] = useState<CalendarView>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<AppointmentStatus | ''>('');

  const [openCreate, setOpenCreate] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ date: Date; time: string } | null>(null);

  // Date navigation helpers
  const navigateDate = (direction: 'prev' | 'next' | 'today') => {
    const newDate = new Date(currentDate);
    
    if (direction === 'today') {
      setCurrentDate(new Date());
      return;
    }
    
    switch (view) {
      case 'day': {
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
        break;
      }
      case 'week': {
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        break;
      }
      case 'month': {
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
        break;
      }
    }
    
    setCurrentDate(newDate);
  };

  // Get displayed date range
  const getDateRange = () => {
    const start = new Date(currentDate);
    const end = new Date(currentDate);
    
    switch (view) {
      case 'day':
        return { start, end };
      case 'week': {
        // Start from Monday
        const dayOfWeek = start.getDay();
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        start.setDate(start.getDate() + diff);
        end.setDate(start.getDate() + 6);
        return { start, end };
      }
      case 'month': {
        start.setDate(1);
        end.setMonth(end.getMonth() + 1);
        end.setDate(0);
        return { start, end };
      }
    }
  };

  const { start: rangeStart, end: rangeEnd } = getDateRange();

  // Load appointments
  const loadAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const query: AppointmentsQuery = {
        search: search.trim() || undefined,
        status: (status || undefined) as AppointmentStatus | undefined,
        dateFrom: rangeStart.toISOString().split('T')[0],
        dateTo: rangeEnd.toISOString().split('T')[0],
        sortField: 'startTime',
        sortOrder: 'asc',
        limit: 1000, // Load all for calendar view
      };
      
      const res = await appointmentsAPI.list(query);
      setItems(res.items || []);
    } catch (e) {
      console.error('Failed to load appointments:', e);
    } finally {
      setLoading(false);
    }
  }, [search, status, rangeStart, rangeEnd]);

  useEffect(() => {
    if (isAuthenticated) {
      loadAppointments();
    }
  }, [isAuthenticated, loadAppointments]);

  // Filter appointments by search
  const filteredAppointments = useMemo(() => {
    return items.filter(apt => {
      if (search && !apt.customerName?.toLowerCase().includes(search.toLowerCase()) &&
          !apt.vehicleInfo?.toLowerCase().includes(search.toLowerCase()) &&
          !apt.mechanicName?.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [items, search]);

  // Get appointments for specific date/time slot
  const getSlotAppointments = (date: Date, timeSlot?: string) => {
    const dateStr = date.toISOString().split('T')[0];
    
    return filteredAppointments.filter(apt => {
      const aptDate = new Date(apt.startTime).toISOString().split('T')[0];
      if (aptDate !== dateStr) return false;
      
      if (timeSlot && view !== 'month') {
        const aptTime = new Date(apt.startTime).toTimeString().substring(0, 5);
        const slotHour = timeSlot.split(':')[0];
        const aptHour = aptTime.split(':')[0];
        return aptHour === slotHour;
      }
      
      return true;
    });
  };

  // Get slot status color
  const getSlotStatus = (date: Date, timeSlot?: string) => {
    const appointments = getSlotAppointments(date, timeSlot);
    
    if (appointments.length === 0) return 'free';
    if (appointments.some(apt => apt.status === 'IN_PROGRESS')) return 'busy';
    if (appointments.some(apt => apt.priority === 'URGENT')) return 'urgent';
    return 'booked';
  };

  const statusColors = {
    free: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/30',
    booked: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/30',
    busy: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/30',
    urgent: 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/30',
  };

  const handleSlotClick = (date: Date, timeSlot?: string) => {
    if (canCreate) {
      setSelectedSlot({ date, time: timeSlot || '09:00' });
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

  const headerActions = (
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
  );

  if (authLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-muted-foreground">Загрузка...</span>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout 
      title="Календарь записей" 
      description="Интерактивная календарная сетка с цветовым кодированием времени"
      icon={CalendarDays}
      actions={headerActions}
    >
      <div className="container mx-auto px-6 py-6 space-y-6">
        {/* Calendar Feature Badge */}
        <Card className="p-4 glass border-indigo-500/20 bg-gradient-to-r from-indigo-500/5 to-primary/5 rounded-3xl">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-r from-indigo-500 to-primary">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-indigo-600 dark:text-indigo-400">Календарная сетка с цветовым кодированием</h3>
              <p className="text-sm text-muted-foreground">
                Зеленый (свободно), синий (занято), желтый (в работе), красный (срочно). Клик для быстрого создания записи.
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/30">
                <CheckCircle className="w-3 h-3 mr-1" />
                Свободно
              </Badge>
              <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/30">
                <Clock className="w-3 h-3 mr-1" />
                Занято
              </Badge>
              <Badge variant="outline" className="bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/30">
                <Zap className="w-3 h-3 mr-1" />
                Срочно
              </Badge>
            </div>
          </div>
        </Card>

        {/* Calendar Controls */}
        <Card className="p-4 glass border-border/30 rounded-3xl surface-glow">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Navigation */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="rounded-xl btn-outline-fixed"
                onClick={() => navigateDate('prev')}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <Button
                variant="outline"
                className="rounded-xl btn-outline-fixed min-w-[120px]"
                onClick={() => navigateDate('today')}
              >
                Сегодня
              </Button>
              
              <Button
                variant="outline"
                className="rounded-xl btn-outline-fixed"
                onClick={() => navigateDate('next')}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              
              <div className="text-lg font-semibold ml-4">
                {formatDateHeader()}
              </div>
            </div>

            {/* View Toggles */}
            <div className="flex items-center gap-1 bg-surface-1/50 rounded-xl p-1">
              {(['day', 'week', 'month'] as CalendarView[]).map((v) => (
                <Button
                  key={v}
                  variant={view === v ? 'default' : 'ghost'}
                  size="sm"
                  className="rounded-lg text-xs"
                  onClick={() => setView(v)}
                >
                  {VIEW_LABELS[v]}
                </Button>
              ))}
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 ml-auto">
              <div className="relative">
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Поиск..."
                  className="w-40 h-8 rounded-xl text-sm"
                />
              </div>
              
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as AppointmentStatus | '')}
                className="h-8 rounded-xl border border-border/50 bg-background text-sm px-2"
              >
                <option value="">Все статусы</option>
                {(Object.keys(APPOINTMENT_STATUS_LABELS) as AppointmentStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {APPOINTMENT_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

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
                timeSlots={TIME_SLOTS}
              />}
              
              {view === 'day' && <DayView 
                currentDate={currentDate}
                appointments={filteredAppointments}
                onSlotClick={handleSlotClick}
                getSlotStatus={getSlotStatus}
                statusColors={statusColors}
                timeSlots={TIME_SLOTS}
              />}
            </div>
          )}
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4 glass border-border/30 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/20">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Свободных слотов</div>
                <div className="text-xl font-bold">
                  {view === 'month' ? '...' : TIME_SLOTS.length - Math.min(TIME_SLOTS.length, filteredAppointments.length)}
                </div>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 glass border-border/30 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-500/20">
                <Clock className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Всего записей</div>
                <div className="text-xl font-bold">{filteredAppointments.length}</div>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 glass border-border/30 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20">
                <Users className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">В работе</div>
                <div className="text-xl font-bold">
                  {filteredAppointments.filter(apt => apt.status === 'IN_PROGRESS').length}
                </div>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 glass border-border/30 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-red-500/20">
                <Zap className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Срочные</div>
                <div className="text-xl font-bold">
                  {filteredAppointments.filter(apt => apt.priority === 'URGENT').length}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <AppointmentCreateDialog
        open={openCreate}
        onOpenChange={setOpenCreate}
        onCreated={() => {
          loadAppointments();
          setSelectedSlot(null);
        }}
      />
    </AppLayout>
  );
}

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
  onSlotClick: (date: Date) => void;
  getSlotStatus: (date: Date) => keyof typeof statusColors;
  statusColors: Record<string, string>;
}) {
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  
  // Start from Monday of the week containing the first day
  const startDate = new Date(firstDay);
  const dayOfWeek = startDate.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  startDate.setDate(startDate.getDate() + diff);

  const weeks = [];
  const currentWeekDate = new Date(startDate);

  for (let week = 0; week < 6; week++) {
    const days = [];
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
    
    // Stop if we've passed the end of the month and completed the week
    if (currentWeekDate > lastDay && days.length === 6) break;
  }

  const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  return (
    <div className="space-y-2">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-2 mb-4">
        {weekdays.map(day => (
          <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="space-y-2">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-2">
            {week.map(({ date, appointments: dayAppointments, isCurrentMonth, isToday }) => {
              const status = getSlotStatus(date);
              
              return (
                <div
                  key={date.toISOString()}
                  className={cn(
                    "min-h-[80px] p-2 rounded-2xl border transition-all duration-200 cursor-pointer hover:scale-[1.02]",
                    statusColors[status],
                    !isCurrentMonth && "opacity-50",
                    isToday && "ring-2 ring-primary/50"
                  )}
                  onClick={() => onSlotClick(date)}
                >
                  <div className={cn(
                    "text-sm font-medium mb-1",
                    isToday && "text-primary font-bold"
                  )}>
                    {date.getDate()}
                  </div>
                  
                  <div className="space-y-1">
                    {dayAppointments.slice(0, 2).map(apt => (
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
  timeSlots 
}: {
  currentDate: Date;
  appointments: Appointment[];
  onSlotClick: (date: Date, time: string) => void;
  getSlotStatus: (date: Date, time: string) => keyof typeof statusColors;
  statusColors: Record<string, string>;
  timeSlots: string[];
}) {
  // Get week dates (Monday to Sunday)
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

  return (
    <div className="space-y-2">
      {/* Week headers */}
      <div className="grid grid-cols-8 gap-2 mb-4">
        <div className="text-sm font-medium text-muted-foreground py-2">Время</div>
        {weekDates.map((date, index) => (
          <div key={date.toISOString()} className="text-center">
            <div className="text-sm font-medium text-muted-foreground">{weekdays[index]}</div>
            <div className={cn(
              "text-lg font-bold",
              date.toDateString() === new Date().toDateString() && "text-primary"
            )}>
              {date.getDate()}
            </div>
          </div>
        ))}
      </div>

      {/* Time slots */}
      <div className="space-y-1 max-h-[600px] overflow-y-auto">
        {timeSlots.filter((_, i) => i >= 8 && i <= 18).map(timeSlot => (
          <div key={timeSlot} className="grid grid-cols-8 gap-2">
            <div className="text-sm text-muted-foreground py-2 font-mono">
              {timeSlot}
            </div>
            
            {weekDates.map(date => {
              const status = getSlotStatus(date, timeSlot);
              const slotAppointments = appointments.filter(apt => {
                const aptDate = new Date(apt.startTime).toDateString();
                const aptTime = new Date(apt.startTime).toTimeString().substring(0, 5);
                const slotHour = timeSlot.split(':')[0];
                const aptHour = aptTime.split(':')[0];
                return aptDate === date.toDateString() && aptHour === slotHour;
              });

              return (
                <div
                  key={`${date.toISOString()}-${timeSlot}`}
                  className={cn(
                    "min-h-[40px] p-1 rounded-xl border cursor-pointer hover:scale-[1.02] transition-all duration-200",
                    statusColors[status]
                  )}
                  onClick={() => onSlotClick(date, timeSlot)}
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
        ))}
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
  timeSlots 
}: {
  currentDate: Date;
  appointments: Appointment[];
  onSlotClick: (date: Date, time: string) => void;
  getSlotStatus: (date: Date, time: string) => keyof typeof statusColors;
  statusColors: Record<string, string>;
  timeSlots: string[];
}) {
  const dayAppointments = appointments.filter(apt => {
    const aptDate = new Date(apt.startTime).toDateString();
    return aptDate === currentDate.toDateString();
  });

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

      <div className="space-y-1 max-h-[600px] overflow-y-auto">
        {timeSlots.filter((_, i) => i >= 8 && i <= 18).map(timeSlot => {
          const status = getSlotStatus(currentDate, timeSlot);
          const slotAppointments = dayAppointments.filter(apt => {
            const aptTime = new Date(apt.startTime).toTimeString().substring(0, 5);
            const slotHour = timeSlot.split(':')[0];
            const aptHour = aptTime.split(':')[0];
            return aptHour === slotHour;
          });

          return (
            <div
              key={timeSlot}
              className={cn(
                "flex items-center gap-4 min-h-[60px] p-4 rounded-2xl border cursor-pointer hover:scale-[1.01] transition-all duration-200",
                statusColors[status]
              )}
              onClick={() => onSlotClick(currentDate, timeSlot)}
            >
              <div className="text-lg font-mono font-medium w-20">
                {timeSlot}
              </div>
              
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
