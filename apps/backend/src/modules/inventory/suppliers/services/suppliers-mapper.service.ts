// src/modules/inventory/suppliers/services/suppliers-mapper.service.ts
import { Injectable } from '@nestjs/common';
import { Supplier } from '../../../../database/entities';
import { SupplierResponseDto } from '../dto/response/supplier-response.dto';
import { PaginatedSuppliersResponseDto } from '../dto/response/paginated-suppliers-response.dto';
import { SupplierRatingResponseDto } from '../dto/response/supplier-rating-response.dto';
import { SupplierAnalyticsResponseDto } from '../dto/response/supplier-analytics-response.dto';
import { SupplierFilter, SupplierRating, SupplierAnalytics, SupplierDisplayItem, QuickSupplierInfo } from '../types/suppliers.types';

@Injectable()
export class SuppliersMapperService {
  private maskEmail(email?: string) {
    if (!email) return undefined;
    const [name, domain] = email.split('@');
    if (!domain) return '***';
    const maskedName = name.length <= 2 ? '*'.repeat(name.length) : name[0] + '***' + name.slice(-1);
    return `${maskedName}@${domain}`;
  }
  private maskPhone(phone?: string) {
    if (!phone) return undefined;
    return phone.replace(/\d(?=\d{4})/g, '*');
  }
  private maskName(name?: string) {
    if (!name) return undefined;
    if (name.length <= 2) return '*'.repeat(name.length);
    return name[0] + '***' + name.slice(-1);
  }

