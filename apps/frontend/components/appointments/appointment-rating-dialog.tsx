// path: apps/frontend/components/appointments/appointment-rating-dialog.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { Star } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Kbd } from '@/components/ui/kbd';

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
      <DialogContent glow className="max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-yellow-500/20 flex items-center justify-center text-yellow-600 dark:text-yellow-400">
              <Star className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Оценить работу</DialogTitle>
              <DialogDescription>Выберите оценку от 1 до 5 и оставьте отзыв (опционально)</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <div className="text-xs text-muted-foreground mb-2">Ваша оценка</div>
            <div className="flex items-center gap-2">
              {([1, 2, 3, 4, 5] as const).map((i) => (
                <button
                  key={i}
                  type="button"
                  className="p-1 rounded-md hover:bg-muted/50 transition-colors"
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => setRating(i)}
                  aria-label={`Оценка ${i}`}
                >
                  <Star
                    className="w-6 h-6 transition-all"
                    strokeWidth={2}
                    fill={(display ?? 0) >= i ? 'currentColor' : 'none'}
                  />
                </button>
              ))}
              <div className="ml-2 text-sm text-muted-foreground">{display || 0}/5</div>
            </div>
          </div>

          <div>
            <div className="text-xs text-muted-foreground mb-1">Отзыв</div>
            <Input
              placeholder="Опционально"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
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
