// path: apps/frontend/components/orders/order-create-dialog.tsx
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
import { Car, User, Plus, ClipboardPaste, Save, AlertTriangle } from "lucide-react"

import { customersAPI } from "@/lib/api/customers"
import { vehiclesAPI } from "@/lib/api/vehicles"
import { ordersAPI } from "@/lib/api/orders"
import type { CustomerResponse } from "@/lib/types/customers"
import type { VehicleResponse } from "@/lib/types/vehicles"
import type { CreateOrderRequest, OrderResponse } from "@/lib/types/orders"

import { Kbd } from "@/components/ui/kbd"
import { CustomerCreateDialog } from "@/components/customers/customer-create-dialog"
import { VehicleCreateDialog } from "@/components/vehicles/vehicle-create-dialog"
import { cn } from "@/lib/utils"

type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
  onCreated?: (order: OrderResponse) => void
  initialCustomerId?: string
  initialVehicleId?: string
}

function customerLabel(c: CustomerResponse) {
  return (
    [c.firstName, c.lastName].filter(Boolean).join(" ") ||
    c.companyName ||
    c.email ||
    c.id
  )
}

function vehicleLabel(v: VehicleResponse) {
  return `${v.model?.brand?.name ? v.model.brand.name + " " : ""}${v.model?.name || ""} ${
    v.licensePlate || v.vin || v.id
  }`.trim()
}

