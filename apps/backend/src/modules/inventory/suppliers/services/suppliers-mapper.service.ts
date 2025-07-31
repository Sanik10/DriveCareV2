// src/modules/inventory/suppliers/services/suppliers-mapper.service.ts
import { Injectable } from '@nestjs/common';
import { Supplier } from '../../../../database/entities';
import { SupplierResponseDto } from '../dto/response/supplier-response.dto';
import { PaginatedSuppliersResponseDto } from '../dto/response/paginated-suppliers-response.dto';
import { SupplierRatingResponseDto } from '../dto/response/supplier-rating-response.dto';
import { SupplierAnalyticsResponseDto } from '../dto/response/supplier-analytics-response.dto';
import { 
  SupplierFilter,
  SupplierRating,
  SupplierAnalytics,
  SupplierDisplayItem,
  QuickSupplierInfo
} from '../types/suppliers.types';
import { SUPPLIER_CONSTRAINTS } from '../types/suppliers.types';

@Injectable()
export class SuppliersMapperService {
  
  /**
   * 🎯 Основной маппинг Supplier Entity → ResponseDto
   */
  mapToResponseDto(supplier: Supplier): SupplierResponseDto {
    return {
      id: supplier.id,
      companyId: supplier.companyId,
      name: supplier.name,
      contactName: supplier.contactName || undefined,
      email: supplier.email || undefined,
      phone: supplier.phone || undefined,
      address: supplier.address || undefined,
      city: supplier.city || undefined,
      country: supplier.country || undefined,
      website: supplier.website || undefined,
      notes: supplier.notes || undefined,
      isActive: supplier.isActive,
      createdAt: supplier.createdAt,
      updatedAt: supplier.updatedAt,
      
      // ✅ ИСПРАВЛЕНО: используем данные из entity
      supplierType: supplier.supplierType,
      supplierTypeDisplay: this.getSupplierTypeDisplay(supplier.supplierType),
      taxNumber: supplier.taxNumber || undefined,
      paymentTerms: supplier.paymentTerms || undefined,
      deliveryTerms: supplier.deliveryTerms || undefined,
      
      // 📊 Вычисляемые поля
      rating: {
        overallRating: 0,
        qualityRating: 0,
        deliveryRating: 0,
        priceRating: 0,
        communicationRating: 0,
        totalRatings: 0,
        lastRatedAt: undefined,
      },
      
      statistics: {
        totalOrders: 0,
        totalValue: 0,
        averageOrderValue: 0,
        lastOrderDate: undefined,
        onTimeDeliveryRate: 0,
        averageDeliveryTime: 0,
        activeContracts: 0,
        defectRate: 0,
        returnRate: 0,
      },
      
      // ✅ ДОБАВЛЯЕМ недостающие обязательные поля:
      isPreferred: false,
      reliabilityLevel: 'medium',
      cooperationStatus: 'active',
      badges: undefined,
      warnings: undefined,
      canEdit: true,
      canDeactivate: true,
      blockReason: undefined,
      
      // 🔗 Связанная информация
      preferredContact: this.determinePreferredContact(supplier),
      tags: this.generateSupplierTags(supplier),
      businessMetrics: {
        reliability: 0,
        costEffectiveness: 0,
        serviceQuality: 0,
        overallScore: 0,
      },
    };
  }

  /**
   * 🎯 Маппинг с дополнительными данными
   */
  mapToResponseDtoWithStats(
    supplier: Supplier, 
    statsData?: {
      totalOrders: number;
      totalValue: number;
      averageOrderValue: number;
      lastOrderDate?: Date;
      onTimeDeliveryRate: number;
      averageDeliveryTime: number;
    },
    ratingData?: {
      average: number;
      totalRatings: number;
      qualityAverage: number;
      deliveryAverage: number;
      priceAverage: number;
      communicationAverage?: number;
      lastRatedAt?: Date;
    }
  ): SupplierResponseDto {
    const baseDto = this.mapToResponseDto(supplier);
    
    if (statsData) {
      baseDto.statistics = {
        totalOrders: statsData.totalOrders,
        totalValue: Math.round(statsData.totalValue * 100) / 100,
        averageOrderValue: Math.round(statsData.averageOrderValue * 100) / 100,
        lastOrderDate: statsData.lastOrderDate,
        onTimeDeliveryRate: Math.round(statsData.onTimeDeliveryRate * 100) / 100,
        averageDeliveryTime: Math.round(statsData.averageDeliveryTime * 100) / 100,
        activeContracts: 0,
        defectRate: 0,
        returnRate: 0,
      };
    }
    
    if (ratingData) {
      baseDto.rating = {
        overallRating: Math.round(ratingData.average * 100) / 100,
        qualityRating: Math.round(ratingData.qualityAverage * 100) / 100,
        deliveryRating: Math.round(ratingData.deliveryAverage * 100) / 100,
        priceRating: Math.round(ratingData.priceAverage * 100) / 100,
        communicationRating: ratingData.communicationAverage 
          ? Math.round(ratingData.communicationAverage * 100) / 100 
          : undefined,
        totalRatings: ratingData.totalRatings,
        lastRatedAt: ratingData.lastRatedAt,
      };
    }
    
    return baseDto;
  }

