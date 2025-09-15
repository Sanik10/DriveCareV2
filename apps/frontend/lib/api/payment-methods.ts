// path: apps/frontend/lib/api/payment-methods.ts
import { buildApiUrl } from '@/lib/api/core';
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

function authHeaders(base?: HeadersInit): HeadersInit {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(base as Record<string, string>),
  };
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (token) headers.Authorization = `Bearer ${token}`;
  } catch {
    // ignore
  }
  return headers;
}

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
    const url = buildApiUrl(`/payment-methods${qs ? `?${qs}` : ''}`);

    const res = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: authHeaders(),
      cache: 'no-store',
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(
        JSON.stringify({
          message: `HTTP ${res.status} ${res.statusText}${text ? ` — ${text}` : ''}`,
        }),
      );
    }

    const json: unknown = await res.json();

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
    const url = buildApiUrl(`/payment-methods/${id}`);
    const res = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: authHeaders(),
      cache: 'no-store',
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(JSON.stringify({ message: `HTTP ${res.status} ${res.statusText}${text ? ` — ${text}` : ''}` }));
    }
    return (await res.json()) as PaymentMethodResponse;
  },

  async create(payload: PaymentMethodCreateRequest): Promise<PaymentMethodResponse> {
    const url = buildApiUrl(`/payment-methods`);
    const res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(JSON.stringify({ message: `HTTP ${res.status} ${res.statusText}${text ? ` — ${text}` : ''}` }));
    }
    return (await res.json()) as PaymentMethodResponse;
  },

  async update(id: string, payload: PaymentMethodUpdateRequest): Promise<PaymentMethodResponse> {
    const url = buildApiUrl(`/payment-methods/${id}`);
    const res = await fetch(url, {
      method: 'PATCH',
      credentials: 'include',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(JSON.stringify({ message: `HTTP ${res.status} ${res.statusText}${text ? ` — ${text}` : ''}` }));
    }
    return (await res.json()) as PaymentMethodResponse;
  },

  async remove(id: string): Promise<void> {
    const url = buildApiUrl(`/payment-methods/${id}`);
    const res = await fetch(url, {
      method: 'DELETE',
      credentials: 'include',
      headers: authHeaders(),
    });
    if (!res.ok && res.status !== 204) {
      const text = await res.text().catch(() => '');
      throw new Error(JSON.stringify({ message: `HTTP ${res.status} ${res.statusText}${text ? ` — ${text}` : ''}` }));
    }
  },

  async toggleStatus(id: string): Promise<PaymentMethodResponse> {
    const url = buildApiUrl(`/payment-methods/${id}/toggle-status`);
    const res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: authHeaders(),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(JSON.stringify({ message: `HTTP ${res.status} ${res.statusText}${text ? ` — ${text}` : ''}` }));
    }
    return (await res.json()) as PaymentMethodResponse;
  },

  async testIntegration(id: string): Promise<TestIntegrationResponse> {
    const url = buildApiUrl(`/payment-methods/${id}/test-integration`);
    const res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: authHeaders(),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(JSON.stringify({ message: `HTTP ${res.status} ${res.statusText}${text ? ` — ${text}` : ''}` }));
    }
    return (await res.json()) as TestIntegrationResponse;
  },

  async calculateFee(id: string, amount: number): Promise<CalculateFeeResponse> {
    const url = buildApiUrl(`/payment-methods/${id}/calculate-fee`);
    const res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ amount }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(JSON.stringify({ message: `HTTP ${res.status} ${res.statusText}${text ? ` — ${text}` : ''}` }));
    }
    return (await res.json()) as CalculateFeeResponse;
  },
};
