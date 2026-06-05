// path: apps/frontend/app/dashboard/users/[id]/page.tsx
"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { User as UserIcon, RefreshCw, Mail, Phone, Shield, Calendar, Trash2 } from "lucide-react"

import { AppLayout } from "@/components/app/AppLayout"
import { NavigationHeader } from "@/components/platform/NavigationHeader"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import { useAuth } from "@/lib/hooks/use-auth"
import { usersAPI } from "@/lib/api/users"
import { getRoleLabel } from "@/lib/utils/role-labels"
import type { User, Role } from "@/lib/types/users"
import { cn } from "@/lib/utils"

import UserSessions from "@/components/users/UserSessions.client"

function bestEffortError(e: unknown, fallback: string) {
  try {
    const parsed = JSON.parse((e as Error).message) as { message?: string; correlationId?: string }
    const msg = parsed.correlationId
      ? `${parsed.message || fallback} (corrId: ${parsed.correlationId})`
      : parsed.message || fallback
    return msg
  } catch {
    return fallback
  }
}

function getFullName(u: User | null) {
  if (!u) return "Сотрудник"
  const first = (u.firstName || "").trim()
  const last = (u.lastName || "").trim()
  const full = [first, last].filter(Boolean).join(" ")
  return full || u.email || "Сотрудник"
}

function getInitials(u: User | null) {
  if (!u) return "?"
  const a = (u.firstName || "").trim()[0] || ""
  const b = (u.lastName || "").trim()[0] || ""
  const c = (u.email || "").trim()[0] || ""
  return ((a + b) || c || "?").toUpperCase()
}

function mapUserStatus(status?: string): { label: string; variant: "active" | "draft" } {
  // По факту бэк даёт isActive -> active/inactive
  const s = (status || "active").toLowerCase()
  if (s === "active") return { label: "Активен", variant: "active" }
  return { label: "Неактивен", variant: "draft" }
}

