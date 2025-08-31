// path: apps/frontend/components/ui/status-badge.tsx
"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type OrderStatus = "new" | "in_progress" | "awaiting_parts" | "completed" | "canceled";

const STATUS_LABELS: Record<OrderStatus, string> = {
  new: "Новый",
  in_progress: "В работе",
  awaiting_parts: "Ожидание запчастей",
  completed: "Завершен",
  canceled: "Отменен",
};

const STATUS_STYLES: Record<OrderStatus, { text: string; bg: string; ring?: string; border?: string }> = {
  new: { text: "text-sky-400", bg: "bg-sky-500/10", ring: "ring-1 ring-sky-400/20", border: "border-sky-500/20" },
  in_progress: { text: "text-blue-400", bg: "bg-blue-500/10", ring: "ring-1 ring-blue-400/20", border: "border-blue-500/20" },
  awaiting_parts: { text: "text-amber-400", bg: "bg-amber-500/10", ring: "ring-1 ring-amber-400/20", border: "border-amber-500/20" },
  completed: { text: "text-emerald-400", bg: "bg-emerald-500/10", ring: "ring-1 ring-emerald-400/20", border: "border-emerald-500/20" },
  canceled: { text: "text-rose-400", bg: "bg-rose-500/10", ring: "ring-1 ring-rose-400/20", border: "border-rose-500/20" },
};

export function orderStatusLabel(status: OrderStatus): string {
  return STATUS_LABELS[status] || status;
}

type Props = {
  status: OrderStatus;
  variant?: "badge" | "pill";
  className?: string;
};

export function StatusBadge({ status, variant = "badge", className }: Props) {
  const s = STATUS_STYLES[status];
  return (
    <span
      className={cn(
        "inline-flex items-center",
        variant === "badge"
          ? "px-2 py-0.5 rounded-md text-xs border"
          : "px-2 py-0.5 rounded-full text-[11px] border",
        s.text,
        s.bg,
        s.border,
        className
      )}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
