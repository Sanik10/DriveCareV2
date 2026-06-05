// path: apps/frontend/components/security/logout-confirm-dialog.tsx
import * as React from "react"
import { AlertTriangle, LogOut, Smartphone } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"

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
  isAllDevices = false,
}: LogoutConfirmDialogProps) {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-start gap-md">
            <div className="h-10 w-10 rounded-md bg-status-error/10 border border-status-error/20 flex items-center justify-center text-status-error shrink-0">
              {isAllDevices ? <LogOut className="h-5 w-5" /> : <Smartphone className="h-5 w-5" />}
            </div>

            <div className="min-w-0">
              <DialogTitle>{isAllDevices ? "Выйти на всех устройствах?" : "Отключить устройство?"}</DialogTitle>
              <DialogDescription className="mt-xs">
                {isAllDevices ? (
                  <>Вы будете отключены от всех устройств, включая текущее. Потребуется повторная авторизация.</>
                ) : (
                  <>
                    Устройство <strong>«{deviceName}»</strong> будет отключено. Для входа на нём потребуется
                    авторизация.
                  </>
                )}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-md rounded-md bg-status-pending/10 border border-status-pending/20">
          <div className="flex items-start gap-sm">
            <AlertTriangle className="w-4 h-4 text-status-pending mt-[2px] shrink-0" />
            <div className="text-sm text-foreground">
              <strong>Внимание:</strong>{" "}
              {isAllDevices
                ? "действие нельзя отменить. После выхода потребуется войти снова."
                : "действие нельзя отменить."}
            </div>
          </div>
        </div>

        <DialogFooter className="mt-md">
          <div className="hidden sm:flex items-center text-xs text-muted-foreground mr-auto">
            <span className="mr-sm">Горячие клавиши:</span>
            <Kbd>Esc</Kbd>
            <span className="ml-xs">— закрыть</span>
          </div>

          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>

          <Button variant="danger" onClick={onConfirm}>
            <LogOut className="w-4 h-4 mr-xs" />
            {isAllDevices ? "Выйти везде" : "Отключить"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
