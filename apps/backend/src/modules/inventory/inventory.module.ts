// path: apps/backend/src/modules/inventory/inventory.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { InventoryDataService } from './services/inventory-data.service';
import { InventoryBusinessService } from './services/inventory-business.service';
import { InventoryValidationService } from './services/inventory-validation.service';
import { InventoryMapperService } from './services/inventory-mapper.service';

import { PartsModule } from './parts/parts.module';
import { StockMovementsModule } from './stock-movements/stock-movements.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { InventoryAlertsModule } from './inventory-alerts/inventory-alerts.module';

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
  User,
  PartReservation,
} from '../../database/entities';
import { AuditService } from '../../common/audit/audit.service';
import { AlertsBusinessService } from './inventory-alerts/services/alerts-business.service';
import { ReservationsScheduler } from './services/reservations.scheduler';

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
      PartReservation,
    ]),
    PartsModule,
    StockMovementsModule,
    SuppliersModule,
    forwardRef(() => InventoryAlertsModule),
  ],
  controllers: [InventoryController],
  providers: [
    InventoryService,
    InventoryDataService,
    InventoryBusinessService,
    InventoryValidationService,
    InventoryMapperService,
    AuditService,
    AlertsBusinessService,
    ReservationsScheduler, // 🔥 планировщик
  ],
  exports: [
    InventoryService,
    InventoryDataService,
    InventoryMapperService,
    StockMovementsModule,
    SuppliersModule,
    PartsModule,
    InventoryAlertsModule,
  ],
})
export class InventoryModule {}
