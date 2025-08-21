// path: apps/backend/src/modules/inventory/stock-movements/services/stock-movements-business.service.ts
import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { StockMovementsDataService } from './stock-movements-data.service';
import { StockMovement } from '../../../../database/entities';
import {
  CreateMovementData,
  UpdateMovementData,
  BulkMovementRequest,
  BulkMovementResponse,
  MovementSummary,
  StockImpactAnalysis,
} from '../types/stock-movements.types';
import { RequestWithUser } from '../../../auth/interfaces/request-with-user.interface';
import { AuditService, AuditAction } from '../../../../common/audit/audit.service';
import {
  ValidationDataException,
  StockMovementNotFoundException,
  InsufficientStockException,
} from '../../../../common/exceptions/domain.exceptions';
import { INVENTORY_CONSTANTS } from '../../constants/inventory.constants';
import { REDIS_CLIENT } from '../../../../common/redis/redis.constants';
import type { Redis } from 'ioredis';

@Injectable()
export class StockMovementsBusinessService {
  private readonly logger = new Logger(StockMovementsBusinessService.name);

  constructor(
    private readonly stockMovementsDataService: StockMovementsDataService,
    private readonly auditService: AuditService,
    @Inject(REDIS_CLIENT) private readonly redisClient?: Redis,
  ) {}

  private async withInventoryLock<T>(companyId: string, partId: string, runner: () => Promise<T>): Promise<T> {
    // Lightweight lock to avoid concurrent stock updates for the same part
    const key = `lock:inventory:stock:update:${companyId}:${partId}`;
    const ttlMs = 5000;
    if (!this.redisClient) {
      return runner();
    }
    // SETNX + PEXPIRE (типобезопасно для вашей версии ioredis)
    const acquired = await this.redisClient.setnx(key, '1');
    if (acquired !== 1) {
      throw new ConflictException('Операция с остатком уже выполняется, попробуйте позже');
    }
    await this.redisClient.pexpire(key, ttlMs);

    try {
      return await runner();
    } finally {
      try {
        await this.redisClient.del(key);
      } catch {
        // ignore
      }
    }
  }

  /**
   * 📝 Создание движения с бизнес-логикой и обновлением инвентаря
   */
  async createMovement(data: CreateMovementData): Promise<StockMovement> {
    this.logger.log(`Creating movement: ${data.type} for part ${data.partId}, quantity: ${data.quantity}`);

    const impactAnalysis = await this.analyzeStockImpact(data.partId, data.quantity, data.companyId);

    if (!INVENTORY_CONSTANTS.BUSINESS_RULES.ALLOW_NEGATIVE_STOCK && impactAnalysis.wouldGoNegative) {
      throw new InsufficientStockException(data.partId, Math.abs(data.quantity), impactAnalysis.currentStock);
    }

    const movement = await this.withInventoryLock(data.companyId, data.partId, async () => {
      const created = await this.stockMovementsDataService.create(data);
      await this.updateInventoryStock(data.partId, data.companyId, data.quantity, created.id);
      return created;
    });

    await this.auditService.log(AuditAction.STOCK_MOVEMENT_CREATED, {
      entityType: 'StockMovement',
      entityId: movement.id,
      companyId: data.companyId,
      userId: data.userId,
      metadata: {
        partId: data.partId,
        type: data.type,
        reason: data.reason,
        quantity: data.quantity,
        previousStock: impactAnalysis.currentStock,
        newStock: impactAnalysis.newStock,
        documentNumber: data.documentNumber ? 'MASKED' : undefined,
        orderId: data.orderId,
        supplierId: data.supplierId,
      },
    });

    if (impactAnalysis.wouldTriggerAlert) {
      await this.createLowStockAlert(data.partId, data.companyId, impactAnalysis.newStock);
    }

    this.logger.log(`Movement created: ${movement.id}`);
    return movement;
  }

