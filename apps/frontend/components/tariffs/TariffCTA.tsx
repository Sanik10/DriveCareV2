// path: apps/frontend/components/tariffs/TariffCTA.tsx
'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowRight, Shield, Clock, Headphones } from 'lucide-react'
import Link from 'next/link'

export function TariffCTA() {
  return (
    <Card className="relative overflow-hidden glass border-border/30 rounded-3xl">
      {/* Background gradient */}
      <div 
        className="absolute inset-0 -z-10"
        style={{
          background: `
            radial-gradient(ellipse 600px 400px at 50% 50%, rgba(99, 102, 241, 0.08) 0%, transparent 50%),
            radial-gradient(ellipse 400px 300px at 20% 20%, rgba(14, 165, 233, 0.06) 0%, transparent 50%),
            radial-gradient(ellipse 500px 400px at 80% 80%, rgba(168, 85, 247, 0.05) 0%, transparent 50%)
          `,
        }}
      />
      
      <div className="relative p-12 text-center space-y-8">
        <div className="space-y-4">
          <h2 className="text-4xl font-bold text-gradient-primary">
            Начните использовать DriveCare уже сегодня
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Присоединяйтесь к тысячам автосервисов, которые уже оптимизировали свою работу с помощью нашей платформы
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center mx-auto">
              <Clock className="w-6 h-6 text-blue-500" />
            </div>
            <h3 className="font-semibold">Быстрый старт</h3>
            <p className="text-sm text-muted-foreground">
              Настройка и запуск за 15 минут
            </p>
          </div>
          
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center mx-auto">
              <Shield className="w-6 h-6 text-emerald-500" />
            </div>
            <h3 className="font-semibold">Безопасность данных</h3>
            <p className="text-sm text-muted-foreground">
              Соответствие 152-ФЗ и международным стандартам
            </p>
          </div>
          
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 flex items-center justify-center mx-auto">
              <Headphones className="w-6 h-6 text-purple-500" />
            </div>
            <h3 className="font-semibold">Поддержка 24/7</h3>
            <p className="text-sm text-muted-foreground">
              Всегда готовы помочь на русском языке
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link href="/auth/register">
            <Button 
              size="lg" 
              className="px-8 py-4 rounded-2xl bg-gradient-primary hover:opacity-90 hover:scale-105 transition-all duration-300 font-semibold text-lg group"
            >
              Начать бесплатно
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          
          <Link href="/tariffs/compare">
            <Button 
              size="lg" 
              variant="outline" 
              className="px-8 py-4 rounded-2xl btn-outline-fixed font-semibold"
            >
              Сравнить тарифы
            </Button>
          </Link>
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>Кредитная карта не требуется • Отмена в любое время</p>
          <p>30-дневная гарантия возврата средств</p>
        </div>
      </div>
    </Card>
  )
}
