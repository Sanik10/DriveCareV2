// path: apps/frontend/components/vehicles/vehicle-create-dialog.tsx
'use client';

import * as React from 'react';
import {
  Car,
  Hash,
  Barcode,
  Gauge,
  User,
  Sparkles,
  Plus,
  Calendar,
  Zap,
  Search,
  X,
  PencilLine,
  Info,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { vehiclesAPI } from '@/lib/api/vehicles';
import { vehiclesCatalogueAPI } from '@/lib/api/vehicles-catalogue';
import type { VehicleResponse, CreateVehicleRequest, EngineType } from '@/lib/types/vehicles';
import type { CatalogueBrand, CatalogueModel, CatalogueType } from '@/lib/types/vehicles-catalogue';
import { customersAPI } from '@/lib/api/customers';
import type { CustomerResponse } from '@/lib/types/customers';
import { Kbd } from '@/components/ui/kbd';
import { CustomerCreateDialog } from '@/components/customers/customer-create-dialog';

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: (v: VehicleResponse) => void;
};

const ENGINE_TYPES: { value: EngineType; label: string }[] = [
  { value: 'petrol', label: 'Бензин' },
  { value: 'diesel', label: 'Дизель' },
  { value: 'hybrid', label: 'Гибрид' },
  { value: 'electric', label: 'Электро' },
];

function parseSmart(text: string) {
  const vinMatch = text.match(/\b([A-HJ-NPR-Z0-9]{17})\b/i)?.[0];
  const plateMatch = text.match(/([A-ZА-Я0-9-]{5,12})/i)?.[0];
  const mileageMatch = text.match(/(\d{1,7})\s?(км|km)/i)?.[1];
  const yearMatch = text.match(/\b(19[5-9]\d|20[0-4]\d|2050)\b/)?.[0];
  const volumeCcMatch = text.match(/(\d{3,5})\s?(см3|см³|cc)/i)?.[1];
  const volumeLMatch = text.match(/(\d+(?:[.,]\d)?)\s?л\b/i)?.[1];
  let engineVolumeLiters: string | undefined = undefined;
  if (volumeLMatch) {
    const n = parseFloat(volumeLMatch.replace(',', '.'));
    if (Number.isFinite(n)) engineVolumeLiters = String(n);
  } else if (volumeCcMatch) {
    const cc = parseInt(volumeCcMatch, 10);
    if (Number.isFinite(cc)) engineVolumeLiters = (cc / 1000).toFixed(1);
  }

  return {
    vin: vinMatch?.toUpperCase() || '',
    licensePlate: plateMatch?.toUpperCase() || '',
    mileage: mileageMatch ? parseInt(mileageMatch, 10) : undefined,
    year: yearMatch ? parseInt(yearMatch, 10) : undefined,
    engineVolumeLiters,
  };
}

