// path: apps/frontend/components/services/service-edit-dialog.tsx
"use client"

import * as React from "react"
import { Wrench, Save, Loader2 } from "lucide-react"
import { toast } from "sonner"

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
import { Kbd } from "@/components/ui/kbd"

import { servicesAPI } from "@/lib/api/services"
import type {
  ServiceCatalogueItem,
  CreateServiceRequest,
  UpdateServiceRequest,
  ServiceCategory,
} from "@/lib/types/services"
import { cn } from "@/lib/utils"

type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
  service?: ServiceCatalogueItem | null
  defaultCategoryId?: string | null
  onSaved?: (svc: ServiceCatalogueItem) => void
}

export function ServiceEditDialog({ open, onOpenChange, service, defaultCategoryId, onSaved }: Props) {
  const isEdit = !!service

  const [name, setName] = React.useState("")
  const [price, setPrice] = React.useState("")
  const [duration, setDuration] = React.useState("")
  const [categoryId, setCategoryId] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [isActive, setIsActive] = React.useState(true)

  const [categories, setCategories] = React.useState<ServiceCategory[]>([])
  const [loadingCats, setLoadingCats] = React.useState(false)

  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) return

    let alive = true
    ;(async () => {
      setLoadingCats(true)
      try {
        const cats = await servicesAPI.getCategories()
        if (alive) setCategories(Array.isArray(cats) ? cats : [])
      } finally {
        if (alive) setLoadingCats(false)
      }
    })()

    return () => {
      alive = false
    }
  }, [open])

  React.useEffect(() => {
    if (!open) return
    setName(service?.name || "")
    setPrice(service ? String(service.price) : "")
    setDuration(service ? String(service.durationMinutes) : "")
    setCategoryId(service?.categoryId || defaultCategoryId || "")
    setDescription(service?.description || "")
    setIsActive(service?.isActive ?? true)

    setError(null)
    setSubmitting(false)
  }, [open, service, defaultCategoryId])

  const submit = async () => {
    if (!name.trim()) return setError("Укажите название")
    if (!price || Number.isNaN(Number(price)) || Number(price) <= 0) return setError("Укажите корректную цену")
    if (!duration || Number.isNaN(Number(duration)) || Number(duration) <= 0) return setError("Укажите длительность (в минутах)")
    if (!categoryId) return setError("Выберите категорию услуги")

    setSubmitting(true)
    setError(null)

    try {
      const payload: CreateServiceRequest | UpdateServiceRequest = {
        name: name.trim(),
        price: Number(price),
        durationMinutes: Number(duration),
        categoryId,
        isActive,
        description: description || undefined,
      }

      const saved = isEdit
        ? await servicesAPI.update(service!.id, payload as UpdateServiceRequest)
        : await servicesAPI.create(payload as CreateServiceRequest)

      toast.success(isEdit ? "Услуга обновлена" : "Услуга создана")
      onSaved?.(saved)
      onOpenChange(false)
    } catch (e) {
      try {
        const parsed = JSON.parse((e as Error).message) as { message?: string }
        setError(parsed.message || "Ошибка сохранения услуги")
      } catch {
        setError("Ошибка сохранения услуги")
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-xl"
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault()
            submit()
          }
        }}
      >
        <DialogHeader>
          <div className="flex items-start gap-md">
            <div className="w-10 h-10 rounded-md bg-surface-2 border flex items-center justify-center shrink-0">
              <Wrench className="w-5 h-5 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="truncate">{isEdit ? "Изменить услугу" : "Новая услуга"}</DialogTitle>
              <DialogDescription>Параметры услуги для каталога</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-md mt-sm">
          <div className="md:col-span-2 grid gap-xs">
            <label className="text-xs text-muted-foreground">
              Название <span className="text-status-error">*</span>
            </label>
            <Input placeholder="Например: Замена масла" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="grid gap-xs">
            <label className="text-xs text-muted-foreground">
              Цена (₽) <span className="text-status-error">*</span>
            </label>
            <Input
              placeholder="Например: 1500"
              value={price}
              onChange={(e) => setPrice(e.target.value.replace(/[^0-9.,]/g, "").replace(",", "."))}
              inputMode="decimal"
            />
          </div>

          <div className="grid gap-xs">
            <label className="text-xs text-muted-foreground">
              Длительность (мин) <span className="text-status-error">*</span>
            </label>
            <Input
              placeholder="Например: 30"
              value={duration}
              onChange={(e) => setDuration(e.target.value.replace(/[^\d]/g, ""))}
              inputMode="numeric"
            />
          </div>

          <div className="md:col-span-2 grid gap-xs">
            <label className="text-xs text-muted-foreground">
              Категория <span className="text-status-error">*</span>
            </label>

            <div className="relative">
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                disabled={loadingCats}
                className={cn(
                  "h-10 w-full rounded-md border border-input bg-background text-sm px-md",
                  "text-foreground hover:border-border/80 disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                <option value="" disabled>
                  Выберите категорию...
                </option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>

              {loadingCats && <Loader2 className="w-4 h-4 animate-spin absolute right-md top-1/2 -translate-y-1/2 text-muted-foreground" />}
            </div>
          </div>

          <div className="md:col-span-2 grid gap-xs">
            <label className="text-xs text-muted-foreground">Описание (опционально)</label>
            <Input
              placeholder="Дополнительная информация об услуге"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="md:col-span-2">
            <label className="inline-flex items-center gap-sm text-sm cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 rounded-md border border-input bg-background text-primary focus:ring-1 focus:ring-ring"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              <span className={cn(isActive ? "text-foreground" : "text-muted-foreground")}>
                Услуга активна (доступна для выбора в заказах)
              </span>
            </label>
          </div>
        </div>

        {error && <div className="mt-sm text-sm text-status-error">{error}</div>}

        <DialogFooter className="mt-md">
          <div className="hidden sm:flex items-center text-xs text-muted-foreground mr-auto gap-sm">
            <span className="inline-flex items-center gap-xs">
              <Kbd>Esc</Kbd> — закрыть
            </span>
            <span className="inline-flex items-center gap-xs">
              <Kbd>Ctrl</Kbd>+<Kbd>Enter</Kbd> — сохранить
            </span>
          </div>

          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={submitting}>
            Отмена
          </Button>

          <Button variant="primary" onClick={submit} disabled={submitting || loadingCats}>
            {submitting ? <Loader2 className="w-4 h-4 mr-xs animate-spin" /> : <Save className="w-4 h-4 mr-xs" />}
            {isEdit ? "Сохранить" : "Создать"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
