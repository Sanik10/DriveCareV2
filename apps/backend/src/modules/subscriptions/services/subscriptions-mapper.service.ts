// apps/backend/src/modules/subscriptions/services/subscriptions-mapper.service.ts
import { Injectable } from '@nestjs/common';
import { Subscription } from '../../../database/entities';
import { SubscriptionResponseDto } from '../dto/response/subscription-response.dto';
import { SubscriptionStatus } from '../../../database/entities/subscription.entity';

@Injectable()
export class SubscriptionsMapperService {
  /**
   * Основной маппинг Entity → ResponseDto
   */
  mapToResponseDto(subscription: Subscription): SubscriptionResponseDto {
    return {
      id: subscription.id,
      companyId: subscription.companyId,
      tariff: subscription.tariff
        ? {
            id: subscription.tariff.id,
            name: subscription.tariff.name,
            priceMonthly: subscription.tariff.priceMonthly,
            priceYearly: subscription.tariff.priceYearly,
            maxUsers: subscription.tariff.maxUsers,
            maxCustomers: subscription.tariff.maxCustomers,
            maxVehicles: subscription.tariff.maxVehicles,
            maxOrders: subscription.tariff.maxOrders,
          }
        : undefined,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      status: subscription.status,
      paymentMethod: subscription.paymentMethod,
      autoRenew: subscription.autoRenew,
      createdAt: subscription.createdAt,
      updatedAt: subscription.updatedAt,
    };
  }

  /**
   * Маппинг для списков (массив Entity → массив ResponseDto)
   */
  mapArrayToResponseDto(subscriptions: Subscription[]): SubscriptionResponseDto[] {
    return subscriptions.map((subscription) => this.mapToResponseDto(subscription));
  }

  /**
   * Краткая информация о подписке (для других модулей)
   */
  mapToBasicInfo(subscription: Subscription): {
    id: string;
    companyId: string;
    status: SubscriptionStatus;
    endDate: Date;
    tariffName?: string;
  } {
    return {
      id: subscription.id,
      companyId: subscription.companyId,
      status: subscription.status,
      endDate: subscription.endDate,
      tariffName: subscription.tariff?.name,
    };
  }

  /**
   * Информация о подписке для компании (используется в CompanyResponseDto)
   */
  mapToCompanySubscriptionInfo(subscription: Subscription): {
    id: string;
    tariffName: string;
    endDate: Date;
    status: SubscriptionStatus;
  } {
    return {
      id: subscription.id,
      tariffName: subscription.tariff?.name || 'Unknown',
      endDate: subscription.endDate,
      status: subscription.status,
    };
  }

  /**
   * Маппинг для статистики подписок
   */
  mapToStatsInfo(subscription: Subscription): {
    id: string;
    companyId: string;
    status: SubscriptionStatus;
    startDate: Date;
    endDate: Date;
    daysRemaining: number;
    isExpiringSoon: boolean;
  } {
    const now = new Date();
    const endDate = new Date(subscription.endDate);
    const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const isExpiringSoon = daysRemaining <= 30 && daysRemaining > 0;

    return {
      id: subscription.id,
      companyId: subscription.companyId,
      status: subscription.status,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      daysRemaining: Math.max(0, daysRemaining),
      isExpiringSoon,
    };
  }

  /**
   * Маппинг для renewal информации
   */
  mapToRenewalInfo(subscription: Subscription): {
    id: string;
    companyId: string;
    currentEndDate: Date;
    autoRenew: boolean;
    tariffId: string;
    monthlyPrice: number;
    yearlyPrice: number;
  } {
    return {
      id: subscription.id,
      companyId: subscription.companyId,
      currentEndDate: subscription.endDate,
      autoRenew: subscription.autoRenew,
      tariffId: subscription.tariffId,
      monthlyPrice: subscription.tariff?.priceMonthly || 0,
      yearlyPrice: subscription.tariff?.priceYearly || 0,
    };
  }

  /**
   * Маппинг для audit логирования
   */
  mapToAuditData(subscription: Subscription): {
    id: string;
    companyId: string;
    tariffId: string;
    status: SubscriptionStatus;
    startDate: Date;
    endDate: Date;
    autoRenew: boolean;
  } {
    return {
      id: subscription.id,
      companyId: subscription.companyId,
      tariffId: subscription.tariffId,
      status: subscription.status,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      autoRenew: subscription.autoRenew,
    };
  }
}
