// path: apps/frontend/lib/types/subscriptions.ts

export type BillingProvider = 'yookassa' | 'tinkoff';
export type BillingPeriod = 'monthly' | 'yearly';

export type SubscriptionStatus =
  | 'active'
  | 'pending'
  | 'suspended'
  | 'canceled'
  | 'expired'
  | 'inactive';

export interface BillingTariffInfo {
  id: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  maxUsers?: number | null;
  maxCustomers?: number | null;
  maxVehicles?: number | null;
  maxOrders?: number | null;
}

export interface BillingSubscriptionResponse {
  id: string;
  companyId: string;
  tariff?: BillingTariffInfo;
  startDate: string;
  endDate: string;
  billingPeriod: BillingPeriod;
  status: SubscriptionStatus;
  paymentMethod: string;
  autoRenew: boolean;
  daysUntilExpiration: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBillingSubscriptionRequest {
  tariffId: string;
  billingPeriod: BillingPeriod;
  pdnConsentGiven: boolean;
  consumerRightsAcknowledged: boolean;
  paymentMethod?: 'manual' | 'bank_transfer' | 'card' | 'mir' | 'sbp' | 'wallet';
  startDate?: string;
  userIpAddress?: string;
  userAgent?: string;
}

export interface ProcessSubscriptionPaymentRequest {
  subscriptionId: string;
  gatewayProvider?: BillingProvider;
  paymentMethod?: 'card' | 'mir' | 'sbp' | 'wallet' | 'bank_transfer';
  metadata?: Record<string, unknown>;
}

export interface ProcessSubscriptionPaymentResponse {
  subscriptionId: string;
  paymentId: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';
  amount: number;
  currency: 'RUB' | string;
  provider: BillingProvider;
  redirectUrl?: string;
}

export interface CancelSubscriptionRequest {
  reason?: string;
}

export interface CancelSubscriptionResponse {
  success: boolean;
  message?: string;
}
