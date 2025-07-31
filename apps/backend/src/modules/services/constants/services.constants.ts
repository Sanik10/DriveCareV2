export const SERVICES_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  MIN_SERVICE_PRICE: 0.01,
  MAX_SERVICE_PRICE: 999999.99,
  MIN_DURATION_MINUTES: 1,
  MAX_DURATION_MINUTES: 1440, // 24 часа
  DEFAULT_SORT_BY: 'name',
  DEFAULT_SORT_ORDER: 'ASC' as const,
} as const;

export const SERVICE_VALIDATION_MESSAGES = {
  NAME_REQUIRED: 'Название услуги обязательно',
  NAME_TOO_LONG: 'Название услуги не может быть длиннее 255 символов',
  DESCRIPTION_TOO_LONG: 'Описание услуги не может быть длиннее 1000 символов',
  PRICE_INVALID: 'Цена должна быть положительным числом',
  PRICE_TOO_HIGH: `Цена не может превышать ${SERVICES_CONSTANTS.MAX_SERVICE_PRICE}`,
  DURATION_INVALID: 'Длительность должна быть положительным числом',
  DURATION_TOO_LONG: `Длительность не может превышать ${SERVICES_CONSTANTS.MAX_DURATION_MINUTES} минут`,
  CATEGORY_REQUIRED: 'Категория услуги обязательна',
  CATEGORY_INVALID: 'Указанная категория не существует',
} as const;

export const SERVICE_STATUS_TRANSITIONS = {
  CAN_ACTIVATE: ['inactive'],
  CAN_DEACTIVATE: ['active'],
} as const;
