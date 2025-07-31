import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { TariffsModule } from './modules/tariffs/tariffs.module';
import { CustomersModule } from './modules/customers/customers.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { VehiclesCatalogueModule } from './modules/vehicles-catalogue/vehicles-catalogue.module';
import { AppointmentsModule } from './modules/appointments/appointments.module';
import { WorkSchedulesModule } from './modules/work-schedules/work-schedules.module';
import { InventoryModule } from './modules/inventory/inventory.module'; // 🔥 ДОБАВЛЕНО
import { OrdersModule } from './modules/orders/orders.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { SeedsModule, SeedsService } from './database/seeds';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('POSTGRES_HOST'),
        port: +configService.get('POSTGRES_PORT'),
        username: configService.get('POSTGRES_USERNAME'),
        password: configService.get('POSTGRES_PASSWORD'),
        database: configService.get('POSTGRES_DATABASE'),
        entities: [__dirname + '/database/entities/*.entity{.ts,.js}'],
        synchronize: configService.get('NODE_ENV') !== 'production',
        logging: configService.get('NODE_ENV') === 'development',
      }),
    }),
    ThrottlerModule.forRoot([{
      name: 'default',
      ttl: 60000,
      limit: 100,
    }]),
    // 🚀 ОСНОВНЫЕ МОДУЛИ В ПРАВИЛЬНОМ ПОРЯДКЕ
    AuthModule,           // Аутентификация - базовый модуль
    UsersModule,          // Пользователи
    CompaniesModule,      // Компании - основной модуль
    TariffsModule,        // Тарифы - нужны для подписок
    SubscriptionsModule,  // Подписки - зависят от компаний и тарифов
    CustomersModule,      // Клиенты - нужны для автомобилей
    VehiclesModule,       // Автомобили - зависят от клиентов
    VehiclesCatalogueModule, // Каталог автомобилей - нужен для поиска
    WorkSchedulesModule,   // Расписание работы - нужен для работы с автомобилями
    AppointmentsModule,    // Записи - основной модуль
    InventoryModule,      // 🔥 Склад и запчасти - нужен для заказов
    OrdersModule,         // Заказы - зависят от инвентаря
    InvoicesModule,       // Счета - зависят от заказов
    PaymentsModule,       // Платежи - зависят от счетов
    SeedsModule,          // Seeds - последним для инициализации данных
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements OnModuleInit {
  constructor(private readonly seedsService: SeedsService) {}

  async onModuleInit() {
    // Запускаем сидирование при старте приложения
    if (process.env.NODE_ENV !== 'test') {
      await this.seedsService.runAllSeeds();
    }
  }
}
