// path: apps/backend/src/modules/invoices/invoices.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommonModule } from '../../common/common.module';
import { AuthModule } from '../auth/auth.module';

// Entities
import { Invoice, Order, Company, Payment } from '../../database/entities';

// Controllers и Services
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';

// 4-layer архитектура
import { InvoicesBusinessService } from './services/invoices-business.service';
import { InvoicesDataService } from './services/invoices-data.service';
import { InvoicesMapperService } from './services/invoices-mapper.service';
import { InvoicesValidationService } from './services/invoices-validation.service';

// Импортируем модуль подписок, который уже экспортирует SubscriptionLimitsService
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invoice, Order, Company, Payment]),
    CommonModule,
    AuthModule,
    SubscriptionsModule, // ⬅️ важное: получаем SubscriptionLimitsService из этого модуля
  ],
  controllers: [InvoicesController],
  providers: [
    InvoicesService,
    InvoicesBusinessService,
    InvoicesDataService,
    InvoicesMapperService,
    InvoicesValidationService,
    // НЕ добавляем здесь SubscriptionLimitsService (его провайдит SubscriptionsModule)
  ],
  exports: [
    InvoicesService,
    InvoicesDataService,
    InvoicesValidationService,
  ],
})
export class InvoicesModule {}