  /**
   * 📝 Обновление движения
   */
  async updateMovement(id: string, data: UpdateMovementData, user: RequestWithUser['user']): Promise<StockMovement> {
    this.logger.log(`Updating movement: ${id}`);

    const movement = await this.stockMovementsDataService.findByIdForCompany(id, user.companyId);

    if (!movement) {
      throw new StockMovementNotFoundException(id);
    }

    const allowedUpdates = ['price', 'totalAmount', 'documentNumber', 'notes'] as const;
    const updateKeys = Object.keys(data);
    const hasDisallowedUpdates = updateKeys.some((key) => !allowedUpdates.includes(key as any));

    if (hasDisallowedUpdates) {
      throw new ValidationDataException('updates', 'Можно обновлять только: цену, общую сумму, номер документа и заметки');
    }

    const updatedMovement = await this.stockMovementsDataService.update(id, data);

    await this.auditService.log(AuditAction.STOCK_MOVEMENT_UPDATED, {
      entityType: 'StockMovement',
      entityId: id,
      companyId: user.companyId,
      userId: user.id,
      metadata: {
        partId: movement.partId,
        changes: this.detectChanges(movement, data),
        updatedFields: updateKeys,
      },
    });

    this.logger.log(`Movement updated: ${id}`);
    return updatedMovement;
  }

  /**
   * 📦 Bulk создание движений
   */
  async createBulkMovements(request: BulkMovementRequest, user: RequestWithUser['user']): Promise<BulkMovementResponse> {
    this.logger.log(`Creating bulk movements: ${request.movements.length} items`);

    const results: BulkMovementResponse['results'] = [];
    let successCount = 0;
    let failureCount = 0;
    let totalValue = 0;

    for (const movementRequest of request.movements) {
      try {
        const movementData: CreateMovementData = {
          ...movementRequest,
          companyId: user.companyId,
          userId: user.id,
          documentNumber: request.documentNumber || movementRequest.notes,
          supplierId: request.supplierId,
          orderId: request.orderId,
        };

        const movement = await this.createMovement(movementData);

        results.push({
          partId: movementRequest.partId,
          success: true,
          movementId: movement.id,
        });

        successCount++;
        if (movement.totalAmount) {
          totalValue += parseFloat((movement.totalAmount as any).toString());
        }
      } catch (error) {
        results.push({
          partId: movementRequest.partId,
          success: false,
          error: error instanceof Error ? error.message : 'Неизвестная ошибка',
        });

        failureCount++;
        this.logger.error(`Failed to create movement for part ${movementRequest.partId}: ${error}`);
      }
    }

    await this.auditService.log(AuditAction.BULK_STOCK_MOVEMENTS_CREATED, {
      entityType: 'BulkStockMovement',
      entityId: `bulk-${Date.now()}`,
      companyId: user.companyId,
      userId: user.id,
      metadata: {
        totalItems: request.movements.length,
        successCount,
        failureCount,
        totalValue,
        documentNumber: request.documentNumber ? 'MASKED' : undefined,
        orderId: request.orderId,
        supplierId: request.supplierId,
      },
    });

    this.logger.log(`Bulk movements completed: ${successCount} success, ${failureCount} failures`);

    return {
      successCount,
      failureCount,
      results,
      totalValue,
    };
  }

