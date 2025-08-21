// path: apps/backend/src/modules/inventory/services/inventory-business.service.ts
import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import type { Redis } from 'ioredis';

import { InventoryDataService } from './inventory-data.service';
import { Inventory } from '../../../database/entities';
import { UpdateInventoryData } from '../types/inventory.types';
import { RequestWithUser } from '../../auth/interfaces/request-with-user.interface';
import { AuditService, AuditAction } from '../../../common/audit/audit.service';
import { ValidationDataException } from '../../../common/exceptions/domain.exceptions';
import { AlertsBusinessService } from '../inventory-alerts/services/alerts-business.service';
import { REDIS_CLIENT } from '../../../common/redis/redis.constants';
import { ReservationStatus } from '../../../database/entities/part-reservation.entity';

@Injectable()
export class InventoryBusinessService {
  private readonly logger = new Logger(InventoryBusinessService.name);
  private readonly idemTtlMs: number;

  constructor(
    private readonly inventoryDataService: InventoryDataService,
    private readonly auditService: AuditService,
    private readonly alertsBusinessService: AlertsBusinessService,
    private readonly dataSource: DataSource,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly configService: ConfigService,
  ) {
    const cfg = this.configService.get<number>('inventory.idempotencyTtlMs');
    const fromEnv = parseInt(process.env.INVENTORY_IDEMPOTENCY_TTL_MS || '900000', 10);
    this.idemTtlMs = Number.isFinite(cfg as any) ? (cfg as number) : (Number.isFinite(fromEnv) ? fromEnv : 900000);
  }

  async updateInventoryItem(id: string, data: UpdateInventoryData): Promise<Inventory> {
    const inventoryItem = await this.inventoryDataService.findById(id);
    if (!inventoryItem) throw new ValidationDataException('inventory', `Inventory ${id} not found`);

    const updateData = { ...data, lastRestockDate: data.lastRestockDate ? new Date(data.lastRestockDate) : undefined };
    const updatedInventory = await this.inventoryDataService.update(id, updateData);

    await this.auditService.log(AuditAction.INVENTORY_UPDATED, {
      entityType: 'Inventory',
      entityId: id,
      companyId: inventoryItem.companyId,
      metadata: {
        partId: inventoryItem.partId,
        changes: this.detectChanges(inventoryItem, updateData),
      },
    });

    await this.checkAndCreateLowStockAlert(updatedInventory);
    return updatedInventory;
  }

  async reserveParts(
    reservationData: { partId: string; quantity: number; orderId?: string; expiresAt?: Date; idempotencyKey?: string },
    user: RequestWithUser['user'],
  ): Promise<{ success: boolean; message: string; reservationId?: string }> {
    const companyId = user.companyId;
    if (!companyId) throw new ValidationDataException('companyId', 'Компания не определена для пользователя');

    const idemKey = reservationData.idempotencyKey?.trim();
    const redisKey = idemKey ? `idem:inv:reserve:${companyId}:${idemKey}` : null;

    if (redisKey) {
      const nx = await this.redis.set(redisKey, '1', 'PX', this.idemTtlMs, 'NX');
      if (!nx) {
        const existing = await this.inventoryDataService.findReservationByIdempotency(companyId, idemKey!);
        if (existing) {
          return { success: true, message: 'Повторный запрос (идемпотентность)', reservationId: existing.id };
        }
        return { success: false, message: 'Дубликат запроса (идемпотентность)' };
      }
    }

    const effectiveExpiresAt = reservationData.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000);

    const reservation = await this.dataSource.transaction(async (manager) => {
      await this.inventoryDataService.expireReservations(companyId, manager);

      const availability = await this.inventoryDataService.checkReservationAvailability(
        reservationData.partId,
        reservationData.quantity,
        companyId,
      );
      if (!availability.canReserve) {
        throw new ValidationDataException(
          'quantity',
          `Недостаточно запчастей для резервирования. Доступно: ${availability.available}, требуется: ${reservationData.quantity}`,
        );
      }

      const res = await this.inventoryDataService.createReservation(
        {
          companyId,
          partId: reservationData.partId,
          orderId: reservationData.orderId,
          quantity: reservationData.quantity,
          reservedBy: user.id,
          expiresAt: effectiveExpiresAt,
          idempotencyKey: idemKey || null,
        },
        manager,
      );

      return res;
    });

    await this.auditService.log(AuditAction.RESERVATION_CREATED, {
      entityType: 'PartReservation',
      entityId: reservation.id,
      companyId,
      userId: user.id,
      metadata: {
        partId: reservationData.partId,
        quantity: reservationData.quantity,
        orderId: reservationData.orderId,
        expiresAt: effectiveExpiresAt,
        idempotency: !!idemKey,
      },
    });

