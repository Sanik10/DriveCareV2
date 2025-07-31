// src/modules/inventory/inventory-alerts/inventory-alerts.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { AlertsDataService } from './services/alerts-data.service';
import { AlertsBusinessService } from './services/alerts-business.service';
import { AlertsValidationService } from './services/alerts-validation.service';
import { AlertsMapperService } from './services/alerts-mapper.service';
import { UpdateAlertSettingsDto } from './dto/request/alert-settings.dto';
import { TestNotificationDto } from './dto/request/test-notification.dto';
import { AlertResponseDto } from './dto/response/alert-response.dto';
import { PaginatedAlertsResponseDto } from './dto/response/paginated-alerts-response.dto';
import { AlertSettingsResponseDto } from './dto/response/alert-settings-response.dto';
import { TestNotificationResponseDto } from './dto/response/test-notification-response.dto';
import { 
  AlertFilter,
  AlertSettings,
  AlertStats,
  AlertTriggerContext,
  NotificationRequest,
  NotificationResult
} from './types/alerts.types';
import { RequestWithUser } from '../../auth/interfaces/request-with-user.interface';

@Injectable()
export class InventoryAlertsService {
  private readonly logger = new Logger(InventoryAlertsService.name);

  constructor(
    private readonly alertsDataService: AlertsDataService,
    private readonly alertsBusinessService: AlertsBusinessService,
    private readonly alertsValidationService: AlertsValidationService,
    private readonly alertsMapperService: AlertsMapperService,
  ) {}

  /**
   * 🔒 Получение всех уведомлений с фильтрацией
   */
  async findAll(filter: AlertFilter): Promise<PaginatedAlertsResponseDto> {
    this.logger.log(`Finding alerts with filters: ${JSON.stringify(filter)}`);

    const [alerts, total] = await this.alertsDataService.findWithFilters(filter);

    return this.alertsMapperService.mapToPaginatedResponse(
      alerts,
      total,
      filter.page || 1,
      filter.limit || 25,
      filter
    );
  }

  /**
   * 🔒 Получение уведомления по ID
   */
  async findOne(id: string): Promise<AlertResponseDto> {
    this.logger.log(`Finding alert: ${id}`);

    const alert = await this.alertsValidationService.validateAlertExists(id);
    return this.alertsMapperService.mapToResponseDto(alert);
  }

  /**
   * 🚫 Отклонение уведомления
   */
  async dismissAlert(alertId: string, user: RequestWithUser['user']): Promise<AlertResponseDto> {
    this.logger.log(`Dismissing alert: ${alertId} by user: ${user.id}`);

    const dismissedAlert = await this.alertsBusinessService.dismissAlert(alertId, user);
    return this.alertsMapperService.mapToResponseDto(dismissedAlert);
  }

  /**
   * 🚨 Получение критических уведомлений
   */
  async getCriticalAlerts(companyId: string): Promise<AlertResponseDto[]> {
    this.logger.log(`Getting critical alerts for company: ${companyId}`);

    const criticalAlerts = await this.alertsBusinessService.getCriticalAlerts(companyId);
    return this.alertsMapperService.mapArrayToResponseDto(criticalAlerts);
  }

  /**
   * 📊 Получение статистики уведомлений
   */
  async getAlertStats(companyId: string, dateFrom: Date, dateTo: Date): Promise<any> {
    this.logger.log(`Getting alert stats for company: ${companyId}`);

    const stats = await this.alertsBusinessService.getAlertStats(companyId, dateFrom, dateTo);
    return this.alertsMapperService.mapStatsToResponse(stats);
  }

