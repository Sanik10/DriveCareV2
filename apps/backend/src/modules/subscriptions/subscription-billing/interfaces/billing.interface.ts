import { UserContext, PaymentData } from '../types/billing.types';

export interface CreateBillingSubscriptionInput {
  companyId: string;
  tariffId: string;
  pdnConsentGiven: boolean;
  consumerRightsAcknowledged: boolean;
  userIpAddress: string;
  userAgent: string;
  dataLocalizationConfirmed: boolean;
  autoRenew?: boolean;
  paymentMethod?: 'card' | 'mir' | 'sbp' | 'wallet' | 'bank_transfer';
}

export interface ProcessPaymentInput {
  subscriptionId: string;
  paymentData: PaymentData;
  userContext: UserContext;
}

export interface CancelSubscriptionInput {
  subscriptionId: string;
  cancellationData: {
    reason: string;
    isCoolingOffPeriod: boolean;
    requestRefund: boolean;
    consumerRightsClaimed: string[];
  };
  userContext: UserContext;
}
