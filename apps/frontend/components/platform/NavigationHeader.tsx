// path: apps/frontend/components/platform/NavigationHeader.tsx
"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeft, Home, LayoutDashboard } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/hooks/use-auth"
import { getMarketingHomeUrl } from "@/lib/site"

interface NavigationHeaderProps {
  title: string
  subtitle?: string
  icon?: React.ReactNode
  backHref?: string
  backLabel?: string
  showDashboard?: boolean
  actions?: React.ReactNode
}

export function NavigationHeader({
  title,
  subtitle,
  icon,
  backHref,
  backLabel = "Назад",
  showDashboard = true,
  actions,
}: NavigationHeaderProps) {
  const { user } = useAuth()
  const homeUrl = getMarketingHomeUrl()

  // Без хитрой ролевой логики в хедере: если пользователь есть — дашборд показываем.
  // (Если нужно иначе — лучше централизованно решать в роутинге/guard)
  const canAccessDashboard = Boolean(user)

  return (
    <div className="flex flex-col gap-md mb-section min-w-0">
      {/* Верхний ряд: навигация */}
      <nav className="flex items-center gap-sm text-muted-foreground min-w-0" aria-label="Навигация">
        <Button size="sm" variant="ghost" className="h-8 px-sm" asChild>
          <Link href={homeUrl} className="flex items-center gap-xs">
            <Home className="w-4 h-4" />
            Домой
          </Link>
        </Button>

        {showDashboard && canAccessDashboard && (
          <>
            <span className="text-muted-foreground/40 select-none">/</span>
            <Button size="sm" variant="ghost" className="h-8 px-sm" asChild>
              <Link href="/dashboard" className="flex items-center gap-xs">
                <LayoutDashboard className="w-4 h-4" />
                Дашборд
              </Link>
            </Button>
          </>
        )}

        {backHref && (
          <>
            <span className="text-muted-foreground/40 select-none">/</span>
            <Button size="sm" variant="ghost" className="h-8 px-sm" asChild>
              <Link href={backHref} className="flex items-center gap-xs">
                <ArrowLeft className="w-4 h-4" />
                {backLabel}
              </Link>
            </Button>
          </>
        )}
      </nav>

      {/* Основной ряд: [Иконка] Заголовок + Описание + Действия */}
      <div className="flex items-start justify-between gap-xl min-w-0">
        <div className="flex items-start gap-md min-w-0">
          {icon && (
            <div className="p-sm bg-surface-2 rounded-md border text-muted-foreground shrink-0">
              {icon}
            </div>
          )}

          <div className="flex flex-col min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {title}
            </h1>
            {subtitle && <p className="text-sm text-muted-foreground mt-xs">{subtitle}</p>}
          </div>
        </div>

        {actions && (
          <div className="flex items-center gap-sm shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}
