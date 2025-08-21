// path: apps/backend/src/modules/inventory/inventory-alerts/inventory-alerts.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryAlertsController } from './inventory-alerts.controller';
import { InventoryAlertsService } from './inventory-alerts.service';
import { AlertsDataService } from './services/alerts-data.service';
import { AlertsBusinessService } from './services/alerts-business.service';
import { AlertsValidationService } from './services/alerts-validation.service';
import { AlertsMapperService } from './services/alerts-mapper.service';
import { AlertsNotificationService } from './services/alerts-notification.service';
import { InventoryAlert, Part, PartCategory, Inventory, Company, User } from '../../../database/entities';
import { InventoryAlertSettings } from '../../../database/entities/inventory-alert-settings.entity';
import { AuditService } from '../../../common/audit/audit.service';
import { RedisModule } from '../../../common/redis/redis.module';
import { AlertsScheduler } from './alerts.scheduler';

@Module({
  imports: [
    RedisModule,
    TypeOrmModule.forFeature([InventoryAlert, InventoryAlertSettings, Part, PartCategory, Inventory, Company, User]),
  ],
  controllers: [InventoryAlertsController],
  providers: [
    InventoryAlertsService,
    AlertsDataService,
    AlertsBusinessService,
    AlertsValidationService,
    AlertsMapperService,
    AlertsNotificationService,
    AlertsScheduler,
    AuditService,
  ],
  exports: [
    InventoryAlertsService,
    AlertsBusinessService,
    AlertsDataService,
    AlertsValidationService,
    AlertsMapperService,
    AlertsNotificationService,
  ],
})
export class InventoryAlertsModule {}
