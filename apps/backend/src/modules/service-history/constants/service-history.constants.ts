export const SERVICE_HISTORY_CONSTANTS = {
  DEFAULTS: {
    PAGE_SIZE: 20,
    MAX_ITEMS: 100,
    DEFAULT_SORT_FIELD: 'date',
    DEFAULT_SORT_ORDER: 'desc',
  },

  VALIDATION: {
    MIN_DESCRIPTION_LENGTH: 10,
    MAX_DESCRIPTION_LENGTH: 2000,
    MAX_NOTES_LENGTH: 1000,
    MIN_MILEAGE: 0,
    MAX_MILEAGE: 9999999,
    MAX_DAYS_IN_PAST: 365 * 5, // 5 лет назад
    MAX_DAYS_IN_FUTURE: 365 * 2, // 2 года вперед
  },

  SEARCH: {
    MIN_SEARCH_LENGTH: 2,
    SEARCHABLE_FIELDS: ['description', 'notes', 'orderId'],
  },

  FEATURES: {
    AUTO_UPDATE_VEHICLE_DATES: true,
    AUDIT_LOGGING_ENABLED: true,
    ADVANCED_FILTERING: true,
  },

  LOG_MESSAGES: {
    CREATED: 'Создана новая запись истории обслуживания',
    UPDATED: 'Обновлена запись истории обслуживания',
    DELETED: 'Удалена запись истории обслуживания',
    NOT_FOUND: 'Запись истории обслуживания не найдена',
    ACCESS_DENIED: 'Отказано в доступе к записи истории обслуживания',
    VEHICLE_UPDATED: 'Обновлены даты ТО автомобиля',
  },

  BUSINESS_RULES: {
    AUTO_UPDATE_VEHICLE_SERVICE_DATES: true,
    REQUIRE_MILEAGE_FOR_COMPLETION: false,
    VALIDATE_CHRONOLOGICAL_ORDER: true,
    PREVENT_FUTURE_SERVICE_DATES: false,
  },
} as const;

export const SERVICE_HISTORY_SORT_FIELDS = [
  'date',
  'mileage', 
  'createdAt',
  'nextServiceDate',
] as const;

export const SERVICE_HISTORY_DATE_FILTERS = {
  LAST_WEEK: 'last_week',
  LAST_MONTH: 'last_month',
  LAST_3_MONTHS: 'last_3_months',
  LAST_6_MONTHS: 'last_6_months',
  LAST_YEAR: 'last_year',
  CUSTOM: 'custom',
} as const;
