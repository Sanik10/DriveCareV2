// path: apps/frontend/app/platform/catalogue/import/page.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/lib/hooks/use-auth';
import { vehiclesCatalogueAPI } from '@/lib/api/vehicles-catalogue';
import type {
  ExternalBrand,
  ExternalModel,
  ImportExternalRequest,
  ImportExternalResponse,
} from '@/lib/types/vehicles-catalogue';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CloudDownload, Database, RefreshCw, Search, ChevronRight } from 'lucide-react';

export default function CatalogueImportPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const isPlatformAdmin =
    (user?.role?.name || '').toLowerCase() === 'superadmin' ||
    (user?.role?.name || '').toLowerCase() === 'platform_admin';

  // Preview: external brands
  const [search, setSearch] = useState('');
  const [brandsLimit, setBrandsLimit] = useState<number>(100);
  const [extBrands, setExtBrands] = useState<ExternalBrand[]>([]);
  const [extBrandsLoading, setExtBrandsLoading] = useState(false);
  const [extBrandsErr, setExtBrandsErr] = useState<string | null>(null);

  // Preview: external models for selected brand
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [extModels, setExtModels] = useState<ExternalModel[]>([]);
  const [extModelsLoading, setExtModelsLoading] = useState(false);
  const [extModelsErr, setExtModelsErr] = useState<string | null>(null);

  // Import form
  const [form, setForm] = useState<ImportExternalRequest>({
    source: 'nhtsa',
    brandName: '',
    maxBrands: 200,
    maxModelsPerBrand: 500,
    dryRun: true,
  });
  const [importing, setImporting] = useState(false);
  const [importErr, setImportErr] = useState<string | null>(null);
  const [result, setResult] = useState<ImportExternalResponse | null>(null);

  const canAccess = isAuthenticated && isPlatformAdmin;

  const totalPreviewed = useMemo(() => {
    const uniqueBrands = extBrands.length;
    const uniqueModels = extModels.length;
    return { uniqueBrands, uniqueModels };
  }, [extBrands, extModels]);

  // Concurrency guards
  const brandsReqSeq = useRef(0);
  const modelsReqSeq = useRef(0);

  // Load external brands (debounced)
  const loadExternalBrands = async () => {
    const seq = ++brandsReqSeq.current;
    setExtBrandsLoading(true);
    setExtBrandsErr(null);
    try {
      const data = await vehiclesCatalogueAPI.externalBrands({ source: 'nhtsa', search, limit: brandsLimit });
      if (seq !== brandsReqSeq.current) return;
      setExtBrands(data);
    } catch (e) {
      if (seq !== brandsReqSeq.current) return;
      setExtBrandsErr(parseErr(e));
    } finally {
      if (seq === brandsReqSeq.current) setExtBrandsLoading(false);
    }
  };

  const loadExternalModels = async (brandName: string) => {
    if (!brandName) return;
    const seq = ++modelsReqSeq.current;
    setExtModelsLoading(true);
    setExtModelsErr(null);
    setSelectedBrand(brandName);
    setForm((f) => ({ ...f, brandName })); // автоподстановка в форму
    try {
      const data = await vehiclesCatalogueAPI.externalModels({ source: 'nhtsa', brandName, limit: 300 });
      if (seq !== modelsReqSeq.current) return;
      setExtModels(data);
    } catch (e) {
      if (seq !== modelsReqSeq.current) return;
      setExtModelsErr(parseErr(e));
    } finally {
      if (seq === modelsReqSeq.current) setExtModelsLoading(false);
    }
  };

  useEffect(() => {
    if (!canAccess) return;
    const t = setTimeout(loadExternalBrands, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, brandsLimit, canAccess]);

  const onRunImport = async () => {
    setImporting(true);
    setImportErr(null);
    setResult(null);
    try {
      const body: ImportExternalRequest = {
        source: form.source || 'nhtsa',
        brandName: (form.brandName || '').trim() || undefined,
        maxBrands: clampInt(form.maxBrands, 1, 500) ?? 200,
        maxModelsPerBrand: clampInt(form.maxModelsPerBrand, 1, 1000) ?? 500,
        dryRun: !!form.dryRun,
      };
      const res = await vehiclesCatalogueAPI.importExternal(body);
      setResult(res);
    } catch (e) {
      setImportErr(parseErr(e));
    } finally {
      setImporting(false);
    }
  };

  if (isLoading) return null;
  if (!canAccess) {
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

  return (
    <div className="container mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CloudDownload className="w-6 h-6 text-primary" />
            Импорт каталога (NHTSA vPIC)
          </h1>
          <p className="text-muted-foreground">Предпросмотр внешних брендов/моделей и безопасный импорт в локальную БД.</p>
        </div>
        <Button
          variant="outline"
          onClick={loadExternalBrands}
          className="rounded-2xl btn-outline-fixed"
          disabled={extBrandsLoading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${extBrandsLoading ? 'animate-spin' : ''}`} />
          Обновить бренды
        </Button>
      </div>

      {/* Preview: External brands */}
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <div className="relative max-w-sm flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Поиск внешних брендов (например: Toyota, Ford)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rounded-2xl"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Лимит:</span>
            <Input
              type="number"
              min={1}
              max={500}
              value={brandsLimit}
              onChange={(e) => setBrandsLimit(Number(e.target.value || 100))}
              className="w-24 rounded-2xl"
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="outline">Предпросмотр брендов: {extBrands.length}</Badge>
            <Badge variant="outline">Предпросмотр моделей: {totalPreviewed.uniqueModels}</Badge>
          </div>
        </div>

        <div className="mt-4 border-t border-border/40" />

        {extBrandsLoading ? (
          <div className="p-6">Загрузка брендов…</div>
        ) : extBrandsErr ? (
          <div className="p-6 text-destructive">{extBrandsErr}</div>
        ) : extBrands.length === 0 ? (
          <div className="p-6 text-muted-foreground">Ничего не найдено</div>
        ) : (
          <div className="mt-2 divide-y divide-border/30">
            {extBrands.map((b) => (
              <div key={`${b.source}-${b.sourceId}-${b.name}`} className="p-3 flex items-center gap-3">
                <div className="flex-1">
                  <div className="font-medium">{b.name}</div>
                  <div className="text-xs text-muted-foreground">
                    Источник: {b.source.toUpperCase()} · SourceID: <span className="font-mono">{b.sourceId}</span>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => loadExternalModels(b.name)}
                  className="rounded-2xl"
                  disabled={extModelsLoading && selectedBrand === b.name}
                >
                  Показать модели
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Preview: External models for selected brand */}
      <Card className="p-0 overflow-hidden">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-600" />
            <div className="font-semibold">Модели бренда</div>
          </div>
          <div className="text-sm text-muted-foreground">
            {selectedBrand ? (
              <>
                Бренд: <span className="font-medium">{selectedBrand}</span> · Найдено моделей:{' '}
                <span className="font-medium">{extModels.length}</span>
              </>
            ) : (
              'Выберите бренд, чтобы увидеть модели'
            )}
          </div>
        </div>

        {extModelsLoading ? (
          <div className="p-6">Загрузка моделей…</div>
        ) : extModelsErr ? (
          <div className="p-6 text-destructive">{extModelsErr}</div>
        ) : !selectedBrand ? (
          <div className="p-6 text-muted-foreground">Нет выбранного бренда</div>
        ) : extModels.length === 0 ? (
          <div className="p-6 text-muted-foreground">Модели не найдены</div>
        ) : (
          <div className="divide-y divide-border/30">
            {extModels.map((m, idx) => (
              <div key={`${m.source}-${m.brandName}-${m.name}-${idx}`} className="p-3">
                <div className="font-medium">{m.name}</div>
                <div className="text-xs text-muted-foreground">
                  Источник: {m.source.toUpperCase()} · Бренд: {m.brandName}
                  {typeof m.brandSourceId !== 'undefined' ? (
                    <>
                      {' '}· MakeID: <span className="font-mono">{m.brandSourceId}</span>
                    </>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Import form */}
      <Card className="p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <h2 className="text-lg font-semibold">Импорт в локальную базу</h2>
            <p className="text-sm text-muted-foreground">
              Рекомендуется сначала запустить в режиме “Предпросмотр (dry-run)”, а затем — реальный импорт.
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground">Источник</label>
              <select
                value={form.source || 'nhtsa'}
                onChange={(e) => setForm((f) => ({ ...f, source: (e.target.value as 'nhtsa') || 'nhtsa' }))}
                className="mt-1 w-full h-10 rounded-2xl border px-3"
              >
                <option value="nhtsa">NHTSA vPIC (без API-ключа)</option>
              </select>
            </div>

            <div>
              <label className="text-sm text-muted-foreground">Бренд (опционально, по имени)</label>
              <Input
                placeholder="Например: Toyota (если пусто — импорт по списку брендов)"
                value={form.brandName ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, brandName: e.target.value }))}
                className="rounded-2xl"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-sm text-muted-foreground">Макс. брендов</label>
                <Input
                  type="number"
                  min={1}
                  max={500}
                  value={form.maxBrands ?? 200}
                  onChange={(e) => setForm((f) => ({ ...f, maxBrands: toIntOrUndefined(e.target.value, 200) }))}
                  className="rounded-2xl"
                />
              </div>
              <div className="flex-1">
                <label className="text-sm text-muted-foreground">Макс. моделей/бренд</label>
                <Input
                  type="number"
                  min={1}
                  max={1000}
                  value={form.maxModelsPerBrand ?? 500}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, maxModelsPerBrand: toIntOrUndefined(e.target.value, 500) }))
                  }
                  className="rounded-2xl"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="text-sm text-muted-foreground">Предпросмотр (dry-run)</label>
              <input
                type="checkbox"
                checked={!!form.dryRun}
                onChange={(e) => setForm((f) => ({ ...f, dryRun: e.target.checked }))}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <Button onClick={onRunImport} disabled={importing} className="rounded-2xl">
            <CloudDownload className={`w-4 h-4 mr-2 ${importing ? 'animate-spin' : ''}`} />
            Запустить {form.dryRun ? '(dry-run)' : 'импорт'}
          </Button>
          {importErr ? <span className="text-destructive text-sm">{importErr}</span> : null}
        </div>

        {/* Import result */}
        {result && (
          <div className="mt-6 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-emerald-500/10 text-emerald-600">Создано брендов: {result.importedBrands}</Badge>
              <Badge className="bg-emerald-500/10 text-emerald-600">Создано моделей: {result.importedModels}</Badge>
              <Badge variant="outline">Пропущено брендов: {result.skippedBrands}</Badge>
              <Badge variant="outline">Пропущено моделей: {result.skippedModels}</Badge>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Card className="p-3">
                <div className="font-medium mb-2">Бренды — создано</div>
                {result.details.brandsCreated.length === 0 ? (
                  <div className="text-sm text-muted-foreground">—</div>
                ) : (
                  <ul className="text-sm space-y-1 max-h-56 overflow-auto pr-2">
                    {result.details.brandsCreated.map((b, idx) => (
                      <li key={`${b.id}-${idx}`}>
                        <span className="font-medium">{b.name}</span>{' '}
                        <span className="text-xs text-muted-foreground">({b.id})</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card className="p-3">
                <div className="font-medium mb-2">Бренды — пропущены (уже существуют)</div>
                {result.details.brandsSkipped.length === 0 ? (
                  <div className="text-sm text-muted-foreground">—</div>
                ) : (
                  <ul className="text-sm space-y-1 max-h-56 overflow-auto pr-2">
                    {result.details.brandsSkipped.map((b, idx) => (
                      <li key={`${b.name}-${idx}`}>{b.name}</li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card className="p-3 md:col-span-2">
                <div className="font-medium mb-2">Модели — создано</div>
                {result.details.modelsCreated.length === 0 ? (
                  <div className="text-sm text-muted-foreground">—</div>
                ) : (
                  <ul className="text-sm grid md:grid-cols-2 gap-2 max-h-64 overflow-auto pr-2">
                    {result.details.modelsCreated.map((m, idx) => (
                      <li key={`${m.id}-${idx}`}>
                        <span className="font-medium">
                          {m.brandName} {m.name}
                        </span>{' '}
                        <span className="text-xs text-muted-foreground">({m.id})</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              <Card className="p-3 md:col-span-2">
                <div className="font-medium mb-2">Модели — пропущены (уже существуют)</div>
                {result.details.modelsSkipped.length === 0 ? (
                  <div className="text-sm text-muted-foreground">—</div>
                ) : (
                  <ul className="text-sm grid md:grid-cols-2 gap-2 max-h-64 overflow-auto pr-2">
                    {result.details.modelsSkipped.map((m, idx) => (
                      <li key={`${m.brandName}-${m.name}-${idx}`}>
                        {m.brandName} {m.name}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
          </div>
        )}
      </Card>

      {/* How-to */}
      <Card className="p-4">
        <div className="font-semibold mb-2">Как это работает</div>
        <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
          <li>Найдите нужный бренд в блоке “Предпросмотр брендов” и при желании посмотрите модели бренда.</li>
          <li>
            В блоке “Импорт” можно:
            <ul className="list-disc list-inside ml-4">
              <li>
                Оставить поле “Бренд” пустым — импортируется список брендов (до “Макс. брендов”), для каждого будут
                загружены модели (до “Макс. моделей/бренд”).
              </li>
              <li>Указать конкретный бренд по имени — импорт ограничится только им.</li>
              <li>Включить “Предпросмотр (dry-run)”, чтобы увидеть, что будет создано, но ничего не сохранять.</li>
            </ul>
          </li>
          <li>Нажмите “Запустить”. В отчёте увидите, что было создано или пропущено.</li>
          <li>
            После реального импорта (если dry-run выключен) вы можете открыть разделы “Бренды/Модели” для модерации и
            слияния дублей.
          </li>
        </ol>
      </Card>
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

function toIntOrUndefined(v: string, fallback?: number): number | undefined {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return n;
}

function clampInt(v: number | undefined, min: number, max: number): number | undefined {
  if (typeof v !== 'number' || !Number.isFinite(v)) return undefined;
  return Math.max(min, Math.min(max, Math.floor(v)));
}
