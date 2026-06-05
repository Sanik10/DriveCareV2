// path: apps/frontend/components/customers/CustomerTimeline.tsx
"use client"

import * as React from "react"
import Link from "next/link"
import {
  Calendar,
  Wrench,
  Car,
  Edit3,
  Phone,
  Mail,
  FileText,
  CreditCard,
  MessageSquare,
  Clock,
  ChevronDown,
  ChevronRight,
} from "lucide-react"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { TimelineEvent, TimelineEventStatus, TimelineEventType } from "@/lib/types/customers"

interface TimelineGroup {
  monthKey: string
  monthLabel: string
  events: TimelineEvent[]
}

const EVENT_ICONS: Record<TimelineEventType, React.ComponentType<{ className?: string }>> = {
  order: Wrench,
  vehicle: Car,
  profile: Edit3,
  call: Phone,
  email: Mail,
  payment: CreditCard,
  invoice: FileText,
  note: MessageSquare,
  appointment: Calendar,
}

// Привязка к 5 системным статус-цветам DS v1.1:
// active (green), pending (yellow), progress (blue), error (red), draft (gray)
const STATUS_STYLES: Record<TimelineEventStatus, { label: string; className: string }> = {
  success: {
    label: "Успешно",
    className: "bg-status-active/10 text-status-active border-status-active/20",
  },
  warning: {
    label: "Ожидание",
    className: "bg-status-pending/10 text-status-pending border-status-pending/20",
  },
  info: {
    label: "В работе",
    className: "bg-status-progress/10 text-status-progress border-status-progress/20",
  },
  error: {
    label: "Ошибка",
    className: "bg-status-error/10 text-status-error border-status-error/20",
  },
}

interface CustomerTimelineProps {
  events: TimelineEvent[]
  loading?: boolean
  className?: string
}

