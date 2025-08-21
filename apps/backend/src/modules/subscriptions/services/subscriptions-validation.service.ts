// path: apps/backend/src/modules/subscriptions/services/subscriptions-validation.service.ts
import { Injectable } from '@nestjs/common';
import { SubscriptionsDataService } from './subscriptions-data.service';
import { Subscription, Tariff } from '../../../database/entities';
import { CreateSubscriptionData, UpdateSubscriptionData } from '../types/subscriptions.types';
import { SubscriptionStatus } from '../../../database/entities/subscription.entity';
import { ISubscriptionsValidationService } from '../interfaces/subscriptions.interface';
import {
  SubscriptionNotFoundException,
  SubscriptionStatusTransitionException,
  ValidationDataException,
  CompanyNotFoundException,
  TariffNotFoundException,
} from '../../../common/exceptions/domain.exceptions';
import { SUBSCRIPTIONS_CONSTANTS } from '../constants/subscriptions.constants';

@Injectable()
export class SubscriptionsValidationService implements ISubscriptionsValidationService {
  constructor(private readonly subscriptionsDataService: SubscriptionsDataService) {}

  async validateCreateData(data: CreateSubscriptionData): Promise<void> {
    await this.validateCompanyExists(data.companyId);
    await this.validateTariffExists(data.tariffId);
    this.validateDates(data.startDate, data.endDate);
    // ВНИМАНИЕ: Не блокируем создание при наличии активной — бизнес-слой сам авто-деактивирует предыдущие
    this.validateBusinessRules(data);
  }

  async validateUpdateData(id: string, data: UpdateSubscriptionData): Promise<void> {
    const subscription = await this.validateSubscriptionExists(id);

    if (data.tariffId) {
      await this.validateTariffExists(data.tariffId);
    }

    if (data.endDate) {
      this.validateDates(subscription.startDate, data.endDate);
      if (subscription.endDate && data.endDate <= subscription.endDate) {
        throw new ValidationDataException('endDate', 'Новая дата окончания должна быть позже текущей');
      }
    }

    // При переходе в ACTIVE не блокируем (бизнес-слой авто-деактивирует другие активные)
    this.validateStatusTransition(subscription.status, data.status);
  }

  async validateSubscriptionExists(id: string): Promise<Subscription> {
    const subscription = await this.subscriptionsDataService.findById(id);
    if (!subscription) {
      throw new SubscriptionNotFoundException(id);
    }
    return subscription;
  }

  async validateCompanyExists(companyId: string): Promise<void> {
    const exists = await this.subscriptionsDataService.companyExists(companyId);
    if (!exists) {
      throw new CompanyNotFoundException(companyId);
    }
  }

  async validateTariffExists(tariffId: string): Promise<Tariff> {
    const tariff = await this.subscriptionsDataService.findTariffById(tariffId);

    if (!tariff) {
      throw new TariffNotFoundException(tariffId);
    }

    if (!('isActive' in tariff) || (tariff as any).isActive === false) {
      throw new ValidationDataException('tariffId', `Тариф ${tariff.name} неактивен и не может быть использован для подписки`);
    }

    return tariff;
  }

  private validateDates(startDate?: Date, endDate?: Date): void {
    if (!endDate) return;

    const start = startDate || new Date();
    if (endDate <= start) {
      throw new ValidationDataException('endDate', 'Дата окончания должна быть позже даты начала');
    }

    const maxEndDate = new Date();
    maxEndDate.setFullYear(maxEndDate.getFullYear() + 5);
    if (endDate > maxEndDate) {
      throw new ValidationDataException('endDate', 'Дата окончания не может быть более чем через 5 лет');
    }

    if (!startDate && endDate < new Date()) {
      throw new ValidationDataException('endDate', 'Дата окончания не может быть в прошлом');
    }
  }

  private validateStatusTransition(currentStatus: SubscriptionStatus, newStatus?: SubscriptionStatus): void {
    if (!newStatus) return;
    const transitions = SUBSCRIPTIONS_CONSTANTS.STATUS_TRANSITIONS as Record<string, readonly string[]>;
    const allowed = transitions[currentStatus] || [];
    if (!allowed.includes(newStatus)) {
      throw new SubscriptionStatusTransitionException(currentStatus, newStatus);
    }
  }

  private validateBusinessRules(data: CreateSubscriptionData): void {
    const start = data.startDate || new Date();
    const duration = data.endDate.getTime() - start.getTime();
    const minDuration = 24 * 60 * 60 * 1000;
    if (duration < minDuration) {
      throw new ValidationDataException('duration', 'Минимальная длительность подписки должна быть не менее 1 дня');
    }

    if (data.paymentMethod) {
      const allowedPaymentMethods = SUBSCRIPTIONS_CONSTANTS.PAYMENT_METHODS as unknown as string[];
      if (!allowedPaymentMethods.includes(data.paymentMethod)) {
        throw new ValidationDataException('paymentMethod', `Неподдерживаемый способ оплаты: ${data.paymentMethod}`);
      }
    }
  }
}
