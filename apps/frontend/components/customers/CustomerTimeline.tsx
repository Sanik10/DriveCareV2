// path: apps/frontend/components/customers/CustomerTimeline.tsx
'use client'

import { useState, useMemo } from 'react'
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
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import Link from 'next/link'

export interface TimelineEvent {
  id: string
  type: 'order' | 'vehicle' | 'profile' | 'call' | 'email' | 'note' | 'payment' | 'invoice'
  title: string
  description?: string
  date: string
  status?: 'success' | 'warning' | 'error' | 'info'
  amount?: number
  relatedId?: string // ID связанной сущности для ссылок
  metadata?: Record<string, unknown>
}

interface TimelineGroup {
  monthKey: string
  monthLabel: string
  events: TimelineEvent[]
}

const EVENT_CONFIG = {
  order: {
    icon: Wrench,
    bgColor: 'bg-primary/10',
    iconColor: 'text-primary',
    borderColor: 'border-primary/20'
  },
  vehicle: {
    icon: Car,
    bgColor: 'bg-emerald-500/10',
    iconColor: 'text-emerald-500',
    borderColor: 'border-emerald-500/20'
  },
  profile: {
    icon: Edit3,
    bgColor: 'bg-secondary/10',
    iconColor: 'text-secondary',
    borderColor: 'border-secondary/20'
  },
  call: {
    icon: Phone,
    bgColor: 'bg-accent/10',
    iconColor: 'text-accent',
    borderColor: 'border-accent/20'
  },
  email: {
    icon: Mail,
    bgColor: 'bg-blue-500/10',
    iconColor: 'text-blue-500',
    borderColor: 'border-blue-500/20'
  },
  payment: {
    icon: CreditCard,
    bgColor: 'bg-green-500/10',
    iconColor: 'text-green-500',
    borderColor: 'border-green-500/20'
  },
  invoice: {
    icon: FileText,
    bgColor: 'bg-purple-500/10',
    iconColor: 'text-purple-500',
    borderColor: 'border-purple-500/20'
  },
  note: {
    icon: MessageSquare,
    bgColor: 'bg-muted/50',
    iconColor: 'text-muted-foreground',
    borderColor: 'border-border'
  }
} as const

const STATUS_CONFIG = {
  success: { icon: CheckCircle, color: 'text-emerald-500' },
  warning: { icon: AlertTriangle, color: 'text-amber-500' },
  error: { icon: AlertTriangle, color: 'text-destructive' },
  info: { icon: TrendingUp, color: 'text-blue-500' }
} as const

interface CustomerTimelineProps {
  events: TimelineEvent[]
  loading?: boolean
  className?: string
}

