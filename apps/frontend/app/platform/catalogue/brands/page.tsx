// path: apps/frontend/app/platform/catalogue/brands/page.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/lib/hooks/use-auth';
import { vehiclesCatalogueAPI } from '@/lib/api/vehicles-catalogue';
import type { CatalogueBrand } from '@/lib/types/vehicles-catalogue';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Factory,
  Check,
  X,
  RefreshCw,
  GitMerge,
  AlertTriangle,
  Filter,
  Search,
  ShieldCheck,
  ListFilter,
  Target,
  Trash2,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

type TriState = 'all' | 'true' | 'false';
type Mode = 'queue' | 'duplicates' | 'all';

const SHOW_VERIFICATION = true;

export default function CatalogueBrandsPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const roleName = (user?.role?.name || '').toLowerCase();
  const isPlatformAdmin = roleName === 'superadmin' || roleName === 'platform_admin';
  const isSuperadmin = roleName === 'superadmin';

  // Режим
  const [mode, setMode] = useState<Mode>('queue');

  // Фильтры
  const [search, setSearch] = useState('');
  const [verified, setVerified] = useState<TriState>('false'); // очередь = только неподтверждённые
  const [active, setActive] = useState<TriState>('all');

  // Создание
  const [newBrandName, setNewBrandName] = useState('');
  const [creating, setCreating] = useState(false);

  // Данные
  const [items, setItems] = useState<CatalogueBrand[]>([]);
  const [page, setPage] = useState(1);
  const limit = 20;
  const [hasMore, setHasMore] = useState(false);

  // Дубликаты
  const [duplicates, setDuplicates] = useState<Array<{ key: string; items: CatalogueBrand[] }>>([]);
  const [dupsLoading, setDupsLoading] = useState(false);

  // UI
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  // Merge dialog
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeSourceId, setMergeSourceId] = useState('');
  const [mergeTargetQuery, setMergeTargetQuery] = useState('');
  const [mergeCandidates, setMergeCandidates] = useState<CatalogueBrand[]>([]);
  const [mergeTargetId, setMergeTargetId] = useState('');
  const [merging, setMerging] = useState(false);
  const [mergeSearchLoading, setMergeSearchLoading] = useState(false);

  // Delete
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Выбор для массовых действий
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);
  const allSelectedOnPage = useMemo(() => items.length > 0 && items.every((b) => selected[b.id]), [items, selected]);

  // Последовательность запросов
  const requestSeq = useRef(0);

  // Query params map
  const queryVerified = useMemo<boolean | undefined>(
    () => (verified === 'all' ? undefined : verified === 'true'),
    [verified],
  );
  const activeParam = useMemo(() => (active === 'all' ? undefined : active === 'true'), [active]);

  // Helper
  const norm = (s: string) => (s || '').trim().replace(/\s+/g, ' ').toLowerCase();

  // Сброс пресетов при смене режима
  useEffect(() => {
    setPage(1);
    setSelected({});
    if (mode === 'queue') {
      setVerified('false');
      setActive('all');
    } else {
      setVerified('all');
      setActive('all');
    }
  }, [mode]);

  // Загрузка списка (без локальных фильтров; доверяем бэку)
  const load = async (opts: { reset?: boolean } = {}) => {
    if (mode === 'duplicates') {
      await loadDuplicates();
      return;
    }
    const { reset } = opts;
    const seq = ++requestSeq.current;
    setErr(null);
    setLoading(true);
    try {
      const nextPage = reset ? 1 : page;
      if (reset) {
        setItems([]);
        setPage(1);
        setSelected({});
      }
      const res = await vehiclesCatalogueAPI.brands({
        search,
        isVerified: SHOW_VERIFICATION ? queryVerified : undefined,
        isActive: activeParam,
        page: nextPage,
        limit,
      } as any);

      if (seq !== requestSeq.current) return;

      setHasMore(res.length === limit);
      if (reset) {
        setItems(res);
        setPage(1);
      } else {
        setItems((prev) => [...prev, ...res]);
        setPage(nextPage);
      }
    } catch (e) {
      if (seq !== requestSeq.current) return;
      setErr(parseErr(e));
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  };

  const loadMore = async () => {
    if (loading || !hasMore || mode === 'duplicates') return;
    const nextPage = page + 1;
    const seq = ++requestSeq.current;
    setLoading(true);
    setErr(null);
    try {
      const res = await vehiclesCatalogueAPI.brands({
        search,
        isVerified: SHOW_VERIFICATION ? queryVerified : undefined,
        isActive: activeParam,
        page: nextPage,
        limit,
      } as any);

      if (seq !== requestSeq.current) return;

      setItems((prev) => [...prev, ...res]);
      setHasMore(res.length === limit);
      setPage(nextPage);
    } catch (e) {
      if (seq !== requestSeq.current) return;
      setErr('Ошибка загрузки');
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  };

  const loadDuplicates = async () => {
    setErr(null);
    setDupsLoading(true);
    setDuplicates([]);
    try {
      const res = await vehiclesCatalogueAPI.brands({ search: search || undefined, limit: 500 });
      const map = new Map<string, CatalogueBrand[]>();
      for (const b of res) {
        const key = norm(b.name);
        if (!key) continue;
        const arr = map.get(key) || [];
        arr.push(b);
        map.set(key, arr);
      }
      const groups = Array.from(map.entries())
        .map(([key, items]) => ({ key, items }))
        .filter((g) => g.items.length > 1)
        .sort((a, b) => b.items.length - a.items.length);
      setDuplicates(groups);
    } catch (e) {
      setErr(parseErr(e));
    } finally {
      setDupsLoading(false);
    }
  };

  // Автозагрузка при изменении фильтров/режима
  useEffect(() => {
    if (!isAuthenticated || !isPlatformAdmin) return;
    const t = setTimeout(() => void load({ reset: true }), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, verified, active, mode, isAuthenticated, isPlatformAdmin]);

  if (isLoading) return null;
  if (!isAuthenticated || !isPlatformAdmin) {
    return (
      <div className="container mx-auto px-6 py-10">
        <Card className="p-8 text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-rose-500/10 flex items-center justify-center mb-4">
            <AlertTriangle className="w-7 h-7 text-rose-500" />
          </div>
        </Card>
      </div>
    );
  }

  // Actions
  const toggleVerify = async (id: string, current?: boolean) => {
    if (!SHOW_VERIFICATION) return;
    if (typeof current === 'undefined') return;
    setProcessing(true);
    try {
      const updated = await vehiclesCatalogueAPI.verifyBrand(id, !current);
      setItems((prev) => {
        const next = prev.map((b) => (b.id === id ? { ...b, isVerified: updated.isVerified } : b));
        if (mode === 'queue' && updated.isVerified) {
          return next.filter((b) => b.id !== id);
        }
        return next;
      });
      toast.success(updated.isVerified ? 'Бренд подтверждён' : 'Подтверждение снято');
    } catch (e) {
      toast.error(parseErr(e));
    } finally {
      setProcessing(false);
    }
  };

  const toggleActive = async (id: string, current?: boolean) => {
    if (typeof current === 'undefined') return;
    setProcessing(true);
    try {
      const updated = await vehiclesCatalogueAPI.updateBrand(id, { isActive: !current });
      setItems((prev) => prev.map((b) => (b.id === id ? { ...b, isActive: updated.isActive } : b)));
      toast.success(updated.isActive ? 'Активирован' : 'Деактивирован');
    } catch (e) {
      toast.error(parseErr(e));
    } finally {
      setProcessing(false);
    }
  };

  const bulkVerify = async (value: boolean) => {
    if (!SHOW_VERIFICATION || selectedIds.length === 0) return;
    setProcessing(true);
    try {
      const { success, fail } = await processInBatches(
        selectedIds,
        (id) => vehiclesCatalogueAPI.verifyBrand(id, value),
        { concurrency: 6, retry: 3, baseDelayMs: 300 },
      );
      setSelected({});
      await load({ reset: true });
      toast.success(`Готово: ${success}${fail ? `. Ошибок: ${fail}` : ''}`);
    } catch {
      toast.error('Не удалось применить массовое действие');
    } finally {
      setProcessing(false);
    }
  };

  const openMerge = (sourceId?: string) => {
    setMergeSourceId(sourceId || selectedIds[0] || '');
    setMergeTargetId('');
    setMergeTargetQuery('');
    setMergeCandidates([]);
    setMergeOpen(true);
  };

  const searchMergeTargets = async (q: string) => {
    setMergeTargetQuery(q);
    if (!q.trim()) {
      setMergeCandidates([]);
      return;
    }
    setMergeSearchLoading(true);
    try {
      const res = await vehiclesCatalogueAPI.brands({ search: q.trim(), limit: 20 });
      setMergeCandidates(res);
    } catch {
      setMergeCandidates([]);
    } finally {
      setMergeSearchLoading(false);
    }
  };

  const doMerge = async () => {
    if (!mergeSourceId || !mergeTargetId || mergeSourceId === mergeTargetId) return;
    setMerging(true);
    try {
      await vehiclesCatalogueAPI.mergeBrand(mergeSourceId, mergeTargetId);
      toast.success('Бренд слит');
      setMergeOpen(false);
      setItems((prev) => prev.filter((b) => b.id !== mergeSourceId));
      setSelected((prev) => {
        const next = { ...prev };
        delete next[mergeSourceId];
        return next;
      });
      if (mode === 'duplicates') await loadDuplicates();
    } catch (e) {
      toast.error(parseErr(e));
    } finally {
      setMerging(false);
    }
  };

  // Групповое слияние
  const mergeGroupInto = async (targetId: string, groupItems: CatalogueBrand[]) => {
    const sources = groupItems.map((i) => i.id).filter((id) => id !== targetId);
    if (sources.length === 0) return;
    setProcessing(true);
    try {
      const results = await Promise.allSettled(sources.map((id) => vehiclesCatalogueAPI.mergeBrand(id, targetId)));
      const success = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.length - success;
      setItems((prev) => prev.filter((b) => !sources.includes(b.id)));
      await loadDuplicates();
      toast.success(`Слито: ${success}${failed ? `. Ошибок: ${failed}` : ''}`);
    } catch (e) {
      toast.error(parseErr(e));
    } finally {
      setProcessing(false);
    }
  };

  const toggleSelectAllOnPage = () => {
    if (allSelectedOnPage) {
      const next = { ...selected };
      items.forEach((b) => delete next[b.id]);
      setSelected(next);
    } else {
      const next = { ...selected };
      items.forEach((b) => (next[b.id] = true));
      setSelected(next);
    }
  };

  const askDelete = (id: string) => {
    setDeleteId(id);
    setDeleteOpen(true);
  };

  const doDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await vehiclesCatalogueAPI.deleteBrand(deleteId);
      toast.success('Бренд удалён');
      setItems((prev) => prev.filter((b) => b.id !== deleteId));
      setSelected((prev) => {
        const next = { ...prev };
        delete next[deleteId];
        return next;
      });
    } catch (e) {
      toast.error(parseErr(e));
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
      setDeleteId(null);
    }
  };

  // Подсказка о дублях на текущей странице
  const dupCounts = useMemo(() => {
    const map = new Map<string, number>();
    items.forEach((b) => {
      const k = norm(b.name);
      map.set(k, (map.get(k) || 0) + 1);
    });
    return map;
  }, [items]);

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Factory className="w-6 h-6 text-primary" />
            Каталог брендов — Модерация
          </h1>
          <p className="text-muted-foreground">
            Подтверждение, поиск дублей и слияние. Массовые действия. Удаление доступно суперадмину.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={mode === 'queue' ? 'default' : 'outline'}
            onClick={() => setMode('queue')}
            className="rounded-2xl"
          >
            <ShieldCheck className="w-4 h-4 mr-1" />
            Очередь
          </Button>
          <Button
            variant={mode === 'duplicates' ? 'default' : 'outline'}
            onClick={() => setMode('duplicates')}
            className="rounded-2xl"
          >
            <GitMerge className="w-4 h-4 mr-1" />
            Дубликаты
          </Button>
          <Button
            variant={mode === 'all' ? 'default' : 'outline'}
            onClick={() => setMode('all')}
            className="rounded-2xl"
          >
            <ListFilter className="w-4 h-4 mr-1" />
            Все
          </Button>

          <Button
            variant="outline"
            onClick={() => (mode === 'duplicates' ? loadDuplicates() : load({ reset: true }))}
            className="rounded-2xl btn-outline-fixed"
            disabled={loading || dupsLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading || dupsLoading ? 'animate-spin' : ''}`} />
            Обновить
          </Button>
        </div>
      </div>

      {/* Filters & Bulk actions + Create */}
      {mode !== 'duplicates' && (
        <Card className="p-4 space-y-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative max-w-sm">
              <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Поиск бренда..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="rounded-2xl pl-9"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              {SHOW_VERIFICATION ? (
                <>
                  <span className="text-sm text-muted-foreground">Верификация:</span>
                  <select
                    value={verified}
                    onChange={(e) => {
                      setVerified(e.target.value as TriState);
                      setPage(1);
                    }}
                    className="h-10 rounded-2xl border px-3"
                  >
                    <option value="all">Все</option>
                    <option value="true">Подтверждённые</option>
                    <option value="false">Неподтверждённые</option>
                  </select>
                </>
              ) : (
                <Badge variant="outline" className="text-xs">Верификация недоступна</Badge>
              )}

              <span className="text-sm text-muted-foreground ml-2">Статус:</span>
              <select
                value={active}
                onChange={(e) => {
                  setActive(e.target.value as TriState);
                  setPage(1);
                }}
                className="h-10 rounded-2xl border px-3"
              >
                <option value="all">Все</option>
                <option value="true">Активные</option>
                <option value="false">Неактивные</option>
              </select>
            </div>

            {/* Массовые действия */}
            <div className="md:ml-auto flex items-center gap-2">
              {SHOW_VERIFICATION && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={selectedIds.length === 0 || processing}
                    onClick={() => bulkVerify(true)}
                    className="rounded-2xl"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Подтвердить ({selectedIds.length})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={selectedIds.length === 0 || processing}
                    onClick={() => bulkVerify(false)}
                    className="rounded-2xl"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Снять
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Create brand */}
          <div className="flex flex-col md:flex-row gap-3 md:items-center">
            <div className="flex items-center gap-2 flex-1">
              <Input
                placeholder="Новый бренд (например: Toyota)"
                value={newBrandName}
                onChange={(e) => setNewBrandName(e.target.value)}
                className="rounded-2xl"
              />
              <Button
                onClick={async () => {
                  const name = (newBrandName || '').trim();
                  if (!name) return;
                  setCreating(true);
                  try {
                    await vehiclesCatalogueAPI.createBrand(name);
                    setNewBrandName('');
                    toast.success('Бренд создан');
                    await load({ reset: true });
                  } catch (e) {
                    toast.error(parseErr(e));
                  } finally {
                    setCreating(false);
                  }
                }}
                disabled={!newBrandName.trim() || creating}
                className="rounded-2xl"
              >
                <Plus className={`w-4 h-4 mr-1 ${creating ? 'animate-spin' : ''}`} />
                Создать бренд
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Список или дубликаты */}
      {mode === 'duplicates' ? (
        <Card className="p-0 overflow-hidden">
          {dupsLoading ? (
            <div className="p-6">Поиск дублей…</div>
          ) : err ? (
            <div className="p-6 text-destructive">{err}</div>
          ) : duplicates.length === 0 ? (
            <div className="p-6 text-muted-foreground">Дубликаты не найдены</div>
          ) : (
            <div className="divide-y divide-border/30">
              {duplicates.map((g) => {
                const canonical = g.items.find((x) => x.isVerified) || g.items.sort((a, b) => a.name.length - b.name.length)[0];
                return (
                  <div key={g.key} className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <GitMerge className="w-4 h-4 text-emerald-600" />
                      <div className="font-medium">Группа дублей: «{g.items[0]?.name}»</div>
                      <Badge variant="outline">{g.items.length}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {g.items.map((b) => (
                        <div
                          key={b.id}
                          className={`px-2 py-1 rounded-xl border text-xs ${
                            b.id === canonical.id
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                              : 'border-border/40'
                          }`}
                        >
                          {b.name} <span className="text-muted-foreground">({b.id.slice(0, 6)})</span>
                          {b.isVerified ? <span className="ml-1 text-emerald-600">✓</span> : null}
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <Button size="sm" className="rounded-2xl" disabled={processing} onClick={() => mergeGroupInto(canonical.id, g.items)}>
                        <Target className="w-4 h-4 mr-1" />
                        Слить в «{canonical.name}»
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-2xl"
                        onClick={() => {
                          setMergeSourceId(g.items.find((x) => x.id !== canonical.id)?.id || g.items[0].id);
                          setMergeOpen(true);
                        }}
                      >
                        Ручное слияние...
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      ) : (
        <Card className="p-0 overflow-hidden">
          {loading && items.length === 0 ? (
            <div className="p-6">Загрузка…</div>
          ) : err ? (
            <div className="p-6 text-destructive">{err}</div>
          ) : items.length === 0 ? (
            <div className="p-6 text-muted-foreground">Ничего не найдено</div>
          ) : (
            <>
              <div className="p-3 border-b border-border/30 flex items-center gap-3">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={allSelectedOnPage} onChange={toggleSelectAllOnPage} />
                  Выбрать всё на странице ({items.length})
                </label>
                {selectedIds.length > 0 && <Badge variant="outline">Выбрано: {selectedIds.length}</Badge>}
              </div>
              <div className="divide-y divide-border/30">
                {items.map((b) => {
                  const dupHint = (dupCounts.get(norm(b.name)) || 0) > 1;
                  return (
                    <div key={b.id} className="p-4 flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={!!selected[b.id]}
                        onChange={(e) => setSelected((prev) => ({ ...prev, [b.id]: e.target.checked }))}
                        className="mt-0.5"
                      />
                      <div className="flex-1">
                        <div className="font-medium">
                          {b.name} {dupHint && <Badge variant="outline" className="ml-2 text-[10px]">возможный дубль</Badge>}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {b.country ? `Страна: ${b.country}` : '—'} · ID: <span className="font-mono">{b.id}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant={b.isActive ? 'outline' : 'default'}
                          onClick={() => toggleActive(b.id, b.isActive)}
                          disabled={processing}
                          className="rounded-2xl"
                          title={b.isActive ? 'Деактивировать' : 'Активировать'}
                        >
                          {b.isActive ? 'Активен' : 'Неактивен'}
                        </Button>

                        {SHOW_VERIFICATION && (
                          <>
                            <Badge variant={b.isVerified ? 'default' : 'outline'} className={b.isVerified ? 'bg-emerald-500/10 text-emerald-600' : ''}>
                              {b.isVerified ? 'Verified' : 'Unverified'}
                            </Badge>
                            <Button
                              size="sm"
                              variant={b.isVerified ? 'outline' : 'default'}
                              onClick={() => toggleVerify(b.id, b.isVerified)}
                              disabled={processing}
                              className="rounded-2xl"
                            >
                              {b.isVerified ? (
                                <>
                                  <X className="w-4 h-4 mr-1" /> Снять
                                </>
                              ) : (
                                <>
                                  <Check className="w-4 h-4 mr-1" /> Подтвердить
                                </>
                              )}
                            </Button>
                          </>
                        )}

                        <Button size="sm" variant="outline" className="rounded-2xl" onClick={() => openMerge(b.id)}>
                          <GitMerge className="w-4 h-4 mr-1" />
                          Слить
                        </Button>

                        {isSuperadmin && (
                          <Button size="sm" variant="destructive" className="rounded-2xl" onClick={() => askDelete(b.id)}>
                            <Trash2 className="w-4 h-4 mr-1" />
                            Удалить
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-4">
                {hasMore && (
                  <Button onClick={loadMore} disabled={loading} className="rounded-2xl w-full md:w-auto">
                    {loading ? 'Загрузка…' : 'Показать ещё'}
                  </Button>
                )}
              </div>
            </>
          )}
        </Card>
      )}

      {/* Merge mini-dialog */}
      {mergeOpen && (
        <Card className="p-4 rounded-2xl border-primary/20 glass">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="font-semibold flex items-center gap-2">
              <GitMerge className="w-4 h-4 text-primary" />
              Слияние брендов
            </div>
            <Button variant="outline" size="sm" className="rounded-2xl" onClick={() => setMergeOpen(false)}>
              Закрыть
            </Button>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Источник (будет слит)</div>
              <Input placeholder="ID источника" value={mergeSourceId} onChange={(e) => setMergeSourceId(e.target.value)} className="rounded-2xl" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Целевой бренд (поиск по названию)</div>
              <div className="relative">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
                <Input
                  placeholder="Начните вводить название бренда"
                  value={mergeTargetQuery}
                  onChange={(e) => searchMergeTargets(e.target.value)}
                  className="pl-9 rounded-2xl"
                />
                {mergeSearchLoading && <div className="absolute right-3 top-2.5 text-xs text-muted-foreground">Поиск…</div>}
              </div>
              {mergeCandidates.length > 0 && (
                <div className="mt-2 border rounded-xl max-h-56 overflow-auto">
                  {mergeCandidates.map((b) => (
                    <button
                      key={b.id}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-accent/40 ${mergeTargetId === b.id ? 'bg-accent/30' : ''}`}
                      onClick={() => setMergeTargetId(b.id)}
                    >
                      {b.name} <span className="text-xs text-muted-foreground">({b.id.slice(0, 8)}…)</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="mt-3">
            <Button onClick={doMerge} disabled={!mergeSourceId || !mergeTargetId || merging} className="rounded-2xl">
              <GitMerge className="w-4 h-4 mr-2" />
              Слить бренды
            </Button>
          </div>
        </Card>
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Удалить бренд?"
        description="Будет выполнено мягкое удаление. Нельзя удалять бренд с привязанными моделями."
        confirmText="Удалить"
        variant="destructive"
        loading={deleting}
        onConfirm={doDelete}
      />
    </div>
  );
}

