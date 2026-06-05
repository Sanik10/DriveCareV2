// path: apps/frontend/components/app/AppLayout.tsx
"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import type { LucideIcon } from "lucide-react"
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
  UserCog,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/hooks/use-auth"
import { cn } from "@/lib/utils"
import { TariffBadge } from "./TariffBadge"
import { getRoleLabel } from "@/lib/utils/role-labels"

interface SidebarItem {
  key: string
  label: string
  icon: LucideIcon
  href: string
  badge?: string
  comingSoon?: boolean
  highlight?: boolean
  feature?: string
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  { key: "dashboard", label: "Дашборд", icon: LayoutDashboard, href: "/dashboard" },
  { key: "orders", label: "Заказы", icon: Wrench, href: "/dashboard/orders", highlight: true },
  { key: "customers", label: "Клиенты", icon: Users, href: "/dashboard/customers" },
  { key: "users", label: "Сотрудники", icon: UserCog, href: "/dashboard/users" },
  { key: "vehicles", label: "Автомобили", icon: Car, href: "/dashboard/vehicles" },
  { key: "services", label: "Услуги", icon: Building2, href: "/dashboard/services" },
  { key: "appointments", label: "Записи", icon: Calendar, href: "/dashboard/appointments" },
  { key: "invoices", label: "Счета", icon: FileText, href: "/dashboard/invoices" },
  { key: "payment-methods", label: "Способы оплаты", icon: CreditCard, href: "/dashboard/payment-methods" },
  { key: "security", label: "Безопасность", icon: Shield, href: "/dashboard/security" },
  { key: "inventory", label: "Склад", icon: Package, href: "/dashboard/inventory", comingSoon: true },
  { key: "suppliers", label: "Поставщики", icon: Truck, href: "/dashboard/suppliers", comingSoon: true },
  { key: "settings", label: "Настройки", icon: Settings, href: "/dashboard/settings", comingSoon: true },
]

const PLATFORM_ITEMS: SidebarItem[] = [
  { key: "platform-tariffs", label: "Тарифы (Admin)", icon: Star, href: "/platform/tariffs" },
]

interface AppLayoutProps {
  children: React.ReactNode
  actions?: React.ReactNode
}

export function AppLayout({ children, actions }: AppLayoutProps) {
  const { user, logout, isAuthenticated } = useAuth()
  const pathname = usePathname()
  const router = useRouter()

  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)

  React.useEffect(() => {
    if (!isAuthenticated && !pathname.startsWith("/login")) {
      router.push("/login")
    }
  }, [isAuthenticated, pathname, router])

  const role = user?.role?.name?.toLowerCase()
  const isPlatformAdmin = role === "superadmin" || role === "platform_admin"
  const allItems = [...SIDEBAR_ITEMS, ...(isPlatformAdmin ? PLATFORM_ITEMS : [])]

  if (!isAuthenticated) return null

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Mobile backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-full z-50",
          "bg-card border-r border-border",
          "flex flex-col",
          "transition-all duration-200",
          sidebarCollapsed ? "w-16" : "w-64",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="p-lg border-b border-border">
          <Link href="/dashboard" className="flex items-center gap-md">
            <div className="flex items-center justify-center w-9 h-9 rounded-md bg-primary text-primary-foreground border border-border">
              <Building2 className="w-4 h-4" />
            </div>

            {!sidebarCollapsed && (
              <div className="min-w-0">
                <div className="text-sm font-semibold leading-none">DriveCare</div>
                <div className="text-xs text-muted-foreground truncate mt-xs">
                  CRM для автосервисов
                </div>
              </div>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-sm space-y-xs overflow-y-auto">
          {allItems.map((item) => {
            const Icon = item.icon
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href))

            return (
              <Link
                key={item.key}
                href={item.comingSoon ? "#" : item.href}
                className={cn(
                  "flex items-center gap-md px-md h-10 rounded-md border",
                  "transition-colors",
                  "border-transparent hover:bg-surface-2",
                  isActive && "bg-primary/10 border-primary/20",
                  item.comingSoon && "opacity-60 cursor-not-allowed",
                  item.highlight && !isActive && "border-border/60"
                )}
                onClick={(e) => {
                  if (item.comingSoon) {
                    e.preventDefault()
                  } else {
                    setMobileMenuOpen(false)
                  }
                }}
                title={item.feature ? item.feature : undefined}
              >
                <Icon
                  className={cn(
                    "w-4 h-4 shrink-0",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                />

                {!sidebarCollapsed && (
                  <>
                    <span className="text-sm font-medium truncate flex-1">
                      {item.label}
                    </span>

                    {item.comingSoon && (
                      <Badge variant="draft" className="shrink-0">
                        Скоро
                      </Badge>
                    )}

                    {item.badge && (
                      <Badge variant="secondary" className="shrink-0">
                        {item.badge}
                      </Badge>
                    )}
                  </>
                )}
              </Link>
            )
          })}
        </nav>

        {/* User section */}
        <div className="p-sm border-t border-border">
          <div
            className={cn(
              "flex items-center gap-md p-md rounded-md bg-surface-2",
              sidebarCollapsed && "justify-center"
            )}
          >
            <div className="w-8 h-8 rounded-md bg-surface-1 border flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-muted-foreground" />
            </div>

            {!sidebarCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-muted-foreground truncate mt-xs">
                  {getRoleLabel(user?.role?.name || "viewer")}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Collapse toggle (desktop) */}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "absolute -right-3 top-[72px] hidden lg:flex",
            "h-7 w-7 rounded-full bg-card border border-border shadow-card"
          )}
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          title={sidebarCollapsed ? "Развернуть" : "Свернуть"}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </Button>
      </aside>

      {/* Main content */}
      <div
        className={cn(
          "min-h-screen transition-[margin] duration-200",
          sidebarCollapsed ? "lg:ml-16" : "lg:ml-64"
        )}
      >
        {/* Topbar */}
        <header className="sticky top-0 z-30 border-b border-border bg-background">
          <div className="h-14 px-lg flex items-center justify-between">
            <div className="flex items-center gap-md">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setMobileMenuOpen(true)}
                title="Меню"
              >
                <Menu className="w-4 h-4" />
              </Button>

              <span className="text-sm font-medium text-muted-foreground">
                Workspace
              </span>
            </div>

            <div className="flex items-center gap-sm">
              {/* Тарифы */}
              <Button variant="secondary" size="sm" className="hidden sm:inline-flex" asChild>
                <Link href="/tariffs">Тарифы</Link>
              </Button>

              <TariffBadge />

              {actions}

              <Button variant="ghost" size="sm" onClick={logout}>
                <LogOut className="w-4 h-4 mr-xs" />
                <span className="hidden sm:inline">Выйти</span>
              </Button>
            </div>
          </div>
        </header>

        <main className="relative min-w-0">{children}</main>
      </div>

      {/* Mobile close button */}
      {mobileMenuOpen && (
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-lg right-lg z-50 lg:hidden bg-card border border-border shadow-card"
          onClick={() => setMobileMenuOpen(false)}
          title="Закрыть"
        >
          <X className="w-4 h-4" />
        </Button>
      )}
    </div>
  )
}
