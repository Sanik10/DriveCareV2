// path: apps/frontend/app/(auth)/register/page.tsx
"use client"

import * as React from "react"
import Link from "next/link"
import { Suspense, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Eye,
  EyeOff,
  Loader2,
  Lock,
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
import { TariffPreview } from "@/components/ui/tariff-preview"
import { authAPI } from "@/lib/api/auth"
import { tariffsAPI } from "@/lib/api/tariffs"
import type { Tariff } from "@/lib/types/tariffs"
import {
  RegisterCompanyRequest,
  EMAIL_REGEX,
  PASSWORD_REGEX,
  PHONE_REGEX,
  NAME_REGEX,
} from "@/lib/types/auth"

/**
 * Шаговые схемы валидации (строгая изоляция)
 */
const companySchema = z.object({
  companyName: z
    .string()
    .min(1, "Название компании обязательно")
    .max(255, "Название компании не может превышать 255 символов"),
  companyLegalName: z
    .string()
    .min(1, "Юридическое название обязательно")
    .max(255, "Юридическое название не может превышать 255 символов"),
  companyAddress: z.string().max(500, "Адрес не может превышать 500 символов").optional().or(z.literal("")),
  companyPhone: z.string().regex(PHONE_REGEX, "Некорректный формат номера телефона").optional().or(z.literal("")),
  companyEmail: z.string().min(1, "Email компании обязателен").regex(EMAIL_REGEX, "Некорректный email компании"),
})

const ownerSchema = z.object({
  ownerEmail: z.string().min(1, "Email владельца обязателен").regex(EMAIL_REGEX, "Некорректный email владельца"),
  ownerFirstName: z
    .string()
    .min(1, "Имя владельца обязательно")
    .max(100)
    .regex(NAME_REGEX, "Имя может содержать только буквы, пробелы и дефисы"),
  ownerLastName: z
    .string()
    .min(1, "Фамилия владельца обязательна")
    .max(100)
    .regex(NAME_REGEX, "Фамилия может содержать только буквы, пробелы и дефисы"),
  ownerPhone: z.string().regex(PHONE_REGEX, "Некорректный формат номера телефона").optional().or(z.literal("")),
})

const securitySchema = z
  .object({
    ownerPassword: z
      .string()
      .min(8, "Минимум 8 символов")
      .regex(PASSWORD_REGEX, "Пароль должен содержать строчные и заглавные буквы, цифры и спецсимволы"),
    confirmPassword: z.string(),
    acceptTerms: z
      .boolean()
      .refine((val) => val === true, { message: "Необходимо принять условия использования" }),
  })
  .refine((data) => data.ownerPassword === data.confirmPassword, {
    message: "Пароли не совпадают",
    path: ["confirmPassword"],
  })

type CompanyForm = z.infer<typeof companySchema>
type OwnerForm = z.infer<typeof ownerSchema>
type SecurityForm = z.infer<typeof securitySchema>
type FullForm = CompanyForm & OwnerForm & SecurityForm

const steps = [
  { title: "Компания", description: "Информация об автосервисе" },
  { title: "Владелец", description: "Данные руководителя" },
  { title: "Безопасность", description: "Пароль и подтверждение" },
]

const STEP_FIELDS: Array<(keyof FullForm)[]> = [
  ["companyName", "companyLegalName", "companyAddress", "companyPhone", "companyEmail"],
  ["ownerEmail", "ownerFirstName", "ownerLastName", "ownerPhone"],
  ["ownerPassword", "confirmPassword", "acceptTerms"],
]

function pickStepValues<T extends Record<string, unknown>>(obj: T, keys: (keyof T)[]) {
  const out: Partial<T> = {}
  keys.forEach((k) => {
    if (k in obj) out[k] = obj[k]
  })
  return out
}

type StepValidationErrors<T> = Partial<Record<keyof T, string>>

function Stepper({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center">
      <div className="flex items-center gap-md">
        {steps.map((s, idx) => {
          const isActive = idx === currentStep
          const isDone = idx < currentStep

          return (
            <React.Fragment key={s.title}>
              <div
                className={[
                  "flex items-center justify-center h-9 w-9 rounded-md border text-sm font-medium",
                  isDone ? "border-primary/30 bg-primary/10 text-primary" : "",
                  isActive ? "border-primary/40 bg-primary text-primary-foreground" : "",
                  !isDone && !isActive ? "border-border/60 bg-card text-muted-foreground" : "",
                ].join(" ")}
                aria-current={isActive ? "step" : undefined}
                title={s.title}
              >
                {isDone ? <Check className="h-4 w-4" /> : idx + 1}
              </div>

              {idx < steps.length - 1 && <div className="h-px w-10 bg-border/60" />}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}

function CompanyStepForm(props: {
  formId: string
  defaultValues: Partial<CompanyForm>
  isLoading: boolean
  externalValidationErrors?: StepValidationErrors<CompanyForm>
  onSubmit: (data: CompanyForm) => void
}) {
  const { formId, defaultValues, isLoading, externalValidationErrors, onSubmit } = props

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CompanyForm>({
    resolver: zodResolver(companySchema),
    defaultValues,
    mode: "onSubmit",
  })

  return (
    <form id={formId} onSubmit={handleSubmit(onSubmit)} className="grid gap-lg" autoComplete="off" noValidate>
      <div className="grid gap-md">
        <Input
          {...register("companyName")}
          label="Название компании"
          required
          placeholder="Например: DriveCare Service"
          disabled={isLoading}
          error={errors.companyName?.message || externalValidationErrors?.companyName}
        />

        <Input
          {...register("companyLegalName")}
          label="Юридическое название"
          required
          placeholder='Например: ООО "ДрайвКеа"'
          disabled={isLoading}
          error={errors.companyLegalName?.message || externalValidationErrors?.companyLegalName}
        />

        <Input
          {...register("companyAddress")}
          label="Адрес (необязательно)"
          placeholder="Город, улица, дом"
          disabled={isLoading}
          error={errors.companyAddress?.message || externalValidationErrors?.companyAddress}
        />

        <div className="grid gap-md md:grid-cols-2">
          <Input
            {...register("companyPhone")}
            label="Телефон (необязательно)"
            placeholder="+7 (___) ___-__-__"
            disabled={isLoading}
            error={errors.companyPhone?.message || externalValidationErrors?.companyPhone}
          />

          <Input
            {...register("companyEmail")}
            label="Email компании"
            required
            type="email"
            placeholder="service@company.com"
            disabled={isLoading}
            error={errors.companyEmail?.message || externalValidationErrors?.companyEmail}
          />
        </div>
      </div>
    </form>
  )
}

function OwnerStepForm(props: {
  formId: string
  defaultValues: Partial<OwnerForm>
  isLoading: boolean
  externalValidationErrors?: StepValidationErrors<OwnerForm>
  onSubmit: (data: OwnerForm) => void
}) {
  const { formId, defaultValues, isLoading, externalValidationErrors, onSubmit } = props

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OwnerForm>({
    resolver: zodResolver(ownerSchema),
    defaultValues,
    mode: "onSubmit",
  })

  return (
    <form id={formId} onSubmit={handleSubmit(onSubmit)} className="grid gap-lg" autoComplete="off" noValidate>
      <div className="grid gap-md">
        <Input
          {...register("ownerEmail")}
          label="Email владельца"
          required
          type="email"
          placeholder="owner@company.com"
          disabled={isLoading}
          error={errors.ownerEmail?.message || externalValidationErrors?.ownerEmail}
        />

        <div className="grid gap-md md:grid-cols-2">
          <Input
            {...register("ownerFirstName")}
            label="Имя"
            required
            placeholder="Иван"
            disabled={isLoading}
            error={errors.ownerFirstName?.message || externalValidationErrors?.ownerFirstName}
          />

          <Input
            {...register("ownerLastName")}
            label="Фамилия"
            required
            placeholder="Иванов"
            disabled={isLoading}
            error={errors.ownerLastName?.message || externalValidationErrors?.ownerLastName}
          />
        </div>

        <Input
          {...register("ownerPhone")}
          label="Телефон (необязательно)"
          placeholder="+7 (___) ___-__-__"
          disabled={isLoading}
          error={errors.ownerPhone?.message || externalValidationErrors?.ownerPhone}
        />
      </div>
    </form>
  )
}

function SecurityStepForm(props: {
  formId: string
  defaultValues: Partial<SecurityForm>
  isLoading: boolean
  externalValidationErrors?: StepValidationErrors<SecurityForm>
  onSubmit: (data: SecurityForm) => void
}) {
  const { formId, defaultValues, isLoading, externalValidationErrors, onSubmit } = props

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SecurityForm>({
    resolver: zodResolver(securitySchema),
    defaultValues,
    mode: "onSubmit",
  })

  const password = watch("ownerPassword") || ""
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const requirements = useMemo(
    () => [
      { key: "len", label: "Минимум 8 символов", valid: password.length >= 8 },
      { key: "lower", label: "Строчная буква (a-z)", valid: /[a-z]/.test(password) },
      { key: "upper", label: "Заглавная буква (A-Z)", valid: /[A-Z]/.test(password) },
      { key: "digit", label: "Хотя бы одна цифра (0-9)", valid: /\d/.test(password) },
      { key: "special", label: "Спецсимвол (!@#$...)", valid: /[^A-Za-z0-9]/.test(password) },
    ],
    [password]
  )

  return (
    <form id={formId} onSubmit={handleSubmit(onSubmit)} className="grid gap-lg" autoComplete="off" noValidate>
      <div className="rounded-md border border-border/60 bg-card p-md">
        <div className="flex items-center gap-sm text-sm font-medium">
          <Lock className="h-4 w-4 text-primary" />
          Требования к паролю
        </div>

        <div className="mt-sm grid gap-sm md:grid-cols-2">
          {requirements.map((r) => (
            <div key={r.key} className="flex items-center gap-sm text-sm">
              {r.valid ? (
                <Check className="h-4 w-4 text-status-active" />
              ) : (
                <span className="h-4 w-4 rounded-full border border-border/60" />
              )}
              <span className={r.valid ? "text-foreground" : "text-muted-foreground"}>{r.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-md">
        <div className="grid gap-sm">
          <Input
            {...register("ownerPassword")}
            label="Пароль"
            required
            type={showPassword ? "text" : "password"}
            placeholder="Введите пароль"
            autoComplete="new-password"
            disabled={isLoading}
            error={errors.ownerPassword?.message || externalValidationErrors?.ownerPassword}
          />
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
            error={errors.confirmPassword?.message || externalValidationErrors?.confirmPassword}
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

        <div className="rounded-md border border-border/60 bg-card px-md py-sm">
          <div className="flex items-start gap-sm">
            <input
              id="acceptTerms"
              {...register("acceptTerms")}
              type="checkbox"
              className="mt-[3px] h-4 w-4 rounded border-border"
              disabled={isLoading}
            />

            <div className="grid gap-xs text-sm">
              <label htmlFor="acceptTerms" className="text-muted-foreground">
                Я принимаю{" "}
                <Link href="/terms" className="text-foreground hover:underline">
                  условия использования
                </Link>{" "}
                и{" "}
                <Link href="/privacy" className="text-foreground hover:underline">
                  политику конфиденциальности
                </Link>
                .
              </label>

              {(errors.acceptTerms?.message || externalValidationErrors?.acceptTerms) && (
                <div className="text-xs text-destructive">
                  {errors.acceptTerms?.message || externalValidationErrors?.acceptTerms}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </form>
  )
}

function RegisterPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [currentStep, setCurrentStep] = useState(0)
  const [isLoading, setIsLoading] = useState(false)

  const [apiError, setApiError] = useState<string | null>(null)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // Tariff
  const [selectedTariff, setSelectedTariff] = useState<Tariff | null>(null)
  const [tariffLoading, setTariffLoading] = useState(false)
  const [tariffError, setTariffError] = useState<string | null>(null)

  // Step state (persist between steps)
  const [companyData, setCompanyData] = useState<Partial<CompanyForm>>({})
  const [ownerData, setOwnerData] = useState<Partial<OwnerForm>>({})
  const [securityData, setSecurityData] = useState<Partial<SecurityForm>>({})

  useEffect(() => {
    const tariffId = searchParams.get("tariffId")
    if (tariffId && tariffId.trim() !== "") {
      void loadTariff(tariffId.trim())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const loadTariff = async (tariffId: string) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(tariffId)) {
      setTariffError("Некорректный ID тарифа")
      return
    }

    setTariffLoading(true)
    setTariffError(null)

    try {
      const tariff = await tariffsAPI.get(tariffId)
      if (!tariff.isActive) {
        setTariffError("Выбранный тариф недоступен")
        setSelectedTariff(null)
      } else {
        setSelectedTariff(tariff)
      }
    } catch {
      setTariffError("Не удалось загрузить информацию о тарифе")
      setSelectedTariff(null)
    } finally {
      setTariffLoading(false)
    }
  }

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1)
  }

  const handleChangeTariff = () => {
    router.push("/tariffs")
  }

  async function submitAll(merged?: Partial<FullForm>) {
    setIsLoading(true)
    setApiError(null)
    setValidationErrors({})

    try {
      const finalData: FullForm = (merged ??
        ({
          ...(companyData as CompanyForm),
          ...(ownerData as OwnerForm),
          ...(securityData as SecurityForm),
        } as FullForm)) as FullForm

      const requestData: RegisterCompanyRequest = {
        companyName: finalData.companyName!,
        companyLegalName: finalData.companyLegalName!,
        companyAddress: finalData.companyAddress && String(finalData.companyAddress).trim() !== "" ? finalData.companyAddress : undefined,
        companyPhone: finalData.companyPhone && String(finalData.companyPhone).trim() !== "" ? finalData.companyPhone : undefined,
        companyEmail: finalData.companyEmail!,

        ownerEmail: finalData.ownerEmail!,
        ownerPassword: finalData.ownerPassword!,
        ownerFirstName: finalData.ownerFirstName!,
        ownerLastName: finalData.ownerLastName!,
        ownerPhone: finalData.ownerPhone && String(finalData.ownerPhone).trim() !== "" ? finalData.ownerPhone : undefined,

        tariffId: selectedTariff?.id || undefined,
      }

      await authAPI.registerCompany(requestData)

      const successUrl = selectedTariff ? `/register/success?tariffId=${selectedTariff.id}` : "/register/success"
      router.push(successUrl)
    } catch (error) {
      if (error instanceof Error) {
        try {
          const parsed = JSON.parse(error.message) as { message?: string | string[] }
          if (Array.isArray(parsed?.message)) {
            const validationErrs: Record<string, string> = {}
            parsed.message.forEach((msg) => {
              const field = msg.split(" ")[0]
              validationErrs[field] = msg
            })
            setValidationErrors(validationErrs)
          } else {
            const msg = typeof parsed?.message === "string" ? parsed.message : "Ошибка при регистрации"
            setApiError(msg)
          }
        } catch {
          setApiError(error.message || "Неизвестная ошибка")
        }
      } else {
        setApiError("Неизвестная ошибка")
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function onSubmitStep(data: Partial<FullForm>) {
    setApiError(null)

    const fields = STEP_FIELDS[currentStep]
    const clean = pickStepValues(data as FullForm, fields as (keyof FullForm)[])

    // Обновляем state (для навигации назад/вперёд)
    if (currentStep === 0) setCompanyData((prev) => ({ ...prev, ...(clean as Partial<CompanyForm>) }))
    if (currentStep === 1) setOwnerData((prev) => ({ ...prev, ...(clean as Partial<OwnerForm>) }))
    if (currentStep === 2) setSecurityData((prev) => ({ ...prev, ...(clean as Partial<SecurityForm>) }))

    // КЛЮЧЕВОЕ: на последнем шаге отправляем merged-данные сразу (без ожидания setState)
    const merged: Partial<FullForm> = {
      ...companyData,
      ...ownerData,
      ...securityData,
      ...clean,
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep((s) => s + 1)
      return
    }

    await submitAll(merged)
  }

  const submitLabel = currentStep === steps.length - 1 ? "Создать автосервис" : "Далее"
  const formId = `register-step-form-${currentStep}`

  const companyStepErrors: StepValidationErrors<CompanyForm> = {
    companyName: validationErrors.companyName,
    companyLegalName: validationErrors.companyLegalName,
    companyAddress: validationErrors.companyAddress,
    companyPhone: validationErrors.companyPhone,
    companyEmail: validationErrors.companyEmail,
  }

  const ownerStepErrors: StepValidationErrors<OwnerForm> = {
    ownerEmail: validationErrors.ownerEmail,
    ownerFirstName: validationErrors.ownerFirstName,
    ownerLastName: validationErrors.ownerLastName,
    ownerPhone: validationErrors.ownerPhone,
  }

  const securityStepErrors: StepValidationErrors<SecurityForm> = {
    ownerPassword: validationErrors.ownerPassword,
    confirmPassword: validationErrors.confirmPassword,
    acceptTerms: validationErrors.acceptTerms,
  }

  const stepNode =
    currentStep === 0 ? (
      <CompanyStepForm
        formId={formId}
        defaultValues={companyData}
        isLoading={isLoading}
        externalValidationErrors={companyStepErrors}
        onSubmit={(d) => void onSubmitStep(d)}
      />
    ) : currentStep === 1 ? (
      <OwnerStepForm
        formId={formId}
        defaultValues={ownerData}
        isLoading={isLoading}
        externalValidationErrors={ownerStepErrors}
        onSubmit={(d) => void onSubmitStep(d)}
      />
    ) : (
      <SecurityStepForm
        formId={formId}
        defaultValues={securityData}
        isLoading={isLoading}
        externalValidationErrors={securityStepErrors}
        onSubmit={(d) => void onSubmitStep(d)}
      />
    )

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Лёгкий фон-акцент */}
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(900px circle at 20% 0%, hsl(var(--primary) / 0.10), transparent 60%), radial-gradient(700px circle at 90% 30%, hsl(199 89% 48% / 0.10), transparent 55%)",
        }}
      />

      <div className="mx-auto flex min-h-screen w-full max-w-4xl items-center px-xl py-section">
        <div className="w-full grid gap-xl">
          {/* Header */}
          <div className="text-center grid gap-sm">
            <Link href="/" className="mx-auto inline-flex items-center gap-sm">
              <div className="grid h-10 w-10 place-items-center rounded-md bg-primary text-primary-foreground">
                <Building2 className="h-5 w-5" />
              </div>
              <span className="text-sm font-semibold">DriveCare</span>
            </Link>

            <h1 className="text-2xl font-semibold tracking-tight">Регистрация автосервиса</h1>
            <p className="text-sm text-muted-foreground">{steps[currentStep].description}</p>
          </div>

          {/* Tariff preview */}
          {(selectedTariff || tariffLoading || tariffError) && (
            <div className="grid gap-md">
              {tariffLoading && (
                <Card>
                  <CardContent className="pt-xl">
                    <div className="flex items-center gap-sm text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      Загрузка информации о тарифе...
                    </div>
                  </CardContent>
                </Card>
              )}

              {tariffError && (
                <Card>
                  <CardContent className="pt-xl">
                    <div className="flex items-start gap-sm">
                      <AlertCircle className="mt-[2px] h-4 w-4 text-destructive" />
                      <div className="grid gap-xs">
                        <div className="text-sm text-destructive">{tariffError}</div>
                        <div>
                          <Button variant="secondary" size="sm" onClick={handleChangeTariff}>
                            Выбрать тариф
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {selectedTariff && (
                <div className="grid gap-sm">
                  <div className="text-center">
                    <div className="text-sm font-medium">Выбранный тариф</div>
                    <div className="text-xs text-muted-foreground">
                      Тариф будет активирован после создания аккаунта
                    </div>
                  </div>
                  <TariffPreview tariff={selectedTariff} period="monthly" onEdit={handleChangeTariff} />
                </div>
              )}
            </div>
          )}

          <Stepper currentStep={currentStep} />

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{steps[currentStep].title}</CardTitle>
              <CardDescription>{steps[currentStep].description}</CardDescription>
            </CardHeader>

            <CardContent className="grid gap-lg">
              {apiError && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-md py-sm text-sm text-destructive">
                  <div className="flex items-start gap-sm">
                    <AlertCircle className="mt-[2px] h-4 w-4" />
                    <div>{apiError}</div>
                  </div>
                </div>
              )}

              {Object.keys(validationErrors).length > 0 && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-md py-sm text-sm text-destructive">
                  <div className="flex items-start gap-sm">
                    <AlertCircle className="mt-[2px] h-4 w-4" />
                    <div className="grid gap-xs">
                      <div className="font-medium">Ошибки валидации</div>
                      <ul className="list-disc pl-lg">
                        {Object.values(validationErrors).map((e, idx) => (
                          <li key={idx}>{e}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {stepNode}
            </CardContent>

            <CardFooter className="justify-between gap-md flex-wrap">
              <Button
                type="button"
                variant="secondary"
                onClick={handlePrev}
                disabled={currentStep === 0 || isLoading}
              >
                <ArrowLeft className="h-4 w-4" />
                Назад
              </Button>

              <Button type="submit" form={formId} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Обработка...
                  </>
                ) : (
                  <>
                    {submitLabel}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>

          <div className="text-center grid gap-sm">
            <div className="text-sm text-muted-foreground">
              Уже есть аккаунт?{" "}
              <Link href="/login" className="text-foreground hover:underline">
                Войти
              </Link>
            </div>

            {!selectedTariff && (
              <div>
                <Button variant="ghost" onClick={handleChangeTariff}>
                  Выбрать тарифный план
                </Button>
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              Приглашения нужны только для подключения сотрудников к компании — владельцу достаточно обычной регистрации.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function RegisterPage() {
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
      <RegisterPageContent />
    </Suspense>
  )
}
