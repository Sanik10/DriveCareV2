// path: apps/frontend/components/tariffs/TariffPurchaseDialog.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard } from 'lucide-react';
import type { Tariff } from '@/lib/types/tariffs';
import type { BillingPeriod } from '@/lib/types/subscriptions';
import { subscriptionBillingAPI } from '@/lib/api/subscription-billing';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatCurrencyRu } from '@/lib/format';
import { Kbd } from '@/components/ui/kbd';

type PaymentMethod = 'card' | 'mir' | 'sbp' | 'wallet' | 'bank_transfer';

export function TariffPurchaseDialog({
  open,
  onOpenChange,
  tariff,
  initialPeriod = 'monthly',
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tariff: Tariff;
  initialPeriod?: BillingPeriod;
}) {
  const router = useRouter();
  const [period, setPeriod] = useState<BillingPeriod>(initialPeriod);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [pdnConsent, setPdnConsent] = useState(false);
  const [rightsConsent, setRightsConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setPeriod(initialPeriod);
      setPaymentMethod('card');
      setPdnConsent(false);
      setRightsConsent(false);
      setErr(null);
      setLoading(false);
    }
  }, [open, initialPeriod]);

  const price = useMemo(() => {
    return period === 'yearly' ? tariff.priceYearly : tariff.priceMonthly;
  }, [period, tariff.priceMonthly, tariff.priceYearly]);

  const canSubmit = pdnConsent && rightsConsent && !loading;

  async function handleSubmit() {
    try {
      setLoading(true);
      setErr(null);

      const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : undefined;

      const created = await subscriptionBillingAPI.create({
        tariffId: tariff.id,
        billingPeriod: period,
        pdnConsentGiven: pdnConsent,
        consumerRightsAcknowledged: rightsConsent,
        paymentMethod,
        userAgent,
      });

      const pay = await subscriptionBillingAPI.processPayment({
        subscriptionId: created.id,
        paymentMethod,
        metadata: {
          source: 'web',
          ui: 'TariffPurchaseDialog',
          tariffId: tariff.id,
          billingPeriod: period,
        },
      });

      try {
        sessionStorage.setItem('lastPaymentId', pay.paymentId);
      } catch {
        // noop
      }

      if (pay.redirectUrl) {
        window.location.href = pay.redirectUrl;
      } else {
        router.push('/dashboard/billing');
      }
    } catch (e) {
      setErr((e as Error)?.message || 'Ошибка инициации оплаты');
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent glow className="max-w-xl" aria-describedby="purchase-dialog-desc">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-primary flex items-center justify-center text-white">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Подключение тарифа</DialogTitle>
              <DialogDescription id="purchase-dialog-desc">
                Выберите период, подтвердите согласия (ФЗ‑152, права потребителя) и способ оплаты.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <Card className="p-4 rounded-xl glass-subtle border-border/30">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Тариф</div>
                <div className="font-semibold">{tariff.name}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Стоимость ({period === 'yearly' ? 'год' : 'мес'})</div>
                <div className="font-semibold">{formatCurrencyRu(price)}</div>
              </div>
            </div>
          </Card>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Период подписки</div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={period === 'monthly' ? 'default' : 'outline'}
                className={`rounded-xl ${period === 'monthly' ? 'bg-gradient-primary text-white' : ''}`}
                onClick={() => setPeriod('monthly')}
                disabled={loading}
              >
                Месяц
              </Button>
              <Button
                variant={period === 'yearly' ? 'default' : 'outline'}
                className={`rounded-xl ${period === 'yearly' ? 'bg-gradient-primary text-white' : ''}`}
                onClick={() => setPeriod('yearly')}
                disabled={loading}
              >
                Год
              </Button>
            </div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Способ оплаты</div>
            <select
              className="w-full rounded-xl border border-border/50 bg-background p-2 text-sm"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              disabled={loading}
            >
              <option value="card">Банковская карта</option>
              <option value="mir">Карта МИР</option>
              <option value="sbp">СБП</option>
              <option value="wallet">Кошелёк</option>
              <option value="bank_transfer">Банковский перевод</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={pdnConsent}
                onChange={(e) => setPdnConsent(e.target.checked)}
                disabled={loading}
                className="mt-1"
              />
              <span>Согласен на обработку персональных данных (ФЗ‑152)</span>
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={rightsConsent}
                onChange={(e) => setRightsConsent(e.target.checked)}
                disabled={loading}
                className="mt-1"
              />
              <span>Ознакомлен с правами потребителей</span>
            </label>
            <p className="text-xs text-muted-foreground">💡 Автопродление временно недоступно.</p>
          </div>

          {err && <div className="text-sm text-destructive">{err}</div>}
        </div>

        <DialogFooter className="mt-4">
          <div className="hidden sm:flex items-center text-xs text-muted-foreground mr-auto">
            <span className="mr-2">Горячие клавиши:</span>
            <Kbd>Esc</Kbd>
            <span className="ml-1">— Закрыть</span>
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {loading ? 'Инициализация...' : 'Оплатить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
