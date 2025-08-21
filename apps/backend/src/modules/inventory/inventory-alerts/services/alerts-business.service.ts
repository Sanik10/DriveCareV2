// path: apps/backend/src/modules/inventory/inventory-alerts/services/alerts-business.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { AlertsDataService } from './alerts-data.service';
import { AlertsValidationService } from './alerts-validation.service';
import { InventoryAlert } from '../../../../database/entities';
import {
  CreateAlertData,
  UpdateAlertData,
  AlertStats,
  AlertTriggerContext,
  AlertMetadata,
} from '../types/alerts.types';
import { RequestWithUser } from '../../../auth/interfaces/request-with-user.interface';
import { AuditService, AuditAction } from '../../../../common/audit/audit.service';
import { AlertType, AlertPriority } from '../../constants/inventory.constants';
import { ALERTS_CONSTRAINTS } from '../types/alerts.types';
import { AlertsNotificationService } from './alerts-notification.service';

@Injectable()
export class AlertsBusinessService {
  private readonly logger = new Logger(AlertsBusinessService.name);

  constructor(
    private readonly alertsDataService: AlertsDataService,
    private readonly alertsValidationService: AlertsValidationService,
    private readonly auditService: AuditService,
    private readonly notificationsService: AlertsNotificationService,
  ) {}

  async createSmartAlert(context: AlertTriggerContext, user?: RequestWithUser['user']): Promise<InventoryAlert | null> {
    this.logger.log(`Creating smart alert for part ${context.partId}`);

    try {
      const part = await this.alertsDataService.validatePartExists(context.partId, context.companyId);
      if (!part) {
        this.logger.warn(`Part ${context.partId} not found for company ${context.companyId}`);
        return null;
      }

      const currentStock = await this.alertsDataService.getPartCurrentStock(context.partId, context.companyId);
      const minStock = await this.alertsDataService.getPartMinStock(context.partId, context.companyId);

      const alertType = this.determineAlertType(currentStock, minStock);
      if (!alertType) {
        this.logger.debug(`No alert needed for part ${context.partId}: stock=${currentStock}, min=${minStock}`);
        return null;
      }

      const existingAlert = await this.alertsDataService.existsActiveAlertForPart(context.partId, context.companyId, alertType);
      if (existingAlert) {
        this.logger.debug(`Alert of type ${alertType} already exists for part ${context.partId}`);
        return null;
      }

      const priority = this.calculateAlertPriority(alertType, currentStock, minStock);
      const metadata = await this.generateAlertMetadata(alertType, context.partId, context.companyId, currentStock, minStock, context);

      const alertData: CreateAlertData = {
        companyId: context.companyId,
        partId: context.partId,
        type: alertType,
        priority,
        title: this.generateAlertTitle(alertType, part.name, currentStock, minStock),
        message: this.generateAlertMessage(alertType, part.name, currentStock, minStock, metadata),
        currentQuantity: currentStock,
        thresholdQuantity: minStock,
        metadata,
        triggeredBy: user?.id || 'system',
      };

      await this.alertsValidationService.validateCreateAlert(alertData);
      const alert = await this.alertsDataService.create(alertData);

      await this.auditService.log(AuditAction.INVENTORY_ALERT_CREATED, {
        entityType: 'InventoryAlert',
        entityId: alert.id,
        companyId: context.companyId,
        userId: user?.id || 'system',
        details: {
          partId: context.partId,
          partName: part.name,
          alertType,
          priority,
          currentStock,
          minStock,
          triggeredBy: context.triggeredBy,
        },
      });

      // Email‑уведомление (мягко: отсутствие SMTP не роняет)
      await this.notificationsService
        .dispatchAlertCreated(context.companyId, alert)
        .catch((e) => this.logger.warn(`dispatchAlertCreated failed: ${e?.message || e}`));

      this.logger.log(`Smart alert created: ${alert.id} for part ${context.partId}`);
      return alert;
    } catch (error) {
      this.logger.error(`Failed to create smart alert for part ${context.partId}: ${error}`);
      throw error;
    }
  }

  async createAlert(data: CreateAlertData, user: RequestWithUser['user']): Promise<InventoryAlert> {
    this.logger.log(`Creating manual alert for part ${data.partId}`);
    await this.alertsValidationService.validateCreateAlert(data);
    const alert = await this.alertsDataService.create(data);

    await this.auditService.log(AuditAction.INVENTORY_ALERT_CREATED, {
      entityType: 'InventoryAlert',
      entityId: alert.id,
      companyId: data.companyId,
      userId: user.id,
      details: { partId: data.partId, alertType: data.type, priority: data.priority, title: data.title, createdManually: true },
    });

    await this.notificationsService
      .dispatchAlertCreated(data.companyId, alert)
      .catch((e) => this.logger.warn(`dispatchAlertCreated failed: ${e?.message || e}`));

    this.logger.log(`Manual alert created: ${alert.id}`);
    return alert;
  }