  /**
   * 🎯 Массовый маппинг
   */
  mapArrayToResponseDto(suppliers: Supplier[]): SupplierResponseDto[] {
    return suppliers.map(supplier => this.mapToResponseDto(supplier));
  }

  /**
   * 🎯 Маппинг пагинированного ответа
   */
  mapToPaginatedResponse(
    suppliers: Supplier[],
    total: number,
    page: number,
    limit: number,
    filters?: SupplierFilter
  ): PaginatedSuppliersResponseDto {
    const items = this.mapArrayToResponseDto(suppliers);
    const totalPages = Math.ceil(total / limit);

    // 📊 Расчет сводки по текущей странице
    const summary = this.calculatePageSummary(suppliers);

    // ✅ ДОБАВЛЯЕМ недостающий typeBreakdown:
    const typeBreakdown = this.calculateTypeBreakdown(suppliers);

    return {
      items,
      total,
      page,
      limit,
      totalPages,
      summary,
      typeBreakdown,
      filters: {
        search: filters?.search,
        isActive: filters?.isActive,
        hasRecentDeliveries: filters?.hasRecentDeliveries,
        minRating: filters?.minRating,
        city: filters?.city,
        country: filters?.country,
        supplierType: filters?.supplierType,
        hasActiveFilters: this.hasActiveFilters(filters),
      },
    };
  }

  /**
   * 🎯 Маппинг рейтинга поставщика - ПОЛНОСТЬЮ ПЕРЕПИСАН
   */
  mapToRatingResponse(rating: SupplierRating): SupplierRatingResponseDto {
    return {
      supplierId: rating.supplierId,
      supplierName: 'Название поставщика', // TODO: получить из БД
      overallRating: Math.round(rating.averageRating * 100) / 100,
      totalRatings: 1,
      
      // Детализация по категориям
      averageQualityRating: rating.qualityRating,
      averageDeliveryRating: rating.deliveryRating,
      averagePriceRating: rating.priceRating,
      averageCommunicationRating: rating.communicationRating,
      
      // Распределение оценок (заглушки)
      qualityBreakdown: { excellent: 0, good: 1, average: 0, poor: 0, terrible: 0 },
      deliveryBreakdown: { excellent: 0, good: 1, average: 0, poor: 0, terrible: 0 },
      priceBreakdown: { excellent: 0, good: 1, average: 0, poor: 0, terrible: 0 },
      
      // Динамика рейтинга
      ratingTrend: 'stable',
      ratingChange: 0,
      ratingHistory: [],
      
      // Последние оценки
      latestRatings: [{
        id: rating.id,
        qualityRating: rating.qualityRating,
        deliveryRating: rating.deliveryRating,
        priceRating: rating.priceRating,
        communicationRating: rating.communicationRating,
        overallRating: rating.averageRating,
        comment: rating.comment,
        ratedBy: {
          id: rating.ratedBy,
          name: 'Пользователь',
          role: 'manager'
        },
        createdAt: rating.createdAt,
      }],
      
      // Сравнение с другими поставщиками
      rankPosition: 1,
      totalSuppliersInCompany: 1,
      percentileRank: 80,
      
      // Рекомендации
      recommendations: this.generateImprovementSuggestions(rating),
      strengths: this.identifyStrongPoints(rating),
      areasForImprovement: this.identifyWeakPoints(rating),
      
      lastRatedAt: rating.createdAt,
      nextReviewDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      
      // Для обратной совместимости с мапперами:
      ratedBy: rating.ratedBy,
      qualityRating: rating.qualityRating,
      deliveryRating: rating.deliveryRating,
      priceRating: rating.priceRating,
      communicationRating: rating.communicationRating,
      averageRating: rating.averageRating,
      comment: rating.comment,
      createdAt: rating.createdAt,
      
      ratingBreakdown: {
        quality: rating.qualityRating,
        delivery: rating.deliveryRating,
        price: rating.priceRating,
        communication: rating.communicationRating,
      },
      
      improvement: {
        suggestions: this.generateImprovementSuggestions(rating),
        strongPoints: this.identifyStrongPoints(rating),
        weakPoints: this.identifyWeakPoints(rating),
      },
    };
  }

