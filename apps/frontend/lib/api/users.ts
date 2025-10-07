// path: apps/frontend/lib/api/users.ts
import { apiRequest } from './core';
import type { UserInvite } from '../types/user-invites';
import type { User, UsersQuery, Role, PaginatedUsersResponse } from '../types/users';

/**
 * Вспомогательные нормализаторы для гибкости по контрактам бэка.
 */

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeRole(input: unknown): Role | null {
  if (!input) return null;

  let id: string | null = null;
  let name: string | null = null;

  if (typeof input === 'string') {
    name = input;
    id = input;
  } else if (isObject(input)) {
    const obj = input as Record<string, unknown>;
    id =
      (typeof obj.id === 'string' ? obj.id : null) ||
      (typeof obj.roleId === 'string' ? obj.roleId : null) ||
      (typeof obj.role_id === 'string' ? obj.role_id : null);

    name =
      (typeof obj.name === 'string' ? obj.name : null) ||
      (typeof obj.slug === 'string' ? obj.slug : null) ||
      (typeof obj.code === 'string' ? obj.code : null);
  }

  if (!id && !name) return null;
  return { id: String(id ?? name), name: String(name ?? id) };
}

function normalizeStatus(input: unknown): string | undefined {
  if (typeof input === 'string') return input;
  if (typeof input === 'boolean') return input ? 'active' : 'inactive';
  if (isObject(input) && typeof (input as Record<string, unknown>).isActive === 'boolean') {
    return (input as Record<string, unknown>).isActive ? 'active' : 'inactive';
  }
  return undefined;
}

function normalizeUser(input: unknown): User {
  if (!isObject(input)) {
    console.warn('normalizeUser received non-object input:', input);
    return {
      id: '',
      email: undefined,
      firstName: null,
      lastName: null,
      phone: null,
      role: null,
      status: undefined,
    };
  }

  const obj = input as Record<string, unknown>;
  const role = normalizeRole(obj.role);
  const status = normalizeStatus(obj.status ?? obj.isActive);

  return {
    id: String(obj.id ?? obj.userId ?? ''),
    email:
      typeof obj.email === 'string'
        ? obj.email
        : typeof obj.mail === 'string'
        ? obj.mail
        : undefined,
    firstName:
      typeof obj.firstName === 'string'
        ? obj.firstName
        : typeof obj.first_name === 'string'
        ? obj.first_name
        : null,
    lastName:
      typeof obj.lastName === 'string'
        ? obj.lastName
        : typeof obj.last_name === 'string'
        ? obj.last_name
        : null,
    phone:
      typeof obj.phone === 'string'
        ? obj.phone
        : typeof obj.phoneNumber === 'string'
        ? obj.phoneNumber
        : typeof obj.phone_number === 'string'
        ? obj.phone_number
        : null,
    role,
    status,
  };
}

function coerceDateISO(value: unknown): string {
  if (value == null) return new Date(0).toISOString();
  const d = new Date(value as string | number);
  return isNaN(d.getTime()) ? new Date(0).toISOString() : d.toISOString();
}

function getOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  return (process.env.NEXT_PUBLIC_APP_ORIGIN as string) || '';
}

function buildInviteUrlFromToken(token?: string): string | undefined {
  if (!token) return undefined;
  const origin = getOrigin();
  const base = origin ? `${origin}/register/invite` : '/register/invite';
  return `${base}?token=${encodeURIComponent(token)}`;
}

