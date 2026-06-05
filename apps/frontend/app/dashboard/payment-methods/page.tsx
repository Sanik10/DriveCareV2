"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { CreditCard, Plus, RefreshCw, Search, Zap, CheckCircle, CircleOff, Settings } from "lucide-react"

import { AppLayout } from "@/components/app/AppLayout"
import { NavigationHeader } from "@/components/platform/NavigationHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"

import { PageFiltersCard, PageFiltersRow } from "@/components/app/PageFiltersCard"
import { PageContentCard } from "@/components/app/PageContentCard"
import { StatsCard, StatsGrid } from "@/components/app/StatsCard"
import { PaginationControls } from "@/components/app/PaginationControls"

import { useAuth } from "@/lib/hooks/use-auth"
import { paymentMethodsAPI } from "@/lib/api/payment-methods"
import type { PaginatedPaymentMethodsUI, PaymentMethodResponse, PaymentMethodType } from "@/lib/types/payment-methods"
import { cn } from "@/lib/utils"

const METHOD_TYPES: { value: PaymentMethodType; label: string }[] = [
  { value: "cash", label: "Наличные" },
  { value: "card", label: "Карта" },
  { value: "bank_transfer", label: "Банковский перевод" },
  { value: "digital_wallet", label: "Электронный кошелёк" },
  { value: "cryptocurrency", label: "Криптовалюта" },
  { value: "installments", label: "Рассрочка" },
  { value: "corporate", label: "Корпоративный" },
]

function requiresIntegration(type?: string): boolean {
  const t = String(type || "").toLowerCase()
  return t === "card" || t === "digital_wallet" || t === "cryptocurrency"
}

function typeLabel(type?: string) {
  const t = String(type || "").toLowerCase() as PaymentMethodType
  return METHOD_TYPES.find((x) => x.value === t)?.label || type || "—"
}

