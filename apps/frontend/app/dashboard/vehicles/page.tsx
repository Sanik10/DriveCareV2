// path: apps/frontend/app/dashboard/vehicles/page.tsx
"use client"

import * as React from "react"
import Link from "next/link"
import { Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  AlertTriangle,
  Calendar,
  Car,
  CheckCircle,
  Clock,
  Gauge,
  Hash,
  Plus,
  RefreshCw,
  Search,
  User,
} from "lucide-react"

import { AppLayout } from "@/components/app/AppLayout"
import { NavigationHeader } from "@/components/platform/NavigationHeader"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { PageFiltersCard, PageFiltersRow, PageFiltersAdvanced } from "@/components/app/PageFiltersCard"
import { PageContentCard } from "@/components/app/PageContentCard"
import { StatsCard, StatsGrid } from "@/components/app/StatsCard"
import { PaginationControls } from "@/components/app/PaginationControls"
import { VehicleCreateDialog } from "@/components/vehicles/vehicle-create-dialog"

import { useAuth } from "@/lib/hooks/use-auth"
import { vehiclesAPI } from "@/lib/api/vehicles"
import { vehiclesCatalogueAPI } from "@/lib/api/vehicles-catalogue"
import { cn } from "@/lib/utils"
import type { VehiclesQuery, PaginatedVehiclesResponse, VehicleResponse, EngineType } from "@/lib/types/vehicles"
import type { CatalogueBrand, CatalogueModel, CatalogueType } from "@/lib/types/vehicles-catalogue"

const ENGINE_TYPES: { value: EngineType; label: string }[] = [
  { value: "petrol", label: "Бензин" },
  { value: "diesel", label: "Дизель" },
  { value: "hybrid", label: "Гибрид" },
  { value: "electric", label: "Электро" },
]

export default function VehiclesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex items-center gap-sm">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-muted-foreground">Загрузка автомобилей...</span>
          </div>
        </div>
      }
    >
      <VehiclesListPage />
    </Suspense>
  )
}

