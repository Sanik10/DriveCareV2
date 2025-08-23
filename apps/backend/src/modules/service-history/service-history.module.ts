// path: apps/backend/src/modules/service-history/service-history.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceHistoryController } from './service-history.controller';
import { ServiceHistoryService } from './service-history.service';
import { ServiceHistoryDataService } from './services/service-history-data.service';
import { ServiceHistoryBusinessService } from './services/service-history-business.service';
import { ServiceHistoryValidationService } from './services/service-history-validation.service';
import { ServiceHistoryMapperService } from './services/service-history-mapper.service';
import { AuditService } from '../../common/audit/audit.service';

// 🔥 КРИТИЧНО: Импорт всех нужных entities
import {
  VehicleServiceHistory,
  Vehicle,
  Customer,
  Company,
} from '../../database/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VehicleServiceHistory,  // 🔥 Основная entity
      Vehicle,               // 🔥 Для проверки ownership автомобилей
      Customer,              // 🔥 Для фильтрации по клиентам
      Company,               // 🔥 Для проверки компании
    ]),
  ],
  controllers: [ServiceHistoryController],
  providers: [
    ServiceHistoryService,
    ServiceHistoryDataService,
    ServiceHistoryBusinessService,
    ServiceHistoryValidationService,
    ServiceHistoryMapperService,
    AuditService,
  ],
  exports: [
    ServiceHistoryService,
    ServiceHistoryDataService,
    ServiceHistoryMapperService,
  ],
})
export class ServiceHistoryModule {}
