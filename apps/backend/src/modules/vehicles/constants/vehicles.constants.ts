// path: apps/backend/src/modules/vehicles/constants/vehicles.constants.ts
export const VEHICLES_CONSTANTS = {
  DEFAULTS: {
    PAGE_SIZE: 20,
    MAX_ITEMS: 100,
    DEFAULT_IS_ACTIVE: true,
    DEFAULT_MILEAGE: 0,
  },

  VALIDATION: {
    VIN_LENGTH: 17,
    MIN_LICENSE_PLATE_LENGTH: 2,
    MAX_LICENSE_PLATE_LENGTH: 20,
    MIN_YEAR: 1900,
    MAX_YEAR: new Date().getFullYear() + 2, // Текущий год + 2
    MAX_COLOR_LENGTH: 50,
    MIN_ENGINE_VOLUME: 0.1,
    MAX_ENGINE_VOLUME: 20.0,
    MAX_MILEAGE: 9999999,
    MAX_NOTES_LENGTH: 2000,
  },

  SEARCH: {
    MIN_SEARCH_LENGTH: 2,
    SEARCHABLE_FIELDS: ['vin', 'licensePlate', 'color', 'notes'],
  },

  LOG_MESSAGES: {
    CREATED: 'Создан новый автомобиль',
    UPDATED: 'Обновлен автомобиль',
    DELETED: 'Удален автомобиль',
    STATUS_CHANGED: 'Изменен статус автомобиля',
    NOT_FOUND: 'Автомобиль не найден',
    ACCESS_DENIED: 'Отказано в доступе к автомобилю',
    VIN_EXISTS: 'Автомобиль с таким VIN уже существует',
    LICENSE_PLATE_EXISTS: 'Автомобиль с таким номером уже существует в компании',
  },

  FEATURES: {
    VIN_VALIDATION_ENABLED: true,
    LICENSE_PLATE_VALIDATION_ENABLED: true,
    SERVICE_HISTORY_INTEGRATION: true,
    MILEAGE_TRACKING: true,
  },
} as const;

export const VEHICLE_ENGINE_TYPES = {
  PETROL: 'petrol',
  DIESEL: 'diesel',
  ELECTRIC: 'electric',
  HYBRID: 'hybrid',
} as const;

export const VEHICLE_SEARCH_FIELDS = [
  'vin',
  'licensePlate',
  'color',
  'notes',
  'customer.firstName',
  'customer.lastName',
  'customer.companyName',
  'model.name',
  'model.brand.name',
] as const;
