// path: apps/frontend/components/tariffs/TariffShowcase.tsx
'use client'

import { useMemo, useState } from 'react'
import { Tariff } from '@/lib/types/tariffs'
import { TariffCard } from './TariffCard'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Zap, Calendar, TrendingUp, Grid3X3, List } from 'lucide-react'
import Link from 'next/link'

export function TariffShowcase({
  tariffs,
  popularIds = [],
}: {
  tariffs: Tariff[]
  popularIds?: string[]
}) {
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly')
  const [viewMode, setViewMode] = useState<'featured' | 'all'>('featured')

  const maxDiscount = useMemo(() => {
    return tariffs.reduce((acc, t) => (t.yearlyDiscount && t.yearlyDiscount > acc ? t.yearlyDiscount : acc), 0)
  }, [tariffs])

  const { featuredTariffs, otherTariffs, allSorted } = useMemo(() => {
    const getShelfPosition = (t: Tariff) => {
      const v = t.features?.shelf_position
      const n = typeof v === 'number' ? v : Number(v)
      return Number.isFinite(n) ? n : 999
    }
    const getShowcaseRank = (t: Tariff): 1 | 2 | 3 | undefined => {
      const v = t.features?.showcase_rank
      if (v === 1 || v === 2 || v === 3) return v
      const n = typeof v === 'number' ? v : Number(v)
      return Number.isFinite(n) && n >= 1 && n <= 3 ? (n as 1 | 2 | 3) : undefined
    }

    // Базовая сортировка каталога: по shelf_position, затем по цене/мес
    const sorted = [...tariffs].sort((a, b) => {
      const aPos = getShelfPosition(a)
      const bPos = getShelfPosition(b)
      if (aPos !== bPos) return aPos - bPos
      if (a.priceMonthly !== b.priceMonthly) return a.priceMonthly - b.priceMonthly
      return a.name.localeCompare(b.name)
    })

    // Явный ТОП-3 только по features.showcase_rank
    const rankedInOrder = sorted.filter((t) => getShowcaseRank(t) !== undefined)
    const featured: Tariff[] = []

    ;([1, 2, 3] as const).forEach((slot) => {
      const picked = rankedInOrder.find((t) => getShowcaseRank(t) === slot)
      if (picked && !featured.some((f) => f.id === picked.id)) {
        featured.push(picked)
      }
    })

    // Если слотов меньше 3 — добираем по shelf_position из остальных (без влияния highlight/badge)
    if (featured.length < 3) {
      const fillers = sorted.filter((t) => !featured.some((f) => f.id === t.id)).slice(0, 3 - featured.length)
      featured.push(...fillers)
    }

    const other = sorted.filter((t) => !featured.some((f) => f.id === t.id))

    return {
      featuredTariffs: featured,
      otherTariffs: other,
      allSorted: sorted,
    }
  }, [tariffs])

  // "Популярность" — только визуальный бейдж, не влияет на ТОП-3
  const shouldShowPopular = (tariffId: string) => {
    return tariffs.length > 5 && popularIds.includes(tariffId)
  }

  const handleTariffSelect = (tariff: Tariff) => {
    window.location.href = `/auth/register?tariffId=${tariff.id}`
  }

  if (tariffs.length === 0) {
    return (
      <Card className="p-6 sm:p-12 glass border-border/30 rounded-3xl text-center">
        <div className="space-y-4">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-muted/20 flex items-center justify-center mx-auto">
            <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-semibold mb-2">Тарифы временно недоступны</h3>
            <p className="text-sm sm:text-base text-muted-foreground">
              Мы работаем над обновлением тарифных планов. Попробуйте позже.
            </p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h2 className="text-2xl sm:text-3xl font-bold">Выберите тарифный план</h2>
        <p className="text-sm sm:text-base text-muted-foreground px-4">
          Прозрачные цены без скрытых комиссий. Растите вместе с нами.
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Period Toggle */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          {maxDiscount > 0 && (
            <div className="flex items-center gap-2 text-xs sm:text-sm text-emerald-600 font-medium order-2 sm:order-1">
              <Zap className="w-4 h-4" />
              Экономия до {maxDiscount}% при годовой оплате
            </div>
          )}

          <Card className="p-1.5 sm:p-2 glass-subtle border-border/30 order-1 sm:order-2">
            <div className="flex items-center">
              <Button
                variant={period === 'monthly' ? 'default' : 'ghost'}
                size="sm"
                className={`
                  rounded-xl transition-all duration-300 text-xs sm:text-sm px-3 sm:px-4
                  ${period === 'monthly' 
                    ? 'bg-gradient-primary text-white shadow-glass' 
                    : 'btn-ghost-fixed hover:bg-muted/50'
                  }
                `}
                onClick={() => setPeriod('monthly')}
              >
                <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                Месяц
              </Button>
              <Button
                variant={period === 'yearly' ? 'default' : 'ghost'}
                size="sm"
                className={`
                  rounded-xl transition-all duration-300 text-xs sm:text-sm px-3 sm:px-4
                  ${period === 'yearly' 
                    ? 'bg-gradient-primary text-white shadow-glass' 
                    : 'btn-ghost-fixed hover:bg-muted/50'
                  }
                `}
                onClick={() => setPeriod('yearly')}
              >
                <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                Год
                {maxDiscount > 0 && (
                  <span className="ml-1 text-xs bg-white/20 px-1 py-0.5 rounded-full">
                    -{maxDiscount}%
                  </span>
                )}
              </Button>
            </div>
          </Card>
        </div>

        {/* View Mode Toggle */}
        <Card className="p-1.5 glass-subtle border-border/30">
          <div className="flex items-center">
            <Button
              variant={viewMode === 'featured' ? 'default' : 'ghost'}
              size="sm"
              className={`
                rounded-xl transition-all duration-300 text-xs sm:text-sm px-3 sm:px-4
                ${viewMode === 'featured' 
                  ? 'bg-gradient-primary text-white shadow-glass' 
                  : 'btn-ghost-fixed hover:bg-muted/50'
                }
              `}
              onClick={() => setViewMode('featured')}
            >
              <Grid3X3 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Топ планы
            </Button>
            <Button
              variant={viewMode === 'all' ? 'default' : 'ghost'}
              size="sm"
              className={`
                rounded-xl transition-all duration-300 text-xs sm:text-sm px-3 sm:px-4
                ${viewMode === 'all' 
                  ? 'bg-gradient-primary text-white shadow-glass' 
                  : 'btn-ghost-fixed hover:bg-muted/50'
                }
              `}
              onClick={() => setViewMode('all')}
            >
              <List className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              Все тарифы ({tariffs.length})
            </Button>
          </div>
        </Card>
      </div>

      {/* Featured Tariffs Mode */}
      {viewMode === 'featured' && (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-lg sm:text-xl font-semibold flex items-center justify-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Рекомендуемые планы
            </h3>
            <p className="text-sm text-muted-foreground mt-2">
              Самые популярные решения для автосервисов
            </p>
          </div>
          
          {/* Фиксированная сетка с одинаковой высотой */}
          <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {featuredTariffs.map((tariff) => (
              <div
                key={tariff.id}
                className="transform transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1 sm:hover:-translate-y-2 h-full"
              >
                <TariffCard
                  tariff={tariff}
                  period={period}
                  isPopular={shouldShowPopular(tariff.id)}
                  onSelect={handleTariffSelect}
                />
              </div>
            ))}
          </div>

          {/* Show All Button */}
          {otherTariffs.length > 0 && (
            <div className="text-center">
              <Button
                variant="outline"
                onClick={() => setViewMode('all')}
                className="rounded-2xl btn-outline-fixed"
              >
                Показать все {tariffs.length} тарифов
              </Button>
            </div>
          )}
        </div>
      )}

      {/* All Tariffs Mode */}
      {viewMode === 'all' && (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-lg sm:text-xl font-semibold">Все доступные тарифы</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Полный каталог тарифных планов
            </p>
          </div>

          {/* Фиксированная сетка для всех тарифов */}
          <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {allSorted.map((tariff) => (
              <div
                key={tariff.id}
                className="transform transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1 h-full"
              >
                <TariffCard
                  tariff={tariff}
                  period={period}
                  isPopular={shouldShowPopular(tariff.id)}
                  onSelect={handleTariffSelect}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom CTA */}
      <Card className="p-6 sm:p-8 glass border-border/30 rounded-3xl text-center">
        <div className="space-y-4">
          <h3 className="text-lg sm:text-xl font-semibold">
            Не можете выбрать подходящий план?
          </h3>
          <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto">
            Наши эксперты помогут подобрать оптимальный тариф для вашего автосервиса
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button className="rounded-2xl bg-gradient-primary hover:opacity-90">
              Получить консультацию
            </Button>
            <Link href="/tariffs/compare">
              <Button variant="outline" className="rounded-2xl btn-outline-fixed">
                Сравнить все планы
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  )
}
