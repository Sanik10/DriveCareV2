// path: apps/frontend/components/security/qr-code-dialog.tsx
"use client"

import { useEffect, useRef, useState } from 'react'
import { QrCode, Copy, Download, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Kbd } from '@/components/ui/kbd'

interface QRCodeDialogProps {
  isOpen: boolean
  onClose: () => void
  otpauthUrl: string
  secret: string
}

export function QRCodeDialog({ isOpen, onClose, otpauthUrl, secret }: QRCodeDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [qrLoading, setQrLoading] = useState(true)
  const [qrError, setQrError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) {
      setQrLoading(true)
      setQrError(null)
      return
    }
    if (typeof window === 'undefined') return

    let cancelled = false

    const waitForCanvas = async () => {
      // Ждём пока canvas смонтируется в портале диалога
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
          setQrError('Пустой otpauthUrl')
          setQrLoading(false)
          return
        }

        const mod = await import('qrcode')
        // Совместимость с ESM/CJS вариантами экспорта
        const QR: any = (mod as any).default?.toCanvas ? (mod as any).default : (mod as any)

        await new Promise<void>((resolve, reject) => {
          QR.toCanvas(
            canvas,
            otpauthUrl,
            {
              width: 256,
              margin: 2,
              color: { dark: '#000000', light: '#FFFFFF' }
            },
            (error: Error | null | undefined) => (error ? reject(error) : resolve())
          )
        })

        if (!cancelled) {
          // console.log('QR Code generated successfully')
          setQrLoading(false)
        }
      } catch (error) {
        console.error('QR generation failed:', error)
        if (!cancelled) {
          setQrError('Ошибка генерации QR-кода')
          toast.error('Ошибка генерации QR-кода')
          setQrLoading(false)
        }
      }
    }

    // Чуть откладываем, чтобы портал диалога успел дорендериться
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
    toast.success('Секретный ключ скопирован')
  }

  const downloadQR = () => {
    if (canvasRef.current) {
      try {
        const link = document.createElement('a')
        link.download = 'drivecare-2fa-qr.png'
        link.href = canvasRef.current.toDataURL('image/png')
        link.click()
        toast.success('QR-код сохранен')
      } catch (error) {
        console.error('Download error:', error)
        toast.error('Ошибка сохранения QR-кода')
      }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent glow className="max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Настройка 2FA</DialogTitle>
              <DialogDescription>Отсканируйте QR-код в приложении аутентификатора</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* QR Code */}
        <div className="flex justify-center py-4">
          <div className="p-4 bg-white rounded-lg border border-border/50 relative min-h-[264px] min-w-[264px]">
            {qrError ? (
              <div className="absolute inset-0 flex items-center justify-center bg-white rounded-lg">
                <div className="flex flex-col items-center gap-2 p-4 text-center">
                  <AlertCircle className="w-8 h-8 text-destructive" />
                  <span className="text-sm text-destructive">{qrError}</span>
                </div>
              </div>
            ) : (
              <>
                {/* Canvas всегда рендерится для правильной инициализации */}
                <canvas
                  ref={canvasRef}
                  width={256}
                  height={256}
                  className={qrLoading ? 'opacity-0' : 'opacity-100 transition-opacity duration-300'}
                />

                {/* Overlay загрузки поверх canvas */}
                {qrLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/90 rounded-lg">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                      <span className="text-xs text-muted-foreground">Генерация QR-кода...</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Secret Key */}
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground mb-1">Секретный ключ (для ручного ввода)</div>
          <div className="flex gap-2">
            <div className="flex-1 p-2 bg-surface-1 rounded-lg font-mono text-sm break-all border border-border/50">
              {secret}
            </div>
            <Button variant="outline" size="sm" onClick={copySecret}>
              <Copy className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Instructions */}
        <div className="text-sm text-muted-foreground space-y-1 p-3 rounded-lg bg-muted/30">
          <p className="font-medium text-foreground">📱 Инструкция:</p>
          <p>1. Откройте Google Authenticator или Authy</p>
          <p>2. Нажмите "+" или "Добавить аккаунт"</p>
          <p>3. Выберите "Отсканировать QR-код" или введите ключ вручную</p>
          <p>4. Вернитесь сюда и введите 6-значный код</p>
        </div>

        <DialogFooter className="mt-4">
          <div className="hidden sm:flex items-center text-xs text-muted-foreground mr-auto">
            <span className="mr-2">Горячие клавиши:</span>
            <Kbd>Esc</Kbd>
            <span className="ml-1">— Закрыть</span>
          </div>
          <Button variant="outline" onClick={downloadQR} disabled={qrLoading || !!qrError}>
            <Download className="w-4 h-4 mr-2" />
            Сохранить QR
          </Button>
          <Button onClick={onClose}>Готово</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
