// path: apps/backend/src/config/validation.schema.ts
import * as Joi from 'joi';

// Helper: strict 32-byte base64 key
const base64Key32 = Joi.string()
  .base64({ paddingRequired: true })
  .custom((v, helpers) => {
    try {
      const buf = Buffer.from(v, 'base64');
      if (buf.length !== 32) return helpers.error('any.invalid');
      return v;
    } catch {
      return helpers.error('any.invalid');
    }
  }, '32-byte base64 key');

export const configValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'staging', 'production', 'test').default('development'),
  PORT: Joi.number().port().default(3001),
  API_PREFIX: Joi.string().pattern(/^[a-zA-Z0-9\/\-_]+$/).default('api/v1'),
  APP_VERSION: Joi.string().pattern(/^\d+\.\d+(\.\d+)?$/).default('2.0'),

  // Database
  DATABASE_URL: Joi.string().uri({ scheme: ['postgres', 'postgresql'] }).optional(),
  POSTGRES_HOST: Joi.string().hostname().default('localhost'),
  POSTGRES_PORT: Joi.number().port().default(5433),
  POSTGRES_USERNAME: Joi.string().min(1).max(63).default('postgres'),
  POSTGRES_PASSWORD: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().min(12).required(),
    otherwise: Joi.string().min(8).optional(),
  }),
  POSTGRES_DATABASE: Joi.string().min(1).max(63).default('drivecare'),
  POSTGRES_TEST_DATABASE: Joi.string().min(1).max(63).default('drivecare_test'),
  DB_SYNCHRONIZE: Joi.string().valid('true', 'false').when('NODE_ENV', {
    is: 'production',
    then: Joi.valid('false').default('false'),
    otherwise: Joi.string().valid('true', 'false').default('true'),
  }),
  DB_AUTO_MIGRATE: Joi.string().valid('true', 'false').default('false'),
  DB_SSL_ENABLED: Joi.string().valid('true', 'false').default('false'),
  DB_SSL_REJECT_UNAUTHORIZED: Joi.string().valid('true', 'false').default('true'),
  DB_SSL_CA: Joi.string().optional(),
  DB_SSL_CERT: Joi.string().optional(),
  DB_SSL_KEY: Joi.string().optional(),

  // Redis
  REDIS_URL: Joi.string().uri({ scheme: ['redis', 'rediss'] }).when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  REDIS_HOST: Joi.string().hostname().default('localhost'),
  REDIS_PORT: Joi.number().port().default(6380),
  REDIS_PASSWORD: Joi.string().min(8).optional(),

  // JWT / Tokens
  JWT_ALG: Joi.string().valid('HS256', 'RS256').when('NODE_ENV', {
    is: 'production',
    then: Joi.valid('RS256').required(),
    otherwise: Joi.string().default('HS256'),
  }),
  JWT_SECRET: Joi.when('JWT_ALG', { is: 'HS256', then: Joi.string().min(32).required(), otherwise: Joi.forbidden() }),
  JWT_REFRESH_SECRET: Joi.when('JWT_ALG', { is: 'HS256', then: Joi.string().min(32).required(), otherwise: Joi.forbidden() }),
  JWT_PRIVATE_KEY: Joi.when('JWT_ALG', { is: 'RS256', then: Joi.string().required(), otherwise: Joi.forbidden() }),
  JWT_PUBLIC_KEY: Joi.when('JWT_ALG', { is: 'RS256', then: Joi.string().required(), otherwise: Joi.forbidden() }),
  JWT_ISSUER: Joi.string().default('drivecare-v2'),
  JWT_AUDIENCE: Joi.string().default('drivecare-users'),
  JWT_KID: Joi.string().optional(),
  JWT_EXPIRATION: Joi.string().pattern(/^\d+[smhd]$/).default('15m'),
  JWT_REFRESH_EXPIRATION: Joi.string().pattern(/^\d+[smhd]$/).default('7d'),

  // Refresh hardening
  RT_PEPPER: Joi.string().min(16).required(),
  RT_HMAC_SECRET: Joi.string().min(32).required(),

  // Password pepper (argon2id + pepper)
  PWD_PEPPER: Joi.string().min(16).required(),

  // Device
  DEVICE_ID_SECRET: Joi.string().min(16).required(),

  // Cookies
  COOKIE_SECRET: Joi.string().min(16).optional(),
  COOKIE_SECURE: Joi.boolean().when('NODE_ENV', { is: 'production', then: Joi.valid(true).required(), otherwise: Joi.boolean().default(false) }),
  COOKIE_SAMESITE: Joi.string().valid('lax', 'strict', 'none').default('strict'),
  RT_COOKIE_MAX_AGE_MS: Joi.number().default(604800000),
  __COOKIE_GUARD: Joi.any().custom((_, helpers) => {
    const { COOKIE_SAMESITE, COOKIE_SECURE } = helpers.state.ancestors[0];
    if (COOKIE_SAMESITE === 'none' && !COOKIE_SECURE) return helpers.error('any.invalid');
    return _;
  }),

  // CORS
  CORS_ORIGINS: Joi.string()
    .pattern(/^https?:\/\/[^,]+(,https?:\/\/[^,]+)*$/)
    .default('http://localhost:3000,http://localhost:5173'),
  FRONTEND_URL: Joi.string().uri().default('http://localhost:5173'),

  // Swagger
  SWAGGER_PATH: Joi.string().pattern(/^[a-zA-Z0-9\-_]+$/).default('docs'),
  SWAGGER_TITLE: Joi.string().min(1).max(100).default('DriveCare API'),
  SWAGGER_DESCRIPTION: Joi.string().min(1).max(500).default('Система управления автосервисом - API документация'),

  // Seeds
  ALLOW_STAGING_SEEDS: Joi.string().valid('true', 'false').default('false'),

  // 2FA
  TWOFA_ISSUER: Joi.string().default('DriveCare'),
  TOTP_ENC_KEY: base64Key32.when('NODE_ENV', { is: 'production', then: Joi.required(), otherwise: Joi.optional() }),

  // РФ-комплаенс
  SERVER_REGION: Joi.string().valid('RU').default('RU'),
  SERVER_LOCATION: Joi.string().valid('Russia').default('Russia'),
  DATA_PROCESSING_LOCATION: Joi.string().valid('RU').default('RU'),
  DATA_LOCALIZATION_RU: Joi.boolean().when('NODE_ENV', { is: 'production', then: Joi.valid(true).required(), otherwise: Joi.optional() }),
  COMPLIANCE_STRICT_MODE: Joi.string().valid('true', 'false').default('true'),
  ENABLE_MIR_SUPPORT: Joi.string().valid('true', 'false').default('true'),
  ENABLE_COMPLIANCE_MONITORING: Joi.string().valid('true', 'false').default('true'),
  ENABLE_SECURITY_MONITORING: Joi.string().valid('true', 'false').default('true'),
  ENABLE_FINANCIAL_MONITORING: Joi.string().valid('true', 'false').default('true'),

  // 152‑ФЗ
  PRIVACY_POLICY_VERSION: Joi.string().default('1.0'),
  PRIVACY_POLICY_TEXT_HASH: Joi.when('NODE_ENV', { is: 'production', then: Joi.string().required(), otherwise: Joi.string().optional() }),
  PRIVACY_POLICY_TEXT: Joi.string().optional(),

  // Encryption: payment-methods configs
  PM_ENC_KEY: base64Key32.when('NODE_ENV', { is: 'production', then: Joi.required(), otherwise: Joi.optional() }),

  // Payments/webhooks
  PAYMENT_GATEWAYS: Joi.string().default('yookassa,tinkoff'),
  DEFAULT_PAYMENT_PROVIDER: Joi.string().valid('yookassa', 'tinkoff').default('yookassa'),

  // YooKassa
  YOOKASSA_SHOP_ID: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.when('DEFAULT_PAYMENT_PROVIDER', { is: 'yookassa', then: Joi.string().min(1).required(), otherwise: Joi.optional() }),
    otherwise: Joi.string().allow('').optional(),
  }),
  YOOKASSA_SECRET_KEY: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.when('DEFAULT_PAYMENT_PROVIDER', { is: 'yookassa', then: Joi.string().min(1).required(), otherwise: Joi.optional() }),
    otherwise: Joi.string().allow('').optional(),
  }),
  YOOKASSA_WEBHOOK_SECRET: Joi.string().allow('').optional(),
  YOOKASSA_IP_WHITELIST: Joi.string().allow('').optional(),

  // Tinkoff
  TINKOFF_TERMINAL_KEY: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.when('DEFAULT_PAYMENT_PROVIDER', { is: 'tinkoff', then: Joi.string().min(1).required(), otherwise: Joi.optional() }),
    otherwise: Joi.string().allow('').optional(),
  }),
  TINKOFF_PASSWORD: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.when('DEFAULT_PAYMENT_PROVIDER', { is: 'tinkoff', then: Joi.string().min(1).required(), otherwise: Joi.optional() }),
    otherwise: Joi.string().allow('').optional(),
  }),
  TINKOFF_WEBHOOK_SECRET: Joi.string().allow('').optional(),

  // Webhook paths
  YOOKASSA_WEBHOOK_PATH: Joi.string().default('subscription-billing/webhooks/yookassa'),
  TINKOFF_WEBHOOK_PATH: Joi.string().default('subscription-billing/webhooks/tinkoff'),

  // Audit
  AUDIT_CHAIN_KEY: Joi.string().when('NODE_ENV', { is: 'production', then: Joi.string().min(32).required(), otherwise: Joi.string().optional() }),
  AUDIT_LOG_TO_DB: Joi.string().valid('true', 'false').default('false'),

  // Orders
  ORDER_DATA_RETENTION_YEARS: Joi.number().integer().min(1).default(5),
  SANITIZE_NOTES_ENABLED: Joi.boolean().default(true),
  ORDER_MAX_PARTS_PER_ORDER: Joi.number().integer().min(1).default(100),
  ORDER_MAX_SERVICES_PER_ORDER: Joi.number().integer().min(1).default(50),

  // Customers
  CUSTOMER_DATA_RETENTION_YEARS: Joi.number().integer().min(1).default(5),
  SANITIZE_CUSTOMER_TEXTS: Joi.boolean().default(true),
  MAX_CUSTOMERS_PAGE_SIZE: Joi.number().integer().min(10).max(500).default(100),
  CUSTOMER_RETENTION_CRON: Joi.string().default('0 3 * * *'),

  // Appointments
  APPOINTMENTS_MAX_PAGE_SIZE: Joi.number().integer().min(10).max(500).default(100),
  APPOINTMENTS_IDEMPOTENCY_TTL_MS: Joi.number().integer().min(60000).default(600000),
  APPOINTMENTS_ALLOW_OVERLAP: Joi.boolean().default(false),
  APPOINTMENTS_TIMEZONE_DEFAULT: Joi.string().default('Europe/Moscow'),
  SANITIZE_APPOINTMENT_TEXTS: Joi.boolean().default(true),
  APPOINTMENT_DATA_RETENTION_YEARS: Joi.number().integer().min(1).default(5),
  APPOINTMENTS_REMINDERS_ENABLED: Joi.boolean().default(false),
  APPOINTMENTS_REMINDERS_CRON: Joi.string().default('0 9 * * *'),

  // Inventory
  INVENTORY_MAX_PAGE_SIZE: Joi.number().integer().min(10).max(500).default(100),
  SANITIZE_INVENTORY_TEXTS: Joi.boolean().default(true),
  INVENTORY_ALERTS_ENABLED: Joi.boolean().default(true),
  INVENTORY_ALERTS_CRON: Joi.string().default('0 * * * *'),
  INVENTORY_LOW_STOCK_THRESHOLD_DEFAULT: Joi.number().integer().min(0).default(5),
  INVENTORY_IDEMPOTENCY_TTL_MS: Joi.number().integer().min(60000).default(21600000),

  // Email (опционально)
  SMTP_HOST: Joi.string().hostname().optional(),
  SMTP_PORT: Joi.number().port().optional(),
  SMTP_USER: Joi.string().optional(),
  SMTP_PASSWORD: Joi.string().optional(),
  SMTP_FROM: Joi.string().email({ tlds: { allow: false } }).optional(),

  // Payments / KKT
  ENABLE_FISCALIZATION: Joi.boolean().default(false),
  KKT_SERIAL_NUMBER: Joi.string().allow('').optional(),
});

export function validateConfig(config: Record<string, any>) {
  const { error, value } = configValidationSchema.validate(config, {
    allowUnknown: true,
    abortEarly: false,
  });
  if (error) {
    const errorDetails = error.details.map((detail) => detail.message).join(', ');
    throw new Error(`Configuration validation error: ${errorDetails}`);
  }
  return value;
}
