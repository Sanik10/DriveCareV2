// src/modules/inventory/parts/services/parts-business.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { PartsDataService } from './parts-data.service';
import { PartsValidationService } from './parts-validation.service';
import { Part } from '../../../../database/entities';
import { CreatePartData, UpdatePartData, BulkUpdatePartData, PartStats } from '../types/parts.types';
import { RequestWithUser } from '../../../auth/interfaces/request-with-user.interface';
import { AuditService, AuditAction } from '../../../../common/audit/audit.service';
import { BulkOperationResult } from '../types/parts.types';
import { PARTS_CONSTANTS } from '../constants/parts.constants';

@Injectable()
export class PartsBusinessService {
  private readonly logger = new Logger(PartsBusinessService.name);

  constructor(
    private readonly partsDataService: PartsDataService,
    private readonly partsValidationService: PartsValidationService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * 📝 Создание новой запчасти с бизнес-логикой
   */
  async createPart(data: CreatePartData, user: RequestWithUser['user']): Promise<Part> {
    this.logger.log(`Creating part: ${data.name} for company ${data.companyId}`);

    const part = await this.partsDataService.create(data);
    
    this.logger.log(`Created part: ${part.name} (${part.id}) for company ${part.companyId}`);
    
    // 🔥 Audit логирование
    await this.auditService.log(AuditAction.PART_CREATED, {
      entityType: 'Part',
      entityId: part.id,
      companyId: part.companyId,
      userId: user.id,
      metadata: {
        partName: part.name,
        partNumber: part.partNumber,
        brand: part.brand,
        categoryId: part.categoryId,
        costPrice: part.costPrice,
        sellingPrice: part.sellingPrice,
        marginPercent: this.calculateMarginPercent(part.costPrice, part.sellingPrice),
      },
      changes: { 
        after: this.sanitizePartData(part) 
      },
    });

    return part;
  }

  /**
   * 📝 Обновление запчасти с бизнес-логикой
   */
  async updatePart(id: string, data: UpdatePartData, user: RequestWithUser['user']): Promise<Part> {
    this.logger.log(`Updating part: ${id}`);

    const oldPart = await this.partsDataService.findById(id);
    const updatedPart = await this.partsDataService.update(id, data);
    
    this.logger.log(`Updated part: ${updatedPart.name} (${updatedPart.id})`);
    
    // Определяем изменения для аудита
    const changes = this.detectChanges(oldPart, updatedPart);
    const isPriceChange = changes.costPrice || changes.sellingPrice;
    
    // 🔥 Audit логирование
    const auditAction = isPriceChange ? 'PART_PRICE_CHANGED' : AuditAction.PART_UPDATED;
    
    await this.auditService.log(auditAction as any, {
      entityType: 'Part',
      entityId: updatedPart.id,
      companyId: updatedPart.companyId,
      userId: user.id,
      metadata: {
        partName: updatedPart.name,
        partNumber: updatedPart.partNumber,
        brand: updatedPart.brand,
        updatedFields: Object.keys(data),
        oldMarginPercent: oldPart ? this.calculateMarginPercent(oldPart.costPrice, oldPart.sellingPrice) : 0,
        newMarginPercent: this.calculateMarginPercent(updatedPart.costPrice, updatedPart.sellingPrice),
      },
      changes: {
        before: this.sanitizePartData(oldPart),
        after: this.sanitizePartData(updatedPart),
      },
    });

    return updatedPart;
  }

  /**
   * 🔄 Изменение статуса активности
   */
  async setPartActive(id: string, isActive: boolean, user: RequestWithUser['user']): Promise<Part> {
    this.logger.log(`Setting part ${id} active status to: ${isActive}`);

    const part = await this.partsDataService.setActive(id, isActive);
    
    // 🔥 Audit логирование
    await this.auditService.log('PART_STATUS_CHANGED' as any, {
      entityType: 'Part',
      entityId: part.id,
      companyId: part.companyId,
      userId: user.id,
      metadata: {
        partName: part.name,
        partNumber: part.partNumber,
        action: isActive ? 'activated' : 'deactivated',
        oldStatus: !isActive,
        newStatus: isActive,
      },
      changes: {
        before: { isActive: !isActive },
        after: { isActive: isActive },
      },
    });

    return part;
  }

  /**
   * ❌ Удаление запчасти (деактивация)
   */
  async deletePart(id: string, user: RequestWithUser['user']): Promise<void> {
    const part = await this.partsDataService.findById(id);
    
    await this.partsDataService.softDelete(id);
    
    this.logger.log(`Deleted part: ${part?.name} (${id})`);
    
    // 🔥 Audit логирование
    await this.auditService.log(AuditAction.PART_DELETED, {
      entityType: 'Part',
      entityId: id,
      companyId: part?.companyId,
      userId: user.id,
      metadata: {
        partName: part?.name,
        partNumber: part?.partNumber,
        brand: part?.brand,
        action: 'soft_deleted',
      },
      changes: {
        before: this.sanitizePartData(part),
        after: { isActive: false },
      },
    });
  }

  /**
   * 📦 Bulk обновление запчастей
   */
  async bulkUpdateParts(
    partIds: string[], 
    updateData: BulkUpdatePartData['updateData'], 
    user: RequestWithUser['user']
  ): Promise<BulkOperationResult> {
    this.logger.log(`Bulk updating ${partIds.length} parts for company: ${user.companyId}`);

    let successCount = 0;
    let failureCount = 0;
    const errors: Array<{ partId: string; error: string }> = [];

    // Получаем все запчасти до обновления для аудита
    const oldParts = await this.partsDataService.findMultipleByIds(partIds, user.companyId);

    try {
      const affectedCount = await this.partsDataService.bulkUpdate(partIds, updateData, user.companyId);
      successCount = affectedCount;
      
      // 🔥 Audit логирование для успешных обновлений
      await this.auditService.log('PARTS_BULK_UPDATED' as any, {
        entityType: 'Part',
        companyId: user.companyId,
        userId: user.id,
        metadata: {
          affectedPartsCount: successCount,
          updateData,
          partIds: partIds.slice(0, 10), // Логируем первые 10 ID для ограничения размера
          totalRequested: partIds.length,
        },
        changes: {
          before: { partsCount: oldParts.length },
          after: { updatedCount: successCount },
        },
      });

    } catch (error) {
      failureCount = partIds.length;
      partIds.forEach(partId => {
        errors.push({
          partId,
          error: error.message || 'Unknown error during bulk update',
        });
      });
    }

    this.logger.log(`Bulk update completed: ${successCount} success, ${failureCount} failures`);

    return {
      successCount,
      failureCount,
      errors,
    };
  }

  /**
   * 📊 Получение статистики по запчастям
   */
  async getPartsStats(companyId: string): Promise<PartStats> {
    this.logger.log(`Getting parts statistics for company: ${companyId}`);

    const [basicStats, categoryStats, priceExtremes] = await Promise.all([
      this.partsDataService.getCompanyPartsStats(companyId),
      this.partsDataService.getCategoriesStats(companyId),
      this.partsDataService.getPriceExtremes(companyId),
    ]);

    return {
      totalActive: basicStats.totalActive,
      totalInactive: basicStats.totalInactive,
      totalByCategory: categoryStats,
      averageCostPrice: basicStats.averageCostPrice,
      averageSellingPrice: basicStats.averageSellingPrice,
      totalInventoryValue: basicStats.totalInventoryValue,
      mostExpensivePart: priceExtremes.mostExpensive ? {
        id: priceExtremes.mostExpensive.id,
        name: priceExtremes.mostExpensive.name,
        costPrice: parseFloat(priceExtremes.mostExpensive.costPrice.toString()),
      } : null,
      cheapestPart: priceExtremes.cheapest ? {
        id: priceExtremes.cheapest.id,
        name: priceExtremes.cheapest.name,
        costPrice: parseFloat(priceExtremes.cheapest.costPrice.toString()),
      } : null,
    };
  }

  /**
   * 🔍 Интеллектуальный поиск запчастей
   */
  async searchParts(searchTerm: string, companyId: string, limit: number = 10): Promise<Part[]> {
    this.logger.log(`Searching parts: "${searchTerm}" for company: ${companyId}`);

    // Логируем поиск для аналитики
    await this.auditService.log('PARTS_SEARCHED' as any, {
      entityType: 'Part',
      companyId,
      metadata: {
        searchTerm,
        limit,
        searchLength: searchTerm.length,
      },
    });

    return this.partsDataService.advancedSearch(searchTerm, companyId, limit);
  }

  /**
   * 📈 Получение популярных запчастей
   */
  async getPopularParts(companyId: string, limit: number = 20): Promise<Part[]> {
    return this.partsDataService.getPopularParts(companyId, limit);
  }

  /**
   * 💰 Анализ прибыльности запчастей
   */
  async analyzeProfitability(companyId: string): Promise<{
    highMarginParts: Array<{ part: Part; marginPercent: number }>;
    lowMarginParts: Array<{ part: Part; marginPercent: number }>;
    averageMargin: number;
  }> {
    // Получаем все активные запчасти
    const [parts] = await this.partsDataService.findWithFilters({
      companyId,
      isActive: true,
      limit: 1000, // Ограничиваем для производительности
    });

    const partsWithMargin = parts.map(part => ({
      part,
      marginPercent: this.calculateMarginPercent(part.costPrice, part.sellingPrice),
    }));

    // Сортируем по марже
    partsWithMargin.sort((a, b) => b.marginPercent - a.marginPercent);

    const averageMargin = partsWithMargin.reduce((sum, item) => sum + item.marginPercent, 0) / partsWithMargin.length;

    return {
      highMarginParts: partsWithMargin.slice(0, 10), // Топ 10 с высокой маржой
      lowMarginParts: partsWithMargin.slice(-10), // Топ 10 с низкой маржой
      averageMargin,
    };
  }

  /**
   * 🔗 Интеграция с inventory - получение запчасти с остатками
   */
  async getPartWithInventory(partId: string, companyId: string): Promise<Part | null> {
    const part = await this.partsDataService.findByIdAndCompany(partId, companyId);
    
    if (part) {
      // Логируем просмотр запчасти
      await this.auditService.log('PART_VIEWED' as any, {
        entityType: 'Part',
        entityId: part.id,
        companyId: part.companyId,
        metadata: {
          partName: part.name,
          partNumber: part.partNumber,
          brand: part.brand,
          viewType: 'detailed_with_inventory',
        },
      });
    }

    return part;
  }

  /**
   * 📊 Расчет процента наценки
   */
  private calculateMarginPercent(costPrice: number, sellingPrice: number): number {
    if (costPrice === 0) return 0;
    return Math.round(((sellingPrice - costPrice) / costPrice) * 100 * 100) / 100;
  }

  /**
   * 🧹 Очистка данных запчасти для аудита
   */
  private sanitizePartData(part: Part | null): Partial<Part> {
    if (!part) return {};
    
    const { 
      id, name, partNumber, brand, description, costPrice, sellingPrice, 
      isActive, categoryId, companyId, createdAt, updatedAt 
    } = part;
    
    return { 
      id, name, partNumber, brand, description, costPrice, sellingPrice, 
      isActive, categoryId, companyId, createdAt, updatedAt 
    };
  }

  /**
   * 📊 Определение изменений для аудита
   */
  private detectChanges(original: Part | null, updated: Part): Record<string, any> {
    if (!original) return {};
    
    const changes: Record<string, any> = {};
    const fields = ['name', 'partNumber', 'brand', 'description', 'costPrice', 'sellingPrice', 'categoryId', 'isActive'];
    
    fields.forEach(field => {
      if (original[field] !== updated[field]) {
        changes[field] = {
          from: original[field],
          to: updated[field],
        };
      }
    });

    return changes;
  }
}
