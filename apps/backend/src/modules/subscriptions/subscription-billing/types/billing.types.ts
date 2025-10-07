// path: apps/backend/src/modules/subscriptions/subscription-billing/types/billing.types.ts

// Providers
export type BillingProvider = 'yookassa' | 'tinkoff';

// Billing period
export type BillingPeriod = 'monthly' | 'yearly';

// Audit / user context
export interface AuditContext {
  userId?: string;
  companyId?: string;
  requestId?: string;
  correlationId?: string;
  ipAddress?: string;
  userAgent?: string;
  idempotencyKey?: string; // <— добавлено
}

export interface UserContext {
  userId: string;
  companyId: string;
  ipAddress?: string;
  userAgent?: string;
  role?: string;
}

export interface FinancialOperation {
  type: 'subscription_creation' | 'payment_processing' | 'subscription_cancellation' | 'refund';
  companyId: string;
  amount?: number;
  textFields?: string[];
  parameters?: Record<string, any>;
}

// Payment types
export type RubCurrency = 'RUB';

export type PaymentMethod =
  | 'card'
  | 'mir'
  | 'sbp'
  | 'wallet'
  | 'bank_transfer';

export interface CardData {
  panMasked?: string;
  bin?: string;
  last4?: string;
  brand?: string;
}

export interface PaymentData {
  amount: number;
  currency: RubCurrency;
  paymentMethod: PaymentMethod;
  gatewayProvider: BillingProvider;
  metadata?: Record<string, any>;
  cardData?: CardData;
}

export interface PaymentResult {
  id: string; // gateway payment id
  status: 'pending' | 'succeeded' | 'failed';
  gatewayTransactionId?: string;
  raw?: Record<string, any>;
  mirDetected?: boolean;
  redirectUrl?: string;
  provider: BillingProvider;
}

export interface PaymentStatus {
  id: string;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded' | 'cancelled';
}

// Compliance types
export interface ComplianceCheckResult {
  compliant: boolean;
  law: string;
  checkDate: Date;
  details?: Record<string, any>;
}

export interface NPSComplianceResult {
  mirSupported: boolean;
  paymentMethod: string;
  compliant: boolean;
  requiresMirOption: boolean;
}

export interface ConsumerRightsResult {
  rights: {
    coolingOffPeriod: { start: Date; end: Date };
    rightToCancel: boolean;
    rightToInformation: boolean;
    rightToRefund: boolean | { allowed: boolean; until?: Date };
    complaintRights: { howTo: string; slaDays: number };
  };
  enforcementActions: string[];
  compliant: boolean;
}
