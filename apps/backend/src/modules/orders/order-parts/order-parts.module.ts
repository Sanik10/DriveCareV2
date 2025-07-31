// src/modules/orders/order-parts/order-parts.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderPartsController } from './order-parts.controller';
import { OrderPartsService } from './order-parts.service';
import { OrderPartsDataService } from './services/order-parts-data.service';
import { OrderPartsBusinessService } from './services/order-parts-business.service';
import { OrderPartsValidationService } from './services/order-parts-validation.service';
import { OrderPartsMapperService } from './services/order-parts-mapper.service';
import { 
  OrderPart, 
  Order, 
  Part, 
  PartCategory,
  Inventory,
  Company // 🔒 Для проверки принадлежности
} from '../../../database/entities';
import { AuditService } from '../../../common/audit/audit.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrderPart,     // 🎯 Основная entity субмодуля
      Order,         // 🔗 Родительская entity для связей
      Part,          // 🔗 Для получения информации о запчастях
      PartCategory,  // 🔗 Для категорий запчастей
      Inventory,     // 🔗 Для проверки остатков на складе
      Company,       // 🔒 Для проверки принадлежности
    ]),
  ],
  controllers: [OrderPartsController],
  providers: [
    OrderPartsService,
    OrderPartsDataService,
    OrderPartsBusinessService,
    OrderPartsValidationService,
    OrderPartsMapperService,
    AuditService, // 🔥 Для логирования действий
  ],
  exports: [
    OrderPartsService,
    OrderPartsDataService,
    OrderPartsMapperService, // 🔥 Экспортируем для использования в других модулях
  ],
})
export class OrderPartsModule {}
