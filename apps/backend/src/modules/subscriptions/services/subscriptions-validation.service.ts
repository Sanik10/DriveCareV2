import { Injectable } from '@nestjs/common';
import { SubscriptionsDataService } from './subscriptions-data.service';
import { Subscription, Tariff } from '../../../database/entities';
import { CreateSubscriptionData, UpdateSubscriptionData, SubscriptionStatus } from '../types/subscriptions.types';
import { ISubscriptionsValidationService } from '../interfaces/subscriptions.interface';
import { 
  SubscriptionNotFoundException,
  ActiveSubscriptionExistsException,
  SubscriptionStatusTransitionException,
  TariffNotFoundException,
  ValidationDataException,
  CompanyNotFoundException // 🔥 ДОБАВЛЕНО если есть в domain.exceptions.ts
} from '../../../common/exceptions/domain.exceptions'; // 🔥 ИСПРАВЛЕНО: кастомные исключения

@Injectable()
export class SubscriptionsValidationService implements ISubscriptionsValidationService {
  constructor(
    private readonly subscriptionsDataService: SubscriptionsDataService,
  ) {}

  /**
   * Валидация данных для создания подписки
   */
  async validateCreateData(data: CreateSubscriptionData): Promise<void> {
    // Проверяем существование компании
    await this.validateCompanyExists(data.companyId);

    // Проверяем существование тарифа
    await this.validateTariffExists(data.tariffId);

    // Проверяем даты
    this.validateDates(data.startDate, data.endDate);

    // Проверяем что нет конфликтующих активных подписок
    await this.validateNoActiveSubscription(data.companyId);

    // Дополнительные бизнес-правила
    this.validateBusinessRules(data);
  }

  /**
   * Валидация данных для обновления подписки
   */
  async validateUpdateData(id: string, data: UpdateSubscriptionData): Promise<void> {
    // Проверяем существование подписки
    const subscription = await this.validateSubscriptionExists(id);

    // Если меняется тариф, проверяем его существование
    if (data.tariffId) {
      await this.validateTariffExists(data.tariffId);
    }

    // Если меняется дата окончания, проверяем корректность
    if (data.endDate) {
      this.validateDates(subscription.startDate, data.endDate);
    }

    // Если активируется подписка, проверяем нет ли других активных
    if (data.status === SubscriptionStatus.ACTIVE && subscription.status !== SubscriptionStatus.ACTIVE) {
      await this.validateNoActiveSubscription(subscription.companyId, id);
    }

    // Валидация смены статуса
    this.validateStatusTransition(subscription.status, data.status);
  }

  /**
   * Проверка существования подписки
   */
  async validateSubscriptionExists(id: string): Promise<Subscription> {
    const subscription = await this.subscriptionsDataService.findById(id);
    
    if (!subscription) {
      throw new SubscriptionNotFoundException(id); // 🔥 ИСПРАВЛЕНО: кастомное исключение
    }

    return subscription;
  }

  /**
   * Проверка существования компании
   */
  async validateCompanyExists(companyId: string): Promise<void> {
    const exists = await this.subscriptionsDataService.companyExists(companyId);
    
    if (!exists) {
      // 🔥 ИСПРАВЛЕНО: Используем подходящее исключение
      throw new ValidationDataException('companyId', `Компания с ID ${companyId} не найдена`);
    }
  }

  /**
   * Проверка существования тарифа
   */
  async validateTariffExists(tariffId: string): Promise<Tariff> {
    const tariff = await this.subscriptionsDataService.findTariffById(tariffId);
    
    if (!tariff) {
      throw new TariffNotFoundException(tariffId); // 🔥 ИСПРАВЛЕНО: кастомное исключение
    }

    if (!tariff.isActive) {
      throw new ValidationDataException( // 🔥 ИСПРАВЛЕНО: кастомное исключение
        'tariffId',
        `Тариф ${tariff.name} неактивен и не может быть использован для подписки`
      );
    }

    return tariff;
  }

