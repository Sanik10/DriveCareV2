// path: apps/frontend/components/orders/order-service-add-dialog.tsx
"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { servicesAPI } from "@/lib/api/services"
import { ordersAPI } from "@/lib/api/orders"
import type { ServiceCatalogueItem } from "@/lib/types/services"
import type { AddServiceToOrderRequest, OrderServiceResponse } from "@/lib/types/orders"
import { Search, Wrench, UserPlus, Save, AlertTriangle } from "lucide-react"
import { useAuth } from "@/lib/hooks/use-auth"
import { Kbd } from "@/components/ui/kbd"
import { cn } from "@/lib/utils"

type Props = {
  orderId: string
  open: boolean
  onOpenChange: (v: boolean) => void
  onAdded?: (line: OrderServiceResponse) => void
}

function getUserId(u: unknown): string | undefined {
  if (u && typeof u === "object" && "id" in u) {
    const maybe = (u as { id?: unknown }).id
    return typeof maybe === "string" ? maybe : undefined
  }
  return undefined
}

export function OrderServiceAddDialog({ orderId, open, onOpenChange, onAdded }: Props) {
  const { user } = useAuth()

  const [query, setQuery] = React.useState("")
  const [results, setResults] = React.useState<ServiceCatalogueItem[]>([])
  const [selected, setSelected] = React.useState<ServiceCatalogueItem | null>(null)

  const [quantity, setQuantity] = React.useState<string>("1")
  const [customPrice, setCustomPrice] = React.useState<string>("")
  const [discountPercent, setDiscountPercent] = React.useState<string>("0")
  const [mechanicId, setMechanicId] = React.useState<string>("")
  const [notes, setNotes] = React.useState<string>("")

  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // search services (debounce)
  React.useEffect(() => {
    if (!open) return
    let cancelled = false

    const t = window.setTimeout(async () => {
      const q = query.trim()
      if (!q) {
        setResults([])
        return
      }

      try {
        const res = await servicesAPI.search({ search: q, page: 1, limit: 8 })
        if (!cancelled) setResults(res.items)
      } catch {
        if (!cancelled) setResults([])
      }
    }, 250)

    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [open, query])

  // reset on close
  React.useEffect(() => {
    if (open) return
    setQuery("")
    setResults([])
    setSelected(null)
    setQuantity("1")
    setCustomPrice("")
    setDiscountPercent("0")
    setMechanicId("")
    setNotes("")
    setError(null)
    setSubmitting(false)
  }, [open])

  const onAssignMe = () => {
    const meId = getUserId(user)
    if (meId) setMechanicId(meId)
  }

  const submit = React.useCallback(async () => {
    if (!selected) {
      setError("Выберите услугу")
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const payload: AddServiceToOrderRequest = {
        serviceId: selected.id,
        quantity: quantity ? parseInt(quantity, 10) : 1,
        customPrice: customPrice ? parseFloat(customPrice) : undefined,
        discountPercent: discountPercent ? parseFloat(discountPercent) : 0,
        mechanicId: mechanicId || undefined,
        notes: notes || undefined,
      }

      const created = await ordersAPI.addServiceToOrder(orderId, payload)
      onAdded?.(created)
      onOpenChange(false)
    } catch (e) {
      try {
        const parsed = JSON.parse((e as Error).message) as { message?: string }
        setError(parsed.message || "Ошибка добавления услуги")
      } catch {
        setError("Ошибка добавления услуги")
      }
    } finally {
      setSubmitting(false)
    }
  }, [selected, quantity, customPrice, discountPercent, mechanicId, notes, orderId, onAdded, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <div className="flex items-start gap-md min-w-0">
            <div className="h-10 w-10 rounded-md bg-surface-2 border flex items-center justify-center text-muted-foreground shrink-0">
              <Wrench className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle>Добавить услугу</DialogTitle>
              <DialogDescription className="mt-xs">
                Найдите услугу в каталоге, укажите количество и скидку.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-lg">
          {/* Search */}
          <div className="relative">
            <Input
              id="service-search"
              label="Поиск услуги"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Название услуги"
              className="pl-[36px]"
            />
            <Search className="w-4 h-4 absolute left-md top-[42px] text-muted-foreground" />

            {results.length > 0 && (
              <div
                className={cn(
                  "absolute z-50 mt-xs w-full rounded-md border bg-card overflow-hidden",
                  "shadow-card dark:shadow-dark-card",
                  "max-h-64 overflow-y-auto"
                )}
                role="listbox"
              >
                {results.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setSelected(s)
                      setResults([])
                    }}
                    className="w-full text-left px-md py-sm hover:bg-surface-2"
                  >
                    <div className="text-sm font-medium">{s.name}</div>
                    <div className="text-xs text-muted-foreground mt-xs">
                      {(s.price || 0).toLocaleString("ru-RU")} ₽ · {s.durationMinutes} мин
                      {s.category?.name ? ` · ${s.category.name}` : ""}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected */}
          {selected && (
            <div className="rounded-md border bg-card p-md">
              <div className="flex items-start justify-between gap-md">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{selected.name}</div>
                  <div className="text-xs text-muted-foreground mt-xs">
                    База: {(selected.price || 0).toLocaleString("ru-RU")} ₽ · Длительность:{" "}
                    {selected.durationMinutes} мин
                  </div>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  выбрано
                </Badge>
              </div>
            </div>
          )}

          {/* Params */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
            <Input
              label="Кол-во"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value.replace(/[^\d]/g, ""))}
              placeholder="1"
              inputMode="numeric"
            />
            <Input
              label="Своя цена (₽)"
              value={customPrice}
              onChange={(e) =>
                setCustomPrice(e.target.value.replace(/[^0-9.,]/g, "").replace(",", "."))
              }
              placeholder="Опционально"
              inputMode="decimal"
            />
            <Input
              label="Скидка (%)"
              value={discountPercent}
              onChange={(e) =>
                setDiscountPercent(e.target.value.replace(/[^0-9.,]/g, "").replace(",", "."))
              }
              placeholder="0"
              inputMode="decimal"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
            <Input
              label="ID механика"
              value={mechanicId}
              onChange={(e) => setMechanicId(e.target.value)}
              placeholder="Опционально"
            />
            <div className="flex items-end">
              <Button variant="secondary" className="w-full" onClick={onAssignMe}>
                <UserPlus className="w-4 h-4 mr-xs" />
                Назначить меня
              </Button>
            </div>
          </div>

          <Input
            label="Заметки"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Опционально"
          />

          {error && (
            <div className="rounded-md border border-status-error/20 bg-status-error/10 text-status-error px-md py-sm text-sm inline-flex items-center gap-sm">
              <AlertTriangle className="w-4 h-4" />
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="mt-lg">
          <div className="hidden sm:flex items-center text-xs text-muted-foreground mr-auto">
            <span>Esc</span>
            <span className="mx-xs">—</span>
            <Kbd>Esc</Kbd>
          </div>

          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={submitting}>
            Отмена
          </Button>

          <Button variant="primary" onClick={submit} disabled={submitting || !selected}>
            {submitting ? (
              "Добавление…"
            ) : (
              <>
                <Save className="w-4 h-4 mr-xs" />
                Добавить
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
