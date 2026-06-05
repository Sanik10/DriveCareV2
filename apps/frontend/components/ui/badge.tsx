// path: apps/frontend/components/ui/badge.tsx
import * as React from "react"
import { cn } from "@/lib/utils"

// DriveCare V1.1: 5 строгих статусов.
// Активен (Зеленый), Ожидание (Желтый), В работе (Синий), Ошибка (Красный), Черновик (Серый)
const badgeVariants = {
  // Базовые UI-состояния
  default: "bg-primary/10 text-primary border-primary/20",
  secondary: "bg-secondary text-secondary-foreground border-border",
  outline: "bg-transparent text-foreground border-border",

  // Системные статусы (цвета берутся из tailwind.config.ts)
  active: "bg-status-active/10 text-status-active border-status-active/20",
  pending: "bg-status-pending/10 text-status-pending border-status-pending/20",
  progress: "bg-status-progress/10 text-status-progress border-status-progress/20",
  error: "bg-status-error/10 text-status-error border-status-error/20",
  draft: "bg-status-draft/10 text-status-draft border-status-draft/20",
}

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: keyof typeof badgeVariants
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        // Строго: никаких случайных px/py. Высота фикс, боковые отступы по шкале.
        "inline-flex h-5 items-center rounded-md border px-sm text-xs font-medium leading-none whitespace-nowrap select-none",
        badgeVariants[variant],
        className
      )}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
