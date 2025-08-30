// path: apps/frontend/components/security/qr-code-dialog.tsx
"use client"

import { useEffect, useRef } from 'react'
import { QrCode, Copy, Download } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface QRCodeDialogProps {
  isOpen: boolean
  onClose: () => void
  otpauthUrl: string
  secret: string
}

export function QRCodeDialog({ isOpen, onClose, otpauthUrl, secret }: QRCodeDialogProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (isOpen && canvasRef.current && typeof window !== 'undefined') {
      // Динамический импорт qrcode библиотеки
      import('qrcode').then((QRCodeLib) => {
        QRCodeLib.default.toCanvas(canvasRef.current!, otpauthUrl, {
          width: 256,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        }, (error: Error | null | undefined) => {
          if (error) {
            console.error('QR Code generation error:', error)
            toast.error('Ошибка генерации QR-кода')
          }
        })
      }).catch((error: unknown) => {
        console.error('QR Code import error:', error)
        toast.error('Ошибка загрузки QR-кода')
      })
    }
  }, [isOpen, otpauthUrl])

  const copySecret = () => {
    navigator.clipboard.writeText(secret)
    toast.success('Секретный ключ скопирован')
  }

  const downloadQR = () => {
    if (canvasRef.current) {
      const link = document.createElement('a')
      link.download = 'drivecare-2fa-qr.png'
      link.href = canvasRef.current.toDataURL()
      link.click()
      toast.success('QR-код сохранен')
    }
  }

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
          {/* Header */}
          <div className="text-center">
            <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mx-auto mb-4">
              <QrCode className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Настройка 2FA</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Отсканируйте QR-код в приложении аутентификатора
            </p>
          </div>

          {/* QR Code */}
          <div className="flex justify-center">
            <div className="p-4 bg-white rounded-lg">
              <canvas ref={canvasRef} />
            </div>
          </div>

          {/* Secret Key */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Секретный ключ (для ручного ввода):</label>
            <div className="flex gap-2">
              <div className="flex-1 p-2 bg-surface-1 rounded-lg font-mono text-sm break-all">
                {secret}
              </div>
              <Button variant="outline" size="sm" onClick={copySecret}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Instructions */}
          <div className="text-sm text-muted-foreground space-y-1">
            <p><strong>Инструкция:</strong></p>
            <p>1. Откройте Google Authenticator или Authy</p>
            <p>2. Нажмите &ldquo;+&rdquo; или &ldquo;Добавить аккаунт&rdquo;</p>
            <p>3. Выберите &ldquo;Отсканировать QR-код&rdquo; или введите ключ вручную</p>
            <p>4. Вернитесь сюда и введите 6-значный код</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={downloadQR} className="flex-1">
              <Download className="w-4 h-4 mr-2" />
              Сохранить QR
            </Button>
            <Button onClick={onClose} className="flex-1">
              Готово
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
