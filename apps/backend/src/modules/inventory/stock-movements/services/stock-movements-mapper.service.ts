// path: apps/backend/src/modules/inventory/stock-movements/services/stock-movements-mapper.service.ts
import { Injectable } from '@nestjs/common';
import { StockMovement } from '../../../../database/entities';
import { StockMovementType, StockMovementReason, INVENTORY_CONSTANTS } from '../../constants/inventory.constants';
import { StockMovementResponseDto } from '../dto/response/movement-response.dto';
import { PaginatedMovementsResponseDto } from '../dto/response/paginated-movements-response.dto';
import { MovementSummaryResponseDto } from '../dto/response/movement-summary-response.dto';
import { MovementSummary, MovementDisplayItem } from '../types/stock-movements.types';

@Injectable()
export class StockMovementsMapperService {
  private canViewCostsForRole(role?: string): boolean {
    if (!role) return false;
    return INVENTORY_CONSTANTS.ROLES.CAN_VIEW_COSTS.includes(role as any);
  }

  mapToResponseDto(movement: StockMovement, viewerRole?: string): StockMovementResponseDto {
    const impactType = this.calculateImpactType(movement);
    const canReverse = this.calculateCanReverse(movement);
    const canViewCosts = this.canViewCostsForRole(viewerRole);

    return {
      id: movement.id,
      companyId: movement.companyId,
      partId: movement.partId,
      type: movement.type as StockMovementType,
      typeDisplay: this.getTypeDisplayName(movement.type as StockMovementType),
      reason: movement.reason as StockMovementReason,
      reasonDisplay: this.getReasonDisplayName(movement.reason as StockMovementReason),
      quantity: movement.quantity,
      quantityDisplay: this.formatQuantityDisplay(movement.quantity),
      price: canViewCosts && movement.price != null ? parseFloat((movement.price as any).toString()) : undefined,
      totalAmount: canViewCosts && movement.totalAmount != null ? parseFloat((movement.totalAmount as any).toString()) : undefined,
      orderId: movement.orderId || undefined,
      supplierId: movement.supplierId || undefined,
      documentNumber: movement.documentNumber || undefined,
      notes: movement.notes || undefined,
      createdBy: movement.createdBy,
      createdAt: movement.createdAt,

      part: movement.part
        ? {
            id: movement.part.id,
            name: movement.part.name,
            partNumber: movement.part.partNumber || undefined,
            brand: movement.part.brand || undefined,
            category: movement.part.category
              ? {
                  id: movement.part.category.id,
                  name: movement.part.category.name,
                }
              : undefined,
          }
        : undefined,

      supplier: movement.supplier
        ? {
            id: movement.supplier.id,
            name: movement.supplier.name,
            // ПДн: не возвращаем контактные данные в общих ответах
            contactName: undefined,
          }
        : undefined,

      impactType,
      runningBalance: undefined,
      canReverse,
      reversedByMovementId: movement.reversedByMovementId || undefined,
      reversesMovementId: movement.reversesMovementId || undefined,
    };
  }

  mapToSummaryResponse(summary: MovementSummary): MovementSummaryResponseDto {
    const averageReceiptCost =
      summary.receipts.totalQuantity > 0 ? summary.receipts.totalValue / summary.receipts.totalQuantity : 0;

    const averageIssueCost =
      summary.issues.totalQuantity > 0 ? summary.issues.totalValue / summary.issues.totalQuantity : 0;

    return {
      period: summary.period,
      overview: {
        totalMovements: summary.totalMovements,
        totalValue: summary.receipts.totalValue + summary.issues.totalValue,
        netQuantityChange: summary.receipts.totalQuantity - summary.issues.totalQuantity,
      },
      receipts: {
        ...summary.receipts,
        averageUnitCost: Math.round(averageReceiptCost * 100) / 100,
      },
      issues: {
        ...summary.issues,
        averageUnitCost: Math.round(averageIssueCost * 100) / 100,
      },
      adjustments: {
        ...summary.adjustments,
        netAdjustment: summary.adjustments.positiveAdjustments - summary.adjustments.negativeAdjustments,
      },
      topParts: summary.topParts.map((part) => ({
        ...part,
        totalValue: 0, // TODO: добавить расчёт при наличии данных
      })),
      topCategories: [],
      dailyActivity: [],
    };
  }

  mapArrayToResponseDto(movements: StockMovement[], viewerRole?: string): StockMovementResponseDto[] {
    return movements.map((movement) => this.mapToResponseDto(movement, viewerRole));
  }

