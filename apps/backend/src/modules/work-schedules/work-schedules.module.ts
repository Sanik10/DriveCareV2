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
import { WorkSchedulesRetentionScheduler } from './services/work-schedules-retention.scheduler';

// Entities
import { WorkSchedule, ScheduleException, User, Company, Service } from '../../database/entities';

// Общие сервисы
import { AuditService } from '../../common/audit/audit.service';
import { RedisModule } from '../../common/redis/redis.module';

@Module({
  imports: [TypeOrmModule.forFeature([WorkSchedule, ScheduleException, User, Company, Service]), RedisModule],
  controllers: [WorkSchedulesController],
  providers: [
    WorkSchedulesService,
    WorkSchedulesBusinessService,
    WorkSchedulesDataService,
    WorkSchedulesMapperService,
    WorkSchedulesValidationService,
    WorkSchedulesRetentionScheduler,
    AuditService,
  ],
  exports: [
    WorkSchedulesService,
    WorkSchedulesDataService,
    WorkSchedulesMapperService,
    WorkSchedulesBusinessService,
  ],
})
export class WorkSchedulesModule {}
