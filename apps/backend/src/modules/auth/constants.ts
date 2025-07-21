import { ConfigService } from '@nestjs/config';

// Deprecated: используйте AUTH_CONSTANTS из ./constants/auth.constants.ts
export const JWT_CONFIG = {
  secret: process.env.JWT_SECRET || 'your-secret-key',
  expiresIn: process.env.JWT_EXPIRATION || '15m',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d',
};

// Функция для получения конфигурации JWT через ConfigService
export const getJwtConfig = (configService: ConfigService) => ({
  secret: configService.get('JWT_SECRET', JWT_CONFIG.secret),
  expiresIn: configService.get('JWT_EXPIRATION', JWT_CONFIG.expiresIn),
  refreshSecret: configService.get('JWT_REFRESH_SECRET', JWT_CONFIG.refreshSecret),
  refreshExpiresIn: configService.get('JWT_REFRESH_EXPIRATION', JWT_CONFIG.refreshExpiresIn),
});