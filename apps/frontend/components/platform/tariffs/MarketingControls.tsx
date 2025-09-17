// path: apps/frontend/components/platform/tariffs/MarketingControls.tsx
'use client'

import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { TagInput } from '@/components/ui/tag-input'
import { Star, Tag, Zap, TrendingUp, Gift, Sparkles } from 'lucide-react'

const BADGE_OPTIONS = [
  { value: '', label: '— Без бейджа —', icon: null },
  { value: 'popular', label: 'Популярный', icon: TrendingUp, color: 'text-blue-500' },
  { value: 'best_value', label: 'Лучшее предложение', icon: Star, color: 'text-amber-500' },
  { value: 'new', label: 'Новинка', icon: Sparkles, color: 'text-emerald-500' },
  { value: 'sale', label: 'Скидка', icon: Gift, color: 'text-rose-500' },
  { value: 'recommended', label: 'Рекомендован', icon: Zap, color: 'text-purple-500' },
  { value: 'hot', label: 'Хит продаж', icon: TrendingUp, color: 'text-orange-500' }
]

interface MarketingControlsProps {
  recommended: boolean
  badge: string
  tags: string[]
  highlight: boolean
  shelfPosition: string
  showcaseRank: string
  onRecommendedChange: (checked: boolean) => void
  onBadgeChange: (badge: string) => void
  onTagsChange: (tags: string[]) => void
  onHighlightChange: (checked: boolean) => void
  onShelfPositionChange: (position: string) => void
  onShowcaseRankChange: (rank: string) => void
  disabled?: boolean
}

export function MarketingControls({
  recommended,
  badge,
  tags,
  highlight,
  shelfPosition,
  showcaseRank,
  onRecommendedChange,
  onBadgeChange,
  onTagsChange,
  onHighlightChange,
  onShelfPositionChange,
  onShowcaseRankChange,
  disabled = false
}: MarketingControlsProps) {
  const selectedBadge = BADGE_OPTIONS.find(option => option.value === badge)
  
  return (
    <Card className="p-6 glass border-border/30 rounded-3xl">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-gradient-primary rounded-full" />
          <h3 className="text-lg font-semibold">Маркетинг и позиционирование</h3>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2">
          {/* Рекомендуемый тариф */}
          <div className="flex items-start gap-4 p-4 rounded-2xl glass-subtle border border-border/30">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-primary-subtle">
              <Star className="w-5 h-5 text-amber-500" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-sm">Рекомендуемый тариф</h4>
                  <p className="text-xs text-muted-foreground mt-1">Пометить как рекомендованный выбор</p>
                </div>
                <Switch 
                  checked={recommended}
                  onCheckedChange={onRecommendedChange}
                  disabled={disabled}
                  size="sm"
                />
              </div>
            </div>
          </div>
          
          {/* Витринная подсветка */}
          <div className="flex items-start gap-4 p-4 rounded-2xl glass-subtle border border-border/30">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-primary-subtle">
              <Zap className="w-5 h-5 text-purple-500" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-sm">Витринная подсветка</h4>
                  <p className="text-xs text-muted-foreground mt-1">Выделить тариф на главной странице</p>
                </div>
                <Switch 
                  checked={highlight}
                  onCheckedChange={onHighlightChange}
                  disabled={disabled}
                  size="sm"
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Бейдж */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-muted-foreground" />
            <label className="text-sm font-medium">Бейдж тарифа</label>
          </div>
          <select
            value={badge}
            onChange={(e) => onBadgeChange(e.target.value)}
            disabled={disabled}
            className="h-12 w-full rounded-2xl border border-input bg-background px-4 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {BADGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {selectedBadge && selectedBadge.value && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {selectedBadge.icon && <selectedBadge.icon className={`w-3 h-3 ${selectedBadge.color}`} />}
              Предпросмотр: <span className={`font-medium ${selectedBadge.color}`}>{selectedBadge.label}</span>
            </div>
          )}
        </div>
        
        {/* Теги */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-muted-foreground" />
            <label className="text-sm font-medium">Маркетинговые теги</label>
          </div>
          <TagInput
            value={tags}
            onChange={onTagsChange}
            placeholder="Добавить тег (например: выгодный, быстрый старт)"
            maxTags={10}
            disabled={disabled}
          />
          <p className="text-xs text-muted-foreground">
            Теги помогают клиентам быстрее найти подходящий тариф. Максимум 10 тегов.
          </p>
        </div>
        
        {/* Позиция на витрине */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <label className="text-sm font-medium">Позиция на витрине</label>
          </div>
          <Input
            type="number"
            value={shelfPosition}
            onChange={(e) => onShelfPositionChange(e.target.value)}
            placeholder="10"
            min={0}
            max={9999}
            disabled={disabled}
            className="rounded-2xl"
          />
          <p className="text-xs text-muted-foreground">
            Чем меньше число, тем выше тариф в списке. Оставьте пустым для автоматической сортировки.
          </p>
        </div>

        {/* Место в ТОП-3 */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <label className="text-sm font-medium">Место в ТОП‑3 (витрина)</label>
          </div>
          <select
            value={showcaseRank}
            onChange={(e) => onShowcaseRankChange(e.target.value)}
            disabled={disabled}
            className="h-12 w-full rounded-2xl border border-input bg-background px-4 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <option value="">— Не в ТОП‑3 —</option>
            <option value="1">1 место</option>
            <option value="2">2 место</option>
            <option value="3">3 место</option>
          </select>
          <p className="text-xs text-muted-foreground">
            Управляет блоком «Топ планы» на публичной витрине. Подсветка и бейджи не влияют на попадание в ТОП‑3.
          </p>
        </div>
      </div>
    </Card>
  )
}
