// path: apps/frontend/components/appointments/appointment-reschedule-dialog.tsx
'use client';

import { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Перенести запись</DialogTitle>
          <DialogDescription>Выберите новое время начала и окончания</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 py-2">
          <div>
            <label className="text-sm text-muted-foreground">Начало</label>
            <Input type="datetime-local" value={startLocal} onChange={(e) => setStartLocal(e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Окончание</label>
            <Input type="datetime-local" value={endLocal} onChange={(e) => setEndLocal(e.target.value)} />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            Отмена
          </Button>
          <Button
            disabled={!canSubmit || loading}
            onClick={async () => {
              const s = toIsoFromLocal(startLocal)!;
              const e = toIsoFromLocal(endLocal)!;
              await onConfirm(s, e);
              onOpenChange(false);
            }}
          >
            {loading ? 'Перенос...' : 'Перенести'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
