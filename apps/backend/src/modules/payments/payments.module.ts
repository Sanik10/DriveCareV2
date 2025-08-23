// path: apps/backend/src/modules/payments/payments.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment, Invoice, PaymentMethod } from '../../database/entities';

import { InvoicesModule } from '../invoices/invoices.module';
import { PaymentMethodsModule } from '../payment-methods/payment-methods.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { AuthModule } from '../auth/auth.module'; // ✅ нужен для JwtAuthGuard/SessionService/SecurityService

import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentsBusinessService } from './services/payments-business.service';
import { PaymentsDataService } from './services/payments-data.service';
import { PaymentsValidationService } from './services/payments-validation.service';
import { PaymentsMapperService } from './services/payments-mapper.service';

import { AuditService } from '../../common/audit/audit.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, Invoice, PaymentMethod]),
    forwardRef(() => InvoicesModule),
    forwardRef(() => PaymentMethodsModule),
    SubscriptionsModule,
    forwardRef(() => AuthModule), // ✅ добавлено
  ],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    PaymentsBusinessService,
    PaymentsDataService,
    PaymentsValidationService,
    PaymentsMapperService,
    AuditService,
  ],
  exports: [
    PaymentsService,
    PaymentsDataService,
    PaymentsValidationService,
  ],
})
export class PaymentsModule {}