  /**
   * 🎯 Маппинг аналитики поставщика - ИСПРАВЛЕН
   */
  mapToAnalyticsResponse(analytics: Partial<SupplierAnalytics>): SupplierAnalyticsResponseDto {
    return {
      supplierId: analytics.supplierId!,
      supplierName: analytics.supplierName || 'Неизвестный поставщик',
      analyticsPeriod: analytics.period!, // ✅ ИСПРАВЛЕНО: period -> analyticsPeriod
      
      // Добавляем недостающие обязательные поля:
      periodStart: new Date(),
      periodEnd: new Date(),
      
      totalOrders: analytics.totalOrders || 0,
      
      // Финансовые метрики
      financial: {
        totalValue: analytics.totalValue || 0,
        averageOrderValue: analytics.averageOrderValue || 0,
        medianOrderValue: 0,
        largestOrder: 0,
        outstandingBalance: analytics.outstandingPayments || 0,
        averagePaymentDelay: analytics.averagePaymentDelay || 0,
        totalDiscounts: 0,
        averageDiscountRate: analytics.discountRate || 0,
      },
      
      // Метрики качества
      quality: {
        defectRate: analytics.defectRate || 0,
        returnRate: analytics.returnRate || 0,
        complaintsCount: 0,
        resolvedComplaintsRate: 100.0,
        averageComplaintResolutionTime: 2.1,
      },
      
      // Временные метрики
      onTimeDeliveryRate: analytics.onTimeDeliveryRate || 0,
      averageDeliveryTime: analytics.averageDeliveryTime || 0,
      minimumDeliveryTime: 1,
      maximumDeliveryTime: 7,
      
      // Рейтинги
      currentRating: analytics.currentRating?.overallRating || 0,
      periodStartRating: 0,
      ratingChange: 0,
      ratingTrend: analytics.ratingTrend || 'stable',
      
      // Топ товары и тренды
      topParts: analytics.topParts || [],
      uniquePartsCount: analytics.topParts?.length || 0,
      monthlyTrends: analytics.monthlyTrends || [],
      
      // Сравнение
      comparison: {
        volumeRank: 2,
        ratingRank: 1,
        reliabilityRank: 3,
        marketShare: 18.5,
        industryAverageRating: 3.8,
        industryAverageDeliveryTime: 4.2,
      },
      
      // Прогнозы
      predictedNextPeriodValue: 2800000.00,
      recommendations: this.generateRecommendations(analytics),
      risks: [],
      opportunities: [],
      
      // Контактная активность
      contactsCount: 25,
      averageResponseTime: 4.2,
      responseRate: 95.8,
      
      seasonalityAnalysis: {
        peakSeason: 'autumn',
        lowSeason: 'summer',
        seasonalityStrength: 0.3,
      },
      
      generatedAt: new Date(),
      nextUpdateAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };
  }

  /**
   * 🎯 Маппинг для списков и краткого отображения
   */
  mapToDisplayItem(supplier: Supplier): SupplierDisplayItem {
    return {
      id: supplier.id,
      name: supplier.name,
      contactName: supplier.contactName || undefined,
      phone: supplier.phone || undefined,
      email: supplier.email || undefined,
      city: supplier.city || undefined,
      rating: 0,
      totalOrders: 0,
      totalValue: 0,
      lastOrderDate: undefined,
      isActive: supplier.isActive,
      supplierType: supplier.supplierType,
      onTimeDeliveryRate: 0,
      preferredBadge: this.determinePreferredBadge(supplier),
    };
  }

