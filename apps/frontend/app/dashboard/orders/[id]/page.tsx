// path: apps/frontend/app/dashboard/orders/[id]/page.tsx
"use client"

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/lib/hooks/use-auth'
import { ordersAPI } from '@/lib/api/orders'
import type { OrderResponse, OrderServiceResponse, OrderPartResponse, OrderStatus } from '@/lib/types/orders'
import { ArrowLeft, RefreshCw, Shield, Calendar, BadgePercent, Truck, CheckCircle2, Home } from 'lucide-react'

const STATUS_LABELS: Record<OrderStatus, string> = {
  new: 'Новый',
  in_progress: 'В работе',
  awaiting_parts: 'Ожидание запчастей',
  completed: 'Завершен',
  canceled: 'Отменен',
}

export default function OrderDetailsPage() {
  const params = useParams<{ id: string }>()
  const id = useMemo(() => (Array.isArray(params?.id) ? params.id[0] : params?.id) as string, [params])
  const router = useRouter()
  const { isAuthenticated, user, isLoading: authLoading } = useAuth()

  const [isMounted, setIsMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [order, setOrder] = useState<OrderResponse | null>(null)
  const [services, setServices] = useState<OrderServiceResponse[]>([])
  const [parts, setParts] = useState<OrderPartResponse[]>([])
  const [updating, setUpdating] = useState(false)
  const [newStatus, setNewStatus] = useState<OrderStatus | ''>('')

  useEffect(() => setIsMounted(true), [])

  useEffect(() => {
    if (!isMounted) return
    if (authLoading) return
    if (!isAuthenticated || !user) {
      router.push('/login')
      return
    }
    if (!id) return

    let cancelled = false

    async function loadAll() {
      setLoading(true)
      setError(null)
      try {
        const [o, srv, prts] = await Promise.all([
          ordersAPI.getOrder(id),
          ordersAPI.getOrderServices(id),
          ordersAPI.getOrderParts(id),
        ])
        if (!cancelled) {
          setOrder(o)
          setServices(srv.services || [])
          setParts(prts.parts || [])
          setNewStatus(o.status)
        }
      } catch (e) {
        try {
          const parsed = JSON.parse((e as Error).message) as { message?: string }
          setError(parsed.message || 'Ошибка загрузки заказа')
        } catch {
          setError('Ошибка загрузки заказа')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadAll()
    return () => { cancelled = true }
  }, [isMounted, authLoading, isAuthenticated, user, router, id])

  const handleRefresh = async () => {
    if (!id) return
    setLoading(true)
    try {
      const [o, srv, prts] = await Promise.all([
        ordersAPI.getOrder(id),
        ordersAPI.getOrderServices(id),
        ordersAPI.getOrderParts(id),
      ])
      setOrder(o); setServices(srv.services || []); setParts(prts.parts || [])
      setNewStatus(o.status)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async () => {
    if (!id || !newStatus) return
    setUpdating(true)
    setError(null)
    try {
      const updated = await ordersAPI.updateOrderStatus(id, newStatus)
      setOrder(updated)
    } catch (e) {
      try {
        const parsed = JSON.parse((e as Error).message) as { message?: string }
        setError(parsed.message || 'Ошибка обновления статуса')
      } catch {
        setError('Ошибка обновления статуса')
      }
    } finally {
      setUpdating(false)
    }
  }

  const handleRecalculate = async () => {
    if (!id) return
    setUpdating(true)
    setError(null)
    try {
      const o = await ordersAPI.recalculateTotals(id)
      setOrder(o)
    } catch (e) {
      try {
        const parsed = JSON.parse((e as Error).message) as { message?: string }
        setError(parsed.message || 'Ошибка пересчета')
      } catch {
        setError('Ошибка пересчета')
      }
    } finally {
      setUpdating(false)
    }
  }

  if (!isMounted) return null
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }
  if (!isAuthenticated || !user) return null

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
                <ArrowLeft className="w-4 h-4 mr-2" /> Назад
              </Button>
            </Link>
            <h1 className="text-xl font-bold">
              Заказ {order?.orderNumber || '...'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard">
              <Button variant="ghost">
                <Home className="w-4 h-4 mr-2" /> В дашборд
              </Button>
            </Link>
            <Button variant="outline" onClick={handleRefresh}>
              <RefreshCw className="w-4 h-4 mr-2" /> Обновить
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-6 space-y-6">
        {loading ? (
          <div className="space-y-4">
            <div className="h-28 bg-surface-1 rounded-md animate-pulse" />
            <div className="h-40 bg-surface-1 rounded-md animate-pulse" />
            <div className="h-40 bg-surface-1 rounded-md animate-pulse" />
          </div>
        ) : error ? (
          <Card className="p-6 text-center text-destructive">{error}</Card>
        ) : !order ? (
          <Card className="p-6 text-center text-muted-foreground">Заказ не найден</Card>
        ) : (
          <>
            {/* Overview */}
            <Card className="p-6 backdrop-blur-sm bg-card/80 border-border/50">
              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Статус</div>
                  <div className="flex items-center gap-3">
                    <StatusPill status={order.status} />
                    <select
                      className="h-9 rounded-md border border-border bg-background text-sm px-3"
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value as OrderStatus)}
                    >
                      <option value="new">Новый</option>
                      <option value="in_progress">В работе</option>
                      <option value="awaiting_parts">Ожидание запчастей</option>
                      <option value="completed">Завершен</option>
                      <option value="canceled">Отменен</option>
                    </select>
                    <Button size="sm" onClick={handleUpdateStatus} disabled={updating}>
                      Обновить
                    </Button>
                  </div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Клиент</div>
                  <div className="text-sm">
                    {order.customer?.firstName || order.customer?.companyName || '—'}
                  </div>
                  <div className="text-xs text-muted-foreground">{order.customer?.phone}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Автомобиль</div>
                  <div className="text-sm">
                    {order.vehicle?.model?.brand?.name} {order.vehicle?.model?.name} · {order.vehicle?.licensePlate || order.vehicle?.vin}
                  </div>
                  <div className="text-xs text-muted-foreground">Пробег: {order.mileage ?? '—'}</div>
                </div>
              </div>

              <div className="grid md:grid-cols-4 gap-4 mt-6">
                <Kpi title="Подытог" value={`${(order.totalAmount + order.discountAmount - order.taxAmount).toLocaleString('ru-RU')} ₽`} icon={Shield} />
                <Kpi title="Скидка" value={`${order.discountAmount.toLocaleString('ru-RU')} ₽`} icon={BadgePercent} />
                <Kpi title="Налог" value={`${order.taxAmount.toLocaleString('ru-RU')} ₽`} icon={Calendar} />
                <Kpi title="Итого" value={`${order.finalAmount.toLocaleString('ru-RU')} ₽`} icon={CheckCircle2} />
              </div>

              <div className="mt-6">
                <Button variant="outline" onClick={handleRecalculate} disabled={updating}>
                  Пересчитать финансы
                </Button>
              </div>
            </Card>

            {/* Services */}
            <Card className="p-6 backdrop-blur-sm bg-card/80 border-border/50">
              <div className="flex items-center justify-between mb-4">
                <div className="text-lg font-semibold">Услуги</div>
                <div className="text-sm text-muted-foreground">Всего: {services.length}</div>
              </div>
              {services.length === 0 ? (
                <div className="text-sm text-muted-foreground">Услуги не добавлены</div>
              ) : (
                <div className="space-y-3">
                  {services.map(s => (
                    <div key={s.id} className="p-3 rounded-md border border-border/50 flex items-center justify-between">
                      <div>
                        <div className="font-medium">{s.service?.name || 'Услуга'}</div>
                        <div className="text-xs text-muted-foreground">
                          {s.quantity} × {s.price.toLocaleString('ru-RU')} ₽ · скидка {s.discountPercent}% · {s.displayStatus}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{s.totalAmount.toLocaleString('ru-RU')} ₽</div>
                        {s.mechanic && (
                          <div className="text-xs text-muted-foreground">Механик: {s.mechanic.firstName} {s.mechanic.lastName}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Parts */}
            <Card className="p-6 backdrop-blur-sm bg-card/80 border-border/50">
              <div className="flex items-center justify-between mb-4">
                <div className="text-lg font-semibold">Запчасти</div>
                <div className="text-sm text-muted-foreground">Всего: {parts.length}</div>
              </div>
              {parts.length === 0 ? (
                <div className="text-sm text-muted-foreground">Запчасти не добавлены</div>
              ) : (
                <div className="space-y-3">
                  {parts.map(p => (
                    <div key={p.id} className="p-3 rounded-md border border-border/50 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-secondary/20 flex items-center justify-center">
                          <Truck className="w-4 h-4 text-secondary" />
                        </div>
                        <div>
                          <div className="font-medium">{p.part?.name || 'Запчасть'}</div>
                          <div className="text-xs text-muted-foreground">
                            {p.quantity} × {p.price.toLocaleString('ru-RU')} ₽ · скидка {p.discountPercent}% · {p.displayStatus}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{p.totalAmount.toLocaleString('ru-RU')} ₽</div>
                        <div className="text-xs text-muted-foreground">{p.isCustomerProvided ? 'Клиента' : 'Со склада'}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </>
        )}
      </main>
    </div>
  )
}

function StatusPill({ status }: { status: OrderStatus }) {
  const text =
    status === 'new' ? 'text-sky-600 dark:text-sky-400' :
    status === 'in_progress' ? 'text-amber-600 dark:text-amber-400' :
    status === 'awaiting_parts' ? 'text-violet-600 dark:text-violet-400' :
    status === 'completed' ? 'text-emerald-600 dark:text-emerald-400' :
    'text-rose-600 dark:text-rose-400'
  const bg =
    status === 'new' ? 'bg-sky-500/10' :
    status === 'in_progress' ? 'bg-amber-500/10' :
    status === 'awaiting_parts' ? 'bg-violet-500/10' :
    status === 'completed' ? 'bg-emerald-500/10' :
    'bg-rose-500/10'
  return (
    <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${text} ${bg}`}>
      {STATUS_LABELS[status]}
    </span>
  )
}

function Kpi({ title, value, icon: Icon }: { title: string; value: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="p-3 rounded-lg border border-border/50 bg-surface-1/40">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="w-4 h-4" />
        {title}
      </div>
      <div className="text-lg font-semibold mt-1">{value}</div>
    </div>
  )
}
