// path: apps/backend/src/common/utils/sanitize.util.ts
/* eslint-disable @typescript-eslint/no-var-requires */

/**
 * Безопасная очистка строк для DTO (без HTML, без атрибутов).
 * - корректно работает с ESM/CJS экспортом sanitize-html
 * - graceful fallback, если lib не установлена/сломана
 */
export function sanitizePlainText(input: unknown): string {
  if (typeof input !== 'string') return '';
  const value = input.trim().replace(/\s+/g, ' ');
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const lib = require('sanitize-html');
    const fn = lib?.default ?? lib;
    if (typeof fn === 'function') {
      return fn(value, { allowedTags: [], allowedAttributes: {} });
    }
  } catch {
    // ignore
  }
  // Фоллбек: грубо срезаем тэги
  return value.replace(/<[^>]*>/g, '');
}
