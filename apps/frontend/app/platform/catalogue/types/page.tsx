// path: apps/frontend/app/platform/catalogue/types/page.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/lib/hooks/use-auth';
import { vehiclesCatalogueAPI } from '@/lib/api/vehicles-catalogue';
import type { CatalogueType } from '@/lib/types/vehicles-catalogue';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Layers, Check, X, RefreshCw, AlertTriangle, Search, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export default function CatalogueTypesPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const roleName = (user?.role?.name || '').toLowerCase();
  const isPlatformAdmin = roleName === 'superadmin' || roleName === 'platform_admin';
  const isSuperadmin = roleName === 'superadmin';

  const [search, setSearch] = useState('');
  const [items, setItems] = useState<CatalogueType[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const selectedIds = Object.keys(selected).filter((k) => selected[k]);
  const allSelected = items.length > 0 && items.every((t) => selected[t.id]);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Create Type
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeDesc, setNewTypeDesc] = useState('');
  const [creating, setCreating] = useState(false);

  // Concurrency guard
  const requestSeq = useRef(0);

  const load = async () => {
    const seq = ++requestSeq.current;
    setLoading(true);
    setErr(null);
    try {
      const res = await vehiclesCatalogueAPI.types({ search, limit: 100 });
      if (seq !== requestSeq.current) return;
      setItems(res);
      setSelected({});
    } catch (e) {
      if (seq !== requestSeq.current) return;
      setErr(parseErr(e));
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated || !isPlatformAdmin) return;
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, isAuthenticated, isPlatformAdmin]);

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
      const updated = await vehiclesCatalogueAPI.verifyType(id, !current);
      setItems((prev) => prev.map((t) => (t.id === id ? { ...t, isVerified: updated.isVerified } : t)));
      toast.success(updated.isVerified ? 'Тип подтверждён' : 'Подтверждение снято');
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
      const updated = await vehiclesCatalogueAPI.updateType(id, { isActive: !current });
      setItems((prev) => prev.map((t) => (t.id === id ? { ...t, isActive: updated.isActive } : t)));
      toast.success(updated.isActive ? 'Активирован' : 'Деактивирован');
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
        (id) => vehiclesCatalogueAPI.verifyType(id, value),
        { concurrency: 6, retry: 3, baseDelayMs: 300 },
      );
      setSelected({});
      await load();
      toast.success(`Готово: ${success}${fail ? `. Ошибок: ${fail}` : ''}`);
    } catch {
      toast.error('Не удалось выполнить массовое действие');
    } finally {
      setProcessing(false);
    }
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelected({});
    } else {
      const next: Record<string, boolean> = {};
      items.forEach((t) => (next[t.id] = true));
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
      await vehiclesCatalogueAPI.deleteType(deleteId);
      toast.success('Тип удалён');
      setItems((prev) => prev.filter((t) => t.id !== deleteId));
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

  const createType = async () => {
    const name = (newTypeName || '').trim();
    const description = (newTypeDesc || '').trim();
    if (!name) return;
    setCreating(true);
    try {
      await vehiclesCatalogueAPI.createType(name, description ? { description } : undefined);
      setNewTypeName('');
      setNewTypeDesc('');
      toast.success('Тип создан');
      await load();
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
            <Layers className="w-6 h-6 text-sky-600" />
            Типы ТС — Модерация
          </h1>
          <p className="text-muted-foreground">Подтверждение, активация, создание, массовые действия. Удаление — только суперадмин.</p>
        </div>
        <Button variant="outline" onClick={load} className="rounded-2xl btn-outline-fixed" disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Обновить
        </Button>
      </div>

      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative max-w-sm">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Поиск типа..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-sm rounded-2xl pl-9"
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-2xl"
              disabled={selectedIds.length === 0 || processing}
              onClick={() => bulkVerify(true)}
            >
              <Check className="w-4 h-4 mr-1" />
              Подтвердить ({selectedIds.length})
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-2xl"
              disabled={selectedIds.length === 0 || processing}
              onClick={() => bulkVerify(false)}
            >
              <X className="w-4 h-4 mr-1" />
              Снять
            </Button>
          </div>
        </div>

        {/* Create type */}
        <div className="flex flex-col md:flex-row gap-3">
          <Input
            placeholder="Новый тип ТС (например: Седан)"
            value={newTypeName}
            onChange={(e) => setNewTypeName(e.target.value)}
            className="rounded-2xl flex-1"
          />
          <Input
            placeholder="Описание (опционально)"
            value={newTypeDesc}
            onChange={(e) => setNewTypeDesc(e.target.value)}
            className="rounded-2xl flex-1"
          />
          <Button onClick={createType} disabled={!newTypeName.trim() || creating} className="rounded-2xl">
            <Plus className={`w-4 h-4 mr-1 ${creating ? 'animate-spin' : ''}`} />
            Создать тип
          </Button>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-6">Загрузка…</div>
        ) : err ? (
          <div className="p-6 text-destructive">{err}</div>
        ) : items.length === 0 ? (
          <div className="p-6 text-muted-foreground">Ничего не найдено</div>
        ) : (
          <>
            <div className="p-3 border-b border-border/30 flex items-center gap-3">
              <label className="inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
                Выбрать всё ({items.length})
              </label>
              {selectedIds.length > 0 && <Badge variant="outline">Выбрано: {selectedIds.length}</Badge>}
            </div>
            <div className="divide-y divide-border/30">
              {items.map((t) => (
                <div key={t.id} className="p-4 flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={!!selected[t.id]}
                    onChange={(e) => setSelected((prev) => ({ ...prev, [t.id]: e.target.checked }))}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="font-medium">{t.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {t.description ? <span className="mr-2">Описание: {t.description}</span> : null}
                      ID: <span className="font-mono">{t.id}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant={t.isActive ? 'outline' : 'default'}
                      onClick={() => toggleActive(t.id, t.isActive)}
                      disabled={processing}
                      className="rounded-2xl"
                      title={t.isActive ? 'Деактивировать' : 'Активировать'}
                    >
                      {t.isActive ? 'Активен' : 'Неактивен'}
                    </Button>

                    <>
                      <Badge
                        variant={t.isVerified ? 'default' : 'outline'}
                        className={t.isVerified ? 'bg-emerald-500/10 text-emerald-600' : ''}
                      >
                        {t.isVerified ? 'Verified' : 'Unverified'}
                      </Badge>
                      <Button
                        size="sm"
                        variant={t.isVerified ? 'outline' : 'default'}
                        onClick={() => toggleVerify(t.id, t.isVerified)}
                        disabled={processing}
                        className="rounded-2xl"
                      >
                        {t.isVerified ? (
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

                    {/* Delete (superadmin only) */}
                    {isSuperadmin && (
                      <Button
                        size="sm"
                        variant="destructive"
                        className="rounded-2xl"
                        onClick={() => {
                          setDeleteId(t.id);
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
          </>
        )}
      </Card>

      {/* Delete confirm */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Удалить тип?"
        description="Будет выполнено мягкое удаление. Нельзя удалить тип, который используется в автомобилях."
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
