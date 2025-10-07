// path: apps/frontend/components/app/AppLayout.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { 
  Building2, 
  LayoutDashboard,
  Wrench, 
  Users, 
  Car, 
  Calendar, 
  FileText, 
  CreditCard,
  Shield,
  Package,
  Truck,
  Settings,
  Star,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  LogOut,
  User,
  UserCog
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/hooks/use-auth'
import { cn } from '@/lib/utils'
import { TariffBadge } from './TariffBadge'
import { getRoleLabel } from '@/lib/utils/role-labels'

interface SidebarItem {
  key: string
  label: string
  icon: typeof LayoutDashboard
  href: string
  badge?: string
  comingSoon?: boolean
  highlight?: boolean
  feature?: string
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  { key: 'dashboard', label: 'Дашборд', icon: LayoutDashboard, href: '/dashboard' },
  { 
    key: 'orders', 
    label: 'Заказы', 
    icon: Wrench, 
    href: '/dashboard/orders', 
    highlight: true,
    feature: 'Канбан-доска'
  },
  { 
    key: 'customers', 
    label: 'Клиенты', 
    icon: Users, 
    href: '/dashboard/customers',
    feature: 'Timeline история'
  },
  { 
    key: 'users', 
    label: 'Сотрудники', 
    icon: UserCog, 
    href: '/dashboard/users',
    feature: 'Роли и инвайты'
  },
  { 
    key: 'vehicles', 
    label: 'Автомобили', 
    icon: Car, 
    href: '/dashboard/vehicles',
    feature: 'ТО индикаторы'
  },
  { 
    key: 'appointments', 
    label: 'Записи', 
    icon: Calendar, 
    href: '/dashboard/appointments',
    feature: 'Календарная сетка'
  },
  { 
    key: 'invoices', 
    label: 'Счета', 
    icon: FileText, 
    href: '/dashboard/invoices',
    feature: 'Прогресс оплат'
  },
  { 
    key: 'payment-methods', 
    label: 'Способы оплаты', 
    icon: CreditCard, 
    href: '/dashboard/payment-methods',
    feature: 'Toggle переключатели'
  },
  { 
    key: 'security', 
    label: 'Безопасность', 
    icon: Shield, 
    href: '/dashboard/security',
    feature: 'QR-коды и 2FA'
  },
  { key: 'inventory', label: 'Склад', icon: Package, href: '/dashboard/inventory', comingSoon: true },
  { key: 'suppliers', label: 'Поставщики', icon: Truck, href: '/dashboard/suppliers', comingSoon: true },
  { key: 'settings', label: 'Настройки', icon: Settings, href: '/dashboard/settings', comingSoon: true },
]

const PLATFORM_ITEMS: SidebarItem[] = [
  { key: 'platform-tariffs', label: 'Тарифы (Admin)', icon: Star, href: '/platform/tariffs' },
]

interface AppLayoutProps {
  children: React.ReactNode
  title?: string
  description?: string
  icon?: typeof Building2
  actions?: React.ReactNode
}

