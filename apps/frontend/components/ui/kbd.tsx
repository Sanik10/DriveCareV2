// path: apps/frontend/components/ui/kbd.tsx
import * as React from "react";
import { cn } from "@/lib/utils";

export function Kbd({ className, children }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <kbd
      className={cn(
        "inline-flex items-center justify-center rounded-md border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-foreground/80",
        className
      )}
    >
      {children}
    </kbd>
  );
}
