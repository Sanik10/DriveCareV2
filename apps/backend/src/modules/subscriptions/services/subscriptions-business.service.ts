import { Injectable, Logger } from '@nestjs/common';
import { AuditService } from '../../../common/audit/audit.service';
import { SubscriptionsDataService } from './subscriptions-data.service';
import { Subscription } from '../../../database/entities';
import { CreateSubscriptionData, UpdateSubscriptionData, SubscriptionStatus } from '../types/subscriptions.types';
import { ISubscriptionsBusinessService } from '../interfaces/subscriptions.interface';
import { SUBSCRIPTIONS_CONSTANTS } from '../constants/subscriptions.constants';

@Injectable()
export class SubscriptionsBusinessService implements ISubscriptionsBusinessService {
  private readonly logger = new Logger(SubscriptionsBusinessService.name);

  constructor(
    private readonly subscriptionsDataService: SubscriptionsDataService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * 🔥 Создание подписки с автодеактивацией предыдущих
   */
  async createSubscription(data: CreateSubscriptionData): Promise<Subscription> {
    this.logger.log(`Создание новой подписки для компании: ${data.companyId}`);

    // 1. Автоматически деактивируем предыдущие активные подписки
    await this.autoDeactivatePreviousSubscriptions(data.companyId);

    // 2. Создаем новую подписку
    const subscription = await this.subscriptionsDataService.create(data);

    // 3. Логируем создание
    await this.auditService.logSubscriptionCreated({
      entityId: subscription.id,
      entityType: 'Subscription',
      companyId: subscription.companyId,
      changes: { after: this.sanitizeSubscriptionData(subscription) },
      metadata: {
        tariffId: subscription.tariffId,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        status: subscription.status,
      },
    });

    this.logger.log(`Подписка успешно создана: ${subscription.id} для компании ${data.companyId}`);

    return subscription;
  }

  /**
   * Обновление подписки с бизнес-логикой
   */
  async updateSubscription(id: string, data: UpdateSubscriptionData): Promise<Subscription> {
    this.logger.log(`Обновление подписки: ${id}`);

    // Получаем текущие данные для аудита
    const beforeSubscription = await this.subscriptionsDataService.findById(id);
    if (!beforeSubscription) {
      throw new Error(`Subscription with id ${id} not found`);
    }

    // Если меняем статус на активный, деактивируем другие активные подписки компании
    if (data.status === SubscriptionStatus.ACTIVE && 
        beforeSubscription.status !== SubscriptionStatus.ACTIVE) {
      await this.autoDeactivatePreviousSubscriptions(beforeSubscription.companyId);
    }

    // Обновляем подписку
    const updatedSubscription = await this.subscriptionsDataService.update(id, data);

    // Логируем обновление
    await this.auditService.logSubscriptionUpdated({
      entityId: id,
      entityType: 'Subscription',
      companyId: updatedSubscription.companyId,
      changes: {
        before: this.sanitizeSubscriptionData(beforeSubscription),
        after: this.sanitizeSubscriptionData(updatedSubscription),
      },
      metadata: {
        updatedFields: Object.keys(data),
        previousStatus: beforeSubscription.status,
        newStatus: updatedSubscription.status,
      },
    });

    this.logger.log(`Подписка успешно обновлена: ${id}`);

    return updatedSubscription;
  }

  /**
   * 🔥 Отмена подписки
   */
  async cancelSubscription(id: string): Promise<Subscription> {
    this.logger.log(`Отмена подписки: ${id}`);

    const subscription = await this.subscriptionsDataService.findById(id);
    if (!subscription) {
      throw new Error(`Subscription with id ${id} not found`);
    }

    const updatedSubscription = await this.subscriptionsDataService.update(id, {
      status: SubscriptionStatus.CANCELED,
      autoRenew: false,
    });

    // Логируем отмену
    await this.auditService.logSubscriptionCanceled({
      entityId: id,
      entityType: 'Subscription',
      companyId: subscription.companyId,
      changes: {
        before: { status: subscription.status, autoRenew: subscription.autoRenew },
        after: { status: SubscriptionStatus.CANCELED, autoRenew: false },
      },
      metadata: {
        canceledAt: new Date(),
        previousStatus: subscription.status,
        companyName: subscription.company?.name,
      },
    });

    this.logger.log(`Подписка успешно отменена: ${id}`);

    return updatedSubscription;
  }

  /**
   * 🔥 Обработка истекших подписок (для CRON)
   */
  async processExpiredSubscriptions(): Promise<number> {
    this.logger.log('Начинаем обработку истекших подписок');

    const expiredSubscriptions = await this.subscriptionsDataService.findExpiredSubscriptions();
    
    let processedCount = 0;

    for (const subscription of expiredSubscriptions) {
      try {
        // Помечаем как истекшую
        await this.subscriptionsDataService.update(subscription.id, {
          status: SubscriptionStatus.EXPIRED,
          autoRenew: false,
        });

        // Логируем истечение
        await this.auditService.logSubscriptionExpired({
          entityId: subscription.id,
          entityType: 'Subscription',
          companyId: subscription.companyId,
          changes: {
            before: { status: subscription.status },
            after: { status: SubscriptionStatus.EXPIRED },
          },
          metadata: {
            expiredAt: new Date(),
            endDate: subscription.endDate,
            companyName: subscription.company?.name,
            tariffName: subscription.tariff?.name,
          },
        });

        processedCount++;
        this.logger.log(`Подписка ${subscription.id} помечена как истекшая для компании ${subscription.companyId}`);

      } catch (error) {
        this.logger.error(`Ошибка при обработке истекшей подписки ${subscription.id}:`, error);
      }
    }

    this.logger.log(`Обработка истекших подписок завершена. Обработано: ${processedCount} из ${expiredSubscriptions.length}`);

    return processedCount;
  }

  /**
   * 🔥 КЛЮЧЕВОЙ метод: Автодеактивация предыдущих подписок
   */
  async autoDeactivatePreviousSubscriptions(companyId: string): Promise<void> {
    this.logger.log(`Деактивация предыдущих подписок для компании: ${companyId}`);

    const activeSubscription = await this.subscriptionsDataService.findActiveByCompany(companyId);

    if (activeSubscription) {
      // Деактивируем текущую активную подписку
      await this.subscriptionsDataService.update(activeSubscription.id, {
        status: SubscriptionStatus.INACTIVE,
      });

      // Логируем деактивацию
      await this.auditService.logSubscriptionUpdated({
        entityId: activeSubscription.id,
        entityType: 'Subscription',
        companyId,
        changes: {
          before: { status: SubscriptionStatus.ACTIVE },
          after: { status: SubscriptionStatus.INACTIVE },
        },
        metadata: {
          reason: 'Auto-deactivated due to new subscription',
          deactivatedAt: new Date(),
        },
      });

      this.logger.log(`Деактивирована предыдущая подписка ${activeSubscription.id} для компании ${companyId}`);
    } else {
      this.logger.log(`Активных подписок для деактивации не найдено для компании ${companyId}`);
    }
  }

  /**
   * 🔄 Продление подписки
   */
  async renewSubscription(id: string, newEndDate: Date): Promise<Subscription> {
    this.logger.log(`Продление подписки: ${id}`);

    const subscription = await this.subscriptionsDataService.findById(id);
    if (!subscription) {
      throw new Error(`Subscription with id ${id} not found`);
    }

    const updatedSubscription = await this.subscriptionsDataService.update(id, {
      endDate: newEndDate,
      status: SubscriptionStatus.ACTIVE,
    });

    // Логируем продление
    await this.auditService.logSubscriptionRenewed({
      entityId: id,
      entityType: 'Subscription',
      companyId: subscription.companyId,
      changes: {
        before: { 
          endDate: subscription.endDate,
          status: subscription.status 
        },
        after: { 
          endDate: newEndDate,
          status: SubscriptionStatus.ACTIVE 
        },
      },
      metadata: {
        renewedAt: new Date(),
        previousEndDate: subscription.endDate,
        newEndDate,
        extensionDays: Math.ceil((newEndDate.getTime() - subscription.endDate.getTime()) / (1000 * 60 * 60 * 24)),
      },
    });

    this.logger.log(`Подписка успешно продлена: ${id} до ${newEndDate}`);

    return updatedSubscription;
  }

  /**
   * Санитизация данных подписки для аудита
   */
  private sanitizeSubscriptionData(subscription: Subscription): Partial<Subscription> {
    const { 
      id, 
      companyId, 
      tariffId, 
      startDate, 
      endDate, 
      status, 
      paymentMethod, 
      autoRenew, 
      createdAt, 
      updatedAt 
    } = subscription;
    
    return { 
      id, 
      companyId, 
      tariffId, 
      startDate, 
      endDate, 
      status, 
      paymentMethod, 
      autoRenew, 
      createdAt, 
      updatedAt 
    };
  }
}
