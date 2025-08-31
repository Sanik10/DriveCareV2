// path: apps/frontend/components/customers/customer-create-dialog.tsx
"use client";

import * as React from "react";
import { Users, Mail, Phone, Building2, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CustomerResponse, CreateCustomerRequest, CustomerType } from "@/lib/types/customers";
import { customersAPI } from "@/lib/api/customers";
import { Kbd } from "@/components/ui/kbd";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: (c: CustomerResponse) => void;
};

function toDialablePhone(raw: string): string {
  const trimmed = (raw || "").trim();
  if (!trimmed) return "";
  const withOnly = trimmed.replace(/[^\d+]/g, "");
  return withOnly.replace(/(?!^)\+/g, "");
}

function guessType({ companyName, email }: { companyName?: string; email?: string }): CustomerType {
  const corpDomains = ["corp", "company", "llc", "ooo", "inc"];
  const personal = ["gmail", "yahoo", "outlook", "icloud", "mail", "yandex", "bk", "list"];
  const hasCompany = !!(companyName && companyName.trim().length >= 2);
  if (hasCompany) return "company";
  if (email) {
    const dom = (email.split("@")[1] || "").toLowerCase();
    if (!dom) return "individual";
    const base = dom.split(".")[0] || "";
    if (personal.some((p) => base.includes(p))) return "individual";
    if (corpDomains.some((p) => base.includes(p))) return "company";
  }
  return "individual";
}

function parseSmart(text: string) {
  const emailMatch = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  const phoneMatch = text.match(/(\+?\d[\d\-\s()]{6,}\d)/)?.[0];
  const parts = text.replace(emailMatch || "", "").replace(phoneMatch || "", "").trim().split(/[,\s]+/).filter(Boolean);
  let firstName = "";
  let lastName = "";
  if (parts.length >= 2) {
    firstName = parts[0];
    lastName = parts[1];
  } else if (parts.length === 1) {
    firstName = parts[0];
  }
  return {
    email: emailMatch || "",
    phone: phoneMatch || "",
    firstName,
    lastName,
  };
}

