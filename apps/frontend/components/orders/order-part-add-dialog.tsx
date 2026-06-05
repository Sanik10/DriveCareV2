// path: apps/frontend/components/orders/order-part-add-dialog.tsx
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
import { partsAPI } from "@/lib/api/parts"
import { ordersAPI } from "@/lib/api/orders"
import type { PartCatalogueItem, PartAvailability } from "@/lib/types/parts"
import type { AddPartToOrderRequest, OrderPartResponse } from "@/lib/types/orders"
import { Search, Truck, Save, ShieldCheck, AlertTriangle } from "lucide-react"
import { Kbd } from "@/components/ui/kbd"
import { cn } from "@/lib/utils"

type Props = {
  orderId: string
  open: boolean
  onOpenChange: (v: boolean) => void
  onAdded?: (line: OrderPartResponse) => void
}

function safeNum(v: string): number {
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : 0
}

export function OrderPartAddDialog({ orderId, open, onOpenChange, onAdded }: Props) {
  const [query, setQuery] = React.useState("")
  const [results, setResults] = React.useState<PartCatalogueItem[]>([])
  const [selected, setSelected] = React.useState<PartCatalogueItem | null>(null)

  const [quantity, setQuantity] = React.useState<string>("1")
  const [customPrice, setCustomPrice] = React.useState<string>("")
  const [discountPercent, setDiscountPercent] = React.useState<string>("0")
  const [customerProvided, setCustomerProvided] = React.useState<boolean>(false)

  const [availability, setAvailability] = React.useState<PartAvailability | null>(null)

  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // search parts (debounce)
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
        const res = await partsAPI.search({ search: q, page: 1, limit: 8 })
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
    setCustomerProvided(false)
    setAvailability(null)
    setError(null)
    setSubmitting(false)
  }, [open])

  // availability
  React.useEffect(() => {
    async function fetchAvailability() {
      if (!open || !selected || customerProvided) {
        setAvailability(null)
        return
      }
      try {
        const data = await ordersAPI.checkPartAvailability(orderId, selected.id)
        setAvailability(data)
      } catch {
        setAvailability(null)
      }
    }
    void fetchAvailability()
  }, [open, selected, customerProvided, orderId])

  const submit = React.useCallback(async () => {
    if (!selected) {
      setError("Выберите запчасть")
      return
    }

    const qtyNum = quantity ? parseInt(quantity, 10) : 1
    if (!customerProvided && availability && qtyNum > Math.max(0, availability.maxQuantity)) {
      setError(`Недостаточно на складе. Доступно к добавлению: ${availability.maxQuantity}`)
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const payload: AddPartToOrderRequest = {
        partId: selected.id,
        quantity: qtyNum,
        customPrice: customPrice ? parseFloat(customPrice) : undefined,
        discountPercent: discountPercent ? parseFloat(discountPercent) : 0,
        isCustomerProvided: customerProvided,
      }

      const created = await ordersAPI.addPartToOrder(orderId, payload)
      onAdded?.(created)
      onOpenChange(false)
    } catch (e) {
      try {
        const parsed = JSON.parse((e as Error).message) as { message?: string }
        setError(parsed.message || "Ошибка добавления запчасти")
      } catch {
        setError("Ошибка добавления запчасти")
      }
    } finally {
      setSubmitting(false)
    }
  }, [selected, quantity, customPrice, discountPercent, customerProvided, availability, orderId, onAdded, onOpenChange])

  const qtyNum = quantity ? parseInt(quantity, 10) : 1
  const discount = safeNum(discountPercent)
  const basePrice = customerProvided
    ? safeNum(customPrice) // клиентская — цена только из customPrice (или 0)
    : customPrice
      ? safeNum(customPrice)
      : (selected?.sellingPrice || 0)

  const totalToPay = Math.max(0, basePrice * qtyNum * (1 - discount / 100))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <div className="flex items-start gap-md min-w-0">
            <div className="h-10 w-10 rounded-md bg-surface-2 border flex items-center justify-center text-muted-foreground shrink-0">
              <Truck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle>Добавить запчасть</DialogTitle>
              <DialogDescription className="mt-xs">
                Найдите запчасть, проверьте наличие и укажите параметры.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-lg">
          {/* Search */}
          <div className="relative">
            <Input
              id="part-search"
              label="Поиск запчасти"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Название / артикул / бренд"
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
                {results.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setSelected(p)
                      setResults([])
                    }}
                    className="w-full text-left px-md py-sm hover:bg-surface-2"
                  >
                    <div className="text-sm font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground mt-xs">
                      {p.brand ? `${p.brand} · ` : ""}
                      {p.partNumber || "—"} · {(p.sellingPrice || 0).toLocaleString("ru-RU")} ₽
                      {p.category?.name ? ` · ${p.category.name}` : ""}
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
                    Цена: {(selected.sellingPrice || 0).toLocaleString("ru-RU")} ₽
                    {selected.brand ? ` · ${selected.brand}` : ""}
                    {selected.partNumber ? ` · ${selected.partNumber}` : ""}
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

          <div className="flex items-center justify-between gap-md">
            <label className="inline-flex items-center gap-sm text-sm">
              <input
                type="checkbox"
                checked={customerProvided}
                onChange={(e) => setCustomerProvided(e.target.checked)}
                className="h-4 w-4"
              />
              Запчасть клиента (без резерва)
            </label>

            {!customerProvided && availability && (
              <div className="inline-flex items-center gap-sm text-xs text-muted-foreground">
                <ShieldCheck className="w-4 h-4" />
                Доступно: {availability.available} · Макс: {availability.maxQuantity}
              </div>
            )}
          </div>

          <div className="text-xs text-muted-foreground">
            К оплате: <span className="text-foreground font-medium tabular-nums">{totalToPay.toLocaleString("ru-RU")} ₽</span>
          </div>

          {error && (
            <div className="rounded-md border border-status-error/20 bg-status-error/10 text-status-error px-md py-sm text-sm inline-flex items-center gap-sm">
              <AlertTriangle className="w-4 h-4" />
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="mt-lg">
          <div className="hidden sm:flex items-center text-xs text-muted-foreground mr-auto">
            <span>Закрыть:</span>
            <span className="ml-sm">
              <Kbd>Esc</Kbd>
            </span>
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
