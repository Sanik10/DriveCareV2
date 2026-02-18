// path: apps/frontend/app/dashboard/payment-methods/page.tsx
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/app/AppLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/hooks/use-auth';
import { paymentMethodsAPI } from '@/lib/api/payment-methods';
import type { PaymentMethodResponse } from '@/lib/types/payment-methods';
import { cn } from '@/lib/utils';
import { 
  CreditCard, 
  Plus, 
  RefreshCw, 
  Settings,
  DollarSign,
  Bitcoin,
  Banknote,
  Smartphone,
  Zap,
  CheckCircle,
  AlertTriangle,
  Building
} from 'lucide-react';

const METHOD_ICONS = {
  cash: Banknote,
  card: CreditCard,
  bank_transfer: DollarSign,
  digital_wallet: Smartphone,
  cryptocurrency: Bitcoin,
  installments: CreditCard,
  corporate: Building,
} as const;

const METHOD_COLORS = {
  cash: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: 'text-emerald-500' },
  card: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', icon: 'text-blue-500' },
  bank_transfer: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', icon: 'text-indigo-500' },
  digital_wallet: { bg: 'bg-purple-500/10', border: 'border-purple-500/20', icon: 'text-purple-500' },
  cryptocurrency: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: 'text-amber-500' },
  installments: { bg: 'bg-teal-500/10', border: 'border-teal-500/20', icon: 'text-teal-500' },
  corporate: { bg: 'bg-slate-500/10', border: 'border-slate-500/20', icon: 'text-slate-500' },
} as const;

function requiresIntegration(type?: string): boolean {
  const t = String(type || '').toLowerCase();
  return t === 'card' || t === 'digital_wallet' || t === 'cryptocurrency';
}

