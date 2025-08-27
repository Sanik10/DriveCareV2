// path: apps/frontend/components/ui/skeleton.tsx
'use client';
import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-cloud/60 dark:bg-white/10', className)} />;
}
