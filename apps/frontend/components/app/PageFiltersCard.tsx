// components/app/PageFiltersCard.tsx
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface PageFiltersCardProps {
  children: React.ReactNode;
  className?: string;
}

export function PageFiltersCard({ children, className }: PageFiltersCardProps) {
  return (
    <Card className={cn(
      'p-4 glass border-border/30 rounded-3xl surface-glow',
      className
    )}>
      {children}
    </Card>
  );
}

// Обёртка для строк фильтров
export function PageFiltersRow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3', className)}>
      {children}
    </div>
  );
}

// Обёртка для дополнительных фильтров
export function PageFiltersAdvanced({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-6 gap-3">
      {children}
    </div>
  );
}
