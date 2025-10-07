// components/app/PageContentCard.tsx
import { RefreshCw, LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PageContentCardProps {
  children: React.ReactNode;
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  emptyState?: {
    icon: LucideIcon;
    title: string;
    description: string;
    action?: {
      label: string;
      onClick: () => void;
    };
  };
  onRetry?: () => void;
  loadingRows?: number;
  className?: string;
}

export function PageContentCard({
  children,
  loading,
  error,
  empty,
  emptyState,
  onRetry,
  loadingRows = 6,
  className,
}: PageContentCardProps) {
  return (
    <Card className={cn(
      'p-0 glass border-border/30 rounded-3xl surface-glow overflow-hidden',
      className
    )}>
      {loading ? (
        <div className="p-6 space-y-3">
          {[...Array(loadingRows)].map((_, i) => (
            <div key={i} className="h-16 bg-surface-1/40 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="p-10 text-center text-destructive">
          <div className="flex items-center justify-center gap-2 mb-3">
            <RefreshCw className="w-5 h-5" />
            <span className="font-medium">Ошибка загрузки</span>
          </div>
          <p className="text-sm mb-4">{error}</p>
          {onRetry && (
            <Button onClick={onRetry} className="rounded-2xl">
              <RefreshCw className="w-4 h-4 mr-2" />
              Повторить
            </Button>
          )}
        </div>
      ) : empty && emptyState ? (
        <div className="p-10 text-center text-muted-foreground">
          <emptyState.icon className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <h3 className="font-semibold mb-2">{emptyState.title}</h3>
          <p className="text-sm mb-4">{emptyState.description}</p>
          {emptyState.action && (
            <Button 
              onClick={emptyState.action.onClick}
              className="rounded-2xl bg-gradient-primary hover:opacity-90"
            >
              {emptyState.action.label}
            </Button>
          )}
        </div>
      ) : (
        children
      )}
    </Card>
  );
}
