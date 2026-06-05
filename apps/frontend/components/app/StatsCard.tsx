// path: apps/frontend/components/app/StatsCard.tsx
import type { LucideIcon } from "lucide-react"
import * as React from "react"

import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface StatsCardProps {
  title: string
  value: number | string
  icon: LucideIcon
  trend?: { value: number; label: string }
  suffix?: string
  meta?: React.ReactNode
  className?: string
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  suffix,
  meta,
  className,
}: StatsCardProps) {
  return (
    <Card className={cn("h-[124px] w-full p-lg", className)}>
      <div className="flex h-full flex-col min-w-0">
        <div className="flex items-center justify-between gap-md min-w-0">
          <span className="text-sm font-medium text-muted-foreground truncate">{title}</span>
          <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>

        <div className="mt-auto min-w-0">
          <div className="flex items-baseline gap-xs text-2xl font-bold tracking-tight text-foreground tabular-nums min-w-0">
            <span className="truncate">{value}</span>
            {suffix && (
              <span className="text-sm font-medium text-muted-foreground shrink-0">{suffix}</span>
            )}
          </div>

          {/* meta row reserved ALWAYS */}
          <div className="mt-xs min-h-4 flex items-center justify-between gap-md text-xs min-w-0">
            <div className="flex items-center gap-xs min-w-0">
              {trend ? (
                <>
                  <span
                    className={cn(
                      "font-medium tabular-nums shrink-0",
                      trend.value >= 0 ? "text-status-active" : "text-status-error"
                    )}
                  >
                    {trend.value >= 0 ? "+" : ""}
                    {trend.value}%
                  </span>
                  <span className="text-muted-foreground truncate">{trend.label}</span>
                </>
              ) : (
                <span className="text-muted-foreground">&nbsp;</span>
              )}
            </div>

            {meta ? (
              <div className="text-muted-foreground truncate max-w-[55%]">{meta}</div>
            ) : (
              <span className="text-muted-foreground">&nbsp;</span>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}

export function StatsGrid({
  children,
  cols = 4,
}: {
  children: React.ReactNode
  cols?: 2 | 4 | 6
}) {
  return (
    <div
      className={cn(
        "grid gap-lg mb-xl w-full",
        cols === 2 && "grid-cols-1 md:grid-cols-2",
        cols === 4 && "grid-cols-2 md:grid-cols-4",
        cols === 6 && "grid-cols-2 md:grid-cols-3 lg:grid-cols-6"
      )}
    >
      {children}
    </div>
  )
}
