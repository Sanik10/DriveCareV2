// path: apps/frontend/app/dashboard/payment-methods/new/page.tsx
"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { CreditCard, Save, Lock, AlertTriangle, Settings, Zap, CheckCircle } from "lucide-react"

import { AppLayout } from "@/components/app/AppLayout"
import { NavigationHeader } from "@/components/platform/NavigationHeader"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"

import { useAuth } from "@/lib/hooks/use-auth"
import { paymentMethodsAPI } from "@/lib/api/payment-methods"
import type { PaymentMethodType, PaymentMethodCreateRequest } from "@/lib/types/payment-methods"
import { cn } from "@/lib/utils"

// Синхронизация с backend constants
const MAX_PROCESSING_FEE = 10 // %
const MIN_AMOUNT_LIMIT = 0.01
const MAX_AMOUNT_LIMIT = 1_000_000
const MAX_DAILY_TRANSACTIONS = 1000

const TYPES: { value: PaymentMethodType; label: string }[] = [
  { value: "cash", label: "Наличные" },
  { value: "card", label: "Банковская карта" },
  { value: "bank_transfer", label: "Банковский перевод" },
  { value: "installments", label: "Рассрочка" },
  { value: "corporate", label: "Корпоративный" },
  { value: "digital_wallet", label: "Цифровой кошелёк" },
  { value: "cryptocurrency", label: "Криптовалюта" },
]

function requiresIntegration(type?: string): boolean {
  const t = String(type || "").toLowerCase()
  return t === "card" || t === "digital_wallet" || t === "cryptocurrency"
}

function toNumber(v: string): number | undefined {
  if (v == null) return undefined
  const s = String(v).trim()
  if (!s) return undefined
  const num = Number(s.replace(",", "."))
  return Number.isFinite(num) ? num : undefined
}

