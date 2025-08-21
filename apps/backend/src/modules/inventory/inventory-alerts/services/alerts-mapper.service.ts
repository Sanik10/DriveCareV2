// path: apps/backend/src/modules/inventory/inventory-alerts/services/alerts-mapper.service.ts
import { Injectable } from '@nestjs/common';
import { InventoryAlert } from '../../../../database/entities';
import { AlertResponseDto } from '../dto/response/alert-response.dto';
import { PaginatedAlertsResponseDto } from '../dto/response/paginated-alerts-response.dto';
import { AlertSettingsResponseDto } from '../dto/response/alert-settings-response.dto';
import { TestNotificationResponseDto } from '../dto/response/test-notification-response.dto';
import {
  AlertDisplayItem,
  AlertSettings,
  AlertStats,
  NotificationResult,
  QuickAlertInfo,
} from '../types/alerts.types';
import { AlertType, AlertPriority } from '../../constants/inventory.constants';

interface MapOptions {
  canViewCosts?: boolean;
}

@Injectable()
export class AlertsMapperService {
  mapToResponseDto(alert: InventoryAlert, options: MapOptions = {}): AlertResponseDto {
    const urgencyLevel = this.calculateUrgencyLevel(alert);
    const canDismiss = this.calculateCanDismiss(alert);
    const ageInHours = this.calculateAgeInHours(alert.createdAt);
    const autoExpiresInHours = this.calculateAutoExpiresInHours(alert.createdAt);

    return {
      id: alert.id,
      companyId: alert.companyId,
      partId: alert.partId,
      type: alert.type,
      typeDisplay: this.getTypeDisplayName(alert.type),
      priority: alert.priority,
      priorityDisplay: this.getPriorityDisplayName(alert.priority),
      title: alert.title,
      message: alert.message,
      isActive: alert.isActive,
      isDismissed: alert.isDismissed,
      dismissedBy: alert.dismissedBy,
      dismissedAt: alert.dismissedAt,
      createdAt: alert.createdAt,
      updatedAt: alert.updatedAt,
      part: alert.part
        ? {
            id: alert.part.id,
            name: alert.part.name,
            partNumber: alert.part.partNumber || undefined,
            brand: alert.part.brand || undefined,
            category: alert.part.category
              ? { id: alert.part.category.id, name: alert.part.category.name }
              : { id: alert.part.categoryId, name: 'Неизвестная категория' },
            currentStock: alert.currentQuantity || 0,
            minStock: alert.thresholdQuantity || 0,
          }
        : {
            id: alert.partId,
            name: 'Неизвестная запчасть',
            partNumber: undefined,
            brand: undefined,
            category: { id: '', name: 'Неизвестная категория' },
            currentStock: alert.currentQuantity || 0,
            minStock: alert.thresholdQuantity || 0,
          },
      metadata: this.mapMetadataToDto(alert.metadata),
      urgencyLevel,
      canDismiss,
      ageInHours,
      autoExpiresInHours,
      estimatedShortageValue: options.canViewCosts ? this.calculateShortageValue(alert) : undefined,
      recommendedActions: this.generateRecommendedActions(alert),
    };
  }

  mapArrayToResponseDto(alerts: InventoryAlert[], options: MapOptions = {}): AlertResponseDto[] {
    return alerts.map((alert) => this.mapToResponseDto(alert, options));
  }

  mapToPaginatedResponse(
    alerts: InventoryAlert[],
    total: number,
    page: number,
    limit: number,
    filters?: any,
    options: MapOptions = {},
  ): PaginatedAlertsResponseDto {
    const items = this.mapArrayToResponseDto(alerts, options);
    const totalPages = Math.ceil(total / limit);
    const summary = this.calculatePageSummary(alerts, options);
    const typeStats = this.calculateTypeStats(alerts, total);

    return {
      items,
      total,
      page,
      limit,
      totalPages,
      summary,
      filters: {
        type: filters?.type,
        priority: filters?.priority,
        isActive: filters?.isActive,
        dateRange: filters?.dateFrom && filters?.dateTo ? { from: filters.dateFrom, to: filters.dateTo } : undefined,
        hasActiveFilters: this.hasActiveFilters(filters),
      },
      typeStats,
      lastUpdated: new Date(),
    };
  }

  mapSettingsToResponseDto(
    settings: AlertSettings,
    currentActiveAlerts: number = 0,
    todayAlertsCount: number = 0,
    lastNotificationSent?: Date,
  ): AlertSettingsResponseDto {
    return {
      companyId: settings.companyId,
      userId: settings.userId,
      enableEmailNotifications: settings.enableEmailNotifications,
      enablePushNotifications: settings.enablePushNotifications,
      emailAddresses: settings.emailAddresses,
      lowStockThreshold: settings.lowStockThreshold,
      criticalStockThreshold: settings.criticalStockThreshold,
      overstockMultiplier: settings.overstockMultiplier,
      enabledAlertTypes: settings.enabledAlertTypes,
      alertFrequency: settings.alertFrequency,
      autoDismissAfterRestock: settings.autoDismissAfterRestock,
      autoDismissAfterHours: settings.autoDismissAfterHours,
      workingHoursStart: settings.workingHoursStart,
      workingHoursEnd: settings.workingHoursEnd,
      workingDays: settings.workingDays,
      timezone: settings.timezone,
      createdAt: new Date(),
      updatedAt: new Date(),
      currentActiveAlerts,
      todayAlertsCount,
      lastNotificationSent,
    };
  }

