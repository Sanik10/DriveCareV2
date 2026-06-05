// path: apps/frontend/app/dashboard/invoices/[id]/page.tsx
"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  FileText,
  RefreshCw,
  Download,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  CreditCard,
  Calendar,
} from "lucide-react"

import { AppLayout } from "@/components/app/AppLayout"
import { NavigationHeader } from "@/components/platform/NavigationHeader"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"

import { useAuth } from "@/lib/hooks/use-auth"
import { invoicesAPI } from "@/lib/api/invoices"
import { apiRequest } from "@/lib/api/core"
import type { Invoice, InvoiceStatus } from "@/lib/types/invoices"
import { INVOICE_STATUS_TRANSITIONS } from "@/lib/types/invoices"
import type { Payment } from "@/lib/types/payments"
import { cn } from "@/lib/utils"

function money(n?: number) {
  if (typeof n !== "number" || Number.isNaN(n)) return "—"
  try {
    return n.toLocaleString("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 })
  } catch {
    return `${n} ₽`
  }
}

function dateRU(iso?: string) {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleDateString("ru-RU")
  } catch {
    return "—"
  }
}

function dateTimeRU(iso?: string) {
  if (!iso) return "—"
  try {
    return new Date(iso).toLocaleString("ru-RU")
  } catch {
    return "—"
  }
}

function invoiceStatusLabel(s: InvoiceStatus) {
  if (s === "ISSUED") return "Выставлен"
  if (s === "PAID") return "Оплачен"
  if (s === "CANCELED") return "Отменён"
  return s
}

