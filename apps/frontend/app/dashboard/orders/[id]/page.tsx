// path: apps/frontend/app/dashboard/orders/[id]/page.tsx
"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import {
  RefreshCw,
  Wrench,
  User,
  Car,
  Phone,
  MapPin,
  Save,
  Play,
  Flag,
  Plus,
  DollarSign,
  BadgePercent,
  Shield,
  Calendar,
} from "lucide-react"
import { toast } from "sonner"

import { AppLayout } from "@/components/app/AppLayout"
import { NavigationHeader } from "@/components/platform/NavigationHeader"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/ui/status-badge"

import { OrderServiceAddDialog } from "@/components/orders/order-service-add-dialog"
import { OrderPartAddDialog } from "@/components/orders/order-part-add-dialog"
import { OrderServiceRow } from "@/components/orders/order-service-row"
import { OrderPartRow } from "@/components/orders/order-part-row"

import { useAuth } from "@/lib/hooks/use-auth"
import { ordersAPI } from "@/lib/api/orders"
import { usersAPI } from "@/lib/api/users"
import type { User as AppUser } from "@/lib/types/users"
import type {
  OrderResponse,
  OrderServiceResponse,
  OrderPartResponse,
  OrderStatus,
} from "@/lib/types/orders"
import { cn } from "@/lib/utils"

function formatMoneyRub(v: number | null | undefined) {
  return `${Math.round(v || 0).toLocaleString("ru-RU")} ₽`
}

