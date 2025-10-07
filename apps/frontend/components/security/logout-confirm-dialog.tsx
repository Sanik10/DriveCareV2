// path: apps/frontend/components/security/logout-confirm-dialog.tsx
import { AlertTriangle, LogOut, Smartphone } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/kbd'

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
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent glow className="max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-destructive/20 flex items-center justify-center text-destructive">
              {isAllDevices ? <LogOut className="h-5 w-5" /> : <Smartphone className="h-5 w-5" />}
            </div>
            <div>
              <DialogTitle>{isAllDevices ? 'Выйти на всех устройствах?' : 'Отключить устройство?'}</DialogTitle>
              <DialogDescription>
                {isAllDevices ? (
                  <>Вы будете отключены от всех устройств, включая текущее. Потребуется повторная авторизация.</>
                ) : (
                  <>
                    Устройство <strong>"{deviceName}"</strong> будет отключено и потребуется повторная авторизация на нем.
                  </>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Warning */}
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-amber-600 dark:text-amber-500">
              <strong>Внимание:</strong> {isAllDevices 
                ? 'Это действие нельзя отменить. Вы будете перенаправлены на страницу входа.'
                : 'Это действие нельзя отменить.'
              }
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <div className="hidden sm:flex items-center text-xs text-muted-foreground mr-auto">
            <span className="mr-2">Горячие клавиши:</span>
            <Kbd>Esc</Kbd>
            <span className="ml-1">— Закрыть</span>
          </div>
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            <LogOut className="w-4 h-4 mr-2" />
            {isAllDevices ? 'Выйти везде' : 'Отключить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
