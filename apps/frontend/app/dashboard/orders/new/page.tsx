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
import { Badge } from '@/components/ui/badge'
import { AppLayout } from '@/components/app/AppLayout'
import { useAuth } from '@/lib/hooks/use-auth'
import { ordersAPI } from '@/lib/api/orders'
import type { CreateOrderRequest } from '@/lib/types/orders'
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  User, 
  Car, 
  FileText, 
  MessageSquare, 
  Gauge,
  Calendar,
  DollarSign,
  Sparkles,
  Info,
  AlertCircle,
  CheckCircle,
  Wrench,
  ArrowRight,
  BadgePercent,
  Percent
} from 'lucide-react'
import { cn } from '@/lib/utils'

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

const FORM_STEPS = [
  { id: 'basic', title: 'Основная информация', icon: FileText },
  { id: 'details', title: 'Детали и жалобы', icon: MessageSquare },
  { id: 'financial', title: 'Финансы и сроки', icon: DollarSign },
  { id: 'review', title: 'Проверка и создание', icon: CheckCircle },
] as const

export default function NewOrderPage() {
  const router = useRouter()
  const { isAuthenticated, user, isLoading: authLoading } = useAuth()
  const [isMounted, setIsMounted] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)

  const { register, handleSubmit, formState: { errors }, watch, getValues } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const watchedValues = watch()

  useEffect(() => setIsMounted(true), [])

  useEffect(() => {
    if (!isMounted) return;
    if (authLoading) return;
    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }
  }, [isMounted, authLoading, isAuthenticated, user, router]);

  if (!isMounted) return null;

  if (authLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-muted-foreground">Загрузка...</span>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!isAuthenticated || !user) return null;

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

  const nextStep = () => {
    if (currentStep < FORM_STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const isStepValid = (stepIndex: number): boolean => {
    const values = getValues()
    switch (stepIndex) {
      case 0: // Basic info
        return !!(values.customerId && values.vehicleId)
      case 1: // Details
        return true // Optional fields
      case 2: // Financial
        return true // Optional fields
      case 3: // Review
        return !!(values.customerId && values.vehicleId)
      default:
        return false
    }
  }

  const headerActions = (
    <div className="flex items-center gap-2">
      <Link href="/dashboard/orders">
        <Button variant="outline" className="rounded-2xl btn-outline-fixed">
          <ArrowLeft className="w-4 h-4 mr-2" />
          К списку
        </Button>
      </Link>
    </div>
  );

  return (
    <AppLayout
      title="Создание заказа"
      description={`Шаг ${currentStep + 1} из ${FORM_STEPS.length}: ${FORM_STEPS[currentStep].title}`}
      icon={Plus}
      actions={headerActions}
    >
      <div className="container mx-auto px-6 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* New Order Feature Badge */}
          <Card className="p-4 glass border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-3xl">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-primary">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-primary">Пошаговое создание заказа</h3>
                <p className="text-sm text-muted-foreground">
                  Интуитивный мастер создания заказ-наряда с валидацией и подсказками на каждом шаге.
                </p>
              </div>
            </div>
          </Card>

          {/* Progress Steps */}
          <Card className="p-6 glass border-border/30 rounded-3xl surface-glow">
            <div className="flex items-center justify-between mb-6">
              {FORM_STEPS.map((step, index) => {
                const Icon = step.icon
                const isActive = index === currentStep
                const isCompleted = index < currentStep || (index === currentStep && isStepValid(index))
                const isDisabled = index > currentStep
                
                return (
                  <div key={step.id} className="flex items-center">
                    <button
                      onClick={() => setCurrentStep(index)}
                      disabled={isDisabled}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-2xl transition-all duration-300',
                        isActive && 'bg-gradient-primary text-white shadow-glass scale-105',
                        isCompleted && !isActive && 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400',
                        isDisabled && 'opacity-50 cursor-not-allowed',
                        !isActive && !isCompleted && !isDisabled && 'hover:bg-surface-1/40'
                      )}
                    >
                      <div className={cn(
                        'w-8 h-8 rounded-xl flex items-center justify-center',
                        isActive && 'bg-white/20',
                        isCompleted && !isActive && 'bg-emerald-500/20',
                        !isActive && !isCompleted && 'bg-surface-1/40'
                      )}>
                        {isCompleted && !isActive ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <Icon className="w-4 h-4" />
                        )}
                      </div>
                      <div className="text-left hidden md:block">
                        <div className="text-sm font-medium">{step.title}</div>
                        <div className="text-xs opacity-80">
                          {isCompleted && !isActive ? 'Завершено' : isActive ? 'Активный' : 'Ожидание'}
                        </div>
                      </div>
                    </button>
                    {index < FORM_STEPS.length - 1 && (
                      <div className={cn(
                        'w-8 h-0.5 mx-2 transition-all duration-300',
                        index < currentStep ? 'bg-emerald-500' : 'bg-border/50'
                      )} />
                    )}
                  </div>
                )
              })}
            </div>
          </Card>

          {/* Form Content */}
          <Card className="p-6 glass border-border/30 rounded-3xl surface-glow">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {apiError && (
                <div className="p-4 rounded-2xl border border-destructive/30 bg-destructive/10 text-destructive">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4" />
                    <span className="font-medium">Ошибка создания заказа</span>
                  </div>
                  <p className="text-sm">{apiError}</p>
                </div>
              )}

              {/* Step 0: Basic Information */}
              {currentStep === 0 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-xl bg-blue-500/20">
                      <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Основная информация</h3>
                      <p className="text-sm text-muted-foreground">Выберите клиента и автомобиль для заказа</p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <User className="w-4 h-4" />
                        ID клиента (UUID) *
                      </label>
                      <Input
                        {...register('customerId')}
                        placeholder="00000000-0000-0000-0000-000000000000"
                        error={errors.customerId?.message}
                        className="rounded-2xl"
                      />
                      <div className="text-xs text-muted-foreground">
                        Временно вводите UUID вручную. Скоро добавим поиск клиентов.
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Car className="w-4 h-4" />
                        ID автомобиля (UUID) *
                      </label>
                      <Input
                        {...register('vehicleId')}
                        placeholder="00000000-0000-0000-0000-000000000000"
                        error={errors.vehicleId?.message}
                        className="rounded-2xl"
                      />
                      <div className="text-xs text-muted-foreground">
                        Автомобиль должен принадлежать выбранному клиенту.
                      </div>
                    </div>
                  </div>

                  {/* Preview if IDs are entered */}
                  {watchedValues.customerId && watchedValues.vehicleId && (
                    <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                          Готово к следующему шагу
                        </span>
                      </div>
                      <div className="text-xs text-emerald-600/80 dark:text-emerald-400/80">
                        Клиент и автомобиль указаны. Можете продолжить.
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 1: Details and Complaints */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-xl bg-purple-500/20">
                      <MessageSquare className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Детали и жалобы</h3>
                      <p className="text-sm text-muted-foreground">Опишите суть заказа и жалобы клиента</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Описание заказа
                      </label>
                      <textarea
                        {...register('description')}
                        placeholder="Краткое описание работ, которые нужно выполнить..."
                        className="w-full h-24 rounded-2xl border border-border/50 bg-background/80 text-sm px-4 py-3 focus:border-primary/50 transition-all duration-300 resize-none"
                      />
                      {errors.description?.message && (
                        <p className="text-xs text-destructive">{errors.description.message}</p>
                      )}
                      <div className="text-xs text-muted-foreground">
                        {watchedValues.description?.length || 0} / 1000 символов
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        Жалобы клиента
                      </label>
                      <textarea
                        {...register('customerComplaints')}
                        placeholder="Что именно беспокоит клиента? Симптомы, проблемы..."
                        className="w-full h-24 rounded-2xl border border-border/50 bg-background/80 text-sm px-4 py-3 focus:border-primary/50 transition-all duration-300 resize-none"
                      />
                      {errors.customerComplaints?.message && (
                        <p className="text-xs text-destructive">{errors.customerComplaints.message}</p>
                      )}
                      <div className="text-xs text-muted-foreground">
                        {watchedValues.customerComplaints?.length || 0} / 2000 символов
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Gauge className="w-4 h-4" />
                        Пробег автомобиля
                      </label>
                      <Input
                        {...register('mileage')}
                        placeholder="Например: 150000"
                        inputMode="numeric"
                        error={errors.mileage?.message}
                        className="rounded-2xl"
                      />
                      <div className="text-xs text-muted-foreground">
                        Укажите текущий пробег в километрах (необязательно)
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Financial and Timeline */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-xl bg-amber-500/20">
                      <DollarSign className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Финансы и сроки</h3>
                      <p className="text-sm text-muted-foreground">Планируемые сроки и начальная скидка</p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Планируемое время завершения
                      </label>
                      <input
                        type="datetime-local"
                        {...register('estimatedCompletionTime')}
                        className="w-full h-10 rounded-2xl border border-border/50 bg-background/80 text-sm px-3 focus:border-primary/50 transition-all duration-300"
                      />
                      {errors.estimatedCompletionTime?.message && (
                        <p className="text-xs text-destructive">{errors.estimatedCompletionTime.message}</p>
                      )}
                      <div className="text-xs text-muted-foreground">
                        Ориентировочная дата готовности заказа
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                        <BadgePercent className="w-4 h-4" />
                        Скидка (в рублях)
                      </label>
                      <Input
                        {...register('discountAmount')}
                        placeholder="Например: 1000"
                        inputMode="decimal"
                        error={errors.discountAmount?.message}
                        className="rounded-2xl"
                      />
                      <div className="text-xs text-muted-foreground">
                        Фиксированная скидка на весь заказ (необязательно)
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                      <div className="text-sm text-blue-600 dark:text-blue-400">
                        <div className="font-medium mb-1">Напоминание</div>
                        <div className="text-xs opacity-80">
                          После создания заказа вы сможете добавить услуги и запчасти в детальном просмотре. 
                          Финальная стоимость будет рассчитана автоматически.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Review and Create */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-xl bg-emerald-500/20">
                      <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Проверка и создание</h3>
                      <p className="text-sm text-muted-foreground">Проверьте данные перед созданием заказа</p>
                    </div>
                  </div>

                  {/* Review Summary */}
                  <div className="space-y-4">
                    <Card className="p-4 glass border-border/30 rounded-2xl">
                      <h4 className="font-medium mb-3">Основная информация</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Клиент:</span>
                          <div className="font-mono text-xs break-all">{watchedValues.customerId || 'Не указан'}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Автомобиль:</span>
                          <div className="font-mono text-xs break-all">{watchedValues.vehicleId || 'Не указан'}</div>
                        </div>
                      </div>
                    </Card>

                    <Card className="p-4 glass border-border/30 rounded-2xl">
                      <h4 className="font-medium mb-3">Детали</h4>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Описание:</span>
                          <div className="mt-1">{watchedValues.description || 'Не указано'}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Жалобы клиента:</span>
                          <div className="mt-1">{watchedValues.customerComplaints || 'Не указаны'}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Пробег:</span>
                          <span className="ml-2">{watchedValues.mileage ? `${Number(watchedValues.mileage).toLocaleString('ru-RU')} км` : 'Не указан'}</span>
                        </div>
                      </div>
                    </Card>

                    <Card className="p-4 glass border-border/30 rounded-2xl">
                      <h4 className="font-medium mb-3">Финансы и сроки</h4>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Планируемое завершение:</span>
                          <span className="ml-2">
                            {watchedValues.estimatedCompletionTime 
                              ? new Date(watchedValues.estimatedCompletionTime).toLocaleString('ru-RU')
                              : 'Не указано'
                            }
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Скидка:</span>
                          <span className="ml-2">
                            {watchedValues.discountAmount 
                              ? `${Number(watchedValues.discountAmount).toLocaleString('ru-RU')} ₽`
                              : 'Не указана'
                            }
                          </span>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex items-center justify-between pt-6 border-t border-border/30">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={prevStep}
                  disabled={currentStep === 0}
                  className="rounded-2xl btn-outline-fixed"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Назад
                </Button>

                <div className="flex items-center gap-2">
                  {currentStep < FORM_STEPS.length - 1 ? (
                    <Button 
                      type="button" 
                      onClick={nextStep}
                      disabled={!isStepValid(currentStep)}
                      className="rounded-2xl bg-gradient-primary hover:opacity-90"
                    >
                      Далее
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  ) : (
                    <Button 
                      type="submit" 
                      disabled={isSubmitting || !isStepValid(currentStep)}
                      className="rounded-2xl bg-gradient-primary hover:opacity-90"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                          Создание...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4 mr-2" />
                          Создать заказ
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </form>
          </Card>

          {/* Helper Cards */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="p-4 glass border-border/30 rounded-2xl">
              <div className="flex items-center gap-2 mb-2">
                <Wrench className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Что дальше?</span>
              </div>
              <p className="text-xs text-muted-foreground">
                После создания заказа вы сможете добавить услуги, запчасти, назначить исполнителей и отслеживать прогресс.
              </p>
            </Card>

            <Card className="p-4 glass border-border/30 rounded-2xl">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-medium">Совет</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Заполняйте описание и жалобы клиента максимально подробно — это поможет механикам быстрее понять суть проблемы.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
