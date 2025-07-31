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
  SupplierRating
} from '../types/suppliers.types';
import { BulkSuppliersDto } from '../dto/request/bulk-suppliers.dto';
import { RequestWithUser } from '../../../auth/interfaces/request-with-user.interface';
import { AuditService, AuditAction } from '../../../../common/audit/audit.service';
import { 
  SupplierNotFoundException,
  ValidationDataException 
} from '../../../../common/exceptions/domain.exceptions';
import { SUPPLIER_CONSTRAINTS } from '../types/suppliers.types';

@Injectable()
export class SuppliersBusinessService {
  private readonly logger = new Logger(SuppliersBusinessService.name);

  constructor(
    private readonly suppliersDataService: SuppliersDataService,
    private readonly suppliersValidationService: SuppliersValidationService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * 📝 Создание нового поставщика с бизнес-логикой
   */
  async createSupplier(data: CreateSupplierData, user: RequestWithUser['user']): Promise<Supplier> {
    this.logger.log(`Creating supplier: ${data.name} for company ${data.companyId}`);

    const supplier = await this.suppliersDataService.create(data);
    
    this.logger.log(`Created supplier: ${supplier.name} (${supplier.id}) for company ${supplier.companyId}`);
    
    // 🔥 Audit логирование
    await this.auditService.log(AuditAction.SUPPLIER_CREATED, {
      entityType: 'Supplier',
      entityId: supplier.id,
      companyId: supplier.companyId,
      userId: user.id,
      metadata: {
        supplierName: supplier.name,
        contactName: supplier.contactName,
        email: supplier.email,
        phone: supplier.phone,
        supplierType: data.supplierType,
        city: supplier.city,
        country: supplier.country,
        initialStatus: supplier.isActive,
      },
      changes: { 
        after: this.sanitizeSupplierData(supplier) 
      },
    });

    return supplier;
  }

  /**
   * 📝 Обновление поставщика с бизнес-логикой
   */
  async updateSupplier(
    id: string, 
    data: UpdateSupplierData, 
    user: RequestWithUser['user']
  ): Promise<Supplier> {
    this.logger.log(`Updating supplier: ${id}`);

    const oldSupplier = await this.suppliersDataService.findById(id);
    const updatedSupplier = await this.suppliersDataService.update(id, data);
    
    this.logger.log(`Updated supplier: ${updatedSupplier.name} (${updatedSupplier.id})`);
    
    // Определяем изменения для аудита
    const changes = this.detectChanges(oldSupplier, updatedSupplier);
    const isContactInfoChange = changes.email || changes.phone || changes.contactName;
    const isAddressChange = changes.address || changes.city || changes.country;
    
    // 🔥 Audit логирование
    const auditAction = isContactInfoChange 
      ? 'SUPPLIER_CONTACT_UPDATED' 
      : isAddressChange 
        ? 'SUPPLIER_ADDRESS_UPDATED'
        : AuditAction.SUPPLIER_UPDATED;
    
    await this.auditService.log(auditAction as any, {
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
    
    // 🔥 Audit логирование
    await this.auditService.log(AuditAction.SUPPLIER_DEACTIVATED, {
      entityType: 'Supplier',
      entityId: id,
      companyId: supplier?.companyId,
      userId: user.id,
      metadata: {
        supplierName: supplier?.name,
        contactName: supplier?.contactName,
        email: supplier?.email,
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
    user: RequestWithUser['user']
  ): Promise<SupplierRating> {
    this.logger.log(`Rating supplier: ${id} by user: ${user.id}`);

    const supplier = await this.suppliersDataService.findById(id);
    
    if (!supplier) {
      throw new SupplierNotFoundException(id);
    }

    // 📊 Расчет общего рейтинга
    const averageRating = this.calculateAverageRating(ratingData);

    // TODO: Создание записи в таблице supplier_ratings
    // Пока создаем объект для возврата
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

    // 🔥 Audit логирование
    await this.auditService.log('SUPPLIER_RATED' as any, {
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

    // 🔥 Audit логирование поиска цен
    await this.auditService.log('SUPPLIER_PRICE_COMPARISON' as any, {
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
    companyId: string
  ): Promise<Partial<SupplierAnalytics>> {
    this.logger.log(`Getting analytics for supplier: ${id}, period: ${period}`);

    const analytics = await this.suppliersDataService.getSupplierAnalytics(id, companyId, period);
    const supplier = await this.suppliersDataService.findByIdForCompany(id, companyId);

    if (!supplier) {
      throw new SupplierNotFoundException(id);
    }

    // 📊 Дополнительные расчеты
    const enhancedAnalytics: Partial<SupplierAnalytics> = {
      ...analytics,
      supplierName: supplier.name,
      period,
      // TODO: Добавить расчет рейтинговых данных
      // currentRating: await this.calculateCurrentRating(id),
      // ratingTrend: await this.calculateRatingTrend(id, period),
    };

    // 🔥 Audit логирование просмотра аналитики
    await this.auditService.log('SUPPLIER_ANALYTICS_VIEWED' as any, {
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
  async bulkOperations(
    bulkData: BulkSuppliersDto,
    user: RequestWithUser['user']
  ): Promise<BulkSupplierResult> {
    this.logger.log(`Bulk operation: ${bulkData.operation} for ${bulkData.suppliers.length} suppliers`);

    const results: BulkSupplierResult['results'] = [];
    let successCount = 0;
    let failureCount = 0;
    const startTime = Date.now();

    // 📦 Обрабатываем каждого поставщика
    for (const [index, supplierItem] of bulkData.suppliers.entries()) {
      const identifier = supplierItem.id || supplierItem.email || supplierItem.taxNumber || `item-${index}`;
      
      try {
        let supplierId: string | undefined;

        switch (bulkData.operation) {
          case 'create':
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

          case 'update':
            if (!supplierItem.id) {
              throw new Error('ID поставщика обязателен для операции обновления');
            }
            const updatedSupplier = await this.updateSupplier(supplierItem.id, supplierItem, user);
            supplierId = updatedSupplier.id;
            break;

          case 'deactivate':
            if (!supplierItem.id) {
              throw new Error('ID поставщика обязателен для деактивации');
            }
            await this.deactivateSupplier(supplierItem.id, user);
            supplierId = supplierItem.id;
            break;

          case 'activate':
            if (!supplierItem.id) {
              throw new Error('ID поставщика обязателен для активации');
            }
            // TODO: Реализовать активацию
            await this.suppliersDataService.update(supplierItem.id, { isActive: true });
            supplierId = supplierItem.id;
            break;
        }

        results.push({
          identifier,
          success: true,
          supplierId,
        });

        successCount++;

      } catch (error) {
        results.push({
          identifier,
          success: false,
          error: error instanceof Error ? error.message : 'Неизвестная ошибка',
        });

        failureCount++;
        this.logger.error(`Failed bulk operation for supplier ${identifier}: ${error}`);
      }
    }

    const processingTime = Date.now() - startTime;

    // 📊 Группировка ошибок
    const errorGroups: Record<string, number> = {};
    results.forEach(result => {
      if (!result.success && result.error) {
        const errorType = this.categorizeError(result.error);
        errorGroups[errorType] = (errorGroups[errorType] || 0) + 1;
      }
    });

    // 🔥 Audit логирование bulk операции
    await this.auditService.log('SUPPLIERS_BULK_OPERATION' as any, {
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

  /**
   * 🔍 Поиск лучшего поставщика для запчасти
   */
  async findBestSupplierForPart(
    partId: string,
    prioritize: 'price' | 'quality' | 'delivery',
    companyId: string
  ): Promise<any> {
    this.logger.log(`Finding best supplier for part: ${partId}, prioritize: ${prioritize}`);

    // 🔍 Получаем всех поставщиков для этой запчасти
    const suppliers = await this.suppliersDataService.findActiveSuppliersForPart(partId, companyId);
    
    if (suppliers.length === 0) {
      return {
        partId,
        bestSupplier: null,
        alternatives: [],
        message: 'Активные поставщики для данной запчасти не найдены',
      };
    }

    // 📊 Анализируем каждого поставщика
    const supplierScores = await Promise.all(
      suppliers.map(async (supplier) => {
        const stats = await this.suppliersDataService.getSupplierStatistics(supplier.id, companyId);
        
        // 📊 Расчет score на основе приоритета
        const score = this.calculateSupplierScore(
          {
            price: 80, // TODO: Получить реальную цену
            quality: stats.onTimeDeliveryRate,
            delivery: Math.max(0, 100 - stats.averageDeliveryTime * 10),
            reliability: stats.onTimeDeliveryRate,
          },
          prioritize
        );

        return {
          id: supplier.id,
          name: supplier.name,
          price: 80, // TODO: Получить реальную цену
          rating: 4.2, // TODO: Получить реальный рейтинг
          deliveryTime: stats.averageDeliveryTime,
          score,
        };
      })
    );

    // Сортируем по score
    supplierScores.sort((a, b) => b.score - a.score);

    const bestSupplier = supplierScores[0];
    const alternatives = supplierScores.slice(1, 4); // Топ 3 альтернативы

    // 🔥 Audit логирование поиска
    await this.auditService.log('BEST_SUPPLIER_SEARCH' as any, {
      entityType: 'SupplierRecommendation',
      companyId,
      metadata: {
        partId,
        prioritize,
        candidatesCount: suppliers.length,
        bestSupplierId: bestSupplier.id,
        bestSupplierScore: bestSupplier.score,
        searchCriteria: prioritize,
      },
    });

    return {
      partId,
      bestSupplier,
      alternatives: alternatives.map(alt => ({
        id: alt.id,
        name: alt.name,
        score: alt.score,
        mainAdvantage: this.determineMainAdvantage(alt, prioritize),
      })),
    };
  }

  /**
   * 📈 Топ поставщики компании
   */
  async getTopPerformers(
    companyId: string,
    period: 'month' | 'quarter' | 'year',
    limit: number
  ): Promise<TopSupplierMetrics[]> {
    this.logger.log(`Getting top performers for company: ${companyId}, period: ${period}`);

    const topSuppliers = await this.suppliersDataService.getTopPerformers(companyId, period, limit);

    // 🔥 Audit логирование просмотра топа
    await this.auditService.log('TOP_SUPPLIERS_VIEWED' as any, {
      entityType: 'TopSuppliersReport',
      companyId,
      metadata: {
        period,
        limit,
        topSuppliersCount: topSuppliers.length,
        reportType: 'performance_ranking',
      },
    });

    return topSuppliers;
  }

  /**
   * 📊 Расчет среднего рейтинга
   */
  private calculateAverageRating(ratingData: SupplierRatingData): number {
    const ratings = [
      ratingData.qualityRating,
      ratingData.deliveryRating,
      ratingData.priceRating,
    ];

    if (ratingData.communicationRating !== undefined) {
      ratings.push(ratingData.communicationRating);
    }

    const sum = ratings.reduce((acc, rating) => acc + rating, 0);
    return Math.round((sum / ratings.length) * 100) / 100;
  }

  /**
   * 📊 Расчет score поставщика
   */
  private calculateSupplierScore(
    metrics: {
      price: number;
      quality: number;
      delivery: number;
      reliability: number;
    },
    prioritize: 'price' | 'quality' | 'delivery'
  ): number {
    const weights = {
      price: prioritize === 'price' ? 0.5 : 0.2,
      quality: prioritize === 'quality' ? 0.5 : 0.2,
      delivery: prioritize === 'delivery' ? 0.5 : 0.2,
      reliability: 0.1,
    };

    const score = 
      metrics.price * weights.price +
      metrics.quality * weights.quality +
      metrics.delivery * weights.delivery +
      metrics.reliability * weights.reliability;

    return Math.round(score * 100) / 100;
  }

  /**
   * 🎯 Определение главного преимущества поставщика
   */
  private determineMainAdvantage(supplier: any, prioritize: string): string {
    if (prioritize === 'price') return 'Лучшая цена';
    if (prioritize === 'quality') return 'Высокое качество';
    if (prioritize === 'delivery') return 'Быстрая доставка';
    return 'Надежность';
  }

  /**
   * 📊 Категоризация ошибок для группировки
   */
  private categorizeError(error: string): string {
    if (error.includes('email')) return 'email_validation';
    if (error.includes('налоговый')) return 'tax_number_validation';
    if (error.includes('лимит')) return 'company_limits';
    if (error.includes('права')) return 'permissions';
    if (error.includes('существует')) return 'duplicate_data';
    return 'other';
  }

  /**
   * 🧹 Очистка данных поставщика для аудита
   */
  private sanitizeSupplierData(supplier: Supplier | null): Partial<Supplier> {
    if (!supplier) return {};
    
    const { 
      id, name, contactName, email, phone, address, city, country,
      website, notes, isActive, companyId, createdAt, updatedAt 
    } = supplier;
    
    return { 
      id, name, contactName, email, phone, address, city, country,
      website, notes, isActive, companyId, createdAt, updatedAt 
    };
  }

  /**
   * 📊 Определение изменений для аудита
   */
  private detectChanges(original: Supplier | null, updated: Supplier): Record<string, any> {
    if (!original) return {};
    
    const changes: Record<string, any> = {};
    const fields = [
      'name', 'contactName', 'email', 'phone', 'address', 
      'city', 'country', 'website', 'notes', 'isActive'
    ];
    
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
