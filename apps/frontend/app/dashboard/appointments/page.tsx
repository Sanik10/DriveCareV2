// path: apps/frontend/app/dashboard/appointments/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/hooks/use-auth';
import { appointmentsAPI } from '@/lib/api/appointments';
import type {
  Appointment,
  AppointmentPriority,
  AppointmentStatus,
  AppointmentsQuery,
} from '@/lib/types/appointments';
import { APPOINTMENT_PRIORITY_LABELS, APPOINTMENT_STATUS_LABELS } from '@/lib/types/appointments';
import { toast } from 'sonner';
import { CalendarDays, Home, Plus, RefreshCw } from 'lucide-react';
import { AppointmentCreateDialog } from '@/components/appointments/appointment-create-dialog';

function fmtDateTime(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('ru-RU');
}

export default function AppointmentsPage() {
  const { user } = useAuth();

  const canCreate = useMemo(() => {
    const r = user?.role?.name || '';
    return r === 'company_owner' || r === 'company_admin' || r === 'manager' || r === 'owner' || r === 'admin';
  }, [user?.role?.name]);

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Appointment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<AppointmentStatus | ''>('');
  const [priority, setPriority] = useState<AppointmentPriority | ''>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const totalPages = Math.max(1, Math.ceil(total / limit));

  async function loadList(p = page) {
    setLoading(true);
    try {
      const query: AppointmentsQuery = {
        page: p,
        limit,
        search: search.trim() || undefined,
        status: (status || undefined) as AppointmentStatus | undefined,
        priority: (priority || undefined) as AppointmentPriority | undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        sortField: 'startTime',
        sortOrder: 'asc',
      };
      const res = await appointmentsAPI.list(query);
      setItems(res.items || []);
      setTotal(res.total || 0);
    } catch (e) {
      const msg = (e as Error)?.message || 'Не удалось загрузить записи';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadList(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, priority, dateFrom, dateTo]);

  const [openCreate, setOpenCreate] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-surface-1">
      <div className="fixed inset-0 bg-gradient-surface -z-10" />

      <header className="border-b border-border/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/20">
              <CalendarDays className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Записи</h1>
              <p className="text-xs text-muted-foreground">Управление и планирование визитов клиентов</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard">
              <Button variant="ghost">
                <Home className="w-4 h-4 mr-2" /> В дашборд
              </Button>
            </Link>
            <Button variant="outline" onClick={() => loadList()}>
              <RefreshCw className="w-4 h-4 mr-2" /> Обновить
            </Button>
            {canCreate && (
              <Button onClick={() => setOpenCreate(true)}>
                <Plus className="w-4 h-4 mr-2" /> Создать запись
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-6 space-y-6">
        {/* Фильтры */}
        <Card className="p-4 backdrop-blur-sm bg-card/80 border-border/50">
          <div className="grid md:grid-cols-5 gap-3">
            <div className="md:col-span-2">
              <label className="text-xs text-muted-foreground">Поиск</label>
              <div className="flex gap-2">
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Клиент/авто/мастер..."
                />
                <Button
                  variant="secondary"
                  onClick={() => {
                    void loadList(1);
                    setPage(1);
                  }}
                >
                  Найти
                </Button>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Статус</label>
              <select
                className="w-full h-9 rounded-md border border-border bg-background text-sm px-3"
                value={status}
                onChange={(e) => setStatus(e.target.value as AppointmentStatus | '')}
              >
                <option value="">Все</option>
                {(
                  [
                    'DRAFT',
                    'SCHEDULED',
                    'CONFIRMED',
                    'IN_PROGRESS',
                    'COMPLETED',
                    'CANCELED',
                    'NO_SHOW',
                    'RESCHEDULED',
                  ] as AppointmentStatus[]
                ).map((s) => (
                  <option key={s} value={s}>
                    {APPOINTMENT_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Приоритет</label>
              <select
                className="w-full h-9 rounded-md border border-border bg-background text-sm px-3"
                value={priority}
                onChange={(e) => setPriority(e.target.value as AppointmentPriority | '')}
              >
                <option value="">Все</option>
                {(['LOW', 'NORMAL', 'HIGH', 'URGENT'] as AppointmentPriority[]).map((p) => (
                  <option key={p} value={p}>
                    {APPOINTMENT_PRIORITY_LABELS[p]}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-muted-foreground">С даты</label>
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">По дату</label>
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
            </div>
          </div>
        </Card>

        {/* Листинг */}
        <Card className="p-0 overflow-hidden border-border/50">
          <div className="min-h-[200px]">
            {loading ? (
              <div className="p-6 text-sm text-muted-foreground">Загрузка...</div>
            ) : items.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground">Записей не найдено</div>
            ) : (
              <div className="divide-y divide-border/40">
                <div className="hidden md:grid md:grid-cols-8 gap-3 px-4 py-2 text-xs text-muted-foreground bg-muted/20">
                  <div>Дата/время</div>
                  <div>Клиент</div>
                  <div>Авто</div>
                  <div>Механик</div>
                  <div>Статус</div>
                  <div>Приоритет</div>
                  <div>Длительность</div>
                  <div className="text-right pr-2">Действия</div>
                </div>
                {items.map((a) => (
                  <div key={a.id} className="grid md:grid-cols-8 gap-3 px-4 py-3 items-center">
                    <div className="text-sm">
                      <div className="font-medium">
                        {fmtDateTime(a.startTime)} — {fmtDateTime(a.endTime)}
                      </div>
                    </div>
                    <div className="text-sm">{a.customerName || a.customerId}</div>
                    <div className="text-sm truncate">{a.vehicleInfo || a.vehicleId}</div>
                    <div className="text-sm">{a.mechanicName || a.mechanicId}</div>
                    <div className="text-sm">{APPOINTMENT_STATUS_LABELS[a.status]}</div>
                    <div className="text-sm">{APPOINTMENT_PRIORITY_LABELS[a.priority]}</div>
                    <div className="text-sm">{a.estimatedDuration} мин</div>
                    <div className="flex justify-end gap-2">
                      <Button asChild variant="outline" size="sm" className="rounded-xl">
                        <Link href={`/dashboard/appointments/${a.id}`}>Открыть</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Пагинация */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/40">
            <div className="text-xs text-muted-foreground">
              Стр. {page} из {totalPages} • Всего: {total}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const p = Math.max(1, page - 1);
                  setPage(p);
                  void loadList(p);
                }}
                disabled={page <= 1 || loading}
                className="rounded-xl"
              >
                Назад
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const p = Math.min(totalPages, page + 1);
                  setPage(p);
                  void loadList(p);
                }}
                disabled={page >= totalPages || loading}
                className="rounded-xl"
              >
                Вперёд
              </Button>
            </div>
          </div>
        </Card>
      </main>

      {/* Диалог создания */}
      <AppointmentCreateDialog
        open={openCreate}
        onOpenChange={setOpenCreate}
        onCreated={() => {
          // reload current page after create
          void loadList(page);
        }}
      />
    </div>
  );
}
