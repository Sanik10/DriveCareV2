// path: apps/frontend/components/appointments/appointment-cancel-dialog.tsx
'use client';

import { useState } from 'react';
import { XCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Kbd } from '@/components/ui/kbd';

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
      <DialogContent glow className="max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-destructive/20 flex items-center justify-center text-destructive">
              <XCircle className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Отменить запись</DialogTitle>
              <DialogDescription>Укажите причину отмены (минимум 3 символа)</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-2">
          <div className="text-xs text-muted-foreground mb-1">
            Причина отмены <span className="text-rose-500">*</span>
          </div>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Например: клиент запросил перенос"
            onKeyDown={async (e) => {
              if (e.key === 'Enter' && canSubmit && !loading) {
                try {
                  await onConfirm(reason.trim());
                  onOpenChange(false);
                  setReason('');
                } catch {
                  // Ошибку покажет родитель, диалог оставляем открытым
                }
              }
            }}
          />
        </div>

        <DialogFooter className="mt-4">
          <div className="hidden sm:flex items-center text-xs text-muted-foreground mr-auto">
            <span className="mr-2">Горячие клавиши:</span>
            <Kbd>Enter</Kbd>
            <span className="ml-1">— Отменить</span>
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Назад
          </Button>
          <Button
            variant="destructive"
            disabled={!canSubmit || !!loading}
            onClick={async () => {
              try {
                await onConfirm(reason.trim());
                onOpenChange(false);
                setReason('');
              } catch {
                // Ошибку покажет родитель (toast); диалог оставляем открытым
              }
            }}
          >
            {loading ? 'Отмена...' : 'Отменить запись'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
