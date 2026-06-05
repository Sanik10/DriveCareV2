// path: apps/frontend/app/dashboard/customers/[id]/page.tsx
"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  Users,
  Plus,
  Trash2,
  Download,
  Shield,
  AlertTriangle,
  Phone,
  Mail,
  Calendar,
  Car,
} from "lucide-react"

import { AppLayout } from "@/components/app/AppLayout"
import { NavigationHeader } from "@/components/platform/NavigationHeader"
import { CustomerTimeline } from "@/components/customers/CustomerTimeline"
import { OrderCreateDialog } from "@/components/orders/order-create-dialog"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Skeleton } from "@/components/ui/skeleton"

import { useAuth } from "@/lib/hooks/use-auth"
import { customersAPI } from "@/lib/api/customers"
import { vehiclesAPI } from "@/lib/api/vehicles"
import { appointmentsAPI } from "@/lib/api/appointments"
import { cn } from "@/lib/utils"

import type { CustomerResponse, TimelineEvent } from "@/lib/types/customers"
import type { VehicleResponse } from "@/lib/types/vehicles"

export default function CustomerDetailsPage() {
  const params = useParams<{ id: string }>()
  const id = React.useMemo(() => (Array.isArray(params?.id) ? params.id[0] : params?.id) as string, [params])

  const router = useRouter()
  const { isAuthenticated, user, isLoading: authLoading } = useAuth()

  const [isMounted, setIsMounted] = React.useState(false)

  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const [customer, setCustomer] = React.useState<CustomerResponse | null>(null)
  const [vehicles, setVehicles] = React.useState<VehicleResponse[]>([])
  const [timelineEvents, setTimelineEvents] = React.useState<TimelineEvent[]>([])

  const [actionLoading, setActionLoading] = React.useState(false)

  const [openDelete, setOpenDelete] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)

  const [openOrderCreate, setOpenOrderCreate] = React.useState(false)

  const [duplicateHint, setDuplicateHint] = React.useState<{ count: number; search: string } | null>(null)

  React.useEffect(() => setIsMounted(true), [])

  type OrderLite = {
    id: string
    number?: string
    title?: string
    description?: string
    createdAt?: string
    updatedAt?: string
    status?: string
    totalAmount?: number
  }

  type InvoiceLite = {
    id: string
    number?: string
    createdAt?: string
    updatedAt?: string
    status?: string
    total?: number
    totalAmount?: number
  }

  type PaymentLite = {
    id: string
    amount?: number
    method?: string
    createdAt?: string
    processedAt?: string
    status?: string
  }

  const buildTimelineFallback = async (c: CustomerResponse, v: VehicleResponse[]): Promise<TimelineEvent[]> => {
    const events: TimelineEvent[] = []

    events.push({
      id: `profile-${c.id}`,
      type: "profile",
      title: "Регистрация клиента",
      description: c.companyName ? `Юрлицо: ${c.companyName}` : "Физлицо",
      date: c.createdAt,
      status: "success",
    })

    v.forEach((vehicle) => {
      const label = `${vehicle.model?.brand?.name || ""} ${vehicle.model?.name || ""}`.trim()
      events.push({
        id: `vehicle-${vehicle.id}`,
        type: "vehicle",
        title: "Добавлен автомобиль",
        description: `${label || "ТС"} (${vehicle.licensePlate || vehicle.vin || "—"})`,
        date: vehicle.createdAt || c.createdAt,
        status: "info",
        relatedId: vehicle.id,
      })
    })

    try {
      const appointments = await appointmentsAPI.findByCustomer(c.id)
      ;(appointments || []).forEach((a) => {
        events.push({
          id: `apt-${a.id}`,
          type: "appointment",
          title: `Запись: ${a.status === "COMPLETED" ? "Завершена" : "Планируется"}`,
          description: `${a.vehicleInfo || ""} • Механик: ${a.mechanicName || "—"}`,
          date: a.startTime || a.createdAt || c.createdAt,
          status: a.status === "COMPLETED" ? "success" : a.status === "CANCELED" ? "warning" : "info",
          relatedId: a.id,
          metadata: { status: a.status, priority: a.priority },
        })
      })
    } catch {
      // ignore
    }

    try {
      const ordersMod = (await import("@/lib/api/orders").catch(() => null)) as unknown as {
        ordersAPI?: {
          list?: (q: unknown) => Promise<{ items?: OrderLite[] }>
          findByCustomer?: (customerId: string) => Promise<OrderLite[]>
        }
      } | null

      let orders: OrderLite[] = []
      if (ordersMod?.ordersAPI?.list) {
        const res = await ordersMod.ordersAPI.list({
          customerId: c.id,
          page: 1,
          limit: 50,
          sortField: "createdAt",
          sortOrder: "desc",
        })
        orders = res?.items ?? []
      } else if (ordersMod?.ordersAPI?.findByCustomer) {
        orders = (await ordersMod.ordersAPI.findByCustomer(c.id)) ?? []
      }

      orders.forEach((o) => {
        events.push({
          id: `order-${o.id}`,
          type: "order",
          title: `Заказ-наряд #${o.number || o.id.slice(0, 6)}`,
          description: o.title || o.description || "Заказ клиента",
          date: o.createdAt || o.updatedAt || c.createdAt,
          status: o.status === "COMPLETED" || o.status === "CLOSED" ? "success" : "info",
          amount: typeof o.totalAmount === "number" ? o.totalAmount : undefined,
          relatedId: o.id,
        })
      })
    } catch {
      // ignore
    }

    try {
      const invoicesMod = (await import("@/lib/api/invoices").catch(() => null)) as unknown as {
        invoicesAPI?: { list?: (q: unknown) => Promise<{ items?: InvoiceLite[] }> }
      } | null

      if (invoicesMod?.invoicesAPI?.list) {
        const res = await invoicesMod.invoicesAPI.list({
          customerId: c.id,
          page: 1,
          limit: 50,
          sortField: "createdAt",
          sortOrder: "desc",
        })

        const items: InvoiceLite[] = res?.items ?? []
        items.forEach((inv) => {
          events.push({
            id: `invoice-${inv.id}`,
            type: "invoice",
            title: `Счет #${inv.number || inv.id.slice(0, 6)}`,
            description: inv.status ? `Статус: ${inv.status}` : "Выставлен счет",
            date: inv.createdAt || inv.updatedAt || c.createdAt,
            status: inv.status === "PAID" ? "success" : inv.status === "OVERDUE" ? "warning" : "info",
            amount:
              typeof inv.total === "number"
                ? inv.total
                : typeof inv.totalAmount === "number"
                  ? inv.totalAmount
                  : undefined,
            relatedId: inv.id,
          })
        })
      }
    } catch {
      // ignore
    }

    try {
      const paymentsMod = (await import("@/lib/api/payments").catch(() => null)) as unknown as {
        paymentsAPI?: { list?: (q: unknown) => Promise<{ items?: PaymentLite[] }> }
      } | null

      if (paymentsMod?.paymentsAPI?.list) {
        const res = await paymentsMod.paymentsAPI.list({
          customerId: c.id,
          page: 1,
          limit: 50,
          sortField: "createdAt",
          sortOrder: "desc",
        })

        const items: PaymentLite[] = res?.items ?? []
        items.forEach((p) => {
          events.push({
            id: `payment-${p.id}`,
            type: "payment",
            title: `Платеж ${p.status || ""}`.trim(),
            description: p.method ? `Метод: ${p.method}` : undefined,
            date: p.createdAt || p.processedAt || c.createdAt,
            status: p.status === "succeeded" || p.status === "PAID" ? "success" : p.status === "failed" ? "error" : "info",
            amount: typeof p.amount === "number" ? p.amount : undefined,
            relatedId: p.id,
          })
        })
      }
    } catch {
      // ignore
    }

    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }

  React.useEffect(() => {
    if (!isMounted) return
    if (authLoading) return

    if (!isAuthenticated || !user) {
      router.push("/login")
      return
    }
    if (!id) return

    let cancelled = false

    async function loadAll() {
      setLoading(true)
      setError(null)

      try {
        const [c, v] = await Promise.all([
          customersAPI.getCustomer(id),
          vehiclesAPI.getCustomerVehicles(id).catch(() => []),
        ])

        if (cancelled) return

        const vehiclesArr = Array.isArray(v) ? v : []
        setCustomer(c)
        setVehicles(vehiclesArr)

        try {
          const tl = await customersAPI.getTimeline(id)
          if (!cancelled) setTimelineEvents((tl?.events || []) as TimelineEvent[])
        } catch {
          const events = await buildTimelineFallback(c, vehiclesArr)
          if (!cancelled) setTimelineEvents(events)
        }

        const search = c.email || c.phone || ""
        if (search) {
          try {
            const dup = await customersAPI.getCustomers({ search, page: 1, limit: 5 })
            const others = dup.items.filter((i) => i.id !== c.id)
            if (!cancelled) setDuplicateHint(others.length > 0 ? { count: others.length, search } : null)
          } catch {
            if (!cancelled) setDuplicateHint(null)
          }
        } else {
          if (!cancelled) setDuplicateHint(null)
        }
      } catch (e) {
        try {
          const parsed = JSON.parse((e as Error).message) as { message?: string }
          if (!cancelled) setError(parsed.message || "Ошибка загрузки клиента")
        } catch {
          if (!cancelled) setError("Ошибка загрузки клиента")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadAll()
    return () => {
      cancelled = true
    }
  }, [isMounted, authLoading, isAuthenticated, user, router, id])

  const handleExport = async () => {
    if (!id) return

    setActionLoading(true)
    setError(null)

    try {
      const { blob, filename } = await customersAPI.exportCustomer(id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = filename || `customer_${id}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      try {
        const parsed = JSON.parse((e as Error).message) as { message?: string }
        setError(parsed.message || "Ошибка экспорта")
      } catch {
        setError("Ошибка экспорта")
      }
    } finally {
      setActionLoading(false)
    }
  }

  const handleRevokeConsent = async () => {
    if (!id) return

    setActionLoading(true)
    setError(null)

    try {
      const updated = await customersAPI.revokeConsent(id)
      setCustomer(updated)
    } catch (e) {
      try {
        const parsed = JSON.parse((e as Error).message) as { message?: string }
        setError(parsed.message || "Не удалось отозвать согласие")
      } catch {
        setError("Не удалось отозвать согласие")
      }
    } finally {
      setActionLoading(false)
    }
  }

  const roleObj = (user as unknown as { role?: string | { name?: string } } | null)?.role
  const roleName = (typeof roleObj === "string" ? roleObj : roleObj?.name || "").toLowerCase()
  const canDelete = ["owner", "company_owner", "admin", "company_admin", "superadmin"].includes(roleName)

  const confirmDelete = async () => {
    if (!id) return

    setDeleting(true)
    setError(null)

    try {
      await customersAPI.deleteCustomer?.(id)
      router.push("/dashboard/customers")
    } catch (e) {
      try {
        const parsed = JSON.parse((e as Error).message) as { message?: string }
        setError(parsed.message || "Не удалось удалить клиента")
      } catch {
        setError("Не удалось удалить клиента")
      }
    } finally {
      setDeleting(false)
      setOpenDelete(false)
    }
  }

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

  const fullName =
    [customer?.firstName, customer?.lastName].filter(Boolean).join(" ") ||
    customer?.companyName ||
    "Клиент"

  const headerActions = (
    <div className="flex items-center gap-sm">
      <Button variant="primary" size="sm" onClick={() => setOpenOrderCreate(true)} disabled={loading || !customer}>
        <Plus className="w-4 h-4 mr-xs" />
        Создать заказ
      </Button>

      <Button variant="secondary" size="sm" onClick={handleExport} disabled={actionLoading || loading || !customer}>
        <Download className="w-4 h-4 mr-xs" />
        Экспорт
      </Button>

      <Button variant="ghost" size="sm" onClick={handleRevokeConsent} disabled={actionLoading || loading || !customer}>
        <Shield className="w-4 h-4 mr-xs" />
        Согласие
      </Button>

      {canDelete && (
        <Button variant="danger" size="sm" onClick={() => setOpenDelete(true)} disabled={deleting || loading || !customer}>
          <Trash2 className="w-4 h-4 mr-xs" />
          Удалить
        </Button>
      )}
    </div>
  )

  return (
    <AppLayout>
      <div className="container mx-auto px-lg py-xl flex flex-col gap-lg">
        <NavigationHeader
          title={fullName}
          subtitle="Профиль клиента и история взаимодействий"
          icon={<Users className="w-5 h-5" />}
          backHref="/dashboard/customers"
          backLabel="Клиенты"
          actions={headerActions}
        />

        {duplicateHint && (
          <Card className="p-md border border-status-waiting/30 bg-status-waiting/10 text-status-waiting">
            <div className="flex items-center gap-sm text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span className="min-w-0">
                Возможные дубли: {duplicateHint.count}. Проверьте{" "}
                <Link
                  href={`/dashboard/customers?search=${encodeURIComponent(duplicateHint.search)}`}
                  className="underline underline-offset-2"
                >
                  поиск по “{duplicateHint.search}”
                </Link>
                .
              </span>
            </div>
          </Card>
        )}

        {loading ? (
          <div className="grid gap-lg">
            <Card className="p-lg">
              <div className="flex items-start gap-md">
                <Skeleton className="w-10 h-10 rounded-md" />
                <div className="flex-1 min-w-0">
                  <Skeleton className="h-5 w-[260px] max-w-full" />
                  <div className="mt-sm grid gap-xs">
                    <Skeleton className="h-4 w-[360px] max-w-full" />
                    <Skeleton className="h-4 w-[300px] max-w-full" />
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-lg">
              <Skeleton className="h-5 w-[160px]" />
              <div className="mt-md grid md:grid-cols-2 gap-md">
                <Skeleton className="h-16 rounded-md" />
                <Skeleton className="h-16 rounded-md" />
              </div>
            </Card>
          </div>
        ) : error ? (
          <Card className="p-lg border border-status-error/30 bg-status-error/10 text-status-error text-sm">
            {error}
          </Card>
        ) : !customer ? (
          <Card className="p-lg text-sm text-muted-foreground">Клиент не найден</Card>
        ) : (
          <>
            {/* Who / What */}
            <Card className="p-lg">
              <div className="flex items-start justify-between gap-lg">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{fullName}</div>

                  <div className="mt-sm flex flex-wrap items-center gap-md text-sm text-muted-foreground">
                    {customer.phone && (
                      <span className="inline-flex items-center gap-xs">
                        <Phone className="w-4 h-4" />
                        {customer.phone}
                      </span>
                    )}

                    {customer.email && (
                      <span className="inline-flex items-center gap-xs">
                        <Mail className="w-4 h-4" />
                        {customer.email}
                      </span>
                    )}

                    <span className="inline-flex items-center gap-xs">
                      <Calendar className="w-4 h-4" />
                      Клиент с {new Date(customer.createdAt).toLocaleDateString("ru-RU")}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 text-sm text-muted-foreground">
                  {customer.companyName ? "Юрлицо" : "Физлицо"}
                </div>
              </div>
            </Card>

            {/* Vehicles */}
            <Card className="p-lg">
              <div className="flex items-center justify-between mb-md">
                <div className="flex items-center gap-sm">
                  <Car className="w-4 h-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold text-foreground">Автомобили</h2>
                </div>

                <span className="text-sm text-muted-foreground">{vehicles.length} ТС</span>
              </div>

              {vehicles.length === 0 ? (
                <div className="p-section text-center text-sm text-muted-foreground">У клиента пока нет автомобилей.</div>
              ) : (
                <div className="grid md:grid-cols-2 gap-md">
                  {vehicles.map((v) => {
                    const model = `${v.model?.brand?.name || ""} ${v.model?.name || ""}`.trim()
                    const history = typeof v.serviceHistoryCount === "number" ? ` · История: ${v.serviceHistoryCount}` : ""
                    const serviceBadge = v.needsService
                      ? " · ТО просрочено"
                      : typeof v.daysUntilService === "number"
                        ? ` · ТО через ${v.daysUntilService} д.`
                        : ""

                    return (
                      <Link
                        key={v.id}
                        href={`/dashboard/vehicles/${v.id}`}
                        className="p-md rounded-md border border-border hover:bg-surface-2 transition-colors"
                      >
                        <div className="flex items-start gap-md min-w-0">
                          <div className="w-10 h-10 rounded-md bg-surface-2 border flex items-center justify-center shrink-0">
                            <Car className="w-4 h-4 text-muted-foreground" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium truncate text-foreground">{model || "Автомобиль"}</div>
                            <div className="text-xs text-muted-foreground truncate mt-xs">
                              {(v.licensePlate || v.vin || "—") + " · Пробег: " + (v.mileage ?? "—")}
                              {history}
                              {serviceBadge && (
                                <span
                                  className={cn(
                                    v.needsService ? "text-status-error" : "text-status-waiting"
                                  )}
                                >
                                  {serviceBadge}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </Card>

            {/* When */}
            <CustomerTimeline events={timelineEvents} loading={loading} />
          </>
        )}
      </div>

      <ConfirmDialog
        open={openDelete}
        onOpenChange={setOpenDelete}
        title="Удалить клиента?"
        description="Будет выполнена мягкая запись: ретеншн сохранится. Продолжить?"
        confirmText="Удалить"
        variant="destructive"
        loading={deleting}
        onConfirm={confirmDelete}
      />

      <OrderCreateDialog
        open={openOrderCreate}
        onOpenChange={setOpenOrderCreate}
        initialCustomerId={customer?.id}
        onCreated={(o) => router.push(`/dashboard/orders/${o.id}`)}
      />
    </AppLayout>
  )
}
