// path: apps/frontend/app/dashboard/customers/page.tsx
"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Plus, Search, RefreshCw, ChevronRight, Mail, Phone } from 'lucide-react';
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

  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PaginatedCustomersResponse | null>(null);

  const [search, setSearch] = useState('');
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

  if (!isMounted) return null;
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }
  if (!isAuthenticated || !user) return null;

  const items = data?.items || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-surface-1">
      <div className="fixed inset-0 bg-gradient-surface -z-10"></div>
      <div className="fixed top-0 right-0 w-96 h-96 bg-gradient-primary opacity-5 rounded-full blur-3xl -z-10"></div>
      <div className="fixed bottom-0 left-0 w-64 h-64 bg-secondary/10 rounded-full blur-3xl -z-10"></div>

      <header className="border-b border-border/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/20">
              <Users className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Клиенты</h1>
              <p className="text-xs text-muted-foreground">База клиентов и контакты</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard">
              <Button variant="ghost">В дашборд</Button>
            </Link>
            <Button variant="outline" onClick={() => setPage(1)}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Обновить
            </Button>
            <Button onClick={() => setOpenCreate(true)}>
              <Plus className="w-4 h-4 mr-2" /> Новый клиент
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-6 space-y-6">
        <Card className="p-4 backdrop-blur-sm bg-card/80 border-border/50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative">
              <Input
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Поиск по имени/компании/контакту"
                className="pl-9"
              />
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
            </div>
            <div className="flex gap-2">
              <select
                value={limit}
                onChange={(e) => { setLimit(parseInt(e.target.value, 10)); setPage(1); }}
                className="w-28 h-9 rounded-md border border-border bg-background text-sm px-3"
              >
                {[10, 20, 50].map((n) => (
                  <option key={n} value={n}>{n} / стр</option>
                ))}
              </select>
              <Button variant="outline" onClick={() => setPage(1)}>Применить</Button>
            </div>
          </div>
        </Card>

        <Card className="p-0 backdrop-blur-sm bg-card/80 border-border/50 overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-surface-1 rounded-md animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="p-6 text-center text-destructive">{error}</div>
          ) : items.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">
              Клиенты не найдены
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {items.map((c) => <CustomerRow key={c.id} customer={c} />)}
            </div>
          )}
        </Card>

        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Всего: {data?.total || 0}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Назад
            </Button>
            <div className="text-sm">
              Стр. {page} / {data?.totalPages || 1}
            </div>
            <Button
              variant="outline"
              disabled={page >= (data?.totalPages || 1)}
              onClick={() => setPage((p) => p + 1)}
            >
              Далее
            </Button>
          </div>
        </div>
      </main>

      <CustomerCreateDialog
        open={openCreate}
        onOpenChange={setOpenCreate}
        onCreated={onCreated}
      />
    </div>
  );
}

function CustomerRow({ customer }: { customer: CustomerResponse }) {
  const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(' ') || customer.companyName || 'Клиент';
  return (
    <Link href={`/dashboard/customers/${customer.id}`} className="block hover:bg-surface-1/60 transition-colors">
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
            <Users className="w-5 h-5 text-accent" />
          </div>
          <div>
            <div className="font-medium">{fullName}</div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
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
            </div>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground ml-2" />
      </div>
    </Link>
  );
}
