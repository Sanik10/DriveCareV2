// path: apps/backend/src/modules/orders/order-parts/order-parts.module.ts
import { Module, forwardRef } from '@nestjs/common';
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
  Company,
  Subscription,
} from '../../../database/entities';
import { AuditService } from '../../../common/audit/audit.service';
import { SubscriptionLimitsService } from '../../subscriptions/services/subscription-limits.service';
import { OrdersModule } from '../orders.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      OrderPart,
      Order,
      Part,
      PartCategory,
      Inventory,
      Company,
      Subscription, // for SubscriptionLimitsService
    ]),
    // forwardRef to resolve circular dependency (OrderPartsBusinessService -> OrdersBusinessService)
    forwardRef(() => OrdersModule),
  ],
  controllers: [OrderPartsController],
  providers: [
    OrderPartsService,
    OrderPartsDataService,
    OrderPartsBusinessService,
    OrderPartsValidationService,
    OrderPartsMapperService,
    AuditService,
    SubscriptionLimitsService,
  ],
  exports: [OrderPartsService, OrderPartsDataService, OrderPartsMapperService],
})
export class OrderPartsModule {}
