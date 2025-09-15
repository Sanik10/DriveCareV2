// path: apps/frontend/lib/api/services.ts
import { apiRequest, generateIdempotencyKey } from '@/lib/api/core';
import type {
  PaginatedServicesResponse,
  ServicesQuery,
  ServiceCatalogueItem,
  CreateServiceRequest,
  UpdateServiceRequest,
} from '@/lib/types/services';

function buildQuery(params: Record<string, unknown>) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '' || Number.isNaN(v)) return;
    q.set(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

class ServicesAPI {
  async search(query: ServicesQuery = {}): Promise<PaginatedServicesResponse> {
    const qs = buildQuery(query as Record<string, unknown>);
    const raw = await apiRequest<unknown>(`/services${qs}`, { method: 'GET' });

    // { items: ServiceCatalogueItem[], ... }
    if (
      typeof raw === 'object' &&
      raw !== null &&
      'items' in raw &&
      Array.isArray((raw as { items: unknown[] }).items)
    ) {
      return raw as PaginatedServicesResponse;
    }

    // Array<ServiceCatalogueItem>
    if (Array.isArray(raw)) {
      const items = raw as ServiceCatalogueItem[];
      return { items, total: items.length, page: 1, limit: items.length, totalPages: 1 };
    }

    // Flexible normalization: { data/results, total/page/limit/totalPages }
    const obj = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
    const items: ServiceCatalogueItem[] = Array.isArray(obj.results)
      ? (obj.results as ServiceCatalogueItem[])
      : Array.isArray(obj.data)
      ? (obj.data as ServiceCatalogueItem[])
      : [];
    const total = typeof obj.total === 'number' ? obj.total : items.length;
    const page = typeof obj.page === 'number' ? obj.page : 1;
    const limit = typeof obj.limit === 'number' ? obj.limit : items.length;
    const totalPages =
      typeof obj.totalPages === 'number' ? obj.totalPages : Math.max(1, Math.ceil((total || 0) / Math.max(1, limit)));

    return { items, total, page, limit, totalPages };
  }

  async get(id: string): Promise<ServiceCatalogueItem> {
    return apiRequest<ServiceCatalogueItem>(`/services/${id}`, { method: 'GET' });
  }

  async create(payload: CreateServiceRequest): Promise<ServiceCatalogueItem> {
    return apiRequest<ServiceCatalogueItem>('/services', {
      method: 'POST',
      json: payload,
      idempotencyKey: generateIdempotencyKey(),
    });
  }

  async update(id: string, payload: UpdateServiceRequest): Promise<ServiceCatalogueItem> {
    return apiRequest<ServiceCatalogueItem>(`/services/${id}`, {
      method: 'PATCH',
      json: payload,
      idempotencyKey: generateIdempotencyKey(),
    });
  }

  async remove(id: string): Promise<void> {
    await apiRequest<void>(`/services/${id}`, {
      method: 'DELETE',
      idempotencyKey: generateIdempotencyKey(),
    });
  }
}

export const servicesAPI = new ServicesAPI();
