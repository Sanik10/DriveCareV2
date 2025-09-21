// path: apps/frontend/app/dashboard/invoices/new/_client/NewInvoice.client.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AppLayout } from '@/components/app/AppLayout';
import { useAuth } from '@/lib/hooks/use-auth';
import { invoicesAPI } from '@/lib/api/invoices';
import { apiRequest } from '@/lib/api/core';
import { toast } from 'sonner';
import { 
  FileText, 
  Calendar, 
  ReceiptRussianRuble,
  ArrowLeft,
  Plus,
  Percent,
  FileEdit,
  Sparkles,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AsyncCombobox, type AsyncOption } from '@/components/ui/async-combobox';

type OrderLite = {
  id: string;
  orderNumber?: string;
  status?: string;
  description?: string | null;
  createdAt?: string;
  customer?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    companyName?: string | null;
    email?: string | null;
    phone?: string | null;
  };
  vehicle?: {
    id: string;
    licensePlate?: string | null;
    vin?: string | null;
    displayName?: string | null;
  };
  totalAmount?: number;
  discountAmount?: number;
  taxAmount?: number;
  finalAmount?: number;
};

type OrderOption = AsyncOption<OrderLite>;

function fmtMoney(n?: number) {
  if (typeof n !== 'number' || Number.isNaN(n)) return '—';
  try {
    return n.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', currencyDisplay: 'symbol' });
  } catch {
    return `${n.toFixed(2)} ₽`;
  }
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toDateInputValue(d: Date) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export default function NewInvoiceClient() {
  const router = useRouter();
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();

  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form state
  const today = useMemo(() => new Date(), []);
  const defaultDue = useMemo(() => addDays(today, 30), [today]);
  const [dueDate, setDueDate] = useState<string>(toDateInputValue(defaultDue));
  const [notes, setNotes] = useState('');
  const [paymentTermsDays, setPaymentTermsDays] = useState<number>(30);
  const [discountPercent, setDiscountPercent] = useState<number>(0);

  // Order picker
  const [orderOpt, setOrderOpt] = useState<OrderOption | null>(null);
  const order = orderOpt?.meta ?? null;

  useEffect(() => setIsMounted(true), []);

  useEffect(() => {
    if (!isMounted) return;
    if (authLoading) return;
    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }
  }, [isMounted, authLoading, isAuthenticated, user, router]);

  // keep paymentTermsDays in sync with dueDate
  useEffect(() => {
    try {
      const due = new Date(dueDate);
      const ms = due.getTime() - today.getTime();
      const days = Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
      setPaymentTermsDays(days);
    } catch {
      // noop
    }
  }, [dueDate, today]);

  const fetchOrders = async (query: string): Promise<OrderOption[]> => {
    // Ищем завершенные заказы компании; бэкенд фильтры могут отличаться — минимально: search + limit
    const sp = new URLSearchParams();
    if (query && query.trim()) sp.set('search', query.trim());
    sp.set('limit', '10');
    // попытка сузить до "completed" если бэк поддерживает
    sp.set('status', 'completed');
    try {
      const res = await apiRequest<{ items?: OrderLite[] } | OrderLite[]>(
        `/orders?${sp.toString()}`,
        { method: 'GET' }
      );
      const items: OrderLite[] = Array.isArray(res) ? res : res?.items || [];
      return items.map((o) => ({
        id: o.id,
        label: o.orderNumber || o.id.slice(0, 8),
        meta: o,
      }));
    } catch {
      return [];
    }
  };

  const onCreate = async () => {
    if (!order) {
      toast.error('Выберите заказ');
      return;
    }
    if (!dueDate) {
      toast.error('Укажите срок оплаты (Due date)');
      return;
    }
    setLoading(true);
    try {
      const payload = {
        orderId: order.id,
        paymentTermsDays, // будет рассчитан на бэке в dueDate или использован как есть
        discountPercent: discountPercent || undefined,
        notes: notes || undefined,
      };
      const inv = await invoicesAPI.createFromOrder(payload);
      toast.success('Счёт создан');
      router.push(`/dashboard/invoices/${inv.id}`);
    } catch (e) {
      toast.error((e as Error)?.message || 'Не удалось создать счёт');
    } finally {
      setLoading(false);
    }
  };

  if (!isMounted) return null;

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

  if (!isAuthenticated || !user) return null;

  const headerActions = (
    <div className="flex items-center gap-2">
      <Link href="/dashboard/invoices">
        <Button variant="outline" className="rounded-2xl btn-outline-fixed">
          <ArrowLeft className="w-4 h-4 mr-2" />
          К списку
        </Button>
      </Link>
    </div>
  );

  return (
    <AppLayout
      title="Создание счёта"
      description="Создание счёта на основании заказа с настройкой условий оплаты"
      icon={FileText}
      actions={headerActions}
    >
      <div className="container mx-auto px-6 py-6 space-y-6">
        {/* Invoice Creation Feature Badge */}
        <Card className="p-4 glass border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-3xl">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-r from-primary to-secondary">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-primary">Автоматическое создание счетов</h3>
              <p className="text-sm text-muted-foreground">
                Счета генерируются на основе заказов с автоматическим расчетом НДС, скидок и сроков оплаты.
              </p>
            </div>
            <div className="ml-auto">
              <TrendingUp className="w-6 h-6 text-secondary" />
            </div>
          </div>
        </Card>

        {/* Order Selection (без ввода UUID) */}
        <Card className="p-6 glass border-border/30 rounded-3xl surface-glow">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-blue-500/20">
              <FileText className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Выбор заказа</h3>
              <p className="text-sm text-muted-foreground">Найдите завершённый заказ по номеру или клиенту</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
            <div className="md:col-span-4">
              <label className="text-sm font-medium text-muted-foreground block mb-2">Заказ</label>
              <AsyncCombobox<OrderLite>
                value={orderOpt}
                onChange={setOrderOpt}
                fetchOptions={fetchOrders}
                placeholder="Начните вводить номер заказа или имя клиента…"
              />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setOrderOpt(null)}
                className="rounded-2xl btn-outline-fixed"
              >
                Очистить
              </Button>
              <Link href="/dashboard/orders">
                <Button 
                  variant="outline"
                  className="rounded-2xl btn-outline-fixed"
                  title="Открыть список заказов"
                >
                  Перейти к заказам
                </Button>
              </Link>
            </div>
          </div>

          {order && (
            <div className="mt-6 p-4 rounded-2xl border border-border/50 bg-surface-1/30">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <div className="font-medium">Заказ выбран</div>
                  <div className="text-sm text-muted-foreground">
                    {order.orderNumber || order.id.slice(0, 8)}
                  </div>
                </div>
                <div className="ml-auto">
                  <Badge variant="outline" className={cn(
                    order.status === 'completed' ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/30" :
                    order.status === 'in_progress' ? "bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/30" :
                    "bg-surface-1/40 text-muted-foreground border-border/30"
                  )}>
                    {order.status || 'неизвестно'}
                  </Badge>
                </div>
              </div>
              
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Клиент</div>
                  <div className="font-medium">
                    {order.customer?.companyName ||
                      [order.customer?.lastName, order.customer?.firstName].filter(Boolean).join(' ') ||
                      'Неизвестно'}
                  </div>
                  {order.customer?.email && (
                    <div className="text-xs text-muted-foreground">{order.customer.email}</div>
                  )}
                </div>
                
                <div>
                  <div className="text-muted-foreground">Автомобиль</div>
                  <div className="font-medium">
                    {order.vehicle?.displayName || order.vehicle?.licensePlate || 'Неизвестно'}
                  </div>
                  {order.vehicle?.vin && (
                    <div className="text-xs text-muted-foreground">VIN: {order.vehicle.vin}</div>
                  )}
                </div>
                
                <div>
                  <div className="text-muted-foreground">Сумма заказа</div>
                  <div className="font-bold text-lg">{fmtMoney(order.finalAmount)}</div>
                  {order.discountAmount && order.discountAmount > 0 && (
                    <div className="text-xs text-amber-600 dark:text-amber-400">
                      Скидка: {fmtMoney(order.discountAmount)}
                    </div>
                  )}
                </div>
              </div>
              
              {order.description && (
                <div className="mt-3 p-3 rounded-xl bg-surface-1/40 border border-border/30">
                  <div className="text-xs text-muted-foreground mb-1">Описание заказа:</div>
                  <div className="text-sm">{order.description}</div>
                </div>
              )}
            </div>
          )}
        </Card>

        {/* Invoice Settings */}
        <Card className="p-6 glass border-border/30 rounded-3xl surface-glow">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-xl bg-amber-500/20">
              <FileEdit className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Настройки счёта</h3>
              <p className="text-sm text-muted-foreground">Условия оплаты и дополнительные параметры</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-2">Срок оплаты</label>
              <div className="relative">
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="pl-9 h-10 rounded-2xl border-border/50 focus:border-primary/50 transition-all duration-300"
                />
                <Calendar className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                Платёжных дней: <span className="text-foreground font-medium">{paymentTermsDays}</span>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-2">Скидка на счёт (%)</label>
              <div className="relative">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(Number(e.target.value) || 0)}
                  placeholder="0"
                  className="pl-9 h-10 rounded-2xl border-border/50 focus:border-primary/50 transition-all duration-300"
                />
                <Percent className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                Будет применена к общей сумме
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-2">Примечания</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Дополнительная информация к счёту"
                className="w-full h-20 rounded-2xl border border-border/50 bg-background px-3 py-2 text-sm focus:border-primary/50 transition-all duration-300 resize-none"
              />
            </div>
          </div>
        </Card>

        {/* Create Button */}
        <Card className="p-6 glass border-border/30 rounded-3xl surface-glow">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-2xl bg-primary/20">
                <ReceiptRussianRuble className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="font-medium">Готово к созданию</div>
                <div className="text-sm text-muted-foreground">
                  Счёт создаётся на основании заказа и может быть оплачен онлайн после создания
                </div>
              </div>
            </div>
            
            <Button 
              onClick={onCreate} 
              disabled={!order || loading}
              className="rounded-2xl bg-gradient-primary hover:opacity-90 transition-all duration-300 hover:scale-[1.02]"
            >
              {loading ? (
                <span className="w-4 h-4 mr-2 border-2 border-white/60 border-t-white rounded-full animate-spin inline-block" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Создать счёт
            </Button>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
