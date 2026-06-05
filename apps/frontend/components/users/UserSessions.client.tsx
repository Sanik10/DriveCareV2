// path: apps/frontend/components/users/UserSessions.client.tsx
"use client"

import * as React from "react"
import { Wifi, WifiOff, MonitorSmartphone, Clock } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { listUserSessions, type AdminUserSession } from "@/lib/api/user-sessions"

function isOnline(sessions: AdminUserSession[], windowMs = 2 * 60 * 1000) {
  const now = Date.now()
  return sessions.some((s) => {
    if (!s.isActive) return false
    const ts = s.lastUsedAt ? new Date(s.lastUsedAt).getTime() : new Date(s.createdAt).getTime()
    return now - ts <= windowMs
  })
}

export default function UserSessions({
  userId,
  compact = false,
  pollIntervalMs = 60_000,
}: {
  userId: string
  compact?: boolean
  pollIntervalMs?: number
}) {
  const [sessions, setSessions] = React.useState<AdminUserSession[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    let mounted = true

    async function load() {
      try {
        const list = await listUserSessions(userId)
        if (mounted) setSessions(list)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    void load()

    const t = setInterval(() => void load(), pollIntervalMs)
    return () => {
      mounted = false
      clearInterval(t)
    }
  }, [userId, pollIntervalMs])

  const online = React.useMemo(() => isOnline(sessions), [sessions])

  const OnlineBadge = online ? (
    <Badge variant="active" className="gap-xs">
      <Wifi className="w-3.5 h-3.5" />
      Онлайн
    </Badge>
  ) : (
    <Badge variant="draft" className="gap-xs">
      <WifiOff className="w-3.5 h-3.5" />
      Оффлайн
    </Badge>
  )

  if (compact) return OnlineBadge

  return (
    <Card className="p-xl space-y-md">
      <div className="flex items-center gap-sm">{OnlineBadge}</div>

      <div className="space-y-sm">
        {loading && <div className="text-sm text-muted-foreground">Загрузка сессий…</div>}
        {!loading && sessions.length === 0 && <div className="text-sm text-muted-foreground">Сессий нет</div>}

        {sessions.slice(0, 5).map((s) => (
          <div key={s.id} className="flex items-center justify-between gap-lg text-sm min-w-0">
            <div className="flex items-center gap-sm min-w-0">
              <MonitorSmartphone className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="truncate">{s.deviceName || s.deviceId}</span>
              <span className="text-muted-foreground truncate">({s.ipAddress})</span>
            </div>

            <div className="flex items-center gap-xs text-muted-foreground shrink-0">
              <Clock className="w-3.5 h-3.5" />
              <span title={s.lastUsedAt || s.createdAt}>
                {new Date(s.lastUsedAt || s.createdAt).toLocaleString("ru-RU")}
              </span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
