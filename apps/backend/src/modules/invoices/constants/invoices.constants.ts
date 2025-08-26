// apps/backend/src/modules/invoices/constants/invoices.constants.ts
import { InvoiceStatus } from '../../../database/entities/invoice.entity';
import { AuditAction } from '../../../common/audit/audit.service';

export const INVOICES_CONSTANTS = {
  DEFAULTS: {
    PAGE_SIZE: 20,
    MAX_ITEMS: 100,
    STATUS: InvoiceStatus.ISSUED,
    TAX_RATE: 0.2, // 20% НДС
    PAYMENT_TERMS_DAYS: 30,
  },

  VALIDATION: {
    INVOICE_NUMBER: {
      MIN_LENGTH: 10,
      MAX_LENGTH: 50,
      PATTERN: /^INV-\d{4}-\d{5}$/, // INV-YYYY-NNNNN
    },
    AMOUNT: {
      MIN: 0.01,
      MAX: 10000000,
    },
    DUE_DATE: {
      MIN_DAYS_FROM_NOW: 1,
      MAX_DAYS_FROM_NOW: 365,
    },
    NOTES: {
      MAX_LENGTH: 1000,
      SAFE_PATTERN: /^[a-zA-Zа-яА-Я0-9\s\-.,;:!?()\n\r]+$/,
    },
  },

  STATUS_TRANSITIONS: {
    [InvoiceStatus.ISSUED]: [InvoiceStatus.PAID, InvoiceStatus.CANCELED] as InvoiceStatus[],
    [InvoiceStatus.PAID]: [] as InvoiceStatus[],
    [InvoiceStatus.CANCELED]: [] as InvoiceStatus[],
  },

  ROLES: {
    CAN_CREATE: ['company_owner', 'company_admin', 'manager'],
    CAN_UPDATE: ['company_owner', 'company_admin', 'manager'],
    CAN_DELETE: ['company_owner', 'company_admin'],
    CAN_CHANGE_STATUS: ['company_owner', 'company_admin', 'manager'], // cashier удалён
    CAN_VIEW_ALL: ['company_owner', 'company_admin', 'manager', 'cashier'],
    CAN_CANCEL: ['company_owner', 'company_admin', 'manager'],
  },

  AUDIT_ACTIONS: {
    CREATED: AuditAction.INVOICE_CREATED,
    UPDATED: AuditAction.INVOICE_UPDATED,
    STATUS_CHANGED: AuditAction.INVOICE_STATUS_CHANGED,
    CANCELED: AuditAction.INVOICE_CANCELED,
    PAID: AuditAction.INVOICE_PAID,
    OVERDUE_DETECTED: AuditAction.INVOICE_OVERDUE_DETECTED,
    PAYMENT_RECEIVED: AuditAction.INVOICE_PAYMENT_RECEIVED,
    AUTO_GENERATED: AuditAction.INVOICE_AUTO_GENERATED_FROM_ORDER,
    VIEWED: AuditAction.INVOICE_VIEWED,
  },

  BUSINESS_RULES: {
    AUTO_CALCULATE_TAX: true,
    AUTO_GENERATE_INVOICE_NUMBER: true,
    ALLOW_EDIT_PAID_INVOICES: false,
    SEND_NOTIFICATIONS_ON_STATUS_CHANGE: true,
    AUTO_MARK_PAID_ON_FULL_PAYMENT: true,
    OVERDUE_WARNING_DAYS: 3,
    AUTO_CANCEL_OVERDUE_DAYS: 90,
    ALLOW_PARTIAL_PAYMENTS: true,
  },

  LIMITS: {
    MAX_INVOICES_FREE: 50,
    MAX_INVOICES_BASIC: 500,
    MAX_INVOICES_PREMIUM: 10000,
  },
} as const;

export const INVOICE_STATUS_DISPLAY = {
  [InvoiceStatus.ISSUED]: 'Выставлен',
  [InvoiceStatus.PAID]: 'Оплачен',
  [InvoiceStatus.CANCELED]: 'Отменен',
} as const;

export const INVOICE_STATUS_COLORS = {
  [InvoiceStatus.ISSUED]: '#f59e0b',
  [InvoiceStatus.PAID]: '#10b981',
  [InvoiceStatus.CANCELED]: '#ef4444',
} as const;
