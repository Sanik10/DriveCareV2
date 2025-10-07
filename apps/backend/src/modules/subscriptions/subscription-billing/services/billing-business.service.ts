// path: apps/backend/src/modules/subscriptions/subscription-billing/services/billing-business.service.ts
import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Subscription, SubscriptionStatus } from '../../../../database/entities/subscription.entity';
import { Company } from '../../../../database/entities/company.entity';
import { Tariff } from '../../../../database/entities/tariff.entity';
import { SubscriptionPaymentLog } from '../../../../database/entities/subscription-payment-log.entity';

import { CreateBillingSubscriptionDto } from '../dto/request/create-billing-subscription.dto';
import { AuditService } from '../../../../common/audit/audit.service';
import { AuditContext } from '../types/billing.types';
import { BillingSubscriptionResponseDto } from '../dto/response/billing-subscription-response.dto';

@Injectable()
export class BillingBusinessService {
  private readonly logger = new Logger(BillingBusinessService.name);

  constructor(
    @InjectRepository(Subscription) private readonly subRepo: Repository<Subscription>,
    @InjectRepository(Company) private readonly companyRepo: Repository<Company>,
    @InjectRepository(Tariff) private readonly tariffRepo: Repository<Tariff>,
    @InjectRepository(SubscriptionPaymentLog) private readonly payLogRepo: Repository<SubscriptionPaymentLog>,
    private readonly audit: AuditService,
  ) {}

  private computeEndDate(start: Date, period: 'monthly' | 'yearly'): Date {
    const end = new Date(start);
    if (period === 'yearly') {
      end.setFullYear(end.getFullYear() + 1);
    } else {
      // monthly (корректно обрабатываем переход конца месяца)
      const day = end.getDate();
      end.setMonth(end.getMonth() + 1);
      if (end.getDate() < day) {
        end.setDate(0); // последний день предыдущего месяца
      }
    }
    return end;
  }

  async createPendingSubscription(
    companyId: string,
    dto: CreateBillingSubscriptionDto,
    ctx: AuditContext,
  ): Promise<Subscription> {
    const [company, tariff] = await Promise.all([
      this.companyRepo.findOne({ where: { id: companyId } }),
      this.tariffRepo.findOne({ where: { id: dto.tariffId } }),
    ]);

    if (!company) throw new NotFoundException('Компания не найдена');
    if (!tariff || (tariff as any).isActive === false) throw new BadRequestException('Тариф недоступен');
    if (dto.autoRenew === true) throw new BadRequestException('Автопродление отключено по политике сервиса');

    const startDate = dto.startDate ? new Date(dto.startDate) : new Date();
    const billingPeriod: 'monthly' | 'yearly' = dto.billingPeriod || 'monthly';
    const endDate = this.computeEndDate(startDate, billingPeriod);

    const sub = await this.subRepo.save({
      companyId,
      tariffId: dto.tariffId,
      billingPeriod,
      startDate,
      endDate,
      status: SubscriptionStatus.PENDING,
      paymentMethod: dto.paymentMethod || 'manual',
      autoRenew: false,
    });

    await this.audit.logSubscriptionCreated({
      entityId: sub.id,
      entityType: 'Subscription',
      companyId,
      changes: { after: this.auditSanitize(sub) },
      metadata: {
        pdnConsentGiven: dto.pdnConsentGiven,
        consumerRightsAcknowledged: dto.consumerRightsAcknowledged,
        billingPeriod,
        userIp: dto.userIpAddress,
        userAgent: dto.userAgent,
      },
    });

    return sub;
  }

  async activateSubscription(subscriptionId: string, ctx: AuditContext): Promise<Subscription> {
    const sub = await this.subRepo.findOne({ where: { id: subscriptionId } });
    if (!sub) throw new NotFoundException('Подписка не найдена');

    // Авто-деактивация другой активной подписки компании
    const otherActive = await this.subRepo.findOne({
      where: { companyId: sub.companyId, status: SubscriptionStatus.ACTIVE },
    });
    if (otherActive && otherActive.id !== subscriptionId) {
      await this.subRepo.update(otherActive.id, { status: SubscriptionStatus.INACTIVE });
      await this.audit.logSubscriptionUpdated({
        entityId: otherActive.id,
        entityType: 'Subscription',
        companyId: sub.companyId,
        changes: { before: { status: SubscriptionStatus.ACTIVE }, after: { status: SubscriptionStatus.INACTIVE } },
        metadata: { reason: 'Auto-deactivated due to new activation' },
      });
    }

    if (sub.status !== SubscriptionStatus.ACTIVE) {
      await this.subRepo.update(subscriptionId, { status: SubscriptionStatus.ACTIVE });
    }

    const updated = await this.subRepo.findOne({ where: { id: subscriptionId } });

    await this.audit.logSubscriptionUpdated({
      entityId: subscriptionId,
      entityType: 'Subscription',
      companyId: updated.companyId,
      changes: {
        before: { status: sub.status },
        after: { status: updated.status },
      },
      metadata: { reason: 'Payment completed' },
    });

    return updated;
  }

  async cancelSubscription(companyId: string, subscriptionId: string, reason: string | undefined, ctx: AuditContext): Promise<void> {
    const sub = await this.subRepo.findOne({ where: { id: subscriptionId, companyId } });
    if (!sub) throw new NotFoundException('Подписка не найдена');

    await this.subRepo.update(subscriptionId, { status: SubscriptionStatus.CANCELED, autoRenew: false });

    await this.audit.logSubscriptionCanceled({
      entityId: subscriptionId,
      entityType: 'Subscription',
      companyId,
      changes: {
        before: { status: sub.status, autoRenew: sub.autoRenew },
        after: { status: SubscriptionStatus.CANCELED, autoRenew: false },
      },
      metadata: { canceledAt: new Date(), reason: reason || 'not_provided' },
    });
  }

  async getActiveSubscription(companyId: string): Promise<Subscription | null> {
    return this.subRepo.findOne({
      where: { companyId, status: SubscriptionStatus.ACTIVE },
      relations: ['tariff'],
      order: { endDate: 'DESC', createdAt: 'DESC' },
    });
  }

  mapToResponse(sub: Subscription): BillingSubscriptionResponseDto {
    const now = Date.now();
    const daysUntilExpiration = Math.max(0, Math.ceil((sub.endDate.getTime() - now) / 86400000));

    return {
      id: sub.id,
      companyId: sub.companyId,
      tariff: sub.tariff
        ? {
            id: sub.tariff.id,
            name: sub.tariff.name,
            priceMonthly: sub.tariff.priceMonthly,
            priceYearly: sub.tariff.priceYearly,
            maxUsers: sub.tariff.maxUsers,
            maxCustomers: sub.tariff.maxCustomers,
            maxVehicles: sub.tariff.maxVehicles,
            maxOrders: sub.tariff.maxOrders,
          }
        : undefined,
      startDate: sub.startDate,
      endDate: sub.endDate,
      billingPeriod: sub.billingPeriod,
      status: sub.status,
      paymentMethod: sub.paymentMethod,
      autoRenew: false,
      daysUntilExpiration,
      createdAt: sub.createdAt,
      updatedAt: sub.updatedAt,
    };
  }

  private auditSanitize(sub: Subscription) {
    const {
      id,
      companyId,
      tariffId,
      billingPeriod,
      startDate,
      endDate,
      status,
      paymentMethod,
      autoRenew,
      createdAt,
      updatedAt,
    } = sub;
    return { id, companyId, tariffId, billingPeriod, startDate, endDate, status, paymentMethod, autoRenew, createdAt, updatedAt };
  }
}
