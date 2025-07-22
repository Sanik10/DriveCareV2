import { AuditAction } from '../../../common/audit/audit.service';

export const TARIFFS_CONSTANTS = {
  DEFAULTS: {
    PAGE_SIZE: 20,
    MAX_ITEMS: 100,
    MIN_PRICE: 0,
    MAX_PRICE: 999999.99,
    DEFAULT_IS_ACTIVE: true,
    UNLIMITED_VALUE: -1, // Значение для безлимитных тарифов
  },
  VALIDATION: {
    NAME_MAX_LENGTH: 100,
    DESCRIPTION_MAX_LENGTH: 1000,
    PRICE_PRECISION: 10,
    PRICE_SCALE: 2,
    MIN_MONTHLY_PRICE: 0,
    MIN_YEARLY_PRICE: 0,
    MAX_LIMIT_VALUE: 999999,
  },
  REDIS_KEYS: {
    TARIFF_CACHE: (id: string) => `tariff:cache:${id}`,
    ACTIVE_TARIFFS: 'tariffs:active',
    ALL_TARIFFS: 'tariffs:all',
  },
  CACHE_TTL: {
    TARIFF: 7200,       // 2 часа (тарифы редко меняются)
    ACTIVE_TARIFFS: 3600, // 1 час
    ALL_TARIFFS: 1800,   // 30 минут
  },
  FEATURES: {
    BASIC: {
      reports: false,
      analytics: false,
      api_access: false,
      priority_support: false,
      custom_fields: false,
    },
    STANDARD: {
      reports: true,
      analytics: false,
      api_access: false,
      priority_support: false,
      custom_fields: true,
    },
    PREMIUM: {
      reports: true,
      analytics: true,
      api_access: true,
      priority_support: true,
      custom_fields: true,
    },
  },
  AUDIT_ACTIONS: {
    TARIFF_CREATED: AuditAction.TARIFF_CREATED,
    TARIFF_UPDATED: AuditAction.TARIFF_UPDATED,
    TARIFF_STATUS_CHANGED: AuditAction.TARIFF_STATUS_CHANGED,
    TARIFF_DELETED: AuditAction.TARIFF_DELETED,
  },
} as const;
