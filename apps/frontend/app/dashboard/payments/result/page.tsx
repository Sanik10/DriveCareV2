// path: apps/frontend/app/dashboard/payments/result/page.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { paymentsAPI } from '@/lib/api/payments';
import { subscriptionBillingAPI } from '@/lib/api/subscription-billing';
import type { Payment } from '@/lib/types/payments';
import type { BillingSubscriptionResponse } from '@/lib/types/subscriptions';
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

function getQueryParam(name: string): string | null {
  try {
    const url = new URL(window.location.href);
    return url.searchParams.get(name);
  } catch {
    return null;
  }
}

export default function PaymentResultPage() {
  const [context, setContext] = useState<'invoice' | 'subscription'>('invoice');

  // Invoice (legacy) state
  const [payment, setPayment] = useState<Payment | null>(null);

  // Subscription state
  const [subscription, setSubscription] = useState<BillingSubscriptionResponse | null>(null);

  // Common UI state
  const [status, setStatus] = useState<'pending' | 'ok' | 'fail'>('pending');
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(true);
  const tries = useRef(0);

  const paymentId = useMemo(() => {
    try {
      const q = getQueryParam('paymentId');
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
    const ctx = (getQueryParam('context') || '').toLowerCase();
    setContext(ctx === 'subscription' ? 'subscription' : 'invoice');
  }, []);

  useEffect(() => {
    let cancelled = false;

    // Subscription flow polling: check active subscription
    const pollSubscription = async () => {
      try {
        const sub = await subscriptionBillingAPI.getActive();
        if (cancelled) return;

        if (sub && sub.status === 'active') {
          setSubscription(sub);
          setStatus('ok');
          setPolling(false);
          if (paymentId) safeClearLastPaymentId(paymentId);
          return;
        }

        tries.current += 1;
        if (tries.current >= 30) {
          // 30 * 2s = ~60s ожидания — дальше считаем, что обработка продолжается
          setPolling(false);
          setStatus('pending');
          return;
        }
      } catch (e) {
        if (!cancelled) {
          setError((e as Error)?.message || 'Ошибка проверки статуса подписки');
          setStatus('fail');
          setPolling(false);
          if (paymentId) safeClearLastPaymentId(paymentId);
        }
      }
    };

    // Invoice flow polling: check payment status by id
    const pollInvoicePayment = async () => {
      if (!paymentId) {
        setStatus('fail');
        setError('Не найден идентификатор платежа');
        setPolling(false);
        return;
      }
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

    // Initial fire and interval
    if (context === 'subscription') {
      void pollSubscription();
      const t = setInterval(() => void pollSubscription(), 2000);
      return () => {
        cancelled = true;
        clearInterval(t);
      };
    } else {
      void pollInvoicePayment();
      const t = setInterval(() => void pollInvoicePayment(), 3000);
      return () => {
        cancelled = true;
        clearInterval(t);
      };
    }
  }, [context, paymentId]);

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
          <Link href={context === 'subscription' ? '/dashboard/billing' : '/dashboard/invoices'}>
            <Button variant="ghost" className="rounded-2xl">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {context === 'subscription' ? 'К подписке' : 'К счетам'}
            </Button>
          </Link>
        </div>

        <Card className="p-8 rounded-3xl glass border-border/30">
          <div className="flex items-center justify-center gap-3 mb-4">
            {isPending && <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />}
            {isOk && <CheckCircle2 className="w-6 h-6 text-emerald-500" />}
            {isFail && <XCircle className="w-6 h-6 text-rose-500" />}
            <h1 className="text-xl font-semibold">
              {isPending && (context === 'subscription' ? 'Ожидание подтверждения оплаты подписки' : 'Ожидание подтверждения оплаты')}
              {isOk && (context === 'subscription' ? 'Подписка активирована' : 'Оплата успешно подтверждена')}
              {isFail && (context === 'subscription' ? 'Оплата подписки не подтверждена' : 'Оплата не подтверждена')}
            </h1>
          </div>

          {/* Subscription context view */}
          {context === 'subscription' && (
            <div className="space-y-4 text-sm text-center">
              {subscription && (
                <div className="grid sm:grid-cols-2 gap-4 text-left">
                  <div>
                    <div className="text-muted-foreground text-xs">Тариф</div>
                    <div className="font-medium">{subscription.tariff?.name || '—'}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">Период</div>
                    <div className="font-medium">{subscription.billingPeriod === 'yearly' ? 'Годовой' : 'Месячный'}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">Начало</div>
                    <div className="font-medium">{fmt(subscription.startDate)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground text-xs">Окончание</div>
                    <div className="font-medium">{fmt(subscription.endDate)}</div>
                  </div>
                </div>
              )}

              {error && <div className="text-sm text-destructive">{error}</div>}

              <div className="mt-4 flex items-center justify-center gap-3">
                <Link href="/dashboard/billing">
                  <Button className="rounded-2xl">
                    К подписке <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
                <Link href="/tariffs">
                  <Button variant="outline" className="rounded-2xl">
                    Каталог тарифов
                  </Button>
                </Link>
              </div>

              {isPending && !subscription && !error && (
                <p className="text-xs text-muted-foreground mt-2">
                  Платёж обрабатывается провайдером. Если подписка не отобразилась автоматически, проверьте позже на странице “Подписка”.
                </p>
              )}
            </div>
          )}

          {/* Invoice (default) view */}
          {context === 'invoice' && payment && (
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

          {context === 'invoice' && !payment && error && (
            <div className="mt-4 text-sm text-destructive text-center">{error}</div>
          )}

          <div className="mt-6 flex items-center justify-center gap-3">
            {context === 'invoice' && payment?.invoiceId && (
              <Link href={`/dashboard/invoices/${payment.invoiceId}`}>
                <Button className="rounded-2xl">
                  К счёту <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            )}
            <Link href={context === 'subscription' ? '/dashboard/billing' : '/dashboard/payments'}>
              <Button variant="outline" className="rounded-2xl">
                {context === 'subscription' ? 'К подписке' : 'К платежам'}
              </Button>
            </Link>
          </div>
        </Card>
      </main>
    </div>
  );
}
