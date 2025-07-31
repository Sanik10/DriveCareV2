// src/modules/payments/payments.module.ts - ИСПРАВИТЬ ИМПОРТЫ:

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment, Invoice, PaymentMethod } from '../../database/entities';

// ✅ ИМПОРТИРУЕМ НУЖНЫЕ МОДУЛИ
import { InvoicesModule } from '../invoices/invoices.module';
import { PaymentMethodsModule } from '../payment-methods/payment-methods.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';

// Контроллеры и сервисы
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentsBusinessService } from './services/payments-business.service';
import { PaymentsDataService } from './services/payments-data.service';
import { PaymentsValidationService } from './services/payments-validation.service';
import { PaymentsMapperService } from './services/payments-mapper.service';

// Общие сервисы
import { AuditService } from '../../common/audit/audit.service';

@Module({
  imports: [
    // ✅ ДОБАВЛЯЕМ СУЩНОСТИ
    TypeOrmModule.forFeature([Payment, Invoice, PaymentMethod]),
    
    // ✅ ИМПОРТИРУЕМ ЗАВИСИМЫЕ МОДУЛИ
    InvoicesModule,        // Для InvoicesService
    PaymentMethodsModule,  // Для PaymentMethodsService
    SubscriptionsModule,   // Для SubscriptionLimitsService
  ],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    PaymentsBusinessService,
    PaymentsDataService,
    PaymentsValidationService,
    PaymentsMapperService,
    AuditService,  // ✅ ДОБАВЛЯЕМ AuditService
  ],
  exports: [
    PaymentsService,
    PaymentsDataService,  // Экспортируем для других модулей
  ],
})
export class PaymentsModule {}
