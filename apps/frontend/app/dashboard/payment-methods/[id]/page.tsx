"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import {
  CreditCard,
  RefreshCw,
  Save,
  Power,
  Trash2,
  Lock,
  Wrench,
  Calculator,
  Settings,
} from "lucide-react"
import { toast } from "sonner"

import { AppLayout } from "@/components/app/AppLayout"
import { NavigationHeader } from "@/components/platform/NavigationHeader"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

import { useAuth } from "@/lib/hooks/use-auth"
import { paymentMethodsAPI } from "@/lib/api/payment-methods"
import type {
  PaymentMethodResponse,
  PaymentMethodType,
  PaymentMethodUpdateRequest,
  CalculateFeeResponse,
} from "@/lib/types/payment-methods"
import { cn } from "@/lib/utils"

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

function typeLabel(type?: string) {
  const t = String(type || "").toLowerCase() as PaymentMethodType
  return TYPES.find((x) => x.value === t)?.label || type || "—"
}

function toNumber(v: string): number | undefined {
  if (v == null) return undefined
  const s = String(v).trim()
  if (!s) return undefined
  const num = Number(s.replace(",", "."))
  return Number.isFinite(num) ? num : undefined
}

function toDateTimeRU(iso?: string) {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleString("ru-RU")
  } catch {
    return "—"
  }
}

function formatCurrency(value: unknown, currency = "RUB") {
  const n = typeof value === "number" ? value : Number(String(value ?? "").replace(",", "."))
  if (!Number.isFinite(n)) return "—"

  try {
    return n.toLocaleString("ru-RU", { style: "currency", currency })
  } catch {
    return `${n} ${currency}`
  }
}

