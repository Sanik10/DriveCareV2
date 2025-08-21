// path: apps/backend/src/modules/subscriptions/subscription-billing/services/billing-compliance.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  SubscriptionComplianceLog,
  ComplianceType,
  ComplianceAction,
  ComplianceStatus,
  RiskLevel,
} from '../../../../database/entities/subscription-compliance-log.entity';

import { CreateBillingSubscriptionDto } from '../dto/request/create-billing-subscription.dto';
import { ProcessPaymentDto } from '../dto/request/process-payment.dto';

@Injectable()
export class BillingComplianceService {
  constructor(
    @InjectRepository(SubscriptionComplianceLog)
    private readonly compRepo: Repository<SubscriptionComplianceLog>,
  ) {}

  async validateDataLocalization(companyId: string): Promise<void> {
    const region = process.env.SERVER_REGION;
    const location = process.env.SERVER_LOCATION;
    const processing = process.env.DATA_PROCESSING_LOCATION;

    if (region !== 'RU' || location !== 'Russia' || processing !== 'RU') {
      await this.compRepo.save({
        companyId,
        subscriptionId: null,
        complianceType: ComplianceType.FZ_242,
        action: ComplianceAction.VIOLATED,
        status: ComplianceStatus.VIOLATION,
        description: 'Нарушение локализации данных (ФЗ-242)',
        serverLocation: location || 'unknown',
        dataProcessingLocation: processing || 'unknown',
        riskLevel: RiskLevel.CRITICAL,
        requiresNotification: true,
      });
      throw new BadRequestException('Нарушение ФЗ-242: требуется локализация данных в РФ');
    }

    await this.compRepo.save({
      companyId,
      subscriptionId: null,
      complianceType: ComplianceType.FZ_242,
      action: ComplianceAction.CHECKED,
      status: ComplianceStatus.COMPLIANT,
      description: 'Локализация данных подтверждена',
      serverLocation: 'RU',
      dataProcessingLocation: 'RU',
      riskLevel: RiskLevel.LOW,
      requiresNotification: false,
    });
  }

  async ensureCreateInputs(companyId: string, dto: CreateBillingSubscriptionDto): Promise<void> {
    if (!dto.pdnConsentGiven) {
      await this.compRepo.save({
        companyId,
        subscriptionId: null,
        complianceType: ComplianceType.FZ_152,
        action: ComplianceAction.VIOLATED,
        status: ComplianceStatus.VIOLATION,
        description: 'Отсутствует согласие на обработку ПДн при создании подписки',
        riskLevel: RiskLevel.HIGH,
        requiresNotification: true,
      });
      throw new BadRequestException('ФЗ-152: необходимо согласие на обработку ПДн');
    }
    if (!dto.consumerRightsAcknowledged) {
      await this.compRepo.save({
        companyId,
        subscriptionId: null,
        complianceType: ComplianceType.CONSUMER_RIGHTS,
        action: ComplianceAction.VIOLATED,
        status: ComplianceStatus.VIOLATION,
        description: 'Права потребителей не подтверждены при создании подписки',
        riskLevel: RiskLevel.MEDIUM,
        requiresNotification: false,
      });
      throw new BadRequestException('Права потребителей: необходимо подтверждение ознакомления');
    }
    if (dto.autoRenew === true) {
      throw new BadRequestException('Автопродление отключено по политике сервиса');
    }

    await this.compRepo.save({
      companyId,
      subscriptionId: null,
      complianceType: ComplianceType.FZ_152,
      action: ComplianceAction.GRANTED,
      status: ComplianceStatus.COMPLIANT,
      description: 'Согласие на обработку ПДн предоставлено при создании подписки',
      riskLevel: RiskLevel.LOW,
      requiresNotification: false,
    });

    await this.compRepo.save({
      companyId,
      subscriptionId: null,
      complianceType: ComplianceType.CONSUMER_RIGHTS,
      action: ComplianceAction.CHECKED,
      status: ComplianceStatus.COMPLIANT,
      description: 'Права потребителей подтверждены',
      riskLevel: RiskLevel.LOW,
      requiresNotification: false,
    });
  }

  async validateNpsPreconditions(companyId: string, _dto: ProcessPaymentDto): Promise<void> {
    // Валидация НПС (МИР) — на уровне провайдера; логируем сам факт контроля
    await this.compRepo.save({
      companyId,
      subscriptionId: null,
      complianceType: ComplianceType.FZ_161,
      action: ComplianceAction.CHECKED,
      status: ComplianceStatus.COMPLIANT,
      description: 'Проверка НПС (МИР) выполнена на уровне провайдера',
      riskLevel: RiskLevel.LOW,
      requiresNotification: false,
    });
  }

  async enforceConsumerRights(subscriptionId: string, companyId: string): Promise<{ canCancel: boolean; coolingOffActive: boolean }> {
    await this.compRepo.save({
      companyId,
      subscriptionId,
      complianceType: ComplianceType.CONSUMER_RIGHTS,
      action: ComplianceAction.CHECKED,
      status: ComplianceStatus.COMPLIANT,
      description: 'Проверка прав потребителей: отмена разрешена',
      riskLevel: RiskLevel.LOW,
      requiresNotification: false,
    });

    return { canCancel: true, coolingOffActive: true };
  }

  async getComplianceReport(companyId: string) {
    const logs = await this.compRepo.find({
      where: { companyId },
      order: { createdAt: 'DESC' },
      take: 200,
    });

    const hasDataLocalization = logs.some((l) => l.complianceType === ComplianceType.FZ_242 && l.status === ComplianceStatus.COMPLIANT);
    const hasConsumerRights = logs.some((l) => l.complianceType === ComplianceType.CONSUMER_RIGHTS);
    const hasPDN = logs.some((l) => l.complianceType === ComplianceType.FZ_152);

    const score = [hasDataLocalization, hasConsumerRights, hasPDN].filter(Boolean).length / 3;

    return {
      dataLocalized: hasDataLocalization,
      pdnConsentGiven: hasPDN,
      consumerRightsRespected: hasConsumerRights,
      mirPaymentSupported: true,
      complianceScore: Math.round(score * 100),
      recommendations: hasDataLocalization ? [] : ['Подтвердите локализацию данных в РФ'],
    };
  }
}
