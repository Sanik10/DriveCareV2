// path: apps/frontend/components/security/qr-code-dialog.tsx
"use client"

import * as React from "react"
import { QrCode, Copy, Download, AlertCircle } from "lucide-react"
import { toast } from "sonner"

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

interface QRCodeDialogProps {
  isOpen: boolean
  onClose: () => void
  otpauthUrl: string
  secret: string
}

export function QRCodeDialog({ isOpen, onClose, otpauthUrl, secret }: QRCodeDialogProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const [qrLoading, setQrLoading] = React.useState(true)
  const [qrError, setQrError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!isOpen) {
      setQrLoading(true)
      setQrError(null)
      return
    }
    if (typeof window === "undefined") return

    let cancelled = false

    const waitForCanvas = async () => {
      for (let i = 0; i < 40 && !canvasRef.current; i++) {
        await new Promise((res) => setTimeout(res, 25))
      }
      return canvasRef.current
    }

    const generate = async () => {
      try {
        setQrError(null)
        setQrLoading(true)

        const canvas = await waitForCanvas()
        if (!canvas || cancelled) return

        if (!otpauthUrl) {
          setQrError("Пустой otpauthUrl")
          setQrLoading(false)
          return
        }

        const mod = await import("qrcode")
        const QR: any = (mod as any).default?.toCanvas ? (mod as any).default : (mod as any)

        await new Promise<void>((resolve, reject) => {
          QR.toCanvas(
            canvas,
            otpauthUrl,
            {
              width: 256,
              margin: 2,
              color: { dark: "#000000", light: "#FFFFFF" },
            },
            (error: Error | null | undefined) => (error ? reject(error) : resolve())
          )
        })

        if (!cancelled) setQrLoading(false)
      } catch (error) {
        console.error("QR generation failed:", error)
        if (!cancelled) {
          setQrError("Ошибка генерации QR-кода")
          toast.error("Ошибка генерации QR-кода")
          setQrLoading(false)
        }
      }
    }

    const timer = setTimeout(() => {
      if (!cancelled) generate()
    }, 0)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [isOpen, otpauthUrl])

  const copySecret = () => {
    navigator.clipboard.writeText(secret)
    toast.success("Секретный ключ скопирован")
  }

  const downloadQR = () => {
    if (!canvasRef.current) return
    try {
      const link = document.createElement("a")
      link.download = "drivecare-2fa-qr.png"
      link.href = canvasRef.current.toDataURL("image/png")
      link.click()
      toast.success("QR-код сохранён")
    } catch (error) {
      console.error("Download error:", error)
      toast.error("Ошибка сохранения QR-кода")
    }
  }

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
            <div className="h-10 w-10 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <QrCode className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle>Настройка 2FA</DialogTitle>
              <DialogDescription className="mt-xs">
                Отсканируйте QR-код в приложении-аутентификаторе или введите секретный ключ вручную.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex justify-center py-md">
          <div className="p-md bg-white rounded-md border border-border relative min-h-[264px] min-w-[264px]">
            {qrError ? (
              <div className="absolute inset-0 flex items-center justify-center bg-white rounded-md">
                <div className="flex flex-col items-center gap-sm p-md text-center">
                  <AlertCircle className="w-6 h-6 text-status-error" />
                  <span className="text-sm text-status-error">{qrError}</span>
                </div>
              </div>
            ) : (
              <>
                <canvas
                  ref={canvasRef}
                  width={256}
                  height={256}
                  className={qrLoading ? "opacity-0" : "opacity-100 transition-opacity duration-200"}
                />

                {qrLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/90 rounded-md">
                    <div className="flex flex-col items-center gap-sm">
                      <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      <span className="text-xs text-muted-foreground">Генерация QR-кода...</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-sm">
          <div className="text-xs text-muted-foreground">Секретный ключ (для ручного ввода)</div>
          <div className="flex items-start gap-sm">
            <div className="flex-1 p-sm bg-surface-2 rounded-md font-mono text-sm break-all border border-border">
              {secret}
            </div>
            <Button variant="ghost" size="icon" onClick={copySecret} title="Копировать ключ">
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="p-md rounded-md bg-surface-2 border border-border">
          <div className="text-sm font-medium text-foreground mb-sm">Инструкция</div>
          <ol className="text-sm text-muted-foreground space-y-xs list-decimal pl-lg">
            <li>Откройте приложение-аутентификатор (Google Authenticator, Authy и т.п.).</li>
            <li>Добавьте новый аккаунт.</li>
            <li>Отсканируйте QR-код или введите ключ вручную.</li>
            <li>Вернитесь назад и введите 6‑значный код.</li>
          </ol>
        </div>

        <DialogFooter className="mt-md">
          <div className="hidden sm:flex items-center text-xs text-muted-foreground mr-auto">
            <span className="mr-sm">Клавиши:</span>
            <Kbd>Esc</Kbd>
            <span className="ml-xs">— закрыть</span>
          </div>

          <Button variant="secondary" onClick={downloadQR} disabled={qrLoading || !!qrError}>
            <Download className="w-4 h-4 mr-xs" />
            Сохранить PNG
          </Button>

          <Button variant="primary" onClick={onClose}>
            Готово
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
