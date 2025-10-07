// path: apps/frontend/lib/api/subscription-billing.ts
import { apiRequest, generateIdempotencyKey } from '@/lib/api/core';
import type {
  BillingSubscriptionResponse,
  CreateBillingSubscriptionRequest,
  ProcessSubscriptionPaymentRequest,
  ProcessSubscriptionPaymentResponse,
  CancelSubscriptionRequest,
  CancelSubscriptionResponse,
} from '@/lib/types/subscriptions';

export const subscriptionBillingAPI = {
  async create(json: CreateBillingSubscriptionRequest, opts?: { idempotencyKey?: string }): Promise<BillingSubscriptionResponse> {
    const idemp = opts?.idempotencyKey || generateIdempotencyKey();
    const data = await apiRequest<BillingSubscriptionResponse>('/subscription-billing', {
      method: 'POST',
      json,
      idempotencyKey: idemp,
    });
    return data;
  },

  async processPayment(
    json: ProcessSubscriptionPaymentRequest,
    opts?: { idempotencyKey?: string },
  ): Promise<ProcessSubscriptionPaymentResponse> {
    const idemp = opts?.idempotencyKey || generateIdempotencyKey();
    const data = await apiRequest<ProcessSubscriptionPaymentResponse>('/subscription-billing/payment', {
      method: 'POST',
      json,
      idempotencyKey: idemp,
    });
    return data;
  },

  async getActive(): Promise<BillingSubscriptionResponse | null> {
    // Может вернуть null, если активной подписки нет
    try {
      const res = await apiRequest<BillingSubscriptionResponse | null>('/subscription-billing/active', {
        method: 'GET',
      });
      return res ?? null;
    } catch (e) {
      // В некоторых случаях бэк может вернуть 200 с null; любые иные ошибки пробрасываем
      throw e;
    }
  },

  async cancel(id: string, body?: CancelSubscriptionRequest): Promise<CancelSubscriptionResponse> {
    const res = await apiRequest<CancelSubscriptionResponse>(`/subscription-billing/${id}`, {
      method: 'DELETE',
      json: body || {},
    });
    return res;
  },
};
