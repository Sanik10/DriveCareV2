// path: apps/frontend/app/(auth)/register/page.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Building2, ArrowRight, ArrowLeft, Check, AlertCircle, Eye, EyeOff, User, Mail, Phone, MapPin, Lock, Sparkles } from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { authAPI } from '@/lib/api/auth'
import { RegisterCompanyRequest, EMAIL_REGEX, PASSWORD_REGEX, PHONE_REGEX, NAME_REGEX } from '@/lib/types/auth'

const companySchema = z.object({
  companyName: z.string()
    .min(1, 'Название компании обязательно')
    .max(255, 'Название компании не может превышать 255 символов'),
  companyLegalName: z.string()
    .min(1, 'Юридическое название обязательно')
    .max(255, 'Юридическое название не может превышать 255 символов'),
  companyAddress: z.string()
    .max(500, 'Адрес не может превышать 500 символов')
    .optional(),
  companyPhone: z.string()
    .regex(PHONE_REGEX, 'Некорректный формат номера телефона')
    .optional()
    .or(z.literal('')),
  companyEmail: z.string()
    .min(1, 'Email компании обязателен')
    .regex(EMAIL_REGEX, 'Некорректный email компании'),
})

const ownerSchema = z.object({
  ownerEmail: z.string()
    .min(1, 'Email владельца обязателен')
    .regex(EMAIL_REGEX, 'Некорректный email владельца'),
  ownerFirstName: z.string()
    .min(1, 'Имя владельца обязательно')
    .max(100)
    .regex(NAME_REGEX, 'Имя может содержать только буквы, пробелы и дефисы'),
  ownerLastName: z.string()
    .min(1, 'Фамилия владельца обязательна')
    .max(100)
    .regex(NAME_REGEX, 'Фамилия может содержать только буквы, пробелы и дефисы'),
  ownerPhone: z.string()
    .regex(PHONE_REGEX, 'Некорректный формат номера телефона')
    .optional()
    .or(z.literal('')),
})

const securitySchema = z.object({
  ownerPassword: z.string()
    .min(8, 'Минимум 8 символов')
    .regex(PASSWORD_REGEX, 'Пароль должен содержать строчные и заглавные буквы, цифры и спецсимволы'),
  confirmPassword: z.string(),
  acceptTerms: z.boolean().refine(val => val === true, {
    message: 'Необходимо принять условия использования'
  }),
}).refine((data) => data.ownerPassword === data.confirmPassword, {
  message: 'Пароли не совпадают',
  path: ['confirmPassword'],
})

type CompanyForm = z.infer<typeof companySchema>
type OwnerForm = z.infer<typeof ownerSchema>
type SecurityForm = z.infer<typeof securitySchema>

type FullForm = CompanyForm & OwnerForm & SecurityForm

const steps = [
  { title: 'Компания', description: 'Информация об автосервисе' },
  { title: 'Владелец', description: 'Данные руководителя' },
  { title: 'Безопасность', description: 'Пароль и подтверждение' },
]

