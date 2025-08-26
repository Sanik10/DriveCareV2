// path: apps/backend/src/config/configuration.ts
import { registerAs } from '@nestjs/config';

const parseCsv = (input?: string): string[] =>
  input ? input.split(',').map((s) => s.trim()).filter(Boolean) : [];

// 🏗️ Database Configuration
export const databaseConfig = registerAs('database', () => ({
  type: 'postgres' as const,
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5433', 10),
  username: process.env.POSTGRES_USERNAME || 'postgres',
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DATABASE || 'drivecare',
  testDatabase: process.env.POSTGRES_TEST_DATABASE || 'drivecare_test',
  synchronize: process.env.DB_SYNCHRONIZE === 'true',
  autoMigrate: process.env.DB_AUTO_MIGRATE === 'true',
  ssl: {
    enabled: process.env.DB_SSL_ENABLED === 'true',
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
    ca: process.env.DB_SSL_CA,
    cert: process.env.DB_SSL_CERT,
    key: process.env.DB_SSL_KEY,
  },
  connectionTimeout: 2000,
  maxConnections: process.env.NODE_ENV === 'production' ? 25 : 10,
  minConnections: 2,
  idleTimeout: 30000,
}));

// 🔴 Redis Configuration
export const redisConfig = registerAs('redis', () => ({
  url: process.env.REDIS_URL,
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6380', 10),
  password: process.env.REDIS_PASSWORD,
  db: 0,
  connectTimeout: 5000,
  commandTimeout: 5000,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
}));

// 🔐 JWT Configuration
export const jwtConfig = registerAs('jwt', () => ({
  alg: process.env.JWT_ALG || 'HS256',
  secret: process.env.JWT_SECRET,
  refreshSecret: process.env.JWT_REFRESH_SECRET,
  privateKey: process.env.JWT_PRIVATE_KEY,
  publicKey: process.env.JWT_PUBLIC_KEY,
  accessTokenExpiration: process.env.JWT_EXPIRATION || '15m',
  refreshTokenExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
  issuer: process.env.JWT_ISSUER || 'drivecare-v2',
  audience: process.env.JWT_AUDIENCE || 'drivecare-users',
  kid: process.env.JWT_KID,
}));

// 🌍 Application Configuration
export const appConfig = registerAs('app', () => ({
  name: 'DriveCare API',
  version: process.env.APP_VERSION || '2.0',
  environment: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
  isStaging: process.env.NODE_ENV === 'staging',
}));

// 🌐 CORS Configuration
export const corsConfig = registerAs('cors', () => ({
  origins:
    process.env.CORS_ORIGINS?.split(',').map((origin) => origin.trim()) || [
      'http://localhost:3000',
      'http://localhost:5173',
    ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-API-Key',
    'X-Request-ID',
    'X-Idempotency-Key',
  ],
  exposedHeaders: ['X-Total-Count', 'X-Request-ID', 'X-API-Version'],
  maxAge: 86400,
}));

// 📚 Swagger Configuration
export const swaggerConfig = registerAs('swagger', () => ({
  path: process.env.SWAGGER_PATH || 'docs',
  title: process.env.SWAGGER_TITLE || 'DriveCare API',
  description: process.env.SWAGGER_DESCRIPTION || 'Система управления автосервисом - API документация',
  version: process.env.APP_VERSION || '2.0',
  enabled: process.env.NODE_ENV !== 'production',
}));

// 🔒 Security Configuration
export const securityConfig = registerAs('security', () => ({
  argon2: {
    timeCost: parseInt(process.env.ARGON2_TIME_COST || '3', 10),
    memoryCost: parseInt(process.env.ARGON2_MEMORY_COST || '19456', 10),
    parallelism: parseInt(process.env.ARGON2_PARALLELISM || '1', 10),
  },
  rateLimiting: {
    ttl: parseInt(process.env.RATE_LIMIT_TTL || '60000', 10),
    limit: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },
  passwordPolicy: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    maxLength: 128,
  },
  session: {
    maxSessions: 5,
    sessionTimeout: 24 * 60 * 60 * 1000,
    rememberMeTimeout: 30 * 24 * 60 * 60 * 1000,
  },
  audit: {
    logToDb: process.env.AUDIT_LOG_TO_DB === 'true',
    chainKey: process.env.AUDIT_CHAIN_KEY,
  },
}));

// 🌱 Seeds Configuration
export const seedsConfig = registerAs('seeds', () => ({
  allowInStaging: process.env.ALLOW_STAGING_SEEDS === 'true',
  autoRun: process.env.NODE_ENV === 'development',
  enabled:
    (process.env.SEEDS_ENABLED ??
      (process.env.NODE_ENV === 'development' ? 'true' : 'false')) === 'true',
  autoSyncOnSeeds: process.env.DB_AUTO_SYNC_ON_SEEDS === 'true',
}));

