// path: apps/backend/src/config/validation.schema.ts
import * as Joi from 'joi';

export function validateConfig(config: Record<string, unknown>) {
  const schema = Joi.object({
    // Environment
    NODE_ENV: Joi.string()
      .valid('development', 'test', 'staging', 'production')
      .default('development'),
    PORT: Joi.number().port().default(3001),
    API_PREFIX: Joi.string().default('api/v1'),
    APP_VERSION: Joi.string().default('2.0'),

    // Database
    DATABASE_URL: Joi.string().uri().allow('', null),
    POSTGRES_HOST: Joi.string().default('localhost'),
    POSTGRES_PORT: Joi.number().default(5433),
    POSTGRES_USERNAME: Joi.string().default('postgres'),
    POSTGRES_PASSWORD: Joi.string().allow('', null),
    POSTGRES_DATABASE: Joi.string().default('drivecare'),
    DB_LOG_QUERIES: Joi.boolean().truthy('true').falsy('false').default(false),
    DB_SLOW_QUERY_THRESHOLD_MS: Joi.number().min(0).default(0),

    // Redis
    REDIS_URL: Joi.string().uri().allow('', null),
    REDIS_HOST: Joi.string().default('localhost'),
    REDIS_PORT: Joi.number().default(6380),
    REDIS_PASSWORD: Joi.string().allow('', null),

    // Auth/JWT
    JWT_ALG: Joi.string().valid('HS256', 'RS256', 'ES256').default('HS256'),
    JWT_SECRET: Joi.string().min(32).when('JWT_ALG', {
      is: 'HS256',
      then: Joi.required(),
      otherwise: Joi.allow('', null),
    }),
    JWT_PRIVATE_KEY: Joi.string().allow('', null),
    JWT_PUBLIC_KEY: Joi.string().allow('', null),
    JWT_EXPIRATION: Joi.string().default('15m'),
    JWT_REFRESH_SECRET: Joi.string().min(32).required(),
    JWT_REFRESH_EXPIRATION: Joi.string().default('7d'),
    JWT_ISSUER: Joi.string().allow('', null),
    JWT_AUDIENCE: Joi.string().allow('', null),
    JWT_KID: Joi.string().allow('', null),

    // Auth hardening
    RT_PEPPER: Joi.string().min(10).required(),
    RT_HMAC_SECRET: Joi.string().min(32).required(),
    PWD_PEPPER: Joi.string().min(32).required(),
    DEVICE_ID_SECRET: Joi.string().min(32).required(),

    // App/CORS/Frontend
    FRONTEND_URL: Joi.string().uri().default('http://localhost:5173'),
    CORS_ORIGINS: Joi.string().default('http://localhost:3000,http://localhost:5173'),

    // Compliance / Privacy (152-ФЗ)
    SERVER_REGION: Joi.string().default('RU'),
    SERVER_LOCATION: Joi.string().default('Russia'),
    DATA_PROCESSING_LOCATION: Joi.string().default('RU'),
    PRIVACY_POLICY_VERSION: Joi.string().default('1.0'),
    PRIVACY_POLICY_TEXT: Joi.string().allow('', null),
    PRIVACY_POLICY_TEXT_HASH: Joi.alternatives().conditional('NODE_ENV', {
      is: 'production',
      then: Joi.string().min(32).required(),
      otherwise: Joi.string().allow('', null),
    }),
    COMPLIANCE_STRICT_MODE: Joi.boolean().truthy('true').falsy('false').default(true),
    ENABLE_MIR_SUPPORT: Joi.boolean().truthy('true').falsy('false').default(true),
    ENABLE_COMPLIANCE_MONITORING: Joi.boolean().truthy('true').falsy('false').default(true),
    ENABLE_SECURITY_MONITORING: Joi.boolean().truthy('true').falsy('false').default(true),
    ENABLE_FINANCIAL_MONITORING: Joi.boolean().truthy('true').falsy('false').default(true),

    // Audit
    AUDIT_CHAIN_KEY: Joi.string().min(32).required(),
    AUDIT_LOG_TO_DB: Joi.boolean().truthy('true').falsy('false').default(false),

    // Payments/Billing
    PAYMENT_GATEWAYS: Joi.string().default('yookassa,tinkoff'),
    DEFAULT_PAYMENT_PROVIDER: Joi.string().valid('yookassa', 'tinkoff').default('yookassa'),
    PM_ENC_KEY: Joi.string().allow('', null), // AES-256-GCM key (base64); optional in dev
    ENABLE_FISCALIZATION: Joi.boolean().truthy('true').falsy('false').default(false),
    KKT_SERIAL_NUMBER: Joi.string().allow('', null),
    YOOKASSA_WEBHOOK_PATH: Joi.string().default('subscription-billing/webhooks/yookassa'),
    TINKOFF_WEBHOOK_PATH: Joi.string().default('subscription-billing/webhooks/tinkoff'),

    // Inventory
    INVENTORY_IDEMPOTENCY_TTL_MS: Joi.number().default(6 * 60 * 60 * 1000),
    INVENTORY_MAX_PAGE_SIZE: Joi.number().default(100),
    SANITIZE_INVENTORY_TEXTS: Joi.boolean().truthy('true').falsy('false').default(true),
    INVENTORY_ALERTS_ENABLED: Joi.boolean().truthy('true').falsy('false').default(true),
    INVENTORY_ALERTS_CRON: Joi.string().default('0 * * * *'),
    INVENTORY_LOW_STOCK_THRESHOLD_DEFAULT: Joi.number().default(5),

    // Orders
    ORDER_DATA_RETENTION_YEARS: Joi.number().default(5),
    SANITIZE_NOTES_ENABLED: Joi.boolean().truthy('true').falsy('false').default(true),
    ORDER_MAX_PARTS_PER_ORDER: Joi.number().default(100),
    ORDER_MAX_SERVICES_PER_ORDER: Joi.number().default(50),

    // Service History
    SERVICE_HISTORY_MAX_PAGE_SIZE: Joi.number().default(100),
    SERVICE_HISTORY_DEFAULT_PAGE_SIZE: Joi.number().default(20),
    SANITIZE_SERVICE_HISTORY_TEXTS: Joi.boolean().truthy('true').falsy('false').default(true),
    SERVICE_HISTORY_SEARCH_LIMIT: Joi.number().default(50),
    SERVICE_HISTORY_NOTIFICATIONS_ENABLED: Joi.boolean().truthy('true').falsy('false').default(false),

    // Tariffs
    SANITIZE_TARIFF_TEXTS: Joi.boolean().truthy('true').falsy('false').default(true),
    TARIFFS_MAX_PAGE_SIZE: Joi.number().default(100),
    TARIFFS_CACHE_TTL_SEC: Joi.number().default(3600),

    // Customers (existing in config)
    CUSTOMER_DATA_RETENTION_YEARS: Joi.number().default(5),
    SANITIZE_CUSTOMER_TEXTS: Joi.boolean().truthy('true').falsy('false').default(true),
    MAX_CUSTOMERS_PAGE_SIZE: Joi.number().default(100),
    CUSTOMER_RETENTION_CRON: Joi.string().default('0 3 * * *'),

    // Appointments (present in config)
    SANITIZE_APPOINTMENT_TEXTS: Joi.boolean().truthy('true').falsy('false').default(true),
    APPOINTMENTS_MAX_PAGE_SIZE: Joi.number().default(100),
    APPOINTMENTS_IDEMPOTENCY_TTL_MS: Joi.number().default(600000),
    APPOINTMENTS_ALLOW_OVERLAP: Joi.boolean().truthy('true').falsy('false').default(false),
    APPOINTMENTS_TIMEZONE_DEFAULT: Joi.string().default('Europe/Moscow'),
    APPOINTMENT_DATA_RETENTION_YEARS: Joi.number().default(5),
    APPOINTMENTS_REMINDERS_ENABLED: Joi.boolean().truthy('true').falsy('false').default(false),
    APPOINTMENTS_REMINDERS_CRON: Joi.string().default('0 9 * * *'),

    // Email (optional; enable via EMAIL_ENABLED)
    EMAIL_ENABLED: Joi.boolean().truthy('true').falsy('false').default(false),
    SMTP_HOST: Joi.alternatives().conditional('EMAIL_ENABLED', {
      is: true,
      then: Joi.alternatives()
        .try(Joi.string().hostname(), Joi.string().ip({ version: ['ipv4', 'ipv6'] }))
        .required(),
      otherwise: Joi.string().allow('', null),
    }),
    SMTP_PORT: Joi.number().default(587),
    SMTP_USER: Joi.alternatives().conditional('EMAIL_ENABLED', {
      is: true,
      then: Joi.string().required(),
      otherwise: Joi.string().allow('', null),
    }),
    SMTP_PASSWORD: Joi.alternatives().conditional('EMAIL_ENABLED', {
      is: true,
      then: Joi.string().required(),
      otherwise: Joi.string().allow('', null),
    }),
    SMTP_FROM: Joi.string().allow('', null).default('noreply@drivecare.local'),
    SMTP_SECURE: Joi.boolean().truthy('true').falsy('false').default(false),

    // Seeds / Misc
    COOKIE_SECRET: Joi.alternatives().conditional('NODE_ENV', {
      is: 'production',
      then: Joi.string().min(16).required(),
      otherwise: Joi.string().allow('', null),
    }),
    SEEDS_ENABLED: Joi.boolean().truthy('true').falsy('false').default(true),
    DB_AUTO_SYNC_ON_SEEDS: Joi.boolean().truthy('true').falsy('false').default(false),
    ALLOW_STAGING_SEEDS: Joi.boolean().truthy('true').falsy('false').default(false),

    SWAGGER_PATH: Joi.string().default('docs'),
    SWAGGER_TITLE: Joi.string().default('DriveCare API'),
    SWAGGER_DESCRIPTION: Joi.string().default('Система управления автосервисом - API документация'),
  })
    .custom((value, helpers) => {
      // If DATABASE_URL provided, don't enforce individual PG fields (we already keep them optional).
      // If DATABASE_URL is empty, POSTGRES_PASSWORD becomes required to ensure DB can start.
      if (!value.DATABASE_URL && !value.POSTGRES_PASSWORD) {
        return helpers.error('any.custom', { message: '"POSTGRES_PASSWORD" is required when DATABASE_URL is not set' });
      }

      // For asymmetric JWT algorithms ensure keys
      if (value.JWT_ALG === 'RS256' || value.JWT_ALG === 'ES256') {
        if (!value.JWT_PRIVATE_KEY || !value.JWT_PUBLIC_KEY) {
          return helpers.error('any.custom', {
            message: 'JWT_PRIVATE_KEY and JWT_PUBLIC_KEY are required when JWT_ALG is RS256/ES256',
          });
        }
      }

      return value;
    }, 'cross-field validation');

  const { value, error } = schema.validate(config, {
    allowUnknown: true,
    abortEarly: false,
  });

  if (error) {
    const details = error.details?.map((d) => d.message).join(', ') || error.message;
    throw new Error(`Configuration validation error: ${details}`);
  }
  return value;
}
