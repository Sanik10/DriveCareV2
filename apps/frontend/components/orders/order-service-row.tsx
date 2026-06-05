// path: apps/frontend/components/orders/order-service-row.tsx
"use client"

import * as React from "react"
import { toast } from "sonner"
import { Pencil, Trash2, Save, UserPlus, Play, Flag, Wrench } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

import { ordersAPI } from "@/lib/api/orders"
import { useAuth } from "@/lib/hooks/use-auth"
import type { OrderServiceResponse } from "@/lib/types/orders"

function getUserId(u: unknown): string | undefined {
  if (u && typeof u === "object" && "id" in u) {
    const maybe = (u as { id?: unknown }).id
    return typeof maybe === "string" ? maybe : undefined
  }
  return undefined
}

export function OrderServiceRow({
  service,
  orderId,
  onChanged,
}: {
  service: OrderServiceResponse
  orderId: string
  onChanged: () => void
}) {
  const { user } = useAuth()

  const [editing, setEditing] = React.useState(false)
  const [q, setQ] = React.useState(String(service.quantity))
  const [price, setPrice] = React.useState(String(service.price))
  const [disc, setDisc] = React.useState(String(service.discountPercent))
  const [notes, setNotes] = React.useState(service.notes || "")
  const [busy, setBusy] = React.useState(false)

  const save = async () => {
    setBusy(true)
    try {
      await ordersAPI.updateOrderService(orderId, service.id, {
        quantity: q ? parseInt(q, 10) : undefined,
        price: price ? parseFloat(price) : undefined,
        discountPercent: disc ? parseFloat(disc) : undefined,
        notes: notes || undefined,
      })
      setEditing(false)
      toast.success("Услуга обновлена")
      await onChanged()
    } catch {
      toast.error("Ошибка обновления услуги")
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    setBusy(true)
    try {
      await ordersAPI.deleteOrderService(orderId, service.id)
      toast.success("Услуга удалена")
      await onChanged()
    } catch {
      toast.error("Ошибка удаления услуги")
    } finally {
      setBusy(false)
    }
  }

  const start = async () => {
    setBusy(true)
    try {
      await ordersAPI.startService(orderId, service.id)
      toast.success("Услуга начата")
      await onChanged()
    } catch {
      toast.error("Ошибка старта услуги")
    } finally {
      setBusy(false)
    }
  }

  const complete = async () => {
    setBusy(true)
    try {
      await ordersAPI.completeService(orderId, service.id, notes || undefined)
      toast.success("Услуга завершена")
      await onChanged()
    } catch {
      toast.error("Ошибка завершения услуги")
    } finally {
      setBusy(false)
    }
  }

  const assignMe = async () => {
    const myId = getUserId(user)
    if (!myId) return toast.error("Не удалось определить текущего пользователя")
    setBusy(true)
    try {
      await ordersAPI.assignServiceMechanic(orderId, service.id, myId)
      toast.success("Механик назначен")
      await onChanged()
    } catch {
      toast.error("Ошибка назначения механика")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="p-md">
      <div className="flex items-start justify-between gap-lg">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-sm min-w-0">
            <div className="w-8 h-8 rounded-md bg-surface-2 border flex items-center justify-center shrink-0 text-muted-foreground">
              <Wrench className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">
                {service.service?.name || "Услуга"}
              </div>
              <div className="text-xs text-muted-foreground mt-xs">
                Кол-во: {service.quantity} · Цена: {service.price.toLocaleString("ru-RU")} ₽ · Скидка:{" "}
                {service.discountPercent}%
              </div>
            </div>
          </div>

          {editing && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md mt-md">
              <Input
                label="Кол-во"
                value={q}
                onChange={(e) => setQ(e.target.value.replace(/[^\d]/g, ""))}
              />
              <Input
                label="Цена"
                value={price}
                onChange={(e) => setPrice(e.target.value.replace(/[^0-9.,]/g, "").replace(",", "."))}
              />
              <Input
                label="Скидка %"
                value={disc}
                onChange={(e) => setDisc(e.target.value.replace(/[^0-9.,]/g, "").replace(",", "."))}
              />
              <Input
                label="Заметки"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="shrink-0 text-right">
          <div className="text-sm font-semibold tabular-nums">
            {service.totalAmount.toLocaleString("ru-RU")} ₽
          </div>

          <div className="mt-xs">
            <Badge variant="secondary">
              {service.status || "planned"}
            </Badge>
          </div>

          <div className="flex items-center gap-sm flex-wrap justify-end mt-md">
            {!editing ? (
              <>
                <Button variant="secondary" size="sm" onClick={() => setEditing(true)} disabled={busy}>
                  <Pencil className="w-4 h-4 mr-xs" />
                  Изменить
                </Button>
                <Button variant="ghost" size="sm" onClick={assignMe} disabled={busy}>
                  <UserPlus className="w-4 h-4 mr-xs" />
                  Мой
                </Button>
                <Button variant="ghost" size="sm" onClick={start} disabled={busy}>
                  <Play className="w-4 h-4 mr-xs" />
                  Старт
                </Button>
                <Button variant="ghost" size="sm" onClick={complete} disabled={busy}>
                  <Flag className="w-4 h-4 mr-xs" />
                  Готово
                </Button>
                <Button variant="danger" size="sm" onClick={remove} disabled={busy}>
                  <Trash2 className="w-4 h-4 mr-xs" />
                  Удалить
                </Button>
              </>
            ) : (
              <>
                <Button variant="primary" size="sm" onClick={save} disabled={busy}>
                  <Save className="w-4 h-4 mr-xs" />
                  Сохранить
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setEditing(false)} disabled={busy}>
                  Отмена
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
