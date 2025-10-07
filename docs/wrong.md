Привет! Скажи пожалуйста, реально привести все-все страницы в системе к +- единому стилю? Не прям 1в1, но хотя бы единую верхнюю часть страницы сделать, вот фильтры сдеать в едном стиле? Я думаю ты понял. Но опять же, тело страницы (календари, списки и тд) пускай будут уникаьны. Их не стоит стандартизировать. А вот фильтры и расположение кнопок - можно. Давай накину все страницы и решим какой стиль использовать?

mac@MacBook-2018-Pro DriveCareV2 % ls -a
.                       .env.production         .npmrc                  ai.rewritten.patch      node_modules            turbo.json
..                      .env.staging            .turbo                  ai.sanitized.patch      package-lock.json
.DS_Store               .git                    .vscode                 apps                    package.json
.env                    .gitignore              README.md               docker-compose.yml      packages
.env.example            .husky                  ai.patch                docs                    scripts
mac@MacBook-2018-Pro DriveCareV2 % cd fr
cd: no such file or directory: fr
mac@MacBook-2018-Pro DriveCareV2 % cd apps 
mac@MacBook-2018-Pro apps % ls
backend         frontend
mac@MacBook-2018-Pro apps % cd frontend 
mac@MacBook-2018-Pro frontend % ls -a
.                       .env.local.example      README.md               eslint.config.js        node_modules            tailwind.config.ts
..                      .gitignore              app                     features                package.json            tsconfig.json
.DS_Store               .next                   components              lib                     postcss.config.mjs
.env.local              .turbo                  docs                    next-env.d.ts           public
mac@MacBook-2018-Pro frontend % ls -R app 
(auth)          favicon.ico     fonts.ts        layout.tsx      page.tsx        providers
dashboard       fonts           globals.css     not-found.tsx   platform        tariffs

app/(auth):
login           register

app/(auth)/login:
login.module.css        page.tsx

app/(auth)/register:
invite                  page.tsx                register.module.css     success

app/(auth)/register/invite:
invite.module.css       page.tsx

app/(auth)/register/success:
page.tsx                success.module.css

app/dashboard:
appointments            dashboard.module.css    page.tsx                payments                users
billing                 invoices                parts                   security                vehicles
customers               orders                  payment-methods         services

app/dashboard/appointments:
[id]            page.tsx

app/dashboard/appointments/[id]:
page.tsx

app/dashboard/billing:
page.tsx

app/dashboard/customers:
[id]            page.tsx

app/dashboard/customers/[id]:
page.tsx

app/dashboard/invoices:
[id]            _client         new             page.tsx

app/dashboard/invoices/[id]:
_client         page.tsx

app/dashboard/invoices/[id]/_client:
Details.client.tsx

app/dashboard/invoices/_client:
List.client.tsx

app/dashboard/invoices/new:
_client         page.tsx

app/dashboard/invoices/new/_client:
NewInvoice.client.tsx

app/dashboard/orders:
[id]            new             page.tsx

app/dashboard/orders/[id]:
page.tsx

app/dashboard/orders/new:
page.tsx

app/dashboard/parts:
page.tsx

app/dashboard/payment-methods:
[id]            new             page.tsx

app/dashboard/payment-methods/[id]:
page.tsx

app/dashboard/payment-methods/new:
page.tsx

app/dashboard/payments:
[id]            page.tsx        result

app/dashboard/payments/[id]:
page.tsx

app/dashboard/payments/result:
page.tsx

app/dashboard/security:
page.tsx

app/dashboard/services:
page.tsx

app/dashboard/users:
[id]            page.tsx

app/dashboard/users/[id]:
page.tsx

app/dashboard/vehicles:
[id]            page.tsx

app/dashboard/vehicles/[id]:
page.tsx

app/fonts:
GeistMonoVF.woff        GeistVF.woff

app/platform:
catalogue       tariffs

app/platform/catalogue:
brands          import          models          page.tsx        types

app/platform/catalogue/brands:
page.tsx

app/platform/catalogue/import:
page.tsx

app/platform/catalogue/models:
page.tsx

app/platform/catalogue/types:
page.tsx

app/platform/tariffs:
[id]            new             page.tsx

app/platform/tariffs/[id]:
page.tsx

app/platform/tariffs/new:
page.tsx

app/providers:
AuthBootstrap.tsx       theme-provider.tsx

app/tariffs:
[id]                    compare                 page.tsx                tariffs.module.css

app/tariffs/[id]:
page.tsx

app/tariffs/compare:
page.tsx
mac@MacBook-2018-Pro frontend % ls -R components 
app             customers       parts           security        tariffs         users
appointments    orders          platform        services        ui              vehicles

components/app:
AppLayout.tsx           PageFeatureBadge.tsx    PaginationControls.tsx  TariffBadge.tsx
PageContentCard.tsx     PageFiltersCard.tsx     StatsCard.tsx

components/appointments:
appointment-cancel-dialog.tsx           appointment-create-dialog.tsx           appointment-reschedule-dialog.tsx       selects
appointment-complete-dialog.tsx         appointment-rating-dialog.tsx           appointment-smart-schedule-dialog.tsx

components/appointments/selects:
CustomerSelect.tsx      MechanicSelect.tsx      ServicesMultiSelect.tsx VehicleSelect.tsx

components/customers:
CustomerTimeline.tsx            customer-create-dialog.tsx

components/orders:
order-create-dialog.tsx         order-kanban.tsx                order-part-add-dialog.tsx       order-service-add-dialog.tsx

components/parts:
part-edit-dialog.tsx

components/platform:
NavigationHeader.tsx    PlatformGuard.tsx       tariffs

components/platform/tariffs:
FeatureSelector.tsx     MarketingControls.tsx   TariffEdit.client.tsx   TariffForm.tsx          TariffList.client.tsx

components/security:
device-session-card.tsx         logout-confirm-dialog.tsx       qr-code-dialog.tsx              two-factor-auth-card.tsx

components/services:
service-edit-dialog.tsx

components/tariffs:
TariffCTA.tsx                   TariffCompareView.tsx           TariffFeatures.tsx              TariffShowcase.tsx
TariffCard.tsx                  TariffDetailView.tsx            TariffHero.tsx                  TariffsNav.tsx
TariffCompareTable.tsx          TariffFAQ.tsx                   TariffPurchaseDialog.tsx

components/ui:
async-combobox.tsx      button.tsx              dialog.tsx              kbd.tsx                 switch.tsx              theme-toggle.tsx
async-multiselect.tsx   card.tsx                dropdown-menu.tsx       skeleton.tsx            tag-input.tsx
badge.tsx               confirm-dialog.tsx      input.tsx               status-badge.tsx        tariff-preview.tsx

components/users:
InvitesList.client.tsx  UsersList.client.tsx    invite-user-dialog.tsx

components/vehicles:
vehicle-create-dialog.tsx
mac@MacBook-2018-Pro frontend % ls -R docs 
frontend

docs/frontend:
FSD_MIGRATION_TRACKER.md
mac@MacBook-2018-Pro frontend % ls -R features 
pay-invoice

features/pay-invoice:
PayInvoiceButton.tsx    index.ts
mac@MacBook-2018-Pro frontend % ls -R lib 
api             api.ts          format.ts       hooks           site.ts         types           types.ts        utils           utils.ts

lib/api:
appointments.ts         customers.ts            orders.ts               payments.ts             subscription-billing.ts vehicles-catalogue.ts
auth.ts                 dashboard.ts            parts.ts                security.ts             tariffs.ts              vehicles.ts
core.ts                 invoices.ts             payment-methods.ts      services.ts             users.ts                work-schedules.ts

lib/hooks:
use-auth.ts

lib/types:
appointments.ts         invoices.ts             payment-methods.ts      services.ts             user-invites.ts         vehicles.ts
auth.ts                 orders.ts               payments.ts             subscriptions.ts        users.ts                work-schedules.ts
customers.ts            parts.ts                security.ts             tariffs.ts              vehicles-catalogue.ts

lib/utils:
role-labels.ts
mac@MacBook-2018-Pro frontend % ls -R public 
dc-logo.svg             file-text.svg           next.svg                turborepo-light.svg     window.svg
dc-wordmark.svg         globe.svg               turborepo-dark.svg      vercel.svg
mac@MacBook-2018-Pro frontend % 

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
  Zap,
  CheckCircle,
  Search,
  Filter,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { AppointmentCreateDialog } from '@/components/appointments/appointment-create-dialog';
