// path: apps/frontend/lib/api/vehicles-catalogue.ts
import { apiRequest, generateIdempotencyKey } from '@/lib/api/core';
import type {
  CatalogueBrand,
  CatalogueModel,
  CatalogueType,
  ExternalBrand,
  ExternalModel,
  ImportExternalRequest,
  ImportExternalResponse,
} from '@/lib/types/vehicles-catalogue';

function normalizeName(input: string) {
  const s = (input || '').trim().replace(/\s+/g, ' ');
  if (!s) return '';
  return s
    .toLowerCase()
    .replace(/(^|\s|[-_])([a-zа-яё])/giu, (m, p1, p2) => p1 + p2.toUpperCase());
}

function buildQuery(params: Record<string, unknown> = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    q.set(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

export type BrandsParams = {
  search?: string;
  country?: string;
  page?: number;
  limit?: number;
  isActive?: boolean;
  isVerified?: boolean;
};
export type ModelsParams = {
  search?: string;
  brandId?: string;
  page?: number;
  limit?: number;
  isActive?: boolean;
  isVerified?: boolean;
};
export type TypesParams = { search?: string; page?: number; limit?: number };

export type CatalogueSuggestResponse = {
  query: string;
  brands: Array<CatalogueBrand & { fullName?: string }>;
  models: Array<CatalogueModel & { brand?: { id: string; name: string }; fullName?: string }>;
};

export type ExternalBrandsParams = { source?: 'nhtsa'; search?: string; limit?: number };
export type ExternalModelsParams = { source?: 'nhtsa'; brandName: string; limit?: number };

export const vehiclesCatalogueAPI = {
  // ===== Local catalogue (GET без дополнительного заголовка Cache-Control) =====
  async brands(params: BrandsParams = {}): Promise<CatalogueBrand[]> {
    const qs = buildQuery(params);
    return apiRequest<CatalogueBrand[]>(`/vehicles-catalogue/brands${qs}`, {
      method: 'GET',
      cache: 'no-store',
    });
  },

  async models(params: ModelsParams = {}): Promise<CatalogueModel[]> {
    const qs = buildQuery(params);
    return apiRequest<CatalogueModel[]>(`/vehicles-catalogue/models${qs}`, {
      method: 'GET',
      cache: 'no-store',
    });
  },

  async types(params: TypesParams = {}): Promise<CatalogueType[]> {
    const qs = buildQuery(params);
    return apiRequest<CatalogueType[]>(`/vehicles-catalogue/types${qs}`, {
      method: 'GET',
      cache: 'no-store',
    });
  },

  // ===== Create =====
  async createBrand(name: string, extras?: Partial<Pick<CatalogueBrand, 'country' | 'logoUrl'>>): Promise<CatalogueBrand> {
    return apiRequest<CatalogueBrand>('/vehicles-catalogue/brands', {
      method: 'POST',
      json: { name: normalizeName(name), ...extras },
      idempotencyKey: generateIdempotencyKey(),
    });
  },

  async createType(name: string, extras?: Partial<Pick<CatalogueType, 'description'>>): Promise<CatalogueType> {
    return apiRequest<CatalogueType>('/vehicles-catalogue/types', {
      method: 'POST',
      json: { name: normalizeName(name), ...extras },
      idempotencyKey: generateIdempotencyKey(),
    });
  },

  async createModel(name: string, brandId: string): Promise<CatalogueModel> {
    return apiRequest<CatalogueModel>('/vehicles-catalogue/models', {
      method: 'POST',
      json: { name: normalizeName(name), brandId },
      idempotencyKey: generateIdempotencyKey(),
    });
  },

  // ===== Ensure helpers (get-or-create) =====
  async ensureBrand(name: string): Promise<CatalogueBrand> {
    const normalized = normalizeName(name);
    if (!normalized) throw new Error('Название бренда не может быть пустым');
    const list = await this.brands({ search: normalized, limit: 200 });
    const found =
      list.find((b) => b.name.toLowerCase() === normalized.toLowerCase()) ||
      list.find((b) => normalizeName(b.name).toLowerCase() === normalized.toLowerCase());
    if (found) return found;
    return this.createBrand(normalized);
  },

  async ensureModel(name: string, brandId: string): Promise<CatalogueModel> {
    const normalized = normalizeName(name);
    if (!normalized) throw new Error('Название модели не может быть пустым');
    if (!brandId) throw new Error('Не указан brandId для модели');
    const list = await this.models({ brandId, search: normalized, limit: 500 });
    const found =
      list.find((m) => m.name.toLowerCase() === normalized.toLowerCase()) ||
      list.find((m) => normalizeName(m.name).toLowerCase() === normalized.toLowerCase());
    if (found) return found;
    return this.createModel(normalized, brandId);
  },

  async ensureType(name: string): Promise<CatalogueType> {
    const normalized = normalizeName(name);
    if (!normalized) throw new Error('Название типа не может быть пустым');
    const list = await this.types({ search: normalized, limit: 200 });
    const found =
      list.find((t) => t.name.toLowerCase() === normalized.toLowerCase()) ||
      list.find((t) => normalizeName(t.name).toLowerCase() === normalized.toLowerCase());
    if (found) return found;
    return this.createType(normalized);
  },

  // ===== Updates (inline edit / active toggle) =====
  async updateBrand(
    id: string,
    data: Partial<Pick<CatalogueBrand, 'name' | 'country' | 'logoUrl' | 'isActive' | 'isVerified'>>,
  ): Promise<CatalogueBrand> {
    return apiRequest<CatalogueBrand>(`/vehicles-catalogue/brands/${id}`, {
      method: 'PATCH',
      json: data,
      idempotencyKey: generateIdempotencyKey(),
    });
  },

  async updateModel(
    id: string,
    data: Partial<Pick<CatalogueModel, 'name' | 'brandId' | 'yearFrom' | 'yearTo' | 'class' | 'isActive' | 'isVerified'>>,
  ): Promise<CatalogueModel> {
    return apiRequest<CatalogueModel>(`/vehicles-catalogue/models/${id}`, {
      method: 'PATCH',
      json: data,
      idempotencyKey: generateIdempotencyKey(),
    });
  },

  async updateType(
    id: string,
    data: Partial<Pick<CatalogueType, 'name' | 'description' | 'isActive' | 'isVerified'>>,
  ): Promise<CatalogueType> {
    return apiRequest<CatalogueType>(`/vehicles-catalogue/types/${id}`, {
      method: 'PATCH',
      json: data,
      idempotencyKey: generateIdempotencyKey(),
    });
  },

  // ===== Deletes (soft-delete on backend) =====
  async deleteBrand(id: string): Promise<void> {
    await apiRequest<void>(`/vehicles-catalogue/brands/${id}`, {
      method: 'DELETE',
      idempotencyKey: generateIdempotencyKey(),
    });
  },
  async deleteModel(id: string): Promise<void> {
    await apiRequest<void>(`/vehicles-catalogue/models/${id}`, {
      method: 'DELETE',
      idempotencyKey: generateIdempotencyKey(),
    });
  },
  async deleteType(id: string): Promise<void> {
    await apiRequest<void>(`/vehicles-catalogue/types/${id}`, {
      method: 'DELETE',
      idempotencyKey: generateIdempotencyKey(),
    });
  },

  // ===== Suggest =====
  async suggest(q: string, brandId?: string, limitBrands?: number, limitModels?: number): Promise<CatalogueSuggestResponse> {
    const qs = buildQuery({ q, brandId, limitBrands, limitModels });
    return apiRequest<CatalogueSuggestResponse>(`/vehicles-catalogue/suggest${qs}`, {
      method: 'GET',
      cache: 'no-store',
    });
  },

  // ===== Verify endpoints (идемпотентные) =====
  async verifyBrand(id: string, isVerified: boolean): Promise<CatalogueBrand> {
    const qs = buildQuery({ isVerified });
    return apiRequest<CatalogueBrand>(`/vehicles-catalogue/brands/${id}/verify${qs}`, {
      method: 'PATCH',
      idempotencyKey: generateIdempotencyKey(),
    });
  },
  async verifyModel(id: string, isVerified: boolean): Promise<CatalogueModel> {
    const qs = buildQuery({ isVerified });
    return apiRequest<CatalogueModel>(`/vehicles-catalogue/models/${id}/verify${qs}`, {
      method: 'PATCH',
      idempotencyKey: generateIdempotencyKey(),
    });
  },
  async verifyType(id: string, isVerified: boolean): Promise<CatalogueType> {
    const qs = buildQuery({ isVerified });
    return apiRequest<CatalogueType>(`/vehicles-catalogue/types/${id}/verify${qs}`, {
      method: 'PATCH',
      idempotencyKey: generateIdempotencyKey(),
    });
  },

  // ===== Merge (идемпотентные) =====
  async mergeBrand(sourceId: string, targetBrandId: string): Promise<void> {
    await apiRequest<void>(`/vehicles-catalogue/brands/${sourceId}/merge`, {
      method: 'POST',
      json: { targetBrandId },
      idempotencyKey: generateIdempotencyKey(),
    });
  },
  async mergeModel(sourceId: string, targetModelId: string): Promise<void> {
    await apiRequest<void>(`/vehicles-catalogue/models/${sourceId}/merge`, {
      method: 'POST',
      json: { targetModelId },
      idempotencyKey: generateIdempotencyKey(),
    });
  },

  // ===== External sources (preview/import) =====
  async externalBrands(params: ExternalBrandsParams = {}): Promise<ExternalBrand[]> {
    const qs = buildQuery({ source: params.source || 'nhtsa', search: params.search, limit: params.limit ?? 100 });
    return apiRequest<ExternalBrand[]>(`/vehicles-catalogue/external/brands${qs}`, {
      method: 'GET',
      cache: 'no-store',
    });
  },

  async externalModels(params: ExternalModelsParams): Promise<ExternalModel[]> {
    const qs = buildQuery({ source: params.source || 'nhtsa', brandName: params.brandName, limit: params.limit ?? 200 });
    return apiRequest<ExternalModel[]>(`/vehicles-catalogue/external/models${qs}`, {
      method: 'GET',
      cache: 'no-store',
    });
  },

  async importExternal(body: ImportExternalRequest): Promise<ImportExternalResponse> {
    return apiRequest<ImportExternalResponse>(`/vehicles-catalogue/import/external`, {
      method: 'POST',
      json: {
        source: body.source || 'nhtsa',
        brandName: body.brandName,
        maxBrands: body.maxBrands ?? 200,
        maxModelsPerBrand: body.maxModelsPerBrand ?? 500,
        dryRun: !!body.dryRun,
      },
      idempotencyKey: generateIdempotencyKey(),
    });
  },
};
