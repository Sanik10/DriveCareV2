// path: apps/frontend/lib/api/users.ts
import { apiRequest } from '@/lib/api/core';
import type { UsersQuery, PaginatedUsersResponse, UserResponse } from '@/lib/types/users';

function buildQuery(params: Record<string, unknown>) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '' || Number.isNaN(v)) return;
    q.set(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

class UsersAPI {
  async search(query: UsersQuery = {}): Promise<PaginatedUsersResponse> {
    const qs = buildQuery(query as Record<string, unknown>);
    const raw = await apiRequest<unknown>(`/users${qs}`, { method: 'GET' });

    // 1) Стандартный: { items, total, page, limit, totalPages }
    if (
      typeof raw === 'object' &&
      raw !== null &&
      'items' in raw &&
      Array.isArray((raw as { items: unknown[] }).items)
    ) {
      return raw as PaginatedUsersResponse;
    }

    // 2) Альтернативное поле "users"
    if (typeof raw === 'object' && raw !== null && 'users' in raw && Array.isArray((raw as { users: unknown[] }).users)) {
      const obj = raw as Record<string, unknown> & { users: UserResponse[] };
      const items = obj.users;
      const total =
        typeof obj.total === 'number'
          ? obj.total
          : typeof obj.count === 'number'
          ? (obj.count as number)
          : items.length;
      const page = typeof obj.page === 'number' ? (obj.page as number) : 1;
      const limit = typeof obj.limit === 'number' ? (obj.limit as number) : items.length;
      const totalPages =
        typeof obj.totalPages === 'number'
          ? (obj.totalPages as number)
          : Math.max(1, Math.ceil((total || 0) / Math.max(1, limit)));
      return { items, total, page, limit, totalPages };
    }

    // 3) Прямо массив пользователей
    if (Array.isArray(raw)) {
      const items = raw as UserResponse[];
      return { items, total: items.length, page: 1, limit: items.length, totalPages: 1 };
    }

    // Фолбэк
    const obj = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
    return {
      items: [],
      total: typeof obj.total === 'number' ? (obj.total as number) : 0,
      page: typeof obj.page === 'number' ? (obj.page as number) : 1,
      limit: typeof obj.limit === 'number' ? (obj.limit as number) : 0,
      totalPages: typeof obj.totalPages === 'number' ? (obj.totalPages as number) : 1,
    };
  }
}

export const usersAPI = new UsersAPI();
