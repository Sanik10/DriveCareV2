// path: apps/frontend/components/vehicles/vehicle-create-dialog.tsx
"use client";

import * as React from "react";
import { Car, Hash, Barcode, Gauge, User, Sparkles, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { vehiclesAPI } from "@/lib/api/vehicles";
import { vehiclesCatalogueAPI } from "@/lib/api/vehicles-catalogue";
import type { VehicleResponse, CreateVehicleRequest } from "@/lib/types/vehicles";
import type { CatalogueBrand, CatalogueModel, CatalogueType } from "@/lib/types/vehicles-catalogue";
import { customersAPI } from "@/lib/api/customers";
import type { CustomerResponse } from "@/lib/types/customers";
import { Kbd } from "@/components/ui/kbd";
import { CustomerCreateDialog } from "@/components/customers/customer-create-dialog";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: (v: VehicleResponse) => void;
};

function parseSmart(text: string) {
  const vinMatch = text.match(/\b([A-HJ-NPR-Z0-9]{17})\b/i)?.[0];
  const plateMatch = text.match(/([A-ZА-Я0-9-]{5,12})/i)?.[0];
  const mileageMatch = text.match(/(\d{1,7})\s?(км|km)/i)?.[1];
  return {
    vin: vinMatch?.toUpperCase() || "",
    licensePlate: plateMatch?.toUpperCase() || "",
    mileage: mileageMatch ? parseInt(mileageMatch, 10) : undefined,
  };
}