export function CustomerCreateDialog({ open, onOpenChange, onCreated }: Props) {
  const [type, setType] = React.useState<CustomerType>("individual");
  const [typeManuallySet, setTypeManuallySet] = React.useState(false);
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [companyName, setCompanyName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const normalizedPhone = React.useMemo(() => toDialablePhone(phone), [phone]);

  React.useEffect(() => {
    if (!typeManuallySet) {
      setType(guessType({ companyName, email }));
    }
  }, [companyName, email, typeManuallySet]);

  const submit = React.useCallback(async () => {
    setSubmitting(true);
    setError(null);

    const payload: CreateCustomerRequest = {
      type,
      firstName: firstName.trim() || undefined,
      lastName: lastName.trim() || undefined,
      companyName: companyName.trim() || (type === "company" ? "" : undefined),
      email: email.trim().toLowerCase(),
      phone: normalizedPhone,
    };

    if (!payload.email) {
      setError("Укажите email");
      setSubmitting(false);
      return;
    }
    if (!payload.phone) {
      setError("Укажите телефон (например, +79001234567)");
      setSubmitting(false);
      return;
    }
    if (type === "company" && !payload.companyName) {
      setError("Для юрлица укажите название компании");
      setSubmitting(false);
      return;
    }
    if (type === "individual" && !payload.firstName && !payload.lastName) {
      setError("Для физлица укажите имя или фамилию");
      setSubmitting(false);
      return;
    }

    try {
      const created = await customersAPI.createCustomer(payload);
      onCreated?.(created);
      onOpenChange(false);
      setFirstName(""); setLastName(""); setCompanyName(""); setPhone(""); setEmail("");
      setType("individual"); setTypeManuallySet(false);
    } catch (e) {
      try {
        const parsed = JSON.parse((e as Error).message) as { message?: string; field?: string };
        setError(parsed.field ? `${parsed.message} (поле: ${parsed.field})` : (parsed.message || "Ошибка создания клиента"));
      } catch {
        setError("Ошибка создания клиента");
      }
    } finally {
      setSubmitting(false);
    }
  }, [type, firstName, lastName, companyName, email, normalizedPhone, onCreated, onOpenChange]);

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onOpenChange(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "enter") {
        e.preventDefault();
        void submit();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange, submit]);

  const handlePasteSmart: React.ClipboardEventHandler<HTMLDivElement> = (e) => {
    const text = e.clipboardData.getData("text");
    if (!text) return;
    const parsed = parseSmart(text);
    if (parsed.firstName) setFirstName((v) => v || parsed.firstName);
    if (parsed.lastName) setLastName((v) => v || parsed.lastName);
    if (parsed.email) setEmail((v) => v || parsed.email);
    if (parsed.phone) setPhone((v) => v || parsed.phone);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setTypeManuallySet(false); }}>
      <DialogContent glow className="max-w-xl" onPaste={handlePasteSmart}>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-primary flex items-center justify-center text-white">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Новый клиент</DialogTitle>
              <DialogDescription className="flex items-center gap-2">
                Быстрое создание с «умной вставкой» <Sparkles className="h-3.5 w-3.5 text-primary" />
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
          <div className="col-span-1 sm:col-span-2">
            <div className="flex items-center justify-between">
              <div className="text-xs text-muted-foreground">Тип клиента</div>
              <div className="inline-flex rounded-md border border-border/60 bg-background p-1">
                <button
                  type="button"
                  onClick={() => { setType('individual'); setTypeManuallySet(true); }}
                  className={`px-3 py-1.5 text-xs rounded-md ${type === 'individual' ? 'bg-gradient-primary text-white shadow' : 'text-muted-foreground hover:bg-accent/40'}`}
                >
                  Физлицо
                </button>
                <button
                  type="button"
                  onClick={() => { setType('company'); setTypeManuallySet(true); }}
                  className={`px-3 py-1.5 text-xs rounded-md ${type === 'company' ? 'bg-gradient-primary text-white shadow' : 'text-muted-foreground hover:bg-accent/40'}`}
                >
                  Юрлицо
                </button>
              </div>
            </div>
          </div>

          {type === "company" ? (
            <div className="col-span-1 sm:col-span-2 relative">
              <Input
                placeholder="Компания"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="pl-9"
              />
              <Building2 className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            </div>
          ) : (
            <>
              <Input placeholder="Имя" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              <Input placeholder="Фамилия" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </>
          )}

          <div className="relative">
            <Input
              placeholder="Телефон (+79001234567)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="pl-9"
            />
            <Phone className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            {!!normalizedPhone && (
              <div className="mt-1 text-[10px] text-muted-foreground">
                Будет сохранено как: {normalizedPhone}
              </div>
            )}
          </div>
          <div className="relative">
            <Input
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-9"
            />
            <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          </div>

          <div className="col-span-1 sm:col-span-2 text-xs text-muted-foreground">
            Подсказки: вставьте строку вида “Иван Иванов, +7 900 123-45-67, ivan@example.com” — поля заполнятся автоматически.
          </div>
        </div>

        {error && (
          <div className="mt-2 text-sm text-destructive">{error}</div>
        )}

        <DialogFooter className="mt-2">
          <div className="hidden sm:flex items-center text-xs text-muted-foreground mr-auto">
            <span className="mr-2">Горячие клавиши:</span>
            <Kbd>Esc</Kbd>
            <span className="mx-1">—</span>
            <span className="mr-2">Закрыть</span>
            <Kbd className="ml-2">⌘</Kbd>+<Kbd>Enter</Kbd>
            <span className="ml-1">— Создать</span>
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Отмена
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting ? "Создание..." : "Создать клиента"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
