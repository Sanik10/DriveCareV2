// path: apps/frontend/components/customers/customer-create-dialog.tsx
"use client"

import * as React from "react"
import { Users, Mail, Phone, Building2, ClipboardPaste, AlertTriangle, Save } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Kbd } from "@/components/ui/kbd"

import type { CustomerResponse, CreateCustomerRequest, CustomerType } from "@/lib/types/customers"
import { customersAPI } from "@/lib/api/customers"

function toDialablePhone(raw: string): string {
  const trimmed = (raw || "").trim()
  if (!trimmed) return ""
  const withOnly = trimmed.replace(/[^\d+]/g, "")
  return withOnly.replace(/(?!^)\+/g, "")
}

function guessType({ companyName, email }: { companyName?: string; email?: string }): CustomerType {
  const corpDomains = ["corp", "company", "llc", "ooo", "inc"]
  const personal = ["gmail", "yahoo", "outlook", "icloud", "mail", "yandex", "bk", "list"]
  const hasCompany = !!(companyName && companyName.trim().length >= 2)
  if (hasCompany) return "company"
  if (email) {
    const dom = (email.split("@")[1] || "").toLowerCase()
    if (!dom) return "individual"
    const base = dom.split(".")[0] || ""
    if (personal.some((p) => base.includes(p))) return "individual"
    if (corpDomains.some((p) => base.includes(p))) return "company"
  }
  return "individual"
}

function parseSmart(text: string) {
  const emailMatch = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]
  const phoneMatch = text.match(/(\+?\d[\d\-\s()]{6,}\d)/)?.[0]
  const parts = text
    .replace(emailMatch || "", "")
    .replace(phoneMatch || "", "")
    .trim()
    .split(/[,\s]+/)
    .filter(Boolean)

  let firstName = ""
  let lastName = ""
  if (parts.length >= 2) {
    firstName = parts[0]
    lastName = parts[1]
  } else if (parts.length === 1) {
    firstName = parts[0]
  }

  return {
    email: emailMatch || "",
    phone: phoneMatch || "",
    firstName,
    lastName,
  }
}

type Props = {
  open: boolean
  onOpenChange: (v: boolean) => void
  onCreated?: (c: CustomerResponse) => void
}

