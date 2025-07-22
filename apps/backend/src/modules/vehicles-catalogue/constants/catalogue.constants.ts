export const CATALOGUE_CONSTANTS = {
  VALIDATION: {
    MIN_NAME_LENGTH: 2,
    MAX_NAME_LENGTH: 100,
    MAX_DESCRIPTION_LENGTH: 500,
    MAX_COUNTRY_LENGTH: 50,
    MAX_LOGO_URL_LENGTH: 255,
    MAX_CLASS_LENGTH: 50,
    MIN_YEAR: 1900,
    MAX_YEAR: new Date().getFullYear() + 5,
  },

  FEATURES: {
    BRAND_LOGO_VALIDATION: true,
    MODEL_YEAR_VALIDATION: true,
    AUDIT_LOGGING_ENABLED: true,
  },

  LOG_MESSAGES: {
    BRAND_CREATED: 'Создан новый бренд',
    BRAND_UPDATED: 'Обновлен бренд',
    BRAND_DELETED: 'Удален бренд',
    MODEL_CREATED: 'Создана новая модель',
    MODEL_UPDATED: 'Обновлена модель',
    MODEL_DELETED: 'Удалена модель',
    TYPE_CREATED: 'Создан новый тип ТС',
    TYPE_UPDATED: 'Обновлен тип ТС',
    TYPE_DELETED: 'Удален тип ТС',
  },
} as const;
