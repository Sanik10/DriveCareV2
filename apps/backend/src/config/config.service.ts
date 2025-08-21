// apps/backend/src/config/config.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

/**
 * 🔧 TYPED CONFIGURATION SERVICE
 *
 * Type-safe доступ ко всем конфигурациям:
 * ✅ Full type safety
 * ✅ IntelliSense support
 * ✅ Runtime validation
 * ✅ Environment awareness
 */
@Injectable()
export class AppConfigService {
  constructor(private configService: NestConfigService) {}

  // 🌍 Application Configuration
  get app() {
    return {
      name: this.configService.get<string>('app.name'),
      version: this.configService.get<string>('app.version'),
      environment: this.configService.get<string>('app.environment'),
      port: this.configService.get<number>('app.port'),
      apiPrefix: this.configService.get<string>('app.apiPrefix'),
      frontendUrl: this.configService.get<string>('app.frontendUrl'),
      isDevelopment: this.configService.get<boolean>('app.isDevelopment'),
      isProduction: this.configService.get<boolean>('app.isProduction'),
      isTest: this.configService.get<boolean>('app.isTest'),
      isStaging: this.configService.get<boolean>('app.isStaging'),
    };
  }

  // 🗄️ Database Configuration
  get database() {
    return {
      type: this.configService.get<'postgres'>('database.type'),
      host: this.configService.get<string>('database.host'),
      port: this.configService.get<number>('database.port'),
      username: this.configService.get<string>('database.username'),
      password: this.configService.get<string>('database.password'),
      database: this.configService.get<string>('database.database'),
      testDatabase: this.configService.get<string>('database.testDatabase'),
      synchronize: this.configService.get<boolean>('database.synchronize'),
      autoMigrate: this.configService.get<boolean>('database.autoMigrate'),
      ssl: {
        enabled: this.configService.get<boolean>('database.ssl.enabled'),
        rejectUnauthorized: this.configService.get<boolean>('database.ssl.rejectUnauthorized'),
        ca: this.configService.get<string>('database.ssl.ca'),
        cert: this.configService.get<string>('database.ssl.cert'),
        key: this.configService.get<string>('database.ssl.key'),
      },
      connectionTimeout: this.configService.get<number>('database.connectionTimeout'),
      maxConnections: this.configService.get<number>('database.maxConnections'),
      minConnections: this.configService.get<number>('database.minConnections'),
      idleTimeout: this.configService.get<number>('database.idleTimeout'),
    };
  }

  // 🔴 Redis Configuration
  get redis() {
    return {
      url: this.configService.get<string>('redis.url'),
      host: this.configService.get<string>('redis.host'),
      port: this.configService.get<number>('redis.port'),
      password: this.configService.get<string>('redis.password'),
      db: this.configService.get<number>('redis.db'),
      connectTimeout: this.configService.get<number>('redis.connectTimeout'),
      commandTimeout: this.configService.get<number>('redis.commandTimeout'),
      retryDelayOnFailover: this.configService.get<number>('redis.retryDelayOnFailover'),
      maxRetriesPerRequest: this.configService.get<number>('redis.maxRetriesPerRequest'),
    };
  }

  // 🔐 JWT Configuration
  get jwt() {
    return {
      secret: this.configService.get<string>('jwt.secret'),
      refreshSecret: this.configService.get<string>('jwt.refreshSecret'),
      accessTokenExpiration: this.configService.get<string>('jwt.accessTokenExpiration'),
      refreshTokenExpiration: this.configService.get<string>('jwt.refreshTokenExpiration'),
      issuer: this.configService.get<string>('jwt.issuer'),
      audience: this.configService.get<string>('jwt.audience'),
      alg: this.configService.get<string>('jwt.alg'),
      kid: this.configService.get<string>('jwt.kid'),
    };
  }

  // 🌐 CORS Configuration
  get cors() {
    return {
      origins: this.configService.get<string[]>('cors.origins'),
      credentials: this.configService.get<boolean>('cors.credentials'),
      methods: this.configService.get<string[]>('cors.methods'),
      allowedHeaders: this.configService.get<string[]>('cors.allowedHeaders'),
      exposedHeaders: this.configService.get<string[]>('cors.exposedHeaders'),
      maxAge: this.configService.get<number>('cors.maxAge'),
    };
  }

  // 📚 Swagger Configuration
  get swagger() {
    return {
      path: this.configService.get<string>('swagger.path'),
      title: this.configService.get<string>('swagger.title'),
      description: this.configService.get<string>('swagger.description'),
      version: this.configService.get<string>('swagger.version'),
      enabled: this.configService.get<boolean>('swagger.enabled'),
    };
  }

