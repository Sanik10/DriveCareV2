// path: apps/backend/src/modules/payment-methods/constants/payment-methods.constants.ts
export const PAYMENT_METHODS_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  MIN_PROCESSING_FEE: 0,
  MAX_PROCESSING_FEE: 10, // 10%
  MIN_AMOUNT_LIMIT: 0.01,
  MAX_AMOUNT_LIMIT: 1_000_000,
  MAX_NAME_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 500,
  DEFAULT_SORT_BY: 'name',
  DEFAULT_SORT_ORDER: 'ASC' as const,

  SUPPORTED_GATEWAYS: [
    'stripe',
    'yookassa',
    'sberbank',
    'tinkoff',
    'cash',
    'bank_transfer',
    'corporate_account',
  ] as const,

  MAX_INSTALLMENT_MONTHS: 60,
  MIN_DOWN_PAYMENT_PERCENT: 10,
  MAX_DAILY_TRANSACTIONS: 1000,
} as const;

export const PAYMENT_METHOD_VALIDATION_MESSAGES = {
  NAME_REQUIRED: 'Название способа оплаты обязательно',
  NAME_TOO_LONG: `Название не может быть длиннее ${PAYMENT_METHODS_CONSTANTS.MAX_NAME_LENGTH} символов`,
  DESCRIPTION_TOO_LONG: `Описание не может быть длиннее ${PAYMENT_METHODS_CONSTANTS.MAX_DESCRIPTION_LENGTH} символов`,
  PROCESSING_FEE_INVALID: 'Комиссия должна быть от 0 до 10%',
  AMOUNT_LIMIT_INVALID: 'Некорректные лимиты сумм',
  GATEWAY_NOT_SUPPORTED: 'Неподдерживаемый платежный шлюз',
  INTEGRATION_CONFIG_REQUIRED: 'Требуется конфигурация интеграции',
  INSTALLMENT_CONFIG_INVALID: 'Некорректные настройки рассрочки',
} as const;

export type PaymentGateway = (typeof PAYMENT_METHODS_CONSTANTS.SUPPORTED_GATEWAYS)[number];
