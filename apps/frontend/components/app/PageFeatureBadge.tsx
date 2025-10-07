// components/app/PageFeatureBadge.tsx
import { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type FeatureBadgeVariant = 
  | 'indigo-purple'   // Appointments
  | 'emerald-green'   // Vehicles  
  | 'blue-indigo'     // Services
  | 'pink-rose'       // Customers
  | 'orange-amber'    // Orders
  | 'cyan-blue'       // Parts
  | 'violet-purple'   // Invoices
  | 'emerald-teal'    // Payments
  | 'slate-gray'      // Users
  | 'purple-fuchsia'; // Platform

const VARIANT_STYLES: Record<FeatureBadgeVariant, {
  border: string;
  bg: string;
  icon: string;
  text: string;
}> = {
  'indigo-purple': {
    border: 'border-indigo-500/20',
    bg: 'bg-gradient-to-r from-indigo-500/5 to-purple-500/5',
    icon: 'bg-gradient-to-r from-indigo-500 to-purple-500',
    text: 'text-indigo-600 dark:text-indigo-400',
  },
  'emerald-green': {
    border: 'border-emerald-500/20',
    bg: 'bg-gradient-to-r from-emerald-500/5 to-green-500/5',
    icon: 'bg-gradient-to-r from-emerald-500 to-green-500',
    text: 'text-emerald-600 dark:text-emerald-400',
  },
  'blue-indigo': {
    border: 'border-blue-500/20',
    bg: 'bg-gradient-to-r from-blue-500/5 to-indigo-500/5',
    icon: 'bg-gradient-to-r from-blue-500 to-indigo-500',
    text: 'text-blue-600 dark:text-blue-400',
  },
  'pink-rose': {
    border: 'border-pink-500/20',
    bg: 'bg-gradient-to-r from-pink-500/5 to-rose-500/5',
    icon: 'bg-gradient-to-r from-pink-500 to-rose-500',
    text: 'text-pink-600 dark:text-pink-400',
  },
  'orange-amber': {
    border: 'border-orange-500/20',
    bg: 'bg-gradient-to-r from-orange-500/5 to-amber-500/5',
    icon: 'bg-gradient-to-r from-orange-500 to-amber-500',
    text: 'text-orange-600 dark:text-orange-400',
  },
  'cyan-blue': {
    border: 'border-cyan-500/20',
    bg: 'bg-gradient-to-r from-cyan-500/5 to-blue-500/5',
    icon: 'bg-gradient-to-r from-cyan-500 to-blue-500',
    text: 'text-cyan-600 dark:text-cyan-400',
  },
  'violet-purple': {
    border: 'border-violet-500/20',
    bg: 'bg-gradient-to-r from-violet-500/5 to-purple-500/5',
    icon: 'bg-gradient-to-r from-violet-500 to-purple-500',
    text: 'text-violet-600 dark:text-violet-400',
  },
  'emerald-teal': {
    border: 'border-emerald-500/20',
    bg: 'bg-gradient-to-r from-emerald-500/5 to-teal-500/5',
    icon: 'bg-gradient-to-r from-emerald-500 to-teal-500',
    text: 'text-emerald-600 dark:text-emerald-400',
  },
  'slate-gray': {
    border: 'border-slate-500/20',
    bg: 'bg-gradient-to-r from-slate-500/5 to-gray-500/5',
    icon: 'bg-gradient-to-r from-slate-500 to-gray-500',
    text: 'text-slate-600 dark:text-slate-400',
  },
  'purple-fuchsia': {
    border: 'border-purple-500/20',
    bg: 'bg-gradient-to-r from-purple-500/5 to-fuchsia-500/5',
    icon: 'bg-gradient-to-r from-purple-500 to-fuchsia-500',
    text: 'text-purple-600 dark:text-purple-400',
  },
};

interface PageFeatureBadgeProps {
  variant: FeatureBadgeVariant;
  icon: LucideIcon;
  title: string;
  description: string;
  aside?: React.ReactNode; // Доп. контент справа
}

export function PageFeatureBadge({
  variant,
  icon: Icon,
  title,
  description,
  aside,
}: PageFeatureBadgeProps) {
  const styles = VARIANT_STYLES[variant];

  return (
    <Card className={cn('p-4 glass rounded-3xl', styles.border, styles.bg)}>
      <div className="flex items-center gap-3">
        <div className={cn('p-2 rounded-xl', styles.icon)}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={cn('font-semibold', styles.text)}>{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {aside && <div className="ml-auto">{aside}</div>}
      </div>
    </Card>
  );
}
