// path: apps/frontend/app/dashboard/customers/page.tsx
"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Users,
  Plus,
  Search,
  RefreshCw,
  ChevronRight,
  Mail,
  Phone,
  Building2,
  UserCheck,
  Calendar,
} from "lucide-react"

import { AppLayout } from "@/components/app/AppLayout"
import { NavigationHeader } from "@/components/platform/NavigationHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PageFiltersCard, PageFiltersRow } from "@/components/app/PageFiltersCard"
import { PageContentCard } from "@/components/app/PageContentCard"
import { StatsCard, StatsGrid } from "@/components/app/StatsCard"
import { PaginationControls } from "@/components/app/PaginationControls"
import { CustomerCreateDialog } from "@/components/customers/customer-create-dialog"

import { useAuth } from "@/lib/hooks/use-auth"
import { customersAPI } from "@/lib/api/customers"
import type { CustomerResponse, CustomersQuery, PaginatedCustomersResponse } from "@/lib/types/customers"
import { cn } from "@/lib/utils"

export default function CustomersListPage() {
  const { isAuthenticated, user, isLoading: authLoading } = useAuth()
  const router = useRouter()

  const [isMounted, setIsMounted] = React.useState(false)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [data, setData] = React.useState<PaginatedCustomersResponse | null>(null)

  const [search, setSearch] = React.useState("")
  const [page, setPage] = React.useState(1)
  const [limit, setLimit] = React.useState(10)

  const [openCreate, setOpenCreate] = React.useState(false)

  const query: CustomersQuery = React.useMemo(
    () => ({
      search: search || undefined,
      page,
      limit,
    }),
    [search, page, limit]
  )

  const items = React.useMemo(() => data?.items || [], [data])

  const stats = React.useMemo(() => {
    const total = data?.total || 0
    const withEmail = items.filter((c) => c.email).length
    const withPhone = items.filter((c) => c.phone).length
    const companies = items.filter((c) => c.companyName).length
    const individuals = items.filter((c) => !c.companyName).length

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const recent = items.filter((c) => new Date(c.createdAt) > thirtyDaysAgo).length

    return { total, withEmail, withPhone, companies, individuals, recent }
  }, [data, items])

  React.useEffect(() => setIsMounted(true), [])

  React.useEffect(() => {
    if (!isMounted) return
    if (authLoading) return

    if (!isAuthenticated || !user) {
      router.push("/login")
      return
    }

    let cancelled = false
    const DEBOUNCE_MS = 300

    const timer = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await customersAPI.getCustomers(query)
        if (!cancelled) setData(res)
      } catch (e) {
        // best-effort parsing (как в других разделах)
        try {
          const parsed = JSON.parse((e as Error).message) as { message?: string; correlationId?: string }
          const msg = parsed.correlationId
            ? `${parsed.message || "Ошибка загрузки клиентов"} (corrId: ${parsed.correlationId})`
            : parsed.message || "Ошибка загрузки клиентов"
          if (!cancelled) setError(msg)
        } catch {
          if (!cancelled) setError("Ошибка загрузки клиентов")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, DEBOUNCE_MS)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [isMounted, authLoading, isAuthenticated, user, router, query])

  const handleRefresh = React.useCallback(() => {
    setPage(1)
    setLoading(true)
    setError(null)

    customersAPI
      .getCustomers({ ...query, page: 1 })
      .then(setData)
      .catch(() => setError("Ошибка загрузки клиентов"))
      .finally(() => setLoading(false))
  }, [query])

  const onCreated = React.useCallback(async () => {
    setPage(1)
    setLoading(true)
    setError(null)

    try {
      const res = await customersAPI.getCustomers({ ...query, page: 1 })
      setData(res)
    } catch {
      setError("Ошибка загрузки клиентов")
    } finally {
      setLoading(false)
    }
  }, [query])

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "n") {
        e.preventDefault()
        setOpenCreate(true)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  if (!isMounted) return null

  if (authLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex items-center gap-sm">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-muted-foreground">Загрузка клиентов...</span>
          </div>
        </div>
      </AppLayout>
    )
  }

  if (!isAuthenticated || !user) return null

  const headerActions = (
    <div className="flex items-center gap-sm">
      <Button variant="secondary" size="sm" onClick={handleRefresh} disabled={loading}>
        <RefreshCw className="w-4 h-4 mr-xs" />
        Обновить
      </Button>

      <Button variant="primary" size="sm" onClick={() => setOpenCreate(true)}>
        <Plus className="w-4 h-4 mr-xs" />
        Новый клиент
      </Button>
    </div>
  )

  return (
    <AppLayout>
      <div className="container mx-auto px-lg py-xl flex flex-col gap-lg">
        <NavigationHeader
          title="Клиенты"
          subtitle="База клиентов и история взаимодействий"
          icon={<Users className="w-5 h-5" />}
          actions={headerActions}
        />

        <StatsGrid cols={6}>
          <StatsCard title="Всего клиентов" value={stats.total} icon={Users} />
          <StatsCard title="Новых за месяц" value={stats.recent} icon={UserCheck} />
          <StatsCard title="С email" value={stats.withEmail} icon={Mail} />
          <StatsCard title="С телефоном" value={stats.withPhone} icon={Phone} />
          <StatsCard title="Юрлица" value={stats.companies} icon={Building2} />
          <StatsCard title="Физлица" value={stats.individuals} icon={Users} />
        </StatsGrid>

        <PageFiltersCard>
          <PageFiltersRow>
            <div className="relative w-full lg:max-w-lg">
              <label htmlFor="customers-search" className="sr-only">
                Поиск клиентов
              </label>
              <Input
                id="customers-search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                placeholder="Поиск по имени/компании/контакту..."
                className="pl-[36px]"
              />
              <Search className="w-4 h-4 absolute left-md top-1/2 -translate-y-1/2 text-muted-foreground" />
            </div>

            <div className="flex items-center gap-sm">
              <label className="sr-only" htmlFor="customers-limit">
                На странице
              </label>
              <select
                id="customers-limit"
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
          loading={loading}
          error={error}
          empty={items.length === 0}
          emptyState={{
            icon: Users,
            title: "Клиенты не найдены",
            description: search ? "Попробуйте изменить параметры поиска." : "Добавьте первого клиента в базу.",
            action: {
              label: "Добавить клиента",
              onClick: () => setOpenCreate(true),
              icon: Plus,
            },
          }}
          onRetry={handleRefresh}
          loadingRows={6}
        >
          <div className="divide-y divide-border/50">
            {items.map((customer) => (
              <CustomerRow key={customer.id} customer={customer} />
            ))}
          </div>
        </PageContentCard>

        <PaginationControls
          page={page}
          totalPages={data?.totalPages || 1}
          total={data?.total || 0}
          showing={items.length}
          onPageChange={setPage}
          itemLabel="клиентов"
        />
      </div>

      <CustomerCreateDialog open={openCreate} onOpenChange={setOpenCreate} onCreated={onCreated} />
    </AppLayout>
  )
}