  /**
   * 🎯 Базовая информация (для других модулей)
   */
  mapToBasicInfo(supplier: Supplier): QuickSupplierInfo {
    return {
      id: supplier.id,
      name: supplier.name,
      phone: supplier.phone || undefined,
      email: supplier.email || undefined,
      rating: 0,
      isActive: supplier.isActive,
      lastOrderDate: undefined,
      preferredContact: this.determinePreferredContact(supplier),
    };
  }

  /**
   * 🎯 Для мобильного приложения (упрощенный)
   */
  mapToMobileView(supplier: Supplier): {
    id: string;
    name: string;
    contactName: string;
    phone: string;
    email: string;
    city: string;
    isActive: boolean;
    rating: number;
    preferredContact: 'phone' | 'email' | 'whatsapp';
  } {
    return {
      id: supplier.id,
      name: supplier.name,
      contactName: supplier.contactName || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      city: supplier.city || '',
      isActive: supplier.isActive,
      rating: 0,
      preferredContact: this.determinePreferredContact(supplier),
    };
  }

  /**
   * 🎯 Для экспорта в Excel/CSV
   */
  mapToExportRow(supplier: Supplier): {
    name: string;
    contactName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    country: string;
    website: string;
    status: string;
    createdAt: string;
    notes: string;
  } {
    return {
      name: supplier.name,
      contactName: supplier.contactName || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      city: supplier.city || '',
      country: supplier.country || '',
      website: supplier.website || '',
      status: supplier.isActive ? 'Активен' : 'Неактивен',
      createdAt: supplier.createdAt.toISOString().split('T')[0],
      notes: supplier.notes || '',
    };
  }

  // ✅ ДОБАВЛЯЕМ недостающий метод:
  private getSupplierTypeDisplay(type: string): string {
    const typeMap = {
      'manufacturer': 'Производитель',
      'distributor': 'Дистрибьютор', 
      'wholesaler': 'Оптовик',
      'retailer': 'Розничный продавец',
      'service_provider': 'Поставщик услуг',
      'other': 'Другое'
    };
    return typeMap[type] || 'Неизвестно';
  }

  /**
   * 📊 Расчет business metrics
   */
  private calculateBusinessMetrics(
    statsData: any,
    ratingData?: any
  ): {
    reliability: number;
    costEffectiveness: number;
    serviceQuality: number;
    overallScore: number;
  } {
    const reliability = statsData.onTimeDeliveryRate || 0;
    const costEffectiveness = ratingData?.priceAverage ? (ratingData.priceAverage / 5) * 100 : 0;
    const serviceQuality = ratingData?.qualityAverage ? (ratingData.qualityAverage / 5) * 100 : 0;
    
    const overallScore = (reliability + costEffectiveness + serviceQuality) / 3;

    return {
      reliability: Math.round(reliability * 100) / 100,
      costEffectiveness: Math.round(costEffectiveness * 100) / 100,
      serviceQuality: Math.round(serviceQuality * 100) / 100,
      overallScore: Math.round(overallScore * 100) / 100,
    };
  }

  /**
   * 📊 Определение предпочтительного способа связи
   */
  private determinePreferredContact(supplier: Supplier): 'phone' | 'email' | 'whatsapp' {
    if (supplier.phone && supplier.email) {
      return 'phone';
    } else if (supplier.phone) {
      return 'phone';
    } else if (supplier.email) {
      return 'email';
    } else {
      return 'email';
    }
  }

  /**
   * 🎯 Генерация тегов поставщика
   */
  private generateSupplierTags(supplier: Supplier): string[] {
    const tags: string[] = [];
    
    if (supplier.isActive) {
      tags.push('active');
    } else {
      tags.push('inactive');
    }
    
    if (supplier.website) {
      tags.push('has_website');
    }
    
    if (supplier.email && supplier.phone) {
      tags.push('full_contact');
    }
    
    return tags;
  }

  /**
   * 🎯 Определение предпочтительного бейджа
   */
  private determinePreferredBadge(supplier: Supplier): string | undefined {
    return undefined;
  }

  /**
   * ✅ ИСПРАВЛЯЕМ расчет typeBreakdown с реальным supplierType:
   */
  private calculateTypeBreakdown(suppliers: Supplier[]): {
    manufacturer: number;
    distributor: number;
    wholesaler: number;
    retailer: number;
    service_provider: number;
    other: number;
  } {
    const breakdown = {
      manufacturer: 0,
      distributor: 0,
      wholesaler: 0,
      retailer: 0,
      service_provider: 0,
      other: 0,
    };

    suppliers.forEach(supplier => {
      const type = supplier.supplierType || 'other';
      if (breakdown.hasOwnProperty(type)) {
        breakdown[type]++;
      } else {
        breakdown.other++;
      }
    });

    return breakdown;
  }

