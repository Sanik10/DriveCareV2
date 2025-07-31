// src/modules/inventory/parts/services/parts-mapper.service.ts
import { Injectable } from '@nestjs/common';
import { Part } from '../../../../database/entities';
import { PartResponseDto, PartCategoryDto } from '../dto/response/part-response.dto';
import { PartBasicInfo, PartWithInventory } from '../types/parts.types';

@Injectable()
export class PartsMapperService {
  
  /**
   * 🎯 Основной маппинг Part Entity → ResponseDto
   */
  mapToResponseDto(part: Part): PartResponseDto {
    const marginPercent = this.calculateMarginPercent(part.costPrice, part.sellingPrice);
    const profitPerUnit = this.calculateProfitPerUnit(part.costPrice, part.sellingPrice);
    
    return {
      id: part.id,
      companyId: part.companyId,
      categoryId: part.categoryId,
      category: part.category ? this.mapCategoryToDto(part.category) : {
        id: part.categoryId,
        name: 'Неизвестная категория',
        code: undefined,
      },
      name: part.name,
      partNumber: part.partNumber,
      brand: part.brand,
      description: part.description,
      costPrice: parseFloat(part.costPrice.toString()),
      sellingPrice: parseFloat(part.sellingPrice.toString()),
      marginPercent,
      profitPerUnit,
      imageUrl: part.imageUrl,
      isActive: part.isActive,
      createdAt: part.createdAt,
      updatedAt: part.updatedAt,
      
      // Дополнительные вычисляемые поля (будут заполнены при наличии данных)
      currentStock: undefined,
      minStock: undefined,
      needsRestock: undefined,
      stockStatus: undefined,
      lastMovementDate: undefined,
      totalOrders: undefined,
      popularityScore: undefined,
    };
  }

  /**
   * 🎯 Массовый маппинг
   */
  mapArrayToResponseDto(parts: Part[]): PartResponseDto[] {
    return parts.map(part => this.mapToResponseDto(part));
  }

  /**
   * 🎯 Маппинг с данными инвентаря
   */
  mapToResponseDtoWithInventory(part: Part, inventoryData?: {
    currentStock: number;
    minStock: number;
    lastMovementDate?: Date;
  }): PartResponseDto {
    const baseDto = this.mapToResponseDto(part);
    
    if (inventoryData) {
      baseDto.currentStock = inventoryData.currentStock;
      baseDto.minStock = inventoryData.minStock;
      baseDto.needsRestock = inventoryData.currentStock <= inventoryData.minStock;
      baseDto.stockStatus = this.determineStockStatus(inventoryData.currentStock, inventoryData.minStock);
      baseDto.lastMovementDate = inventoryData.lastMovementDate;
    }
    
    return baseDto;
  }

  /**
   * 🎯 Маппинг категории
   */
  mapCategoryToDto(category: any): PartCategoryDto {
    return {
      id: category.id,
      name: category.name,
      code: category.code,
    };
  }

  /**
   * 🎯 Базовая информация (для других модулей)
   */
  mapToBasicInfo(part: Part): PartBasicInfo {
    return {
      id: part.id,
      name: part.name,
      partNumber: part.partNumber,
      brand: part.brand,
      categoryName: part.category?.name || 'Без категории',
      costPrice: parseFloat(part.costPrice.toString()),
      sellingPrice: parseFloat(part.sellingPrice.toString()),
      isActive: part.isActive,
      companyId: part.companyId,
    };
  }

  /**
   * 🎯 Для списков и краткого отображения
   */
  mapToListItem(part: Part): {
    id: string;
    name: string;
    partNumber: string;
    brand: string;
    categoryName: string;
    costPrice: number;
    sellingPrice: number;
    marginPercent: number;
    isActive: boolean;
    stockStatus: string;
  } {
    return {
      id: part.id,
      name: part.name,
      partNumber: part.partNumber || '',
      brand: part.brand || '',
      categoryName: part.category?.name || 'Без категории',
      costPrice: parseFloat(part.costPrice.toString()),
      sellingPrice: parseFloat(part.sellingPrice.toString()),
      marginPercent: this.calculateMarginPercent(part.costPrice, part.sellingPrice),
      isActive: part.isActive,
      stockStatus: 'unknown', // Будет заполнено при наличии данных инвентаря
    };
  }

  /**
   * 🎯 Для финансовых отчетов
   */
  mapToFinancialSummary(part: Part): {
    id: string;
    name: string;
    partNumber: string;
    costPrice: number;
    sellingPrice: number;
    profitPerUnit: number;
    marginPercent: number;
    category: string;
    isActive: boolean;
  } {
    return {
      id: part.id,
      name: part.name,
      partNumber: part.partNumber || '',
      costPrice: parseFloat(part.costPrice.toString()),
      sellingPrice: parseFloat(part.sellingPrice.toString()),
      profitPerUnit: this.calculateProfitPerUnit(part.costPrice, part.sellingPrice),
      marginPercent: this.calculateMarginPercent(part.costPrice, part.sellingPrice),
      category: part.category?.name || 'Без категории',
      isActive: part.isActive,
    };
  }

