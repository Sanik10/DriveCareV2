// path: apps/frontend/app/dashboard/billing/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { subscriptionBillingAPI } from '@/lib/api/subscription-billing';
import type { BillingSubscriptionResponse } from '@/lib/types/subscriptions';
import Link from 'next/link';

function fmt(date?: string | Date) {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  return isNaN(d.getTime()) ? '—' : d.toLocaleString('ru-RU');
}

export default function BillingPage() {
  const [sub, setSub] = useState<BillingSubscriptionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [canceling, setCanceling] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      setErr(null);
      const s = await subscriptionBillingAPI.getActive();
      setSub(s);
    } catch (e) {
      setErr((e as Error)?.message || 'Ошибка загрузки подписки');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function cancel() {
    if (!sub) return;
    const ok = window.confirm('Отменить текущую подписку? Действие необратимо.');
    if (!ok) return;
    try {
      setCanceling(true);
      await subscriptionBillingAPI.cancel(sub.id, { reason: 'user_requested' });
      await load();
    } catch (e) {
      setErr((e as Error)?.message || 'Ошибка отмены подписки');
    } finally {
      setCanceling(false);
    }
  }

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Подписка и тариф</h1>
        <Link href="/tariffs">
          <Button variant="outline" className="rounded-2xl btn-outline-fixed">Каталог тарифов</Button>
        </Link>
      </div>

      {loading ? (
        <Card className="p-6 rounded-2xl glass border-border/30">Загрузка…</Card>
      ) : sub ? (
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="p-6 rounded-2xl glass border-border/30">
            <h2 className="font-semibold mb-4">Текущий план</h2>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Тариф</div>
                <div className="font-medium">{sub.tariff?.name || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Статус</div>
                <div className="font-medium">{sub.status}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Период</div>
                <div className="font-medium">{sub.billingPeriod === 'yearly' ? 'Годовой' : 'Месячный'}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Метод оплаты</div>
                <div className="font-medium">{sub.paymentMethod || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Начало</div>
                <div className="font-medium">{fmt(sub.startDate)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Окончание</div>
                <div className="font-medium">{fmt(sub.endDate)}</div>
              </div>
            </div>

            {typeof sub.daysUntilExpiration === 'number' && sub.daysUntilExpiration <= 14 && (
              <div className="mt-4 text-xs text-amber-600">
                Подписка заканчивается через {sub.daysUntilExpiration} дн.
              </div>
            )}

            <div className="mt-6 flex gap-2">
              <Button
                variant="destructive"
                className="rounded-xl"
                onClick={cancel}
                disabled={canceling || sub.status === 'canceled' || sub.status === 'expired'}
              >
                {canceling ? 'Отмена…' : 'Отменить подписку'}
              </Button>
              <Link href="/tariffs">
                <Button variant="outline" className="rounded-xl">Подключить другой тариф</Button>
              </Link>
            </div>
          </Card>

          <Card className="p-6 rounded-2xl glass border-border/30">
            <h2 className="font-semibold mb-4">Доступные лимиты</h2>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">Пользователи</div>
                <div className="font-medium">{sub.tariff?.maxUsers ?? 'без лимита'}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Клиенты</div>
                <div className="font-medium">{sub.tariff?.maxCustomers ?? 'без лимита'}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">ТС</div>
                <div className="font-medium">{sub.tariff?.maxVehicles ?? 'без лимита'}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Заказы</div>
                <div className="font-medium">{sub.tariff?.maxOrders ?? 'без лимита'}</div>
              </div>
            </div>
          </Card>
        </div>
      ) : (
        <Card className="p-6 rounded-2xl glass border-border/30">
          <h2 className="font-semibold mb-2">Подписка отсутствует</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Подключите тариф, чтобы получить доступ ко всем возможностям.
          </p>
          <Link href="/tariffs">
            <Button className="rounded-xl bg-gradient-primary text-white">Выбрать тариф</Button>
          </Link>
        </Card>
      )}

      {err && (
        <div className="text-sm text-destructive">{err}</div>
      )}
    </div>
  );
}
