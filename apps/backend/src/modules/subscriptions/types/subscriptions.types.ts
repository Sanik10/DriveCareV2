export enum SubscriptionStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  SUSPENDED = 'suspended',
  CANCELED = 'canceled',
  EXPIRED = 'expired',
  INACTIVE = 'inactive',
}

export type SortOrder = 'asc' | 'desc';
export type SubscriptionSortField = 'startDate' | 'endDate' | 'createdAt' | 'status';

// 🔥 ДОБАВЛЕНО: Строгие типы для проверки лимитов
export type LimitCheckType = 'maxUsers' | 'maxCustomers' | 'maxVehicles' | 'maxOrders';

export interface SubscriptionFilter {
  companyId?: string;
  status?: SubscriptionStatus;
  page?: number;
  limit?: number;
  sortField?: SubscriptionSortField;
  sortOrder?: SortOrder;
}

export interface CreateSubscriptionData {
  companyId: string;
  tariffId: string;
  startDate?: Date;
  endDate: Date;
  status?: SubscriptionStatus;
  paymentMethod?: string;
  autoRenew?: boolean;
}

export interface UpdateSubscriptionData {
  tariffId?: string;
  endDate?: Date;
  status?: SubscriptionStatus;
  paymentMethod?: string;
  autoRenew?: boolean;
}

export interface TariffLimits {
  maxUsers: number | null;
  maxCustomers: number | null;
  maxVehicles: number | null;
  maxOrders: number | null;
}

export interface LimitCheckResult {
  allowed: boolean;
  currentCount: number;
  limit: number | null;
  limitType: string;
}

// 🔥 ИСПРАВЛЕНО: Убран any тип
export interface PaginatedSubscriptionsResult {
  items: import('../dto/response/subscription-response.dto').SubscriptionResponseDto[]; // 🔥 СТРОГИЙ ТИП
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// 🔥 ДОБАВЛЕНО: Новые типы для улучшенной типизации
export interface SubscriptionRenewalInfo {
  id: string;
  companyId: string;
  currentEndDate: Date;
  autoRenew: boolean;
  tariffId: string;
  monthlyPrice: number;
  yearlyPrice: number;
}

export interface SubscriptionStatsInfo {
  id: string;
  companyId: string;
  status: SubscriptionStatus;
  startDate: Date;
  endDate: Date;
  daysRemaining: number;
  isExpiringSoon: boolean;
}

export interface CompanySubscriptionLimitsInfo {
  companyId: string;
  tariffName: string;
  limits: {
    users: { current: number; max: number | null; percentage: number | null };
    customers: { current: number; max: number | null; percentage: number | null };
    vehicles: { current: number; max: number | null; percentage: number | null };
    orders: { current: number; max: number | null; percentage: number | null };
  };
  isUnlimited: boolean;
}

export interface MultipleLimitCheck {
  type: LimitCheckType;
  currentCount: number;
  increment?: number;
}

export interface MultipleLimitCheckResult {
  companyId: string;
  checks: Array<{
    type: LimitCheckType;
    allowed: boolean;
    currentCount: number;
    limit: number | null;
    remaining: number | null;
  }>;
  allPassed: boolean;
}