// 📁 Upload Configuration
export const uploadConfig = registerAs('upload', () => ({
  maxFileSize: parseInt(process.env.UPLOAD_MAX_FILE_SIZE || `${10 * 1024 * 1024}`, 10),
  allowedTypes: process.env.UPLOAD_ALLOWED_TYPES?.split(',') || [
    'image/jpeg',
    'image/png',
    'application/pdf',
  ],
  destination: process.env.UPLOAD_DEST || './uploads',
}));

// 📧 Email Configuration (optional)
export const emailConfig = registerAs('email', () => {
  const enabled = (process.env.EMAIL_ENABLED || 'false') === 'true';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure =
    process.env.SMTP_SECURE === 'true' || ['465', '2465', '994'].includes(String(process.env.SMTP_PORT));

  return {
    enabled,
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
    from: process.env.SMTP_FROM || 'noreply@drivecare.com',
    // Helper flag for consumers
    shouldSend:
      enabled &&
      !!process.env.SMTP_HOST &&
      !!process.env.SMTP_USER &&
      !!process.env.SMTP_PASSWORD,
  };
});

// 🔔 Notification Configuration (future)
export const notificationConfig = registerAs('notification', () => ({
  slack: {
    webhookUrl: process.env.SLACK_WEBHOOK_URL,
  },
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    chatId: process.env.TELEGRAM_CHAT_ID,
  },
}));

// 📊 Monitoring Configuration (future)
export const monitoringConfig = registerAs('monitoring', () => ({
  sentry: {
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
  },
  datadog: {
    apiKey: process.env.DATADOG_API_KEY,
  },
  newRelic: {
    licenseKey: process.env.NEW_RELIC_LICENSE_KEY,
  },
}));

// 🌐 External Services Configuration (future)
export const externalConfig = registerAs('external', () => ({
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  },
  aws: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'us-east-1',
    s3Bucket: process.env.AWS_S3_BUCKET,
  },
}));

// 💳 Billing Configuration
export const billingConfig = registerAs('billing', () => ({
  defaultProvider: process.env.DEFAULT_PAYMENT_PROVIDER || 'yookassa',
  providers: (process.env.PAYMENT_GATEWAYS || 'yookassa,tinkoff')
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean),
  webhooks: {
    // Subscription billing webhooks (existing)
    yookassaPath: process.env.YOOKASSA_WEBHOOK_PATH || 'subscription-billing/webhooks/yookassa',
    tinkoffPath: process.env.TINKOFF_WEBHOOK_PATH || 'subscription-billing/webhooks/tinkoff',
    // One-time payments webhooks (P0.2 wiring)
    payments: {
      yookassaPath: process.env.YOOKASSA_PAYMENTS_WEBHOOK_PATH || 'payments/webhooks/yookassa',
      tinkoffPath: process.env.TINKOFF_PAYMENTS_WEBHOOK_PATH || 'payments/webhooks/tinkoff',
    },
    // Security for PSP webhooks
    allowedIps: parseCsv(process.env.WEBHOOK_ALLOWED_IPS),
    idempotencyTtlSec: parseInt(process.env.WEBHOOK_IDEMPOTENCY_TTL_SEC || '300', 10),
  },
}));

// 🧾 Orders Configuration
export const ordersConfig = registerAs('orders', () => ({
  retentionYears: parseInt(process.env.ORDER_DATA_RETENTION_YEARS || '5', 10),
  sanitizeNotesEnabled: (process.env.SANITIZE_NOTES_ENABLED || 'true') === 'true',
  limits: {
    maxPartsPerOrder: parseInt(process.env.ORDER_MAX_PARTS_PER_ORDER || '100', 10),
    maxServicesPerOrder: parseInt(process.env.ORDER_MAX_SERVICES_PER_ORDER || '50', 10),
  },
}));

// 👥 Customers Configuration
export const customersConfig = registerAs('customers', () => ({
  retentionYears: parseInt(process.env.CUSTOMER_DATA_RETENTION_YEARS || '5', 10),
  sanitizeTextsEnabled: (process.env.SANITIZE_CUSTOMER_TEXTS || 'true') === 'true',
  pagination: {
    maxPageSize: parseInt(process.env.MAX_CUSTOMERS_PAGE_SIZE || '100', 10),
  },
  retentionCron: process.env.CUSTOMER_RETENTION_CRON || '0 3 * * *',
}));

