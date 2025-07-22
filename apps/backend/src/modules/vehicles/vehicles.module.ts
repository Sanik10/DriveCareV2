import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VehiclesController } from './vehicles.controller';
import { VehiclesService } from './vehicles.service';
import { VehiclesDataService } from './services/vehicles-data.service';
import { VehiclesBusinessService } from './services/vehicles-business.service';
import { VehiclesValidationService } from './services/vehicles-validation.service';
import { VehiclesMapperService } from './services/vehicles-mapper.service';
import { AuditService } from '../../common/audit/audit.service';

// 🔥 КРИТИЧНО: Правильный импорт всех нужных entities
import {
  Vehicle,
  Customer,
  VehicleModel,
  VehicleType,
  Subscription,
} from '../../database/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Vehicle,           // 🔥 Основная entity
      Customer,          // 🔥 Для проверки ownership клиентов
      VehicleModel,      // 🔥 Для валидации моделей
      VehicleType,       // 🔥 Для валидации типов
      Subscription,      // 🔥 Для проверки лимитов
    ]),
  ],
  controllers: [VehiclesController],
  providers: [
    VehiclesService,
    VehiclesDataService,
    VehiclesBusinessService,
    VehiclesValidationService,
    VehiclesMapperService,
    AuditService,
  ],
  exports: [
    VehiclesService,
    VehiclesDataService,
    VehiclesMapperService,
  ],
})
export class VehiclesModule {}
