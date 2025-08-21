// src/modules/inventory/suppliers/services/suppliers-business.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { SuppliersDataService } from './suppliers-data.service';
import { SuppliersValidationService } from './suppliers-validation.service';
import { Supplier } from '../../../../database/entities';
import {
  CreateSupplierData,
  UpdateSupplierData,
  SupplierRatingData,
  BulkSupplierResult,
  SupplierAnalytics,
  TopSupplierMetrics,
  SupplierRating,
} from '../types/suppliers.types';
import { BulkSuppliersDto } from '../dto/request/bulk-suppliers.dto';
import { RequestWithUser } from '../../../auth/interfaces/request-with-user.interface';
import { AuditService, AuditAction } from '../../../../common/audit/audit.service';
import { SupplierNotFoundException } from '../../../../common/exceptions/domain.exceptions';

@Injectable()
export class SuppliersBusinessService {
  private readonly logger = new Logger(SuppliersBusinessService.name);

  constructor(
    private readonly suppliersDataService: SuppliersDataService,
    private readonly suppliersValidationService: SuppliersValidationService,
    private readonly auditService: AuditService,
  ) {}

  private maskEmail(email?: string | null) {
    if (!email) return undefined;
    const [name, domain] = email.split('@');
    if (!domain) return '***';
    const maskedName = name.length <= 2 ? '*'.repeat(name.length) : name[0] + '***' + name.slice(-1);
    return `${maskedName}@${domain}`;
    }

