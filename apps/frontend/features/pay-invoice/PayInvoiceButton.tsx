// path: apps/frontend/features/pay-invoice/PayInvoiceButton.tsx
'use client';

import { useCallback, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { paymentsAPI } from '@/lib/api/payments';
import { paymentMethodsAPI } from '@/lib/api/payment-methods';
import type { PaymentMethodResponse } from '@/lib/types/payment-methods';
import { toast } from 'sonner';
import { CreditCard, Loader2 } from 'lucide-react';

type Props = {
  invoiceId: string;
  amount?: number;
  className?: string;
  children?: React.ReactNode;
  disabled?: boolean;
};

function isOnlineMethod(pm: PaymentMethodResponse): boolean {
  // Считаем "онлайн"-методом тот, у которого есть настроенный gateway (например, YooKassa)
  // и он активен. Это безопасный критерий без предположений о названии type.
  return Boolean(pm?.isActive && pm?.integrationStatus?.isConfigured && pm?.integrationStatus?.gatewayType);
}

export function PayInvoiceButton({ invoiceId, amount, className, children, disabled }: Props) {
  const [loading, setLoading] = useState(false);
  const [selectOpen, setSelectOpen] = useState(false);
  const [methods, setMethods] = useState<PaymentMethodResponse[]>([]);
  const [fetching, setFetching] = useState(false);

  const hasChoices = useMemo(() => (methods?.length || 0) > 1, [methods]);
  const singleMethod = useMemo(() => (methods?.length === 1 ? methods[0] : null), [methods]);

  const startPayment = useCallback(
    async (paymentMethodId?: string) => {
      setLoading(true);
      try {
        const { redirectUrl, paymentId } = await paymentsAPI.initOnline(invoiceId, amount, paymentMethodId);
        try {
          sessionStorage.setItem('lastPaymentId', paymentId);
        } catch {
          // noop
        }
        window.location.href = redirectUrl;
      } catch (e) {
        toast.error((e as Error)?.message || 'Не удалось инициировать оплату');
        setLoading(false);
      }
    },
    [invoiceId, amount]
  );

  const loadMethods = useCallback(async (): Promise<PaymentMethodResponse[]> => {
    setFetching(true);
    try {
      const page = await paymentMethodsAPI.getPaymentMethods({
        isActive: true,
        page: 1,
        limit: 50,
      });
      const items = (page.items || []).filter(isOnlineMethod);
      return items;
    } catch (e) {
      // Не считаем это фатальной ошибкой — можно fallback'ом инициировать оплату без выбора (бэк выберет дефолтный метод)
      return [];
    } finally {
      setFetching(false);
    }
  }, []);

  const onPay = useCallback(async () => {
    if (disabled || loading || fetching) return;

    // 1) Загружаем доступные онлайн-методы (если ещё не загружены)
    let items = methods;
    if (items.length === 0) {
      items = await loadMethods();
      setMethods(items);
    }

    // 2) Ветвим логику
    if (items.length <= 0) {
      // Нет конфигурированных онлайн-методов — пробуем инициировать оплату без указания метода
      // (бэкенд решит, что делать; при ошибке покажем toast)
      await startPayment(undefined);
      return;
    }
    if (items.length === 1) {
      await startPayment(items[0].id);
      return;
    }
    // Несколько — открываем выбор
    setSelectOpen(true);
  }, [disabled, loading, fetching, methods, loadMethods, startPayment]);

  const onChoose = useCallback(
    async (method: PaymentMethodResponse) => {
      setSelectOpen(false);
      await startPayment(method.id);
    },
    [startPayment]
  );

  return (
    <div className="relative inline-block">
      <Button onClick={onPay} className={className} disabled={loading || disabled || fetching}>
        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />}
        {children ?? 'Оплатить онлайн'}
      </Button>

      {selectOpen && hasChoices && (
        <div className="absolute left-0 mt-2 z-50 w-80 rounded-2xl border border-border/30 bg-card/95 backdrop-blur-sm shadow-lg">
          <div className="px-4 py-3 border-b border-border/30">
            <p className="text-sm font-medium">Выберите способ оплаты</p>
            <p className="text-xs text-muted-foreground">
              Найдено {methods.length} онлайн-метода
            </p>
          </div>
          <div className="max-h-80 overflow-auto divide-y divide-border/30">
            {methods.map((m) => (
              <button
                key={m.id}
                className="w-full text-left px-4 py-3 hover:bg-accent/30 transition-colors"
                onClick={() => onChoose(m)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{m.name || 'Метод оплаты'}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {m.integrationStatus?.gatewayType
                        ? `Шлюз: ${m.integrationStatus.gatewayType}${m.integrationStatus.testMode ? ' (test)' : ''}`
                        : m.type}
                    </div>
                  </div>
                  <Button size="sm" className="shrink-0 rounded-xl">
                    Выбрать
                  </Button>
                </div>
              </button>
            ))}
          </div>
          <div className="px-4 py-3 flex items-center justify-between gap-2">
            {singleMethod ? (
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl"
                onClick={() => {
                  setSelectOpen(false);
                  void startPayment(singleMethod.id);
                }}
              >
                Использовать {singleMethod.name}
              </Button>
            ) : (
              <div />
            )}
            <Button
              variant="ghost"
              size="sm"
              className="rounded-xl text-muted-foreground"
              onClick={() => setSelectOpen(false)}
            >
              Отмена
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
