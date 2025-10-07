// path: apps/frontend/app/dashboard/customers/page.tsx
"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppLayout } from '@/components/app/AppLayout';
import { PageFeatureBadge } from '@/components/app/PageFeatureBadge';
import { PageFiltersCard, PageFiltersRow } from '@/components/app/PageFiltersCard';
import { PageContentCard } from '@/components/app/PageContentCard';
import { StatsCard, StatsGrid } from '@/components/app/StatsCard';
import { PaginationControls } from '@/components/app/PaginationControls';
import { 
  Users, 
  Plus, 
  Search,
  RefreshCw, 
  ChevronRight, 
  Mail, 
  Phone,
  Calendar,
  TrendingUp,
  Building2,
  UserCheck
} from 'lucide-react';
import { useAuth } from '@/lib/hooks/use-auth';
import { customersAPI } from '@/lib/api/customers';
import type {
  CustomersQuery,
  PaginatedCustomersResponse,
  CustomerResponse,
} from '@/lib/types/customers';
import { CustomerCreateDialog } from '@/components/customers/customer-create-dialog';

export default function CustomersListPage() {
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // ✅ ВСЕ useState в начале
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PaginatedCustomersResponse | null>(null);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [openCreate, setOpenCreate] = useState(false);

  // ✅ ВСЕ useMemo ДО условных return
  const query: CustomersQuery = useMemo(() => ({
    search: search || undefined,
    page,
    limit,
  }), [search, page, limit]);

  const items = useMemo(() => data?.items || [], [data]);

  const stats = useMemo(() => {
    const total = data?.total || 0;
    const withEmail = items.filter(c => c.email).length;
    const withPhone = items.filter(c => c.phone).length;
    const companies = items.filter(c => c.companyName).length;
    const individuals = items.filter(c => !c.companyName).length;
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recent = items.filter(c => new Date(c.createdAt) > thirtyDaysAgo).length;
    
    return { total, withEmail, withPhone, companies, individuals, recent };
  }, [data, items]);

  const headerActions = useMemo(() => (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        className="rounded-2xl btn-outline-fixed"
        onClick={handleRefresh}
      >
        <RefreshCw className="w-4 h-4 mr-2" />
        Обновить
      </Button>
      
      <Button 
        className="rounded-2xl bg-gradient-primary hover:opacity-90 transition-all duration-300 hover:scale-[1.02]"
        onClick={() => setOpenCreate(true)}
      >
        <Plus className="w-4 h-4 mr-2" />
        Новый клиент
      </Button>
    </div>
  ), []);

  // ✅ ВСЕ useEffect
  useEffect(() => setIsMounted(true), []);

  useEffect(() => {
    if (!isMounted) return;
    if (authLoading) return;
    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }

    let cancelled = false;
    const DEBOUNCE_MS = 300;

    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await customersAPI.getCustomers(query);
        if (!cancelled) setData(res);
      } catch (e) {
        try {
          const parsed = JSON.parse((e as Error).message) as { message?: string; correlationId?: string };
          const msg = parsed.correlationId
            ? `${parsed.message || 'Ошибка загрузки клиентов'} (corrId: ${parsed.correlationId})`
            : (parsed.message || 'Ошибка загрузки клиентов');
          if (!cancelled) setError(msg);
        } catch {
          if (!cancelled) setError('Ошибка загрузки клиентов');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [isMounted, authLoading, isAuthenticated, user, router, query]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpenCreate(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ✅ Функции (не хуки, но для читаемости - после useEffect)
  const onCreated = async () => {
    setPage(1);
    setLoading(true);
    try {
      const res = await customersAPI.getCustomers({ ...query, page: 1 });
      setData(res);
    } finally {
      setLoading(false);
    }
  };

  function handleRefresh() {
    setPage(1);
    setLoading(true);
    customersAPI.getCustomers({ ...query, page: 1 })
      .then(setData)
      .finally(() => setLoading(false));
  }

  // ✅ ТОЛЬКО ТЕПЕРЬ условные return
  if (!isMounted) return null;
  
  if (authLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-muted-foreground">Загрузка клиентов...</span>
          </div>
        </div>
      </AppLayout>
    );
  }
  
  if (!isAuthenticated || !user) return null;

  // ✅ Рендер (все переменные уже вычислены)
  return (
    <AppLayout 
      title="Клиенты" 
      description="База клиентов и история взаимодействий"
      icon={Users}
      actions={headerActions}
    >
      <div className="container mx-auto px-6 py-6 space-y-6">
        
        {/* Feature Badge */}
        <PageFeatureBadge
          variant="pink-rose"
          icon={Calendar}
          title="Интерактивная история клиентов"
          description="Timeline всех взаимодействий с клиентами: заказы, платежи, звонки, заметки. Кликните на клиента для просмотра."
          aside={<TrendingUp className="w-6 h-6 text-secondary" />}
        />

        {/* Filters */}
        <PageFiltersCard>
          <PageFiltersRow>
            <div className="relative">
              <Input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Поиск по имени/компании/контакту (Ctrl+K)"
                className="pl-9 h-10 rounded-2xl border-border/50 focus:border-primary/50 transition-all duration-300"
              />
              <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            </div>
            
            <div className="flex gap-2">
              <select
                value={limit}
                onChange={(e) => { setLimit(parseInt(e.target.value, 10)); setPage(1); }}
                className="w-28 h-10 rounded-2xl border border-border/50 bg-background text-sm px-3 focus:border-primary/50 transition-all duration-300"
              >
                {[10, 20, 50].map((n) => (
                  <option key={n} value={n}>{n} / стр</option>
                ))}
              </select>
            </div>
          </PageFiltersRow>
        </PageFiltersCard>

        {/* Stats */}
        <StatsGrid cols={6}>
          <StatsCard 
            title="Всего клиентов" 
            value={stats.total} 
            icon={Users} 
            color="blue" 
          />
          <StatsCard 
            title="Новых за месяц" 
            value={stats.recent} 
            icon={UserCheck} 
            color="emerald" 
          />
          <StatsCard 
            title="С email" 
            value={stats.withEmail} 
            icon={Mail} 
            color="purple" 
          />
          <StatsCard 
            title="С телефоном" 
            value={stats.withPhone} 
            icon={Phone} 
            color="cyan" 
          />
          <StatsCard 
            title="Юрлица" 
            value={stats.companies} 
            icon={Building2} 
            color="amber" 
          />
          <StatsCard 
            title="Физлица" 
            value={stats.individuals} 
            icon={Users} 
            color="default" 
          />
        </StatsGrid>

        {/* Content */}
        <PageContentCard
          loading={loading}
          error={error}
          empty={items.length === 0}
          emptyState={{
            icon: Users,
            title: 'Клиенты не найдены',
            description: search 
              ? 'Попробуйте изменить параметры поиска' 
              : 'Добавьте первого клиента в базу',
            action: {
              label: 'Добавить клиента',
              onClick: () => setOpenCreate(true),
            },
          }}
          onRetry={handleRefresh}
          loadingRows={5}
        >
          <div className="divide-y divide-border/30">
            {items.map((customer) => (
              <CustomerRow key={customer.id} customer={customer} />
            ))}
          </div>
        </PageContentCard>

        {/* Pagination */}
        <PaginationControls
          page={page}
          totalPages={data?.totalPages || 1}
          total={data?.total || 0}
          showing={items.length}
          onPageChange={setPage}
          itemLabel="клиентов"
        />
      </div>

      <CustomerCreateDialog
        open={openCreate}
        onOpenChange={setOpenCreate}
        onCreated={onCreated}
      />
    </AppLayout>
  );
}

// Customer Row - уникальный контент
function CustomerRow({ customer }: { customer: CustomerResponse }) {
  const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(' ') || customer.companyName || 'Клиент';
  
  return (
    <Link 
      href={`/dashboard/customers/${customer.id}`} 
      className="block hover:bg-surface-1/30 transition-all duration-300 group"
    >
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-pink-500/20 to-rose-500/20 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Users className="w-6 h-6 text-pink-600 dark:text-pink-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-medium mb-1 group-hover:text-primary transition-colors">{fullName}</div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {customer.phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" />
                  {customer.phone}
                </span>
              )}
              {customer.email && (
                <span className="inline-flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" />
                  {customer.email}
                </span>
              )}
              {customer.vehiclesCount !== undefined && customer.vehiclesCount > 0 && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {customer.vehiclesCount} ТС
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-xs text-muted-foreground text-right">
            {new Date(customer.createdAt).toLocaleDateString('ru-RU')}
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </Link>
  );
}
