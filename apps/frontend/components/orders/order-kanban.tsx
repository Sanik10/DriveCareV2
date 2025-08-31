// path: apps/frontend/components/orders/order-kanban.tsx
"use client";

import * as React from "react";
import { ordersAPI } from "@/lib/api/orders";
import type { OrderResponse, OrdersQuery, OrderStatus } from "@/lib/types/orders";
import { Button } from "@/components/ui/button";
import { StatusBadge, orderStatusLabel } from "@/components/ui/status-badge";
import { RefreshCw, Clock, User, ArrowRight, Sparkles, AlertTriangle, GripVertical } from "lucide-react";
import { useAuth } from "@/lib/hooks/use-auth";
import { cn } from "@/lib/utils";

type BoardStatus = "new" | "in_progress" | "awaiting_parts" | "completed" | "canceled";

const COLUMNS: { key: BoardStatus; title: string; wip?: number }[] = [
  { key: "new", title: "Новые", wip: 8 },
  { key: "in_progress", title: "В работе", wip: 10 },
  { key: "awaiting_parts", title: "Ожидают запчасти", wip: 6 },
  { key: "completed", title: "Завершены" },
  { key: "canceled", title: "Отменены" },
];

const COL_MIN_WIDTH = 340;

type Props = {
  search?: string;
  onOrderOpen?: (id: string) => void;
  refreshKey?: number;
};

