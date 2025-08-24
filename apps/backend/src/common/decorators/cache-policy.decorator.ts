// path: apps/backend/src/common/decorators/cache-policy.decorator.ts
import { SetMetadata } from '@nestjs/common';

export const CACHE_POLICY_KEY = 'cachePolicy';

/**
 * Устанавливает произвольную политику кеширования для ответа.
 * Пример: @CachePolicy('public, max-age=3600, must-revalidate')
 */
export const CachePolicy = (policy: string) => SetMetadata(CACHE_POLICY_KEY, policy);

/**
 * Упрощённый декоратор для разрешения кеширования.
 * По умолчанию: public, max-age={seconds}, must-revalidate
 */
export const AllowCache = (
  maxAgeSeconds = 3600,
  visibility: 'public' | 'private' = 'public',
  extraDirectives: string[] = ['must-revalidate'],
) => {
  const policy = [visibility, `max-age=${maxAgeSeconds}`, ...extraDirectives].join(', ');
  return CachePolicy(policy);
};

/**
 * Явный запрет кеширования (строгий no-store).
 */
export const NoStore = () =>
  CachePolicy('no-cache, no-store, must-revalidate, private');
