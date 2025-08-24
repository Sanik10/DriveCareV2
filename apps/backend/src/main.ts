// path: apps/backend/src/main.ts
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import helmet from 'helmet';
import * as compression from 'compression';
import * as cookieParser from 'cookie-parser';
import * as express from 'express';
import { Request, Response, NextFunction } from 'express';
import { EnhancedValidationPipe } from './common/pipes/enhanced-validation.pipe';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { SecurityHeadersInterceptor } from './common/interceptors/security-headers.interceptor';
import { AuditService } from './common/audit/audit.service';
import { AuditLoggingInterceptor } from './common/interceptors/audit-logging.interceptor';

async function setupGracefulShutdown(app: any): Promise<void> {
  process.on('SIGTERM', async () => {
    console.log('🔄 SIGTERM received - initiating graceful shutdown...');
    try {
      await app.close();
      console.log('✅ Application closed gracefully');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during graceful shutdown:', error);
      process.exit(1);
    }
  });

  process.on('SIGINT', async () => {
    console.log('🔄 SIGINT received - initiating graceful shutdown...');
    try {
      await app.close();
      console.log('✅ Application closed gracefully');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during graceful shutdown:', error);
      process.exit(1);
    }
  });

  process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
    process.exit(1);
  });
  process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });
}

function normalizePath(prefix: string, path: string) {
  const p = path.startsWith('/') ? path.slice(1) : path;
  const pre = prefix.replace(/^\/+|\/+$/g, '');
  return `/${pre}/${p}`;
}

function configureWebhookRawBody(app: any, configService: ConfigService, apiPrefix: string) {
  const ykPath = configService.get<string>('YOOKASSA_WEBHOOK_PATH', 'subscription-billing/webhooks/yookassa');
  const tkPath = configService.get<string>('TINKOFF_WEBHOOK_PATH', 'subscription-billing/webhooks/tinkoff');

  const ykFull = normalizePath(apiPrefix, ykPath);
  const tkFull = normalizePath(apiPrefix, tkPath);

  const attachRaw = (path: string) => {
    app.use(path, (req: Request, res: Response, next: NextFunction) => {
      express.raw({ type: '*/*', limit: '256kb' })(req, res, (err) => {
        if (err) return next(err);
        (req as any).rawBody = req.body;
        return next();
      });
    });
  };

  attachRaw(ykFull);
  attachRaw(tkFull);

  const jsonParser = express.json({ limit: '1mb' });
  const urlencodedParser = express.urlencoded({ extended: true, limit: '1mb' });
  const isWebhook = (url: string) => url.startsWith(ykFull) || url.startsWith(tkFull);

  app.use((req, res, next) => {
    if (isWebhook(req.originalUrl || req.url)) return next();
    return jsonParser(req, res, (err) => {
      if (err) return next(err);
      return urlencodedParser(req, res, next);
    });
  });

  console.log(`🪝 Webhook raw-body enabled: ${ykFull}, ${tkFull}`);
}

async function configureSwagger(app: any, configService: ConfigService, environment: string) {
  if (environment === 'production') {
    console.log('🔒 Swagger documentation disabled in production for security');
    return;
  }
  const swaggerTitle = configService.get('SWAGGER_TITLE', 'DriveCare API');
  const swaggerDescription = configService.get('SWAGGER_DESCRIPTION', 'API документация');
  const appVersion = configService.get('APP_VERSION', '2.0');

  const config = new DocumentBuilder()
    .setTitle(`${swaggerTitle} (${environment.toUpperCase()})`)
    .setDescription(`${swaggerDescription}\n\n🚨 Environment: ${environment.toUpperCase()}`)
    .setVersion(appVersion)
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', name: 'JWT', in: 'header' },
      'JWT-auth',
    )
    .addTag('🏠 Система')
    .addTag('🔐 Аутентификация')
    .addTag('🏢 Компании')
    .addTag('👥 Пользователи')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  const swaggerPath = configService.get('SWAGGER_PATH', 'docs');
  SwaggerModule.setup(swaggerPath, app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
    },
    customSiteTitle: `${swaggerTitle} Docs (${environment.toUpperCase()})`,
    customCss: '.swagger-ui .topbar { display: none }',
  });
}

