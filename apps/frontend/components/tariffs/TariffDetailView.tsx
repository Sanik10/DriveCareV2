// path: apps/frontend/components/tariffs/TariffDetailView.tsx
'use client'

import { useState } from 'react'
import { Tariff } from '@/lib/types/tariffs'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrencyRu, formatLimit } from '@/lib/format'
import { TariffCard } from './TariffCard'
import { 
  CheckCircle2, 
  Star, 
  Shield, 
  CreditCard, 
  Users,
  Building2,
  Car,
  ClipboardList,
  TrendingUp,
  Zap,
  Sparkles,
  Calendar,
  ArrowRight
} from 'lucide-react'
import Link from 'next/link'

const FEATURE_CONFIG = {
  reports: { label: 'Базовые отчёты', icon: ClipboardList, description: 'Создание и экспорт стандартных отчётов' },
  analytics: { label: 'Аналитика', icon: TrendingUp, description: 'Дашборды с графиками и метриками' },
  api_access: { label: 'API доступ', icon: Zap, description: 'Интеграции и собственные приложения' },
  priority_support: { label: 'Приоритетная поддержка', icon: Shield, description: 'Быстрые ответы и выделенная линия' },
  custom_fields: { label: 'Пользовательские поля', icon: Users, description: 'Настраиваемые поля и атрибуты' },
  integrations: { label: 'Интеграции', icon: Building2, description: 'Подключение сторонних сервисов' },
  advanced_reports: { label: 'Расширенные отчёты', icon: ClipboardList, description: 'Сводные отчёты и сегментация' },
  white_label: { label: 'White-label', icon: Sparkles, description: 'Брендинг и кастомизация интерфейса' }
} as const

interface TariffDetailViewProps {
  tariff: Tariff
  similarTariffs?: Tariff[]
  popularTariffs?: Tariff[]
}

