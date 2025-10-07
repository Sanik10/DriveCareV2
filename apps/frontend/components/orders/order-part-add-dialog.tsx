// path: apps/frontend/components/orders/order-part-add-dialog.tsx
"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { partsAPI } from "@/lib/api/parts";
import { ordersAPI } from "@/lib/api/orders";
import type { PartCatalogueItem, PartAvailability } from "@/lib/types/parts";
import type { AddPartToOrderRequest, OrderPartResponse } from "@/lib/types/orders";
import { Search, Truck, Save, ShieldCheck } from "lucide-react";
import { Kbd } from "@/components/ui/kbd";

type Props = {
  orderId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAdded?: (line: OrderPartResponse) => void;
};

export function OrderPartAddDialog({ orderId, open, onOpenChange, onAdded }: Props) {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<PartCatalogueItem[]>([]);
  const [selected, setSelected] = React.useState<PartCatalogueItem | null>(null);

  const [quantity, setQuantity] = React.useState<string>("1");
  const [customPrice, setCustomPrice] = React.useState<string>("");
  const [discountPercent, setDiscountPercent] = React.useState<string>("0");
  const [customerProvided, setCustomerProvided] = React.useState<boolean>(false);

  const [availability, setAvailability] = React.useState<PartAvailability | null>(null);

  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      const q = query.trim();
      if (!q) {
        setResults([]);
        return;
      }
      try {
        const res = await partsAPI.search({ search: q, page: 1, limit: 8 });
        if (!cancelled) setResults(res.items);
      } catch {
        if (!cancelled) setResults([]);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [open, query]);

  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setSelected(null);
      setQuantity("1");
      setCustomPrice("");
      setDiscountPercent("0");
      setCustomerProvided(false);
      setAvailability(null);
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  React.useEffect(() => {
    async function fetchAvailability() {
      if (!open || !selected || customerProvided) {
        setAvailability(null);
        return;
      }
      try {
        const data = await ordersAPI.checkPartAvailability(orderId, selected.id);
        setAvailability(data);
      } catch {
        setAvailability(null);
      }
    }
    void fetchAvailability();
  }, [open, selected, customerProvided, orderId]);

  const submit = async () => {
    if (!selected) {
      setError("Выберите запчасть");
      return;
    }
    const qtyNum = quantity ? parseInt(quantity, 10) : 1;
    if (!customerProvided && availability && qtyNum > Math.max(0, availability.maxQuantity)) {
      setError(`Недостаточно на складе. Доступно к добавлению: ${availability.maxQuantity}`);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const payload: AddPartToOrderRequest = {
        partId: selected.id,
        quantity: qtyNum,
        customPrice: customPrice ? parseFloat(customPrice) : undefined,
        discountPercent: discountPercent ? parseFloat(discountPercent) : 0,
        isCustomerProvided: customerProvided,
      };
      const created = await ordersAPI.addPartToOrder(orderId, payload);
      onAdded?.(created);
      onOpenChange(false);
    } catch (e) {
      try {
        const parsed = JSON.parse((e as Error).message) as { message?: string };
        setError(parsed.message || "Ошибка добавления запчасти");
      } catch {
        setError("Ошибка добавления запчасти");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const effectivePrice = customerProvided
    ? (customPrice ? parseFloat(customPrice) : 0)
    : (customPrice ? parseFloat(customPrice) : (selected?.sellingPrice || 0));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent glow className="max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-600 dark:text-orange-400">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Добавить запчасть</DialogTitle>
              <DialogDescription>Найдите запчасть, проверьте наличие и укажите параметры</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Поиск запчасти</div>
            <div className="relative">
              <Input
                placeholder="Название/артикул/бренд"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-8"
              />
              <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
              {results.length > 0 && (
                <div className="absolute z-50 mt-1 w-full rounded-md border border-border/50 glass shadow-lg overflow-hidden max-h-64 overflow-y-auto">
                  {results.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelected(p)}
                      className="w-full text-left px-3 py-2 hover:bg-accent/40 text-sm"
                    >
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {p.brand ? `${p.brand} · ` : ""}{p.partNumber || "—"} · {(p.sellingPrice || 0).toLocaleString("ru-RU")} ₽
                        {p.category?.name ? ` · ${p.category.name}` : ""}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {selected && (
            <div className="rounded-md border border-border/50 p-3 text-sm">
              <div className="font-medium">{selected.name}</div>
              <div className="text-xs text-muted-foreground">
                Цена: {(selected.sellingPrice || 0).toLocaleString("ru-RU")} ₽ {selected.brand ? `· ${selected.brand}` : ""} {selected.partNumber ? `· ${selected.partNumber}` : ""}
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Кол-во</div>
              <Input
                placeholder="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value.replace(/[^\d]/g, ""))}
              />
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Своя цена (₽)</div>
              <Input
                placeholder="Опционально"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value.replace(/[^0-9.,]/g, "").replace(",", "."))}
              />
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Скидка (%)</div>
              <Input
                placeholder="0"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value.replace(/[^0-9.,]/g, "").replace(",", "."))}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={customerProvided}
                onChange={(e) => setCustomerProvided(e.target.checked)}
                className="h-4 w-4"
              />
              Запчасть клиента (без резерва)
            </label>
            {!customerProvided && availability && (
              <div className="ml-auto inline-flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="w-3.5 h-3.5" />
                Доступно: {availability.available} · Макс: {availability.maxQuantity}
              </div>
            )}
          </div>

          <div className="text-xs text-muted-foreground">
            💡 К оплате: {((effectivePrice || 0) * (quantity ? parseInt(quantity, 10) : 1) * (1 - (discountPercent ? parseFloat(discountPercent) : 0) / 100)).toLocaleString('ru-RU')} ₽
          </div>

          {error && <div className="text-sm text-destructive">{error}</div>}
        </div>

        <DialogFooter className="mt-4">
          <div className="hidden sm:flex items-center text-xs text-muted-foreground mr-auto">
            <span className="mr-2">Горячие клавиши:</span>
            <Kbd>Esc</Kbd>
            <span className="ml-1">— Закрыть</span>
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Отмена
          </Button>
          <Button onClick={submit} disabled={submitting || !selected}>
            {submitting ? "Добавление..." : (<><Save className="w-4 h-4 mr-2" /> Добавить</>)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