// 📅 Appointments Configuration
export const appointmentsConfig = registerAs('appointments', () => ({
  sanitizeTextsEnabled: (process.env.SANITIZE_APPOINTMENT_TEXTS || 'true') === 'true',
  pagination: { maxPageSize: parseInt(process.env.APPOINTMENTS_MAX_PAGE_SIZE || '100', 10) },
  idempotencyTtlMs: parseInt(process.env.APPOINTMENTS_IDEMPOTENCY_TTL_MS || '600000', 10),
  allowOverlap: (process.env.APPOINTMENTS_ALLOW_OVERLAP || 'false') === 'true',
  timezoneDefault: process.env.APPOINTMENTS_TIMEZONE_DEFAULT || 'Europe/Moscow',
  retentionYears: parseInt(process.env.APPOINTMENT_DATA_RETENTION_YEARS || '5', 10),
  reminders: {
    enabled: (process.env.APPOINTMENTS_REMINDERS_ENABLED || 'false') === 'true',
    cron: process.env.APPOINTMENTS_REMINDERS_CRON || '0 9 * * *',
  },
}));

// Inventory Configuration
export const inventoryConfig = registerAs('inventory', () => ({
  sanitizeTextsEnabled: (process.env.SANITIZE_INVENTORY_TEXTS || 'true') === 'true',
  pagination: { maxPageSize: parseInt(process.env.INVENTORY_MAX_PAGE_SIZE || '100', 10) },
  alerts: {
    enabled: (process.env.INVENTORY_ALERTS_ENABLED || 'true') === 'true',
    cron: process.env.INVENTORY_ALERTS_CRON || '0 * * * *',
    lowStockDefault: parseInt(process.env.INVENTORY_LOW_STOCK_THRESHOLD_DEFAULT || '5', 10),
  },
  idempotencyTtlMs: parseInt(process.env.INVENTORY_IDEMPOTENCY_TTL_MS || '21600000', 10),
}));

// 🏭 Vehicles Catalogue Configuration
export const catalogueConfig = registerAs('catalogue', () => ({
  sanitizeTextsEnabled: (process.env.SANITIZE_CATALOGUE_TEXTS || 'true') === 'true',
  pagination: {
    defaultPage: 1,
    defaultLimit: 50,
    maxPageSize: parseInt(process.env.CATALOGUE_MAX_PAGE_SIZE || '200', 10),
  },
  cacheTtlSec: parseInt(process.env.CATALOGUE_CACHE_TTL_SEC || '3600', 10),
}));

// 🧮 Payments/KKT Configuration
export const paymentsConfig = registerAs('payments', () => ({
  enableFiscalization: (process.env.ENABLE_FISCALIZATION || 'false') === 'true',
  kktSerialNumber: process.env.KKT_SERIAL_NUMBER || null,
}));

// 📝 Service History Configuration
export const serviceHistoryConfig = registerAs('serviceHistory', () => ({
  sanitizeTextsEnabled: (process.env.SANITIZE_SERVICE_HISTORY_TEXTS || 'true') === 'true',
  pagination: {
    defaultPageSize: parseInt(process.env.SERVICE_HISTORY_DEFAULT_PAGE_SIZE || '20', 10),
    maxPageSize: parseInt(process.env.SERVICE_HISTORY_MAX_PAGE_SIZE || '100', 10),
  },
  searchLimit: parseInt(process.env.SERVICE_HISTORY_SEARCH_LIMIT || '50', 10),
  notifications: {
    enabled: (process.env.SERVICE_HISTORY_NOTIFICATIONS_ENABLED || 'false') === 'true',
  },
}));

// 💰 Tariffs Configuration
export const tariffsConfig = registerAs('tariffs', () => ({
  sanitizeTextsEnabled: (process.env.SANITIZE_TARIFF_TEXTS || 'true') === 'true',
  pagination: {
    maxPageSize: parseInt(process.env.TARIFFS_MAX_PAGE_SIZE || '100', 10),
  },
  cacheTtlSec: parseInt(process.env.TARIFFS_CACHE_TTL_SEC || '3600', 10),
}));

// 📅 Work Schedules Configuration
export const workSchedulesConfig = registerAs('workSchedules', () => ({
  exceptionsRetentionYears: parseInt(process.env.WORK_SCHEDULE_EXCEPTIONS_RETENTION_YEARS || '5', 10),
  exceptionsAnonymizeCron: process.env.WORK_SCHEDULE_EXCEPTIONS_ANON_CRON || '0 4 * * *',
}));

// 🎯 Export all configurations
export default [
  databaseConfig,
  redisConfig,
  jwtConfig,
  appConfig,
  corsConfig,
  swaggerConfig,
  securityConfig,
  seedsConfig,
  uploadConfig,
  emailConfig,
  notificationConfig,
  monitoringConfig,
  externalConfig,
  billingConfig,
  ordersConfig,
  customersConfig,
  appointmentsConfig,
  inventoryConfig,
  catalogueConfig,
  paymentsConfig,
  serviceHistoryConfig,
  tariffsConfig,
  workSchedulesConfig,
];
