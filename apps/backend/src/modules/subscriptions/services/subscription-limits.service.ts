// path: apps/backend/src/modules/subscriptions/services/subscription-limits.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription } from '../../../database/entities';
import { AuditService } from '../../../common/audit/audit.service';
import { SubscriptionStatus, TariffLimits, LimitCheckResult } from '../types/subscriptions.types';
import { ISubscriptionLimitsService } from '../interfaces/subscriptions.interface';

@Injectable()
export class SubscriptionLimitsService implements ISubscriptionLimitsService {
  private readonly logger = new Logger(SubscriptionLimitsService.name);

  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionsRepository: Repository<Subscription>,
    private readonly auditService: AuditService,
  ) {}

  async checkUserLimit(companyId: string, currentCount: number, increment: number = 1): Promise<LimitCheckResult> {
    return this.checkLimit(companyId, 'maxUsers', 'users', currentCount, increment);
  }

  async checkCustomerLimit(companyId: string, currentCount: number, increment: number = 1): Promise<LimitCheckResult> {
    return this.checkLimit(companyId, 'maxCustomers', 'customers', currentCount, increment);
  }

  async checkVehicleLimit(companyId: string, currentCount: number, increment: number = 1): Promise<LimitCheckResult> {
    return this.checkLimit(companyId, 'maxVehicles', 'vehicles', currentCount, increment);
  }

  async checkOrderLimit(companyId: string, currentCount: number, increment: number = 1): Promise<LimitCheckResult> {
    return this.checkLimit(companyId, 'maxOrders', 'orders', currentCount, increment);
  }

  async getTariffLimits(companyId: string): Promise<TariffLimits | null> {
    this.logger.debug(`Получение лимитов тарифа для компании: ${companyId}`);

    const subscription = await this.getActiveSubscription(companyId);
    if (!subscription || !subscription.tariff) {
      this.logger.warn(`Активная подписка не найдена для компании: ${companyId}`);
      return null;
    }

    return {
      maxUsers: subscription.tariff.maxUsers,
      maxCustomers: subscription.tariff.maxCustomers,
      maxVehicles: subscription.tariff.maxVehicles,
      maxOrders: subscription.tariff.maxOrders,
    };
  }

  async validateLimit(
    companyId: string,
    limitType: keyof TariffLimits,
    currentCount: number,
    increment: number = 1,
  ): Promise<boolean> {
    const result = await this.checkLimit(companyId, limitType, limitType, currentCount, increment);
    return result.allowed;
  }

  private async checkLimit(
    companyId: string,
    limitField: keyof TariffLimits,
    limitTypeName: string,
    currentCount: number,
    increment: number = 1,
  ): Promise<LimitCheckResult> {
    this.logger.debug(`Проверка лимита ${limitTypeName} для компании ${companyId}: текущее=${currentCount}, добавляем=${increment}`);

    try {
      const subscription = await this.getActiveSubscription(companyId);

      if (!subscription || !subscription.tariff) {
        this.logger.warn(`Активная подписка не найдена для компании: ${companyId}`);

        await this.auditService.logLimitCheckFailed({
          companyId,
          metadata: {
            limitType: limitTypeName,
            reason: 'No active subscription',
            currentCount,
            increment,
          },
        });

        return {
          allowed: false,
          currentCount,
          limit: null,
          limitType: limitTypeName,
        };
      }

      const limit = subscription.tariff[limitField];

      // Безлимитный тариф (null/undefined/-1)
      if (limit === null || limit === undefined || limit === -1) {
        this.logger.debug(`Безлимитный тариф для ${limitTypeName} в компании ${companyId}`);

        return {
          allowed: true,
          currentCount,
          limit: null,
          limitType: limitTypeName,
        };
      }

      const newCount = currentCount + increment;
      const allowed = newCount <= limit;

      if (!allowed) {
        this.logger.warn(`Превышен лимит ${limitTypeName} для компании ${companyId}: ${newCount} > ${limit}`);

        await this.auditService.logLimitExceeded({
          companyId,
          metadata: {
            limitType: limitTypeName,
            currentCount,
            increment,
            newCount,
            limit,
            tariffName: subscription.tariff.name,
          },
        });
      } else {
        this.logger.debug(`Лимит ${limitTypeName} в норме для компании ${companyId}: ${newCount} <= ${limit}`);
      }

      return {
        allowed,
        currentCount,
        limit,
        limitType: limitTypeName,
      };
    } catch (error: any) {
      this.logger.error(
        `Ошибка при проверке лимита ${limitTypeName} для компании ${companyId}: ${error?.message || error}`,
        error?.stack,
      );

      await this.auditService.logLimitCheckFailed({
        companyId,
        metadata: {
          limitType: limitTypeName,
          reason: 'Check error',
          error: error?.message || String(error),
          currentCount,
          increment,
        },
      });

      return {
        allowed: false,
        currentCount,
        limit: null,
        limitType: limitTypeName,
      };
    }
  }

  private async getActiveSubscription(companyId: string): Promise<Subscription | null> {
    return this.subscriptionsRepository.findOne({
      where: {
        companyId,
        status: SubscriptionStatus.ACTIVE,
      },
      relations: ['tariff'],
      order: { endDate: 'DESC', createdAt: 'DESC' },
    });
  }

  async getCompanyLimitsInfo(companyId: string): Promise<{
    hasActiveSubscription: boolean;
    tariffName?: string;
    limits: TariffLimits | null;
    isUnlimited: boolean;
  }> {
    const subscription = await this.getActiveSubscription(companyId);

    if (!subscription || !subscription.tariff) {
      return {
        hasActiveSubscription: false,
        limits: null,
        isUnlimited: false,
      };
    }

    const limits = {
      maxUsers: subscription.tariff.maxUsers,
      maxCustomers: subscription.tariff.maxCustomers,
      maxVehicles: subscription.tariff.maxVehicles,
      maxOrders: subscription.tariff.maxOrders,
    };

    const isUnlimited = Object.values(limits).every(
      (limit) => limit === null || limit === undefined || limit === -1,
    );

    return {
      hasActiveSubscription: true,
      tariffName: subscription.tariff.name,
      limits,
      isUnlimited,
    };
  }

  async checkMultipleLimits(companyId: string, checks: Array<{
    type: keyof TariffLimits;
    currentCount: number;
    increment?: number;
  }>): Promise<Array<LimitCheckResult & { type: keyof TariffLimits }>> {
    const results: Array<LimitCheckResult & { type: keyof TariffLimits }> = [];
    const subscription = await this.getActiveSubscription(companyId);

    for (const check of checks) {
      const increment = check.increment ?? 1;
      const currentCount = check.currentCount;

      if (!subscription || !subscription.tariff) {
        await this.auditService.logLimitCheckFailed({
          companyId,
          metadata: {
            limitType: check.type,
            reason: 'No active subscription',
            currentCount,
            increment,
          },
        });

        results.push({
          allowed: false,
          currentCount,
          limit: null,
          limitType: String(check.type),
          type: check.type,
        });
        continue;
      }

      const limit = subscription.tariff[check.type];

      if (limit === null || limit === undefined || limit === -1) {
        results.push({
          allowed: true,
          currentCount,
          limit: null,
          limitType: String(check.type),
          type: check.type,
        });
        continue;
      }

      const newCount = currentCount + increment;
      const allowed = newCount <= limit;

      if (!allowed) {
        await this.auditService.logLimitExceeded({
          companyId,
          metadata: {
            limitType: check.type,
            currentCount,
            increment,
            newCount,
            limit,
            tariffName: subscription.tariff.name,
          },
        });
      }

      results.push({
        allowed,
        currentCount,
        limit,
        limitType: String(check.type),
        type: check.type,
      });
    }

    return results;
  }
}
