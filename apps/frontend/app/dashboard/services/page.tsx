// path: apps/frontend/app/dashboard/services/page.tsx
"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  Building2,
  Plus,
  Search,
  RefreshCw,
  Pencil,
  Trash2,
  Folder,
  GripVertical,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
} from "lucide-react"
import { toast } from "sonner"

import { AppLayout } from "@/components/app/AppLayout"
import { NavigationHeader } from "@/components/platform/NavigationHeader"
import { PageFiltersCard, PageFiltersRow } from "@/components/app/PageFiltersCard"
import { PageContentCard } from "@/components/app/PageContentCard"
import { PaginationControls } from "@/components/app/PaginationControls"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { useAuth } from "@/lib/hooks/use-auth"
import { servicesAPI } from "@/lib/api/services"
import type { PaginatedServicesResponse, ServiceCatalogueItem, ServiceCategory } from "@/lib/types/services"
import { ServiceEditDialog } from "@/components/services/service-edit-dialog"
import { CategoryEditDialog } from "@/components/services/category-edit-dialog"
import { cn } from "@/lib/utils"

type ConfirmTarget =
  | { type: "category"; item: ServiceCategory }
  | { type: "service"; item: ServiceCatalogueItem }
  | null

type FilterStatus = "all" | "active" | "inactive"
type SortBy = "name" | "price" | "durationMinutes" | "createdAt"
type SortOrder = "ASC" | "DESC"

