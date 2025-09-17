// path: apps/frontend/components/platform/tariffs/TariffForm.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { Tariff } from '@/lib/types/tariffs'
import { tariffsAPI } from '@/lib/api/tariffs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { FeatureSelector } from './FeatureSelector'
import { MarketingControls } from './MarketingControls'
import { Save, AlertCircle, Check, Calculator } from 'lucide-react'

type FormState = {
  name: string
  description: string
  priceMonthly: string
  priceYearly: string
  maxUsers: string
  maxCustomers: string
  maxVehicles: string
  maxOrders: string
  isActive: boolean
}

function extractFeaturesFromTariff(tariff?: Tariff | null): Record<string, boolean> {
  const features = tariff?.features || {}
  return {
    reports: Boolean(features.reports),
    analytics: Boolean(features.analytics),
    api_access: Boolean(features.api_access),
    priority_support: Boolean(features.priority_support),
    custom_fields: Boolean(features.custom_fields),
    integrations: Boolean(features.integrations),
    advanced_reports: Boolean(features.advanced_reports),
    white_label: Boolean(features.white_label)
  }
}

function extractMarketingFromTariff(tariff?: Tariff | null) {
  const features = tariff?.features || {}
  
  return {
    recommended: Boolean(features.recommended),
    badge: String(features.badge || ''),
    tags: Array.isArray(features.tags) ? features.tags.map(String) : [],
    highlight: Boolean(features.highlight),
    shelfPosition: features.shelf_position ? String(features.shelf_position) : '',
    showcaseRank: features.showcase_rank ? String(features.showcase_rank) : '',
  }
}