  /**
   * ⚙️ Получение настроек уведомлений
   */
  async getAlertSettings(companyId: string): Promise<AlertSettingsResponseDto> {
    this.logger.log(`Getting alert settings for company: ${companyId}`);

    // TODO: Реализовать получение настроек из БД
    const defaultSettings: AlertSettings = {
      companyId,
      enableEmailNotifications: true,
      enablePushNotifications: true,
      emailAddresses: [],
      lowStockThreshold: 5,
      criticalStockThreshold: 2,
      overstockMultiplier: 5,
      enabledAlertTypes: ['low_stock', 'out_of_stock', 'overstock'],
      alertFrequency: 'immediate',
      autoDismissAfterRestock: true,
      autoDismissAfterHours: 72,
    };

    const currentActiveAlerts = await this.alertsDataService.findWithFilters({
      companyId,
      isActive: true,
      limit: 1000,
    });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayAlerts = await this.alertsDataService.findWithFilters({
      companyId,
      createdFrom: todayStart,
      limit: 1000,
    });

    return this.alertsMapperService.mapSettingsToResponseDto(
      defaultSettings,
      currentActiveAlerts[1], // total count
      todayAlerts[1] // total count
    );
  }

  /**
   * ⚙️ Обновление настроек уведомлений
   */
  async updateAlertSettings(
    companyId: string,
    updateSettingsDto: UpdateAlertSettingsDto
  ): Promise<AlertSettingsResponseDto> {
    this.logger.log(`Updating alert settings for company: ${companyId}`);

    // Валидация настроек
    await this.alertsValidationService.validateAlertSettings(updateSettingsDto, companyId);

    // TODO: Реализовать сохранение настроек в БД
    this.logger.log(`Alert settings updated for company: ${companyId}`);

    // Возвращаем обновленные настройки
    return this.getAlertSettings(companyId);
  }

  /**
   * 📧 Отправка тестового уведомления
   */
  async sendTestNotification(
    companyId: string,
    testNotificationDto: TestNotificationDto,
    user: RequestWithUser['user']
  ): Promise<TestNotificationResponseDto> {
    this.logger.log(`Sending test notification for company: ${companyId}`);

    // Валидация запроса
    const notificationRequest: NotificationRequest = {
      type: testNotificationDto.type,
      priority: testNotificationDto.priority,
      subject: `Тестовое уведомление - ${testNotificationDto.type}`,
      message: testNotificationDto.customMessage || 'Это тестовое уведомление системы управления складом',
      recipients: testNotificationDto.recipients || [user.email],
    };

    this.alertsValidationService.validateNotificationRequest(notificationRequest);

    // Отправка уведомления (заглушка)
    const mockResult: NotificationResult = {
      success: true,
      sentCount: notificationRequest.recipients.length,
      failedCount: 0,
      errors: [],
      sentAt: new Date(),
    };

    return this.alertsMapperService.mapTestNotificationResult(
      mockResult,
      testNotificationDto.type,
      testNotificationDto.priority,
      notificationRequest.message
    );
  }

  /**
   * 🧹 Очистка истекших уведомлений
   */
  async cleanupExpiredAlerts(companyId: string): Promise<number> {
    this.logger.log(`Cleaning up expired alerts for company: ${companyId}`);

    return this.alertsBusinessService.cleanupExpiredAlerts(companyId);
  }

  /**
   * 📊 Массовое отклонение уведомлений
   */
  async batchDismissAlerts(
    alertIds: string[],
    user: RequestWithUser['user']
  ): Promise<{ dismissedCount: number; failedCount: number; errors: string[] }> {
    this.logger.log(`Batch dismissing ${alertIds.length} alerts by user: ${user.id}`);

    let dismissedCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const alertId of alertIds) {
      try {
        await this.alertsBusinessService.dismissAlert(alertId, user);
        dismissedCount++;
      } catch (error) {
        failedCount++;
        errors.push(`Alert ${alertId}: ${error.message}`);
      }
    }

    this.logger.log(`Batch dismiss completed: ${dismissedCount} success, ${failedCount} failed`);

    return { dismissedCount, failedCount, errors };
  }

  /**
   * 🤖 Интеграция с inventory модулем - автоматическое создание уведомлений
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

    return this.alertsBusinessService.handleStockMovement(
      partId,
      companyId,
      previousQuantity,
      newQuantity,
      movementId,
      userId
    );
  }

  /**
   * 🎯 Создание уведомления из внешних модулей
   */
  async createSmartAlert(context: AlertTriggerContext, user?: RequestWithUser['user']): Promise<void> {
    this.logger.log(`Creating smart alert for part ${context.partId}`);

    await this.alertsBusinessService.createSmartAlert(context, user);
  }
}
