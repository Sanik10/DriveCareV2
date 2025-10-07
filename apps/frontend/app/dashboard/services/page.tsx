// path: apps/frontend/app/dashboard/services/page.tsx
'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Building2, 
  Plus, 
  Search, 
  RefreshCw, 
  Pencil, 
  Trash2,
  Clock,
  DollarSign,
  TrendingUp,
  Filter,
  Tag
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { AppLayout } from '@/components/app/AppLayout'
import { PageFeatureBadge } from '@/components/app/PageFeatureBadge'
import { PageFiltersCard, PageFiltersRow } from '@/components/app/PageFiltersCard'
import { PageContentCard } from '@/components/app/PageContentCard'
import { StatsCard, StatsGrid } from '@/components/app/StatsCard'
import { PaginationControls } from '@/components/app/PaginationControls'
import { useAuth } from '@/lib/hooks/use-auth'
import { servicesAPI } from '@/lib/api/services'
import type { PaginatedServicesResponse, ServiceCatalogueItem } from '@/lib/types/services'
import { ServiceEditDialog } from '@/components/services/service-edit-dialog'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function ServicesCataloguePage() {
  const { isAuthenticated, user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [isMounted, setIsMounted] = useState(false)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<PaginatedServicesResponse | null>(null)

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)

  const [openEdit, setOpenEdit] = useState(false)
  const [current, setCurrent] = useState<ServiceCatalogueItem | null>(null)

  useEffect(() => setIsMounted(true), [])

  const query = useMemo(() => ({ search: search || undefined, page, limit }), [search, page, limit])

  useEffect(() => {
    if (!isMounted) return
    if (authLoading) return
    if (!isAuthenticated || !user) {
      router.push('/login')
      return
    }

    let cancelled = false
    const t = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await servicesAPI.search(query)
        if (!cancelled) setData(res)
      } catch (e) {
        try {
          const parsed = JSON.parse((e as Error).message) as { message?: string }
          if (!cancelled) setError(parsed.message || 'Ошибка загрузки услуг')
        } catch {
          if (!cancelled) setError('Ошибка загрузки услуг')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }, 250)

    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [isMounted, authLoading, isAuthenticated, user, router, query])

  const handleCreate = () => {
    setCurrent(null)
    setOpenEdit(true)
  }

  const handleEdit = (svc: ServiceCatalogueItem) => {
    setCurrent(svc)
    setOpenEdit(true)
  }

  const handleSaved = async () => {
    const res = await servicesAPI.search({ ...query, page: 1 })
    setData(res)
    setPage(1)
  }

  const handleDelete = async (svc: ServiceCatalogueItem) => {
    if (!confirm(`Удалить услугу "${svc.name}"?`)) return
    try {
      await servicesAPI.remove(svc.id)
      toast.success('Услуга удалена')
      const res = await servicesAPI.search({ ...query, page: 1 })
      setData(res)
      setPage(1)
    } catch (e) {
      try {
        const parsed = JSON.parse((e as Error).message) as { message?: string }
        toast.error(parsed.message || 'Ошибка удаления услуги')
      } catch {
        toast.error('Ошибка удаления услуги')
      }
    }
  }

  const handleRefresh = async () => {
    setPage(1)
    setLoading(true)
    try {
      const res = await servicesAPI.search({ ...query, page: 1 })
      setData(res)
      toast.success('Каталог обновлен')
    } catch (e) {
      toast.error('Ошибка обновления')
    } finally {
      setLoading(false)
    }
  }

  if (!isMounted) return null
  
  if (authLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-muted-foreground">Загрузка каталога...</span>
          </div>
        </div>
      </AppLayout>
    )
  }
  
  if (!isAuthenticated || !user) return null

  const items = data?.items || []

  const headerActions = (
    <div className="flex items-center gap-2">
      <Button 
        variant="outline" 
        onClick={handleRefresh}
        className="rounded-2xl btn-outline-fixed"
      >
        <RefreshCw className="w-4 h-4 mr-2" />
        Обновить
      </Button>
      <Button 
        onClick={handleCreate}
        className="rounded-2xl bg-gradient-primary hover:opacity-90 transition-all duration-300 hover:scale-[1.02]"
      >
        <Plus className="w-4 h-4 mr-2" />
        Новая услуга
      </Button>
    </div>
  )

  return (
    <AppLayout
      title="Каталог услуг"
      description="Справочник услуг автосервиса с редактированием и ценами"
      icon={Building2}
      actions={headerActions}
    >
      <div className="container mx-auto px-6 py-6 space-y-6">
        
        {/* Feature Badge - теперь через компонент */}
        <PageFeatureBadge
          variant="blue-indigo"
          icon={Building2}
          title="Каталог услуг с редактированием"
          description="Управление справочником услуг: цены, длительность, налогообложение. Inline редактирование и быстрый поиск."
          aside={<TrendingUp className="w-6 h-6 text-secondary" />}
        />

        {/* Filters - через PageFiltersCard */}
        <PageFiltersCard>
          <PageFiltersRow>
            <div className="relative">
              <Input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                placeholder="Поиск услуг по названию или описанию"
                className="pl-9 h-10 rounded-2xl border-border/50 focus:border-primary/50 transition-all duration-300"
              />
              <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            </div>
            
            <div className="flex gap-2">
              <select
                value={limit}
                onChange={(e) => { setLimit(parseInt(e.target.value, 10)); setPage(1) }}
                className="h-10 rounded-2xl border border-border/50 bg-background text-sm px-3 focus:border-primary/50 transition-all duration-300"
              >
                {[10, 20, 50].map(n => (
                  <option key={n} value={n}>{n} / стр</option>
                ))}
              </select>
              <div className="flex items-center text-sm text-muted-foreground">
                <Filter className="w-4 h-4 mr-2" />
                Всего: {data?.total || 0}
              </div>
            </div>
          </PageFiltersRow>
        </PageFiltersCard>

        {/* Stats - через StatsGrid + StatsCard */}
        <StatsGrid cols={4}>
          <StatsCard 
            title="Всего услуг" 
            value={data?.total || 0} 
            icon={Building2} 
            color="blue" 
          />
          <StatsCard 
            title="Средняя цена" 
            value={items.length > 0 
              ? Math.round(items.reduce((sum, s) => sum + (s.price || 0), 0) / items.length).toLocaleString('ru-RU')
              : 0
            }
            suffix="₽"
            icon={DollarSign} 
            color="emerald" 
          />
          <StatsCard 
            title="Ср. длительность" 
            value={items.length > 0
              ? Math.round(items.reduce((sum, s) => sum + (s.durationMinutes || 0), 0) / items.length)
              : 0
            }
            suffix="мин"
            icon={Clock} 
            color="amber" 
          />
          <StatsCard 
            title="С НДС" 
            value={items.filter(s => s.taxable !== false).length} 
            icon={Tag} 
            color="purple" 
          />
        </StatsGrid>

        {/* Content - через PageContentCard */}
        <PageContentCard
          loading={loading}
          error={error}
          empty={items.length === 0}
          emptyState={{
            icon: Building2,
            title: 'Услуги не найдены',
            description: search ? 'Попробуйте изменить параметры поиска' : 'Добавьте первую услугу в каталог',
            action: {
              label: 'Добавить услугу',
              onClick: handleCreate,
            },
          }}
          onRetry={handleRefresh}
        >
          <div className="divide-y divide-border/30">
            {items.map(svc => (
              <ServiceRow 
                key={svc.id} 
                service={svc} 
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </PageContentCard>

        {/* Pagination - через PaginationControls */}
        <PaginationControls
          page={page}
          totalPages={data?.totalPages || 1}
          total={data?.total || 0}
          showing={items.length}
          onPageChange={setPage}
          itemLabel="услуг"
        />
      </div>

      <ServiceEditDialog 
        open={openEdit} 
        onOpenChange={setOpenEdit} 
        service={current} 
        onSaved={handleSaved} 
      />
    </AppLayout>
  )
}

// Service Row Component (оставляем как есть - уникальный контент)
function ServiceRow({ 
  service, 
  onEdit, 
  onDelete 
}: { 
  service: ServiceCatalogueItem; 
  onEdit: (service: ServiceCatalogueItem) => void;
  onDelete: (service: ServiceCatalogueItem) => void;
}) {
  return (
    <div className="p-4 hover:bg-surface-1/30 transition-all duration-300 group">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="p-2 rounded-xl bg-gradient-to-r from-blue-500/20 to-indigo-500/20 group-hover:scale-105 transition-transform">
            <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm mb-1 truncate group-hover:text-primary transition-colors">
              {service.name}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                <span>{(service.price || 0).toLocaleString('ru-RU')} ₽</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{service.durationMinutes || 0} мин</span>
              </div>
              {service.taxable === false && (
                <Badge variant="outline" className="text-xs px-1 py-0 h-5">
                  Без НДС
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onEdit(service)}
            className="rounded-xl btn-outline-fixed opacity-0 group-hover:opacity-100 transition-all duration-300"
          >
            <Pencil className="w-3.5 h-3.5 mr-1" /> 
            Изменить
          </Button>
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={() => void onDelete(service)}
            className="rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" /> 
            Удалить
          </Button>
        </div>
      </div>
    </div>
  )
}
