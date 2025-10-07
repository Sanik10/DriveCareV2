// path: apps/frontend/components/appointments/appointment-complete-dialog.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';

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
      <DialogContent glow className="max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Завершить запись</DialogTitle>
              <DialogDescription>Укажите итоговую стоимость и заметки мастера (опционально)</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 mt-2">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Итоговая стоимость (₽)</div>
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
            <div className="text-xs text-muted-foreground mb-1">Заметки мастера</div>
            <textarea
              className="w-full min-h-[90px] rounded-md border border-border bg-background text-sm px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Опционально"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="mt-4">
          <div className="hidden sm:flex items-center text-xs text-muted-foreground mr-auto">
            <span className="mr-2">Горячие клавиши:</span>
            <Kbd>Esc</Kbd>
            <span className="mx-1">—</span>
            <span className="mr-2">Закрыть</span>
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
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
