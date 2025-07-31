// src/modules/inventory/inventory-alerts/services/alerts-mapper.service.ts
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
  AlertMetadata
} from '../types/alerts.types';
import { AlertType, AlertPriority } from '../../constants/inventory.constants';

@Injectable()
export class AlertsMapperService {
  
  /**
   * 🎯 Основной маппинг InventoryAlert Entity → ResponseDto
   */
  mapToResponseDto(alert: InventoryAlert): AlertResponseDto {
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
      
      // 🔗 Связанная информация
      part: alert.part ? {
        id: alert.part.id,
        name: alert.part.name,
        partNumber: alert.part.partNumber,
        brand: alert.part.brand,
        category: alert.part.category ? {
          id: alert.part.category.id,
          name: alert.part.category.name,
        } : {
          id: alert.part.categoryId,
          name: 'Неизвестная категория',
        },
        currentStock: alert.currentQuantity || 0,
        minStock: alert.thresholdQuantity || 0,
      } : {
        id: alert.partId,
        name: 'Неизвестная запчасть',
        partNumber: undefined,
        brand: undefined,
        category: {
          id: '',
          name: 'Неизвестная категория',
        },
        currentStock: alert.currentQuantity || 0,
        minStock: alert.thresholdQuantity || 0,
      },

      metadata: this.mapMetadataToDto(alert.metadata),

      // 📊 Вычисляемые поля
      urgencyLevel,
      canDismiss,
      ageInHours,
      autoExpiresInHours,
      estimatedShortageValue: this.calculateShortageValue(alert),
      recommendedActions: this.generateRecommendedActions(alert),
    };
  }

  /**
   * 🎯 Массовый маппинг
   */
  mapArrayToResponseDto(alerts: InventoryAlert[]): AlertResponseDto[] {
    return alerts.map(alert => this.mapToResponseDto(alert));
  }

  /**
   * 🎯 Маппинг в пагинированный ответ
   */
  mapToPaginatedResponse(
    alerts: InventoryAlert[],
    total: number,
    page: number,
    limit: number,
    filters?: any
  ): PaginatedAlertsResponseDto {
    const items = this.mapArrayToResponseDto(alerts);
    const totalPages = Math.ceil(total / limit);

    // 📊 Расчет сводки по текущей странице
    const summary = this.calculatePageSummary(alerts);
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
        dateRange: filters?.dateFrom && filters?.dateTo ? {
          from: filters.dateFrom,
          to: filters.dateTo
        } : undefined,
        hasActiveFilters: this.hasActiveFilters(filters),
      },
      typeStats,
      lastUpdated: new Date(),
    };
  }

  /**
   * 🎯 Маппинг настроек алертов
   */
  mapSettingsToResponseDto(
    settings: AlertSettings,
    currentActiveAlerts: number = 0,
    todayAlertsCount: number = 0,
    lastNotificationSent?: Date
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
      createdAt: new Date(), // TODO: получать из БД
      updatedAt: new Date(), // TODO: получать из БД
      currentActiveAlerts,
      todayAlertsCount,
      lastNotificationSent,
    };
  }

  /**
   * 🎯 Маппинг результата тестового уведомления
   */
  mapTestNotificationResult(
    result: NotificationResult,
    testType: AlertType,
    priority: AlertPriority,
    message: string
  ): TestNotificationResponseDto {
    return {
      success: result.success,
      sentCount: result.sentCount,
      failedCount: result.failedCount,
      recipients: [], // TODO: добавить список получателей
      errors: result.errors,
      sentAt: result.sentAt,
      testType: this.getTypeDisplayName(testType),
      priority: this.getPriorityDisplayName(priority),
      message,
    };
  }

  /**
   * 🎯 Маппинг для отображения в списке
   */
  mapToDisplayItem(alert: InventoryAlert): AlertDisplayItem {
    return {
      id: alert.id,
      type: alert.type,
      typeDisplay: this.getTypeDisplayName(alert.type),
      priority: alert.priority,
      priorityDisplay: this.getPriorityDisplayName(alert.priority),
      title: alert.title,
      message: alert.message,
      partName: alert.part?.name || 'Неизвестная запчасть',
      partNumber: alert.part?.partNumber,
      categoryName: alert.part?.category?.name || 'Неизвестная категория',
      currentQuantity: alert.currentQuantity,
      thresholdQuantity: alert.thresholdQuantity,
      shortage: this.calculateShortage(alert),
      createdAt: alert.createdAt,
      isActive: alert.isActive,
      isDismissed: alert.isDismissed,
      canDismiss: this.calculateCanDismiss(alert),
      urgencyLevel: this.calculateUrgencyLevel(alert),
    };
  }

  /**
   * 🎯 Маппинг для мобильного приложения (упрощенный)
   */
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

  /**
   * 🎯 Маппинг статистики
   */
  mapStatsToResponse(stats: AlertStats): any {
    return {
      period: {
        from: stats.period.from,
        to: stats.period.to,
      },
      overview: {
        total: stats.totalAlerts,
        active: stats.activeAlerts,
        dismissed: stats.dismissedAlerts,
        averageResponseTime: Math.round(stats.averageResponseTime * 100) / 100,
      },
      byType: Object.entries(stats.byType).map(([type, data]) => ({
        type,
        typeDisplay: this.getTypeDisplayName(type as AlertType),
        count: data.count,
        percentage: data.percentage,
      })),
      byPriority: Object.entries(stats.byPriority).map(([priority, data]) => ({
        priority,
        priorityDisplay: this.getPriorityDisplayName(priority as AlertPriority),
        count: data.count,
        percentage: data.percentage,
      })),
      trends: stats.trends,
      topPartsWithAlerts: stats.topPartsWithAlerts.map(part => ({
        ...part,
        shortageLevel: this.calculateShortageLevel(part.currentQuantity, part.minQuantity),
      })),
      insights: this.generateInsights(stats),
    };
  }

  /**
   * 🎯 Группировка по категориям
   */
  mapToCategoryGroups(alerts: InventoryAlert[]): Record<string, {
    categoryName: string;
    categoryId: string;
    alerts: AlertDisplayItem[];
    totalAlerts: number;
    criticalAlerts: number;
    averageUrgency: string;
  }> {
    const groups: Record<string, any> = {};
    
    alerts.forEach(alert => {
      const categoryName = alert.part?.category?.name || 'Без категории';
      const categoryId = alert.part?.categoryId || 'unknown';
      
      if (!groups[categoryName]) {
        groups[categoryName] = {
          categoryName,
          categoryId,
          alerts: [],
          totalAlerts: 0,
          criticalAlerts: 0,
          averageUrgency: 'low',
        };
      }
      
      const displayItem = this.mapToDisplayItem(alert);
      groups[categoryName].alerts.push(displayItem);
      groups[categoryName].totalAlerts++;
      
      if (alert.priority === 'critical') {
        groups[categoryName].criticalAlerts++;
      }
    });
    
    // Вычисляем средний уровень срочности для каждой категории
    Object.values(groups).forEach((group: any) => {
      const urgencyLevels = group.alerts.map(a => a.urgencyLevel);
      group.averageUrgency = this.calculateAverageUrgency(urgencyLevels);
    });
    
    return groups;
  }

  /**
   * 📊 Получение отображаемого названия типа
   */
  private getTypeDisplayName(type: AlertType): string {
    const typeNames: Record<AlertType, string> = {
      low_stock: 'Низкий остаток',
      out_of_stock: 'Товар закончился',
      overstock: 'Избыток товара',
      expired_reservation: 'Истекло резервирование',
    };
    
    return typeNames[type] || type;
  }

  /**
   * 📊 Получение отображаемого названия приоритета
   */
  private getPriorityDisplayName(priority: AlertPriority): string {
    const priorityNames: Record<AlertPriority, string> = {
      low: 'Низкий',
      medium: 'Средний',
      high: 'Высокий',
      critical: 'Критический',
    };
    
    return priorityNames[priority] || priority;
  }

  /**
   * 📊 Расчет уровня срочности
   */
  private calculateUrgencyLevel(alert: InventoryAlert): 'low' | 'medium' | 'high' | 'critical' {
    if (alert.priority === 'critical') return 'critical';
    if (alert.priority === 'high') return 'high';
    if (alert.priority === 'medium') return 'medium';
    return 'low';
  }

  /**
   * 📊 Проверка возможности отклонения
   */
  private calculateCanDismiss(alert: InventoryAlert): boolean {
    return alert.isActive && !alert.isDismissed;
  }

  /**
   * 📊 Расчет возраста алерта в часах
   */
  private calculateAgeInHours(createdAt: Date): number {
    const now = new Date();
    const diffMs = now.getTime() - createdAt.getTime();
    return Math.round(diffMs / (1000 * 60 * 60));
  }

  /**
   * 📊 Расчет времени до автоотклонения
   */
  private calculateAutoExpiresInHours(createdAt: Date): number | undefined {
    const ageHours = this.calculateAgeInHours(createdAt);
    const autoExpireHours = 72; // TODO: получать из настроек
    const remaining = autoExpireHours - ageHours;
    
    return remaining > 0 ? remaining : undefined;
  }

  /**
   * 📊 Расчет нехватки
   */
  private calculateShortage(alert: InventoryAlert): number | undefined {
    if (!alert.currentQuantity || !alert.thresholdQuantity) return undefined;
    
    const shortage = alert.thresholdQuantity - alert.currentQuantity;
    return shortage > 0 ? shortage : undefined;
  }

  /**
   * 💰 Расчет стоимости нехватки
   */
  private calculateShortageValue(alert: InventoryAlert): number | undefined {
    const shortage = this.calculateShortage(alert);
    if (!shortage || !alert.part) return undefined;
    
    // TODO: Получить цену запчасти и рассчитать стоимость
    const estimatedPrice = 1000; // Заглушка
    return shortage * estimatedPrice;
  }

  /**
   * 🎯 Генерация рекомендованных действий
   */
  private generateRecommendedActions(alert: InventoryAlert): string[] {
    const actions: string[] = [];
    
    switch (alert.type) {
      case 'out_of_stock':
        actions.push('Срочно заказать у поставщика');
        actions.push('Проверить альтернативные запчасти');
        actions.push('Уведомить клиентов о задержке');
        break;
      
      case 'low_stock':
        actions.push('Запланировать пополнение');
        actions.push('Связаться с поставщиком');
        actions.push('Проверить прогноз продаж');
        break;
      
      case 'overstock':
        actions.push('Проанализировать спрос');
        actions.push('Рассмотреть распродажу');
        actions.push('Пересмотреть минимальные остатки');
        break;
      
      case 'expired_reservation':
        actions.push('Вернуть товар в общий пул');
        actions.push('Связаться с клиентом');
        break;
    }
    
    return actions;
  }

  /**
   * 📊 Маппинг метаданных
   */
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

  /**
   * 📊 Расчет сводки по странице
   */
  private calculatePageSummary(alerts: InventoryAlert[]): any {
    let active = 0;
    let dismissed = 0;
    let critical = 0;
    let high = 0;
    let medium = 0;
    let low = 0;
    let estimatedTotalShortageValue = 0;

    alerts.forEach(alert => {
      if (alert.isActive) active++;
      if (alert.isDismissed) dismissed++;
      
      switch (alert.priority) {
        case 'critical': critical++; break;
        case 'high': high++; break;
        case 'medium': medium++; break;
        case 'low': low++; break;
      }
      
      const shortageValue = this.calculateShortageValue(alert);
      if (shortageValue) {
        estimatedTotalShortageValue += shortageValue;
      }
    });

    return {
      active,
      dismissed,
      critical,
      high,
      medium,
      low,
      estimatedTotalShortageValue: Math.round(estimatedTotalShortageValue),
    };
  }

  /**
   * 📊 Расчет статистики по типам
   */
  private calculateTypeStats(alerts: InventoryAlert[], total: number): any[] {
    const typeCounts: Record<string, number> = {};
    
    alerts.forEach(alert => {
      const displayName = this.getTypeDisplayName(alert.type);
      typeCounts[displayName] = (typeCounts[displayName] || 0) + 1;
    });
    
    return Object.entries(typeCounts).map(([type, count]) => ({
      type,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }));
  }

  /**
   * 📊 Проверка активных фильтров
   */
  private hasActiveFilters(filters: any): boolean {
    if (!filters) return false;
    
    return !!(
      filters.type ||
      filters.priority ||
      filters.isActive !== undefined ||
      filters.dateFrom ||
      filters.dateTo ||
      filters.search ||
      filters.categoryId
    );
  }

  /**
   * 📊 Расчет уровня нехватки
   */
  private calculateShortageLevel(current: number, min: number): 'none' | 'low' | 'medium' | 'high' | 'critical' {
    if (current >= min) return 'none';
    
    const ratio = current / min;
    if (ratio <= 0) return 'critical';
    if (ratio <= 0.25) return 'high';
    if (ratio <= 0.5) return 'medium';
    return 'low';
  }

  /**
   * 📊 Расчет среднего уровня срочности
   */
  private calculateAverageUrgency(urgencyLevels: string[]): string {
    if (urgencyLevels.length === 0) return 'low';
    
    const weights = { low: 1, medium: 2, high: 3, critical: 4 };
    const totalWeight = urgencyLevels.reduce((sum, level) => sum + (weights[level] || 1), 0);
    const averageWeight = totalWeight / urgencyLevels.length;
    
    if (averageWeight >= 3.5) return 'critical';
    if (averageWeight >= 2.5) return 'high';
    if (averageWeight >= 1.5) return 'medium';
    return 'low';
  }

  /**
   * 💡 Генерация инсайтов по статистике
   */
  private generateInsights(stats: AlertStats): string[] {
    const insights: string[] = [];
    
    // Анализ трендов
    if (stats.trends.daily.length > 1) {
      const recent = stats.trends.daily.slice(-7); // Последние 7 дней
      const increasingTrend = recent.every((day, i) => 
        i === 0 || day.created >= recent[i - 1].created
      );
      
      if (increasingTrend) {
        insights.push('Количество алертов растет - стоит проанализировать причины');
      }
    }
    
    // Анализ времени реакции
    if (stats.averageResponseTime > 24) {
      insights.push('Среднее время реакции превышает 24 часа - рекомендуется ускорить процессы');
    }
    
    // Анализ топ запчастей
    if (stats.topPartsWithAlerts.length > 0) {
      const topPart = stats.topPartsWithAlerts[0];
      if (topPart.alertCount > 5) {
        insights.push(`Запчасть "${topPart.partName}" генерирует много алертов - проверьте настройки минимальных остатков`);
      }
    }
    
    return insights;
  }
}