  mapTestNotificationResult(
    result: NotificationResult,
    testType: AlertType,
    priority: AlertPriority,
    message: string,
    recipients: string[],
  ): TestNotificationResponseDto {
    return {
      success: result.success,
      sentCount: result.sentCount,
      failedCount: result.failedCount,
      recipients,
      errors: result.errors,
      sentAt: result.sentAt,
      testType: this.getTypeDisplayName(testType),
      priority: this.getPriorityDisplayName(priority),
      message,
    };
  }

  mapToDisplayItem(alert: InventoryAlert, options: MapOptions = {}): AlertDisplayItem {
    return {
      id: alert.id,
      type: alert.type,
      typeDisplay: this.getTypeDisplayName(alert.type),
      priority: alert.priority,
      priorityDisplay: this.getPriorityDisplayName(alert.priority),
      title: alert.title,
      message: alert.message,
      partName: alert.part?.name || 'Неизвестная запчасть',
      partNumber: alert.part?.partNumber || undefined,
      categoryName: alert.part?.category?.name || 'Неизвестная категория',
      currentQuantity: alert.currentQuantity || undefined,
      thresholdQuantity: alert.thresholdQuantity || undefined,
      shortage: this.calculateShortage(alert),
      createdAt: alert.createdAt,
      isActive: alert.isActive,
      isDismissed: alert.isDismissed,
      canDismiss: this.calculateCanDismiss(alert),
      urgencyLevel: this.calculateUrgencyLevel(alert),
    };
  }

  mapToQuickInfo(alert: InventoryAlert): QuickAlertInfo {
    return {
      id: alert.id,
      partName: alert.part?.name || 'Неизвестная запчасть',
      type: alert.type,
      priority: alert.priority,
      shortage: this.calculateShortage(alert),
      createdAt: alert.createdAt,
    };
  }

  mapStatsToResponse(stats: AlertStats): any {
    return {
      period: { from: stats.period.from, to: stats.period.to },
      overview: {
        total: stats.totalAlerts,
        active: stats.activeAlerts,
        dismissed: stats.dismissedAlerts,
        averageResponseTime: Math.round(stats.averageResponseTime * 100) / 100,
      },
      byType: Object.entries(stats.byType).map(([type, data]) => ({
        type,
        typeDisplay: this.getTypeDisplayName(type as AlertType),
        count: (data as any).count,
        percentage: (data as any).percentage,
      })),
      byPriority: Object.entries(stats.byPriority).map(([priority, data]) => ({
        priority,
        priorityDisplay: this.getPriorityDisplayName(priority as AlertPriority),
        count: (data as any).count,
        percentage: (data as any).percentage,
      })),
      trends: stats.trends,
      topPartsWithAlerts: stats.topPartsWithAlerts.map((part) => ({
        ...part,
        shortageLevel: this.calculateShortageLevel(part.currentQuantity, part.minQuantity),
      })),
      insights: this.generateInsights(stats),
    };
  }

  private getTypeDisplayName(type: AlertType): string {
    const typeNames: Record<AlertType, string> = {
      low_stock: 'Низкий остаток',
      out_of_stock: 'Товар закончился',
      overstock: 'Избыток товара',
      expired_reservation: 'Истекло резервирование',
    };
    return typeNames[type] || type;
  }

  private getPriorityDisplayName(priority: AlertPriority): string {
    const priorityNames: Record<AlertPriority, string> = {
      low: 'Низкий',
      medium: 'Средний',
      high: 'Высокий',
      critical: 'Критический',
    };
    return priorityNames[priority] || priority;
  }

  private calculateUrgencyLevel(alert: InventoryAlert): 'low' | 'medium' | 'high' | 'critical' {
    if (alert.priority === 'critical') return 'critical';
    if (alert.priority === 'high') return 'high';
    if (alert.priority === 'medium') return 'medium';
    return 'low';
  }

  private calculateCanDismiss(alert: InventoryAlert): boolean {
    return alert.isActive && !alert.isDismissed;
  }

  private calculateAgeInHours(createdAt: Date): number {
    const now = new Date();
    const diffMs = now.getTime() - createdAt.getTime();
    return Math.round(diffMs / (1000 * 60 * 60));
  }

  private calculateAutoExpiresInHours(createdAt: Date): number | undefined {
    const ageHours = this.calculateAgeInHours(createdAt);
    const autoExpireHours = 72;
    const remaining = autoExpireHours - ageHours;
    return remaining > 0 ? remaining : undefined;
  }