    return { success: true, message: 'Запчасти успешно зарезервированы', reservationId: reservation.id };
  }

  async releaseReservation(reservationId: string): Promise<void> {
    const existing = await this.inventoryDataService.findReservationById(reservationId);
    if (!existing) throw new ValidationDataException('reservationId', 'Резервирование не найдено');
    if (existing.status !== ReservationStatus.ACTIVE) return;

    await this.dataSource.transaction(async (manager) => {
      await this.inventoryDataService.markReservationReleased(reservationId, existing.reservedBy, manager);
    });

    await this.auditService.log(AuditAction.RESERVATION_RELEASED, {
      entityType: 'PartReservation',
      entityId: reservationId,
      companyId: existing.companyId,
      userId: existing.reservedBy,
      metadata: { partId: existing.partId },
    });
  }

  async checkPartAvailability(
    partId: string,
    quantity: number,
    companyId: string,
  ): Promise<{ partId: string; available: number; canReserve: boolean; maxReservable: number; location: string }> {
    const inventory = await this.inventoryDataService.findByPartAndCompany(partId, companyId);
    if (!inventory) {
      return { partId, available: 0, canReserve: false, maxReservable: 0, location: 'Не найдено' };
    }

    const availability = await this.inventoryDataService.checkReservationAvailability(partId, quantity, companyId);
    return {
      partId,
      available: availability.available,
      canReserve: availability.canReserve,
      maxReservable: availability.available,
      location: inventory.location || 'Не указано',
    };
  }

  async calculateStockSummary(companyId: string): Promise<any> {
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

  async getLowStockAlerts(companyId: string): Promise<any> {
    const lowStockItems = await this.inventoryDataService.findLowStockItems(companyId);
    const alerts = lowStockItems.map((item) => {
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
    alerts.sort((a, b) => {
      const order = { critical: 4, high: 3, medium: 2, low: 1 } as any;
      return order[b.priority] - order[a.priority];
    });

    const criticalAlerts = alerts.filter((a) => a.priority === 'critical').length;
    const highPriorityAlerts = alerts.filter((a) => a.priority === 'high').length;
    const totalShortageValue = alerts.reduce((sum, alert) => {
      const partPrice = lowStockItems.find((i) => i.partId === alert.partId)?.part?.costPrice || 0;
      return sum + alert.shortage * parseFloat(partPrice.toString());
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

  async reserveForOrder(partId: string, quantity: number, orderId: string, companyId: string): Promise<boolean> {
    const inventory = await this.inventoryDataService.findByPartAndCompany(partId, companyId);
    if (!inventory) return false;

    const { available, canReserve } = await this.inventoryDataService.checkReservationAvailability(partId, quantity, companyId);
    if (!canReserve) return false;

    await this.auditService.log(AuditAction.STOCK_RESERVED_FOR_ORDER, {
      entityType: 'Inventory',
      entityId: inventory.id,
      companyId,
      metadata: {
        partId,
        orderId,
        quantityReserved: quantity,
        previousQuantity: inventory.quantity,
        newQuantity: inventory.quantity,
        availableBefore: available,
      },
    });

    return true;
  }

  async releaseOrderReservation(partId: string, quantity: number, orderId: string, companyId: string): Promise<void> {
    const inventory = await this.inventoryDataService.findByPartAndCompany(partId, companyId);
    if (!inventory) throw new ValidationDataException('partId', `Позиция склада для запчасти ${partId} не найдена`);

    await this.auditService.log(AuditAction.STOCK_RELEASED_FROM_ORDER, {
      entityType: 'Inventory',
      entityId: inventory.id,
      companyId,
      metadata: { partId, orderId, quantityReleased: quantity },
    });
  }

  async calculateTurnoverReport(params: { companyId: string; dateFrom?: Date; dateTo?: Date; categoryId?: string }): Promise<any> {
    const now = new Date();
    const from = params.dateFrom || new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const to = params.dateTo || now;
    if (from > to) throw new ValidationDataException('dateRange', 'Дата начала периода больше даты окончания');

    return {
      period: { from, to },
      filters: { categoryId: params.categoryId || null },
      summary: {
        totalParts: 0,
        averageTurnoverRatio: 0,
        fastMovingParts: 0,
        slowMovingParts: 0,
        deadStock: 0,
      },
      details: [],
      generatedAt: new Date(),
    };
  }

  private async checkAndCreateLowStockAlert(inventory: Inventory): Promise<void> {
    try {
      if (inventory.quantity <= inventory.minQuantity) {
        await this.alertsBusinessService.createSmartAlert(
          { partId: inventory.partId, companyId: inventory.companyId, triggeredBy: 'system' },
          { id: 'system', companyId: inventory.companyId } as any,
        );
      }
    } catch (error: any) {
      this.logger.error(`Failed to handle alerts: ${error?.message || error}`);
    }
  }

  private calculateAlertPriority(currentQuantity: number, minQuantity: number): 'critical' | 'high' | 'medium' | 'low' {
    if (currentQuantity === 0) return 'critical';
    const ratio = minQuantity > 0 ? currentQuantity / minQuantity : 1;
    if (ratio <= 0.25) return 'critical';
    if (ratio <= 0.5) return 'high';
    if (ratio <= 0.75) return 'medium';
    return 'low';
  }

  private calculateRunOutDays(inventory: Inventory): number | undefined {
    if (inventory.quantity === 0) return 0;
    if (inventory.quantity <= inventory.minQuantity) return 7;
    return undefined;
  }

  private detectChanges(original: Inventory, updates: UpdateInventoryData): Record<string, any> {
    const changes: Record<string, any> = {};
    Object.keys(updates).forEach((k) => {
      const nk = k as keyof UpdateInventoryData;
      if (updates[nk] !== undefined && (original as any)[nk] !== updates[nk]) {
        changes[nk] = { from: (original as any)[nk], to: updates[nk] };
      }
    });
    return changes;
  }
}
