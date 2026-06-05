// path: apps/frontend/components/ui/status-badge.tsx
"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"

export type OrderStatus =
  | "new"
  | "in_progress"
  | "awaiting_parts"
  | "completed"
  | "canceled"

const STATUS_LABELS: Record<OrderStatus, string> = {
  new: "Новый",
  in_progress: "В работе",
  awaiting_parts: "Ожидание запчастей",
  completed: "Завершен",
  canceled: "Отменен",
}

// Жестко мапим бизнес-статусы заказа на 5 разрешенных системных статусов
const STATUS_MAPPING: Record<
  OrderStatus,
  "draft" | "progress" | "pending" | "active" | "error"
> = {
  new: "draft", // Новый -> Серый (Черновик)
  in_progress: "progress", // В работе -> Синий (Прогресс)
  awaiting_parts: "pending", // Ожидание -> Желтый (Пендинг)
  completed: "active", // Завершен -> Зеленый (Активен/Успех)
  canceled: "error", // Отменен -> Красный (Ошибка/Отказ)
}

export function orderStatusLabel(status: OrderStatus): string {
  return STATUS_LABELS[status] ?? String(status)
}

type Props = {
  status: OrderStatus
  className?: string
}

// StatusBadge использует системный Badge. Никакого дублирования кода и стилей.
export function StatusBadge({ status, className }: Props) {
  const variant = STATUS_MAPPING[status] ?? "draft"
  const label = STATUS_LABELS[status] ?? String(status)

  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  )
}
