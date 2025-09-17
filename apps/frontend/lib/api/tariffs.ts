// path: apps/frontend/lib/api/tariffs.ts
import { apiRequest } from '@/lib/api/core';
import type { Tariff, TariffsPaginated, TariffListParams } from '@/lib/types/tariffs';

function toQuery(params?: Record<string, unknown>): string {
  if (!params) return '';
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    q.set(k, Array.isArray(v) ? (v as unknown[]).join(',') : String(v));
  });
  const qs = q.toString();
  return qs ? `?${qs}` : '';
}

interface RawTariff {
  id?: unknown;
  name?: unknown;
  description?: unknown;
  priceMonthly?: unknown;
  priceYearly?: unknown;
  yearlyDiscount?: unknown;
  maxUsers?: unknown;
  maxCustomers?: unknown;
  maxVehicles?: unknown;
  maxOrders?: unknown;
  features?: unknown;
  isActive?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  subscriptionsCount?: unknown;
  isRecommended?: unknown;
  activeSubscribers?: unknown;
  totalSubscribers?: unknown;
}

function toNumber(v: unknown): number {
  const n = typeof v === 'string' || typeof v === 'number' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : 0;
}
function toNumberOrUndefined(v: unknown): number | undefined {
  const n = typeof v === 'string' || typeof v === 'number' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : undefined;
}
function toNullableNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = typeof v === 'string' || typeof v === 'number' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
}
function toIsoString(v: unknown): string {
  if (!v) return '';
  if (typeof v === 'string') return v;
  try {
    return new Date(v as string).toISOString();
  } catch {
    return String(v);
  }
}
function normalizeTariff(t: RawTariff): Tariff {
  const activeSubscribers = toNumberOrUndefined(t.activeSubscribers);
  const totalSubscribers = toNumberOrUndefined(t.totalSubscribers);
  return {
    id: String(t.id ?? ''),
    name: String(t.name ?? ''),
    description: t.description ? String(t.description) : undefined,
    priceMonthly: toNumber(t.priceMonthly),
    priceYearly: toNumber(t.priceYearly),
    yearlyDiscount: toNumberOrUndefined(t.yearlyDiscount),
    maxUsers: toNullableNumber(t.maxUsers),
    maxCustomers: toNullableNumber(t.maxCustomers),
    maxVehicles: toNullableNumber(t.maxVehicles),
    maxOrders: toNullableNumber(t.maxOrders),
    features:
      typeof t.features === 'object' && t.features !== null ? (t.features as Record<string, unknown>) : {},
    isActive: Boolean(t.isActive),
    createdAt: toIsoString(t.createdAt),
    updatedAt: toIsoString(t.updatedAt),
    subscriptionsCount: toNumberOrUndefined(t.subscriptionsCount),
    isRecommended: typeof t.isRecommended === 'boolean' ? t.isRecommended : undefined,
    activeSubscribers,
    totalSubscribers,
  };
}

function isItemsPaginated(
  data: unknown,
): data is { items: unknown[]; total?: unknown; page?: unknown; limit?: unknown; totalPages?: unknown } {
  return typeof data === 'object' && data !== null && Array.isArray((data as { items?: unknown[] }).items);
}
function isDataPaginated(
  data: unknown,
): data is { data: unknown[]; pagination?: { total?: unknown; page?: unknown; limit?: unknown; totalPages?: unknown } } {
  return typeof data === 'object' && data !== null && Array.isArray((data as { data?: unknown[] }).data);
}

export const tariffsAPI = {
  // Backoffice list — всегда без кэша; admin endpoint (скрывает метрики от публичного каталога)
  async list(params?: TariffListParams): Promise<TariffsPaginated> {
    const url = `/tariffs/admin${toQuery(params as Record<string, unknown>)}`;
    const data = await apiRequest<unknown>(url, {
      method: 'GET',
      requireAuth: 'auto',
      cache: 'no-store',
    });

    if (Array.isArray(data)) {
      const items = (data as unknown[]).map((x) => normalizeTariff(x as RawTariff));
      return { items, total: items.length, page: 1, limit: items.length, totalPages: 1 };
    }
    if (isItemsPaginated(data)) {
      const items = (data.items as unknown[]).map((x) => normalizeTariff(x as RawTariff));
      return {
        items,
        total: toNumber((data as { total?: unknown }).total),
        page: toNumber((data as { page?: unknown }).page) || 1,
        limit: toNumber((data as { limit?: unknown }).limit) || items.length,
        totalPages: toNumber((data as { totalPages?: unknown }).totalPages) || 1,
      };
    }
    if (isDataPaginated(data)) {
      const items = (data.data as unknown[]).map((x) => normalizeTariff(x as RawTariff));
      const pag = (
        data as {
          pagination?: { total?: unknown; page?: unknown; limit?: unknown; totalPages?: unknown };
        }
      ).pagination || {};
      return {
        items,
        total: toNumber(pag.total),
        page: toNumber(pag.page) || 1,
        limit: toNumber(pag.limit) || items.length,
        totalPages: toNumber(pag.totalPages) || 1,
      };
    }
    return { items: [], total: 0, page: 1, limit: 0, totalPages: 0 };
  },

  // Публичные — без метрик
  async active(): Promise<Tariff[]> {
    const data = await apiRequest<unknown[]>(`/tariffs/active`, { method: 'GET', requireAuth: 'auto' });
    return (data ?? []).map((x) => normalizeTariff(x as RawTariff));
  },

  async popular(limit = 6): Promise<Tariff[]> {
    const data = await apiRequest<unknown[]>(`/tariffs/popular${toQuery({ limit })}`, {
      method: 'GET',
      requireAuth: 'auto',
    });
    return (data ?? []).map((x) => normalizeTariff(x as RawTariff));
  },

  async get(id: string): Promise<Tariff> {
    const data = await apiRequest<unknown>(`/tariffs/${id}`, { method: 'GET', requireAuth: 'auto' });
    return normalizeTariff(data as RawTariff);
  },

  async compare(ids: string[]): Promise<Tariff[]> {
    const data = await apiRequest<unknown[]>(`/tariffs/compare${toQuery({ ids })}`, {
      method: 'GET',
      requireAuth: 'auto',
    });
    return (data ?? []).map((x) => normalizeTariff(x as RawTariff));
  },

  async create(json: {
    name: string;
    description?: string;
    priceMonthly: number;
    priceYearly: number;
    maxUsers?: number;
    maxCustomers?: number;
    maxVehicles?: number;
    maxOrders?: number;
    features?: Record<string, unknown>;
    isActive?: boolean;
  }): Promise<Tariff> {
    const data = await apiRequest<unknown>(`/tariffs`, { method: 'POST', json });
    return normalizeTariff(data as RawTariff);
  },

  async update(
    id: string,
    json: Partial<{
      name: string;
      description: string;
      priceMonthly: number;
      priceYearly: number;
      maxUsers: number;
      maxCustomers: number;
      maxVehicles: number;
      maxOrders: number;
      features: Record<string, unknown>;
      isActive: boolean;
    }>,
  ): Promise<Tariff> {
    const data = await apiRequest<unknown>(`/tariffs/${id}`, { method: 'PATCH', json });
    return normalizeTariff(data as RawTariff);
  },

  async setActive(id: string, isActive: boolean): Promise<Tariff> {
    const data = await apiRequest<unknown>(`/tariffs/${id}/status${toQuery({ isActive })}`, { method: 'PATCH' });
    return normalizeTariff(data as RawTariff);
  },

  async remove(id: string): Promise<void> {
    await apiRequest<void>(`/tariffs/${id}`, { method: 'DELETE' });
  },
};