  private maskPhone(phone?: string | null) {
    if (!phone) return undefined;
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 6) return '***';
    return phone.replace(/\d(?=\d{4})/g, '*');
  }

  private maskName(name?: string | null) {
    if (!name) return undefined;
    if (name.length <= 2) return '*'.repeat(name.length);
    return name[0] + '***' + name.slice(-1);
  }

  /**
   * 📝 Создание нового поставщика с бизнес-логикой
   */
  async createSupplier(data: CreateSupplierData, user: RequestWithUser['user']): Promise<Supplier> {
    this.logger.log(`Creating supplier: ${data.name} for company ${data.companyId}`);

    const supplier = await this.suppliersDataService.create(data);

    this.logger.log(`Created supplier: ${supplier.name} (${supplier.id}) for company ${supplier.companyId}`);

    await this.auditService.log(AuditAction.SUPPLIER_CREATED, {
      entityType: 'Supplier',
      entityId: supplier.id,
      companyId: supplier.companyId,
      userId: user.id,
      metadata: {
        supplierName: supplier.name,
        contactName: this.maskName(supplier.contactName || undefined),
        email: this.maskEmail(supplier.email || undefined),
        phone: this.maskPhone(supplier.phone || undefined),
        supplierType: data.supplierType,
        city: supplier.city,
        country: supplier.country,
        initialStatus: supplier.isActive,
      },
      changes: {
        after: this.sanitizeSupplierData(supplier),
      },
    });

    return supplier;
  }

  /**
   * 📝 Обновление поставщика с бизнес-логикой
   */
  async updateSupplier(id: string, data: UpdateSupplierData, user: RequestWithUser['user']): Promise<Supplier> {
    this.logger.log(`Updating supplier: ${id}`);

    const oldSupplier = await this.suppliersDataService.findById(id);
    const updatedSupplier = await this.suppliersDataService.update(id, data);

    this.logger.log(`Updated supplier: ${updatedSupplier.name} (${updatedSupplier.id})`);

    const changes = this.detectChanges(oldSupplier, updatedSupplier);
    const isContactInfoChange = !!(changes.email || changes.phone || changes.contactName);
    const isAddressChange = !!(changes.address || changes.city || changes.country);

    const auditAction = isContactInfoChange
      ? AuditAction.SUPPLIER_CONTACT_UPDATED
      : isAddressChange
      ? AuditAction.SUPPLIER_ADDRESS_UPDATED
      : AuditAction.SUPPLIER_UPDATED;

    await this.auditService.log(auditAction, {
      entityType: 'Supplier',
      entityId: updatedSupplier.id,
      companyId: updatedSupplier.companyId,
      userId: user.id,
      metadata: {
        supplierName: updatedSupplier.name,
        updatedFields: Object.keys(data),
        hasContactChanges: isContactInfoChange,
        hasAddressChanges: isAddressChange,
        changesSummary: Object.keys(changes).join(', '),
      },
      changes: {
        before: this.sanitizeSupplierData(oldSupplier),
        after: this.sanitizeSupplierData(updatedSupplier),
      },
    });

    return updatedSupplier;
  }

  /**
   * 🗑️ Деактивация поставщика
   */
  async deactivateSupplier(id: string, user: RequestWithUser['user']): Promise<Supplier> {
    this.logger.log(`Deactivating supplier: ${id}`);

    const supplier = await this.suppliersDataService.findById(id);

    await this.suppliersDataService.softDelete(id);

    const deactivatedSupplier = await this.suppliersDataService.findById(id);

    this.logger.log(`Deactivated supplier: ${supplier?.name} (${id})`);

    await this.auditService.log(AuditAction.SUPPLIER_DEACTIVATED, {
      entityType: 'Supplier',
      entityId: id,
      companyId: supplier?.companyId,
      userId: user.id,
      metadata: {
        supplierName: supplier?.name,
        contactName: this.maskName(supplier?.contactName || undefined),
        email: this.maskEmail(supplier?.email || undefined),
        action: 'deactivated',
        hasOrderHistory: await this.suppliersDataService.hasOrderHistory(id, user.companyId),
      },
      changes: {
        before: { isActive: true },
        after: { isActive: false },
      },
    });

    return deactivatedSupplier!;
  }

  /**
   * ⭐ Создание оценки поставщика
   */
  async rateSupplier(
    id: string,
    ratingData: SupplierRatingData,
    user: RequestWithUser['user'],
  ): Promise<SupplierRating> {
    this.logger.log(`Rating supplier: ${id} by user: ${user.id}`);

    const supplier = await this.suppliersDataService.findById(id);

    if (!supplier) {
      throw new SupplierNotFoundException(id);
    }

    const averageRating = this.calculateAverageRating(ratingData);

    const rating: SupplierRating = {
      id: `rating-${Date.now()}`,
      supplierId: id,
      companyId: user.companyId,
      ratedBy: user.id,
      qualityRating: ratingData.qualityRating,
      deliveryRating: ratingData.deliveryRating,
      priceRating: ratingData.priceRating,
      communicationRating: ratingData.communicationRating,
      averageRating,
      comment: ratingData.comment,
      createdAt: new Date(),
    };

    await this.auditService.log(AuditAction.SUPPLIER_RATED, {
      entityType: 'SupplierRating',
      entityId: rating.id,
      companyId: user.companyId,
      userId: user.id,
      metadata: {
        supplierId: id,
        supplierName: supplier.name,
        qualityRating: ratingData.qualityRating,
        deliveryRating: ratingData.deliveryRating,
        priceRating: ratingData.priceRating,
        communicationRating: ratingData.communicationRating,
        averageRating,
        hasComment: !!ratingData.comment,
        commentLength: ratingData.comment?.length || 0,
      },
      changes: {
        after: { ...ratingData, averageRating },
      },
    });

    this.logger.log(`Supplier rated: ${id}, average rating: ${averageRating}`);
    return rating;
  }

  /**
   * 💰 Сравнение цен на запчасть между поставщиками
   */
  async comparePartPrices(partId: string, companyId: string): Promise<any> {
    this.logger.log(`Comparing prices for part: ${partId} in company: ${companyId}`);

    const priceComparison = await this.suppliersDataService.comparePartPrices(partId, companyId);

    await this.auditService.log(AuditAction.SUPPLIER_PRICE_COMPARISON, {
      entityType: 'PriceComparison',
      companyId,
      metadata: {
        partId,
        suppliersCount: priceComparison.suppliers.length,
        bestPrice: priceComparison.bestPrice.price,
        worstPrice: priceComparison.priceRange.max,
        potentialSavings: priceComparison.bestPrice.savings,
        averagePrice: priceComparison.priceRange.average,
      },
    });

    return priceComparison;
  }

  /**
   * 📊 Получение аналитики поставщика
   */
  async getSupplierAnalytics(
    id: string,
    period: 'month' | 'quarter' | 'year',
    companyId: string,
  ): Promise<Partial<SupplierAnalytics>> {
    this.logger.log(`Getting analytics for supplier: ${id}, period: ${period}`);

    const analytics = await this.suppliersDataService.getSupplierAnalytics(id, companyId, period);
    const supplier = await this.suppliersDataService.findByIdForCompany(id, companyId);

    if (!supplier) {
      throw new SupplierNotFoundException(id);
    }

    const enhancedAnalytics: Partial<SupplierAnalytics> = {
      ...analytics,
      supplierName: supplier.name,
      period,
    };

    await this.auditService.log(AuditAction.SUPPLIER_ANALYTICS_VIEWED, {
      entityType: 'SupplierAnalytics',
      entityId: id,
      companyId,
      metadata: {
        supplierId: id,
        supplierName: supplier.name,
        period,
        totalOrders: analytics.totalOrders,
        analyticsType: 'detailed_report',
      },
    });

    return enhancedAnalytics;
  }

  /**
   * 📦 Массовые операции с поставщиками
   */
  async bulkOperations(bulkData: BulkSuppliersDto, user: RequestWithUser['user']): Promise<BulkSupplierResult> {
    this.logger.log(`Bulk operation: ${bulkData.operation} for ${bulkData.suppliers.length} suppliers`);

    const results: BulkSupplierResult['results'] = [];
    let successCount = 0;
    let failureCount = 0;
    const startTime = Date.now();

    for (const [index, supplierItem] of bulkData.suppliers.entries()) {
      const identifier = supplierItem.id || supplierItem.email || supplierItem.taxNumber || `item-${index}`;

      try {
        let supplierId: string | undefined;

        switch (bulkData.operation) {
          case 'create': {
            const createData: CreateSupplierData = {
              ...supplierItem,
              companyId: user.companyId,
              createdBy: user.id,
              isActive: supplierItem.isActive ?? true,
              supplierType: supplierItem.supplierType || 'distributor',
            };
            const createdSupplier = await this.createSupplier(createData, user);
            supplierId = createdSupplier.id;
            break;
          }
          case 'update': {
            if (!supplierItem.id) {
              throw new Error('ID поставщика обязателен для операции обновления');
            }
            const updatedSupplier = await this.updateSupplier(supplierItem.id, supplierItem, user);
            supplierId = updatedSupplier.id;
            break;
          }
          case 'deactivate': {
            if (!supplierItem.id) {
              throw new Error('ID поставщика обязателен для деактивации');
            }
            await this.deactivateSupplier(supplierItem.id, user);
            supplierId = supplierItem.id;
            break;
          }
          case 'activate': {
            if (!supplierItem.id) {
              throw new Error('ID поставщика обязателен для активации');
            }
            await this.suppliersDataService.update(supplierItem.id, { isActive: true });
            supplierId = supplierItem.id;
            break;
          }
        }

        results.push({ identifier, success: true, supplierId });
        successCount++;
      } catch (error: any) {
        results.push({
          identifier,
          success: false,
          error: error instanceof Error ? error.message : 'Неизвестная ошибка',
        });
        failureCount++;
        this.logger.error(`Failed bulk operation for supplier ${identifier}: ${error?.message || error}`);
      }
    }

    const processingTime = Date.now() - startTime;

    const errorGroups: Record<string, number> = {};
    results.forEach((result) => {
      if (!result.success && result.error) {
        const type = this.categorizeError(result.error);
        errorGroups[type] = (errorGroups[type] || 0) + 1;
      }
    });

    await this.auditService.log(AuditAction.SUPPLIERS_BULK_OPERATION, {
      entityType: 'BulkSupplierOperation',
      entityId: `bulk-${Date.now()}`,
      companyId: user.companyId,
      userId: user.id,
      metadata: {
        operation: bulkData.operation,
        totalItems: bulkData.suppliers.length,
        successCount,
        failureCount,
        processingTimeMs: processingTime,
        errorGroups,
        successRate: Math.round((successCount / bulkData.suppliers.length) * 100),
      },
    });

    this.logger.log(`Bulk operation completed: ${successCount} success, ${failureCount} failures in ${processingTime}ms`);

    return {
      successCount,
      failureCount,
      results,
      summary: {
        operation: bulkData.operation,
        totalProcessed: bulkData.suppliers.length,
        processingTime,
        errors: errorGroups,
      },
    };
  }

  private calculateAverageRating(ratingData: SupplierRatingData): number {
    const ratings = [ratingData.qualityRating, ratingData.deliveryRating, ratingData.priceRating];
    if (ratingData.communicationRating !== undefined) ratings.push(ratingData.communicationRating);
    const sum = ratings.reduce((acc, r) => acc + r, 0);
    return Math.round((sum / ratings.length) * 100) / 100;
  }

  private sanitizeSupplierData(supplier: Supplier | null): Partial<Supplier> {
    if (!supplier) return {};
    const { id, name, contactName, email, phone, address, city, country, website, notes, isActive, companyId, createdAt, updatedAt } =
      supplier;
    return { id, name, contactName, email, phone, address, city, country, website, notes, isActive, companyId, createdAt, updatedAt };
  }

  private detectChanges(original: Supplier | null, updated: Supplier): Record<string, any> {
    if (!original) return {};
    const changes: Record<string, any> = {};
    const fields = ['name', 'contactName', 'email', 'phone', 'address', 'city', 'country', 'website', 'notes', 'isActive'];
    fields.forEach((field) => {
      if ((original as any)[field] !== (updated as any)[field]) {
        changes[field] = { from: (original as any)[field], to: (updated as any)[field] };
      }
    });
    return changes;
  }

  private categorizeError(error: string): string {
    if (error.includes('email')) return 'email_validation';
    if (error.includes('налоговый')) return 'tax_number_validation';
    if (error.includes('лимит')) return 'company_limits';
    if (error.includes('права')) return 'permissions';
    if (error.includes('существует')) return 'duplicate_data';
    return 'other';
  }
}
