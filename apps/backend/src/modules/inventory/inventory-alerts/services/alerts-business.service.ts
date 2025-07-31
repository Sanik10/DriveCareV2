// src/modules/inventory/inventory-alerts/services/alerts-business.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { AlertsDataService } from './alerts-data.service';
import { AlertsValidationService } from './alerts-validation.service';
import { InventoryAlert } from '../../../../database/entities';
import { 
  CreateAlertData,
  UpdateAlertData,
  AlertSettings,
  AlertStats,
  NotificationRequest,
  NotificationResult,
  AlertTriggerContext,
  AlertMetadata
} from '../types/alerts.types';
import { RequestWithUser } from '../../../auth/interfaces/request-with-user.interface';
import { AuditService, AuditAction } from '../../../../common/audit/audit.service';
import { AlertType, AlertPriority } from '../../constants/inventory.constants';
import { INVENTORY_CONSTANTS } from '../../constants/inventory.constants';
import { ALERTS_CONSTRAINTS } from '../types/alerts.types';

@Injectable()
export class AlertsBusinessService {
  private readonly logger = new Logger(AlertsBusinessService.name);

  constructor(
    private readonly alertsDataService: AlertsDataService,
    private readonly alertsValidationService: AlertsValidationService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * 🤖 Умное создание алерта с автоматическими вычислениями
   */
  async createSmartAlert(
    context: AlertTriggerContext,
    user?: RequestWithUser['user']
  ): Promise<InventoryAlert | null> {
    this.logger.log(`Creating smart alert for part ${context.partId}`);

    try {
      // 🔍 Получаем текущую информацию о запчасти
      const part = await this.alertsDataService.validatePartExists(
        context.partId, 
        context.companyId
      );

      if (!part) {
        this.logger.warn(`Part ${context.partId} not found for company ${context.companyId}`);
        return null;
      }

      // 📊 Получаем текущие остатки
      const currentStock = await this.alertsDataService.getPartCurrentStock(
        context.partId, 
        context.companyId
      );
      const minStock = await this.alertsDataService.getPartMinStock(
        context.partId, 
        context.companyId
      );

      // 🎯 Определяем нужный тип алерта
      const alertType = this.determineAlertType(currentStock, minStock);
      if (!alertType) {
        this.logger.debug(`No alert needed for part ${context.partId}: stock=${currentStock}, min=${minStock}`);
        return null;
      }

      // 🔒 Проверяем что алерт этого типа еще не существует
      const existingAlert = await this.alertsDataService.existsActiveAlertForPart(
        context.partId,
        context.companyId,
        alertType
      );

      if (existingAlert) {
        this.logger.debug(`Alert of type ${alertType} already exists for part ${context.partId}`);
        return null;
      }

      // 🎯 Рассчитываем приоритет и метаданные
      const priority = this.calculateAlertPriority(alertType, currentStock, minStock);
      const metadata = await this.generateAlertMetadata(
        alertType, 
        context.partId, 
        context.companyId,
        currentStock, 
        minStock, 
        context
      );

      // 📝 Создаем данные алерта
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

      // ✅ Валидация
      await this.alertsValidationService.validateCreateAlert(alertData);

      // 🔄 Создание алерта
      const alert = await this.alertsDataService.create(alertData);

      // 🔥 Audit логирование
      await this.auditService.log(AuditAction.INVENTORY_ALERT_CREATED, {
        entityType: 'InventoryAlert',
        entityId: alert.id,
        companyId: context.companyId,
        userId: user?.id || 'system',
        metadata: {
          partId: context.partId,
          partName: part.name,
          alertType,
          priority,
          currentStock,
          minStock,
          triggeredBy: context.triggeredBy,
          triggerData: context.triggerData,
        },
      });

      // 📧 Отправляем уведомления (если включены)
      await this.sendAlertNotifications(alert, context.companyId);

      this.logger.log(`Smart alert created: ${alert.id} for part ${context.partId}`);
      return alert;

    } catch (error) {
      this.logger.error(`Failed to create smart alert for part ${context.partId}: ${error}`);
      throw error;
    }
  }

  /**
   * 📝 Создание алерта вручную
   */
  async createAlert(data: CreateAlertData, user: RequestWithUser['user']): Promise<InventoryAlert> {
    this.logger.log(`Creating manual alert for part ${data.partId}`);

    // ✅ Валидация
    await this.alertsValidationService.validateCreateAlert(data);

    // 🔄 Создание
    const alert = await this.alertsDataService.create(data);

    // 🔥 Audit логирование
    await this.auditService.log(AuditAction.INVENTORY_ALERT_CREATED, {
      entityType: 'InventoryAlert',
      entityId: alert.id,
      companyId: data.companyId,
      userId: user.id,
      metadata: {
        partId: data.partId,
        alertType: data.type,
        priority: data.priority,
        title: data.title,
        createdManually: true,
      },
    });

    this.logger.log(`Manual alert created: ${alert.id}`);
    return alert;
  }

  /**
   * ✏️ Обновление алерта
   */
  async updateAlert(
    id: string, 
    data: UpdateAlertData, 
    user: RequestWithUser['user']
  ): Promise<InventoryAlert> {
    this.logger.log(`Updating alert: ${id}`);

    // ✅ Валидация
    const { alert, updateData } = await this.alertsValidationService.validateUpdateAlert(
      id, 
      data, 
      user
    );

    // 🔄 Обновление
    const updatedAlert = await this.alertsDataService.update(id, updateData);

    // 🔥 Audit логирование
    await this.auditService.log(AuditAction.INVENTORY_ALERT_UPDATED, {
      entityType: 'InventoryAlert',
      entityId: id,
      companyId: user.companyId,
      userId: user.id,
      metadata: {
        partId: alert.partId,
        changes: this.detectChanges(alert, updateData),
        updatedFields: Object.keys(updateData),
      },
    });

    this.logger.log(`Alert updated: ${id}`);
    return updatedAlert;
  }

  /**
   * 🚫 Отклонение алерта
   */
  async dismissAlert(alertId: string, user: RequestWithUser['user']): Promise<InventoryAlert> {
    this.logger.log(`Dismissing alert: ${alertId}`);

    // ✅ Валидация
    const alert = await this.alertsValidationService.validateDismissAlert(alertId, user);

    // 🔄 Отклонение
    const dismissedAlert = await this.alertsDataService.dismiss(alertId, user.id);

    // 🔥 Audit логирование
    await this.auditService.log(AuditAction.INVENTORY_ALERT_DISMISSED, {
      entityType: 'InventoryAlert',
      entityId: alertId,
      companyId: user.companyId,
      userId: user.id,
      metadata: {
        partId: alert.partId,
        alertType: alert.type,
        priority: alert.priority,
        dismissedManually: true,
      },
    });

    this.logger.log(`Alert dismissed: ${alertId}`);
    return dismissedAlert;
  }

  /**
   * 🔄 Интеграция с Stock Movements - автоматическая проверка алертов
   */
  async handleStockMovement(
    partId: string,
    companyId: string,
    previousQuantity: number,
    newQuantity: number,
    movementId: string,
    userId: string
  ): Promise<void> {
    this.logger.log(`Handling stock movement for part ${partId}: ${previousQuantity} -> ${newQuantity}`);

    const context: AlertTriggerContext = {
      partId,
      companyId,
      triggeredBy: 'stock_movement',
      triggerData: {
        movementId,
        userId,
        previousQuantity,
        newQuantity,
        changeReason: 'stock_movement',
      },
    };

    // 🔄 Если остаток увеличился, отклоняем алерты о низком остатке
    if (newQuantity > previousQuantity) {
      await this.autoDismissRestockAlerts(partId, companyId);
    }

    // 🤖 Создаем новые алерты если нужно
    const user = { id: userId, companyId } as any; // Упрощенный user object
    await this.createSmartAlert(context, user);
  }

  /**
   * 🔄 Автоматическое отклонение алертов после пополнения
   */
  async autoDismissRestockAlerts(partId: string, companyId: string): Promise<number> {
    this.logger.log(`Auto-dismissing restock alerts for part ${partId}`);

    const dismissedCount = await this.alertsDataService.dismissAlertsAfterRestock(
      partId, 
      companyId
    );

    if (dismissedCount > 0) {
      // 🔥 Audit логирование
      await this.auditService.log(AuditAction.INVENTORY_ALERTS_AUTO_DISMISSED, {
        entityType: 'InventoryAlert',
        companyId,
        userId: 'system',
        metadata: {
          partId,
          dismissedCount,
          reason: 'auto_dismiss_after_restock',
        },
      });

      this.logger.log(`Auto-dismissed ${dismissedCount} alerts for part ${partId}`);
    }

    return dismissedCount;
  }

  /**
   * 🧹 Очистка истекших алертов
   */
  async cleanupExpiredAlerts(companyId: string): Promise<number> {
    this.logger.log(`Cleaning up expired alerts for company ${companyId}`);

    const expiredCount = await this.alertsDataService.dismissExpiredAlerts(
      companyId,
      ALERTS_CONSTRAINTS.AUTO_DISMISS_AFTER_HOURS
    );

    if (expiredCount > 0) {
      // 🔥 Audit логирование
      await this.auditService.log(AuditAction.INVENTORY_ALERTS_CLEANUP, {
        entityType: 'InventoryAlert',
        companyId,
        userId: 'system',
        metadata: {
          expiredCount,
          reason: 'auto_cleanup_expired',
          hoursThreshold: ALERTS_CONSTRAINTS.AUTO_DISMISS_AFTER_HOURS,
        },
      });

      this.logger.log(`Cleaned up ${expiredCount} expired alerts for company ${companyId}`);
    }

    return expiredCount;
  }

  /**
   * 📧 Отправка уведомлений по алерту
   */
  async sendAlertNotifications(
    alert: InventoryAlert, 
    companyId: string
  ): Promise<NotificationResult | null> {
    this.logger.log(`Sending notifications for alert ${alert.id}`);

    try {
      // TODO: Получить настройки уведомлений для компании
      // const settings = await this.getAlertSettings(companyId);
      
      // TODO: Интеграция с email сервисом
      // Пока возвращаем заглушку
      const mockResult: NotificationResult = {
        success: true,
        sentCount: 1,
        failedCount: 0,
        errors: [],
        sentAt: new Date(),
      };

      this.logger.log(`Notifications sent for alert ${alert.id}: ${mockResult.sentCount} recipients`);
      return mockResult;

    } catch (error) {
      this.logger.error(`Failed to send notifications for alert ${alert.id}: ${error}`);
      return null;
    }
  }

  /**
   * 🔍 Получение критических алертов
   */
  async getCriticalAlerts(companyId: string): Promise<InventoryAlert[]> {
    return this.alertsDataService.findCriticalAlerts(companyId);
  }

  /**
   * 📊 Получение статистики алертов
   */
  async getAlertStats(
    companyId: string,
    dateFrom: Date,
    dateTo: Date
  ): Promise<AlertStats> {
    this.logger.log(`Getting alert stats for company ${companyId}`);

    return this.alertsDataService.getAlertStats(companyId, dateFrom, dateTo);
  }

  /**
   * 🎯 Определение типа алерта на основе остатков
   */
  private determineAlertType(currentStock: number, minStock: number): AlertType | null {
    if (currentStock === 0) {
      return 'out_of_stock';
    }
    
    if (currentStock <= minStock) {
      return 'low_stock';
    }

    // Проверка на избыток (в 5 раз больше минимального)
    if (currentStock > minStock * 5) {
      return 'overstock';
    }

    return null; // Алерт не нужен
  }

  /**
   * 🎯 Расчет приоритета алерта
   */
  private calculateAlertPriority(
    type: AlertType,
    currentStock: number,
    minStock: number
  ): AlertPriority {
    switch (type) {
      case 'out_of_stock':
        return 'critical';
      
      case 'low_stock':
        // Критичный если остаток меньше половины от минимального
        if (currentStock <= minStock * 0.5) {
          return 'critical';
        }
        // Высокий если остаток меньше 80% от минимального
        if (currentStock <= minStock * 0.8) {
          return 'high';
        }
        return 'medium';
      
      case 'overstock':
        // Высокий приоритет если избыток больше чем в 10 раз
        if (currentStock > minStock * 10) {
          return 'high';
        }
        return 'medium';
      
      case 'expired_reservation':
        return 'medium';
      
      default:
        return 'low';
    }
  }

  /**
   * 📊 Генерация метаданных алерта
   */
  private async generateAlertMetadata(
    type: AlertType,
    partId: string,
    companyId: string,
    currentStock: number,
    minStock: number,
    context: AlertTriggerContext
  ): Promise<AlertMetadata> {
    const metadata: AlertMetadata = {
      automaticallyCreated: true,
      relatedMovementId: context.triggerData?.movementId,
    };

    switch (type) {
      case 'low_stock':
      case 'out_of_stock':
        metadata.shortage = Math.max(0, minStock - currentStock);
        // TODO: Рассчитать estimatedRunOutDays на основе истории движений
        metadata.estimatedRunOutDays = this.estimateRunOutDays(currentStock, minStock);
        break;
      
      case 'overstock':
        metadata.excessQuantity = currentStock - (minStock * 2); // 2x как нормальный уровень
        // TODO: Рассчитать averageUsage на основе истории
        metadata.averageUsage = 0; // Заглушка
        break;
    }

    return metadata;
  }

  /**
   * 📈 Прогноз исчерпания запаса (упрощенный алгоритм)
   */
  private estimateRunOutDays(currentStock: number, minStock: number): number {
    if (currentStock === 0) return 0;
    
    // Упрощенный расчет: предполагаем средний расход 1 единица в день
    // TODO: Использовать реальную статистику движений
    const averageDailyUsage = 1;
    const daysRemaining = Math.floor(currentStock / averageDailyUsage);
    
    return Math.min(daysRemaining, 365); // Максимум год
  }

  /**
   * 📝 Генерация заголовка алерта
   */
  private generateAlertTitle(
    type: AlertType,
    partName: string,
    currentStock: number,
    minStock: number
  ): string {
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

  /**
   * 📝 Генерация сообщения алерта
   */
  private generateAlertMessage(
    type: AlertType,
    partName: string,
    currentStock: number,
    minStock: number,
    metadata: AlertMetadata
  ): string {
    switch (type) {
      case 'out_of_stock':
        return `Запчасть "${partName}" полностью закончилась. Минимальный остаток: ${minStock} шт. Требуется срочное пополнение.`;
      
      case 'low_stock':
        const shortage = metadata.shortage || 0;
        return `Низкий остаток запчасти "${partName}". Текущий остаток: ${currentStock} шт., минимальный: ${minStock} шт. Нехватка: ${shortage} шт.`;
      
      case 'overstock':
        const excess = metadata.excessQuantity || 0;
        return `Избыточный остаток запчасти "${partName}". Текущий остаток: ${currentStock} шт., рекомендуемый максимум: ${minStock * 2} шт. Избыток: ${excess} шт.`;
      
      case 'expired_reservation':
        return `Истекло резервирование запчасти "${partName}". Зарезервированное количество возвращено на склад.`;
      
      default:
        return `Уведомление по запчасти "${partName}". Текущий остаток: ${currentStock} шт.`;
    }
  }

  /**
   * 📊 Определение изменений для аудита
   */
  private detectChanges(original: InventoryAlert, updates: UpdateAlertData): Record<string, any> {
    const changes: Record<string, any> = {};
    
    Object.keys(updates).forEach(key => {
      const newValue = updates[key];
      const oldValue = original[key];
      
      if (newValue !== oldValue) {
        changes[key] = {
          from: oldValue,
          to: newValue,
        };
      }
    });

    return changes;
  }
}
