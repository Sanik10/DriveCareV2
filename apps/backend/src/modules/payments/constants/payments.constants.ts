// apps/backend/src/modules/payments/constants/payments.constants.ts
import { PaymentStatus, PaymentCurrency, PaymentMethodType } from '../types/payments.types';
import { AuditAction } from '../../../common/audit/audit.service';
import { AuthRole } from '../../auth/types/auth.types';

export const PAYMENTS_CONSTANTS = {
  DEFAULTS: {
    PAGE_SIZE: 20,
    MAX_ITEMS: 100,
    CURRENCY: PaymentCurrency.RUB,
    STATUS: PaymentStatus.PENDING,
    PAYMENT_TIMEOUT_MINUTES: 30,
    MAX_REFUND_DAYS: 365,
    MIN_PAYMENT_AMOUNT: 0.01,
  },

  VALIDATION: {
    AMOUNT: {
      MIN: 0.01,
      MAX: 10000000,
    },
    TRANSACTION_ID: {
      MIN_LENGTH: 3,
      MAX_LENGTH: 100,
      PATTERN: /^[a-zA-Z0-9\-_]{3,100}$/,
    },
    NOTES: {
      MAX_LENGTH: 1000,
    },
    REFUND: {
      MIN_AMOUNT: 0.01,
      MAX_PERCENTAGE: 100,
    },
  },

  STATUS_TRANSITIONS: {
    [PaymentStatus.PENDING]: [
      PaymentStatus.PROCESSING,
      PaymentStatus.FAILED,
      PaymentStatus.CANCELED,
      PaymentStatus.EXPIRED,
    ],
    [PaymentStatus.PROCESSING]: [
      PaymentStatus.PROCESSED,
      PaymentStatus.FAILED,
      PaymentStatus.CANCELED,
    ],
    [PaymentStatus.PROCESSED]: [
      PaymentStatus.REFUNDED,
      PaymentStatus.PARTIALLY_REFUNDED,
      PaymentStatus.DISPUTED,
      PaymentStatus.CHARGEBACK,
    ],
    [PaymentStatus.FAILED]: [PaymentStatus.PENDING, PaymentStatus.CANCELED],
    [PaymentStatus.CANCELED]: [],
    [PaymentStatus.REFUNDED]: [PaymentStatus.DISPUTED],
    [PaymentStatus.PARTIALLY_REFUNDED]: [PaymentStatus.REFUNDED, PaymentStatus.DISPUTED],
    [PaymentStatus.DISPUTED]: [
      PaymentStatus.PROCESSED,
      PaymentStatus.REFUNDED,
      PaymentStatus.CHARGEBACK,
    ],
    [PaymentStatus.CHARGEBACK]: [],
    [PaymentStatus.EXPIRED]: [PaymentStatus.PENDING],
  } as Record<PaymentStatus, PaymentStatus[]>,

  STATUS_COLORS: {
    [PaymentStatus.PENDING]: '#f59e0b',
    [PaymentStatus.PROCESSING]: '#3b82f6',
    [PaymentStatus.PROCESSED]: '#10b981',
    [PaymentStatus.FAILED]: '#ef4444',
    [PaymentStatus.CANCELED]: '#6b7280',
    [PaymentStatus.REFUNDED]: '#8b5cf6',
    [PaymentStatus.PARTIALLY_REFUNDED]: '#a855f7',
    [PaymentStatus.DISPUTED]: '#f97316',
    [PaymentStatus.CHARGEBACK]: '#dc2626',
    [PaymentStatus.EXPIRED]: '#9ca3af',
  },

  STATUS_DISPLAY: {
    [PaymentStatus.PENDING]: 'Ожидает обработки',
    [PaymentStatus.PROCESSING]: 'Обрабатывается',
    [PaymentStatus.PROCESSED]: 'Успешно обработан',
    [PaymentStatus.FAILED]: 'Ошибка обработки',
    [PaymentStatus.CANCELED]: 'Отменен',
    [PaymentStatus.REFUNDED]: 'Возврат средств',
    [PaymentStatus.PARTIALLY_REFUNDED]: 'Частичный возврат',
    [PaymentStatus.DISPUTED]: 'Спорная транзакция',
    [PaymentStatus.CHARGEBACK]: 'Chargeback',
    [PaymentStatus.EXPIRED]: 'Истек срок',
  },

  CURRENCY_INFO: {
    [PaymentCurrency.RUB]: { symbol: '₽', decimals: 2, name: 'Российский рубль' },
    [PaymentCurrency.USD]: { symbol: '$', decimals: 2, name: 'Доллар США' },
    [PaymentCurrency.EUR]: { symbol: '€', decimals: 2, name: 'Евро' },
    [PaymentCurrency.GBP]: { symbol: '£', decimals: 2, name: 'Британский фунт' },
    [PaymentCurrency.CNY]: { symbol: '¥', decimals: 2, name: 'Китайский юань' },
    [PaymentCurrency.JPY]: { symbol: '¥', decimals: 0, name: 'Японская йена' },
    [PaymentCurrency.KZT]: { symbol: '₸', decimals: 2, name: 'Казахстанский тенге' },
    [PaymentCurrency.BYN]: { symbol: 'Br', decimals: 2, name: 'Белорусский рубль' },
    [PaymentCurrency.UAH]: { symbol: '₴', decimals: 2, name: 'Украинская гривна' },
  },

  PAYMENT_METHOD_INFO: {
    [PaymentMethodType.CASH]: { icon: '💵', name: 'Наличные', processingTime: 0 },
    [PaymentMethodType.CARD]: { icon: '💳', name: 'Банковская карта', processingTime: 300 },
    [PaymentMethodType.BANK_TRANSFER]: { icon: '🏦', name: 'Банковский перевод', processingTime: 3600 },
    [PaymentMethodType.INSTALLMENTS]: { icon: '📅', name: 'Рассрочка', processingTime: 1800 },
    [PaymentMethodType.CORPORATE]: { icon: '🏢', name: 'Корпоративная карта', processingTime: 600 },
    [PaymentMethodType.DIGITAL_WALLET]: { icon: '📱', name: 'Цифровой кошелек', processingTime: 180 },
    [PaymentMethodType.CRYPTO]: { icon: '₿', name: 'Криптовалюта', processingTime: 900 },
    [PaymentMethodType.CHECK]: { icon: '📝', name: 'Чек', processingTime: 86400 },
    [PaymentMethodType.WIRE_TRANSFER]: { icon: '🌐', name: 'SWIFT перевод', processingTime: 172800 },
  },

  ROLES: {
    CAN_RECORD_PAYMENT: ['superadmin', 'company_owner', 'company_admin', 'manager'] as AuthRole[],
    CAN_PROCESS_PAYMENT: ['superadmin', 'company_owner', 'company_admin', 'manager'] as AuthRole[],
    CAN_REFUND_PAYMENT: ['superadmin', 'company_owner', 'company_admin'] as AuthRole[],
    CAN_VIEW_PAYMENT_HISTORY: ['superadmin', 'company_owner', 'company_admin', 'manager'] as AuthRole[],
    CAN_VIEW_FINANCIAL_REPORTS: ['superadmin', 'company_owner', 'company_admin'] as AuthRole[],
    CAN_MANAGE_PAYMENT_METHODS: ['superadmin', 'company_owner', 'company_admin'] as AuthRole[],
    CAN_DISPUTE_PAYMENT: ['superadmin', 'company_owner', 'company_admin'] as AuthRole[],
    CAN_VIEW_COMPANY_BALANCE: ['superadmin', 'company_owner', 'company_admin', 'manager'] as AuthRole[],
  },

  // Новые флаги
  BUSINESS_RULES: {
    ENABLE_FISCALIZATION: false, // Отключает фискализацию по всему модулю
    AUTO_PROCESS_CASH_PAYMENTS: true,
    AUTO_UPDATE_INVOICE_STATUS: true,
    REQUIRE_APPROVAL_FOR_LARGE_REFUNDS: true,
    LARGE_REFUND_THRESHOLD: 100000,
    SEND_NOTIFICATIONS_ON_STATUS_CHANGE: true,
    ENABLE_CURRENCY_CONVERSION: true,
    DEFAULT_EXCHANGE_RATE_SERVICE: 'cbr_ru',
    AUTO_EXPIRE_PENDING_PAYMENTS_HOURS: 24,
    ENABLE_FRAUD_DETECTION: true,
    MAX_DAILY_PAYMENT_AMOUNT: 1000000,
    ENABLE_INSTALLMENT_PLANS: true,
  },

  SECURITY: {
    ENCRYPT_TRANSACTION_IDS: true,
    LOG_ALL_PAYMENT_ACTIONS: true,
    REQUIRE_TWO_FACTOR_FOR_REFUNDS: false,
    MASK_SENSITIVE_DATA_IN_LOGS: true,
    PAYMENT_DATA_RETENTION_DAYS: 2555,
    ANONYMIZE_EXPIRED_PAYMENTS: true,
  },

  AUDIT_ACTIONS: {
    PAYMENT_RECORDED: AuditAction.PAYMENT_CREATED,
    PAYMENT_PROCESSED: AuditAction.PAYMENT_PROCESSED,
    PAYMENT_FAILED: AuditAction.PAYMENT_FAILED,
    PAYMENT_CANCELED: AuditAction.PAYMENT_CANCELED,
    PAYMENT_REFUNDED: AuditAction.PAYMENT_REFUNDED,
    PAYMENT_PARTIALLY_REFUNDED: AuditAction.PAYMENT_PARTIALLY_REFUNDED,
    PAYMENT_DISPUTED: AuditAction.PAYMENT_DISPUTED,
    PAYMENT_STATUS_CHANGED: AuditAction.PAYMENT_STATUS_CHANGED,
    PAYMENT_VIEWED: AuditAction.PAYMENT_VIEWED,
    PAYMENT_UPDATED: AuditAction.PAYMENT_UPDATED,
    PAYMENT_DELETED: AuditAction.PAYMENT_DELETED,
    PAYMENT_EXPIRED: AuditAction.PAYMENT_EXPIRED,
    BALANCE_CALCULATED: AuditAction.PAYMENT_BALANCE_CALCULATED,
    FINANCIAL_REPORT_GENERATED: AuditAction.PAYMENT_STATISTICS_GENERATED,
    OVERDUE_PAYMENTS_PROCESSED: AuditAction.PAYMENT_OVERDUE_PROCESSED,
  },
} as const;

export type PaymentStatusKeys = keyof typeof PAYMENTS_CONSTANTS.STATUS_DISPLAY;
export type PaymentCurrencyKeys = keyof typeof PAYMENTS_CONSTANTS.CURRENCY_INFO;
export type PaymentMethodTypeKeys = keyof typeof PAYMENTS_CONSTANTS.PAYMENT_METHOD_INFO;
