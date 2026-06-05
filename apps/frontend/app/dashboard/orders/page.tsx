// path: apps/frontend/app/dashboard/orders/page.tsx
"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Wrench,
  Plus,
  Search,
  RefreshCw,
  ChevronRight,
  LayoutGrid,
  List,
  CheckCircle,
  Clock,
  AlertTriangle,
  DollarSign,
} from "lucide-react"

import { AppLayout } from "@/components/app/AppLayout"
import { NavigationHeader } from "@/components/platform/NavigationHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageFiltersCard, PageFiltersRow } from "@/components/app/PageFiltersCard"
import { PageContentCard } from "@/components/app/PageContentCard"
import { StatsCard, StatsGrid } from "@/components/app/StatsCard"
import { PaginationControls } from "@/components/app/PaginationControls"
import { StatusBadge, type OrderStatus as UIOrderStatus } from "@/components/ui/status-badge"
import { OrderCreateDialog } from "@/components/orders/order-create-dialog"
import { OrderKanban } from "@/components/orders/order-kanban"

import { useAuth } from "@/lib/hooks/use-auth"
import { ordersAPI } from "@/lib/api/orders"
import type {
  OrdersQuery,
  PaginatedOrdersResponse,
  OrderStatus,
  OrderResponse,
} from "@/lib/types/orders"
import { cn } from "@/lib/utils"

export default function OrdersListPage() {
  const { isAuthenticated, user, isLoading: authLoading } = useAuth()
  const router = useRouter()

  const [isMounted, setIsMounted] = React.useState(false)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [data, setData] = React.useState<PaginatedOrdersResponse | null>(null)

  const [search, setSearch] = React.useState("")
  const [status, setStatus] = React.useState<OrderStatus | "">("")
  const [page, setPage] = React.useState(1)
  const [limit, setLimit] = React.useState(10)

  const [openCreate, setOpenCreate] = React.useState(false)
  const [view, setView] = React.useState<"list" | "board">("board")
  const [kanbanRefreshKey, setKanbanRefreshKey] = React.useState(0)

  React.useEffect(() => setIsMounted(true), [])

  const query: OrdersQuery = React.useMemo(
    () => ({
      search: search || undefined,
      status: (status || undefined) as OrderStatus | undefined,
      page,
      limit,
    }),
    [search, status, page, limit]
  )

  const items = React.useMemo(() => data?.items || [], [data])

  const stats = React.useMemo(() => {
    const total = data?.total || 0
    const newCount = items.filter((o) => o.status === "new").length
    const inProgress = items.filter((o) => o.status === "in_progress").length
    const awaitingParts = items.filter((o) => o.status === "awaiting_parts").length
    const completed = items.filter((o) => o.status === "completed").length
    const totalRevenue = items.reduce((sum, o) => sum + (o.finalAmount || 0), 0)

    return { total, newCount, inProgress, awaitingParts, completed, totalRevenue }
  }, [data, items])

  const handleRefresh = React.useCallback(() => {
    if (view === "list") {
      setPage(1)
      ordersAPI
        .getOrders({ ...query, page: 1 })
        .then(setData)
        .catch(() => setError("Ошибка загрузки заказов"))
    } else {
      setKanbanRefreshKey((k) => k + 1)
    }
  }, [view, query])

  const onCreated = React.useCallback(async () => {
    if (view === "list") {
      setPage(1)
      const res = await ordersAPI.getOrders({ ...query, page: 1 })
      setData(res)
    } else {
      setKanbanRefreshKey((k) => k + 1)
    }
  }, [view, query])

  React.useEffect(() => {
    if (!isMounted) return
    if (authLoading) return

    if (!isAuthenticated || !user) {
      router.push("/login")
      return
    }

    if (view !== "list") return

    let cancelled = false
    const DEBOUNCE_MS = 300

    const timer = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await ordersAPI.getOrders(query)
        if (!cancelled) setData(res)
      } catch {
        if (!cancelled) setError("Ошибка загрузки заказов")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, DEBOUNCE_MS)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [isMounted, authLoading, isAuthenticated, user, router, query, view])

  if (!isMounted) return null

  if (authLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex items-center gap-sm">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-muted-foreground">Загрузка заказов...</span>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (!isAuthenticated || !user) return null

  const headerActions = (
    <div className="flex items-center gap-sm">
      {/* View toggle */}
      <div className="inline-flex items-center rounded-md border bg-card p-xs">
        <Button
          variant={view === "board" ? "secondary" : "ghost"}
          size="sm"
          className="h-8"
          onClick={() => setView("board")}
        >
          <LayoutGrid className="w-4 h-4 mr-xs" />
          Канбан
        </Button>
        <Button
          variant={view === "list" ? "secondary" : "ghost"}
          size="sm"
          className="h-8"
          onClick={() => setView("list")}
        >
          <List className="w-4 h-4 mr-xs" />
          Список
        </Button>
      </div>

      <Button variant="secondary" size="sm" onClick={handleRefresh}>
        <RefreshCw className="w-4 h-4 mr-xs" />
        Обновить
      </Button>

      <Button variant="primary" size="sm" onClick={() => setOpenCreate(true)}>
        <Plus className="w-4 h-4 mr-xs" />
        Новый заказ
      </Button>
    </div>
  )

  return (
    <AppLayout>
      <div className="container mx-auto px-lg py-xl flex flex-col gap-lg">
        <NavigationHeader
          title="Заказы"
          subtitle="Управление заказ-нарядами"
          icon={<Wrench className="w-5 h-5" />}
          actions={headerActions}
        />

        {/* Stats (только для list-view, чтобы не показывать нули в канбане) */}
        {view === "list" && (
          <StatsGrid cols={6}>
            <StatsCard title="Всего заказов" value={stats.total} icon={Wrench} />
            <StatsCard title="Новые" value={stats.newCount} icon={AlertTriangle} />
            <StatsCard title="В работе" value={stats.inProgress} icon={Clock} />
            <StatsCard title="Ожидание" value={stats.awaitingParts} icon={AlertTriangle} />
            <StatsCard title="Завершено" value={stats.completed} icon={CheckCircle} />
            <StatsCard
              title="Выручка"
              value={Math.round(stats.totalRevenue).toLocaleString("ru-RU")}
              icon={DollarSign}
              suffix="₽"
            />
          </StatsGrid>
        )}

        {/* Filters */}
        <PageFiltersCard>
          <PageFiltersRow>
            <div className="relative w-full lg:max-w-lg">
              <label htmlFor="orders-search" className="sr-only">
                Поиск заказов
              </label>
              <Input
                id="orders-search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                placeholder="Поиск по номеру/клиенту/авто..."
                className="pl-[36px]"
              />
              <Search className="w-4 h-4 absolute left-md top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>

            {/* status/limit — только для list-view (в канбане статус = колонки) */}
            {view === "list" && (
              <div className="flex items-center gap-sm">
                <label className="sr-only" htmlFor="orders-status">
                  Статус
                </label>
                <select
                  id="orders-status"
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value as OrderStatus | "")
                    setPage(1)
                  }}
                  className={cn(
                    "h-10 rounded-md border border-input bg-background text-sm px-md",
                    "text-foreground hover:border-border/80"
                  )}
                >
                  <option value="">Все статусы</option>
                  <option value="new">Новый</option>
                  <option value="in_progress">В работе</option>
                  <option value="awaiting_parts">Ожидание запчастей</option>
                  <option value="completed">Завершен</option>
                  <option value="canceled">Отменен</option>
                </select>

                <label className="sr-only" htmlFor="orders-limit">
                  На странице
                </label>
                <select
                  id="orders-limit"
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
            )}
          </PageFiltersRow>
        </PageFiltersCard>

        {/* Content */}
        {view === "board" ? (
          <OrderKanban
            search={search}
            refreshKey={kanbanRefreshKey}
            onOrderOpen={(id) => router.push(`/dashboard/orders/${id}`)}
          />
        ) : (
          <>
            <PageContentCard
              loading={loading}
              error={error}
              empty={items.length === 0}
              emptyState={{
                icon: Wrench,
                title: "Заказы не найдены",
                description: search ? "Попробуйте изменить параметры поиска." : "Создайте первый заказ-наряд.",
                action: {
                  label: "Создать заказ",
                  onClick: () => setOpenCreate(true),
                  icon: Plus,
                },
              }}
              onRetry={handleRefresh}
              loadingRows={5}
            >
              <div className="divide-y divide-border/50">
                {items.map((o) => (
                  <OrderRow key={o.id} order={o} />
                ))}
              </div>
            </PageContentCard>

            <PaginationControls
              page={page}
              totalPages={data?.totalPages || 1}
              total={data?.total || 0}
              showing={items.length}
              onPageChange={setPage}
              itemLabel="заказов"
            />
          </>
        )}
      </div>

      <OrderCreateDialog open={openCreate} onOpenChange={setOpenCreate} onCreated={onCreated} />
    </AppLayout>
  )
}

