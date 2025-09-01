// path: apps/backend/src/modules/orders/orders.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrdersDataService } from './services/orders-data.service';
import { OrdersBusinessService } from './services/orders-business.service';
import { OrdersValidationService } from './services/orders-validation.service';
import { OrdersMapperService } from './services/orders-mapper.service';
import {
  Order,
  OrderService as OrderServiceEntity,
  OrderPart,
  Company,
  Customer,
  Vehicle,
  User,
  Service,
  Part,
  PartCategory,
  Inventory,
  Subscription,
} from '../../database/entities';
import { AuditService } from '../../common/audit/audit.service';
import { SubscriptionLimitsService } from '../subscriptions/services/subscription-limits.service';

import { OrderServicesModule } from './order-services/order-services.module';
import { OrderPartsModule } from './order-parts/order-parts.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderServiceEntity,
      OrderPart,
      Company,
      Customer,
      Vehicle,
      User,
      Service,
      Part,
      PartCategory,
      Inventory,
      Subscription,
    ]),
    // Use forwardRef on both sides to allow injecting OrdersBusinessService into line modules
    forwardRef(() => OrderServicesModule),
    forwardRef(() => OrderPartsModule),
    forwardRef(() => AuthModule),
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
    OrdersBusinessService, // export to inject into order-services/order-parts business layers
    OrderServicesModule,
    OrderPartsModule,
  ],
})
export class OrdersModule {}
