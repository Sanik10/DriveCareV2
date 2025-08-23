// path: apps/backend/src/modules/payment-methods/payment-methods.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentMethod, Payment } from '../../database/entities';
import { AuthModule } from '../auth/auth.module'; // ✅ для JwtAuthGuard/SessionService/SecurityService

import { PaymentMethodsController } from './payment-methods.controller';
import { PaymentMethodsService } from './payment-methods.service';
import { PaymentMethodsBusinessService } from './services/payment-methods-business.service';
import { PaymentMethodsDataService } from './services/payment-methods-data.service';
import { PaymentMethodsValidationService } from './services/payment-methods-validation.service';
import { PaymentMethodsMapperService } from './services/payment-methods-mapper.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentMethod, Payment]),
    forwardRef(() => AuthModule), // ✅ добавлено
  ],
  controllers: [PaymentMethodsController],
  providers: [
    PaymentMethodsService,
    PaymentMethodsBusinessService,
    PaymentMethodsDataService,
    PaymentMethodsValidationService,
    PaymentMethodsMapperService,
  ],
  exports: [
    PaymentMethodsService,
    PaymentMethodsValidationService,
    PaymentMethodsBusinessService,
  ],
})
export class PaymentMethodsModule {}