export default function PaymentMethodsPage() {
  const router = useRouter()
  const { isAuthenticated, user, isLoading: authLoading } = useAuth()

  const [isMounted, setIsMounted] = React.useState(false)

  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [data, setData] = React.useState<PaginatedPaymentMethodsUI | null>(null)

  const [search, setSearch] = React.useState("")
  const [type, setType] = React.useState<string>("all")
  const [status, setStatus] = React.useState<string>("all") // all | active | inactive

  const [page, setPage] = React.useState(1)
  const [limit, setLimit] = React.useState(12)

  const [toggleBusy, setToggleBusy] = React.useState<Record<string, boolean>>({})
  const [testBusy, setTestBusy] = React.useState<Record<string, boolean>>({})
  const [flash, setFlash] = React.useState<{ kind: "ok" | "warn" | "error"; text: string } | null>(null)

  React.useEffect(() => setIsMounted(true), [])

  const roleObj = (user as unknown as { role?: string | { name?: string } } | null)?.role
  const roleName = (typeof roleObj === "string" ? roleObj : roleObj?.name || "").toLowerCase()

  const canCreate = ["company_owner", "company_admin"].includes(roleName)
  const canToggle = canCreate
  const canTest = ["company_owner", "company_admin", "manager"].includes(roleName)

  const query = React.useMemo(() => {
    return {
      search: search || undefined,
      page,
      limit,
      type: type !== "all" ? type : undefined,
      isActive: status === "active" ? true : status === "inactive" ? false : undefined,
      sortBy: "createdAt" as const,
      sortOrder: "DESC" as const,
    }
  }, [search, page, limit, type, status])

  const items = React.useMemo(() => data?.items || [], [data])

  const stats = React.useMemo(() => {
    const total = data?.total ?? items.length
    const active = items.filter((i) => i.isActive).length
    const inactive = items.filter((i) => !i.isActive).length
    const needsSetup = items.filter((i) => requiresIntegration(i.type) && i.integrationStatus?.isConfigured !== true).length
    return { total, active, inactive, needsSetup }
  }, [data, items])

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await paymentMethodsAPI.getPaymentMethods(query)
      setData(res)
    } catch (e) {
      try {
        const parsed = JSON.parse((e as Error).message) as { message?: string; correlationId?: string }
        const msg = parsed.correlationId
          ? `${parsed.message || "Ошибка загрузки способов оплаты"} (corrId: ${parsed.correlationId})`
          : parsed.message || "Ошибка загрузки способов оплаты"
        setError(msg)
      } catch {
        setError((e as Error)?.message || "Ошибка загрузки способов оплаты")
      }
    } finally {
      setLoading(false)
    }
  }, [query])

  React.useEffect(() => {
    if (!isMounted) return
    if (authLoading) return

    if (!isAuthenticated || !user) {
      router.push("/login")
      return
    }

    let cancelled = false
    const DEBOUNCE_MS = 250

    const t = setTimeout(async () => {
      if (cancelled) return
      await load()
    }, DEBOUNCE_MS)

    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [isMounted, authLoading, isAuthenticated, user, router, load])

  const handleRefresh = React.useCallback(() => {
    setPage(1)
    setFlash(null)
    setError(null)

    setLoading(true)
    paymentMethodsAPI
      .getPaymentMethods({ ...query, page: 1 })
      .then(setData)
      .catch(() => setError("Ошибка загрузки способов оплаты"))
      .finally(() => setLoading(false))
  }, [query])

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "n") {
        if (!canCreate) return
        e.preventDefault()
        router.push("/dashboard/payment-methods/new")
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [router, canCreate])

  const toggleMethod = React.useCallback(
    async (id: string) => {
      if (!canToggle) return
      if (toggleBusy[id]) return

      setToggleBusy((m) => ({ ...m, [id]: true }))
      setFlash(null)

      try {
        const updated = await paymentMethodsAPI.toggleStatus(id)
        setData((prev) => {
          if (!prev) return prev
          return { ...prev, items: prev.items.map((x) => (x.id === id ? updated : x)) }
        })
      } catch (e: unknown) {
        setFlash({ kind: "error", text: (e as Error)?.message || "Не удалось изменить статус" })
      } finally {
        setToggleBusy((m) => ({ ...m, [id]: false }))
      }
    },
    [canToggle, toggleBusy]
  )

  const testIntegration = React.useCallback(
    async (id: string) => {
      if (!canTest) return
      if (testBusy[id]) return

      setTestBusy((m) => ({ ...m, [id]: true }))
      setFlash(null)

      try {
        const res = await paymentMethodsAPI.testIntegration(id)
        setFlash({
          kind: res.ok ? "ok" : "warn",
          text: res.message || (res.ok ? "Интеграция работает корректно" : "Обнаружены проблемы с интеграцией"),
        })
      } catch (e: unknown) {
        setFlash({ kind: "error", text: (e as Error)?.message || "Ошибка тестирования интеграции" })
      } finally {
        setTestBusy((m) => ({ ...m, [id]: false }))
      }
    },
    [canTest, testBusy]
  )

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

      {canCreate && (
        <Button variant="primary" size="sm" onClick={() => router.push("/dashboard/payment-methods/new")}>
          <Plus className="w-4 h-4 mr-xs" />
          Новый способ
        </Button>
      )}
    </div>
  )

  return (
    <AppLayout>
      <div className="container mx-auto px-lg py-xl flex flex-col gap-lg">
        <NavigationHeader
          title="Способы оплаты"
          subtitle="Настройка доступных способов оплаты для клиентов"
          icon={<CreditCard className="w-5 h-5" />}
          actions={headerActions}
        />

        <StatsGrid cols={4}>
          <StatsCard title="Всего" value={stats.total} icon={CreditCard} />
          <StatsCard title="Активных" value={stats.active} icon={CheckCircle} meta="на странице" />
          <StatsCard title="Отключены" value={stats.inactive} icon={CircleOff} meta="на странице" />
          <StatsCard title="Требуют настройки" value={stats.needsSetup} icon={Settings} meta="на странице" />
        </StatsGrid>

        {flash && (
          <div
            className={cn(
              "rounded-md border p-md text-sm",
              flash.kind === "ok" && "border-status-active/30 bg-status-active/10 text-status-active",
              flash.kind === "warn" && "border-status-pending/30 bg-status-pending/10 text-status-pending",
              flash.kind === "error" && "border-status-error/30 bg-status-error/10 text-status-error"
            )}
          >
            {flash.text}
          </div>
        )}

        <PageFiltersCard>
          <PageFiltersRow>
            <div className="relative w-full lg:max-w-lg">
              <label htmlFor="pm-search" className="sr-only">
                Поиск способов оплаты
              </label>
              <Input
                id="pm-search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                placeholder="Поиск по названию..."
                className="pl-[36px]"
              />
              <Search className="w-4 h-4 absolute left-md top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>

            <div className="flex items-center gap-sm flex-wrap justify-end">
              <label className="sr-only" htmlFor="pm-type">
                Тип
              </label>
              <select
                id="pm-type"
                value={type}
                onChange={(e) => {
                  setType(e.target.value)
                  setPage(1)
                }}
                className={cn(
                  "h-10 rounded-md border border-input bg-background text-sm px-md",
                  "text-foreground hover:border-border/80"
                )}
              >
                <option value="all">Все типы</option>
                {METHOD_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>

              <label className="sr-only" htmlFor="pm-status">
                Статус
              </label>
              <select
                id="pm-status"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value)
                  setPage(1)
                }}
                className={cn(
                  "h-10 rounded-md border border-input bg-background text-sm px-md",
                  "text-foreground hover:border-border/80"
                )}
              >
                <option value="all">Все</option>
                <option value="active">Активные</option>
                <option value="inactive">Отключенные</option>
              </select>

              <label className="sr-only" htmlFor="pm-limit">
                На странице
              </label>
              <select
                id="pm-limit"
                value={limit}
                onChange={(e) => {
                  setLimit(parseInt(e.target.value, 10))
                  setPage(1)
                }}
                className={cn(
                  "h-10 rounded-md border border-input bg-background text-sm px-md",
                  "text-foreground hover:border-border/80"
                )}
              >
                {[12, 24, 48].map((n) => (
                  <option key={n} value={n}>
                    {n} / стр
                  </option>
                ))}
              </select>
            </div>
          </PageFiltersRow>
        </PageFiltersCard>

        <PageContentCard
          loading={loading}
          error={error}
          empty={items.length === 0}
          emptyState={{
            icon: CreditCard,
            title: "Способы оплаты не найдены",
            description:
              search || type !== "all" || status !== "all"
                ? "Попробуйте изменить фильтры."
                : "Добавьте первый способ оплаты.",
            action: canCreate
              ? {
                  label: "Добавить способ",
                  onClick: () => router.push("/dashboard/payment-methods/new"),
                  icon: Plus,
                  variant: "secondary",
                }
              : undefined,
          }}
          onRetry={handleRefresh}
          loadingRows={6}
          containerVariant="ghost"
          contentClassName="p-0"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-md">
            {items.map((m) => (
              <PaymentMethodEntityCard
                key={m.id}
                method={m}
                canToggle={canToggle}
                canTest={canTest}
                toggleLoading={!!toggleBusy[m.id]}
                testLoading={!!testBusy[m.id]}
                onOpen={() => router.push(`/dashboard/payment-methods/${m.id}`)}
                onToggle={() => toggleMethod(m.id)}
                onTest={() => testIntegration(m.id)}
              />
            ))}
          </div>
        </PageContentCard>

        <PaginationControls
          page={page}
          totalPages={data?.totalPages || 1}
          total={data?.total || 0}
          showing={items.length}
          onPageChange={setPage}
          itemLabel="способов"
        />
      </div>
    </AppLayout>
  )
}