  mapToResponseDto(supplier: Supplier, maskContacts: boolean = false): SupplierResponseDto {
    const email = supplier.email || undefined;
    const phone = supplier.phone || undefined;
    const contactName = supplier.contactName || undefined;

    return {
      id: supplier.id,
      companyId: supplier.companyId,
      name: supplier.name,
      contactName: maskContacts ? this.maskName(contactName) : contactName,
      email: maskContacts ? this.maskEmail(email) : email,
      phone: maskContacts ? this.maskPhone(phone) : phone,
      address: supplier.address || undefined,
      city: supplier.city || undefined,
      country: supplier.country || undefined,
      website: supplier.website || undefined,
      notes: supplier.notes || undefined,
      isActive: supplier.isActive,
      createdAt: supplier.createdAt,
      updatedAt: supplier.updatedAt,
      supplierType: supplier.supplierType,
      supplierTypeDisplay: this.getSupplierTypeDisplay(supplier.supplierType),
      taxNumber: supplier.taxNumber || undefined,
      paymentTerms: supplier.paymentTerms || undefined,
      deliveryTerms: supplier.deliveryTerms || undefined,
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
      isPreferred: false,
      reliabilityLevel: 'medium',
      cooperationStatus: 'active',
      badges: undefined,
      warnings: undefined,
      canEdit: true,
      canDeactivate: true,
      blockReason: undefined,
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
    },
    maskContacts: boolean = false,
  ): SupplierResponseDto {
    const baseDto = this.mapToResponseDto(supplier, maskContacts);

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

  mapArrayToResponseDto(suppliers: Supplier[], maskContacts: boolean = false): SupplierResponseDto[] {
    return suppliers.map((supplier) => this.mapToResponseDto(supplier, maskContacts));
  }

  mapToPaginatedResponse(
    suppliers: Supplier[],
    total: number,
    page: number,
    limit: number,
    filters?: SupplierFilter,
    maskContacts: boolean = false,
  ): PaginatedSuppliersResponseDto {
    const items = this.mapArrayToResponseDto(suppliers, maskContacts);
    const totalPages = Math.ceil(total / limit);
    const summary = this.calculatePageSummary(suppliers);
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
        supplierType: filters?.supplierType as any,
        hasActiveFilters: this.hasActiveFilters(filters),
      },
    };
  }

  mapToRatingResponse(rating: SupplierRating): SupplierRatingResponseDto {
    return {
      supplierId: rating.supplierId,
      supplierName: 'Название поставщика',
      overallRating: Math.round(rating.averageRating * 100) / 100,
      totalRatings: 1,
      averageQualityRating: rating.qualityRating,
      averageDeliveryRating: rating.deliveryRating,
      averagePriceRating: rating.priceRating,
      averageCommunicationRating: rating.communicationRating,
      qualityBreakdown: { excellent: 0, good: 1, average: 0, poor: 0, terrible: 0 },
      deliveryBreakdown: { excellent: 0, good: 1, average: 0, poor: 0, terrible: 0 },
      priceBreakdown: { excellent: 0, good: 1, average: 0, poor: 0, terrible: 0 },
      ratingTrend: 'stable',
      ratingChange: 0,
      ratingHistory: [],
      latestRatings: [
        {
          id: rating.id,
          qualityRating: rating.qualityRating,
          deliveryRating: rating.deliveryRating,
          priceRating: rating.priceRating,
          communicationRating: rating.communicationRating,
          overallRating: rating.averageRating,
          comment: rating.comment,
          ratedBy: { id: rating.ratedBy, name: 'Пользователь', role: 'manager' },
          createdAt: rating.createdAt,
        },
      ],
      rankPosition: 1,
      totalSuppliersInCompany: 1,
      percentileRank: 80,
      recommendations: this.generateImprovementSuggestions(rating),
      strengths: this.identifyStrongPoints(rating),
      areasForImprovement: this.identifyWeakPoints(rating),
      lastRatedAt: rating.createdAt,
      nextReviewDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
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

  mapToAnalyticsResponse(analytics: Partial<SupplierAnalytics>): SupplierAnalyticsResponseDto {
    return {
      supplierId: analytics.supplierId!,
      supplierName: analytics.supplierName || 'Неизвестный поставщик',
      analyticsPeriod: analytics.period!,
      periodStart: new Date(),
      periodEnd: new Date(),
      totalOrders: analytics.totalOrders || 0,
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
      quality: {
        defectRate: analytics.defectRate || 0,
        returnRate: analytics.returnRate || 0,
        complaintsCount: 0,
        resolvedComplaintsRate: 100.0,
        averageComplaintResolutionTime: 2.1,
      },
      onTimeDeliveryRate: analytics.onTimeDeliveryRate || 0,
      averageDeliveryTime: analytics.averageDeliveryTime || 0,
      minimumDeliveryTime: 1,
      maximumDeliveryTime: 7,
      currentRating: analytics.currentRating?.overallRating || 0,
      periodStartRating: 0,
      ratingChange: 0,
      ratingTrend: analytics.ratingTrend || 'stable',
      topParts: analytics.topParts || [],
      uniquePartsCount: analytics.topParts?.length || 0,
      monthlyTrends: analytics.monthlyTrends || [],
      comparison: {
        volumeRank: 2,
        ratingRank: 1,
        reliabilityRank: 3,
        marketShare: 18.5,
        industryAverageRating: 3.8,
        industryAverageDeliveryTime: 4.2,
      },
      predictedNextPeriodValue: 2800000.0,
      recommendations: this.generateRecommendations(analytics),
      risks: [],
      opportunities: [],
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

  private getSupplierTypeDisplay(type: string): string {
    const typeMap: Record<string, string> = {
      manufacturer: 'Производитель',
      distributor: 'Дистрибьютор',
      wholesaler: 'Оптовик',
      retailer: 'Розничный продавец',
      service_provider: 'Поставщик услуг',
      other: 'Другое',
    };
    return typeMap[type] || 'Неизвестно';
  }

  private calculateBusinessMetrics(
    statsData: any,
    ratingData?: any,
  ): { reliability: number; costEffectiveness: number; serviceQuality: number; overallScore: number } {
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

  private determinePreferredContact(supplier: Supplier): 'phone' | 'email' | 'whatsapp' {
    if (supplier.phone && supplier.email) return 'phone';
    if (supplier.phone) return 'phone';
    if (supplier.email) return 'email';
    return 'email';
  }

  private generateSupplierTags(supplier: Supplier): string[] {
    const tags: string[] = [];
    tags.push(supplier.isActive ? 'active' : 'inactive');
    if (supplier.website) tags.push('has_website');
    if (supplier.email && supplier.phone) tags.push('full_contact');
    return tags;
  }

  private determinePreferredBadge(_supplier: Supplier): string | undefined {
    return undefined;
  }

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
    suppliers.forEach((supplier) => {
      const type = (supplier.supplierType as any) || 'other';
      if ((breakdown as any).hasOwnProperty(type)) {
        (breakdown as any)[type]++;
      } else {
        (breakdown as any).other++;
      }
    });
    return breakdown;
  }

  private calculatePageSummary(suppliers: Supplier[]): {
    activeSuppliers: number;
    inactiveSuppliers: number;
    averageRating: number;
    totalValue: number;
    topPerformers: number;
  } {
    let activeSuppliers = 0;
    let inactiveSuppliers = 0;
    suppliers.forEach((supplier) => {
      if (supplier.isActive) activeSuppliers++;
      else inactiveSuppliers++;
    });
    return {
      activeSuppliers,
      inactiveSuppliers,
      averageRating: 0,
      totalValue: 0,
      topPerformers: Math.min(suppliers.length, 3),
    };
  }

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

  private generateImprovementSuggestions(rating: SupplierRating): string[] {
    const suggestions: string[] = [];
    if (rating.qualityRating < 4) suggestions.push('Улучшить контроль качества поставляемых товаров');
    if (rating.deliveryRating < 4) suggestions.push('Оптимизировать сроки доставки');
    if (rating.priceRating < 4) suggestions.push('Пересмотреть ценовую политику');
    if (rating.communicationRating && rating.communicationRating < 4) suggestions.push('Улучшить коммуникацию с клиентами');
    return suggestions;
  }

  private identifyStrongPoints(rating: SupplierRating): string[] {
    const strongPoints: string[] = [];
    if (rating.qualityRating >= 4.5) strongPoints.push('Высокое качество товаров');
    if (rating.deliveryRating >= 4.5) strongPoints.push('Быстрая доставка');
    if (rating.priceRating >= 4.5) strongPoints.push('Конкурентные цены');
    if (rating.communicationRating && rating.communicationRating >= 4.5) strongPoints.push('Отличная коммуникация');
    return strongPoints;
  }

  private identifyWeakPoints(rating: SupplierRating): string[] {
    const weakPoints: string[] = [];
    if (rating.qualityRating < 3) weakPoints.push('Проблемы с качеством');
    if (rating.deliveryRating < 3) weakPoints.push('Задержки доставки');
    if (rating.priceRating < 3) weakPoints.push('Высокие цены');
    if (rating.communicationRating && rating.communicationRating < 3) weakPoints.push('Проблемы с коммуникацией');
    return weakPoints;
  }

  private generateRecommendations(analytics: Partial<SupplierAnalytics>): string[] {
    const recommendations: string[] = [];
    if (analytics.totalOrders && analytics.totalOrders > 10) {
      recommendations.push('Рассмотреть возможность заключения долгосрочного контракта');
    }
    return recommendations;
  }
}
