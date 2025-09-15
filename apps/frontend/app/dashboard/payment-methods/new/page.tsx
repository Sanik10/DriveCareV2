// path: apps/frontend/app/dashboard/payment-methods/new/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/hooks/use-auth';

import { CreditCard, ArrowLeft, Home, Save, Lock } from 'lucide-react';
import { paymentMethodsAPI } from '@/lib/api/payment-methods';
import type { PaymentMethodType, PaymentMethodCreateRequest } from '@/lib/types/payment-methods';

const TYPES: { value: PaymentMethodType; label: string }[] = [
  { value: 'cash', label: 'Наличные' },
  { value: 'card', label: 'Банковская карта' },
  { value: 'bank_transfer', label: 'Банковский перевод' },
  { value: 'installments', label: 'Рассрочка' },
  { value: 'corporate', label: 'Корпоративный' },
  { value: 'digital_wallet', label: 'Цифровой кошелёк' },
  { value: 'cryptocurrency', label: 'Криптовалюта' },
];

export default function PaymentMethodCreatePage() {
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const roleName = user?.role?.name || '';
  const canManage = ['company_owner', 'company_admin', 'owner', 'admin'].includes(roleName);

  const [isMounted, setIsMounted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<PaymentMethodType>('card');
  const [processingFeePercent, setProcessingFeePercent] = useState<string>('');
  const [isActive, setIsActive] = useState(true);
  const [requiresVerification, setRequiresVerification] = useState(false);
  const [supportsRefunds, setSupportsRefunds] = useState(true);

  // limits
  const [minAmount, setMinAmount] = useState<string>('');
  const [maxAmount, setMaxAmount] = useState<string>('');
  const [dailyLimit, setDailyLimit] = useState<string>('');

  // installment
  const showInstallment = type === 'installments';
  const [maxPeriodMonths, setMaxPeriodMonths] = useState<string>('');
  const [interestRate, setInterestRate] = useState<string>('');
  const [minDownPaymentPercent, setMinDownPaymentPercent] = useState<string>('');

  // integration
  const [gatewayType, setGatewayType] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [merchantId, setMerchantId] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [testMode, setTestMode] = useState(false);

  useEffect(() => setIsMounted(true), []);
  useEffect(() => {
    if (!isMounted) return;
    if (authLoading) return;
    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }
    // Только owner/admin могут создавать метод
    if (!canManage) {
      router.push('/dashboard/payment-methods');
    }
  }, [isMounted, authLoading, isAuthenticated, user, router, canManage]);

  if (!isMounted) return null;
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }
  if (!isAuthenticated || !user || !canManage) return null;

  const onSubmit = async () => {
    if (!name.trim()) {
      setError('Укажите название способа оплаты');
      return;
    }
    if (!type) {
      setError('Выберите тип способа оплаты');
      return;
    }

    const payload: PaymentMethodCreateRequest = {
      name: name.trim(),
      description: description.trim() || undefined,
      type,
      isActive,
      processingFeePercent: processingFeePercent ? Number(processingFeePercent) : undefined,
      requiresVerification,
      supportsRefunds,
    };

    // limits
    const limits: Record<string, number> = {};
    if (minAmount) limits.minAmount = Number(minAmount);
    if (maxAmount) limits.maxAmount = Number(maxAmount);
    if (dailyLimit) limits.dailyTransactionLimit = Number(dailyLimit);
    if (Object.keys(limits).length > 0) {
      payload.limits = limits;
    }

    // installment (для типа "installments")
    if (showInstallment) {
      const inst: Record<string, number> = {};
      if (maxPeriodMonths) inst.maxPeriodMonths = Number(maxPeriodMonths);
      if (interestRate) inst.interestRate = Number(interestRate);
      if (minDownPaymentPercent) inst.minDownPaymentPercent = Number(minDownPaymentPercent);
      if (Object.keys(inst).length > 0) payload.installmentConfig = inst;
    }

    // integration (при заполнении gatewayType)
    if (gatewayType.trim()) {
      payload.integrationConfig = {
        gatewayType: gatewayType.trim(),
        apiKey: apiKey.trim() || undefined,
        merchantId: merchantId.trim() || undefined,
        webhookUrl: webhookUrl.trim() || undefined,
        testMode,
      };
    }

    setSaving(true);
    setError(null);
    try {
      await paymentMethodsAPI.create(payload);
      router.push('/dashboard/payment-methods');
    } catch (e) {
      try {
        const parsed = JSON.parse((e as Error).message) as { message?: string };
        setError(parsed.message || 'Не удалось создать способ оплаты');
      } catch {
        setError('Не удалось создать способ оплаты');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-surface-1">
      <div className="fixed inset-0 bg-gradient-surface -z-10"></div>
      <div className="fixed top-0 right-0 w-96 h-96 bg-gradient-primary opacity-5 rounded-full blur-3xl -z-10"></div>
      <div className="fixed bottom-0 left-0 w-64 h-64 bg-secondary/10 rounded-full blur-3xl -z-10"></div>

      <header className="border-b border-border/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/dashboard/payment-methods">
              <Button variant="ghost">
                <ArrowLeft className="w-4 h-4 mr-2" /> Назад
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-500/20">
                <CreditCard className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h1 className="text-xl font-bold">Новый способ оплаты</h1>
              {!canManage && (
                <span className="ml-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Lock className="w-3.5 h-3.5" /> Только для администраторов
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard">
              <Button variant="ghost">
                <Home className="w-4 h-4 mr-2" /> В дашборд
              </Button>
            </Link>
            <Button onClick={onSubmit} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              Сохранить
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-6 space-y-6">
        {error && <Card className="p-4 text-destructive">{error}</Card>}

        <Card className="p-6 backdrop-blur-sm bg-card/80 border-border/50 space-y-6">
          {/* Основное */}
          <section>
            <div className="text-lg font-semibold mb-4">Основное</div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground">Название</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Напр., Банковская карта" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Тип</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as PaymentMethodType)}
                  className="w-full h-9 rounded-md border border-border bg-background text-sm px-3"
                >
                  {TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm text-muted-foreground">Описание</label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Опционально" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Комиссия, %</label>
                <Input
                  value={processingFeePercent}
                  onChange={(e) => setProcessingFeePercent(e.target.value)}
                  placeholder="Напр., 2.5"
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input
                  id="isActive"
                  type="checkbox"
                  className="h-4 w-4"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                <label htmlFor="isActive" className="text-sm">
                  Активен
                </label>
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input
                  id="requiresVerification"
                  type="checkbox"
                  className="h-4 w-4"
                  checked={requiresVerification}
                  onChange={(e) => setRequiresVerification(e.target.checked)}
                />
                <label htmlFor="requiresVerification" className="text-sm">
                  Требует верификации
                </label>
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input
                  id="supportsRefunds"
                  type="checkbox"
                  className="h-4 w-4"
                  checked={supportsRefunds}
                  onChange={(e) => setSupportsRefunds(e.target.checked)}
                />
                <label htmlFor="supportsRefunds" className="text-sm">
                  Поддерживает возвраты
                </label>
              </div>
            </div>
          </section>

          {/* Лимиты */}
          <section>
            <div className="text-lg font-semibold mb-4">Лимиты</div>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-muted-foreground">Мин. сумма</label>
                <Input value={minAmount} onChange={(e) => setMinAmount(e.target.value)} placeholder="Напр., 100" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Макс. сумма</label>
                <Input value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} placeholder="Напр., 100000" />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Транзакций в день</label>
                <Input value={dailyLimit} onChange={(e) => setDailyLimit(e.target.value)} placeholder="Напр., 50" />
              </div>
            </div>
          </section>

          {/* Рассрочка */}
          {showInstallment && (
            <section>
              <div className="text-lg font-semibold mb-4">Настройки рассрочки</div>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">Макс. период (мес)</label>
                  <Input value={maxPeriodMonths} onChange={(e) => setMaxPeriodMonths(e.target.value)} placeholder="Напр., 12" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Процентная ставка</label>
                  <Input value={interestRate} onChange={(e) => setInterestRate(e.target.value)} placeholder="Напр., 15" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Мин. первый взнос, %</label>
                  <Input value={minDownPaymentPercent} onChange={(e) => setMinDownPaymentPercent(e.target.value)} placeholder="Напр., 20" />
                </div>
              </div>
            </section>
          )}

          {/* Интеграция */}
          <section>
            <div className="text-lg font-semibold mb-4">Интеграция</div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-muted-foreground">Платёжный шлюз</label>
                <Input
                  value={gatewayType}
                  onChange={(e) => setGatewayType(e.target.value)}
                  placeholder="Напр., yookassa, tinkoff"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </div>
              <div className="flex items-center gap-2 pt-6">
                <input id="testMode" type="checkbox" className="h-4 w-4" checked={testMode} onChange={(e) => setTestMode(e.target.checked)} />
                <label htmlFor="testMode" className="text-sm">Тестовый режим</label>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">API Key</label>
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Опционально"
                  autoComplete="new-password"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Merchant ID</label>
                <Input
                  value={merchantId}
                  onChange={(e) => setMerchantId(e.target.value)}
                  placeholder="Опционально"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm text-muted-foreground">Webhook URL</label>
                <Input
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="Опционально"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </div>
            </div>
          </section>
        </Card>
      </main>
    </div>
  );
}
