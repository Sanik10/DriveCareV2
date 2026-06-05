// path: apps/frontend/app/dashboard/users/page.tsx
"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Users, Plus, RefreshCw, Search, AlertTriangle, UserCheck, Mail } from "lucide-react"

import { AppLayout } from "@/components/app/AppLayout"
import { NavigationHeader } from "@/components/platform/NavigationHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { PageFiltersCard, PageFiltersRow } from "@/components/app/PageFiltersCard"
import { PageContentCard } from "@/components/app/PageContentCard"
import { StatsCard, StatsGrid } from "@/components/app/StatsCard"
import { PaginationControls } from "@/components/app/PaginationControls"

import UsersList from "@/components/users/UsersList.client"
import InvitesList from "@/components/users/InvitesList.client"
import { InviteUserDialog } from "@/components/users/invite-user-dialog"

import { useAuth } from "@/lib/hooks/use-auth"
import { subscriptionBillingAPI } from "@/lib/api/subscription-billing"
import { listAssignableRoles, listInvites, listUsers } from "@/lib/api/users"
import { getRoleLabel } from "@/lib/utils/role-labels"

import type { PaginatedUsersResponse, Role } from "@/lib/types/users"
import type { UserInvite } from "@/lib/types/user-invites"
import { cn } from "@/lib/utils"

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

