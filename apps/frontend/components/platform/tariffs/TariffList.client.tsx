// path: apps/frontend/components/platform/tariffs/TariffList.client.tsx
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { tariffsAPI } from '@/lib/api/tariffs'
import type { Tariff } from '@/lib/types/tariffs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { 
  Search, 
  Filter, 
  Eye, 
  Edit, 
  Power, 
  PowerOff, 
  Trash2, 
  Users, 
  TrendingUp,
  Star,
  RefreshCw
} from 'lucide-react'
import { formatCurrencyRu } from '@/lib/format'

type StatusFilter = 'any' | 'active' | 'inactive'
type SortField = 'name' | 'priceMonthly' | 'priceYearly' | 'createdAt' | 'activeSubscribers' | 'totalSubscribers'
type SortOrder = 'asc' | 'desc'

export function TariffListClient() {
  const [items, setItems] = useState<Tariff[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  // Фильтры
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<StatusFilter>('any')
  const [minPrice, setMinPrice] = useState<string>('')
  const [maxPrice, setMaxPrice] = useState<string>('')
  const [minActiveSubscribers, setMinActiveSubscribers] = useState<string>('')
  const [minTotalSubscribers, setMinTotalSubscribers] = useState<string>('')
  const [sortField, setSortField] = useState<SortField>('priceMonthly')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

  const buildParams = useCallback(() => {
    return {
      search: search.trim() || undefined,
      isActive: status === 'any' ? undefined : status === 'active',
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      minActiveSubscribers: minActiveSubscribers ? Number(minActiveSubscribers) : undefined,
      minTotalSubscribers: minTotalSubscribers ? Number(minTotalSubscribers) : undefined,
      page,
      limit,
      sortField,
      sortOrder,
    } as const
  }, [search, status, minPrice, maxPrice, minActiveSubscribers, minTotalSubscribers, page, limit, sortField, sortOrder])

  const load = useCallback(async () => {
    setLoading(true)
    setErr(null)
    try {
      const params = buildParams()
      const res = await tariffsAPI.list(params as Parameters<typeof tariffsAPI.list>[0])
      setItems(res.items)
      setTotal(res.total)
      setPage(res.page)
      setLimit(res.limit)
      setTotalPages(res.totalPages)
    } catch (e) {
      // Мягкий фоллбек
      try {
        const fallback = await tariffsAPI.active()
        setItems(fallback)
        setTotal(fallback.length)
        setPage(1)
        setLimit(fallback.length)
        setTotalPages(1)
      } catch (e2) {
        const msg = e2 instanceof Error ? e2.message : e instanceof Error ? e.message : 'Ошибка загрузки тарифов'
        setErr(msg || 'Ошибка загрузки тарифов')
      }
    } finally {
      setLoading(false)
    }
  }, [buildParams])

  useEffect(() => {
    void load()
  }, [load])

  const resetFilters = () => {
    setSearch('')
    setStatus('any')
    setMinPrice('')
    setMaxPrice('')
    setMinActiveSubscribers('')
    setMinTotalSubscribers('')
    setSortField('priceMonthly')
    setSortOrder('asc')
    setPage(1)
    setLimit(20)
  }

  const hasFilters = useMemo(() => {
    return (
      !!search.trim() ||
      status !== 'any' ||
      !!minPrice ||
      !!maxPrice ||
      !!minActiveSubscribers ||
      !!minTotalSubscribers ||
      sortField !== 'priceMonthly' ||
      sortOrder !== 'asc'
    )
  }, [search, status, minPrice, maxPrice, minActiveSubscribers, minTotalSubscribers, sortField, sortOrder])

  const handleStatusToggle = async (tariff: Tariff) => {
    try {
      await tariffsAPI.setActive(tariff.id, !tariff.isActive)
      await load()
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      alert(msg || 'Не удалось изменить статус')
    }
  }

  const handleDelete = async (tariff: Tariff) => {
    if (!confirm(`Удалить тариф "${tariff.name}"?\n\nЭто действие необратимо.`)) return
    
    try {
      await tariffsAPI.remove(tariff.id)
      await load()
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      alert(msg || 'Не удалось удалить тариф')
    }
  }

  return (
    <div className="space-y-6">
      {/* Статистика */}
      <Card className="p-6 glass border-border/30 rounded-3xl">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">Обзор тарифов</h3>
            <p className="text-sm text-muted-foreground">
              {loading ? 'Загрузка...' : err ? 'Ошибка загрузки' : `Всего: ${total} тарифов`}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">{items.filter(t => t.isActive).length}</p>
              <p className="text-xs text-muted-foreground">Активных</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-secondary">{total}</p>
              <p className="text-xs text-muted-foreground">Всего</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Фильтры */}
      <Card className="p-6 glass border-border/30 rounded-3xl">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Filter className="w-5 h-5 text-muted-foreground" />
              <h3 className="font-semibold">Фильтры и поиск</h3>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => void load()} className="rounded-xl">
                <RefreshCw className="w-4 h-4" />
                Обновить
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={resetFilters}
                disabled={!hasFilters}
                className="rounded-xl"
              >
                Сбросить
              </Button>
            </div>
          </div>
          
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Поиск</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Название или описание"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setPage(1)
                  }}
                  className="pl-10 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Статус</label>
              <select
                className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as StatusFilter)
                  setPage(1)
                }}
              >
                <option value="any">Любой</option>
                <option value="active">Активные</option>
                <option value="inactive">Неактивные</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Цена от (мес)</label>
              <Input
                type="number"
                placeholder="0"
                value={minPrice}
                onChange={(e) => {
                  setMinPrice(e.target.value)
                  setPage(1)
                }}
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Цена до (мес)</label>
              <Input
                type="number"
                placeholder="∞"
                value={maxPrice}
                onChange={(e) => {
                  setMaxPrice(e.target.value)
                  setPage(1)
                }}
                className="rounded-xl"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Сортировка</label>
              <select
                className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                value={sortField}
                onChange={(e) => {
                  setSortField(e.target.value as SortField)
                  setPage(1)
                }}
              >
                <option value="name">Название</option>
                <option value="priceMonthly">Цена/мес</option>
                <option value="priceYearly">Цена/год</option>
                <option value="createdAt">Дата создания</option>
                <option value="activeSubscribers">Активные подписчики</option>
                <option value="totalSubscribers">Всего покупали</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Порядок</label>
              <select
                className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                value={sortOrder}
                onChange={(e) => {
                  setSortOrder(e.target.value as SortOrder)
                  setPage(1)
                }}
              >
                <option value="asc">По возрастанию</option>
                <option value="desc">По убыванию</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Подписчиков ≥</label>
              <Input
                type="number"
                placeholder="0"
                value={minActiveSubscribers}
                onChange={(e) => {
                  setMinActiveSubscribers(e.target.value)
                  setPage(1)
                }}
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">На странице</label>
              <select
                className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value) || 20)
                  setPage(1)
                }}
              >
                {[10, 20, 50, 100].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Контент */}
      {loading && (
        <Card className="p-12 glass border-border/30 rounded-3xl text-center">
          <div className="space-y-4">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground">Загружаем тарифы...</p>
          </div>
        </Card>
      )}

      {!loading && err && (
        <Card className="p-12 glass border-destructive/30 rounded-3xl text-center">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
              <TrendingUp className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <h3 className="font-semibold text-destructive mb-2">Не удалось загрузить тарифы</h3>
              <p className="text-sm text-muted-foreground">{err}</p>
            </div>
            <Button onClick={() => void load()} variant="outline" className="rounded-xl">
              Попробовать снова
            </Button>
          </div>
        </Card>
      )}

      {!loading && !err && items.length === 0 && (
        <Card className="p-12 glass border-border/30 rounded-3xl text-center">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-full bg-muted/20 flex items-center justify-center mx-auto">
              <TrendingUp className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold mb-2">Тарифы не найдены</h3>
              <p className="text-sm text-muted-foreground">
                Попробуйте изменить фильтры или создайте первый тариф
              </p>
            </div>
          </div>
        </Card>
      )}

      {!loading && !err && items.length > 0 && (
        <div className="space-y-4">
          {/* Сетка карточек тарифов */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {items.map((tariff) => (
              <Card key={tariff.id} className="p-6 glass border-border/30 rounded-3xl hover:shadow-glass-lg transition-all duration-300 surface-glow">
                <div className="space-y-4">
                  {/* Заголовок */}
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-lg">{tariff.name}</h3>
                      {tariff.description && (
                        <p className="text-sm text-muted-foreground">{tariff.description}</p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      {(tariff.isRecommended || Boolean(tariff.features?.recommended)) && (
                        <Badge variant="secondary" className="text-xs">
                          <Star className="w-3 h-3 mr-1" />
                          Рекомендуем
                        </Badge>
                      )}
                      <Badge variant={tariff.isActive ? 'success' : 'secondary'} className="text-xs">
                        {tariff.isActive ? 'Активен' : 'Неактивен'}
                      </Badge>
                    </div>
                  </div>

                  {/* Цены */}
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold">{formatCurrencyRu(tariff.priceMonthly)}</span>
                      <span className="text-sm text-muted-foreground">/мес</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatCurrencyRu(tariff.priceYearly)} /год
                      {tariff.yearlyDiscount && tariff.yearlyDiscount > 0 && (
                        <span className="text-emerald-600 ml-2">(-{tariff.yearlyDiscount}%)</span>
                      )}
                    </div>
                  </div>

                  {/* Метрики */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{tariff.activeSubscribers || 0}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-4 h-4" />
                      <span>{tariff.totalSubscribers || 0}</span>
                    </div>
                  </div>

                  {/* Действия */}
                  <div className="flex items-center gap-2 pt-2">
                    <Link href={`/platform/tariffs/${tariff.id}`} className="flex-1">
                      <Button size="sm" className="w-full rounded-xl bg-gradient-primary hover:opacity-90">
                        <Edit className="w-4 h-4" />
                        Редактировать
                      </Button>
                    </Link>
                    
                    <Link href={`/tariffs/${tariff.id}`} target="_blank">
                      <Button size="sm" variant="outline" className="rounded-xl btn-outline-fixed">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>
                    
                    <Button 
                      size="sm" 
                      variant={tariff.isActive ? 'secondary' : 'default'}
                      onClick={() => handleStatusToggle(tariff)}
                      className="rounded-xl"
                    >
                      {tariff.isActive ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                    </Button>
                    
                    <Button 
                      size="sm" 
                      variant="destructive" 
                      onClick={() => handleDelete(tariff)}
                      className="rounded-xl"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Пагинация */}
          {totalPages > 1 && (
            <Card className="p-4 glass border-border/30 rounded-3xl">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Страница {page} из {totalPages} • Всего {total} тарифов
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    className="rounded-xl"
                  >
                    Назад
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    className="rounded-xl"
                  >
                    Вперёд
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
