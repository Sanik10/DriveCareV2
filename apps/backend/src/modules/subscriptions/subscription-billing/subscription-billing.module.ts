// path: apps/backend/src/modules/subscriptions/subscription-billing/subscription-billing.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SubscriptionBillingController } from './subscription-billing.controller';
import { SubscriptionBillingService } from './subscription-billing.service';

import { BillingBusinessService } from './services/billing-business.service';
import { BillingComplianceService } from './services/billing-compliance.service';
import { BillingNotificationService } from './services/billing-notification.service';
import { BillingPaymentService } from './services/billing-payment.service';

import { YooKassaGateway } from './services/gateways/yookassa.gateway';
import { TinkoffGateway } from './services/gateways/tinkoff.gateway';

import { Subscription } from '../../../database/entities/subscription.entity';
import { Company } from '../../../database/entities/company.entity';
import { Tariff } from '../../../database/entities/tariff.entity';
import { SubscriptionPaymentLog } from '../../../database/entities/subscription-payment-log.entity';
import { SubscriptionComplianceLog } from '../../../database/entities/subscription-compliance-log.entity';
import { SubscriptionConsent } from '../../../database/entities/subscription-consent.entity';

import { AuditService } from '../../../common/audit/audit.service';
import { AuditLoggingInterceptor } from '../../../common/interceptors/audit-logging.interceptor';
import { SecurityHeadersInterceptor } from '../../../common/interceptors/security-headers.interceptor';
import { WebhookSignatureGuard } from './guards/webhook-signature.guard';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '../../../common/redis/redis.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      Subscription,
      Company,
      Tariff,
      SubscriptionPaymentLog,
      SubscriptionComplianceLog,
      SubscriptionConsent,
    ]),
    RedisModule,
  ],
  controllers: [SubscriptionBillingController],
  providers: [
    SubscriptionBillingService,
    BillingBusinessService,
    BillingComplianceService,
    BillingNotificationService,
    BillingPaymentService,
    YooKassaGateway,
    TinkoffGateway,
    WebhookSignatureGuard,
    AuditService,
    AuditLoggingInterceptor,
    SecurityHeadersInterceptor,
    // RedisProvider, // Redis клиент (REDIS_CLIENT) — для идемпотентности вебхуков/платежей
  ],
  exports: [SubscriptionBillingService],
})
export class SubscriptionBillingModule {}
