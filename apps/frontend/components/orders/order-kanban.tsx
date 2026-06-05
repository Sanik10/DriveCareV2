// path: apps/frontend/components/orders/order-kanban.tsx
"use client"

import * as React from "react"

import { ordersAPI } from "@/lib/api/orders"
import type { OrderResponse, OrdersQuery, OrderStatus } from "@/lib/types/orders"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/ui/status-badge"

import { AlertTriangle, GripVertical } from "lucide-react"
import { cn } from "@/lib/utils"

type BoardStatus = "new" | "in_progress" | "awaiting_parts" | "completed" | "canceled"

const COLUMNS: { key: BoardStatus; title: string }[] = [
  { key: "new", title: "Новые" },
  { key: "in_progress", title: "В работе" },
  { key: "awaiting_parts", title: "Ожидание запчастей" },
  { key: "completed", title: "Завершены" },
  { key: "canceled", title: "Отменены" },
]

const COL_MIN_WIDTH = 320

type Props = {
  search?: string
  onOrderOpen?: (id: string) => void
  refreshKey?: number
}

export function OrderKanban({ search, onOrderOpen, refreshKey }: Props) {
  const [loading, setLoading] = React.useState(false)
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)
  const [denyCardId, setDenyCardId] = React.useState<string | null>(null)

  const [columns, setColumns] = React.useState<Record<BoardStatus, OrderResponse[]>>({
    new: [],
    in_progress: [],
    awaiting_parts: [],
    completed: [],
    canceled: [],
  })

  const [pages, setPages] = React.useState<
    Record<BoardStatus, { page: number; totalPages: number }>
  >({
    new: { page: 1, totalPages: 1 },
    in_progress: { page: 1, totalPages: 1 },
    awaiting_parts: { page: 1, totalPages: 1 },
    completed: { page: 1, totalPages: 1 },
    canceled: { page: 1, totalPages: 1 },
  })

  const fetchColumn = React.useCallback(
    async (status: BoardStatus, page = 1) => {
      const query: OrdersQuery = {
        status: status as OrderStatus,
        page,
        limit: 50,
        search: search || undefined,
      }
      return ordersAPI.getOrders(query)
    },
    [search]
  )

  React.useEffect(() => {
    let cancelled = false

    ;(async () => {
      setLoading(true)
      try {
        const results = await Promise.all(COLUMNS.map((col) => fetchColumn(col.key, 1)))
        if (cancelled) return

        const nextCols: Record<BoardStatus, OrderResponse[]> = {
          new: [],
          in_progress: [],
          awaiting_parts: [],
          completed: [],
          canceled: [],
        }
        const nextPages: Record<BoardStatus, { page: number; totalPages: number }> = {
          new: { page: 1, totalPages: 1 },
          in_progress: { page: 1, totalPages: 1 },
          awaiting_parts: { page: 1, totalPages: 1 },
          completed: { page: 1, totalPages: 1 },
          canceled: { page: 1, totalPages: 1 },
        }

        COLUMNS.forEach((c, i) => {
          nextCols[c.key] = results[i].items
          nextPages[c.key] = { page: results[i].page, totalPages: results[i].totalPages }
        })

        setColumns(nextCols)
        setPages(nextPages)
        setErrorMsg(null)
      } catch {
        if (!cancelled) setErrorMsg("Не удалось загрузить канбан")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [fetchColumn, refreshKey])

  // Drag & Drop: перетаскиваем только через handle
  const onDragStart = (e: React.DragEvent, orderId: string) => {
    e.dataTransfer.setData("text/plain", orderId)
    e.dataTransfer.effectAllowed = "move"
  }

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const onDrop = async (e: React.DragEvent, targetStatus: BoardStatus) => {
    e.preventDefault()
    const id = e.dataTransfer.getData("text/plain")
    if (!id) return

    const fromStatus = (Object.keys(columns) as BoardStatus[]).find((s) =>
      columns[s].some((o) => o.id === id)
    )
    if (!fromStatus || fromStatus === targetStatus) return

    const order = columns[fromStatus].find((o) => o.id === id)
    if (!order) return

    try {
      // Бизнес-правило: для перевода в работу требуется исполнитель
      if (targetStatus === "in_progress" && !order.assignedToUser) {
        setErrorMsg("Перед началом работы назначьте механика в карточке заказа")
        return
      }

      const updated = await ordersAPI.updateOrderStatus(id, targetStatus as OrderStatus)

      setColumns((prev) => {
        const next = { ...prev }
        next[fromStatus] = next[fromStatus].filter((o) => o.id !== id)
        next[targetStatus] = [updated, ...next[targetStatus]]
        return next
      })

      setErrorMsg(null)
    } catch (err) {
      let msg = "Не удалось изменить статус заказа"
      try {
        const parsed = JSON.parse((err as Error).message) as { message?: string }
        if (parsed?.message) msg = parsed.message
      } catch {
        // noop
      }

      setErrorMsg(msg)
      setDenyCardId(id)
      window.setTimeout(() => setDenyCardId(null), 1200)
      window.setTimeout(() => setErrorMsg(null), 4000)
    }
  }

  const loadMore = async (s: BoardStatus) => {
    const p = pages[s]
    if (!p || p.page >= p.totalPages) return
    const nextPage = p.page + 1

    const res = await fetchColumn(s, nextPage)

    setColumns((prev) => ({ ...prev, [s]: [...prev[s], ...res.items] }))
    setPages((prev) => ({ ...prev, [s]: { page: res.page, totalPages: res.totalPages } }))
  }

  const filtered = React.useCallback(
    (list: OrderResponse[]) => {
      const q = (search || "").trim().toLowerCase()
      if (!q) return list

      return list.filter((o) => {
        const parts = [
          o.orderNumber,
          o.customer?.firstName,
          o.customer?.lastName,
          o.customer?.companyName,
          o.vehicle?.licensePlate,
          o.vehicle?.vin,
          o.vehicle?.model?.name,
          o.vehicle?.model?.brand?.name,
          o.description,
          o.customerComplaints,
        ]
          .filter(Boolean)
          .map((x) => String(x).toLowerCase())

        return parts.some((p) => p.includes(q))
      })
    },
    [search]
  )

  return (
    <div className="flex flex-col gap-md min-w-0">
      {/* Hint */}
      <div className="text-xs text-muted-foreground">
        Перетаскивайте заказ за «ручку» слева.
      </div>

      {/* Error */}
      {errorMsg && (
        <div className="rounded-md border border-status-error/20 bg-status-error/10 text-status-error px-md py-sm text-xs inline-flex items-center gap-sm">
          <AlertTriangle className="w-4 h-4" />
          {errorMsg}
        </div>
      )}

      {/* Board */}
      <div className="overflow-x-auto pb-sm">
        <div
          className="flex gap-md"
          style={{ minWidth: `${COLUMNS.length * COL_MIN_WIDTH + 24}px` }}
        >
          {COLUMNS.map((col) => {
            const list = filtered(columns[col.key])
            const count = list.length

            return (
              <Card
                key={col.key}
                className="p-md flex flex-col gap-sm"
                style={{ minWidth: COL_MIN_WIDTH }}
                onDragOver={onDragOver}
                onDrop={(e) => void onDrop(e, col.key)}
              >
                {/* Column header */}
                <div className="flex items-center justify-between gap-sm min-w-0">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{col.title}</div>
                    <div className="text-xs text-muted-foreground mt-xs">
                      {loading ? "Загрузка…" : " "}
                    </div>
                  </div>

                  <div className="flex items-center gap-sm shrink-0">
                    <StatusBadge status={col.key} />
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                </div>

                {/* Column content */}
                <div className="flex-1 min-h-0">
                  <div className="flex flex-col gap-sm max-h-[70vh] overflow-auto pr-xs">
                    {loading && list.length === 0 ? (
                      <>
                        <div className="h-16 rounded-md border bg-surface-2 animate-pulse" />
                        <div className="h-16 rounded-md border bg-surface-2 animate-pulse" />
                        <div className="h-16 rounded-md border bg-surface-2 animate-pulse" />
                      </>
                    ) : list.length === 0 ? (
                      <div className="text-xs text-muted-foreground py-sm">
                        Нет заказов
                      </div>
                    ) : (
                      list.map((o) => (
                        <KanbanCard
                          key={o.id}
                          order={o}
                          onOpen={onOrderOpen}
                          onHandleDragStart={onDragStart}
                          deny={denyCardId === o.id}
                        />
                      ))
                    )}
                  </div>
                </div>

                {/* Load more */}
                {pages[col.key].page < pages[col.key].totalPages && (
                  <div className="pt-sm">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="w-full"
                      onClick={() => void loadMore(col.key)}
                    >
                      Показать ещё
                    </Button>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function KanbanCard({
  order,
  onOpen,
  onHandleDragStart,
  deny,
}: {
  order: OrderResponse
  onOpen?: (id: string) => void
  onHandleDragStart: (e: React.DragEvent, orderId: string) => void
  deny?: boolean
}) {
  return (
    <div
      className={cn(
        "rounded-md border bg-background/0 p-md transition-colors cursor-pointer",
        "hover:bg-surface-2",
        deny && "border-status-error/50 bg-status-error/5"
      )}
      onClick={() => onOpen?.(order.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" ? onOpen?.(order.id) : undefined)}
    >
      <div className="flex items-start gap-md min-w-0">
        {/* Drag handle */}
        <div
          className={cn(
            "shrink-0 w-7 h-7 rounded-md border bg-surface-2",
            "flex items-center justify-center text-muted-foreground",
            "cursor-grab active:cursor-grabbing"
          )}
          draggable
          onDragStart={(e) => {
            e.stopPropagation()
            onHandleDragStart(e, order.id)
          }}
          title="Перетащить заказ"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-4 h-4" />
        </div>

        {/* Main */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-sm min-w-0">
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">{order.orderNumber}</div>
              <div className="text-xs text-muted-foreground truncate mt-xs">
                {(order.customer?.firstName || order.customer?.companyName || "Клиент") +
                  " · " +
                  (order.vehicle?.licensePlate || order.vehicle?.vin || "Авто")}
              </div>
            </div>

            <StatusBadge status={order.status as OrderStatus} className="shrink-0" />
          </div>

          <div className="flex items-center justify-between gap-sm mt-sm">
            <div className="text-xs text-muted-foreground truncate">
              {order.assignedToUser
                ? `Механик: ${order.assignedToUser.firstName} ${order.assignedToUser.lastName}`
                : "Механик не назначен"}
            </div>

            <div className="text-sm font-medium tabular-nums shrink-0">
              {(order.finalAmount || 0).toLocaleString("ru-RU")} ₽
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
