// path: apps/frontend/app/dashboard/invoices/new/page.tsx
"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { 
  FileText,
  Save, 
  Calendar, 
  Percent, 
  FileEdit, 
  AlertTriangle, 
  X,
  Settings,
  CheckCircle
} from "lucide-react"
import { toast } from "sonner"

import { AppLayout } from "@/components/app/AppLayout"
import { NavigationHeader } from "@/components/platform/NavigationHeader"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

import { useAuth } from "@/lib/hooks/use-auth"
import { invoicesAPI } from "@/lib/api/invoices"
import { apiRequest } from "@/lib/api/core"
import { AsyncCombobox, type AsyncOption } from "@/components/ui/async-combobox"

type OrderLite = {
  id: string
  orderNumber?: string
  status?: string
  description?: string | null
  createdAt?: string
  customer?: {
    id: string
    firstName?: string | null
    lastName?: string | null
    companyName?: string | null
    email?: string | null
    phone?: string | null
  }
  vehicle?: {
    id: string
    licensePlate?: string | null
    vin?: string | null
    displayName?: string | null
  }
  totalAmount?: number
  discountAmount?: number
  taxAmount?: number
  finalAmount?: number
}

type OrderOption = AsyncOption<OrderLite>

function fmtMoney(n?: number) {
  if (typeof n !== "number" || Number.isNaN(n)) return "—"
  try {
    return n.toLocaleString("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 })
  } catch {
    return `${n} ₽`
  }
}

function addDays(date: Date, days: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function toDateInputValue(d: Date) {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

export default function NewInvoicePage() {
  const router = useRouter()
  const { isAuthenticated, user, isLoading: authLoading } = useAuth()

  const [isMounted, setIsMounted] = React.useState(false)

  const [creating, setCreating] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const [dueDate, setDueDate] = React.useState<string>("")
  const [notes, setNotes] = React.useState("")
  const [discountPercent, setDiscountPercent] = React.useState<string>("0")
  const [orderOpt, setOrderOpt] = React.useState<OrderOption | null>(null)

  React.useEffect(() => setIsMounted(true), [])

  const roleObj = (user as unknown as { role?: string | { name?: string } } | null)?.role
  const roleName = (typeof roleObj === "string" ? roleObj : roleObj?.name || "").toLowerCase()
  const canCreate = ["company_owner", "company_admin", "owner", "admin", "manager"].includes(roleName)

  const today = React.useMemo(() => new Date(), [])
  const defaultDue = React.useMemo(() => addDays(today, 30), [today])
  const order = orderOpt?.meta ?? null

  React.useEffect(() => {
    setDueDate(toDateInputValue(defaultDue))
  }, [defaultDue])

  React.useEffect(() => {
    if (!isMounted) return
    if (authLoading) return
    if (!isAuthenticated || !user) {
      router.push("/login")
      return
    }
    if (!canCreate) {
      router.push("/dashboard/invoices")
    }
  }, [isMounted, authLoading, isAuthenticated, user, router, canCreate])

  const paymentTermsDays = React.useMemo(() => {
    if (!dueDate) return 0
    try {
      const due = new Date(dueDate)
      const ms = due.getTime() - today.getTime()
      return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)))
    } catch {
      return 0
    }
  }, [dueDate, today])

  const fetchOrders = React.useCallback(async (query: string): Promise<OrderOption[]> => {
    const sp = new URLSearchParams()
    if (query && query.trim()) sp.set("search", query.trim())
    sp.set("limit", "10")
    sp.set("status", "completed")

    try {
      const res = await apiRequest<{ items?: OrderLite[] } | OrderLite[]>(`/orders?${sp.toString()}`, {
        method: "GET",
      })
      const items: OrderLite[] = Array.isArray(res) ? res : res?.items || []
      return items.map((o) => ({
        id: o.id,
        label: o.orderNumber || o.id.slice(0, 8),
        meta: o,
      }))
    } catch {
      return []
    }
  }, [])

  const onCreate = React.useCallback(async () => {
    setError(null)

    if (!order) {
      setError("Выберите заказ")
      return
    }
    if (!dueDate) {
      setError("Укажите срок оплаты")
      return
    }

    const disc = Number(String(discountPercent || "0").replace(",", "."))
    if (!Number.isFinite(disc) || disc < 0 || disc > 100) {
      setError("Скидка должна быть числом 0..100")
      return
    }

    setCreating(true)
    try {
      const payload = {
        orderId: order.id,
        paymentTermsDays,
        discountPercent: disc > 0 ? disc : undefined,
        notes: notes.trim() || undefined,
      }
      const inv = await invoicesAPI.createFromOrder(payload)
      toast.success("Счёт создан")
      router.push(`/dashboard/invoices/${inv.id}`)
    } catch (e) {
      setError((e as Error)?.message || "Не удалось создать счёт")
    } finally {
      setCreating(false)
    }
  }, [order, dueDate, discountPercent, notes, paymentTermsDays, router])

  // Cmd/Ctrl + Enter — создать
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault()
        if (!creating) void onCreate()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onCreate, creating])

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

  if (!isAuthenticated || !user || !canCreate) return null

  const headerActions = (
    <div className="flex items-center gap-sm">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => router.push("/dashboard/invoices")}
        disabled={creating}
      >
        Отмена
      </Button>

      <Button variant="primary" size="sm" onClick={onCreate} disabled={creating || !order || !dueDate}>
        <Save className="w-4 h-4 mr-xs" />
        Создать счёт
      </Button>
    </div>
  )

  return (
    <AppLayout>
      <div className="container mx-auto px-lg py-xl flex flex-col gap-lg">
        <NavigationHeader
          title="Новый счёт"
          subtitle="Создание счёта на основании заказа"
          icon={<FileText className="w-5 h-5" />}
          backHref="/dashboard/invoices"
          backLabel="К счетам"
          actions={headerActions}
        />

        {error && (
          <Card className="p-md border border-status-error/30 bg-status-error/10 text-status-error text-sm">
            <div className="flex items-start gap-sm">
              <AlertTriangle className="w-4 h-4 mt-[2px] shrink-0" />
              <div className="min-w-0">{error}</div>
            </div>
          </Card>
        )}

        {/* Выбор заказа */}
        <Card className="p-lg">
          <div className="flex items-center justify-between gap-md mb-md">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground">Выбор заказа</div>
              <div className="text-xs text-muted-foreground">Счёт создаётся из завершённого заказа</div>
            </div>

            <Link href="/dashboard/orders" className="shrink-0">
              <Button variant="ghost" size="sm">
                К заказам
              </Button>
            </Link>
          </div>

          <div className="grid md:grid-cols-[1fr_auto] gap-md items-end">
            <div className="min-w-0">
              <label className="text-sm text-muted-foreground block mb-xs">Заказ *</label>
              <AsyncCombobox<OrderLite>
                value={orderOpt}
                onChange={setOrderOpt}
                fetchOptions={fetchOrders}
                placeholder="Начните вводить номер заказа или имя клиента…"
              />
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => setOrderOpt(null)}
              disabled={!orderOpt || creating}
            >
              <X className="w-4 h-4 mr-xs" />
              Очистить
            </Button>
          </div>

          {order && (
            <div className="mt-lg rounded-md border p-md">
              <div className="flex items-center justify-between gap-md">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground">
                    Заказ: {order.orderNumber || order.id.slice(0, 8)}
                  </div>
                  <div className="text-xs text-muted-foreground mt-xs truncate">
                    Клиент:{" "}
                    {order.customer?.companyName ||
                      [order.customer?.lastName, order.customer?.firstName].filter(Boolean).join(" ") ||
                      "—"}{" "}
                    · Авто: {order.vehicle?.displayName || order.vehicle?.licensePlate || "—"}
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <div className="text-xs text-muted-foreground">Сумма заказа</div>
                  <div className="text-sm font-semibold tabular-nums">{fmtMoney(order.finalAmount)}</div>
                </div>
              </div>

              {order.description ? (
                <div className="mt-md text-xs text-muted-foreground">
                  <span className="text-muted-foreground">Описание:</span> {order.description}
                </div>
              ) : null}
            </div>
          )}
        </Card>

        {/* Настройки счёта */}
        <Card className="p-lg">
          <div className="flex items-center gap-sm mb-md">
            <FileEdit className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Настройки счёта</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-md">
            <div className="min-w-0">
              <label className="text-sm text-muted-foreground block mb-xs">Срок оплаты *</label>
              <div className="relative">
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="pl-[36px]"
                />
                <Calendar className="w-4 h-4 absolute left-md top-1/2 -translate-y-1/2 text-muted-foreground" />
              </div>
              <div className="text-xs text-muted-foreground mt-xs">
                Платёжных дней: <span className="text-foreground font-medium">{paymentTermsDays}</span>
              </div>
            </div>

            <div className="min-w-0">
              <label className="text-sm text-muted-foreground block mb-xs">Скидка, %</label>
              <div className="relative">
                <Input
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value)}
                  placeholder="0..100"
                  inputMode="decimal"
                  className="pl-[36px]"
                />
                <Percent className="w-4 h-4 absolute left-md top-1/2 -translate-y-1/2 text-muted-foreground" />
              </div>
              <div className="text-xs text-muted-foreground mt-xs">Применится при создании счёта</div>
            </div>

            <div className="min-w-0 md:col-span-3">
              <label className="text-sm text-muted-foreground block mb-xs">Примечания</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Дополнительная информация к счёту"
                className={cn(
                  "w-full min-h-[96px] rounded-md border border-input bg-background px-md py-sm text-sm",
                  "text-foreground placeholder:text-muted-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                )}
              />
              <div className="text-xs text-muted-foreground mt-xs">Cmd/Ctrl + Enter — создать</div>
            </div>
          </div>
        </Card>

        {/* Сводка (без второй Primary-кнопки) */}
        <Card className="p-lg">
          <div className="flex items-center gap-sm mb-md">
            <CheckCircle className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Сводка</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-md text-sm">
            <div className="rounded-md border p-md">
              <div className="text-xs text-muted-foreground">Заказ</div>
              <div className="mt-xs font-medium">{order ? (order.orderNumber || order.id.slice(0, 8)) : "—"}</div>
            </div>

            <div className="rounded-md border p-md">
              <div className="text-xs text-muted-foreground">Срок оплаты</div>
              <div className="mt-xs font-medium tabular-nums">{dueDate || "—"}</div>
            </div>

            <div className="rounded-md border p-md">
              <div className="text-xs text-muted-foreground">Сумма заказа</div>
              <div className="mt-xs font-medium tabular-nums">{fmtMoney(order?.finalAmount)}</div>
            </div>
          </div>

          <div className="mt-md text-xs text-muted-foreground inline-flex items-center gap-xs">
            <Settings className="w-3.5 h-3.5" />
            Счёт будет создан со статусом <span className="text-foreground font-medium">“Выставлен”</span>.
          </div>
        </Card>
      </div>
    </AppLayout>
  )
}
