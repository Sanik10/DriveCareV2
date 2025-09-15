// path: apps/frontend/lib/api/customers.ts
import { apiRequest, apiRequestRaw, generateIdempotencyKey } from '@/lib/api/core';
import type {
  CustomersQuery,
  PaginatedCustomersResponse,
  CustomerResponse,
  CreateCustomerRequest,
  UpdateCustomerRequest,
} from '@/lib/types/customers';

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
  async getCustomers(query: CustomersQuery = {}): Promise<PaginatedCustomersResponse> {
    const qs = buildQuery(query as Record<string, unknown>);
    return apiRequest<PaginatedCustomersResponse>(`/customers${qs}`, { method: 'GET' });
  }

  async getCustomer(id: string): Promise<CustomerResponse> {
    return apiRequest<CustomerResponse>(`/customers/${id}`, { method: 'GET' });
  }

  async createCustomer(data: CreateCustomerRequest): Promise<CustomerResponse> {
    return apiRequest<CustomerResponse>('/customers', {
      method: 'POST',
      json: data,
      idempotencyKey: generateIdempotencyKey(),
    });
  }

  async updateCustomer(id: string, data: UpdateCustomerRequest): Promise<CustomerResponse> {
    return apiRequest<CustomerResponse>(`/customers/${id}`, {
      method: 'PATCH',
      json: data,
      idempotencyKey: generateIdempotencyKey(),
    });
  }

  async revokeConsent(
    id: string,
    payload?: { consentType?: 'pdn_processing' | 'marketing'; reason?: string },
  ): Promise<CustomerResponse> {
    return apiRequest<CustomerResponse>(`/customers/${id}/consent/revoke`, {
      method: 'POST',
      json: payload ?? {},
      idempotencyKey: generateIdempotencyKey(),
    });
  }

  async exportCustomer(id: string): Promise<{ blob: Blob; filename?: string }> {
    const res = await apiRequestRaw(`/customers/${id}/export`, { method: 'GET' });

    const blob = await res.blob();
    const cd = res.headers.get('content-disposition') || '';
    const match = /filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i.exec(cd);
    const filename = match ? decodeURIComponent(match[1]) : undefined;

    return { blob, filename };
  }

  async deleteCustomer(id: string): Promise<void> {
    await apiRequest<void>(`/customers/${id}`, {
      method: 'DELETE',
      idempotencyKey: generateIdempotencyKey(),
    });
  }
}

export const customersAPI = new CustomersAPI();
