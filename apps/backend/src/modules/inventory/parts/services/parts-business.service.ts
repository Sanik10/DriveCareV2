// path: apps/backend/src/modules/inventory/parts/services/parts-business.service.ts
import { Injectable, Logger, ConflictException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PartsDataService } from './parts-data.service';
import { PartsValidationService } from './parts-validation.service';
import { Part } from '../../../../database/entities';
import { CreatePartData, UpdatePartData, BulkUpdatePartData, PartStats } from '../types/parts.types';
import { RequestWithUser } from '../../../auth/interfaces/request-with-user.interface';
import { AuditService, AuditAction } from '../../../../common/audit/audit.service';
import { BulkOperationResult } from '../types/parts.types';
import { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../../../../common/redis/redis.constants';

@Injectable()
export class PartsBusinessService {
  private readonly logger = new Logger(PartsBusinessService.name);
  private readonly idempTtlMs: number;

  constructor(
    private readonly partsDataService: PartsDataService,
    private readonly partsValidationService: PartsValidationService,
    private readonly auditService: AuditService,
    private readonly configService: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {
    this.idempTtlMs = this.configService.get<number>('inventory.idempotencyTtlMs', 900000);
  }

  async createPart(data: CreatePartData, user: RequestWithUser['user']): Promise<Part> {
    this.logger.log(`Creating part: ${data.name} for company ${data.companyId}`);
    const part = await this.partsDataService.create(data);

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
      changes: { after: this.sanitizePartData(part) },
    });

    return part;
  }

  async updatePart(id: string, data: UpdatePartData, user: RequestWithUser['user']): Promise<Part> {
    this.logger.log(`Updating part: ${id}`);
    const oldPart = await this.partsDataService.findById(id);
    const updatedPart = await this.partsDataService.update(id, data);

    const changes = this.detectChanges(oldPart, updatedPart);
    const isPriceChange = !!(changes as any)['costPrice'] || !!(changes as any)['sellingPrice'];
    const auditAction: AuditAction = isPriceChange ? AuditAction.PART_PRICE_CHANGED : AuditAction.PART_UPDATED;

    await this.auditService.log(auditAction, {
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
      changes: { before: this.sanitizePartData(oldPart), after: this.sanitizePartData(updatedPart) },
    });

    return updatedPart;
  }

  async setPartActive(id: string, isActive: boolean, user: RequestWithUser['user']): Promise<Part> {
    this.logger.log(`Setting part ${id} active status to: ${isActive}`);
    const part = await this.partsDataService.setActive(id, isActive);

    await this.auditService.log(AuditAction.PART_STATUS_CHANGED, {
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
      changes: { before: { isActive: !isActive }, after: { isActive } },
    });

    return part;
  }

  async deletePart(id: string, user: RequestWithUser['user']): Promise<void> {
    const part = await this.partsDataService.findById(id);
    await this.partsDataService.softDelete(id);
    this.logger.log(`Deleted part: ${part?.name} (${id})`);

    await this.auditService.log(AuditAction.PART_DELETED, {
      entityType: 'Part',
      entityId: id,
      companyId: part?.companyId,
      userId: user.id,
      metadata: { partName: part?.name, partNumber: part?.partNumber, brand: part?.brand, action: 'soft_deleted' },
      changes: { before: this.sanitizePartData(part), after: { isActive: false } },
    });
  }

  async bulkUpdateParts(
    partIds: string[],
    updateData: BulkUpdatePartData['updateData'],
    user: RequestWithUser['user'],
    idempotencyKey?: string,
  ): Promise<BulkOperationResult> {
    this.logger.log(`Bulk updating ${partIds.length} parts for company: ${user.companyId}`);

    const resultKey = idempotencyKey ? `idemp:parts:bulk:result:${user.companyId}:${idempotencyKey}` : null;
    const lockKey = idempotencyKey ? `idemp:parts:bulk:lock:${user.companyId}:${idempotencyKey}` : null;

    if (resultKey) {
      const cached = await this.redis.get(resultKey);
      if (cached) {
        const parsed: BulkOperationResult = JSON.parse(cached);
        return parsed;
      }
      const ok = await this.redis.set(lockKey!, '1', 'PX', this.idempTtlMs, 'NX');
      if (!ok) {
        throw new ConflictException('Bulk operation with the same X-Idempotency-Key is already in progress');
      }
    }

    let successCount = 0;
    let failureCount = 0;
    const errors: Array<{ partId: string; error: string }> = [];

    const oldParts = await this.partsDataService.findMultipleByIds(partIds, user.companyId!);

    try {
      const affectedCount = await this.partsDataService.bulkUpdate(partIds, updateData, user.companyId!);
      successCount = affectedCount;

      await this.auditService.log(AuditAction.PARTS_BULK_UPDATED, {
        entityType: 'Part',
        companyId: user.companyId!,
        userId: user.id,
        metadata: {
          affectedPartsCount: successCount,
          updateData,
          partIds: partIds.slice(0, 10),
          totalRequested: partIds.length,
        },
        changes: { before: { partsCount: oldParts.length }, after: { updatedCount: successCount } },
      });
    } catch (error: any) {
      failureCount = partIds.length;
      partIds.forEach((partId) => {
        errors.push({ partId, error: error?.message || 'Unknown error during bulk update' });
      });
    } finally {
      if (resultKey) {
        const result: BulkOperationResult = { successCount, failureCount, errors };
        await this.redis.set(resultKey, JSON.stringify(result), 'PX', this.idempTtlMs);
        await this.redis.del(lockKey!);
      }
    }

    this.logger.log(`Bulk update completed: ${successCount} success, ${failureCount} failures`);
    return { successCount, failureCount, errors };
  }

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
      mostExpensivePart: priceExtremes.mostExpensive
        ? {
            id: priceExtremes.mostExpensive.id,
            name: priceExtremes.mostExpensive.name,
            costPrice: parseFloat(priceExtremes.mostExpensive.costPrice.toString()),
          }
        : null,
      cheapestPart: priceExtremes.cheapest
        ? {
            id: priceExtremes.cheapest.id,
            name: priceExtremes.cheapest.name,
            costPrice: parseFloat(priceExtremes.cheapest.costPrice.toString()),
          }
        : null,
    };
  }

  async searchParts(searchTerm: string, companyId: string, limit: number = 10): Promise<Part[]> {
    this.logger.log(`Searching parts: "${searchTerm}" for company: ${companyId}`);

    await this.auditService.log(AuditAction.PARTS_SEARCHED, {
      entityType: 'Part',
      companyId,
      metadata: { searchTerm, limit, searchLength: searchTerm.length },
    });

    return this.partsDataService.advancedSearch(searchTerm, companyId, limit);
  }

  async getPopularParts(companyId: string, limit: number = 20): Promise<Part[]> {
    return this.partsDataService.getPopularParts(companyId, limit);
  }

  async analyzeProfitability(companyId: string): Promise<{
    highMarginParts: Array<{ part: Part; marginPercent: number }>;
    lowMarginParts: Array<{ part: Part; marginPercent: number }>;
    averageMargin: number;
  }> {
    const [parts] = await this.partsDataService.findWithFilters({ companyId, isActive: true, limit: 1000 });
    const partsWithMargin = parts.map((part) => ({
      part,
      marginPercent: this.calculateMarginPercent(part.costPrice, part.sellingPrice),
    }));
    partsWithMargin.sort((a, b) => b.marginPercent - a.marginPercent);
    const averageMargin = partsWithMargin.reduce((sum, item) => sum + item.marginPercent, 0) / (partsWithMargin.length || 1);
    return {
      highMarginParts: partsWithMargin.slice(0, 10),
      lowMarginParts: partsWithMargin.slice(-10),
      averageMargin,
    };
  }

  async getPartWithInventory(partId: string, companyId: string): Promise<Part | null> {
    const part = await this.partsDataService.findByIdAndCompany(partId, companyId);
    if (part) {
      await this.auditService.log(AuditAction.PART_VIEWED, {
        entityType: 'Part',
        entityId: part.id,
        companyId: part.companyId,
        metadata: { partName: part.name, partNumber: part.partNumber, brand: part.brand, viewType: 'detailed_with_inventory' },
      });
    }
    return part;
  }

  private calculateMarginPercent(costPrice: number, sellingPrice: number): number {
    if (!costPrice) return 0;
    return Math.round(((sellingPrice - costPrice) / costPrice) * 100 * 100) / 100;
  }

  private sanitizePartData(part: Part | null): Partial<Part> {
    if (!part) return {};
    const { id, name, partNumber, brand, description, costPrice, sellingPrice, isActive, categoryId, companyId, createdAt, updatedAt } = part;
    return { id, name, partNumber, brand, description, costPrice, sellingPrice, isActive, categoryId, companyId, createdAt, updatedAt };
  }

  private detectChanges(original: Part | null, updated: Part): Record<string, any> {
    if (!original) return {};
    const fields = ['name', 'partNumber', 'brand', 'description', 'costPrice', 'sellingPrice', 'categoryId', 'isActive'];
    const changes: Record<string, any> = {};
    fields.forEach((field) => {
      if ((original as any)[field] !== (updated as any)[field]) {
        changes[field] = { from: (original as any)[field], to: (updated as any)[field] };
      }
    });
    return changes;
  }
}
