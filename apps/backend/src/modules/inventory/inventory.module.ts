// Обновление src/modules/inventory/inventory.module.ts
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
import { SuppliersModule } from './suppliers/suppliers.module';
import { InventoryAlertsModule } from './inventory-alerts/inventory-alerts.module'; // 🔥 ДОБАВЛЕНО

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
      StockMovement,
      InventoryAlert, 
      Supplier,       
      Company,        
      Order,          
      OrderPart,
      User,
    ]),
    // 🔥 НОВОЕ: Подключаем субмодули
    PartsModule,
    StockMovementsModule,
    SuppliersModule,
    InventoryAlertsModule, // 🔥 ДОБАВЛЕНО
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
    SuppliersModule,
    PartsModule,
    InventoryAlertsModule, // 🔥 ДОБАВЛЕНО
  ],
})
export class InventoryModule {}