  private calculateShortage(alert: InventoryAlert): number | undefined {
    if (alert.currentQuantity == null || alert.thresholdQuantity == null) return undefined;
    const shortage = alert.thresholdQuantity - alert.currentQuantity;
    return shortage > 0 ? shortage : undefined;
  }

  private calculateShortageValue(alert: InventoryAlert): number | undefined {
    const shortage = this.calculateShortage(alert);
    if (!shortage || !alert.part) return undefined;
    // По требованиям безопасности не тянем реальные цены через алерты; оцениваем по нулю (не показывать), реальная стоимость скрыта
    return undefined;
  }

  private generateRecommendedActions(alert: InventoryAlert): string[] {
    const actions: string[] = [];
    switch (alert.type) {
      case 'out_of_stock':
        actions.push('Срочно заказать у поставщика', 'Проверить альтернативные запчасти', 'Уведомить клиентов о задержке');
        break;
      case 'low_stock':
        actions.push('Запланировать пополнение', 'Связаться с поставщиком', 'Проверить прогноз продаж');
        break;
      case 'overstock':
        actions.push('Проанализировать спрос', 'Рассмотреть распродажу', 'Пересмотреть минимальные остатки');
        break;
      case 'expired_reservation':
        actions.push('Вернуть товар в общий пул', 'Связаться с клиентом');
        break;
    }
    return actions;
  }

  private mapMetadataToDto(metadata: any): any {
    if (!metadata) return undefined;
    return {
      shortage: metadata.shortage,
      estimatedRunOutDays: metadata.estimatedRunOutDays,
      excessQuantity: metadata.excessQuantity,
      lastMovementDate: metadata.lastMovementDate,
      automaticallyCreated: metadata.automaticallyCreated,
      relatedMovementId: metadata.relatedMovementId,
    };
  }

  private calculatePageSummary(alerts: InventoryAlert[], _options: MapOptions = {}): any {
    let active = 0;
    let dismissed = 0;
    let critical = 0;
    let high = 0;
    let medium = 0;
    let low = 0;
    let estimatedTotalShortageValue = 0;

    alerts.forEach((alert) => {
      if (alert.isActive) active++;
      if (alert.isDismissed) dismissed++;
      switch (alert.priority) {
        case 'critical':
          critical++;
          break;
        case 'high':
          high++;
          break;
        case 'medium':
          medium++;
          break;
        case 'low':
          low++;
          break;
      }
      // Финансовые derived-метрики скрыты
    });

    return {
      active,
      dismissed,
      critical,
      high,
      medium,
      low,
      estimatedTotalShortageValue,
    };
  }

  private calculateTypeStats(alerts: InventoryAlert[], total: number): any[] {
    const typeCounts: Record<string, number> = {};
    alerts.forEach((alert) => {
      const displayName = this.getTypeDisplayName(alert.type);
      typeCounts[displayName] = (typeCounts[displayName] || 0) + 1;
    });

    return Object.entries(typeCounts).map(([type, count]) => ({
      type,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }));
  }

  private hasActiveFilters(filters: any): boolean {
    if (!filters) return false;
    return !!(
      filters.type ||
      filters.priority ||
      typeof filters.isActive === 'boolean' ||
      filters.dateFrom ||
      filters.dateTo ||
      filters.search ||
      filters.categoryId
    );
  }

  private calculateShortageLevel(current: number, min: number): 'none' | 'low' | 'medium' | 'high' | 'critical' {
    if (current >= min) return 'none';
    const ratio = current / min;
    if (ratio <= 0) return 'critical';
    if (ratio <= 0.25) return 'high';
    if (ratio <= 0.5) return 'medium';
    return 'low';
  }

  private calculateAverageUrgency(urgencyLevels: string[]): string {
    if (urgencyLevels.length === 0) return 'low';
    const weights = { low: 1, medium: 2, high: 3, critical: 4 };
    const totalWeight = urgencyLevels.reduce((sum, level) => sum + (weights as any)[level] || 1, 0);
    const averageWeight = totalWeight / urgencyLevels.length;
    if (averageWeight >= 3.5) return 'critical';
    if (averageWeight >= 2.5) return 'high';
    if (averageWeight >= 1.5) return 'medium';
    return 'low';
  }

  private generateInsights(stats: AlertStats): string[] {
    const insights: string[] = [];
    if (stats.trends.daily.length > 1) {
      const recent = stats.trends.daily.slice(-7);
      const increasingTrend = recent.every((day, i) => (i === 0 ? true : day.created >= recent[i - 1].created));
      if (increasingTrend) {
        insights.push('Количество алертов растет — рекомендуется анализ причин');
      }
    }
    if (stats.averageResponseTime > 24) {
      insights.push('Среднее время реакции превышает 24 часа — ускорьте процессы обработки');
    }
    if (stats.topPartsWithAlerts.length > 0) {
      const topPart = stats.topPartsWithAlerts[0];
      if (topPart.alertCount > 5) {
        insights.push(`Запчасть "${topPart.partName}" генерирует много алертов — проверьте минимальные остатки`);
      }
    }
    return insights;
  }
}
