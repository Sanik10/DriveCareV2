// path: apps/frontend/app/(auth)/register/page.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Building2,
  ArrowRight,
  ArrowLeft,
  Check,
  AlertCircle,
  User,
  Mail,
  Phone,
  MapPin,
  Lock,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { authAPI } from '@/lib/api/auth';
import { RegisterCompanyRequest, EMAIL_REGEX, PASSWORD_REGEX, PHONE_REGEX, NAME_REGEX } from '@/lib/types/auth';
import styles from './register.module.css';

/**
 * Шаговые схемы валидации (строгая изоляция)
 */
const companySchema = z.object({
  companyName: z.string().min(1, 'Название компании обязательно').max(255, 'Название компании не может превышать 255 символов'),
  companyLegalName: z
    .string()
    .min(1, 'Юридическое название обязательно')
    .max(255, 'Юридическое название не может превышать 255 символов'),
  companyAddress: z.string().max(500, 'Адрес не может превышать 500 символов').optional().or(z.literal('')),
  companyPhone: z.string().regex(PHONE_REGEX, 'Некорректный формат номера телефона').optional().or(z.literal('')),
  companyEmail: z.string().min(1, 'Email компании обязателен').regex(EMAIL_REGEX, 'Некорректный email компании'),
});

const ownerSchema = z.object({
  ownerEmail: z.string().min(1, 'Email владельца обязателен').regex(EMAIL_REGEX, 'Некорректный email владельца'),
  ownerFirstName: z
    .string()
    .min(1, 'Имя владельца обязательно')
    .max(100)
    .regex(NAME_REGEX, 'Имя может содержать только буквы, пробелы и дефисы'),
  ownerLastName: z
    .string()
    .min(1, 'Фамилия владельца обязательна')
    .max(100)
    .regex(NAME_REGEX, 'Фамилия может содержать только буквы, пробелы и дефисы'),
  ownerPhone: z.string().regex(PHONE_REGEX, 'Некорректный формат номера телефона').optional().or(z.literal('')),
});

const securitySchema = z
  .object({
    ownerPassword: z
      .string()
      .min(8, 'Минимум 8 символов')
      .regex(PASSWORD_REGEX, 'Пароль должен содержать строчные и заглавные буквы, цифры и спецсимволы'),
    confirmPassword: z.string(),
    acceptTerms: z.boolean().refine((val) => val === true, {
      message: 'Необходимо принять условия использования',
    }),
  })
  .refine((data) => data.ownerPassword === data.confirmPassword, {
    message: 'Пароли не совпадают',
    path: ['confirmPassword'],
  });

type CompanyForm = z.infer<typeof companySchema>;
type OwnerForm = z.infer<typeof ownerSchema>;
type SecurityForm = z.infer<typeof securitySchema>;
type FullForm = CompanyForm & OwnerForm & SecurityForm;

const steps = [
  { title: 'Компания', description: 'Информация об автосервисе' },
  { title: 'Владелец', description: 'Данные руководителя' },
  { title: 'Безопасность', description: 'Пароль и подтверждение' },
];

const STEP_FIELDS: Array<(keyof FullForm)[]> = [
  ['companyName', 'companyLegalName', 'companyAddress', 'companyPhone', 'companyEmail'],
  ['ownerEmail', 'ownerFirstName', 'ownerLastName', 'ownerPhone'],
  ['ownerPassword', 'confirmPassword', 'acceptTerms'],
];

function pickStepValues<T extends Record<string, unknown>>(obj: T, keys: (keyof T)[]) {
  const out: Partial<T> = {};
  keys.forEach((k) => {
    if (k in obj) out[k] = obj[k];
  });
  return out;
}

type StepValidationErrors<T> = Partial<Record<keyof T, string>>;

