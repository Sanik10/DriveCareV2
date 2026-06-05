// path: apps/frontend/components/ui/input.tsx
import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, required, id, disabled, ...props }, ref) => {
    // Автоматическая генерация ID для связки label и input, если ID не передан
    const generatedId = React.useId()
    const inputId = id || generatedId
    const errorId = `${inputId}-error`

    return (
      <div className="w-full flex flex-col gap-xs min-w-0">
        {/* Название поля + обязательность */}
        {label && (
          <label
            htmlFor={inputId}
            className={cn(
              "text-sm font-medium leading-none text-foreground",
              disabled && "opacity-70 cursor-not-allowed"
            )}
          >
            {label}{" "}
            {required && (
              <span className="text-destructive" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}

        <input
          id={inputId}
          type={type}
          required={required}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            "flex h-10 w-full min-w-0 rounded-md border border-input bg-background px-md text-sm transition-colors",
            "placeholder:text-muted-foreground",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "hover:border-border/80",
            // Фокус единый через globals.css (*:focus-visible).
            // Но если есть ошибка — делаем фокус красным (переопределяем outline-color).
            error && "border-destructive focus-visible:outline-destructive",
            className
          )}
          ref={ref}
          {...props}
        />

        {/* Описание ошибки */}
        {error && (
          <p id={errorId} className="text-xs text-destructive">
            {error}
          </p>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
