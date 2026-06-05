// path: apps/frontend/components/security/two-factor-auth-card.tsx
"use client"

import * as React from "react"
import { Shield, AlertTriangle, CheckCircle, Copy, QrCode } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { securityAPI } from "@/lib/api/security"
import type { TwoFASetupResponse } from "@/lib/types/security"
import { QRCodeDialog } from "./qr-code-dialog"
import { cn } from "@/lib/utils"

interface TwoFactorAuthCardProps {
  enabled: boolean
  onStatusChange: (enabled: boolean) => void
}

type ApiErrorShape = { message?: string; statusCode?: number; correlationId?: string }

function parseApiError(e: unknown, fallback: string) {
  const plain = (e as Error)?.message || ""
  if (!plain) return fallback

  try {
    const parsed = JSON.parse(plain) as ApiErrorShape
    const msg = parsed.correlationId
      ? `${parsed.message || fallback} (corrId: ${parsed.correlationId})`
      : parsed.message || fallback
    return msg
  } catch {
    return plain || fallback
  }
}

export function TwoFactorAuthCard({ enabled, onStatusChange }: TwoFactorAuthCardProps) {
  const [isLoading, setIsLoading] = React.useState(false)
  const [setupData, setSetupData] = React.useState<TwoFASetupResponse | null>(null)
  const [verificationCode, setVerificationCode] = React.useState("")
  const [showQRDialog, setShowQRDialog] = React.useState(false)

  const handleSetup = async () => {
    try {
      setIsLoading(true)
      const data = await securityAPI.setup2FA()
      setSetupData(data)
      setShowQRDialog(true)
    } catch (e: unknown) {
      console.error("Ошибка настройки 2FA:", e)
      toast.error(parseApiError(e, "Ошибка настройки 2FA"))
    } finally {
      setIsLoading(false)
    }
  }

  const handleEnable = async () => {
    if (!setupData || verificationCode.length !== 6) {
      toast.error("Введите 6-значный код подтверждения")
      return
    }

    try {
      setIsLoading(true)
      await securityAPI.enable2FA({ code: verificationCode, secret: setupData.secret })

      onStatusChange(true)
      setSetupData(null)
      setVerificationCode("")
      setShowQRDialog(false)

      toast.success("2FA включена")
    } catch (e: unknown) {
      console.error("Ошибка включения 2FA:", e)
      toast.error(parseApiError(e, "Неверный код подтверждения"))
    } finally {
      setIsLoading(false)
    }
  }

  const handleDisable = async () => {
    if (verificationCode.length !== 6) {
      toast.error("Введите 6-значный код подтверждения")
      return
    }

    try {
      setIsLoading(true)
      await securityAPI.disable2FA({ code: verificationCode })

      onStatusChange(false)
      setVerificationCode("")

      toast.success("2FA отключена")
    } catch (e: unknown) {
      console.error("Ошибка отключения 2FA:", e)
      toast.error(parseApiError(e, "Неверный код подтверждения"))
    } finally {
      setIsLoading(false)
    }
  }

  const copySecret = () => {
    if (!setupData?.secret) return
    navigator.clipboard.writeText(setupData.secret)
    toast.success("Секретный ключ скопирован")
  }

  return (
    <>
      <Card className="p-lg">
        <div className="flex flex-col gap-lg">
          <div className="flex items-start justify-between gap-lg">
            <div className="min-w-0">
              <div className="flex items-center gap-sm">
                <div className="h-9 w-9 rounded-md bg-surface-2 border border-border flex items-center justify-center text-muted-foreground">
                  <Shield className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">Двухфакторная аутентификация</h3>
              </div>
              <p className="text-sm text-muted-foreground mt-xs">
                Дополнительный уровень защиты аккаунта.
              </p>
            </div>

            <Badge variant={enabled ? "active" : "pending"} className="shrink-0">
              {enabled ? (
                <>
                  <CheckCircle className="w-3.5 h-3.5 mr-xs" />
                  Включена
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5 mr-xs" />
                  Отключена
                </>
              )}
            </Badge>
          </div>

          {!enabled ? (
            setupData ? (
              <div className="flex flex-col gap-md">
                <div className="p-md rounded-md bg-surface-2 border border-border">
                  <div className="text-sm font-medium text-foreground mb-sm">Настройка</div>
                  <ol className="text-sm text-muted-foreground space-y-xs list-decimal pl-lg">
                    <li>Откройте приложение-аутентификатор.</li>
                    <li>Добавьте новый аккаунт (QR-код или ключ вручную).</li>
                    <li>Введите 6‑значный код для подтверждения.</li>
                  </ol>

                  <div className="flex flex-col sm:flex-row gap-sm mt-md">
                    <Button variant="secondary" onClick={() => setShowQRDialog(true)} className="sm:w-auto">
                      <QrCode className="w-4 h-4 mr-xs" />
                      Показать QR
                    </Button>

                    <Button variant="secondary" onClick={copySecret} className="sm:w-auto">
                      <Copy className="w-4 h-4 mr-xs" />
                      Копировать ключ
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-sm items-start sm:items-end">
                  <div className="w-full">
                    <label htmlFor="twofa-enable-code" className="text-sm font-medium text-foreground">
                      Код подтверждения
                    </label>
                    <Input
                      id="twofa-enable-code"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="6 цифр"
                      inputMode="numeric"
                      className="mt-xs"
                    />
                  </div>

                  <Button
                    variant="primary"
                    onClick={handleEnable}
                    disabled={isLoading || verificationCode.length !== 6}
                    className={cn("w-full sm:w-auto", "sm:shrink-0")}
                  >
                    Включить 2FA
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-lg flex-wrap">
                <div className="text-sm text-muted-foreground">
                  Рекомендуется включить 2FA для защиты от компрометации пароля.
                </div>

                <Button variant="primary" onClick={handleSetup} disabled={isLoading}>
                  <Shield className="w-4 h-4 mr-xs" />
                  Настроить 2FA
                </Button>
              </div>
            )
          ) : (
            <div className="flex flex-col sm:flex-row gap-sm items-start sm:items-end">
              <div className="w-full">
                <label htmlFor="twofa-disable-code" className="text-sm font-medium text-foreground">
                  Код из приложения (для отключения)
                </label>
                <Input
                  id="twofa-disable-code"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="6 цифр"
                  inputMode="numeric"
                  className="mt-xs"
                />
              </div>

              <Button
                variant="danger"
                onClick={handleDisable}
                disabled={isLoading || verificationCode.length !== 6}
                className="w-full sm:w-auto sm:shrink-0"
              >
                Отключить 2FA
              </Button>
            </div>
          )}
        </div>
      </Card>

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
