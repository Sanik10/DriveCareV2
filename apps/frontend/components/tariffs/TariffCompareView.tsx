// path: apps/frontend/components/tariffs/TariffCompareView.tsx
'use client'

import { useState, useMemo } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Tariff } from '@/lib/types/tariffs'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { formatCurrencyRu, formatLimit } from '@/lib/format'
import { 
  CheckCircle2, 
  X, 
  Plus,
  Search,
  Star,
  TrendingUp,
  Calendar,
  Users,
  Building2,
  Car,
  ClipboardList,
  BarChart3,
  Zap,
  Shield,
  Puzzle,
  Palette,
  ArrowRight
} from 'lucide-react'
import Link from 'next/link'

const FEATURE_CONFIG = {
  reports: { label: 'Базовые отчёты', icon: BarChart3, category: 'Отчётность' },
  analytics: { label: 'Аналитика', icon: TrendingUp, category: 'Отчётность' },
  advanced_reports: { label: 'Расширенные отчёты', icon: BarChart3, category: 'Отчётность' },
  api_access: { label: 'API доступ', icon: Zap, category: 'Интеграции' },
  integrations: { label: 'Интеграции', icon: Puzzle, category: 'Интеграции' },
  priority_support: { label: 'Приоритетная поддержка', icon: Shield, category: 'Поддержка' },
  custom_fields: { label: 'Пользовательские поля', icon: Users, category: 'Настройки' },
  white_label: { label: 'White-label', icon: Palette, category: 'Настройки' }
} as const

const CATEGORY_ICONS = {
  'Отчётность': BarChart3,
  'Интеграции': Puzzle,
  'Поддержка': Shield,
  'Настройки': Users
} as const

interface TariffCompareViewProps {
  initialTariffs: Tariff[]
  allTariffs: Tariff[]
  popularTariffs: Tariff[]
}

