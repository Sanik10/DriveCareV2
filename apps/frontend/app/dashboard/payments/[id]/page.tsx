// path: apps/frontend/app/dashboard/payments/[id]/page.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/hooks/use-auth';
import { paymentsAPI } from '@/lib/api/payments';
import type { Payment } from '@/lib/types/payments';
import { toast } from 'sonner';
import {
  ArrowLeft,
  ArrowUpRight,
  RotateCw,
  ReceiptRussianRuble,
  CircleDollarSign,
  Loader2,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

function fmtMoney(amount: number, currency: string) {
  try {
    return amount.toLocaleString('ru-RU', { style: 'currency', currency: currency || 'RUB', currencyDisplay: 'symbol' });
  } catch {
    return `${amount.toFixed(2)} ${currency || 'RUB'}`;
  }
}

function fmtDate(d?: string | Date) {
  if (!d) return '—';
  const dt = typeof d === 'string' ? new Date(d) : d;
  return isNaN(dt.getTime()) ? '-' : dt.toLocaleString('ru-RU');
}

export default function PaymentDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [payment, setPayment] = useState<Payment | null>(null);

  // Роль‑гейтинг для возвратов: owner/admin (включая легаси-алиасы)
  const hasRefundRole = useMemo(() => {
    const role = user?.role?.name || '';
    return role === 'company_owner' || role === 'company_admin' || role === 'owner' || role === 'admin';
  }, [user?.role?.name]);

  const canRefund = hasRefundRole && payment?.status === 'processed';

  // Refund dialog state
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundAmount, setRefundAmount] = useState<string>('');
  const [refundReason, setRefundReason] = useState<string>('Возврат по запросу клиента');
  const [refundNotes, setRefundNotes] = useState<string>('');
  const [refundError, setRefundError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const p = await paymentsAPI.get(id);
        if (!cancelled) {
          setPayment(p);
          // Предзаполним сумму для удобства (полный возврат)
          setRefundAmount(p.amount != null ? String(p.amount) : '');
        }
      } catch (e) {
        toast.error((e as Error)?.message || 'Не удалось загрузить платеж');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, authLoading, isAuthenticated, user, router]);

  const openRefund = () => {
    if (!payment) return;
    setRefundError(null);
    setRefundAmount(payment.amount != null ? String(payment.amount) : '');
    setRefundReason('Возврат по запросу клиента');
    setRefundNotes('');
    setRefundOpen(true);
  };

  const performRefund = async () => {
    if (!payment) return;
    setRefundError(null);

    const amountNum = Number(String(refundAmount).replace(',', '.'));
    if (!isFinite(amountNum) || amountNum <= 0) {
      setRefundError('Некорректная сумма возврата');
      return;
    }
    if (amountNum > Number(payment.amount || 0)) {
      setRefundError('Сумма возврата не может превышать сумму платежа');
      return;
    }

    const reason = refundReason.trim();
    if (reason.length < 3) {
      setRefundError('Причина возврата слишком короткая');
      return;
    }

    setRefundLoading(true);
    try {
      const updated = await paymentsAPI.refund(payment.id, {
        amount: amountNum,
        reason,
        notes: refundNotes?.trim() ? refundNotes.trim() : undefined,
      });
      toast.success('Возврат оформлен');
      setPayment(updated);
      setRefundOpen(false);
    } catch (e) {
      const msg = (e as Error)?.message || 'Не удалось выполнить возврат';
      setRefundError(msg);
      toast.error(msg);
    } finally {
      setRefundLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }
  if (!payment) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-surface-1">
      <div className="fixed inset-0 bg-gradient-surface -z-10" />
      <div className="fixed top-0 right-0 w-96 h-96 bg-gradient-primary opacity-5 rounded-full blur-3xl -z-10" />
      <div className="fixed bottom-0 left-0 w-64 h-64 bg-secondary/10 rounded-full blur-3xl -z-10" />

      <header className="border-b border-border/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard/payments">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-1" />
                Назад
              </Button>
            </Link>
            <div className="p-2 rounded-lg bg-gradient-primary">
              <CircleDollarSign className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Платеж {payment.transactionId || payment.id.slice(0, 8)}
              </h1>
              <p className="text-xs text-muted-foreground">Детали платежа и действия</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canRefund && (
              <Button variant="destructive" onClick={openRefund}>
                <RotateCw className="w-4 h-4 mr-2" />
                Возврат
              </Button>
            )}
            <Link href={`/dashboard/invoices/${payment.invoiceId}`}>
              <Button variant="outline">
                К счету <ArrowUpRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-6 space-y-6">
        {/* Основная информация */}
        <Card className="p-4 backdrop-blur-sm bg-card/80 border-border/50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-muted-foreground">Сумма</div>
              <div className="text-lg font-semibold">{fmtMoney(payment.amount, payment.currency)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Статус</div>
              <div className="text-lg font-semibold">{payment.statusDisplay || payment.status}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Дата</div>
              <div className="text-lg font-semibold">{fmtDate(payment.paymentDate)}</div>
            </div>
          </div>
        </Card>

        {/* Связи */}
        <Card className="p-4 backdrop-blur-sm bg-card/80 border-border/50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-muted-foreground">Счет</div>
              <div className="text-sm">
                <Link className="text-primary hover:underline" href={`/dashboard/invoices/${payment.invoiceId}`}>
                  {payment.invoice?.invoiceNumber || payment.invoiceId}
                </Link>
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Способ оплаты</div>
              <div className="text-sm">{payment.paymentMethod?.name || payment.paymentMethod?.type || '—'}</div>
            </div>
          </div>
        </Card>

        {/* Техническое */}
        <Card className="p-4 backdrop-blur-sm bg-card/80 border-border/50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-muted-foreground">Транзакция</div>
              <div className="text-sm">{payment.transactionId || '—'}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Комиссия шлюза</div>
              <div className="text-sm">{payment.gatewayFee != null ? `${payment.gatewayFee} ₽` : '—'}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Создан</div>
              <div className="text-sm">{fmtDate(payment.createdAt)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Обновлен</div>
              <div className="text-sm">{fmtDate(payment.updatedAt)}</div>
            </div>
          </div>
        </Card>

        {/* Подсказка по чеку */}
        <Card className="p-4 backdrop-blur-sm bg-card/80 border-border/50">
          <div className="flex items-center gap-3 text-sm">
            <ReceiptRussianRuble className="w-4 h-4 text-muted-foreground" />
            <div className="text-muted-foreground">
              Фискальный чек формируется на стороне провайдера (YooKassa). Для спорных ситуаций проверьте статус в ЛК
              провайдера и укажите ссылку на чек в заметках к платежу.
            </div>
          </div>
        </Card>
      </main>

      {/* Refund Dialog */}
      <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Оформить возврат</DialogTitle>
            <DialogDescription>
              Возврат возможен только для подтвержденных платежей. Проверьте сумму и причину возврата.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm text-muted-foreground">Сумма возврата</label>
              <Input
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                inputMode="decimal"
                placeholder={String(payment.amount)}
              />
              <div className="text-xs text-muted-foreground mt-1">
                К возврату доступно: {fmtMoney(payment.amount, payment.currency)}
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Причина</label>
              <Input
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Укажите причину возврата"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Заметки (опционально)</label>
              <textarea
                value={refundNotes}
                onChange={(e) => setRefundNotes(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder="Например, ссылка на чек/комментарий"
              />
            </div>
            {refundError && <div className="text-sm text-destructive">{refundError}</div>}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRefundOpen(false)} disabled={refundLoading}>
              Отмена
            </Button>
            <Button onClick={performRefund} disabled={refundLoading}>
              {refundLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RotateCw className="w-4 h-4 mr-2" />}
              Подтвердить возврат
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
