import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomersController } from './customers.controller';
import { CustomersService } from './customers.service';
import { CustomersDataService } from './services/customers-data.service';
import { CustomersBusinessService } from './services/customers-business.service';
import { CustomersValidationService } from './services/customers-validation.service';
import { CustomersMapperService } from './services/customers-mapper.service';
import { Customer, Subscription } from '../../database/entities';
import { AuditService } from '../../common/audit/audit.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Customer,     // Основная entity
      Subscription, // Для проверки лимитов в ValidationService
    ]),
  ],
  controllers: [CustomersController],
  providers: [
    CustomersService,
    CustomersDataService,
    CustomersBusinessService,
    CustomersValidationService,
    CustomersMapperService,
    AuditService,
  ],
  exports: [
    CustomersService,
    CustomersDataService,
    CustomersMapperService,
  ],
})
export class CustomersModule {}
