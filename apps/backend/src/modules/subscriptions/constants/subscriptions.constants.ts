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
  },
  CACHE_TTL: {
    SUBSCRIPTION: 1800, // 30 минут
    LIMITS: 900,        // 15 минут
    ACTIVE_SUBSCRIPTION: 1800, // 30 минут
  },
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
