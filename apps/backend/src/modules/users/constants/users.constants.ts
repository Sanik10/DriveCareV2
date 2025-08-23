// path: apps/backend/src/modules/users/users.constants.ts
export const USERS_CONSTANTS = {
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
  },
  
  VALIDATION: {
    MIN_PASSWORD_LENGTH: 8,
    MAX_NAME_LENGTH: 50,
    MAX_EMAIL_LENGTH: 255,
    MAX_PHONE_LENGTH: 15,
    MAX_SPECIALIZATION_LENGTH: 100,
  },
  
  // ✅ ДОБАВЛЕНО: SECURITY константы
  SECURITY: {
    PASSWORD_HASH_ROUNDS: 12,
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION_MINUTES: 15,
    SESSION_TIMEOUT_HOURS: 24,
  },
  
  // ✅ ДОБАВЛЕНО: ROLES иерархия
  ROLES: {
    HIERARCHY: {
      // Platform level
      'superadmin': 1000,
      'platform_admin': 900,
      'system_operator': 800,
      'auditor': 650,
      'support_engineer': 580,
      
      // Company level
      'company_owner': 400,
      'company_admin': 370,
      'manager': 350,
      'lead_mechanic': 200,
      'service_advisor': 170,
      'diagnostic': 160,
      'inventory_manager': 150,
      'cashier': 130,
      'mechanic': 120,
    }
  },
  
  DEFAULTS: {
    USER_STATUS: 'active',
    SORT_FIELD: 'firstName',
    SORT_ORDER: 'ASC',
  }
} as const;
