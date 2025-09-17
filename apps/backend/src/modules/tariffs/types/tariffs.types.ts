// path: apps/backend/src/modules/tariffs/types/tariffs.types.ts
export type TariffStatus = 'active' | 'inactive';
export type SortOrder = 'asc' | 'desc';
export type TariffSortField =
  | 'name'
  | 'priceMonthly'
  | 'priceYearly'
  | 'createdAt'
  | 'activeSubscribers'
  | 'totalSubscribers';

export interface TariffFeatures {
  reports?: boolean;
  analytics?: boolean;
  api_access?: boolean;
  priority_support?: boolean;
  custom_fields?: boolean;
  integrations?: boolean;
  advanced_reports?: boolean;
  white_label?: boolean;
  [key: string]: any;
}

export interface CreateTariffData {
  name: string;
  description?: string;
  priceMonthly: number;
  priceYearly: number;
  maxUsers?: number | null;
  maxCustomers?: number | null;
  maxVehicles?: number | null;
  maxOrders?: number | null;
  features?: TariffFeatures;
  isActive?: boolean;
}

export interface UpdateTariffData {
  name?: string;
  description?: string;
  priceMonthly?: number;
  priceYearly?: number;
  maxUsers?: number | null;
  maxCustomers?: number | null;
  maxVehicles?: number | null;
  maxOrders?: number | null;
  features?: TariffFeatures;
  isActive?: boolean;
}

export interface TariffFilter {
  search?: string;
  isActive?: boolean;
  minPrice?: number;
  maxPrice?: number;
  // Расширенные бэкофис-фильтры по подписчикам
  minActiveSubscribers?: number; // уникальные компании с активной подпиской на текущий момент
  minTotalSubscribers?: number; // уникальные компании, когда-либо имевшие подписку
  page?: number;
  limit?: number;
  sortField?: TariffSortField;
  sortOrder?: SortOrder;
}

export interface PaginatedTariffsResult {
  items: any[]; // TariffResponseDto[]
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TariffComparison {
  feature: string;
  basic: boolean | string | number;
  standard: boolean | string | number;
  premium: boolean | string | number;
}

export interface TariffSubscribersMetrics {
  activeSubscribers: number;
  totalSubscribers: number;
}

export type TariffMetricsMap = Record<string, TariffSubscribersMetrics>;