export function TariffDetailView({ tariff, similarTariffs = [], popularTariffs = [] }: TariffDetailViewProps) {
  const [period, setPeriod] = useState<'monthly' | 'yearly'>('monthly')
  
  const price = period === 'monthly' ? tariff.priceMonthly : tariff.priceYearly
  const yearlyDiscount = tariff.yearlyDiscount || 0
  const isHighlighted = Boolean(tariff.features?.highlight)

  const features = Object.entries(FEATURE_CONFIG).filter(([key]) => 
    Boolean(tariff.features?.[key])
  )

  return (
    <div className="space-y-8 sm:space-y-12">
      {/* Hero Section */}
      <div className="text-center space-y-6">
        <div className="space-y-4">
          <div className="flex justify-center gap-2">
            {tariff.isRecommended && (
              <Badge className="bg-gradient-primary text-white">
                <Star className="w-3 h-3 mr-1" />
                Рекомендуем
              </Badge>
            )}
            {isHighlighted && (
              <Badge className="bg-amber-500 text-white animate-pulse">
                <Zap className="w-3 h-3 mr-1" />
                ТОП ВЫБОР
              </Badge>
            )}
            {tariff.features?.badge && (
              <Badge variant="outline">
                {String(tariff.features.badge)}
              </Badge>
            )}
          </div>
          
          <h1 className="text-4xl sm:text-5xl font-bold text-gradient-primary">
            {tariff.name}
          </h1>
          
          {tariff.description && (
            <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
              {tariff.description}
            </p>
          )}
        </div>

        {/* Period Toggle */}
        <Card className="p-2 glass-subtle border-border/30 inline-flex">
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
            Ежемесячно
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
            Ежегодно
            {yearlyDiscount > 0 && (
              <span className="ml-1 text-xs bg-white/20 px-1.5 py-0.5 rounded-full">
                -{yearlyDiscount}%
              </span>
            )}
          </Button>
        </Card>

        {/* Pricing */}
        <div className="space-y-4">
          <div className="flex justify-center items-baseline gap-2">
            <span className="text-5xl sm:text-6xl font-bold">{formatCurrencyRu(price)}</span>
            <span className="text-xl text-muted-foreground">
              / {period === 'monthly' ? 'месяц' : 'год'}
            </span>
          </div>
          
          {period === 'yearly' && yearlyDiscount > 0 && (
            <div className="flex justify-center">
              <Badge variant="success" className="text-sm px-3 py-1">
                💰 Экономия {yearlyDiscount}% при годовой оплате
              </Badge>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link href={`/auth/register?tariffId=${tariff.id}`}>
            <Button 
              size="lg" 
              className="px-8 py-4 rounded-2xl bg-gradient-primary hover:opacity-90 hover:scale-105 transition-all duration-300 font-semibold text-lg group"
            >
              Выбрать {tariff.name}
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          
          <Link href={`/tariffs/compare?ids=${tariff.id}`}>
            <Button 
              size="lg" 
              variant="outline" 
              className="px-8 py-4 rounded-2xl btn-outline-fixed font-semibold"
            >
              Сравнить тарифы
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column - Features & Limits */}
        <div className="lg:col-span-2 space-y-8">
          {/* Limits */}
          <Card className="p-6 glass border-border/30 rounded-3xl">
            <h3 className="text-xl font-semibold mb-6">Лимиты ресурсов</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-4 rounded-2xl glass-subtle">
                <Users className="w-8 h-8 text-primary" />
                <div>
                  <p className="font-semibold">{formatLimit(tariff.maxUsers)}</p>
                  <p className="text-sm text-muted-foreground">Пользователей</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-2xl glass-subtle">
                <Building2 className="w-8 h-8 text-secondary" />
                <div>
                  <p className="font-semibold">{formatLimit(tariff.maxCustomers)}</p>
                  <p className="text-sm text-muted-foreground">Клиентов</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-2xl glass-subtle">
                <Car className="w-8 h-8 text-accent" />
                <div>
                  <p className="font-semibold">{formatLimit(tariff.maxVehicles)}</p>
                  <p className="text-sm text-muted-foreground">Транспортных средств</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-2xl glass-subtle">
                <ClipboardList className="w-8 h-8 text-muted-foreground" />
                <div>
                  <p className="font-semibold">{formatLimit(tariff.maxOrders)}</p>
                  <p className="text-sm text-muted-foreground">Заказов в месяц</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Features */}
          {features.length > 0 && (
            <Card className="p-6 glass border-border/30 rounded-3xl">
              <h3 className="text-xl font-semibold mb-6">Функциональные возможности</h3>
              <div className="grid gap-4">
                {features.map(([key, config]) => (
                  <div key={key} className="flex items-start gap-4 p-4 rounded-2xl glass-subtle">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <config.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold mb-1">{config.label}</h4>
                      <p className="text-sm text-muted-foreground">{config.description}</p>
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-1" />
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Tags */}
          {Array.isArray(tariff.features?.tags) && tariff.features.tags.length > 0 && (
            <Card className="p-6 glass border-border/30 rounded-3xl">
              <h3 className="text-xl font-semibold mb-4">Подходит для</h3>
              <div className="flex flex-wrap gap-2">
                {(tariff.features.tags as string[]).map((tag, index) => (
                  <Badge key={index} variant="outline" className="px-3 py-1 rounded-full">
                    {tag}
                  </Badge>
                ))}
              </div>
            </Card>
          )}
        </div>

        {/* Right Column - Trust & Similar */}
        <div className="space-y-6">
          {/* Trust Signals */}
          <Card className="p-6 glass border-border/30 rounded-3xl">
            <h3 className="font-semibold mb-4">Ваша безопасность</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-primary" />
                <span className="text-sm">Безопасность: 161‑ФЗ, PCI</span>
              </div>
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-secondary" />
                <span className="text-sm">54‑ФЗ: чек у ОФД (YooKassa)</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span className="text-sm">Отмена без штрафов</span>
              </div>
            </div>
          </Card>

          {/* Similar Tariffs */}
          {similarTariffs.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold">Другие тарифы</h3>
              <div className="space-y-4">
                {similarTariffs.slice(0, 2).map((similarTariff) => (
                  <div key={similarTariff.id} className="scale-90 origin-top">
                    <TariffCard 
                      tariff={similarTariff} 
                      period={period}
                      isPopular={popularTariffs.some(p => p.id === similarTariff.id)}
                    />
                  </div>
                ))}
              </div>
              <Link href="/tariffs">
                <Button variant="outline" className="w-full rounded-xl">
                  Посмотреть все тарифы
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
