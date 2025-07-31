// src/modules/inventory/services/inventory-mapper.service.ts
import { Injectable } from '@nestjs/common';
import { Inventory } from '../../../database/entities';
import { InventoryResponseDto } from '../dto/response/inventory-response.dto';
import { InventoryStatus } from '../types/inventory.types';

@Injectable()
export class InventoryMapperService {
  
  /**
   * 🎯 Основной маппинг Inventory Entity → ResponseDto
   */
  mapToResponseDto(inventory: Inventory): InventoryResponseDto {
    const status = this.calculateInventoryStatus(inventory);
    const totalValue = this.calculateTotalValue(inventory);
    const lastMovement = this.getLastMovementInfo(inventory);

    return {
      id: inventory.id,
      companyId: inventory.companyId,
      partId: inventory.partId,
      quantity: inventory.quantity,
      minQuantity: inventory.minQuantity,
      location: inventory.location,
      lastRestockDate: inventory.lastRestockDate,
      createdAt: inventory.createdAt,
      updatedAt: inventory.updatedAt,
      
      // 🔗 Связанная информация (если загружена)
      part: inventory.part ? {
        id: inventory.part.id,
        name: inventory.part.name,
        partNumber: inventory.part.partNumber,
        brand: inventory.part.brand,
        costPrice: parseFloat(inventory.part.costPrice.toString()),
        sellingPrice: parseFloat(inventory.part.sellingPrice.toString()),
        category: inventory.part.category ? {
          id: inventory.part.category.id,
          name: inventory.part.category.name,
        } : undefined,
      } : undefined,
      
      // 📊 Вычисляемые поля
      status,
      needsRestock: inventory.quantity <= inventory.minQuantity,
      quantityUntilMin: Math.max(0, inventory.quantity - inventory.minQuantity),
      totalValue,
      minQuantityPercent: this.calculateMinQuantityPercent(inventory),
      reservedQuantity: 0, // TODO: Реализовать подсчет резерва
      availableQuantity: Math.max(0, inventory.quantity - 0), // quantity - reserved
      lastMovement,
      notes: undefined, // TODO: Добавить поле notes в entity
    };
  }

  /**
   * 🎯 Массовый маппинг
   */
  mapArrayToResponseDto(inventory: Inventory[]): InventoryResponseDto[] {
    return inventory.map(item => this.mapToResponseDto(item));
  }

  /**
   * 🎯 Базовая информация (для других модулей)
   */
  mapToBasicInfo(inventory: Inventory): { 
    id: string; 
    partId: string;
    partName: string;
    quantity: number;
    available: number;
    status: InventoryStatus;
    location: string;
  } {
    return {
      id: inventory.id,
      partId: inventory.partId,
      partName: inventory.part?.name || 'Неизвестная запчасть',
      quantity: inventory.quantity,
      available: Math.max(0, inventory.quantity - 0), // quantity - reserved
      status: this.calculateInventoryStatus(inventory),
      location: inventory.location || 'Не указано',
    };
  }

  /**
   * 🎯 Для списков и краткого отображения
   */
  mapToListItem(inventory: Inventory): {
    id: string;
    partName: string;
    partNumber: string;
    quantity: number;
    minQuantity: number;
    status: InventoryStatus;
    location: string;
    categoryName: string;
    totalValue: number;
    needsRestock: boolean;
  } {
    return {
      id: inventory.id,
      partName: inventory.part?.name || 'Неизвестная запчасть',
      partNumber: inventory.part?.partNumber || '',
      quantity: inventory.quantity,
      minQuantity: inventory.minQuantity,
      status: this.calculateInventoryStatus(inventory),
      location: inventory.location || 'Не указано',
      categoryName: inventory.part?.category?.name || 'Без категории',
      totalValue: this.calculateTotalValue(inventory),
      needsRestock: inventory.quantity <= inventory.minQuantity,
    };
  }

