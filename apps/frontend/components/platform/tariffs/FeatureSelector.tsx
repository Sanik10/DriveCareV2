// path: apps/frontend/components/platform/tariffs/FeatureSelector.tsx
'use client'

import { Switch } from '@/components/ui/switch'
import { Card } from '@/components/ui/card'
import { 
  BarChart3, 
  Zap, 
  Shield, 
  Users, 
  Puzzle, 
  TrendingUp, 
  Palette,
  HelpCircle 
} from 'lucide-react'

const FEATURE_DEFINITIONS = {
  reports: {
    label: 'Отчёты',
    description: 'Создание и экспорт базовых отчётов',
    icon: BarChart3,
    color: 'text-blue-500'
  },
  analytics: {
    label: 'Аналитика',
    description: 'Дашборды и графики показателей',
    icon: TrendingUp,
    color: 'text-emerald-500'
  },
  api_access: {
    label: 'Доступ к API',
    description: 'Интеграции и собственные приложения',
    icon: Zap,
    color: 'text-purple-500'
  },
  priority_support: {
    label: 'Приоритетная поддержка',
    description: 'Быстрые ответы и выделенная линия',
    icon: Shield,
    color: 'text-amber-500'
  },
  custom_fields: {
    label: 'Пользовательские поля',
    description: 'Кастомные поля и атрибуты',
    icon: Users,
    color: 'text-cyan-500'
  },
  integrations: {
    label: 'Интеграции',
    description: 'Подключение сторонних сервисов',
    icon: Puzzle,
    color: 'text-indigo-500'
  },
  advanced_reports: {
    label: 'Расширенные отчёты',
    description: 'Сводные отчёты и сегментация',
    icon: BarChart3,
    color: 'text-blue-600'
  },
  white_label: {
    label: 'White-label',
    description: 'Брендинг: домен, логотип, цвета',
    icon: Palette,
    color: 'text-rose-500'
  }
} as const

interface FeatureSelectorProps {
  features: Record<string, boolean>
  onChange: (features: Record<string, boolean>) => void
  disabled?: boolean
}

export function FeatureSelector({ features, onChange, disabled = false }: FeatureSelectorProps) {
  const handleFeatureChange = (key: string, checked: boolean) => {
    onChange({
      ...features,
      [key]: checked
    })
  }

  return (
    <Card className="p-6 glass border-border/30 rounded-3xl">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-gradient-primary rounded-full" />
          <h3 className="text-lg font-semibold">Функциональные возможности</h3>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2">
          {Object.entries(FEATURE_DEFINITIONS).map(([key, definition]) => {
            const isChecked = Boolean(features[key])
            const Icon = definition.icon
            
            return (
              <div 
                key={key}
                className="flex items-start gap-4 p-4 rounded-2xl glass-subtle border border-border/30 hover:border-primary/30 transition-all duration-300 group"
              >
                <div className={`flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-primary-subtle ${definition.color} group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="w-5 h-5" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <h4 className="font-medium text-sm">{definition.label}</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">{definition.description}</p>
                    </div>
                    
                    <Switch 
                      checked={isChecked}
                      onCheckedChange={(checked) => handleFeatureChange(key, checked)}
                      disabled={disabled}
                      size="sm"
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        
        <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
          <HelpCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-600 leading-relaxed">
            Возможности влияют на функциональность и цену тарифа. Можно включать/выключать для гибкой настройки под потребности клиентов.
          </p>
        </div>
      </div>
    </Card>
  )
}
