// src/modules/orders/orders.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrdersDataService } from './services/orders-data.service';
import { OrdersBusinessService } from './services/orders-business.service';
import { OrdersValidationService } from './services/orders-validation.service';
import { OrdersMapperService } from './services/orders-mapper.service';
import { 
  Order, 
  OrderService, 
  OrderPart, 
  Company, 
  Customer, 
  Vehicle, 
  User,
  Service,
  Part,
  PartCategory,
  Inventory,
  Subscription
} from '../../database/entities';
import { AuditService } from '../../common/audit/audit.service';
import { SubscriptionLimitsService } from '../subscriptions/services/subscription-limits.service';

// 🔥 ДОБАВЛЕНО: Импорт субмодулей
import { OrderServicesModule } from './order-services/order-services.module';
import { OrderPartsModule } from './order-parts/order-parts.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,        // 🎯 Основная entity
      OrderService, // 🔗 Связанные entities для relationships
      OrderPart,
      Company,      // 🔒 Для проверки принадлежности
      Customer,     // 🔗 Для связей
      Vehicle,      // 🔗 Для связей
      User,         // 🔗 Для createdBy, assignedTo
      Service,      // 🔗 Для OrderService
      Part,         // 🔗 Для OrderPart
      PartCategory, // 🔗 Для Parts
      Inventory,    // 🔗 Для проверки остатков
      Subscription, // 🔥 Для SubscriptionLimitsService
    ]),
    // 🔥 ДОБАВЛЕНО: Подключение обоих субмодулей
    OrderServicesModule,
    OrderPartsModule,
  ],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    OrdersDataService,
    OrdersBusinessService,
    OrdersValidationService,
    OrdersMapperService,
    AuditService,
    SubscriptionLimitsService,
  ],
  exports: [
    OrdersService,
    OrdersDataService,
    OrdersMapperService,
    // 🔥 ДОБАВЛЕНО: Реэкспорт субмодулей для других модулей
    OrderServicesModule,
    OrderPartsModule,
  ],
})
export class OrdersModule {}
