// path: apps/backend/src/modules/inventory/inventory-alerts/inventory-alerts.service.ts
import { Injectable, Logger, ConflictException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
  NotificationRequest,
  NotificationResult,
} from './types/alerts.types';
import { RequestWithUser } from '../../auth/interfaces/request-with-user.interface';
import { AuditService, AuditAction } from '../../../common/audit/audit.service';
import { INVENTORY_CONSTANTS } from '../constants/inventory.constants';
import { createHash } from 'crypto';
import { Inject } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../../../common/redis/redis.constants';

@Injectable()
export class InventoryAlertsService {
  private readonly logger = new Logger(InventoryAlertsService.name);
  private readonly idempTtlMs: number;

  constructor(
    private readonly alertsDataService: AlertsDataService,
    private readonly alertsBusinessService: AlertsBusinessService,
    private readonly alertsValidationService: AlertsValidationService,
    private readonly alertsMapperService: AlertsMapperService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {
    this.idempTtlMs = this.configService.get<number>('inventory.idempotencyTtlMs') || 6 * 60 * 60 * 1000;
  }

  async findAll(filter: AlertFilter, user: RequestWithUser['user']): Promise<PaginatedAlertsResponseDto> {
    this.logger.log(`Finding alerts with filters: ${JSON.stringify({ ...filter, metadata: undefined })}`);
    const [alerts, total] = await this.alertsDataService.findWithFilters(filter);
    const canViewCosts = INVENTORY_CONSTANTS.ROLES.CAN_VIEW_COSTS.includes(user.role as any);
    return this.alertsMapperService.mapToPaginatedResponse(
      alerts,
      total,
      filter.page || 1,
      filter.limit || 25,
      filter,
      { canViewCosts },
    );
  }

  async findOne(id: string, user: RequestWithUser['user']): Promise<AlertResponseDto> {
    this.logger.log(`Finding alert: ${id}`);
    const alert = await this.alertsValidationService.validateAlertExists(id);
    const canViewCosts = INVENTORY_CONSTANTS.ROLES.CAN_VIEW_COSTS.includes(user.role as any);
    return this.alertsMapperService.mapToResponseDto(alert, { canViewCosts });
  }

  async dismissAlert(alertId: string, user: RequestWithUser['user']): Promise<AlertResponseDto> {
    this.logger.log(`Dismissing alert: ${alertId} by user: ${user.id}`);
    const dismissedAlert = await this.alertsBusinessService.dismissAlert(alertId, user);
    const canViewCosts = INVENTORY_CONSTANTS.ROLES.CAN_VIEW_COSTS.includes(user.role as any);
    return this.alertsMapperService.mapToResponseDto(dismissedAlert, { canViewCosts });
  }

  async getCriticalAlerts(companyId: string, user: RequestWithUser['user']): Promise<AlertResponseDto[]> {
    this.logger.log(`Getting critical alerts for company: ${companyId}`);
    const criticalAlerts = await this.alertsBusinessService.getCriticalAlerts(companyId);
    const canViewCosts = INVENTORY_CONSTANTS.ROLES.CAN_VIEW_COSTS.includes(user.role as any);
    return this.alertsMapperService.mapArrayToResponseDto(criticalAlerts, { canViewCosts });
  }

  async getAlertStats(companyId: string, dateFrom: Date, dateTo: Date): Promise<any> {
    this.logger.log(`Getting alert stats for company: ${companyId}`);
    const stats = await this.alertsBusinessService.getAlertStats(companyId, dateFrom, dateTo);
    return this.alertsMapperService.mapStatsToResponse(stats);
  }

  async getAlertSettings(companyId: string): Promise<AlertSettingsResponseDto> {
    this.logger.log(`Getting alert settings for company: ${companyId}`);
    const settingsEntity = await this.alertsDataService.getOrCreateSettings(companyId);

    const currentActive = await this.alertsDataService.findWithFilters({
      companyId,
      isActive: true,
      limit: 1,
      page: 1,
    });
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayAlerts = await this.alertsDataService.findWithFilters({
      companyId,
      createdFrom: todayStart,
      limit: 1,
      page: 1,
    });

    const settings: AlertSettings = {
      companyId,
      userId: settingsEntity.userId || undefined,
      enableEmailNotifications: settingsEntity.enableEmailNotifications,
      enablePushNotifications: settingsEntity.enablePushNotifications,
      emailAddresses: settingsEntity.emailAddresses,
      lowStockThreshold: settingsEntity.lowStockThreshold,
      criticalStockThreshold: settingsEntity.criticalStockThreshold,
      overstockMultiplier: settingsEntity.overstockMultiplier,
      enabledAlertTypes: settingsEntity.enabledAlertTypes as any,
      alertFrequency: settingsEntity.alertFrequency,
      autoDismissAfterRestock: settingsEntity.autoDismissAfterRestock,
      autoDismissAfterHours: settingsEntity.autoDismissAfterHours,
      workingHoursStart: settingsEntity.workingHoursStart || undefined,
      workingHoursEnd: settingsEntity.workingHoursEnd || undefined,
      workingDays: settingsEntity.workingDays || undefined,
      timezone: settingsEntity.timezone || undefined,
    };

    return this.alertsMapperService.mapSettingsToResponseDto(
      settings,
      currentActive[1],
      todayAlerts[1],
      settingsEntity.lastNotificationSent || undefined,
    );
  }

  async updateAlertSettings(companyId: string, updateSettingsDto: UpdateAlertSettingsDto, user?: RequestWithUser['user']): Promise<AlertSettingsResponseDto> {
    this.logger.log(`Updating alert settings for company: ${companyId}`);
    await this.alertsValidationService.validateAlertSettings(updateSettingsDto, companyId);

    await this.alertsDataService.updateSettings(companyId, {
      enableEmailNotifications: updateSettingsDto.enableEmailNotifications ?? undefined,
      enablePushNotifications: updateSettingsDto.enablePushNotifications ?? undefined,
      emailAddresses: updateSettingsDto.emailAddresses ?? undefined,
      lowStockThreshold: updateSettingsDto.lowStockThreshold ?? undefined,
      criticalStockThreshold: updateSettingsDto.criticalStockThreshold ?? undefined,
      overstockMultiplier: updateSettingsDto.overstockMultiplier ?? undefined,
      enabledAlertTypes: updateSettingsDto.enabledAlertTypes as any,
      alertFrequency: updateSettingsDto.alertFrequency ?? undefined,
      autoDismissAfterRestock: updateSettingsDto.autoDismissAfterRestock ?? undefined,
      autoDismissAfterHours: updateSettingsDto.autoDismissAfterHours ?? undefined,
      workingHoursStart: updateSettingsDto.workingHoursStart ?? null,
      workingHoursEnd: updateSettingsDto.workingHoursEnd ?? null,
      workingDays: updateSettingsDto.workingDays ?? null,
      timezone: updateSettingsDto.timezone ?? null,
    } as any);

    // Аудит
    await this.auditService.log(AuditAction.INVENTORY_ALERT_SETTINGS_UPDATED, {
      companyId,
      userId: user?.id,
      details: {
        updatedFields: Object.keys(updateSettingsDto),
      },
    });

    return this.getAlertSettings(companyId);
  }

  async sendTestNotification(
    companyId: string,
    testNotificationDto: TestNotificationDto,
    user: RequestWithUser['user'],
    idempotencyKey: string,
  ): Promise<TestNotificationResponseDto> {
    if (!idempotencyKey) {
      throw new BadRequestException('X-Idempotency-Key header is required');
    }

    const req: NotificationRequest = {
      type: testNotificationDto.type,
      priority: testNotificationDto.priority,
      subject: `Тестовое уведомление - ${testNotificationDto.type}`,
      message: testNotificationDto.customMessage || 'Это тестовое уведомление системы управления складом',
      recipients: (testNotificationDto.recipients && testNotificationDto.recipients.length > 0)
        ? testNotificationDto.recipients
        : [user.email].filter(Boolean) as string[],
    };

    this.alertsValidationService.validateNotificationRequest(req);

    const area = 'alerts';
    const op = 'test';
    const key = idempotencyKey;

    return this.withIdempotency(area, op, companyId, key, async () => {
      // mock notification sending
      const mockResult: NotificationResult = {
        success: true,
        sentCount: req.recipients.length,
        failedCount: 0,
        errors: [],
        sentAt: new Date(),
      };

      await this.auditService.log(AuditAction.INVENTORY_ALERT_TEST_NOTIFICATION, {
        companyId,
        userId: user.id,
        details: {
          recipientsCount: req.recipients.length,
          type: req.type,
          priority: req.priority,
        },
      });

      return this.alertsMapperService.mapTestNotificationResult(
        mockResult,
        testNotificationDto.type,
        testNotificationDto.priority,
        req.message,
        req.recipients,
      );
    });
  }

  async cleanupExpiredAlerts(companyId: string): Promise<number> {
    this.logger.log(`Cleaning up expired alerts for company: ${companyId}`);
    const count = await this.alertsBusinessService.cleanupExpiredAlerts(companyId);
    return count;
  }

  async batchDismissAlerts(
    alertIds: string[],
    user: RequestWithUser['user'],
    idempotencyKey: string,
  ): Promise<{ dismissedCount: number; failedCount: number; errors: string[] }> {
    if (!idempotencyKey) {
      throw new BadRequestException('X-Idempotency-Key header is required');
    }
    const area = 'alerts';
    const op = 'batch_dismiss';
    const sorted = [...(alertIds || [])].sort();
    const hash = createHash('sha256').update(sorted.join(',')).digest('hex');
    const key = `${idempotencyKey}:${hash}`;

    return this.withIdempotency(area, op, user.companyId, key, async () => {
      let dismissedCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      for (const alertId of alertIds) {
        try {
          await this.alertsBusinessService.dismissAlert(alertId, user);
          dismissedCount++;
        } catch (error: any) {
          failedCount++;
          errors.push(`Alert ${alertId}: ${error?.message || 'Unknown error'}`);
        }
      }

      return { dismissedCount, failedCount, errors };
    });
  }

  // Integrations
  async handleStockMovement(
    partId: string,
    companyId: string,
    previousQuantity: number,
    newQuantity: number,
    movementId: string,
    userId: string,
  ): Promise<void> {
    this.logger.log(`Handling stock movement for part ${partId}: ${previousQuantity} -> ${newQuantity}`);
    return this.alertsBusinessService.handleStockMovement(partId, companyId, previousQuantity, newQuantity, movementId, userId);
  }

  async createSmartAlert(context: any, user?: RequestWithUser['user']): Promise<void> {
    this.logger.log(`Creating smart alert for part ${context.partId}`);
    await this.alertsBusinessService.createSmartAlert(context, user);
  }

  // Idempotency helper
  private async withIdempotency<T>(
    area: string,
    op: string,
    companyId: string,
    key: string,
    executor: () => Promise<T>,
  ): Promise<T> {
    const lockKey = `idemp:${area}:${op}:lock:${companyId}:${key}`;
    const resultKey = `idemp:${area}:${op}:result:${companyId}:${key}`;

    // cached result
    const cached = await this.redis.get(resultKey);
    if (cached) {
      return JSON.parse(cached) as T;
    }

    // acquire lock
    const lock = await this.redis.set(lockKey, '1', 'PX', this.idempTtlMs, 'NX');
    if (!lock) {
      throw new ConflictException('Operation is already in progress');
    }

    try {
      const result = await executor();
      await this.redis.psetex(resultKey, this.idempTtlMs, JSON.stringify(result));
      return result;
    } finally {
      // best effort unlock
      await this.redis.del(lockKey).catch(() => undefined);
    }
  }
}
