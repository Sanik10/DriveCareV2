// path: apps/backend/src/modules/tariffs/services/tariffs-mapper.service.ts
import { Injectable } from '@nestjs/common';
import { Tariff } from '../../../database/entities';
import { TariffResponseDto } from '../dto/response/tariff-response.dto';
import { TariffMetricsMap, TariffSubscribersMetrics } from '../types/tariffs.types';

@Injectable()
export class TariffsMapperService {
  /**
   * Основной маппинг Entity → ResponseDto
   * metrics:
   *  - number: трактуем как activeSubscribers (для обратной совместимости с прежним параметром subscriptionsCount)
   *  - object: { activeSubscribers, totalSubscribers }
   */
  mapToResponseDto(
    tariff: Tariff,
    metrics?: number | Partial<TariffSubscribersMetrics>,
  ): TariffResponseDto {
    const yearlyDiscount = this.calculateYearlyDiscount(tariff.priceMonthly, tariff.priceYearly);

    let activeSubscribers: number | undefined;
    let totalSubscribers: number | undefined;

    if (typeof metrics === 'number') {
      activeSubscribers = metrics;
    } else if (metrics && typeof metrics === 'object') {
      if (typeof metrics.activeSubscribers === 'number') {
        activeSubscribers = metrics.activeSubscribers;
      }
      if (typeof metrics.totalSubscribers === 'number') {
        totalSubscribers = metrics.totalSubscribers;
      }
    }

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
      // subscriptionsCount — для обратной совместимости: это активные подписчики
      subscriptionsCount: typeof activeSubscribers === 'number' ? activeSubscribers : undefined,
      isRecommended: this.isRecommendedTariff(tariff),
      activeSubscribers,
      totalSubscribers,
    };
  }

  /**
   * Маппинг для списков (массив Entity → массив ResponseDto)
   */
  mapArrayToResponseDto(
    tariffs: Tariff[],
    metricsMap?: TariffMetricsMap | Record<string, number>,
  ): TariffResponseDto[] {
    // Поддерживаем 2 формата metricsMap:
    // 1) Record<string, number> — это map активных подписчиков
    // 2) TariffMetricsMap — объект с active/total
    const isNumberMap =
      metricsMap &&
      typeof metricsMap === 'object' &&
      Object.values(metricsMap)[0] !== undefined &&
      typeof (Object.values(metricsMap)[0] as any) === 'number';

    return tariffs.map((tariff) => {
      if (!metricsMap) return this.mapToResponseDto(tariff);

      if (isNumberMap) {
        const count = (metricsMap as Record<string, number>)[tariff.id] || 0;
        return this.mapToResponseDto(tariff, count);
      }

      const metrics = (metricsMap as TariffMetricsMap)[tariff.id] || {
        activeSubscribers: 0,
        totalSubscribers: 0,
      };
      return this.mapToResponseDto(tariff, metrics);
    });
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
    const f = (tariff.features || {}) as Record<string, unknown>;
    // 1) Явная отметка в features
    if (typeof f.recommended === 'boolean') {
      return f.recommended;
    }
    if (typeof f.badge === 'string' && ['recommended', 'best_value'].includes(f.badge)) {
      return true;
    }
    // 2) Эвристика по названию (обратная совместимость)
    const name = (tariff.name || '').toLowerCase();
    const recommendedKeywords = ['стандарт', 'standard', 'professional', 'про', 'business'];
    return recommendedKeywords.some((keyword) => name.includes(keyword));
  }
}