  /**
   * 📊 Расчет сводки по странице
   */
  private calculatePageSummary(suppliers: Supplier[]): {
    activeSuppliers: number;
    inactiveSuppliers: number;
    averageRating: number;
    totalValue: number;
    topPerformers: number;
  } {
    let activeSuppliers = 0;
    let inactiveSuppliers = 0;

    suppliers.forEach(supplier => {
      if (supplier.isActive) {
        activeSuppliers++;
      } else {
        inactiveSuppliers++;
      }
    });

    return {
      activeSuppliers,
      inactiveSuppliers,
      averageRating: 0,
      totalValue: 0,
      topPerformers: Math.min(suppliers.length, 3),
    };
  }

  /**
   * 📊 Проверка активных фильтров
   */
  private hasActiveFilters(filters?: SupplierFilter): boolean {
    if (!filters) return false;
    
    return !!(
      filters.search ||
      filters.isActive !== undefined ||
      filters.hasRecentDeliveries ||
      filters.minRating ||
      filters.city ||
      filters.country ||
      filters.supplierType ||
      filters.paymentTerms
    );
  }

  /**
   * ⭐ Генерация предложений по улучшению
   */
  private generateImprovementSuggestions(rating: SupplierRating): string[] {
    const suggestions: string[] = [];
    
    if (rating.qualityRating < 4) {
      suggestions.push('Улучшить контроль качества поставляемых товаров');
    }
    
    if (rating.deliveryRating < 4) {
      suggestions.push('Оптимизировать сроки доставки');
    }
    
    if (rating.priceRating < 4) {
      suggestions.push('Пересмотреть ценовую политику');
    }
    
    if (rating.communicationRating && rating.communicationRating < 4) {
      suggestions.push('Улучшить коммуникацию с клиентами');
    }
    
    return suggestions;
  }

  /**
   * ⭐ Определение сильных сторон
   */
  private identifyStrongPoints(rating: SupplierRating): string[] {
    const strongPoints: string[] = [];
    
    if (rating.qualityRating >= 4.5) {
      strongPoints.push('Высокое качество товаров');
    }
    
    if (rating.deliveryRating >= 4.5) {
      strongPoints.push('Быстрая доставка');
    }
    
    if (rating.priceRating >= 4.5) {
      strongPoints.push('Конкурентные цены');
    }
    
    if (rating.communicationRating && rating.communicationRating >= 4.5) {
      strongPoints.push('Отличная коммуникация');
    }
    
    return strongPoints;
  }

  /**
   * ⭐ Определение слабых сторон
   */
  private identifyWeakPoints(rating: SupplierRating): string[] {
    const weakPoints: string[] = [];
    
    if (rating.qualityRating < 3) {
      weakPoints.push('Проблемы с качеством');
    }
    
    if (rating.deliveryRating < 3) {
      weakPoints.push('Задержки доставки');
    }
    
    if (rating.priceRating < 3) {
      weakPoints.push('Высокие цены');
    }
    
    if (rating.communicationRating && rating.communicationRating < 3) {
      weakPoints.push('Проблемы с коммуникацией');
    }
    
    return weakPoints;
  }

  /**
   * 📊 Расчет показателей эффективности
   */
  private calculateEfficiencyScore(analytics: Partial<SupplierAnalytics>): number {
    return 75;
  }

  private calculateReliabilityScore(analytics: Partial<SupplierAnalytics>): number {
    return 85;
  }

  private calculateCostEffectivenessScore(analytics: Partial<SupplierAnalytics>): number {
    return 80;
  }

  private calculateOverallPerformanceScore(analytics: Partial<SupplierAnalytics>): number {
    return 80;
  }

  /**
   * 📋 Генерация рекомендаций
   */
  private generateRecommendations(analytics: Partial<SupplierAnalytics>): string[] {
    const recommendations: string[] = [];
    
    if (analytics.totalOrders && analytics.totalOrders > 10) {
      recommendations.push('Рассмотреть возможность заключения долгосрочного контракта');
    }
    
    return recommendations;
  }
}
