// path: apps/backend/src/modules/orders/order-services/order-services.module.ts
import { Module, forwardRef } from '@nestjs/common';
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
  Company,
} from '../../../database/entities';
import { AuditService } from '../../../common/audit/audit.service';
import { OrdersModule } from '../orders.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrderService, // main entity
      Order,        // parent entity
      Service,      // catalog entity
      User,         // mechanics
      Company,      // ownership checks
    ]),
    // forwardRef to resolve circular dependency (OrderServicesBusinessService -> OrdersBusinessService)
    forwardRef(() => OrdersModule),
  ],
  controllers: [OrderServicesController],
  providers: [
    OrderServicesService,
    OrderServicesDataService,
    OrderServicesBusinessService,
    OrderServicesValidationService,
    OrderServicesMapperService,
    AuditService,
  ],
  exports: [
    OrderServicesService,
    OrderServicesDataService,
    OrderServicesMapperService,
  ],
})
export class OrderServicesModule {}
