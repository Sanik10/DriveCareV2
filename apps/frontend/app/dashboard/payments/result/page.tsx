// path: apps/frontend/app/dashboard/payments/result/page.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { paymentsAPI } from '@/lib/api/payments';
import type { Payment } from '@/lib/types/payments';
import { CheckCircle2, XCircle, Loader2, ArrowLeft, ArrowRight } from 'lucide-react';

function fmt(date?: string | Date) {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('ru-RU');
}

function safeClearLastPaymentId(expectedId: string) {
  try {
    const last = sessionStorage.getItem('lastPaymentId');
    if (last && last === expectedId) {
      sessionStorage.removeItem('lastPaymentId');
    }
  } catch {
    // noop
  }
}

export default function PaymentResultPage() {
  const [payment, setPayment] = useState<Payment | null>(null);
  const [status, setStatus] = useState<'pending' | 'ok' | 'fail'>('pending');
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(true);
  const tries = useRef(0);

  const paymentId = useMemo(() => {
    try {
      const url = new URL(window.location.href);
      const q = url.searchParams.get('paymentId');
      if (q) return q;
    } catch {
      // noop
    }
    try {
      return sessionStorage.getItem('lastPaymentId') || '';
    } catch {
      return '';
    }
  }, []);

  useEffect(() => {
    if (!paymentId) {
      setStatus('fail');
      setError('Не найден идентификатор платежа');
      return;
    }
    let cancelled = false;

    const poll = async () => {
      if (cancelled) return;
      try {
        const p = await paymentsAPI.get(paymentId);
        if (cancelled) return;
        setPayment(p);
        if (p.status === 'processed' || p.status === 'refunded' || p.status === 'partially_refunded') {
          setStatus('ok');
          setPolling(false);
          safeClearLastPaymentId(paymentId);
        } else if (p.status === 'failed' || p.status === 'canceled' || p.status === 'expired' || p.status === 'chargeback') {
          setStatus('fail');
          setPolling(false);
          safeClearLastPaymentId(paymentId);
        } else {
          tries.current += 1;
          if (tries.current >= 20) {
            setPolling(false);
          }
        }
      } catch (e) {
        if (!cancelled) {
          setError((e as Error)?.message || 'Ошибка получения статуса платежа');
          setStatus('fail');
          setPolling(false);
          safeClearLastPaymentId(paymentId);
        }
      }
    };

    void poll();
    const t = setInterval(() => void poll(), 3000);

    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [paymentId]);

  const isOk = status === 'ok';
  const isFail = status === 'fail';
  const isPending = status === 'pending' || (polling && !isOk && !isFail);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-surface-1">
      <div className="fixed inset-0 bg-gradient-surface -z-10" />
      <div className="fixed top-0 right-0 w-96 h-96 bg-gradient-primary opacity-5 rounded-full blur-3xl -z-10" />
      <div className="fixed bottom-0 left-0 w-64 h-64 bg-secondary/10 rounded-full blur-3xl -z-10" />
      <main className="container mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/dashboard/invoices">
            <Button variant="ghost" className="rounded-2xl">
              <ArrowLeft className="w-4 h-4 mr-2" />
              К счетам
            </Button>
          </Link>
        </div>

        <Card className="p-8 rounded-3xl glass border-border/30">
          <div className="flex items-center justify-center gap-3 mb-4">
            {isPending && <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />}
            {isOk && <CheckCircle2 className="w-6 h-6 text-emerald-500" />}
            {isFail && <XCircle className="w-6 h-6 text-rose-500" />}
            <h1 className="text-xl font-semibold">
              {isPending && 'Ожидание подтверждения оплаты'}
              {isOk && 'Оплата успешно подтверждена'}
              {isFail && 'Оплата не подтверждена'}
            </h1>
          </div>

          {payment && (
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground text-xs">Платёж</div>
                <div className="font-medium">{payment.transactionId || payment.id}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Сумма</div>
                <div className="font-medium">
                  {payment.amount.toLocaleString('ru-RU', {
                    style: 'currency',
                    currency: payment.currency || 'RUB',
                  })}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Статус</div>
                <div className="font-medium">{payment.statusDisplay || payment.status}</div>
              </div>
              <div>
                <div className="text-muted-foreground text-xs">Обновлён</div>
                <div className="font-medium">{fmt(payment.updatedAt)}</div>
              </div>
            </div>
          )}

          {error && <div className="mt-4 text-sm text-destructive text-center">{error}</div>}

          <div className="mt-6 flex items-center justify-center gap-3">
            {payment?.invoiceId && (
              <Link href={`/dashboard/invoices/${payment.invoiceId}`}>
                <Button className="rounded-2xl">
                  К счёту <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            )}
            <Link href="/dashboard/payments">
              <Button variant="outline" className="rounded-2xl">
                К платежам
              </Button>
            </Link>
          </div>
        </Card>
      </main>
    </div>
  );
}
