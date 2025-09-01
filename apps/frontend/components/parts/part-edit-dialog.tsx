// path: apps/frontend/components/parts/part-edit-dialog.tsx
'use client'

import * as React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { partsAPI } from '@/lib/api/parts'
import type { PartCatalogueItem, CreatePartRequest, UpdatePartRequest } from '@/lib/types/parts'
import { Save } from 'lucide-react'
import { toast } from 'sonner'

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
          <DialogTitle>{isEdit ? 'Изменить запчасть' : 'Новая запчасть'}</DialogTitle>
          <DialogDescription>Заполните параметры запчасти. Категория опциональна.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Input placeholder="Название" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Артикул (опц.)" value={partNumber} onChange={(e) => setPartNumber(e.target.value)} />
            <Input placeholder="Бренд (опц.)" value={brand} onChange={(e) => setBrand(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="Цена продажи (₽)"
              value={price}
              onChange={(e) => setPrice(e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.'))}
            />
            <Input placeholder="ID категории (опц.)" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} />
          </div>
          <Input placeholder="Описание (опц.)" value={description} onChange={(e) => setDescription(e.target.value)} />
          {error && <div className="text-sm text-destructive">{error}</div>}
        </div>

        <DialogFooter>
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
