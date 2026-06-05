// path: apps/frontend/app/dashboard/vehicles/[id]/page.tsx
"use client"

import * as React from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Car,
  CheckCircle,
  Clipboard,
  Clock,
  Gauge,
  Hash,
  Mail,
  Phone,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  User,
  Zap,
} from "lucide-react"
import { toast } from "sonner"

import { AppLayout } from "@/components/app/AppLayout"
import { NavigationHeader } from "@/components/platform/NavigationHeader"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { OrderCreateDialog } from "@/components/orders/order-create-dialog"

import { useAuth } from "@/lib/hooks/use-auth"
import { vehiclesAPI } from "@/lib/api/vehicles"
import { cn } from "@/lib/utils"
import type { EngineType, VehicleResponse } from "@/lib/types/vehicles"

function normalizeEngineType(t?: EngineType | string | null) {
  if (!t) return ""
  return String(t).trim().toLowerCase()
}

function engineTypeLabel(t?: EngineType | string | null) {
  switch (normalizeEngineType(t)) {
    case "petrol":
      return "Бензин"
    case "diesel":
      return "Дизель"
    case "hybrid":
      return "Гибрид"
    case "electric":
      return "Электро"
    default:
      return t ? String(t) : "—"
  }
}

function toFiniteNumber(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function formatEngineVolume(n?: number | string | null) {
  const v = toFiniteNumber(n)
  if (v === null) return "—"
  return `${v.toFixed(1)} л`
}

function formatDateRU(d?: string | Date | null) {
  if (!d) return "—"
  const date = typeof d === "string" ? new Date(d) : d
  if (!Number.isFinite(date.getTime())) return "—"
  return date.toLocaleDateString("ru-RU")
}

function getDaysUntil(d?: string | Date | null): number | null {
  if (!d) return null
  const date = typeof d === "string" ? new Date(d) : d
  if (!Number.isFinite(date.getTime())) return null
  const ms = date.getTime() - Date.now()
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}

function getVehicleModelLabel(vehicle: VehicleResponse | null) {
  if (!vehicle) return "Автомобиль"

  // 1) Самое надёжное — готовые "плоские" поля с бэка (часто именно они приходят)
  const byFlat =
    vehicle.displayName ||
    [vehicle.brandName, vehicle.modelName].filter(Boolean).join(" ").trim()

  if (byFlat) return byFlat

  // 2) Если пришла вложенная модель
  const byNested =
    `${vehicle.model?.brand?.name ?? ""} ${vehicle.model?.name ?? ""}`.trim()

  if (byNested) return byNested

  return "Автомобиль"
}

type ServiceStatus = "ok" | "soon" | "overdue" | "unknown"

function getServiceStatus(vehicle: VehicleResponse | null): { status: ServiceStatus; days: number | null } {
  if (!vehicle) return { status: "unknown", days: null }

  // Явный флаг с бэка
  if (vehicle.needsService) return { status: "overdue", days: toFiniteNumber(vehicle.daysUntilService) }

  // Если бэк отдал daysUntilService — используем
  const daysFromBackend = toFiniteNumber(vehicle.daysUntilService)
  if (daysFromBackend !== null) {
    if (daysFromBackend <= 0) return { status: "overdue", days: daysFromBackend }
    if (daysFromBackend <= 30) return { status: "soon", days: daysFromBackend }
    return { status: "ok", days: daysFromBackend }
  }

  // Иначе попробуем посчитать от nextServiceDate (часто есть, даже если daysUntilService нет)
  const daysFromDate = getDaysUntil(vehicle.nextServiceDate)
  if (daysFromDate !== null) {
    if (daysFromDate <= 0) return { status: "overdue", days: daysFromDate }
    if (daysFromDate <= 30) return { status: "soon", days: daysFromDate }
    return { status: "ok", days: daysFromDate }
  }

  return { status: "unknown", days: null }
}

export default function VehicleDetailsPage() {
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

  const [vehicle, setVehicle] = React.useState<VehicleResponse | null>(null)

  const [mileage, setMileage] = React.useState("")
  const [updatingMileage, setUpdatingMileage] = React.useState(false)

  const [openDelete, setOpenDelete] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)

  const [openOrderCreate, setOpenOrderCreate] = React.useState(false)

  React.useEffect(() => setIsMounted(true), [])

  const loadVehicle = React.useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)

    try {
      const v = await vehiclesAPI.getVehicle(id)
      setVehicle(v)

      // mileage иногда может прийти строкой — не оставляем поле пустым из-за typeof === "number"
      const m = toFiniteNumber((v as unknown as { mileage?: unknown })?.mileage)
      setMileage(m !== null ? String(Math.trunc(m)) : "")
    } catch (e) {
      try {
        const parsed = JSON.parse((e as Error).message) as { message?: string }
        setError(parsed.message || "Ошибка загрузки автомобиля")
      } catch {
        setError("Ошибка загрузки автомобиля")
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

    void loadVehicle()
  }, [isMounted, authLoading, isAuthenticated, user, router, loadVehicle])

  const handleRefresh = React.useCallback(() => {
    void loadVehicle()
  }, [loadVehicle])

  const copyText = React.useCallback(async (t?: string | null) => {
    if (!t) return
    try {
      await navigator.clipboard.writeText(t)
      toast.success("Скопировано")
    } catch {
      toast.error("Не удалось скопировать")
    }
  }, [])

  const handleUpdateMileage = React.useCallback(async () => {
    if (!id) return

    const m = parseInt(mileage || "", 10)
    if (Number.isNaN(m) || m < 0) {
      setError("Некорректный пробег")
      return
    }

    setUpdatingMileage(true)
    setError(null)

    try {
      const v = await vehiclesAPI.updateMileage(id, m)
      setVehicle(v)

      // синхронизируем поле ввода с тем, что вернул сервер
      const serverMileage = toFiniteNumber((v as unknown as { mileage?: unknown })?.mileage)
      setMileage(serverMileage !== null ? String(Math.trunc(serverMileage)) : String(m))

      toast.success("Пробег обновлен")
    } catch (e) {
      try {
        const parsed = JSON.parse((e as Error).message) as { message?: string }
        setError(parsed.message || "Ошибка обновления пробега")
      } catch {
        setError("Ошибка обновления пробега")
      }
    } finally {
      setUpdatingMileage(false)
    }
  }, [id, mileage])

  const roleObj = (user as unknown as { role?: string | { name?: string } } | null)?.role
  const roleName = (typeof roleObj === "string" ? roleObj : roleObj?.name || "").toLowerCase()
  const canDelete = ["owner", "company_owner", "admin", "company_admin", "superadmin"].includes(roleName)

  const handleDelete = React.useCallback(async () => {
    if (!id) return

    setDeleting(true)
    setError(null)

    try {
      await vehiclesAPI.deleteVehicle(id)
      router.push("/dashboard/vehicles")
    } catch (e) {
      try {
        const parsed = JSON.parse((e as Error).message) as { message?: string }
        setError(parsed.message || "Не удалось удалить автомобиль")
      } catch {
        setError("Не удалось удалить автомобиль")
      }
    } finally {
      setDeleting(false)
      setOpenDelete(false)
    }
  }, [id, router])

  if (!isMounted) return null

  if (authLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex items-center gap-sm">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-muted-foreground">Загрузка автомобиля…</span>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (!isAuthenticated || !user) return null

  const vehicleModel = getVehicleModelLabel(vehicle)

  const serviceMeta = getServiceStatus(vehicle)
  const serviceBadge =
    serviceMeta.status === "ok"
      ? { variant: "active" as const, label: "ТО OK", Icon: CheckCircle }
      : serviceMeta.status === "soon"
        ? {
            variant: "pending" as const,
            label: `ТО через ${serviceMeta.days ?? "?"} д.`,
            Icon: Clock,
          }
        : serviceMeta.status === "overdue"
          ? { variant: "error" as const, label: "ТО просрочено", Icon: AlertTriangle }
          : { variant: "draft" as const, label: "ТО: нет данных", Icon: Zap }

  const headerActions = (
    <div className="flex items-center gap-sm">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/dashboard/vehicles">
          <ArrowLeft className="w-4 h-4 mr-xs" />
          К списку
        </Link>
      </Button>

      <Button variant="secondary" size="sm" onClick={handleRefresh} disabled={loading}>
        <RefreshCw className="w-4 h-4 mr-xs" />
        Обновить
      </Button>

      {vehicle?.customer?.id && (
        <Button variant="primary" size="sm" onClick={() => setOpenOrderCreate(true)} disabled={loading}>
          <Plus className="w-4 h-4 mr-xs" />
          Создать заказ
        </Button>
      )}

      {canDelete && (
        <Button variant="danger" size="sm" onClick={() => setOpenDelete(true)} disabled={deleting || loading}>
          <Trash2 className="w-4 h-4 mr-xs" />
          Удалить
        </Button>
      )}
    </div>
  )

  return (
    <AppLayout>
      <div className="container mx-auto px-lg py-xl flex flex-col gap-lg">
        <NavigationHeader
          title={vehicleModel}
          subtitle="Технические характеристики, статус ТО и пробег"
          icon={<Car className="w-5 h-5" />}
          backHref="/dashboard/vehicles"
          backLabel="Автомобили"
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
              <Skeleton className="h-6 w-2/3 rounded-md" />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
                <Skeleton className="h-40 rounded-md" />
                <Skeleton className="h-40 rounded-md" />
                <Skeleton className="h-40 rounded-md" />
              </div>
            </div>
          </Card>
        ) : !vehicle ? (
          <Card className="p-section text-center">
            <div className="text-sm text-muted-foreground">Автомобиль не найден</div>
          </Card>
        ) : (
          <>
            {/* Top grid: vehicle / owner / tech */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
              {/* Vehicle */}
              <Card className="p-lg">
                <div className="flex items-center justify-between gap-md">
                  <div className="flex items-center gap-sm min-w-0">
                    <Car className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="text-sm font-semibold text-foreground truncate">Автомобиль</div>
                  </div>

                  <Badge variant={serviceBadge.variant}>
                    <serviceBadge.Icon className="w-3.5 h-3.5 mr-xs" />
                    {serviceBadge.label}
                  </Badge>
                </div>

                <div className="mt-lg grid gap-sm">
                  <InfoRow icon={Car} label="Модель" value={vehicleModel} />
                  <InfoRow
                    icon={Hash}
                    label="Гос. номер"
                    value={vehicle.licensePlate || "—"}
                    copyValue={vehicle.licensePlate || undefined}
                    onCopy={copyText}
                  />
                  <InfoRow
                    icon={Clipboard}
                    label="VIN"
                    value={vehicle.vin || "—"}
                    copyValue={vehicle.vin || undefined}
                    onCopy={copyText}
                  />
                  <InfoRow
                    icon={Calendar}
                    label="Год"
                    value={
                      toFiniteNumber((vehicle as unknown as { year?: unknown })?.year) !== null
                        ? String(Math.trunc(toFiniteNumber((vehicle as unknown as { year?: unknown })?.year)!))
                        : "—"
                    }
                  />
                  <InfoRow icon={Zap} label="Двигатель" value={engineTypeLabel(vehicle.engineType as EngineType)} />
                  <InfoRow icon={Gauge} label="Объем" value={formatEngineVolume(vehicle.engineVolume)} />
                </div>
              </Card>

              {/* Owner */}
              <Card className="p-lg">
                <div className="flex items-center gap-sm">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <div className="text-sm font-semibold text-foreground">Владелец</div>
                </div>

                <div className="mt-lg grid gap-sm">
                  {vehicle.customer ? (
                    <>
                      <InfoRow
                        icon={User}
                        label="Клиент"
                        value={
                          [vehicle.customer.firstName, vehicle.customer.lastName].filter(Boolean).join(" ") ||
                          vehicle.customer.companyName ||
                          vehicle.customerName ||
                          "Клиент"
                        }
                        href={`/dashboard/customers/${vehicle.customer.id}`}
                      />

                      <InfoRow
                        icon={Phone}
                        label="Телефон"
                        value={vehicle.customer.phone || "—"}
                        copyValue={vehicle.customer.phone || undefined}
                        onCopy={copyText}
                      />

                      <InfoRow
                        icon={Mail}
                        label="Email"
                        value={vehicle.customer.email || "—"}
                        copyValue={vehicle.customer.email || undefined}
                        onCopy={copyText}
                      />
                    </>
                  ) : vehicle.customerName ? (
                    <>
                      <InfoRow icon={User} label="Клиент" value={vehicle.customerName} />
                      <InfoRow icon={Phone} label="Телефон" value="—" />
                      <InfoRow icon={Mail} label="Email" value="—" />
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground">Владелец не указан</div>
                  )}
                </div>
              </Card>

              {/* Tech / mileage */}
              <Card className="p-lg">
                <div className="flex items-center gap-sm">
                  <Gauge className="w-4 h-4 text-muted-foreground" />
                  <div className="text-sm font-semibold text-foreground">Техническое состояние</div>
                </div>

                <div className="mt-lg grid gap-md">
                  <div className="rounded-md border border-border p-md">
                    <div className="text-xs text-muted-foreground">ТО</div>
                    <div className="mt-sm">
                      <Badge variant={serviceBadge.variant}>
                        <serviceBadge.Icon className="w-3.5 h-3.5 mr-xs" />
                        {serviceBadge.label}
                      </Badge>
                    </div>

                    <div className="mt-md grid gap-xs text-xs text-muted-foreground">
                      <div>Последнее ТО: {formatDateRU(vehicle.lastServiceDate)}</div>
                      <div>Следующее ТО: {formatDateRU(vehicle.nextServiceDate)}</div>
                    </div>
                  </div>

                  <div className="rounded-md border border-border p-md">
                    <div className="text-xs text-muted-foreground">Пробег (км)</div>
                    <div className="mt-sm flex items-center gap-sm">
                      <Input
                        value={mileage}
                        onChange={(e) => setMileage(e.target.value.replace(/[^0-9]/g, ""))}
                        placeholder="Пробег"
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => void handleUpdateMileage()}
                        disabled={updatingMileage}
                      >
                        <Save className="w-4 h-4 mr-xs" />
                        {updatingMileage ? "Сохранение…" : "Обновить"}
                      </Button>
                    </div>
                  </div>

                  {vehicle.notes && (
                    <div className="rounded-md border border-border p-md">
                      <div className="text-xs text-muted-foreground">Примечания</div>
                      <div className="mt-sm text-sm text-foreground whitespace-pre-line">{vehicle.notes}</div>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Service history */}
            <Card className="p-lg">
              <div className="flex items-center justify-between gap-md">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground">История обслуживания</div>
                  <div className="text-xs text-muted-foreground mt-xs">
                    Записей: {typeof vehicle.serviceHistoryCount === "number" ? vehicle.serviceHistoryCount : 0}
                  </div>
                </div>

                <Button variant="secondary" size="sm" asChild>
                  <Link href={`/dashboard/orders?vehicleId=${encodeURIComponent(id)}`}>История заказов</Link>
                </Button>
              </div>

              <div className="mt-md text-sm text-muted-foreground">
                Здесь будет отображаться лента работ и ТО по автомобилю.
              </div>
            </Card>
          </>
        )}

        <ConfirmDialog
          open={openDelete}
          onOpenChange={setOpenDelete}
          title="Удалить автомобиль?"
          description="Это действие нельзя отменить."
          confirmText="Удалить"
          variant="destructive"
          loading={deleting}
          onConfirm={handleDelete}
        />

        <OrderCreateDialog
          open={openOrderCreate}
          onOpenChange={setOpenOrderCreate}
          initialVehicleId={id}
          initialCustomerId={vehicle?.customer?.id}
          onCreated={(o) => router.push(`/dashboard/orders/${o.id}`)}
        />
      </div>
    </AppLayout>
  )
}

function InfoRow({
  icon: Icon,
  label,
  value,
  href,
  copyValue,
  onCopy,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  href?: string
  copyValue?: string
  onCopy?: (t: string) => void
}) {
  const content = (
    <div
      className={cn(
        "flex items-center gap-md rounded-md border border-border px-md py-sm",
        href && "hover:bg-surface-2 transition-colors"
      )}
    >
      <div className="w-8 h-8 rounded-md bg-surface-2 border flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm font-medium text-foreground truncate">{value}</div>
      </div>

      {copyValue && onCopy && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-sm shrink-0"
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onCopy(copyValue)
          }}
          title="Скопировать"
        >
          <Clipboard className="w-4 h-4" />
        </Button>
      )}
    </div>
  )

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    )
  }

  return content
}
