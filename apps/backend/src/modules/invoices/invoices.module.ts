// src/modules/invoices/invoices.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { InvoicesDataService } from './services/invoices-data.service';
import { InvoicesBusinessService } from './services/invoices-business.service';
import { InvoicesValidationService } from './services/invoices-validation.service';
import { InvoicesMapperService } from './services/invoices-mapper.service';
import { 
  Invoice, 
  Payment, 
  Order, 
  Company, 
  Customer, 
  Vehicle, 
  User,
  PaymentMethod,
  Subscription
} from '../../database/entities';
import { AuditService } from '../../common/audit/audit.service';
import { SubscriptionLimitsService } from '../subscriptions/services/subscription-limits.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Invoice,      // 🎯 Основная entity
      Payment,      // 🔗 Для связи с платежами
      Order,        // 🔗 Для создания из заказа
      Company,      // 🔒 Для проверки принадлежности
      Customer,     // 🔗 Для информации о клиенте
      Vehicle,      // 🔗 Для информации об автомобиле
      User,         // 🔗 Для createdBy
      PaymentMethod, // 🔗 Для интеграции с платежами
      Subscription, // 🔥 Для SubscriptionLimitsService
    ]),
  ],
  controllers: [InvoicesController],
  providers: [
    InvoicesService,
    InvoicesDataService,
    InvoicesBusinessService,
    InvoicesValidationService,
    InvoicesMapperService,
    AuditService,
    SubscriptionLimitsService,
  ],
  exports: [
    InvoicesService,
    InvoicesDataService,
    InvoicesMapperService,
  ],
})
export class InvoicesModule {}
