// path: apps/frontend/app/dashboard/invoices/page.tsx
"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  FileText,
  Plus,
  RefreshCw,
  Search,
  Download,
  ChevronRight,
  Calendar,
  User,
  AlertTriangle,
} from "lucide-react"

import { AppLayout } from "@/components/app/AppLayout"
import { NavigationHeader } from "@/components/platform/NavigationHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

import { PageFiltersCard, PageFiltersRow } from "@/components/app/PageFiltersCard"
import { PageContentCard } from "@/components/app/PageContentCard"
import { StatsCard, StatsGrid } from "@/components/app/StatsCard"
import { PaginationControls } from "@/components/app/PaginationControls"

import { useAuth } from "@/lib/hooks/use-auth"
import { invoicesAPI } from "@/lib/api/invoices"
import type { Invoice, InvoiceStatus, InvoicesQuery, PaginatedInvoicesResponse, InvoicesStats } from "@/lib/types/invoices"
import { cn } from "@/lib/utils"

const STATUS_OPTIONS: Array<{ value: InvoiceStatus | "ALL"; label: string }> = [
  { value: "ALL", label: "Все" },
  { value: "ISSUED", label: "Выставлен" },
  { value: "PAID", label: "Оплачен" },
  { value: "CANCELED", label: "Отменён" },
]

function statusLabel(s: InvoiceStatus) {
  if (s === "ISSUED") return "Выставлен"
  if (s === "PAID") return "Оплачен"
  if (s === "CANCELED") return "Отменён"
  return s
}

// Маппинг доменных статусов на 5 токенов DS
function statusVariant(s: InvoiceStatus): "pending" | "active" | "error" {
  switch (s) {
    case "PAID":
      return "active"
    case "CANCELED":
      return "error"
    case "ISSUED":
    default:
      return "pending"
  }
}

function formatMoney(amount?: number): string {
  if (typeof amount !== "number" || Number.isNaN(amount)) return "—"
  try {
    return amount.toLocaleString("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 })
  } catch {
    return `${amount} ₽`
  }
}

function formatDateRU(iso?: string): string {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleDateString("ru-RU")
  } catch {
    return "—"
  }
}

function customerLabel(inv: Invoice) {
  const c = inv.customer
  if (!c) return null
  const full = [c.firstName, c.lastName].filter(Boolean).join(" ").trim()
  return full || c.companyName || null
}

