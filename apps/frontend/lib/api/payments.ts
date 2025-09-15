// path: apps/frontend/lib/api/payments.ts
import { apiRequest, generateIdempotencyKey } from '@/lib/api/core';
import type {
  CompanyBalance,
  PaginatedPaymentsResponse,
  PaymentsQuery,
  Payment,
  RefundPayload,
  PaymentInitResponse,
} from '@/lib/types/payments';

function buildQuery(params: Record<string, unknown>) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '' || Number.isNaN(v)) return;
    q.set(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

class PaymentsAPI {
  async list(query: PaymentsQuery = {}): Promise<PaginatedPaymentsResponse> {
    const qs = buildQuery(query as Record<string, unknown>);
    return apiRequest<PaginatedPaymentsResponse>(`/payments${qs}`, { method: 'GET' });
  }

  async get(id: string): Promise<Payment> {
    return apiRequest<Payment>(`/payments/${id}`, { method: 'GET' });
  }

  async refund(id: string, payload: RefundPayload): Promise<Payment> {
    // NB: серверный DTO ожидает paymentId в теле
    const body = { paymentId: id, ...payload };
    return apiRequest<Payment>(`/payments/${id}/refund`, {
      method: 'POST',
      json: body,
      idempotencyKey: generateIdempotencyKey(),
    });
  }

  async update(id: string, patch: Partial<Payment>): Promise<Payment> {
    return apiRequest<Payment>(`/payments/${id}`, {
      method: 'PUT',
      json: patch,
    });
  }

  async getBalance(): Promise<CompanyBalance> {
    return apiRequest<CompanyBalance>(`/payments/analytics/balance`, { method: 'GET' });
  }

  /**
   * Инициация онлайн-оплаты.
   * Сигнатура расширена: можно передать paymentMethodId (multi-provider) и/или кастомный returnUrl.
   */
  async initOnline(
    invoiceId: string,
    amount?: number,
    paymentMethodId?: string,
    returnUrl?: string
  ): Promise<PaymentInitResponse> {
    const ret =
      returnUrl ||
      (typeof window !== 'undefined'
        ? `${window.location.origin}/dashboard/payments/result`
        : '/dashboard/payments/result');

    const body: Record<string, unknown> = { invoiceId, amount, returnUrl: ret };
    if (paymentMethodId) body.paymentMethodId = paymentMethodId;

    return apiRequest<PaymentInitResponse>('/payments/online/init', {
      method: 'POST',
      json: body,
      idempotencyKey: generateIdempotencyKey(),
    });
  }
}

export const paymentsAPI = new PaymentsAPI();
