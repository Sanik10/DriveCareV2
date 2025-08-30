// path: apps/frontend/components/security/two-factor-auth-card.tsx
"use client"

import { useState } from 'react'
import { Shield, AlertTriangle, CheckCircle, Key, Copy } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { securityAPI } from '@/lib/api/security'
import type { TwoFASetupResponse } from '@/lib/types/security'
import { QRCodeDialog } from './qr-code-dialog'

interface TwoFactorAuthCardProps {
  enabled: boolean
  onStatusChange: (enabled: boolean) => void
}

interface ApiError {
  message: string
  statusCode?: number
}

export function TwoFactorAuthCard({ enabled, onStatusChange }: TwoFactorAuthCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [setupData, setSetupData] = useState<TwoFASetupResponse | null>(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [showQRDialog, setShowQRDialog] = useState(false)

  const handleSetup = async () => {
    try {
      setIsLoading(true)
      const data = await securityAPI.setup2FA()
      setSetupData(data)
      setShowQRDialog(true)
    } catch (error: unknown) {
      console.error('Ошибка настройки 2FA:', error)
      try {
        const errorData = JSON.parse((error as Error).message) as ApiError
        toast.error(errorData.message || 'Ошибка настройки 2FA')
      } catch {
        toast.error('Ошибка настройки 2FA')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleEnable = async () => {
    if (!setupData || !verificationCode) {
      toast.error('Введите код подтверждения')
      return
    }

    try {
      setIsLoading(true)
      await securityAPI.enable2FA({
        code: verificationCode,
        secret: setupData.secret
      })
      
      onStatusChange(true)
      setSetupData(null)
      setVerificationCode('')
      setShowQRDialog(false)
      toast.success('Двухфакторная аутентификация включена')
    } catch (error: unknown) {
      console.error('Ошибка включения 2FA:', error)
      try {
        const errorData = JSON.parse((error as Error).message) as ApiError
        toast.error(errorData.message || 'Неверный код подтверждения')
      } catch {
        toast.error('Неверный код подтверждения')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisable = async () => {
    if (!verificationCode) {
      toast.error('Введите код подтверждения')
      return
    }

    try {
      setIsLoading(true)
      await securityAPI.disable2FA({ code: verificationCode })
      
      onStatusChange(false)
      setVerificationCode('')
      toast.success('Двухфакторная аутентификация отключена')
    } catch (error: unknown) {
      console.error('Ошибка отключения 2FA:', error)
      try {
        const errorData = JSON.parse((error as Error).message) as ApiError
        toast.error(errorData.message || 'Неверный код подтверждения')
      } catch {
        toast.error('Неверный код подтверждения')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const copySecret = () => {
    if (setupData?.secret) {
      navigator.clipboard.writeText(setupData.secret)
      toast.success('Секретный ключ скопирован')
    }
  }

  return (
    <>
      <Card className="p-6 backdrop-blur-sm bg-card/80 border-border/50">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Двухфакторная аутентификация
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Дополнительный уровень защиты вашего аккаунта
              </p>
            </div>
            
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              enabled 
                ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
            }`}>
              {enabled ? (
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-4 h-4" />
                  Включена
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4" />
                  Отключена
                </span>
              )}
            </div>
          </div>

          {/* Setup Flow */}
          {!enabled && setupData && (
            <div className="space-y-4 p-4 rounded-lg bg-surface-1/50 border border-border/30">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                <h4 className="font-medium">Настройка 2FA</h4>
              </div>
              
              <div className="text-sm text-muted-foreground space-y-2">
                <p>1. Откройте приложение аутентификатора (Google Authenticator, Authy)</p>
                <p>2. Отсканируйте QR-код или введите секретный ключ вручную</p>
                <p>3. Введите 6-значный код из приложения для подтверждения</p>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setShowQRDialog(true)}
                  className="flex-1"
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Показать QR-код
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={copySecret}
                  className="flex-1"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Копировать ключ
                </Button>
              </div>

              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Введите 6-значный код"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  className="flex-1"
                />
                <Button 
                  onClick={handleEnable}
                  disabled={isLoading || verificationCode.length !== 6}
                >
                  Включить
                </Button>
              </div>
            </div>
          )}

          {/* Enable/Disable Actions */}
          <div className="flex gap-3">
            {!enabled ? (
              <Button
                onClick={handleSetup}
                disabled={isLoading}
                className="bg-gradient-primary hover:opacity-90"
              >
                <Shield className="w-4 h-4 mr-2" />
                Настроить 2FA
              </Button>
            ) : (
              <div className="flex gap-2 w-full">
                <Input
                  type="text"
                  placeholder="Код из приложения для отключения"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  className="flex-1"
                />
                <Button
                  variant="destructive"
                  onClick={handleDisable}
                  disabled={isLoading || verificationCode.length !== 6}
                >
                  Отключить
                </Button>
              </div>
            )}
          </div>

          {/* Benefits */}
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5" />
              <div>
                <div className="font-medium">Защита от взлома</div>
                <div className="text-muted-foreground">Даже если пароль скомпрометирован</div>
              </div>
            </div>
            
            <div className="flex items-start gap-2">
              <Key className="w-4 h-4 text-blue-500 mt-0.5" />
              <div>
                <div className="font-medium">Локальная генерация</div>
                <div className="text-muted-foreground">Коды создаются на вашем устройстве</div>
              </div>
            </div>
            
            <div className="flex items-start gap-2">
              <Shield className="w-4 h-4 text-purple-500 mt-0.5" />
              <div>
                <div className="font-medium">Стандарт TOTP</div>
                <div className="text-muted-foreground">Совместимость с любыми приложениями</div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* QR Code Dialog */}
      {setupData && (
        <QRCodeDialog
          isOpen={showQRDialog}
          onClose={() => setShowQRDialog(false)}
          otpauthUrl={setupData.otpauthUrl}
          secret={setupData.secret}
        />
      )}
    </>
  )
}
