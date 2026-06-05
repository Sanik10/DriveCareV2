// path: apps/frontend/components/services/category-edit-dialog.tsx
"use client"

import * as React from "react"
import { FolderPlus, Save, Loader2 } from "lucide-react"
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
import type { ServiceCategory, CreateCategoryRequest } from "@/lib/types/services"

type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
  category?: ServiceCategory | null
  onSaved?: () => void
}

export function CategoryEditDialog({ open, onOpenChange, category, onSaved }: Props) {
  const isEdit = !!category

  const [name, setName] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) return
    setName(category?.name || "")
    setDescription(category?.description || "")
    setSubmitting(false)
    setError(null)
  }, [open, category])

  const submit = async () => {
    if (!name.trim()) {
      setError("Укажите название категории")
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const payload: CreateCategoryRequest = {
        name: name.trim(),
        description: description || undefined,
      }

      if (isEdit) {
        await servicesAPI.updateCategory(category!.id, payload)
      } else {
        await servicesAPI.createCategory(payload)
      }

      toast.success(isEdit ? "Категория обновлена" : "Категория создана")
      onSaved?.()
      onOpenChange(false)
    } catch (e) {
      try {
        const parsed = JSON.parse((e as Error).message) as { message?: string }
        setError(parsed.message || "Ошибка сохранения категории")
      } catch {
        setError("Ошибка сохранения категории")
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-md"
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
              <FolderPlus className="w-5 h-5 text-muted-foreground" />
            </div>

            <div className="min-w-0">
              <DialogTitle className="truncate">{isEdit ? "Изменить категорию" : "Новая категория"}</DialogTitle>
              <DialogDescription>Группировка услуг для удобного поиска и прайс-листа</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid gap-md mt-sm">
          <div className="grid gap-xs">
            <label className="text-xs text-muted-foreground">
              Название <span className="text-status-error">*</span>
            </label>
            <Input placeholder="Например: Шиномонтаж" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="grid gap-xs">
            <label className="text-xs text-muted-foreground">Описание (опционально)</label>
            <Input
              placeholder="Краткое описание категории"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <div className="min-h-[20px] mt-sm">
          {error ? <div className="text-sm text-status-error">{error}</div> : null}
        </div>

        {/* FIX: хоткеи ВЫНОСИМ из DialogFooter, чтобы они не “съедали” ширину и не уводили кнопки на новую строку */}
        <div className="hidden sm:flex items-center gap-sm text-xs text-muted-foreground mt-md">
          <span className="inline-flex items-center gap-xs">
            <Kbd>Esc</Kbd> — закрыть
          </span>
          <span className="inline-flex items-center gap-xs">
            <Kbd>Ctrl</Kbd>+<Kbd>Enter</Kbd> — сохранить
          </span>
        </div>

        {/* FIX: запрещаем wrap именно тут, чтобы кнопки всегда стояли в один ряд на desktop */}
        <DialogFooter className="mt-sm sm:flex-nowrap">
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={submitting}>
            Отмена
          </Button>

          <Button variant="primary" onClick={submit} disabled={submitting}>
            {submitting ? <Loader2 className="w-4 h-4 mr-xs animate-spin" /> : <Save className="w-4 h-4 mr-xs" />}
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
