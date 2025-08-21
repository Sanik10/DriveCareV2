// path: apps/backend/src/modules/subscriptions/subscription-billing/constants/billing.constants.ts
export const BILLING_CONSTANTS = {
  ROUTE: 'subscription-billing',
  PROVIDERS: ['yookassa', 'tinkoff'] as const,
  RATE_LIMITS: {
    CREATE: { limit: 10, ttlMs: 60_000 },
    PAYMENT: { limit: 50, ttlMs: 60_000 },
    CANCEL: { limit: 10, ttlMs: 60_000 },
    ACTIVE: { limit: 100, ttlMs: 60_000 },
    REPORT: { limit: 10, ttlMs: 60_000 },
    ANALYTICS: { limit: 20, ttlMs: 60_000 },
    WEBHOOK: { limit: 120, ttlMs: 60_000 },
  },
  CACHE_TTL: {
    ACTIVE_SUBSCRIPTION_MS: 30 * 60 * 1000,
    COMPLIANCE_REPORT_MS: 10 * 60 * 1000,
    IDEMPOTENCY_MS: 15 * 60 * 1000,
    WEBHOOK_DEDUP_MS: 60 * 60 * 1000, // 1 час удержания обработанных событий
  },
  REDIS_KEYS: {
    IDEMPOTENCY_CREATE: (companyId: string, hash: string) => `idemp:billing:create:${companyId}:${hash}`,
    IDEMPOTENCY_PAYMENT: (companyId: string, hash: string) => `idemp:billing:payment:${companyId}:${hash}`,
    WEBHOOK_EVENT: (provider: string, eventId: string) => `billing:webhook:${provider}:${eventId}`,
  },
  WEBHOOK: {
    SIGNATURE_HEADERS: {
      yookassa: 'authorization', // Authorization: Signature ...
      tinkoff: 'x-content-hmac-sha256', // пример — уточняется в guard
    },
  },
  MAX_METADATA_BYTES: 10 * 1024,
  MAX_GATEWAY_RESPONSE_BYTES: 5 * 1024,
} as const;

export const COMPLIANCE_CONSTANTS = {
  FZ_242: {
    LAW: 'ФЗ-242',
    REQUIREMENTS: ['serverRegion=RU', 'dataProcessingLocation=RU'],
    FINE: 'до 18 млн ₽',
  },
  FZ_152: {
    LAW: 'ФЗ-152',
    CONSENT_REQUIRED: true,
  },
  FZ_161: {
    LAW: 'ФЗ-161',
    MIR_REQUIRED: true,
  },
  FZ_115: {
    LAW: 'ФЗ-115',
    AML_REQUIRED: true,
  },
  CONSUMER_RIGHTS: {
    LAW: 'Права потребителей',
    COOLING_OFF_DAYS: 14,
  },
} as const;

export const CONSUMER_RIGHTS = {
  COOLING_OFF_PERIOD_DAYS: 14,
  INFORMATION_DELIVERY_MAX_HOURS: 24,
  CANCELLATION_PROCESSING_MAX_HOURS: 72,
  REFUND_PROCESSING_MAX_DAYS: 14,
  COMPLAINT_RESPONSE_MAX_DAYS: 30,
} as const;

export const BILLING_LIMITS = {
  MAX_AUTOMATIC_PAYMENT_RUB: 100_000,
  SUSPICIOUS_AMOUNT_THRESHOLD_RUB: 15_000,
  MAX_PAYMENTS_PER_HOUR: 20,
  MAX_SUBSCRIPTIONS_PER_DAY: 5,
  MAX_REFUND_PERCENTAGE: 100,
  MAX_REFUND_DAYS: 14,
  COMPLIANCE_CHECK_INTERVAL_HOURS: 24,
  VIOLATION_TOLERANCE_LEVEL: 0,
} as const;