export function OrderCreateDialog({
  open,
  onOpenChange,
  onCreated,
  initialCustomerId,
  initialVehicleId,
}: Props) {
  const [customerQuery, setCustomerQuery] = React.useState("")
  const [customerResults, setCustomerResults] = React.useState<CustomerResponse[]>([])
  const [customerId, setCustomerId] = React.useState<string>("")
  const [customerValueLabel, setCustomerValueLabel] = React.useState<string>("")

  const [vehicleResults, setVehicleResults] = React.useState<VehicleResponse[]>([])
  const [vehicleId, setVehicleId] = React.useState<string>("")
  const [vehicleValueLabel, setVehicleValueLabel] = React.useState<string>("")

  const [mileage, setMileage] = React.useState<string>("")
  const [description, setDescription] = React.useState<string>("")
  const [complaints, setComplaints] = React.useState<string>("")

  const [openCustomerCreate, setOpenCustomerCreate] = React.useState(false)
  const [openVehicleCreate, setOpenVehicleCreate] = React.useState(false)

  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const reset = React.useCallback(() => {
    setCustomerQuery("")
    setCustomerResults([])
    setCustomerId("")
    setCustomerValueLabel("")
    setVehicleResults([])
    setVehicleId("")
    setVehicleValueLabel("")
    setMileage("")
    setDescription("")
    setComplaints("")
    setError(null)
    setSubmitting(false)
  }, [])

  // При закрытии модалки — чистим состояние (чтобы не тащить хвосты)
  React.useEffect(() => {
    if (!open) reset()
  }, [open, reset])

  // Prefill при открытии
  React.useEffect(() => {
    if (!open) return
    ;(async () => {
      try {
        if (initialCustomerId) {
          const c = await customersAPI.getCustomer(initialCustomerId)
          setCustomerId(c.id)
          setCustomerValueLabel(customerLabel(c))
        }

        if (initialVehicleId) {
          const v = await vehiclesAPI.getVehicle(initialVehicleId)
          setVehicleId(v.id)
          setVehicleValueLabel(vehicleLabel(v))

          // если клиент ещё не выбран — подтягиваем из авто
          if (!customerId && v.customer?.id) {
            setCustomerId(v.customer.id)
            setCustomerValueLabel(
              [v.customer.firstName, v.customer.lastName].filter(Boolean).join(" ") ||
                v.customer.companyName ||
                v.customer.email ||
                v.customer.id
            )
          }
        }
      } catch {
        // ignore prefill errors
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialCustomerId, initialVehicleId])

  // Поиск клиентов (debounce)
  React.useEffect(() => {
    if (!open) return
    let cancelled = false
    const t = window.setTimeout(async () => {
      const q = customerQuery.trim()
      if (!q) {
        setCustomerResults([])
        return
      }
      try {
        const res = await customersAPI.getCustomers({ search: q, page: 1, limit: 7 })
        if (!cancelled) setCustomerResults(res.items)
      } catch {
        if (!cancelled) setCustomerResults([])
      }
    }, 250)

    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [customerQuery, open])

  // Загрузка авто клиента
  React.useEffect(() => {
    if (!open) return
    if (!customerId) {
      setVehicleResults([])
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const list = await vehiclesAPI.getCustomerVehicles(customerId)
        if (!cancelled) setVehicleResults(list)
      } catch {
        if (!cancelled) setVehicleResults([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [customerId, open])

  const afterCreateCustomer = (c: CustomerResponse) => {
    setCustomerId(c.id)
    setCustomerValueLabel(customerLabel(c))
    setOpenCustomerCreate(false)
  }

  const afterCreateVehicle = (v: VehicleResponse) => {
    setVehicleId(v.id)
    setVehicleValueLabel(vehicleLabel(v))
    setOpenVehicleCreate(false)
  }

  // Smart paste (оставляем полезную фичу, но без “сверкалок”)
  const onPasteSmart: React.ClipboardEventHandler<HTMLDivElement> = (e) => {
    const txt = e.clipboardData.getData("text")
    if (!txt) return
    const mileageMatch = txt.match(/(\d{1,7})\s?(км|km)/i)?.[1]
    const complaintLike = txt.length > 6 && !/^[A-Z0-9-]{6,}$/i.test(txt) ? txt.slice(0, 300) : null
    if (mileageMatch) setMileage((v) => v || String(parseInt(mileageMatch, 10)))
    if (complaintLike) setComplaints((v) => v || complaintLike)
  }

  const submit = React.useCallback(async () => {
    setSubmitting(true)
    setError(null)
    try {
      if (!customerId) {
        setError("Выберите клиента")
        setSubmitting(false)
        return
      }
      if (!vehicleId) {
        setError("Выберите автомобиль")
        setSubmitting(false)
        return
      }

      const payload: CreateOrderRequest = {
        customerId,
        vehicleId,
        mileage: mileage ? parseInt(mileage, 10) : undefined,
        description: description || undefined,
        customerComplaints: complaints || undefined,
      }

      const created = await ordersAPI.createOrder(payload)
      onCreated?.(created)
      onOpenChange(false)
    } catch (e) {
      try {
        const parsed = JSON.parse((e as Error).message) as { message?: string }
        setError(parsed.message || "Ошибка создания заказа")
      } catch {
        setError("Ошибка создания заказа")
      }
    } finally {
      setSubmitting(false)
    }
  }, [customerId, vehicleId, mileage, description, complaints, onCreated, onOpenChange])

  // Горячая клавиша: Cmd/Ctrl + Enter
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!open) return
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "enter") {
        e.preventDefault()
        void submit()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, submit])

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl" onPaste={onPasteSmart}>
          <DialogHeader>
            <div className="flex items-start gap-md min-w-0">
              <div className="h-10 w-10 rounded-md bg-surface-2 border flex items-center justify-center text-muted-foreground shrink-0">
                <ClipboardPaste className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle>Новый заказ</DialogTitle>
                <DialogDescription className="mt-xs">
                  Можно вставить текст с жалобами/пробегом — система попробует распознать.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
            {/* Клиент */}
            <div className="md:col-span-2">
              {customerId ? (
                <div className="rounded-md border bg-card p-md flex items-center justify-between gap-md">
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground">Клиент</div>
                    <div className="flex items-center gap-sm text-sm font-medium min-w-0 mt-xs">
                      <User className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="truncate">{customerValueLabel}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-sm shrink-0">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setCustomerId("")
                        setCustomerValueLabel("")
                        setCustomerQuery("")
                        setCustomerResults([])
                        setVehicleId("")
                        setVehicleValueLabel("")
                        setVehicleResults([])
                      }}
                    >
                      Сменить
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setOpenCustomerCreate(true)}>
                      Новый клиент
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <Input
                    label="Клиент"
                    required
                    value={customerQuery}
                    onChange={(e) => setCustomerQuery(e.target.value)}
                    placeholder="Имя / компания / email / телефон"
                    className="pl-[36px]"
                    error={error === "Выберите клиента" ? error : undefined}
                  />
                  <User className="absolute left-md top-[42px] h-4 w-4 text-muted-foreground" />

                  {customerResults.length > 0 && (
                    <div
                      className={cn(
                        "absolute z-50 mt-xs w-full rounded-md border bg-card shadow-card dark:shadow-dark-card overflow-hidden"
                      )}
                      role="listbox"
                    >
                      {customerResults.map((c) => {
                        const label = customerLabel(c)
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setCustomerId(c.id)
                              setCustomerValueLabel(label)
                              setCustomerResults([])
                            }}
                            className="w-full text-left px-md py-sm hover:bg-surface-2 text-sm"
                          >
                            {label}
                          </button>
                        )
                      })}

                      <div className="border-t border-border/50">
                        <button
                          type="button"
                          className="w-full text-left px-md py-sm text-sm text-primary hover:bg-primary/10"
                          onClick={() => setOpenCustomerCreate(true)}
                        >
                          + Создать нового клиента
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Автомобиль */}
            <div className="md:col-span-2">
              {!customerId ? (
                <div className="text-sm text-muted-foreground">
                  Сначала выберите клиента
                </div>
              ) : vehicleId ? (
                <div className="rounded-md border bg-card p-md flex items-center justify-between gap-md">
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground">Автомобиль</div>
                    <div className="flex items-center gap-sm text-sm font-medium min-w-0 mt-xs">
                      <Car className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="truncate">{vehicleValueLabel}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-sm shrink-0">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setVehicleId("")
                        setVehicleValueLabel("")
                      }}
                    >
                      Сменить
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setOpenVehicleCreate(true)}>
                      Новое ТС
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-md border bg-card overflow-hidden">
                  <div className="px-md py-sm border-b border-border/50 flex items-center justify-between gap-md">
                    <div className="min-w-0">
                      <div className="text-xs text-muted-foreground">Автомобиль</div>
                      <div className="text-sm font-medium mt-xs">Выберите ТС клиента</div>
                    </div>
                    <Button variant="secondary" size="sm" onClick={() => setOpenVehicleCreate(true)}>
                      <Plus className="w-4 h-4 mr-xs" />
                      Новое ТС
                    </Button>
                  </div>

                  {vehicleResults.length === 0 ? (
                    <div className="p-md text-sm text-muted-foreground">
                      У клиента пока нет автомобилей.
                    </div>
                  ) : (
                    <div className="max-h-56 overflow-auto divide-y divide-border/50">
                      {vehicleResults.map((v) => {
                        const label = vehicleLabel(v)
                        return (
                          <button
                            key={v.id}
                            type="button"
                            className="w-full text-left px-md py-sm hover:bg-surface-2 text-sm flex items-center gap-sm"
                            onClick={() => {
                              setVehicleId(v.id)
                              setVehicleValueLabel(label)
                            }}
                          >
                            <Car className="w-4 h-4 text-muted-foreground shrink-0" />
                            <span className="font-medium truncate">{label}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Доп. поля */}
            <div>
              <Input
                label="Пробег (км)"
                placeholder="Например, 50000"
                value={mileage}
                inputMode="numeric"
                onChange={(e) => setMileage(e.target.value.replace(/[^\d]/g, ""))}
              />
            </div>

            <div className="md:col-span-2">
              <Input
                label="Жалобы клиента"
                placeholder="Опишите жалобы клиента"
                value={complaints}
                onChange={(e) => setComplaints(e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <Input
                label="Описание заказа"
                placeholder="Краткое описание работ"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          {error && error !== "Выберите клиента" && (
            <div className="mt-sm rounded-md border border-status-error/20 bg-status-error/10 text-status-error px-md py-sm text-sm inline-flex items-center gap-sm">
              <AlertTriangle className="w-4 h-4" />
              {error}
            </div>
          )}

          <DialogFooter className="mt-lg">
            <div className="hidden sm:flex items-center text-xs text-muted-foreground mr-auto">
              <span>Горячая клавиша:</span>
              <span className="ml-sm">
                <Kbd>⌘</Kbd>+<Kbd>Enter</Kbd>
              </span>
            </div>

            <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={submitting}>
              Отмена
            </Button>

            <Button
              variant="primary"
              onClick={submit}
              disabled={submitting || !customerId || !vehicleId}
            >
              {submitting ? (
                "Создание…"
              ) : (
                <>
                  <Save className="w-4 h-4 mr-xs" />
                  Создать
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CustomerCreateDialog
        open={openCustomerCreate}
        onOpenChange={setOpenCustomerCreate}
        onCreated={afterCreateCustomer}
      />
      <VehicleCreateDialog
        open={openVehicleCreate}
        onOpenChange={setOpenVehicleCreate}
        onCreated={afterCreateVehicle}
        initialCustomerId={customerId || undefined}
      />
    </>
  )
}
