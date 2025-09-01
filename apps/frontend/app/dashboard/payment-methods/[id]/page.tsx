// path: apps/frontend/app/dashboard/payment-methods/[id]/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useAuth } from "@/lib/hooks/use-auth";

import { CreditCard, ArrowLeft, Home, RefreshCw, Save, Power, Trash2 } from "lucide-react";
import { paymentMethodsAPI } from "@/lib/api/payment-methods";
import type {
  PaymentMethodResponse,
  PaymentMethodType,
  PaymentMethodUpdateRequest,
} from "@/lib/types/payment-methods";

const TYPES: { value: PaymentMethodType; label: string }[] = [
  { value: "cash", label: "Наличные" },
  { value: "card", label: "Банковская карта" },
  { value: "bank_transfer", label: "Банковский перевод" },
  { value: "installments", label: "Рассрочка" },
  { value: "corporate", label: "Корпоративный" },
  { value: "digital_wallet", label: "Цифровой кошелёк" },
  { value: "cryptocurrency", label: "Криптовалюта" },
];

export default function PaymentMethodEditPage() {
  const params = useParams<{ id: string }>();
  const id = useMemo(() => (Array.isArray(params?.id) ? params.id[0] : params?.id) as string, [params]);
  const router = useRouter();
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();

  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [method, setMethod] = useState<PaymentMethodResponse | null>(null);

  // form
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<PaymentMethodType>("card");
  const [processingFeePercent, setProcessingFeePercent] = useState<string>("");
  const [isActive, setIsActive] = useState(true);
  const [requiresVerification, setRequiresVerification] = useState(false);
  const [supportsRefunds, setSupportsRefunds] = useState(true);

  // limits
  const [minAmount, setMinAmount] = useState<string>("");
  const [maxAmount, setMaxAmount] = useState<string>("");
  const [dailyLimit, setDailyLimit] = useState<string>("");

  // installment
  const showInstallment = type === "installments";
  const [maxPeriodMonths, setMaxPeriodMonths] = useState<string>("");
  const [interestRate, setInterestRate] = useState<string>("");
  const [minDownPaymentPercent, setMinDownPaymentPercent] = useState<string>("");

  // integration (секреты могут не приходить в ответе — оставляем пустыми)
  const [gatewayType, setGatewayType] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [merchantId, setMerchantId] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [testMode, setTestMode] = useState(false);

  useEffect(() => setIsMounted(true), []);
  useEffect(() => {
    if (!isMounted) return;
    if (authLoading) return;
    if (!isAuthenticated || !user) {
      router.push("/login");
      return;
    }
    if (!id) return;

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const m = await paymentMethodsAPI.getPaymentMethod(id);
        if (cancelled) return;
        setMethod(m);
        // fill form
        setName(m.name || "");
        setDescription(m.description || "");
        setType((m.type as PaymentMethodType) || "card");
        setProcessingFeePercent(
          typeof m.processingFeePercent === "number" ? String(m.processingFeePercent) : ""
        );
        setIsActive(!!m.isActive);
        setRequiresVerification(!!m.requiresVerification);
        setSupportsRefunds(m.supportsRefunds !== false);

        setMinAmount(m.limits?.minAmount != null ? String(m.limits.minAmount) : "");
        setMaxAmount(m.limits?.maxAmount != null ? String(m.limits.maxAmount) : "");
        setDailyLimit(
          m.limits?.dailyTransactionLimit != null ? String(m.limits.dailyTransactionLimit) : ""
        );

        if (m.installmentConfig) {
          setMaxPeriodMonths(
            m.installmentConfig.maxPeriodMonths != null ? String(m.installmentConfig.maxPeriodMonths) : ""
          );
          setInterestRate(
            m.installmentConfig.interestRate != null ? String(m.installmentConfig.interestRate) : ""
          );
          setMinDownPaymentPercent(
            m.installmentConfig.minDownPaymentPercent != null
              ? String(m.installmentConfig.minDownPaymentPercent)
              : ""
          );
        }

        if (m.integrationStatus) {
          setGatewayType(m.integrationStatus.gatewayType || "");
          setTestMode(!!m.integrationStatus.testMode);
        }
      } catch (e) {
        try {
          const parsed = JSON.parse((e as Error).message) as { message?: string };
          setError(parsed.message || "Ошибка загрузки способа оплаты");
        } catch {
          setError("Ошибка загрузки способа оплаты");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isMounted, authLoading, isAuthenticated, user, router, id]);

  if (!isMounted) return null;
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }
  if (!isAuthenticated || !user) return null;

  const handleRefresh = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const m = await paymentMethodsAPI.getPaymentMethod(id);
      setMethod(m);
    } finally {
      setLoading(false);
    }
  };

  const onSave = async () => {
    if (!id) return;
    if (!name.trim()) {
      setError("Укажите название");
      return;
    }
    const payload: PaymentMethodUpdateRequest = {
      name: name.trim(),
      description: description.trim() || undefined,
      type,
      isActive,
      processingFeePercent: processingFeePercent ? Number(processingFeePercent) : undefined,
      requiresVerification,
      supportsRefunds,
    };

    const limits: Record<string, number> = {};
    if (minAmount) limits.minAmount = Number(minAmount);
    if (maxAmount) limits.maxAmount = Number(maxAmount);
    if (dailyLimit) limits.dailyTransactionLimit = Number(dailyLimit);
    if (Object.keys(limits).length > 0) payload.limits = limits;

    if (showInstallment) {
      const inst: Record<string, number> = {};
      if (maxPeriodMonths) inst.maxPeriodMonths = Number(maxPeriodMonths);
      if (interestRate) inst.interestRate = Number(interestRate);
      if (minDownPaymentPercent) inst.minDownPaymentPercent = Number(minDownPaymentPercent);
      if (Object.keys(inst).length > 0) payload.installmentConfig = inst;
    }

    if (gatewayType.trim() || apiKey.trim() || merchantId.trim() || webhookUrl.trim()) {
      payload.integrationConfig = {
        gatewayType: gatewayType.trim() || (method?.integrationStatus?.gatewayType || ""),
        apiKey: apiKey.trim() || undefined,
        merchantId: merchantId.trim() || undefined,
        webhookUrl: webhookUrl.trim() || undefined,
        testMode,
      };
    }

    setSaving(true);
    setError(null);
    try {
      await paymentMethodsAPI.update(id, payload);
      router.push("/dashboard/payment-methods");
    } catch (e) {
      try {
        const parsed = JSON.parse((e as Error).message) as { message?: string };
        setError(parsed.message || "Не удалось обновить способ оплаты");
      } catch {
        setError("Не удалось обновить способ оплаты");
      }
    } finally {
      setSaving(false);
    }
  };

  const onToggle = async () => {
    if (!id) return;
    setToggling(true);
    setError(null);
    try {
      const updated = await paymentMethodsAPI.toggleStatus(id);
      setIsActive(!!updated.isActive);
    } catch (e) {
      try {
        const parsed = JSON.parse((e as Error).message) as { message?: string };
        setError(parsed.message || "Не удалось изменить статус");
      } catch {
        setError("Не удалось изменить статус");
      }
    } finally {
      setToggling(false);
    }
  };

  const onDelete = async () => {
    if (!id) return;
    setDeleting(true);
    setError(null);
    try {
      await paymentMethodsAPI.remove(id);
      router.push("/dashboard/payment-methods");
    } catch (e) {
      try {
        const parsed = JSON.parse((e as Error).message) as { message?: string };
        setError(parsed.message || "Не удалось удалить способ оплаты");
      } catch {
        setError("Не удалось удалить способ оплаты");
      }
    } finally {
      setDeleting(false);
      setOpenDelete(false);
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
              <h1 className="text-xl font-bold">
                Редактирование способа оплаты
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard">
              <Button variant="ghost">
                <Home className="w-4 h-4 mr-2" /> В дашборд
              </Button>
            </Link>
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="w-4 h-4 mr-2" /> Обновить
            </Button>
            <Button variant={isActive ? "outline" : "default"} onClick={onToggle} disabled={toggling}>
              <Power className="w-4 h-4 mr-2" /> {isActive ? "Отключить" : "Активировать"}
            </Button>
            <Button variant="destructive" onClick={() => setOpenDelete(true)}>
              <Trash2 className="w-4 h-4 mr-2" /> Удалить
            </Button>
            <Button onClick={onSave} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              Сохранить
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-6 space-y-6">
        {error && <Card className="p-4 text-destructive">{error}</Card>}

        {loading ? (
          <div className="space-y-4">
            <div className="h-24 bg-surface-1 rounded-md animate-pulse" />
            <div className="h-40 bg-surface-1 rounded-md animate-pulse" />
          </div>
        ) : !method ? (
          <Card className="p-6 text-center text-muted-foreground">Способ оплаты не найден</Card>
        ) : (
          <Card className="p-6 backdrop-blur-sm bg-card/80 border-border/50 space-y-6">
            {/* Основное */}
            <section>
              <div className="text-lg font-semibold mb-4">Основное</div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">Название</label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Тип</label>
                  <select
                    value={type}
                    onChange={(e) => {}}
                    className="w-full h-9 rounded-md border border-border bg-background text-sm px-3"
                    disabled
                    title="Тип менять нельзя"
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
                  <input id="isActive" type="checkbox" className="h-4 w-4" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
                  <label htmlFor="isActive" className="text-sm">Активен</label>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input id="requiresVerification" type="checkbox" className="h-4 w-4" checked={requiresVerification} onChange={(e) => setRequiresVerification(e.target.checked)} />
                  <label htmlFor="requiresVerification" className="text-sm">Требует верификации</label>
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input id="supportsRefunds" type="checkbox" className="h-4 w-4" checked={supportsRefunds} onChange={(e) => setSupportsRefunds(e.target.checked)} />
                  <label htmlFor="supportsRefunds" className="text-sm">Поддерживает возвраты</label>
                </div>
              </div>
            </section>

            {/* Лимиты */}
            <section>
              <div className="text-lg font-semibold mb-4">Лимиты</div>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm text-muted-foreground">Мин. сумма</label>
                  <Input value={minAmount} onChange={(e) => setMinAmount(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Макс. сумма</label>
                  <Input value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Транзакций в день</label>
                  <Input value={dailyLimit} onChange={(e) => setDailyLimit(e.target.value)} />
                </div>
              </div>
            </section>

            {/* Рассрочка */}
            {type === "installments" && (
              <section>
                <div className="text-lg font-semibold mb-4">Настройки рассрочки</div>
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground">Макс. период (мес)</label>
                    <Input value={maxPeriodMonths} onChange={(e) => setMaxPeriodMonths(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Процентная ставка</label>
                    <Input value={interestRate} onChange={(e) => setInterestRate(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Мин. первый взнос, %</label>
                    <Input value={minDownPaymentPercent} onChange={(e) => setMinDownPaymentPercent(e.target.value)} />
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
                  <Input value={gatewayType} onChange={(e) => setGatewayType(e.target.value)} placeholder="Напр., yookassa, tinkoff" />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input id="testMode" type="checkbox" className="h-4 w-4" checked={testMode} onChange={(e) => setTestMode(e.target.checked)} />
                  <label htmlFor="testMode" className="text-sm">Тестовый режим</label>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">API Key</label>
                  <Input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="Оставьте пустым, чтобы не менять" />
                </div>
                <div>
                  <label className="text-sm text-muted-foreground">Merchant ID</label>
                  <Input value={merchantId} onChange={(e) => setMerchantId(e.target.value)} placeholder="Оставьте пустым, чтобы не менять" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm text-muted-foreground">Webhook URL</label>
                  <Input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="Оставьте пустым, чтобы не менять" />
                </div>
              </div>
            </section>
          </Card>
        )}
      </main>

      <ConfirmDialog
        open={openDelete}
        onOpenChange={setOpenDelete}
        title="Удалить способ оплаты?"
        description="Операция необратима. Продолжить?"
        confirmText="Удалить"
        variant="destructive"
        loading={deleting}
        onConfirm={onDelete}
      />
    </div>
  );
}
