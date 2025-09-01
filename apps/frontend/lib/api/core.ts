// path: apps/frontend/lib/api/core.ts
/**
 * Базовый URL API для фронта.
 * Используем значение из .env без дополнительных "умных" правил,
 * чтобы не ломать кросс-доменную авторизацию.
 *
 * Приоритет:
 * - NEXT_PUBLIC_API_URL (например: http://localhost:3001/api/v1)
 * - NEXT_PUBLIC_API_BASE_URL (например: /api/v1 или полный URL)
 * - fallback: http://localhost:3001/api/v1
 */
export function getApiBase(): string {
  const base =
    (process.env.NEXT_PUBLIC_API_URL as string) ||
    (process.env.NEXT_PUBLIC_API_BASE_URL as string) ||
    "http://localhost:3001/api/v1";
  return base.replace(/\/+$/, "");
}

/**
 * Склейка базового URL и endpoint.
 */
export function buildApiUrl(endpoint: string): string {
  const base = getApiBase();
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${base}${path}`;
}
