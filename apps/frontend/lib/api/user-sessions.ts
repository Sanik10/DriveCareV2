// path: apps/frontend/lib/api/user-sessions.ts
import { apiRequest } from './core';

export interface AdminUserSession {
  id: string;
  deviceId: string;
  deviceName?: string | null;
  userAgent: string;
  ipAddress: string;
  isActive: boolean;
  lastUsedAt?: string | null;
  createdAt: string;
  expiresAt: string;
  compromisedAt?: string | null;
}

function toISO(value: unknown): string | null {
  if (value == null) return null;
  const d = new Date(value as string | number);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * Админский просмотр сессий пользователя
 * GET /api/v1/users/:id/sessions
 */
export async function listUserSessions(userId: string): Promise<AdminUserSession[]> {
  try {
    const res = await apiRequest<unknown>(`/users/${encodeURIComponent(userId)}/sessions`, { method: 'GET' });
    if (!Array.isArray(res)) return [];
    return (res as any[]).map((s) => ({
      id: String(s.id),
      deviceId: String(s.deviceId ?? ''),
      deviceName: typeof s.deviceName === 'string' ? s.deviceName : null,
      userAgent: String(s.userAgent ?? ''),
      ipAddress: String(s.ipAddress ?? ''),
      isActive: Boolean(s.isActive),
      lastUsedAt: toISO((s as any).lastUsedAt),
      createdAt: toISO((s as any).createdAt) || new Date(0).toISOString(),
      expiresAt: toISO((s as any).expiresAt) || new Date(0).toISOString(),
      compromisedAt: toISO((s as any).compromisedAt),
    }));
  } catch {
    return [];
  }
}

export type UserSession = AdminUserSession;
