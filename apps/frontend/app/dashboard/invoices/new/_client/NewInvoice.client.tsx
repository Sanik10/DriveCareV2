// path: apps/frontend/app/dashboard/invoices/new/_client/NewInvoice.client.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/hooks/use-auth';
import { apiRequest } from '@/lib/api/core';
import { invoicesAPI } from '@/lib/api/invoices';
import { toast } from 'sonner';
import { FileText, RefreshCw, Link as LinkIcon, Calendar, ReceiptRussianRuble } from 'lucide-react';

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
  const [orderIdInput, setOrderIdInput] = useState('');
  const [order, setOrder] = useState<OrderLite | null>(null);

  const today = useMemo(() => new Date(), []);
  const defaultDue = useMemo(() => addDays(today, 30), [today]);

  const [dueDate, setDueDate] = useState<string>(toDateInputValue(defaultDue));
  const [notes, setNotes] = useState('');
  const [paymentTermsDays, setPaymentTermsDays] = useState<number>(30);
  const [discountPercent, setDiscountPercent] = useState<number>(0);

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

  const onLoadOrder = async () => {
    if (!orderIdInput.trim()) {
      toast.error('Укажите ID заказа');
      return;
    }
    setLoading(true);
    try {
      const o = await apiRequest<OrderLite>(`/orders/${orderIdInput.trim()}`, { method: 'GET' });
      setOrder(o);
      toast.success('Заказ найден');
    } catch (e) {
      const msg = (e as Error)?.message || 'Не удалось загрузить заказ';
      toast.error(msg);
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  const onCreate = async () => {
    if (!order) {
      toast.error('Сначала загрузите заказ');
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
      // навигация на созданный счёт
      router.push(`/dashboard/invoices/${inv.id}`);
    } catch (e) {
      toast.error((e as Error)?.message || 'Не удалось создать счёт');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header inside client for SSR-friendly page wrapper */}
      <header className="border-b border-border/50 backdrop-blur-sm rounded-md">
        <div className="px-0 md:px-2 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-primary">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold bg-gradient-primary bg-clip-text text-transparent">Новый счёт</h2>
              <p className="text-xs text-muted-foreground">Создание счёта на основании заказа</p>
            </div>
          </div>
        </div>
      </header>

      {/* Order picker */}
      <Card className="p-4 backdrop-blur-sm bg-card/80 border-border/50">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
          <div className="md:col-span-4">
            <label className="text-xs text-muted-foreground block mb-1">ID заказа</label>
            <div className="relative">
              <Input
                value={orderIdInput}
                onChange={(e) => setOrderIdInput(e.target.value)}
                placeholder="Введите UUID заказа"
                className="pl-9"
              />
              <LinkIcon className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
            </div>
          </div>
          <div className="md:col-span-2 flex gap-2">
            <Button variant="outline" onClick={() => setOrderIdInput('')}>
              Очистить
            </Button>
            <Button onClick={onLoadOrder} disabled={loading}>
              {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <LinkIcon className="w-4 h-4 mr-2" />}
              Загрузить
            </Button>
          </div>
        </div>

        {order && (
          <div className="mt-4 rounded-md border border-border/50 p-3 text-sm">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <span className="text-muted-foreground">Заказ: </span>
                <span className="font-medium">{order.orderNumber || order.id.slice(0, 8)}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Статус: </span>
                <span className="font-medium">{order.status || '—'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Клиент: </span>
                <span className="font-medium">
                  {order.customer?.companyName ||
                    [order.customer?.lastName, order.customer?.firstName].filter(Boolean).join(' ') ||
                    '—'}
                </span>
              </div>
              <div className="text-muted-foreground">
                Сумма заказа: <span className="font-medium text-foreground">{fmtMoney(order.finalAmount)}</span>
              </div>
            </div>
            {order.description ? (
              <div className="mt-2 text-xs text-muted-foreground">Описание: {order.description}</div>
            ) : null}
          </div>
        )}
      </Card>

      {/* Invoice settings */}
      <Card className="p-4 backdrop-blur-sm bg-card/80 border-border/50">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="md:col-span-2">
            <label className="text-xs text-muted-foreground block mb-1">Срок оплаты (Due date)</label>
            <div className="relative">
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="pl-9"
              />
              <Calendar className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Платёжных дней: <span className="text-foreground font-medium">{paymentTermsDays}</span>
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-muted-foreground block mb-1">Скидка на счёт (%)</label>
            <Input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={discountPercent}
              onChange={(e) => setDiscountPercent(Number(e.target.value) || 0)}
              placeholder="0"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-muted-foreground block mb-1">Примечания</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Дополнительная информация к счёту"
              className="w-full h-24 rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>
      </Card>

      {/* Submit */}
      <Card className="p-4 backdrop-blur-sm bg-card/80 border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ReceiptRussianRuble className="w-4 h-4" />
            Счёт создаётся на основании заказа и может быть оплачен онлайн (YooKassa) после создания.
          </div>
          <Button onClick={onCreate} disabled={!order || loading}>
            {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
            Создать счёт
          </Button>
        </div>
      </Card>
    </div>
  );
}
