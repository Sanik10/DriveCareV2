// path: apps/frontend/components/ui/card.tsx
'use client';
import * as React from 'react';
import { cn } from '@/lib/utils';

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-md bg-[hsl(var(--bg-elev-1))] shadow-md border border-cloud/60 p-5',
        className
      )}
      {...props}
    />
  );
}
