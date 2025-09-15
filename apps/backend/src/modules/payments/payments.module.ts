// path: apps/backend/src/modules/payments/payments.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment, Invoice, PaymentMethod, Order, OrderService, OrderPart } from '../../database/entities';

import { InvoicesModule } from '../invoices/invoices.module';
import { PaymentMethodsModule } from '../payment-methods/payment-methods.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { AuthModule } from '../auth/auth.module';
import { RedisModule } from '../../common/redis/redis.module';

import { PaymentsController } from './payments.controller';
import { PaymentsWebhooksController } from './webhooks/payments-webhooks.controller';

import { PaymentsService } from './payments.service';
import { PaymentsBusinessService } from './services/payments-business.service';
import { PaymentsDataService } from './services/payments-data.service';
import { PaymentsValidationService } from './services/payments-validation.service';
import { PaymentsMapperService } from './services/payments-mapper.service';

import { WebhookIpAclGuard } from './guards/webhook-ip-acl.guard';
import { WebhookIdempotencyService } from './services/webhook-idempotency.service';
import { YooKassaPaymentsClient } from './services/yookassa-payments.client';

import { AuditService } from '../../common/audit/audit.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, Invoice, PaymentMethod, Order, OrderService, OrderPart]),
    forwardRef(() => InvoicesModule),
    forwardRef(() => PaymentMethodsModule),
    SubscriptionsModule,
    forwardRef(() => AuthModule),
    RedisModule,
  ],
  controllers: [PaymentsController, PaymentsWebhooksController],
  providers: [
    PaymentsService,
    PaymentsBusinessService,
    PaymentsDataService,
    PaymentsValidationService,
    PaymentsMapperService,
    AuditService,
    WebhookIpAclGuard,
    WebhookIdempotencyService,
    YooKassaPaymentsClient,
  ],
  exports: [PaymentsService, PaymentsDataService, PaymentsValidationService],
})
export class PaymentsModule {}