import { MechanicSelect, type MechanicOption } from '@/components/appointments/selects/MechanicSelect';

type CalendarView = 'day' | 'week' | 'month';

const VIEW_LABELS: Record<CalendarView, string> = {
  day: 'День',
  week: 'Неделя', 
  month: 'Месяц'
};

// Local date to YYYY-MM-DD (без UTC-сдвига)
function toYMD(d: Date) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Парсинг часов: старт округляем вниз (floor), конец — вверх (ceil) до часа
function parseStartHour(hhmm?: string): number | null {
  if (!hhmm || typeof hhmm !== 'string') return null;
  const [h, m] = hhmm.split(':').map((x) => parseInt(x || '0', 10));
  if (Number.isNaN(h) || h < 0 || h > 23) return null;
  if (Number.isNaN(m) || m < 0 || m > 59) return Math.max(0, Math.min(23, h));
  return Math.max(0, Math.min(23, h)); // floor
}
function parseEndHour(hhmm?: string): number | null {
  if (!hhmm || typeof hhmm !== 'string') return null;
  const [h, m] = hhmm.split(':').map((x) => parseInt(x || '0', 10));
  if (Number.isNaN(h) || h < 0 || h > 23) return null;
  if (Number.isNaN(m) || m < 0 || m > 59) return Math.max(0, Math.min(23, h));
  return Math.max(0, Math.min(23, m === 0 ? h : h + 1)); // ceil
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
  const [mechanic, setMechanic] = useState<MechanicOption | null>(null);

  const [openCreate, setOpenCreate] = useState(false);

  // Work schedules state (for dynamic hours)
  const [showAllHours, setShowAllHours] = useState(false);
  // Map dayOfWeek (0..6) -> intervals and hour bounds
  const [scheduleMap, setScheduleMap] = useState<Record<number, { intervals: Array<{ start: number; end: number }>; minHour: number; maxHour: number }>>({});

  // Restore "all hours" from URL/localStorage once
  useEffect(() => {
    // URL has priority
    const urlVal = searchParams?.get('all');
    if (urlVal !== null) {
      const val = urlVal === '1';
      setShowAllHours(val);
      localStorage.setItem(LS_KEY_ALL_HOURS, val ? '1' : '0');
      return;
    }
    // LocalStorage fallback
    const ls = localStorage.getItem(LS_KEY_ALL_HOURS);
    if (ls === '1' || ls === '0') {
      setShowAllHours(ls === '1');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once, after mount

  const updateAllHours = useCallback((val: boolean) => {
    setShowAllHours(val);
    try {
      localStorage.setItem(LS_KEY_ALL_HOURS, val ? '1' : '0');
    } catch {}
    // Update URL param without full reload
    try {
      const sp = new URLSearchParams(Array.from(searchParams?.entries?.() || []));
      if (val) sp.set('all', '1');
      else sp.delete('all');
      const qs = sp.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    } catch {}
  }, [pathname, router, searchParams]);

  // Date navigation helpers
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

  // Строки диапазона дат для запроса (стабильные зависимости, без Date-объектов)
  const { rangeStartStr, rangeEndStr } = useMemo(() => {
    let start = new Date(currentDate);
    let end = new Date(currentDate);

    switch (view) {
      case 'day':
        break;
      case 'week': {
        const s = new Date(currentDate);
        const dayOfWeek = s.getDay();
        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Пн
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

  // Load appointments
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

  // Load schedules (for dynamic hours). Рекомендательный характер: мы только визуально подсвечиваем
  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;

    const fetchSchedules = async () => {
      try {
        const res = await workSchedulesAPI.getSchedules({ isActive: true, page: 1, limit: 200 });
        const list = (res.items || []) as WorkSchedule[];

        // Map dayOfWeek -> intervals + bounds
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

        // Пустые дни = неизвестно (min/max = -1). Будет фолбэк к дефолту/апп-интервалам
        for (let d = 0; d <= 6; d++) {
          if (tmp[d].intervals.length === 0) {
            tmp[d].minHour = -1;
            tmp[d].maxHour = -1;
          }
        }

        if (!cancelled) setScheduleMap(tmp);
      } catch (e) {
        // Если расписание недоступно — помечаем как "неопределено" (fallback ниже)
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

  // Filter appointments by search
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

  // Получить часовой диапазон для конкретной даты (учитывая расписание, либо данные аппов, либо дефолт из env)
  const getDayHourRange = useCallback((date: Date): { min: number; max: number } => {
    const dow = date.getDay(); // 0..6
    const conf = scheduleMap[dow];

    // 1) Если есть интервалы расписания — используем их
    if (conf && conf.minHour >= 0 && conf.maxHour >= 0) {
      return { min: conf.minHour, max: conf.maxHour };
    }

    // 2) Иначе — пробуем вычислить по имеющимся апойнтментам за этот день
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

    // 3) Фоллбек — дефолтные "бизнес-часы" (не 24 часа)
    return getEnvDefaultRange();
  }, [scheduleMap, filteredAppointments]);

  // Compute dynamic time slots for current view (either show all 24h or business hours derived from schedules/appointments)
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
        // Month view не использует time slots, вернем любой диапазон — не критично
        return makeTimeSlots(8, 18);
    }
  }, [showAllHours, view, currentDate, getDayHourRange]);

  // Helpers for working/non-working highlight
  const isWorkingHour = useCallback((date: Date, hour: number): boolean => {
    const conf = scheduleMap[date.getDay()];
    if (!conf || conf.intervals.length === 0) {
      // Нет явного расписания: считаем нейтральным (рабочим), чтобы не "серить" всё
      return true;
    }
    return conf.intervals.some((itv) => hour >= itv.start && hour < itv.end);
  }, [scheduleMap]);

  // Get appointments for specific date/time slot (локальная дата, без UTC сдвига)
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
        return aptStart < slotEnd && aptEnd > slotStart; // перекрытие слота
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
    free: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/30 hover:bg-emerald-100 dark:hover:bg-emerald-950/30',
    booked: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/30 hover:bg-blue-100 dark:hover:bg-blue-950/30',
    busy: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/30 hover:bg-amber-100 dark:hover:bg-amber-950/30',
    urgent: 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/30 hover:bg-red-100 dark:hover:bg-red-950/30 animate-pulse',
  };

  const nonWorkingClass =
    'opacity-60 grayscale-[15%] hover:grayscale-0 border-dashed border-muted/50';

  const handleSlotClick = () => {
    // Рекомендационный характер: можно создавать запись даже вне расписания
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

  // Calculate stats
  const stats = useMemo(() => {
    const total = filteredAppointments.length;
    const inProgress = filteredAppointments.filter(apt => apt.status === 'IN_PROGRESS').length;
    const urgent = filteredAppointments.filter(apt => apt.priority === 'URGENT').length;
    const completed = filteredAppointments.filter(apt => apt.status === 'COMPLETED').length;
    return { total, inProgress, urgent, completed };
  }, [filteredAppointments]);

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

  // "Сейчас" — подсветка текущего часа
  const now = new Date();
  const isTodayCurrent = now.toDateString() === currentDate.toDateString();
  const currentHour = now.getHours();
  const nowSlotClass = 'ring-2 ring-primary/50';

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

  return (
    <AppLayout 
      title="Календарь записей" 
      description="Интерактивная календарная сетка с цветовым кодированием времени"
      icon={CalendarDays}
      actions={headerActions}
    >
      <div className="container mx-auto px-6 py-6 space-y-6">
        {/* Calendar Feature Badge */}
        <Card className="p-4 glass border-indigo-500/20 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 rounded-3xl">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-indigo-600 dark:text-indigo-400">Календарная сетка с динамичными часами</h3>
              <p className="text-sm text-muted-foreground">
                Поддержка 24/7 и ночных смен. Нерабочие часы подсвечиваются, но не блокируются — всё рекомендательно.
              </p>
              {!hasAnySchedule && !showAllHours && (
                <div className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                  Расписание не задано — показаны дефолтные бизнес‑часы ({getEnvDefaultRange().min}:00–{getEnvDefaultRange().max}:00)
                </div>
              )}
            </div>
            <div className="ml-auto flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Все 24 часа</span>
                <Switch checked={showAllHours} onCheckedChange={updateAllHours} />
              </div>
            </div>
          </div>
        </Card>

        {/* Calendar Controls */}
        <Card className="p-4 glass border-border/30 rounded-3xl surface-glow">
          <div className="flex flex-col lg:flex-row gap-4">
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

            {/* Filters */}
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
              {/* Mechanic filter */}
              <div className="w-56">
                <MechanicSelect value={mechanic} onChange={setMechanic} placeholder="Фильтр: мастер" />
              </div>
            </div>
          </div>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4 glass border-border/30 rounded-2xl hover:scale-[1.02] transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-500/20">
                <CalendarDays className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Всего записей</div>
                <div className="text-xl font-bold">{stats.total}</div>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 glass border-border/30 rounded-2xl hover:scale-[1.02] transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">В работе</div>
                <div className="text-xl font-bold">{stats.inProgress}</div>
              </div>
            </div>
          </Card>
          
          <Card className={cn(
            "p-4 glass border-border/30 rounded-2xl hover:scale-[1.02] transition-all duration-300",
            stats.urgent > 0 && "border-red-500/30 bg-red-500/5"
          )}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-red-500/20">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Срочные</div>
                <div className="text-xl font-bold">{stats.urgent}</div>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 glass border-border/30 rounded-2xl hover:scale-[1.02] transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/20">
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Завершено</div>
                <div className="text-xl font-bold">{stats.completed}</div>
              </div>
            </div>
          </Card>
        </div>

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
  
  // Start from Monday of the week containing the first day
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

(ТОП по информативности)
// path: apps/frontend/app/dashboard/vehicles/page.tsx
"use client";

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AppLayout } from '@/components/app/AppLayout';
import { 
  Car, 
  Search, 
  RefreshCw, 
  Plus, 
  Filter,
  AlertTriangle,
  CheckCircle,
  Clock,
  Gauge,
  Hash,
  User,
  Calendar,
  Sparkles,
  TrendingUp,
  Zap
} from 'lucide-react';
import { useAuth } from '@/lib/hooks/use-auth';
import { vehiclesAPI } from '@/lib/api/vehicles';
import { vehiclesCatalogueAPI } from '@/lib/api/vehicles-catalogue';
import { cn } from '@/lib/utils';
import type { 
  VehiclesQuery, 
  PaginatedVehiclesResponse, 
  VehicleResponse,
  EngineType
} from '@/lib/types/vehicles';
import type { 
  CatalogueBrand, 
  CatalogueModel, 
  CatalogueType 
} from '@/lib/types/vehicles-catalogue';
import { VehicleCreateDialog } from '@/components/vehicles/vehicle-create-dialog';

const ENGINE_TYPES: { value: EngineType; label: string }[] = [
  { value: 'petrol', label: 'Бензин' },
  { value: 'diesel', label: 'Дизель' },
  { value: 'hybrid', label: 'Гибрид' },
  { value: 'electric', label: 'Электро' },
];

export default function VehiclesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-muted-foreground">Загрузка автомобилей...</span>
          </div>
        </div>
      }
    >
      <VehiclesListPage />
    </Suspense>
  );
}

function VehiclesListPage() {
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PaginatedVehiclesResponse | null>(null);

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(12); // Grid view - more per page
  const [serviceFilter, setServiceFilter] = useState<'all' | 'ok' | 'soon' | 'overdue'>('all');

  const [openCreate, setOpenCreate] = useState(false);

  // Catalogue filters
  const [brands, setBrands] = useState<CatalogueBrand[]>([]);
  const [models, setModels] = useState<CatalogueModel[]>([]);
  const [types, setTypes] = useState<CatalogueType[]>([]);
  const [brandId, setBrandId] = useState<string>('');
  const [modelId, setModelId] = useState<string>('');
  const [vehicleTypeId, setVehicleTypeId] = useState<string>('');

  // Extended filters
  const [engineType, setEngineType] = useState<EngineType | ''>('');
  const [yearFrom, setYearFrom] = useState<string>('');
  const [yearTo, setYearTo] = useState<string>('');
  const [hasServiceHistory, setHasServiceHistory] = useState<boolean | ''>('');

  useEffect(() => setIsMounted(true), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [b, m, t] = await Promise.all([
          vehiclesCatalogueAPI.brands(),
          vehiclesCatalogueAPI.models(),
          vehiclesCatalogueAPI.types(),
        ]);
        if (!cancelled) {
          setBrands(b);
          setModels(m);
          setTypes(t);
        }
      } catch {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filteredModels = useMemo(() => {
    if (!brandId) return models;
    return models.filter(m => (m.brandId === brandId) || (m.brand?.id === brandId));
  }, [models, brandId]);

  const query: VehiclesQuery = useMemo(() => ({
    search: search || undefined,
    page,
    limit,
    modelId: modelId || undefined,
    vehicleTypeId: vehicleTypeId || undefined,
    engineType: engineType || undefined,
    yearFrom: yearFrom ? parseInt(yearFrom, 10) : undefined,
    yearTo: yearTo ? parseInt(yearTo, 10) : undefined,
    hasServiceHistory: hasServiceHistory === '' ? undefined : !!hasServiceHistory,
  }), [search, page, limit, modelId, vehicleTypeId, engineType, yearFrom, yearTo, hasServiceHistory]);

  useEffect(() => {
    if (!isMounted) return;
    if (authLoading) return;
    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }

    let cancelled = false;
    const DEBOUNCE_MS = 300;
    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await vehiclesAPI.getVehicles(query);
        if (!cancelled) setData(res);
      } catch (e) {
        try {
          const parsed = JSON.parse((e as Error).message) as { message?: string; correlationId?: string };
          const msg = parsed.correlationId
            ? `${parsed.message || 'Ошибка загрузки автомобилей'} (corrId: ${parsed.correlationId})`
            : (parsed.message || 'Ошибка загрузки автомобилей');
          if (!cancelled) setError(msg);
        } catch {
          if (!cancelled) setError('Ошибка загрузки автомобилей');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isMounted, authLoading, isAuthenticated, user, router, query]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpenCreate(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onCreated = async () => {
    setPage(1);
    const res = await vehiclesAPI.getVehicles({ ...query, page: 1 });
    setData(res);
  };

  const handleRefresh = async () => {
    setPage(1);
    const res = await vehiclesAPI.getVehicles({ ...query, page: 1 });
    setData(res);
  };

  if (!isMounted) return null;
  if (authLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-muted-foreground">Загрузка автомобилей...</span>
          </div>
        </div>
      </AppLayout>
    );
  }
  if (!isAuthenticated || !user) return null;

  const items = data?.items || [];
  
  // Filter by service status client-side for better UX
  const filteredItems = items.filter(vehicle => {
    if (serviceFilter === 'all') return true;
    const serviceStatus = getVehicleServiceStatus(vehicle);
    return serviceFilter === serviceStatus;
  });

  // Service status stats
  const serviceStats = items.reduce((acc, vehicle) => {
    const status = getVehicleServiceStatus(vehicle);
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const headerActions = (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        className="rounded-2xl btn-outline-fixed"
        onClick={handleRefresh}
      >
        <RefreshCw className="w-4 h-4 mr-2" />
        Обновить
      </Button>
      
      <Button 
        className="rounded-2xl bg-gradient-primary hover:opacity-90 transition-all duration-300 hover:scale-[1.02]"
        onClick={() => setOpenCreate(true)}
      >
        <Plus className="w-4 h-4 mr-2" />
        Добавить ТС
      </Button>
    </div>
  );

  return (
    <AppLayout 
      title="Автомобили" 
      description="Учет ТС с контролем ТО и техническими характеристиками"
      icon={Car}
      actions={headerActions}
    >
      <div className="container mx-auto px-6 py-6 space-y-6">
        {/* Vehicle Cards Feature Badge */}
        <Card className="p-4 glass border-emerald-500/20 bg-gradient-to-r from-emerald-500/5 to-green-500/5 rounded-3xl">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-emerald-600 dark:text-emerald-400">Интерактивные карточки ТС</h3>
              <p className="text-sm text-muted-foreground">
                Цветовые индикаторы ТО: зеленый (актуально), желтый (скоро), красный (просрочено). Клик для детального просмотра.
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/30">
                <CheckCircle className="w-3 h-3 mr-1" />
                ТО OK
              </Badge>
              <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/30">
                <Clock className="w-3 h-3 mr-1" />
                Скоро
              </Badge>
              <Badge variant="outline" className="bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/30">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Просрочено
              </Badge>
            </div>
          </div>
        </Card>

        {/* Search & Filters */}
        <Card className="p-4 glass border-border/30 rounded-3xl surface-glow">
          <div className="space-y-4">
            {/* Top row - Search and Service Filter */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="relative">
                <Input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Поиск по номеру, VIN, модели или владельцу"
                  className="pl-9 h-10 rounded-2xl border-border/50 focus:border-primary/50 transition-all duration-300"
                />
                <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              </div>
              
              <div className="flex flex-wrap gap-2">
                <ServiceFilterButton
                  active={serviceFilter === 'all'}
                  onClick={() => setServiceFilter('all')}
                  count={items.length}
                >
                  Все
                </ServiceFilterButton>
                <ServiceFilterButton
                  active={serviceFilter === 'ok'}
                  onClick={() => setServiceFilter('ok')}
                  count={serviceStats.ok || 0}
                  variant="ok"
                >
                  <CheckCircle className="w-3 h-3 mr-1" />
                  ТО OK
                </ServiceFilterButton>
                <ServiceFilterButton
                  active={serviceFilter === 'soon'}
                  onClick={() => setServiceFilter('soon')}
                  count={serviceStats.soon || 0}
                  variant="soon"
                >
                  <Clock className="w-3 h-3 mr-1" />
                  Скоро
                </ServiceFilterButton>
                <ServiceFilterButton
                  active={serviceFilter === 'overdue'}
                  onClick={() => setServiceFilter('overdue')}
                  count={serviceStats.overdue || 0}
                  variant="overdue"
                >
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Просрочено
                </ServiceFilterButton>
              </div>
            </div>

            {/* Bottom row - Catalogue + Extended Filters */}
            <div className="grid grid-cols-1 lg:grid-cols-6 gap-3">
              <select
                value={brandId}
                onChange={(e) => { setBrandId(e.target.value); setModelId(''); setPage(1); }}
                className="h-10 rounded-2xl border border-border/50 bg-background text-sm px-3 focus:border-primary/50 transition-all duration-300"
              >
                <option value="">Все бренды</option>
                {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              
              <select
                value={modelId}
                onChange={(e) => { setModelId(e.target.value); setPage(1); }}
                className="h-10 rounded-2xl border border-border/50 bg-background text-sm px-3 focus:border-primary/50 transition-all duration-300"
              >
                <option value="">Все модели</option>
                {filteredModels.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
              
              <select
                value={vehicleTypeId}
                onChange={(e) => { setVehicleTypeId(e.target.value); setPage(1); }}
                className="h-10 rounded-2xl border border-border/50 bg-background text-sm px-3 focus:border-primary/50 transition-all duration-300"
              >
                <option value="">Все типы</option>
                {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>

              <select
                value={engineType}
                onChange={(e) => { setEngineType((e.target.value as EngineType) || ''); setPage(1); }}
                className="h-10 rounded-2xl border border-border/50 bg-background text-sm px-3 focus:border-primary/50 transition-all duration-300"
              >
                <option value="">Двигатель</option>
                {ENGINE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>

              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Год от"
                  value={yearFrom}
                  onChange={(e) => { setYearFrom(e.target.value.replace(/[^\d]/g, '')); setPage(1); }}
                  className="h-10 rounded-2xl"
                />
                <Input
                  type="number"
                  placeholder="Год до"
                  value={yearTo}
                  onChange={(e) => { setYearTo(e.target.value.replace(/[^\d]/g, '')); setPage(1); }}
                  className="h-10 rounded-2xl"
                />
              </div>

              <div className="flex items-center justify-between gap-2 text-sm">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!hasServiceHistory}
                    onChange={(e) => { setHasServiceHistory(e.target.checked); setPage(1); }}
                  />
                  Есть история ТО
                </label>

                <select
                  value={limit}
                  onChange={(e) => { setLimit(parseInt(e.target.value, 10)); setPage(1); }}
                  className="h-10 rounded-2xl border border-border/50 bg-background text-sm px-3 focus:border-primary/50 transition-all duration-300"
                >
                  {[12, 24, 48].map((n) => (
                    <option key={n} value={n}>{n} шт</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <StatsCard
            title="Всего ТС"
            value={data?.total ?? 0}
            icon={Car}
            color="blue"
          />
          <StatsCard
            title="ТО актуально"
            value={serviceStats.ok || 0}
            icon={CheckCircle}
            color="emerald"
          />
          <StatsCard
            title="ТО скоро"
            value={serviceStats.soon || 0}
            icon={Clock}
            color="amber"
          />
          <StatsCard
            title="ТО просрочено"
            value={serviceStats.overdue || 0}
            icon={AlertTriangle}
            color="red"
            highlight={(serviceStats.overdue || 0) > 0}
          />
          <StatsCard
            title="Средний пробег"
            value={Math.round(data?.meta?.averageMileage ?? 0)}
            icon={Gauge}
            color="default"
          />
          <StatsCard
            title="Средний возраст, лет"
            value={Number((data?.meta?.averageAge ?? 0).toFixed(1))}
            icon={Calendar}
            color="default"
          />
        </div>

        {/* Vehicle Cards Grid */}
        <Card className="p-0 glass border-border/30 rounded-3xl surface-glow overflow-hidden">
          {loading ? (
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(12)].map((_, i) => (
                <div key={i} className="h-48 bg-surface-1/40 rounded-3xl animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="p-6 text-center text-destructive">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Zap className="w-5 h-5" />
                <span className="font-medium">Ошибка загрузки</span>
              </div>
              <p>{error}</p>
              <Button onClick={handleRefresh} className="mt-4 rounded-2xl">
                <RefreshCw className="w-4 h-4 mr-2" />
                Повторить
              </Button>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">
              <Car className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h3 className="font-semibold mb-2">Автомобили не найдены</h3>
              <p className="text-sm mb-4">
                {serviceFilter !== 'all' 
                  ? `Нет автомобилей с выбранным статусом ТО`
                  : 'Попробуйте изменить параметры поиска или добавьте первое ТС'
                }
              </p>
              <Button 
                className="rounded-2xl bg-gradient-primary hover:opacity-90"
                onClick={() => setOpenCreate(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Добавить ТС
              </Button>
            </div>
          ) : (
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredItems.map((vehicle) => (
                <VehicleCard key={vehicle.id} vehicle={vehicle} />
              ))}
            </div>
          )}
        </Card>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Показано: {filteredItems.length} из {data.total} автомобилей
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="rounded-2xl btn-outline-fixed"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Назад
              </Button>
              <span className="text-sm px-3 py-1 rounded-xl bg-surface-1/60">
                {page} / {data.totalPages}
              </span>
              <Button
                variant="outline"
                className="rounded-2xl btn-outline-fixed"
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Далее
              </Button>
            </div>
          </div>
        )}
      </div>

      <VehicleCreateDialog
        open={openCreate}
        onOpenChange={setOpenCreate}
        onCreated={onCreated}
      />
    </AppLayout>
  );
}

// Helper function to get vehicle service status
function getVehicleServiceStatus(vehicle: VehicleResponse): 'ok' | 'soon' | 'overdue' {
  if (vehicle.needsService) return 'overdue';
  if (vehicle.daysUntilService !== undefined && vehicle.daysUntilService <= 30) return 'soon';
  return 'ok';
}

// Service Filter Button Component
function ServiceFilterButton({
  active,
  onClick,
  count,
  variant = 'default',
  children
}: {
  active: boolean;
  onClick: () => void;
  count: number;
  variant?: 'default' | 'ok' | 'soon' | 'overdue';
  children: React.ReactNode;
}) {
  const { cn } = require('@/lib/utils');
  const variantStyles = {
    default: 'border-border/50',
    ok: 'border-emerald-200 dark:border-emerald-800/30 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300',
    soon: 'border-amber-200 dark:border-amber-800/30 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300',
    overdue: 'border-red-200 dark:border-red-800/30 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300',
  };

  return (
    <Button
      variant={active ? 'default' : 'outline'}
      className={cn(
        "rounded-xl flex-1 text-xs transition-all duration-300 relative",
        active && variant !== 'default' && variantStyles[variant],
        !active && variant !== 'default' && variantStyles[variant]
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-1">
        {children}
        <Badge variant="secondary" className="ml-1 text-xs px-1 py-0 h-4 min-w-4">
          {count}
        </Badge>
      </div>
    </Button>
  );
}

// Stats Card Component
function StatsCard({
  title,
  value,
  icon: Icon,
  color = 'default',
  highlight = false
}: {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color?: 'default' | 'blue' | 'emerald' | 'amber' | 'red';
  highlight?: boolean;
}) {
  const { cn } = require('@/lib/utils');
  const colorStyles = {
    default: 'from-surface-1/40 to-surface-2/40 border-border/30 text-muted-foreground',
    blue: 'from-blue-500/10 to-blue-600/5 border-blue-500/20 text-blue-600 dark:text-blue-400',
    emerald: 'from-emerald-500/10 to-emerald-600/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
    amber: 'from-amber-500/10 to-amber-600/5 border-amber-500/20 text-amber-600 dark:text-amber-400',
    red: 'from-red-500/10 to-red-600/5 border-red-500/20 text-red-600 dark:text-red-400',
  };

  return (
    <Card className={cn(
      'p-4 glass border rounded-2xl bg-gradient-to-br transition-all duration-300 hover:scale-[1.02]',
      colorStyles[color],
      highlight && 'animate-pulse'
    )}>
      <div className="flex items-center gap-3">
        <div className={cn(
          'p-2 rounded-xl',
          color === 'blue' && 'bg-blue-500/20',
          color === 'emerald' && 'bg-emerald-500/20',
          color === 'amber' && 'bg-amber-500/20',
          color === 'red' && 'bg-red-500/20',
          color === 'default' && 'bg-surface-1/40'
        )}>
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{title}</div>
          <div className="text-lg font-bold">{value}</div>
        </div>
      </div>
    </Card>
  );
}

// Enhanced Vehicle Card Component
function VehicleCard({ vehicle }: { vehicle: VehicleResponse }) {
  const { cn } = require('@/lib/utils');
  const model = `${vehicle.model?.brand?.name || ''} ${vehicle.model?.name || ''}`.trim() || 'Автомобиль';
  const owner = vehicle.customer 
    ? [vehicle.customer.firstName, vehicle.customer.lastName].filter(Boolean).join(' ') 
      || vehicle.customer.companyName 
      || 'Клиент'
    : 'Не указан';

  // Service status logic
  const serviceStatus = getVehicleServiceStatus(vehicle);

  const serviceStatusConfig = {
    ok: {
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      icon: CheckCircle,
      text: 'ТО актуально',
      glow: false,
    },
    soon: {
      color: 'text-amber-600 dark:text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      icon: Clock,
      text: `ТО через ${vehicle.daysUntilService || '?'} дн.`,
      glow: false,
    },
    overdue: {
      color: 'text-red-600 dark:text-red-400',
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
      icon: AlertTriangle,
      text: 'ТО просрочено!',
      glow: true,
    },
  };

  const config = serviceStatusConfig[serviceStatus];
  const StatusIcon = config.icon;

  return (
    <Link 
      href={`/dashboard/vehicles/${vehicle.id}`}
      className={cn(
        "block group transition-all duration-300 hover:scale-[1.02] hover:-translate-y-1",
        config.glow && "animate-pulse"
      )}
    >
      <Card className={cn(
        "p-4 h-52 glass border-border/30 rounded-3xl surface-glow group-hover:border-primary/30 transition-all duration-500 group-hover:shadow-glass-lg",
        config.glow && "border-red-500/30 shadow-lg shadow-red-500/10"
      )}>
        <div className="flex flex-col h-full">
          {/* Header with status */}
          <div className="flex items-start justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-r from-emerald-500/20 to-primary/20 group-hover:scale-105 transition-transform duration-300">
              <Car className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <Badge 
              variant="outline" 
              className={cn(
                "text-xs px-2 py-1 rounded-xl border transition-all duration-300",
                config.color,
                config.bg,
                config.border,
                config.glow && "animate-pulse"
              )}
            >
              <StatusIcon className="w-3 h-3 mr-1" />
              <span className="hidden sm:inline">{config.text}</span>
              <span className="sm:hidden">{serviceStatus.toUpperCase()}</span>
            </Badge>
          </div>

          {/* Vehicle info */}
          <div className="flex-1 space-y-3">
            <h3 className="font-semibold text-base line-clamp-1 group-hover:text-primary transition-colors duration-300">
              {model}
            </h3>
            
            <div className="space-y-2 text-xs text-muted-foreground">
              {(vehicle.licensePlate || vehicle.vin) && (
                <div className="flex items-center gap-2">
                  <Hash className="w-3.5 h-3.5 text-muted-foreground/70" />
                  <span className="line-clamp-1 font-mono">
                    {vehicle.licensePlate || vehicle.vin}
                  </span>
                </div>
              )}
              
              {vehicle.mileage && (
                <div className="flex items-center gap-2">
                  <Gauge className="w-3.5 h-3.5 text-muted-foreground/70" />
                  <span>{vehicle.mileage.toLocaleString('ru-RU')} км</span>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-muted-foreground/70" />
                <span className="line-clamp-1">{owner}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-3 mt-auto border-t border-border/20">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {new Date(vehicle.createdAt).toLocaleDateString('ru-RU')}
              </span>
              <div className="opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center gap-1 text-primary">
                <span className="font-medium">Подробнее</span>
                <TrendingUp className="w-3 h-3" />
              </div>
            </div>
          </div>

          {/* Hover Effect Border */}
          <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10" />
        </div>
      </Card>
    </Link>
  );
}

// path: apps/frontend/app/dashboard/users/page.tsx
'use client';

import { Suspense } from 'react';
import { Users } from 'lucide-react';
import { AppLayout } from '@/components/app/AppLayout';
import UsersList from '@/components/users/UsersList.client';

export default function UsersPage() {
  return (
    <AppLayout
      title="Команда"
      description="Управление сотрудниками и приглашениями"
      icon={Users}
    >
      <div className="container mx-auto px-6 py-8">
        <Suspense
          fallback={
            <div className="flex items-center justify-center p-12">
              <div className="flex flex-col items-center gap-3">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
                <p className="text-sm text-muted-foreground">Загрузка команды...</p>
              </div>
            </div>
          }
        >
          <UsersList />
        </Suspense>
      </div>
    </AppLayout>
  );
}

(вообще нет такой страницы?)
// path: apps/frontend/app/dashboard/services/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Building2, 
  Plus, 
  Search, 
  RefreshCw, 
  Pencil, 
  Trash2,
  Clock,
  DollarSign,
  Settings,
  Sparkles,
  TrendingUp,
  Filter,
  Tag
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { AppLayout } from '@/components/app/AppLayout'
import { useAuth } from '@/lib/hooks/use-auth'
import { servicesAPI } from '@/lib/api/services'
import type { PaginatedServicesResponse, ServiceCatalogueItem } from '@/lib/types/services'
import { ServiceEditDialog } from '@/components/services/service-edit-dialog'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function ServicesCataloguePage() {
  const { isAuthenticated, user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [isMounted, setIsMounted] = useState(false)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<PaginatedServicesResponse | null>(null)

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)

  const [openEdit, setOpenEdit] = useState(false)
  const [current, setCurrent] = useState<ServiceCatalogueItem | null>(null)

  useEffect(() => setIsMounted(true), [])

  const query = useMemo(() => ({ search: search || undefined, page, limit }), [search, page, limit])

  useEffect(() => {
    if (!isMounted) return
    if (authLoading) return
    if (!isAuthenticated || !user) {
      router.push('/login')
      return
    }

    let cancelled = false
    const t = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await servicesAPI.search(query)
        if (!cancelled) setData(res)
      } catch (e) {
        try {
          const parsed = JSON.parse((e as Error).message) as { message?: string }
          if (!cancelled) setError(parsed.message || 'Ошибка загрузки услуг')
        } catch {
          if (!cancelled) setError('Ошибка загрузки услуг')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 250)

    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [isMounted, authLoading, isAuthenticated, user, router, query])

  const handleCreate = () => {
    setCurrent(null)
    setOpenEdit(true)
  }

  const handleEdit = (svc: ServiceCatalogueItem) => {
    setCurrent(svc)
    setOpenEdit(true)
  }

  const handleSaved = async () => {
    const res = await servicesAPI.search({ ...query, page: 1 })
    setData(res)
    setPage(1)
  }

  const handleDelete = async (svc: ServiceCatalogueItem) => {
    if (!confirm(`Удалить услугу "${svc.name}"?`)) return
    try {
      await servicesAPI.remove(svc.id)
      toast.success('Услуга удалена')
      const res = await servicesAPI.search({ ...query, page: 1 })
      setData(res)
      setPage(1)
    } catch (e) {
      try {
        const parsed = JSON.parse((e as Error).message) as { message?: string }
        toast.error(parsed.message || 'Ошибка удаления услуги')
      } catch {
        toast.error('Ошибка удаления услуги')
      }
    }
  }

  const handleRefresh = async () => {
    setPage(1);
    const res = await servicesAPI.search({ ...query, page: 1 });
    setData(res);
    toast.success('Каталог обновлен');
  };

  if (!isMounted) return null
  if (authLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-muted-foreground">Загрузка каталога...</span>
          </div>
        </div>
      </AppLayout>
    )
  }
  if (!isAuthenticated || !user) return null

  const items = data?.items || []

  const headerActions = (
    <div className="flex items-center gap-2">
      <Button 
        variant="outline" 
        onClick={handleRefresh}
        className="rounded-2xl btn-outline-fixed"
      >
        <RefreshCw className="w-4 h-4 mr-2" />
        Обновить
      </Button>
      <Button 
        onClick={handleCreate}
        className="rounded-2xl bg-gradient-primary hover:opacity-90 transition-all duration-300 hover:scale-[1.02]"
      >
        <Plus className="w-4 h-4 mr-2" />
        Новая услуга
      </Button>
    </div>
  );

  return (
    <AppLayout
      title="Каталог услуг"
      description="Справочник услуг автосервиса с редактированием и ценами"
      icon={Building2}
      actions={headerActions}
    >
      <div className="container mx-auto px-6 py-6 space-y-6">
        {/* Services Feature Badge */}
        <Card className="p-4 glass border-blue-500/20 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 rounded-3xl">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-600 dark:text-blue-400">Каталог услуг с редактированием</h3>
              <p className="text-sm text-muted-foreground">
                Управление справочником услуг: цены, длительность, налогообложение. Inline редактирование и быстрый поиск.
              </p>
            </div>
            <div className="ml-auto">
              <TrendingUp className="w-6 h-6 text-secondary" />
            </div>
          </div>
        </Card>

        {/* Search & Filters */}
        <Card className="p-4 glass border-border/30 rounded-3xl surface-glow">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative md:col-span-2">
              <Input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                placeholder="Поиск услуг по названию или описанию"
                className="pl-9 h-10 rounded-2xl border-border/50 focus:border-primary/50 transition-all duration-300"
              />
              <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            </div>
            
            <div className="flex gap-2">
              <select
                value={limit}
                onChange={(e) => { setLimit(parseInt(e.target.value, 10)); setPage(1) }}
                className="h-10 rounded-2xl border border-border/50 bg-background text-sm px-3 focus:border-primary/50 transition-all duration-300"
              >
                {[10, 20, 50].map(n => (
                  <option key={n} value={n}>{n} / стр</option>
                ))}
              </select>
              <div className="flex items-center text-sm text-muted-foreground">
                <Filter className="w-4 h-4 mr-2" />
                Всего: {data?.total || 0}
              </div>
            </div>
          </div>
        </Card>

        {/* Services List */}
        <Card className="p-0 glass border-border/30 rounded-3xl surface-glow overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-16 bg-surface-1/40 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="p-6 text-center text-destructive">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Settings className="w-5 h-5" />
                <span className="font-medium">Ошибка загрузки</span>
              </div>
              <p>{error}</p>
              <Button onClick={handleRefresh} className="mt-4 rounded-2xl">
                <RefreshCw className="w-4 h-4 mr-2" />
                Повторить
              </Button>
            </div>
          ) : items.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">
              <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h3 className="font-semibold mb-2">Услуги не найдены</h3>
              <p className="text-sm mb-4">
                {search ? 'Попробуйте изменить параметры поиска' : 'Добавьте первую услугу в каталог'}
              </p>
              <Button 
                onClick={handleCreate}
                className="rounded-2xl bg-gradient-primary hover:opacity-90"
              >
                <Plus className="w-4 h-4 mr-2" />
                Добавить услугу
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {items.map(svc => (
                <ServiceRow 
                  key={svc.id} 
                  service={svc} 
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </Card>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Показано: {items.length} из {data.total} услуг
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                disabled={(data.page || 1) <= 1} 
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-2xl btn-outline-fixed"
              >
                Назад
              </Button>
              <span className="text-sm px-3 py-1 rounded-xl bg-surface-1/60">
                {data.page || 1} / {data.totalPages || 1}
              </span>
              <Button 
                variant="outline" 
                disabled={(data.page || 1) >= (data.totalPages || 1)} 
                onClick={() => setPage((p) => p + 1)}
                className="rounded-2xl btn-outline-fixed"
              >
                Далее
              </Button>
            </div>
          </div>
        )}

        {/* Service Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4 glass border-border/30 rounded-2xl hover:scale-[1.02] transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-500/20">
                <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Всего услуг</div>
                <div className="text-xl font-bold">{data?.total || 0}</div>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 glass border-border/30 rounded-2xl hover:scale-[1.02] transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/20">
                <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Средняя цена</div>
                <div className="text-xl font-bold">
                  {items.length > 0 
                    ? Math.round(items.reduce((sum, s) => sum + (s.price || 0), 0) / items.length).toLocaleString('ru-RU')
                    : 0
                  } ₽
                </div>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 glass border-border/30 rounded-2xl hover:scale-[1.02] transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Ср. длительность</div>
                <div className="text-xl font-bold">
                  {items.length > 0
                    ? Math.round(items.reduce((sum, s) => sum + (s.durationMinutes || 0), 0) / items.length)
                    : 0
                  } мин
                </div>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 glass border-border/30 rounded-2xl hover:scale-[1.02] transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-500/20">
                <Tag className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">С НДС</div>
                <div className="text-xl font-bold">
                  {items.filter(s => s.taxable !== false).length}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <ServiceEditDialog 
        open={openEdit} 
        onOpenChange={setOpenEdit} 
        service={current} 
        onSaved={handleSaved} 
      />
    </AppLayout>
  )
}

// Service Row Component
function ServiceRow({ 
  service, 
  onEdit, 
  onDelete 
}: { 
  service: ServiceCatalogueItem; 
  onEdit: (service: ServiceCatalogueItem) => void;
  onDelete: (service: ServiceCatalogueItem) => void;
}) {
  return (
    <div className="p-4 hover:bg-surface-1/30 transition-all duration-300 group">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="p-2 rounded-xl bg-gradient-to-r from-blue-500/20 to-indigo-500/20 group-hover:scale-105 transition-transform">
            <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm mb-1 truncate group-hover:text-primary transition-colors">
              {service.name}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                <span>{(service.price || 0).toLocaleString('ru-RU')} ₽</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{service.durationMinutes || 0} мин</span>
              </div>
              {service.taxable === false && (
                <Badge variant="outline" className="text-xs px-1 py-0 h-5">
                  Без НДС
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onEdit(service)}
            className="rounded-xl btn-outline-fixed opacity-0 group-hover:opacity-100 transition-all duration-300"
          >
            <Pencil className="w-3.5 h-3.5 mr-1" /> 
            Изменить
          </Button>
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={() => void onDelete(service)}
            className="rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" /> 
            Удалить
          </Button>
        </div>
      </div>
    </div>
  );
}

и др. что тебе ещё накинуть, может и из других страниц что-то подтянем!

# 🎨 План стандартизации UI

Отличная идея! Да, реально и **очень нужно**. Я вижу, что у вас уже есть хорошие паттерны на страницах appointments и vehicles. Давайте создадим **единую дизайн-систему** для всех страниц.

## 📋 Что стандартизируем:

1. ✅ **Feature Badge** - карточка с описанием фичи страницы
2. ✅ **Фильтры и поиск** - единая структура и стили
3. ✅ **Header Actions** - расположение кнопок (Обновить, Создать)
4. ✅ **Stats Cards** - метрики (опционально)
5. ✅ **Состояния**: Loading, Error, Empty
6. ✅ **Pagination** - единый компонент
7. ⚡ **Тело страницы** - уникально (таблицы, календари, грид)

## 🎨 Цветовая схема по типам страниц:

| Страница | Градиент | Икона |
|----------|----------|-------|
| Appointments | indigo→purple | CalendarDays |
| Vehicles | emerald→green | Car |
| Services | blue→indigo | Building2 |
| Customers | pink→rose | Users |
| Orders | orange→amber | ClipboardList |
| Parts | cyan→blue | Package |
| Invoices | violet→purple | FileText |
| Payments | emerald→teal | CreditCard |
| Users | slate→gray | Users |
| Platform | purple→fuchsia | Settings |

---

## 🧩 Создаём переиспользуемые компоненты:

### 1️⃣ PageFeatureBadge

```tsx
// components/app/PageFeatureBadge.tsx
import { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type FeatureBadgeVariant = 
  | 'indigo-purple'   // Appointments
  | 'emerald-green'   // Vehicles  
  | 'blue-indigo'     // Services
  | 'pink-rose'       // Customers
  | 'orange-amber'    // Orders
  | 'cyan-blue'       // Parts
  | 'violet-purple'   // Invoices
  | 'emerald-teal'    // Payments
  | 'slate-gray'      // Users
  | 'purple-fuchsia'; // Platform

const VARIANT_STYLES: Record<FeatureBadgeVariant, {
  border: string;
  bg: string;
  icon: string;
  text: string;
}> = {
  'indigo-purple': {
    border: 'border-indigo-500/20',
    bg: 'bg-gradient-to-r from-indigo-500/5 to-purple-500/5',
    icon: 'bg-gradient-to-r from-indigo-500 to-purple-500',
    text: 'text-indigo-600 dark:text-indigo-400',
  },
  'emerald-green': {
    border: 'border-emerald-500/20',
    bg: 'bg-gradient-to-r from-emerald-500/5 to-green-500/5',
    icon: 'bg-gradient-to-r from-emerald-500 to-green-500',
    text: 'text-emerald-600 dark:text-emerald-400',
  },
  'blue-indigo': {
    border: 'border-blue-500/20',
    bg: 'bg-gradient-to-r from-blue-500/5 to-indigo-500/5',
    icon: 'bg-gradient-to-r from-blue-500 to-indigo-500',
    text: 'text-blue-600 dark:text-blue-400',
  },
  'pink-rose': {
    border: 'border-pink-500/20',
    bg: 'bg-gradient-to-r from-pink-500/5 to-rose-500/5',
    icon: 'bg-gradient-to-r from-pink-500 to-rose-500',
    text: 'text-pink-600 dark:text-pink-400',
  },
  'orange-amber': {
    border: 'border-orange-500/20',
    bg: 'bg-gradient-to-r from-orange-500/5 to-amber-500/5',
    icon: 'bg-gradient-to-r from-orange-500 to-amber-500',
    text: 'text-orange-600 dark:text-orange-400',
  },
  'cyan-blue': {
    border: 'border-cyan-500/20',
    bg: 'bg-gradient-to-r from-cyan-500/5 to-blue-500/5',
    icon: 'bg-gradient-to-r from-cyan-500 to-blue-500',
    text: 'text-cyan-600 dark:text-cyan-400',
  },
  'violet-purple': {
    border: 'border-violet-500/20',
    bg: 'bg-gradient-to-r from-violet-500/5 to-purple-500/5',
    icon: 'bg-gradient-to-r from-violet-500 to-purple-500',
    text: 'text-violet-600 dark:text-violet-400',
  },
  'emerald-teal': {
    border: 'border-emerald-500/20',
    bg: 'bg-gradient-to-r from-emerald-500/5 to-teal-500/5',
    icon: 'bg-gradient-to-r from-emerald-500 to-teal-500',
    text: 'text-emerald-600 dark:text-emerald-400',
  },
  'slate-gray': {
    border: 'border-slate-500/20',
    bg: 'bg-gradient-to-r from-slate-500/5 to-gray-500/5',
    icon: 'bg-gradient-to-r from-slate-500 to-gray-500',
    text: 'text-slate-600 dark:text-slate-400',
  },
  'purple-fuchsia': {
    border: 'border-purple-500/20',
    bg: 'bg-gradient-to-r from-purple-500/5 to-fuchsia-500/5',
    icon: 'bg-gradient-to-r from-purple-500 to-fuchsia-500',
    text: 'text-purple-600 dark:text-purple-400',
  },
};

interface PageFeatureBadgeProps {
  variant: FeatureBadgeVariant;
  icon: LucideIcon;
  title: string;
  description: string;
  aside?: React.ReactNode; // Доп. контент справа
}

export function PageFeatureBadge({
  variant,
  icon: Icon,
  title,
  description,
  aside,
}: PageFeatureBadgeProps) {
  const styles = VARIANT_STYLES[variant];

  return (
    <Card className={cn('p-4 glass rounded-3xl', styles.border, styles.bg)}>
      <div className="flex items-center gap-3">
        <div className={cn('p-2 rounded-xl', styles.icon)}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={cn('font-semibold', styles.text)}>{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {aside && <div className="ml-auto">{aside}</div>}
      </div>
    </Card>
  );
}
```

---

### 2️⃣ PageFiltersCard

```tsx
// components/app/PageFiltersCard.tsx
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface PageFiltersCardProps {
  children: React.ReactNode;
  className?: string;
}

export function PageFiltersCard({ children, className }: PageFiltersCardProps) {
  return (
    <Card className={cn(
      'p-4 glass border-border/30 rounded-3xl surface-glow',
      className
    )}>
      {children}
    </Card>
  );
}

// Обёртка для строк фильтров
export function PageFiltersRow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3', className)}>
      {children}
    </div>
  );
}

// Обёртка для дополнительных фильтров
export function PageFiltersAdvanced({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-6 gap-3">
      {children}
    </div>
  );
}
```

---

### 3️⃣ PageContentCard + States

```tsx
// components/app/PageContentCard.tsx
import { RefreshCw, LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PageContentCardProps {
  children: React.ReactNode;
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  emptyState?: {
    icon: LucideIcon;
    title: string;
    description: string;
    action?: {
      label: string;
      onClick: () => void;
    };
  };
  onRetry?: () => void;
  loadingRows?: number;
  className?: string;
}

export function PageContentCard({
  children,
  loading,
  error,
  empty,
  emptyState,
  onRetry,
  loadingRows = 6,
  className,
}: PageContentCardProps) {
  return (
    <Card className={cn(
      'p-0 glass border-border/30 rounded-3xl surface-glow overflow-hidden',
      className
    )}>
      {loading ? (
        <div className="p-6 space-y-3">
          {[...Array(loadingRows)].map((_, i) => (
            <div key={i} className="h-16 bg-surface-1/40 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="p-10 text-center text-destructive">
          <div className="flex items-center justify-center gap-2 mb-3">
            <RefreshCw className="w-5 h-5" />
            <span className="font-medium">Ошибка загрузки</span>
          </div>
          <p className="text-sm mb-4">{error}</p>
          {onRetry && (
            <Button onClick={onRetry} className="rounded-2xl">
              <RefreshCw className="w-4 h-4 mr-2" />
              Повторить
            </Button>
          )}
        </div>
      ) : empty && emptyState ? (
        <div className="p-10 text-center text-muted-foreground">
          <emptyState.icon className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <h3 className="font-semibold mb-2">{emptyState.title}</h3>
          <p className="text-sm mb-4">{emptyState.description}</p>
          {emptyState.action && (
            <Button 
              onClick={emptyState.action.onClick}
              className="rounded-2xl bg-gradient-primary hover:opacity-90"
            >
              {emptyState.action.label}
            </Button>
          )}
        </div>
      ) : (
        children
      )}
    </Card>
  );
}
```

---

### 4️⃣ StatsCard (улучшенный)

```tsx
// components/app/StatsCard.tsx
import { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type StatsCardColor = 'default' | 'blue' | 'emerald' | 'amber' | 'red' | 'purple' | 'cyan';

const COLOR_STYLES: Record<StatsCardColor, {
  bg: string;
  border: string;
  text: string;
  iconBg: string;
}> = {
  default: {
    bg: 'from-surface-1/40 to-surface-2/40',
    border: 'border-border/30',
    text: 'text-muted-foreground',
    iconBg: 'bg-surface-1/40',
  },
  blue: {
    bg: 'from-blue-500/10 to-blue-600/5',
    border: 'border-blue-500/20',
    text: 'text-blue-600 dark:text-blue-400',
    iconBg: 'bg-blue-500/20',
  },
  emerald: {
    bg: 'from-emerald-500/10 to-emerald-600/5',
    border: 'border-emerald-500/20',
    text: 'text-emerald-600 dark:text-emerald-400',
    iconBg: 'bg-emerald-500/20',
  },
  amber: {
    bg: 'from-amber-500/10 to-amber-600/5',
    border: 'border-amber-500/20',
    text: 'text-amber-600 dark:text-amber-400',
    iconBg: 'bg-amber-500/20',
  },
  red: {
    bg: 'from-red-500/10 to-red-600/5',
    border: 'border-red-500/20',
    text: 'text-red-600 dark:text-red-400',
    iconBg: 'bg-red-500/20',
  },
  purple: {
    bg: 'from-purple-500/10 to-purple-600/5',
    border: 'border-purple-500/20',
    text: 'text-purple-600 dark:text-purple-400',
    iconBg: 'bg-purple-500/20',
  },
  cyan: {
    bg: 'from-cyan-500/10 to-cyan-600/5',
    border: 'border-cyan-500/20',
    text: 'text-cyan-600 dark:text-cyan-400',
    iconBg: 'bg-cyan-500/20',
  },
};

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  color?: StatsCardColor;
  highlight?: boolean;
  suffix?: string;
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  color = 'default',
  highlight = false,
  suffix,
}: StatsCardProps) {
  const styles = COLOR_STYLES[color];

  return (
    <Card className={cn(
      'p-4 glass border rounded-2xl bg-gradient-to-br transition-all duration-300 hover:scale-[1.02]',
      styles.bg,
      styles.border,
      highlight && 'animate-pulse'
    )}>
      <div className="flex items-center gap-3">
        <div className={cn('p-2 rounded-xl', styles.iconBg)}>
          <Icon className={cn('w-4 h-4', styles.text)} />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{title}</div>
          <div className="text-lg font-bold">
            {value}
            {suffix && <span className="text-sm ml-1">{suffix}</span>}
          </div>
        </div>
      </div>
    </Card>
  );
}

// Обёртка для grid stats
export function StatsGrid({ children, cols = 4 }: { children: React.ReactNode; cols?: 2 | 4 | 6 }) {
  return (
    <div className={cn(
      'grid gap-4',
      cols === 2 && 'grid-cols-1 md:grid-cols-2',
      cols === 4 && 'grid-cols-2 md:grid-cols-4',
      cols === 6 && 'grid-cols-2 md:grid-cols-6'
    )}>
      {children}
    </div>
  );
}
```

---

### 5️⃣ PaginationControls

```tsx
// components/app/PaginationControls.tsx
import { Button } from '@/components/ui/button';

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  total: number;
  showing: number;
  onPageChange: (page: number) => void;
  itemLabel?: string; // 'автомобилей', 'записей' и тд
}

export function PaginationControls({
  page,
  totalPages,
  total,
  showing,
  onPageChange,
  itemLabel = 'элементов',
}: PaginationControlsProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between">
      <div className="text-sm text-muted-foreground">
        Показано: {showing} из {total} {itemLabel}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          className="rounded-2xl btn-outline-fixed"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          Назад
        </Button>
        <span className="text-sm px-3 py-1 rounded-xl bg-surface-1/60">
          {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          className="rounded-2xl btn-outline-fixed"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Далее
        </Button>
      </div>
    </div>
  );
}
```

---

## 📝 Пример использования - Customers Page

```tsx
// app/dashboard/customers/page.tsx
'use client';

import { useState } from 'react';
import { Users, Plus, RefreshCw, Search } from 'lucide-react';
import { AppLayout } from '@/components/app/AppLayout';
import { PageFeatureBadge } from '@/components/app/PageFeatureBadge';
import { PageFiltersCard, PageFiltersRow } from '@/components/app/PageFiltersCard';
import { PageContentCard } from '@/components/app/PageContentCard';
import { StatsCard, StatsGrid } from '@/components/app/StatsCard';
import { PaginationControls } from '@/components/app/PaginationControls';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);

  const headerActions = (
    <div className="flex items-center gap-2">
      <Button variant="outline" className="rounded-2xl btn-outline-fixed">
        <RefreshCw className="w-4 h-4 mr-2" />
        Обновить
      </Button>
      <Button className="rounded-2xl bg-gradient-primary hover:opacity-90 transition-all duration-300 hover:scale-[1.02]">
        <Plus className="w-4 h-4 mr-2" />
        Новый клиент
      </Button>
    </div>
  );

  return (
    <AppLayout
      title="Клиенты"
      description="База клиентов с историей обслуживания"
      icon={Users}
      actions={headerActions}
    >
      <div className="container mx-auto px-6 py-6 space-y-6">
        
        {/* Feature Badge */}
        <PageFeatureBadge
          variant="pink-rose"
          icon={Users}
          title="CRM клиентов"
          description="Управление базой клиентов, история визитов, лояльность и персонализация обслуживания"
        />

        {/* Filters */}
        <PageFiltersCard>
          <PageFiltersRow>
            <div className="relative">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск по имени, телефону или email"
                className="pl-9 h-10 rounded-2xl border-border/50 focus:border-primary/50 transition-all duration-300"
              />
              <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            </div>
            
            <div className="flex items-center gap-2">
              {/* Дополнительные фильтры */}
            </div>
          </PageFiltersRow>
        </PageFiltersCard>

        {/* Stats */}
        <StatsGrid cols={4}>
          <StatsCard title="Всего клиентов" value={150} icon={Users} color="blue" />
          <StatsCard title="Активных" value={120} icon={Users} color="emerald" />
          <StatsCard title="VIP" value={15} icon={Users} color="purple" />
          <StatsCard title="Новых за месяц" value={8} icon={Users} color="cyan" />
        </StatsGrid>

        {/* Content */}
        <PageContentCard
          loading={loading}
          empty={false}
          emptyState={{
            icon: Users,
            title: 'Клиенты не найдены',
            description: 'Добавьте первого клиента в базу',
            action: {
              label: 'Добавить клиента',
              onClick: () => {},
            },
          }}
        >
          <div className="p-6">
            {/* УНИКАЛЬНЫЙ КОНТЕНТ: таблица, грид клиентов */}
            <p className="text-muted-foreground">Здесь будет таблица или грид клиентов</p>
          </div>
        </PageContentCard>

        {/* Pagination */}
        <PaginationControls
          page={page}
          totalPages={10}
          total={150}
          showing={15}
          onPageChange={setPage}
          itemLabel="клиентов"
        />
      </div>
    </AppLayout>
  );
}
```

---

## ✅ Чеклист стандартизации

Пройдёмся по всем страницам и приведём к единому виду:

- [ ] **Appointments** - уже ОК, добавить компоненты
- [ ] **Vehicles** - уже ОК, добавить компоненты
- [ ] **Services** - уже ОК, добавить компоненты
- [ ] **Customers** - создать с нуля
- [ ] **Orders** - привести к стандарту
- [ ] **Parts** - привести к стандарту
- [ ] **Invoices** - привести к стандарту
- [ ] **Payments** - привести к стандарту
- [ ] **Users** - дополнить компонентами
- [ ] **Platform/Catalogue** - привести к стандарту

---

**Хочешь, я:**
1. Создам все компоненты (PageFeatureBadge, PageFiltersCard и тд)?
2. Обновлю существующие страницы (appointments, vehicles, services)?
3. Создам/обновлю остальные страницы по этому паттерну?

**Или сначала обсудим детали?** Может, есть что-то, что хочешь изменить в подходе? 🎨

и я сейчас остановился на странице "Клиенты" поможешь с продожением обновлением?