async function configureCORS(app: any, configService: ConfigService, environment: string) {
  const corsOrigins = (configService.get('CORS_ORIGINS', 'http://localhost:3000,http://localhost:5173') as string)
    .split(',')
    .map((o) => o.trim())
    .filter((o) => o.length > 0);

  const corsConfig = {
    origin: (origin: string, callback: Function) => {
      if (!origin && environment !== 'production') return callback(null, true);
      if (corsOrigins.includes(origin)) callback(null, true);
      else {
        console.warn(`🚫 CORS blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS policy'));
      }
    },
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
  };
  app.enableCors(corsConfig);
  console.log(`🌐 CORS configured for origins: ${corsOrigins.join(', ')}`);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: ['log', 'warn', 'error'] });
  const configService = app.get(ConfigService);
  const environment = configService.get('NODE_ENV', 'development');
  const isProduction = environment === 'production';
  const apiPrefix = configService.get('API_PREFIX', 'api/v1');

  app.setGlobalPrefix(apiPrefix);
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  app.getHttpAdapter().getInstance().disable('x-powered-by');

  // Helmet: отключаем HSTS и upgrade-insecure-requests в dev/staging (Safari иначе форсит HTTPS)
  const scriptSrc = ["'self'", ...(isProduction ? [] : ["'unsafe-inline'", "'unsafe-eval'"])];
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc,
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", ...(isProduction ? [] : ['ws:', 'wss:'])],
          fontSrc: ["'self'", 'https:', 'data:'],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          // ВАЖНО: добавляем upgrade-insecure-requests только в проде
          ...(isProduction ? { upgradeInsecureRequests: [] } : {}),
        },
      },
      // ВАЖНО: HSTS только в проде (Safari может кешировать и форсить HTTPS)
      hsts: isProduction
        ? { maxAge: 31536000, includeSubDomains: true, preload: true }
        : false,
      frameguard: { action: 'deny' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      crossOriginEmbedderPolicy: false,
    }),
  );

  const http = app.getHttpAdapter().getInstance();
  // Тихие заглушки для “дефолтных” иконок Safari/браузеров (чтобы 404 не летели в аудит)
  ['/apple-touch-icon.png', '/apple-touch-icon-precomposed.png', '/favicon.ico', '/favicon-32x32.png', '/favicon-16x16.png'].forEach(
    (p) => http.get(p, (_req: Request, res: Response) => res.status(204).end()),
  );

  const cookieSecret = configService.get<string>('COOKIE_SECRET');
  if (!cookieSecret && isProduction) {
    console.warn('⚠️ COOKIE_SECRET is not set; cookies will not be signed. Set COOKIE_SECRET in production.');
  }
  app.use(cookieParser(cookieSecret));
  app.use(compression());

  configureWebhookRawBody(app, configService, apiPrefix);

  app.useGlobalPipes(new EnhancedValidationPipe(configService));

  const auditService = app.get(AuditService);
  app.useGlobalFilters(new GlobalExceptionFilter(configService, auditService));
  app.useGlobalInterceptors(
    new SecurityHeadersInterceptor(configService),
    new AuditLoggingInterceptor(auditService),
  );

  await configureSwagger(app, configService, environment);
  await configureCORS(app, configService, environment);

  // Убираем enableShutdownHooks, чтобы избежать двойного закрытия ресурсов
  // app.enableShutdownHooks();

  const port = configService.get('PORT', 3001);
  const host = isProduction ? '0.0.0.0' : 'localhost';
  await app.listen(port, host);

  const swaggerTitle = configService.get('SWAGGER_TITLE', 'DriveCare API');
  console.log(`🚀 ${swaggerTitle} started successfully!`);
  console.log(`🌍 Environment: ${environment}`);
  console.log(`🔗 Server: http://${host}:${port}`);
  console.log(`🔍 Health: http://${host}:${port}/${apiPrefix}/health`);
  if (!isProduction) {
    const swaggerPath = configService.get('SWAGGER_PATH', 'docs');
    console.log(`📚 API Docs: http://${host}:${port}/${swaggerPath}`);
  }
  console.log(`🛡️ Security: Enhanced middleware active`);
  console.log(`⚡ Performance: Compression enabled`);

  await setupGracefulShutdown(app);
  console.log(`🔄 Graceful shutdown handlers registered`);
}

bootstrap().catch((err) => {
  console.error('💥 Application failed to start:', err);
  process.exit(1);
});
