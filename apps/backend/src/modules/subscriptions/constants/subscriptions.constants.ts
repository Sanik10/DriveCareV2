// apps/backend/src/modules/subscriptions/constants/subscriptions.constants.ts
import { AuditAction } from '../../../common/audit/audit.service';

export const SUBSCRIPTIONS_CONSTANTS = {
  DEFAULTS: {
    PAGE_SIZE: 20,
    MAX_ITEMS: 100,
    DEFAULT_PAYMENT_METHOD: 'manual',
    AUTO_RENEW: false,
  },
  VALIDATION: {
    PAYMENT_METHOD_MAX_LENGTH: 50,
  },
  REDIS_KEYS: {
    SUBSCRIPTION_CACHE: (id: string) => `subscription:cache:${id}`,
    ACTIVE_SUBSCRIPTION: (companyId: string) => `subscription:active:${companyId}`,
    COMPANY_LIMITS: (companyId: string) => `subscription:limits:${companyId}`,
    EXPIRED_CHECK: 'subscriptions:expired_check_last_run',
    IDEMPOTENCY_CREATE: (companyId: string, hash: string) => `idemp:subscription:create:${companyId}:${hash}`, // ⬅️ NEW
  },
  CACHE_TTL: {
    SUBSCRIPTION: 1800,
    LIMITS: 900,
    ACTIVE_SUBSCRIPTION: 1800,
    IDEMPOTENCY: 15 * 60, // 15 минут ⬅️ NEW
  },
  RATE_LIMITS: {
    CREATE: { limit: 10, ttlSec: 60 },
    LIST: { limit: 50, ttlSec: 60 },
    GET_ACTIVE: { limit: 100, ttlSec: 60 },
    UPDATE: { limit: 20, ttlSec: 60 },
    CANCEL: { limit: 10, ttlSec: 60 },
    CRON: { limit: 1, ttlSec: 60 },
  },
  STATUS_TRANSITIONS: {
    pending:   ['active', 'canceled', 'suspended'],
    active:    ['suspended', 'canceled', 'expired', 'inactive'],
    suspended: ['active', 'canceled', 'expired'],
    canceled:  [],
    expired:   ['active', 'inactive'],
    inactive:  ['active'],
  } as const,
  PAYMENT_METHODS: ['manual', 'bank_transfer', 'card', 'mir', 'sbp', 'wallet'] as const,
  AUDIT_ACTIONS: {
    SUBSCRIPTION_CREATED: AuditAction.SUBSCRIPTION_CREATED,
    SUBSCRIPTION_UPDATED: AuditAction.SUBSCRIPTION_UPDATED,
    SUBSCRIPTION_CANCELED: AuditAction.SUBSCRIPTION_CANCELED,
    SUBSCRIPTION_EXPIRED: AuditAction.SUBSCRIPTION_EXPIRED,
    SUBSCRIPTION_RENEWED: AuditAction.SUBSCRIPTION_RENEWED,
    LIMIT_CHECK_FAILED: AuditAction.LIMIT_CHECK_FAILED,
    LIMIT_EXCEEDED: AuditAction.LIMIT_EXCEEDED,
  },
} as const;