export function VehicleCreateDialog({ open, onOpenChange, onCreated }: Props) {
  const [brands, setBrands] = React.useState<CatalogueBrand[]>([]);
  const [models, setModels] = React.useState<CatalogueModel[]>([]);
  const [types, setTypes] = React.useState<CatalogueType[]>([]);

  const [brandId, setBrandId] = React.useState<string>('');
  const [modelId, setModelId] = React.useState<string>('');
  const [vehicleTypeId, setVehicleTypeId] = React.useState<string>('');

  const [brandName, setBrandName] = React.useState<string>('');
  const [modelName, setModelName] = React.useState<string>('');
  const [typeName, setTypeName] = React.useState<string>('');

  const [brandOpen, setBrandOpen] = React.useState(false);
  const [modelOpen, setModelOpen] = React.useState(false);
  const [typeOpen, setTypeOpen] = React.useState(false);

  const [vin, setVin] = React.useState('');
  const [licensePlate, setLicensePlate] = React.useState('');
  const [mileage, setMileage] = React.useState<string>('');

  const [year, setYear] = React.useState<string>('');
  const [color, setColor] = React.useState<string>('');
  const [engineType, setEngineType] = React.useState<EngineType | ''>('');
  const [engineVolume, setEngineVolume] = React.useState<string>('');

  const [lastServiceDate, setLastServiceDate] = React.useState<string>('');
  const [nextServiceDate, setNextServiceDate] = React.useState<string>('');

  const [notes, setNotes] = React.useState<string>('');

  const [customerQuery, setCustomerQuery] = React.useState<string>('');
  const [customerResults, setCustomerResults] = React.useState<CustomerResponse[]>([]);
  const [customerId, setCustomerId] = React.useState<string>('');
  const [customerLabel, setCustomerLabel] = React.useState<string>('');

  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [openCustomerCreate, setOpenCustomerCreate] = React.useState(false);

  const [creatingBrand, setCreatingBrand] = React.useState(false);
  const [creatingType, setCreatingType] = React.useState(false);
  const [creatingModel, setCreatingModel] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      try {
        const [b, m, t] = await Promise.all([
          vehiclesCatalogueAPI.brands({ limit: 500 }),
          vehiclesCatalogueAPI.models({ limit: 1000 }),
          vehiclesCatalogueAPI.types({ limit: 200 }),
        ]);
        if (!cancelled) {
          setBrands(b);
          setModels(m);
          setTypes(t);
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const ensureCatalogueIds = React.useCallback(async () => {
    if (!brandId && brandName.trim()) {
      setCreatingBrand(true);
      try {
        const b = await vehiclesCatalogueAPI.ensureBrand(brandName.trim());
        setBrandId(b.id);
        setBrandName(b.name);
        if (!brands.find((x) => x.id === b.id)) setBrands((prev) => [...prev, b]);
      } finally {
        setCreatingBrand(false);
      }
    }

    if (!vehicleTypeId && typeName.trim()) {
      setCreatingType(true);
      try {
        const t = await vehiclesCatalogueAPI.ensureType(typeName.trim());
        setVehicleTypeId(t.id);
        setTypeName(t.name);
        if (!types.find((x) => x.id === t.id)) setTypes((prev) => [...prev, t]);
      } finally {
        setCreatingType(false);
      }
    }

    if (!modelId && modelName.trim() && (brandId || brandName.trim())) {
      if (!brandId && brandName.trim()) {
        const b = await vehiclesCatalogueAPI.ensureBrand(brandName.trim());
        setBrandId(b.id);
        setBrandName(b.name);
        if (!brands.find((x) => x.id === b.id)) setBrands((prev) => [...prev, b]);
      }
      if (brandId) {
        setCreatingModel(true);
        try {
          const m = await vehiclesCatalogueAPI.ensureModel(modelName.trim(), brandId);
          setModelId(m.id);
          setModelName(m.name);
          if (!models.find((x) => x.id === m.id)) setModels((prev) => [...prev, m]);
        } finally {
          setCreatingModel(false);
        }
      }
    }
  }, [brandId, brandName, vehicleTypeId, typeName, modelId, modelName, brands, types, models]);

  const filteredModels = React.useMemo(() => {
    if (!brandId) return models;
    return models.filter((m) => m.brandId === brandId || m.brand?.id === brandId);
  }, [models, brandId]);

  const submit = React.useCallback(async () => {
    setSubmitting(true);
    setError(null);

    try {
      await ensureCatalogueIds();

      if (!customerId) {
        setError('Укажите владельца ТС (клиента)');
        setSubmitting(false);
        return;
      }
      if (!brandId) {
        setError('Выберите или создайте бренд');
        setSubmitting(false);
        return;
      }
      if (!modelId) {
        setError('Выберите или создайте модель');
        setSubmitting(false);
        return;
      }
      if (!vehicleTypeId) {
        setError('Выберите или создайте тип автомобиля');
        setSubmitting(false);
        return;
      }

      const vinOk = !vin || /^[A-HJ-NPR-Z0-9]{17}$/i.test(vin);
      if (vin && !vinOk) {
        setError('VIN должен содержать 17 символов (без I, O, Q)');
        setSubmitting(false);
        return;
      }

      const y = year ? parseInt(year, 10) : undefined;
      if (y && (y < 1950 || y > 2050)) {
        setError('Год выпуска должен быть в диапазоне 1950–2050');
        setSubmitting(false);
        return;
      }

      const vol =
        engineVolume && engineVolume.trim()
          ? parseFloat(engineVolume.replace(',', '.'))
          : undefined;
      if (engineVolume && (!Number.isFinite(vol!) || vol! <= 0)) {
        setError('Объем двигателя должен быть положительным числом (в литрах)');
        setSubmitting(false);
        return;
      }

      const payload: CreateVehicleRequest = {
        customerId,
        modelId,
        vehicleTypeId,
        vin: vin ? vin.toUpperCase() : undefined,
        licensePlate: licensePlate ? licensePlate.toUpperCase() : undefined,
        mileage: mileage ? parseInt(mileage, 10) : undefined,
        year: y,
        color: color?.trim() || undefined,
        engineType: engineType || undefined,
        engineVolume: typeof vol === 'number' ? vol : undefined,
        notes: notes?.trim() || undefined,
      };

      const created = await vehiclesAPI.createVehicle(payload);

      if ((lastServiceDate && lastServiceDate.trim()) || (nextServiceDate && nextServiceDate.trim())) {
        try {
          await vehiclesAPI.updateVehicle(created.id, {
            lastServiceDate: lastServiceDate || undefined,
            nextServiceDate: nextServiceDate || undefined,
          });
        } catch {
          // ignore
        }
      }

      onCreated?.(created);
      onOpenChange(false);

      setBrandId('');
      setModelId('');
      setVehicleTypeId('');
      setBrandName('');
      setModelName('');
      setTypeName('');
      setVin('');
      setLicensePlate('');
      setMileage('');
      setYear('');
      setColor('');
      setEngineType('');
      setEngineVolume('');
      setLastServiceDate('');
      setNextServiceDate('');
      setNotes('');
      setCustomerId('');
      setCustomerLabel('');
      setCustomerQuery('');
      setCustomerResults([]);
    } catch (e) {
      try {
        const parsed = JSON.parse((e as Error).message) as { message?: string };
        setError(parsed.message || 'Ошибка создания автомобиля');
      } catch {
        setError('Ошибка создания автомобиля');
      }
    } finally {
      setSubmitting(false);
    }
  }, [
    ensureCatalogueIds,
    customerId,
    brandId,
    modelId,
    vehicleTypeId,
    vin,
    licensePlate,
    mileage,
    year,
    color,
    engineType,
    engineVolume,
    lastServiceDate,
    nextServiceDate,
    notes,
    onCreated,
    onOpenChange,
  ]);

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        onOpenChange(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'enter') {
        e.preventDefault();
        void submit();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange, submit]);

  React.useEffect(() => {
    if (!open) return;
    const q = customerQuery.trim();
    if (!q) {
      setCustomerResults([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const res = await customersAPI.getCustomers({ search: q, page: 1, limit: 5 });
        if (!cancelled) setCustomerResults(res.items);
      } catch {
        if (!cancelled) setCustomerResults([]);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [customerQuery, open]);

  const handlePasteSmart: React.ClipboardEventHandler<HTMLDivElement> = (e) => {
    const text = e.clipboardData.getData('text');
    if (!text) return;
    const parsed = parseSmart(text);
    if (parsed.vin) setVin((v) => v || parsed.vin);
    if (parsed.licensePlate) setLicensePlate((v) => v || parsed.licensePlate);
    if (parsed.mileage !== undefined) setMileage((v) => v || String(parsed.mileage));
    if (parsed.year !== undefined) setYear((v) => v || String(parsed.year));
    if (parsed.engineVolumeLiters !== undefined)
      setEngineVolume((v) => v || String(parsed.engineVolumeLiters));
  };

  const afterCreateCustomer = (c: CustomerResponse) => {
    setCustomerId(c.id);
    const label = [c.firstName, c.lastName].filter(Boolean).join(' ') || c.companyName || c.email || c.id;
    setCustomerLabel(label);
    setOpenCustomerCreate(false);
  };

  const brandMatches = React.useMemo(() => {
    const q = brandName.trim().toLowerCase();
    if (!q) return brands.slice(0, 20);
    return brands.filter((b) => b.name.toLowerCase().includes(q)).slice(0, 20);
  }, [brands, brandName]);

  const modelMatches = React.useMemo(() => {
    const q = modelName.trim().toLowerCase();
    const source = filteredModels;
    if (!q) return source.slice(0, 20);
    return source.filter((m) => m.name.toLowerCase().includes(q)).slice(0, 20);
  }, [filteredModels, modelName]);

  const typeMatches = React.useMemo(() => {
    const q = typeName.trim().toLowerCase();
    if (!q) return types.slice(0, 20);
    return types.filter((t) => t.name.toLowerCase().includes(q)).slice(0, 20);
  }, [types, typeName]);

  const createBrandInline = async () => {
    if (!brandName.trim()) return;
    setCreatingBrand(true);
    try {
      const b = await vehiclesCatalogueAPI.ensureBrand(brandName.trim());
      setBrandId(b.id);
      setBrandName(b.name);
      if (!brands.find((x) => x.id === b.id)) setBrands((prev) => [...prev, b]);
      setBrandOpen(false);
      setModelId('');
    } finally {
      setCreatingBrand(false);
    }
  };

  const createModelInline = async () => {
    if (!modelName.trim()) return;
    if (!brandId) {
      setError('Сначала выберите бренд');
      return;
    }
    setCreatingModel(true);
    try {
      const m = await vehiclesCatalogueAPI.ensureModel(modelName.trim(), brandId);
      setModelId(m.id);
      setModelName(m.name);
      if (!models.find((x) => x.id === m.id)) setModels((prev) => [...prev, m]);
      setModelOpen(false);
    } finally {
      setCreatingModel(false);
    }
  };

  const createTypeInline = async () => {
    if (!typeName.trim()) return;
    setCreatingType(true);
    try {
      const t = await vehiclesCatalogueAPI.ensureType(typeName.trim());
      setVehicleTypeId(t.id);
      setTypeName(t.name);
      if (!types.find((x) => x.id === t.id)) setTypes((prev) => [...prev, t]);
      setTypeOpen(false);
    } finally {
      setCreatingType(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent glow className="max-w-3xl" onPaste={handlePasteSmart}>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Car className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>Новое ТС</DialogTitle>
                <DialogDescription className="flex items-center gap-2">
                  Быстрое создание с «умной вставкой» VIN/номера{' '}
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Info className="w-3.5 h-3.5" />
            <span>
              Поля со звездочкой <span className="text-rose-500">*</span> — обязательные. Остальные — опционально.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Владелец */}
            <div className="md:col-span-2">
              <div className="text-xs text-muted-foreground mb-1">
                Владелец (клиент) <span className="text-rose-500">*</span>
              </div>
              {customerId ? (
                <div className="flex items-center justify-between rounded-md border border-border/60 p-2">
                  <div className="inline-flex items-center gap-2 text-sm">
                    <User className="h-4 w-4" />
                    <span>{customerLabel}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCustomerId('');
                        setCustomerLabel('');
                      }}
                    >
                      Сменить
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setOpenCustomerCreate(true)}>
                      Новый клиент
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <Input
                    placeholder="Начните вводить имя/компанию/email/телефон"
                    value={customerQuery}
                    onChange={(e) => setCustomerQuery(e.target.value)}
                    className="pl-8"
                  />
                  <User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  {customerResults.length > 0 && (
                    <div className="absolute z-50 mt-1 w-full rounded-md border border-border/50 glass shadow-lg overflow-hidden">
                      {customerResults.map((c) => {
                        const label = [c.firstName, c.lastName].filter(Boolean).join(' ') || c.companyName || c.email || c.id;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setCustomerId(c.id);
                              setCustomerLabel(label);
                              setCustomerResults([]);
                            }}
                            className="w-full text-left px-3 py-2 hover:bg-accent/40 text-sm"
                          >
                            {label}
                          </button>
                        );
                      })}
                      <div className="border-t border-border/40">
                        <button
                          type="button"
                          className="w-full text-left px-3 py-2 text-primary hover:bg-primary/10"
                          onClick={() => setOpenCustomerCreate(true)}
                        >
                          + Создать нового клиента
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Бренд */}
            <div className="relative">
              <div className="text-xs text-muted-foreground mb-1">
                Бренд <span className="text-rose-500">*</span>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Например: Toyota"
                  value={brandName}
                  onChange={(e) => {
                    setBrandName(e.target.value);
                    setBrandOpen(true);
                  }}
                  onFocus={() => setBrandOpen(true)}
                  onBlur={() => setTimeout(() => setBrandOpen(false), 150)}
                  className="pl-8"
                />
                {brandId && (
                  <button
                    type="button"
                    onClick={() => {
                      setBrandId('');
                      setBrandName('');
                      setModelId('');
                      setModelName('');
                    }}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                    aria-label="Очистить бренд"
                    title="Очистить бренд"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {brandOpen && (brandMatches.length > 0 || brandName.trim()) && (
                <div className="absolute z-50 mt-1 w-full rounded-md border border-border/50 glass shadow-lg overflow-auto max-h-56">
                  {brandName.trim() && !brandMatches.some((b) => b.name.toLowerCase() === brandName.trim().toLowerCase()) && (
                    <button
                      type="button"
                      onClick={createBrandInline}
                      disabled={creatingBrand}
                      className="w-full text-left px-3 py-2 text-primary hover:bg-primary/10 text-sm"
                    >
                      <Plus className="inline w-3.5 h-3.5 mr-1" />
                      {creatingBrand ? 'Создание…' : `Создать бренд «${brandName.trim()}»`}
                    </button>
                  )}
                  {brandMatches.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        setBrandId(b.id);
                        setBrandName(b.name);
                        setModelId('');
                        setModelName('');
                        setBrandOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-accent/40 text-sm"
                    >
                      {b.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Модель */}
            <div className="relative">
              <div className="text-xs text-muted-foreground mb-1">
                Модель <span className="text-rose-500">*</span>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={brandId ? 'Например: Camry' : 'Сначала выберите бренд'}
                  value={modelName}
                  onChange={(e) => {
                    setModelName(e.target.value);
                    setModelOpen(true);
                  }}
                  onFocus={() => setModelOpen(true)}
                  onBlur={() => setTimeout(() => setModelOpen(false), 150)}
                  className="pl-8"
                  disabled={!brandId}
                />
                {modelId && (
                  <button
                    type="button"
                    onClick={() => {
                      setModelId('');
                      setModelName('');
                    }}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                    aria-label="Очистить модель"
                    title="Очистить модель"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {modelOpen && brandId && (modelMatches.length > 0 || modelName.trim()) && (
                <div className="absolute z-50 mt-1 w-full rounded-md border border-border/50 glass shadow-lg overflow-auto max-h-56">
                  {modelName.trim() &&
                    !modelMatches.some((m) => m.name.toLowerCase() === modelName.trim().toLowerCase()) && (
                      <button
                        type="button"
                        onClick={createModelInline}
                        disabled={creatingModel}
                        className="w-full text-left px-3 py-2 text-primary hover:bg-primary/10 text-sm"
                      >
                        <Plus className="inline w-3.5 h-3.5 mr-1" />
                        {creatingModel ? 'Создание…' : `Создать модель «${modelName.trim()}»`}
                      </button>
                    )}
                  {modelMatches.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setModelId(m.id);
                        setModelName(m.name);
                        setModelOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-accent/40 text-sm"
                    >
                      {m.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Тип ТС */}
            <div className="md:col-span-2 relative">
              <div className="text-xs text-muted-foreground mb-1">
                Тип автомобиля <span className="text-rose-500">*</span>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Например: Седан"
                  value={typeName}
                  onChange={(e) => {
                    setTypeName(e.target.value);
                    setTypeOpen(true);
                  }}
                  onFocus={() => setTypeOpen(true)}
                  onBlur={() => setTimeout(() => setTypeOpen(false), 150)}
                  className="pl-8"
                />
                {vehicleTypeId && (
                  <button
                    type="button"
                    onClick={() => {
                      setVehicleTypeId('');
                      setTypeName('');
                    }}
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                    aria-label="Очистить тип"
                    title="Очистить тип"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {typeOpen && (typeMatches.length > 0 || typeName.trim()) && (
                <div className="absolute z-50 mt-1 w-full rounded-md border border-border/50 glass shadow-lg overflow-auto max-h-56">
                  {typeName.trim() &&
                    !typeMatches.some((t) => t.name.toLowerCase() === typeName.trim().toLowerCase()) && (
                      <button
                        type="button"
                        onClick={createTypeInline}
                        disabled={creatingType}
                        className="w-full text-left px-3 py-2 text-primary hover:bg-primary/10 text-sm"
                      >
                        <Plus className="inline w-3.5 h-3.5 mr-1" />
                        {creatingType ? 'Создание…' : `Создать тип «${typeName.trim()}»`}
                      </button>
                    )}
                  {typeMatches.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setVehicleTypeId(t.id);
                        setTypeName(t.name);
                        setTypeOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-accent/40 text-sm"
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* VIN / Госномер / Пробег */}
            <div className="relative">
              <Input
                placeholder="VIN (17 символов)"
                value={vin}
                onChange={(e) =>
                  setVin(e.target.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/gi, '').slice(0, 17))
                }
                className="pl-8"
              />
              <Barcode className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              {vin && (
                <div
                  className={`mt-1 text-[10px] ${
                    /^[A-HJ-NPR-Z0-9]{17}$/i.test(vin) ? 'text-emerald-500' : 'text-rose-500'
                  }`}
                >
                  {/^[A-HJ-NPR-Z0-9]{17}$/i.test(vin)
                    ? 'VIN корректен'
                    : 'VIN должен быть из 17 символов и без I,O,Q'}
                </div>
              )}
            </div>

            <div className="relative">
              <Input
                placeholder="Госномер"
                value={licensePlate}
                onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                className="pl-8"
              />
              <Hash className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            </div>

            <div className="relative">
              <Input
                placeholder="Пробег (км)"
                value={mileage}
                onChange={(e) => setMileage(e.target.value.replace(/[^\d]/g, ''))}
                className="pl-8"
              />
              <Gauge className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            </div>

            {/* Технические характеристики */}
            <div className="relative">
              <Input
                type="number"
                placeholder="Год выпуска (например, 2016)"
                value={year}
                onChange={(e) => setYear(e.target.value.replace(/[^\d]/g, '').slice(0, 4))}
                className="pl-8"
              />
              <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            </div>

            <div className="relative">
              <Input
                placeholder="Цвет (например, Белый)"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="pl-8"
              />
              <PencilLine className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            </div>

            <div className="relative">
              <div className="relative">
                <select
                  value={engineType}
                  onChange={(e) => setEngineType((e.target.value as EngineType) || '')}
                  className="w-full h-10 rounded-md border border-border bg-background text-sm pl-8 pr-3"
                >
                  <option value="">Тип двигателя (опционально)</option>
                  {ENGINE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <Zap className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            <div className="relative">
              <Input
                type="text"
                inputMode="decimal"
                placeholder="Объём двигателя (л), например 2.0"
                value={engineVolume}
                onChange={(e) => {
                  const val = e.target.value.replace(',', '.');
                  const normalized = val.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
                  setEngineVolume(normalized);
                }}
                className="pl-8"
              />
              <Gauge className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            </div>

            {/* Сервисные даты */}
            <div className="relative">
              <div className="text-xs text-muted-foreground mb-1">Дата последнего ТО (необязательно)</div>
              <Input
                type="date"
                value={lastServiceDate}
                onChange={(e) => setLastServiceDate(e.target.value)}
                className=""
              />
            </div>

            <div className="relative">
              <div className="text-xs text-muted-foreground mb-1">Дата следующего ТО (необязательно)</div>
              <Input
                type="date"
                value={nextServiceDate}
                onChange={(e) => setNextServiceDate(e.target.value)}
                className=""
              />
            </div>

            {/* Примечания */}
            <div className="md:col-span-2">
              <div className="text-xs text-muted-foreground mb-1">Примечания (необязательно)</div>
              <textarea
                placeholder="Опции, комментарии, особенности (будут сохранены безопасно)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-border bg-background text-sm px-3 py-2 resize-y"
              />
            </div>
          </div>

          {error && <div className="mt-2 text-sm text-destructive">{error}</div>}

          <DialogFooter className="mt-2">
            <div className="hidden sm:flex items-center text-xs text-muted-foreground mr-auto">
              <span className="mr-2">Обязательные:</span>
              <span className="font-medium">Владелец, Бренд, Модель, Тип автомобиля</span>
              <span className="mx-2">•</span>
              <span className="mr-2">Горячие клавиши:</span>
              <Kbd>Esc</Kbd>
              <span className="mx-1">—</span>
              <span className="mr-2">Закрыть</span>
              <Kbd className="ml-2">⌘</Kbd>+<Kbd>Enter</Kbd>
              <span className="ml-1">— Создать</span>
            </div>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Отмена
            </Button>
            <Button onClick={submit} disabled={submitting}>
              {submitting ? 'Создание...' : 'Создать ТС'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CustomerCreateDialog
        open={openCustomerCreate}
        onOpenChange={setOpenCustomerCreate}
        onCreated={afterCreateCustomer}
      />
    </>
  );
}