  async updateAlert(id: string, data: UpdateAlertData, user: RequestWithUser['user']): Promise<InventoryAlert> {
    this.logger.log(`Updating alert: ${id}`);
    const { alert, updateData } = await this.alertsValidationService.validateUpdateAlert(id, data, user);
    const updatedAlert = await this.alertsDataService.update(id, updateData);

    await this.auditService.log(AuditAction.INVENTORY_ALERT_UPDATED, {
      entityType: 'InventoryAlert',
      entityId: id,
      companyId: user.companyId,
      userId: user.id,
      details: { partId: alert.partId, updatedFields: Object.keys(updateData) },
    });

    this.logger.log(`Alert updated: ${id}`);
    return updatedAlert;
  }

  async dismissAlert(alertId: string, user: RequestWithUser['user']): Promise<InventoryAlert> {
    this.logger.log(`Dismissing alert: ${alertId}`);
    const alert = await this.alertsValidationService.validateDismissAlert(alertId, user);
    const dismissedAlert = await this.alertsDataService.dismiss(alertId, user.id);

    await this.auditService.log(AuditAction.INVENTORY_ALERT_DISMISSED, {
      entityType: 'InventoryAlert',
      entityId: alertId,
      companyId: user.companyId,
      userId: user.id,
      details: { partId: alert.partId, alertType: alert.type, priority: alert.priority, dismissedManually: true },
    });

    this.logger.log(`Alert dismissed: ${alertId}`);
    return dismissedAlert;
  }

  async handleStockMovement(
    partId: string,
    companyId: string,
    previousQuantity: number,
    newQuantity: number,
    movementId: string,
    userId: string,
  ): Promise<void> {
    this.logger.log(`Handling stock movement for part ${partId}: ${previousQuantity} -> ${newQuantity}`);
    const context: AlertTriggerContext = {
      partId,
      companyId,
      triggeredBy: 'stock_movement',
      triggerData: { movementId, userId, previousQuantity, newQuantity, changeReason: 'stock_movement' },
    };

    if (newQuantity > previousQuantity) {
      await this.autoDismissRestockAlerts(partId, companyId);
    }

    const user = { id: userId, companyId } as any;
    await this.createSmartAlert(context, user);
  }

  async autoDismissRestockAlerts(partId: string, companyId: string): Promise<number> {
    this.logger.log(`Auto-dismissing restock alerts for part ${partId}`);
    const dismissedCount = await this.alertsDataService.dismissAlertsAfterRestock(partId, companyId);

    if (dismissedCount > 0) {
      await this.auditService.log(AuditAction.INVENTORY_ALERTS_AUTO_DISMISSED, {
        entityType: 'InventoryAlert',
        companyId,
        userId: 'system',
        details: { partId, dismissedCount, reason: 'auto_dismiss_after_restock' },
      });
      this.logger.log(`Auto-dismissed ${dismissedCount} alerts for part ${partId}`);
    }

    return dismissedCount;
  }

  async cleanupExpiredAlerts(companyId: string): Promise<number> {
    this.logger.log(`Cleaning up expired alerts for company ${companyId}`);
    const expiredCount = await this.alertsDataService.dismissExpiredAlerts(companyId, ALERTS_CONSTRAINTS.AUTO_DISMISS_AFTER_HOURS);

    if (expiredCount > 0) {
      await this.auditService.log(AuditAction.INVENTORY_ALERTS_CLEANUP, {
        entityType: 'InventoryAlert',
        companyId,
        userId: 'system',
        details: { expiredCount, reason: 'auto_cleanup_expired', hoursThreshold: ALERTS_CONSTRAINTS.AUTO_DISMISS_AFTER_HOURS },
      });
      this.logger.log(`Cleaned up ${expiredCount} expired alerts for company ${companyId}`);
    }

    return expiredCount;
  }

