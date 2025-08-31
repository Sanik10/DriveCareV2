// path: apps/frontend/app/(auth)/register/invite/page.tsx
'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  UserPlus,
  ArrowRight,
  Building2,
  AlertCircle,
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  Users,
  Network,
} from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { authAPI } from '@/lib/api/auth'
import { RegisterInviteRequest, EMAIL_REGEX, PASSWORD_REGEX, PHONE_REGEX } from '@/lib/types/auth'

const inviteSchema = z
  .object({
    inviteCode: z
      .string()
      .min(1, 'Код приглашения обязателен')
      .regex(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        'Некорректный код приглашения'
      ),
    email: z.string().min(1, 'Email обязателен').regex(EMAIL_REGEX, 'Некорректный email'),
    password: z
      .string()
      .min(8, 'Минимум 8 символов')
      .regex(
        PASSWORD_REGEX,
        'Пароль должен содержать строчные и заглавные буквы, цифры и спецсимволы'
      ),
    confirmPassword: z.string(),
    firstName: z.string().min(1, 'Имя обязательно').max(100),
    lastName: z.string().min(1, 'Фамилия обязательна').max(100),
    phone: z
      .string()
      .regex(PHONE_REGEX, 'Некорректный формат номера телефона')
      .optional()
      .or(z.literal('')),
    specialization: z.string().max(255).optional().or(z.literal('')),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Пароли не совпадают',
    path: ['confirmPassword'],
  })

type InviteForm = z.infer<typeof inviteSchema>

function RegisterInviteForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [invitePrefilled, setInvitePrefilled] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    mode: 'onSubmit',
    defaultValues: {
      inviteCode: '',
      email: '',
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
      phone: '',
      specialization: '',
    },
  })

  // Заполнить код приглашения из URL
  useEffect(() => {
    const inviteCode = searchParams.get('code')
    if (inviteCode) {
      setValue('inviteCode', inviteCode, { shouldValidate: true })
      setInvitePrefilled(true)
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

  const baseInput =
    'pl-12 h-12 rounded-2xl border transition-all duration-300 bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/50'
  const normalBorder = 'border-border/50 focus:border-primary/50'
  const errorBorder = 'border-destructive/60 focus:border-destructive'

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Enhanced Flowing Background */}
      <div
        className="fixed inset-0 -z-10"
        style={{
          background: `
            radial-gradient(ellipse 700px 450px at 80% 20%, rgba(99, 102, 241, 0.15) 0%, transparent 65%),
            radial-gradient(ellipse 600px 600px at 20% 70%, rgba(14, 165, 233, 0.12) 0%, transparent 65%),
            radial-gradient(ellipse 500px 400px at 60% 90%, rgba(168, 85, 247, 0.08) 0%, transparent 65%)
          `,
        }}
      />

      {/* Enhanced Network visualization with pulsing connections */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        {/* Central hub node - bigger and more prominent */}
        <div
          className="absolute rounded-full network-hub"
          style={{
            width: '160px',
            height: '160px',
            filter: 'blur(40px)',
            top: '20%',
            left: '15%',
            background:
              'radial-gradient(circle, rgba(99, 102, 241, 0.20) 0%, rgba(14, 165, 233, 0.10) 60%, transparent 100%)',
            willChange: 'transform',
          }}
        />

        {/* Connected nodes with enhanced visibility */}
        <div
          className="absolute rounded-full network-node-1"
          style={{
            width: '100px',
            height: '100px',
            filter: 'blur(35px)',
            top: '8%',
            right: '25%',
            background:
              'radial-gradient(circle, rgba(14, 165, 233, 0.15) 0%, rgba(0, 212, 170, 0.08) 60%, transparent 100%)',
            willChange: 'transform',
          }}
        />

        <div
          className="absolute rounded-full network-node-2"
          style={{
            width: '120px',
            height: '120px',
            filter: 'blur(38px)',
            top: '65%',
            left: '8%',
            background:
              'radial-gradient(circle, rgba(168, 85, 247, 0.12) 0%, rgba(99, 102, 241, 0.08) 60%, transparent 100%)',
            willChange: 'transform',
          }}
        />

        <div
          className="absolute rounded-full network-node-3"
          style={{
            width: '90px',
            height: '90px',
            filter: 'blur(32px)',
            top: '45%',
            right: '12%',
            background:
              'radial-gradient(circle, rgba(0, 212, 170, 0.10) 0%, rgba(14, 165, 233, 0.06) 60%, transparent 100%)',
            willChange: 'transform',
          }}
        />

        {/* Additional satellite nodes */}
        <div
          className="absolute rounded-full network-node-4"
          style={{
            width: '60px',
            height: '60px',
            filter: 'blur(25px)',
            top: '30%',
            left: '5%',
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.08) 0%, transparent 70%)',
            willChange: 'transform',
          }}
        />

        <div
          className="absolute rounded-full network-node-5"
          style={{
            width: '70px',
            height: '70px',
            filter: 'blur(28px)',
            top: '75%',
            right: '30%',
            background: 'radial-gradient(circle, rgba(168, 85, 247, 0.06) 0%, transparent 70%)',
            willChange: 'transform',
          }}
        />

        {/* Enhanced Network connection lines with pulsing effect */}
        <div
          className="absolute network-connection-1"
          style={{
            width: '140px',
            height: '2px',
            top: '25%',
            left: '22%',
            background:
              'linear-gradient(45deg, rgba(99, 102, 241, 0.3) 0%, rgba(14, 165, 233, 0.15) 50%, rgba(0, 212, 170, 0.1) 100%)',
            transform: 'rotate(25deg)',
            willChange: 'opacity, transform',
            boxShadow: '0 0 6px rgba(99, 102, 241, 0.3)',
          }}
        />

        <div
          className="absolute network-connection-2"
          style={{
            width: '120px',
            height: '2px',
            top: '55%',
            left: '12%',
            background:
              'linear-gradient(135deg, rgba(168, 85, 247, 0.25) 0%, rgba(99, 102, 241, 0.12) 50%, rgba(14, 165, 233, 0.08) 100%)',
            transform: 'rotate(-30deg)',
            willChange: 'opacity, transform',
            boxShadow: '0 0 4px rgba(168, 85, 247, 0.2)',
          }}
        />

        <div
          className="absolute network-connection-3"
          style={{
            width: '100px',
            height: '2px',
            top: '40%',
            right: '20%',
            background: 'linear-gradient(90deg, rgba(0, 212, 170, 0.2) 0%, rgba(14, 165, 233, 0.1) 100%)',
            transform: 'rotate(60deg)',
            willChange: 'opacity, transform',
            boxShadow: '0 0 5px rgba(0, 212, 170, 0.2)',
          }}
        />

        <div
          className="absolute network-connection-4"
          style={{
            width: '80px',
            height: '1px',
            top: '32%',
            left: '8%',
            background:
              'linear-gradient(45deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.08) 100%)',
            transform: 'rotate(75deg)',
            willChange: 'opacity',
            boxShadow: '0 0 3px rgba(99, 102, 241, 0.15)',
          }}
        />

        <div
          className="absolute network-connection-5"
          style={{
            width: '90px',
            height: '1px',
            top: '70%',
            right: '25%',
            background:
              'linear-gradient(120deg, rgba(168, 85, 247, 0.12) 0%, rgba(0, 212, 170, 0.06) 100%)',
            transform: 'rotate(-45deg)',
            willChange: 'opacity',
            boxShadow: '0 0 4px rgba(168, 85, 247, 0.1)',
          }}
        />

        {/* Animated connection pulses - traveling dots */}
        <div
          className="absolute network-pulse-1"
          style={{
            width: '4px',
            height: '4px',
            top: '26%',
            left: '23%',
            background: 'rgba(99, 102, 241, 0.8)',
            borderRadius: '50%',
            willChange: 'transform',
            boxShadow: '0 0 8px rgba(99, 102, 241, 0.6)',
          }}
        />

        <div
          className="absolute network-pulse-2"
          style={{
            width: '3px',
            height: '3px',
            top: '56%',
            left: '13%',
            background: 'rgba(168, 85, 247, 0.9)',
            borderRadius: '50%',
            willChange: 'transform',
            boxShadow: '0 0 6px rgba(168, 85, 247, 0.7)',
          }}
        />

        <div
          className="absolute network-pulse-3"
          style={{
            width: '3px',
            height: '3px',
            top: '41%',
            right: '21%',
            background: 'rgba(0, 212, 170, 0.8)',
            borderRadius: '50%',
            willChange: 'transform',
            boxShadow: '0 0 7px rgba(0, 212, 170, 0.6)',
          }}
        />
      </div>

      <div className="relative flex items-center justify-center min-h-screen p-6">
        <div className="w-full max-w-md space-y-8">
          {/* Header */}
          <div className="text-center space-y-6">
            <Link href="/" className="inline-block group">
              <div className="flex items-center justify-center">
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-primary shadow-glass-lg transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl">
                  <Building2 className="w-7 h-7 text-white" />
                </div>
              </div>
            </Link>
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-3">
                <div className="relative">
                  <Users className="w-7 h-7 text-primary network-icon-pulse" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full network-connection-indicator"></div>
                </div>
                <div className="w-8 h-0.5 bg-gradient-to-r from-primary to-secondary network-connecting-line"></div>
                <Network className="w-6 h-6 text-secondary network-icon-float" />
              </div>
              <h1 className="text-4xl font-bold text-gradient-primary">Присоединиться к команде</h1>
              <p className="text-lg text-muted-foreground">Создайте аккаунт по приглашению</p>
            </div>
          </div>

          {/* Register Form */}
          <Card className="p-8 glass border-border/30 hover:shadow-glass-lg transition-all duration-500 rounded-3xl surface-glow">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
              {/* API Error */}
              {apiError && (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-destructive/10 border border-destructive/20 animate-in slide-in-from-top-2 duration-300">
                  <AlertCircle className="w-5 h-5 text-destructive" />
                  <p className="text-sm text-destructive">{apiError}</p>
                </div>
              )}

              <div className="space-y-5">
                {/* Invite code */}
                <div className="relative group">
                  <Network className="absolute left-3 top-3 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
                  <Input
                    {...register('inviteCode')}
                    id="inviteCode"
                    placeholder="Код приглашения"
                    disabled={isLoading}
                    readOnly={invitePrefilled}
                    aria-invalid={!!errors.inviteCode}
                    className={`${baseInput} ${
                      errors.inviteCode ? errorBorder : normalBorder
                    }`}
                  />
                  {errors.inviteCode && (
                    <p className="mt-1.5 text-xs text-destructive">{errors.inviteCode.message}</p>
                  )}
                </div>

                {/* Email */}
                <div className="relative group">
                  <Mail className="absolute left-3 top-3 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
                  <Input
                    {...register('email')}
                    id="email"
                    type="email"
                    placeholder="Email"
                    autoComplete="email"
                    disabled={isLoading}
                    aria-invalid={!!errors.email}
                    className={`${baseInput} ${errors.email ? errorBorder : normalBorder}`}
                  />
                  {errors.email && (
                    <p className="mt-1.5 text-xs text-destructive">{errors.email.message}</p>
                  )}
                </div>

                {/* Name */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative group">
                    <User className="absolute left-3 top-3 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
                    <Input
                      {...register('firstName')}
                      id="firstName"
                      placeholder="Имя"
                      autoComplete="given-name"
                      disabled={isLoading}
                      aria-invalid={!!errors.firstName}
                      className={`${baseInput} ${
                        errors.firstName ? errorBorder : normalBorder
                      }`}
                    />
                    {errors.firstName && (
                      <p className="mt-1.5 text-xs text-destructive">{errors.firstName.message}</p>
                    )}
                  </div>

                  <div className="relative group">
                    <User className="absolute left-3 top-3 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
                    <Input
                      {...register('lastName')}
                      id="lastName"
                      placeholder="Фамилия"
                      autoComplete="family-name"
                      disabled={isLoading}
                      aria-invalid={!!errors.lastName}
                      className={`${baseInput} ${
                        errors.lastName ? errorBorder : normalBorder
                      }`}
                    />
                    {errors.lastName && (
                      <p className="mt-1.5 text-xs text-destructive">{errors.lastName.message}</p>
                    )}
                  </div>
                </div>

                {/* Phone */}
                <div className="relative group">
                  <Phone className="absolute left-3 top-3 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
                  <Input
                    {...register('phone')}
                    id="phone"
                    placeholder="Телефон (необязательно)"
                    autoComplete="tel"
                    inputMode="tel"
                    disabled={isLoading}
                    aria-invalid={!!errors.phone}
                    className={`${baseInput} ${errors.phone ? errorBorder : normalBorder}`}
                  />
                  {errors.phone && (
                    <p className="mt-1.5 text-xs text-destructive">{errors.phone.message}</p>
                  )}
                </div>

                {/* Specialization */}
                <div className="relative group">
                  <Users className="absolute left-3 top-3 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
                  <Input
                    {...register('specialization')}
                    id="specialization"
                    placeholder="Специализация (необязательно)"
                    disabled={isLoading}
                    aria-invalid={!!errors.specialization}
                    className={`${baseInput} ${
                      errors.specialization ? errorBorder : normalBorder
                    }`}
                  />
                  {errors.specialization && (
                    <p className="mt-1.5 text-xs text-destructive">
                      {errors.specialization.message}
                    </p>
                  )}
                </div>

                {/* Password */}
                <div className="relative group">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
                  <Input
                    {...register('password')}
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Пароль"
                    autoComplete="new-password"
                    disabled={isLoading}
                    aria-invalid={!!errors.password}
                    className={`${baseInput} pr-12 ${
                      errors.password ? errorBorder : normalBorder
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-all duration-200 hover:scale-110"
                    disabled={isLoading}
                    aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                  {errors.password && (
                    <p className="mt-1.5 text-xs text-destructive">{errors.password.message}</p>
                  )}
                </div>

                {/* Confirm password */}
                <div className="relative group">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
                  <Input
                    {...register('confirmPassword')}
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Подтвердите пароль"
                    autoComplete="new-password"
                    disabled={isLoading}
                    aria-invalid={!!errors.confirmPassword}
                    className={`${baseInput} pr-12 ${
                      errors.confirmPassword ? errorBorder : normalBorder
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-all duration-200 hover:scale-110"
                    disabled={isLoading}
                    aria-label={showConfirmPassword ? 'Скрыть пароль' : 'Показать пароль'}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                  {errors.confirmPassword && (
                    <p className="mt-1.5 text-xs text-destructive">
                      {errors.confirmPassword.message}
                    </p>
                  )}
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full h-14 bg-gradient-primary hover:opacity-90 text-white font-medium group rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-glass-lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Создание аккаунта...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-5 h-5" />
                    Присоединиться к команде
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                  </div>
                )}
              </Button>

              <div className="text-center space-y-4">
                <p className="text-sm text-muted-foreground">
                  Уже есть аккаунт?{' '}
                  <Link
                    href="/login"
                    className="text-primary hover:text-secondary transition-colors font-medium hover:underline"
                  >
                    Войти в систему
                  </Link>
                </p>

                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Регистрируясь, вы соглашаетесь с</p>
                  <p>
                    <Link href="/terms" className="hover:text-foreground transition-colors hover:underline">
                      Условиями использования
                    </Link>
                    {' и '}
                    <Link href="/privacy" className="hover:text-foreground transition-colors hover:underline">
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
              className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300 hover:underline inline-flex items-center gap-2"
            >
              ← Вернуться на главную
            </Link>
          </div>
        </div>
      </div>

      {/* Enhanced Network visualization CSS animations */}
      <style jsx global>{`
        .network-hub {
          animation: network-pulse 3s ease-in-out infinite;
        }

        .network-node-1 {
          animation: network-float-1 5s ease-in-out infinite;
        }

        .network-node-2 {
          animation: network-float-2 6s ease-in-out infinite;
        }

        .network-node-3 {
          animation: network-float-3 5.5s ease-in-out infinite;
        }

        .network-node-4 {
          animation: network-float-4 4s ease-in-out infinite;
        }

        .network-node-5 {
          animation: network-float-5 4.5s ease-in-out infinite;
        }

        .network-connection-1 {
          animation: connection-pulse-1 2s ease-in-out infinite;
        }

        .network-connection-2 {
          animation: connection-pulse-2 2.5s ease-in-out infinite;
        }

        .network-connection-3 {
          animation: connection-pulse-3 3s ease-in-out infinite;
        }

        .network-connection-4 {
          animation: connection-fade-1 4s ease-in-out infinite;
        }

        .network-connection-5 {
          animation: connection-fade-2 3.5s ease-in-out infinite;
        }

        .network-pulse-1 {
          animation: pulse-travel-1 4s linear infinite;
        }

        .network-pulse-2 {
          animation: pulse-travel-2 3s linear infinite;
        }

        .network-pulse-3 {
          animation: pulse-travel-3 5s linear infinite;
        }

        .network-icon-pulse {
          animation: icon-pulse 2s ease-in-out infinite;
        }

        .network-icon-float {
          animation: icon-float 3s ease-in-out infinite;
        }

        .network-connection-indicator {
          animation: indicator-pulse 1.5s ease-in-out infinite;
        }

        .network-connecting-line {
          animation: line-flow 2s linear infinite;
        }

        @keyframes network-pulse {
          0%,
          100% {
            transform: scale(1);
            filter: blur(40px);
          }
          50% {
            transform: scale(1.15);
            filter: blur(45px);
          }
        }

        @keyframes network-float-1 {
          0%,
          100% {
            transform: translate3d(0, 0, 0);
          }
          50% {
            transform: translate3d(12px, -10px, 0);
          }
        }

        @keyframes network-float-2 {
          0%,
          100% {
            transform: translate3d(0, 0, 0);
          }
          50% {
            transform: translate3d(-10px, 8px, 0);
          }
        }

        @keyframes network-float-3 {
          0%,
          100% {
            transform: translate3d(0, 0, 0);
          }
          50% {
            transform: translate3d(8px, -12px, 0);
          }
        }

        @keyframes network-float-4 {
          0%,
          100% {
            transform: translate3d(0, 0, 0);
          }
          50% {
            transform: translate3d(-6px, 6px, 0);
          }
        }

        @keyframes network-float-5 {
          0%,
          100% {
            transform: translate3d(0, 0, 0);
          }
          50% {
            transform: translate3d(6px, 8px, 0);
          }
        }

        @keyframes connection-pulse-1 {
          0%,
          100% {
            opacity: 0.3;
            transform: scaleX(1);
          }
          50% {
            opacity: 0.8;
            transform: scaleX(1.1);
          }
        }

        @keyframes connection-pulse-2 {
          0%,
          100% {
            opacity: 0.25;
            transform: scaleX(1) scaleY(1);
          }
          50% {
            opacity: 0.7;
            transform: scaleX(1.05) scaleY(1.5);
          }
        }

        @keyframes connection-pulse-3 {
          0%,
          100% {
            opacity: 0.2;
            transform: scaleX(1);
          }
          50% {
            opacity: 0.6;
            transform: scaleX(1.15);
          }
        }

        @keyframes connection-fade-1 {
          0%,
          100% {
            opacity: 0.15;
          }
          50% {
            opacity: 0.4;
          }
        }

        @keyframes connection-fade-2 {
          0%,
          100% {
            opacity: 0.1;
          }
          50% {
            opacity: 0.35;
          }
        }

        @keyframes pulse-travel-1 {
          0% {
            transform: translate3d(0, 0, 0) scale(0.5);
            opacity: 0;
          }
          10% {
            opacity: 1;
            transform: scale(1);
          }
          90% {
            opacity: 1;
            transform: scale(1);
          }
          100% {
            transform: translate3d(80px, -30px, 0) scale(0.3);
            opacity: 0;
          }
        }

        @keyframes pulse-travel-2 {
          0% {
            transform: translate3d(0, 0, 0) scale(0.3);
            opacity: 0;
          }
          15% {
            opacity: 1;
            transform: scale(1);
          }
          85% {
            opacity: 1;
            transform: scale(0.8);
          }
          100% {
            transform: translate3d(-60px, 40px, 0) scale(0.2);
            opacity: 0;
          }
        }

        @keyframes pulse-travel-3 {
          0% {
            transform: translate3d(0, 0, 0) scale(0.4);
            opacity: 0;
          }
          20% {
            opacity: 1;
            transform: scale(1);
          }
          80% {
            opacity: 0.8;
            transform: scale(0.6);
          }
          100% {
            transform: translate3d(70px, -25px, 0) scale(0.2);
            opacity: 0;
          }
        }

        @keyframes icon-pulse {
          0%,
          100% {
            transform: scale(1);
            filter: drop-shadow(0 0 5px rgba(99, 102, 241, 0.3));
          }
          50% {
            transform: scale(1.1);
            filter: drop-shadow(0 0 10px rgba(99, 102, 241, 0.6));
          }
        }

        @keyframes icon-float {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-3px);
          }
        }

        @keyframes indicator-pulse {
          0%,
          100% {
            transform: scale(1);
            opacity: 0.7;
          }
          50% {
            transform: scale(1.3);
            opacity: 1;
          }
        }

        @keyframes line-flow {
          0% {
            background: linear-gradient(
              90deg,
              rgba(99, 102, 241, 0.3) 0%,
              rgba(14, 165, 233, 0.6) 50%,
              rgba(99, 102, 241, 0.3) 100%
            );
          }
          50% {
            background: linear-gradient(
              90deg,
              rgba(14, 165, 233, 0.6) 0%,
              rgba(99, 102, 241, 0.8) 50%,
              rgba(14, 165, 233, 0.6) 100%
            );
          }
          100% {
            background: linear-gradient(
              90deg,
              rgba(99, 102, 241, 0.3) 0%,
              rgba(14, 165, 233, 0.6) 50%,
              rgba(99, 102, 241, 0.3) 100%
            );
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .network-hub,
          .network-node-1,
          .network-node-2,
          .network-node-3,
          .network-node-4,
          .network-node-5,
          .network-connection-1,
          .network-connection-2,
          .network-connection-3,
          .network-connection-4,
          .network-connection-5,
          .network-pulse-1,
          .network-pulse-2,
          .network-pulse-3,
          .network-icon-pulse,
          .network-icon-float,
          .network-connection-indicator,
          .network-connecting-line {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  )
}

export default function RegisterInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen relative flex items-center justify-center">
          <div
            className="fixed inset-0 -z-10"
            style={{
              background: `radial-gradient(ellipse 700px 450px at 50% 50%, rgba(99, 102, 241, 0.1) 0%, transparent 65%)`,
            }}
          />
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
        </div>
      }
    >
      <RegisterInviteForm />
    </Suspense>
  )
}
