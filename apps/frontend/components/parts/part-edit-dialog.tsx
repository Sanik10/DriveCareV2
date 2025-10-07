// path: apps/frontend/components/parts/part-edit-dialog.tsx
'use client'

import * as React from 'react'
import { Package, Save } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { partsAPI } from '@/lib/api/parts'
import type { PartCatalogueItem, CreatePartRequest, UpdatePartRequest } from '@/lib/types/parts'
import { toast } from 'sonner'
import { Kbd } from '@/components/ui/kbd'

type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
  part?: PartCatalogueItem | null
  onSaved?: (p: PartCatalogueItem) => void
}

export function PartEditDialog({ open, onOpenChange, part, onSaved }: Props) {
  const isEdit = !!part
  const [name, setName] = React.useState(part?.name || '')
  const [partNumber, setPartNumber] = React.useState(part?.partNumber || '')
  const [brand, setBrand] = React.useState(part?.brand || '')
  const [price, setPrice] = React.useState(part ? String(part.sellingPrice) : '')
  const [categoryId, setCategoryId] = React.useState(part?.category?.id || '')
  const [description, setDescription] = React.useState(part?.description || '')
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) return
    setName(part?.name || '')
    setPartNumber(part?.partNumber || '')
    setBrand(part?.brand || '')
    setPrice(part ? String(part.sellingPrice) : '')
    setCategoryId(part?.category?.id || '')
    setDescription(part?.description || '')
    setError(null)
    setSubmitting(false)
  }, [open, part])

  const submit = async () => {
    if (!name.trim()) return setError('Укажите название')
    if (!price || isNaN(Number(price))) return setError('Укажите цену продажи')
    setSubmitting(true)
    setError(null)
    try {
      const payload: CreatePartRequest | UpdatePartRequest = {
        name: name.trim(),
        partNumber: partNumber || undefined,
        brand: brand || undefined,
        sellingPrice: Number(price),
        categoryId: categoryId || undefined,
        description: description || undefined,
      }
      const saved = isEdit
        ? await partsAPI.update(part!.id, payload as UpdatePartRequest)
        : await partsAPI.create(payload as CreatePartRequest)
      toast.success(isEdit ? 'Запчасть обновлена' : 'Запчасть создана')
      onSaved?.(saved)
      onOpenChange(false)
    } catch (e) {
      try {
        const parsed = JSON.parse((e as Error).message) as { message?: string }
        setError(parsed.message || 'Ошибка сохранения запчасти')
      } catch {
        setError('Ошибка сохранения запчасти')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent glow className="max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-600 dark:text-orange-400">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>{isEdit ? 'Изменить запчасть' : 'Новая запчасть'}</DialogTitle>
              <DialogDescription>Заполните параметры запчасти. Категория опциональна.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          <div className="md:col-span-2">
            <div className="text-xs text-muted-foreground mb-1">
              Название <span className="text-rose-500">*</span>
            </div>
            <Input placeholder="Например: Масляный фильтр" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Артикул</div>
            <Input placeholder="Опционально" value={partNumber} onChange={(e) => setPartNumber(e.target.value)} />
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Бренд</div>
            <Input placeholder="Опционально" value={brand} onChange={(e) => setBrand(e.target.value)} />
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">
              Цена продажи (₽) <span className="text-rose-500">*</span>
            </div>
            <Input
              placeholder="Например: 500"
              value={price}
              onChange={(e) => setPrice(e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.'))}
            />
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">ID категории</div>
            <Input placeholder="Опционально" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} />
          </div>

          <div className="md:col-span-2">
            <div className="text-xs text-muted-foreground mb-1">Описание</div>
            <Input placeholder="Опционально" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>

        {error && <div className="mt-2 text-sm text-destructive">{error}</div>}

        <DialogFooter className="mt-4">
          <div className="hidden sm:flex items-center text-xs text-muted-foreground mr-auto">
            <span className="mr-2">Горячие клавиши:</span>
            <Kbd>Esc</Kbd>
            <span className="ml-1">— Закрыть</span>
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Отмена
          </Button>
          <Button onClick={submit} disabled={submitting}>
            <Save className="w-4 h-4 mr-2" />
            {isEdit ? 'Сохранить' : 'Создать'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
