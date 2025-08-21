// path: apps/backend/src/modules/subscriptions/subscription-billing/interfaces/payment-gateway.interface.ts
import { PaymentData, PaymentResult, PaymentStatus } from '../types/billing.types';

export interface PaymentGatewayInterface {
  createPayment(
    data: PaymentData,
    opts?: { idempotencyKey?: string },
  ): Promise<PaymentResult>;

  checkPaymentStatus(paymentId: string): Promise<PaymentStatus>;

  handleWebhook(
    payload: any,
    headers?: Record<string, string | string[] | undefined>,
  ): Promise<{ paymentId: string; status: PaymentStatus['status'] }>;
}
