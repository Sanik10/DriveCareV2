// path: apps/frontend/lib/api/vehicles-catalogue.ts
import type { CatalogueBrand, CatalogueModel, CatalogueType } from '@/lib/types/vehicles-catalogue';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

interface ApiError {
  message: string;
  statusCode?: number;
}

function normalizeName(input: string) {
  const s = (input || '').trim().replace(/\s+/g, ' ');
  if (!s) return '';
  // TitleCase для латиницы/кириллицы
  return s
    .toLowerCase()
    .replace(/(^|\s|[-_])([a-zа-яё])/giu, (m, p1, p2) => p1 + p2.toUpperCase());
}

async function get<T>(endpoint: string): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
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

async function post<T>(endpoint: string, body: unknown): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
    body: JSON.stringify(body),
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

export const vehiclesCatalogueAPI = {
  // Lists
  async brands(): Promise<CatalogueBrand[]> {
    return get<CatalogueBrand[]>('/vehicles-catalogue/brands');
  },
  async models(): Promise<CatalogueModel[]> {
    return get<CatalogueModel[]>('/vehicles-catalogue/models');
  },
  async types(): Promise<CatalogueType[]> {
    return get<CatalogueType[]>('/vehicles-catalogue/types');
  },

  // Creates (raw)
  async createBrand(name: string): Promise<CatalogueBrand> {
    return post<CatalogueBrand>('/vehicles-catalogue/brands', { name: normalizeName(name) });
  },
  async createType(name: string): Promise<CatalogueType> {
    return post<CatalogueType>('/vehicles-catalogue/types', { name: normalizeName(name) });
  },
  async createModel(name: string, brandId: string): Promise<CatalogueModel> {
    return post<CatalogueModel>('/vehicles-catalogue/models', { name: normalizeName(name), brandId });
  },

  // Idempotent ensure-helpers (анти-дубли: case/space insensitive)
  async ensureBrand(name: string): Promise<CatalogueBrand> {
    const target = normalizeName(name);
    const list = await this.brands();
    const found = list.find(b => normalizeName(b.name) === target);
    if (found) return found;
    try {
      return await this.createBrand(target);
    } catch (e) {
      // На случай гонки/409 — перечитать и вернуть найденный
      const updated = await this.brands();
      const again = updated.find(b => normalizeName(b.name) === target);
      if (again) return again;
      throw e;
    }
  },

  async ensureType(name: string): Promise<CatalogueType> {
    const target = normalizeName(name);
    const list = await this.types();
    const found = list.find(t => normalizeName(t.name) === target);
    if (found) return found;
    try {
      return await this.createType(target);
    } catch (e) {
      const updated = await this.types();
      const again = updated.find(t => normalizeName(t.name) === target);
      if (again) return again;
      throw e;
    }
  },

  async ensureModel(name: string, brandId: string): Promise<CatalogueModel> {
    const target = normalizeName(name);
    const list = await this.models();
    const found = list.find(m => (m.brandId === brandId || m.brand?.id === brandId) && normalizeName(m.name) === target);
    if (found) return found;
    try {
      return await this.createModel(target, brandId);
    } catch (e) {
      const updated = await this.models();
      const again = updated.find(m => (m.brandId === brandId || m.brand?.id === brandId) && normalizeName(m.name) === target);
      if (again) return again;
      throw e;
    }
  },
};
