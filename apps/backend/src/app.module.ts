// path: apps/backend/src/app.module.ts
import { Module, OnModuleInit, Optional } from '@nestjs/common';
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
        // Если синхронизация не задана в конфиге, в dev включаем её по умолчанию
        const synchronize =
          typeof appConfig.database.synchronize === 'boolean'
            ? appConfig.database.synchronize
            : isDev;

        const migrationsRun =
          typeof appConfig.database.autoMigrate === 'boolean'
            ? appConfig.database.autoMigrate
            : false;

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
          logging: isDev ? ['query', 'error', 'warn'] : ['error'],
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
        };
      },
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

    // 🌱 Сиды
    SeedsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
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
