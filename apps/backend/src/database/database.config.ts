import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

/**
 * 🗄️ ENTERPRISE DATABASE CONFIGURATION
 * Environment-specific configuration with enhanced security
 */
export const getDatabaseConfig = (configService: ConfigService): TypeOrmModuleOptions => {
  const environment = configService.get('NODE_ENV', 'development');
  
  // 🔧 Базовые настройки
  const host = configService.get('POSTGRES_HOST', 'localhost');
  const port = parseInt(configService.get('POSTGRES_PORT', '5433'), 10);
  const username = configService.get('POSTGRES_USERNAME', 'postgres');
  const password = configService.get('POSTGRES_PASSWORD');
  const database = configService.get('POSTGRES_DATABASE', 'drivecare');
  
  // 🌍 Возвращаем конфигурацию в зависимости от environment
  if (environment === 'production') {
    // 🏭 PRODUCTION: Maximum security configuration
    return {
      type: 'postgres',
      host,
      port,
      username,
      password,
      database,
      entities: [__dirname + '/entities/*.entity{.ts,.js}'],
      migrations: [__dirname + '/migrations/*.{ts,js}'],
      migrationsTableName: 'migrations_history',
      migrationsRun: configService.get('DB_AUTO_MIGRATE', 'false') === 'true',
      synchronize: false,
      logging: ['error'],
      extra: {
        max: 25,
        min: 2,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
        ssl: {
          rejectUnauthorized: configService.get('DB_SSL_REJECT_UNAUTHORIZED', 'true') === 'true',
          ca: configService.get('DB_SSL_CA'),
          cert: configService.get('DB_SSL_CERT'),
          key: configService.get('DB_SSL_KEY'),
        },
      },
      retryAttempts: 3,
      retryDelay: 3000,
      autoLoadEntities: true,
      keepConnectionAlive: true,
      cache: configService.get('REDIS_HOST') ? {
        type: 'redis',
        options: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: parseInt(configService.get('REDIS_PORT', '6379'), 10),
          password: configService.get('REDIS_PASSWORD'),
        },
      } : false,
    };
  }
  
  if (environment === 'staging') {
    // 🎭 STAGING: Production-like with some debugging
    return {
      type: 'postgres',
      host,
      port,
      username,
      password,
      database,
      entities: [__dirname + '/entities/*.entity{.ts,.js}'],
      migrations: [__dirname + '/migrations/*.{ts,js}'],
      migrationsTableName: 'migrations_history',
      migrationsRun: false,
      synchronize: false, // 🚨 NO synchronize in staging
      logging: ['error', 'warn'],
      extra: {
        max: 15,
        min: 2,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
        ssl: configService.get('DB_SSL_ENABLED', 'false') === 'true' ? {
          rejectUnauthorized: false,
        } : undefined,
      },
      retryAttempts: 3,
      retryDelay: 3000,
      autoLoadEntities: true,
      keepConnectionAlive: true,
    };
  }
  
  if (environment === 'test') {
    // 🧪 TEST: Minimal configuration for testing
    return {
      type: 'postgres',
      host,
      port,
      username,
      password,
      database: configService.get('POSTGRES_TEST_DATABASE', 'drivecare_test'),
      entities: [__dirname + '/entities/*.entity{.ts,.js}'],
      migrations: [__dirname + '/migrations/*.{ts,js}'],
      migrationsTableName: 'migrations_history',
      migrationsRun: false,
      synchronize: true, // ✅ OK for test database
      dropSchema: true, // 🗑️ Clean slate for each test run
      logging: false, // 🔇 No logging during tests
      extra: {
        max: 5,
        min: 1,
        idleTimeoutMillis: 5000,
        connectionTimeoutMillis: 1000,
      },
      retryAttempts: 1,
      retryDelay: 1000,
      autoLoadEntities: true,
      keepConnectionAlive: false,
    };
  }
  
  // 🛠️ DEVELOPMENT (default): Full debugging and flexibility
  return {
    type: 'postgres',
    host,
    port,
    username,
    password,
    database,
    entities: [__dirname + '/entities/*.entity{.ts,.js}'],
    migrations: [__dirname + '/migrations/*.{ts,js}'],
    migrationsTableName: 'migrations_history',
    migrationsRun: false,
    synchronize: configService.get('DB_SYNCHRONIZE', 'true') === 'true', // ⚠️ Только в development
    logging: ['query', 'error', 'warn', 'info', 'log', 'schema'], // 🔍 Полное логирование для debug
    extra: {
      max: 10,
      min: 2,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    },
    retryAttempts: 3,
    retryDelay: 3000,
    autoLoadEntities: true,
    keepConnectionAlive: true,
  };
};

/**
 * 🏥 DATABASE HEALTH CHECK CONFIGURATION
 * Для использования в health check endpoints
 */
export const getDatabaseHealthConfig = (configService: ConfigService) => {
  return {
    timeout: 5000, // 5 seconds timeout for health checks
    retryAttempts: 3,
    retryInterval: 1000, // 1 second between retries
  };
};

/**
 * 🔧 DATABASE UTILITIES
 * Вспомогательные функции для работы с БД
 */
export const DatabaseUtils = {
  /**
   * 🔍 Validate database connection parameters
   */
  validateConnectionParams: (configService: ConfigService): void => {
    const requiredParams = [
      'POSTGRES_HOST', 
      'POSTGRES_PORT', 
      'POSTGRES_USERNAME', 
      'POSTGRES_PASSWORD', 
      'POSTGRES_DATABASE'
    ];
    
    const missingParams = requiredParams.filter(param => !configService.get(param));
    
    if (missingParams.length > 0) {
      throw new Error(`Missing required database configuration parameters: ${missingParams.join(', ')}`);
    }
  },

  /**
   * 🛡️ Sanitize database connection info for logging
   */
  getSafeConnectionInfo: (configService: ConfigService) => {
    return {
      host: configService.get('POSTGRES_HOST'),
      port: configService.get('POSTGRES_PORT'),
      database: configService.get('POSTGRES_DATABASE'),
      username: configService.get('POSTGRES_USERNAME'),
      // 🔒 NEVER log password
      ssl: configService.get('DB_SSL_ENABLED', 'false') === 'true',
      environment: configService.get('NODE_ENV', 'development'),
    };
  },
};

/**
 * 🔗 Default export для использования в app.module.ts
 */
export default getDatabaseConfig;
