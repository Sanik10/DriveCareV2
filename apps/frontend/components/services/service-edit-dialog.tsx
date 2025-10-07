// path: apps/frontend/components/services/service-edit-dialog.tsx
'use client'

import * as React from 'react'
import { Wrench, Save } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { servicesAPI } from '@/lib/api/services'
import type { ServiceCatalogueItem, CreateServiceRequest, UpdateServiceRequest } from '@/lib/types/services'
import { toast } from 'sonner'
import { Kbd } from '@/components/ui/kbd'

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
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-secondary/20 flex items-center justify-center text-secondary">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>{isEdit ? 'Изменить услугу' : 'Новая услуга'}</DialogTitle>
              <DialogDescription>Заполните параметры услуги. Категория опциональна.</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          <div className="md:col-span-2">
            <div className="text-xs text-muted-foreground mb-1">
              Название <span className="text-rose-500">*</span>
            </div>
            <Input placeholder="Например: Замена масла" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">
              Цена (₽) <span className="text-rose-500">*</span>
            </div>
            <Input
              placeholder="Например: 1500"
              value={price}
              onChange={(e) => setPrice(e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.'))}
            />
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">
              Длительность (мин) <span className="text-rose-500">*</span>
            </div>
            <Input
              placeholder="Например: 30"
              value={duration}
              onChange={(e) => setDuration(e.target.value.replace(/[^\d]/g, ''))}
            />
          </div>

          <div className="md:col-span-2">
            <div className="text-xs text-muted-foreground mb-1">ID категории</div>
            <Input placeholder="Опционально" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} />
          </div>

          <div className="md:col-span-2">
            <div className="text-xs text-muted-foreground mb-1">Описание</div>
            <Input placeholder="Опционально" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="md:col-span-2">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={taxable}
                onChange={(e) => setTaxable(e.target.checked)}
              />
              Облагается НДС
            </label>
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
