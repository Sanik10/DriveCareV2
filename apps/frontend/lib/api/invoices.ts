// path: apps/frontend/lib/api/invoices.ts
import { apiRequest } from '@/lib/api/core';
import type {
  InvoicesQuery,
  PaginatedInvoicesResponse,
  Invoice,
  CreateInvoiceRequest,
  UpdateInvoiceRequest,
  CreateInvoiceFromOrderRequest,
  InvoiceStatus,
  InvoiceSelectOption,
  InvoicesStats,
  OverdueReport,
} from '@/lib/types/invoices';

function buildQuery(params: Record<string, unknown>) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '' || Number.isNaN(v)) return;
    q.set(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

class InvoicesAPI {
  async list(query: InvoicesQuery = {}): Promise<PaginatedInvoicesResponse> {
    const qs = buildQuery(query as Record<string, unknown>);
    return apiRequest<PaginatedInvoicesResponse>(`/invoices${qs}`);
  }

  async get(id: string): Promise<Invoice> {
    return apiRequest<Invoice>(`/invoices/${id}`);
  }

  async create(payload: CreateInvoiceRequest): Promise<Invoice> {
    return apiRequest<Invoice>('/invoices', {
      method: 'POST',
      json: payload,
    });
  }

  async createFromOrder(payload: CreateInvoiceFromOrderRequest): Promise<Invoice> {
    return apiRequest<Invoice>('/invoices/from-order', {
      method: 'POST',
      json: payload,
    });
  }

  async update(id: string, payload: UpdateInvoiceRequest): Promise<Invoice> {
    return apiRequest<Invoice>(`/invoices/${id}`, {
      method: 'PATCH',
      json: payload,
    });
  }

  async updateStatus(id: string, status: InvoiceStatus): Promise<Invoice> {
    // Backend ожидает Query (?status=)
    const qs = buildQuery({ status });
    return apiRequest<Invoice>(`/invoices/${id}/status${qs}`, {
      method: 'PATCH',
    });
  }

  async cancel(id: string): Promise<void> {
    await apiRequest<void>(`/invoices/${id}`, { method: 'DELETE' });
  }

  async search(query: string): Promise<Invoice[]> {
    // Backend возвращает массив InvoiceResponseDto[]
    const res = await apiRequest<Invoice[] | { items: Invoice[] }>(
      `/invoices/search/${encodeURIComponent(query)}`
    );
    if (Array.isArray(res)) return res;
    return res.items ?? [];
  }

  async selectOptions(status?: InvoiceStatus): Promise<InvoiceSelectOption[]> {
    const qs = buildQuery({ status });
    return apiRequest<InvoiceSelectOption[]>(`/invoices/select/options${qs}`);
  }

  async statsDashboard(): Promise<InvoicesStats> {
    return apiRequest<InvoicesStats>('/invoices/stats/dashboard');
  }

  async overdueReport(): Promise<OverdueReport> {
    return apiRequest<OverdueReport>('/invoices/overdue/report');
  }
}

export const invoicesAPI = new InvoicesAPI();
