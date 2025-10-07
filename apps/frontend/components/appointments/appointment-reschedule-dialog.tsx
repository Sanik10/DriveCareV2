// path: apps/frontend/components/appointments/appointment-reschedule-dialog.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { Calendar } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';

function toIsoFromLocal(dateTimeLocal: string | undefined): string | undefined {
  if (!dateTimeLocal) return undefined;
  const d = new Date(dateTimeLocal);
  if (isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

function toLocalInputValue(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  startTime?: string; // ISO
  endTime?: string; // ISO
  onConfirm: (startTimeIso: string, endTimeIso: string) => Promise<void> | void;
  loading?: boolean;
};

export function AppointmentRescheduleDialog({
  open,
  onOpenChange,
  startTime,
  endTime,
  onConfirm,
  loading,
}: Props) {
  const [startLocal, setStartLocal] = useState<string>(() => toLocalInputValue(startTime));
  const [endLocal, setEndLocal] = useState<string>(() => toLocalInputValue(endTime));

  // Синхронизация при открытии/смене входных значений
  useEffect(() => {
    if (open) {
      setStartLocal(toLocalInputValue(startTime));
      setEndLocal(toLocalInputValue(endTime));
    }
  }, [open, startTime, endTime]);

  const canSubmit = useMemo(() => {
    const s = toIsoFromLocal(startLocal);
    const e = toIsoFromLocal(endLocal);
    if (!s || !e) return false;
    const sd = new Date(s).getTime();
    const ed = new Date(e).getTime();
    return ed > sd;
  }, [startLocal, endLocal]);

  return (
    <Dialog open={open} onOpenChange={(v) => !loading && onOpenChange(v)}>
      <DialogContent glow className="max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Перенести запись</DialogTitle>
              <DialogDescription>Выберите новое время начала и окончания</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          <div>
            <div className="text-xs text-muted-foreground mb-1">
              Начало <span className="text-rose-500">*</span>
            </div>
            <Input type="datetime-local" value={startLocal} onChange={(e) => setStartLocal(e.target.value)} />
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">
              Окончание <span className="text-rose-500">*</span>
            </div>
            <Input type="datetime-local" value={endLocal} onChange={(e) => setEndLocal(e.target.value)} />
          </div>
        </div>

        <DialogFooter className="mt-4">
          <div className="hidden sm:flex items-center text-xs text-muted-foreground mr-auto">
            <span className="mr-2">Горячие клавиши:</span>
            <Kbd>Esc</Kbd>
            <span className="ml-1">— Закрыть</span>
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Отмена
          </Button>
          <Button
            disabled={!canSubmit || !!loading}
            onClick={async () => {
              const s = toIsoFromLocal(startLocal)!;
              const e = toIsoFromLocal(endLocal)!;
              try {
                await onConfirm(s, e);
                onOpenChange(false);
              } catch {
                // Ошибка обработается выше (toast). Диалог оставляем открытым.
              }
            }}
          >
            {loading ? 'Перенос...' : 'Перенести'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
