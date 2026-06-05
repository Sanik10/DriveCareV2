// path: apps/frontend/components/users/invite-user-dialog.tsx
"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { UserPlus, Copy, Check, Shield } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Kbd } from "@/components/ui/kbd"
import { usersAPI } from "@/lib/api/users"
import { groupRolesByCategory } from "@/lib/utils/role-labels"
import type { Role } from "@/lib/types/users"
import { cn } from "@/lib/utils"

const inviteSchema = z.object({
  email: z.string().email("Некорректный email").min(1, "Email обязателен"),
  roleId: z.string().uuid("Выберите роль"),
  expiresInDays: z.number().int().min(1).max(30).optional(),
})

type InviteForm = z.infer<typeof inviteSchema>

interface InviteUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

function bestEffortError(e: unknown, fallback: string) {
  try {
    const parsed = JSON.parse((e as Error).message) as { message?: string; correlationId?: string }
    const msg = parsed.correlationId
      ? `${parsed.message || fallback} (corrId: ${parsed.correlationId})`
      : parsed.message || fallback
    return msg
  } catch {
    return (e as Error)?.message || fallback
  }
}

/**
 * Кэшируем inviteUrl локально, чтобы можно было копировать ссылку после закрытия модалки.
 * Это не заменяет сервер (инвайт мог создать другой админ), но закрывает UX-проблему "не успел скопировать".
 */
const INVITES_CACHE_KEY = "drivecare_invite_urls_v1"
type InviteUrlCacheItem = { id: string; inviteUrl: string; createdAt: string }

function readInviteUrlCache(): InviteUrlCacheItem[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(INVITES_CACHE_KEY)
    const parsed = raw ? (JSON.parse(raw) as InviteUrlCacheItem[]) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeInviteUrlCache(items: InviteUrlCacheItem[]) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(INVITES_CACHE_KEY, JSON.stringify(items))
  } catch {
    // ignore
  }
}

function upsertInviteUrlCache(item: InviteUrlCacheItem) {
  const prev = readInviteUrlCache()

  // cleanup: оставим только последние 50
  const next = [item, ...prev.filter((x) => x.id !== item.id)].slice(0, 50)
  writeInviteUrlCache(next)
}