export function CustomerTimeline({ events, loading, className }: CustomerTimelineProps) {
  const [collapsedMonths, setCollapsedMonths] = useState<Set<string>>(new Set())

  const groupedEvents = useMemo(() => {
    const groups: Record<string, TimelineGroup> = {}
    
    events
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .forEach(event => {
        const date = new Date(event.date)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        const monthLabel = date.toLocaleDateString('ru-RU', { 
          year: 'numeric', 
          month: 'long' 
        })

        if (!groups[monthKey]) {
          groups[monthKey] = {
            monthKey,
            monthLabel: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
            events: []
          }
        }
        groups[monthKey].events.push(event)
      })

    return Object.values(groups).sort((a, b) => b.monthKey.localeCompare(a.monthKey))
  }, [events])

  const toggleMonth = (monthKey: string) => {
    const newCollapsed = new Set(collapsedMonths)
    if (newCollapsed.has(monthKey)) {
      newCollapsed.delete(monthKey)
    } else {
      newCollapsed.add(monthKey)
    }
    setCollapsedMonths(newCollapsed)
  }

  if (loading) {
    return (
      <div className={cn("space-y-4", className)}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="h-6 bg-surface-1/40 rounded-xl animate-pulse w-32" />
            <div className="space-y-2">
              {[...Array(2)].map((_, j) => (
                <div key={j} className="flex gap-3">
                  <div className="w-10 h-10 bg-surface-1/40 rounded-full animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-surface-1/40 rounded animate-pulse" />
                    <div className="h-3 bg-surface-1/40 rounded animate-pulse w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <Card className={cn("p-8 text-center glass border-border/30 rounded-3xl", className)}>
        <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
        <h3 className="font-semibold mb-2">История пуста</h3>
        <p className="text-sm text-muted-foreground">
          Здесь будут отображаться все взаимодействия с клиентом
        </p>
      </Card>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Timeline Feature Badge */}
      <Card className="p-4 glass border-accent/20 bg-gradient-to-r from-accent/5 to-primary/5 rounded-3xl">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-r from-accent to-primary">
            <Calendar className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-accent">Интерактивная временная шкала</h3>
            <p className="text-sm text-muted-foreground">
              Полная история взаимодействий с клиентом. Кликните для перехода к деталям.
            </p>
          </div>
          <div className="ml-auto">
            <TrendingUp className="w-6 h-6 text-primary" />
          </div>
        </div>
      </Card>

      {/* Timeline */}
      <div className="relative">
        {/* Main timeline line */}
        <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary/40 via-secondary/30 to-accent/20" />

        <div className="space-y-8">
          {groupedEvents.map((group) => {
            const isCollapsed = collapsedMonths.has(group.monthKey)
            const visibleEvents = isCollapsed ? group.events.slice(0, 2) : group.events
            
            return (
              <div key={group.monthKey} className="relative">
                {/* Month header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center relative z-10 shadow-glass">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 flex items-center justify-between">
                    <h3 className="font-semibold text-lg">{group.monthLabel}</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleMonth(group.monthKey)}
                      className="gap-2 text-muted-foreground hover:text-foreground"
                    >
                      {isCollapsed ? (
                        <>Показать все ({group.events.length}) <ChevronDown className="w-4 h-4" /></>
                      ) : (
                        <>Свернуть <ChevronRight className="w-4 h-4" /></>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Events */}
                <div className="space-y-4 ml-2">
                  {visibleEvents.map((event) => {
                    const config = EVENT_CONFIG[event.type]
                    const Icon = config.icon
                    const StatusIcon = event.status ? STATUS_CONFIG[event.status].icon : null
                    
                    return (
                      <div key={event.id} className="relative flex gap-4 group">
                        {/* Event icon */}
                        <div className={cn(
                          "w-8 h-8 rounded-full border-2 flex items-center justify-center relative z-10 transition-all duration-300",
                          config.bgColor,
                          config.borderColor,
                          "group-hover:scale-110 group-hover:shadow-lg"
                        )}>
                          <Icon className={cn("w-4 h-4", config.iconColor)} />
                        </div>

                        {/* Event content */}
                        <Card className={cn(
                          "flex-1 p-4 glass border-border/30 rounded-2xl transition-all duration-300",
                          "group-hover:shadow-glass-lg group-hover:-translate-y-0.5",
                          event.relatedId && "cursor-pointer"
                        )}>
                          <EventContent event={event} StatusIcon={StatusIcon} />
                        </Card>
                      </div>
                    )
                  })}

                  {/* Show more indicator */}
                  {isCollapsed && group.events.length > 2 && (
                    <div className="relative flex gap-4">
                      <div className="w-8 h-8 rounded-full border-2 border-dashed border-muted/50 flex items-center justify-center">
                        <div className="w-2 h-2 bg-muted/50 rounded-full" />
                      </div>
                      <div className="flex-1 text-sm text-muted-foreground py-2">
                        Ещё {group.events.length - 2} событий...
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function EventContent({ 
  event, 
  StatusIcon 
}: { 
  event: TimelineEvent
  StatusIcon?: React.ComponentType<{ className?: string }> 
}) {
  const EventWrapper = event.relatedId ? Link : 'div'
  const eventProps = event.relatedId ? { href: getEventLink(event) } : {}

  return (
    <EventWrapper {...eventProps} className="block">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium truncate">{event.title}</h4>
            {StatusIcon && (
              <StatusIcon className={cn(
                "w-4 h-4",
                event.status ? STATUS_CONFIG[event.status].color : 'text-muted-foreground'
              )} />
            )}
          </div>
          
          {event.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {event.description}
            </p>
          )}

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {new Date(event.date).toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
            
            {event.amount && (
              <Badge variant="outline" className="text-xs px-2 py-0.5">
                {event.amount.toLocaleString('ru-RU')} ₽
              </Badge>
            )}
          </div>
        </div>

        {event.relatedId && (
          <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <Badge variant="outline" className="text-xs">
              Открыть
            </Badge>
          </div>
        )}
      </div>
    </EventWrapper>
  )
}

function getEventLink(event: TimelineEvent): string {
  switch (event.type) {
    case 'order':
      return `/dashboard/orders/${event.relatedId}`
    case 'vehicle':
      return `/dashboard/vehicles/${event.relatedId}`
    case 'invoice':
      return `/dashboard/invoices/${event.relatedId}`
    case 'payment':
      return `/dashboard/payments/${event.relatedId}`
    default:
      return '#'
  }
}
