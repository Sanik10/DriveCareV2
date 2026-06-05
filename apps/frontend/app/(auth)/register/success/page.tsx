// path: apps/frontend/app/(auth)/register/success/page.tsx
"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { AlertCircle, ArrowRight, Building2, CheckCircle2, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { TariffPreview } from "@/components/ui/tariff-preview"
import { tariffsAPI } from "@/lib/api/tariffs"
import type { Tariff } from "@/lib/types/tariffs"

export default function RegisterSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [tariff, setTariff] = React.useState<Tariff | null>(null)
  const [tariffLoading, setTariffLoading] = React.useState(false)
  const [tariffError, setTariffError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const tariffId = searchParams.get("tariffId")
    if (!tariffId) return

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(tariffId)) {
      setTariffError("Некорректный ID тарифа")
      return
    }

    let cancelled = false
    ;(async () => {
      setTariffLoading(true)
      setTariffError(null)
      try {
        const t = await tariffsAPI.get(tariffId)
        if (cancelled) return
        setTariff(t)
      } catch {
        if (cancelled) return
        setTariffError("Не удалось загрузить информацию о тарифе")
        setTariff(null)
      } finally {
        if (!cancelled) setTariffLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [searchParams])

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Лёгкий фон-акцент (как на login/register) */}
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(900px circle at 20% 0%, hsl(var(--primary) / 0.12), transparent 60%), radial-gradient(700px circle at 90% 30%, hsl(199 89% 48% / 0.10), transparent 55%)",
        }}
      />

      {/* Top controls */}
      <div className="fixed right-xl top-xl z-10 flex items-center gap-sm">
        <ThemeToggle />
        <Button asChild variant="ghost" size="sm">
          <Link href="/">На главную</Link>
        </Button>
      </div>

      <div className="mx-auto flex min-h-screen w-full max-w-lg items-center px-xl py-section">
        <div className="w-full grid gap-xl">
          {/* Header */}
          <div className="text-center grid gap-sm">
            <Link href="/" className="mx-auto inline-flex items-center gap-sm">
              <div className="grid h-10 w-10 place-items-center rounded-md bg-primary text-primary-foreground">
                <Building2 className="h-5 w-5" />
              </div>
              <span className="text-sm font-semibold">DriveCare</span>
            </Link>

            <div className="mx-auto grid h-12 w-12 place-items-center rounded-md border border-border/60 bg-card">
              <CheckCircle2 className="h-6 w-6 text-status-active" />
            </div>

            <h1 className="text-2xl font-semibold tracking-tight">Компания зарегистрирована</h1>
            <p className="text-sm text-muted-foreground">
              Аккаунт создан. Теперь вы можете войти и начать работу в DriveCare.
            </p>
          </div>

          {/* Optional tariff */}
          {(tariffLoading || tariffError || tariff) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Тарифный план</CardTitle>
                <CardDescription>
                  Если вы выбирали тариф во время регистрации — он отображается здесь.
                </CardDescription>
              </CardHeader>

              <CardContent className="grid gap-md">
                {tariffLoading && (
                  <div className="flex items-center gap-sm text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    Загрузка тарифа...
                  </div>
                )}

                {tariffError && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/10 px-md py-sm text-sm text-destructive">
                    <div className="flex items-start gap-sm">
                      <AlertCircle className="mt-[2px] h-4 w-4" />
                      <div>{tariffError}</div>
                    </div>
                  </div>
                )}

                {tariff && (
                  <TariffPreview
                    tariff={tariff}
                    period="monthly"
                    onEdit={() => router.push("/tariffs")}
                  />
                )}
              </CardContent>
            </Card>
          )}

          {/* Main card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Что дальше</CardTitle>
              <CardDescription>Короткий чек‑лист, чтобы быстро начать.</CardDescription>
            </CardHeader>

            <CardContent className="grid gap-md text-sm">
              <div className="rounded-md border border-border/60 bg-card px-md py-sm">
                1) Войдите в систему под email владельца
              </div>
              <div className="rounded-md border border-border/60 bg-card px-md py-sm">
                2) Заполните профиль компании (если нужно)
              </div>
              <div className="rounded-md border border-border/60 bg-card px-md py-sm">
                3) Пригласите сотрудников по ссылке приглашения из кабинета
              </div>

              <div className="text-xs text-muted-foreground">
                Поддержка:{" "}
                <a className="text-foreground hover:underline" href="mailto:support@drivecare.com">
                  support@drivecare.com
                </a>
              </div>
            </CardContent>

            <CardFooter className="flex-col gap-sm sm:flex-row sm:justify-between">
              <Button asChild variant="secondary" className="w-full sm:w-auto">
                <Link href="/">На главную</Link>
              </Button>

              <Button asChild className="w-full sm:w-auto">
                <Link href="/login">
                  Войти
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}
