import { AuditAction } from '../../../common/audit/audit.service';

export const COMPANIES_CONSTANTS = {
  DEFAULTS: {
    PAGE_SIZE: 20,
    MAX_ITEMS: 100,
    DEFAULT_WORKING_HOURS: {
      monday: { open: '09:00', close: '18:00', isOpen: true },
      tuesday: { open: '09:00', close: '18:00', isOpen: true },
      wednesday: { open: '09:00', close: '18:00', isOpen: true },
      thursday: { open: '09:00', close: '18:00', isOpen: true },
      friday: { open: '09:00', close: '18:00', isOpen: true },
      saturday: { open: '10:00', close: '16:00', isOpen: true },
      sunday: { open: '00:00', close: '00:00', isOpen: false },
    },
  },
  VALIDATION: {
    NAME_MAX_LENGTH: 255,
    EMAIL_MAX_LENGTH: 255,
    PHONE_MAX_LENGTH: 50,
    TAX_NUMBER_MAX_LENGTH: 50,
    WEBSITE_MAX_LENGTH: 255,
    LOGO_URL_MAX_LENGTH: 255,
  },
  REDIS_KEYS: {
    COMPANY_CACHE: (id: string) => `company:cache:${id}`,
    COMPANIES_LIST: 'companies:list',
    COMPANY_SUBSCRIPTION: (companyId: string) => `company:subscription:${companyId}`,
  },
  AUDIT_ACTIONS: {
    COMPANY_CREATED: AuditAction.COMPANY_CREATED,
    COMPANY_UPDATED: AuditAction.COMPANY_UPDATED,
    COMPANY_STATUS_CHANGED: AuditAction.COMPANY_STATUS_CHANGED,
    COMPANY_DELETED: AuditAction.COMPANY_DELETED,
  },
} as const;