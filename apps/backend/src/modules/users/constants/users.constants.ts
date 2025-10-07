// path: apps/backend/src/modules/users/constants/users.constants.ts
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

  SECURITY: {
    PASSWORD_HASH_ROUNDS: 12,
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION_MINUTES: 15,
    SESSION_TIMEOUT_HOURS: 24,
  },

  ROLES: {
    /**
     * 🔐 ИЕРАРХИЯ РОЛЕЙ (чем выше число - тем выше привилегии)
     * 
     * Системные роли (1000-500): platform-level, companyId = null
     * Компанейские роли (400-100): company-level, привязаны к companyId
     */
    HIERARCHY: {
      // === СИСТЕМНЫЕ РОЛИ (Platform-level) ===
      superadmin: 1000,           // Абсолютный доступ ко всему
      platform_admin: 900,        // Управление платформой (без доступа к системным ролям)
      system_operator: 800,       // Технические операции платформы
      auditor: 650,               // Аудит и мониторинг (read-only на всё)
      support_engineer: 580,      // Техподдержка (ограниченный доступ)

      // === КОМПАНЕЙСКИЕ РОЛИ (Company-level) ===
      company_owner: 400,         // Владелец компании (полный доступ в рамках компании)
      company_admin: 370,         // Администратор компании (почти полный доступ)
      manager: 350,               // Менеджер (управление операциями)
      lead_mechanic: 200,         // Старший механик
      service_advisor: 170,       // Сервис-адвайзер
      diagnostic: 160,            // Диагност
      inventory_manager: 150,     // Менеджер склада
      cashier: 130,               // Кассир
      mechanic: 120,              // Механик
      viewer: 100,                // Просмотр (read-only)
    } as const,

    /**
     * 🔐 СПИСКИ РОЛЕЙ ПО КАТЕГОРИЯМ
     */
    
    /**
     * Системные роли (Platform-level)
     * Могут назначаться ТОЛЬКО superadmin
     * Имеют companyId = null, isSystem = true
     */
    SYSTEM_ROLE_NAMES: [
      'superadmin',
      'platform_admin',
      'system_operator',
      'auditor',
      'support_engineer',
    ] as const,

    /**
     * Platform-level роли (кроме superadmin)
     * Могут работать с несколькими компаниями
     */
    PLATFORM_ROLE_NAMES: [
      'platform_admin',
      'system_operator',
      'auditor',
      'support_engineer',
    ] as const,

    /**
     * Компанейские роли
     * Привязаны к конкретной компании (companyId !== null)
     * isSystem = false
     */
    COMPANY_ROLE_NAMES: [
      'company_owner',
      'company_admin',
      'manager',
      'lead_mechanic',
      'service_advisor',
      'diagnostic',
      'inventory_manager',
      'cashier',
      'mechanic',
      'viewer',
    ] as const,

    /**
     * Роли, которые могут управлять другими пользователями
     */
    CAN_MANAGE_USERS: [
      'superadmin',
      'platform_admin',
      'company_owner',
      'company_admin',
      'manager',
    ] as const,

    /**
     * Роли, которые могут приглашать пользователей
     */
    CAN_INVITE_USERS: [
      'superadmin',
      'platform_admin',
      'company_owner',
      'company_admin',
    ] as const,
  },

  DEFAULTS: {
    USER_STATUS: 'active',
    SORT_FIELD: 'firstName',
    SORT_ORDER: 'ASC',
  },
} as const;

/**
 * 🔐 TYPE-SAFE HELPERS
 */

export type SystemRoleName = typeof USERS_CONSTANTS.ROLES.SYSTEM_ROLE_NAMES[number];
export type PlatformRoleName = typeof USERS_CONSTANTS.ROLES.PLATFORM_ROLE_NAMES[number];
export type CompanyRoleName = typeof USERS_CONSTANTS.ROLES.COMPANY_ROLE_NAMES[number];
export type RoleName = SystemRoleName | CompanyRoleName;

/**
 * 🔐 HELPER FUNCTIONS
 */

export function isSystemRole(roleName: string): boolean {
  return USERS_CONSTANTS.ROLES.SYSTEM_ROLE_NAMES.includes(roleName.toLowerCase() as any);
}

export function isPlatformRole(roleName: string): boolean {
  return USERS_CONSTANTS.ROLES.PLATFORM_ROLE_NAMES.includes(roleName.toLowerCase() as any);
}

export function isCompanyRole(roleName: string): boolean {
  return USERS_CONSTANTS.ROLES.COMPANY_ROLE_NAMES.includes(roleName.toLowerCase() as any);
}

export function canManageUsers(roleName: string): boolean {
  return USERS_CONSTANTS.ROLES.CAN_MANAGE_USERS.includes(roleName.toLowerCase() as any);
}

export function canInviteUsers(roleName: string): boolean {
  return USERS_CONSTANTS.ROLES.CAN_INVITE_USERS.includes(roleName.toLowerCase() as any);
}
