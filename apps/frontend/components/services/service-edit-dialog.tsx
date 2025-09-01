// path: apps/frontend/components/services/service-edit-dialog.tsx
'use client'

import * as React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { servicesAPI } from '@/lib/api/services'
import type { ServiceCatalogueItem, CreateServiceRequest, UpdateServiceRequest } from '@/lib/types/services'
import { Save } from 'lucide-react'
import { toast } from 'sonner'

type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
  service?: ServiceCatalogueItem | null
  onSaved?: (svc: ServiceCatalogueItem) => void
}

export function ServiceEditDialog({ open, onOpenChange, service, onSaved }: Props) {
  const isEdit = !!service
  const [name, setName] = React.useState(service?.name || '')
  const [price, setPrice] = React.useState(service ? String(service.price) : '')
  const [duration, setDuration] = React.useState(service ? String(service.durationMinutes) : '')
  const [taxable, setTaxable] = React.useState<boolean>(service?.taxable ?? true)
  const [categoryId, setCategoryId] = React.useState<string>(service?.category?.id || '')
  const [description, setDescription] = React.useState<string>(service?.description || '')
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) return
    setName(service?.name || '')
    setPrice(service ? String(service.price) : '')
    setDuration(service ? String(service.durationMinutes) : '')
    setTaxable(service?.taxable ?? true)
    setCategoryId(service?.category?.id || '')
    setDescription(service?.description || '')
    setError(null)
    setSubmitting(false)
  }, [open, service])

  const submit = async () => {
    if (!name.trim()) return setError('Укажите название')
    if (!price || isNaN(Number(price))) return setError('Укажите цену')
    if (!duration || isNaN(Number(duration))) return setError('Укажите длительность (мин)')
    setSubmitting(true)
    setError(null)
    try {
      const payload: CreateServiceRequest | UpdateServiceRequest = {
        name: name.trim(),
        price: Number(price),
        durationMinutes: Number(duration),
        taxable,
        categoryId: categoryId || undefined,
        description: description || undefined,
      }
      const saved = isEdit
        ? await servicesAPI.update(service!.id, payload as UpdateServiceRequest)
        : await servicesAPI.create(payload as CreateServiceRequest)
      toast.success(isEdit ? 'Услуга обновлена' : 'Услуга создана')
      onSaved?.(saved)
      onOpenChange(false)
    } catch (e) {
      try {
        const parsed = JSON.parse((e as Error).message) as { message?: string }
        setError(parsed.message || 'Ошибка сохранения услуги')
      } catch {
        setError('Ошибка сохранения услуги')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent glow className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Изменить услугу' : 'Новая услуга'}</DialogTitle>
          <DialogDescription>Заполните параметры услуги. Категория опциональна.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Input placeholder="Название" value={name} onChange={(e) => setName(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="Цена (₽)"
              value={price}
              onChange={(e) => setPrice(e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.'))}
            />
            <Input
              placeholder="Длительность (мин)"
              value={duration}
              onChange={(e) => setDuration(e.target.value.replace(/[^\d]/g, ''))}
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={taxable}
                onChange={(e) => setTaxable(e.target.checked)}
              />
              Облагается НДС
            </label>
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