export function VehicleCreateDialog({ open, onOpenChange, onCreated }: Props) {
  const [brands, setBrands] = React.useState<CatalogueBrand[]>([]);
  const [models, setModels] = React.useState<CatalogueModel[]>([]);
  const [types, setTypes] = React.useState<CatalogueType[]>([]);

  const [brandId, setBrandId] = React.useState<string>("");
  const [modelId, setModelId] = React.useState<string>("");
  const [vehicleTypeId, setVehicleTypeId] = React.useState<string>("");

  const [brandName, setBrandName] = React.useState<string>("");
  const [modelName, setModelName] = React.useState<string>("");
  const [typeName, setTypeName] = React.useState<string>("");

  const [vin, setVin] = React.useState("");
  const [licensePlate, setLicensePlate] = React.useState("");
  const [mileage, setMileage] = React.useState<string>("");
  const [customerQuery, setCustomerQuery] = React.useState<string>("");
  const [customerResults, setCustomerResults] = React.useState<CustomerResponse[]>([]);
  const [customerId, setCustomerId] = React.useState<string>("");
  const [customerLabel, setCustomerLabel] = React.useState<string>("");

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
          vehiclesCatalogueAPI.brands(),
          vehiclesCatalogueAPI.models(),
          vehiclesCatalogueAPI.types(),
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
    return () => { cancelled = true; };
  }, [open]);

  const submit = React.useCallback(async () => {
    setSubmitting(true);
    setError(null);

    try {
      await ensureCatalogueIds();

      if (!customerId) {
        setError("Укажите владельца ТС (клиента)");
        setSubmitting(false);
        return;
      }
      if (!modelId) {
        setError("Выберите или создайте модель");
        setSubmitting(false);
        return;
      }
      if (!vehicleTypeId) {
        setError("Выберите или создайте тип автомобиля");
        setSubmitting(false);
        return;
      }
      const vinOk = !vin || /^[A-HJ-NPR-Z0-9]{17}$/i.test(vin);
      if (vin && !vinOk) {
        setError("VIN должен содержать 17 символов (без I, O, Q)");
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
      };

      const created = await vehiclesAPI.createVehicle(payload);
      onCreated?.(created);
      onOpenChange(false);
      setBrandId(""); setModelId(""); setVehicleTypeId("");
      setBrandName(""); setModelName(""); setTypeName("");
      setVin(""); setLicensePlate(""); setMileage("");
      setCustomerId(""); setCustomerLabel(""); setCustomerQuery(""); setCustomerResults([]);
    } catch (e) {
      try {
        const parsed = JSON.parse((e as Error).message) as { message?: string };
        setError(parsed.message || "Ошибка создания автомобиля");
      } catch {
        setError("Ошибка создания автомобиля");
      }
    } finally {
      setSubmitting(false);
    }
  }, [customerId, modelId, vehicleTypeId, vin, licensePlate, mileage, onCreated, onOpenChange]);

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onOpenChange(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "enter") {
        e.preventDefault();
        void submit();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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
    return () => { cancelled = true; clearTimeout(t); };
  }, [customerQuery, open]);

  const filteredModels = React.useMemo(() => {
    if (!brandId) return models;
    return models.filter(m => (m.brandId === brandId) || (m.brand?.id === brandId));
  }, [models, brandId]);

  const handlePasteSmart: React.ClipboardEventHandler<HTMLDivElement> = (e) => {
    const text = e.clipboardData.getData("text");
    if (!text) return;
    const parsed = parseSmart(text);
    if (parsed.vin) setVin((v) => v || parsed.vin);
    if (parsed.licensePlate) setLicensePlate((v) => v || parsed.licensePlate);
    if (parsed.mileage !== undefined) setMileage((v) => v || String(parsed.mileage));
  };

  const afterCreateCustomer = (c: CustomerResponse) => {
    setCustomerId(c.id);
    const label = [c.firstName, c.lastName].filter(Boolean).join(' ') || c.companyName || c.email || c.id;
    setCustomerLabel(label);
    setOpenCustomerCreate(false);
  };

  async function ensureCatalogueIds() {
    if (!brandId && brandName.trim()) {
      setCreatingBrand(true);
      try {
        const b = await vehiclesCatalogueAPI.ensureBrand(brandName);
        setBrandId(b.id);
        if (!brands.find(x => x.id === b.id)) setBrands(prev => [...prev, b]);
      } finally {
        setCreatingBrand(false);
      }
    }

    if (!vehicleTypeId && typeName.trim()) {
      setCreatingType(true);
      try {
        const t = await vehiclesCatalogueAPI.ensureType(typeName);
        setVehicleTypeId(t.id);
        if (!types.find(x => x.id === t.id)) setTypes(prev => [...prev, t]);
      } finally {
        setCreatingType(false);
      }
    }

    if (!modelId && modelName.trim() && (brandId || brandName.trim())) {
      if (!brandId && brandName.trim()) {
        const b = await vehiclesCatalogueAPI.ensureBrand(brandName);
        setBrandId(b.id);
        if (!brands.find(x => x.id === b.id)) setBrands(prev => [...prev, b]);
      }
      if (brandId) {
        setCreatingModel(true);
        try {
          const m = await vehiclesCatalogueAPI.ensureModel(modelName, brandId);
          setModelId(m.id);
          if (!models.find(x => x.id === m.id)) setModels(prev => [...prev, m]);
        } finally {
          setCreatingModel(false);
        }
      }
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent glow className="max-w-2xl" onPaste={handlePasteSmart}>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Car className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>Новое ТС</DialogTitle>
                <DialogDescription className="flex items-center gap-2">
                  Быстрое создание с «умной вставкой» VIN/номера <Sparkles className="h-3.5 w-3.5 text-primary" />
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Владелец */}
            <div className="md:col-span-2">
              <div className="text-xs text-muted-foreground mb-1">Владелец (клиент)</div>
              {customerId ? (
                <div className="flex items-center justify-between rounded-md border border-border/60 p-2">
                  <div className="inline-flex items-center gap-2 text-sm">
                    <User className="h-4 w-4" />
                    <span>{customerLabel}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setCustomerId(""); setCustomerLabel(""); }}>
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
                    <div className="absolute z-50 mt-1 w-full rounded-md border border-border/50 bg-popover shadow-lg overflow-hidden">
                      {customerResults.map((c) => {
                        const label = [c.firstName, c.lastName].filter(Boolean).join(' ') || c.companyName || c.email || c.id;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => { setCustomerId(c.id); setCustomerLabel(label); setCustomerResults([]); }}
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

            {/* Бренд/Модель с автодобавлением */}
            <div>
              <div className="text-xs text-muted-foreground mb-1">Бренд</div>
              <div className="flex gap-2">
                <select
                  value={brandId}
                  onChange={(e) => { setBrandId(e.target.value); setModelId(""); }}
                  className="w-full h-10 rounded-md border border-border bg-background text-sm px-3"
                >
                  <option value="">Не выбрано</option>
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 mt-2">
                <Input
                  placeholder="Или введите новый бренд (например, Toyota)"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    if (!brandName.trim()) return;
                    setCreatingBrand(true);
                    try {
                      const b = await vehiclesCatalogueAPI.ensureBrand(brandName);
                      setBrandId(b.id);
                      if (!brands.find(x => x.id === b.id)) setBrands(prev => [...prev, b]);
                    } finally {
                      setCreatingBrand(false);
                    }
                  }}
                  disabled={creatingBrand}
                >
                  <Plus className="w-4 h-4 mr-1" /> {creatingBrand ? '...' : 'Добавить'}
                </Button>
              </div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground mb-1">Модель</div>
              <div className="flex gap-2">
                <select
                  value={modelId}
                  onChange={(e) => setModelId(e.target.value)}
                  className="w-full h-10 rounded-md border border-border bg-background text-sm px-3"
                >
                  <option value="">Не выбрано</option>
                  {filteredModels.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2 mt-2">
                <Input
                  placeholder="Или введите новую модель (например, Camry)"
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    if (!brandId && !brandName.trim()) {
                      setError("Сначала выберите или создайте бренд");
                      return;
                    }
                    setCreatingModel(true);
                    try {
                      if (!brandId && brandName.trim()) {
                        const b = await vehiclesCatalogueAPI.ensureBrand(brandName);
                        setBrandId(b.id);
                        if (!brands.find(x => x.id === b.id)) setBrands(prev => [...prev, b]);
                      }
                      if (brandId && modelName.trim()) {
                        const m = await vehiclesCatalogueAPI.ensureModel(modelName, brandId);
                        setModelId(m.id);
                        if (!models.find(x => x.id === m.id)) setModels(prev => [...prev, m]);
                      }
                    } finally {
                      setCreatingModel(false);
                    }
                  }}
                  disabled={creatingModel}
                >
                  <Plus className="w-4 h-4 mr-1" /> {creatingModel ? '...' : 'Добавить'}
                </Button>
              </div>
            </div>

            {/* Тип с автодобавлением */}
            <div className="md:col-span-2">
              <div className="text-xs text-muted-foreground mb-1">Тип автомобиля</div>
              <div className="flex gap-2">
                <select
                  value={vehicleTypeId}
                  onChange={(e) => setVehicleTypeId(e.target.value)}
                  className="w-full h-10 rounded-md border border-border bg-background text-sm px-3"
                >
                  <option value="">Не выбрано</option>
                  {types.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                <Input
                  placeholder="Или новый тип (например, Седан)"
                  value={typeName}
                  onChange={(e) => setTypeName(e.target.value)}
                  className="max-w-xs"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    if (!typeName.trim()) return;
                    setCreatingType(true);
                    try {
                      const t = await vehiclesCatalogueAPI.ensureType(typeName);
                      setVehicleTypeId(t.id);
                      if (!types.find(x => x.id === t.id)) setTypes(prev => [...prev, t]);
                    } finally {
                      setCreatingType(false);
                    }
                  }}
                  disabled={creatingType}
                >
                  <Plus className="w-4 h-4 mr-1" /> {creatingType ? '...' : 'Добавить'}
                </Button>
              </div>
            </div>

            {/* VIN / ГРЗ / Пробег */}
            <div className="relative">
              <Input
                placeholder="VIN (17 символов)"
                value={vin}
                onChange={(e) => setVin(e.target.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/gi, '').slice(0,17))}
                className="pl-8"
              />
              <Barcode className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              {vin && (
                <div className={`mt-1 text-[10px] ${/^[A-HJ-NPR-Z0-9]{17}$/i.test(vin) ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {/^[A-HJ-NPR-Z0-9]{17}$/i.test(vin) ? 'VIN корректен' : 'VIN должен быть из 17 символов и без I,O,Q'}
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
          </div>

          {error && <div className="mt-2 text-sm text-destructive">{error}</div>}

          <DialogFooter className="mt-2">
            <div className="hidden sm:flex items-center text-xs text-muted-foreground mr-auto">
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
              {submitting ? "Создание..." : "Создать ТС"}
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
