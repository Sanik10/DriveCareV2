// src/modules/inventory/services/inventory-business.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InventoryDataService } from './inventory-data.service';
import { Inventory } from '../../../database/entities';
import { UpdateInventoryData, StockSummary, LowStockAlert, AlertPriority } from '../types/inventory.types';
import { RequestWithUser } from '../../auth/interfaces/request-with-user.interface';
import { AuditService, AuditAction } from '../../../common/audit/audit.service';
import { 
  ValidationDataException,
  InventoryNotFoundException
} from '../../../common/exceptions/domain.exceptions';
import { INVENTORY_CONSTANTS } from '../constants/inventory.constants';

@Injectable()
export class InventoryBusinessService {
  private readonly logger = new Logger(InventoryBusinessService.name);

  constructor(
    private readonly inventoryDataService: InventoryDataService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * 📝 Обновление позиции склада с бизнес-логикой
   */
  async updateInventoryItem(id: string, data: UpdateInventoryData): Promise<Inventory> {
    this.logger.log(`Updating inventory item: ${id}`);

    const inventoryItem = await this.inventoryDataService.findById(id);
    if (!inventoryItem) {
      throw new InventoryNotFoundException(id);
    }

    // Конвертируем строковую дату в Date объект
    const updateData = {
      ...data,
      lastRestockDate: data.lastRestockDate ? new Date(data.lastRestockDate) : undefined,
    };

    const updatedInventory = await this.inventoryDataService.update(id, updateData);

    // 🔥 Audit логирование
    await this.auditService.log(AuditAction.INVENTORY_UPDATED, {
      entityType: 'Inventory',
      entityId: id,
      companyId: inventoryItem.companyId,
      metadata: {
        partId: inventoryItem.partId,
        partName: inventoryItem.part?.name,
        changes: this.detectChanges(inventoryItem, updateData),
        oldMinQuantity: inventoryItem.minQuantity,
        newMinQuantity: updateData.minQuantity,
      },
    });

    // 🚨 Проверяем нужно ли создать/обновить алерты
    await this.checkAndCreateLowStockAlert(updatedInventory);

    this.logger.log(`Inventory item updated: ${id}`);
    return updatedInventory;
  }

  /**
   * 📊 Расчет сводки по складу
   */
  async calculateStockSummary(companyId: string): Promise<any> {
    this.logger.log(`Calculating stock summary for company: ${companyId}`);

    const [stats, topCategories, recentMovements] = await Promise.all([
      this.inventoryDataService.getCompanyStockStats(companyId),
      this.inventoryDataService.getTopCategories(companyId, 5),
      this.inventoryDataService.getRecentMovementsCount(companyId, 7),
    ]);

    const averagePartValue = stats.totalParts > 0 ? stats.totalValue / stats.totalParts : 0;

    return {
      totalParts: stats.totalParts,
      totalValue: stats.totalValue,
      lowStockCount: stats.lowStockCount,
      outOfStockCount: stats.outOfStockCount,
      averagePartValue: Math.round(averagePartValue * 100) / 100,
      topCategories,
      recentMovements,
      statusBreakdown: {
        inStock: stats.totalParts - stats.lowStockCount - stats.outOfStockCount,
        lowStock: stats.lowStockCount,
        outOfStock: stats.outOfStockCount,
        overstock: stats.overstockCount,
      },
    };
  }

  /**
   * 🚨 Получение уведомлений о низких остатках
   */
  async getLowStockAlerts(companyId: string): Promise<any> {
    this.logger.log(`Getting low stock alerts for company: ${companyId}`);

    const lowStockItems = await this.inventoryDataService.findLowStockItems(companyId);

    const alerts: LowStockAlert[] = lowStockItems.map(item => {
      const shortage = Math.max(0, item.minQuantity - item.quantity);
      const priority = this.calculateAlertPriority(item.quantity, item.minQuantity);
      
      return {
        partId: item.partId,
        partName: item.part?.name || 'Неизвестная запчасть',
        partNumber: item.part?.partNumber,
        currentQuantity: item.quantity,
        minQuantity: item.minQuantity,
        shortage,
        categoryName: item.part?.category?.name || 'Без категории',
        location: item.location,
        lastMovementDate: item.lastRestockDate,
        priority,
        estimatedRunOutDays: this.calculateRunOutDays(item),
      };
    });

    // Сортируем по приоритету
    alerts.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    const criticalAlerts = alerts.filter(a => a.priority === 'critical').length;
    const highPriorityAlerts = alerts.filter(a => a.priority === 'high').length;

    const totalShortageValue = alerts.reduce((sum, alert) => {
      const partPrice = lowStockItems.find(item => item.partId === alert.partId)?.part?.costPrice || 0;
      return sum + (alert.shortage * parseFloat(partPrice.toString()));
    }, 0);

    return {
      alerts,
      totalAlerts: alerts.length,
      criticalAlerts,
      highPriorityAlerts,
      totalShortageValue: Math.round(totalShortageValue * 100) / 100,
      lastUpdated: new Date(),
    };
  }

  /**
   * 🔄 Проверка доступности запчасти
   */
  async checkPartAvailability(
    partId: string, 
    quantity: number, 
    companyId: string
  ): Promise<{
    partId: string;
    available: number;
    canReserve: boolean;
    maxReservable: number;
    location: string;
  }> {
    const inventory = await this.inventoryDataService.findByPartAndCompany(partId, companyId);
    
    if (!inventory) {
      return {
        partId,
        available: 0,
        canReserve: false,
        maxReservable: 0,
        location: 'Не найдено',
      };
    }

    const reservationCheck = await this.inventoryDataService.checkReservationAvailability(
      partId, 
      quantity, 
      companyId
    );

    return {
      partId,
      available: reservationCheck.available,
      canReserve: reservationCheck.canReserve,
      maxReservable: reservationCheck.available,
      location: inventory.location || 'Не указано',
    };
  }

  /**
   * 🔒 Резервирование запчастей
   */
  async reserveParts(
    reservationData: {
      partId: string;
      quantity: number;
      orderId?: string;
      expiresAt?: Date;
    },
    user: RequestWithUser['user']
  ): Promise<{ success: boolean; message: string; reservationId?: string }> {
    this.logger.log(`Reserving ${reservationData.quantity} units of part ${reservationData.partId}`);

    const availability = await this.checkPartAvailability(
      reservationData.partId,
      reservationData.quantity,
      user.companyId
    );

    if (!availability.canReserve) {
      return {
        success: false,
        message: `Недостаточно запчастей для резервирования. Доступно: ${availability.available}, требуется: ${reservationData.quantity}`,
      };
    }

    // TODO: Создать запись резервирования в отдельной таблице
    const reservationId = `RES-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // 🔥 Audit логирование
    await this.auditService.log(AuditAction.RESERVATION_CREATED, {
      entityType: 'PartReservation',
      entityId: reservationId,
      companyId: user.companyId,
      userId: user.id,
      metadata: {
        partId: reservationData.partId,
        quantity: reservationData.quantity,
        orderId: reservationData.orderId,
        expiresAt: reservationData.expiresAt,
      },
    });

    return {
      success: true,
      message: 'Запчасти успешно зарезервированы',
      reservationId,
    };
  }

  /**
   * 🔓 Освобождение резерва
   */
  async releaseReservation(reservationId: string): Promise<void> {
    this.logger.log(`Releasing reservation: ${reservationId}`);

    // TODO: Реализовать освобождение резерва из таблицы резервирований
    
    // 🔥 Audit логирование
    await this.auditService.log(AuditAction.RESERVATION_RELEASED, {
      entityType: 'PartReservation',
      entityId: reservationId,
      metadata: {
        reservationId,
        releasedAt: new Date(),
      },
    });
  }

  /**
   * 📊 Расчет отчета по оборачиваемости
   */
  async calculateTurnoverReport(params: {
    companyId: string;
    dateFrom?: Date;
    dateTo?: Date;
    categoryId?: string;
  }): Promise<any> {
    this.logger.log(`Calculating turnover report for company: ${params.companyId}`);

    // TODO: Реализовать сложную аналитику оборачиваемости
    // Пока возвращаем заглушку
    return {
      period: {
        from: params.dateFrom || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        to: params.dateTo || new Date(),
      },
      summary: {
        totalParts: 0,
        averageTurnoverRatio: 0,
        fastMovingParts: 0,
        slowMovingParts: 0,
        deadStock: 0,
      },
      details: [],
    };
  }

  /**
   * 🔄 Резервирование для заказа (интеграция с Orders)
   */
  async reserveForOrder(
    partId: string, 
    quantity: number, 
    orderId: string, 
    companyId: string
  ): Promise<boolean> {
    this.logger.log(`Reserving ${quantity} units of part ${partId} for order ${orderId}`);

    const inventory = await this.inventoryDataService.findByPartAndCompany(partId, companyId);
    
    if (!inventory || inventory.quantity < quantity) {
      return false;
    }

    // Уменьшаем количество в инвентаре
    const newQuantity = inventory.quantity - quantity;
    await this.inventoryDataService.updateQuantity(inventory.id, newQuantity);

    // 🔥 Audit логирование
    await this.auditService.log(AuditAction.STOCK_RESERVED_FOR_ORDER, {
      entityType: 'Inventory',
      entityId: inventory.id,
      companyId,
      metadata: {
        partId,
        orderId,
        quantityReserved: quantity,
        previousQuantity: inventory.quantity,
        newQuantity,
      },
    });

    return true;
  }

  /**
   * 🔄 Освобождение резерва заказа
   */
  async releaseOrderReservation(
    partId: string, 
    quantity: number, 
    orderId: string, 
    companyId: string
  ): Promise<void> {
    this.logger.log(`Releasing ${quantity} units of part ${partId} from order ${orderId}`);

    const inventory = await this.inventoryDataService.findByPartAndCompany(partId, companyId);
    
    if (!inventory) {
      throw new ValidationDataException(
        'partId',
        `Позиция склада для запчасти ${partId} не найдена`
      );
    }

    // Увеличиваем количество в инвентаре
    const newQuantity = inventory.quantity + quantity;
    await this.inventoryDataService.updateQuantity(inventory.id, newQuantity);

    // 🔥 Audit логирование
    await this.auditService.log(AuditAction.STOCK_RELEASED_FROM_ORDER, {
      entityType: 'Inventory',
      entityId: inventory.id,
      companyId,
      metadata: {
        partId,
        orderId,
        quantityReleased: quantity,
        previousQuantity: inventory.quantity,
        newQuantity,
      },
    });
  }

  /**
   * 🚨 Проверка и создание алерта о низком остатке
   */
  private async checkAndCreateLowStockAlert(inventory: Inventory): Promise<void> {
    if (inventory.quantity <= inventory.minQuantity) {
      // TODO: Создать алерт в таблице inventory_alerts
      this.logger.warn(
        `Low stock alert for part ${inventory.partId}: ${inventory.quantity} <= ${inventory.minQuantity}`
      );
    }
  }

  /**
   * 📊 Расчет приоритета алерта
   */
  private calculateAlertPriority(currentQuantity: number, minQuantity: number): AlertPriority {
    if (currentQuantity === 0) return 'critical';
    
    const ratio = currentQuantity / minQuantity;
    if (ratio <= 0.25) return 'critical';
    if (ratio <= 0.5) return 'high';
    if (ratio <= 0.75) return 'medium';
    return 'low';
  }

  /**
   * ⏱️ Расчет прогноза исчерпания запаса
   */
  private calculateRunOutDays(inventory: Inventory): number | undefined {
    // TODO: Реализовать на основе исторических данных движений
    // Пока возвращаем простую оценку
    if (inventory.quantity === 0) return 0;
    if (inventory.quantity <= inventory.minQuantity) return 7;
    return undefined;
  }

  /**
   * 📊 Определение изменений для аудита
   */
  private detectChanges(original: Inventory, updates: UpdateInventoryData): Record<string, any> {
    const changes: Record<string, any> = {};
    
    Object.keys(updates).forEach(key => {
      if (updates[key] !== original[key]) {
        changes[key] = {
          from: original[key],
          to: updates[key],
        };
      }
    });

    return changes;
  }
}
