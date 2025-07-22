import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TariffsController } from './tariffs.controller';
import { TariffsService } from './tariffs.service';
import { TariffsDataService } from './services/tariffs-data.service';
import { TariffsBusinessService } from './services/tariffs-business.service';
import { TariffsValidationService } from './services/tariffs-validation.service';
import { TariffsMapperService } from './services/tariffs-mapper.service'; // 🔥 ДОБАВЛЕНО
import { Tariff } from '../../database/entities';
import { AuditService } from '../../common/audit/audit.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Tariff]),
  ],
  controllers: [TariffsController],
  providers: [
    TariffsService,
    TariffsDataService,
    TariffsBusinessService,
    TariffsValidationService,
    TariffsMapperService, // 🔥 ДОБАВЛЕНО
    AuditService,
  ],
  exports: [
    TariffsService,
    TariffsDataService, // Для других модулей (subscriptions)
    TariffsMapperService, // 🔥 ДОБАВЛЕНО для экспорта
  ],
})
export class TariffsModule {}