export function CustomerCreateDialog({ open, onOpenChange, onCreated }: Props) {
  const [type, setType] = React.useState<CustomerType>("individual")
  const [typeManuallySet, setTypeManuallySet] = React.useState(false)

  const [firstName, setFirstName] = React.useState("")
  const [lastName, setLastName] = React.useState("")
  const [companyName, setCompanyName] = React.useState("")
  const [phone, setPhone] = React.useState("")
  const [email, setEmail] = React.useState("")

  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const normalizedPhone = React.useMemo(() => toDialablePhone(phone), [phone])

  // Авто-определение типа, если пользователь не переключал вручную
  React.useEffect(() => {
    if (!typeManuallySet) setType(guessType({ companyName, email }))
  }, [companyName, email, typeManuallySet])

  // reset on close
  React.useEffect(() => {
    if (open) return
    setType("individual")
    setTypeManuallySet(false)
    setFirstName("")
    setLastName("")
    setCompanyName("")
    setPhone("")
    setEmail("")
    setSubmitting(false)
    setError(null)
  }, [open])

  const canSubmit = React.useMemo(() => {
    const hasEmail = email.trim().length > 0
    const hasPhone = normalizedPhone.length > 0
    if (!hasEmail || !hasPhone) return false

    if (type === "company") return companyName.trim().length > 0
    return firstName.trim().length > 0 || lastName.trim().length > 0
  }, [email, normalizedPhone, type, companyName, firstName, lastName])

  const submit = React.useCallback(async () => {
    setSubmitting(true)
    setError(null)

    const payload: CreateCustomerRequest = {
      type,
      firstName: firstName.trim() || undefined,
      lastName: lastName.trim() || undefined,
      companyName: companyName.trim() || (type === "company" ? "" : undefined),
      email: email.trim().toLowerCase(),
      phone: normalizedPhone,
    }

    if (!payload.email) {
      setError("Укажите email")
      setSubmitting(false)
      return
    }
    if (!payload.phone) {
      setError("Укажите телефон (например, +79001234567)")
      setSubmitting(false)
      return
    }
    if (type === "company" && !payload.companyName) {
      setError("Для юрлица укажите название компании")
      setSubmitting(false)
      return
    }
    if (type === "individual" && !payload.firstName && !payload.lastName) {
      setError("Для физлица укажите имя или фамилию")
      setSubmitting(false)
      return
    }

    try {
      const created = await customersAPI.createCustomer(payload)
      onCreated?.(created)
      onOpenChange(false)
    } catch (e) {
      try {
        const parsed = JSON.parse((e as Error).message) as { message?: string; field?: string }
        setError(
          parsed.field ? `${parsed.message} (поле: ${parsed.field})` : parsed.message || "Ошибка создания клиента"
        )
      } catch {
        setError("Ошибка создания клиента")
      }
    } finally {
      setSubmitting(false)
    }
  }, [type, firstName, lastName, companyName, email, normalizedPhone, onCreated, onOpenChange])

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!open) return
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "enter") {
        e.preventDefault()
        void submit()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, submit])

  const handlePasteSmart: React.ClipboardEventHandler<HTMLDivElement> = (e) => {
    const text = e.clipboardData.getData("text")
    if (!text) return
    const parsed = parseSmart(text)
    if (parsed.firstName) setFirstName((v) => v || parsed.firstName)
    if (parsed.lastName) setLastName((v) => v || parsed.lastName)
    if (parsed.email) setEmail((v) => v || parsed.email)
    if (parsed.phone) setPhone((v) => v || parsed.phone)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v)
        if (!v) setTypeManuallySet(false)
      }}
    >
      <DialogContent className="max-w-2xl" onPaste={handlePasteSmart}>
        <DialogHeader>
          <div className="flex items-start gap-md min-w-0">
            <div className="h-10 w-10 rounded-md bg-surface-2 border flex items-center justify-center text-muted-foreground shrink-0">
              <Users className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle>Новый клиент</DialogTitle>
              <DialogDescription className="mt-xs">
                Можно вставить строку вида «Иван Иванов, +7…, ivan@…» — поля заполнятся автоматически.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-lg">
          {/* Тип клиента (segmented) */}
          <div>
            <div className="text-sm font-medium text-foreground mb-sm">Тип клиента</div>
            <div className="inline-flex items-center rounded-md border bg-card p-xs">
              <Button
                type="button"
                size="sm"
                variant={type === "individual" ? "secondary" : "ghost"}
                className="h-8"
                onClick={() => {
                  setType("individual")
                  setTypeManuallySet(true)
                }}
              >
                Физлицо
              </Button>
              <Button
                type="button"
                size="sm"
                variant={type === "company" ? "secondary" : "ghost"}
                className="h-8"
                onClick={() => {
                  setType("company")
                  setTypeManuallySet(true)
                }}
              >
                Юрлицо
              </Button>
            </div>
          </div>

          {/* Поля */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
            {type === "company" ? (
              <div className="md:col-span-2">
                <Input
                  label="Название компании"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="ООО «Рога и Копыта»"
                />
              </div>
            ) : (
              <>
                <Input
                  label="Имя"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Иван"
                />
                <Input
                  label="Фамилия"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Иванов"
                />
              </>
            )}

            <div className="md:col-span-1">
              <Input
                label="Телефон"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+79001234567"
              />
              {!!normalizedPhone && (
                <div className="mt-xs text-xs text-muted-foreground inline-flex items-center gap-xs">
                  <Phone className="w-3.5 h-3.5" />
                  Будет сохранено: {normalizedPhone}
                </div>
              )}
            </div>

            <div className="md:col-span-1">
              <Input
                label="Email"
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
              />
              <div className="mt-xs text-xs text-muted-foreground inline-flex items-center gap-xs">
                <Mail className="w-3.5 h-3.5" />
                Используется для входа и уведомлений
              </div>
            </div>

            <div className="md:col-span-2 text-xs text-muted-foreground inline-flex items-center gap-sm">
              <ClipboardPaste className="w-4 h-4" />
              Подсказка: вставьте данные клиента в любом порядке — система попробует распознать.
            </div>
          </div>

          {error && (
            <div className="rounded-md border border-status-error/20 bg-status-error/10 text-status-error px-md py-sm text-sm inline-flex items-center gap-sm">
              <AlertTriangle className="w-4 h-4" />
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="mt-lg">
          <div className="hidden sm:flex items-center text-xs text-muted-foreground mr-auto">
            <span>Создать:</span>
            <span className="ml-sm">
              <Kbd>⌘</Kbd>+<Kbd>Enter</Kbd>
            </span>
          </div>

          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={submitting}>
            Отмена
          </Button>

          <Button variant="primary" onClick={submit} disabled={submitting || !canSubmit}>
            {submitting ? (
              "Создание…"
            ) : (
              <>
                <Save className="w-4 h-4 mr-xs" />
                Создать клиента
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