export default function ServicesCataloguePage() {
  const { isAuthenticated, user, isLoading: authLoading } = useAuth()
  const router = useRouter()

  const [isMounted, setIsMounted] = React.useState(false)

  // data
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [data, setData] = React.useState<PaginatedServicesResponse | null>(null)

  const [categories, setCategories] = React.useState<ServiceCategory[]>([])
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null)

  // filters
  const [search, setSearch] = React.useState("")
  const [debouncedSearch, setDebouncedSearch] = React.useState("")
  const [page, setPage] = React.useState(1)
  const [limit, setLimit] = React.useState(20)

  const [filterStatus, setFilterStatus] = React.useState<FilterStatus>("all")
  const [sortBy, setSortBy] = React.useState<SortBy>("name")
  const [sortOrder, setSortOrder] = React.useState<SortOrder>("ASC")

  // dialogs
  const [openServiceEdit, setOpenServiceEdit] = React.useState(false)
  const [currentService, setCurrentService] = React.useState<ServiceCatalogueItem | null>(null)

  const [openCategoryEdit, setOpenCategoryEdit] = React.useState(false)
  const [currentCategory, setCurrentCategory] = React.useState<ServiceCategory | null>(null)

  // confirm
  const [confirmTarget, setConfirmTarget] = React.useState<ConfirmTarget>(null)
  const [confirmLoading, setConfirmLoading] = React.useState(false)

  // drag
  const [draggedCatId, setDraggedCatId] = React.useState<string | null>(null)

  // hotkeys
  const searchRef = React.useRef<HTMLInputElement | null>(null)

  React.useEffect(() => setIsMounted(true), [])

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const query = React.useMemo(
    () => ({
      search: debouncedSearch || undefined,
      categoryId: selectedCategory || undefined,
      isActive: filterStatus === "all" ? undefined : filterStatus === "active",
      sortBy,
      sortOrder,
      page,
      limit,
    }),
    [debouncedSearch, selectedCategory, filterStatus, sortBy, sortOrder, page, limit]
  )

  const items = React.useMemo(() => data?.items || [], [data])

  const activeCategoryName = React.useMemo(() => {
    if (!selectedCategory) return "Все услуги"
    return categories.find((c) => c.id === selectedCategory)?.name || "Категория"
  }, [selectedCategory, categories])

  const totalServicesCount = React.useMemo(
    () => categories.reduce((sum, cat) => sum + (cat.count || cat.servicesCount || 0), 0),
    [categories]
  )

  const fetchCategories = React.useCallback(async () => {
    try {
      const cats = await servicesAPI.getCategories()
      setCategories(Array.isArray(cats) ? cats : [])
    } catch {
      setCategories([])
      toast.error("Ошибка загрузки категорий")
    }
  }, [])

  const fetchServices = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await servicesAPI.search(query)
      setData(res)
    } catch (e) {
      try {
        const parsed = JSON.parse((e as Error).message) as { message?: string; correlationId?: string }
        const msg = parsed.correlationId
          ? `${parsed.message || "Ошибка загрузки услуг"} (corrId: ${parsed.correlationId})`
          : parsed.message || "Ошибка загрузки услуг"
        setError(msg)
      } catch {
        setError("Ошибка загрузки услуг")
      }
    } finally {
      setLoading(false)
    }
  }, [query])

  React.useEffect(() => {
    if (!isMounted) return
    if (authLoading) return

    if (!isAuthenticated || !user) {
      router.push("/login")
      return
    }

    fetchCategories()
  }, [isMounted, authLoading, isAuthenticated, user, router, fetchCategories])

  React.useEffect(() => {
    if (!isMounted) return
    if (authLoading) return
    if (!isAuthenticated || !user) return
    fetchServices()
  }, [isMounted, authLoading, isAuthenticated, user, fetchServices])

  const handleRefresh = React.useCallback(async () => {
    await Promise.all([fetchCategories(), fetchServices()])
  }, [fetchCategories, fetchServices])

  const handleCreateService = React.useCallback(() => {
    setCurrentService(null)
    setOpenServiceEdit(true)
  }, [])

  const handleCreateCategory = React.useCallback(() => {
    setCurrentCategory(null)
    setOpenCategoryEdit(true)
  }, [])

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        searchRef.current?.focus()
        return
      }
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === "n") {
        e.preventDefault()
        handleCreateService()
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "n") {
        e.preventDefault()
        handleCreateCategory()
        return
      }
    }

    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [handleCreateService, handleCreateCategory])

  const promptDeleteCategory = React.useCallback((cat: ServiceCategory) => {
    setConfirmTarget({ type: "category", item: cat })
  }, [])

  const promptDeleteService = React.useCallback((svc: ServiceCatalogueItem) => {
    // В UI ниже мы тоже подскажем, но оставим эту защиту на всякий случай.
    if (svc.isActive) {
      toast.warning("Сначала скройте услугу", {
        description: "Активную услугу нельзя удалить. Нажмите “Скрыть”, затем повторите удаление.",
      })
      return
    }
    setConfirmTarget({ type: "service", item: svc })
  }, [])

  const handleConfirmDelete = React.useCallback(async () => {
    if (!confirmTarget) return
    setConfirmLoading(true)

    try {
      if (confirmTarget.type === "category") {
        await servicesAPI.removeCategory(confirmTarget.item.id)
        toast.success("Категория удалена")

        if (selectedCategory === confirmTarget.item.id) {
          setSelectedCategory(null)
          setPage(1)
        }

        await Promise.all([fetchCategories(), fetchServices()])
      } else {
        await servicesAPI.remove(confirmTarget.item.id)
        toast.success("Услуга удалена")

        await Promise.all([fetchServices(), fetchCategories()])
      }

      setConfirmTarget(null)
    } catch (e) {
      try {
        const parsed = JSON.parse((e as Error).message) as { message?: string }
        toast.error(parsed.message || "Ошибка при удалении")
      } catch {
        toast.error("Ошибка при удалении")
      }
    } finally {
      setConfirmLoading(false)
    }
  }, [confirmTarget, selectedCategory, fetchCategories, fetchServices])

  const handleToggleStatus = React.useCallback(
    async (svc: ServiceCatalogueItem) => {
      try {
        await servicesAPI.toggleStatus(svc.id)
        await Promise.all([fetchServices(), fetchCategories()])
      } catch {
        toast.error("Ошибка изменения статуса")
      }
    },
    [fetchServices, fetchCategories]
  )

  const handleSavedService = React.useCallback(async () => {
    await Promise.all([fetchServices(), fetchCategories()])
  }, [fetchServices, fetchCategories])

  // --- Drag & Drop categories (локально) ---
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.effectAllowed = "move"
    setDraggedCatId(id)
    setTimeout(() => e.currentTarget.classList.add("opacity-50"), 0)
  }

  const handleDragEnd = (e: React.DragEvent) => {
    e.currentTarget.classList.remove("opacity-50")
    setDraggedCatId(null)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
  }

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!draggedCatId || draggedCatId === targetId) return

    const newCats = [...categories]
    const sourceIdx = newCats.findIndex((c) => c.id === draggedCatId)
    const targetIdx = newCats.findIndex((c) => c.id === targetId)
    if (sourceIdx < 0 || targetIdx < 0) return

    const [movedCat] = newCats.splice(sourceIdx, 1)
    newCats.splice(targetIdx, 0, movedCat)

    setCategories(newCats)
    toast.success("Порядок изменён", { description: "Настройка сохранена локально" })
  }

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

  if (!isAuthenticated || !user) return null

  const headerActions = (
    <div className="flex items-center gap-sm">
      <Button variant="secondary" size="sm" onClick={handleRefresh} disabled={loading}>
        <RefreshCw className="w-4 h-4 mr-xs" />
        Обновить
      </Button>

      <Button variant="secondary" size="sm" onClick={handleCreateCategory}>
        <Plus className="w-4 h-4 mr-xs" />
        Категория
      </Button>

      <Button variant="primary" size="sm" onClick={handleCreateService}>
        <Plus className="w-4 h-4 mr-xs" />
        Новая услуга
      </Button>
    </div>
  )

  const emptyAction =
    categories.length === 0
      ? { label: "Создать категорию", onClick: handleCreateCategory, icon: Plus }
      : { label: "Добавить услугу", onClick: handleCreateService, icon: Plus }

  return (
    <AppLayout>
      <div className="container mx-auto px-lg py-xl flex flex-col gap-lg">
        <NavigationHeader
          title="Услуги"
          subtitle="Категории и прайс-лист автосервиса"
          icon={<Building2 className="w-5 h-5" />}
          actions={headerActions}
        />

        <PageFiltersCard>
          <PageFiltersRow>
            <div className="relative w-full lg:max-w-lg">
              <label htmlFor="services-search" className="sr-only">
                Поиск услуг
              </label>
              <Input
                id="services-search"
                ref={searchRef}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                placeholder="Поиск по названию услуги..."
                className="pl-[36px]"
              />
              <Search className="w-4 h-4 absolute left-md top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>

            <div className="flex flex-wrap items-center gap-sm">
              <label className="sr-only" htmlFor="services-status">
                Статус
              </label>
              <select
                id="services-status"
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value as FilterStatus)
                  setPage(1)
                }}
                className={cn(
                  "h-10 rounded-md border border-input bg-background text-sm px-md",
                  "text-foreground hover:border-border/80"
                )}
              >
                <option value="all">Все статусы</option>
                <option value="active">Активные</option>
                <option value="inactive">Скрытые</option>
              </select>

              <label className="sr-only" htmlFor="services-sortBy">
                Сортировка
              </label>
              <select
                id="services-sortBy"
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value as SortBy)
                  setPage(1)
                }}
                className={cn(
                  "h-10 rounded-md border border-input bg-background text-sm px-md",
                  "text-foreground hover:border-border/80"
                )}
              >
                <option value="name">По названию</option>
                <option value="price">По цене</option>
                <option value="durationMinutes">По длительности</option>
                <option value="createdAt">Сначала новые</option>
              </select>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSortOrder((p) => (p === "ASC" ? "DESC" : "ASC"))
                  setPage(1)
                }}
                className="min-w-[64px] justify-center"
                title="Поменять порядок сортировки"
              >
                {sortOrder === "ASC" ? "↑" : "↓"} {sortOrder}
              </Button>

              <label className="sr-only" htmlFor="services-limit">
                На странице
              </label>
              <select
                id="services-limit"
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
                {[10, 20, 50].map((n) => (
                  <option key={n} value={n}>
                    {n} / стр
                  </option>
                ))}
              </select>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("")
                  setFilterStatus("all")
                  setSortBy("name")
                  setSortOrder("ASC")
                  setPage(1)
                }}
              >
                Сбросить
              </Button>

              <Badge variant="outline" className="ml-auto">
                {activeCategoryName} · {data?.total ?? 0}
              </Badge>
            </div>
          </PageFiltersRow>
        </PageFiltersCard>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-lg min-h-0">
          {/* Categories */}
          <Card className="p-0 overflow-hidden h-fit lg:h-[calc(100vh-260px)]">
            <div className="p-md border-b border-border/50 flex items-center justify-between">
              <div className="flex items-center gap-sm">
                <Folder className="w-4 h-4 text-muted-foreground" />
                <div className="text-sm font-semibold">Категории</div>
              </div>

              <Button
                variant="secondary"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={handleCreateCategory}
                aria-label="Создать категорию"
                title="Создать категорию"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <div className="p-sm space-y-xs overflow-y-auto">
              {/* All services row */}
              <div className="group flex items-center gap-sm">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory(null)
                    setPage(1)
                  }}
                  className={cn(
                    "flex-1 flex items-center gap-sm px-md py-sm rounded-md text-sm transition-colors min-w-0",
                    selectedCategory === null
                      ? "bg-surface-2 text-foreground"
                      : "hover:bg-surface-2/60 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span className="flex-1 text-left truncate">Все услуги</span>
                </button>

                <div className="shrink-0 w-[92px] flex justify-end">
                  <Badge variant="outline" className="text-[10px]">
                    {totalServicesCount}
                  </Badge>
                </div>
              </div>

              <div className="pt-xs space-y-xs">
                {categories.map((cat) => {
                  const count = cat.count || cat.servicesCount || 0
                  const selected = selectedCategory === cat.id

                  return (
                    <div
                      key={cat.id}
                      className="group flex items-center gap-sm"
                      draggable
                      onDragStart={(e) => handleDragStart(e, cat.id)}
                      onDragEnd={handleDragEnd}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, cat.id)}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCategory(cat.id)
                          setPage(1)
                        }}
                        className={cn(
                          "flex-1 flex items-center gap-sm px-md py-sm rounded-md text-sm transition-colors min-w-0",
                          selected
                            ? "bg-surface-2 text-foreground"
                            : "hover:bg-surface-2/60 text-muted-foreground hover:text-foreground"
                        )}
                        title={cat.name}
                      >
                        <span className="text-muted-foreground/70 group-hover:text-muted-foreground">
                          <GripVertical className="w-4 h-4" />
                        </span>

                        <span className="flex-1 text-left truncate">{cat.name}</span>
                      </button>

                      {/* Right side: badge OR actions (no overlap / no absolute) */}
                      <div className="shrink-0 w-[92px] flex justify-end">
                        <div className="group-hover:hidden">
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            {count}
                          </Badge>
                        </div>

                        <div className="hidden group-hover:flex items-center gap-xs">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-9 w-9 p-0"
                            onClick={() => {
                              setCurrentCategory(cat)
                              setOpenCategoryEdit(true)
                            }}
                            aria-label="Редактировать категорию"
                            title="Редактировать"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>

                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-9 w-9 p-0"
                            onClick={() => promptDeleteCategory(cat)}
                            aria-label="Удалить категорию"
                            title="Удалить"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </Card>

          {/* Services list */}
          <div className="lg:col-span-3 min-h-0 flex flex-col gap-lg">
            <PageContentCard
              loading={loading}
              error={error}
              empty={items.length === 0}
              onRetry={handleRefresh}
              loadingRows={8}
              emptyState={{
                icon: Building2,
                title: "Услуги не найдены",
                description:
                  categories.length === 0
                    ? "Сначала создайте категорию — затем добавьте первую услугу."
                    : search || filterStatus !== "all"
                      ? "Попробуйте изменить параметры поиска или фильтры."
                      : "В выбранной категории пока нет услуг. Добавьте первую.",
                action: emptyAction,
              }}
            >
              <div className="divide-y divide-border/50">
                {items.map((svc) => (
                  <ServiceRow
                    key={svc.id}
                    service={svc}
                    onEdit={() => {
                      setCurrentService(svc)
                      setOpenServiceEdit(true)
                    }}
                    onDelete={() => promptDeleteService(svc)}
                    onToggleStatus={() => handleToggleStatus(svc)}
                  />
                ))}
              </div>
            </PageContentCard>

            <PaginationControls
              page={page}
              totalPages={data?.totalPages || 1}
              total={data?.total || 0}
              showing={items.length}
              onPageChange={setPage}
              itemLabel="услуг"
            />
          </div>
        </div>
      </div>

      <ServiceEditDialog
        open={openServiceEdit}
        onOpenChange={setOpenServiceEdit}
        service={currentService}
        defaultCategoryId={selectedCategory}
        onSaved={handleSavedService}
      />

      <CategoryEditDialog
        open={openCategoryEdit}
        onOpenChange={setOpenCategoryEdit}
        category={currentCategory}
        onSaved={fetchCategories}
      />

      <ConfirmDialog
        open={!!confirmTarget}
        onOpenChange={(v) => {
          if (!v) setConfirmTarget(null)
        }}
        title={confirmTarget?.type === "category" ? "Удалить категорию?" : "Удалить услугу?"}
        description={
          confirmTarget?.type === "category"
            ? `Вы уверены, что хотите удалить категорию “${confirmTarget.item.name}”?`
            : `Вы уверены, что хотите удалить услугу “${confirmTarget?.item.name}”? Это действие нельзя отменить.`
        }
        confirmText="Удалить"
        cancelText="Отмена"
        variant="destructive"
        loading={confirmLoading}
        onConfirm={handleConfirmDelete}
      />
    </AppLayout>
  )
}

