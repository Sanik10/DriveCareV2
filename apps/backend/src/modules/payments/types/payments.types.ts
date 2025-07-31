// src/modules/payments/types/payments.types.ts (ИСПРАВЛЕННАЯ ВЕРСИЯ)
import { AuthRole } from '../../auth/types/auth.types';

// ✅ ЕДИНЫЙ ENUM СТАТУСОВ (убираем дублирование)
export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing', 
  PROCESSED = 'processed',
  FAILED = 'failed',
  CANCELED = 'canceled',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
  DISPUTED = 'disputed',
  CHARGEBACK = 'chargeback',
  EXPIRED = 'expired',
}

// ✅ УБИРАЕМ ExtendedPaymentStatus - используем только PaymentStatus

// ✅ ЕДИНЫЙ ENUM ВАЛЮТ
export enum PaymentCurrency {
  RUB = 'RUB',
  USD = 'USD', 
  EUR = 'EUR',
  GBP = 'GBP',
  CNY = 'CNY',
  JPY = 'JPY',
  KZT = 'KZT',
  BYN = 'BYN',
  UAH = 'UAH',
}

// ✅ ТИПЫ ПЛАТЕЖНЫХ МЕТОДОВ
export enum PaymentMethodType {
  CASH = 'cash',
  CARD = 'card',
  BANK_TRANSFER = 'bank_transfer',
  INSTALLMENTS = 'installments',
  CORPORATE = 'corporate',
  DIGITAL_WALLET = 'digital_wallet',
  CRYPTO = 'crypto',
  CHECK = 'check',
  WIRE_TRANSFER = 'wire_transfer',
}

// ✅ ОБНОВЛЯЕМ ВСЕ ИНТЕРФЕЙСЫ (PaymentStatus вместо ExtendedPaymentStatus)
export interface PaymentFilter {
  companyId?: string;
  invoiceId?: string;
  paymentMethodId?: string;
  status?: PaymentStatus; // ✅ ИСПРАВЛЕНО
  currency?: PaymentCurrency;
  amountFrom?: number;
  amountTo?: number;
  dateFrom?: Date;
  dateTo?: Date;
  transactionId?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreatePaymentData {
  companyId: string;
  invoiceId: string;
  paymentMethodId: string;
  amount: number;
  currency?: PaymentCurrency;
  paymentDate?: Date;
  transactionId?: string;
  status?: PaymentStatus; // ✅ ИСПРАВЛЕНО
  notes?: string;
  exchangeRate?: number;
  originalAmount?: number;
  originalCurrency?: PaymentCurrency;
  gatewayTransactionId?: string;
  gatewayResponse?: Record<string, any>;
  gatewayFee?: number;
  metadata?: Record<string, any>;
}

export interface UpdatePaymentData {
  status?: PaymentStatus; // ✅ ИСПРАВЛЕНО
  transactionId?: string;
  notes?: string;
  gatewayTransactionId?: string;
  gatewayResponse?: Record<string, any>;
  gatewayFee?: number;
  metadata?: Record<string, any>;
}

export interface UserWithCompany {
  id: string;
  email: string;
  role: AuthRole;
  companyId: string;
  firstName?: string;
  lastName?: string;
}

export interface PaymentStatistics {
  total: number;
  byStatus: Record<PaymentStatus, number>; // ✅ ИСПРАВЛЕНО
  byCurrency: Record<PaymentCurrency, number>;
  byPaymentMethod: Record<string, number>;
  totalAmount: number;
  totalAmountByCurrency: Record<PaymentCurrency, number>;
  thisMonth: number;
  thisMonthAmount: number;
  avgPaymentAmount: number;
  avgPaymentTime: number;
  successRate: number;
  refundRate: number;
}

export interface CompanyBalance {
  companyId: string;
  totalReceived: number;
  totalRefunded: number;
  netBalance: number;
  pendingAmount: number;
  disputedAmount: number;
  balanceByCurrency: Record<PaymentCurrency, {
    received: number;
    refunded: number;
    net: number;
    pending: number;
  }>;
  lastUpdated: Date;
}

export interface RefundData {
  paymentId: string;
  amount: number;
  reason: string;
  notes?: string;
  refundMethodId?: string;
}

export interface PaymentReport {
  period: { from: Date; to: Date };
  summary: {
    totalPayments: number;
    totalAmount: number;
    successfulPayments: number;
    failedPayments: number;
    refunds: number;
    refundAmount: number;
    disputes: number;
    disputeAmount: number;
  };
  byStatus: Array<{
    status: PaymentStatus; // ✅ ИСПРАВЛЕНО
    count: number;
    amount: number;
    percentage: number;
  }>;
  byCurrency: Array<{
    currency: PaymentCurrency;
    count: number;
    amount: number;
    percentage: number;
  }>;
  byPaymentMethod: Array<{
    methodId: string;
    methodName: string;
    count: number;
    amount: number;
    percentage: number;
    avgAmount: number;
  }>;
  trends: {
    dailyVolume: Array<{ date: Date; amount: number; count: number }>;
    hourlyDistribution: Array<{ hour: number; count: number }>;
  };
}
