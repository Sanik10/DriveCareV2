// path: apps/backend/src/modules/subscriptions/subscriptions.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsDataService } from './services/subscriptions-data.service';
import { SubscriptionsBusinessService } from './services/subscriptions-business.service';
import { SubscriptionsValidationService } from './services/subscriptions-validation.service';
import { SubscriptionLimitsService } from './services/subscription-limits.service';
import { SubscriptionsMapperService } from './services/subscriptions-mapper.service';
import { Subscription, Tariff, Company } from '../../database/entities';
import { AuditService } from '../../common/audit/audit.service';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from '../../common/redis/redis.module';

@Module({
  imports: [
    ConfigModule,
    RedisModule,
    TypeOrmModule.forFeature([Subscription, Tariff, Company]),
  ],
  controllers: [SubscriptionsController],
  providers: [
    SubscriptionsService,
    SubscriptionsDataService,
    SubscriptionsBusinessService,
    SubscriptionsValidationService,
    SubscriptionLimitsService,
    SubscriptionsMapperService,
    AuditService,
    // убрано: AuditLoggingInterceptor, SecurityHeadersInterceptor
  ],
  exports: [
    SubscriptionsService,
    SubscriptionsDataService,
    SubscriptionsMapperService,
    SubscriptionLimitsService,
  ],
})
export class SubscriptionsModule {}
