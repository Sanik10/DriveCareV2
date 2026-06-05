// path: apps/frontend/components/app/PaginationControls.tsx
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
    // Контролы пагинации обычно находятся внизу таблицы/списка. Отступы py-md.
    <div className="flex flex-col sm:flex-row items-center justify-between gap-md py-md mt-sm border-t border-border/50">
      <div className="text-sm text-muted-foreground">
        Показано: <span className="font-medium text-foreground">{showing}</span> из <span className="font-medium text-foreground">{total}</span> {itemLabel}
      </div>
      
      <div className="flex items-center gap-sm">
        <Button
          variant="secondary"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          Назад
        </Button>
        
        {/* Строгий счетчик страниц без лишних фонов */}
        <div className="text-sm font-medium text-foreground min-w-[3rem] text-center">
          {page} / {totalPages}
        </div>
        
        <Button
          variant="secondary"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Далее
        </Button>
      </div>
    </div>
  );
}
