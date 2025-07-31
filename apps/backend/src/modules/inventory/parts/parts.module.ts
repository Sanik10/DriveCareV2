// src/modules/inventory/parts/parts.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PartsController } from './parts.controller';
import { PartsService } from './parts.service';
import { PartsDataService } from './services/parts-data.service';
import { PartsBusinessService } from './services/parts-business.service';
import { PartsValidationService } from './services/parts-validation.service';
import { PartsMapperService } from './services/parts-mapper.service';
import { 
  Part,
  PartCategory,
  Company,
  Inventory,
  StockMovement 
} from '../../../database/entities';
import { AuditService } from '../../../common/audit/audit.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Part,           // 🎯 Основная entity модуля
      PartCategory,   // 🔗 Категории запчастей
      Company,        // 🔒 Для проверки принадлежности
      Inventory,      // 🔗 Для интеграции с inventory
      StockMovement,  // 🔗 Для истории движений
    ])
  ],
  controllers: [PartsController],
  providers: [
    PartsService,
    PartsDataService,
    PartsBusinessService,
    PartsValidationService,
    PartsMapperService,
    AuditService,
  ],
  exports: [
    PartsService,
    PartsDataService,
    PartsMapperService,
    // Экспортируем для использования в других субмодулях inventory
  ],
})
export class PartsModule {}