function VehiclesListPage() {
  const { isAuthenticated, user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [isMounted, setIsMounted] = React.useState(false)

  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [data, setData] = React.useState<PaginatedVehiclesResponse | null>(null)

  const [search, setSearch] = React.useState(searchParams.get("search") || "")
  const [page, setPage] = React.useState(1)
  const [limit, setLimit] = React.useState(12)

  // Service filter — локальный UI-фильтр поверх загруженной страницы
  const [serviceFilter, setServiceFilter] = React.useState<"all" | "ok" | "soon" | "overdue">("all")

  const [openCreate, setOpenCreate] = React.useState(false)

  // Catalogue filters
  const [brands, setBrands] = React.useState<CatalogueBrand[]>([])
  const [models, setModels] = React.useState<CatalogueModel[]>([])
  const [types, setTypes] = React.useState<CatalogueType[]>([])

  const [brandId, setBrandId] = React.useState("")
  const [modelId, setModelId] = React.useState("")
  const [vehicleTypeId, setVehicleTypeId] = React.useState("")

  // Extended filters
  const [engineType, setEngineType] = React.useState<EngineType | "">("")
  const [yearFrom, setYearFrom] = React.useState("")
  const [yearTo, setYearTo] = React.useState("")
  const [hasServiceHistory, setHasServiceHistory] = React.useState(false)

  const searchRef = React.useRef<HTMLInputElement | null>(null)

  React.useEffect(() => setIsMounted(true), [])

  // справочники (бренды/модели/типы)
  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [b, m, t] = await Promise.all([
          vehiclesCatalogueAPI.brands(),
          vehiclesCatalogueAPI.models(),
          vehiclesCatalogueAPI.types(),
        ])
        if (!cancelled) {
          setBrands(b)
          setModels(m)
          setTypes(t)
        }
      } catch {
        // ignore
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const filteredModels = React.useMemo(() => {
    if (!brandId) return models
    return models.filter((m) => m.brandId === brandId || m.brand?.id === brandId)
  }, [models, brandId])

  const query: VehiclesQuery = React.useMemo(
    () => ({
      search: search || undefined,
      page,
      limit,
      modelId: modelId || undefined,
      vehicleTypeId: vehicleTypeId || undefined,
      engineType: engineType || undefined,
      yearFrom: yearFrom ? parseInt(yearFrom, 10) : undefined,
      yearTo: yearTo ? parseInt(yearTo, 10) : undefined,
      hasServiceHistory: hasServiceHistory ? true : undefined,
    }),
    [search, page, limit, modelId, vehicleTypeId, engineType, yearFrom, yearTo, hasServiceHistory]
  )

  const items = React.useMemo(() => data?.items || [], [data])

  const filteredItems = React.useMemo(() => {
    if (serviceFilter === "all") return items
    return items.filter((vehicle) => getVehicleServiceStatus(vehicle) === serviceFilter)
  }, [items, serviceFilter])

  const serviceStats = React.useMemo(() => {
    return items.reduce(
      (acc, vehicle) => {
        const status = getVehicleServiceStatus(vehicle)
        acc[status] = (acc[status] || 0) + 1
        return acc
      },
      {} as Record<"ok" | "soon" | "overdue", number>
    )
  }, [items])

  React.useEffect(() => {
    if (!isMounted) return
    if (authLoading) return

    if (!isAuthenticated || !user) {
      router.push("/login")
      return
    }

    let cancelled = false
    const DEBOUNCE_MS = 300

    const timer = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await vehiclesAPI.getVehicles(query)
        if (!cancelled) setData(res)
      } catch (e) {
        try {
          const parsed = JSON.parse((e as Error).message) as { message?: string; correlationId?: string }
          const msg = parsed.correlationId
            ? `${parsed.message || "Ошибка загрузки автомобилей"} (corrId: ${parsed.correlationId})`
            : parsed.message || "Ошибка загрузки автомобилей"
          if (!cancelled) setError(msg)
        } catch {
          if (!cancelled) setError("Ошибка загрузки автомобилей")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, DEBOUNCE_MS)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [isMounted, authLoading, isAuthenticated, user, router, query])

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Cmd/Ctrl+K — фокус на поиск
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        searchRef.current?.focus()
      }

      // Cmd/Ctrl+N — добавить ТС
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "n") {
        e.preventDefault()
        setOpenCreate(true)
      }
    }

    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const loadFirstPage = React.useCallback(async () => {
    setPage(1)
    setLoading(true)
    setError(null)
    try {
      const res = await vehiclesAPI.getVehicles({ ...query, page: 1 })
      setData(res)
    } catch {
      setError("Ошибка загрузки автомобилей")
    } finally {
      setLoading(false)
    }
  }, [query])

  const handleRefresh = React.useCallback(() => {
    void loadFirstPage()
  }, [loadFirstPage])

  const onCreated = React.useCallback(async () => {
    // после создания — обновляем список, показываем начало
    await loadFirstPage()
  }, [loadFirstPage])

  if (!isMounted) return null

  if (authLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex items-center gap-sm">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-muted-foreground">Загрузка автомобилей...</span>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (!isAuthenticated || !user) return null

  const headerActions = (
    <div className="flex items-center gap-sm">
      <Button variant="secondary" size="sm" onClick={handleRefresh} disabled={loading}>
        <RefreshCw className="w-4 h-4 mr-xs" />
        Обновить
      </Button>

      <Button variant="primary" size="sm" onClick={() => setOpenCreate(true)}>
        <Plus className="w-4 h-4 mr-xs" />
        Добавить ТС
      </Button>
    </div>
  )

  return (
    <AppLayout>
      <div className="container mx-auto px-lg py-xl flex flex-col gap-lg">
        <NavigationHeader
          title="Автомобили"
          subtitle="Учет ТС с контролем ТО и техническими характеристиками"
          icon={<Car className="w-5 h-5" />}
          actions={headerActions}
        />

        <StatsGrid cols={6}>
          <StatsCard title="Всего ТС" value={data?.total ?? 0} icon={Car} />
          <StatsCard title="ТО актуально" value={serviceStats.ok || 0} icon={CheckCircle} />
          <StatsCard title="ТО скоро" value={serviceStats.soon || 0} icon={Clock} />
          <StatsCard title="ТО просрочено" value={serviceStats.overdue || 0} icon={AlertTriangle} />
          <StatsCard title="Средний пробег" value={Math.round(data?.meta?.averageMileage ?? 0)} icon={Gauge} />
          <StatsCard
            title="Средний возраст"
            value={Number((data?.meta?.averageAge ?? 0).toFixed(1))}
            icon={Calendar}
            suffix="лет"
          />
        </StatsGrid>

        <PageFiltersCard>
          <div className="space-y-md">
            <PageFiltersRow>
              <div className="relative w-full lg:max-w-lg">
                <label htmlFor="vehicles-search" className="sr-only">
                  Поиск автомобилей
                </label>
                <Input
                  ref={searchRef}
                  id="vehicles-search"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  placeholder="Поиск по номеру / VIN / модели / владельцу (Ctrl+K)"
                  className="pl-[36px]"
                />
                <Search className="w-4 h-4 absolute left-md top-1/2 -translate-y-1/2 text-muted-foreground" />
              </div>

              {/* Service filter (segmented) */}
              <div className="inline-flex items-center rounded-md border bg-card p-xs flex-wrap gap-xs">
                <Button
                  variant={serviceFilter === "all" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-8"
                  onClick={() => setServiceFilter("all")}
                >
                  Все
                  <span className="ml-xs text-muted-foreground tabular-nums">{items.length}</span>
                </Button>

                <Button
                  variant={serviceFilter === "ok" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-8"
                  onClick={() => setServiceFilter("ok")}
                >
                  <CheckCircle className="w-4 h-4 mr-xs" />
                  ТО OK
                  <span className="ml-xs text-muted-foreground tabular-nums">{serviceStats.ok || 0}</span>
                </Button>

                <Button
                  variant={serviceFilter === "soon" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-8"
                  onClick={() => setServiceFilter("soon")}
                >
                  <Clock className="w-4 h-4 mr-xs" />
                  Скоро
                  <span className="ml-xs text-muted-foreground tabular-nums">{serviceStats.soon || 0}</span>
                </Button>

                <Button
                  variant={serviceFilter === "overdue" ? "secondary" : "ghost"}
                  size="sm"
                  className="h-8"
                  onClick={() => setServiceFilter("overdue")}
                >
                  <AlertTriangle className="w-4 h-4 mr-xs" />
                  Просрочено
                  <span className="ml-xs text-muted-foreground tabular-nums">{serviceStats.overdue || 0}</span>
                </Button>
              </div>

              <div className="flex items-center gap-sm">
                <label className="sr-only" htmlFor="vehicles-limit">
                  Количество
                </label>
                <select
                  id="vehicles-limit"
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
                  {[12, 24, 48].map((n) => (
                    <option key={n} value={n}>
                      {n} / стр
                    </option>
                  ))}
                </select>
              </div>
            </PageFiltersRow>

            <PageFiltersAdvanced>
              <div className="w-full">
                <label className="sr-only" htmlFor="vehicles-brand">
                  Бренд
                </label>
                <select
                  id="vehicles-brand"
                  value={brandId}
                  onChange={(e) => {
                    setBrandId(e.target.value)
                    setModelId("")
                    setPage(1)
                  }}
                  className={cn(
                    "h-10 w-full rounded-md border border-input bg-background text-sm px-md",
                    "text-foreground hover:border-border/80"
                  )}
                >
                  <option value="">Все бренды</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-full">
                <label className="sr-only" htmlFor="vehicles-model">
                  Модель
                </label>
                <select
                  id="vehicles-model"
                  value={modelId}
                  onChange={(e) => {
                    setModelId(e.target.value)
                    setPage(1)
                  }}
                  className={cn(
                    "h-10 w-full rounded-md border border-input bg-background text-sm px-md",
                    "text-foreground hover:border-border/80"
                  )}
                >
                  <option value="">Все модели</option>
                  {filteredModels.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-full">
                <label className="sr-only" htmlFor="vehicles-type">
                  Тип ТС
                </label>
                <select
                  id="vehicles-type"
                  value={vehicleTypeId}
                  onChange={(e) => {
                    setVehicleTypeId(e.target.value)
                    setPage(1)
                  }}
                  className={cn(
                    "h-10 w-full rounded-md border border-input bg-background text-sm px-md",
                    "text-foreground hover:border-border/80"
                  )}
                >
                  <option value="">Все типы</option>
                  {types.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-full">
                <label className="sr-only" htmlFor="vehicles-engine">
                  Двигатель
                </label>
                <select
                  id="vehicles-engine"
                  value={engineType}
                  onChange={(e) => {
                    setEngineType((e.target.value as EngineType) || "")
                    setPage(1)
                  }}
                  className={cn(
                    "h-10 w-full rounded-md border border-input bg-background text-sm px-md",
                    "text-foreground hover:border-border/80"
                  )}
                >
                  <option value="">Двигатель</option>
                  {ENGINE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-sm w-full">
                <div className="w-full">
                  <label className="sr-only" htmlFor="vehicles-year-from">
                    Год от
                  </label>
                  <Input
                    id="vehicles-year-from"
                    type="number"
                    inputMode="numeric"
                    placeholder="Год от"
                    value={yearFrom}
                    onChange={(e) => {
                      setYearFrom(e.target.value.replace(/[^\d]/g, ""))
                      setPage(1)
                    }}
                  />
                </div>

                <div className="w-full">
                  <label className="sr-only" htmlFor="vehicles-year-to">
                    Год до
                  </label>
                  <Input
                    id="vehicles-year-to"
                    type="number"
                    inputMode="numeric"
                    placeholder="Год до"
                    value={yearTo}
                    onChange={(e) => {
                      setYearTo(e.target.value.replace(/[^\d]/g, ""))
                      setPage(1)
                    }}
                  />
                </div>
              </div>

              <label className="flex items-center gap-sm text-sm text-muted-foreground select-none">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded-sm border border-input bg-background"
                  checked={hasServiceHistory}
                  onChange={(e) => {
                    setHasServiceHistory(e.target.checked)
                    setPage(1)
                  }}
                />
                Есть история ТО
              </label>
            </PageFiltersAdvanced>
          </div>
        </PageFiltersCard>

        <PageContentCard
          loading={loading}
          error={error}
          empty={filteredItems.length === 0}
          emptyState={{
            icon: Car,
            title: "Автомобили не найдены",
            description:
              serviceFilter !== "all"
                ? "Нет автомобилей с выбранным статусом ТО."
                : "Попробуйте изменить параметры поиска или добавьте первое ТС.",
            action: {
              label: "Добавить ТС",
              onClick: () => setOpenCreate(true),
              icon: Plus,
            },
          }}
          onRetry={handleRefresh}
          loadingRows={12}
        >
          <div className="p-lg grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-md">
            {filteredItems.map((vehicle) => (
              <VehicleCard key={vehicle.id} vehicle={vehicle} />
            ))}
          </div>
        </PageContentCard>

        <PaginationControls
          page={page}
          totalPages={data?.totalPages || 1}
          total={data?.total || 0}
          showing={filteredItems.length}
          onPageChange={setPage}
          itemLabel="автомобилей"
        />

        <VehicleCreateDialog open={openCreate} onOpenChange={setOpenCreate} onCreated={onCreated} />
      </div>
    </AppLayout>
  )
}

function getVehicleServiceStatus(vehicle: VehicleResponse): "ok" | "soon" | "overdue" {
  if (vehicle.needsService) return "overdue"
  if (vehicle.daysUntilService !== undefined && vehicle.daysUntilService <= 30) return "soon"
  return "ok"
}

function VehicleCard({ vehicle }: { vehicle: VehicleResponse }) {
  const model =
    `${vehicle.model?.brand?.name || ""} ${vehicle.model?.name || ""}`.trim() || "Автомобиль"

  const owner = vehicle.customer
    ? [vehicle.customer.firstName, vehicle.customer.lastName].filter(Boolean).join(" ") ||
      vehicle.customer.companyName ||
      "Клиент"
    : "Не указан"

  const serviceStatus = getVehicleServiceStatus(vehicle)

  const serviceBadge =
    serviceStatus === "ok"
      ? { variant: "active" as const, label: "ТО OK", Icon: CheckCircle }
      : serviceStatus === "soon"
        ? {
            variant: "pending" as const,
            label: `ТО через ${typeof vehicle.daysUntilService === "number" ? vehicle.daysUntilService : "?"} д.`,
            Icon: Clock,
          }
        : { variant: "error" as const, label: "ТО просрочено", Icon: AlertTriangle }

  const IdIcon = vehicle.licensePlate ? Hash : Hash
  const idValue = vehicle.licensePlate || vehicle.vin

  return (
    <Link href={`/dashboard/vehicles/${vehicle.id}`} className="block transition-colors hover:bg-surface-2 rounded-md">
      <Card className="p-md">
        <div className="flex items-start justify-between gap-md">
          <div className="flex items-start gap-md min-w-0">
            <div className="w-10 h-10 rounded-md bg-surface-2 border flex items-center justify-center shrink-0">
              <Car className="w-4 h-4 text-muted-foreground" />
            </div>

            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground truncate">{model}</div>
              <div className="text-xs text-muted-foreground mt-xs truncate">{owner}</div>
            </div>
          </div>

          <Badge variant={serviceBadge.variant} className="shrink-0">
            <serviceBadge.Icon className="w-3.5 h-3.5 mr-xs" />
            {serviceBadge.label}
          </Badge>
        </div>

        <div className="mt-md grid gap-xs text-xs text-muted-foreground">
          {idValue && (
            <div className="flex items-center gap-xs min-w-0">
              <IdIcon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate font-mono">{idValue}</span>
            </div>
          )}

          {typeof vehicle.mileage === "number" && (
            <div className="flex items-center gap-xs">
              <Gauge className="w-3.5 h-3.5" />
              <span>{vehicle.mileage.toLocaleString("ru-RU")} км</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-sm pt-sm border-t border-border/50">
            <span className="inline-flex items-center gap-xs">
              <User className="w-3.5 h-3.5" />
              <span className="truncate">{owner}</span>
            </span>

            <span className="inline-flex items-center gap-xs shrink-0">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(vehicle.createdAt).toLocaleDateString("ru-RU")}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  )
}
