// src/modules/payment-methods/types/payment-methods.types.ts
import { RequestWithUser } from '../../auth/interfaces/request-with-user.interface';

export interface PaymentMethodsFilter {
  companyId?: string;
  type?: PaymentMethodType;
  isActive?: boolean;
  search?: string;
  supportsRefunds?: boolean;
  requiresVerification?: boolean;
  hasIntegration?: boolean;
  sortBy?: PaymentMethodSortBy; // Должно быть sortBy, не sortField
  sortOrder?: SortOrder;
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaymentMethodStats {
  total: number;
  active: number;
  inactive: number;
  byType: {
    type: string;
    count: number;
    percentage: number;
  }[];
  totalVolume: number;
  totalTransactions: number;
  totalFees: number;
  averageTransactionAmount: number;
}

export interface PaymentMethodConfig {
  processingFeePercent?: number;
  limits?: {
    minAmount?: number;
    maxAmount?: number;
    dailyTransactionLimit?: number;
  };
  installmentConfig?: {
    maxPeriodMonths: number;
    interestRate: number;
    minDownPaymentPercent: number;
  };
  integrationConfig?: {
    gatewayType: string;
    apiKey?: string;
    merchantId?: string;
    webhookUrl?: string;
    testMode: boolean;
  };
  requiresVerification?: boolean;
  supportsRefunds?: boolean;
}

export interface PaymentMethodUsageStats {
  transactionCount: number;
  totalVolume: number;
  averageAmount: number;
  successRate: number;
  totalFees: number;
  lastUsed?: Date;
  peakUsageHour?: number;
  peakUsageDay?: string;
}

export interface BulkUpdateResult {
  updated: number;
  failed: number;
  total: number;
  successRate: number;
  errors: string[];
  message: string;
}

export interface PaymentProcessingResult {
  success: boolean;
  transactionId?: string;
  amount: number;
  fee: number;
  gatewayResponse?: any;
  error?: string;
  timestamp: Date;
}

export interface IntegrationTestResult {
  paymentMethodId: string;
  gatewayType: string;
  connectionSuccessful: boolean;
  responseTime: number;
  features: {
    payment: boolean;
    refund: boolean;
    installments: boolean;
    webhooks: boolean;
  };
  errors: string[];
  lastTested: Date;
}

export type UserWithCompany = RequestWithUser['user'];

// 🔥 Enhanced PaymentMethod interface for business logic
export interface EnhancedPaymentMethod {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  type: string;
  isActive: boolean;
  config: PaymentMethodConfig;
  stats: PaymentMethodUsageStats;
  createdAt: Date;
  updatedAt: Date;
}

export enum PaymentMethodType {
  CASH = 'cash',
  CARD = 'card',
  BANK_TRANSFER = 'bank_transfer',
  INSTALLMENTS = 'installments',
  CORPORATE = 'corporate',
  DIGITAL_WALLET = 'digital_wallet',
  CRYPTOCURRENCY = 'cryptocurrency',
}

export type PaymentMethodSortBy = 'name' | 'type' | 'createdAt' | 'updatedAt' | 'transactionCount';
export type SortOrder = 'ASC' | 'DESC';