export function TariffCompareView(props: TariffCompareViewProps) {
  const { initialTariffs, allTariffs } = props

  const [selectedTariffs, setSelectedTariffs] = useState<Tariff[]>(initialTariffs)
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)

  const availableTariffs = useMemo(() => {
    const selectedIds = new Set(selectedTariffs.map(t => t.id))
    return allTariffs.filter(t => 
      !selectedIds.has(t.id) && 
      (searchQuery === '' || t.name.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  }, [allTariffs, selectedTariffs, searchQuery])

  const featureCategories = useMemo(() => {
    const categories: Record<string, Array<[string, typeof FEATURE_CONFIG[keyof typeof FEATURE_CONFIG]]>> = {}
    
    Object.entries(FEATURE_CONFIG).forEach(([key, config]) => {
      if (!categories[config.category]) {
        categories[config.category] = []
      }
      categories[config.category].push([key, config])
    })
    
    return categories
  }, [])

  const addTariff = (tariff: Tariff) => {
    if (selectedTariffs.length < 4) {
      setSelectedTariffs(prev => [...prev, tariff])
      setShowAddModal(false)
      setSearchQuery('')
    }
  }

  const removeTariff = (tariffId: string) => {
    setSelectedTariffs(prev => prev.filter(t => t.id !== tariffId))
  }

  if (selectedTariffs.length === 0) {
    return (
      <div className="space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-3xl sm:text-4xl font-bold text-gradient-primary">
            Сравнение тарифов
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Выберите тарифы для детального сравнения функций и возможностей
          </p>
        </div>

        <Card className="p-8 sm:p-12 glass border-border/30 rounded-3xl text-center">
          <div className="space-y-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <TrendingUp className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">Нет выбранных тарифов</h3>
              <p className="text-muted-foreground mb-6">
                Выберите 2-4 тарифа из каталога для сравнения
              </p>
              <Link href="/tariffs">
                <Button className="rounded-2xl bg-gradient-primary hover:opacity-90">
                  Перейти к каталогу тарифов
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  type LimitKey = 'maxUsers' | 'maxCustomers' | 'maxVehicles' | 'maxOrders'

  const limits: Array<{ key: LimitKey; label: string; icon: LucideIcon }> = [
    { key: 'maxUsers', label: 'Пользователи', icon: Users },
    { key: 'maxCustomers', label: 'Клиенты', icon: Building2 },
    { key: 'maxVehicles', label: 'Транспортные средства', icon: Car },
    { key: 'maxOrders', label: 'Заказы в месяц', icon: ClipboardList },
  ]

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-3xl sm:text-4xl font-bold text-gradient-primary">
          Сравнение тарифов
        </h1>
        <p className="text-muted-foreground">
          Детальное сравнение выбранных тарифных планов
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="flex items-center gap-4">
          <Card className="p-1.5 glass-subtle border-border/30">
            <div className="flex items-center">
              <Button
                variant={period === 'monthly' ? 'default' : 'ghost'}
                size="sm"
                className={`rounded-xl transition-all duration-300 ${
                  period === 'monthly' 
                    ? 'bg-gradient-primary text-white shadow-glass' 
                    : 'btn-ghost-fixed'
                }`}
                onClick={() => setPeriod('monthly')}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Месяц
              </Button>
              <Button
                variant={period === 'yearly' ? 'default' : 'ghost'}
                size="sm"
                className={`rounded-xl transition-all duration-300 ${
                  period === 'yearly' 
                    ? 'bg-gradient-primary text-white shadow-glass' 
                    : 'btn-ghost-fixed'
                }`}
                onClick={() => setPeriod('yearly')}
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Год
              </Button>
            </div>
          </Card>
          
          <span className="text-sm text-muted-foreground">
            {selectedTariffs.length} из 4 тарифов
          </span>
        </div>

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            className="rounded-xl btn-outline-fixed"
            onClick={() => setShowAddModal(true)}
            disabled={selectedTariffs.length >= 4}
          >
            <Plus className="w-4 h-4 mr-2" />
            Добавить тариф
          </Button>
          <Link href="/tariffs">
            <Button variant="outline" size="sm" className="rounded-xl btn-outline-fixed">
              Все тарифы
            </Button>
          </Link>
        </div>
      </div>

      {/* Comparison Table - DESKTOP */}
      <div className="hidden lg:block">
        <Card className="overflow-hidden glass border-border/30 rounded-3xl">
          <div className="overflow-x-auto">
            <table className="w-full">
              {/* Header */}
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left p-6 w-64 bg-muted/10">
                    <h3 className="font-semibold">Сравнение функций</h3>
                  </th>
                  {selectedTariffs.map((tariff) => (
                    <th key={tariff.id} className="text-center p-6 min-w-[200px] relative">
                      <div className="space-y-3">
                        <div className="flex justify-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeTariff(tariff.id)}
                            className="absolute top-2 right-2 w-6 h-6 p-0 rounded-full hover:bg-destructive hover:text-destructive-foreground"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                        
                        <div className="space-y-2">
                          <h3 className="font-bold text-lg">{tariff.name}</h3>
                          {tariff.description && (
                            <p className="text-xs text-muted-foreground">{tariff.description}</p>
                          )}
                        </div>

                        <div className="space-y-1">
                          <div className="text-2xl font-bold">
                            {formatCurrencyRu(period === 'monthly' ? tariff.priceMonthly : tariff.priceYearly)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {period === 'monthly' ? 'в месяц' : 'в год'}
                          </div>
                          {period === 'yearly' && tariff.yearlyDiscount && (
                            <Badge variant="success" className="text-xs">
                              -{tariff.yearlyDiscount}%
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-col gap-1">
                          {tariff.isRecommended && (
                            <Badge className="bg-gradient-primary text-white text-xs">
                              <Star className="w-3 h-3 mr-1" />
                              Рекомендуем
                            </Badge>
                          )}
                          {Boolean(tariff.features?.highlight) && (
                            <Badge className="bg-amber-500 text-white text-xs">
                              <Zap className="w-3 h-3 mr-1" />
                              ТОП
                            </Badge>
                          )}
                        </div>

                        <Link href={`/auth/register?tariffId=${tariff.id}`}>
                          <Button size="sm" className="w-full rounded-xl bg-gradient-primary hover:opacity-90">
                            Выбрать
                          </Button>
                        </Link>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              {/* ИСПРАВЛЕНО: Один tbody без вложений */}
              <tbody>
                {/* Лимиты */}
                <tr>
                  <td className="p-4 font-medium bg-muted/20" colSpan={selectedTariffs.length + 1}>
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-primary" />
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
                    {selectedTariffs.map((tariff) => (
                      <td key={tariff.id} className="p-4 text-center">
                        <span className="font-medium">
                          {formatLimit(tariff[limit.key])}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}

                {/* ИСПРАВЛЕНО: Функции по категориям без вложенных tbody */}
                {Object.entries(featureCategories).flatMap(([categoryName, features]) => {
                  const CategoryIcon = CATEGORY_ICONS[categoryName as keyof typeof CATEGORY_ICONS] || Users
                  
                  return [
                    // Заголовок категории
                    <tr key={`${categoryName}-header`}>
                      <td className="p-4 font-medium bg-muted/20" colSpan={selectedTariffs.length + 1}>
                        <div className="flex items-center gap-2">
                          <CategoryIcon className="w-5 h-5 text-primary" />
                          {categoryName}
                        </div>
                      </td>
                    </tr>,
                    // Функции категории
                    ...features.map(([featureKey, config]) => (
                      <tr key={featureKey} className="border-b border-border/10 hover:bg-muted/5">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <config.icon className="w-4 h-4 text-primary" />
                            <span className="font-medium">{config.label}</span>
                          </div>
                        </td>
                        {selectedTariffs.map((tariff) => {
                          const hasFeature = Boolean((tariff.features as Record<string, unknown> | undefined)?.[featureKey])
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
                    ))
                  ]
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Comparison Cards - MOBILE */}
      <div className="lg:hidden space-y-6">
        {selectedTariffs.map((tariff) => (
          <Card key={tariff.id} className="p-6 glass border-border/30 rounded-3xl">
            <div className="space-y-4">
              {/* Header */}
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <h3 className="text-xl font-bold">{tariff.name}</h3>
                  <div className="text-2xl font-bold">
                    {formatCurrencyRu(period === 'monthly' ? tariff.priceMonthly : tariff.priceYearly)}
                    <span className="text-sm text-muted-foreground ml-1">
                      /{period === 'monthly' ? 'мес' : 'год'}
                    </span>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeTariff(tariff.id)}
                  className="rounded-full w-8 h-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Badges */}
              <div className="flex gap-2 flex-wrap">
                {tariff.isRecommended && (
                  <Badge className="bg-gradient-primary text-white">
                    <Star className="w-3 h-3 mr-1" />
                    Рекомендуем
                  </Badge>
                )}
                {Boolean(tariff.features?.highlight) && (
                  <Badge className="bg-amber-500 text-white">
                    <Zap className="w-3 h-3 mr-1" />
                    ТОП ВЫБОР
                  </Badge>
                )}
              </div>

              {/* Limits */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  <span>{formatLimit(tariff.maxUsers)} польз.</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-secondary" />
                  <span>{formatLimit(tariff.maxCustomers)} клиент.</span>
                </div>
                <div className="flex items-center gap-2">
                  <Car className="w-4 h-4 text-accent" />
                  <span>{formatLimit(tariff.maxVehicles)} ТС</span>
                </div>
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-muted-foreground" />
                  <span>{formatLimit(tariff.maxOrders)} заказ.</span>
                </div>
              </div>

              {/* Features */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Включенные функции:</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {Object.entries(FEATURE_CONFIG).map(([key, config]) => {
                    const hasFeature = Boolean((tariff.features as Record<string, unknown> | undefined)?.[key])
                    return (
                      <div key={key} className="flex items-center gap-2">
                        {hasFeature ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <X className="w-4 h-4 text-muted-foreground/50" />
                        )}
                        <span className={hasFeature ? '' : 'text-muted-foreground'}>
                          {config.label}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* CTA */}
              <Link href={`/auth/register?tariffId=${tariff.id}`}>
                <Button className="w-full rounded-2xl bg-gradient-primary hover:opacity-90">
                  Выбрать {tariff.name}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>

      {/* Add Tariff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-hidden glass border-border/30 rounded-3xl">
            <div className="p-6 border-b border-border/30">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Добавить тариф для сравнения</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-full w-8 h-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="mt-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Поиск тарифов..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 rounded-xl"
                  />
                </div>
              </div>
            </div>
            
            <div className="p-6 max-h-[400px] overflow-y-auto">
              {availableTariffs.length > 0 ? (
                <div className="grid gap-4">
                  {availableTariffs.map((tariff) => (
                    <div 
                      key={tariff.id}
                      className="flex items-center justify-between p-4 rounded-2xl glass-subtle border border-border/30 hover:border-primary/30 transition-colors cursor-pointer"
                      onClick={() => addTariff(tariff)}
                    >
                      <div className="space-y-1">
                        <h4 className="font-medium">{tariff.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrencyRu(tariff.priceMonthly)} / месяц
                        </p>
                      </div>
                      <Button size="sm" className="rounded-xl bg-gradient-primary hover:opacity-90">
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    {searchQuery ? 'Ничего не найдено' : 'Все доступные тарифы уже добавлены'}
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Bottom CTA */}
      <Card className="p-6 sm:p-8 glass border-border/30 rounded-3xl text-center">
        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Нужна помощь с выбором?</h3>
          <p className="text-muted-foreground">
            Наши эксперты помогут подобрать оптимальный тариф для вашего бизнеса
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button className="rounded-2xl bg-gradient-primary hover:opacity-90">
              Получить консультацию
            </Button>
            <Link href="/tariffs">
              <Button variant="outline" className="rounded-2xl btn-outline-fixed">
                Все тарифы
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  )
}