export default function PaymentMethodCreatePage() {
  const { isAuthenticated, user, isLoading: authLoading } = useAuth()
  const router = useRouter()

  const [isMounted, setIsMounted] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const roleObj = (user as unknown as { role?: string | { name?: string } } | null)?.role
  const roleName = (typeof roleObj === "string" ? roleObj : roleObj?.name || "").toLowerCase()
  const canManage = ["company_owner", "company_admin", "owner", "admin"].includes(roleName)

  // form
  const [name, setName] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [type, setType] = React.useState<PaymentMethodType>("cash")
  const [processingFeePercent, setProcessingFeePercent] = React.useState<string>("")
  const [isActive, setIsActive] = React.useState(true)
  const [requiresVerification, setRequiresVerification] = React.useState(false)
  const [supportsRefunds, setSupportsRefunds] = React.useState(true)

  // limits
  const [minAmount, setMinAmount] = React.useState<string>("")
  const [maxAmount, setMaxAmount] = React.useState<string>("")
  const [dailyLimit, setDailyLimit] = React.useState<string>("")

  // installment
  const showInstallment = type === "installments"
  const [maxPeriodMonths, setMaxPeriodMonths] = React.useState<string>("")
  const [interestRate, setInterestRate] = React.useState<string>("")
  const [minDownPaymentPercent, setMinDownPaymentPercent] = React.useState<string>("")

  // integration
  const [gatewayType, setGatewayType] = React.useState("")
  const [apiKey, setApiKey] = React.useState("")
  const [merchantId, setMerchantId] = React.useState("")
  const [webhookUrl, setWebhookUrl] = React.useState("")
  const [testMode, setTestMode] = React.useState(false)

  React.useEffect(() => setIsMounted(true), [])

  React.useEffect(() => {
    if (!isMounted) return
    if (authLoading) return

    if (!isAuthenticated || !user) {
      router.push("/login")
      return
    }

    if (!canManage) {
      router.push("/dashboard/payment-methods")
    }
  }, [isMounted, authLoading, isAuthenticated, user, router, canManage])

  const errorsHints = React.useMemo(() => {
    return [
      `Минимальная сумма: пусто или ≥ ${MIN_AMOUNT_LIMIT}`,
      `Максимальная сумма: пусто или ≤ ${MAX_AMOUNT_LIMIT}`,
      `Транзакций в день: пусто или 1..${MAX_DAILY_TRANSACTIONS}`,
      `Комиссия: пусто или 0..${MAX_PROCESSING_FEE}%`,
    ]
  }, [])

  const showIntegration = requiresIntegration(type)

  const onSubmit = React.useCallback(async () => {
    setError(null)

    if (!name.trim()) {
      setError("Укажите название способа оплаты")
      return
    }
    if (!type) {
      setError("Выберите тип способа оплаты")
      return
    }

    const fee = toNumber(processingFeePercent)
    const min = toNumber(minAmount)
    const max = toNumber(maxAmount)
    const daily = toNumber(dailyLimit)

    if (fee !== undefined && (fee < 0 || fee > MAX_PROCESSING_FEE)) {
      setError(`Комиссия должна быть в диапазоне 0..${MAX_PROCESSING_FEE}%`)
      return
    }
    if (min !== undefined && min < MIN_AMOUNT_LIMIT) {
      setError(`Минимальная сумма должна быть пустой или ≥ ${MIN_AMOUNT_LIMIT}`)
      return
    }
    if (max !== undefined && max > MAX_AMOUNT_LIMIT) {
      setError(`Максимальная сумма должна быть пустой или ≤ ${MAX_AMOUNT_LIMIT}`)
      return
    }
    if (min !== undefined && max !== undefined && min > max) {
      setError("Минимальная сумма не может быть больше максимальной")
      return
    }
    if (daily !== undefined && (daily < 1 || daily > MAX_DAILY_TRANSACTIONS)) {
      setError(`Число транзакций в день — пусто или 1..${MAX_DAILY_TRANSACTIONS}`)
      return
    }

    const payload: PaymentMethodCreateRequest = {
      name: name.trim(),
      description: description.trim() || undefined,
      type,
      isActive,
      processingFeePercent: fee,
      requiresVerification,
      supportsRefunds,
    }

    const limits: Record<string, number> = {}
    if (min !== undefined) limits.minAmount = min
    if (max !== undefined) limits.maxAmount = max
    if (daily !== undefined) limits.dailyTransactionLimit = daily
    if (Object.keys(limits).length > 0) payload.limits = limits

    if (showInstallment) {
      const inst: Record<string, number> = {}
      const maxM = toNumber(maxPeriodMonths)
      const rate = toNumber(interestRate)
      const down = toNumber(minDownPaymentPercent)
      if (maxM !== undefined) inst.maxPeriodMonths = maxM
      if (rate !== undefined) inst.interestRate = rate
      if (down !== undefined) inst.minDownPaymentPercent = down
      if (Object.keys(inst).length > 0) payload.installmentConfig = inst
    }

    // Интеграция — только для online типов и если указан gatewayType
    if (requiresIntegration(type) && gatewayType.trim()) {
      payload.integrationConfig = {
        gatewayType: gatewayType.trim(),
        apiKey: apiKey.trim() || undefined,
        merchantId: merchantId.trim() || undefined,
        webhookUrl: webhookUrl.trim() || undefined,
        testMode,
      }
    }

    setSaving(true)
    try {
      await paymentMethodsAPI.create(payload)
      router.push("/dashboard/payment-methods")
    } catch (e) {
      try {
        const parsed = JSON.parse((e as Error).message) as { message?: string; errors?: string[] }
        const msg = parsed.errors?.length
          ? `${parsed.message || "Ошибка"}: ${parsed.errors.join("; ")}`
          : parsed.message
        setError(msg || "Не удалось создать способ оплаты")
      } catch {
        setError("Не удалось создать способ оплаты")
      }
    } finally {
      setSaving(false)
    }
  }, [
    name,
    description,
    type,
    isActive,
    processingFeePercent,
    requiresVerification,
    supportsRefunds,
    minAmount,
    maxAmount,
    dailyLimit,
    showInstallment,
    maxPeriodMonths,
    interestRate,
    minDownPaymentPercent,
    gatewayType,
    apiKey,
    merchantId,
    webhookUrl,
    testMode,
    router,
  ])

  // горячие клавиши: Cmd/Ctrl + Enter — сохранить
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault()
        if (!saving) onSubmit()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onSubmit, saving])

  if (!isMounted) return null

  if (authLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex items-center gap-sm">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-muted-foreground">Загрузка...</span>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (!isAuthenticated || !user || !canManage) return null

  const headerActions = (
    <div className="flex items-center gap-sm">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => router.push("/dashboard/payment-methods")}
        disabled={saving}
      >
        Отмена
      </Button>

      <Button variant="primary" size="sm" onClick={onSubmit} disabled={saving}>
        <Save className="w-4 h-4 mr-xs" />
        Создать
      </Button>
    </div>
  )

  const typeTitle = TYPES.find((t) => t.value === type)?.label || type

  return (
    <AppLayout>
      <div className="container mx-auto px-lg py-xl flex flex-col gap-lg">
        <NavigationHeader
          title="Новый способ оплаты"
          subtitle="Создание и настройка способа оплаты"
          icon={<CreditCard className="w-5 h-5" />}
          backHref="/dashboard/payment-methods"
          backLabel="Способы оплаты"
          actions={headerActions}
        />

        {error && (
          <Card className="p-lg border border-status-error/30 bg-status-error/10 text-status-error">
            <div className="flex items-start gap-md">
              <div className="shrink-0 mt-[2px]">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-foreground">Не удалось сохранить</div>
                <div className="text-sm mt-xs">{error}</div>

                <div className="mt-md text-xs text-muted-foreground">
                  Проверьте:
                  <ul className="list-disc ml-5 mt-xs space-y-1">
                    {errorsHints.map((h) => (
                      <li key={h}>{h}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
          {/* LEFT: form */}
          <div className="lg:col-span-2 flex flex-col gap-lg">
            {/* Основное */}
            <Card className="p-lg">
              <div className="flex items-center gap-sm mb-md">
                <Settings className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-foreground">Основное</h2>
              </div>

              <div className="grid md:grid-cols-2 gap-md">
                <div className="min-w-0">
                  <label className="text-sm text-muted-foreground">Название *</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Напр., Банковская карта"
                  />
                </div>

                <div className="min-w-0">
                  <label className="text-sm text-muted-foreground">Тип *</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as PaymentMethodType)}
                    className={cn(
                      "h-10 w-full rounded-md border border-input bg-background text-sm px-md",
                      "text-foreground hover:border-border/80"
                    )}
                  >
                    {TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2 min-w-0">
                  <label className="text-sm text-muted-foreground">Описание</label>
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Опционально"
                  />
                </div>

                <div className="min-w-0">
                  <label className="text-sm text-muted-foreground">Комиссия, %</label>
                  <Input
                    value={processingFeePercent}
                    onChange={(e) => setProcessingFeePercent(e.target.value)}
                    placeholder={`0..${MAX_PROCESSING_FEE}`}
                    inputMode="decimal"
                  />
                </div>

                <div className="grid gap-sm md:col-span-2">
                  <div className="flex items-center justify-between gap-md rounded-md border p-md">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground">Активен</div>
                      <div className="text-xs text-muted-foreground">Доступен для выбора при создании документов</div>
                    </div>
                    <Switch checked={isActive} onCheckedChange={setIsActive} />
                  </div>

                  <div className="flex items-center justify-between gap-md rounded-md border p-md">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground">Требует верификации</div>
                      <div className="text-xs text-muted-foreground">Доп. подтверждение перед оплатой</div>
                    </div>
                    <Switch checked={requiresVerification} onCheckedChange={setRequiresVerification} />
                  </div>

                  <div className="flex items-center justify-between gap-md rounded-md border p-md">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground">Поддерживает возвраты</div>
                      <div className="text-xs text-muted-foreground">Если метод и интеграция это поддерживают</div>
                    </div>
                    <Switch checked={supportsRefunds} onCheckedChange={setSupportsRefunds} />
                  </div>
                </div>
              </div>
            </Card>

            {/* Лимиты */}
            <Card className="p-lg">
              <h2 className="text-sm font-semibold text-foreground mb-md">Лимиты</h2>
              <div className="grid md:grid-cols-3 gap-md">
                <div className="min-w-0">
                  <label className="text-sm text-muted-foreground">Мин. сумма</label>
                  <Input
                    value={minAmount}
                    onChange={(e) => setMinAmount(e.target.value)}
                    placeholder={`≥ ${MIN_AMOUNT_LIMIT}`}
                    inputMode="decimal"
                  />
                </div>
                <div className="min-w-0">
                  <label className="text-sm text-muted-foreground">Макс. сумма</label>
                  <Input
                    value={maxAmount}
                    onChange={(e) => setMaxAmount(e.target.value)}
                    placeholder={`≤ ${MAX_AMOUNT_LIMIT}`}
                    inputMode="decimal"
                  />
                </div>
                <div className="min-w-0">
                  <label className="text-sm text-muted-foreground">Транзакций в день</label>
                  <Input
                    value={dailyLimit}
                    onChange={(e) => setDailyLimit(e.target.value)}
                    placeholder={`1..${MAX_DAILY_TRANSACTIONS}`}
                    inputMode="numeric"
                  />
                </div>
              </div>
            </Card>

            {/* Рассрочка */}
            {showInstallment && (
              <Card className="p-lg">
                <h2 className="text-sm font-semibold text-foreground mb-md">Настройки рассрочки</h2>
                <div className="grid md:grid-cols-3 gap-md">
                  <div className="min-w-0">
                    <label className="text-sm text-muted-foreground">Макс. период (мес)</label>
                    <Input
                      value={maxPeriodMonths}
                      onChange={(e) => setMaxPeriodMonths(e.target.value)}
                      placeholder="Напр., 12"
                      inputMode="numeric"
                    />
                  </div>
                  <div className="min-w-0">
                    <label className="text-sm text-muted-foreground">Процентная ставка</label>
                    <Input
                      value={interestRate}
                      onChange={(e) => setInterestRate(e.target.value)}
                      placeholder="Напр., 15"
                      inputMode="decimal"
                    />
                  </div>
                  <div className="min-w-0">
                    <label className="text-sm text-muted-foreground">Мин. первый взнос, %</label>
                    <Input
                      value={minDownPaymentPercent}
                      onChange={(e) => setMinDownPaymentPercent(e.target.value)}
                      placeholder="Напр., 20"
                      inputMode="decimal"
                    />
                  </div>
                </div>
              </Card>
            )}

            {/* Интеграция */}
            {showIntegration && (
              <Card className="p-lg">
                <h2 className="text-sm font-semibold text-foreground mb-md">Интеграция</h2>
                <div className="grid md:grid-cols-2 gap-md">
                  <div className="min-w-0">
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

                  <div className="flex items-center justify-between gap-md rounded-md border p-md md:mt-6">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground">Тестовый режим</div>
                      <div className="text-xs text-muted-foreground">Песочница/тестовые ключи</div>
                    </div>
                    <Switch checked={testMode} onCheckedChange={setTestMode} />
                  </div>

                  <div className="min-w-0">
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

                  <div className="min-w-0">
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

                  <div className="md:col-span-2 min-w-0">
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
              </Card>
            )}
          </div>

          {/* RIGHT: hints */}
          <div className="lg:col-span-1 flex flex-col gap-lg">
            <Card className="p-lg">
              <div className="flex items-center gap-sm mb-md">
                <Zap className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-foreground">Сводка</h2>
              </div>

              <div className="grid gap-sm text-sm">
                <div className="flex items-center justify-between gap-md">
                  <span className="text-muted-foreground">Тип</span>
                  <span className="truncate">{typeTitle}</span>
                </div>

                <div className="flex items-center justify-between gap-md">
                  <span className="text-muted-foreground">Интеграция</span>
                  {showIntegration ? (
                    <span className="inline-flex items-center gap-xs">
                      {gatewayType.trim() ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-status-active" />
                          <span className="truncate">{gatewayType.trim()}</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-4 h-4 text-status-pending" />
                          <span className="truncate">не указана</span>
                        </>
                      )}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">не требуется</span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-md">
                  <span className="text-muted-foreground">Статус</span>
                  <span className="truncate">{isActive ? "активен" : "выключен"}</span>
                </div>
              </div>
            </Card>

            <Card className="p-lg">
              <div className="flex items-center gap-sm mb-md">
                <Lock className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-foreground">Памятка</h2>
              </div>

              <ul className="text-sm text-muted-foreground list-disc ml-5 space-y-1">
                <li>Оффлайн-методы (наличные/перевод/корп.) не требуют интеграции.</li>
                <li>Онлайн-методы (карта/кошелёк/крипто): укажите платёжный шлюз.</li>
                <li>Лимиты можно оставить пустыми — будут считаться неограниченными.</li>
                <li>Cmd/Ctrl + Enter — создать.</li>
              </ul>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