function ServiceRow({
  service,
  onEdit,
  onDelete,
  onToggleStatus,
}: {
  service: ServiceCatalogueItem
  onEdit: () => void
  onDelete: () => void
  onToggleStatus: () => void
}) {
  const price = typeof service.price === "number" ? service.price : 0
  const duration = typeof service.durationMinutes === "number" ? service.durationMinutes : 0

  return (
    <div className={cn("p-md flex items-center justify-between gap-lg min-w-0 transition-colors hover:bg-surface-2")}>
      <div className="flex items-center gap-md min-w-0 flex-1">
        <div className="w-10 h-10 rounded-md bg-surface-2 border flex items-center justify-center shrink-0">
          <Building2 className="w-4 h-4 text-muted-foreground" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-sm min-w-0">
            <span className="text-sm font-medium truncate">{service.name}</span>

            <span
              className={cn(
                "text-[10px] px-sm py-[2px] rounded-md border",
                service.isActive
                  ? "border-status-active/30 bg-status-active/10 text-status-active"
                  : "border-status-draft/30 bg-status-draft/10 text-status-draft"
              )}
              title={service.isActive ? "Услуга доступна для выбора в заказах" : "Услуга скрыта из каталога"}
            >
              {service.isActive ? "Активна" : "Скрыта"}
            </span>
          </div>

          <div className="text-xs text-muted-foreground truncate mt-xs">
            {price.toLocaleString("ru-RU")} ₽ · {duration} мин
            {service.categoryName ? ` · ${service.categoryName}` : ""}
          </div>
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {/* Сделал заметнее: secondary + чуть больше кнопка */}
          <Button
            variant="secondary"
            size="sm"
            className="h-9 w-9 p-0 shrink-0"
            aria-label="Действия"
            title="Действия"
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="min-w-[220px]">
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault()
              onEdit()
            }}
          >
            <Pencil className="w-4 h-4 mr-sm" />
            Редактировать
          </DropdownMenuItem>

          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault()
              onToggleStatus()
            }}
          >
            {service.isActive ? (
              <>
                <XCircle className="w-4 h-4 mr-sm" />
                Скрыть (нужно для удаления)
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-sm" />
                Активировать
              </>
            )}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault()

              // Важно: объясняем правило прямо здесь, а не “молчаливым disabled”
              if (service.isActive) {
                toast.warning("Удаление недоступно", {
                  description: "Сначала скройте услугу. После этого её можно удалить.",
                  action: { label: "Скрыть", onClick: onToggleStatus },
                })
                return
              }

              onDelete()
            }}
            className="text-status-error focus:text-status-error"
          >
            <Trash2 className="w-4 h-4 mr-sm" />
            Удалить
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
