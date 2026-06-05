// path: apps/frontend/components/security/device-session-card.tsx
import * as React from "react"
import { LogOut, Shield } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { SessionDevice } from "@/lib/types/security"

interface DeviceSessionCardProps {
  session: SessionDevice
  onLogout: () => void
  getDeviceIcon: (deviceType: string) => React.ComponentType<{ className?: string }>
  formatLastActive: (date: Date) => string
}

export function DeviceSessionCard({ session, onLogout, getDeviceIcon, formatLastActive }: DeviceSessionCardProps) {
  const DeviceIcon = getDeviceIcon(session.deviceInfo.type)

  const metaParts: string[] = []
  if (session.deviceInfo?.os || session.deviceInfo?.browser) {
    metaParts.push([session.deviceInfo.os, session.deviceInfo.browser].filter(Boolean).join(" • "))
  }
  if (session.ipAddress) metaParts.push(session.ipAddress)
  if (session.lastActive) metaParts.push(formatLastActive(session.lastActive))

  return (
    <div
      className={cn(
        "p-md flex items-center justify-between gap-lg min-w-0",
        "transition-colors hover:bg-surface-2",
        session.isCurrentDevice && "bg-primary/5"
      )}
    >
      <div className="flex items-center gap-md min-w-0 flex-1">
        <div
          className={cn(
            "w-10 h-10 rounded-md border flex items-center justify-center shrink-0",
            session.isCurrentDevice ? "bg-primary/10 border-primary/20" : "bg-surface-2 border-border"
          )}
        >
          <DeviceIcon className={cn("w-4 h-4", session.isCurrentDevice ? "text-primary" : "text-muted-foreground")} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-sm min-w-0">
            <span className="text-sm font-medium truncate">{session.deviceName}</span>

            {session.isCurrentDevice && (
              <Badge variant="active" className="shrink-0">
                <Shield className="w-3.5 h-3.5 mr-xs" />
                Текущее
              </Badge>
            )}
          </div>

          <div className="text-xs text-muted-foreground truncate mt-xs">
            {metaParts.length ? metaParts.join(" · ") : "—"}
          </div>
        </div>
      </div>

      {!session.isCurrentDevice && (
        <Button variant="danger" size="sm" onClick={onLogout}>
          <LogOut className="w-4 h-4 mr-xs" />
          Отключить
        </Button>
      )}
    </div>
  )
}
