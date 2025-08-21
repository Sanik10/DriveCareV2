// path: apps/backend/src/modules/work-schedules/work-schedules.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkSchedulesController } from './work-schedules.controller';
import { WorkSchedulesService } from './work-schedules.service';

// Сервисы
import { WorkSchedulesBusinessService } from './services/work-schedules-business.service';
import { WorkSchedulesDataService } from './services/work-schedules-data.service';
import { WorkSchedulesMapperService } from './services/work-schedules-mapper.service';
import { WorkSchedulesValidationService } from './services/work-schedules-validation.service';

// Entities
import { WorkSchedule, ScheduleException, User, Company, Service } from '../../database/entities';

// Общие сервисы (если понадобится аудит — подключим по сигнатуре)
import { AuditService } from '../../common/audit/audit.service';

@Module({
  imports: [TypeOrmModule.forFeature([WorkSchedule, ScheduleException, User, Company, Service])],
  controllers: [WorkSchedulesController],
  providers: [
    WorkSchedulesService,
    WorkSchedulesBusinessService,
    WorkSchedulesDataService,
    WorkSchedulesMapperService,
    WorkSchedulesValidationService,
    AuditService,
  ],
  exports: [WorkSchedulesService, WorkSchedulesDataService, WorkSchedulesMapperService, WorkSchedulesBusinessService],
})
export class WorkSchedulesModule {}
