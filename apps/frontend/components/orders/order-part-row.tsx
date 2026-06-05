// path: apps/frontend/components/orders/order-part-row.tsx
"use client"

import * as React from "react"
import { toast } from "sonner"
import { Pencil, Trash2, Save, Truck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

import { ordersAPI } from "@/lib/api/orders"
import type { OrderPartResponse } from "@/lib/types/orders"

export function OrderPartRow({
  part,
  orderId,
  onChanged,
}: {
  part: OrderPartResponse
  orderId: string
  onChanged: () => void
}) {
  const [editing, setEditing] = React.useState(false)
  const [q, setQ] = React.useState(String(part.quantity))
  const [price, setPrice] = React.useState(String(part.price))
  const [disc, setDisc] = React.useState(String(part.discountPercent))
  const [customerProvided, setCustomerProvided] = React.useState<boolean>(part.isCustomerProvided)
  const [busy, setBusy] = React.useState(false)

  const save = async () => {
    setBusy(true)
    try {
      await ordersAPI.updateOrderPart(orderId, part.id, {
        quantity: q ? parseInt(q, 10) : undefined,
        price: price ? parseFloat(price) : undefined,
        discountPercent: disc ? parseFloat(disc) : undefined,
      })
      setEditing(false)
      toast.success("Запчасть обновлена")
      await onChanged()
    } catch {
      toast.error("Ошибка обновления запчасти")
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    setBusy(true)
    try {
      await ordersAPI.deleteOrderPart(orderId, part.id)
      toast.success("Запчасть удалена")
      await onChanged()
    } catch {
      toast.error("Ошибка удаления запчасти")
    } finally {
      setBusy(false)
    }
  }

  const toggleProvided = async () => {
    setBusy(true)
    try {
      const updated = await ordersAPI.toggleCustomerProvided(orderId, part.id, !customerProvided)
      setCustomerProvided(updated.isCustomerProvided)
      toast.success(updated.isCustomerProvided ? "Отмечено: запчасть клиента" : "Отмечено: запчасть сервиса")
      await onChanged()
    } catch {
      toast.error("Ошибка переключения источника запчасти")
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
              <Truck className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">
                {part.part?.name || "Запчасть"}
              </div>
              <div className="text-xs text-muted-foreground mt-xs">
                Кол-во: {part.quantity} · Цена: {part.price.toLocaleString("ru-RU")} ₽ · Скидка: {part.discountPercent}%
              </div>
              <div className="mt-xs">
                <Badge variant={customerProvided ? "secondary" : "outline"}>
                  {customerProvided ? "Клиентская" : "Со склада"}
                </Badge>
              </div>
            </div>
          </div>

          {editing && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-md mt-md">
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
            </div>
          )}
        </div>

        <div className="shrink-0 text-right">
          <div className="text-sm font-semibold tabular-nums">
            {part.totalAmount.toLocaleString("ru-RU")} ₽
          </div>

          <div className="flex items-center gap-sm flex-wrap justify-end mt-md">
            {!editing ? (
              <>
                <Button variant="secondary" size="sm" onClick={() => setEditing(true)} disabled={busy}>
                  <Pencil className="w-4 h-4 mr-xs" />
                  Изменить
                </Button>
                <Button variant="ghost" size="sm" onClick={toggleProvided} disabled={busy}>
                  {customerProvided ? "Со склада" : "Клиентская"}
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
