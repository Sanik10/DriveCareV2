// path: apps/frontend/app/dashboard/orders/new/page.tsx
"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/lib/hooks/use-auth'
import { ordersAPI } from '@/lib/api/orders'
import type { CreateOrderRequest } from '@/lib/types/orders'
import { ArrowLeft, Save, Home } from 'lucide-react'

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const schema = z.object({
  customerId: z.string().regex(uuidRegex, 'Некорректный UUID клиента'),
  vehicleId: z.string().regex(uuidRegex, 'Некорректный UUID автомобиля'),
  description: z.string().max(1000, 'Максимум 1000 символов').optional().or(z.literal('')),
  customerComplaints: z.string().max(2000, 'Максимум 2000 символов').optional().or(z.literal('')),
  mileage: z.preprocess((v) => (v === '' || v === undefined ? undefined : Number(v)), z.number().int().nonnegative('Введите неотрицательное число').optional()),
  estimatedCompletionTime: z.string().optional().or(z.literal('')),
  discountAmount: z.preprocess((v) => (v === '' || v === undefined ? undefined : Number(v)), z.number().min(0, 'Минимум 0').optional()),
})

type FormValues = z.infer<typeof schema>

export default function NewOrderPage() {
  const router = useRouter()
  const { isAuthenticated, user, isLoading: authLoading } = useAuth()
  const [isMounted, setIsMounted] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  useEffect(() => setIsMounted(true), [])

  if (!isMounted) return null
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }
  if (!isAuthenticated || !user) return null

  const onSubmit = async (values: FormValues) => {
    setApiError(null)
    setIsSubmitting(true)
    try {
      const payload: CreateOrderRequest = {
        customerId: values.customerId,
        vehicleId: values.vehicleId,
        description: values.description || undefined,
        customerComplaints: values.customerComplaints || undefined,
        mileage: values.mileage,
        estimatedCompletionTime: values.estimatedCompletionTime
          ? new Date(values.estimatedCompletionTime).toISOString()
          : undefined,
        discountAmount: values.discountAmount,
      }
      const created = await ordersAPI.createOrder(payload)
      router.push(`/dashboard/orders/${created.id}`)
    } catch (e) {
      try {
        const parsed = JSON.parse((e as Error).message) as { message?: string }
        setApiError(parsed.message || 'Ошибка создания заказа')
      } catch {
        setApiError('Ошибка создания заказа')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-surface-1">
      <div className="fixed inset-0 bg-gradient-surface -z-10"></div>
      <div className="fixed top-0 right-0 w-96 h-96 bg-gradient-primary opacity-5 rounded-full blur-3xl -z-10"></div>
      <div className="fixed bottom-0 left-0 w-64 h-64 bg-secondary/10 rounded-full blur-3xl -z-10"></div>

      <header className="border-b border-border/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link href="/dashboard/orders">
              <Button variant="ghost">
                <ArrowLeft className="w-4 h-4 mr-2" /> Назад к списку
              </Button>
            </Link>
            <h1 className="text-xl font-bold">Новый заказ</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard">
              <Button variant="ghost">
                <Home className="w-4 h-4 mr-2" /> В дашборд
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-6">
        <Card className="p-6 max-w-2xl mx-auto backdrop-blur-sm bg-card/80 border-border/50">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {apiError && (
              <div className="p-3 rounded-md border border-destructive/30 bg-destructive/10 text-destructive text-sm">
                {apiError}
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <Input
                {...register('customerId')}
                placeholder="ID клиента (UUID)"
                error={errors.customerId?.message}
              />
              <Input
                {...register('vehicleId')}
                placeholder="ID автомобиля (UUID)"
                error={errors.vehicleId?.message}
              />
            </div>

            <Input
              {...register('description')}
              placeholder="Описание заказа (необязательно)"
              error={errors.description?.message}
            />

            <Input
              {...register('customerComplaints')}
              placeholder="Жалобы клиента (необязательно)"
              error={errors.customerComplaints?.message}
            />

            <div className="grid md:grid-cols-3 gap-4">
              <Input
                {...register('mileage')}
                placeholder="Пробег (км)"
                inputMode="numeric"
                error={errors.mileage?.message}
              />
              <div>
                <input
                  type="datetime-local"
                  {...register('estimatedCompletionTime')}
                  className="w-full h-9 rounded-md border border-border bg-background text-sm px-3"
                />
                {errors.estimatedCompletionTime?.message && (
                  <p className="text-xs text-destructive mt-1">{errors.estimatedCompletionTime.message}</p>
                )}
              </div>
              <Input
                {...register('discountAmount')}
                placeholder="Скидка (₽)"
                inputMode="decimal"
                error={errors.discountAmount?.message}
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Link href="/dashboard/orders">
                <Button variant="outline">Отмена</Button>
              </Link>
              <Button type="submit" disabled={isSubmitting}>
                <Save className="w-4 h-4 mr-2" />
                Создать
              </Button>
            </div>
          </form>
        </Card>

        <div className="max-w-2xl mx-auto mt-4 text-xs text-muted-foreground">
          Подсказка: сейчас укажите UUID клиента и автомобиля вручную. Позже добавим поиск/выбор из справочников.
        </div>
      </main>
    </div>
  )
}
