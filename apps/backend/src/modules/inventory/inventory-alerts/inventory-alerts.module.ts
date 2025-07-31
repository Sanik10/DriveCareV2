// src/modules/inventory/inventory-alerts/inventory-alerts.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryAlertsController } from './inventory-alerts.controller';
import { InventoryAlertsService } from './inventory-alerts.service';
import { AlertsDataService } from './services/alerts-data.service';
import { AlertsBusinessService } from './services/alerts-business.service';
import { AlertsValidationService } from './services/alerts-validation.service';
import { AlertsMapperService } from './services/alerts-mapper.service';
import { 
  InventoryAlert,
  Part,
  PartCategory,
  Inventory,
  Company,
  User
} from '../../../database/entities';
import { AuditService } from '../../../common/audit/audit.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InventoryAlert,
      Part,
      PartCategory,
      Inventory,
      Company,
      User,
    ]),
  ],
  controllers: [InventoryAlertsController],
  providers: [
    InventoryAlertsService,
    AlertsDataService,
    AlertsBusinessService,
    AlertsValidationService,
    AlertsMapperService,
    AuditService,
  ],
  exports: [
	InventoryAlertsService,
	AlertsBusinessService, // ✅ Экспортируем
	AlertsDataService,     // ✅ Экспортируем
	AlertsValidationService, // ✅ ДОБАВИТЬ в exports
	AlertsMapperService,   // ✅ ДОБАВИТЬ в exports
  ],
})
export class InventoryAlertsModule {}
