import * as React from "react"
import type { LucideIcon } from "lucide-react"
import { RefreshCw } from "lucide-react"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger"

interface PageContentCardProps {
  children: React.ReactNode
  loading?: boolean
  error?: string | null
  empty?: boolean
  emptyState?: {
    icon: LucideIcon
    title: string
    description: string
    action?: {
      label: string
      onClick: () => void
      icon?: LucideIcon
      variant?: ButtonVariant
    }
  }
  onRetry?: () => void
  loadingRows?: number

  /** внешний контейнер (Card) */
  className?: string

  /** классы на контейнер children */
  contentClassName?: string

  /**
   * card (default) — обычная карточка с фоном/бордером
   * ghost — без подложки (убирает "серый фон" за grid карточками)
   */
  containerVariant?: "card" | "ghost"
}

export function PageContentCard({
  children,
  loading,
  error,
  empty,
  emptyState,
  onRetry,
  loadingRows = 6,
  className,
  contentClassName,
  containerVariant = "card",
}: PageContentCardProps) {
  const containerClasses =
    containerVariant === "ghost"
      ? cn(
          // убираем визуальную "подложку"
          "border-0 bg-transparent shadow-none",
          // чтобы не клипались ховеры/фокусы у внутренних карточек
          "overflow-visible"
        )
      : "overflow-hidden"

  return (
    <Card className={cn(containerClasses, className)}>
      {loading ? (
        <div className="flex flex-col gap-sm p-xl">
          {Array.from({ length: loadingRows }).map((_, i) => (
            <div key={i} className="h-12 bg-surface-2 rounded-md animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center p-section text-center">
          <div className="p-md rounded-full bg-status-error/10 text-status-error mb-md border border-status-error/20">
            <RefreshCw className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-xs">Ошибка загрузки данных</h3>
          <p className="text-sm text-muted-foreground mb-lg max-w-sm">{error}</p>
          {onRetry && (
            <Button variant="secondary" onClick={onRetry}>
              <RefreshCw className="w-4 h-4 mr-xs" />
              Повторить
            </Button>
          )}
        </div>
      ) : empty && emptyState ? (
        <div className="flex flex-col items-center justify-center p-section text-center">
          <div className="p-md rounded-full bg-surface-2 text-muted-foreground mb-md border border-border">
            <emptyState.icon className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-xs">{emptyState.title}</h3>
          <p className="text-sm text-muted-foreground mb-lg max-w-sm">{emptyState.description}</p>
          {emptyState.action && (
            <Button variant={emptyState.action.variant || "primary"} onClick={emptyState.action.onClick}>
              {emptyState.action.icon ? <emptyState.action.icon className="w-4 h-4 mr-xs" /> : null}
              {emptyState.action.label}
            </Button>
          )}
        </div>
      ) : (
        <div className={cn("w-full", contentClassName)}>{children}</div>
      )}
    </Card>
  )
}
