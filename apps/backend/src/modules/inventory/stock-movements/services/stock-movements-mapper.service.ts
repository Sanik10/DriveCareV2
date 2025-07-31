// src/modules/inventory/stock-movements/services/stock-movements-mapper.service.ts
import { Injectable } from '@nestjs/common';
import { StockMovement } from '../../../../database/entities';
// 🔥 ИСПРАВЛЯЕМ: Правильные импорты типов
import { StockMovementType, StockMovementReason } from '../../constants/inventory.constants';
import { StockMovementResponseDto } from '../dto/response/movement-response.dto';
import { PaginatedMovementsResponseDto } from '../dto/response/paginated-movements-response.dto';
import { MovementSummaryResponseDto } from '../dto/response/movement-summary-response.dto';
import { 
  MovementSummary,
  MovementDisplayItem
} from '../types/stock-movements.types';

@Injectable()
export class StockMovementsMapperService {
  
  /**
   * 🎯 Основной маппинг StockMovement Entity → ResponseDto
   */
  mapToResponseDto(movement: StockMovement): StockMovementResponseDto {
    const impactType = this.calculateImpactType(movement);
    const canReverse = this.calculateCanReverse(movement);

    return {
      id: movement.id,
      companyId: movement.companyId,
      partId: movement.partId,
      type: movement.type,
      typeDisplay: this.getTypeDisplayName(movement.type),
      reason: movement.reason as StockMovementReason,
      reasonDisplay: this.getReasonDisplayName(movement.reason as StockMovementReason),
      quantity: movement.quantity,
      quantityDisplay: this.formatQuantityDisplay(movement.quantity),
      price: movement.price ? parseFloat(movement.price.toString()) : undefined,
      totalAmount: movement.totalAmount ? parseFloat(movement.totalAmount.toString()) : undefined,
      orderId: movement.orderId,
      supplierId: movement.supplierId,
      documentNumber: movement.documentNumber,
      notes: movement.notes,
      createdBy: movement.createdBy,
      createdAt: movement.createdAt,
      
      // 🔗 Связанная информация (если загружена)
      part: movement.part ? {
        id: movement.part.id,
        name: movement.part.name,
        partNumber: movement.part.partNumber,
        brand: movement.part.brand,
        category: movement.part.category ? {
          id: movement.part.category.id,
          name: movement.part.category.name,
        } : undefined,
      } : undefined,

      supplier: movement.supplier ? {
        id: movement.supplier.id,
        name: movement.supplier.name,
        contactName: movement.supplier.contactName,
      } : undefined,

      // 📊 Вычисляемые поля
      impactType,
      runningBalance: undefined, // TODO: Рассчитать на основе истории
      canReverse,
      reversedByMovementId: movement.reversedByMovementId,
      reversesMovementId: movement.reversesMovementId,
    };
  }

  /**
   * 🎯 Маппинг сводки движений
   */
  mapToSummaryResponse(summary: MovementSummary): MovementSummaryResponseDto {
    // 📊 Расчет дополнительных метрик
    const averageReceiptCost = summary.receipts.totalQuantity > 0 
      ? summary.receipts.totalValue / summary.receipts.totalQuantity 
      : 0;

    const averageIssueCost = summary.issues.totalQuantity > 0 
      ? summary.issues.totalValue / summary.issues.totalQuantity 
      : 0;

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
      // 🔥 ИСПРАВЛЯЕМ: Добавляем недостающее поле totalValue
      topParts: summary.topParts.map(part => ({
        ...part,
        totalValue: 0, // TODO: Добавить расчет totalValue в запрос
      })),
      topCategories: [], // TODO: Добавить в MovementSummary
      dailyActivity: [], // TODO: Добавить генерацию дневной активности
    };
  }

  // Остальные методы остаются без изменений...
  mapArrayToResponseDto(movements: StockMovement[]): StockMovementResponseDto[] {
    return movements.map(movement => this.mapToResponseDto(movement));
  }

  mapToPaginatedResponse(
    movements: StockMovement[],
    total: number,
    page: number,
    limit: number,
    filters?: any
  ): PaginatedMovementsResponseDto {
    const items = this.mapArrayToResponseDto(movements);
    const totalPages = Math.ceil(total / limit);

    // 📊 Расчет сводки по текущей странице
    const summary = this.calculatePageSummary(movements);

    return {
      items,
      total,
      page,
      limit,
      totalPages,
      summary,
      filters: {
        dateRange: filters?.dateFrom && filters?.dateTo ? {
          from: filters.dateFrom,
          to: filters.dateTo
        } : undefined,
        partId: filters?.partId,
        type: filters?.type,
        hasActiveFilters: this.hasActiveFilters(filters),
      },
    };
  }

  mapToDisplayItem(movement: StockMovement): MovementDisplayItem {
    return {
      id: movement.id,
      partName: movement.part?.name || 'Неизвестная запчасть',
      partNumber: movement.part?.partNumber || '',
      type: movement.type,
      typeDisplay: this.getTypeDisplayName(movement.type),
      reason: movement.reason as StockMovementReason,
      reasonDisplay: this.getReasonDisplayName(movement.reason as StockMovementReason),
      quantity: movement.quantity,
      quantityDisplay: this.formatQuantityDisplay(movement.quantity),
      price: movement.price ? parseFloat(movement.price.toString()) : undefined,
      totalAmount: movement.totalAmount ? parseFloat(movement.totalAmount.toString()) : undefined,
      documentNumber: movement.documentNumber,
      createdAt: movement.createdAt,
      createdBy: movement.createdBy,
      notes: movement.notes,
      impactLevel: this.calculateImpactType(movement),
    };
  }

  /**
   * 📊 Расчет типа влияния на остаток
   */
  private calculateImpactType(movement: StockMovement): 'positive' | 'negative' | 'neutral' {
    if (movement.quantity > 0) return 'positive';
    if (movement.quantity < 0) return 'negative';
    return 'neutral';
  }

  /**
   * 📊 Проверка возможности отмены движения
   */
  private calculateCanReverse(movement: StockMovement): boolean {
    // Можно отменить в течение 24 часов и если еще не отменено
    const movementAge = Date.now() - movement.createdAt.getTime();
    const maxAgeHours = 24;
    
    return movementAge <= maxAgeHours * 60 * 60 * 1000 && 
           !movement.reversedByMovementId;
  }

  /**
   * 📊 Получение отображаемого названия типа
   */
  private getTypeDisplayName(type: StockMovementType): string {
    const typeNames: Record<StockMovementType, string> = {
      receipt: 'Приход',
      issue: 'Расход',
      adjustment: 'Корректировка',
      transfer: 'Перемещение',
      reservation: 'Резервирование',
      release: 'Освобождение резерва',
    };
    
    return typeNames[type] || type;
  }

  /**
   * 📊 Получение отображаемого названия причины
   */
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
    
    return reasonNames[reason] || reason;
  }

  /**
   * 📊 Форматирование отображения количества
   */
  private formatQuantityDisplay(quantity: number): string {
    const absQuantity = Math.abs(quantity);
    
    if (quantity > 0) {
      return `+${absQuantity}`;
    } else if (quantity < 0) {
      return `-${absQuantity}`;
    } else {
      return '0';
    }
  }

  /**
   * 📊 Расчет сводки по странице
   */
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

    movements.forEach(movement => {
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
        totalValue += parseFloat(movement.totalAmount.toString());
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

  /**
   * 📊 Проверка активных фильтров
   */
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
