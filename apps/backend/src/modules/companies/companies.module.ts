import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config'; // ✅ ДОБАВЛЕНО: Для EnhancedValidationPipe
import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';
import { CompaniesDataService } from './services/companies-data.service';
import { CompaniesBusinessService } from './services/companies-business.service';
import { CompaniesValidationService } from './services/companies-validation.service';
import { CompaniesMapperService } from './services/companies-mapper.service';
import { Company } from '../../database/entities';
import { AuditService } from '../../common/audit/audit.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Company]),
    ConfigModule, // ✅ ДОБАВЛЕНО: Для ConfigService в контроллере
  ],
  controllers: [CompaniesController],
  providers: [
    CompaniesService,
    CompaniesDataService,
    CompaniesBusinessService,
    CompaniesValidationService,
    CompaniesMapperService,
    AuditService,
  ],
  exports: [
    CompaniesService,
    CompaniesDataService, // Для других модулей
    CompaniesValidationService, // ✅ ДОБАВЛЕНО: Для company-ownership.guard.ts
    CompaniesMapperService, // Для экспорта
  ],
})
export class CompaniesModule {}