export function InviteUserDialog({ open, onOpenChange, onSuccess }: InviteUserDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const [inviteUrl, setInviteUrl] = React.useState<string | null>(null)
  const [copied, setCopied] = React.useState(false)

  const [availableRoles, setAvailableRoles] = React.useState<Role[]>([])
  const [rolesLoading, setRolesLoading] = React.useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { expiresInDays: 7 },
  })

  // reset on close (как в customer-create-dialog)
  React.useEffect(() => {
    if (open) return
    reset()
    setError(null)
    setInviteUrl(null)
    setCopied(false)
    setAvailableRoles([])
    setRolesLoading(false)
    setIsLoading(false)
  }, [open, reset])

  React.useEffect(() => {
    if (!open) return

    let cancelled = false
    async function loadRoles() {
      setRolesLoading(true)
      setError(null)
      try {
        const roles = await usersAPI.listAssignableRoles()
        if (!cancelled) setAvailableRoles(roles || [])
      } catch (e) {
        if (!cancelled) setError(bestEffortError(e, "Не удалось загрузить список ролей"))
      } finally {
        if (!cancelled) setRolesLoading(false)
      }
    }

    void loadRoles()
    return () => {
      cancelled = true
    }
  }, [open])

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!open) return
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "enter") {
        e.preventDefault()
        void handleSubmit(onSubmit)()
      }
    }

    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, handleSubmit])

  const groupedRoles = React.useMemo(() => groupRolesByCategory(availableRoles), [availableRoles])

  const onSubmit = async (data: InviteForm) => {
    setIsLoading(true)
    setError(null)
    setInviteUrl(null)
    setCopied(false)

    try {
      const result = await usersAPI.createInvite(data)

      const url = result?.inviteUrl || null
      setInviteUrl(url)

      // сохраняем, чтобы можно было скопировать после закрытия модалки (через список приглашений)
      if (result?.id && url) {
        upsertInviteUrlCache({ id: result.id, inviteUrl: url, createdAt: new Date().toISOString() })
      }

      onSuccess?.()
    } catch (e) {
      setError(bestEffortError(e, "Не удалось создать приглашение"))
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyUrl = async () => {
    if (!inviteUrl) return
    try {
      await navigator.clipboard?.writeText(inviteUrl).catch(() => {})
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // ignore
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-start gap-md min-w-0">
            <div className="h-10 w-10 rounded-md bg-surface-2 border flex items-center justify-center text-muted-foreground shrink-0">
              <UserPlus className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle>Пригласить сотрудника</DialogTitle>
              <DialogDescription className="mt-xs">
                Создайте приглашение для нового сотрудника. Ссылку можно будет скопировать и позже — в списке приглашений.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {inviteUrl ? (
          <div className="grid gap-lg">
            <div className="rounded-md border border-status-active/30 bg-status-active/10 p-md text-sm text-foreground">
              Приглашение создано. Скопируйте ссылку и отправьте сотруднику.
            </div>

            <Input
              id="invite-url"
              label="Ссылка приглашения"
              value={inviteUrl}
              readOnly
              className="font-mono text-xs"
            />

            <DialogFooter>
              <Button type="button" variant="secondary" onClick={onOpenChange.bind(null, false)}>
                Закрыть
              </Button>

              <Button type="button" variant="primary" onClick={handleCopyUrl}>
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? "Скопировано" : "Скопировать ссылку"}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-lg">
            {error && (
              <div className="rounded-md border border-status-error/30 bg-status-error/10 p-md text-sm text-status-error">
                {error}
              </div>
            )}

            <Input
              id="invite-email"
              label="Email сотрудника"
              required
              type="email"
              placeholder="employee@example.com"
              disabled={isLoading || rolesLoading}
              error={errors.email?.message}
              {...register("email")}
            />

            {/* Select по тому же паттерну, что Input: label -> control -> error */}
            <div className="w-full flex flex-col gap-xs min-w-0">
              <label
                htmlFor="invite-role"
                className={cn("text-sm font-medium leading-none text-foreground")}
              >
                Роль{" "}
                <span className="text-destructive" aria-hidden="true">
                  *
                </span>
              </label>

              {rolesLoading ? (
                <div className="h-10 rounded-md border border-input bg-background px-md text-sm text-muted-foreground flex items-center">
                  Загрузка ролей…
                </div>
              ) : (
                <select
                  id="invite-role"
                  {...register("roleId")}
                  disabled={isLoading || availableRoles.length === 0}
                  aria-invalid={!!errors.roleId}
                  className={cn(
                    "h-10 w-full min-w-0 rounded-md border border-input bg-background px-md text-sm",
                    "text-foreground hover:border-border/80",
                    errors.roleId && "border-destructive"
                  )}
                >
                  <option value="">Выберите роль…</option>
                  {groupedRoles.map((group) => (
                    <optgroup key={group.category} label={group.label}>
                      {group.roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              )}

              <div className="text-xs text-muted-foreground inline-flex items-center gap-xs">
                <Shield className="w-3.5 h-3.5" />
                Отображаются только роли, которые вы можете назначать.
              </div>

              {errors.roleId?.message && <p className="text-xs text-destructive">{errors.roleId.message}</p>}
              {!rolesLoading && availableRoles.length === 0 && (
                <p className="text-xs text-status-error">Нет доступных ролей для назначения.</p>
              )}
            </div>

            <Input
              id="invite-exp"
              label="Срок действия (дней)"
              type="number"
              min={1}
              max={30}
              disabled={isLoading || rolesLoading}
              error={errors.expiresInDays?.message}
              {...register("expiresInDays", { valueAsNumber: true })}
            />

            <DialogFooter>
              <div className="hidden lg:flex items-center text-xs text-muted-foreground mr-auto gap-sm min-w-0">
                <Kbd>Esc</Kbd>
                <span className="text-muted-foreground/60">·</span>
                <Kbd>Ctrl</Kbd>+<Kbd>Enter</Kbd>
              </div>

              <Button type="button" size="sm" variant="secondary" onClick={() => onOpenChange(false)} disabled={isLoading}>
                Отмена
              </Button>

              <Button
                type="submit"
                size="sm"
                variant="primary"
                disabled={isLoading || rolesLoading || availableRoles.length === 0}
              >
                {isLoading ? "Создание…" : "Создать приглашение"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
