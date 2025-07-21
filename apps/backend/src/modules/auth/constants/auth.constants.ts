export const AUTH_CONSTANTS = {
  REDIS_KEYS: {
    REFRESH_TOKEN: (userId: string, deviceId: string) => 
      `refresh_token:${userId}:${deviceId}`,
    FAILED_LOGIN: (ipAddress: string, email: string) => 
      `login:failed:${ipAddress}:${email}`,
    BLOCKED_LOGIN: (ipAddress: string, email: string) => 
      `login:blocked:${ipAddress}:${email}`,
  },
  
  DEFAULTS: {
    MAX_FAILED_ATTEMPTS: 5,
    LOGIN_BLOCK_TIME: 15 * 60, // 15 минут
    FAILED_ATTEMPTS_TTL: 60 * 60, // 1 час
    REFRESH_TOKEN_TTL: 60 * 60 * 24 * 7, // 7 дней
  },
  
  JWT: {
    ACCESS_TOKEN_EXPIRATION: '15m',
    REFRESH_TOKEN_EXPIRATION: '7d',
  },

  SYSTEM_ROLES: {
	SUPERADMIN: 'superadmin',
    OWNER: 'owner',
    ADMIN: 'admin', 
    MANAGER: 'manager',
    MECHANIC: 'mechanic',
  }
} as const;