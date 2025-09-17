// path: apps/backend/src/modules/tariffs/tariffs.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TariffsController } from './tariffs.controller';
import { TariffsService } from './tariffs.service';
import { TariffsDataService } from './services/tariffs-data.service';
import { TariffsBusinessService } from './services/tariffs-business.service';
import { TariffsValidationService } from './services/tariffs-validation.service';
import { TariffsMapperService } from './services/tariffs-mapper.service';
import { Tariff, Subscription } from '../../database/entities';
import { AuditService } from '../../common/audit/audit.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Tariff, Subscription]), forwardRef(() => AuthModule)],
  controllers: [TariffsController],
  providers: [
    TariffsService,
    TariffsDataService,
    TariffsBusinessService,
    TariffsValidationService,
    TariffsMapperService,
    AuditService,
  ],
  exports: [TariffsService, TariffsDataService, TariffsMapperService],
})
export class TariffsModule {}