export default function RegisterPage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [allFormData, setAllFormData] = useState<Partial<FullForm>>({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const router = useRouter()

  const currentSchema = [companySchema, ownerSchema, securitySchema][currentStep]
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
    trigger,
    setValue
  } = useForm<FullForm>({
    resolver: zodResolver(currentSchema),
  })

  // Заполняем форму сохраненными данными при смене шага
  useEffect(() => {
    Object.entries(allFormData).forEach(([key, value]) => {
      if (value !== undefined) {
        setValue(key as keyof FullForm, value)
      }
    })
  }, [currentStep, allFormData, setValue])

  const onNext = async () => {
    const isValid = await trigger()
    if (!isValid) return

    const currentData = getValues()
    const updatedFormData = { ...allFormData, ...currentData }
    setAllFormData(updatedFormData)
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const onBack = () => {
    if (currentStep > 0) {
      // Сохраняем текущие данные
      const currentData = getValues()
      setAllFormData(prev => ({ ...prev, ...currentData }))
      setCurrentStep(currentStep - 1)
    }
  }

  const onSubmit = async (data: FullForm) => {
    setIsLoading(true)
    setApiError(null)
    setValidationErrors({})
    
    try {
      // Объединяем все данные
      const finalData = { ...allFormData, ...data }

      const requestData: RegisterCompanyRequest = {
        companyName: finalData.companyName!,
        companyLegalName: finalData.companyLegalName!,
        companyAddress: finalData.companyAddress && finalData.companyAddress.trim() !== '' ? finalData.companyAddress : undefined,
        companyPhone: finalData.companyPhone && finalData.companyPhone.trim() !== '' ? finalData.companyPhone : undefined,
        companyEmail: finalData.companyEmail!,
        ownerEmail: finalData.ownerEmail!,
        ownerPassword: finalData.ownerPassword!,
        ownerFirstName: finalData.ownerFirstName!,
        ownerLastName: finalData.ownerLastName!,
        ownerPhone: finalData.ownerPhone && finalData.ownerPhone.trim() !== '' ? finalData.ownerPhone : undefined,
      }

      await authAPI.registerCompany(requestData)
      
      // Редирект на страницу успеха
      router.push('/register/success')
    } catch (error) {
      if (error instanceof Error) {
        try {
          // Пытаемся парсить JSON ошибку от backend
          const errorData = JSON.parse(error.message)
          if (errorData.message && Array.isArray(errorData.message)) {
            // Если это массив ошибок валидации
            const validationErrs: Record<string, string> = {}
            errorData.message.forEach((msg: string) => {
              // Парсим сообщения типа "ownerEmail must be a valid email"
              const field = msg.split(' ')[0]
              validationErrs[field] = msg
            })
            setValidationErrors(validationErrs)
          } else {
            setApiError(errorData.message || 'Ошибка при регистрации')
          }
        } catch {
          setApiError(error.message || 'Неизвестная ошибка')
        }
      } else {
        setApiError('Неизвестная ошибка')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-5">
            <div className="relative group">
              <Building2 className="absolute left-3 top-3 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
              <Input
                {...register('companyName')}
                placeholder="Название компании"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                data-form-type="other"
                data-lpignore="true"
                disabled={isLoading}
                error={errors.companyName?.message || validationErrors.companyName}
                className="pl-12 h-12 rounded-2xl border-border/50 focus:border-primary/50 transition-all duration-300"
              />
            </div>
            
            <div className="relative group">
              <Building2 className="absolute left-3 top-3 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
              <Input
                {...register('companyLegalName')}
                placeholder="Юридическое название"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                data-form-type="other"
                data-lpignore="true"
                disabled={isLoading}
                error={errors.companyLegalName?.message || validationErrors.companyLegalName}
                className="pl-12 h-12 rounded-2xl border-border/50 focus:border-primary/50 transition-all duration-300"
              />
            </div>
            
            <div className="relative group">
              <MapPin className="absolute left-3 top-3 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
              <Input
                {...register('companyAddress')}
                placeholder="Адрес (необязательно)"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                data-form-type="other"
                data-lpignore="true"
                disabled={isLoading}
                error={errors.companyAddress?.message || validationErrors.companyAddress}
                className="pl-12 h-12 rounded-2xl border-border/50 focus:border-primary/50 transition-all duration-300"
              />
            </div>
            
            <div className="relative group">
              <Phone className="absolute left-3 top-3 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
              <Input
                {...register('companyPhone')}
                placeholder="Телефон (необязательно)"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                data-form-type="other"
                data-lpignore="true"
                disabled={isLoading}
                error={errors.companyPhone?.message || validationErrors.companyPhone}
                className="pl-12 h-12 rounded-2xl border-border/50 focus:border-primary/50 transition-all duration-300"
              />
            </div>
            
            <div className="relative group">
              <Mail className="absolute left-3 top-3 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
              <Input
                {...register('companyEmail')}
                type="email"
                placeholder="Email компании"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                data-form-type="other"
                data-lpignore="true"
                disabled={isLoading}
                error={errors.companyEmail?.message || validationErrors.companyEmail}
                className="pl-12 h-12 rounded-2xl border-border/50 focus:border-primary/50 transition-all duration-300"
              />
            </div>
          </div>
        )
      
      case 1:
        return (
          <div className="space-y-5">
            <div className="relative group">
              <Mail className="absolute left-3 top-3 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
              <Input
                {...register('ownerEmail')}
                type="email"
                placeholder="Email владельца"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                data-form-type="other"
                data-lpignore="true"
                disabled={isLoading}
                error={errors.ownerEmail?.message || validationErrors.ownerEmail}
                className="pl-12 h-12 rounded-2xl border-border/50 focus:border-primary/50 transition-all duration-300"
              />
            </div>
            
            <div className="relative group">
              <User className="absolute left-3 top-3 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
              <Input
                {...register('ownerFirstName')}
                placeholder="Имя владельца"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                data-form-type="other"
                data-lpignore="true"
                disabled={isLoading}
                error={errors.ownerFirstName?.message || validationErrors.ownerFirstName}
                className="pl-12 h-12 rounded-2xl border-border/50 focus:border-primary/50 transition-all duration-300"
              />
            </div>
            
            <div className="relative group">
              <User className="absolute left-3 top-3 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
              <Input
                {...register('ownerLastName')}
                placeholder="Фамилия владельца"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                data-form-type="other"
                data-lpignore="true"
                disabled={isLoading}
                error={errors.ownerLastName?.message || validationErrors.ownerLastName}
                className="pl-12 h-12 rounded-2xl border-border/50 focus:border-primary/50 transition-all duration-300"
              />
            </div>
            
            <div className="relative group">
              <Phone className="absolute left-3 top-3 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
              <Input
                {...register('ownerPhone')}
                placeholder="Телефон владельца (необязательно)"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                data-form-type="other"
                data-lpignore="true"
                disabled={isLoading}
                error={errors.ownerPhone?.message || validationErrors.ownerPhone}
                className="pl-12 h-12 rounded-2xl border-border/50 focus:border-primary/50 transition-all duration-300"
              />
            </div>
          </div>
        )
      
      case 2:
        return (
          <div className="space-y-5">
            <div className="relative group">
              <Lock className="absolute left-3 top-3 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
              <Input
                {...register('ownerPassword')}
                type={showPassword ? 'text' : 'password'}
                placeholder="Пароль"
                autoComplete="new-password"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                data-form-type="other"
                data-lpignore="true"
                disabled={isLoading}
                error={errors.ownerPassword?.message || validationErrors.ownerPassword}
                className="pl-12 pr-12 h-12 rounded-2xl border-border/50 focus:border-primary/50 transition-all duration-300"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-muted-foreground hover:text-foreground transition-all duration-200 hover:scale-110"
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>

            <div className="relative group">
              <Lock className="absolute left-3 top-3 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
              <Input
                {...register('confirmPassword')}
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Подтвердите пароль"
                autoComplete="new-password"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                data-form-type="other"
                data-lpignore="true"
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
                {showConfirmPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-2xl glass-subtle border border-border/30">
              <input
                {...register('acceptTerms')}
                type="checkbox"
                className="mt-1 w-4 h-4 text-primary border-border rounded focus:ring-primary focus:ring-2"
                disabled={isLoading}
              />
              <div className="text-sm">
                <label className="text-foreground leading-relaxed">
                  Я принимаю{' '}
                  <Link href="/terms" className="text-primary hover:text-secondary transition-colors underline">
                    Условия использования
                  </Link>
                  {' '}и{' '}
                  <Link href="/privacy" className="text-primary hover:text-secondary transition-colors underline">
                    Политику конфиденциальности
                  </Link>
                </label>
                {errors.acceptTerms && (
                  <p className="text-destructive text-sm mt-2">{errors.acceptTerms.message}</p>
                )}
              </div>
            </div>
          </div>
        )
      
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Optimized Background - Static gradients only */}
      <div 
        className="fixed inset-0 -z-10"
        style={{
          background: `
            radial-gradient(ellipse 700px 450px at 20% 30%, rgba(168, 85, 247, 0.15) 0%, transparent 65%),
            radial-gradient(ellipse 600px 600px at 80% 70%, rgba(99, 102, 241, 0.12) 0%, transparent 65%),
            radial-gradient(ellipse 650px 400px at 40% 80%, rgba(14, 165, 233, 0.08) 0%, transparent 65%)
          `
        }}
      />
      
      {/* Simplified floating orbs - only 2 orbs with lighter effects */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div 
          className="absolute rounded-full register-orb-1"
          style={{
            width: '300px',
            height: '300px',
            filter: 'blur(60px)',
            top: '10%',
            left: '10%',
            background: 'radial-gradient(circle, rgba(168, 85, 247, 0.08) 0%, transparent 70%)',
            willChange: 'transform',
          }}
        />
        
        <div 
          className="absolute rounded-full register-orb-2"
          style={{
            width: '350px',
            height: '350px',
            filter: 'blur(65px)',
            top: '40%',
            right: '10%',
            background: 'radial-gradient(circle, rgba(14, 165, 233, 0.06) 0%, transparent 70%)',
            willChange: 'transform',
          }}
        />
      </div>
      
      <div className="flex items-center justify-center min-h-screen p-6 relative z-10">
        <div className="w-full max-w-2xl space-y-8">
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
              <h1 className="text-4xl font-bold text-gradient-primary">
                Регистрация автосервиса
              </h1>
              <p className="text-lg text-muted-foreground">
                {steps[currentStep].description}
              </p>
            </div>
          </div>

          {/* Enhanced Steps Progress */}
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-4">
              {steps.map((step, index) => (
                <div key={index} className="flex items-center">
                  <div className={`flex items-center justify-center w-12 h-12 rounded-full text-sm font-medium transition-all duration-300 ${
                    index < currentStep 
                      ? 'bg-gradient-primary text-white shadow-glass' 
                      : index === currentStep 
                        ? 'bg-gradient-primary text-white shadow-glass scale-110' 
                        : 'bg-surface-1 text-muted-foreground border border-border glass-subtle'
                  }`}>
                    {index < currentStep ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-16 h-0.5 mx-3 transition-all duration-500 ${
                      index < currentStep ? 'bg-gradient-primary shadow-glow' : 'bg-border'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Enhanced Form */}
          <Card className="p-8 glass border-border/30 hover:shadow-glass-lg transition-all duration-500 rounded-3xl surface-glow">
            <form 
              onSubmit={handleSubmit(currentStep === steps.length - 1 ? onSubmit : onNext)} 
              className="space-y-6"
              autoComplete="off"
              noValidate
            >
              {/* API Error */}
              {apiError && (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-destructive/10 border border-destructive/20 animate-in slide-in-from-top-2 duration-300">
                  <AlertCircle className="w-5 h-5 text-destructive" />
                  <p className="text-sm text-destructive">{apiError}</p>
                </div>
              )}

              {/* Validation Errors */}
              {Object.keys(validationErrors).length > 0 && (
                <div className="space-y-3 p-4 rounded-2xl bg-destructive/10 border border-destructive/20 animate-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-destructive" />
                    <p className="text-sm font-medium text-destructive">Ошибки валидации:</p>
                  </div>
                  <ul className="text-sm text-destructive space-y-1 ml-8">
                    {Object.values(validationErrors).map((error, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <div className="w-1 h-1 bg-destructive rounded-full" />
                        {error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="space-y-4">
                <div className="text-center space-y-2">
                  <Sparkles className="w-6 h-6 text-primary mx-auto" />
                  <h3 className="text-xl font-semibold">{steps[currentStep].title}</h3>
                  <p className="text-sm text-muted-foreground">{steps[currentStep].description}</p>
                </div>

                {renderStep()}
              </div>

              <div className="flex items-center justify-between pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onBack}
                  disabled={currentStep === 0 || isLoading}
                  className="group h-12 rounded-2xl btn-outline-fixed"
                >
                  <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform duration-300" />
                  Назад
                </Button>

                <Button
                  type="submit"
                  className="group h-14 bg-gradient-primary hover:opacity-90 text-white font-medium rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-glass-lg px-8"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      {currentStep === steps.length - 1 ? 'Создание аккаунта...' : 'Загрузка...'}
                    </div>
                  ) : currentStep === steps.length - 1 ? (
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5" />
                      Создать автосервис
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      Далее
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                    </div>
                  )}
                </Button>
              </div>
            </form>
          </Card>

          {/* Footer */}
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
            
            <Link 
              href="/" 
              className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300 hover:underline inline-flex items-center gap-2"
            >
              ← Вернуться на главную
            </Link>
          </div>
        </div>
      </div>

      {/* Simplified CSS animations */}
      <style jsx global>{`
        .register-orb-1 {
          animation: gentle-float-1 20s ease-in-out infinite;
        }

        .register-orb-2 {
          animation: gentle-float-2 25s ease-in-out infinite;
        }

        @keyframes gentle-float-1 {
          0%, 100% { 
            transform: translate3d(0, 0, 0) scale(1); 
          }
          50% { 
            transform: translate3d(10px, -10px, 0) scale(1.05); 
          }
        }

        @keyframes gentle-float-2 {
          0%, 100% { 
            transform: translate3d(0, 0, 0) scale(1); 
          }
          50% { 
            transform: translate3d(-8px, 12px, 0) scale(0.95); 
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .register-orb-1, .register-orb-2 {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  )
}
