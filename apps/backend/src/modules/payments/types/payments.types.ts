// apps/backend/src/modules/payments/types/payments.types.ts
import { AuthRole } from '../../auth/types/auth.types';

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

export type UserWithCompany = {
  id: string;
  companyId: string;
  role: AuthRole;
  email?: string;
  firstName?: string;   // ← добавлено
  lastName?: string;    // ← добавлено
};

export type CreatePaymentData = {
  companyId: string;
  invoiceId: string;
  paymentMethodId: string;

  amount: number;
  currency?: PaymentCurrency;
  paymentDate?: Date;

  transactionId?: string | null;
  status?: PaymentStatus;
  notes?: string | null;

  // FX
  exchangeRate?: number | null;
  originalAmount?: number | null;
  originalCurrency?: PaymentCurrency | null;

  // Gateway
  gatewayTransactionId?: string | null;
  gatewayFee?: number | null;
  gatewayResponse?: Record<string, any> | null;

  // клиентские метаданные (вход)
  metadata?: Record<string, any> | undefined;

  // безопасные метаданные (в БД)
  safeMetadata?: Record<string, any> | null;

  // 54-ФЗ (если включено)
  vatRate?: number | null;
  vatAmount?: number | null;

  // 152-ФЗ
  pdpConsentVersion?: string | null;
  pdpConsentDate?: Date | null;
  dataRetentionUntil?: Date | null;
};

export type UpdatePaymentData = {
  status?: PaymentStatus;
  transactionId?: string | null;
  notes?: string | null;

  gatewayTransactionId?: string | null;
  gatewayFee?: number | null;

  safeMetadata?: Record<string, any> | null;

  // Фискальные поля (после чека)
  fiscalReceiptNumber?: string | null;
  fiscalReceiptDate?: Date | null;
  kktSerialNumber?: string | null;
  fiscalDocumentNumber?: string | null;
  fiscalDocumentAttribute?: string | null;

  // НДС
  vatRate?: number | null;
  vatAmount?: number | null;

  // Данные фискального возврата
  fiscalRefundReceiptNumber?: string | null;
  fiscalRefundDate?: Date | null;
};

export type RefundData = {
  amount: number;
  reason: string;
  notes?: string;
  refundMethodId?: string;
};

export type PaymentFilter = {
  companyId?: string;
  invoiceId?: string;
  paymentMethodId?: string;
  status?: PaymentStatus;

  amountFrom?: number;
  amountTo?: number;

  dateFrom?: Date;
  dateTo?: Date;

  search?: string;

  page?: number;
  limit?: number;

  sortField?: string;
  sortOrder?: 'asc' | 'desc';
};

export type PaymentStatistics = {
  total: number;
  byStatus: Record<string, number>;
  byCurrency: Record<string, number>;
  byPaymentMethod: Record<string, number>;

  totalAmount: number;
  totalAmountByCurrency: Record<string, number>;

  thisMonth: number;
  thisMonthAmount: number;
  avgPaymentAmount: number;
  avgPaymentTime: number;

  successRate: number;
  refundRate: number;
};

export type CompanyBalance = {
  companyId: string;
  totalReceived: number;
  totalRefunded: number;
  netBalance: number;
  pendingAmount: number;
  disputedAmount: number;
  balanceByCurrency: Record<PaymentCurrency, { received: number; refunded: number; net: number; pending: number }>;
  lastUpdated: Date;
};