function normalizeInvite(input: unknown): UserInvite {
  if (!isObject(input)) {
    console.warn('normalizeInvite received non-object input:', input);
    return {
      id: '',
      email: '',
      roleId: '',
      status: 'pending',
      expiresAt: new Date(0).toISOString(),
      createdAt: new Date(0).toISOString(),
      inviteUrl: undefined,
    };
  }

  const obj = input as Record<string, unknown>;

  const rawStatus: string =
    ((typeof obj.status === 'string' ? obj.status : null) ??
      (typeof obj.state === 'string' ? obj.state : null) ??
      (typeof obj.inviteStatus === 'string' ? obj.inviteStatus : null)) ??
    'pending';

  const status = ((): UserInvite['status'] => {
    const s = String(rawStatus).toLowerCase();
    if (s === 'pending' || s === 'created' || s === 'sent') return 'pending';
    if (s === 'accepted' || s === 'confirmed') return 'accepted';
    if (s === 'revoked' || s === 'canceled' || s === 'cancelled') return 'revoked';
    if (s === 'expired') return 'expired';
    return 'pending';
  })();

  const token: string | undefined =
    (typeof obj.token === 'string' ? obj.token : undefined) ??
    (typeof obj.code === 'string' ? obj.code : undefined) ??
    (typeof obj.inviteToken === 'string' ? obj.inviteToken : undefined) ??
    (typeof obj.invite_token === 'string' ? obj.invite_token : undefined);

  const inviteUrl: string | undefined =
    (typeof obj.inviteUrl === 'string' ? obj.inviteUrl : undefined) ??
    (typeof obj.invite_url === 'string' ? obj.invite_url : undefined) ??
    buildInviteUrlFromToken(token);

  const roleId =
    (typeof obj.roleId === 'string' ? obj.roleId : null) ??
    (typeof obj.role_id === 'string' ? obj.role_id : null) ??
    (isObject(obj.role)
      ? (typeof (obj.role as any).id === 'string'
          ? (obj.role as any).id
          : null) ??
        (typeof (obj.role as any).roleId === 'string' ? (obj.role as any).roleId : null)
      : null);

  return {
    id: String(obj.id ?? obj.inviteId ?? obj.uuid ?? ''),
    email: String(obj.email ?? obj.invitedEmail ?? obj.mail ?? ''),
    roleId: roleId ? String(roleId) : '',
    status,
    expiresAt: coerceDateISO(obj.expiresAt ?? (obj as any).expires_at ?? (obj as any).expiresOn ?? (obj as any).expires ?? null),
    createdAt: coerceDateISO(obj.createdAt ?? (obj as any).created_at ?? (obj as any).createdOn ?? null),
    inviteUrl,
  };
}

function pick<T extends Record<string, unknown>>(obj: T, keys: string[]) {
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    if (k in obj && obj[k] !== undefined && obj[k] !== null) {
      out[k] = obj[k];
    }
  }
  return out;
}

