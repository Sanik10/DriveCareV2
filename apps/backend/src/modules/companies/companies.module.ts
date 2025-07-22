import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';
import { CompaniesDataService } from './services/companies-data.service';
import { CompaniesBusinessService } from './services/companies-business.service';
import { CompaniesValidationService } from './services/companies-validation.service';
import { CompaniesMapperService } from './services/companies-mapper.service'; // 🔥 ДОБАВЛЕНО
import { Company } from '../../database/entities';
import { AuditService } from '../../common/audit/audit.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Company]),
  ],
  controllers: [CompaniesController],
  providers: [
    CompaniesService,
    CompaniesDataService,
    CompaniesBusinessService,
    CompaniesValidationService,
    CompaniesMapperService, // 🔥 ДОБАВЛЕНО
    AuditService,
  ],
  exports: [
    CompaniesService,
    CompaniesDataService, // Для других модулей
    CompaniesMapperService, // 🔥 ДОБАВЛЕНО для экспорта
  ],
})
export class CompaniesModule {}
