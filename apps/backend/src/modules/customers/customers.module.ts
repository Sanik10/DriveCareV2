// path: apps/backend/src/modules/customers/customers.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { CustomersDataService } from './services/customers-data.service';
import { CustomersBusinessService } from './services/customers-business.service';
import { CustomersValidationService } from './services/customers-validation.service';
import { CustomersMapperService } from './services/customers-mapper.service';
import { Customer, Subscription } from '../../database/entities';
import { Vehicle } from '../../database/entities/vehicle.entity';
import { Order } from '../../database/entities/order.entity';
import { AuditService } from '../../common/audit/audit.service';
import { CustomerExportService } from './services/customer-export.service';
import { CustomerAnonymizationService } from './services/customer-anonymization.service';
import { CustomerRetentionScheduler } from './services/customer-retention.scheduler';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Customer,
      Subscription,
      Vehicle,
      Order,
    ]),
  ],
  controllers: [CustomersController],
  providers: [
    CustomersService,
    CustomersDataService,
    CustomersBusinessService,
    CustomersValidationService,
    CustomersMapperService,
    CustomerExportService,
    CustomerAnonymizationService,
    CustomerRetentionScheduler,
    AuditService,
  ],
  exports: [
    CustomersService,
    CustomersDataService,
    CustomersMapperService,
  ],
})
export class CustomersModule {}
