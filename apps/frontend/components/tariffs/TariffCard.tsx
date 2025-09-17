// path: apps/frontend/components/tariffs/TariffCard.tsx
'use client'

import { useMemo } from 'react'
import { Tariff } from '@/lib/types/tariffs'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrencyRu, formatLimit } from '@/lib/format'
import { 
  CheckCircle2, 
  Sparkles, 
  Star, 
  TrendingUp, 
  Gift, 
  Zap,
  Users,
  Car,
  ClipboardList,
  Building2
} from 'lucide-react'

const FEATURE_ICONS = {
  reports: ClipboardList,
  analytics: TrendingUp,
  api_access: Zap,
  priority_support: Star,
  custom_fields: Users,
  integrations: Building2,
  advanced_reports: ClipboardList,
  white_label: Sparkles
} as const

const BADGE_CONFIG = {
  popular: { icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-500/90', text: 'text-white' },
  best_value: { icon: Star, color: 'text-amber-500', bg: 'bg-amber-500/90', text: 'text-white' },
  new: { icon: Sparkles, color: 'text-emerald-500', bg: 'bg-emerald-500/90', text: 'text-white' },
  sale: { icon: Gift, color: 'text-rose-500', bg: 'bg-rose-500/90', text: 'text-white' },
  recommended: { icon: Zap, color: 'text-purple-500', bg: 'bg-purple-500/90', text: 'text-white' },
  hot: { icon: TrendingUp, color: 'text-orange-500', bg: 'bg-orange-500/90', text: 'text-white' }
} as const

export function TariffCard({
  tariff,
  period = 'monthly',
  isPopular = false,
  onSelect,
}: {
  tariff: Tariff
  period?: 'monthly' | 'yearly'
  isPopular?: boolean
  onSelect?: (tariff: Tariff) => void
}) {
  const price = period === 'monthly' ? tariff.priceMonthly : tariff.priceYearly

  const features = Object.entries(tariff.features ?? {})
    .filter(([key, value]) => {
      return typeof value === 'boolean' && value && FEATURE_ICONS[key as keyof typeof FEATURE_ICONS]
    })
    .slice(0, 4)

  const badgeType = String(tariff.features?.badge || '')
  const badgeConfig = BADGE_CONFIG[badgeType as keyof typeof BADGE_CONFIG]

  // Разделяем highlight (только визуал) и badge (текст)
  const isHighlighted = Boolean(tariff.features?.highlight)
  // Учитываем и корневое поле, и флаг в features для единообразия
  const isRecommended = Boolean(tariff.isRecommended) || Boolean(tariff.features?.recommended)
  const yearlyDiscount = period === 'yearly' && tariff.yearlyDiscount ? tariff.yearlyDiscount : 0

  // Строгая проверка популярности (по метрикам)
  const isReallyPopular = isPopular && (
    (tariff.activeSubscribers && tariff.activeSubscribers > 5) ||
    (tariff.totalSubscribers && tariff.totalSubscribers > 10) ||
    (tariff.subscriptionsCount && tariff.subscriptionsCount > 5)
  )

  // Новый приоритет бейджей — НЕ зависит от highlight
  const badges = useMemo(() => {
    const result = []
    
    // 1) Рекомендуем (глобально)
    if (isRecommended) {
      result.push({
        key: 'recommended_global',
        icon: Sparkles,
        text: 'Рекомендуем',
        shortText: 'Хит',
        className: 'bg-gradient-primary text-white border-primary/50 shadow-lg'
      })
    }
    
    // 2) Кастомный бейдж из БД
    else if (badgeConfig) {
      result.push({
        key: badgeType,
        icon: badgeConfig.icon,
        text: {
          best_value: 'Лучшее предложение',
          new: 'Новинка', 
          sale: 'Скидка',
          hot: 'Хит',
          popular: 'Популярный',
          recommended: 'Рекомендован'
        }[badgeType] || badgeType,
        shortText: {
          best_value: 'Лучший',
          new: 'New',
          sale: 'Sale', 
          hot: 'Хит',
          popular: 'Топ',
          recommended: 'Рек'
        }[badgeType] || badgeType,
        className: `${badgeConfig.bg} ${badgeConfig.text} border shadow-lg`
      })
    }
    
    // 3) Реально популярный (по метрикам)
    else if (isReallyPopular) {
      result.push({
        key: 'popular_metrics',
        icon: TrendingUp,
        text: 'Популярный',
        shortText: 'Топ',
        className: 'bg-blue-500/90 text-white border-blue-400 shadow-lg'
      })
    }
    
    // 4) Только визуальная подсветка, если нет других
    else if (isHighlighted) {
      result.push({
        key: 'highlight',
        icon: Zap,
        text: 'ТОП ВЫБОР',
        shortText: 'ТОП',
        className: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-400 shadow-lg'
      })
    }
    
    return result.slice(0, 1)
  }, [isRecommended, badgeConfig, badgeType, isReallyPopular, isHighlighted])

  // Стили карточки (highlight — чисто визуально)
  const cardClassName = `
    relative rounded-2xl sm:rounded-3xl glass border-border/30 
    hover:shadow-glass-lg transition-all duration-500 surface-glow
    group cursor-pointer overflow-hidden h-full
    ring-1 ring-transparent hover:ring-primary/20
    ${isHighlighted 
      ? 'ring-2 sm:ring-4 ring-primary/40 border-primary/60 shadow-glass-lg bg-gradient-to-br from-primary/5 to-transparent' 
      : isRecommended 
        ? 'ring-2 ring-primary/30 border-primary/40 hover:ring-primary/50' 
        : badges.length > 0
          ? 'ring-1 ring-border hover:ring-primary/30 border-border/50'
          : 'hover:ring-primary/25'
    }
  `

  const isBestValue = badgeType === 'best_value'

  return (
    <Card className={cardClassName}>
      {/* Стабильный glow только для highlighted */}
      {isHighlighted && (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-secondary/6 rounded-2xl sm:rounded-3xl pointer-events-none" />
      )}

      <div className="flex flex-col h-full relative z-10">
        
        {/* Badges ВНУТРИ карточки только если есть */}
        {badges.length > 0 && (
          <div className="p-3 sm:p-4 pb-0">
            <div className="flex gap-1 sm:gap-2 flex-wrap">
              {badges.map((badge) => (
                <Badge 
                  key={badge.key}
                  className={`text-xs px-2 py-1 flex items-center gap-1 ${badge.className}`}
                >
                  <badge.icon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  <span className="hidden sm:inline">{badge.text}</span>
                  <span className="sm:hidden">{badge.shortText}</span>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Content с отступами */}
        <div className="p-4 sm:p-6 pt-3 sm:pt-4 flex flex-col flex-1">
          
          {/* Header */}
          <div className="mb-4">
            <h3 className={`text-lg sm:text-xl font-bold transition-colors line-clamp-1 ${
              isHighlighted ? 'text-primary' : 'group-hover:text-primary'
            }`}>
              {tariff.name}
            </h3>
            {tariff.description && (
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-2 mt-1">
                {tariff.description}
              </p>
            )}
          </div>

          {/* Pricing */}
          <div className="mb-4">
            <div className="flex items-baseline gap-1 sm:gap-2">
              <span className={`text-xl sm:text-2xl font-bold transition-colors ${
                isHighlighted ? 'text-primary' : 'group-hover:text-primary/80'
              }`}>
                {formatCurrencyRu(price)}
              </span>
              <span className="text-xs sm:text-sm text-muted-foreground">
                / {period === 'monthly' ? 'мес' : 'год'}
              </span>
            </div>
            
            {period === 'yearly' && yearlyDiscount > 0 && (
              <div className="flex items-center gap-2 text-xs sm:text-sm mt-1">
                <Badge variant="success" className="text-xs px-1.5 py-0.5">
                  -{yearlyDiscount}%
                </Badge>
                <span className="text-emerald-600 font-medium">
                  <span className="hidden sm:inline">Экономия при годовой оплате</span>
                  <span className="sm:hidden">Экономия за год</span>
                </span>
              </div>
            )}
          </div>

          {/* Limits */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3 text-xs sm:text-sm mb-4">
            <div className="flex items-center gap-1 sm:gap-2">
              <Users className="w-3 h-3 sm:w-4 sm:h-4 text-primary flex-shrink-0" />
              <span className="truncate">{formatLimit(tariff.maxUsers)} польз.</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <Building2 className="w-3 h-3 sm:w-4 sm:h-4 text-secondary flex-shrink-0" />
              <span className="truncate">{formatLimit(tariff.maxCustomers)} клиент.</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <Car className="w-3 h-3 sm:w-4 sm:h-4 text-accent flex-shrink-0" />
              <span className="truncate">{formatLimit(tariff.maxVehicles)} ТС</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <ClipboardList className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
              <span className="truncate">{formatLimit(tariff.maxOrders)} заказ.</span>
            </div>
          </div>

          {/* Features */}
          <div className="flex-1 mb-4">
            {features.length > 0 && (
              <div className="space-y-2 sm:space-y-3">
                <h4 className="text-xs sm:text-sm font-semibold text-muted-foreground">Включено:</h4>
                <div className="space-y-1 sm:space-y-1.5">
                  {features.map(([key]) => {
                    const Icon = FEATURE_ICONS[key as keyof typeof FEATURE_ICONS]
                    const label = {
                      reports: 'Отчёты',
                      analytics: 'Аналитика',
                      api_access: 'API',
                      priority_support: 'Поддержка 24/7',
                      custom_fields: 'Кастом поля',
                      integrations: 'Интеграции',
                      advanced_reports: 'Полные отчёты',
                      white_label: 'White-label'
                    }[key as keyof typeof FEATURE_ICONS] || key

                    return (
                      <div key={key} className="flex items-center gap-2 text-xs sm:text-sm">
                        <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 text-emerald-500 flex-shrink-0" />
                        <Icon className="w-3 h-3 sm:w-4 sm:h-4 text-primary flex-shrink-0" />
                        <span className="truncate">{label}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Tags */}
          {Array.isArray(tariff.features?.tags) && tariff.features.tags.length > 0 && (
            <div className="mb-4">
              <div className="flex flex-wrap gap-1">
                {(tariff.features.tags as string[]).slice(0, 2).map((tag, index) => (
                  <Badge 
                    key={index} 
                    variant="outline" 
                    className="text-xs rounded-full px-2 py-0.5 truncate max-w-[70px] flex-shrink-0"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <div className="space-y-2 sm:space-y-3 mt-auto">
            <Button 
              className={`w-full h-10 sm:h-12 rounded-xl sm:rounded-2xl font-medium transition-all duration-300 hover:scale-[1.02] text-sm sm:text-base ${
                isHighlighted 
                  ? 'bg-gradient-to-r from-primary to-secondary hover:opacity-90 shadow-lg' 
                  : 'bg-gradient-primary hover:opacity-90'
              }`}
              onClick={() => onSelect?.(tariff)}
            >
              {isBestValue ? '🔥 Выбрать ТОП' : 'Выбрать план'}
            </Button>
            
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 rounded-xl btn-outline-fixed text-xs sm:text-sm h-8 sm:h-10" asChild>
                <a href={`/tariffs/${tariff.id}`}>Подробнее</a>
              </Button>
              <Button variant="outline" className="flex-1 rounded-xl btn-outline-fixed text-xs sm:text-sm h-8 sm:h-10" asChild>
                <a href={`/tariffs/compare?ids=${tariff.id}`}>Сравнить</a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
