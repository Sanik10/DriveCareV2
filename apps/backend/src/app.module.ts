// path: apps/backend/src/app.module.ts
import { Module, OnModuleInit, Optional, ExecutionContext } from '@nestjs/common';
import { CommonModule } from './common/common.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';

import { AppController } from './app.controller';
import { AppService } from './app.service';

// 🏗️ Core modules
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { TariffsModule } from './modules/tariffs/tariffs.module';

// 🚗 Business modules
import { CustomersModule } from './modules/customers/customers.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { VehiclesCatalogueModule } from './modules/vehicles-catalogue/vehicles-catalogue.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { WorkSchedulesModule } from './modules/work-schedules/work-schedules.module';
import { ServicesModule } from './modules/services/services.module';

// 📦 Inventory & Orders
import { InventoryModule } from './modules/inventory/inventory.module';
import { OrdersModule } from './modules/orders/orders.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { PaymentsModule } from './modules/payments/payments.module';

// 🌱 Seeds
import { SeedsModule } from './database/seeds';
import { SeedsService } from './database/seeds/seeds.service';

// 🔧 Typed config
import { AppConfigModule } from './config/config.module';
import { AppConfigService } from './config/config.service';

@Module({
  imports: [
    CommonModule,
    AppConfigModule,

    // ⏰ Scheduling (cron jobs)
    ScheduleModule.forRoot(),

    // 🗄️ DATABASE
    TypeOrmModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [AppConfigService],
      useFactory: (appConfig: AppConfigService) => {
        const isDev = appConfig.app.isDevelopment === true;

        const enableQueryLogs = (process.env.DB_LOG_QUERIES || '').toLowerCase() === 'true';
        const logging: ('query' | 'error' | 'warn')[] = enableQueryLogs ? ['query', 'error', 'warn'] : ['error', 'warn'];

        const slowThresholdStr = process.env.DB_SLOW_QUERY_THRESHOLD_MS;
        const slowThreshold = slowThresholdStr ? parseInt(slowThresholdStr, 10) : 0;

        return {
          type: 'postgres',
          host: appConfig.database.host,
          port: appConfig.database.port,
          username: appConfig.database.username,
          password: appConfig.database.password,
          database: appConfig.database.database,
          entities: [__dirname + '/database/entities/*.entity{.ts,.js}'],
          migrations: [__dirname + '/database/migrations/*.{ts,js}'],
          migrationsTableName: 'migrations_history',
          migrationsRun: appConfig.database.autoMigrate === true,
          synchronize: false,
          logging,
          maxQueryExecutionTime: slowThreshold > 0 ? slowThreshold : undefined,
          extra: {
            max: appConfig.database.maxConnections,
            min: 2,
            idleTimeoutMillis: appConfig.database.idleTimeout,
            connectionTimeoutMillis: appConfig.database.connectionTimeout,
            ...(appConfig.database.ssl.enabled && {
              ssl: {
                rejectUnauthorized: appConfig.database.ssl.rejectUnauthorized,
                ca: appConfig.database.ssl.ca,
                cert: appConfig.database.ssl.cert,
                key: appConfig.database.ssl.key,
              },
            }),
          },
          retryAttempts: 3,
          retryDelay: 3000,
          autoLoadEntities: true,
          keepConnectionAlive: true,
        };
      },
    }),

    // 🛡️ RATE LIMITING (мягкие настройки в dev; в prod — из конфигов)
    ThrottlerModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [AppConfigService],
      useFactory: (appConfig: AppConfigService) => {
        const isProd = appConfig.app.isProduction;
        const baseTtl = appConfig.security.rateLimiting.ttl;      // может быть в мс (уточнить)
        const baseLimit = appConfig.security.rateLimiting.limit;  // например 100

        // Dev: короткое окно и высокий лимит, чтобы не мешать HMR/SSR и пр.
        const devTtl = 10_000;     // 10 секунд (если ttl в мс)
        const devLimit = 300;      // 300 запросов/окно

        return {
          throttlers: [
            {
              ttl: isProd ? baseTtl : devTtl,
              limit: isProd ? baseLimit : devLimit,
            },
          ],
          errorMessage: 'Too Many Requests',

          // Пропускаем GET-запросы в dev (можно выключить переменной THROTTLE_DEV_SKIP_GET=false)
          skipIf: (context: ExecutionContext) => {
            const req = context.switchToHttp().getRequest();
            const devSkipGet = (process.env.THROTTLE_DEV_SKIP_GET || 'true').toLowerCase() === 'true';
            return !isProd && devSkipGet && req?.method === 'GET';
          },

          // Трекер: userId (если есть) или IP
          getTracker: async (req: Record<string, any>) => {
            const userId = req?.user?.id;
            const ip = req?.ip || req?.connection?.remoteAddress || 'unknown';
            return userId ? `user:${userId}` : `ip:${ip}`;
          },
        };
      },
    }),

    // Модули домена
    AuthModule,
    UsersModule,
    CompaniesModule,
    TariffsModule,
    SubscriptionsModule,
    CustomersModule,
    VehiclesModule,
    VehiclesCatalogueModule,
    WorkSchedulesModule,
    AppointmentsModule,
    ServicesModule,
    InventoryModule,
    OrdersModule,
    InvoicesModule,
    PaymentsModule,

    // 🌱 Сиды
    SeedsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Используем стандартный ThrottlerGuard с кастомными опциями выше
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule implements OnModuleInit {
  constructor(
    @Optional() private readonly seedsService: SeedsService,
    private readonly appConfig: AppConfigService,
  ) {}

  async onModuleInit() {
    const environment = this.appConfig.app.environment;

    if (environment === 'development') {
      if (this.appConfig.seeds.autoRun || this.appConfig.seeds.enabled) {
        console.log('🌱 Running database seeds in development environment...');
        await this.seedsService.runAllSeeds();
      } else {
        console.log('🔒 Database seeds disabled in development (SEEDS_ENABLED=false)');
      }
      return;
    }
    if (environment === 'staging') {
      if (this.appConfig.seeds.allowInStaging && this.appConfig.seeds.enabled) {
        console.log('🌱 Running database seeds in staging environment (explicitly enabled)...');
        await this.seedsService.runAllSeeds();
      } else {
        console.log('🔒 Database seeds disabled in staging (set ALLOW_STAGING_SEEDS=true and SEEDS_ENABLED=true to enable)');
      }
      return;
    }
    if (environment === 'production') {
      console.log('🔒 Database seeds disabled in production for security');
      return;
    }
    if (environment === 'test') {
      console.log('🧪 Database seeds disabled in test environment');
      return;
    }
    console.warn(`⚠️ Unknown environment: ${environment}, seeds disabled for safety`);
  }
}