  /**
   * Проверка отсутствия активных подписок
   */
  private async validateNoActiveSubscription(companyId: string, excludeId?: string): Promise<void> {
    const activeSubscription = await this.subscriptionsDataService.findActiveByCompany(companyId);
    
    if (activeSubscription && activeSubscription.id !== excludeId) {
      throw new ActiveSubscriptionExistsException(companyId); // 🔥 ИСПРАВЛЕНО: кастомное исключение
    }
  }

  /**
   * Валидация дат
   */
  private validateDates(startDate?: Date, endDate?: Date): void {
    if (!endDate) return;

    const start = startDate || new Date();
    
    if (endDate <= start) {
      throw new ValidationDataException( // 🔥 ИСПРАВЛЕНО: кастомное исключение
        'endDate',
        'Дата окончания должна быть позже даты начала'
      );
    }

    // Проверяем что дата окончания не слишком далеко в будущем (например, не более 5 лет)
    const maxEndDate = new Date();
    maxEndDate.setFullYear(maxEndDate.getFullYear() + 5);
    
    if (endDate > maxEndDate) {
      throw new ValidationDataException( // 🔥 ИСПРАВЛЕНО: кастомное исключение
        'endDate',
        'Дата окончания не может быть более чем через 5 лет'
      );
    }

    // Проверяем что дата не в прошлом (для новых подписок)
    if (!startDate && endDate < new Date()) {
      throw new ValidationDataException( // 🔥 ИСПРАВЛЕНО: кастомное исключение
        'endDate',
        'Дата окончания не может быть в прошлом'
      );
    }
  }

  /**
   * Валидация смены статуса
   */
  private validateStatusTransition(currentStatus: SubscriptionStatus, newStatus?: SubscriptionStatus): void {
    if (!newStatus) return;

    // Определяем разрешенные переходы статусов
    const allowedTransitions: Record<SubscriptionStatus, SubscriptionStatus[]> = {
      [SubscriptionStatus.PENDING]: [
        SubscriptionStatus.ACTIVE,
        SubscriptionStatus.CANCELED,
        SubscriptionStatus.SUSPENDED
      ],
      [SubscriptionStatus.ACTIVE]: [
        SubscriptionStatus.SUSPENDED,
        SubscriptionStatus.CANCELED,
        SubscriptionStatus.EXPIRED,
        SubscriptionStatus.INACTIVE
      ],
      [SubscriptionStatus.SUSPENDED]: [
        SubscriptionStatus.ACTIVE,
        SubscriptionStatus.CANCELED,
        SubscriptionStatus.EXPIRED
      ],
      [SubscriptionStatus.CANCELED]: [
        // Из отмененного статуса нельзя никуда переходить
      ],
      [SubscriptionStatus.EXPIRED]: [
        SubscriptionStatus.ACTIVE, // Можно реактивировать
        SubscriptionStatus.INACTIVE
      ],
      [SubscriptionStatus.INACTIVE]: [
        SubscriptionStatus.ACTIVE // Можно реактивировать
      ],
    };

    const allowed = allowedTransitions[currentStatus] || [];
    
    if (!allowed.includes(newStatus)) {
      throw new SubscriptionStatusTransitionException(currentStatus, newStatus); // 🔥 ИСПРАВЛЕНО: кастомное исключение
    }
  }

  /**
   * Дополнительные бизнес-правила
   */
  private validateBusinessRules(data: CreateSubscriptionData): void {
    // Проверяем минимальную длительность подписки (например, не менее 1 дня)
    const start = data.startDate || new Date();
    const duration = data.endDate.getTime() - start.getTime();
    const minDuration = 24 * 60 * 60 * 1000; // 1 день

    if (duration < minDuration) {
      throw new ValidationDataException( // 🔥 ИСПРАВЛЕНО: кастомное исключение
        'duration',
        'Минимальная длительность подписки должна быть не менее 1 дня'
      );
    }

    // Проверяем что способ оплаты корректный
    if (data.paymentMethod) {
      const allowedPaymentMethods = ['manual', 'bank_transfer', 'credit_card', 'cash'];
      if (!allowedPaymentMethods.includes(data.paymentMethod)) {
        throw new ValidationDataException( // 🔥 ИСПРАВЛЕНО: кастомное исключение
          'paymentMethod',
          `Неподдерживаемый способ оплаты: ${data.paymentMethod}`
        );
      }
    }
  }
}
