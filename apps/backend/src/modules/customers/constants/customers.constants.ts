import { AuditAction } from '../../../common/audit/audit.service';

export const CUSTOMERS_CONSTANTS = {
  DEFAULTS: {
    PAGE_SIZE: 20,
    MAX_ITEMS: 100,
    DEFAULT_CUSTOMER_TYPE: 'individual',
    DEFAULT_LOYALTY_POINTS: 0,
    DEFAULT_IS_ACTIVE: true,
  },

  VALIDATION: {
    MIN_NAME_LENGTH: 2,
    MAX_NAME_LENGTH: 100,
    MAX_EMAIL_LENGTH: 255,
    MAX_PHONE_LENGTH: 50,
    MAX_COMPANY_NAME_LENGTH: 255,
    MAX_TAX_NUMBER_LENGTH: 50,
    MAX_SOURCE_LENGTH: 50,
  },

  SEARCH: {
    MIN_SEARCH_LENGTH: 2,
    SEARCHABLE_FIELDS: ['firstName', 'lastName', 'companyName', 'email', 'phone'],
  },

  AUDIT_ACTIONS: {
    CREATE: AuditAction.CUSTOMER_CREATED,
    UPDATE: AuditAction.CUSTOMER_UPDATED,
    DELETE: AuditAction.CUSTOMER_DELETED,
    STATUS_CHANGE: AuditAction.CUSTOMER_STATUS_CHANGED,
    VIEW: AuditAction.CUSTOMER_VIEWED,
  },

  LOG_MESSAGES: {
    CREATED: 'Создан новый клиент',
    UPDATED: 'Обновлен клиент',
    DELETED: 'Удален клиент',
    STATUS_CHANGED: 'Изменен статус клиента',
    NOT_FOUND: 'Клиент не найден',
    ACCESS_DENIED: 'Отказано в доступе к клиенту',
  },
} as const;

export const CUSTOMER_TYPES = {
  INDIVIDUAL: 'individual',
  COMPANY: 'company',
} as const;

export const CUSTOMER_SOURCES = {
  WEBSITE: 'website',
  REFERRAL: 'referral',
  ADVERTISING: 'advertising',
  SOCIAL_MEDIA: 'social_media',
  WALK_IN: 'walk_in',
  PHONE_CALL: 'phone_call',
  OTHER: 'other',
} as const;
