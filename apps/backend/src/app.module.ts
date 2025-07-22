import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CompaniesModule } from './modules/companies/companies.module'; // 🔥 ДОБАВЛЕНО
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module'; // 🔥 ДОБАВЛЕНО
import { TariffsModule } from './modules/tariffs/tariffs.module'; // 🔥 ДОБАВЛЕНО
import { SeedsModule, SeedsService } from './database/seeds';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DATABASE_HOST', 'localhost'),
        port: configService.get('DATABASE_PORT', 5433),
        username: configService.get('DATABASE_USERNAME', 'postgres'),
        password: configService.get('DATABASE_PASSWORD', '135137'),
        database: configService.get('DATABASE_NAME', 'drivecare'),
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
    CompaniesModule,      // 🔥 Компании - основной модуль
    TariffsModule,        // 🔥 Тарифы - нужны для подписок
    SubscriptionsModule,  // 🔥 Подписки - зависят от компаний и тарифов
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