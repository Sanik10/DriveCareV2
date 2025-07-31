// src/modules/orders/order-services/order-services.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderServicesController } from './order-services.controller';
import { OrderServicesService } from './order-services.service';
import { OrderServicesDataService } from './services/order-services-data.service';
import { OrderServicesBusinessService } from './services/order-services-business.service';
import { OrderServicesValidationService } from './services/order-services-validation.service';
import { OrderServicesMapperService } from './services/order-services-mapper.service';
import { 
  OrderService, 
  Order, 
  Service, 
  User,
  Company // 🔒 Для проверки принадлежности
} from '../../../database/entities';
import { AuditService } from '../../../common/audit/audit.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrderService,  // 🎯 Основная entity субмодуля
      Order,         // 🔗 Родительская entity для связей
      Service,       // 🔗 Для получения информации об услугах
      User,          // 🔗 Для механиков (assignedTo)
      Company,       // 🔒 Для проверки принадлежности
    ]),
  ],
  controllers: [OrderServicesController],
  providers: [
    OrderServicesService,
    OrderServicesDataService,
    OrderServicesBusinessService,
    OrderServicesValidationService,
    OrderServicesMapperService,
    AuditService, // 🔥 Для логирования действий
  ],
  exports: [
    OrderServicesService,
    OrderServicesDataService,
    OrderServicesMapperService, // 🔥 Экспортируем для использования в других модулях
  ],
})
export class OrderServicesModule {}