export function CustomerTimeline({ events, loading, className }: CustomerTimelineProps) {
  const [collapsedMonths, setCollapsedMonths] = React.useState<Set<string>>(new Set())

  const groupedEvents = React.useMemo(() => {
    const groups: Record<string, TimelineGroup> = {}

    ;(events || [])
      .slice()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .forEach((event) => {
        const date = new Date(event.date)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
        const monthLabel = date.toLocaleDateString("ru-RU", { year: "numeric", month: "long" })

        if (!groups[monthKey]) {
          groups[monthKey] = {
            monthKey,
            monthLabel: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
            events: [],
          }
        }

        groups[monthKey].events.push(event)
      })

    return Object.values(groups).sort((a, b) => b.monthKey.localeCompare(a.monthKey))
  }, [events])

  const toggleMonth = (monthKey: string) => {
    setCollapsedMonths((prev) => {
      const next = new Set(prev)
      if (next.has(monthKey)) next.delete(monthKey)
      else next.add(monthKey)
      return next
    })
  }

  if (loading) {
    return (
      <Card className={cn("p-lg", className)}>
        <div className="flex items-center justify-between gap-md">
          <div className="flex items-center gap-sm">
            <div className="w-10 h-10 rounded-md bg-surface-2 border flex items-center justify-center">
              <Calendar className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground">История</div>
              <div className="text-xs text-muted-foreground mt-xs">События по клиенту</div>
            </div>
          </div>
        </div>

        <div className="mt-lg space-y-md">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-start gap-md">
              <Skeleton className="w-10 h-10 rounded-md" />
              <div className="flex-1 min-w-0">
                <Skeleton className="h-4 w-[260px] max-w-full" />
                <Skeleton className="h-3 w-[420px] max-w-full mt-sm" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    )
  }

  if (!events || events.length === 0) {
    return (
      <Card className={cn("p-section text-center", className)}>
        <div className="mx-auto mb-md w-10 h-10 rounded-md bg-surface-2 border flex items-center justify-center">
          <Calendar className="w-4 h-4 text-muted-foreground" />
        </div>
        <h3 className="text-sm font-semibold text-foreground mb-xs">История пуста</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Здесь будут отображаться заказы, записи, счета и другие взаимодействия с клиентом.
        </p>
      </Card>
    )
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      {/* Header */}
      <div className="p-lg border-b border-border">
        <div className="flex items-center justify-between gap-md min-w-0">
          <div className="flex items-center gap-sm min-w-0">
            <div className="w-10 h-10 rounded-md bg-surface-2 border flex items-center justify-center shrink-0">
              <Calendar className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground">История</div>
              <div className="text-xs text-muted-foreground mt-xs truncate">Все события по клиенту</div>
            </div>
          </div>

          <div className="text-xs text-muted-foreground shrink-0">{events.length} событий</div>
        </div>
      </div>

      {/* Groups */}
      <div className="divide-y divide-border/50">
        {groupedEvents.map((group) => {
          const isCollapsed = collapsedMonths.has(group.monthKey)
          const visibleCount = 4
          const visibleEvents = isCollapsed ? group.events.slice(0, visibleCount) : group.events
          const hiddenCount = Math.max(0, group.events.length - visibleEvents.length)

          return (
            <div key={group.monthKey} className="p-lg">
              <div className="flex items-center justify-between gap-md min-w-0">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground truncate">{group.monthLabel}</div>
                  <div className="text-xs text-muted-foreground mt-xs">{group.events.length} событий</div>
                </div>

                {group.events.length > visibleCount && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-sm"
                    onClick={() => toggleMonth(group.monthKey)}
                  >
                    {isCollapsed ? (
                      <>
                        Показать все <ChevronDown className="w-4 h-4" />
                      </>
                    ) : (
                      <>
                        Свернуть <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                )}
              </div>

              <div className="mt-md divide-y divide-border/50 rounded-md border border-border overflow-hidden">
                {visibleEvents.map((event) => (
                  <TimelineEventRow key={event.id} event={event} />
                ))}

                {hiddenCount > 0 && isCollapsed && (
                  <div className="px-md py-sm text-xs text-muted-foreground bg-surface-2">
                    Скрыто событий: {hiddenCount}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

function TimelineEventRow({ event }: { event: TimelineEvent }) {
  const Icon = EVENT_ICONS[event.type]
  const hasLink = Boolean(event.relatedId)

  const status = event.status as TimelineEventStatus | undefined
  const statusStyle = status ? STATUS_STYLES[status] : null

  const content = (
    <div className="px-md py-md flex items-start justify-between gap-md min-w-0 transition-colors hover:bg-surface-2">
      <div className="flex items-start gap-md min-w-0 flex-1">
        <div className="w-10 h-10 rounded-md bg-surface-2 border flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-sm min-w-0">
            <div className="text-sm font-medium text-foreground truncate">{event.title}</div>

            {statusStyle && (
              <span
                className={cn(
                  "shrink-0 inline-flex items-center rounded-md border px-sm py-[2px] text-[11px] font-medium",
                  statusStyle.className
                )}
              >
                {statusStyle.label}
              </span>
            )}

            {typeof event.amount === "number" && (
              <span className="shrink-0 inline-flex items-center rounded-md border border-border px-sm py-[2px] text-[11px] text-muted-foreground tabular-nums">
                {event.amount.toLocaleString("ru-RU")} ₽
              </span>
            )}
          </div>

          {event.description && (
            <div className="text-xs text-muted-foreground mt-xs line-clamp-2">{event.description}</div>
          )}

          <div className="mt-sm inline-flex items-center gap-xs text-xs text-muted-foreground">
            <Clock className="w-3.5 h-3.5" />
            {new Date(event.date).toLocaleDateString("ru-RU", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
      </div>

      {hasLink && <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-[2px]" />}
    </div>
  )

  if (!hasLink) return content

  return (
    <Link href={getEventLink(event)} className="block">
      {content}
    </Link>
  )
}

function getEventLink(event: TimelineEvent): string {
  switch (event.type) {
    case "order":
      return `/dashboard/orders/${event.relatedId}`
    case "vehicle":
      return `/dashboard/vehicles/${event.relatedId}`
    case "invoice":
      return `/dashboard/invoices/${event.relatedId}`
    case "payment":
      return `/dashboard/payments/${event.relatedId}`
    case "appointment":
      return `/dashboard/appointments/${event.relatedId}`
    default:
      return "#"
  }
}