  mapToPaginatedResponse(
    movements: StockMovement[],
    total: number,
    page: number,
    limit: number,
    filters?: any,
    viewerRole?: string,
  ): PaginatedMovementsResponseDto {
    const items = this.mapArrayToResponseDto(movements, viewerRole);
    const totalPages = Math.ceil(total / limit);
    const summary = this.calculatePageSummary(movements);

    return {
      items,
      total,
      page,
      limit,
      totalPages,
      summary,
      filters: {
        dateRange: filters?.dateFrom && filters?.dateTo ? { from: filters.dateFrom, to: filters.dateTo } : undefined,
        partId: filters?.partId,
        type: filters?.type,
        hasActiveFilters: this.hasActiveFilters(filters),
      },
    };
  }

  mapToDisplayItem(movement: StockMovement, viewerRole?: string): MovementDisplayItem {
    const canViewCosts = this.canViewCostsForRole(viewerRole);
    return {
      id: movement.id,
      partName: movement.part?.name || 'Неизвестная запчасть',
      partNumber: movement.part?.partNumber || '',
      type: movement.type as StockMovementType,
      typeDisplay: this.getTypeDisplayName(movement.type as StockMovementType),
      reason: movement.reason as StockMovementReason,
      reasonDisplay: this.getReasonDisplayName(movement.reason as StockMovementReason),
      quantity: movement.quantity,
      quantityDisplay: this.formatQuantityDisplay(movement.quantity),
      price: canViewCosts && movement.price != null ? parseFloat((movement.price as any).toString()) : undefined,
      totalAmount: canViewCosts && movement.totalAmount != null ? parseFloat((movement.totalAmount as any).toString()) : undefined,
      documentNumber: movement.documentNumber || undefined,
      createdAt: movement.createdAt,
      createdBy: movement.createdBy,
      notes: movement.notes || undefined,
      impactLevel: this.calculateImpactType(movement),
    };
  }

  private calculateImpactType(movement: StockMovement): 'positive' | 'negative' | 'neutral' {
    if (movement.quantity > 0) return 'positive';
    if (movement.quantity < 0) return 'negative';
    return 'neutral';
  }

  private calculateCanReverse(movement: StockMovement): boolean {
    const movementAge = Date.now() - movement.createdAt.getTime();
    const maxAgeHours = 24;
    return movementAge <= maxAgeHours * 60 * 60 * 1000 && !movement.reversedByMovementId;
  }

  private getTypeDisplayName(type: StockMovementType): string {
    const typeNames: Record<StockMovementType, string> = {
      receipt: 'Приход',
      issue: 'Расход',
      adjustment: 'Корректировка',
      transfer: 'Перемещение',
      reservation: 'Резервирование',
      release: 'Освобождение резерва',
    };
    return typeNames[type] || (type as any);
  }

  private getReasonDisplayName(reason: StockMovementReason): string {
    const reasonNames: Record<StockMovementReason, string> = {
      purchase: 'Закупка',
      order_fulfillment: 'Выполнение заказа',
      inventory_count: 'Инвентаризация',
      damage: 'Брак/Повреждение',
      expiry: 'Истечение срока',
      loss: 'Потеря',
      correction: 'Корректировка',
    };
    return reasonNames[reason] || (reason as any);
  }

  private formatQuantityDisplay(quantity: number): string {
    const absQuantity = Math.abs(quantity);
    if (quantity > 0) return `+${absQuantity}`;
    if (quantity < 0) return `-${absQuantity}`;
    return '0';
  }

  private calculatePageSummary(movements: StockMovement[]): {
    receipts: number;
    issues: number;
    adjustments: number;
    totalValue: number;
    netQuantityChange: number;
  } {
    let receipts = 0;
    let issues = 0;
    let adjustments = 0;
    let totalValue = 0;
    let netQuantityChange = 0;

    movements.forEach((movement) => {
      switch (movement.type) {
        case 'receipt':
          receipts += Math.abs(movement.quantity);
          break;
        case 'issue':
          issues += Math.abs(movement.quantity);
          break;
        case 'adjustment':
          adjustments += Math.abs(movement.quantity);
          break;
      }

      if (movement.totalAmount) {
        totalValue += parseFloat((movement.totalAmount as any).toString());
      }

      netQuantityChange += movement.quantity;
    });

    return {
      receipts,
      issues,
      adjustments,
      totalValue: Math.round(totalValue * 100) / 100,
      netQuantityChange,
    };
  }

  private hasActiveFilters(filters: any): boolean {
    if (!filters) return false;
    return !!(
      filters.partId ||
      filters.type ||
      filters.reason ||
      filters.dateFrom ||
      filters.dateTo ||
      filters.search ||
      filters.supplierId ||
      filters.orderId
    );
  }
}
