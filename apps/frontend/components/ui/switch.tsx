// components/ui/switch.tsx
import * as React from "react"
import { cn } from "@/lib/utils"

export interface SwitchProps {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  className?: string
  size?: "sm" | "default" | "lg"
}

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ className, checked = false, onCheckedChange, disabled = false, size = "default", ...props }, ref) => {
    const sizeClasses = {
      sm: "h-5 w-9",
      default: "h-6 w-11",
      lg: "h-7 w-14",
    }

    const thumbSizeClasses = {
      sm: "h-4 w-4",
      default: "h-5 w-5",
      lg: "h-6 w-6",
    }

    const translateClasses = {
      sm: checked ? "translate-x-4" : "translate-x-0",
      default: checked ? "translate-x-5" : "translate-x-0",
      lg: checked ? "translate-x-7" : "translate-x-0",
    }

    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onCheckedChange?.(!checked)}
        className={cn(
          "inline-flex shrink-0 cursor-pointer items-center rounded-full border transition-colors",
          "disabled:cursor-not-allowed disabled:opacity-50",
          checked ? "bg-primary border-primary/30" : "bg-surface-2 border-border",
          sizeClasses[size],
          className
        )}
        {...props}
      >
        <span
          className={cn(
            "pointer-events-none block rounded-full bg-background border border-border transition-transform",
            "shadow-sm",
            thumbSizeClasses[size],
            translateClasses[size]
          )}
        />
      </button>
    )
  }
)
Switch.displayName = "Switch"

export { Switch }
