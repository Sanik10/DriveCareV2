// path: apps/backend/src/modules/tariffs/services/tariffs-mapper.service.ts
import { Injectable } from '@nestjs/common';
import { Tariff } from '../../../database/entities';
import { TariffResponseDto } from '../dto/response/tariff-response.dto';

@Injectable()
export class TariffsMapperService {
  /**
   * Основной маппинг Entity → ResponseDto
   */
  mapToResponseDto(tariff: Tariff, subscriptionsCount: number = 0): TariffResponseDto {
    const yearlyDiscount = this.calculateYearlyDiscount(tariff.priceMonthly, tariff.priceYearly);

    return {
      id: tariff.id,
      name: tariff.name,
      description: tariff.description,
      priceMonthly: tariff.priceMonthly,
      priceYearly: tariff.priceYearly,
      yearlyDiscount: yearlyDiscount > 0 ? yearlyDiscount : undefined,
      maxUsers: tariff.maxUsers,
      maxCustomers: tariff.maxCustomers,
      maxVehicles: tariff.maxVehicles,
      maxOrders: tariff.maxOrders,
      features: tariff.features,
      isActive: tariff.isActive,
      createdAt: tariff.createdAt,
      updatedAt: tariff.updatedAt,
      subscriptionsCount,
      isRecommended: this.isRecommendedTariff(tariff),
    };
  }

  /**
   * Маппинг для списков (массив Entity → массив ResponseDto)
   */
  mapArrayToResponseDto(tariffs: Tariff[], subscriptionsCounts: Record<string, number> = {}): TariffResponseDto[] {
    return tariffs.map((tariff) => this.mapToResponseDto(tariff, subscriptionsCounts[tariff.id] || 0));
  }

  /**
   * Базовая информация о тарифе (для других модулей)
   */
  mapToBasicInfo(tariff: Tariff): {
    id: string;
    name: string;
    priceMonthly: number;
    priceYearly: number;
    maxUsers: number | null;
    maxCustomers: number | null;
    maxVehicles: number | null;
    maxOrders: number | null;
  } {
    return {
      id: tariff.id,
      name: tariff.name,
      priceMonthly: tariff.priceMonthly,
      priceYearly: tariff.priceYearly,
      maxUsers: tariff.maxUsers,
      maxCustomers: tariff.maxCustomers,
      maxVehicles: tariff.maxVehicles,
      maxOrders: tariff.maxOrders,
    };
  }

  /**
   * Краткая информация для селектов и списков
   */
  mapToSelectOption(tariff: Tariff): {
    value: string;
    label: string;
    priceMonthly: number;
    priceYearly: number;
    isActive: boolean;
  } {
    return {
      value: tariff.id,
      label: tariff.name,
      priceMonthly: tariff.priceMonthly,
      priceYearly: tariff.priceYearly,
      isActive: tariff.isActive,
    };
  }

  /**
   * Данные для сравнения тарифов
   */
  mapToComparisonData(tariff: Tariff): {
    id: string;
    name: string;
    priceMonthly: number;
    priceYearly: number;
    yearlyDiscount: number;
    limits: {
      users: number | null;
      customers: number | null;
      vehicles: number | null;
      orders: number | null;
    };
    features: Record<string, any>;
    isRecommended: boolean;
  } {
    return {
      id: tariff.id,
      name: tariff.name,
      priceMonthly: tariff.priceMonthly,
      priceYearly: tariff.priceYearly,
      yearlyDiscount: this.calculateYearlyDiscount(tariff.priceMonthly, tariff.priceYearly),
      limits: {
        users: tariff.maxUsers,
        customers: tariff.maxCustomers,
        vehicles: tariff.maxVehicles,
        orders: tariff.maxOrders,
      },
      features: tariff.features || {},
      isRecommended: this.isRecommendedTariff(tariff),
    };
  }

  /**
   * Статистическая информация о тарифе
   */
  mapToStatsInfo(
    tariff: Tariff,
    subscriptionsCount: number = 0,
  ): {
    id: string;
    name: string;
    priceMonthly: number;
    priceYearly: number;
    isActive: boolean;
    subscriptionsCount: number;
    popularity: 'low' | 'medium' | 'high';
    revenue: {
      monthly: number;
      yearly: number;
    };
  } {
    const popularity = subscriptionsCount > 20 ? 'high' : subscriptionsCount > 5 ? 'medium' : 'low';

    return {
      id: tariff.id,
      name: tariff.name,
      priceMonthly: tariff.priceMonthly,
      priceYearly: tariff.priceYearly,
      isActive: tariff.isActive,
      subscriptionsCount,
      popularity,
      revenue: {
        monthly: tariff.priceMonthly * subscriptionsCount,
        yearly: tariff.priceYearly * subscriptionsCount,
      },
    };
  }

  /**
   * Форматирование цены для отображения (рубли)
   */
  formatPrice(priceInRubles: number): string {
    const price = priceInRubles;
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(price);
  }

  /**
   * Проверка ограничений тарифа
   */
  checkLimit(
    tariff: Tariff,
    limitType: 'users' | 'customers' | 'vehicles' | 'orders',
    currentCount: number,
  ): {
    isExceeded: boolean;
    limit: number | null;
    remaining: number | null;
    percentage: number | null;
  } {
    let limit: number | null;

    switch (limitType) {
      case 'users':
        limit = tariff.maxUsers;
        break;
      case 'customers':
        limit = tariff.maxCustomers;
        break;
      case 'vehicles':
        limit = tariff.maxVehicles;
        break;
      case 'orders':
        limit = tariff.maxOrders;
        break;
      default:
        throw new Error(`Unknown limit type: ${limitType}`);
    }

    if (limit === null) {
      return {
        isExceeded: false,
        limit: null,
        remaining: null,
        percentage: null,
      };
    }

    const remaining = Math.max(0, limit - currentCount);
    const percentage = Math.min(100, (currentCount / limit) * 100);

    return {
      isExceeded: currentCount > limit,
      limit,
      remaining,
      percentage: Math.round(percentage * 100) / 100,
    };
  }

  private calculateYearlyDiscount(monthlyPrice: number, yearlyPrice: number): number {
    if (!monthlyPrice || !yearlyPrice) return 0;

    const monthlyTotal = monthlyPrice * 12;
    if (monthlyTotal <= yearlyPrice) return 0;

    const discount = ((monthlyTotal - yearlyPrice) / monthlyTotal) * 100;
    return Math.round(discount * 100) / 100;
  }

  private isRecommendedTariff(tariff: Tariff): boolean {
    const name = (tariff.name || '').toLowerCase();
    const recommendedKeywords = ['стандарт', 'standard', 'professional', 'про', 'business'];
    return recommendedKeywords.some((keyword) => name.includes(keyword));
    }
}
