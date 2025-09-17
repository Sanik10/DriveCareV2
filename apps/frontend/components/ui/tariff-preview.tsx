// path: apps/frontend/components/ui/tariff-preview.tsx
'use client'

import { Tariff } from '@/lib/types/tariffs'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrencyRu, formatLimit } from '@/lib/format'
import { 
  CheckCircle2, 
  Sparkles, 
  Edit3,
  Users,
  Car,
  ClipboardList,
  Building2,
  Zap
} from 'lucide-react'

const FEATURE_ICONS = {
  reports: ClipboardList,
  analytics: ClipboardList,
  api_access: Zap,
  priority_support: Sparkles,
  custom_fields: Users,
  integrations: Building2,
  advanced_reports: ClipboardList,
  white_label: Sparkles
} as const

interface TariffPreviewProps {
  tariff: Tariff
  period?: 'monthly' | 'yearly'
  onEdit?: () => void
  className?: string
}

export function TariffPreview({ 
  tariff, 
  period = 'monthly', 
  onEdit,
  className = '' 
}: TariffPreviewProps) {
  const price = period === 'monthly' ? tariff.priceMonthly : tariff.priceYearly
  const yearlyDiscount = period === 'yearly' && tariff.yearlyDiscount ? tariff.yearlyDiscount : 0

  const features = Object.entries(tariff.features ?? {})
    .filter(([key, value]) => {
      return typeof value === 'boolean' && value && FEATURE_ICONS[key as keyof typeof FEATURE_ICONS]
    })
    .slice(0, 3) // Для preview показываем только топ-3

  const isRecommended = Boolean(tariff.isRecommended) || Boolean(tariff.features?.recommended)

  return (
    <Card className={`p-4 sm:p-6 glass border-primary/20 bg-gradient-to-br from-primary/5 to-transparent ${className}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-bold text-primary truncate">
                {tariff.name}
              </h3>
              {isRecommended && (
                <Badge className="bg-gradient-primary text-white border-primary/50 text-xs px-2 py-0.5">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Рекомендуем
                </Badge>
              )}
            </div>
            {tariff.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {tariff.description}
              </p>
            )}
          </div>
          
          {onEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={onEdit}
              className="ml-3 flex-shrink-0 rounded-xl btn-outline-fixed text-xs"
            >
              <Edit3 className="w-3 h-3 mr-1" />
              Изменить
            </Button>
          )}
        </div>

        {/* Pricing */}
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-primary">
              {formatCurrencyRu(price)}
            </span>
            <span className="text-sm text-muted-foreground">
              / {period === 'monthly' ? 'месяц' : 'год'}
            </span>
          </div>
          
          {period === 'yearly' && yearlyDiscount > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="success" className="text-xs px-1.5 py-0.5">
                -{yearlyDiscount}%
              </Badge>
              <span className="text-xs text-emerald-600 font-medium">
                Экономия при годовой оплате
              </span>
            </div>
          )}
        </div>

        {/* Quick Limits */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="truncate">{formatLimit(tariff.maxUsers)} польз.</span>
          </div>
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-secondary flex-shrink-0" />
            <span className="truncate">{formatLimit(tariff.maxCustomers)} клиент.</span>
          </div>
          <div className="flex items-center gap-2">
            <Car className="w-4 h-4 text-accent flex-shrink-0" />
            <span className="truncate">{formatLimit(tariff.maxVehicles)} ТС</span>
          </div>
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="truncate">{formatLimit(tariff.maxOrders)} заказ.</span>
          </div>
        </div>

        {/* Key Features */}
        {features.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground">Включено:</h4>
            <div className="space-y-1">
              {features.map(([key]) => {
                const Icon = FEATURE_ICONS[key as keyof typeof FEATURE_ICONS]
                const label = {
                  reports: 'Отчёты',
                  analytics: 'Аналитика',
                  api_access: 'API доступ',
                  priority_support: 'Поддержка 24/7',
                  custom_fields: 'Кастом поля',
                  integrations: 'Интеграции',
                  advanced_reports: 'Полные отчёты',
                  white_label: 'White-label'
                }[key as keyof typeof FEATURE_ICONS] || key

                return (
                  <div key={key} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <Icon className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="truncate">{label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