/* ===== helpers ===== */
function parseErr(e: unknown): string {
  try {
    const msg = (e as Error)?.message || 'Ошибка';
    const parsed = JSON.parse(msg);
    if (parsed && typeof parsed.message === 'string') return parsed.message;
    return msg;
  } catch {
    return (e as Error)?.message || 'Ошибка';
  }
}

function isTooManyRequests(e: unknown): boolean {
  const msg = String((e as any)?.message || '');
  return /(?:^|[^\d])429(?!\d)/.test(msg) || /too many requests/i.test(msg);
}

function sleep(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

async function processInBatches<T>(
  ids: string[],
  worker: (id: string) => Promise<T>,
  opts?: { concurrency?: number; retry?: number; baseDelayMs?: number },
): Promise<{ success: number; fail: number }> {
  const concurrency = Math.max(1, opts?.concurrency ?? 6);
  const retry = Math.max(0, opts?.retry ?? 3);
  const baseDelayMs = Math.max(50, opts?.baseDelayMs ?? 300);
  let index = 0;
  let success = 0;
  let fail = 0;

  async function attempt(id: string) {
    let tries = 0;
    let delay = baseDelayMs;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        await worker(id);
        success++;
        return;
      } catch (e) {
        tries++;
        if (tries <= retry && isTooManyRequests(e)) {
          await sleep(delay);
          delay = Math.min(delay * 2, 5000);
          continue;
        }
        fail++;
        return;
      }
    }
  }

  async function runner() {
    while (true) {
      const i = index++;
      if (i >= ids.length) return;
      await attempt(ids[i]);
    }
  }

  const runners = Array.from({ length: concurrency }, () => runner());
  await Promise.all(runners);
  return { success, fail };
}
