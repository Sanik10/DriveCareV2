// path: apps/frontend/lib/types/payments.ts

export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'processed'
  | 'failed'
  | 'canceled'
  | 'refunded'
  | 'partially_refunded'
  | 'disputed'
  | 'chargeback'
  | 'expired';

export type PaymentCurrency = 'RUB' | 'USD' | 'EUR' | 'GBP' | 'CNY' | 'JPY' | 'KZT' | 'BYN' | 'UAH';

export interface PaymentMethodRef {
  name?: string;
  type?: string;
}

export interface PaymentInvoiceRef {
  invoiceNumber?: string;
  totalAmount?: number;
  status?: string;
}

export interface Payment {
  id: string;
  companyId: string;
  invoiceId: string;
  paymentMethodId: string;

  amount: number;
  currency: PaymentCurrency;
  paymentDate: string | Date;

  transactionId?: string;
  status: PaymentStatus;
  notes?: string;

  createdAt: string | Date;
  updatedAt: string | Date;

  // FX
  exchangeRate?: number;
  originalAmount?: number;
  originalCurrency?: PaymentCurrency;

  // Gateway
  gatewayFee?: number;

  // Relations
  invoice?: PaymentInvoiceRef;
  paymentMethod?: PaymentMethodRef;

  // UI helpers
  statusColor?: string;
  statusDisplay?: string;

  // Safe metadata
  safeMetadata?: Record<string, unknown>;
}

export interface PaginatedPaymentsResponse {
  items: Payment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext?: boolean;
  hasPrev?: boolean;

  // Дополнительные метрики
  totalAmount?: number;
  successfulPayments?: number;
  failedPayments?: number;
  refundAmount?: number;
}

export type PaymentsQuery = {
  page?: number;
  limit?: number;
  status?: PaymentStatus;
  invoiceId?: string;
  paymentMethodId?: string;
  amountFrom?: number;
  amountTo?: number;
  dateFrom?: string; // ISO YYYY-MM-DD
  dateTo?: string; // ISO YYYY-MM-DD
  search?: string;
  sortField?: 'paymentDate' | 'amount' | 'status' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
};

export type RefundPayload = {
  amount: number;
  reason: string;
  notes?: string;
  refundMethodId?: string;
};

export interface CompanyBalanceCurrencyBucket {
  received: number;
  refunded: number;
  net: number;
  pending: number;
}

export interface CompanyBalance {
  companyId: string;
  totalReceived: number;
  totalRefunded: number;
  netBalance: number;
  pendingAmount: number;
  disputedAmount: number;
  balanceByCurrency: Record<PaymentCurrency | string, CompanyBalanceCurrencyBucket>;
  lastUpdated: string | Date;

  // Доп. аналитика (может отсутствовать)
  totalTransactions?: number;
  averageTransactionAmount?: number;
  last30DaysBalance?: number;
  monthlyGrowthPercentage?: number;
}

export type PaymentInitResponse = {
  paymentId: string;
  provider: 'yookassa' | 'tinkoff';
  status: 'pending' | 'processing';
  redirectUrl: string;
  expiresAt?: string;
};