function CompanyStepForm({
  defaultValues,
  isLoading,
  externalValidationErrors,
  onSubmit,
  submitLabel,
}: {
  defaultValues: Partial<CompanyForm>;
  isLoading: boolean;
  externalValidationErrors?: StepValidationErrors<CompanyForm>;
  onSubmit: (data: CompanyForm) => void;
  submitLabel: string;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CompanyForm>({
    resolver: zodResolver(companySchema),
    defaultValues,
    mode: 'onSubmit',
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" autoComplete="off" noValidate data-form-type="other" data-lpignore="true">
      <div className="space-y-4">
        <div className="text-center space-y-2">
          <Sparkles className="w-6 h-6 text-primary mx-auto" />
          <h3 className="text-xl font-semibold">{steps[0].title}</h3>
          <p className="text-sm text-muted-foreground">{steps[0].description}</p>
        </div>

        <div className="space-y-5" id="reg-step-company" aria-labelledby="reg-step-company-title">
          <div className="relative group">
            <Building2 className="absolute left-3 top-3 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
            <Input
              id="companyName"
              {...register('companyName')}
              placeholder="Название компании"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              disabled={isLoading}
              error={errors.companyName?.message || externalValidationErrors?.companyName}
              className="pl-12 h-12 rounded-2xl border-border/50 focus:border-primary/50 transition-all duration-300"
            />
          </div>

          <div className="relative group">
            <Building2 className="absolute left-3 top-3 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
            <Input
              id="companyLegalName"
              {...register('companyLegalName')}
              placeholder="Юридическое название"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              disabled={isLoading}
              error={errors.companyLegalName?.message || externalValidationErrors?.companyLegalName}
              className="pl-12 h-12 rounded-2xl border-border/50 focus:border-primary/50 transition-all duration-300"
            />
          </div>

          <div className="relative group">
            <MapPin className="absolute left-3 top-3 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
            <Input
              id="companyAddress"
              {...register('companyAddress')}
              placeholder="Адрес (необязательно)"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              disabled={isLoading}
              error={errors.companyAddress?.message || externalValidationErrors?.companyAddress}
              className="pl-12 h-12 rounded-2xl border-border/50 focus:border-primary/50 transition-all duration-300"
            />
          </div>

          <div className="relative group">
            <Phone className="absolute left-3 top-3 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
            <Input
              id="companyPhone"
              {...register('companyPhone')}
              placeholder="Телефон (необязательно)"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              disabled={isLoading}
              error={errors.companyPhone?.message || externalValidationErrors?.companyPhone}
              className="pl-12 h-12 rounded-2xl border-border/50 focus:border-primary/50 transition-all duration-300"
            />
          </div>

          <div className="relative group">
            <Mail className="absolute left-3 top-3 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
            <Input
              id="companyEmail"
              {...register('companyEmail')}
              type="email"
              placeholder="Email компании"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              disabled={isLoading}
              error={errors.companyEmail?.message || externalValidationErrors?.companyEmail}
              className="pl-12 h-12 rounded-2xl border-border/50 focus:border-primary/50 transition-all duration-300"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end pt-6">
        <Button
          type="submit"
          className="group h-14 bg-gradient-primary hover:opacity-90 text-white font-medium rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-glass-lg px-8"
          disabled={isLoading}
        >
          <div className="flex items-center gap-2">
            {submitLabel}
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
          </div>
        </Button>
      </div>
    </form>
  );
}

function OwnerStepForm({
  defaultValues,
  isLoading,
  externalValidationErrors,
  onSubmit,
  submitLabel,
}: {
  defaultValues: Partial<OwnerForm>;
  isLoading: boolean;
  externalValidationErrors?: StepValidationErrors<OwnerForm>;
  onSubmit: (data: OwnerForm) => void;
  submitLabel: string;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OwnerForm>({
    resolver: zodResolver(ownerSchema),
    defaultValues,
    mode: 'onSubmit',
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" autoComplete="off" noValidate data-form-type="other" data-lpignore="true">
      <div className="space-y-4">
        <div className="text-center space-y-2">
          <Sparkles className="w-6 h-6 text-primary mx-auto" />
          <h3 className="text-xl font-semibold">{steps[1].title}</h3>
          <p className="text-sm text-muted-foreground">{steps[1].description}</p>
        </div>

        <div className="space-y-5" id="reg-step-owner" aria-labelledby="reg-step-owner-title">
          <div className="relative group">
            <Mail className="absolute left-3 top-3 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
            <Input
              id="ownerEmail"
              {...register('ownerEmail')}
              type="email"
              placeholder="Email владельца"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              disabled={isLoading}
              error={errors.ownerEmail?.message || externalValidationErrors?.ownerEmail}
              className="pl-12 h-12 rounded-2xl border-border/50 focus:border-primary/50 transition-all duration-300"
            />
          </div>

          <div className="relative group">
            <User className="absolute left-3 top-3 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
            <Input
              id="ownerFirstName"
              {...register('ownerFirstName')}
              placeholder="Имя владельца"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              disabled={isLoading}
              error={errors.ownerFirstName?.message || externalValidationErrors?.ownerFirstName}
              className="pl-12 h-12 rounded-2xl border-border/50 focus:border-primary/50 transition-all duration-300"
            />
          </div>

          <div className="relative group">
            <User className="absolute left-3 top-3 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
            <Input
              id="ownerLastName"
              {...register('ownerLastName')}
              placeholder="Фамилия владельца"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              disabled={isLoading}
              error={errors.ownerLastName?.message || externalValidationErrors?.ownerLastName}
              className="pl-12 h-12 rounded-2xl border-border/50 focus-бorder-primary/50 transition-all duration-300"
            />
          </div>

          <div className="relative group">
            <Phone className="absolute left-3 top-3 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
            <Input
              id="ownerPhone"
              {...register('ownerPhone')}
              placeholder="Телефон владельца (необязательно)"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              disabled={isLoading}
              error={errors.ownerPhone?.message || externalValidationErrors?.ownerPhone}
              className="pl-12 h-12 rounded-2xl border-border/50 focus-бorder-primary/50 transition-all duration-300"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end pt-6">
        <Button
          type="submit"
          className="group h-14 bg-gradient-primary hover:opacity-90 text-white font-medium rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-glass-lg px-8"
          disabled={isLoading}
        >
          <div className="flex items-center gap-2">
            {submitLabel}
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
          </div>
        </Button>
      </div>
    </form>
  );
}

function SecurityStepForm({
  defaultValues,
  isLoading,
  externalValidationErrors,
  onSubmit,
  submitLabel,
}: {
  defaultValues: Partial<SecurityForm>;
  isLoading: boolean;
  externalValidationErrors?: StepValidationErrors<SecurityForm>;
  onSubmit: (data: SecurityForm) => void;
  submitLabel: string;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SecurityForm>({
    resolver: zodResolver(securitySchema),
    defaultValues,
    mode: 'onSubmit',
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" autoComplete="off" noValidate data-form-type="other" data-lpignore="true">
      <div className="space-y-4">
        <div className="text-center space-y-2">
          <Sparkles className="w-6 h-6 text-primary mx-auto" />
          <h3 className="text-xl font-semibold">{steps[2].title}</h3>
          <p className="text-sm text-muted-foreground">{steps[2].description}</p>
        </div>

        <div className="space-y-5" id="reg-step-security" aria-labelledby="reg-step-security-title">
          <div className="relative group">
            <Lock className="absolute left-3 top-3 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
            <Input
              id="ownerPassword"
              {...register('ownerPassword')}
              type="password"
              placeholder="Пароль"
              autoComplete="new-password"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              data-lpignore="true"
              disabled={isLoading}
              error={errors.ownerPassword?.message || externalValidationErrors?.ownerPassword}
              className="pl-12 pr-12 h-12 rounded-2xl border-border/50 focus:border-primary/50 transition-all duration-300"
            />
          </div>

          <div className="relative group">
            <Lock className="absolute left-3 топ-3 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
            <Input
              id="confirmPassword"
              {...register('confirmPassword')}
              type="password"
              placeholder="Подтвердите пароль"
              autoComplete="new-password"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              data-lpignore="true"
              disabled={isLoading}
              error={errors.confirmPassword?.message}
              className="pl-12 pr-12 h-12 rounded-2xl border-border/50 focus:border-primary/50 transition-all duration-300"
            />
          </div>

          <div className="flex items-start gap-3 p-4 rounded-2xl glass-subtle border border-border/30">
            <input
              id="acceptTerms"
              {...register('acceptTerms')}
              type="checkbox"
              className="mt-1 w-4 h-4 text-primary border-border rounded focus:ring-primary focus:ring-2"
              disabled={isLoading}
            />
            <div className="text-sm">
              <label htmlFor="acceptTerms" className="text-foreground leading-relaxed">
                Я принимаю{' '}
                <Link href="/terms" className="text-primary hover:text-secondary transition-colors underline">
                  Условия использования
                </Link>{' '}
                и{' '}
                <Link href="/privacy" className="text-primary hover:text-secondary transition-colors underline">
                  Политику конфиденциальности
                </Link>
              </label>
              {errors.acceptTerms && <p className="text-destructive text-sm mt-2">{errors.acceptTerms.message}</p>}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end pt-6">
        <Button
          type="submit"
          className="group h-14 bg-gradient-primary hover:opacity-90 text-white font-medium rounded-2xl transition-all duration-300 hover:scale-[1.02] hover:shadow-glass-lg px-8"
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 border-2 border-white/30 border-т-white rounded-full animate-spin" />
              Создание аккаунта...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              {submitLabel}
            </div>
          )}
        </Button>
      </div>
    </form>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Изолированное состояние между шагами
  const [companyData, setCompanyData] = useState<Partial<CompanyForm>>({});
  const [ownerData, setOwnerData] = useState<Partial<OwnerForm>>({});
  const [securityData, setSecurityData] = useState<Partial<SecurityForm>>({});

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  };

  async function submitAll() {
    setIsLoading(true);
    setApiError(null);
    setValidationErrors({});

    try {
      const finalData: FullForm = {
        ...(companyData as CompanyForm),
        ...(ownerData as OwnerForm),
        ...(securityData as SecurityForm),
      } as FullForm;

      const requestData: RegisterCompanyRequest = {
        companyName: finalData.companyName!,
        companyLegalName: finalData.companyLegalName!,
        companyAddress:
          finalData.companyAddress && String(finalData.companyAddress).trim() !== ''
            ? (finalData.companyAddress as string)
            : undefined,
        companyPhone:
          finalData.companyPhone && String(finalData.companyPhone).trim() !== ''
            ? (finalData.companyPhone as string)
            : undefined,
        companyEmail: finalData.companyEmail!,
        ownerEmail: finalData.ownerEmail!,
        ownerPassword: finalData.ownerPassword!,
        ownerFirstName: finalData.ownerFirstName!,
        ownerLastName: finalData.ownerLastName!,
        ownerPhone:
          finalData.ownerPhone && String(finalData.ownerPhone).trim() !== ''
            ? (finalData.ownerPhone as string)
            : undefined,
      };

      await authAPI.registerCompany(requestData);

      router.push('/register/success');
    } catch (error) {
      if (error instanceof Error) {
        try {
          const parsed = JSON.parse(error.message) as { message?: string | string[] };
          if (Array.isArray(parsed?.message)) {
            const validationErrs: Record<string, string> = {};
            parsed.message.forEach((msg) => {
              const field = msg.split(' ')[0];
              validationErrs[field] = msg;
            });
            setValidationErrors(validationErrs);
          } else {
            const msg = typeof parsed?.message === 'string' ? parsed.message : 'Ошибка при регистрации';
            setApiError(msg);
          }
        } catch {
          setApiError(error.message || 'Неизвестная ошибка');
        }
      } else {
        setApiError('Неизвестная ошибка');
      }
    } finally {
      setIsLoading(false);
    }
  }

  function onSubmitStep(data: Partial<FullForm>) {
    // Сохраняем только поля текущего шага (строго по спискам)
    const fields = STEP_FIELDS[currentStep];
    const clean = pickStepValues(data as FullForm, fields as (keyof FullForm)[]);

    if (currentStep === 0) setCompanyData((prev) => ({ ...prev, ...(clean as Partial<CompanyForm>) }));
    if (currentStep === 1) setOwnerData((prev) => ({ ...prev, ...(clean as Partial<OwnerForm>) }));
    if (currentStep === 2) setSecurityData((prev) => ({ ...prev, ...(clean as Partial<SecurityForm>) }));

    if (currentStep < steps.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      void submitAll();
    }
  }

  const submitLabel = currentStep === steps.length - 1 ? 'Создать автосервис' : 'Далее';

  const companyStepErrors: StepValidationErrors<CompanyForm> = {
    companyName: validationErrors.companyName,
    companyLegalName: validationErrors.companyLegalName,
    companyAddress: validationErrors.companyAddress,
    companyPhone: validationErrors.companyPhone,
    companyEmail: validationErrors.companyEmail,
  };

  const ownerStepErrors: StepValidationErrors<OwnerForm> = {
    ownerEmail: validationErrors.ownerEmail,
    ownerFirstName: validationErrors.ownerFirstName,
    ownerLastName: validationErrors.ownerLastName,
    ownerPhone: validationErrors.ownerPhone,
  };

  const securityStepErrors: StepValidationErrors<SecurityForm> = {
    ownerPassword: validationErrors.ownerPassword,
    confirmPassword: validationErrors.confirmPassword,
    acceptTerms: validationErrors.acceptTerms,
  };

  const stepNode =
    currentStep === 0 ? (
      <CompanyStepForm
        key={`reg-step-${currentStep}`}
        defaultValues={companyData}
        isLoading={isLoading}
        externalValidationErrors={companyStepErrors}
        submitLabel={submitLabel}
        onSubmit={(d) => onSubmitStep(d)}
      />
    ) : currentStep === 1 ? (
      <OwnerStepForm
        key={`reg-step-${currentStep}`}
        defaultValues={ownerData}
        isLoading={isLoading}
        externalValidationErrors={ownerStepErrors}
        submitLabel={submitLabel}
        onSubmit={(d) => onSubmitStep(d)}
      />
    ) : (
      <SecurityStepForm
        key={`reg-step-${currentStep}`}
        defaultValues={securityData}
        isLoading={isLoading}
        externalValidationErrors={securityStepErrors}
        submitLabel={submitLabel}
        onSubmit={(d) => onSubmitStep(d)}
      />
    );

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
          `,
        }}
      />

      {/* Simplified floating orbs - only 2 orbs with lighter effects */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div
          className={`absolute rounded-full ${styles.registerOrb1}`}
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
          className={`absolute rounded-full ${styles.registerOrb2}`}
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

      <div className="flex items-center justify-center min-h-screen p-6 relative з-10">
        <div className="w-full max-w-2xl space-y-8">
          {/* Header */}
          <div className="text-center space-y-6">
            <Link href="/" className="inline-block group">
              <div className="flex items-center justify-center">
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-primary shadow-гласс-lg transition-all duration-300 group-hover:scale-105 group-hover:shadow-xl">
                  <Building2 className="w-7 h-7 text-white" />
                </div>
              </div>
            </Link>
            <div className="space-y-3">
              <h1 className="text-4xl font-bold text-gradient-primary">Регистрация автосервиса</h1>
              <p className="text-lg text-muted-foreground">{steps[currentStep].description}</p>
            </div>
          </div>

          {/* Steps Progress */}
          <div className="flex items-center justify-center">
            <div className="flex items-center space-x-4">
              {steps.map((step, index) => (
                <div key={index} className="flex items-center">
                  <div
                    className={`flex items-center justify-center w-12 h-12 rounded-full text-sm font-medium transition-all duration-300 ${
                      index < currentStep
                        ? 'bg-gradient-primary text-white shadow-glass'
                        : index === currentStep
                        ? 'bg-gradient-primary text-white shadow-glass scale-110'
                        : 'bg-surface-1 text-muted-foreground border border-border glass-subtle'
                    }`}
                  >
                    {index < currentStep ? <Check className="w-5 h-5" /> : index + 1}
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`w-16 h-0.5 mx-3 transition-all duration-500 ${
                        index < currentStep ? 'bg-gradient-primary shadow-glow' : 'bg-border'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Form Card */}
          <Card className="p-8 glass border-border/30 hover:shadow-гласс-lg transition-all duration-500 rounded-3xl surface-glow">
            {/* API Error */}
            {apiError && (
              <div className="mb-6 flex items-center gap-3 p-4 rounded-2xl bg-destructive/10 border border-destructive/20 animate-in slide-in-from-top-2 duration-300">
                <AlertCircle className="w-5 h-5 text-destructive" />
                <p className="text-sm text-destructive">{apiError}</p>
              </div>
            )}

            {/* Validation Errors */}
            {Object.keys(validationErrors).length > 0 && (
              <div className="mb-6 space-y-3 p-4 rounded-2xl bg-destructive/10 border border-destructive/20 animate-in slide-in-from-top-2 duration-300">
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

            {/* Step */}
            {stepNode}

            {/* Back button */}
            <div className="mt-6 flex items-center justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={handlePrev}
                disabled={currentStep === 0 || isLoading}
                className="group h-12 rounded-2xl btn-outline-fixed"
              >
                <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform duration-300" />
                Назад
              </Button>
              {/* Справа пустое место — submit управляется шагом */}
              <div />
            </div>

            {/* Footer */}
            <div className="mt-8 text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Уже есть аккаунт?{' '}
                <Link href="/login" className="text-primary hover:text-secondary transition-colors font-medium hover:underline">
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
          </Card>
        </div>
      </div>
    </div>
  );
}
