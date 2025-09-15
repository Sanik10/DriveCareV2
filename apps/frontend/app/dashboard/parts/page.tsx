// path: apps/frontend/app/dashboard/parts/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Plus, Search, RefreshCw, Pencil, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/lib/hooks/use-auth';
import { partsAPI } from '@/lib/api/parts';
import type { PaginatedPartsResponse, PartCatalogueItem } from '@/lib/types/parts';
import { PartEditDialog } from '@/components/parts/part-edit-dialog';
import { toast } from 'sonner';

export default function PartsCataloguePage() {
  const { isAuthenticated, user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PaginatedPartsResponse | null>(null);

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const [openEdit, setOpenEdit] = useState(false);
  const [current, setCurrent] = useState<PartCatalogueItem | null>(null);

  useEffect(() => setIsMounted(true), []);

  useEffect(() => {
    if (!isMounted) return;
    if (authLoading) return;
    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }

    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = search.trim()
          ? await partsAPI.search({ search: search.trim(), page, limit })
          : await partsAPI.list({ page, limit });
        if (!cancelled) setData(res);
      } catch (e) {
        try {
          const parsed = JSON.parse((e as Error).message) as { message?: string };
          if (!cancelled) setError(parsed.message || 'Ошибка загрузки запчастей');
        } catch {
          if (!cancelled) setError('Ошибка загрузки запчастей');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [isMounted, authLoading, isAuthenticated, user, router, search, page, limit]);

  const handleCreate = () => {
    setCurrent(null);
    setOpenEdit(true);
  };

  const handleEdit = (p: PartCatalogueItem) => {
    setCurrent(p);
    setOpenEdit(true);
  };

  const handleSaved = async () => {
    const res = search.trim()
      ? await partsAPI.search({ search: search.trim(), page: 1, limit })
      : await partsAPI.list({ page: 1, limit });
    setData(res);
    setPage(1);
  };

  const handleDelete = async (p: PartCatalogueItem) => {
    if (!confirm(`Удалить запчасть "${p.name}"?`)) return;
    try {
      await partsAPI.remove(p.id);
      toast.success('Запчасть удалена');
      const res = search.trim()
        ? await partsAPI.search({ search: search.trim(), page: 1, limit })
        : await partsAPI.list({ page: 1, limit });
      setData(res);
      setPage(1);
    } catch (e) {
      try {
        const parsed = JSON.parse((e as Error).message) as { message?: string };
        toast.error(parsed.message || 'Ошибка удаления запчасти');
      } catch {
        toast.error('Ошибка удаления запчасти');
      }
    }
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
      <div className="fixed inset-0 bg-gradient-surface -z-10" />
      <div className="fixed top-0 right-0 w-96 h-96 bg-gradient-primary opacity-5 rounded-full blur-3xl -z-10" />
      <div className="fixed bottom-0 left-0 w-64 h-64 bg-secondary/10 rounded-full blur-3xl -z-10" />

      <header className="border-b border-border/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-gradient-primary">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">Каталог запчастей</h1>
              <p className="text-xs text-muted-foreground">Справочник запчастей и артикулов</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setPage(1)}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Обновить
            </Button>
            <Button onClick={handleCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Новая запчасть
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
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Поиск по названию/артикулу/бренду"
                className="pl-9"
              />
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
            </div>
            <div className="flex gap-2">
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(parseInt(e.target.value, 10));
                  setPage(1);
                }}
                className="w-28 h-9 rounded-md border border-border bg-background text-sm px-3"
              >
                {[10, 20, 50].map((n) => (
                  <option key={n} value={n}>
                    {n} / стр
                  </option>
                ))}
              </select>
              <Button variant="outline" onClick={() => setPage(1)}>
                Применить
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-0 backdrop-blur-sm bg-card/80 border-border/50 overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-14 bg-surface-1 rounded-md animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="p-6 text-center text-destructive">{error}</div>
          ) : items.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">Запчасти не найдены</div>
          ) : (
            <div className="divide-y divide-border/60">
              {items.map((p) => (
                <div key={p.id} className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.brand ? `${p.brand} · ` : ''}
                      {p.partNumber || '—'} · {(p.sellingPrice || 0).toLocaleString('ru-RU')} ₽
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(p)}>
                      <Pencil className="w-3.5 h-3.5 mr-1" /> Изменить
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => void handleDelete(p)}>
                      <Trash2 className="w-3.5 h-3.5 mr-1" /> Удалить
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">Всего: {data?.total || 0}</div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              disabled={(data?.page || 1) <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Назад
            </Button>
            <div className="text-sm">
              Стр. {data?.page || 1} / {data?.totalPages || 1}
            </div>
            <Button
              variant="outline"
              disabled={(data?.page || 1) >= (data?.totalPages || 1)}
              onClick={() => setPage((p) => p + 1)}
            >
              Далее
            </Button>
          </div>
        </div>
      </main>

      <PartEditDialog open={openEdit} onOpenChange={setOpenEdit} part={current} onSaved={handleSaved} />
    </div>
  );
}
