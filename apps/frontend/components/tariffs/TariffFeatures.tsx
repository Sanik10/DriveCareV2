// path: apps/frontend/components/tariffs/TariffFeatures.tsx
'use client'

import type { LucideIcon } from 'lucide-react'
import { Tariff } from '@/lib/types/tariffs'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatLimit } from '@/lib/format'
import { 
  CheckCircle2, 
  X, 
  BarChart3, 
  TrendingUp, 
  Zap, 
  Shield, 
  Users, 
  Puzzle, 
  Palette,
  Building2,
  Car,
  ClipboardList,
  Star
} from 'lucide-react'

const FEATURE_CONFIG = {
  reports: {
    label: 'Базовые отчёты',
    icon: BarChart3,
    description: 'Создание и экспорт стандартных отчётов'
  },
  analytics: {
    label: 'Аналитика',
    icon: TrendingUp,
    description: 'Дашборды с графиками и метриками'
  },
  api_access: {
    label: 'API доступ',
    icon: Zap,
    description: 'Интеграции и собственные приложения'
  },
  priority_support: {
    label: 'Приоритетная поддержка',
    icon: Shield,
    description: 'Быстрые ответы и выделенная линия'
  },
  custom_fields: {
    label: 'Пользовательские поля',
    icon: Users,
    description: 'Настраиваемые поля и атрибуты'
  },
  integrations: {
    label: 'Интеграции',
    icon: Puzzle,
    description: 'Подключение сторонних сервисов'
  },
  advanced_reports: {
    label: 'Расширенные отчёты',
    icon: BarChart3,
    description: 'Сводные отчёты и сегментация'
  },
  white_label: {
    label: 'White-label',
    icon: Palette,
    description: 'Брендинг и кастомизация интерфейса'
  }
} as const

export function TariffFeatures({ tariffs }: { tariffs: Tariff[] }) {
  if (tariffs.length === 0) return null

  // Получаем все уникальные features
  const allFeatures = Object.keys(FEATURE_CONFIG)
  
  // Сортируем тарифы по цене
  const sortedTariffs = [...tariffs].sort((a, b) => a.priceMonthly - b.priceMonthly)

  type LimitKey = keyof Pick<Tariff, 'maxUsers' | 'maxCustomers' | 'maxVehicles' | 'maxOrders'>
  const limits: Array<{ key: LimitKey; label: string; icon: LucideIcon }> = [
    { key: 'maxUsers', label: 'Пользователи', icon: Users },
    { key: 'maxCustomers', label: 'Клиенты', icon: Building2 },
    { key: 'maxVehicles', label: 'Транспортные средства', icon: Car },
    { key: 'maxOrders', label: 'Заказы в месяц', icon: ClipboardList }
  ]

  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold">
          Сравните возможности тарифов
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Подробное сравнение функций, лимитов и возможностей каждого тарифного плана
        </p>
      </div>

      <Card className="overflow-hidden glass border-border/30 rounded-3xl">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            {/* Header */}
            <thead>
              <tr className="border-b border-border/30">
                <th className="text-left p-6 font-semibold w-80">
                  Функции и лимиты
                </th>
                {sortedTariffs.map((tariff) => (
                  <th key={tariff.id} className="text-center p-6 w-48">
                    <div className="space-y-2">
                      <h3 className="font-bold text-lg">{tariff.name}</h3>
                      <div className="flex flex-col gap-1">
                        {/* ИСПРАВЛЕНО: Показываем только человеческие теги */}
                        {tariff.isRecommended && (
                          <Badge className="bg-gradient-primary text-white text-xs">
                            <Star className="w-3 h-3 mr-1" />
                            Рекомендуем
                          </Badge>
                        )}
                        {tariff.features?.highlight && (
                          <Badge className="bg-amber-500 text-white text-xs">
                            <Zap className="w-3 h-3 mr-1" />
                            ТОП ВЫБОР
                          </Badge>
                        )}
                        {/* Пользовательские теги (НЕ системные) */}
                        {Array.isArray(tariff.features?.tags) && tariff.features.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 justify-center">
                            {(tariff.features.tags as string[]).slice(0, 2).map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {/* Лимиты */}
              <tr className="border-b border-border/20">
                <td className="p-4 font-medium bg-muted/20" colSpan={sortedTariffs.length + 1}>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-primary" />
                    Лимиты ресурсов
                  </div>
                </td>
              </tr>
              
              {limits.map((limit) => (
                <tr key={limit.key} className="border-b border-border/10 hover:bg-muted/5">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <limit.icon className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{limit.label}</span>
                    </div>
                  </td>
                  {sortedTariffs.map((tariff) => {
                    const val = tariff[limit.key]
                    return (
                      <td key={tariff.id} className="p-4 text-center">
                        <span className="font-medium">
                          {formatLimit(val as number | null | undefined)}
                        </span>
                      </td>
                    )
                  })}
                </tr>
              ))}

              {/* Features */}
              <tr className="border-b border-border/20">
                <td className="p-4 font-medium bg-muted/20" colSpan={sortedTariffs.length + 1}>
                  <div className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-primary" />
                    Функциональные возможности
                  </div>
                </td>
              </tr>

              {allFeatures.map((featureKey) => {
                const config = FEATURE_CONFIG[featureKey as keyof typeof FEATURE_CONFIG]
                
                return (
                  <tr key={featureKey} className="border-b border-border/10 hover:bg-muted/5">
                    <td className="p-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <config.icon className="w-4 h-4 text-primary" />
                          <span className="font-medium">{config.label}</span>
                        </div>
                        <p className="text-xs text-muted-foreground pl-7">
                          {config.description}
                        </p>
                      </div>
                    </td>
                    {sortedTariffs.map((tariff) => {
                      const hasFeature = Boolean(tariff.features?.[featureKey])
                      
                      return (
                        <td key={tariff.id} className="p-4 text-center">
                          {hasFeature ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto" />
                          ) : (
                            <X className="w-5 h-5 text-muted-foreground/50 mx-auto" />
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
