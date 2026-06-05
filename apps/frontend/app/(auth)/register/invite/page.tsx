// path: apps/frontend/app/(auth)/register/invite/page.tsx
"use client"

import * as React from "react"
import Link from "next/link"
import { Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Users,
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
import { PASSWORD_REGEX, PHONE_REGEX } from "@/lib/types/auth"
import { buildApiUrl } from "@/lib/api/core"

// Допускаем два формата токена: 64 hex (наш backend) или UUID v4 (на будущее)
const TOKEN_HEX64 = /^[0-9a-f]{64}$/i
const TOKEN_UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const inviteSchema = z
  .object({
    inviteCode: z
      .string()
      .min(1, "Код приглашения обязателен")
      .refine((v) => TOKEN_HEX64.test(v) || TOKEN_UUID_V4.test(v), "Некорректный токен приглашения"),

    // email теперь не обязателен для /auth/register-invite — оставляем справочно, но не шлём
    email: z.string().email("Некорректный email").optional().or(z.literal("")).default(""),

    password: z
      .string()
      .min(8, "Минимум 8 символов")
      .regex(PASSWORD_REGEX, "Пароль должен содержать строчные и заглавные буквы, цифры и спецсимволы"),

    confirmPassword: z.string(),

    firstName: z.string().min(1, "Имя обязательно").max(100),
    lastName: z.string().min(1, "Фамилия обязательна").max(100),

    phone: z.string().regex(PHONE_REGEX, "Некорректный формат номера телефона").optional().or(z.literal("")),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Пароли не совпадают",
    path: ["confirmPassword"],
  })

type InviteForm = z.infer<typeof inviteSchema>

function RegisterInviteForm() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [isLoading, setIsLoading] = React.useState(false)
  const [apiError, setApiError] = React.useState<string | null>(null)

  const [showPassword, setShowPassword] = React.useState(false)
  const [showConfirm, setShowConfirm] = React.useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
  })

  const password = watch("password") || ""

  const requirements = React.useMemo(
    () => [
      { key: "len", label: "Минимум 8 символов", valid: password.length >= 8 },
      { key: "lower", label: "Строчная буква (a-z)", valid: /[a-z]/.test(password) },
      { key: "upper", label: "Заглавная буква (A-Z)", valid: /[A-Z]/.test(password) },
      { key: "digit", label: "Хотя бы одна цифра (0-9)", valid: /\d/.test(password) },
      { key: "special", label: "Спецсимвол (!@#$…)", valid: /[^A-Za-z0-9]/.test(password) },
    ],
    [password]
  )

  const showRequirements = password.length > 0 || !!errors.password?.message

  // Префилл из URL: сперва ?token=..., fallback на ?code=...
  React.useEffect(() => {
    const token = searchParams.get("token") || searchParams.get("code")
    if (token) setValue("inviteCode", token, { shouldValidate: true, shouldDirty: true })

    const email = searchParams.get("email")
    if (email) setValue("email", email, { shouldValidate: true, shouldDirty: true })
  }, [searchParams, setValue])

  const onSubmit = async (data: InviteForm) => {
    setIsLoading(true)
    setApiError(null)

    try {
      // Контракт бэка: { token, password, firstName, lastName, phone? }
      const payload = {
        token: data.inviteCode,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || undefined,
      }

      const res = await fetch(buildApiUrl("/auth/register-invite"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const text = await res.text().catch(() => "")
        let msg = text || `Ошибка регистрации (${res.status})`

        try {
          const parsed = JSON.parse(text) as { message?: string | string[] }
          if (parsed?.message) msg = Array.isArray(parsed.message) ? parsed.message.join("\n") : parsed.message
        } catch {
          // ignore
        }

        throw new Error(msg)
      }

      router.replace("/dashboard")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Неизвестная ошибка"
      setApiError(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(900px circle at 20% 0%, hsl(var(--primary) / 0.10), transparent 60%), radial-gradient(700px circle at 90% 30%, hsl(199 89% 48% / 0.10), transparent 55%)",
        }}
      />

      <div className="fixed right-xl top-xl z-10 flex items-center gap-sm">
        <ThemeToggle />
        <Button asChild variant="ghost" size="sm">
          <Link href="/">На главную</Link>
        </Button>
      </div>

      <div className="mx-auto flex min-h-screen w-full max-w-md items-center px-xl py-section">
        <div className="w-full grid gap-xl">
          <div className="text-center grid gap-sm">
            <Link href="/" className="mx-auto inline-flex items-center gap-sm">
              <div className="grid h-10 w-10 place-items-center rounded-md bg-primary text-primary-foreground">
                <Building2 className="h-5 w-5" />
              </div>
              <span className="text-sm font-semibold">DriveCare</span>
            </Link>

            <div className="mx-auto inline-flex items-center gap-sm rounded-md border border-border/60 bg-card px-md py-sm text-sm text-muted-foreground">
              <Users className="h-4 w-4 text-primary" />
              Приглашение в команду автосервиса
            </div>

            <h1 className="text-2xl font-semibold tracking-tight">Создание аккаунта сотрудника</h1>
            <p className="text-sm text-muted-foreground">
              Используйте токен из приглашения. После регистрации вы попадёте в рабочее пространство компании.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Данные сотрудника</CardTitle>
              <CardDescription>Заполните поля и задайте пароль для входа.</CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="grid gap-lg">
                {apiError && (
                  <div className="rounded-md border border-destructive/30 bg-destructive/10 px-md py-sm text-sm text-destructive">
                    <div className="flex items-start gap-sm">
                      <AlertCircle className="mt-[2px] h-4 w-4" />
                      <div className="whitespace-pre-line">{apiError}</div>
                    </div>
                  </div>
                )}

                <Input
                  {...register("inviteCode")}
                  label="Токен приглашения"
                  required
                  placeholder="Вставьте токен из ссылки"
                  disabled={isLoading}
                  error={errors.inviteCode?.message}
                />

                <Input
                  {...register("email")}
                  label="Email (необязательно)"
                  type="email"
                  placeholder="name@company.com"
                  autoComplete="email"
                  disabled={isLoading}
                  error={errors.email?.message}
                />

                <div className="grid gap-md md:grid-cols-2">
                  <Input
                    {...register("firstName")}
                    label="Имя"
                    required
                    placeholder="Иван"
                    disabled={isLoading}
                    error={errors.firstName?.message}
                  />

                  <Input
                    {...register("lastName")}
                    label="Фамилия"
                    required
                    placeholder="Иванов"
                    disabled={isLoading}
                    error={errors.lastName?.message}
                  />
                </div>

                <Input
                  {...register("phone")}
                  label="Телефон (необязательно)"
                  placeholder="+7 (___) ___-__-__"
                  disabled={isLoading}
                  error={errors.phone?.message}
                />

                {/* Пароль + требования */}
                <div className="grid gap-md">
                  <div className="grid gap-sm">
                    <Input
                      {...register("password")}
                      label="Пароль"
                      required
                      type={showPassword ? "text" : "password"}
                      placeholder="Введите пароль"
                      autoComplete="new-password"
                      disabled={isLoading}
                      error={errors.password?.message}
                    />

                    <div className="flex items-center justify-between gap-md">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="justify-start px-0"
                        onClick={() => setShowPassword((v) => !v)}
                        disabled={isLoading}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        {showPassword ? "Скрыть пароль" : "Показать пароль"}
                      </Button>

                      <div className="text-xs text-muted-foreground">
                        {PASSWORD_REGEX.test(password) && password.length > 0 ? "Пароль подходит" : ""}
                      </div>
                    </div>

                    {showRequirements && (
                      <div className="rounded-md border border-border/60 bg-card p-md">
                        <div className="flex items-center gap-sm text-sm font-medium">
                          <Lock className="h-4 w-4 text-primary" />
                          Требования к паролю
                        </div>

                        <div className="mt-sm grid gap-sm sm:grid-cols-2">
                          {requirements.map((r) => (
                            <div key={r.key} className="flex items-center gap-sm text-sm">
                              {r.valid ? (
                                <Check className="h-4 w-4 text-status-active" />
                              ) : (
                                <span className="h-4 w-4 rounded-full border border-border/60" />
                              )}
                              <span className={r.valid ? "text-foreground" : "text-muted-foreground"}>
                                {r.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid gap-sm">
                    <Input
                      {...register("confirmPassword")}
                      label="Подтверждение пароля"
                      required
                      type={showConfirm ? "text" : "password"}
                      placeholder="Повторите пароль"
                      autoComplete="new-password"
                      disabled={isLoading}
                      error={errors.confirmPassword?.message}
                    />

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="justify-start px-0"
                      onClick={() => setShowConfirm((v) => !v)}
                      disabled={isLoading}
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      {showConfirm ? "Скрыть" : "Показать"}
                    </Button>
                  </div>
                </div>

                <Button type="submit" size="lg" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Подключение...
                    </>
                  ) : (
                    <>
                      Присоединиться к команде
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>

            <CardFooter className="flex-col gap-sm sm:flex-row sm:justify-between">
              <div className="text-sm text-muted-foreground">
                Уже есть аккаунт?{" "}
                <Link href="/login" className="text-foreground hover:underline">
                  Войти
                </Link>
              </div>

              <div className="text-xs text-muted-foreground">
                Регистрируясь, вы соглашаетесь с{" "}
                <Link href="/terms" className="hover:text-foreground hover:underline">
                  условиями
                </Link>{" "}
                и{" "}
                <Link href="/privacy" className="hover:text-foreground hover:underline">
                  политикой
                </Link>
                .
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default function RegisterInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="flex items-center gap-sm text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            Загрузка...
          </div>
        </div>
      }
    >
      <RegisterInviteForm />
    </Suspense>
  )
}
