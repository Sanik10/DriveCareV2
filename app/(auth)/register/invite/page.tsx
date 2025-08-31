// path: app/(auth)/register/invite/page.tsx
"use client"

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { UserPlus, ArrowRight, Building2, AlertCircle, User, Mail, Phone, Lock, Eye, EyeOff, Users, Network } from 'lucide-react'
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
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
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
    <div className="min-h-screen relative overflow-hidden">
      {/* Enhanced Network Background */}
      <div 
        className="fixed inset-0 -z-10"
        style={{
          background: `
            radial-gradient(ellipse 600px 400px at 50% 30%, rgba(99, 102, 241, 0.15) 0%, transparent 70%),
            radial-gradient(ellipse 500px 500px at 20% 70%, rgba(14, 165, 233, 0.12) 0%, transparent 70%),
            radial-gradient(ellipse 400px 300px at 80% 80%, rgba(168, 85, 247, 0.08) 0%, transparent 70%)
          `
        }}
      />
      
      {/* Advanced Network Topology */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        {/* Central Hub - Company Network Core */}
        <div 
          className="absolute rounded-full central-hub"
          style={{
            width: '200px',
            height: '200px',
            filter: 'blur(45px)',
            top: '25%',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, rgba(14, 165, 233, 0.15) 60%, transparent 100%)',
            willChange: 'transform',
          }}
        />
        
        {/* Department Nodes - Connected to central hub */}
        <div 
          className="absolute rounded-full dept-node-1"
          style={{
            width: '120px',
            height: '120px',
            filter: 'blur(35px)',
            top: '8%',
            left: '35%',
            background: 'radial-gradient(circle, rgba(14, 165, 233, 0.18) 0%, rgba(0, 212, 170, 0.12) 60%, transparent 100%)',
            willChange: 'transform',
          }}
        />
        
        <div 
          className="absolute rounded-full dept-node-2"
          style={{
            width: '110px',
            height: '110px',
            filter: 'blur(33px)',
            top: '15%',
            right: '25%',
            background: 'radial-gradient(circle, rgba(168, 85, 247, 0.15) 0%, rgba(99, 102, 241, 0.10) 60%, transparent 100%)',
            willChange: 'transform',
          }}
        />
        
        <div 
          className="absolute rounded-full dept-node-3"
          style={{
            width: '130px',
            height: '130px',
            filter: 'blur(38px)',
            bottom: '25%',
            left: '20%',
            background: 'radial-gradient(circle, rgba(0, 212, 170, 0.16) 0%, rgba(14, 165, 233, 0.08) 60%, transparent 100%)',
            willChange: 'transform',
          }}
        />
        
        <div 
          className="absolute rounded-full dept-node-4"
          style={{
            width: '100px',
            height: '100px',
            filter: 'blur(30px)',
            bottom: '20%',
            right: '30%',
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.12) 0%, rgba(168, 85, 247, 0.08) 60%, transparent 100%)',
            willChange: 'transform',
          }}
        />

        {/* Employee Nodes - Smaller satellites */}
        <div 
          className="absolute rounded-full emp-node-1"
          style={{
            width: '60px',
            height: '60px',
            filter: 'blur(20px)',
            top: '45%',
            left: '15%',
            background: 'radial-gradient(circle, rgba(14, 165, 233, 0.10) 0%, transparent 70%)',
            willChange: 'transform',
          }}
        />
        
        <div 
          className="absolute rounded-full emp-node-2"
          style={{
            width: '70px',
            height: '70px',
            filter: 'blur(23px)',
            top: '60%',
            right: '15%',
            background: 'radial-gradient(circle, rgba(168, 85, 247, 0.08) 0%, transparent 70%)',
            willChange: 'transform',
          }}
        />

        {/* Main Network Backbone - Hub to Department connections */}
        <div className="absolute backbone-connection-1" style={{
          width: '160px',
          height: '3px',
          top: '20%',
          left: '42%',
          background: 'linear-gradient(45deg, rgba(99, 102, 241, 0.4) 0%, rgba(14, 165, 233, 0.25) 100%)',
          transform: 'rotate(-25deg)',
          willChange: 'opacity, transform',
          boxShadow: '0 0 8px rgba(99, 102, 241, 0.3)',
        }} />
        
        <div className="absolute backbone-connection-2" style={{
          width: '140px',
          height: '3px',
          top: '25%',
          right: '32%',
          background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.35) 0%, rgba(99, 102, 241, 0.20) 100%)',
          transform: 'rotate(35deg)',
          willChange: 'opacity, transform',
          boxShadow: '0 0 6px rgba(168, 85, 247, 0.25)',
        }} />
        
        <div className="absolute backbone-connection-3" style={{
          width: '150px',
          height: '3px',
          bottom: '35%',
          left: '30%',
          background: 'linear-gradient(45deg, rgba(0, 212, 170, 0.3) 0%, rgba(14, 165, 233, 0.18) 100%)',
          transform: 'rotate(25deg)',
          willChange: 'opacity, transform',
          boxShadow: '0 0 7px rgba(0, 212, 170, 0.2)',
        }} />
        
        <div className="absolute backbone-connection-4" style={{
          width: '120px',
          height: '3px',
          bottom: '30%',
          right: '35%',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25) 0%, rgba(168, 85, 247, 0.15) 100%)',
          transform: 'rotate(-40deg)',
          willChange: 'opacity, transform',
          boxShadow: '0 0 5px rgba(99, 102, 241, 0.2)',
        }} />

        {/* Secondary Network - Department to Employee connections */}
        <div className="absolute secondary-connection-1" style={{
          width: '80px',
          height: '2px',
          top: '35%',
          left: '22%',
          background: 'linear-gradient(60deg, rgba(14, 165, 233, 0.2) 0%, rgba(0, 212, 170, 0.1) 100%)',
          transform: 'rotate(55deg)',
          willChange: 'opacity',
          boxShadow: '0 0 4px rgba(14, 165, 233, 0.15)',
        }} />
        
        <div className="absolute secondary-connection-2" style={{
          width: '90px',
          height: '2px',
          bottom: '35%',
          right: '20%',
          background: 'linear-gradient(120deg, rgba(168, 85, 247, 0.18) 0%, rgba(99, 102, 241, 0.08) 100%)',
          transform: 'rotate(-30deg)',
          willChange: 'opacity',
          boxShadow: '0 0 3px rgba(168, 85, 247, 0.12)',
        }} />

        {/* Data Flow Pulses - Traveling along connections */}
        <div className="absolute data-pulse-1" style={{
          width: '5px',
          height: '5px',
          top: '21%',
          left: '43%',
          background: 'rgba(99, 102, 241, 0.9)',
          borderRadius: '50%',
          willChange: 'transform',
          boxShadow: '0 0 10px rgba(99, 102, 241, 0.7)',
        }} />
        
        <div className="absolute data-pulse-2" style={{
          width: '4px',
          height: '4px',
          top: '26%',
          right: '33%',
          background: 'rgba(168, 85, 247, 0.8)',
          borderRadius: '50%',
          willChange: 'transform',
          boxShadow: '0 0 8px rgba(168, 85, 247, 0.6)',
        }} />
        
        <div className="absolute data-pulse-3" style={{
          width: '4px',
          height: '4px',
          bottom: '36%',
          left: '31%',
          background: 'rgba(0, 212, 170, 0.9)',
          borderRadius: '50%',
          willChange: 'transform',
          boxShadow: '0 0 9px rgba(0, 212, 170, 0.7)',
        }} />

        {/* Network Activity Indicators */}
        <div className="absolute activity-ring-1" style={{
          width: '80px',
          height: '80px',
          border: '1px solid rgba(99, 102, 241, 0.15)',
          borderRadius: '50%',
          top: '31%',
          left: '46%',
          willChange: 'transform, opacity',
        }} />
        
        <div className="absolute activity-ring-2" style={{
          width: '120px',
          height: '120px',
          border: '1px solid rgba(14, 165, 233, 0.10)',
          borderRadius: '50%',
          top: '27%',
          left: '44%',
          willChange: 'transform, opacity',
        }} />
      </div>
      
      <div className="relative flex items-center justify-center min-h-screen p-6">
        <div className="w-full max-w-md space-y-8">
          {/* Enhanced Header */}
          <div className="text-center space-y-6">
            <Link href="/" className="inline-block group">
              <div className="flex items-center justify-center">
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-primary shadow-glass-lg transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl">
                  <Building2 className="w-7 h-7 text-white" />
                </div>
              </div>
            </Link>
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-4">
                <div className="relative network-connection-visual">
                  <Users className="w-7 h-7 text-primary network-icon-pulse" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full network-status-indicator"></div>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-0.5 bg-gradient-to-r from-primary to-secondary network-line-segment-1"></div>
                  <div className="w-2 h-2 rounded-full bg-secondary network-node-indicator"></div>
                  <div className="w-3 h-0.5 bg-gradient-to-r from-secondary to-accent network-line-segment-2"></div>
                </div>
                <Network className="w-6 h-6 text-secondary network-icon-float" />
              </div>
              <h1 className="text-4xl font-bold text-gradient-primary">
                Присоединиться к команде
              </h1>
              <p className="text-lg text-muted-foreground">
                Создайте аккаунт по приглашению компании
              </p>
            </div>
          </div>

          {/* Register Form */}
          <Card className="p-8 glass border-border/30 hover:shadow-glass-lg transition-all duration-500 rounded-3xl surface-glow">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* API Error */}
              {apiError && (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-destructive/10 border border-destructive/20 animate-in slide-in-from-top-2 duration-300">
                  <AlertCircle className="w-5 h-5 text-destructive" />
                  <p className="text-sm text-destructive">{apiError}</p>
                </div>
              )}

              <div className="space-y-5">
                <div className="relative group">
                  <Network className="absolute left-3 top-3 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
                  <Input
                    {...register('inviteCode')}
                    placeholder="Код приглашения"
                    disabled={isLoading}
                    error={errors.inviteCode?.message}
                    className="pl-12 h-12 rounded-2xl border-border/50 focus:border-primary/50 transition-all duration-300"
                  />
                </div>

                <div className="relative group">
                  <Mail className="absolute left-3 top-3 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
                  <Input
                    {...register('email')}
                    type="email"
                    placeholder="Email"
                    autoComplete="email"
                    disabled={isLoading}
                    error={errors.email?.message}
                    className="pl-12 h-12 rounded-2xl border-border/50 focus:border-primary/50 transition-all duration-300"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="relative group">
                    <User className="absolute left-3 top-3 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
                    <Input
                      {...register('firstName')}
                      placeholder="Имя"
                      disabled={isLoading}
                      error={errors.firstName?.message}
                      className="pl-12 h-12 rounded-2xl border-border/50 focus:border-primary/50 transition-all duration-300"
                    />
                  </div>

                  <div className="relative group">
                    <User className="absolute left-3 top-3 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
                    <Input
                      {...register('lastName')}
                      placeholder="Фамилия"
                      disabled={isLoading}
                      error={errors.lastName?.message}
                      className="pl-12 h-12 rounded-2xl border-border/50 focus:border-primary/50 transition-all duration-300"
                    />
                  </div>
                </div>

                <div className="relative group">
                  <Phone className="absolute left-3 top-3 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
                  <Input
                    {...register('phone')}
                    placeholder="Телефон (необязательно)"
                    disabled={isLoading}
                    error={errors.phone?.message}
                    className="pl-12 h-12 rounded-2xl border-border/50 focus:border-primary/50 transition-all duration-300"
                  />
                </div>

                <div className="relative group">
                  <Users className="absolute left-3 top-3 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
                  <Input
                    {...register('specialization')}
                    placeholder="Специализация (необязательно)"
                    disabled={isLoading}
                    error={errors.specialization?.message}
                    className="pl-12 h-12 rounded-2xl border-border/50 focus:border-primary/50 transition-all duration-300"
                  />
                </div>

                <div className="relative group">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
                  <Input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Пароль"
                    autoComplete="new-password"
                    disabled={isLoading}
                    error={errors.password?.message}
                    className="pl-12 pr-12 h-12 rounded-2xl border-border/50 focus:border-primary/50 transition-all duration-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-all duration-200 hover:scale-110"
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                <div className="relative group">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
                  <Input
                    {...register('confirmPassword')}
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Подтвердите пароль"
                    autoComplete="new-password"
                    disabled={isLoading}
                    error={errors.confirmPassword?.message}
                    className="pl-12 pr-12 h-12 rounded-2xl border-border/50 focus:border-primary/50 transition-all duration-300"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-all duration-200 hover:scale-110"
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
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
                    Подключение к сети...
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

      {/* Optimized Network Topology CSS */}
      <style jsx global>{`
        .central-hub {
          animation: hub-central-pulse 4s ease-in-out infinite;
        }

        .dept-node-1 {
          animation: dept-orbit-1 20s linear infinite;
        }

        .dept-node-2 {
          animation: dept-orbit-2 25s linear infinite;
        }

        .dept-node-3 {
          animation: dept-orbit-3 18s linear infinite;
        }

        .dept-node-4 {
          animation: dept-orbit-4 22s linear infinite;
        }

        .emp-node-1 {
          animation: emp-satellite-1 12s ease-in-out infinite;
        }

        .emp-node-2 {
          animation: emp-satellite-2 15s ease-in-out infinite;
        }

        .backbone-connection-1 {
          animation: backbone-data-flow-1 3s ease-in-out infinite;
        }

        .backbone-connection-2 {
          animation: backbone-data-flow-2 3.5s ease-in-out infinite;
        }

        .backbone-connection-3 {
          animation: backbone-data-flow-3 2.8s ease-in-out infinite;
        }

        .backbone-connection-4 {
          animation: backbone-data-flow-4 3.2s ease-in-out infinite;
        }

        .secondary-connection-1 {
          animation: secondary-data-flow-1 4s ease-in-out infinite;
        }

        .secondary-connection-2 {
          animation: secondary-data-flow-2 5s ease-in-out infinite;
        }

        .data-pulse-1 {
          animation: data-travel-1 6s linear infinite;
        }

        .data-pulse-2 {
          animation: data-travel-2 7s linear infinite;
        }

        .data-pulse-3 {
          animation: data-travel-3 5s linear infinite;
        }

        .activity-ring-1 {
          animation: network-activity-1 8s linear infinite;
        }

        .activity-ring-2 {
          animation: network-activity-2 12s linear infinite;
        }

        .network-icon-pulse {
          animation: icon-network-pulse 2s ease-in-out infinite;
        }

        .network-icon-float {
          animation: icon-network-float 3s ease-in-out infinite;
        }

        .network-status-indicator {
          animation: status-blink 1.5s ease-in-out infinite;
        }

        .network-line-segment-1 {
          animation: segment-flow-1 2s linear infinite;
        }

        .network-line-segment-2 {
          animation: segment-flow-2 2.5s linear infinite;
        }

        .network-node-indicator {
          animation: node-activity 3s ease-in-out infinite;
        }

        /* Central hub animations */
        @keyframes hub-central-pulse {
          0%, 100% { 
            transform: translateX(-50%) scale(1);
            filter: blur(45px);
          }
          50% { 
            transform: translateX(-50%) scale(1.1);
            filter: blur(50px);
          }
        }

        /* Department nodes - realistic orbital motion */
        @keyframes dept-orbit-1 {
          0% { 
            transform: translate3d(0, 0, 0);
          }
          25% { 
            transform: translate3d(15px, -8px, 0);
          }
          50% { 
            transform: translate3d(8px, 12px, 0);
          }
          75% { 
            transform: translate3d(-10px, 5px, 0);
          }
          100% { 
            transform: translate3d(0, 0, 0);
          }
        }

        @keyframes dept-orbit-2 {
          0% { 
            transform: translate3d(0, 0, 0);
          }
          30% { 
            transform: translate3d(-12px, 10px, 0);
          }
          60% { 
            transform: translate3d(8px, -6px, 0);
          }
          100% { 
            transform: translate3d(0, 0, 0);
          }
        }

        @keyframes dept-orbit-3 {
          0% { 
            transform: translate3d(0, 0, 0);
          }
          40% { 
            transform: translate3d(10px, -12px, 0);
          }
          80% { 
            transform: translate3d(-8px, 8px, 0);
          }
          100% { 
            transform: translate3d(0, 0, 0);
          }
        }

        @keyframes dept-orbit-4 {
          0% { 
            transform: translate3d(0, 0, 0);
          }
          35% { 
            transform: translate3d(-15px, -5px, 0);
          }
          70% { 
            transform: translate3d(12px, 10px, 0);
          }
          100% { 
            transform: translate3d(0, 0, 0);
          }
        }

        /* Employee satellites */
        @keyframes emp-satellite-1 {
          0%, 100% { 
            transform: translate3d(0, 0, 0);
          }
          50% { 
            transform: translate3d(8px, -10px, 0);
          }
        }

        @keyframes emp-satellite-2 {
          0%, 100% { 
            transform: translate3d(0, 0, 0);
          }
          50% { 
            transform: translate3d(-10px, 12px, 0);
          }
        }

        /* Backbone connections - data flow visualization */
        @keyframes backbone-data-flow-1 {
          0%, 100% { 
            opacity: 0.4;
            transform: scaleX(1) scaleY(1);
          }
          50% { 
            opacity: 0.8;
            transform: scaleX(1.1) scaleY(1.5);
          }
        }

        @keyframes backbone-data-flow-2 {
          0%, 100% { 
            opacity: 0.35;
            transform: scaleX(1) scaleY(1);
          }
          50% { 
            opacity: 0.7;
            transform: scaleX(1.05) scaleY(1.3);
          }
        }

        @keyframes backbone-data-flow-3 {
          0%, 100% { 
            opacity: 0.3;
            transform: scaleX(1) scaleY(1);
          }
          50% { 
            opacity: 0.6;
            transform: scaleX(1.08) scaleY(1.4);
          }
        }

        @keyframes backbone-data-flow-4 {
          0%, 100% { 
            opacity: 0.25;
            transform: scaleX(1) scaleY(1);
          }
          50% { 
            opacity: 0.65;
            transform: scaleX(1.06) scaleY(1.2);
          }
        }

        /* Secondary connections */
        @keyframes secondary-data-flow-1 {
          0%, 100% { 
            opacity: 0.2;
          }
          50% { 
            opacity: 0.5;
          }
        }

        @keyframes secondary-data-flow-2 {
          0%, 100% { 
            opacity: 0.18;
          }
          50% { 
            opacity: 0.45;
          }
        }

        /* Data packet travel */
        @keyframes data-travel-1 {
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
            transform: scale(0.8);
          }
          100% { 
            transform: translate3d(120px, -50px, 0) scale(0.3);
            opacity: 0;
          }
        }

        @keyframes data-travel-2 {
          0% { 
            transform: translate3d(0, 0, 0) scale(0.4);
            opacity: 0;
          }
          15% { 
            opacity: 1;
            transform: scale(1);
          }
          85% { 
            opacity: 0.8;
            transform: scale(0.6);
          }
          100% { 
            transform: translate3d(-100px, 40px, 0) scale(0.2);
            opacity: 0;
          }
        }

        @keyframes data-travel-3 {
          0% { 
            transform: translate3d(0, 0, 0) scale(0.6);
            opacity: 0;
          }
          20% { 
            opacity: 1;
            transform: scale(1);
          }
          80% { 
            opacity: 0.9;
            transform: scale(0.7);
          }
          100% { 
            transform: translate3d(80px, -30px, 0) scale(0.25);
            opacity: 0;
          }
        }

        /* Network activity rings */
        @keyframes network-activity-1 {
          0% { 
            transform: scale(0.8);
            opacity: 0;
          }
          50% { 
            opacity: 1;
          }
          100% { 
            transform: scale(1.5);
            opacity: 0;
          }
        }

        @keyframes network-activity-2 {
          0% { 
            transform: scale(0.6);
            opacity: 0;
          }
          40% { 
            opacity: 0.5;
          }
          100% { 
            transform: scale(1.8);
            opacity: 0;
          }
        }

        /* Header network icons */
        @keyframes icon-network-pulse {
          0%, 100% { 
            transform: scale(1);
            filter: drop-shadow(0 0 5px rgba(99, 102, 241, 0.3));
          }
          50% { 
            transform: scale(1.1);
            filter: drop-shadow(0 0 12px rgba(99, 102, 241, 0.6));
          }
        }

        @keyframes icon-network-float {
          0%, 100% { 
            transform: translateY(0);
          }
          50% { 
            transform: translateY(-3px);
          }
        }

        @keyframes status-blink {
          0%, 100% { 
            transform: scale(1);
            opacity: 0.7;
          }
          50% { 
            transform: scale(1.3);
            opacity: 1;
          }
        }

        @keyframes segment-flow-1 {
          0% { 
            background: linear-gradient(90deg, rgba(99, 102, 241, 0.3) 0%, rgba(14, 165, 233, 0.6) 50%, rgba(99, 102, 241, 0.3) 100%);
          }
          50% { 
            background: linear-gradient(90deg, rgba(14, 165, 233, 0.6) 0%, rgba(99, 102, 241, 0.8) 50%, rgba(14, 165, 233, 0.6) 100%);
          }
          100% { 
            background: linear-gradient(90deg, rgba(99, 102, 241, 0.3) 0%, rgba(14, 165, 233, 0.6) 50%, rgba(99, 102, 241, 0.3) 100%);
          }
        }

        @keyframes segment-flow-2 {
          0% { 
            background: linear-gradient(90deg, rgba(14, 165, 233, 0.4) 0%, rgba(168, 85, 247, 0.7) 50%, rgba(14, 165, 233, 0.4) 100%);
          }
          50% { 
            background: linear-gradient(90deg, rgba(168, 85, 247, 0.7) 0%, rgba(14, 165, 233, 0.9) 50%, rgba(168, 85, 247, 0.7) 100%);
          }
          100% { 
            background: linear-gradient(90deg, rgba(14, 165, 233, 0.4) 0%, rgba(168, 85, 247, 0.7) 50%, rgba(14, 165, 233, 0.4) 100%);
          }
        }

        @keyframes node-activity {
          0%, 100% { 
            transform: scale(1);
            opacity: 0.8;
          }
          50% { 
            transform: scale(1.2);
            opacity: 1;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .central-hub, .dept-node-1, .dept-node-2, .dept-node-3, .dept-node-4,
          .emp-node-1, .emp-node-2, .backbone-connection-1, .backbone-connection-2,
          .backbone-connection-3, .backbone-connection-4, .secondary-connection-1,
          .secondary-connection-2, .data-pulse-1, .data-pulse-2, .data-pulse-3,
          .activity-ring-1, .activity-ring-2, .network-icon-pulse, .network-icon-float,
          .network-status-indicator, .network-line-segment-1, .network-line-segment-2,
          .network-node-indicator {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  )
}

export default function RegisterInvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen relative flex items-center justify-center">
        <div className="fixed inset-0 -z-10" style={{
          background: `radial-gradient(ellipse 700px 450px at 50% 50%, rgba(99, 102, 241, 0.1) 0%, transparent 65%)`
        }} />
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      </div>
    }>
      <RegisterInviteForm />
    </Suspense>
  )
}
