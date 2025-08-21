// path: apps/backend/src/app.module.ts
import { Module, OnModuleInit } from '@nestjs/common';
import { CommonModule } from './common/common.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
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

// 📦 Inventory & Orders
import { InventoryModule } from './modules/inventory/inventory.module';
import { OrdersModule } from './modules/orders/orders.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { PaymentsModule } from './modules/payments/payments.module';

// 🗄️ Database & Seeds
import { SeedsModule, SeedsService } from './database/seeds';
import { getDatabaseConfig } from './database/database.config';

// 🛡️ Security & Infrastructure
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { SecurityHeadersInterceptor } from './common/interceptors/security-headers.interceptor';
import { AuditLoggingInterceptor } from './common/interceptors/audit-logging.interceptor';
import { EnhancedValidationPipe } from './common/pipes/enhanced-validation.pipe';

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
      useFactory: (appConfig: AppConfigService) => ({
        type: 'postgres',
        host: appConfig.database.host,
        port: appConfig.database.port,
        username: appConfig.database.username,
        password: appConfig.database.password,
        database: appConfig.database.database,
        entities: [__dirname + '/database/entities/*.entity{.ts,.js}'],
        migrations: [__dirname + '/database/migrations/*.{ts,js}'],
        migrationsTableName: 'migrations_history',
        migrationsRun: appConfig.database.autoMigrate,
        synchronize: appConfig.database.synchronize,
        logging: appConfig.app.isDevelopment ? ['query', 'error', 'warn'] : ['error'],
        extra: {
          max: appConfig.database.maxConnections,
          min: appConfig.database.minConnections,
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
      }),
    }),

    // 🛡️ RATE LIMITING
    ThrottlerModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [AppConfigService],
      useFactory: (appConfig: AppConfigService) => {
        const isProduction = appConfig.app.isProduction;
        const baseTtl = appConfig.security.rateLimiting.ttl;
        const baseLimit = appConfig.security.rateLimiting.limit;
        return [
          { name: 'global', ttl: baseTtl, limit: isProduction ? Math.floor(baseLimit * 0.6) : baseLimit },
          { name: 'auth', ttl: 900000, limit: 5 },
          { name: 'read', ttl: baseTtl, limit: isProduction ? Math.floor(baseLimit * 1.2) : baseLimit * 2 },
          { name: 'write', ttl: baseTtl, limit: isProduction ? Math.floor(baseLimit * 0.3) : Math.floor(baseLimit * 0.5) },
        ];
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
    InventoryModule,
    OrdersModule,
    InvoicesModule,
    PaymentsModule,
    SeedsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: SecurityHeadersInterceptor },
    { provide: APP_INTERCEPTOR, useClass: AuditLoggingInterceptor },
    { provide: APP_PIPE, useClass: EnhancedValidationPipe },
  ],
})
export class AppModule implements OnModuleInit {
  constructor(
    private readonly seedsService: SeedsService,
    private readonly appConfig: AppConfigService,
  ) {}

  async onModuleInit() {
    const environment = this.appConfig.app.environment;
    if (environment === 'development') {
      console.log('🌱 Running database seeds in development environment...');
      await this.seedsService.runAllSeeds();
    } else if (environment === 'staging') {
      if (this.appConfig.seeds.allowInStaging) {
        console.log('🌱 Running database seeds in staging environment (explicitly enabled)...');
        await this.seedsService.runAllSeeds();
      } else {
        console.log('🔒 Database seeds disabled in staging (set ALLOW_STAGING_SEEDS=true to enable)');
      }
    } else if (environment === 'production') {
      console.log('🔒 Database seeds disabled in production for security');
    } else if (environment === 'test') {
      console.log('🧪 Database seeds disabled in test environment');
    } else {
      console.warn(`⚠️ Unknown environment: ${environment}, seeds disabled for safety`);
    }
  }
}