  /**
   * 🔄 Создание движения от сканирования штрих-кода
   */
  async createFromBarcodeScan(
    barcode: string,
    quantity: number,
    type: 'receipt' | 'issue',
    user: RequestWithUser['user'],
    options: { location?: string; notes?: string } = {},
  ): Promise<StockMovement> {
    this.logger.log(`Creating movement from barcode scan: ${barcode}`);

    const part = await this.findPartByBarcode(barcode, user.companyId);

    if (!part) {
      throw new ValidationDataException('barcode', `Запчасть с штрих-кодом ${barcode} не найдена`);
    }

    const reason = type === 'receipt' ? 'purchase' : 'order_fulfillment';

    const movementData: CreateMovementData = {
      companyId: user.companyId,
      partId: part.id,
      type,
      reason: reason as any,
      quantity: type === 'issue' ? -Math.abs(quantity) : Math.abs(quantity),
      userId: user.id,
      notes: options.notes ? `${options.notes} (Сканирование)` : `Сканирование`,
    };

    const movement = await this.createMovement(movementData);

    await this.auditService.log(AuditAction.BARCODE_SCAN_MOVEMENT, {
      entityType: 'StockMovement',
      entityId: movement.id,
      companyId: user.companyId,
      userId: user.id,
      metadata: {
        barcode: 'MASKED',
        partId: part.id,
        partName: part.name,
        quantity,
        type,
        location: options.location,
        scanMethod: 'mobile_app',
      },
    });

    return movement;
  }

  /**
   * 🔄 Отмена движения (создание обратного движения)
   */
  async reverseMovement(movementId: string, user: RequestWithUser['user'], reason: string): Promise<StockMovement> {
    this.logger.log(`Reversing movement: ${movementId}`);

    const originalMovement = await this.stockMovementsDataService.findByIdForCompany(movementId, user.companyId);

    if (!originalMovement) {
      throw new StockMovementNotFoundException(movementId);
    }

    if (originalMovement.reversedByMovementId) {
      throw new ValidationDataException('movement', 'Это движение уже отменено');
    }

    const reverseData: CreateMovementData = {
      companyId: user.companyId,
      partId: originalMovement.partId,
      type: originalMovement.type,
      reason: 'correction',
      quantity: -originalMovement.quantity,
      price: originalMovement.price as any,
      userId: user.id,
      notes: `Отмена движения ${movementId}: ${reason}`,
      documentNumber: `REV-${originalMovement.documentNumber || movementId.slice(-8)}`,
    };

    const reverseMovement = await this.createMovement(reverseData);

    await this.stockMovementsDataService.update(movementId, {
      reversedByMovementId: reverseMovement.id,
    } as any);

    await this.stockMovementsDataService.update(reverseMovement.id, {
      reversesMovementId: movementId,
    } as any);

    await this.auditService.log(AuditAction.STOCK_MOVEMENT_REVERSED, {
      entityType: 'StockMovement',
      entityId: reverseMovement.id,
      companyId: user.companyId,
      userId: user.id,
      metadata: {
        originalMovementId: movementId,
        reverseMovementId: reverseMovement.id,
        partId: originalMovement.partId,
        originalQuantity: originalMovement.quantity,
        reverseQuantity: reverseMovement.quantity,
        reason,
      },
    });

    this.logger.log(`Movement reversed: ${movementId} -> ${reverseMovement.id}`);
    return reverseMovement;
  }

  /**
   * 📊 Получение сводки движений
   */
  async getMovementSummary(companyId: string, dateFrom: Date, dateTo: Date): Promise<MovementSummary> {
    this.logger.log(`Getting movement summary for company: ${companyId}`);
    return this.stockMovementsDataService.getMovementSummary(companyId, dateFrom, dateTo);
  }

  /**
   * 🔄 Интеграция с Orders - создание движений при выполнении заказа
   */
  async createMovementsFromOrder(
    orderId: string,
    parts: Array<{ partId: string; quantityUsed: number }>,
    user: RequestWithUser['user'],
  ): Promise<StockMovement[]> {
    this.logger.log(`Creating movements from order: ${orderId}`);

    const movements: StockMovement[] = [];

    for (const partUsage of parts) {
      const movementData: CreateMovementData = {
        companyId: user.companyId,
        partId: partUsage.partId,
        type: 'issue',
        reason: 'order_fulfillment',
        quantity: -Math.abs(partUsage.quantityUsed),
        orderId,
        userId: user.id,
        documentNumber: `ORDER-${orderId.slice(-8)}`,
        notes: `Использование для заказа ${orderId}`,
      };

      try {
        const movement = await this.createMovement(movementData);
        movements.push(movement);
      } catch (error) {
        this.logger.error(`Failed to create movement for part ${partUsage.partId} in order ${orderId}: ${error}`);
      }
    }

    return movements;
  }