export default function UsersPage() {
  const { isAuthenticated, user, isLoading: authLoading } = useAuth()
  const router = useRouter()

  const [isMounted, setIsMounted] = React.useState(false)

  // users list (paged)
  const [usersLoading, setUsersLoading] = React.useState(true)
  const [usersError, setUsersError] = React.useState<string | null>(null)
  const [usersData, setUsersData] = React.useState<PaginatedUsersResponse | null>(null)

  // meta (invites/roles/subscription)
  const [invitesLoading, setInvitesLoading] = React.useState(true)
  const [invites, setInvites] = React.useState<UserInvite[]>([])
  const [roles, setRoles] = React.useState<Role[]>([])
  const [maxUsers, setMaxUsers] = React.useState<number | null>(null)

  // filters
  const [search, setSearch] = React.useState("")
  const [status, setStatus] = React.useState<"" | "active" | "inactive">("")
  const [role, setRole] = React.useState<string>("")
  const [page, setPage] = React.useState(1)
  const [limit, setLimit] = React.useState(10)

  const [openInvite, setOpenInvite] = React.useState(false)
  const searchRef = React.useRef<HTMLInputElement | null>(null)

  React.useEffect(() => setIsMounted(true), [])

  const items = React.useMemo(() => usersData?.items || [], [usersData])
  const pendingInvitesCount = React.useMemo(
    () => invites.filter((i) => i.status === "pending").length,
    [invites]
  )

  const used = React.useMemo(() => (usersData?.total || 0) + pendingInvitesCount, [usersData?.total, pendingInvitesCount])
  const limitReached = React.useMemo(() => maxUsers !== null && used >= maxUsers, [maxUsers, used])

  const stats = React.useMemo(() => {
    const total = usersData?.total || 0
    const activeOnPage = items.filter((u) => (u.status || "active") === "active").length
    return { total, activeOnPage }
  }, [usersData?.total, items])

  const usersQuery = React.useMemo(
    () => ({
      search: search || undefined,
      page,
      limit,
      role: role || undefined,
      status: status || undefined,
    }),
    [search, page, limit, role, status]
  )

  const loadUsers = React.useCallback(async () => {
    setUsersLoading(true)
    setUsersError(null)
    try {
      const res = await listUsers(usersQuery)
      setUsersData(res)
    } catch (e) {
      setUsersError(bestEffortError(e, "Ошибка загрузки сотрудников"))
    } finally {
      setUsersLoading(false)
    }
  }, [usersQuery])

  const loadMeta = React.useCallback(async () => {
    setInvitesLoading(true)
    try {
      const [inv, r, activeSub] = await Promise.all([
        listInvites().catch(() => []),
        listAssignableRoles().catch(() => []),
        subscriptionBillingAPI.getActive().catch(() => null),
      ])
      setInvites(inv || [])
      setRoles(r || [])
      setMaxUsers(activeSub?.tariff?.maxUsers ?? null)
    } finally {
      setInvitesLoading(false)
    }
  }, [])

  const handleRefresh = React.useCallback(async () => {
    // refresh = всё
    await Promise.all([loadUsers(), loadMeta()])
  }, [loadUsers, loadMeta])

  React.useEffect(() => {
    if (!isMounted) return
    if (authLoading) return

    if (!isAuthenticated || !user) {
      router.push("/login")
      return
    }

    // meta грузим один раз при входе
    void loadMeta()
  }, [isMounted, authLoading, isAuthenticated, user, router, loadMeta])

  React.useEffect(() => {
    if (!isMounted) return
    if (authLoading) return
    if (!isAuthenticated || !user) return

    // users — с debounce (как customers)
    let cancelled = false
    const DEBOUNCE_MS = 300

    const t = window.setTimeout(async () => {
      if (cancelled) return
      await loadUsers()
    }, DEBOUNCE_MS)

    return () => {
      cancelled = true
      window.clearTimeout(t)
    }
  }, [isMounted, authLoading, isAuthenticated, user, loadUsers])

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const key = e.key.toLowerCase()
      if ((e.metaKey || e.ctrlKey) && key === "k") {
        e.preventDefault()
        searchRef.current?.focus()
      }
      if ((e.metaKey || e.ctrlKey) && key === "n") {
        e.preventDefault()
        if (!limitReached) setOpenInvite(true)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [limitReached])

  if (!isMounted) return null

  if (authLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex items-center gap-sm">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-muted-foreground">Загрузка команды...</span>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (!isAuthenticated || !user) return null

  const headerActions = (
    <div className="flex items-center gap-sm">
      {limitReached && (
        <Badge variant="error" className="hidden sm:inline-flex">
          Лимит тарифа
        </Badge>
      )}

      <Button variant="secondary" size="sm" onClick={handleRefresh} disabled={usersLoading}>
        <RefreshCw className="w-4 h-4" />
        Обновить
      </Button>

      <Button
        variant="primary"
        size="sm"
        onClick={() => setOpenInvite(true)}
        disabled={limitReached}
        title={limitReached ? "Достигнут лимит тарифа" : undefined}
      >
        <Plus className="w-4 h-4" />
        Пригласить
      </Button>
    </div>
  )

  return (
    <AppLayout>
      <div className="container mx-auto px-lg py-xl flex flex-col gap-lg">
        <NavigationHeader
          title="Сотрудники"
          subtitle="Управление командой и приглашениями"
          icon={<Users className="w-5 h-5" />}
          actions={headerActions}
        />

        <StatsGrid cols={4}>
          <StatsCard title="Всего сотрудников" value={stats.total} icon={Users} />
          <StatsCard title="Активных (на странице)" value={stats.activeOnPage} icon={UserCheck} />
          <StatsCard title="Ожидают приглашения" value={pendingInvitesCount} icon={Mail} />
          <StatsCard
            title="Использование лимита"
            value={maxUsers !== null ? `${used} / ${maxUsers}` : used}
            icon={Users}
          />
        </StatsGrid>

        {limitReached && (
          <Card>
            <div className="p-xl flex items-start gap-md min-w-0">
              <div className="w-10 h-10 rounded-md bg-surface-2 border flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 text-status-error" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">Достигнут лимит тарифа</div>
                <div className="text-sm text-muted-foreground mt-xs">
                  Чтобы пригласить нового сотрудника, обновите тариф или удалите/деактивируйте сотрудника.
                </div>
              </div>

              <Button variant="secondary" size="sm" asChild>
                <Link href="/dashboard/billing">Открыть биллинг</Link>
              </Button>
            </div>
          </Card>
        )}

        <PageFiltersCard>
          <PageFiltersRow>
            <div className="relative w-full lg:max-w-lg">
              <label htmlFor="users-search" className="sr-only">
                Поиск сотрудников
              </label>
              <Input
                id="users-search"
                ref={searchRef}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                placeholder="Поиск по имени/email/телефону..."
                className="pl-xxl"
              />
              <Search className="w-4 h-4 absolute left-md top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>

            <div className="flex items-center gap-sm">
              <label className="sr-only" htmlFor="users-status">
                Статус
              </label>
              <select
                id="users-status"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as "" | "active" | "inactive")
                  setPage(1)
                }}
                className={cn(
                  "h-10 rounded-md border border-input bg-background text-sm px-md",
                  "text-foreground hover:border-border/80"
                )}
              >
                <option value="">Все статусы</option>
                <option value="active">Активные</option>
                <option value="inactive">Неактивные</option>
              </select>

              <label className="sr-only" htmlFor="users-role">
                Роль
              </label>
              <select
                id="users-role"
                value={role}
                onChange={(e) => {
                  setRole(e.target.value)
                  setPage(1)
                }}
                className={cn(
                  "h-10 rounded-md border border-input bg-background text-sm px-md",
                  "text-foreground hover:border-border/80"
                )}
              >
                <option value="">Все роли</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.name}>
                    {getRoleLabel(r.name)}
                  </option>
                ))}
              </select>

              <label className="sr-only" htmlFor="users-limit">
                На странице
              </label>
              <select
                id="users-limit"
                value={limit}
                onChange={(e) => {
                  setLimit(parseInt(e.target.value, 10))
                  setPage(1)
                }}
                className={cn(
                  "h-10 rounded-md border border-input bg-background text-sm px-md",
                  "text-foreground hover:border-border/80"
                )}
              >
                {[10, 20, 50].map((n) => (
                  <option key={n} value={n}>
                    {n} / стр
                  </option>
                ))}
              </select>
            </div>
          </PageFiltersRow>
        </PageFiltersCard>

        <PageContentCard
          loading={usersLoading}
          error={usersError}
          empty={items.length === 0}
          emptyState={{
            icon: Users,
            title: "Сотрудники не найдены",
            description: search
              ? "Попробуйте изменить параметры поиска."
              : limitReached
                ? "Лимит тарифа достигнут. Обновите тариф или освободите место."
                : "Пригласите первого сотрудника в команду.",
            action:
              !search && !limitReached
                ? {
                    label: "Пригласить сотрудника",
                    onClick: () => setOpenInvite(true),
                    icon: Plus,
                  }
                : undefined,
          }}
          onRetry={handleRefresh}
          loadingRows={6}
        >
          <UsersList users={items} />
        </PageContentCard>

        <PaginationControls
          page={page}
          totalPages={usersData?.totalPages || 1}
          total={usersData?.total || 0}
          showing={items.length}
          onPageChange={setPage}
          itemLabel="сотрудников"
        />

        <InvitesList
          loading={invitesLoading}
          invites={invites}
          roles={roles}
          onInvite={limitReached ? undefined : () => setOpenInvite(true)}
          onChanged={loadMeta}
        />
      </div>

      <InviteUserDialog open={openInvite} onOpenChange={setOpenInvite} onSuccess={handleRefresh} />
    </AppLayout>
  )
}
