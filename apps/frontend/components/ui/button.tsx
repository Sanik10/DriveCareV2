// path: apps/frontend/components/ui/button.tsx
'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--focus))] focus-visible:ring-offset-2 ring-offset-white dark:ring-offset-black disabled:opacity-50 disabled:pointer-events-none select-none',
  {
    variants: {
      variant: {
        primary:
          // subtle gradient + breathing
          'text-fg-invert shadow-md animate-breath ' +
          'bg-[linear-gradient(135deg,hsl(var(--color-primary-600)),hsl(var(--color-primary-500)))] ' +
          'hover:brightness-105 active:brightness-95',
        accent:
          'text-fg-invert shadow-md animate-breath ' +
          'bg-[linear-gradient(135deg,hsl(var(--color-accent-600)),hsl(var(--color-accent-500)))] ' +
          'hover:brightness-105 active:brightness-95',
        secondary:
          'border border-cloud bg-[hsl(var(--bg-elev-1))] hover:bg-[hsl(var(--bg-elev-2))] text-fg-primary shadow-sm',
        ghost:
          'hover:bg-[hsl(var(--bg-elev-2))] text-fg-primary',
        destructive:
          'bg-[hsl(var(--color-danger))] text-white hover:brightness-105 active:brightness-95',
      },
      size: {
        sm: 'h-9 px-3',
        md: 'h-10 px-4',
        lg: 'h-11 px-6 text-[15px]',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({ className, variant, size, asChild, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  return <Comp className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