export default function PaymentMethodsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<PaymentMethodResponse[]>([]);
  const [error, setError] = useState<string | null>(null);

  const roleName = user?.role?.name || '';
  const canCreate = ['company_owner', 'company_admin'].includes(roleName);
  const canToggle = canCreate;
  const canTest = ['company_owner', 'company_admin', 'manager'].includes(roleName);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await paymentMethodsAPI.getPaymentMethods({});
      setItems(res.items || []);
    } catch (e: unknown) {
      setError((e as Error)?.message || 'Не удалось загрузить способы оплаты');
    } finally {
      setLoading(false);
    }
  }, []);

  const goToCreate = useCallback(() => {
    router.push('/dashboard/payment-methods/new');
  }, [router]);

  const goToDetails = useCallback((id: string) => {
    router.push(`/dashboard/payment-methods/${id}`);
  }, [router]);

  const toggleMethod = useCallback(async (id: string) => {
    if (!canToggle) return;
    try {
      const updated = await paymentMethodsAPI.toggleStatus(id);
      setItems(prev => prev.map(item => item.id === id ? updated : item));
    } catch (e: unknown) {
      alert((e as Error)?.message || 'Не удалось изменить статус способа оплаты');
    }
  }, [canToggle]);

  const testPayment = useCallback(async (id: string) => {
    if (!canTest) return;
    try {
      const result = await paymentMethodsAPI.testIntegration(id);
      if (result.ok) {
        alert(`✅ ${result.message || 'Интеграция работает корректно'}`);
      } else {
        alert(`⚠️ ${result.message || 'Обнаружены проблемы с интеграцией'}`);
      }
    } catch (e: unknown) {
      alert((e as Error)?.message || 'Ошибка тестирования интеграции');
    }
  }, [canTest]);

  useEffect(() => {
    load();
  }, [load]);

  const configuredCount = useMemo(() => {
    return items.filter((item) => requiresIntegration(item.type) ? item.integrationStatus?.isConfigured === true : true).length;
  }, [items]);

  const headerActions = (
    <div className="flex items-center gap-2">
      <Button variant="outline" onClick={load} className="rounded-2xl btn-outline-fixed">
        <RefreshCw className="w-4 h-4 mr-2" />
        Обновить
      </Button>
      {canCreate && (
        <Button className="rounded-2xl bg-gradient-primary hover:opacity-90 transition-all duration-300 hover:scale-[1.02]" onClick={goToCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Добавить метод
        </Button>
      )}
    </div>
  );

  return (
    <AppLayout
      title="Способы оплаты"
      description="Интерактивные переключатели методов оплаты"
      icon={CreditCard}
      actions={headerActions}
    >
      <div className="container mx-auto px-6 py-6 space-y-6">
        <Card className="p-4 glass border-purple-500/20 bg-gradient-to-r from-purple-500/5 to-primary/5 rounded-3xl">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-r from-purple-500 to-primary">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-purple-600 dark:text-purple-400">Интерактивные переключатели методов</h3>
              <p className="text-sm text-muted-foreground">Настраивайте доступные способы и проверяйте интеграции онлайн-оплат.</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/30">
                <CheckCircle className="w-3 h-3 mr-1" />
                Активно
              </Badge>
              <Badge variant="outline" className="bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/30">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Отключено
              </Badge>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            [...Array(6)].map((_, i) => (
              <Card key={i} className="p-6 glass border-border/30 rounded-3xl">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-surface-1/40 rounded-2xl animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-surface-1/40 rounded animate-pulse" />
                      <div className="h-3 bg-surface-1/40 rounded animate-pulse w-2/3" />
                    </div>
                  </div>
                  <div className="h-10 bg-surface-1/40 rounded-xl animate-pulse" />
                </div>
              </Card>
            ))
          ) : error ? (
            <div className="col-span-full p-8 text-center">
              <div className="flex items-center justify-center gap-3 text-destructive mb-4">
                <AlertTriangle className="w-6 h-6" />
                <p className="text-lg font-medium">{error}</p>
              </div>
              <Button onClick={load} className="rounded-2xl">
                <RefreshCw className="w-4 h-4 mr-2" />
                Повторить
              </Button>
            </div>
          ) : items.length === 0 ? (
            <div className="col-span-full p-10 text-center text-muted-foreground">
              <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h3 className="font-semibold mb-2">Способы оплаты не найдены</h3>
              <p className="text-sm mb-4">Добавьте первый способ оплаты для приёма платежей</p>
              {canCreate && (
                <Button className="rounded-2xl bg-gradient-primary hover:opacity-90" onClick={goToCreate}>
                  <Plus className="w-4 h-4 mr-2" />
                  Добавить метод
                </Button>
              )}
            </div>
          ) : (
            items.map((method) => (
              <PaymentMethodCard 
                key={method.id}
                method={method}
                canToggle={canToggle}
                canTest={canTest}
                onToggle={toggleMethod}
                onTest={testPayment}
                onConfigure={() => goToDetails(method.id)}
              />
            ))
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 glass border-border/30 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/20">
                <CreditCard className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Всего методов</div>
                <div className="text-xl font-bold">{items.length}</div>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 glass border-border/30 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/20">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Активных</div>
                <div className="text-xl font-bold">
                  {items.filter(item => item.isActive).length}
                </div>
              </div>
            </div>
          </Card>
          
          <Card className="p-4 glass border-border/30 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/20">
                <Settings className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Настроенных</div>
                <div className="text-xl font-bold">{configuredCount}</div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}

function PaymentMethodCard({
  method,
  canToggle,
  canTest,
  onToggle,
  onTest,
  onConfigure,
}: {
  method: PaymentMethodResponse;
  canToggle: boolean;
  canTest: boolean;
  onToggle: (id: string) => void;
  onTest: (id: string) => void;
  onConfigure: () => void;
}) {
  const IconComponent = METHOD_ICONS[method.type as keyof typeof METHOD_ICONS] || CreditCard;
  const colors = METHOD_COLORS[method.type as keyof typeof METHOD_COLORS] || METHOD_COLORS.card;

  const [isToggling, setIsToggling] = useState(false);

  const handleToggle = async (checked: boolean) => {
    if (!canToggle || isToggling || checked === method.isActive) return;
    setIsToggling(true);
    try {
      await onToggle(method.id);
    } finally {
      setTimeout(() => setIsToggling(false), 300);
    }
  };

  const needsIntegration = requiresIntegration(method.type as string);
  const isConfigured = needsIntegration ? method.integrationStatus?.isConfigured === true : true;
  const isTestMode = needsIntegration ? !!method.integrationStatus?.testMode : false;

  return (
    <Card className={cn(
      "p-6 glass border-border/30 rounded-3xl transition-all duration-500 hover:scale-[1.02] group",
      "hover:shadow-glass-lg hover:-translate-y-1",
      method.isActive && "ring-1 ring-primary/20 bg-primary/5"
    )}>
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className={cn("p-3 rounded-2xl transition-all duration-300 group-hover:scale-105", colors.bg, colors.border, "border")}>
            <IconComponent className={cn("w-6 h-6", colors.icon)} />
          </div>
          <div>
            <h3 className="font-semibold text-lg">{method.name}</h3>
            <p className="text-sm text-muted-foreground">{method.description}</p>
          </div>
        </div>
        <div className={cn("w-3 h-3 rounded-full transition-all duration-300", method.isActive ? "bg-emerald-500 shadow-lg shadow-emerald-500/30" : "bg-muted", method.isActive && "animate-pulse")} />
      </div>

      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant={isConfigured ? "default" : "secondary"} className="text-xs">
            {isConfigured ? (<><CheckCircle className="w-3 h-3 mr-1" /> Настроен</>) : (<><Settings className="w-3 h-3 mr-1" /> Требует настройки</>)}
          </Badge>
          {method.processingFeePercent ? (
            <Badge variant="outline" className="text-xs">Комиссия: {method.processingFeePercent}%</Badge>
          ) : null}
          {isTestMode && (
            <Badge variant="outline" className="text-xs bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/30">
              Тест
            </Badge>
          )}
        </div>

        {method.limits && (
          <div className="text-xs text-muted-foreground">
            Лимиты: {method.limits.minAmount || 0} — {method.limits.maxAmount || '∞'} ₽
          </div>
        )}
      </div>

      <div className="flex items-center justify-between p-3 rounded-2xl bg-surface-1/40 mb-4">
        <div className="flex items-center gap-2">
          <Zap className={cn("w-4 h-4 transition-colors duration-300", method.isActive ? "text-primary" : "text-muted-foreground")} />
          <span className="text-sm font-medium">{method.isActive ? 'Активен' : 'Отключен'}</span>
        </div>
        <Switch checked={method.isActive} onCheckedChange={handleToggle} disabled={!canToggle || isToggling} className={cn("transition-all duration-300", isToggling && "opacity-50")} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm" className="rounded-xl text-xs" onClick={onConfigure}>
          <Settings className="w-3 h-3 mr-1" />
          Настроить
        </Button>
        <Button variant="outline" size="sm" className="rounded-xl text-xs" disabled={!canTest || !needsIntegration || !isConfigured} onClick={() => onTest(method.id)}>
          <Zap className="w-3 h-3 mr-1" />
          Тест
        </Button>
      </div>

      {method.isActive && (
        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/20 via-secondary/20 to-accent/20 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10" />
      )}
    </Card>
  );
}
