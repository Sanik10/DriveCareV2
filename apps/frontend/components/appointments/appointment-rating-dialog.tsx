// path: apps/frontend/components/appointments/appointment-rating-dialog.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Star } from 'lucide-react';

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (rating: number, feedback?: string) => Promise<void> | void;
  loading?: boolean;
  initialRating?: number;
  initialFeedback?: string;
};

export function AppointmentRatingDialog({
  open,
  onOpenChange,
  onConfirm,
  loading,
  initialRating = 5,
  initialFeedback = '',
}: Props) {
  const [rating, setRating] = useState<number>(initialRating);
  const [hover, setHover] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string>(initialFeedback);

  useEffect(() => {
    if (open) {
      setRating(initialRating);
      setFeedback(initialFeedback || '');
      setHover(null);
    }
  }, [open, initialRating, initialFeedback]);

  const display = hover ?? rating;
  const canSubmit = useMemo(() => Number.isInteger(rating) && rating >= 1 && rating <= 5, [rating]);

  return (
    <Dialog open={open} onOpenChange={(v) => !loading && onOpenChange(v)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Оценить работу</DialogTitle>
          <DialogDescription>Выберите оценку от 1 до 5 и оставьте отзыв (опционально)</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center gap-2">
            {([1, 2, 3, 4, 5] as const).map((i) => (
              <button
                key={i}
                type="button"
                className="p-1 rounded-md hover:bg-muted/50"
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onClick={() => setRating(i)}
                aria-label={`Оценка ${i}`}
              >
                <Star
                  className="w-6 h-6"
                  strokeWidth={2}
                  fill={(display ?? 0) >= i ? 'currentColor' : 'none'}
                />
              </button>
            ))}
            <div className="ml-2 text-sm text-muted-foreground">{display || 0}/5</div>
          </div>

          <div>
            <label className="text-sm text-muted-foreground">Отзыв</label>
            <Input
              placeholder="Опционально"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
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
              try {
                await onConfirm(rating, feedback.trim() || undefined);
                onOpenChange(false);
              } catch {
                // Ошибку покажет родитель
              }
            }}
          >
            {loading ? 'Сохранение...' : 'Сохранить оценку'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
