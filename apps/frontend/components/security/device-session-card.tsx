// path: apps/frontend/components/security/device-session-card.tsx
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { MapPin, Clock, LogOut, Shield } from 'lucide-react'
import type { SessionDevice } from '@/lib/types/security'

interface DeviceSessionCardProps {
  session: SessionDevice
  onLogout: () => void
  getDeviceIcon: (deviceType: string) => React.ComponentType<{ className?: string }>
  formatLastActive: (date: Date) => string
}

export function DeviceSessionCard({ 
  session, 
  onLogout, 
  getDeviceIcon, 
  formatLastActive 
}: DeviceSessionCardProps) {
  const DeviceIcon = getDeviceIcon(session.deviceInfo.type)
  
  return (
    <Card className={`p-4 transition-all hover:shadow-glass ${
      session.isCurrentDevice 
        ? 'bg-gradient-primary/5 border-primary/30' 
        : 'bg-surface-1/50 border-border/30'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
            session.isCurrentDevice 
              ? 'bg-primary/20 text-primary' 
              : 'bg-surface-2 text-muted-foreground'
          }`}>
            <DeviceIcon className="w-6 h-6" />
          </div>
          
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-medium">
                {session.deviceName}
              </h4>
              {session.isCurrentDevice && (
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-primary/20 text-primary rounded-full">
                  <Shield className="w-3 h-3" />
                  Это устройство
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
              <span className="flex items-center gap-1">
                <DeviceIcon className="w-3 h-3" />
                {session.deviceInfo.os} • {session.deviceInfo.browser}
              </span>
              
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {session.ipAddress}
              </span>
              
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formatLastActive(session.lastActive)}
              </span>
            </div>
          </div>
        </div>

        {!session.isCurrentDevice && (
          <Button
            variant="outline"
            size="sm"
            onClick={onLogout}
            className="text-destructive hover:bg-destructive/10 hover:border-destructive/30"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Отключить
          </Button>
        )}
      </div>
    </Card>
  )
}
