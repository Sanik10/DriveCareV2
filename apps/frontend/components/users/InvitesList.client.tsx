// path: apps/frontend/components/users/InvitesList.client.tsx
"use client"

import * as React from "react"
import { Mail, RefreshCw, Trash2, Clock, CheckCircle2, XCircle, AlertCircle, Copy } from "lucide-react"
import { toast } from "sonner"

import type { UserInvite } from "@/lib/types/user-invites"
import type { Role } from "@/lib/types/users"
import { resendInvite, revokeInvite } from "@/lib/api/users"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { PageContentCard } from "@/components/app/PageContentCard"

type Props = {
  invites: UserInvite[]
  roles: Role[]
  loading: boolean
  onInvite?: () => void
  onChanged?: () => void
}

function mapInviteStatus(status: UserInvite["status"]): {
  label: string
  variant: "pending" | "active" | "draft" | "error"
  icon: React.ComponentType<{ className?: string }>
} {
  switch (status) {
    case "pending":
      return { label: "Ожидает", variant: "pending", icon: Clock }
    case "accepted":
      return { label: "Принято", variant: "active", icon: CheckCircle2 }
    case "revoked":
      return { label: "Отозвано", variant: "draft", icon: XCircle }
    case "expired":
      return { label: "Истекло", variant: "error", icon: AlertCircle }
    default:
      return { label: "—", variant: "draft", icon: AlertCircle }
  }
}

const INVITES_CACHE_KEY = "drivecare_invite_urls_v1"
type InviteUrlCacheItem = { id: string; inviteUrl: string; createdAt: string }

function readInviteUrlCache(): Map<string, string> {
  if (typeof window === "undefined") return new Map()
  try {
    const raw = window.localStorage.getItem(INVITES_CACHE_KEY)
    const parsed = raw ? (JSON.parse(raw) as InviteUrlCacheItem[]) : []
    const map = new Map<string, string>()
    ;(Array.isArray(parsed) ? parsed : []).forEach((x) => {
      if (x?.id && x?.inviteUrl) map.set(x.id, x.inviteUrl)
    })
    return map
  } catch {
    return new Map()
  }
}

function upsertInviteUrlCache(id: string, inviteUrl: string) {
  if (typeof window === "undefined") return
  try {
    const raw = window.localStorage.getItem(INVITES_CACHE_KEY)
    const prev = raw ? (JSON.parse(raw) as InviteUrlCacheItem[]) : []
    const next = [{ id, inviteUrl, createdAt: new Date().toISOString() }, ...(Array.isArray(prev) ? prev : []).filter((x) => x.id !== id)].slice(
      0,
      50
    )
    window.localStorage.setItem(INVITES_CACHE_KEY, JSON.stringify(next))
  } catch {
    // ignore
  }
}

export default function InvitesList({ invites, roles, loading, onInvite, onChanged }: Props) {
  const [actionLoading, setActionLoading] = React.useState<string | null>(null)
  const [urlCacheTick, setUrlCacheTick] = React.useState(0)

  const urlCache = React.useMemo(() => {
    // tick нужен, чтобы после upsert перечитать cache и отрисовать кнопку “копировать” корректно
    void urlCacheTick
    return readInviteUrlCache()
  }, [urlCacheTick])

  const roleById = React.useMemo(() => {
    const map = new Map<string, string>()
    roles.forEach((r) => map.set(r.id, r.name))
    return map
  }, [roles])

  async function copyInviteLink(inviteId: string) {
    // 1) пробуем локальный кэш (без ресенда)
    const cached = urlCache.get(inviteId)
    if (cached) {
      await navigator.clipboard?.writeText(cached).catch(() => {})
      toast.success("Ссылка приглашения скопирована")
      return
    }

    // 2) fallback: просим бэк выдать ссылку (через resend)
    setActionLoading(inviteId)
    try {
      const res = await resendInvite(inviteId)
      if (res?.inviteUrl) {
        upsertInviteUrlCache(inviteId, res.inviteUrl)
        setUrlCacheTick((x) => x + 1)

        await navigator.clipboard?.writeText(res.inviteUrl).catch(() => {})
        toast.success("Ссылка приглашения получена и скопирована (приглашение отправлено повторно)")
      } else {
        toast.error("Не удалось получить ссылку приглашения")
      }
      onChanged?.()
    } catch {
      toast.error("Не удалось получить ссылку приглашения")
    } finally {
      setActionLoading(null)
    }
  }

  async function handleRevoke(id: string) {
    setActionLoading(id)
    try {
      await revokeInvite(id)
      toast.success("Приглашение отозвано")
      onChanged?.()
    } catch {
      toast.error("Не удалось отозвать приглашение")
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <Card>
      <div className="p-xl pb-md flex items-center justify-between gap-md">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-foreground">Приглашения</div>
          <div className="text-sm text-muted-foreground mt-xs">Ожидающие и история отправленных приглашений</div>
        </div>

        {onInvite && (
          <Button variant="secondary" size="sm" onClick={onInvite}>
            <Mail className="w-4 h-4" />
            Пригласить
          </Button>
        )}
      </div>

      <div className="px-xl pb-xl pt-0">
        <PageContentCard
          loading={loading}
          empty={invites.length === 0}
          emptyState={{
            icon: Mail,
            title: "Приглашений нет",
            description: "Отправленные приглашения сотрудников появятся здесь.",
          }}
          loadingRows={4}
        >
          <div className="divide-y divide-border/50">
            {invites.map((inv) => {
              const st = mapInviteStatus(inv.status)
              const StatusIcon = st.icon
              const isLoading = actionLoading === inv.id
              const canCopy = inv.status === "pending"

              return (
                <div key={inv.id} className="p-md flex items-center justify-between gap-lg min-w-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-sm min-w-0">
                      <StatusIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium truncate">{inv.email}</span>
                      <Badge variant={st.variant}>{st.label}</Badge>
                    </div>

                    <div className="text-xs text-muted-foreground mt-xs truncate">
                      Роль: {roleById.get(inv.roleId) || "—"} · Истекает:{" "}
                      {new Date(inv.expiresAt).toLocaleDateString("ru-RU")}
                    </div>
                  </div>

                  <div className="flex items-center gap-sm shrink-0">
                    {canCopy && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyInviteLink(inv.id)}
                        disabled={isLoading}
                        aria-label="Скопировать ссылку приглашения"
                        title={urlCache.get(inv.id) ? "Скопировать ссылку" : "Получить и скопировать ссылку"}
                      >
                        {isLoading ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    )}

                    {inv.status === "pending" && (
                      <Button
                        variant="secondary"
                        size="icon"
                        onClick={async () => {
                          // "повторно отправить" отдельно от копирования
                          setActionLoading(inv.id)
                          try {
                            const res = await resendInvite(inv.id)
                            if (res?.inviteUrl) upsertInviteUrlCache(inv.id, res.inviteUrl)
                            setUrlCacheTick((x) => x + 1)
                            toast.success("Приглашение отправлено повторно")
                            onChanged?.()
                          } catch {
                            toast.error("Не удалось отправить приглашение")
                          } finally {
                            setActionLoading(null)
                          }
                        }}
                        disabled={isLoading}
                        aria-label="Отправить повторно"
                        title="Отправить повторно"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    )}

                    <Button
                      variant="danger"
                      size="icon"
                      onClick={() => handleRevoke(inv.id)}
                      disabled={isLoading}
                      aria-label="Отозвать приглашение"
                      title="Отозвать приглашение"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </PageContentCard>
      </div>
    </Card>
  )
}