export default function InvoicesPage() {
  const { isAuthenticated, user, isLoading: authLoading } = useAuth()
  const router = useRouter()

  const [isMounted, setIsMounted] = React.useState(false)

  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const [data, setData] = React.useState<PaginatedInvoicesResponse | null>(null)
  const [stats, setStats] = React.useState<InvoicesStats | null>(null)

  const [search, setSearch] = React.useState("")
  const [status, setStatus] = React.useState<InvoiceStatus | "ALL">("ALL")
  const [page, setPage] = React.useState(1)
  const [limit, setLimit] = React.useState(20)

  React.useEffect(() => setIsMounted(true), [])

  const roleObj = (user as unknown as { role?: string | { name?: string } } | null)?.role
  const roleName = (typeof roleObj === "string" ? roleObj : roleObj?.name || "").toLowerCase()

  const canSeeStats = ["company_owner", "company_admin", "manager"].includes(roleName)
  const canCreate = ["company_owner", "company_admin", "manager"].includes(roleName)

  const query: InvoicesQuery = React.useMemo(
    () => ({
      page,
      limit,
      search: search || undefined,
      status: status !== "ALL" ? status : undefined,
    }),
    [page, limit, search, status]
  )

  const items = React.useMemo(() => data?.items || [], [data])

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await invoicesAPI.list(query)
      setData(res)
    } catch (e) {
      setError((e as Error)?.message || "Не удалось загрузить счета")
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [query])

  const loadStats = React.useCallback(async () => {
    if (!canSeeStats) {
      setStats(null)
      return
    }
    try {
      const s = await invoicesAPI.statsDashboard()
      setStats(s)
    } catch {
      setStats(null)
    }
  }, [canSeeStats])

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
      await Promise.all([load(), loadStats()])
    }, DEBOUNCE_MS)

    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [isMounted, authLoading, isAuthenticated, user, router, load, loadStats])

  const downloadOverdue = React.useCallback(async () => {
    try {
      const report = await invoicesAPI.overdueReport()
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `overdue-report-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e: unknown) {
      setError((e as Error)?.message || "Не удалось получить отчёт")
    }
  }, [])

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "n") {
        if (!canCreate) return
        e.preventDefault()
        router.push("/dashboard/invoices/new")
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [router, canCreate])

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
      {canSeeStats && (
        <Button variant="secondary" size="sm" onClick={downloadOverdue} disabled={loading}>
          <Download className="w-4 h-4 mr-xs" />
          Просрочки
        </Button>
      )}

      <Button variant="secondary" size="sm" onClick={load} disabled={loading}>
        <RefreshCw className="w-4 h-4 mr-xs" />
        Обновить
      </Button>

      {canCreate && (
        <Button variant="primary" size="sm" onClick={() => router.push("/dashboard/invoices/new")}>
          <Plus className="w-4 h-4 mr-xs" />
          Новый счёт
        </Button>
      )}
    </div>
  )

  return (
    <AppLayout>
      <div className="container mx-auto px-lg py-xl flex flex-col gap-lg">
        <NavigationHeader
          title="Счета"
          subtitle="Выставление и контроль статусов оплаты"
          icon={<FileText className="w-5 h-5" />}
          actions={headerActions}
        />

        {canSeeStats && (
          <StatsGrid cols={4}>
            <StatsCard title="Всего" value={stats?.total ?? data?.total ?? 0} icon={FileText} />
            <StatsCard title="Оплачено" value={stats?.paid ?? 0} icon={FileText} />
            <StatsCard title="Ожидают оплаты" value={stats?.pending ?? 0} icon={FileText} />
            <StatsCard title="Просрочено" value={stats?.overdueCount ?? data?.overdueCount ?? 0} icon={AlertTriangle} />
          </StatsGrid>
        )}

        <PageFiltersCard>
          <PageFiltersRow>
            <div className="relative w-full lg:max-w-lg">
              <label htmlFor="inv-search" className="sr-only">
                Поиск счетов
              </label>
              <Input
                id="inv-search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                placeholder="Поиск по номеру счёта / заказу / клиенту…"
                className="pl-[36px]"
              />
              <Search className="w-4 h-4 absolute left-md top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>

            <div className="flex items-center gap-sm flex-wrap justify-end">
              <label className="sr-only" htmlFor="inv-status">
                Статус
              </label>
              <select
                id="inv-status"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as InvoiceStatus | "ALL")
                  setPage(1)
                }}
                className={cn(
                  "h-10 rounded-md border border-input bg-background text-sm px-md",
                  "text-foreground hover:border-border/80"
                )}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>

              <label className="sr-only" htmlFor="inv-limit">
                На странице
              </label>
              <select
                id="inv-limit"
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
                {[10, 20, 50].map((n) => (
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
            icon: FileText,
            title: "Счета не найдены",
            description:
              status !== "ALL"
                ? `Нет счетов со статусом “${STATUS_OPTIONS.find((o) => o.value === status)?.label}”.`
                : "Попробуйте изменить параметры поиска или создайте первый счёт.",
            action: canCreate
              ? {
                  label: "Создать счёт",
                  onClick: () => router.push("/dashboard/invoices/new"),
                  icon: Plus,
                  variant: "secondary",
                }
              : undefined,
          }}
          onRetry={load}
          loadingRows={6}
        >
          <div className="divide-y divide-border/50">
            {items.map((inv) => (
              <InvoiceRow key={inv.id} invoice={inv} />
            ))}
          </div>
        </PageContentCard>

        <PaginationControls
          page={data?.page || page}
          totalPages={data?.totalPages || 1}
          total={data?.total || 0}
          showing={items.length}
          onPageChange={setPage}
          itemLabel="счетов"
        />
      </div>
    </AppLayout>
  )
}

function InvoiceRow({ invoice }: { invoice: Invoice }) {
  const isOverdue = invoice.isOverdue === true || (typeof invoice.daysUntilDue === "number" && invoice.daysUntilDue < 0)

  const title = invoice.invoiceNumber || `Счёт ${invoice.id.slice(0, 6)}`
  const cust = customerLabel(invoice)

  const secondaryParts: string[] = []
  if (cust) secondaryParts.push(`Клиент: ${cust}`)
  if (invoice.order?.orderNumber) secondaryParts.push(`Заказ: ${invoice.order.orderNumber}`)
  else secondaryParts.push(`Заказ: ${invoice.orderId.slice(0, 8)}`)

  return (
    <Link href={`/dashboard/invoices/${invoice.id}`} className="block transition-colors hover:bg-surface-2">
      <div className="p-md flex items-center justify-between gap-lg min-w-0">
        <div className="flex items-center gap-md min-w-0 flex-1">
          <div className="w-10 h-10 rounded-md bg-surface-2 border flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4 text-muted-foreground" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-sm min-w-0 flex-wrap">
              <span className="text-sm font-medium truncate">{title}</span>

              <Badge variant={statusVariant(invoice.status)}>{statusLabel(invoice.status)}</Badge>

              {isOverdue && invoice.status === "ISSUED" && <Badge variant="error">Просрочен</Badge>}
            </div>

            <div className="text-xs text-muted-foreground truncate mt-xs">
              {secondaryParts.join(" · ")}
            </div>
          </div>
        </div>

        <div className="shrink-0 text-right">
          <div className="text-sm font-semibold tabular-nums">{formatMoney(invoice.totalAmount)}</div>
          <div className={cn("text-xs mt-xs inline-flex items-center gap-xs", isOverdue ? "text-status-error" : "text-muted-foreground")}>
            <Calendar className="w-3.5 h-3.5" />
            до {formatDateRU(invoice.dueDate)}
          </div>
        </div>

        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
      </div>
    </Link>
  )
}
