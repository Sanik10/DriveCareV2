// path: apps/frontend/app/dashboard/orders/page.tsx
"use client"

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Building2, Plus, Search, RefreshCw, ChevronRight } from 'lucide-react'
import { useAuth } from '@/lib/hooks/use-auth'
import { ordersAPI } from '@/lib/api/orders'
import type { OrdersQuery, PaginatedOrdersResponse, OrderStatus, OrderResponse } from '@/lib/types/orders'

const STATUS_LABELS: Record<OrderStatus, string> = {
  new: 'Новый',
  in_progress: 'В работе',
  awaiting_parts: 'Ожидание запчастей',
  completed: 'Завершен',
  canceled: 'Отменен',
}

function StatusBadge({ status }: { status: OrderStatus }) {
  const color =
    status === 'new' ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/20' :
    status === 'in_progress' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20' :
    status === 'awaiting_parts' ? 'bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/20' :
    status === 'completed' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' :
    'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/20'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs border ${color}`}>
      {STATUS_LABELS[status]}
    </span>
  )
}

export default function OrdersListPage() {
  const { isAuthenticated, user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [isMounted, setIsMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<PaginatedOrdersResponse | null>(null)

  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<OrderStatus | ''>('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10)

  useEffect(() => setIsMounted(true), [])

  const query: OrdersQuery = useMemo(() => ({
    search: search || undefined,
    status: (status || undefined) as OrderStatus | undefined,
    page,
    limit,
  }), [search, status, page, limit])

  useEffect(() => {
    if (!isMounted) return
    if (authLoading) return
    if (!isAuthenticated || !user) {
      router.push('/login')
      return
    }

    let cancelled = false
    const DEBOUNCE_MS = 300
    const timer = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await ordersAPI.getOrders(query)
        if (!cancelled) setData(res)
      } catch (e) {
        try {
          const parsed = JSON.parse((e as Error).message) as { message?: string }
          if (!cancelled) setError(parsed.message || 'Ошибка загрузки заказов')
        } catch {
          if (!cancelled) setError('Ошибка загрузки заказов')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, DEBOUNCE_MS)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [isMounted, authLoading, isAuthenticated, user, router, query])

  if (!isMounted) return null
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }
  if (!isAuthenticated || !user) return null

  const items = data?.items || []

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-surface-1">
      <div className="fixed inset-0 bg-gradient-surface -z-10"></div>
      <div className="fixed top-0 right-0 w-96 h-96 bg-gradient-primary opacity-5 rounded-full blur-3xl -z-10"></div>
      <div className="fixed bottom-0 left-0 w-64 h-64 bg-secondary/10 rounded-full blur-3xl -z-10"></div>

      <header className="border-b border-border/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-primary">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">Заказы</h1>
              <p className="text-xs text-muted-foreground">Управление заказ-нарядами</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard">
              <Button variant="ghost">В дашборд</Button>
            </Link>
            <Button variant="outline" onClick={() => setPage(1)}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Обновить
            </Button>
            <Link href="/dashboard/orders/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" /> Новый заказ
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-6 space-y-6">
        <Card className="p-4 backdrop-blur-sm bg-card/80 border-border/50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <Input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                placeholder="Поиск по номеру/описанию/клиенту"
                className="pl-9"
              />
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
            </div>
            <div>
              <select
                value={status}
                onChange={(e) => { setStatus(e.target.value as OrderStatus | ''); setPage(1) }}
                className="w-full h-9 rounded-md border border-border bg-background text-sm px-3"
              >
                <option value="">Все статусы</option>
                <option value="new">Новый</option>
                <option value="in_progress">В работе</option>
                <option value="awaiting_parts">Ожидание запчастей</option>
                <option value="completed">Завершен</option>
                <option value="canceled">Отменен</option>
              </select>
            </div>
            <div className="flex gap-2">
              <select
                value={limit}
                onChange={(e) => { setLimit(parseInt(e.target.value, 10)); setPage(1) }}
                className="w-28 h-9 rounded-md border border-border bg-background text-sm px-3"
              >
                {[10, 20, 50].map((n) => (
                  <option key={n} value={n}>{n} / стр</option>
                ))}
              </select>
              <Button variant="outline" onClick={() => setPage(1)}>Применить</Button>
            </div>
          </div>
        </Card>

        <Card className="p-0 backdrop-blur-sm bg-card/80 border-border/50 overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-surface-1 rounded-md animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="p-6 text-center text-destructive">{error}</div>
          ) : items.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">
              Заказы не найдены
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {items.map((o) => <OrderRow key={o.id} order={o} />)}
            </div>
          )}
        </Card>

        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Всего: {data?.total || 0}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Назад
            </Button>
            <div className="text-sm">
              Стр. {page} / {data?.totalPages || 1}
            </div>
            <Button
              variant="outline"
              disabled={page >= (data?.totalPages || 1)}
              onClick={() => setPage((p) => p + 1)}
            >
              Далее
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}

function OrderRow({ order }: { order: OrderResponse }) {
  return (
    <Link href={`/dashboard/orders/${order.id}`} className="block hover:bg-surface-1/60 transition-colors">
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-gradient-primary/20 flex items-center justify-center">
            <span className="text-primary text-sm font-semibold">{order.orderNumber.split('-').pop()}</span>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <span className="font-medium">{order.orderNumber}</span>
              <StatusBadge status={order.status} />
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {order.customer?.firstName || order.customer?.companyName || 'Клиент'} · {order.vehicle?.licensePlate || order.vehicle?.vin || 'Авто'}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-medium">{order.finalAmount.toLocaleString('ru-RU')} ₽</div>
          <div className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleDateString('ru-RU')}</div>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground ml-2" />
      </div>
    </Link>
  )
}
