// path: apps/frontend/components/platform/NavigationHeader.tsx
'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Home, LayoutDashboard } from 'lucide-react'
import { useAuth } from '@/lib/hooks/use-auth'
import { getMarketingHomeUrl } from '@/lib/site'

interface NavigationHeaderProps {
  title: string
  subtitle?: string
  backHref?: string
  backLabel?: string
  showDashboard?: boolean
  actions?: React.ReactNode
}

export function NavigationHeader({ 
  title, 
  subtitle, 
  backHref, 
  backLabel = "Назад",
  showDashboard = true,
  actions 
}: NavigationHeaderProps) {
  const { user } = useAuth()
  const homeUrl = getMarketingHomeUrl()
  const role = user?.role?.name?.toLowerCase()
  const canAccessDashboard = user && role !== 'superadmin' && role !== 'platform_admin'
  
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
            
            {showDashboard && canAccessDashboard && (
              <Link href="/dashboard">
                <Button size="sm" variant="outline" className="rounded-xl btn-outline-fixed">
                  <LayoutDashboard className="w-4 h-4" />
                  Дашборд
                </Button>
              </Link>
            )}
            
            {backHref && (
              <Link href={backHref}>
                <Button size="sm" variant="outline" className="rounded-xl btn-outline-fixed">
                  <ArrowLeft className="w-4 h-4" />
                  {backLabel}
                </Button>
              </Link>
            )}
          </div>
          
          {/* Заголовок */}
          <div className="flex items-center gap-3">
            <div className="w-1 h-8 bg-gradient-primary rounded-full" />
            <div>
              <h1 className="text-2xl font-bold text-gradient-primary">{title}</h1>
              {subtitle && (
                <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
              )}
            </div>
          </div>
        </div>
        
        {/* Действия */}
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}
