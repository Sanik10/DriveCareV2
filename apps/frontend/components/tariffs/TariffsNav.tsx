// path: apps/frontend/components/tariffs/TariffsNav.tsx
'use client'

import Link from 'next/link'
import { getMarketingHomeUrl } from '@/lib/site'
import { useAuth } from '@/lib/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Home, LayoutDashboard, Settings, ShoppingCart } from 'lucide-react'

export function TariffsNav() {
  const { user } = useAuth()
  const homeUrl = getMarketingHomeUrl()
  const role = user?.role?.name?.toLowerCase()
  const isPlatform = role === 'superadmin' || role === 'platform_admin'
  const canAccessDashboard = user && !isPlatform

  return (
    <div className="glass-subtle border border-border/30 rounded-3xl p-6 mb-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Навигационные кнопки */}
          <div className="flex items-center gap-2">
            <Link href={homeUrl}>
              <Button size="sm" variant="outline" className="rounded-xl btn-outline-fixed">
                <Home className="w-4 h-4" />
                Домой
              </Button>
            </Link>
            
            {canAccessDashboard && (
              <Link href="/dashboard">
                <Button size="sm" variant="outline" className="rounded-xl btn-outline-fixed">
                  <LayoutDashboard className="w-4 h-4" />
                  Дашборд
                </Button>
              </Link>
            )}
            
            {isPlatform && (
              <Link href="/platform/tariffs">
                <Button size="sm" variant="outline" className="rounded-xl btn-outline-fixed">
                  <Settings className="w-4 h-4" />
                  Управление
                </Button>
              </Link>
            )}
          </div>
          
          {/* Заголовок */}
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 bg-gradient-primary rounded-full" />
            <div>
              <h1 className="text-2xl font-bold text-gradient-primary">Тарифы DriveCare</h1>
              <p className="text-sm text-muted-foreground mt-1">Выберите подходящий план для вашего автосервиса</p>
            </div>
          </div>
        </div>
        
        {/* Быстрые ссылки */}
        <div className="flex items-center gap-2">
          <Link href="/tariffs/compare">
            <Button size="sm" variant="outline" className="rounded-xl btn-outline-fixed">
              Сравнить
            </Button>
          </Link>
          <Link href="/tariffs">
            <Button size="sm" className="rounded-xl bg-gradient-primary hover:opacity-90">
              <ShoppingCart className="w-4 h-4" />
              Выбрать план
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
