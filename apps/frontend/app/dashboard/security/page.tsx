// path: apps/frontend/app/dashboard/security/page.tsx
"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Shield, Smartphone, Monitor, Tablet, RefreshCw, LogOut, Lock } from "lucide-react"
import { toast } from "sonner"

import { AppLayout } from "@/components/app/AppLayout"
import { NavigationHeader } from "@/components/platform/NavigationHeader"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PageContentCard } from "@/components/app/PageContentCard"
import { StatsCard, StatsGrid } from "@/components/app/StatsCard"

import { useAuth } from "@/lib/hooks/use-auth"
import { securityAPI } from "@/lib/api/security"
import type { SessionDevice } from "@/lib/types/security"

import { DeviceSessionCard } from "@/components/security/device-session-card"
import { TwoFactorAuthCard } from "@/components/security/two-factor-auth-card"
import { LogoutConfirmDialog } from "@/components/security/logout-confirm-dialog"

type ApiErrorShape = { message?: string; statusCode?: number; correlationId?: string }

function parseApiError(e: unknown, fallback: string) {
  const plain = (e as Error)?.message || ""
  if (!plain) return fallback

  try {
    const parsed = JSON.parse(plain) as ApiErrorShape
    const msg = parsed.correlationId
      ? `${parsed.message || fallback} (corrId: ${parsed.correlationId})`
      : parsed.message || fallback
    return msg
  } catch {
    return plain || fallback
  }
}

function getDeviceIdFromBrowser(): string | undefined {
  try {
    return (
      window.sessionStorage.getItem("deviceId") ||
      window.localStorage.getItem("deviceId") ||
      undefined
    )
  } catch {
    return undefined
  }
}

