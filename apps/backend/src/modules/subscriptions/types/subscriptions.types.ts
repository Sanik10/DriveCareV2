// apps/backend/src/modules/subscriptions/types/subscriptions.types.ts
export { SubscriptionStatus } from '../../../database/entities/subscription.entity';

export type SortOrder = 'asc' | 'desc';
export type SubscriptionSortField = 'startDate' | 'endDate' | 'createdAt' | 'status';

// 🔥 Строгие типы для проверки лимитов
export type LimitCheckType = 'maxUsers' | 'maxCustomers' | 'maxVehicles' | 'maxOrders';

export interface SubscriptionFilter {
  companyId?: string;
  status?: import('../../../database/entities/subscription.entity').SubscriptionStatus;
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
  status?: import('../../../database/entities/subscription.entity').SubscriptionStatus; // будет игнорироваться (ставим PENDING в data-слое)
  paymentMethod?: string;
  autoRenew?: boolean;
}

export interface UpdateSubscriptionData {
  tariffId?: string;
  endDate?: Date;
  status?: import('../../../database/entities/subscription.entity').SubscriptionStatus;
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

// Сохраняем совместимость: возвращаем список DTO в пагинации
export interface PaginatedSubscriptionsResult {
  items: import('../dto/response/subscription-response.dto').SubscriptionResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

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
  status: import('../../../database/entities/subscription.entity').SubscriptionStatus;
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
