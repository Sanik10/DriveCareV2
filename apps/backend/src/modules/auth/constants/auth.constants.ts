// ✅ ИСПРАВЛЕНО: Вынесена функция санитизации наружу
function sanitizeForRedisKey(input: string): string {
  return input.replace(/[^a-zA-Z0-9@._-]/g, '_');
}

export const AUTH_CONSTANTS = {
  REDIS_KEYS: {
    REFRESH_TOKEN: (userId: string, deviceId: string) => 
      `refresh_token:${sanitizeForRedisKey(userId)}:${sanitizeForRedisKey(deviceId)}`,
    FAILED_LOGIN: (ipAddress: string, email: string) => 
      `login:failed:${sanitizeForRedisKey(ipAddress)}:${sanitizeForRedisKey(email)}`,
    BLOCKED_LOGIN: (ipAddress: string, email: string) => 
      `login:blocked:${sanitizeForRedisKey(ipAddress)}:${sanitizeForRedisKey(email)}`,
  },
  
  DEFAULTS: {
    MAX_FAILED_ATTEMPTS: 5,
    LOGIN_BLOCK_TIME: 15 * 60,
    FAILED_ATTEMPTS_TTL: 60 * 60,
    REFRESH_TOKEN_TTL: 60 * 60 * 24 * 7,
  },
  
  JWT: {
    ACCESS_TOKEN_EXPIRATION: '15m',
    REFRESH_TOKEN_EXPIRATION: '7d',
  },

  // ✅ ОБНОВЛЕНО: Все роли совпадают с auth.types.ts
  SYSTEM_ROLES: {
    // Platform level
    SUPERADMIN: 'superadmin',
    PLATFORM_ADMIN: 'platform_admin',
    AUDITOR: 'auditor',
    SUPPORT_ENGINEER: 'support_engineer',
    SYSTEM_OPERATOR: 'system_operator',
    
    // Company level  
    COMPANY_OWNER: 'company_owner',
    COMPANY_ADMIN: 'company_admin',
    MANAGER: 'manager',
    CASHIER: 'cashier',
    INVENTORY_MANAGER: 'inventory_manager',
    SERVICE_ADVISOR: 'service_advisor',
    LEAD_MECHANIC: 'lead_mechanic',
    MECHANIC: 'mechanic',
    DIAGNOSTIC: 'diagnostic',
    
    // ✅ ОБНОВЛЕНО: backwards compatibility
    OWNER: 'company_owner',
    ADMIN: 'company_admin',
  }
} as const;

// ✅ ЭКСПОРТ функции отдельно
export { sanitizeForRedisKey };
