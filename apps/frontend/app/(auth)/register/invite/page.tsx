// path: apps/frontend/app/(auth)/register/invite/page.tsx
"use client"

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { UserPlus, ArrowRight, Building2, AlertCircle } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { authAPI } from '@/lib/api/auth'
import { RegisterInviteRequest, EMAIL_REGEX, PASSWORD_REGEX, PHONE_REGEX } from '@/lib/types/auth'

const inviteSchema = z.object({
  inviteCode: z.string()
    .min(1, 'Код приглашения обязателен')
    .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i, 'Некорректный код приглашения'),
  email: z.string()
    .min(1, 'Email обязателен')
    .regex(EMAIL_REGEX, 'Некорректный email'),
  password: z.string()
    .min(8, 'Минимум 8 символов')
    .regex(PASSWORD_REGEX, 'Пароль должен содержать строчные и заглавные буквы, цифры и спецсимволы'),
  confirmPassword: z.string(),
  firstName: z.string()
    .min(1, 'Имя обязательно')
    .max(100),
  lastName: z.string()
    .min(1, 'Фамилия обязательна')
    .max(100),
  phone: z.string()
    .regex(PHONE_REGEX, 'Некорректный формат номера телефона')
    .optional()
    .or(z.literal('')),
  specialization: z.string()
    .max(255)
    .optional()
    .or(z.literal('')),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Пароли не совпадают',
  path: ['confirmPassword'],
})

type InviteForm = z.infer<typeof inviteSchema>

function RegisterInviteForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue
  } = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
  })

  // Заполнить код приглашения из URL
  useEffect(() => {
    const inviteCode = searchParams.get('code')
    if (inviteCode) {
      setValue('inviteCode', inviteCode)
    }
  }, [searchParams, setValue])

  const onSubmit = async (data: InviteForm) => {
    setIsLoading(true)
    setApiError(null)
    
    try {
      const requestData: RegisterInviteRequest = {
        inviteCode: data.inviteCode,
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || undefined,
        specialization: data.specialization || undefined,
      }

      const response = await authAPI.registerInvite(requestData)
      
      // Сохраняем токены
      localStorage.setItem('accessToken', response.accessToken)
      localStorage.setItem('refreshToken', response.refreshToken)
      localStorage.setItem('user', JSON.stringify(response.user))
      
      // Редирект на dashboard
      router.push('/dashboard')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Неизвестная ошибка'
      setApiError(message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-surface-1 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-surface"></div>
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-primary opacity-10 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/20 rounded-full blur-3xl"></div>
      
      <div className="relative flex items-center justify-center min-h-screen p-6">
        <div className="w-full max-w-md space-y-8">
          {/* Header */}
          <div className="text-center space-y-6">
            <Link href="/" className="inline-block">
              <div className="flex items-center justify-center">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-primary">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
              </div>
            </Link>
            <div className="space-y-2">
              <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Присоединиться к команде
              </h1>
              <p className="text-muted-foreground">
                Создайте аккаунт по приглашению
              </p>
            </div>
          </div>

          {/* Register Form */}
          <Card className="p-8 shadow-glass border-border/50 backdrop-blur-sm bg-card/80">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* API Error */}
              {apiError && (
                <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20">
                  <AlertCircle className="w-4 h-4 text-destructive" />
                  <p className="text-sm text-destructive">{apiError}</p>
                </div>
              )}

              <div className="space-y-4">
                <Input
                  {...register('inviteCode')}
                  placeholder="Код приглашения"
                  disabled={isLoading}
                  error={errors.inviteCode?.message}
                />

                <Input
                  {...register('email')}
                  type="email"
                  placeholder="Email"
                  autoComplete="email"
                  disabled={isLoading}
                  error={errors.email?.message}
                />

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    {...register('firstName')}
                    placeholder="Имя"
                    disabled={isLoading}
                    error={errors.firstName?.message}
                  />

                  <Input
                    {...register('lastName')}
                    placeholder="Фамилия"
                    disabled={isLoading}
                    error={errors.lastName?.message}
                  />
                </div>

                <Input
                  {...register('phone')}
                  placeholder="Телефон (необязательно)"
                  disabled={isLoading}
                  error={errors.phone?.message}
                />

                <Input
                  {...register('specialization')}
                  placeholder="Специализация (необязательно)"
                  disabled={isLoading}
                  error={errors.specialization?.message}
                />

                <Input
                  {...register('password')}
                  type="password"
                  placeholder="Пароль"
                  autoComplete="new-password"
                  disabled={isLoading}
                  error={errors.password?.message}
                />

                <Input
                  {...register('confirmPassword')}
                  type="password"
                  placeholder="Подтвердите пароль"
                  autoComplete="new-password"
                  disabled={isLoading}
                  error={errors.confirmPassword?.message}
                />
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full h-12 bg-gradient-primary hover:opacity-90 text-white font-medium group"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Создание аккаунта...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4" />
                    Создать аккаунт
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                )}
              </Button>

              <div className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  Уже есть аккаунт?{' '}
                  <Link
                    href="/login"
                    className="text-primary hover:text-secondary transition-colors font-medium"
                  >
                    Войти в систему
                  </Link>
                </p>
                
                <div className="text-xs text-muted-foreground">
                  <p>Регистрируясь, вы соглашаетесь с</p>
                  <p>
                    <Link href="/terms" className="hover:text-foreground transition-colors">
                      Условиями использования
                    </Link>
                    {' и '}
                    <Link href="/privacy" className="hover:text-foreground transition-colors">
                      Политикой конфиденциальности
                    </Link>
                  </p>
                </div>
              </div>
            </form>
          </Card>

          {/* Footer */}
          <div className="text-center">
            <Link 
              href="/" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Вернуться на главную
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function RegisterInvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-surface-1 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      </div>
    }>
      <RegisterInviteForm />
    </Suspense>
  )
}