export default function OrderDetailsPage() {
  const params = useParams<{ id: string }>()
  const id = React.useMemo(
    () => (Array.isArray(params?.id) ? params.id[0] : params?.id) as string,
    [params]
  )

  const router = useRouter()
  const { isAuthenticated, user, isLoading: authLoading } = useAuth()

  const [isMounted, setIsMounted] = React.useState(false)

  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const [order, setOrder] = React.useState<OrderResponse | null>(null)
  const [services, setServices] = React.useState<OrderServiceResponse[]>([])
  const [parts, setParts] = React.useState<OrderPartResponse[]>([])

  const [updating, setUpdating] = React.useState(false)
  const [newStatus, setNewStatus] = React.useState<OrderStatus | "">("")
  const [mechanics, setMechanics] = React.useState<AppUser[]>([])

  const [openAddService, setOpenAddService] = React.useState(false)
  const [openAddPart, setOpenAddPart] = React.useState(false)

  React.useEffect(() => setIsMounted(true), [])

  React.useEffect(() => {
    if (!isAuthenticated) return

    ;(async () => {
      try {
        const res = await usersAPI.listUsers({ limit: 100 })
        const onlyMechanics = (res.items || []).filter((u) =>
          u.role?.name?.toLowerCase().includes("mechanic")
        )
        setMechanics(onlyMechanics)
      } catch {
        // ignore
      }
    })()
  }, [isAuthenticated])

  const loadAll = React.useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const [o, srv, prts] = await Promise.all([
        ordersAPI.getOrder(id),
        ordersAPI.getOrderServices(id),
        ordersAPI.getOrderParts(id),
      ])
      setOrder(o)
      setServices(srv.services || [])
      setParts(prts.parts || [])
      setNewStatus(o.status)
    } catch (e) {
      try {
        const parsed = JSON.parse((e as Error).message) as { message?: string }
        setError(parsed.message || "Ошибка загрузки заказа")
      } catch {
        setError("Ошибка загрузки заказа")
      }
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
    void loadAll()
  }, [isMounted, authLoading, isAuthenticated, user, router, loadAll])

  const handleRefresh = React.useCallback(() => {
    void loadAll()
  }, [loadAll])

  const handleUpdateStatus = React.useCallback(
    async (statusArg?: OrderStatus) => {
      const statusToSet = statusArg ?? newStatus
      if (!id || !statusToSet) return

      setUpdating(true)
      setError(null)
      try {
        const updated = await ordersAPI.updateOrderStatus(id, statusToSet)
        setOrder(updated)
        setNewStatus(updated.status)
        toast.success("Статус заказа обновлен")
      } catch (e) {
        try {
          const parsed = JSON.parse((e as Error).message) as { message?: string }
          setError(parsed.message || "Ошибка обновления статуса")
        } catch {
          setError("Ошибка обновления статуса")
        }
      } finally {
        setUpdating(false)
      }
    },
    [id, newStatus]
  )

  const getUserId = (u: unknown): string | undefined => {
    if (u && typeof u === "object" && "id" in u) {
      const maybe = (u as { id?: unknown }).id
      return typeof maybe === "string" ? maybe : undefined
    }
    return undefined
  }

  const handleAssignMe = React.useCallback(async () => {
    if (!id) return
    const myId = getUserId(user)
    if (!myId) {
      toast.error("Не удалось определить текущего пользователя")
      return
    }
    try {
      const updated = await ordersAPI.assignMechanic(id, myId)
      setOrder(updated)
      toast.success("Исполнитель назначен")
    } catch {
      toast.error("Ошибка назначения исполнителя")
    }
  }, [id, user])

  const quickToInProgress = React.useCallback(async () => {
    if (!order?.assignedToUser) {
      toast.error("Сначала назначьте исполнителя")
      return
    }
    await handleUpdateStatus("in_progress")
  }, [order?.assignedToUser, handleUpdateStatus])

  const quickToCompleted = React.useCallback(async () => {
    await handleUpdateStatus("completed")
  }, [handleUpdateStatus])

  const handleRecalculate = React.useCallback(async () => {
    if (!id) return
    setUpdating(true)
    setError(null)
    try {
      const o = await ordersAPI.recalculateTotals(id)
      setOrder(o)
      toast.success("Финансы пересчитаны")
    } catch {
      setError("Ошибка пересчета")
    } finally {
      setUpdating(false)
    }
  }, [id])

  const onServiceAdded = React.useCallback(async () => {
    await loadAll()
    toast.success("Услуга добавлена")
  }, [loadAll])

  const onPartAdded = React.useCallback(async () => {
    await loadAll()
    toast.success("Запчасть добавлена")
  }, [loadAll])

  if (!isMounted) return null

  if (authLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex items-center gap-sm">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-muted-foreground">Загрузка заказа…</span>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (!isAuthenticated || !user) return null

  const orderNumber = order?.orderNumber || "…"

  const headerActions = (
    <div className="flex items-center gap-sm">
      <Button variant="secondary" size="sm" onClick={handleRefresh}>
        <RefreshCw className="w-4 h-4 mr-xs" />
        Обновить
      </Button>
    </div>
  )

  return (
    <AppLayout>
      <div className="container mx-auto px-lg py-xl flex flex-col gap-lg">
        <NavigationHeader
          title={`Заказ ${orderNumber}`}
          subtitle="Детали заказ-наряда и управление работами"
          icon={<Wrench className="w-5 h-5" />}
          backHref="/dashboard/orders"
          backLabel="К заказам"
          actions={headerActions}
        />

        {error && (
          <div className="rounded-md border border-status-error/20 bg-status-error/10 text-status-error px-md py-sm text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <Card className="p-xl">
            <div className="space-y-md">
              <div className="h-6 bg-surface-2 rounded-md animate-pulse" />
              <div className="h-24 bg-surface-2 rounded-md animate-pulse" />
              <div className="h-24 bg-surface-2 rounded-md animate-pulse" />
            </div>
          </Card>
        ) : !order ? (
          <Card className="p-section text-center">
            <div className="text-sm text-muted-foreground">Заказ не найден</div>
          </Card>
        ) : (
          <>
            {/* Top grid: status / customer / vehicle */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
              {/* Status */}
              <Card className="p-lg">
                <div className="flex items-start justify-between gap-md">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold">Статус</div>
                    <div className="mt-sm flex items-center gap-sm">
                      <StatusBadge status={order.status} />
                      <Badge variant="secondary">{formatMoneyRub(order.finalAmount)}</Badge>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <Button variant="ghost" size="sm" onClick={handleAssignMe}>
                      <User className="w-4 h-4 mr-xs" />
                      Назначить меня
                    </Button>
                  </div>
                </div>

                <div className="mt-lg grid grid-cols-1 gap-sm">
                  <label className="text-xs text-muted-foreground" htmlFor="order-status">
                    Изменить статус
                  </label>
                  <select
                    id="order-status"
                    className={cn(
                      "h-10 rounded-md border border-input bg-background text-sm px-md",
                      "text-foreground hover:border-border/80"
                    )}
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
                  >
                    <option value="new">Новый</option>
                    <option value="in_progress">В работе</option>
                    <option value="awaiting_parts">Ожидание запчастей</option>
                    <option value="completed">Завершен</option>
                    <option value="canceled">Отменен</option>
                  </select>

                  <div className="flex items-center gap-sm flex-wrap">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => void handleUpdateStatus()}
                      disabled={updating || !newStatus || newStatus === order.status}
                    >
                      <Save className="w-4 h-4 mr-xs" />
                      Обновить
                    </Button>

                    {order.status === "new" && (
                      <Button variant="secondary" size="sm" onClick={quickToInProgress}>
                        <Play className="w-4 h-4 mr-xs" />
                        В работу
                      </Button>
                    )}
                    {order.status === "in_progress" && (
                      <Button variant="secondary" size="sm" onClick={quickToCompleted}>
                        <Flag className="w-4 h-4 mr-xs" />
                        Готово
                      </Button>
                    )}
                  </div>

                  <div className="mt-sm">
                    <label className="text-xs text-muted-foreground" htmlFor="order-mechanic">
                      Исполнитель
                    </label>
                    <select
                      id="order-mechanic"
                      className={cn(
                        "mt-xs h-10 w-full rounded-md border border-input bg-background text-sm px-md",
                        "text-foreground hover:border-border/80"
                      )}
                      defaultValue=""
                      onChange={async (e) => {
                        const mechanicId = e.target.value
                        if (!mechanicId || !id) return
                        try {
                          const updated = await ordersAPI.assignMechanic(id, mechanicId)
                          setOrder(updated)
                          toast.success("Исполнитель назначен")
                        } catch {
                          toast.error("Ошибка назначения исполнителя")
                        }
                      }}
                    >
                      <option value="">Выберите механика</option>
                      {mechanics.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.firstName} {m.lastName}
                        </option>
                      ))}
                    </select>

                    <div className="text-xs text-muted-foreground mt-xs">
                      {order.assignedToUser
                        ? `Назначен: ${order.assignedToUser.firstName} ${order.assignedToUser.lastName}`
                        : "Не назначен"}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Customer */}
              <Card className="p-lg">
                <div className="flex items-center gap-sm">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <div className="text-sm font-semibold">Клиент</div>
                </div>

                <div className="mt-md">
                  <div className="text-sm font-medium">
                    {order.customer?.firstName || order.customer?.companyName || "Не указан"}
                  </div>

                  {order.customer?.phone && (
                    <div className="text-xs text-muted-foreground mt-sm flex items-center gap-xs">
                      <Phone className="w-3.5 h-3.5" />
                      {order.customer.phone}
                    </div>
                  )}

                  {order.customer?.email && (
                    <div className="text-xs text-muted-foreground mt-xs">{order.customer.email}</div>
                  )}
                </div>
              </Card>

              {/* Vehicle */}
              <Card className="p-lg">
                <div className="flex items-center gap-sm">
                  <Car className="w-4 h-4 text-muted-foreground" />
                  <div className="text-sm font-semibold">Автомобиль</div>
                </div>

                <div className="mt-md">
                  <div className="text-sm font-medium">
                    {[order.vehicle?.model?.brand?.name, order.vehicle?.model?.name]
                      .filter(Boolean)
                      .join(" ") || "Не указано"}
                  </div>

                  {order.vehicle?.licensePlate && (
                    <div className="text-xs text-muted-foreground mt-sm flex items-center gap-xs">
                      <MapPin className="w-3.5 h-3.5" />
                      {order.vehicle.licensePlate}
                    </div>
                  )}

                  {order.mileage && (
                    <div className="text-xs text-muted-foreground mt-xs">
                      Пробег: {order.mileage.toLocaleString("ru-RU")} км
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Financial */}
            <Card className="p-lg">
              <div className="flex items-start justify-between gap-md">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">Финансы</div>
                  <div className="text-xs text-muted-foreground mt-xs">Сводка по суммам заказа</div>
                </div>

                <Button variant="secondary" size="sm" onClick={handleRecalculate} disabled={updating}>
                  <RefreshCw className="w-4 h-4 mr-xs" />
                  Пересчитать
                </Button>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-md mt-lg">
                <div className="rounded-md border bg-card p-md">
                  <div className="text-xs text-muted-foreground flex items-center gap-xs">
                    <Shield className="w-4 h-4" />
                    Подытог
                  </div>
                  <div className="text-sm font-semibold mt-sm tabular-nums">
                    {formatMoneyRub(order.totalAmount)}
                  </div>
                </div>

                <div className="rounded-md border bg-card p-md">
                  <div className="text-xs text-muted-foreground flex items-center gap-xs">
                    <BadgePercent className="w-4 h-4" />
                    Скидка
                  </div>
                  <div className="text-sm font-semibold mt-sm tabular-nums">
                    {formatMoneyRub(order.discountAmount)}
                  </div>
                </div>

                <div className="rounded-md border bg-card p-md">
                  <div className="text-xs text-muted-foreground flex items-center gap-xs">
                    <Calendar className="w-4 h-4" />
                    Налог
                  </div>
                  <div className="text-sm font-semibold mt-sm tabular-nums">
                    {formatMoneyRub(order.taxAmount)}
                  </div>
                </div>

                <div className="rounded-md border bg-card p-md">
                  <div className="text-xs text-muted-foreground flex items-center gap-xs">
                    <DollarSign className="w-4 h-4" />
                    Итого
                  </div>
                  <div className="text-sm font-semibold mt-sm tabular-nums">
                    {formatMoneyRub(order.finalAmount)}
                  </div>
                </div>
              </div>
            </Card>

            {/* Services */}
            <Card className="overflow-hidden">
              <div className="p-lg border-b border-border/50 flex items-center justify-between gap-md">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">Услуги</div>
                  <div className="text-xs text-muted-foreground mt-xs">
                    Работы по заказу ({services.length})
                  </div>
                </div>

                <Button variant="secondary" size="sm" onClick={() => setOpenAddService(true)}>
                  <Plus className="w-4 h-4 mr-xs" />
                  Добавить услугу
                </Button>
              </div>

              {services.length === 0 ? (
                <div className="p-section text-center">
                  <div className="text-sm text-muted-foreground">Услуги пока не добавлены</div>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {services.map((s) => (
                    <OrderServiceRow key={s.id} service={s} orderId={id} onChanged={handleRefresh} />
                  ))}
                </div>
              )}
            </Card>

            {/* Parts */}
            <Card className="overflow-hidden">
              <div className="p-lg border-b border-border/50 flex items-center justify-between gap-md">
                <div className="min-w-0">
                  <div className="text-sm font-semibold">Запчасти</div>
                  <div className="text-xs text-muted-foreground mt-xs">
                    Материалы для заказа ({parts.length})
                  </div>
                </div>

                <Button variant="secondary" size="sm" onClick={() => setOpenAddPart(true)}>
                  <Plus className="w-4 h-4 mr-xs" />
                  Добавить запчасть
                </Button>
              </div>

              {parts.length === 0 ? (
                <div className="p-section text-center">
                  <div className="text-sm text-muted-foreground">Запчасти пока не добавлены</div>
                </div>
              ) : (
                <div className="divide-y divide-border/50">
                  {parts.map((p) => (
                    <OrderPartRow key={p.id} part={p} orderId={id} onChanged={handleRefresh} />
                  ))}
                </div>
              )}
            </Card>

            {/* Dialogs */}
            <OrderServiceAddDialog
              orderId={id}
              open={openAddService}
              onOpenChange={setOpenAddService}
              onAdded={onServiceAdded}
            />

            <OrderPartAddDialog
              orderId={id}
              open={openAddPart}
              onOpenChange={setOpenAddPart}
              onAdded={onPartAdded}
            />
          </>
        )}
      </div>
    </AppLayout>
  )
}