export function OrderKanban({ search, onOrderOpen, refreshKey }: Props) {
  const { user } = useAuth();
  const currentUserId = (user as any)?.id as string | undefined;

  const [loading, setLoading] = React.useState(false);
  const [columns, setColumns] = React.useState<Record<BoardStatus, OrderResponse[]>>({
    new: [],
    in_progress: [],
    awaiting_parts: [],
    completed: [],
    canceled: [],
  });
  const [pages, setPages] = React.useState<Record<BoardStatus, { page: number; totalPages: number }>>({
    new: { page: 1, totalPages: 1 },
    in_progress: { page: 1, totalPages: 1 },
    awaiting_parts: { page: 1, totalPages: 1 },
    completed: { page: 1, totalPages: 1 },
    canceled: { page: 1, totalPages: 1 },
  });

  const [focusMode, setFocusMode] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [denyCardId, setDenyCardId] = React.useState<string | null>(null);

  const fetchColumn = React.useCallback(
    async (status: BoardStatus, page = 1) => {
      const query: OrdersQuery = { status: status as OrderStatus, page, limit: 50, search: search || undefined };
      const res = await ordersAPI.getOrders(query);
      return res;
    },
    [search]
  );

  const loadAll = React.useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.all(COLUMNS.map((col) => fetchColumn(col.key, 1)));
      const nextCols: Record<BoardStatus, OrderResponse[]> = { new: [], in_progress: [], awaiting_parts: [], completed: [], canceled: [] };
      const nextPages: Record<BoardStatus, { page: number; totalPages: number }> = { ...pages };
      COLUMNS.forEach((c, i) => {
        nextCols[c.key] = results[i].items;
        nextPages[c.key] = { page: results[i].page, totalPages: results[i].totalPages };
      });
      setColumns(nextCols);
      setPages(nextPages);
    } finally {
      setLoading(false);
    }
  }, [fetchColumn]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    void loadAll();
  }, [loadAll, refreshKey]);

  React.useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      if (e.code === "Space") setFocusMode(true);
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.code === "Space") setFocusMode(false);
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  // Drag & Drop: перетаскиваем только через handle, не всю карточку
  const onDragStart = (e: React.DragEvent, orderId: string) => {
    e.dataTransfer.setData("text/plain", orderId);
    e.dataTransfer.effectAllowed = "move";
  };
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };
  const onDrop = async (e: React.DragEvent, targetStatus: BoardStatus) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (!id) return;
    const fromStatus = (Object.keys(columns) as BoardStatus[]).find((s) => columns[s].some((o) => o.id === id));
    if (!fromStatus || fromStatus === targetStatus) return;

    const order = columns[fromStatus].find((o) => o.id === id);
    if (!order) return;

    try {
      // Бизнес-правило: для перевода в работу требуется исполнитель
      if (targetStatus === "in_progress" && !order.assignedToUser && currentUserId) {
        try {
          await ordersAPI.assignMechanic(id, currentUserId);
        } catch {
          // игнорируем: если не удалось, ниже покажем ошибку при смене статуса
        }
      }
      const updated = await ordersAPI.updateOrderStatus(id, targetStatus as OrderStatus);
      setColumns((prev) => {
        const next = { ...prev };
        next[fromStatus] = next[fromStatus].filter((o) => o.id !== id);
        next[targetStatus] = [updated, ...next[targetStatus]];
        return next;
      });
      setErrorMsg(null);
    } catch (err) {
      let msg = "Не удалось изменить статус заказа";
      try {
        const parsed = JSON.parse((err as Error).message) as { message?: string };
        if (parsed?.message) msg = parsed.message;
      } catch {
        // noop
      }
      if (targetStatus === "in_progress") {
        msg ||= "Нельзя начать работу: назначьте исполнителя или добавьте хотя бы одну услугу/запчасть";
      }
      setErrorMsg(msg);
      setDenyCardId(id);
      setTimeout(() => setDenyCardId(null), 1200);
      setTimeout(() => setErrorMsg(null), 4000);
    }
  };

  const loadMore = async (s: BoardStatus) => {
    const p = pages[s];
    if (!p || p.page >= p.totalPages) return;
    const nextPage = p.page + 1;
    const res = await fetchColumn(s, nextPage);
    setColumns((prev) => ({ ...prev, [s]: [...prev[s], ...res.items] }));
    setPages((prev) => ({ ...prev, [s]: { page: res.page, totalPages: res.totalPages } }));
  };

  const filtered = (list: OrderResponse[]) => {
    const q = (search || "").trim().toLowerCase();
    if (!q) return list;
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
        .map((x) => String(x).toLowerCase());
      return parts.some((p) => p.includes(q));
    });
  };

  // Горизонтальная прокрутка доски + фикс-ширина колонок
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Sparkles className="w-3.5 h-3.5" />
        Подсказка: перетаскивайте карточку за «ручку» слева. Удерживайте пробел — режим фокуса.
        <Button variant="outline" size="sm" className="ml-auto" onClick={() => loadAll()} disabled={loading}>
          <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
          Обновить
        </Button>
      </div>

      {errorMsg && (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 text-destructive px-3 py-2 text-xs inline-flex items-center gap-2">
          <AlertTriangle className="w-3.5 h-3.5" />
          {errorMsg}
        </div>
      )}

      <div className="relative overflow-x-auto pb-1">
        <div
          className="flex gap-3 pr-2"
          style={{ minWidth: `${COLUMNS.length * COL_MIN_WIDTH + 24}px` }}
        >
          {COLUMNS.map((col) => {
            const list = filtered(columns[col.key]);
            const count = list.length;
            const wip = col.wip;
            const wipRatio = wip ? Math.min(1, count / wip) : 0;
            const headerGlow = wip && count > wip;

            return (
              <div
                key={col.key}
                className={cn(
                  "rounded-xl border border-border/60 bg-card/70 backdrop-blur-sm p-3 flex flex-col",
                  "transition-shadow",
                  headerGlow && "ring-1 ring-rose-400/30"
                )}
                style={{ minWidth: COL_MIN_WIDTH }}
                onDragOver={onDragOver}
                onDrop={(e) => onDrop(e, col.key)}
              >
                <div className="mb-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold">{col.title}</div>
                    <StatusBadge status={col.key as any} />
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <div className={cn("h-1 rounded-full w-full bg-surface-1/60 overflow-hidden", wip ? "opacity-100" : "opacity-0")}>
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          wipRatio < 0.7 ? "bg-emerald-500/60" : wipRatio < 1 ? "bg-amber-500/60" : "bg-rose-500/70"
                        )}
                        style={{ width: `${Math.min(100, wipRatio * 100)}%` }}
                      />
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {count}
                      {wip ? ` / ${wip}` : ""}
                    </div>
                  </div>
                </div>

                <div className={cn("flex-1 space-y-2 overflow-auto pr-1", focusMode && "transition-opacity")}>
                  {list.length === 0 ? (
                    <div className="text-xs text-muted-foreground mt-3">Нет карточек</div>
                  ) : (
                    list.map((o) => (
                      <KanbanCard
                        key={o.id}
                        order={o}
                        onOpen={onOrderOpen}
                        onHandleDragStart={onDragStart}
                        focusMode={focusMode}
                        search={search}
                        deny={denyCardId === o.id}
                      />
                    ))
                  )}
                </div>

                {pages[col.key].page < pages[col.key].totalPages && (
                  <div className="pt-2">
                    <Button variant="outline" size="sm" className="w-full" onClick={() => void loadMore(col.key)}>
                      Показать еще
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function KanbanCard({
  order,
  onOpen,
  onHandleDragStart,
  focusMode,
  search,
  deny,
}: {
  order: OrderResponse;
  onOpen?: (id: string) => void;
  onHandleDragStart: (e: React.DragEvent, orderId: string) => void;
  focusMode: boolean;
  search?: string;
  deny?: boolean;
}) {
  // SLA progress ring + Heat Halo
  const hasETA = !!order.estimatedCompletionTime;
  const created = new Date(order.createdAt);
  const eta = order.estimatedCompletionTime ? new Date(order.estimatedCompletionTime) : null;
  const now = new Date();
  const totalMs = eta ? Math.max(1, eta.getTime() - created.getTime()) : 0;
  const elapsedMs = eta ? Math.max(0, now.getTime() - created.getTime()) : 0;
  const dueRatio = eta ? Math.min(1, elapsedMs / totalMs) : order.progressPercentage ? Math.min(1, order.progressPercentage / 100) : 0;
  const overdue = eta ? now > eta : false;

  const ring = `conic-gradient(${overdue ? "#ef4444" : "#22c55e"} ${Math.round(dueRatio * 360)}deg, rgba(255,255,255,0.08) 0deg)`;
  const glowOpacity = overdue ? 0.35 : Math.max(0.1, dueRatio * 0.25);

  const matchesSearch = React.useMemo(() => {
    if (!search) return true;
    const q = search.toLowerCase();
    const parts = [
      order.orderNumber,
      order.customer?.firstName,
      order.customer?.lastName,
      order.customer?.companyName,
      order.vehicle?.licensePlate,
      order.vehicle?.vin,
      order.vehicle?.model?.name,
      order.vehicle?.model?.brand?.name,
      order.description,
      order.customerComplaints,
    ]
      .filter(Boolean)
      .map((x) => String(x).toLowerCase());
    return parts.some((p) => p.includes(q));
  }, [order, search]);

  return (
    <div
      className={cn(
        "relative group rounded-lg border border-border/50 bg-surface-1/60 backdrop-blur-sm p-3 transition-shadow",
        "hover:shadow-md",
        focusMode && !matchesSearch && "opacity-30",
        deny && "border-rose-500/60 ring-1 ring-rose-500/30"
      )}
      onClick={() => onOpen?.(order.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === "Enter" ? onOpen?.(order.id) : undefined)}
    >
      {/* Glow */}
      <div
        className="absolute -inset-px rounded-lg pointer-events-none"
        style={{ boxShadow: `0 0 0 1px rgba(255,255,255,0.02), 0 8px 24px rgba(0,0,0,0.25)` }}
      />
      <div
        className="absolute -inset-1 rounded-lg opacity-0 group-hover:opacity-30 transition-opacity pointer-events-none"
        style={{ background: "radial-gradient(120px 80px at 10% 10%, rgba(99,102,241,0.15), transparent)" }}
      />
      <div
        className="absolute -inset-px rounded-lg pointer-events-none"
        style={{ background: `radial-gradient(120px 80px at 85% 15%, rgba(34,197,94,${glowOpacity}), transparent)` }}
      />

      <div className="flex items-center justify-between gap-2">
        {/* Drag handle */}
        <div
          className="shrink-0 w-6 h-6 rounded-md border border-border/60 bg-surface-1/70 flex items-center justify-center text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
          draggable
          onDragStart={(e) => {
            e.stopPropagation();
            onHandleDragStart(e, order.id);
          }}
          title="Перетащить карточку"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-3.5 h-3.5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm font-semibold truncate">{order.orderNumber}</div>
            <StatusBadge status={order.status as any} />
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground truncate">
            <span className="font-medium">{order.customer?.firstName || order.customer?.companyName || "Клиент"}</span>
            {" · "}
            <span>{order.vehicle?.licensePlate || order.vehicle?.vin || "Авто"}</span>
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full" style={{ background: ring }} title={hasETA ? "Прогресс по сроку" : "Прогресс"} />
          <div className="text-[11px] text-muted-foreground inline-flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {overdue ? "Просрочен" : hasETA ? orderStatusLabel(order.status as any) : "Без срока"}
          </div>
        </div>
        <div className="text-sm font-medium">{(order.finalAmount || 0).toLocaleString("ru-RU")} ₽</div>
      </div>

      {order.assignedToUser && (
        <div className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
          <User className="w-3.5 h-3.5" /> {order.assignedToUser.firstName} {order.assignedToUser.lastName}
        </div>
      )}

      {/* Быстрое действие (видно при ховере): открыть */}
      <div className="mt-2 hidden group-hover:flex items-center justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onOpen?.(order.id); }}>
          Открыть <ArrowRight className="w-3.5 h-3.5 ml-1" />
        </Button>
      </div>
    </div>
  );
}