  /**
   * 🎯 Для поиска с релевантностью
   */
  mapToSearchResult(part: Part, relevanceScore: number = 0): {
    id: string;
    name: string;
    partNumber: string;
    brand: string;
    categoryName: string;
    costPrice: number;
    sellingPrice: number;
    isActive: boolean;
    relevanceScore: number;
    description: string;
  } {
    return {
      id: part.id,
      name: part.name,
      partNumber: part.partNumber || '',
      brand: part.brand || '',
      categoryName: part.category?.name || 'Без категории',
      costPrice: parseFloat(part.costPrice.toString()),
      sellingPrice: parseFloat(part.sellingPrice.toString()),
      isActive: part.isActive,
      relevanceScore,
      description: part.description || '',
    };
  }

  /**
   * 🎯 Для мобильного приложения (упрощенный)
   */
  mapToMobileView(part: Part): {
    id: string;
    name: string;
    partNumber: string;
    brand: string;
    price: number;
    isActive: boolean;
    category: string;
    imageUrl: string;
  } {
    return {
      id: part.id,
      name: part.name,
      partNumber: part.partNumber || '',
      brand: part.brand || '',
      price: parseFloat(part.sellingPrice.toString()),
      isActive: part.isActive,
      category: part.category?.name || 'Без категории',
      imageUrl: part.imageUrl || '',
    };
  }

  /**
   * 🎯 Для audit логирования
   */
  mapToAuditData(part: Part): {
    id: string;
    name: string;
    partNumber: string;
    brand: string;
    categoryId: string;
    costPrice: number;
    sellingPrice: number;
    isActive: boolean;
    companyId: string;
  } {
    return {
      id: part.id,
      name: part.name,
      partNumber: part.partNumber || '',
      brand: part.brand || '',
      categoryId: part.categoryId,
      costPrice: parseFloat(part.costPrice.toString()),
      sellingPrice: parseFloat(part.sellingPrice.toString()),
      isActive: part.isActive,
      companyId: part.companyId,
    };
  }

  /**
   * 🎯 Для экспорта в Excel/CSV
   */
  mapToExportRow(part: Part): {
    partNumber: string;
    name: string;
    brand: string;
    category: string;
    costPrice: number;
    sellingPrice: number;
    marginPercent: number;
    profitPerUnit: number;
    status: string;
    createdAt: string;
    description: string;
  } {
    return {
      partNumber: part.partNumber || '',
      name: part.name,
      brand: part.brand || '',
      category: part.category?.name || 'Без категории',
      costPrice: parseFloat(part.costPrice.toString()),
      sellingPrice: parseFloat(part.sellingPrice.toString()),
      marginPercent: this.calculateMarginPercent(part.costPrice, part.sellingPrice),
      profitPerUnit: this.calculateProfitPerUnit(part.costPrice, part.sellingPrice),
      status: part.isActive ? 'Активна' : 'Неактивна',
      createdAt: part.createdAt.toISOString().split('T')[0],
      description: part.description || '',
    };
  }

  /**
   * 🎯 Группировка по категориям
   */
  mapToCategoryGroups(parts: Part[]): Record<string, {
    categoryName: string;
    categoryId: string;
    parts: Array<{
      id: string;
      name: string;
      partNumber: string;
      costPrice: number;
      sellingPrice: number;
    }>;
    totalParts: number;
    totalValue: number;
    averagePrice: number;
  }> {
    const groups: Record<string, any> = {};
    
    parts.forEach(part => {
      const categoryName = part.category?.name || 'Без категории';
      const categoryId = part.categoryId || 'unknown';
      
      if (!groups[categoryName]) {
        groups[categoryName] = {
          categoryName,
          categoryId,
          parts: [],
          totalParts: 0,
          totalValue: 0,
          averagePrice: 0,
        };
      }
      
      const costPrice = parseFloat(part.costPrice.toString());
      const sellingPrice = parseFloat(part.sellingPrice.toString());
      
      groups[categoryName].parts.push({
        id: part.id,
        name: part.name,
        partNumber: part.partNumber || '',
        costPrice,
        sellingPrice,
      });
      
      groups[categoryName].totalParts++;
      groups[categoryName].totalValue += costPrice;
    });
    
    // Вычисляем среднюю цену для каждой категории
    Object.values(groups).forEach((group: any) => {
      group.averagePrice = group.totalParts > 0 ? group.totalValue / group.totalParts : 0;
    });
    
    return groups;
  }

  /**
   * 📊 Расчет процента наценки
   */
  private calculateMarginPercent(costPrice: number, sellingPrice: number): number {
    const cost = parseFloat(costPrice.toString());
    const selling = parseFloat(sellingPrice.toString());
    
    if (cost === 0) return 0;
    return Math.round(((selling - cost) / cost) * 100 * 100) / 100;
  }

  /**
   * 💰 Расчет прибыли с единицы
   */
  private calculateProfitPerUnit(costPrice: number, sellingPrice: number): number {
    const cost = parseFloat(costPrice.toString());
    const selling = parseFloat(sellingPrice.toString());
    
    return Math.round((selling - cost) * 100) / 100;
  }

  /**
   * 📊 Определение статуса наличия
   */
  private determineStockStatus(currentStock: number, minStock: number): 'in_stock' | 'low_stock' | 'out_of_stock' {
    if (currentStock === 0) return 'out_of_stock';
    if (currentStock <= minStock) return 'low_stock';
    return 'in_stock';
  }
}
