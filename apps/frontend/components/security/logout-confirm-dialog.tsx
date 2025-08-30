// path: apps/frontend/components/security/logout-confirm-dialog.tsx
import { AlertTriangle, LogOut, Smartphone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface LogoutConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  deviceName?: string
  isAllDevices?: boolean
}

export function LogoutConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  deviceName,
  isAllDevices = false
}: LogoutConfirmDialogProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Dialog */}
      <Card className="relative p-6 max-w-md w-full backdrop-blur-sm bg-card/90 border-border/50">
        <div className="space-y-6">
          {/* Icon */}
          <div className="w-12 h-12 rounded-lg bg-destructive/20 flex items-center justify-center mx-auto">
            {isAllDevices ? (
              <LogOut className="w-6 h-6 text-destructive" />
            ) : (
              <Smartphone className="w-6 h-6 text-destructive" />
            )}
          </div>

          {/* Content */}
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold">
              {isAllDevices ? 'Выйти на всех устройствах?' : 'Отключить устройство?'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {isAllDevices ? (
                <>
                  Вы будете отключены от всех устройств, включая текущее. 
                  Потребуется повторная авторизация.
                </>
              ) : (
                <>
                  Устройство <strong>&ldquo;{deviceName}&rdquo;</strong> будет отключено 
                  и потребуется повторная авторизация на нем.
                </>
              )}
            </p>
          </div>

          {/* Warning */}
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5" />
              <div className="text-sm text-amber-600 dark:text-amber-500">
                <strong>Внимание:</strong> {isAllDevices 
                  ? 'Это действие нельзя отменить. Вы будете перенаправлены на страницу входа.'
                  : 'Это действие нельзя отменить.'
                }
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Отмена
            </Button>
            <Button variant="destructive" onClick={onConfirm} className="flex-1">
              <LogOut className="w-4 h-4 mr-2" />
              {isAllDevices ? 'Выйти везде' : 'Отключить'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