export default function SecurityPage() {
  const { user, logout, isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()

  const [isMounted, setIsMounted] = React.useState(false)

  const [sessions, setSessions] = React.useState<SessionDevice[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = React.useState(false)

  const [twoFAEnabled, setTwoFAEnabled] = React.useState(false)

  const [logoutDialog, setLogoutDialog] = React.useState<{
    isOpen: boolean
    deviceId?: string
    deviceName?: string
    isAllDevices?: boolean
  }>({ isOpen: false })

  const inflightRef = React.useRef(false)

  React.useEffect(() => setIsMounted(true), [])

  React.useEffect(() => {
    if (!isMounted) return
    if (authLoading) return
    if (!isAuthenticated || !user) router.push("/login")
  }, [isMounted, authLoading, isAuthenticated, user, router])

  const getDeviceIcon = React.useCallback(
    (deviceType: string): React.ComponentType<{ className?: string }> => {
      switch (deviceType?.toLowerCase()) {
        case "mobile":
          return Smartphone
        case "tablet":
          return Tablet
        case "desktop":
        default:
          return Monitor
      }
    },
    []
  )

  const formatLastActive = React.useCallback((date: Date) => {
    const now = new Date()
    const diff = now.getTime() - new Date(date).getTime()

    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return "Только что"
    if (minutes < 60) return `${minutes} мин назад`
    if (hours < 24) return `${hours} ч назад`
    return `${days} дн назад`
  }, [])

  const loadSessions = React.useCallback(
    async (forceRefresh = false) => {
      if (!isAuthenticated || !user || authLoading || !isMounted) return
      if (inflightRef.current && !forceRefresh) return

      inflightRef.current = true
      setLoading(true)
      setError(null)

      try {
        const sessionsData = await securityAPI.getSessions(forceRefresh)
        const currentDeviceId = getDeviceIdFromBrowser()

        const sessionsWithCurrent: SessionDevice[] = sessionsData.map((s) => ({
          ...s,
          isCurrentDevice: currentDeviceId ? s.deviceId === currentDeviceId : false,
        }))

        setSessions(sessionsWithCurrent)
      } catch (e: unknown) {
        const plain = (e as Error)?.message || ""

        if (plain.includes("401")) {
          await logout()
          router.push("/login")
          return
        }

        try {
          const parsed = JSON.parse(plain) as ApiErrorShape
          if (parsed.statusCode === 401) {
            await logout()
            router.push("/login")
            return
          }
          if (parsed.statusCode === 429) {
            toast.error("Слишком много запросов. Повторите чуть позже.")
            return
          }
        } catch {
          // ignore
        }

        setError(parseApiError(e, "Ошибка загрузки устройств"))
      } finally {
        setLoading(false)
        inflightRef.current = false
      }
    },
    [isAuthenticated, user, authLoading, isMounted, logout, router]
  )

  React.useEffect(() => {
    if (!isMounted) return
    if (authLoading) return
    if (!isAuthenticated || !user) return

    setTwoFAEnabled(Boolean(user.twoFactorEnabled))
    loadSessions(false)
  }, [isMounted, authLoading, isAuthenticated, user, loadSessions])

  React.useEffect(() => {
    if (!isMounted) return
    if (!user) return
    setTwoFAEnabled(Boolean(user.twoFactorEnabled))
  }, [isMounted, user])

  const sessionsSorted = React.useMemo(() => {
    const copy = [...sessions]
    copy.sort((a, b) => {
      const ta = new Date(a.lastActive as any).getTime()
      const tb = new Date(b.lastActive as any).getTime()
      return tb - ta
    })
    return copy
  }, [sessions])

  const hasCurrentDevice = React.useMemo(() => sessions.some((s) => s.isCurrentDevice), [sessions])
  const deviceIdInBrowser = React.useMemo(() => (isMounted ? getDeviceIdFromBrowser() : undefined), [isMounted])

  const handleRefresh = React.useCallback(async () => {
    setIsRefreshing(true)
    await loadSessions(true)
    setIsRefreshing(false)
    toast.success("Список устройств обновлён")
  }, [loadSessions])

  const confirmLogout = React.useCallback((deviceId?: string, deviceName?: string) => {
    setLogoutDialog({
      isOpen: true,
      deviceId,
      deviceName,
      isAllDevices: !deviceId,
    })
  }, [])

  const handleLogoutDevice = React.useCallback(
    async (deviceId: string) => {
      try {
        await securityAPI.logoutDevice({ deviceId })
        toast.success("Устройство отключено")
        await loadSessions(true)
      } catch (e: unknown) {
        toast.error(parseApiError(e, "Ошибка отключения устройства"))
      }
    },
    [loadSessions]
  )

  const handleLogoutAllDevices = React.useCallback(async () => {
    try {
      await securityAPI.logoutAllDevices()
      await logout()
      router.push("/login")
    } catch (e: unknown) {
      toast.error(parseApiError(e, "Ошибка отключения устройств"))
    }
  }, [logout, router])

  const executeLogout = React.useCallback(async () => {
    const { deviceId, isAllDevices } = logoutDialog

    if (isAllDevices) {
      await handleLogoutAllDevices()
    } else if (deviceId) {
      await handleLogoutDevice(deviceId)
    }

    setLogoutDialog({ isOpen: false })
  }, [logoutDialog, handleLogoutAllDevices, handleLogoutDevice])

  const handle2FAStatusChange = React.useCallback(async (enabled: boolean) => {
    setTwoFAEnabled(enabled)
  }, [])

  const headerActions = (
    <div className="flex items-center gap-sm">
      <Button
        variant="secondary"
        size="sm"
        onClick={handleRefresh}
        disabled={isRefreshing || inflightRef.current}
      >
        <RefreshCw className={isRefreshing ? "w-4 h-4 mr-xs animate-spin" : "w-4 h-4 mr-xs"} />
        Обновить
      </Button>

      <Button variant="danger" size="sm" onClick={() => confirmLogout()}>
        <LogOut className="w-4 h-4 mr-xs" />
        Выйти везде
      </Button>
    </div>
  )

  if (!isMounted) return null

  if (authLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex items-center gap-sm">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-muted-foreground">Проверка авторизации...</span>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (!isAuthenticated || !user) return null

  return (
    <AppLayout>
      <div className="container mx-auto px-lg py-xl flex flex-col gap-lg">
        <NavigationHeader
          title="Безопасность"
          subtitle="Устройства входа и двухфакторная аутентификация"
          icon={<Shield className="w-5 h-5" />}
          actions={headerActions}
        />

        <StatsGrid cols={2}>
          <StatsCard title="Активных устройств" value={sessions.length} icon={Monitor} />
          <StatsCard title="2FA" value={twoFAEnabled ? "Включена" : "Отключена"} icon={Lock} />
        </StatsGrid>

        <TwoFactorAuthCard enabled={twoFAEnabled} onStatusChange={handle2FAStatusChange} />

        <div className="flex flex-col gap-sm">
          <div className="flex items-start justify-between gap-lg">
            <div className="min-w-0">
              <div className="flex items-center gap-sm">
                <h2 className="text-sm font-semibold text-foreground">Активные устройства</h2>
                {!loading && sessions.length > 0 ? (
                  hasCurrentDevice ? (
                    <Badge variant="active">Текущее отмечено</Badge>
                  ) : (
                    <Badge variant="pending">Текущее не определено</Badge>
                  )
                ) : null}
              </div>

              <p className="text-sm text-muted-foreground mt-xs">
                Сверху — наиболее активные. Устройство, с которого вы сейчас в системе, помечается бейджем «Текущее».
              </p>
            </div>
          </div>

          {!loading && sessions.length > 0 && !hasCurrentDevice && (
            <div className="p-md rounded-md bg-status-pending/10 border border-status-pending/20">
              <div className="text-sm text-foreground">
                Сейчас не удалось определить текущее устройство.
              </div>
              <div className="text-sm text-muted-foreground mt-xs">
                Обычно это происходит, если браузер не сохранил идентификатор устройства{deviceIdInBrowser ? "" : " (deviceId)"}.
                В таком случае ориентируйтесь по «Только что» / самой свежей активности. Если нужно — выйдите и войдите снова.
              </div>
            </div>
          )}

          <PageContentCard
            loading={loading}
            error={error}
            empty={!loading && !error && sessionsSorted.length === 0}
            emptyState={{
              icon: Smartphone,
              title: "Активных устройств не найдено",
              description: "Нажмите «Обновить», чтобы запросить список ещё раз.",
            }}
            onRetry={handleRefresh}
            loadingRows={5}
          >
            <div className="divide-y divide-border/50">
              {sessionsSorted.map((session) => (
                <DeviceSessionCard
                  key={session.id}
                  session={session}
                  onLogout={() => confirmLogout(session.deviceId, session.deviceName)}
                  getDeviceIcon={getDeviceIcon}
                  formatLastActive={formatLastActive}
                />
              ))}
            </div>
          </PageContentCard>
        </div>
      </div>

      <LogoutConfirmDialog
        isOpen={logoutDialog.isOpen}
        onClose={() => setLogoutDialog({ isOpen: false })}
        onConfirm={executeLogout}
        deviceName={logoutDialog.deviceName}
        isAllDevices={logoutDialog.isAllDevices}
      />
    </AppLayout>
  )
}
