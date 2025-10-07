// components/app/StatsCard.tsx
import { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type StatsCardColor = 'default' | 'blue' | 'emerald' | 'amber' | 'red' | 'purple' | 'cyan';

const COLOR_STYLES: Record<StatsCardColor, {
  bg: string;
  border: string;
  text: string;
  iconBg: string;
}> = {
  default: {
    bg: 'from-surface-1/40 to-surface-2/40',
    border: 'border-border/30',
    text: 'text-muted-foreground',
    iconBg: 'bg-surface-1/40',
  },
  blue: {
    bg: 'from-blue-500/10 to-blue-600/5',
    border: 'border-blue-500/20',
    text: 'text-blue-600 dark:text-blue-400',
    iconBg: 'bg-blue-500/20',
  },
  emerald: {
    bg: 'from-emerald-500/10 to-emerald-600/5',
    border: 'border-emerald-500/20',
    text: 'text-emerald-600 dark:text-emerald-400',
    iconBg: 'bg-emerald-500/20',
  },
  amber: {
    bg: 'from-amber-500/10 to-amber-600/5',
    border: 'border-amber-500/20',
    text: 'text-amber-600 dark:text-amber-400',
    iconBg: 'bg-amber-500/20',
  },
  red: {
    bg: 'from-red-500/10 to-red-600/5',
    border: 'border-red-500/20',
    text: 'text-red-600 dark:text-red-400',
    iconBg: 'bg-red-500/20',
  },
  purple: {
    bg: 'from-purple-500/10 to-purple-600/5',
    border: 'border-purple-500/20',
    text: 'text-purple-600 dark:text-purple-400',
    iconBg: 'bg-purple-500/20',
  },
  cyan: {
    bg: 'from-cyan-500/10 to-cyan-600/5',
    border: 'border-cyan-500/20',
    text: 'text-cyan-600 dark:text-cyan-400',
    iconBg: 'bg-cyan-500/20',
  },
};

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  color?: StatsCardColor;
  highlight?: boolean;
  suffix?: string;
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  color = 'default',
  highlight = false,
  suffix,
}: StatsCardProps) {
  const styles = COLOR_STYLES[color];

  return (
    <Card className={cn(
      'p-4 glass border rounded-2xl bg-gradient-to-br transition-all duration-300 hover:scale-[1.02]',
      styles.bg,
      styles.border,
      highlight && 'animate-pulse'
    )}>
      <div className="flex items-center gap-3">
        <div className={cn('p-2 rounded-xl', styles.iconBg)}>
          <Icon className={cn('w-4 h-4', styles.text)} />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{title}</div>
          <div className="text-lg font-bold">
            {value}
            {suffix && <span className="text-sm ml-1">{suffix}</span>}
          </div>
        </div>
      </div>
    </Card>
  );
}

// Обёртка для grid stats
export function StatsGrid({ children, cols = 4 }: { children: React.ReactNode; cols?: 2 | 4 | 6 }) {
  return (
    <div className={cn(
      'grid gap-4',
      cols === 2 && 'grid-cols-1 md:grid-cols-2',
      cols === 4 && 'grid-cols-2 md:grid-cols-4',
      cols === 6 && 'grid-cols-2 md:grid-cols-6'
    )}>
      {children}
    </div>
  );
}
