// path: apps/frontend/app/(auth)/login/page.tsx
"use client"

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Eye, EyeOff, ArrowRight, Building2, AlertCircle, Clock } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { authAPI } from '@/lib/api/auth'
import { useAuth } from '@/lib/hooks/use-auth'
import { EMAIL_REGEX, PASSWORD_REGEX, TWO_FA_REGEX } from '@/lib/types/auth'

const loginSchema = z.object({
  email: z.string()
    .min(1, 'Email обязателен')
    .regex(EMAIL_REGEX, 'Некорректный email'),
  password: z.string()
    .min(8, 'Минимум 8 символов')
    .regex(PASSWORD_REGEX, 'Пароль должен содержать строчные и заглавные буквы, цифры и спецсимволы'),
  twoFactorCode: z.string()
    .optional()
    .refine((val) => !val || TWO_FA_REGEX.test(val), {
      message: 'Код 2FA должен состоять из 6 цифр'
    })
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [isThrottled, setIsThrottled] = useState(false)
  const [throttleTimeLeft, setThrottleTimeLeft] = useState(0)
  const router = useRouter()
  const { setAuthUser } = useAuth() // ДОБАВЛЕНО
  
  // Защита от множественных попыток логина
  const loginAttemptRef = useRef(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  // Таймер для throttle
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    if (isThrottled && throttleTimeLeft > 0) {
      interval = setInterval(() => {
        setThrottleTimeLeft(prev => {
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
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const onSubmit = async (data: LoginForm) => {
    // Защита от множественных одновременных запросов
    if (isThrottled || isLoading || loginAttemptRef.current) {
      console.log('[Login] Пропускаем попытку логина - уже выполняется или заблокирован')
      return
    }
    
    loginAttemptRef.current = true
    setIsLoading(true)
    setApiError(null)
    
    try {
      console.log('[Login] Начинаем логин для', data.email)
      const response = await authAPI.login(data)
      
      console.log('[Login] Логин успешен, ответ сервера:', {
        hasUser: !!response.user,
        userEmail: response.user?.email,
        hasTokens: !!(response.accessToken && response.refreshToken),
        deviceId: response.deviceId
      })
      
      // ИСПРАВЛЕНО: проверяем что пользователь валидный
      if (!response.user || !response.user.email) {
        console.error('[Login] Получен невалидный пользователь от сервера:', response.user)
        setApiError('Ошибка входа: получены некорректные данные пользователя')
        return
      }
      
      console.log('[Login] Сохраняем токены и пользователя')
      
      // Сохраняем токены (только если действительно пришли)
      if (response.accessToken) {
        localStorage.setItem('accessToken', response.accessToken)
      }
      if (response.refreshToken) {
        localStorage.setItem('refreshToken', response.refreshToken)
      }
      localStorage.setItem('user', JSON.stringify(response.user))
      if (response.deviceId) {
        localStorage.setItem('deviceId', response.deviceId)
      }
      
      // НОВОЕ: сразу устанавливаем пользователя в useAuth
      setAuthUser(response.user)
      
      console.log('[Login] Пользователь установлен в useAuth, перенаправляем на dashboard')
      
      // Редирект на dashboard
      router.push('/dashboard')
    } catch (error) {
      console.error('[Login] Ошибка логина:', error)
      
      const message = error instanceof Error ? error.message : 'Неизвестная ошибка'
      
      try {
        const errorData = JSON.parse(message)
        
        if (errorData.statusCode === 429) {
          // Rate limit exceeded
          setIsThrottled(true)
          setThrottleTimeLeft(15 * 60) // 15 минут в секундах
          setApiError('Превышен лимит попыток входа. Попробуйте позже.')
        } else if (errorData.statusCode === 401) {
          setApiError('Неверный email или пароль')
        } else if (errorData.statusCode === 400) {
          setApiError('Некорректные данные для входа')
        } else {
          setApiError('Ошибка сервера. Попробуйте позже.')
        }
      } catch {
        // Если не удалось распарсить JSON
        if (message.includes('2FA')) {
          setError('twoFactorCode', { message: 'Неверный код 2FA' })
        } else if (message.includes('email') || message.includes('пароль')) {
          setApiError(message)
        } else {
          setApiError('Ошибка входа. Проверьте данные и попробуйте снова.')
        }
      }
    } finally {
      setIsLoading(false)
      // Сбрасываем флаг через задержку
      setTimeout(() => {
        loginAttemptRef.current = false
      }, 1000) // УВЕЛИЧИЛИ до 1 секунды
    }
  }

  return (
    <div className="min-h-screen relative">
      {/* Fixed Background Effects */}
      <div className="fixed inset-0 bg-gradient-to-br from-background via-background to-surface-1 -z-10"></div>
      <div className="fixed inset-0 bg-gradient-surface -z-10"></div>
      <div className="fixed top-0 right-0 w-96 h-96 bg-gradient-primary opacity-10 rounded-full blur-3xl -z-10"></div>
      <div className="fixed bottom-0 left-0 w-64 h-64 bg-secondary/20 rounded-full blur-3xl -z-10"></div>
      
      <div className="flex items-center justify-center min-h-screen p-6">
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
                Войти в DriveCare
              </h1>
              <p className="text-muted-foreground">
                Управление автосервисом нового поколения
              </p>
            </div>
          </div>

          {/* Login Form */}
          <Card className="p-8 shadow-glass border-border/50 backdrop-blur-sm bg-card/80">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* API Error */}
              {apiError && (
                <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20">
                  <AlertCircle className="w-4 h-4 text-destructive" />
                  <p className="text-sm text-destructive">{apiError}</p>
                </div>
              )}

              {/* Throttle Warning */}
              {isThrottled && (
                <div className="flex items-center gap-2 p-3 rounded-md bg-amber-500/10 border border-amber-500/20">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <div className="text-sm text-amber-600">
                    <p className="font-medium">Временная блокировка</p>
                    <p>Попробуйте снова через {formatTime(throttleTimeLeft)}</p>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <Input
                  {...register('email')}
                  type="email"
                  placeholder="Email"
                  autoComplete="email"
                  disabled={isLoading || isThrottled}
                  error={errors.email?.message}
                />

                <div className="relative">
                  <Input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Пароль"
                    autoComplete="current-password"
                    disabled={isLoading || isThrottled}
                    error={errors.password?.message}
                    className="pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                    disabled={isLoading || isThrottled}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>

                <Input
                  {...register('twoFactorCode')}
                  type="text"
                  placeholder="Код 2FA (если включен)"
                  autoComplete="one-time-code"
                  disabled={isLoading || isThrottled}
                  error={errors.twoFactorCode?.message}
                  maxLength={6}
                />
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full h-12 bg-gradient-primary hover:opacity-90 text-white font-medium group"
                disabled={isLoading || isThrottled || loginAttemptRef.current}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Вход...
                  </div>
                ) : isThrottled ? (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Заблокировано ({formatTime(throttleTimeLeft)})
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    Войти
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                )}
              </Button>

              <div className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  Нет аккаунта?{' '}
                  <Link
                    href="/register"
                    className="text-primary hover:text-secondary transition-colors font-medium"
                  >
                    Зарегистрировать компанию
                  </Link>
                </p>
                
                <div className="text-xs text-muted-foreground">
                  <p>Используя DriveCare, вы соглашаетесь с</p>
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

          {/* Back to Home */}
          <div className="text-center">
            <Link 
              href="/" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Вернуться на главную
            </Link>
          </div>

          {/* Security Notice */}
          {isThrottled && (
            <Card className="p-4 backdrop-blur-sm bg-card/60 border-border/30">
              <div className="text-center space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">
                  Защита от перебора
                </h4>
                <p className="text-xs text-muted-foreground">
                  Для безопасности количество попыток входа ограничено. 
                  Лимит: 5 попыток в 15 минут.
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
