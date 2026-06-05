// path: apps/frontend/components/app/PageFiltersCard.tsx
import * as React from "react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface PageFiltersCardProps {
  children: React.ReactNode
  className?: string
}

export function PageFiltersCard({ children, className }: PageFiltersCardProps) {
  return (
    <Card className={cn("p-lg shadow-none", className)}>
      {children}
    </Card>
  )
}

export function PageFiltersRow({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col lg:flex-row lg:items-center gap-md", className)}>
      {children}
    </div>
  )
}

export function PageFiltersAdvanced({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-md pt-md mt-md border-t border-border/50">
      {children}
    </div>
  )
}
