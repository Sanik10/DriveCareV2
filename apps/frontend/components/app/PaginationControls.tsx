// components/app/PaginationControls.tsx
import { Button } from '@/components/ui/button';

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  total: number;
  showing: number;
  onPageChange: (page: number) => void;
  itemLabel?: string; // 'автомобилей', 'записей' и тд
}

export function PaginationControls({
  page,
  totalPages,
  total,
  showing,
  onPageChange,
  itemLabel = 'элементов',
}: PaginationControlsProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between">
      <div className="text-sm text-muted-foreground">
        Показано: {showing} из {total} {itemLabel}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          className="rounded-2xl btn-outline-fixed"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          Назад
        </Button>
        <span className="text-sm px-3 py-1 rounded-xl bg-surface-1/60">
          {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          className="rounded-2xl btn-outline-fixed"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Далее
        </Button>
      </div>
    </div>
  );
}