function PaymentMethodEntityCard({
  method,
  canToggle,
  canTest,
  toggleLoading,
  testLoading,
  onOpen,
  onToggle,
  onTest,
}: {
  method: PaymentMethodResponse
  canToggle: boolean
  canTest: boolean
  toggleLoading: boolean
  testLoading: boolean
  onOpen: () => void
  onToggle: () => void
  onTest: () => void
}) {
  const needsIntegration = requiresIntegration(method.type as string)
  const isConfigured = needsIntegration ? method.integrationStatus?.isConfigured === true : true
  const isTestMode = needsIntegration ? method.integrationStatus?.testMode === true : false

  const meta: string[] = []
  meta.push(typeLabel(method.type))
  if (typeof method.processingFeePercent === "number") meta.push(`Комиссия: ${method.processingFeePercent}%`)
  if (method.limits?.minAmount || method.limits?.maxAmount) {
    meta.push(`Лимиты: ${method.limits?.minAmount ?? 0} — ${method.limits?.maxAmount ?? "∞"} ₽`)
  }

  return (
    <div
      className={cn("rounded-md border bg-card p-lg transition-colors hover:bg-surface-2 cursor-pointer")}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") onOpen()
      }}
    >
      <div className="flex items-start justify-between gap-md">
        <div className="flex items-start gap-md min-w-0">
          <div className="w-10 h-10 rounded-md bg-surface-2 border flex items-center justify-center shrink-0">
            <CreditCard className="w-4 h-4 text-muted-foreground" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-sm flex-wrap">
              <div className="text-sm font-medium text-foreground truncate max-w-[320px]">{method.name}</div>

              <Badge variant={method.isActive ? "active" : "draft"}>{method.isActive ? "Активен" : "Отключен"}</Badge>

              {needsIntegration && (
                <Badge variant={isConfigured ? "active" : "pending"}>{isConfigured ? "Интеграция" : "Нужна настройка"}</Badge>
              )}

              {isTestMode && <Badge variant="pending">Тест</Badge>}
            </div>

            <div className="mt-xs text-xs text-muted-foreground line-clamp-2">
              {method.description || meta.join(" · ")}
            </div>
          </div>
        </div>

        <div
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
        >
          <Switch
            checked={method.isActive}
            disabled={!canToggle || toggleLoading}
            onCheckedChange={() => onToggle()}
            className={cn(toggleLoading && "opacity-60")}
          />
        </div>
      </div>

      <div className="mt-md flex items-center justify-between gap-sm">
        <div className="text-xs text-muted-foreground truncate">
          {needsIntegration ? (isConfigured ? "Можно тестировать" : "Настройте интеграцию") : "Без интеграции"}
        </div>

        <div
          className="flex items-center gap-sm"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
        >
          <Button variant="secondary" size="sm" onClick={onOpen}>
            <Settings className="w-4 h-4 mr-xs" />
            Настроить
          </Button>

          {needsIntegration && (
            <Button variant="ghost" size="sm" disabled={!canTest || !isConfigured || testLoading} onClick={onTest}>
              <Zap className="w-4 h-4 mr-xs" />
              Тест
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
