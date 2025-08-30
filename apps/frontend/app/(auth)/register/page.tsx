// path: apps/frontend/app/(auth)/register/page.tsx
"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Building2, ArrowRight, ArrowLeft, Check, AlertCircle, Eye, EyeOff } from 'lucide-react'
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
          <div className="space-y-4">
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
            />
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
            />
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
            />
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
            />
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
            />
          </div>
        )
      
      case 1:
        return (
          <div className="space-y-4">
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
            />
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
            />
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
            />
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
            />
          </div>
        )
      
      case 2:
        return (
          <div className="space-y-4">
            <div className="relative">
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
                className="pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>

            <div className="relative">
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
                className="pr-12"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                disabled={isLoading}
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>

            <div className="flex items-start gap-3">
              <input
                {...register('acceptTerms')}
                type="checkbox"
                className="mt-1.5 w-4 h-4 text-primary border-border rounded focus:ring-primary focus:ring-2"
                disabled={isLoading}
              />
              <div className="text-sm">
                <label className="text-foreground">
                  Я принимаю{' '}
                  <Link href="/terms" className="text-primary hover:text-secondary transition-colors">
                    Условия использования
                  </Link>
                  {' '}и{' '}
                  <Link href="/privacy" className="text-primary hover:text-secondary transition-colors">
                    Политику конфиденциальности
                  </Link>
                </label>
                {errors.acceptTerms && (
                  <p className="text-destructive text-sm mt-1">{errors.acceptTerms.message}</p>
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
    <div className="min-h-screen relative">
      {/* Fixed Background Effects */}
      <div className="fixed inset-0 bg-gradient-to-br from-background via-background to-surface-1 -z-10"></div>
      <div className="fixed inset-0 bg-gradient-surface -z-10"></div>
      <div className="fixed top-0 right-0 w-96 h-96 bg-gradient-primary opacity-10 rounded-full blur-3xl -z-10"></div>
      <div className="fixed bottom-0 left-0 w-64 h-64 bg-secondary/20 rounded-full blur-3xl -z-10"></div>
      
      <div className="flex items-center justify-center min-h-screen p-6">
        <div className="w-full max-w-2xl space-y-8">
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
                Регистрация автосервиса
              </h1>
              <p className="text-muted-foreground">
                {steps[currentStep].description}
              </p>
            </div>
          </div>

          {/* Steps Progress */}
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-4">
              {steps.map((step, index) => (
                <div key={index} className="flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-medium transition-colors ${
                    index < currentStep 
                      ? 'bg-primary text-white' 
                      : index === currentStep 
                        ? 'bg-primary text-white' 
                        : 'bg-surface-1 text-muted-foreground border border-border'
                  }`}>
                    {index < currentStep ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      index + 1
                    )}
                  </div>
                  {index < steps.length - 1 && (
                    <div className={`w-12 h-0.5 mx-2 transition-colors ${
                      index < currentStep ? 'bg-primary' : 'bg-border'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Form */}
          <Card className="p-8 shadow-glass border-border/50 backdrop-blur-sm bg-card/80">
            <form 
              onSubmit={handleSubmit(currentStep === steps.length - 1 ? onSubmit : onNext)} 
              className="space-y-6"
              autoComplete="off"
              noValidate
            >
              {/* API Error */}
              {apiError && (
                <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/20">
                  <AlertCircle className="w-4 h-4 text-destructive" />
                  <p className="text-sm text-destructive">{apiError}</p>
                </div>
              )}

              {/* Validation Errors */}
              {Object.keys(validationErrors).length > 0 && (
                <div className="space-y-2 p-3 rounded-md bg-destructive/10 border border-destructive/20">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-destructive" />
                    <p className="text-sm font-medium text-destructive">Ошибки валидации:</p>
                  </div>
                  <ul className="text-sm text-destructive space-y-1">
                    {Object.values(validationErrors).map((error, idx) => (
                      <li key={idx}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="space-y-1">
                <h3 className="text-xl font-semibold">{steps[currentStep].title}</h3>
                <p className="text-sm text-muted-foreground">{steps[currentStep].description}</p>
              </div>

              {renderStep()}

              <div className="flex items-center justify-between pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onBack}
                  disabled={currentStep === 0 || isLoading}
                  className="group"
                >
                  <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                  Назад
                </Button>

                <Button
                  type="submit"
                  className="group bg-gradient-primary hover:opacity-90 text-white"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      {currentStep === steps.length - 1 ? 'Создание...' : 'Загрузка...'}
                    </div>
                  ) : currentStep === steps.length - 1 ? (
                    <div className="flex items-center gap-2">
                      Создать аккаунт
                      <Check className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      Далее
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
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
                className="text-primary hover:text-secondary transition-colors font-medium"
              >
                Войти в систему
              </Link>
            </p>
            
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
