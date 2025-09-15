// path: apps/frontend/lib/types/payment-methods.ts
export type PaymentMethodType =
  | "cash"
  | "card"
  | "bank_transfer"
  | "installments"
  | "corporate"
  | "digital_wallet"
  | "cryptocurrency";

export interface PaymentMethodLimits {
  minAmount?: number;
  maxAmount?: number;
  dailyTransactionLimit?: number;
}

export interface InstallmentConfig {
  maxPeriodMonths: number;
  interestRate: number;
  minDownPaymentPercent: number;
}

export interface IntegrationStatus {
  isConfigured: boolean;
  gatewayType?: string;
  testMode: boolean;
  lastConnectionCheck?: string;
}

export interface PaymentMethodStats {
  transactionCount: number;
  totalVolume: number;
  averageAmount: number;
  successRate: number;
  totalFees: number;
}

export interface PaymentMethodResponse {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  type: PaymentMethodType | string;
  processingFeePercent?: number;
  isActive: boolean;
  limits?: PaymentMethodLimits;
  installmentConfig?: InstallmentConfig;
  integrationStatus?: IntegrationStatus;
  stats?: PaymentMethodStats;
  createdAt: string;
  updatedAt: string;

  // дополнительные флаги из OpenAPI (допустимы в запросах/ответах)
  requiresVerification?: boolean;
  supportsRefunds?: boolean;
}

export interface PaymentMethodsPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface PaginatedPaymentMethodsResponse {
  data: PaymentMethodResponse[];
  pagination: PaymentMethodsPagination;
}

/**
 * Нормализованный формат для UI (единый стиль со страницами Customers/Vehicles)
 */
export interface PaginatedPaymentMethodsUI {
  items: PaymentMethodResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaymentMethodsQuery {
  page?: number;
  limit?: number;
  search?: string;
  type?: PaymentMethodType | string;
  sortBy?: "name" | "type" | "createdAt" | "updatedAt" | "transactionCount";
  sortOrder?: "ASC" | "DESC";
  hasIntegration?: boolean;
  requiresVerification?: boolean;
  supportsRefunds?: boolean;
  isActive?: boolean;
}

// Create DTO (соответствует CreatePaymentMethodDto на бэке)
export interface PaymentMethodCreateRequest {
  name: string;
  description?: string;
  type: PaymentMethodType | string;
  processingFeePercent?: number;
  isActive?: boolean;
  limits?: PaymentMethodLimits;
  installmentConfig?: Partial<InstallmentConfig>;
  integrationConfig?: {
    gatewayType: string; // свободный ввод, т.к. список шлюзов берется из констант на бэке
    apiKey?: string;
    merchantId?: string;
    webhookUrl?: string;
    testMode: boolean;
  };
  requiresVerification?: boolean;
  supportsRefunds?: boolean;
}

// Update DTO (Partial от Create)
export type PaymentMethodUpdateRequest = Partial<PaymentMethodCreateRequest>;

// Calculate-fee DTO (если понадобится)
export interface CalculateFeeRequest {
  amount: number;
}

/**
 * Ответ проверки интеграции
 */
export interface TestIntegrationResponse {
  ok: boolean;
  status: 'ok' | 'warning' | 'error' | string;
  message?: string;
  checkedAt?: string;
  gateway?: string;
  testMode?: boolean;
}

/**
 * Ответ расчёта комиссии
 */
export interface CalculateFeeResponse {
  amount: number; // исходная сумма
  fee: number;    // рассчитанная комиссия
  total: number;  // сумма + комиссия
  percent?: number;
  currency?: string; // напр., 'RUB'
}