  // 🔒 Security Configuration
  get security() {
    return {
      argon2: {
        timeCost: this.configService.get<number>('security.argon2.timeCost'),
        memoryCost: this.configService.get<number>('security.argon2.memoryCost'),
        parallelism: this.configService.get<number>('security.argon2.parallelism'),
      },
      rateLimiting: {
        ttl: this.configService.get<number>('security.rateLimiting.ttl'),
        limit: this.configService.get<number>('security.rateLimiting.limit'),
      },
      passwordPolicy: {
        minLength: this.configService.get<number>('security.passwordPolicy.minLength'),
        requireUppercase: this.configService.get<boolean>('security.passwordPolicy.requireUppercase'),
        requireLowercase: this.configService.get<boolean>('security.passwordPolicy.requireLowercase'),
        requireNumbers: this.configService.get<boolean>('security.passwordPolicy.requireNumbers'),
        requireSpecialChars: this.configService.get<boolean>('security.passwordPolicy.requireSpecialChars'),
        maxLength: this.configService.get<number>('security.passwordPolicy.maxLength'),
      },
      session: {
        maxSessions: this.configService.get<number>('security.session.maxSessions'),
        sessionTimeout: this.configService.get<number>('security.session.sessionTimeout'),
        rememberMeTimeout: this.configService.get<number>('security.session.rememberMeTimeout'),
      },
      audit: {
        logToDb: this.configService.get<boolean>('security.audit.logToDb'),
        chainKey: this.configService.get<string>('security.audit.chainKey'),
      },
    };
  }

  // 🌱 Seeds Configuration
  get seeds() {
    return {
      allowInStaging: this.configService.get<boolean>('seeds.allowInStaging'),
      autoRun: this.configService.get<boolean>('seeds.autoRun'),
    };
  }

  // 📁 Upload Configuration
  get upload() {
    return {
      maxFileSize: this.configService.get<number>('upload.maxFileSize'),
      allowedTypes: this.configService.get<string[]>('upload.allowedTypes'),
      destination: this.configService.get<string>('upload.destination'),
    };
  }

  // 📧 Email Configuration
  get email() {
    return {
      host: this.configService.get<string>('email.host'),
      port: this.configService.get<number>('email.port'),
      secure: this.configService.get<boolean>('email.secure'),
      auth: {
        user: this.configService.get<string>('email.auth.user'),
        pass: this.configService.get<string>('email.auth.pass'),
      },
      from: this.configService.get<string>('email.from'),
    };
  }

  // 🔔 Notification Configuration
  get notification() {
    return {
      slack: {
        webhookUrl: this.configService.get<string>('notification.slack.webhookUrl'),
      },
      telegram: {
        botToken: this.configService.get<string>('notification.telegram.botToken'),
        chatId: this.configService.get<string>('notification.telegram.chatId'),
      },
    };
  }

  // 📊 Monitoring Configuration
  get monitoring() {
    return {
      sentry: {
        dsn: this.configService.get<string>('monitoring.sentry.dsn'),
        environment: this.configService.get<string>('monitoring.sentry.environment'),
      },
      datadog: {
        apiKey: this.configService.get<string>('monitoring.datadog.apiKey'),
      },
      newRelic: {
        licenseKey: this.configService.get<string>('monitoring.newRelic.licenseKey'),
      },
    };
  }

  // 🌐 External Services Configuration
  get external() {
    return {
      google: {
        clientId: this.configService.get<string>('external.google.clientId'),
        clientSecret: this.configService.get<string>('external.google.clientSecret'),
      },
      aws: {
        accessKeyId: this.configService.get<string>('external.aws.accessKeyId'),
        secretAccessKey: this.configService.get<string>('external.aws.secretAccessKey'),
        region: this.configService.get<string>('external.aws.region'),
        s3Bucket: this.configService.get<string>('external.aws.s3Bucket'),
      },
    };
  }

  // 🧾 Orders Configuration
  get orders() {
    return {
      retentionYears: this.configService.get<number>('orders.retentionYears'),
      sanitizeNotesEnabled: this.configService.get<boolean>('orders.sanitizeNotesEnabled'),
      limits: {
        maxPartsPerOrder: this.configService.get<number>('orders.limits.maxPartsPerOrder'),
        maxServicesPerOrder: this.configService.get<number>('orders.limits.maxServicesPerOrder'),
      },
    };
  }

  // 👥 Customers Configuration (новое)
  get customers() {
    return {
      retentionYears: this.configService.get<number>('customers.retentionYears'),
      sanitizeTextsEnabled: this.configService.get<boolean>('customers.sanitizeTextsEnabled'),
      pagination: {
        maxPageSize: this.configService.get<number>('customers.pagination.maxPageSize'),
      },
    };
  }

  // 🧮 Payments/KKT Configuration
  get payments() {
    return {
      enableFiscalization: this.configService.get<boolean>('payments.enableFiscalization'),
      kktSerialNumber: this.configService.get<string>('payments.kktSerialNumber'),
    };
  }

  // 🔧 Utility methods
  isEnvironment(env: 'development' | 'staging' | 'production' | 'test'): boolean {
    return this.app.environment === env;
  }

  isDatabaseSSLEnabled(): boolean {
    return this.database.ssl.enabled;
  }

  getRedisConnectionString(): string {
    if (this.redis.url) {
      return this.redis.url;
    }
    const auth = this.redis.password ? `:${this.redis.password}@` : '';
    return `redis://${auth}${this.redis.host}:${this.redis.port}/${this.redis.db}`;
  }

  getDatabaseConnectionString(): string {
    const { host, port, username, password, database } = this.database;
    return `postgresql://${username}:${password}@${host}:${port}/${database}`;
  }
}
