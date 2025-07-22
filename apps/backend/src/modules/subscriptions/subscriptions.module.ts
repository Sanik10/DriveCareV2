import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsDataService } from './services/subscriptions-data.service';
import { SubscriptionsBusinessService } from './services/subscriptions-business.service';
import { SubscriptionsValidationService } from './services/subscriptions-validation.service';
import { SubscriptionLimitsService } from './services/subscription-limits.service';
import { SubscriptionsMapperService } from './services/subscriptions-mapper.service';
import { Subscription, Tariff, Company } from '../../database/entities'; // 🔥 ДОБАВЛЕНО Tariff, Company
import { AuditService } from '../../common/audit/audit.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Subscription, Tariff, Company]), // 🔥 ИСПРАВЛЕНО: добавлены Tariff, Company
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
  ],
  exports: [
    SubscriptionsService,
    SubscriptionsDataService, // Для других модулей
    SubscriptionsMapperService, // Для экспорта
    SubscriptionLimitsService, // Для проверки лимитов в других модулях
  ],
})
export class SubscriptionsModule {}
