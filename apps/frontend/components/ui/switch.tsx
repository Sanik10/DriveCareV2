// path: apps/frontend/components/ui/switch.tsx
import * as React from "react"
import { cn } from "@/lib/utils"

export interface SwitchProps {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  className?: string
  size?: 'sm' | 'default' | 'lg'
}

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ className, checked = false, onCheckedChange, disabled = false, size = 'default', ...props }, ref) => {
    const sizeClasses = {
      sm: 'h-5 w-9',
      default: 'h-6 w-11', 
      lg: 'h-7 w-14'
    }
    
    const thumbSizeClasses = {
      sm: 'h-4 w-4',
      default: 'h-5 w-5',
      lg: 'h-6 w-6'
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
          'peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50',
          checked 
            ? 'bg-gradient-primary shadow-glass' 
            : 'bg-input hover:bg-muted',
          sizeClasses[size],
          className
        )}
        {...props}
      >
        <span
          className={cn(
            'pointer-events-none block rounded-full bg-background shadow-lg ring-0 transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0',
            size === 'sm' && (checked ? 'translate-x-4' : 'translate-x-0'),
            size === 'lg' && (checked ? 'translate-x-7' : 'translate-x-0'),
            thumbSizeClasses[size]
          )}
        />
      </button>
    )
  }
)
Switch.displayName = "Switch"

export { Switch }