export default function UserDetailsPage() {
  const params = useParams<{ id: string }>()
  const id = React.useMemo(() => (Array.isArray(params?.id) ? params.id[0] : params?.id) as string, [params])

  const router = useRouter()
  const { isAuthenticated, user: me, isLoading: authLoading } = useAuth()

  const [isMounted, setIsMounted] = React.useState(false)

  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [employee, setEmployee] = React.useState<User | null>(null)

  const [roles, setRoles] = React.useState<Role[]>([])
  const [rolesLoading, setRolesLoading] = React.useState(false)

  const [actionLoading, setActionLoading] = React.useState(false)

  const [openRoleDialog, setOpenRoleDialog] = React.useState(false)
  const [roleId, setRoleId] = React.useState<string>("")

  const [openToggleActive, setOpenToggleActive] = React.useState(false)
  const [openDelete, setOpenDelete] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)

  React.useEffect(() => setIsMounted(true), [])

  const load = React.useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const u = await usersAPI.getUser(id)
      setEmployee(u)
      setRoleId(u.role?.id || "")
    } catch (e) {
      setEmployee(null)
      setError(bestEffortError(e, "Ошибка загрузки сотрудника"))
    } finally {
      setLoading(false)
    }
  }, [id])

  const loadRoles = React.useCallback(async () => {
    setRolesLoading(true)
    try {
      const list = await usersAPI.listAssignableRoles()
      setRoles(list || [])
    } finally {
      setRolesLoading(false)
    }
  }, [])

  React.useEffect(() => {
    if (!isMounted) return
    if (authLoading) return

    if (!isAuthenticated || !me) {
      router.push("/login")
      return
    }

    void load()
  }, [isMounted, authLoading, isAuthenticated, me, router, load])

  const statusInfo = React.useMemo(() => mapUserStatus(employee?.status), [employee?.status])
  const title = getFullName(employee)
  const roleText = employee?.role?.name ? getRoleLabel(employee.role.name) : "—"

  const meRoleName = (me?.role?.name || "").toLowerCase()
  const canDelete = ["owner", "company_owner", "admin", "company_admin", "superadmin"].includes(meRoleName)

  const onSaveRole = async () => {
    if (!employee?.id || !roleId) return
    setActionLoading(true)
    setError(null)
    try {
      const updated = await usersAPI.updateUserRole(employee.id, { roleId })
      setEmployee(updated)
      setOpenRoleDialog(false)
    } catch (e) {
      setError(bestEffortError(e, "Не удалось изменить роль"))
    } finally {
      setActionLoading(false)
    }
  }

  const onToggleActive = async () => {
    if (!employee?.id) return
    setActionLoading(true)
    setError(null)
    try {
      const next = (employee.status || "active") === "active" ? "inactive" : "active"
      const updated = await usersAPI.updateUserStatus(employee.id, { status: next })
      setEmployee(updated)
    } catch (e) {
      setError(bestEffortError(e, "Не удалось изменить статус"))
    } finally {
      setActionLoading(false)
      setOpenToggleActive(false)
    }
  }

  const onDelete = async () => {
    if (!employee?.id) return
    setDeleting(true)
    setError(null)
    try {
      await usersAPI.deleteUser(employee.id)
      router.push("/dashboard/users")
    } catch (e) {
      setError(bestEffortError(e, "Не удалось удалить сотрудника"))
    } finally {
      setDeleting(false)
      setOpenDelete(false)
    }
  }

  if (!isMounted) return null

  if (authLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex items-center gap-sm">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-muted-foreground">Загрузка...</span>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (!isAuthenticated || !me) return null

  const headerActions = (
    <div className="flex items-center gap-sm">
      <Button variant="secondary" size="sm" onClick={load} disabled={loading}>
        <RefreshCw className="w-4 h-4" />
        Обновить
      </Button>

      <Button
        variant="secondary"
        size="sm"
        onClick={() => {
          setOpenRoleDialog(true)
          void loadRoles()
        }}
        disabled={loading || !employee}
      >
        <Shield className="w-4 h-4" />
        Роль
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpenToggleActive(true)}
        disabled={actionLoading || loading || !employee}
      >
        {statusInfo.variant === "active" ? "Деактивировать" : "Активировать"}
      </Button>

      {canDelete && (
        <Button variant="danger" size="sm" onClick={() => setOpenDelete(true)} disabled={deleting || loading || !employee}>
          <Trash2 className="w-4 h-4" />
          Удалить
        </Button>
      )}
    </div>
  )

  return (
    <AppLayout>
      <div className="container mx-auto px-lg py-xl flex flex-col gap-lg">
        <NavigationHeader
          title={title}
          subtitle="Профиль сотрудника и активность"
          icon={<UserIcon className="w-5 h-5" />}
          backHref="/dashboard/users"
          backLabel="К сотрудникам"
          actions={headerActions}
        />

        {loading ? (
          <div className="grid gap-lg">
            <Card className="p-lg">
              <div className="flex items-start gap-md">
                <Skeleton className="w-10 h-10 rounded-md" />
                <div className="flex-1 min-w-0">
                  <Skeleton className="h-5 w-[260px] max-w-full" />
                  <div className="mt-sm grid gap-xs">
                    <Skeleton className="h-4 w-[360px] max-w-full" />
                    <Skeleton className="h-4 w-[300px] max-w-full" />
                  </div>
                </div>
              </div>
            </Card>

            <div className="grid md:grid-cols-2 gap-lg">
              <Card className="p-lg">
                <Skeleton className="h-5 w-[180px]" />
                <div className="mt-md grid gap-sm">
                  <Skeleton className="h-4 w-[280px]" />
                  <Skeleton className="h-4 w-[240px]" />
                  <Skeleton className="h-4 w-[220px]" />
                </div>
              </Card>
              <Card className="p-lg">
                <Skeleton className="h-5 w-[160px]" />
                <div className="mt-md grid gap-sm">
                  <Skeleton className="h-4 w-[280px]" />
                  <Skeleton className="h-4 w-[240px]" />
                  <Skeleton className="h-4 w-[220px]" />
                </div>
              </Card>
            </div>
          </div>
        ) : error ? (
          <Card className="p-lg border border-status-error/30 bg-status-error/10 text-status-error text-sm">
            {error}
          </Card>
        ) : !employee ? (
          <Card className="p-lg text-sm text-muted-foreground">Сотрудник не найден</Card>
        ) : (
          <>
            <Card className="p-lg">
              <div className="flex items-start justify-between gap-lg">
                <div className="min-w-0">
                  <div className="flex items-center gap-sm min-w-0">
                    <div className="w-10 h-10 rounded-md bg-surface-2 border flex items-center justify-center shrink-0">
                      <span className="text-sm font-semibold text-muted-foreground">{getInitials(employee)}</span>
                    </div>

                    <div className="min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">{title}</div>
                      <div className="mt-xs flex flex-wrap items-center gap-sm text-xs text-muted-foreground">
                        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                        <Badge variant="secondary">{roleText}</Badge>
                        <span className="truncate">ID: {employee.id}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-md flex flex-wrap items-center gap-md text-sm text-muted-foreground">
                    {employee.email && (
                      <span className="inline-flex items-center gap-xs">
                        <Mail className="w-4 h-4" />
                        {employee.email}
                      </span>
                    )}
                    {employee.phone && (
                      <span className="inline-flex items-center gap-xs">
                        <Phone className="w-4 h-4" />
                        {employee.phone}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            <div className="grid gap-lg md:grid-cols-2">
              <Card className="p-lg">
                <div className="flex items-center gap-sm mb-md">
                  <Shield className="w-4 h-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold text-foreground">Доступ</h2>
                </div>

                <div className="grid gap-sm text-sm text-muted-foreground">
                  <div>Роль: {roleText}</div>
                  <div>Специализация: {employee.specialization || "—"}</div>
                </div>
              </Card>

              <Card className="p-lg">
                <div className="flex items-center gap-sm mb-md">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold text-foreground">Активность</h2>
                </div>

                <div className="grid gap-sm text-sm text-muted-foreground">
                  <div>
                    Дата создания:{" "}
                    {employee.createdAt ? new Date(employee.createdAt).toLocaleString("ru-RU") : "—"}
                  </div>
                  <div>
                    Последний вход:{" "}
                    {employee.lastLoginAt ? new Date(employee.lastLoginAt).toLocaleString("ru-RU") : "—"}
                  </div>
                  <div className="pt-xs">
                    <UserSessions userId={employee.id} compact />
                  </div>
                </div>
              </Card>
            </div>

            <UserSessions userId={employee.id} />
          </>
        )}
      </div>

      {/* Change role dialog */}
      <Dialog open={openRoleDialog} onOpenChange={setOpenRoleDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Изменить роль</DialogTitle>
            <DialogDescription>Назначьте сотруднику новую роль в системе.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-sm">
            <label htmlFor="user-role" className="text-sm font-medium leading-none text-foreground">
              Роль <span className="text-destructive" aria-hidden="true">*</span>
            </label>

            {rolesLoading ? (
              <div className="h-10 rounded-md border border-input bg-background px-md text-sm text-muted-foreground flex items-center">
                Загрузка ролей…
              </div>
            ) : (
              <select
                id="user-role"
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                className={cn(
                  "h-10 w-full rounded-md border border-input bg-background px-md text-sm",
                  "text-foreground hover:border-border/80"
                )}
              >
                <option value="">Выберите роль…</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {getRoleLabel(r.name)}
                  </option>
                ))}
              </select>
            )}
          </div>

          <DialogFooter>
            <Button variant="secondary" type="button" onClick={() => setOpenRoleDialog(false)} disabled={actionLoading}>
              Отмена
            </Button>
            <Button variant="primary" type="button" onClick={onSaveRole} disabled={actionLoading || !roleId}>
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toggle active confirm */}
      <ConfirmDialog
        open={openToggleActive}
        onOpenChange={setOpenToggleActive}
        title={statusInfo.variant === "active" ? "Деактивировать сотрудника?" : "Активировать сотрудника?"}
        description={
          statusInfo.variant === "active"
            ? "Сотрудник потеряет доступ к системе. Продолжить?"
            : "Сотрудник снова сможет входить в систему. Продолжить?"
        }
        confirmText={statusInfo.variant === "active" ? "Деактивировать" : "Активировать"}
        variant="destructive"
        loading={actionLoading}
        onConfirm={onToggleActive}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={openDelete}
        onOpenChange={setOpenDelete}
        title="Удалить сотрудника?"
        description="Действие необратимо. Продолжить?"
        confirmText="Удалить"
        variant="destructive"
        loading={deleting}
        onConfirm={onDelete}
      />
    </AppLayout>
  )
}