// доменный статус -> 5 токенов DS
function invoiceStatusVariant(s: InvoiceStatus): "pending" | "active" | "error" {
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

// очень грубо, т.к. типы платежей ещё “плавающие”
function paymentVariant(status?: unknown): "draft" | "pending" | "active" | "error" {
  const s = String(status || "").toLowerCase()
  if (["processed", "succeeded", "paid", "success"].includes(s)) return "active"
  if (["pending", "created", "new", "awaiting"].includes(s)) return "pending"
  if (["failed", "error", "canceled", "cancelled"].includes(s)) return "error"
  return "draft"
}

function paymentLabel(status?: unknown) {
  const s = String(status || "").toLowerCase()
  if (["processed", "succeeded"].includes(s)) return "Успешно"
  if (["pending"].includes(s)) return "Ожидает"
  if (["failed"].includes(s)) return "Ошибка"
  return String(status || "—")
}

export default function InvoiceDetailsPage() {
  const params = useParams<{ id: string }>()
  const id = React.useMemo(() => (Array.isArray(params?.id) ? params.id[0] : params?.id) as string, [params])

  const router = useRouter()
  const { isAuthenticated, user, isLoading: authLoading } = useAuth()

  const [isMounted, setIsMounted] = React.useState(false)

  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [invoice, setInvoice] = React.useState<Invoice | null>(null)

  const [paymentsLoading, setPaymentsLoading] = React.useState(false)
  const [paymentsError, setPaymentsError] = React.useState<string | null>(null)
  const [payments, setPayments] = React.useState<Payment[]>([])

  const [changing, setChanging] = React.useState<InvoiceStatus | null>(null)
  const [openCancel, setOpenCancel] = React.useState(false)
  const [canceling, setCanceling] = React.useState(false)

  React.useEffect(() => setIsMounted(true), [])

  const roleObj = (user as unknown as { role?: string | { name?: string } } | null)?.role
  const roleName = (typeof roleObj === "string" ? roleObj : roleObj?.name || "").toLowerCase()

  const canUpdate = ["company_owner", "company_admin", "owner", "admin", "manager"].includes(roleName)
  const canCancel = canUpdate

  const loadInvoice = React.useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)

    try {
      const data = await invoicesAPI.get(id)
      setInvoice(data)
    } catch (e: unknown) {
      setError((e as Error)?.message || "Не удалось загрузить счёт")
      setInvoice(null)
    } finally {
      setLoading(false)
    }
  }, [id])

  React.useEffect(() => {
    if (!isMounted) return
    if (authLoading) return
    if (!isAuthenticated || !user) {
      router.push("/login")
      return
    }
    void loadInvoice()
  }, [isMounted, authLoading, isAuthenticated, user, router, loadInvoice])

  // загрузка платежей (best-effort)
  React.useEffect(() => {
    if (!invoice?.id) return

    const controller = new AbortController()
    let cancelled = false

    setPaymentsLoading(true)
    setPaymentsError(null)

    ;(async () => {
      try {
        const res = await apiRequest<{ items?: Payment[] } | Payment[]>(
          `/payments?invoiceId=${encodeURIComponent(invoice.id)}&limit=10`,
          { method: "GET", signal: controller.signal }
        )
        const items = Array.isArray(res) ? res : res?.items || []
        if (!cancelled) setPayments(items)
      } catch (e) {
        if (!cancelled) setPaymentsError((e as Error)?.message || "Не удалось загрузить платежи")
      } finally {
        if (!cancelled) setPaymentsLoading(false)
      }
    })()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [invoice?.id])

  const canMarkPaid =
    !!invoice &&
    canUpdate &&
    invoice.status === "ISSUED" &&
    INVOICE_STATUS_TRANSITIONS.ISSUED.includes("PAID")

  const canCancelAction =
    !!invoice &&
    canCancel &&
    invoice.status === "ISSUED" &&
    INVOICE_STATUS_TRANSITIONS.ISSUED.includes("CANCELED")

  const paidFromPayments = React.useMemo(() => {
    if (!payments?.length) return 0
    // @ts-expect-error совместимость со старыми полями
    return payments
      .filter((p) => (p as any).status === "processed" || (p as any).status === "succeeded")
      // @ts-expect-error
      .reduce((sum, p) => sum + (Number((p as any).amount) || 0), 0)
  }, [payments])

  const effectivePaid = (invoice?.paidAmount ?? 0) || paidFromPayments
  const showProgress = !!invoice && invoice.status === "ISSUED" && invoice.totalAmount > 0 && effectivePaid > 0
  const progress = invoice ? Math.min(100, Math.max(0, Math.round((effectivePaid / (invoice.totalAmount || 1)) * 100))) : 0

  async function changeStatus(next: InvoiceStatus) {
    if (!invoice) return
    if (!INVOICE_STATUS_TRANSITIONS[invoice.status as InvoiceStatus]?.includes(next)) return

    setChanging(next)
    setError(null)
    try {
      const updated = await invoicesAPI.updateStatus(invoice.id, next)
      setInvoice(updated)
    } catch (e: unknown) {
      setError((e as Error)?.message || "Не удалось изменить статус")
    } finally {
      setChanging(null)
    }
  }

  async function cancelInvoice() {
    if (!invoice) return
    setCanceling(true)
    setError(null)
    try {
      await invoicesAPI.cancel(invoice.id)
      router.push("/dashboard/invoices")
    } catch (e: unknown) {
      setError((e as Error)?.message || "Не удалось отменить счёт")
      setCanceling(false)
    } finally {
      setOpenCancel(false)
    }
  }

  const headerActions = (
    <div className="flex items-center gap-sm">
      <Button variant="secondary" size="sm" onClick={loadInvoice} disabled={loading}>
        <RefreshCw className="w-4 h-4 mr-xs" />
        Обновить
      </Button>

      {invoice && (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            // оставляем как было, но без “glass”
            const url = `/api/invoices/${invoice.id}/pdf`
            const a = document.createElement("a")
            a.href = url
            a.download = `invoice-${invoice.invoiceNumber || invoice.id.slice(0, 6)}.pdf`
            document.body.appendChild(a)
            a.click()
            a.remove()
          }}
          disabled={loading}
        >
          <Download className="w-4 h-4 mr-xs" />
          PDF
        </Button>
      )}

      {canMarkPaid && (
        <Button
          variant="primary"
          size="sm"
          onClick={() => changeStatus("PAID")}
          disabled={!!changing || loading}
          title={invoice?.status !== "ISSUED" ? 'Статус "Оплачен" недоступен' : undefined}
        >
          <CheckCircle2 className="w-4 h-4 mr-xs" />
          Отметить оплаченным
        </Button>
      )}

      {canCancelAction && (
        <Button
          variant="danger"
          size="sm"
          onClick={() => setOpenCancel(true)}
          disabled={canceling || loading}
        >
          <XCircle className="w-4 h-4 mr-xs" />
          Отменить
        </Button>
      )}
    </div>
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

  const title = invoice?.invoiceNumber ? `Счёт ${invoice.invoiceNumber}` : "Счёт"
  const subtitle = "Детали счёта и связанные данные"

  const isOverdue =
    invoice?.isOverdue === true || (typeof invoice?.daysUntilDue === "number" && invoice.daysUntilDue < 0)

  return (
    <AppLayout>
      <div className="container mx-auto px-lg py-xl flex flex-col gap-lg">
        <NavigationHeader
          title={title}
          subtitle={subtitle}
          icon={<FileText className="w-5 h-5" />}
          backHref="/dashboard/invoices"
          backLabel="К счетам"
          actions={headerActions}
        />

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
                <Skeleton className="h-5 w-[120px]" />
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
              <div className="mt-md grid md:grid-cols-3 gap-md">
                <Skeleton className="h-16 rounded-md" />
                <Skeleton className="h-16 rounded-md" />
                <Skeleton className="h-16 rounded-md" />
              </div>
            </Card>
          </div>
        ) : !invoice ? (
          <Card className="p-lg text-sm text-muted-foreground">Счёт не найден</Card>
        ) : (
          <>
            {/* Summary */}
            <Card className="p-lg">
              <div className="flex items-start justify-between gap-lg">
                <div className="min-w-0">
                  <div className="flex items-center gap-sm flex-wrap">
                    <div className="text-sm font-semibold text-foreground truncate">{title}</div>
                    <Badge variant={invoiceStatusVariant(invoice.status)}>{invoiceStatusLabel(invoice.status)}</Badge>
                    {invoice.status === "ISSUED" && isOverdue && <Badge variant="error">Просрочен</Badge>}
                  </div>

                  <div className="mt-xs text-xs text-muted-foreground">
                    Заказ: {invoice.order?.orderNumber || invoice.orderId.slice(0, 8)}
                    {invoice.customer ? (
                      <>
                        {" "}
                        · Клиент:{" "}
                        {[invoice.customer.firstName, invoice.customer.lastName].filter(Boolean).join(" ") ||
                          invoice.customer.companyName ||
                          invoice.customer.id.slice(0, 8)}
                      </>
                    ) : null}
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <div className="text-xs text-muted-foreground">Итого</div>
                  <div className="text-xl font-bold tabular-nums mt-xs">{money(invoice.totalAmount)}</div>
                </div>
              </div>

              {showProgress && (
                <div className="mt-lg">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Оплачено: {money(effectivePaid)}</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="mt-xs h-2 w-full rounded-full bg-surface-2 overflow-hidden">
                    <div className="h-2 bg-primary" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}
            </Card>

            {/* Details */}
            <Card className="p-lg">
              <h2 className="text-sm font-semibold text-foreground mb-md">Детали</h2>
              <div className="grid md:grid-cols-3 gap-md text-sm">
                <div className="rounded-md border p-md">
                  <div className="text-xs text-muted-foreground">Выставлен</div>
                  <div className="mt-xs font-medium tabular-nums">{dateRU(invoice.issueDate)}</div>
                </div>
                <div className="rounded-md border p-md">
                  <div className="text-xs text-muted-foreground">Срок оплаты</div>
                  <div className={cn("mt-xs font-medium tabular-nums", isOverdue && "text-status-error")}>
                    {dateRU(invoice.dueDate)}
                  </div>
                </div>
                <div className="rounded-md border p-md">
                  <div className="text-xs text-muted-foreground">Обновлён</div>
                  <div className="mt-xs font-medium tabular-nums">{dateTimeRU(invoice.updatedAt)}</div>
                </div>

                <div className="rounded-md border p-md">
                  <div className="text-xs text-muted-foreground">Сумма</div>
                  <div className="mt-xs font-medium tabular-nums">{money(invoice.amount)}</div>
                </div>
                <div className="rounded-md border p-md">
                  <div className="text-xs text-muted-foreground">Налог</div>
                  <div className="mt-xs font-medium tabular-nums">{money(invoice.taxAmount)}</div>
                </div>
                <div className="rounded-md border p-md">
                  <div className="text-xs text-muted-foreground">К оплате</div>
                  <div className="mt-xs font-medium tabular-nums">{money(invoice.totalAmount)}</div>
                </div>
              </div>

              {invoice.notes ? (
                <div className="mt-lg text-sm">
                  <div className="text-xs text-muted-foreground">Комментарий</div>
                  <div className="mt-xs">{invoice.notes}</div>
                </div>
              ) : null}
            </Card>

            {/* Payments */}
            <Card className="p-lg">
              <div className="flex items-center justify-between gap-md mb-md">
                <div className="flex items-center gap-sm">
                  <CreditCard className="w-4 h-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold text-foreground">Платежи</h2>
                </div>

                <Link href="/dashboard/payments" className="shrink-0">
                  <Button variant="ghost" size="sm">
                    Все платежи
                  </Button>
                </Link>
              </div>

              {paymentsLoading ? (
                <div className="grid gap-sm">
                  <Skeleton className="h-12 rounded-md" />
                  <Skeleton className="h-12 rounded-md" />
                </div>
              ) : paymentsError ? (
                <div className="text-sm text-status-error">{paymentsError}</div>
              ) : payments.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  По этому счёту пока нет платежей.
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {payments.map((p: any) => {
                    const amount = typeof p.amount === "number" ? p.amount : undefined
                    const createdAt = p.paymentDate || p.createdAt
                    const method = p.paymentMethod?.name || p.paymentMethod?.type || p.method || "—"
                    const st = p.status

                    return (
                      <Link
                        key={p.id}
                        href={`/dashboard/payments/${p.id}`}
                        className="block transition-colors hover:bg-surface-2"
                      >
                        <div className="p-md flex items-center justify-between gap-lg min-w-0">
                          <div className="min-w-0">
                            <div className="text-sm font-medium tabular-nums">{money(amount)}</div>
                            <div className="text-xs text-muted-foreground mt-xs truncate">
                              {method} · {createdAt ? new Date(createdAt).toLocaleString("ru-RU") : "—"}
                            </div>
                          </div>

                          <Badge variant={paymentVariant(st)}>{paymentLabel(st)}</Badge>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </Card>
          </>
        )}
      </div>

      <ConfirmDialog
        open={openCancel}
        onOpenChange={setOpenCancel}
        title="Отменить счёт?"
        description="Действие необратимо. Счёт будет отменён."
        confirmText="Отменить"
        variant="destructive"
        loading={canceling}
        onConfirm={cancelInvoice}
      />
    </AppLayout>
  )
}
