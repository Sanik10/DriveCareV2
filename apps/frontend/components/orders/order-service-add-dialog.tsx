// path: apps/frontend/components/orders/order-service-add-dialog.tsx
'use client';

import * as React from 'react';
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
import { servicesAPI } from '@/lib/api/services';
import { ordersAPI } from '@/lib/api/orders';
import type { ServiceCatalogueItem } from '@/lib/types/services';
import type { AddServiceToOrderRequest, OrderServiceResponse } from '@/lib/types/orders';
import { Search, Wrench, UserPlus, Save } from 'lucide-react';
import { useAuth } from '@/lib/hooks/use-auth';

type Props = {
  orderId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onAdded?: (line: OrderServiceResponse) => void;
};

function getUserId(u: unknown): string | undefined {
  if (u && typeof u === 'object' && 'id' in u) {
    const maybe = (u as { id?: unknown }).id;
    return typeof maybe === 'string' ? maybe : undefined;
  }
  return undefined;
}

export function OrderServiceAddDialog({ orderId, open, onOpenChange, onAdded }: Props) {
  const { user } = useAuth();
  const [query, setQuery] = React.useState('');
  const [results, setResults] = React.useState<ServiceCatalogueItem[]>([]);
  const [selected, setSelected] = React.useState<ServiceCatalogueItem | null>(null);

  const [quantity, setQuantity] = React.useState<string>('1');
  const [customPrice, setCustomPrice] = React.useState<string>('');
  const [discountPercent, setDiscountPercent] = React.useState<string>('0');
  const [mechanicId, setMechanicId] = React.useState<string>('');
  const [notes, setNotes] = React.useState<string>('');

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
        const res = await servicesAPI.search({ search: q, page: 1, limit: 8 });
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
      setQuery('');
      setResults([]);
      setSelected(null);
      setQuantity('1');
      setCustomPrice('');
      setDiscountPercent('0');
      setMechanicId('');
      setNotes('');
      setError(null);
      setSubmitting(false);
    }
  }, [open]);

  const onAssignMe = () => {
    const meId = getUserId(user);
    if (meId) setMechanicId(meId);
  };

  const submit = async () => {
    if (!selected) {
      setError('Выберите услугу');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload: AddServiceToOrderRequest = {
        serviceId: selected.id,
        quantity: quantity ? parseInt(quantity, 10) : 1,
        customPrice: customPrice ? parseFloat(customPrice) : undefined,
        discountPercent: discountPercent ? parseFloat(discountPercent) : 0,
        mechanicId: mechanicId || undefined,
        notes: notes || undefined,
      };
      const created = await ordersAPI.addServiceToOrder(orderId, payload);
      onAdded?.(created);
      onOpenChange(false);
    } catch (e) {
      try {
        const parsed = JSON.parse((e as Error).message) as { message?: string };
        setError(parsed.message || 'Ошибка добавления услуги');
      } catch {
        setError('Ошибка добавления услуги');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent glow className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="w-4 h-4" /> Добавить услугу
          </DialogTitle>
          <DialogDescription>Найдите услугу в каталоге, укажите количество и скидку</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Input
              placeholder="Поиск услуги по названию"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8"
            />
            <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
            {results.length > 0 && (
              <div className="absolute z-50 mt-1 w-full rounded-md border border-border/50 bg-popover shadow-lg overflow-hidden max-h-64 overflow-y-auto">
                {results.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelected(s)}
                    className="w-full text-left px-3 py-2 hover:bg-accent/40 text-sm"
                  >
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {(s.price || 0).toLocaleString('ru-RU')} ₽ · {s.durationMinutes} мин
                      {s.category?.name ? ` · ${s.category.name}` : ''}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selected && (
            <div className="rounded-md border border-border/50 p-3 text-sm">
              <div className="font-medium">{selected.name}</div>
              <div className="text-xs text-muted-foreground">
                База: {(selected.price || 0).toLocaleString('ru-RU')} ₽ · Длительность: {selected.durationMinutes} мин
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <Input
              placeholder="Кол-во"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value.replace(/[^\d]/g, ''))}
            />
            <Input
              placeholder="Своя цена (₽)"
              value={customPrice}
              onChange={(e) => setCustomPrice(e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.'))}
            />
            <Input
              placeholder="Скидка (%)"
              value={discountPercent}
              onChange={(e) => setDiscountPercent(e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.'))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="ID механика (необязательно)"
              value={mechanicId}
              onChange={(e) => setMechanicId(e.target.value)}
            />
            <Button variant="outline" onClick={onAssignMe} className="justify-center">
              <UserPlus className="w-4 h-4 mr-2" /> Назначить меня
            </Button>
          </div>

          <Input placeholder="Заметки (необязательно)" value={notes} onChange={(e) => setNotes(e.target.value)} />

          {error && <div className="text-sm text-destructive">{error}</div>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Отмена
          </Button>
          <Button onClick={submit} disabled={submitting || !selected}>
            {submitting ? 'Добавление...' : (
              <>
                <Save className="w-4 h-4 mr-2" /> Добавить
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