export function AppLayout({ children, title, description, icon: IconComponent, actions }: AppLayoutProps) {
  const { user, logout, isAuthenticated } = useAuth()
  const pathname = usePathname()
  const router = useRouter()
  
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Auto-redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated && !pathname.startsWith('/login')) {
      router.push('/login')
    }
  }, [isAuthenticated, pathname, router])

  // Check if user is platform admin
  const isPlatformAdmin = user?.role?.name?.toLowerCase() === 'superadmin' || 
                          user?.role?.name?.toLowerCase() === 'platform_admin'

  const allItems = [...SIDEBAR_ITEMS, ...(isPlatformAdmin ? PLATFORM_ITEMS : [])]

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background (consistent with tariffs pages) */}
      <div
        className="fixed inset-0 -z-10"
        style={{
          background: `
            radial-gradient(ellipse 700px 500px at 20% 20%, rgba(99, 102, 241, 0.08) 0%, transparent 70%),
            radial-gradient(ellipse 600px 600px at 80% 30%, rgba(14, 165, 233, 0.06) 0%, transparent 70%),
            radial-gradient(ellipse 500px 400px at 50% 90%, rgba(168, 85, 247, 0.05) 0%, transparent 70%)
          `,
        }}
      />

      {/* Mobile backdrop */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed left-0 top-0 h-full bg-card/90 backdrop-blur-lg border-r border-border/30 transition-all duration-300 z-50",
        "flex flex-col",
        sidebarCollapsed ? "w-16" : "w-64",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Logo */}
        <div className="p-4 border-b border-border/30">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-primary shadow-glass group-hover:scale-105 transition-transform">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-gradient-primary">DriveCare</h1>
                <p className="text-xs text-muted-foreground truncate">CRM для автосервисов</p>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {allItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || 
                           (item.href !== '/dashboard' && pathname.startsWith(item.href))
            
            return (
              <Link
                key={item.key}
                href={item.comingSoon ? '#' : item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative",
                  "hover:bg-surface-1/60",
                  isActive && "bg-gradient-primary/10 text-primary border border-primary/20",
                  item.comingSoon && "opacity-60 cursor-not-allowed",
                  item.highlight && !isActive && "ring-1 ring-primary/20"
                )}
                onClick={(e) => {
                  if (item.comingSoon) {
                    e.preventDefault()
                  } else {
                    setMobileMenuOpen(false)
                  }
                }}
                title={item.feature ? `Фишка: ${item.feature}` : undefined}
              >
                <Icon className={cn(
                  "w-5 h-5 flex-shrink-0 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                )} />
                {!sidebarCollapsed && (
                  <>
                    <div className="flex-1 min-w-0">
                      <span className="font-medium truncate block">{item.label}</span>
                      {item.feature && !isActive && (
                        <span className="text-xs text-muted-foreground/80 truncate block">
                          {item.feature}
                        </span>
                      )}
                    </div>
                    {item.badge && (
                      <span className="ml-auto text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-full">
                        {item.badge}
                      </span>
                    )}
                    {item.comingSoon && (
                      <span className="ml-auto text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                        Скоро
                      </span>
                    )}
                  </>
                )}
                
                {/* Highlight glow for special items */}
                {(item.highlight || item.feature) && (
                  <div className="absolute -inset-1 bg-gradient-primary/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* User section */}
        <div className="p-2 border-t border-border/30">
          <div className={cn(
            "flex items-center gap-3 p-3 rounded-xl bg-surface-1/40",
            sidebarCollapsed && "justify-center"
          )}>
            <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-white" />
            </div>
            {!sidebarCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {getRoleLabel(user?.role?.name || 'viewer')}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Collapse toggle */}
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "absolute -right-3 top-20 w-6 h-6 rounded-full bg-card border border-border shadow-lg hidden lg:flex items-center justify-center",
            "hover:bg-surface-1 transition-all duration-200"
          )}
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-3 h-3" />
          ) : (
            <ChevronLeft className="w-3 h-3" />
          )}
        </Button>
      </aside>

      {/* Main content */}
      <div className={cn(
        "min-h-screen transition-all duration-300",
        sidebarCollapsed ? "lg:ml-16" : "lg:ml-64"
      )}>
        {/* Header */}
        <header className="sticky top-0 z-30 border-b border-border/30 backdrop-blur-lg bg-card/80">
          <div className="flex items-center justify-between px-4 lg:px-6 py-4">
            <div className="flex items-center gap-4">
              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </Button>

              {/* Page title */}
              {(title || IconComponent) && (
                <div className="flex items-center gap-3">
                  {IconComponent && (
                    <div className="p-2 rounded-lg bg-gradient-primary/20">
                      <IconComponent className="w-5 h-5 text-primary" />
                    </div>
                  )}
                  {title && (
                    <div>
                      <h1 className="text-xl font-bold">{title}</h1>
                      {description && (
                        <p className="text-xs text-muted-foreground">{description}</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Quick links */}
              <Link href="/tariffs">
                <Button variant="outline" className="rounded-2xl btn-outline-fixed hidden sm:flex">
                  Тарифы
                </Button>
              </Link>

              {/* Current plan badge */}
              <TariffBadge />

              {/* Actions */}
              {actions}

              {/* User menu */}
              <Button
                variant="ghost"
                onClick={logout}
                className="rounded-2xl btn-ghost-fixed transition-all duration-300 hover:scale-105"
              >
                <LogOut className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Выйти</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="relative">
          {children}
        </main>
      </div>

      {/* Mobile menu close overlay */}
      {mobileMenuOpen && (
        <Button
          variant="ghost"
          size="sm"
          className="fixed top-4 right-4 z-50 lg:hidden w-10 h-10 rounded-full bg-card border border-border shadow-lg"
          onClick={() => setMobileMenuOpen(false)}
        >
          <X className="w-5 h-5" />
        </Button>
      )}
    </div>
  )
}