function CustomerRow({ customer }: { customer: CustomerResponse }) {
  const fullName =
    [customer.firstName, customer.lastName].filter(Boolean).join(" ") ||
    customer.companyName ||
    "Клиент"

  const metaParts: string[] = []
  if (customer.phone) metaParts.push(customer.phone)
  if (customer.email) metaParts.push(customer.email)
  if (typeof customer.vehiclesCount === "number") metaParts.push(`${customer.vehiclesCount} ТС`)

  return (
    <Link href={`/dashboard/customers/${customer.id}`} className="block transition-colors hover:bg-surface-2">
      <div className="p-md flex items-center justify-between gap-lg min-w-0">
        <div className="flex items-center gap-md min-w-0 flex-1">
          <div className="w-10 h-10 rounded-md bg-surface-2 border flex items-center justify-center shrink-0">
            <Users className="w-4 h-4 text-muted-foreground" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-sm min-w-0">
              <span className="text-sm font-medium truncate">{fullName}</span>
            </div>

            <div className="text-xs text-muted-foreground truncate mt-xs">
              {metaParts.length > 0 ? metaParts.join(" · ") : "—"}
            </div>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-xs text-muted-foreground mt-xs inline-flex items-center gap-xs">
            <Calendar className="w-3.5 h-3.5" />
            {new Date(customer.createdAt).toLocaleDateString("ru-RU")}
          </div>
        </div>

        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
      </div>
    </Link>
  )
}
