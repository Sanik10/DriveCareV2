// path: apps/frontend/lib/format.ts

export function formatCurrencyRu(amount?: number | null, currency: 'RUB' | string = 'RUB'): string {
  if (amount == null) return '—';
  try {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    // Фоллбек
    return `${amount} ${currency}`;
  }
}

export function formatLimit(value?: number | null): string {
  if (value == null) return 'Безлимит';
  if (value < 0) return 'Безлимит';
  return String(value);
}