  // Новый метод: учитывает часы из настроек
  async cleanupExpiredAlertsWithSettings(companyId: string, hours: number): Promise<number> {
    this.logger.log(`Cleaning up expired alerts for company ${companyId} (hours=${hours})`);
    const expiredCount = await this.alertsDataService.dismissExpiredAlerts(companyId, Math.max(1, Math.min(hours, 168)));

    if (expiredCount > 0) {
      await this.auditService.log(AuditAction.INVENTORY_ALERTS_CLEANUP, {
        entityType: 'InventoryAlert',
        companyId,
        userId: 'system',
        details: { expiredCount, reason: 'auto_cleanup_expired', hoursThreshold: Math.max(1, Math.min(hours, 168)) },
      });
      this.logger.log(`Cleaned up ${expiredCount} expired alerts for company ${companyId} (by settings)`);
    }

    return expiredCount;
  }

  async getCriticalAlerts(companyId: string): Promise<InventoryAlert[]> {
    return this.alertsDataService.findCriticalAlerts(companyId);
  }

  async getAlertStats(companyId: string, dateFrom: Date, dateTo: Date): Promise<AlertStats> {
    this.logger.log(`Getting alert stats for company ${companyId}`);
    return this.alertsDataService.getAlertStats(companyId, dateFrom, dateTo);
  }

  private determineAlertType(currentStock: number, minStock: number): AlertType | null {
    if (currentStock === 0) return 'out_of_stock';
    if (currentStock <= minStock) return 'low_stock';
    if (currentStock > minStock * 5) return 'overstock';
    return null;
  }

  private calculateAlertPriority(type: AlertType, currentStock: number, minStock: number): AlertPriority {
    switch (type) {
      case 'out_of_stock':
        return 'critical';
      case 'low_stock':
        if (currentStock <= minStock * 0.5) return 'critical';
        if (currentStock <= minStock * 0.8) return 'high';
        return 'medium';
      case 'overstock':
        if (currentStock > minStock * 10) return 'high';
        return 'medium';
      case 'expired_reservation':
        return 'medium';
      default:
        return 'low';
    }
  }

  private async generateAlertMetadata(
    type: AlertType,
    partId: string,
    companyId: string,
    currentStock: number,
    minStock: number,
    context: AlertTriggerContext,
  ): Promise<AlertMetadata> {
    const metadata: AlertMetadata = {
      automaticallyCreated: true,
      relatedMovementId: context.triggerData?.movementId,
    };

    switch (type) {
      case 'low_stock':
      case 'out_of_stock':
        metadata.shortage = Math.max(0, minStock - currentStock);
        metadata.estimatedRunOutDays = this.estimateRunOutDays(currentStock, minStock);
        break;
      case 'overstock':
        metadata.excessQuantity = currentStock - minStock * 2;
        metadata.averageUsage = 0;
        break;
    }

    return metadata;
  }

  private estimateRunOutDays(currentStock: number, minStock: number): number {
    if (currentStock === 0) return 0;
    const averageDailyUsage = 1;
    const daysRemaining = Math.floor(currentStock / averageDailyUsage);
    return Math.min(daysRemaining, 365);
  }

  private generateAlertTitle(type: AlertType, partName: string, currentStock: number, minStock: number): string {
    switch (type) {
      case 'out_of_stock':
        return `Запчасть закончилась: ${partName}`;
      case 'low_stock':
        return `Низкий остаток: ${partName} (${currentStock} шт.)`;
      case 'overstock':
        return `Избыток запчастей: ${partName} (${currentStock} шт.)`;
      case 'expired_reservation':
        return `Истекло резервирование: ${partName}`;
      default:
        return `Уведомление по запчасти: ${partName}`;
    }
  }

  private generateAlertMessage(
    type: AlertType,
    partName: string,
    currentStock: number,
    minStock: number,
    metadata: AlertMetadata,
  ): string {
    switch (type) {
      case 'out_of_stock':
        return `Запчасть "${partName}" полностью закончилась. Минимальный остаток: ${minStock} шт. Требуется срочное пополнение.`;
      case 'low_stock': {
        const shortage = metadata.shortage || 0;
        return `Низкий остаток запчасти "${partName}". Текущий остаток: ${currentStock} шт., минимальный: ${minStock} шт. Нехватка: ${shortage} шт.`;
      }
      case 'overstock': {
        const excess = metadata.excessQuantity || 0;
        return `Избыточный остаток запчасти "${partName}". Текущий остаток: ${currentStock} шт., рекомендуемый максимум: ${minStock * 2} шт. Избыток: ${excess} шт.`;
      }
      case 'expired_reservation':
        return `Истекло резервирование запчасти "${partName}". Зарезервированное количество возвращено на склад.`;
      default:
        return `Уведомление по запчасти "${partName}". Текущий остаток: ${currentStock} шт.`;
    }
  }
}
