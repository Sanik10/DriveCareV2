// path: apps/frontend/lib/api/customers.ts
import type {
  CustomersQuery,
  PaginatedCustomersResponse,
  CustomerResponse,
  CreateCustomerRequest,
  UpdateCustomerRequest,
} from '@/lib/types/customers';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

interface ApiError {
  message: string;
  statusCode?: number;
}

function buildQuery(params: Record<string, unknown>) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    q.set(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

class CustomersAPI {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      credentials: 'include',
      ...options,
    });

    const text = await res.text();

    if (!res.ok) {
      let err: ApiError;
      try {
        err = JSON.parse(text) as ApiError;
      } catch {
        err = { message: text || 'Unknown error', statusCode: res.status };
      }
      throw new Error(JSON.stringify(err));
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      return text as unknown as T;
    }
  }

  async getCustomers(query: CustomersQuery = {}): Promise<PaginatedCustomersResponse> {
    const qs = buildQuery(query as Record<string, unknown>);
    return this.request<PaginatedCustomersResponse>(`/customers${qs}`);
  }

  async getCustomer(id: string): Promise<CustomerResponse> {
    return this.request<CustomerResponse>(`/customers/${id}`);
  }

  async createCustomer(data: CreateCustomerRequest): Promise<CustomerResponse> {
    return this.request<CustomerResponse>('/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCustomer(id: string, data: UpdateCustomerRequest): Promise<CustomerResponse> {
    return this.request<CustomerResponse>(`/customers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async revokeConsent(id: string, payload?: { consentType?: 'pdn_processing' | 'marketing'; reason?: string }): Promise<CustomerResponse> {
    return this.request<CustomerResponse>(`/customers/${id}/consent/revoke`, {
      method: 'POST',
      body: JSON.stringify(payload ?? {}),
    });
  }

  async exportCustomer(id: string): Promise<{ blob: Blob; filename?: string }> {
    const url = `${API_BASE}/customers/${id}/export`;
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
    });

    if (!res.ok) {
      const text = await res.text();
      let err: ApiError;
      try {
        err = JSON.parse(text) as ApiError;
      } catch {
        err = { message: text || 'Unknown error', statusCode: res.status };
      }
      throw new Error(JSON.stringify(err));
    }

    const blob = await res.blob();
    const cd = res.headers.get('content-disposition') || '';
    const match = /filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i.exec(cd);
    const filename = match ? decodeURIComponent(match[1]) : undefined;

    return { blob, filename };
  }

  async deleteCustomer(id: string): Promise<void> {
    await this.request<void>(`/customers/${id}`, { method: 'DELETE' });
  }
}

export const customersAPI = new CustomersAPI();
