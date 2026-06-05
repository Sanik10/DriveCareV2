// path: apps/frontend/app/(auth)/login/page.tsx
"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Clock,
  Eye,
  EyeOff,
  Shield,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ThemeToggle } from "@/components/ui/theme-toggle"
import { authAPI } from "@/lib/api/auth"
import { useAuth } from "@/lib/hooks/use-auth"
import { EMAIL_REGEX, PASSWORD_REGEX, TWO_FA_REGEX } from "@/lib/types/auth"

const loginSchema = z.object({
  email: z.string().min(1, "Email обязателен").regex(EMAIL_REGEX, "Некорректный email"),
  password: z
    .string()
    .min(8, "Минимум 8 символов")
    .regex(PASSWORD_REGEX, "Пароль должен содержать строчные и заглавные буквы, цифры и спецсимволы"),
  twoFactorCode: z
    .string()
    .optional()
    .refine((val) => !val || TWO_FA_REGEX.test(val), {
      message: "Код 2FA должен состоять из 6 цифр",
    }),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const { setAuthUser } = useAuth()

  const [showPassword, setShowPassword] = React.useState(false)
  const [showTwoFactor, setShowTwoFactor] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [apiError, setApiError] = React.useState<string | null>(null)

  const [isThrottled, setIsThrottled] = React.useState(false)
  const [throttleTimeLeft, setThrottleTimeLeft] = React.useState(0)

  const loginAttemptRef = React.useRef(false)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  React.useEffect(() => {
    if (errors.twoFactorCode?.message) setShowTwoFactor(true)
  }, [errors.twoFactorCode?.message])

  React.useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null

    if (isThrottled && throttleTimeLeft > 0) {
      interval = setInterval(() => {
        setThrottleTimeLeft((prev) => {
          if (prev <= 1) {
            setIsThrottled(false)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isThrottled, throttleTimeLeft])

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  const onSubmit = async (data: LoginForm) => {
    if (isThrottled || isLoading || loginAttemptRef.current) return

    loginAttemptRef.current = true
    setIsLoading(true)
    setApiError(null)

    try {
      const response = await authAPI.login(data)

      if (!response.user || !response.user.email) {
        setApiError("Ошибка входа: получены некорректные данные пользователя")
        return
      }

      setAuthUser(response.user)
      router.push("/dashboard")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Неизвестная ошибка"

      try {
        const errorData = JSON.parse(message)

        if (errorData.statusCode === 429) {
          setIsThrottled(true)
          setThrottleTimeLeft(15 * 60)
          setApiError("Превышен лимит попыток входа. Попробуйте позже.")
        } else if (errorData.statusCode === 401) {
          setApiError("Неверный email или пароль")
        } else if (errorData.statusCode === 400) {
          setApiError("Некорректные данные для входа")
        } else {
          setApiError("Ошибка сервера. Попробуйте позже.")
        }
      } catch {
        const lower = message.toLowerCase()

        if (lower.includes("2fa")) {
          setShowTwoFactor(true)
          setError("twoFactorCode", { message: "Неверный код 2FA" })
        } else if (lower.includes("email") || lower.includes("парол")) {
          setApiError(message)
        } else {
          setApiError("Ошибка входа. Проверьте данные и попробуйте снова.")
        }
      }
    } finally {
      setIsLoading(false)
      setTimeout(() => {
        loginAttemptRef.current = false
      }, 1000)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Статичный, лёгкий фон-акцент (без стекла/орбов/фигур) */}
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(900px circle at 20% 0%, hsl(var(--primary) / 0.10), transparent 60%), radial-gradient(700px circle at 90% 30%, hsl(199 89% 48% / 0.10), transparent 55%)",
        }}
      />

      {/* Top controls */}
      <div className="fixed right-xl top-xl z-10 flex items-center gap-sm">
        <ThemeToggle />
        <Button asChild variant="ghost" size="sm">
          <Link href="/">На главную</Link>
        </Button>
      </div>

      <div className="mx-auto flex min-h-screen w-full max-w-md items-center px-xl py-section">
        <div className="w-full grid gap-xl">
          {/* Header */}
          <div className="text-center grid gap-sm">
            <Link href="/" className="mx-auto inline-flex items-center gap-sm">
              <div className="grid h-10 w-10 place-items-center rounded-md bg-primary text-primary-foreground">
                <Building2 className="h-5 w-5" />
              </div>
              <span className="text-sm font-semibold">DriveCare</span>
            </Link>

            <h1 className="text-2xl font-semibold tracking-tight">Вход</h1>
            <p className="text-sm text-muted-foreground">Войдите, чтобы открыть рабочее пространство</p>
          </div>

          {/* Form */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-sm">
                <Shield className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Доступ к аккаунту</CardTitle>
              </div>
              <CardDescription>Введите email и пароль. Если включена 2FA — добавьте код.</CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="grid gap-lg">
                {(apiError || isThrottled) && (
                  <div
                    className={[
                      "rounded-md border px-md py-sm text-sm",
                      apiError ? "border-destructive/30 bg-destructive/10 text-destructive" : "",
                      isThrottled ? "border-status-pending/30 bg-status-pending/10 text-status-pending" : "",
                    ].join(" ")}
                  >
                    <div className="flex items-start gap-sm">
                      {isThrottled ? (
                        <Clock className="mt-[2px] h-4 w-4" />
                      ) : (
                        <AlertCircle className="mt-[2px] h-4 w-4" />
                      )}

                      <div className="grid gap-xs">
                        {apiError && <div>{apiError}</div>}
                        {isThrottled && (
                          <div>
                            Попробуйте снова через <span className="font-medium">{formatTime(throttleTimeLeft)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <Input
                  {...register("email")}
                  label="Email"
                  required
                  type="email"
                  placeholder="name@company.com"
                  autoComplete="email"
                  disabled={isLoading || isThrottled}
                  error={errors.email?.message}
                />

                <div className="grid gap-sm">
                  <Input
                    {...register("password")}
                    label="Пароль"
                    required
                    type={showPassword ? "text" : "password"}
                    placeholder="Введите пароль"
                    autoComplete="current-password"
                    disabled={isLoading || isThrottled}
                    error={errors.password?.message}
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="justify-start px-0"
                    onClick={() => setShowPassword((v) => !v)}
                    disabled={isLoading || isThrottled}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    {showPassword ? "Скрыть пароль" : "Показать пароль"}
                  </Button>
                </div>

                <div className="grid gap-sm">
                  <div className="flex items-center justify-between gap-md">
                    <div className="text-sm text-muted-foreground">Двухфакторная защита</div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowTwoFactor((v) => !v)}
                      disabled={isLoading || isThrottled}
                    >
                      {showTwoFactor ? "Скрыть" : "У меня включена 2FA"}
                    </Button>
                  </div>

                  {showTwoFactor && (
                    <Input
                      {...register("twoFactorCode")}
                      label="Код 2FA"
                      type="text"
                      inputMode="numeric"
                      placeholder="6 цифр"
                      autoComplete="one-time-code"
                      disabled={isLoading || isThrottled}
                      error={errors.twoFactorCode?.message}
                      maxLength={6}
                    />
                  )}
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={isLoading || isThrottled || loginAttemptRef.current}
                >
                  {isLoading ? "Вход..." : isThrottled ? `Заблокировано (${formatTime(throttleTimeLeft)})` : (
                    <>
                      Войти
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>

            <CardFooter className="justify-between gap-md flex-wrap">
              <div className="text-sm text-muted-foreground">
                Нет аккаунта компании?{" "}
                <Link href="/register" className="text-foreground hover:underline">
                  Зарегистрировать автосервис
                </Link>
              </div>
            </CardFooter>
          </Card>

          <div className="text-center text-xs text-muted-foreground leading-relaxed">
            Используя DriveCare, вы соглашаетесь с{" "}
            <Link href="/terms" className="hover:text-foreground hover:underline">
              условиями
            </Link>{" "}
            и{" "}
            <Link href="/privacy" className="hover:text-foreground hover:underline">
              политикой конфиденциальности
            </Link>
            .
          </div>

          {/* Security Notice */}
          {isThrottled && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Система защиты от атак</CardTitle>
                <CardDescription>
                  Для безопасности количество попыток входа ограничено. Лимит: 5 попыток в 15 минут.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
