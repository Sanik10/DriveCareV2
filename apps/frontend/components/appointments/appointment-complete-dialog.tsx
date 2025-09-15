// path: apps/frontend/components/appointments/appointment-complete-dialog.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type CompletePayload = {
  finalCost?: number;
  mechanicNotes?: string;
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (data: CompletePayload) => Promise<void> | void;
  loading?: boolean;
  initialFinalCost?: number;
  initialMechanicNotes?: string;
};

function parseCost(input: string): number | undefined {
  if (!input.trim()) return undefined;
  const normalized = input.replace(/\s+/g, '').replace(',', '.');
  const n = Number(normalized);
  if (!isFinite(n)) return undefined;
  return n;
}

export function AppointmentCompleteDialog({
  open,
  onOpenChange,
  onConfirm,
  loading,
  initialFinalCost,
  initialMechanicNotes,
}: Props) {
  const [finalCostStr, setFinalCostStr] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (open) {
      setFinalCostStr(typeof initialFinalCost === 'number' && isFinite(initialFinalCost) ? String(initialFinalCost) : '');
      setNotes(initialMechanicNotes || '');
    }
  }, [open, initialFinalCost, initialMechanicNotes]);

  const parsedCost = useMemo(() => parseCost(finalCostStr), [finalCostStr]);
  const isCostValid = useMemo(() => finalCostStr.trim() === '' || (typeof parsedCost === 'number' && parsedCost >= 0), [finalCostStr, parsedCost]);

  const canSubmit = isCostValid;

  return (
    <Dialog open={open} onOpenChange={(v) => !loading && onOpenChange(v)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Завершить запись</DialogTitle>
          <DialogDescription>Укажите итоговую стоимость и заметки мастера (опционально)</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 py-2">
          <div>
            <label className="text-sm text-muted-foreground">Итоговая стоимость (₽)</label>
            <Input
              inputMode="decimal"
              placeholder="Например, 6500"
              value={finalCostStr}
              onChange={(e) => setFinalCostStr(e.target.value)}
            />
            {!isCostValid && (
              <div className="mt-1 text-xs text-destructive">Введите неотрицательное число или оставьте пустым</div>
            )}
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Заметки мастера</label>
            <textarea
              className="w-full min-h-[90px] rounded-md border border-border bg-background text-sm px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Опционально"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            Отмена
          </Button>
          <Button
            disabled={!canSubmit || !!loading}
            onClick={async () => {
              const payload: CompletePayload = {};
              const cost = parseCost(finalCostStr);
              if (typeof cost === 'number') payload.finalCost = cost;
              if (notes.trim()) payload.mechanicNotes = notes.trim();

              try {
                await onConfirm(payload);
                onOpenChange(false);
              } catch {
                // Ошибку покажет родитель (toast); диалог остаётся открытым
              }
            }}
          >
            {loading ? 'Завершение...' : 'Завершить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
