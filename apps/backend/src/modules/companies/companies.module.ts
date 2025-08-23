// path: apps/backend/src/modules/companies/companies.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';
import { CompaniesDataService } from './services/companies-data.service';
import { CompaniesBusinessService } from './services/companies-business.service';
import { CompaniesValidationService } from './services/companies-validation.service';
import { CompaniesMapperService } from './services/companies-mapper.service';
import { Company } from '../../database/entities';
import { AuditService } from '../../common/audit/audit.service';
import { AuthModule } from '../auth/auth.module'; // ✅ нужно для JwtAuthGuard/SessionService/SecurityService

@Module({
  imports: [
    TypeOrmModule.forFeature([Company]),
    ConfigModule,
    forwardRef(() => AuthModule), // ✅ добавлено: доступ к SecurityService/JwtAuthGuard из AuthModule
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
    CompaniesDataService,
    CompaniesValidationService,
    CompaniesMapperService,
  ],
})
export class CompaniesModule {}