export default function PaymentMethodEditPage() {
  const params = useParams<{ id: string }>()
  const id = React.useMemo(() => (Array.isArray(params?.id) ? params.id[0] : params?.id) as string, [params])
  const router = useRouter()

  const { isAuthenticated, user, isLoading: authLoading } = useAuth()

  const [isMounted, setIsMounted] = React.useState(false)

  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [toggling, setToggling] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)
  const [openDelete, setOpenDelete] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const [testing, setTesting] = React.useState(false)

  // calculate fee dialog
  const [openCalc, setOpenCalc] = React.useState(false)
  const [calcAmount, setCalcAmount] = React.useState<string>("1000")
  const [calcLoading, setCalcLoading] = React.useState(false)
  const [calcError, setCalcError] = React.useState<string | null>(null)
  const [calcResult, setCalcResult] = React.useState<CalculateFeeResponse | null>(null)

  const [method, setMethod] = React.useState<PaymentMethodResponse | null>(null)

  // form
  const [name, setName] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [type, setType] = React.useState<PaymentMethodType>("card")
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

  const roleObj = (user as unknown as { role?: string | { name?: string } } | null)?.role
  const roleName = (typeof roleObj === "string" ? roleObj : roleObj?.name || "").toLowerCase()
  const canManage = ["company_owner", "company_admin", "owner", "admin"].includes(roleName)
  const readOnly = !canManage

  React.useEffect(() => {
    if (!isMounted) return
    if (authLoading) return

    if (!isAuthenticated || !user) {
      router.push("/login")
      return
    }
    if (!id) return

    let cancelled = false

    ;(async () => {
      setLoading(true)
      setError(null)

      try {
        const m = await paymentMethodsAPI.getPaymentMethod(id)
        if (cancelled) return

        setMethod(m)

        setName(m.name || "")
        setDescription(m.description || "")
        setType((m.type as PaymentMethodType) || "card")
        setProcessingFeePercent(typeof m.processingFeePercent === "number" ? String(m.processingFeePercent) : "")
        setIsActive(!!m.isActive)
        setRequiresVerification(!!m.requiresVerification)
        setSupportsRefunds(m.supportsRefunds !== false)

        setMinAmount(m.limits?.minAmount != null ? String(m.limits.minAmount) : "")
        setMaxAmount(m.limits?.maxAmount != null ? String(m.limits.maxAmount) : "")
        setDailyLimit(m.limits?.dailyTransactionLimit != null ? String(m.limits.dailyTransactionLimit) : "")

        if (m.installmentConfig) {
          setMaxPeriodMonths(m.installmentConfig.maxPeriodMonths != null ? String(m.installmentConfig.maxPeriodMonths) : "")
          setInterestRate(m.installmentConfig.interestRate != null ? String(m.installmentConfig.interestRate) : "")
          setMinDownPaymentPercent(
            m.installmentConfig.minDownPaymentPercent != null ? String(m.installmentConfig.minDownPaymentPercent) : ""
          )
        } else {
          setMaxPeriodMonths("")
          setInterestRate("")
          setMinDownPaymentPercent("")
        }

        const needs = requiresIntegration(m.type as string)
        if (needs && m.integrationStatus) {
          setGatewayType(m.integrationStatus.gatewayType || "")
          setTestMode(!!m.integrationStatus.testMode)
        } else {
          setGatewayType("")
          setTestMode(false)
        }

        // секреты всегда пустые на загрузке
        setApiKey("")
        setMerchantId("")
        setWebhookUrl("")
      } catch (e) {
        try {
          const parsed = JSON.parse((e as Error).message) as { message?: string }
          setError(parsed.message || "Ошибка загрузки способа оплаты")
        } catch {
          setError("Ошибка загрузки способа оплаты")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isMounted, authLoading, isAuthenticated, user, router, id])

  const needsIntegration = requiresIntegration(type)

  const handleRefresh = async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const m = await paymentMethodsAPI.getPaymentMethod(id)
      setMethod(m)

      // обновим только то, что может поменяться без формы
      setIsActive(!!m.isActive)
      setRequiresVerification(!!m.requiresVerification)
      setSupportsRefunds(m.supportsRefunds !== false)

      toast.success("Обновлено")
    } catch (e) {
      setError((e as Error)?.message || "Не удалось обновить данные")
    } finally {
      setLoading(false)
    }
  }

  const onSave = async () => {
    if (!canManage || !id) return
    if (!name.trim()) {
      setError("Укажите название")
      return
    }

    const payload: PaymentMethodUpdateRequest = {
      name: name.trim(),
      description: description.trim() || undefined,
      type,
      isActive,
      processingFeePercent: toNumber(processingFeePercent),
      requiresVerification,
      supportsRefunds,
    }

    const limits: Record<string, number> = {}
    const min = toNumber(minAmount)
    const max = toNumber(maxAmount)
    const daily = toNumber(dailyLimit)
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
    setError(null)
    try {
      const updated = await paymentMethodsAPI.update(id, payload)
      setMethod(updated)
      setIsActive(!!updated.isActive)
      setRequiresVerification(!!updated.requiresVerification)
      setSupportsRefunds(updated.supportsRefunds !== false)
      toast.success("Сохранено")
    } catch (e) {
      try {
        const parsed = JSON.parse((e as Error).message) as { message?: string }
        setError(parsed.message || "Не удалось обновить способ оплаты")
      } catch {
        setError("Не удалось обновить способ оплаты")
      }
    } finally {
      setSaving(false)
    }
  }

  const onToggle = async () => {
    if (!canManage || !id) return
    setToggling(true)
    setError(null)
    try {
      const updated = await paymentMethodsAPI.toggleStatus(id)
      setIsActive(!!updated.isActive)
      setMethod(updated)
      toast.success(updated.isActive ? "Активировано" : "Отключено")
    } catch (e) {
      try {
        const parsed = JSON.parse((e as Error).message) as { message?: string }
        setError(parsed.message || "Не удалось изменить статус")
      } catch {
        setError("Не удалось изменить статус")
      }
    } finally {
      setToggling(false)
    }
  }

  const onDelete = async () => {
    if (!canManage || !id) return
    setDeleting(true)
    setError(null)
    try {
      await paymentMethodsAPI.remove(id)
      router.push("/dashboard/payment-methods")
    } catch (e) {
      try {
        const parsed = JSON.parse((e as Error).message) as { message?: string }
        setError(parsed.message || "Не удалось удалить способ оплаты")
      } catch {
        setError("Не удалось удалить способ оплаты")
      }
    } finally {
      setDeleting(false)
      setOpenDelete(false)
    }
  }

  const onTestIntegration = async () => {
    if (!canManage || !id) return
    if (!requiresIntegration(type)) {
      toast.info("Интеграция не требуется для этого типа")
      return
    }

    setTesting(true)
    try {
      const res = await paymentMethodsAPI.testIntegration(id)
      const status = (res.status || "").toString().toLowerCase()
      const message =
        res.message ||
        (status === "ok"
          ? "Интеграция проверена: OK"
          : status === "warning"
            ? "Проверка завершена с предупреждениями"
            : "Ошибка интеграции")

      if (res.ok || status === "ok") toast.success(message)
      else if (status === "warning") toast.warning(message)
      else toast.error(message)
    } catch (e) {
      try {
        const parsed = JSON.parse((e as Error).message) as { message?: string }
        toast.error(parsed.message || "Не удалось выполнить проверку интеграции")
      } catch {
        toast.error("Не удалось выполнить проверку интеграции")
      }
    } finally {
      setTesting(false)
    }
  }

  const openCalculateFee = () => {
    setCalcError(null)
    setCalcResult(null)
    setOpenCalc(true)
  }

  const runCalculateFee = async () => {
    if (!canManage || !id) return

    const amount = toNumber(calcAmount)
    if (amount == null || amount <= 0) {
      setCalcError("Введите корректную сумму")
      return
    }

    setCalcLoading(true)
    setCalcError(null)
    setCalcResult(null)

    try {
      const res = await paymentMethodsAPI.calculateFee(id, amount)
      const normalized = {
        amount: Number(res?.amount),
        fee: Number(res?.fee),
        total: Number(res?.total),
        percent:
          typeof res?.percent === "number"
            ? res.percent
            : res?.percent != null
              ? Number(res.percent)
              : undefined,
        currency: typeof res?.currency === "string" ? res.currency : "RUB",
      }

      if (![normalized.amount, normalized.fee, normalized.total].every(Number.isFinite)) {
        setCalcError("Ответ сервера не содержит корректные числа для расчёта комиссии")
        setCalcResult(null)
        return
      }

      setCalcResult(normalized)
    } catch (e) {
      try {
        const parsed = JSON.parse((e as Error).message) as { message?: string }
        setCalcError(parsed.message || "Не удалось рассчитать комиссию")
      } catch {
        setCalcError("Не удалось рассчитать комиссию")
      }
    } finally {
      setCalcLoading(false)
    }
  }

  React.useEffect(() => {
    if (!openCalc) return
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault()
        runCalculateFee()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openCalc, calcAmount, id, canManage])

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

  if (!isAuthenticated || !user) return null

  const headerActions = (
    <div className="flex items-center gap-sm">
      <Button variant="secondary" size="sm" onClick={handleRefresh} disabled={loading}>
        <RefreshCw className="w-4 h-4 mr-xs" />
        Обновить
      </Button>

      {canManage && (
        <>
          <Button variant="secondary" size="sm" onClick={onToggle} disabled={toggling || loading}>
            <Power className="w-4 h-4 mr-xs" />
            {isActive ? "Отключить" : "Активировать"}
          </Button>

          <Button variant="danger" size="sm" onClick={() => setOpenDelete(true)} disabled={loading}>
            <Trash2 className="w-4 h-4 mr-xs" />
            Удалить
          </Button>

          <Button variant="primary" size="sm" onClick={onSave} disabled={saving || loading}>
            <Save className="w-4 h-4 mr-xs" />
            Сохранить
          </Button>
        </>
      )}
    </div>
  )

  const pageTitle = method?.name || "Способ оплаты"

  return (
    <AppLayout>
      <div className="container mx-auto px-lg py-xl flex flex-col gap-lg">
        <NavigationHeader
          title={pageTitle}
          subtitle="Настройки способа оплаты"
          icon={<CreditCard className="w-5 h-5" />}
          backHref="/dashboard/payment-methods"
          backLabel="Способы оплаты"
          actions={headerActions}
        />

        {!canManage && (
          <Card className="p-md border border-border bg-card">
            <div className="flex items-center gap-sm text-sm text-muted-foreground">
              <Lock className="w-4 h-4 shrink-0" />
              Только просмотр. Изменения доступны администратору компании.
            </div>
          </Card>
        )}

        {error && (
          <Card className="p-md border border-status-error/30 bg-status-error/10 text-status-error text-sm">
            {error}
          </Card>
        )}

        {loading ? (
          <div className="grid gap-lg">
            <Card className="p-lg">
              <Skeleton className="h-5 w-[240px]" />
              <div className="mt-sm flex gap-sm">
                <Skeleton className="h-5 w-[110px]" />
                <Skeleton className="h-5 w-[140px]" />
              </div>
              <div className="mt-md grid grid-cols-2 md:grid-cols-4 gap-md">
                <Skeleton className="h-14 rounded-md" />
                <Skeleton className="h-14 rounded-md" />
                <Skeleton className="h-14 rounded-md" />
                <Skeleton className="h-14 rounded-md" />
              </div>
            </Card>

            <Card className="p-lg">
              <Skeleton className="h-5 w-[160px]" />
              <div className="mt-md grid md:grid-cols-2 gap-md">
                <Skeleton className="h-10 rounded-md" />
                <Skeleton className="h-10 rounded-md" />
                <Skeleton className="h-10 rounded-md md:col-span-2" />
              </div>
            </Card>
          </div>
        ) : !method ? (
          <Card className="p-lg text-sm text-muted-foreground">Способ оплаты не найден</Card>
        ) : (
          <>
            {/* Summary */}
            <Card className="p-lg">
              <div className="flex items-start justify-between gap-lg">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground truncate">{method.name}</div>
                  <div className="mt-xs text-xs text-muted-foreground truncate">{method.description || "—"}</div>

                  <div className="mt-md flex flex-wrap items-center gap-sm">
                    <Badge variant={isActive ? "active" : "draft"}>{isActive ? "Активен" : "Отключен"}</Badge>
                    <Badge variant="outline">{typeLabel(method.type)}</Badge>

                    {needsIntegration && (
                      <Badge variant={method.integrationStatus?.isConfigured ? "active" : "pending"}>
                        {method.integrationStatus?.isConfigured ? "Интеграция настроена" : "Требует настройки"}
                      </Badge>
                    )}

                    {needsIntegration && method.integrationStatus?.testMode && <Badge variant="pending">Тест</Badge>}
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <div className="text-xs text-muted-foreground">Статус</div>
                  <div
                    className="mt-xs"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                  >
                    <Switch
                      checked={isActive}
                      disabled={!canManage || toggling}
                      onCheckedChange={(checked) => {
                        if (checked === isActive) return
                        onToggle()
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-lg grid grid-cols-2 md:grid-cols-4 gap-md">
                <div className="rounded-md border p-md">
                  <div className="text-xs text-muted-foreground">Комиссия</div>
                  <div className="text-sm font-medium tabular-nums mt-xs">
                    {typeof method.processingFeePercent === "number" ? `${method.processingFeePercent}%` : "—"}
                  </div>
                </div>

                <div className="rounded-md border p-md">
                  <div className="text-xs text-muted-foreground">Шлюз</div>
                  <div className="text-sm font-medium tabular-nums mt-xs">
                    {needsIntegration ? (method.integrationStatus?.gatewayType || "—") : "—"}
                  </div>
                </div>

                <div className="rounded-md border p-md">
                  <div className="text-xs text-muted-foreground">Проверка связи</div>
                  <div className="text-sm font-medium tabular-nums mt-xs">
                    {needsIntegration ? toDateTimeRU(method.integrationStatus?.lastConnectionCheck) : "—"}
                  </div>
                </div>

                <div className="rounded-md border p-md">
                  <div className="text-xs text-muted-foreground">Обновлён</div>
                  <div className="text-sm font-medium tabular-nums mt-xs">{toDateTimeRU(method.updatedAt)}</div>
                </div>
              </div>
            </Card>

            {/* Tools */}
            {canManage && (
              <Card className="p-lg">
                <div className="flex items-center gap-sm mb-md">
                  <Wrench className="w-4 h-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold text-foreground">Инструменты</h2>
                </div>

                <div className="grid md:grid-cols-2 gap-md">
                  {needsIntegration ? (
                    <div className="rounded-md border p-md flex items-center justify-between gap-md">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground">Проверить интеграцию</div>
                        <div className="text-xs text-muted-foreground">Проверка подключения и конфигурации</div>
                      </div>
                      <Button variant="secondary" size="sm" onClick={onTestIntegration} disabled={testing}>
                        {testing ? <RefreshCw className="w-4 h-4 mr-xs animate-spin" /> : <Wrench className="w-4 h-4 mr-xs" />}
                        Проверить
                      </Button>
                    </div>
                  ) : (
                    <div className="rounded-md border p-md text-sm text-muted-foreground">
                      Для этого типа способа интеграция не требуется.
                    </div>
                  )}

                  <div className="rounded-md border p-md flex items-center justify-between gap-md">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground">Рассчитать комиссию</div>
                      <div className="text-xs text-muted-foreground">Быстрая проверка настроек комиссии по сумме</div>
                    </div>
                    <Button variant="secondary" size="sm" onClick={openCalculateFee}>
                      <Calculator className="w-4 h-4 mr-xs" />
                      Рассчитать
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* Основное */}
            <Card className="p-lg">
              <div className="flex items-center gap-sm mb-md">
                <Settings className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-foreground">Основное</h2>
              </div>

              <div className="grid md:grid-cols-2 gap-md">
                <div className="min-w-0">
                  <label className="text-sm text-muted-foreground">Название *</label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} disabled={readOnly} />
                </div>

                <div className="min-w-0">
                  <label className="text-sm text-muted-foreground">Тип</label>
                  <select
                    value={type}
                    onChange={() => {}}
                    disabled
                    title="Тип менять нельзя"
                    className={cn(
                      "w-full h-10 rounded-md border border-input bg-background text-sm px-md",
                      "text-foreground hover:border-border/80 disabled:opacity-70"
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
                    disabled={readOnly}
                  />
                </div>

                <div className="min-w-0">
                  <label className="text-sm text-muted-foreground">Комиссия, %</label>
                  <Input
                    value={processingFeePercent}
                    onChange={(e) => setProcessingFeePercent(e.target.value)}
                    placeholder="Напр., 2.5"
                    disabled={readOnly}
                    inputMode="decimal"
                  />
                </div>

                <div className="grid gap-sm md:col-span-2">
                  <div className="flex items-center justify-between gap-md rounded-md border p-md">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground">Требует верификации</div>
                      <div className="text-xs text-muted-foreground">Доп. подтверждение перед оплатой</div>
                    </div>
                    <Switch checked={requiresVerification} onCheckedChange={setRequiresVerification} disabled={readOnly} />
                  </div>

                  <div className="flex items-center justify-between gap-md rounded-md border p-md">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground">Поддерживает возвраты</div>
                      <div className="text-xs text-muted-foreground">Можно оформить возврат (если поддерживается)</div>
                    </div>
                    <Switch checked={supportsRefunds} onCheckedChange={setSupportsRefunds} disabled={readOnly} />
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
                  <Input value={minAmount} onChange={(e) => setMinAmount(e.target.value)} disabled={readOnly} inputMode="decimal" />
                </div>
                <div className="min-w-0">
                  <label className="text-sm text-muted-foreground">Макс. сумма</label>
                  <Input value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} disabled={readOnly} inputMode="decimal" />
                </div>
                <div className="min-w-0">
                  <label className="text-sm text-muted-foreground">Транзакций в день</label>
                  <Input value={dailyLimit} onChange={(e) => setDailyLimit(e.target.value)} disabled={readOnly} inputMode="numeric" />
                </div>
              </div>
            </Card>

            {/* Рассрочка */}
            {type === "installments" && (
              <Card className="p-lg">
                <h2 className="text-sm font-semibold text-foreground mb-md">Настройки рассрочки</h2>
                <div className="grid md:grid-cols-3 gap-md">
                  <div className="min-w-0">
                    <label className="text-sm text-muted-foreground">Макс. период (мес)</label>
                    <Input value={maxPeriodMonths} onChange={(e) => setMaxPeriodMonths(e.target.value)} disabled={readOnly} inputMode="numeric" />
                  </div>
                  <div className="min-w-0">
                    <label className="text-sm text-muted-foreground">Процентная ставка</label>
                    <Input value={interestRate} onChange={(e) => setInterestRate(e.target.value)} disabled={readOnly} inputMode="decimal" />
                  </div>
                  <div className="min-w-0">
                    <label className="text-sm text-muted-foreground">Мин. первый взнос, %</label>
                    <Input
                      value={minDownPaymentPercent}
                      onChange={(e) => setMinDownPaymentPercent(e.target.value)}
                      disabled={readOnly}
                      inputMode="decimal"
                    />
                  </div>
                </div>
              </Card>
            )}

            {/* Интеграция */}
            {needsIntegration && (
              <Card className="p-lg">
                <h2 className="text-sm font-semibold text-foreground mb-md">Интеграция</h2>

                {canManage ? (
                  <div className="grid md:grid-cols-2 gap-md">
                    <div className="min-w-0">
                      <label className="text-sm text-muted-foreground">Платёжный шлюз</label>
                      <Input
                        value={gatewayType}
                        onChange={(e) => setGatewayType(e.target.value)}
                        placeholder="Напр., yookassa, tinkoff"
                        disabled={readOnly}
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
                      <Switch checked={testMode} onCheckedChange={setTestMode} disabled={readOnly} />
                    </div>

                    <div className="min-w-0">
                      <label className="text-sm text-muted-foreground">API Key</label>
                      <Input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Оставьте пустым, чтобы не менять"
                        disabled={readOnly}
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
                        placeholder="Оставьте пустым, чтобы не менять"
                        disabled={readOnly}
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
                        placeholder="Оставьте пустым, чтобы не менять"
                        disabled={readOnly}
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    Интеграционные параметры скрыты. Обратитесь к администратору компании.
                  </div>
                )}
              </Card>
            )}
          </>
        )}
      </div>

      <Dialog
        open={openCalc}
        onOpenChange={(v) => {
          setOpenCalc(v)
          if (!v) {
            setCalcError(null)
            setCalcResult(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Расчёт комиссии</DialogTitle>
            <DialogDescription>
              Это проверка расчёта комиссии для суммы. Платёж не создаётся.
              {method?.processingFeePercent != null ? ` Текущая комиссия: ${method.processingFeePercent}%.` : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-sm">
            <label htmlFor="calc-amount" className="text-sm text-muted-foreground">
              Сумма (₽) *
            </label>
            <Input
              id="calc-amount"
              value={calcAmount}
              onChange={(e) => setCalcAmount(e.target.value)}
              placeholder="Напр., 1000"
              inputMode="decimal"
              autoFocus
            />
            {calcError && <div className="text-xs text-status-error">{calcError}</div>}
          </div>

          {calcResult && (
            <Card className="p-md">
              <div className="grid gap-xs text-sm">
                <div className="flex items-center justify-between gap-md">
                  <span className="text-muted-foreground">Сумма</span>
                  <span className="tabular-nums">
                    {formatCurrency(calcResult.amount, calcResult.currency || "RUB")}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-md">
                  <span className="text-muted-foreground">
                    Комиссия{typeof calcResult.percent === "number" ? ` (${calcResult.percent.toFixed(2)}%)` : ""}
                  </span>
                  <span className="tabular-nums">
                    {formatCurrency(calcResult.fee, calcResult.currency || "RUB")}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-md">
                  <span className="text-muted-foreground">Итого</span>
                  <span className="tabular-nums font-medium">
                    {formatCurrency(calcResult.total, calcResult.currency || "RUB")}
                  </span>
                </div>
              </div>
            </Card>
          )}

          <DialogFooter>
            <Button variant="secondary" onClick={() => setOpenCalc(false)} disabled={calcLoading}>
              Закрыть
            </Button>
            <Button variant="primary" onClick={runCalculateFee} disabled={calcLoading}>
              {calcLoading ? <RefreshCw className="w-4 h-4 mr-xs animate-spin" /> : <Calculator className="w-4 h-4 mr-xs" />}
              Рассчитать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
    </AppLayout>
  )
}
