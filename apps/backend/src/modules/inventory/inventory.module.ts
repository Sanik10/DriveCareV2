// src/modules/inventory/inventory.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { InventoryDataService } from './services/inventory-data.service';
import { InventoryBusinessService } from './services/inventory-business.service';
import { InventoryValidationService } from './services/inventory-validation.service';
import { InventoryMapperService } from './services/inventory-mapper.service';

// 🔥 НОВОЕ: Импорт субмодулей
import { PartsModule } from './parts/parts.module';
import { StockMovementsModule } from './stock-movements/stock-movements.module';

import { 
  Inventory,
  Part,
  PartCategory,
  StockMovement,
  InventoryAlert,
  Supplier,
  Company,
  Order,
  OrderPart,
  User
} from '../../database/entities';
import { AuditService } from '../../common/audit/audit.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Inventory,      
      Part,           
      PartCategory,   
      StockMovement,  // 🔥 ВАЖНО: Добавляем StockMovement entity
      InventoryAlert, 
      Supplier,       
      Company,        
      Order,          
      OrderPart,
      User,           // 🔥 НОВОЕ: Для stock movements
    ]),
    // 🔥 НОВОЕ: Подключаем субмодули
    PartsModule,
    StockMovementsModule,
  ],
  controllers: [InventoryController],
  providers: [
    InventoryService,
    InventoryDataService,
    InventoryBusinessService,
    InventoryValidationService,
    InventoryMapperService,
    AuditService,
  ],
  exports: [
    InventoryService,
    InventoryDataService,
    InventoryMapperService,
    // 🔥 НОВОЕ: Экспортируем субмодули для других модулей
    StockMovementsModule,
    PartsModule,
  ],
})
export class InventoryModule {}