function OrderRow({ order }: { order: OrderResponse }) {
  const badgeStatus = order.status as UIOrderStatus

  return (
    <Link
      href={`/dashboard/orders/${order.id}`}
      className="block transition-colors hover:bg-surface-2"
    >
      <div className="p-md flex items-center justify-between gap-lg min-w-0">
        <div className="flex items-center gap-md min-w-0 flex-1">
          <div className="w-10 h-10 rounded-md bg-surface-2 border flex items-center justify-center shrink-0">
            <span className="text-sm font-semibold text-muted-foreground tabular-nums">
              {order.orderNumber?.split("-").pop()}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-sm min-w-0">
              <span className="text-sm font-medium truncate">{order.orderNumber}</span>
              <StatusBadge status={badgeStatus} className="shrink-0" />
            </div>
            <div className="text-xs text-muted-foreground truncate mt-xs">
              {(order.customer?.firstName || order.customer?.companyName || "Клиент") +
                " · " +
                (order.vehicle?.licensePlate || order.vehicle?.vin || "Авто")}
            </div>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-sm font-medium tabular-nums">
            {(order.finalAmount || 0).toLocaleString("ru-RU")} ₽
          </div>
          <div className="text-xs text-muted-foreground mt-xs">
            {new Date(order.createdAt).toLocaleDateString("ru-RU")}
          </div>
        </div>

        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
      </div>
    </Link>
  )
}
