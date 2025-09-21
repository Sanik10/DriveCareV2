// path: apps/frontend/app/platform/catalogue/models/page.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/lib/hooks/use-auth';
import { vehiclesCatalogueAPI } from '@/lib/api/vehicles-catalogue';
import type { CatalogueModel, CatalogueBrand } from '@/lib/types/vehicles-catalogue';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Car,
  Check,
  X,
  RefreshCw,
  GitMerge,
  AlertTriangle,
  Filter,
  Search,
  ListFilter,
  Trash2,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

type TriState = 'all' | 'true' | 'false';
type Mode = 'queue' | 'all';

export default function CatalogueModelsPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const roleName = (user?.role?.name || '').toLowerCase();
  const isPlatformAdmin =
    roleName === 'superadmin' || roleName === 'platform_admin';
  const isSuperadmin = roleName === 'superadmin';

  const [mode, setMode] = useState<Mode>('queue');

  const [search, setSearch] = useState('');
  const [brandId, setBrandId] = useState('');
  const [verified, setVerified] = useState<TriState>('false');
  const [active, setActive] = useState<TriState>('all');

  const [brands, setBrands] = useState<CatalogueBrand[]>([]);
  const [items, setItems] = useState<CatalogueModel[]>([]);
  const [page, setPage] = useState(1);
  const limit = 20;
  const [hasMore, setHasMore] = useState(false);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergeSourceId, setMergeSourceId] = useState('');
  const [mergeTargetQuery, setMergeTargetQuery] = useState('');
  const [mergeTargetId, setMergeTargetId] = useState('');
  const [mergeCandidates, setMergeCandidates] = useState<CatalogueModel[]>([]);
  const [mergeLoading, setMergeLoading] = useState(false);

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);
  const allSelectedOnPage = useMemo(() => items.length > 0 && items.every((m) => selected[m.id]), [items, selected]);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Create
  const [newModelName, setNewModelName] = useState('');
  const [newModelBrandId, setNewModelBrandId] = useState<string>('');
  const [creating, setCreating] = useState(false);

  // Concurrency guard
  const requestSeq = useRef(0);

  const queryVerified = useMemo<boolean | undefined>(
    () => (verified === 'all' ? undefined : verified === 'true'),
    [verified],
  );
  const activeParam = useMemo(() => (active === 'all' ? undefined : active === 'true'), [active]);

  // Load brands (for filters and creating)
  useEffect(() => {
    if (!isAuthenticated || !isPlatformAdmin) return;
    (async () => {
      try {
        const b = await vehiclesCatalogueAPI.brands({ limit: 500 });
        setBrands(b);
        if (!newModelBrandId && b.length > 0) setNewModelBrandId(b[0].id);
      } catch {
        // ignore
      }
    })();
  }, [isAuthenticated, isPlatformAdmin, newModelBrandId]);

  useEffect(() => {
    if (mode === 'queue') {
      setVerified('false');
      setActive('all');
      setPage(1);
    } else {
      setVerified('all');
      setActive('all');
      setPage(1);
    }
  }, [mode]);

  // Load models (no local filters)
  const load = async (opts: { reset?: boolean } = {}) => {
    const { reset } = opts;
    const seq = ++requestSeq.current;
    setLoading(true);
    setErr(null);

    try {
      const nextPage = reset ? 1 : page;
      if (reset) {
        setItems([]);
        setPage(1);
        setSelected({});
      }

      const m = await vehiclesCatalogueAPI.models({
        search,
        brandId,
        isVerified: queryVerified,
        isActive: activeParam,
        page: nextPage,
        limit,
      } as any);

      if (seq !== requestSeq.current) return;

      setHasMore(m.length === limit);
      if (reset) {
        setItems(m);
        setPage(1);
      } else {
        setItems((prev) => [...prev, ...m]);
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
    if (loading || !hasMore) return;
    const nextPage = page + 1;
    const seq = ++requestSeq.current;
    setLoading(true);
    setErr(null);
    try {
      const m = await vehiclesCatalogueAPI.models({
        search,
        brandId,
        isVerified: queryVerified,
        isActive: activeParam,
        page: nextPage,
        limit,
      } as any);

      if (seq !== requestSeq.current) return;

      setItems((prev) => [...prev, ...m]);
      setHasMore(m.length === limit);
      setPage(nextPage);
    } catch (e) {
      if (seq !== requestSeq.current) return;
      setErr('Ошибка загрузки');
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !isPlatformAdmin) return;
    const t = setTimeout(() => load({ reset: true }), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, brandId, verified, active, mode, isAuthenticated, isPlatformAdmin]);

  if (isLoading) return null;
  if (!isAuthenticated || !isPlatformAdmin) {
    return (
      <div className="container mx-auto px-6 py-10">
        <Card className="p-8 text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-rose-500/10 flex items-center justify-center mb-4">
            <AlertTriangle className="w-7 h-7 text-rose-500" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Недостаточно прав</h2>
          <p className="text-muted-foreground">Раздел доступен только ролям Superadmin / Platform Admin.</p>
        </Card>
      </div>
    );
  }

  const toggleVerify = async (id: string, current?: boolean) => {
    if (typeof current === 'undefined') return;
    setProcessing(true);
    try {
      const updated = await vehiclesCatalogueAPI.verifyModel(id, !current);
      setItems((prev) => {
        const next = prev.map((m) => (m.id === id ? { ...m, isVerified: updated.isVerified } : m));
        if (mode === 'queue' && updated.isVerified) {
          return next.filter((m) => m.id !== id);
        }
        return next;
      });
      toast.success(updated.isVerified ? 'Модель подтверждена' : 'Подтверждение снято');
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
      const updated = await vehiclesCatalogueAPI.updateModel(id, { isActive: !current });
      setItems((prev) => prev.map((m) => (m.id === id ? { ...m, isActive: updated.isActive } : m)));
      toast.success(updated.isActive ? 'Активирована' : 'Деактивирована');
    } catch (e) {
      toast.error(parseErr(e));
    } finally {
      setProcessing(false);
    }
  };

  const bulkVerify = async (value: boolean) => {
    if (selectedIds.length === 0) return;
    setProcessing(true);
    try {
      const { success, fail } = await processInBatches(
        selectedIds,
        (id) => vehiclesCatalogueAPI.verifyModel(id, value),
        { concurrency: 6, retry: 3, baseDelayMs: 300 },
      );
      setSelected({});
      await load({ reset: true });
      toast.success(`Готово: ${success}${fail ? `. Ошибок: ${fail}` : ''}`);
    } catch {
      toast.error('Не удалось выполнить массовое действие');
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

  const searchTargets = async (q: string) => {
    setMergeTargetQuery(q);
    if (!q.trim()) {
      setMergeCandidates([]);
      return;
    }
    setMergeLoading(true);
    try {
      const res = await vehiclesCatalogueAPI.models({
        search: q.trim(),
        brandId: brandId || undefined,
        limit: 20,
      });
      setMergeCandidates(res);
    } catch {
      setMergeCandidates([]);
    } finally {
      setMergeLoading(false);
    }
  };

  const doMerge = async () => {
    if (!mergeSourceId || !mergeTargetId || mergeSourceId === mergeTargetId) return;
    setProcessing(true);
    try {
      await vehiclesCatalogueAPI.mergeModel(mergeSourceId, mergeTargetId);
      toast.success('Модели слиты');
      setMergeOpen(false);
      setItems((prev) => prev.filter((m) => m.id !== mergeSourceId));
      setSelected((prev) => {
        const next = { ...prev };
        delete next[mergeSourceId];
        return next;
      });
    } catch (e) {
      toast.error(parseErr(e));
    } finally {
      setProcessing(false);
    }
  };

  const toggleSelectAllOnPage = () => {
    if (allSelectedOnPage) {
      const next = { ...selected };
      items.forEach((m) => delete next[m.id]);
      setSelected(next);
    } else {
      const next = { ...selected };
      items.forEach((m) => (next[m.id] = true));
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
      await vehiclesCatalogueAPI.deleteModel(deleteId);
      toast.success('Модель удалена');
      setItems((prev) => prev.filter((m) => m.id !== deleteId));
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

  const createModel = async () => {
    const name = (newModelName || '').trim();
    const bId = (newModelBrandId || '').trim();
    if (!name || !bId) return;
    setCreating(true);
    try {
      await vehiclesCatalogueAPI.createModel(name, bId);
      setNewModelName('');
      toast.success('Модель создана');
      await load({ reset: true });
    } catch (e) {
      toast.error(parseErr(e));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Car className="w-6 h-6 text-emerald-600" />
            Каталог моделей — Модерация
          </h1>
          <p className="text-muted-foreground">Очередь подтверждения, фильтры, создание и массовые действия. Удаление — только суперадмин.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={mode === 'queue' ? 'default' : 'outline'}
            onClick={() => setMode('queue')}
            className="rounded-2xl"
          >
            Очередь
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
            onClick={() => load({ reset: true })}
            className="rounded-2xl btn-outline-fixed"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Обновить
          </Button>
        </div>
      </div>

      <Card className="p-4 space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Поиск модели..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="max-w-sm rounded-2xl pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Бренд:</span>
            <select
              value={brandId}
              onChange={(e) => {
                setBrandId(e.target.value);
                setPage(1);
              }}
              className="h-10 rounded-2xl border px-3"
            >
              <option value="">Все бренды</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
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

          <div className="md:ml-auto flex items-center gap-2">
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
          </div>
        </div>

        {/* Create model */}
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Бренд:</span>
            <select
              value={newModelBrandId}
              onChange={(e) => setNewModelBrandId(e.target.value)}
              className="h-10 rounded-2xl border px-3"
            >
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <Input
            placeholder="Новая модель (например: Corolla)"
            value={newModelName}
            onChange={(e) => setNewModelName(e.target.value)}
            className="rounded-2xl flex-1"
          />
          <Button onClick={createModel} disabled={!newModelName.trim() || !newModelBrandId || creating} className="rounded-2xl">
            <Plus className={`w-4 h-4 mr-1 ${creating ? 'animate-spin' : ''}`} />
            Создать модель
          </Button>
        </div>
      </Card>

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
              {items.map((m) => (
                <div key={m.id} className="p-4 flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={!!selected[m.id]}
                    onChange={(e) => setSelected((prev) => ({ ...prev, [m.id]: e.target.checked }))}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="font-medium">{m.brand?.name ? `${m.brand.name} ${m.name}` : m.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Бренд: {m.brand?.name || '—'} · ID: <span className="font-mono">{m.id}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant={m.isActive ? 'outline' : 'default'}
                      onClick={() => toggleActive(m.id, m.isActive)}
                      disabled={processing}
                      className="rounded-2xl"
                      title={m.isActive ? 'Деактивировать' : 'Активировать'}
                    >
                      {m.isActive ? 'Активна' : 'Неактивна'}
                    </Button>

                    <>
                      <Badge
                        variant={m.isVerified ? 'default' : 'outline'}
                        className={m.isVerified ? 'bg-emerald-500/10 text-emerald-600' : ''}
                      >
                        {m.isVerified ? 'Verified' : 'Unverified'}
                      </Badge>
                      <Button
                        size="sm"
                        variant={m.isVerified ? 'outline' : 'default'}
                        onClick={() => toggleVerify(m.id, m.isVerified)}
                        disabled={processing}
                        className="rounded-2xl"
                      >
                        {m.isVerified ? (
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

                    {/* Merge */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setMergeSourceId(m.id);
                        setMergeOpen(true);
                      }}
                      className="rounded-2xl"
                    >
                      <GitMerge className="w-4 h-4 mr-1" />
                      Слить
                    </Button>

                    {/* Delete (superadmin only) */}
                    {isSuperadmin && (
                      <Button
                        size="sm"
                        variant="destructive"
                        className="rounded-2xl"
                        onClick={() => {
                          setDeleteId(m.id);
                          setDeleteOpen(true);
                        }}
                      >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Удалить
                    </Button>
                    )}
                  </div>
                </div>
              ))}
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

      {/* Merge inline panel */}
      {mergeOpen && (
        <Card className="p-4 rounded-2xl border-emerald-500/20 glass">
          <div className="flex items-center justify-between">
            <div className="font-semibold flex items-center gap-2">
              <GitMerge className="w-4 h-4 text-emerald-600" />
              Слияние моделей
            </div>
            <Button variant="outline" size="sm" className="rounded-2xl" onClick={() => setMergeOpen(false)}>
              Закрыть
            </Button>
          </div>
          <div className="grid md:grid-cols-2 gap-3 mt-3">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Источник (будет слит)</div>
              <Input
                placeholder="ID источника"
                value={mergeSourceId}
                onChange={(e) => setMergeSourceId(e.target.value)}
                className="rounded-2xl"
              />
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">
                Целевая модель (поиск по названию{brandId ? ', бренд выбран' : ''})
              </div>
              <div className="relative">
                <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
                <Input
                  placeholder="Начните вводить название модели"
                  value={mergeTargetQuery}
                  onChange={(e) => searchTargets(e.target.value)}
                  className="rounded-2xl pl-9"
                />
                {mergeLoading && (
                  <div className="absolute right-3 top-2.5 text-xs text-muted-foreground">Поиск…</div>
                )}
              </div>
              {mergeCandidates.length > 0 && (
                <div className="mt-2 border rounded-xl max-h-56 overflow-auto">
                  {mergeCandidates.map((m) => (
                    <button
                      key={m.id}
                      className={`w-full text-left px-3 py-2 text-sm hover:bg-accent/40 ${
                        mergeTargetId === m.id ? 'bg-accent/30' : ''
                      }`}
                      onClick={() => setMergeTargetId(m.id)}
                    >
                      {m.brand?.name ? `${m.brand.name} ${m.name}` : m.name}{' '}
                      <span className="text-xs text-muted-foreground">({m.id.slice(0, 8)}…)</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="mt-3">
            <Button
              onClick={doMerge}
              disabled={!mergeSourceId || !mergeTargetId || processing}
              className="rounded-2xl"
            >
              <GitMerge className="w-4 h-4 mr-2" />
              Слить модели
            </Button>
          </div>
        </Card>
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Удалить модель?"
        description="Будет выполнено мягкое удаление. Нельзя удалить модель, которая используется в автомобилях."
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