  /**
   * 🔄 Интеграция с Suppliers - создание движений при поступлении
   */
  async createMovementsFromDelivery(
    supplierId: string,
    deliveryNumber: string,
    parts: Array<{ partId: string; quantityReceived: number; unitPrice?: number }>,
    user: RequestWithUser['user'],
  ): Promise<StockMovement[]> {
    this.logger.log(`Creating movements from delivery: ${deliveryNumber}`);

    const movements: StockMovement[] = [];

    for (const partDelivery of parts) {
      const totalAmount = partDelivery.unitPrice ? partDelivery.unitPrice * partDelivery.quantityReceived : undefined;

      const movementData: CreateMovementData = {
        companyId: user.companyId,
        partId: partDelivery.partId,
        type: 'receipt',
        reason: 'purchase',
        quantity: Math.abs(partDelivery.quantityReceived),
        price: partDelivery.unitPrice,
        totalAmount,
        supplierId,
        userId: user.id,
        documentNumber: deliveryNumber,
        notes: `Поступление от поставщика: ${deliveryNumber}`,
      };

      try {
        const movement = await this.createMovement(movementData);
        movements.push(movement);
      } catch (error) {
        this.logger.error(`Failed to create movement for part ${partDelivery.partId} in delivery ${deliveryNumber}: ${error}`);
      }
    }

    return movements;
  }

  private async analyzeStockImpact(partId: string, quantity: number, companyId: string): Promise<StockImpactAnalysis> {
    const currentStock = await this.stockMovementsDataService.getCurrentStock(partId, companyId);
    const newStock = currentStock + quantity;

    const part = await this.stockMovementsDataService.validatePartExists(partId, companyId);
    const minQuantity = 5; // TODO: получить из inventory

    return {
      partId,
      currentStock,
      requestedQuantity: quantity,
      newStock,
      wouldGoNegative: newStock < 0,
      wouldTriggerAlert: newStock <= minQuantity && newStock >= 0,
      impactLevel: this.calculateImpactLevel(currentStock, newStock, minQuantity),
    };
  }

  private async updateInventoryStock(partId: string, companyId: string, quantityChange: number, movementId: string): Promise<void> {
    const currentStock = await this.stockMovementsDataService.getCurrentStock(partId, companyId);
    const newStock = currentStock + quantityChange;

    await this.stockMovementsDataService.updateInventoryQuantity(partId, companyId, newStock);

    this.logger.debug(`Updated inventory for part ${partId}: ${currentStock} -> ${newStock} (change: ${quantityChange})`);
  }

  private async createLowStockAlert(partId: string, companyId: string, currentStock: number): Promise<void> {
    this.logger.warn(`Low stock alert triggered for part ${partId}: ${currentStock} units remaining`);
  }

  private calculateImpactLevel(currentStock: number, newStock: number, minQuantity: number): StockImpactAnalysis['impactLevel'] {
    if (newStock < 0) return 'critical';
    if (newStock <= minQuantity * 0.5) return 'high';
    if (newStock <= minQuantity) return 'medium';
    return 'low';
  }

  private async findPartByBarcode(barcode: string, companyId: string): Promise<any> {
    return this.stockMovementsDataService.findPartByBarcodeOrNumber(barcode, companyId);
  }

  private detectChanges(original: StockMovement, updates: UpdateMovementData): Record<string, any> {
    const changes: Record<string, any> = {};
    Object.keys(updates).forEach((key) => {
      if ((updates as any)[key] !== (original as any)[key]) {
        changes[key] = {
          from: (original as any)[key],
          to: (updates as any)[key],
        };
      }
    });
    return changes;
  }
}