  /**
   * 🎯 Для финансовых отчетов
   */
  mapToFinancialSummary(inventory: Inventory): {
    id: string;
    partId: string;
    partName: string;
    quantity: number;
    costPrice: number;
    sellingPrice: number;
    totalCostValue: number;
    totalSellingValue: number;
    potentialProfit: number;
    marginPercent: number;
  } {
    const costPrice = inventory.part ? parseFloat(inventory.part.costPrice.toString()) : 0;
    const sellingPrice = inventory.part ? parseFloat(inventory.part.sellingPrice.toString()) : 0;
    const totalCostValue = costPrice * inventory.quantity;
    const totalSellingValue = sellingPrice * inventory.quantity;
    const potentialProfit = totalSellingValue - totalCostValue;
    const marginPercent = totalCostValue > 0 ? (potentialProfit / totalCostValue) * 100 : 0;
    
    return {
      id: inventory.id,
      partId: inventory.partId,
      partName: inventory.part?.name || 'Неизвестная запчасть',
      quantity: inventory.quantity,
      costPrice,
      sellingPrice,
      totalCostValue,
      totalSellingValue,
      potentialProfit,
      marginPercent: Math.round(marginPercent * 100) / 100,
    };
  }

  /**
   * 🎯 Для алертов и уведомлений
   */
  mapToAlertItem(inventory: Inventory): {
    partId: string;
    partName: string;
    partNumber: string;
    currentQuantity: number;
    minQuantity: number;
    shortage: number;
    categoryName: string;
    location: string;
    criticalLevel: boolean;
  } {
    const shortage = Math.max(0, inventory.minQuantity - inventory.quantity);
    
    return {
      partId: inventory.partId,
      partName: inventory.part?.name || 'Неизвестная запчасть',
      partNumber: inventory.part?.partNumber || '',
      currentQuantity: inventory.quantity,
      minQuantity: inventory.minQuantity,
      shortage,
      categoryName: inventory.part?.category?.name || 'Без категории',
      location: inventory.location || 'Не указано',
      criticalLevel: inventory.quantity === 0 || inventory.quantity <= inventory.minQuantity * 0.25,
    };
  }

  /**
   * 🎯 Для мобильного приложения (упрощенный)
   */
  mapToMobileView(inventory: Inventory): {
    id: string;
    partName: string;
    quantity: number;
    status: InventoryStatus;
    location: string;
    lowStock: boolean;
    barcode: string;
  } {
    return {
      id: inventory.id,
      partName: inventory.part?.name || 'Неизвестная запчасть',
      quantity: inventory.quantity,
      status: this.calculateInventoryStatus(inventory),
      location: inventory.location || 'Не указано',
      lowStock: inventory.quantity <= inventory.minQuantity,
      barcode: inventory.part?.partNumber || inventory.partId, // Используем partNumber как штрих-код
    };
  }

  /**
   * 🎯 Для category группировки
   */
  mapToCategoryGroup(inventoryItems: Inventory[]): Record<string, {
    categoryName: string;
    items: Array<{
      id: string;
      partName: string;
      quantity: number;
      totalValue: number;
    }>;
    totalItems: number;
    totalQuantity: number;
    totalValue: number;
  }> {
    const groups: Record<string, any> = {};
    
    inventoryItems.forEach(item => {
      const categoryName = item.part?.category?.name || 'Без категории';
      
      if (!groups[categoryName]) {
        groups[categoryName] = {
          categoryName,
          items: [],
          totalItems: 0,
          totalQuantity: 0,
          totalValue: 0,
        };
      }
      
      const totalValue = this.calculateTotalValue(item);
      
      groups[categoryName].items.push({
        id: item.id,
        partName: item.part?.name || 'Неизвестная запчасть',
        quantity: item.quantity,
        totalValue,
      });
      
      groups[categoryName].totalItems++;
      groups[categoryName].totalQuantity += item.quantity;
      groups[categoryName].totalValue += totalValue;
    });
    
    return groups;
  }

