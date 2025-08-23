// path: apps/backend/src/config/config.module.ts
import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppConfigService } from './config.service';
import configurations from './configuration';
import { validateConfig } from './validation.schema';

/**
 * 🔧 GLOBAL CONFIGURATION MODULE
 * 
 * Centralized configuration management:
 * ✅ Global availability
 * ✅ Validation при startup
 * ✅ Type-safe configuration service
 * ✅ Environment-specific setup
 */
@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: configurations,
      validate: validateConfig,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
      envFilePath: [
        `.env.${process.env.NODE_ENV || 'development'}.local`,
        `.env.${process.env.NODE_ENV || 'development'}`,
        '.env.local',
        '.env',
        '../../.env', // Root level .env
      ],
      expandVariables: true,
      cache: true, // Cache configuration for performance
    }),
  ],
  providers: [AppConfigService],
  exports: [AppConfigService, ConfigModule],
})
export class AppConfigModule {}
