// path: apps/frontend/components/ui/badge.tsx
import * as React from "react"
import { cn } from "@/lib/utils"

const badgeVariants = {
  default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
  secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80", 
  destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
  outline: "text-foreground border-border",
  success: "border-transparent bg-emerald-500/20 text-emerald-600 border-emerald-500/30",
  warning: "border-transparent bg-amber-500/20 text-amber-600 border-amber-500/30",
  info: "border-transparent bg-blue-500/20 text-blue-600 border-blue-500/30",
  new: "border-transparent bg-sky-500/20 text-sky-600 border-sky-500/30",
  inProgress: "border-transparent bg-blue-500/20 text-blue-600 border-blue-500/30",
  awaitingParts: "border-transparent bg-amber-500/20 text-amber-600 border-amber-500/30",
  completed: "border-transparent bg-emerald-500/20 text-emerald-600 border-emerald-500/30",
  canceled: "border-transparent bg-rose-500/20 text-rose-600 border-rose-500/30",
}

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: keyof typeof badgeVariants
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div 
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        badgeVariants[variant],
        className
      )} 
      {...props} 
    />
  )
}

export { Badge, badgeVariants }