  /**
   * 🎯 Для audit логирования
   */
  mapToAuditData(inventory: Inventory): {
    id: string;
    partId: string;
    partName: string;
    quantity: number;
    minQuantity: number;
    location: string;
    companyId: string;
  } {
    return {
      id: inventory.id,
      partId: inventory.partId,
      partName: inventory.part?.name || 'Неизвестная запчасть',
      quantity: inventory.quantity,
      minQuantity: inventory.minQuantity,
      location: inventory.location || 'Не указано',
      companyId: inventory.companyId,
    };
  }

  /**
   * 🎯 Для экспорта в Excel/CSV
   */
  mapToExportRow(inventory: Inventory): {
    partNumber: string;
    partName: string;
    category: string;
    quantity: number;
    minQuantity: number;
    location: string;
    costPrice: number;
    sellingPrice: number;
    totalValue: number;
    status: string;
    lastRestock: string;
  } {
    return {
      partNumber: inventory.part?.partNumber || '',
      partName: inventory.part?.name || 'Неизвестная запчасть',
      category: inventory.part?.category?.name || 'Без категории',
      quantity: inventory.quantity,
      minQuantity: inventory.minQuantity,
      location: inventory.location || 'Не указано',
      costPrice: inventory.part ? parseFloat(inventory.part.costPrice.toString()) : 0,
      sellingPrice: inventory.part ? parseFloat(inventory.part.sellingPrice.toString()) : 0,
      totalValue: this.calculateTotalValue(inventory),
      status: this.getStatusDisplayName(inventory),
      lastRestock: inventory.lastRestockDate 
        ? inventory.lastRestockDate.toISOString().split('T')[0] 
        : 'Никогда',
    };
  }

  /**
   * 📊 Расчет статуса инвентаря
   */
  private calculateInventoryStatus(inventory: Inventory): InventoryStatus {
    if (inventory.quantity === 0) {
      return 'out_of_stock';
    }
    
    if (inventory.quantity <= inventory.minQuantity) {
      return 'low_stock';
    }
    
    // Считаем переизбытком если количество больше минимального в 5 раз
    if (inventory.minQuantity > 0 && inventory.quantity > inventory.minQuantity * 5) {
      return 'overstock';
    }
    
    return 'in_stock';
  }

  /**
   * 💰 Расчет общей стоимости позиции
   */
  private calculateTotalValue(inventory: Inventory): number {
    if (!inventory.part) return 0;
    
    const costPrice = parseFloat(inventory.part.costPrice.toString());
    return costPrice * inventory.quantity;
  }

  /**
   * 📊 Расчет процента от минимального количества
   */
  private calculateMinQuantityPercent(inventory: Inventory): number {
    if (inventory.minQuantity === 0) return 0;
    
    return Math.round((inventory.quantity / inventory.minQuantity) * 100);
  }

  /**
   * 📅 Получение информации о последнем движении
   */
  private getLastMovementInfo(inventory: Inventory): {
    date: Date;
    type: string;
    quantity: number;
  } | undefined {
    // TODO: Реализовать после создания StockMovement связи
    if (inventory.lastRestockDate) {
      return {
        date: inventory.lastRestockDate,
        type: 'restock',
        quantity: 0, // Неизвестно без истории движений
      };
    }
    
    return undefined;
  }

  /**
   * 📊 Получение отображаемого названия статуса
   */
  private getStatusDisplayName(inventory: Inventory): string {
    const status = this.calculateInventoryStatus(inventory);
    
    const statusNames: Record<InventoryStatus, string> = {
      'in_stock': 'В наличии',
      'low_stock': 'Низкий остаток',
      'out_of_stock': 'Отсутствует',
      'overstock': 'Переизбыток',
    };
    
    return statusNames[status];
  }
}
