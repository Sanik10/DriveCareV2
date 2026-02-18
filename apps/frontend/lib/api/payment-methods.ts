// path: apps/frontend/lib/api/payment-methods.ts
import { apiRequest, type ApiRequestInit } from '@/lib/api/core';
import type {
  PaymentMethodsQuery,
  PaginatedPaymentMethodsResponse,
  PaginatedPaymentMethodsUI,
  PaymentMethodResponse,
  PaymentMethodCreateRequest,
  PaymentMethodUpdateRequest,
  TestIntegrationResponse,
  CalculateFeeResponse,
} from '@/lib/types/payment-methods';

function toQueryStringPM(q: PaymentMethodsQuery): string {
  const qs = new URLSearchParams();
  if (q.search) qs.set('search', q.search);
  if (q.type) qs.set('type', q.type);
  if (typeof q.isActive === 'boolean') qs.set('isActive', String(q.isActive));
  if (q.sortBy) qs.set('sortBy', q.sortBy);
  if (q.sortOrder) qs.set('sortOrder', q.sortOrder);
  if (typeof q.page === 'number') qs.set('page', String(q.page));
  if (typeof q.limit === 'number') qs.set('limit', String(q.limit));
  return qs.toString();
}

export const paymentMethodsAPI = {
  async getPaymentMethods(query: PaymentMethodsQuery): Promise<PaginatedPaymentMethodsUI> {
    const qs = toQueryStringPM(query);
    const url = `/payment-methods${qs ? `?${qs}` : ''}`;

    // Используем единый клиент с автоподстановкой Authorization и авто‑refresh по 401
    const json = await apiRequest<unknown>(url, { method: 'GET' });

    // Ожидаемый DTO: { data, pagination }
    if (
      typeof json === 'object' &&
      json !== null &&
      'data' in json &&
      Array.isArray((json as { data: unknown[] }).data) &&
      'pagination' in json
    ) {
      const p = (json as PaginatedPaymentMethodsResponse).pagination;
      return {
        items: (json as PaginatedPaymentMethodsResponse).data,
        total: p.total,
        page: p.page,
        limit: p.limit,
        totalPages: p.totalPages,
      };
    }

    // Fallback: { items, meta } или другие формы
    const j = json as Partial<{
      items: PaymentMethodResponse[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      meta?: { total?: number; page?: number; limit?: number; totalPages?: number };
    }>;

    const items = Array.isArray(j.items) ? j.items : [];
    const total =
      typeof j.total === 'number'
        ? j.total
        : typeof j.meta?.total === 'number'
        ? j.meta.total
        : items.length;
    const page =
      typeof j.page === 'number' ? j.page : typeof j.meta?.page === 'number' ? j.meta.page : Number(query.page || 1);
    const limit =
      typeof j.limit === 'number'
        ? j.limit
        : typeof j.meta?.limit === 'number'
        ? j.meta.limit
        : Number(query.limit || 10);
    const totalPages =
      typeof j.totalPages === 'number'
        ? j.totalPages
        : typeof j.meta?.totalPages === 'number'
        ? j.meta.totalPages
        : Math.max(1, Math.ceil(total / (limit || 1)));

    return { items, total, page, limit, totalPages };
  },

  async getPaymentMethod(id: string): Promise<PaymentMethodResponse> {
    return apiRequest<PaymentMethodResponse>(`/payment-methods/${id}`, { method: 'GET' });
  },

  async create(payload: PaymentMethodCreateRequest): Promise<PaymentMethodResponse> {
    return apiRequest<PaymentMethodResponse>(`/payment-methods`, {
      method: 'POST',
      json: payload,
    });
  },

  async update(id: string, payload: PaymentMethodUpdateRequest): Promise<PaymentMethodResponse> {
    return apiRequest<PaymentMethodResponse>(`/payment-methods/${id}`, {
      method: 'PATCH',
      json: payload,
    });
  },

  async remove(id: string): Promise<void> {
    await apiRequest<void>(`/payment-methods/${id}`, { method: 'DELETE' });
  },

  async toggleStatus(id: string): Promise<PaymentMethodResponse> {
    return apiRequest<PaymentMethodResponse>(`/payment-methods/${id}/toggle-status`, { method: 'POST' });
  },

  async testIntegration(id: string): Promise<TestIntegrationResponse> {
    return apiRequest<TestIntegrationResponse>(`/payment-methods/${id}/test-integration`, { method: 'POST' });
  },

  async calculateFee(id: string, amount: number): Promise<CalculateFeeResponse> {
    return apiRequest<CalculateFeeResponse>(`/payment-methods/${id}/calculate-fee`, {
      method: 'POST',
      json: { amount },
    });
  },
};
