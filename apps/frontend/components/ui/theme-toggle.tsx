// path: apps/frontend/components/ui/theme-toggle.tsx
"use client"

import * as React from "react"
import { Moon, Sun, Monitor, ChevronDown } from "lucide-react"
import { useTheme } from "@/app/providers/theme-provider"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const themeConfig = {
    light: { icon: Sun, label: "Светлая" },
    dark: { icon: Moon, label: "Тёмная" },
    system: { icon: Monitor, label: "Автоматическая" }
  }

  const CurrentIcon = themeConfig[theme]?.icon || Monitor

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-10 w-auto px-4 rounded-2xl glass border-border/50 hover:bg-surface-1 gap-2 transition-all duration-300"
        >
          <CurrentIcon className="h-4 w-4" />
          <span className="text-sm hidden sm:inline">
            {themeConfig[theme]?.label || "Тема"}
          </span>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        className="min-w-[160px] rounded-2xl glass border-border/50 shadow-glass-lg"
      >
        <DropdownMenuItem 
          onClick={() => setTheme("light")}
          className="gap-2 cursor-pointer rounded-xl transition-colors duration-200"
        >
          <Sun className="h-4 w-4" />
          <span>Светлая</span>
          {theme === "light" && <span className="ml-auto text-primary">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme("dark")}
          className="gap-2 cursor-pointer rounded-xl transition-colors duration-200"
        >
          <Moon className="h-4 w-4" />
          <span>Тёмная</span>
          {theme === "dark" && <span className="ml-auto text-primary">✓</span>}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme("system")}
          className="gap-2 cursor-pointer rounded-xl transition-colors duration-200"
        >
          <Monitor className="h-4 w-4" />
          <span>Автоматическая</span>
          {theme === "system" && <span className="ml-auto text-primary">✓</span>}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
