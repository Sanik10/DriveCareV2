// path: apps/frontend/components/ui/input.tsx
/* eslint-disable react/prop-types */
'use client';
import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'flex h-11 w-full rounded-md border bg-white/90 px-3 py-2 text-sm text-fg-primary placeholder:text-smoke shadow-sm transition-all',
        'border-cloud focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--focus))]',
        'hover:shadow-md',
        'dark:bg-[hsl(var(--bg-elev-1))] dark:border-white/10',
        className
      )}
      {...props}
    />
  )
);
Input.displayName = 'Input';
