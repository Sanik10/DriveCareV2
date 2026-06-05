// path: apps/frontend/lib/api/services.ts
import { apiRequest, generateIdempotencyKey } from '@/lib/api/core';
import type {
  PaginatedServicesResponse,
  BackendPaginatedServicesResponse,
  ServicesQuery,
  ServiceCatalogueItem,
  CreateServiceRequest,
  UpdateServiceRequest,
  ServiceCategory,
  CreateCategoryRequest,
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
  // --- УСЛУГИ ---
  async search(query: ServicesQuery = {}): Promise<PaginatedServicesResponse> {
    const qs = buildQuery(query as Record<string, unknown>);
    const raw = await apiRequest<BackendPaginatedServicesResponse | ServiceCatalogueItem[]>(`/services${qs}`, { method: 'GET' });

    if (typeof raw === 'object' && raw !== null && 'data' in raw && 'pagination' in raw) {
      return {
        items: raw.data,
        total: raw.pagination.total,
        page: raw.pagination.page,
        limit: raw.pagination.limit,
        totalPages: raw.pagination.totalPages,
      };
    }
    if (Array.isArray(raw)) {
      const items = raw as ServiceCatalogueItem[];
      return { items, total: items.length, page: 1, limit: items.length, totalPages: 1 };
    }
    return { items: [], total: 0, page: 1, limit: 20, totalPages: 1 };
  }

  async create(payload: CreateServiceRequest): Promise<ServiceCatalogueItem> {
    return apiRequest<ServiceCatalogueItem>('/services', { method: 'POST', json: payload, idempotencyKey: generateIdempotencyKey() });
  }

  async update(id: string, payload: UpdateServiceRequest): Promise<ServiceCatalogueItem> {
    return apiRequest<ServiceCatalogueItem>(`/services/${id}`, { method: 'PATCH', json: payload, idempotencyKey: generateIdempotencyKey() });
  }

  async remove(id: string): Promise<void> {
    await apiRequest<void>(`/services/${id}`, { method: 'DELETE', idempotencyKey: generateIdempotencyKey() });
  }

  async toggleStatus(id: string): Promise<ServiceCatalogueItem> {
    return apiRequest<ServiceCatalogueItem>(`/services/${id}/toggle-status`, { method: 'POST', idempotencyKey: generateIdempotencyKey() });
  }

  // --- КАТЕГОРИИ ---
  async getCategories(): Promise<ServiceCategory[]> {
    try {
      const res = await apiRequest<any>('/services/categories/with-services-count', { method: 'GET' });
      return Array.isArray(res) ? res : (res.data || res.items || []);
    } catch (e) {
      console.error('Не удалось загрузить категории', e);
      return [];
    }
  }

  async createCategory(payload: CreateCategoryRequest): Promise<ServiceCategory> {
    return apiRequest<ServiceCategory>('/services/categories', { method: 'POST', json: payload, idempotencyKey: generateIdempotencyKey() });
  }

  async updateCategory(id: string, payload: Partial<CreateCategoryRequest>): Promise<ServiceCategory> {
    return apiRequest<ServiceCategory>(`/services/categories/${id}`, { method: 'PATCH', json: payload, idempotencyKey: generateIdempotencyKey() });
  }

  async removeCategory(id: string): Promise<void> {
    await apiRequest<void>(`/services/categories/${id}`, { method: 'DELETE', idempotencyKey: generateIdempotencyKey() });
  }
}

export const servicesAPI = new ServicesAPI();