export function TariffForm({
  initial,
  onSaved,
}: {
  initial?: Tariff | null
  onSaved?: (tariff: Tariff) => void
}) {
  const [form, setForm] = useState<FormState>(() => ({
    name: initial?.name ?? '',
    description: initial?.description ?? '',
    priceMonthly: initial ? String(initial.priceMonthly) : '',
    priceYearly: initial ? String(initial.priceYearly) : '',
    maxUsers: initial?.maxUsers != null ? String(initial.maxUsers) : '',
    maxCustomers: initial?.maxCustomers != null ? String(initial.maxCustomers) : '',
    maxVehicles: initial?.maxVehicles != null ? String(initial.maxVehicles) : '',
    maxOrders: initial?.maxOrders != null ? String(initial.maxOrders) : '',
    isActive: initial?.isActive ?? true,
  }))

  const [features, setFeatures] = useState<Record<string, boolean>>(() => extractFeaturesFromTariff(initial))
  const [marketing, setMarketing] = useState(() => extractMarketingFromTariff(initial))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Пересинхронизация при изменении initial
  useEffect(() => {
    if (!initial) return
    
    setForm({
      name: initial.name ?? '',
      description: initial.description ?? '',
      priceMonthly: String(initial.priceMonthly ?? ''),
      priceYearly: String(initial.priceYearly ?? ''),
      maxUsers: initial.maxUsers != null ? String(initial.maxUsers) : '',
      maxCustomers: initial.maxCustomers != null ? String(initial.maxCustomers) : '',
      maxVehicles: initial.maxVehicles != null ? String(initial.maxVehicles) : '',
      maxOrders: initial.maxOrders != null ? String(initial.maxOrders) : '',
      isActive: initial.isActive ?? true,
    })
    setFeatures(extractFeaturesFromTariff(initial))
    setMarketing(extractMarketingFromTariff(initial))
  }, [initial])

  // Валидация формы
  const validation = useMemo(() => {
    const errors: string[] = []
    
    if (!form.name.trim()) errors.push('Название обязательно')
    if (!form.priceMonthly.trim() || Number(form.priceMonthly) < 0) errors.push('Цена за месяц должна быть положительной')
    if (!form.priceYearly.trim() || Number(form.priceYearly) < 0) errors.push('Цена за год должна быть положительной')
    
    const monthly = Number(form.priceMonthly)
    const yearly = Number(form.priceYearly)
    
    if (monthly > 0 && yearly > 0 && yearly > monthly * 12) {
      errors.push('Годовая цена не должна превышать месячную × 12')
    }
    
    return {
      isValid: errors.length === 0,
      errors
    }
  }, [form])

  // Расчёт скидки
  const yearlyDiscount = useMemo(() => {
    const monthly = Number(form.priceMonthly)
    const yearly = Number(form.priceYearly)
    
    if (monthly > 0 && yearly > 0) {
      const discount = Math.round(((monthly * 12 - yearly) / (monthly * 12)) * 100)
      return discount > 0 ? discount : 0
    }
    return 0
  }, [form.priceMonthly, form.priceYearly])

  const handleSubmit = async () => {
    if (!validation.isValid || submitting) return
    
    setError(null)
    setSuccess(false)
    setSubmitting(true)

    try {
      // Собираем все features в один объект
      const allFeatures: Record<string, unknown> = {
        ...features,
        recommended: marketing.recommended,
        badge: marketing.badge || undefined,
        tags: marketing.tags.length > 0 ? marketing.tags : undefined,
        highlight: marketing.highlight,
        shelf_position: marketing.shelfPosition ? Number(marketing.shelfPosition) : undefined,
        showcase_rank: marketing.showcaseRank ? Number(marketing.showcaseRank) : undefined,
      }

      // Удаляем undefined значения
      Object.keys(allFeatures).forEach(key => {
        if (allFeatures[key] === undefined) {
          delete allFeatures[key]
        }
      })

      const payload = {
        name: form.name.trim(),
        description: form.description?.trim() || undefined,
        priceMonthly: Number(form.priceMonthly),
        priceYearly: Number(form.priceYearly),
        maxUsers: form.maxUsers ? Number(form.maxUsers) : undefined,
        maxCustomers: form.maxCustomers ? Number(form.maxCustomers) : undefined,
        maxVehicles: form.maxVehicles ? Number(form.maxVehicles) : undefined,
        maxOrders: form.maxOrders ? Number(form.maxOrders) : undefined,
        features: allFeatures,
        isActive: form.isActive,
      }

      let saved: Tariff
      if (initial) {
        saved = await tariffsAPI.update(initial.id, payload)
      } else {
        saved = await tariffsAPI.create(payload)
      }
      
      setSuccess(true)
      onSaved?.(saved)
      
      setTimeout(() => setSuccess(false), 3000)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      setError(msg || 'Не удалось сохранить тариф')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Основная информация */}
      <Card className="p-6 glass border-border/30 rounded-3xl">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-gradient-primary rounded-full" />
            <h3 className="text-lg font-semibold">Основная информация</h3>
            <Switch 
              checked={form.isActive}
              onCheckedChange={(checked) => setForm(f => ({ ...f, isActive: checked }))}
              size="sm"
            />
            <span className="text-sm text-muted-foreground">
              {form.isActive ? 'Активен' : 'Неактивен'}
            </span>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Название тарифа</label>
              <Input 
                value={form.name}
                onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Например: Стандарт"
                className="rounded-2xl"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Краткое описание</label>
              <Input 
                value={form.description}
                onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Для небольших автосервисов"
                className="rounded-2xl"
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Ценообразование */}
      <Card className="p-6 glass border-border/30 rounded-3xl">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-gradient-primary rounded-full" />
            <h3 className="text-lg font-semibold">Ценообразование</h3>
            <Calculator className="w-5 h-5 text-muted-foreground" />
          </div>
          
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Цена за месяц (₽)</label>
              <Input 
                type="number"
                value={form.priceMonthly}
                onChange={(e) => setForm(f => ({ ...f, priceMonthly: e.target.value }))}
                placeholder="2500"
                min={0}
                className="rounded-2xl"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Цена за год (₽)</label>
              <Input 
                type="number"
                value={form.priceYearly}
                onChange={(e) => setForm(f => ({ ...f, priceYearly: e.target.value }))}
                placeholder="25000"
                min={0}
                className="rounded-2xl"
              />
              {yearlyDiscount > 0 && (
                <p className="text-xs text-emerald-600 font-medium">
                  💰 Экономия {yearlyDiscount}% при годовой оплате
                </p>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Лимиты */}
      <Card className="p-6 glass border-border/30 rounded-3xl">
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-gradient-primary rounded-full" />
            <h3 className="text-lg font-semibold">Лимиты ресурсов</h3>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Максимум пользователей</label>
              <Input 
                type="number"
                value={form.maxUsers}
                onChange={(e) => setForm(f => ({ ...f, maxUsers: e.target.value }))}
                placeholder="Безлимит"
                min={1}
                className="rounded-2xl"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Максимум клиентов</label>
              <Input 
                type="number"
                value={form.maxCustomers}
                onChange={(e) => setForm(f => ({ ...f, maxCustomers: e.target.value }))}
                placeholder="Безлимит"
                min={1}
                className="rounded-2xl"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Максимум ТС</label>
              <Input 
                type="number"
                value={form.maxVehicles}
                onChange={(e) => setForm(f => ({ ...f, maxVehicles: e.target.value }))}
                placeholder="Безлимит"
                min={1}
                className="rounded-2xl"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Максимум заказов</label>
              <Input 
                type="number"
                value={form.maxOrders}
                onChange={(e) => setForm(f => ({ ...f, maxOrders: e.target.value }))}
                placeholder="Безлимит"
                min={1}
                className="rounded-2xl"
              />
            </div>
          </div>
          
          <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
            <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-600 leading-relaxed">
              Оставьте поле пустым для безлимитного использования ресурса.
            </p>
          </div>
        </div>
      </Card>

      {/* Функциональные возможности */}
      <FeatureSelector 
        features={features}
        onChange={setFeatures}
        disabled={submitting}
      />

      {/* Маркетинг */}
      <MarketingControls 
        recommended={marketing.recommended}
        badge={marketing.badge}
        tags={marketing.tags}
        highlight={marketing.highlight}
        shelfPosition={marketing.shelfPosition}
        showcaseRank={marketing.showcaseRank}
        onRecommendedChange={(checked) => setMarketing(m => ({ ...m, recommended: checked }))}
        onBadgeChange={(badge) => setMarketing(m => ({ ...m, badge }))}
        onTagsChange={(tags) => setMarketing(m => ({ ...m, tags }))}
        onHighlightChange={(checked) => setMarketing(m => ({ ...m, highlight: checked }))}
        onShelfPositionChange={(position) => setMarketing(m => ({ ...m, shelfPosition: position }))}
        onShowcaseRankChange={(rank) => setMarketing(m => ({ ...m, showcaseRank: rank }))}
        disabled={submitting}
      />

      {/* Ошибки и успех */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-destructive/10 border border-destructive/20">
          <AlertCircle className="w-5 h-5 text-destructive" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 animate-in slide-in-from-top-2 duration-300">
          <Check className="w-5 h-5 text-emerald-600" />
          <p className="text-sm text-emerald-600 font-medium">Тариф успешно сохранён!</p>
        </div>
      )}

      {/* Ошибки валидации */}
      {!validation.isValid && (
        <div className="space-y-2">
          {validation.errors.map((err, index) => (
            <div key={index} className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="w-4 h-4" />
              {err}
            </div>
          ))}
        </div>
      )}

      {/* Кнопка сохранения */}
      <div className="flex justify-end">
        <Button 
          onClick={handleSubmit}
          disabled={!validation.isValid || submitting}
          size="lg"
          className="px-8 rounded-2xl bg-gradient-primary hover:opacity-90 font-medium"
        >
          {submitting ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Сохранение...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Save className="w-4 h-4" />
              {initial ? 'Сохранить изменения' : 'Создать тариф'}
            </div>
          )}
        </Button>
      </div>
    </div>
  )
}
