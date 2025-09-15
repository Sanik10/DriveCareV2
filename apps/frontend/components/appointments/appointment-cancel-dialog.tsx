// path: apps/frontend/components/appointments/appointment-cancel-dialog.tsx
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (reason: string) => Promise<void> | void;
  loading?: boolean;
};

export function AppointmentCancelDialog({ open, onOpenChange, onConfirm, loading }: Props) {
  const [reason, setReason] = useState('');

  const canSubmit = reason.trim().length >= 3;

  return (
    <Dialog open={open} onOpenChange={(v) => !loading && onOpenChange(v)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Отменить запись</DialogTitle>
          <DialogDescription>Укажите причину отмены (минимум 3 символа)</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <label className="text-sm text-muted-foreground">Причина</label>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Например: клиент запросил перенос"
          />
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            Отмена
          </Button>
          <Button
            variant="destructive"
            disabled={!canSubmit || loading}
            onClick={async () => {
              await onConfirm(reason.trim());
              onOpenChange(false);
              setReason('');
            }}
          >
            {loading ? 'Отмена...' : 'Отменить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
