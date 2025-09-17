// path: apps/frontend/lib/types/tariffs.ts

export type TariffID = string;

export interface TariffFeatures {
  // Функциональные флаги
  reports?: boolean;
  analytics?: boolean;
  api_access?: boolean;
  priority_support?: boolean;
  custom_fields?: boolean;
  integrations?: boolean;
  advanced_reports?: boolean;
  white_label?: boolean;

  // Маркетинг/витрина
  recommended?: boolean;
  badge?: string;
  tags?: string[];
  highlight?: boolean;
  shelf_position?: number | string;
  showcase_rank?: 1 | 2 | 3 | number | string;

  // Дополнительные произвольные ключи (совместимость)
  [key: string]: unknown;
}

export interface Tariff {
  id: TariffID;
  name: string;
  description?: string;

  priceMonthly: number;
  priceYearly: number;
  yearlyDiscount?: number;

  maxUsers?: number | null;
  maxCustomers?: number | null;
  maxVehicles?: number | null;
  maxOrders?: number | null;

  features?: TariffFeatures;

  isActive: boolean;
  createdAt: string;
  updatedAt: string;

  // Совместимость
  subscriptionsCount?: number; // = activeSubscribers
  isRecommended?: boolean;

  // Новые метрики для бэкофиса
  activeSubscribers?: number;
  totalSubscribers?: number;
}

export interface TariffsPaginated {
  items: Tariff[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type TariffSortField =
  | 'name'
  | 'priceMonthly'
  | 'priceYearly'
  | 'createdAt'
  | 'activeSubscribers'
  | 'totalSubscribers';
export type SortOrder = 'asc' | 'desc';

export interface TariffListParams {
  search?: string;
  isActive?: boolean;
  minPrice?: number;
  maxPrice?: number;
  // Расширенные фильтры
  minActiveSubscribers?: number;
  minTotalSubscribers?: number;

  page?: number;
  limit?: number;
  sortField?: TariffSortField;
  sortOrder?: SortOrder;
}