function buildQuery(params: Record<string, unknown>) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '' || Number.isNaN(v)) return;
    q.set(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

function normalizePagination(raw: unknown) {
  const src = isObject(raw) ? (raw as Record<string, unknown>) : {};
  const data = isObject(src.data) ? src.data : src;
  const meta =
    isObject((data as any).meta)
      ? (data as any).meta
      : isObject((data as any).pagination)
      ? (data as any).pagination
      : {};

  const itemsRaw = Array.isArray((data as any).items)
    ? (data as any).items
    : Array.isArray((data as any).users)
    ? (data as any).users
    : Array.isArray((data as any).results)
    ? (data as any).results
    : Array.isArray((data as any).data)
    ? (data as any).data
    : [];

  const page =
    typeof (data as any).page === 'number'
      ? (data as any).page
      : typeof (meta as any).page === 'number'
      ? (meta as any).page
      : typeof (meta as any).currentPage === 'number'
      ? (meta as any).currentPage
      : 1;

  const limit =
    typeof (data as any).limit === 'number'
      ? (data as any).limit
      : typeof (meta as any).limit === 'number'
      ? (meta as any).limit
      : typeof (meta as any).pageSize === 'number'
      ? (meta as any).pageSize
      : 20;

  const total =
    typeof (data as any).total === 'number'
      ? (data as any).total
      : typeof (meta as any).total === 'number'
      ? (meta as any).total
      : typeof (meta as any).totalItems === 'number'
      ? (meta as any).totalItems
      : (itemsRaw as unknown[]).length;

  const totalPages =
    typeof (data as any).totalPages === 'number'
      ? (data as any).totalPages
      : typeof (meta as any).totalPages === 'number'
      ? (meta as any).totalPages
      : (Number(limit) > 0 ? Math.ceil(Number(total) / Number(limit)) : 1);

  const items = Array.isArray(itemsRaw) ? itemsRaw.map(normalizeUser) : [];

  return {
    items,
    page: Number(page),
    limit: Number(limit),
    total: Number(total),
    totalPages: Number(totalPages),
    hasNext: Number(page) < Number(totalPages),
    hasPrev: Number(page) > 1,
  } as PaginatedUsersResponse & { hasNext: boolean; hasPrev: boolean };
}

/**
 * Список пользователей компании (с пагинацией/поиском).
 */
export async function listUsers(
  params?: { q?: string; status?: 'active' | 'inactive' | 'suspended' | 'blocked' } & UsersQuery,
): Promise<PaginatedUsersResponse & { hasNext: boolean; hasPrev: boolean }> {
  const { q, status, ...rest } = params || {};
  const query: Record<string, unknown> = { ...rest };
  if (q && !query.search) query.search = q;

  const qp = { ...(pick(query, ['search', 'role', 'page', 'limit']) as Record<string, unknown>) } as Record<
    string,
    unknown
  > & { isActive?: boolean };

  if (status !== undefined) {
    qp.isActive = status === 'active';
  }

  const qs = buildQuery(qp);
  const res = await apiRequest<unknown>(`/users${qs}`, { method: 'GET' });
  return normalizePagination(res);
}

export async function getUser(id: string): Promise<User> {
  const res = await apiRequest<unknown>(`/users/${id}`, { method: 'GET' });
  const raw = isObject(res) && 'user' in res ? (res as any).user : res;
  return normalizeUser(raw);
}

/**
 * Доступные роли для назначения.
 * Для суперадмина/платформ-админа можно передать companyId, чтобы получить роли конкретной компании.
 */
export async function listAssignableRoles(companyId?: string): Promise<Role[]> {
  const qs = companyId ? `?companyId=${encodeURIComponent(companyId)}` : '';
  const res = await apiRequest<unknown>(`/users/roles${qs}`, { method: 'GET' });
  const raw = Array.isArray(res) ? (res as unknown[]) : [];
  return raw
    .map((r) => normalizeRole(r))
    .filter((r): r is Role => Boolean(r));
}

/* Invitations API — именованные экспорты (для компонентов) */
export async function listInvites(params?: { status?: 'pending' | 'accepted' | 'revoked' | 'expired' }): Promise<UserInvite[]> {
  const qs = buildQuery(params || {});
  const res = await apiRequest<unknown>(`/users/invitations${qs}`, { method: 'GET' });
  const rawData = isObject(res) ? (res as Record<string, unknown>) : {};
  const list =
    Array.isArray((rawData as any).items)
      ? (rawData as any).items
      : Array.isArray((rawData as any).data)
      ? (rawData as any).data
      : Array.isArray(res as any)
      ? (res as any)
      : [];
  return (list as unknown[]).map(normalizeInvite) as UserInvite[];
}

export async function createInvite(payload: { email: string; roleId: string; expiresInDays?: number }): Promise<UserInvite> {
  const body: Record<string, unknown> = {
    email: payload.email,
    roleId: payload.roleId,
    expiresInDays: payload.expiresInDays,
  };
  const res = await apiRequest<unknown>('/users/invitations', { method: 'POST', json: body });
  return normalizeInvite(res);
}

export async function resendInvite(id: string): Promise<{ success: true; inviteUrl?: string }> {
  const res = await apiRequest<unknown>(`/users/invitations/${id}/resend`, { method: 'POST', json: {} });
  const token: string | undefined = isObject(res)
    ? ((typeof (res as any).token === 'string' ? (res as any).token : undefined) ??
       (typeof (res as any).code === 'string' ? (res as any).code : undefined))
    : undefined;

  const inviteUrl: string | undefined = isObject(res)
    ? ((typeof (res as any).inviteUrl === 'string' ? (res as any).inviteUrl : undefined) ??
       (typeof (res as any).invite_url === 'string' ? (res as any).invite_url : undefined))
    : undefined;

  const finalUrl = inviteUrl ?? buildInviteUrlFromToken(token);
  return { success: true, inviteUrl: finalUrl };
}

export async function revokeInvite(id: string): Promise<void> {
  await apiRequest<void>(`/users/invitations/${id}`, { method: 'DELETE' });
}

/* Объект-обёртка для обратной совместимости с импортами вида { usersAPI } */
export const usersAPI = {
  list: listUsers,
  search: listUsers, // alias
  listUsers,
  listByRole: async (
    role: string,
    params?: Omit<UsersQuery, 'role'> & { q?: string; status?: 'active' | 'inactive' | 'suspended' | 'blocked' },
  ) => listUsers({ ...(params || {}), role }),
  listMechanics: async (
    params?: Omit<UsersQuery, 'role'> & { q?: string; status?: 'active' | 'inactive' | 'suspended' | 'blocked' },
  ) => {
    const [mechanic, lead] = await Promise.all([
      listUsers({ ...(params || {}), role: 'mechanic' }),
      listUsers({ ...(params || {}), role: 'lead_mechanic' }),
    ]);
    const merged = [...(mechanic.items || []), ...(lead.items || [])];
    const uniq = Array.from(new Map(merged.map((u) => [u.id, u])).values());
    return { ...mechanic, items: uniq };
  },
  get: getUser,
  getUser,
  createUser: async (payload: { fullName?: string; email: string; phone?: string; roleId: string; password?: string }): Promise<User> => {
    const { fullName, roleId, ...rest } = payload;
    let firstName: string | undefined;
    let lastName: string | undefined;

    if (fullName && !('firstName' in rest) && !('lastName' in rest)) {
      const parts = fullName.trim().split(/\s+/);
      firstName = parts.shift() || '';
      lastName = parts.join(' ');
    }

    const body: Record<string, unknown> = {
      ...rest,
      ...(firstName ? { firstName } : {}),
      ...(lastName ? { lastName } : {}),
      role_id: roleId,
    };

    const res = await apiRequest<unknown>('/users', { method: 'POST', json: body });
    return normalizeUser(res);
  },
  updateUserProfile: async (
    id: string,
    payload: { fullName?: string; phone?: string; firstName?: string; lastName?: string; email?: string },
  ): Promise<User> => {
    const { fullName, ...rest } = payload;
    let firstName = rest.firstName;
    let lastName = rest.lastName;

    if (fullName) {
      const parts = fullName.trim().split(/\s+/);
      firstName = firstName ?? parts.shift() ?? '';
      lastName = lastName ?? parts.join(' ');
    }

    const body: Record<string, unknown> = {
      ...rest,
      ...(firstName !== undefined ? { firstName } : {}),
      ...(lastName !== undefined ? { lastName } : {}),
    };

    const res = await apiRequest<unknown>(`/users/${id}/profile`, { method: 'PATCH', json: body });
    return normalizeUser(isObject(res) && 'user' in res ? (res as any).user : res);
  },
  updateUserRole: async (id: string, payload: { roleId: string }): Promise<User> => {
    const res = await apiRequest<unknown>(`/users/${id}/role`, { method: 'PATCH', json: { role_id: payload.roleId } });
    return normalizeUser(isObject(res) && 'user' in res ? (res as any).user : res);
  },
  updateUserStatus: async (id: string, payload: { status: 'active' | 'inactive' | 'suspended' | 'blocked' }): Promise<User> => {
    const isActive = payload.status === 'active';
    const res = await apiRequest<unknown>(`/users/${id}/status`, { method: 'PATCH', json: { isActive } });
    return normalizeUser(isObject(res) && 'user' in res ? (res as any).user : res);
  },
  changeUserPassword: async (id: string, payload: { newPassword: string }): Promise<{ success: boolean; message?: string }> =>
    apiRequest<{ success: boolean; message?: string }>(`/users/${id}/password`, { method: 'PATCH', json: payload }),
  deleteUser: async (id: string): Promise<void> => {
    await apiRequest<void>(`/users/${id}`, { method: 'DELETE' });
  },
  listInvites,
  createInvite,
  resendInvite,
  revokeInvite,
  listAssignableRoles,
};
