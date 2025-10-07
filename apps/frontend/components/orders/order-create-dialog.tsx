// path: apps/frontend/components/orders/order-create-dialog.tsx
"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Car, User, Plus, ClipboardPaste, Save } from "lucide-react";
import { customersAPI } from "@/lib/api/customers";
import { vehiclesAPI } from "@/lib/api/vehicles";
import { ordersAPI } from "@/lib/api/orders";
import type { CustomerResponse } from "@/lib/types/customers";
import type { VehicleResponse } from "@/lib/types/vehicles";
import type { CreateOrderRequest, OrderResponse } from "@/lib/types/orders";
import { Kbd } from "@/components/ui/kbd";
import { CustomerCreateDialog } from "@/components/customers/customer-create-dialog";
import { VehicleCreateDialog } from "@/components/vehicles/vehicle-create-dialog";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: (order: OrderResponse) => void;
  initialCustomerId?: string;
  initialVehicleId?: string;
};

export function OrderCreateDialog({ open, onOpenChange, onCreated, initialCustomerId, initialVehicleId }: Props) {
  const [customerQuery, setCustomerQuery] = React.useState("");
  const [customerResults, setCustomerResults] = React.useState<CustomerResponse[]>([]);
  const [customerId, setCustomerId] = React.useState<string>("");
  const [customerLabel, setCustomerLabel] = React.useState<string>("");

  const [vehicleResults, setVehicleResults] = React.useState<VehicleResponse[]>([]);
  const [vehicleId, setVehicleId] = React.useState<string>("");
  const [vehicleLabel, setVehicleLabel] = React.useState<string>("");

  const [mileage, setMileage] = React.useState<string>("");
  const [description, setDescription] = React.useState<string>("");
  const [complaints, setComplaints] = React.useState<string>("");

  const [openCustomerCreate, setOpenCustomerCreate] = React.useState(false);
  const [openVehicleCreate, setOpenVehicleCreate] = React.useState(false);

  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        if (initialCustomerId) {
          const c = await customersAPI.getCustomer(initialCustomerId);
          const label = [c.firstName, c.lastName].filter(Boolean).join(" ") || c.companyName || c.email || c.id;
          setCustomerId(c.id);
          setCustomerLabel(label);
        }
        if (initialVehicleId) {
          const v = await vehiclesAPI.getVehicle(initialVehicleId);
          const vlabel = `${v.model?.brand?.name ? v.model.brand.name + " " : ""}${v.model?.name || ""} ${v.licensePlate || v.vin || v.id}`.trim();
          setVehicleId(v.id);
          setVehicleLabel(vlabel);
          if (!customerId && v.customer?.id) {
            setCustomerId(v.customer.id);
            setCustomerLabel(([v.customer.firstName, v.customer.lastName].filter(Boolean).join(" ")) || v.customer.companyName || v.customer.email || v.customer.id);
          }
        }
      } catch {
        // ignore prefill errors
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialCustomerId, initialVehicleId]);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      const q = customerQuery.trim();
      if (!q) {
        setCustomerResults([]);
        return;
      }
      try {
        const res = await customersAPI.getCustomers({ search: q, page: 1, limit: 7 });
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

  React.useEffect(() => {
    if (!open) return;
    if (!customerId) {
      setVehicleResults([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const list = await vehiclesAPI.getCustomerVehicles(customerId);
        if (!cancelled) setVehicleResults(list);
      } catch {
        if (!cancelled) setVehicleResults([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [customerId, open]);

  const afterCreateCustomer = (c: CustomerResponse) => {
    setCustomerId(c.id);
    const label = [c.firstName, c.lastName].filter(Boolean).join(" ") || c.companyName || c.email || c.id;
    setCustomerLabel(label);
    setOpenCustomerCreate(false);
  };

  const afterCreateVehicle = (v: VehicleResponse) => {
    setVehicleId(v.id);
    const label = `${v.model?.brand?.name ? v.model.brand.name + " " : ""}${v.model?.name || ""} ${v.licensePlate || v.vin || v.id}`.trim();
    setVehicleLabel(label);
    setOpenVehicleCreate(false);
  };

  const onPasteSmart: React.ClipboardEventHandler<HTMLDivElement> = (e) => {
    const txt = e.clipboardData.getData("text");
    if (!txt) return;
    const mileageMatch = txt.match(/(\d{1,7})\s?(км|km)/i)?.[1];
    const complaintLike = txt.length > 6 && !/^[A-Z0-9-]{6,}$/i.test(txt) ? txt.slice(0, 300) : null;
    if (mileageMatch) setMileage((v) => v || String(parseInt(mileageMatch, 10)));
    if (complaintLike) setComplaints((v) => v || complaintLike);
  };

  const submit = React.useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      if (!customerId) {
        setError("Выберите клиента");
        setSubmitting(false);
        return;
      }
      if (!vehicleId) {
        setError("Выберите автомобиль");
        setSubmitting(false);
        return;
      }
      const payload: CreateOrderRequest = {
        customerId,
        vehicleId,
        mileage: mileage ? parseInt(mileage, 10) : undefined,
        description: description || undefined,
        customerComplaints: complaints || undefined,
      };
      const created = await ordersAPI.createOrder(payload);
      onCreated?.(created);
      onOpenChange(false);
      setCustomerId(""); setCustomerLabel(""); setCustomerQuery(""); setCustomerResults([]);
      setVehicleId(""); setVehicleLabel(""); setVehicleResults([]);
      setMileage(""); setDescription(""); setComplaints("");
    } catch (e) {
      try {
        const parsed = JSON.parse((e as Error).message) as { message?: string };
        setError(parsed.message || "Ошибка создания заказа");
      } catch {
        setError("Ошибка создания заказа");
      }
    } finally {
      setSubmitting(false);
    }
  }, [customerId, vehicleId, mileage, description, complaints, onCreated, onOpenChange]);

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!open) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "enter") {
        e.preventDefault();
        void submit();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, submit]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent glow className="max-w-2xl" onPaste={onPasteSmart}>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-primary flex items-center justify-center text-white">
                <ClipboardPaste className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>Новый заказ</DialogTitle>
                <DialogDescription className="flex items-center gap-2">
                  Быстрое создание: вставьте текст с жалобами/пробегом — мы распознаем.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            {/* Клиент */}
            <div className="md:col-span-2">
              <div className="text-xs text-muted-foreground mb-1">
                Клиент <span className="text-rose-500">*</span>
              </div>
              {customerId ? (
                <div className="flex items-center justify-between rounded-md border border-border/60 p-2">
                  <div className="inline-flex items-center gap-2 text-sm">
                    <User className="h-4 w-4" />
                    <span>{customerLabel}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setCustomerId(""); setCustomerLabel(""); setVehicleId(""); setVehicleLabel(""); }}>
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
                        const label = [c.firstName, c.lastName].filter(Boolean).join(" ") || c.companyName || c.email || c.id;
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

            {/* Автомобиль */}
            <div className="md:col-span-2">
              <div className="text-xs text-muted-foreground mb-1">
                Автомобиль <span className="text-rose-500">*</span>
              </div>
              {customerId ? (
                vehicleId ? (
                  <div className="flex items-center justify-between rounded-md border border-border/60 p-2">
                    <div className="inline-flex items-center gap-2 text-sm">
                      <Car className="h-4 w-4" />
                      <span>{vehicleLabel}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => { setVehicleId(""); setVehicleLabel(""); }}>
                        Сменить
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setOpenVehicleCreate(true)}>
                        Новое ТС
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-md border border-border/60">
                    {vehicleResults.length === 0 ? (
                      <div className="p-3 text-sm text-muted-foreground">
                        У клиента пока нет автомобилей. Создайте новое ТС.
                        <div className="mt-2">
                          <Button variant="outline" size="sm" onClick={() => setOpenVehicleCreate(true)}>
                            <Plus className="w-4 h-4 mr-1" /> Новое ТС
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="max-h-56 overflow-auto">
                        {vehicleResults.map((v) => {
                          const label = `${v.model?.brand?.name ? v.model.brand.name + " " : ""}${v.model?.name || ""} ${v.licensePlate || v.vin || ""}`.trim();
                          return (
                            <button
                              key={v.id}
                              type="button"
                              className="w-full text-left px-3 py-2 hover:bg-accent/40 text-sm flex items-center gap-2"
                              onClick={() => { setVehicleId(v.id); setVehicleLabel(label); }}
                            >
                              <Car className="w-4 h-4 text-muted-foreground" />
                              <span className="font-medium">{label}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )
              ) : (
                <div className="text-xs text-muted-foreground">Сначала выберите клиента</div>
              )}
            </div>

            {/* Доп. поля */}
            <div>
              <div className="text-xs text-muted-foreground mb-1">Пробег (км)</div>
              <Input
                placeholder="Например, 50000"
                value={mileage}
                onChange={(e) => setMileage(e.target.value.replace(/[^\d]/g, ""))}
              />
            </div>
            <div className="md:col-span-2">
              <div className="text-xs text-muted-foreground mb-1">Жалобы клиента</div>
              <Input
                placeholder="Опишите жалобы клиента"
                value={complaints}
                onChange={(e) => setComplaints(e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <div className="text-xs text-muted-foreground mb-1">Описание заказа</div>
              <Input
                placeholder="Краткое описание работ"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          {error && <div className="mt-2 text-sm text-destructive">{error}</div>}

          <DialogFooter className="mt-4">
            <div className="hidden sm:flex items-center text-xs text-muted-foreground mr-auto">
              <span className="mr-2">Горячие клавиши:</span>
              <Kbd className="ml-2">⌘</Kbd>+<Kbd>Enter</Kbd>
              <span className="ml-1">— Создать</span>
            </div>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Отмена
            </Button>
            <Button onClick={submit} disabled={submitting || !customerId || !vehicleId}>
              {submitting ? "Создание..." : (<><Save className="w-4 h-4 mr-2" /> Создать</>)}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CustomerCreateDialog
        open={openCustomerCreate}
        onOpenChange={setOpenCustomerCreate}
        onCreated={afterCreateCustomer}
      />
      <VehicleCreateDialog
        open={openVehicleCreate}
        onOpenChange={setOpenVehicleCreate}
        onCreated={afterCreateVehicle}
      />
    </>
  );
}
