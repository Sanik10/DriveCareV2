// path: apps/frontend/app/dashboard/customers/page.tsx
"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AppLayout } from '@/components/app/AppLayout';
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
  Filter
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

  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PaginatedCustomersResponse | null>(null);

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [openCreate, setOpenCreate] = useState(false);

  useEffect(() => setIsMounted(true), []);

  const query: CustomersQuery = useMemo(() => ({
    search: search || undefined,
    page,
    limit,
  }), [search, page, limit]);

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

  const onCreated = async () => {
    setPage(1);
    const res = await customersAPI.getCustomers({ ...query, page: 1 });
    setData(res);
  };

  const handleRefresh = async () => {
    setPage(1);
    const res = await customersAPI.getCustomers({ ...query, page: 1 });
    setData(res);
  };

  if (!isMounted) return null;
  if (authLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <span className="text-muted-foreground">Загрузка...</span>
          </div>
        </div>
      </AppLayout>
    );
  }
  if (!isAuthenticated || !user) return null;

  const items = data?.items || [];

  const headerActions = (
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
  );

  return (
    <AppLayout 
      title="Клиенты" 
      description="База клиентов и история взаимодействий"
      icon={Users}
      actions={headerActions}
    >
      <div className="container mx-auto px-6 py-6 space-y-6">
        {/* Timeline Feature Badge */}
        <Card className="p-4 glass border-accent/20 bg-gradient-to-r from-accent/5 to-primary/5 rounded-3xl">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-r from-accent to-primary">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-accent">Интерактивная история клиентов</h3>
              <p className="text-sm text-muted-foreground">
                Timeline всех взаимодействий с клиентами: заказы, платежи, звонки, заметки. Кликните на клиента для просмотра.
              </p>
            </div>
            <div className="ml-auto">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
          </div>
        </Card>

        {/* Search & Filters */}
        <Card className="p-4 glass border-border/30 rounded-3xl surface-glow">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <Input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Поиск по имени/компании/контакту"
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
              <Button 
                variant="outline" 
                className="rounded-2xl btn-outline-fixed"
                onClick={() => setPage(1)}
              >
                Применить
              </Button>
            </div>
            
            <div className="flex items-center text-sm text-muted-foreground">
              <Filter className="w-4 h-4 mr-2" />
              Быстрый поиск: Ctrl/Cmd + K
            </div>
          </div>
        </Card>

        {/* Customer List */}
        <Card className="p-0 glass border-border/30 rounded-3xl surface-glow overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-surface-1/40 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="p-6 text-center text-destructive">{error}</div>
          ) : items.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h3 className="font-semibold mb-2">Клиенты не найдены</h3>
              <p className="text-sm">Попробуйте изменить параметры поиска или добавьте первого клиента</p>
              <Button 
                className="mt-4 rounded-2xl bg-gradient-primary hover:opacity-90"
                onClick={() => setOpenCreate(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Добавить клиента
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {items.map((customer) => (
                <CustomerRow key={customer.id} customer={customer} />
              ))}
            </div>
          )}
        </Card>

        {/* Pagination */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Всего: {data.total || 0} клиентов
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="rounded-2xl btn-outline-fixed"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Назад
              </Button>
              <span className="text-sm px-3 py-1 rounded-xl bg-surface-1/60">
                {page} / {data.totalPages}
              </span>
              <Button
                variant="outline"
                className="rounded-2xl btn-outline-fixed"
                disabled={page >= data.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Далее
              </Button>
            </div>
          </div>
        )}
      </div>

      <CustomerCreateDialog
        open={openCreate}
        onOpenChange={setOpenCreate}
        onCreated={onCreated}
      />
    </AppLayout>
  );
}

function CustomerRow({ customer }: { customer: CustomerResponse }) {
  const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(' ') || customer.companyName || 'Клиент';
  
  return (
    <Link 
      href={`/dashboard/customers/${customer.id}`} 
      className="block hover:bg-surface-1/30 transition-all duration-300 group"
    >
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-accent/20 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Users className="w-6 h-6 text-accent" />
          </div>
          <div>
            <div className="font-medium mb-1">{fullName}</div>
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
              {customer.vehiclesCount && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {customer.vehiclesCount} ТС
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">
            {new Date(customer.createdAt).toLocaleDateString('ru-RU')}
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground ml-2 group-hover:translate-x-1 transition-transform" />
      </div>
    </Link>
  );
}
