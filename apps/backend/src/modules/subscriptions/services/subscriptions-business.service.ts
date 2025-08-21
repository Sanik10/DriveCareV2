// path: apps/backend/src/modules/subscriptions/services/subscriptions-business.service.ts
import { Injectable, Logger, Inject, ConflictException } from '@nestjs/common';
import { AuditService } from '../../../common/audit/audit.service';
import { SubscriptionsDataService } from './subscriptions-data.service';
import { SubscriptionsValidationService } from './subscriptions-validation.service';
import { Subscription } from '../../../database/entities';
import { CreateSubscriptionData, UpdateSubscriptionData } from '../types/subscriptions.types';
import { SubscriptionStatus } from '../../../database/entities/subscription.entity';
import { ISubscriptionsBusinessService } from '../interfaces/subscriptions.interface';
import { SUBSCRIPTIONS_CONSTANTS } from '../constants/subscriptions.constants';
import { SubscriptionNotFoundException, ValidationDataException } from '../../../common/exceptions/domain.exceptions';
import { createHash } from 'crypto';
import { REDIS_CLIENT } from '../../auth/constants/redis.constants';

@Injectable()
export class SubscriptionsBusinessService implements ISubscriptionsBusinessService {
  private readonly logger = new Logger(SubscriptionsBusinessService.name);

  constructor(
    private readonly subscriptionsDataService: SubscriptionsDataService,
    private readonly auditService: AuditService,
    private readonly subscriptionsValidationService: SubscriptionsValidationService,
    @Inject(REDIS_CLIENT) private readonly redis: any,
  ) {}

  /**
   * Создание подписки с идемпотентностью и автодеактивацией предыдущих (новая — PENDING)
   */
  async createSubscription(data: CreateSubscriptionData, idempotencyKey?: string): Promise<Subscription> {
    this.logger.log(`Создание новой подписки для компании: ${data.companyId}`);

    if (!idempotencyKey) {
      // Без идемпотентности — обычный путь
      await this.autoDeactivatePreviousSubscriptions(data.companyId);

      const subscription = await this.subscriptionsDataService.create({
        ...data,
        status: SubscriptionStatus.PENDING,
      });

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

    // С идемпотентностью (через Redis)
    const redisKey = this.buildIdempotencyKey(data.companyId, idempotencyKey);
    const ttl = SUBSCRIPTIONS_CONSTANTS.CACHE_TTL.IDEMPOTENCY;

    // Пытаемся установить "замок" на ключ (если ключ уже есть — возвращаем результат или конфликт)
    const lockSetResult = await this.redis.set(redisKey, 'PENDING', 'NX', 'EX', ttl);
    if (!lockSetResult) {
      // Ключ уже существует: пробуем вернуть ранее созданную подписку
      const existingVal = await this.redis.get(redisKey);
      if (existingVal && typeof existingVal === 'string' && existingVal.startsWith('sub:')) {
        const existingId = existingVal.slice(4);
        const existing = await this.subscriptionsDataService.findById(existingId);
        if (existing) {
          this.logger.log(`Возврат результата по идемпотентному ключу: ${existingId}`);
          return existing;
        }
      }

      // Небольшой короткий поллинг (ждём завершения первой операции)
      for (let i = 0; i < 10; i++) {
        await this.delay(150);
        const val = await this.redis.get(redisKey);
        if (val && typeof val === 'string' && val.startsWith('sub:')) {
          const existingId = val.slice(4);
          const existing = await this.subscriptionsDataService.findById(existingId);
          if (existing) {
            this.logger.log(`Возврат результата по идемпотентному ключу (после ожидания): ${existingId}`);
            return existing;
          }
        }
      }

      throw new ConflictException('Идемпотентный запрос уже обрабатывается. Повторите попытку позже с тем же ключом.');
    }

    // Мы владеем замком — создаём подписку
    try {
      await this.autoDeactivatePreviousSubscriptions(data.companyId);

      const subscription = await this.subscriptionsDataService.create({
        ...data,
        status: SubscriptionStatus.PENDING,
      });

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

      // Сохраняем результат в идемпотентный ключ
      await this.redis.set(redisKey, `sub:${subscription.id}`, 'EX', ttl);

      this.logger.log(`Подписка успешно создана: ${subscription.id} для компании ${data.companyId}`);
      return subscription;
    } catch (err: any) {
      // Ошибка — снимаем замок, чтобы можно было повторить позже
      await this.redis.del(redisKey);
      this.logger.error(`Ошибка при идемпотентном создании подписки: ${err?.message || err}`, err?.stack);
      throw err;
    }
  }

  /**
   * Обновление подписки с бизнес-логикой
   */
  async updateSubscription(id: string, data: UpdateSubscriptionData): Promise<Subscription> {
    this.logger.log(`Обновление подписки: ${id}`);

    const beforeSubscription = await this.subscriptionsDataService.findById(id);
    if (!beforeSubscription) {
      throw new SubscriptionNotFoundException(id);
    }

    // При активации — авто-деактивация других активных
    if (data.status === SubscriptionStatus.ACTIVE && beforeSubscription.status !== SubscriptionStatus.ACTIVE) {
      await this.autoDeactivatePreviousSubscriptions(beforeSubscription.companyId);
    }

    const updatedSubscription = await this.subscriptionsDataService.update(id, data);

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
   * Отмена подписки
   */
  async cancelSubscription(id: string): Promise<Subscription> {
    this.logger.log(`Отмена подписки: ${id}`);

    const subscription = await this.subscriptionsDataService.findById(id);
    if (!subscription) {
      throw new SubscriptionNotFoundException(id);
    }

    // Валидация перехода статуса
    await this.subscriptionsValidationService.validateUpdateData(id, {
      status: SubscriptionStatus.CANCELED,
      autoRenew: false,
    });

    const updatedSubscription = await this.subscriptionsDataService.update(id, {
      status: SubscriptionStatus.CANCELED,
      autoRenew: false,
    });

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
   * Обработка истекших подписок (для CRON)
   */
  async processExpiredSubscriptions(): Promise<number> {
    this.logger.log('Начинаем обработку истекших подписок');

    const expiredSubscriptions = await this.subscriptionsDataService.findExpiredSubscriptions();
    let processedCount = 0;

    for (const subscription of expiredSubscriptions) {
      try {
        await this.subscriptionsDataService.update(subscription.id, {
          status: SubscriptionStatus.EXPIRED,
          autoRenew: false,
        });

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
      } catch (error: any) {
        this.logger.error(`Ошибка при обработке истекшей подписки ${subscription.id}: ${error?.message || error}`, error?.stack);
      }
    }

    this.logger.log(`Обработка истекших подписок завершена. Обработано: ${processedCount} из ${expiredSubscriptions.length}`);

    return processedCount;
  }

  /**
   * Автодеактивация предыдущих активных подписок
   */
  async autoDeactivatePreviousSubscriptions(companyId: string): Promise<void> {
    this.logger.log(`Деактивация предыдущих подписок для компании: ${companyId}`);

    const activeSubscription = await this.subscriptionsDataService.findActiveByCompany(companyId);

    if (activeSubscription) {
      await this.subscriptionsDataService.update(activeSubscription.id, {
        status: SubscriptionStatus.INACTIVE,
      });

      await this.auditService.logSubscriptionUpdated({
        entityId: activeSubscription.id,
        entityType: 'Subscription',
        companyId,
        changes: {
          before: { status: SubscriptionStatus.ACTIVE },
          after: { status: SubscriptionStatus.INACTIVE },
        },
        metadata: {
          reason: 'Auto-deactivated due to new or re-activated subscription',
          deactivatedAt: new Date(),
        },
      });

      this.logger.log(`Деактивирована предыдущая подписка ${activeSubscription.id} для компании ${companyId}`);
    } else {
      this.logger.log(`Активных подписок для деактивации не найдено для компании ${companyId}`);
    }
  }

  /**
   * Продление подписки
   */
  async renewSubscription(id: string, newEndDate: Date): Promise<Subscription> {
    this.logger.log(`Продление подписки: ${id}`);

    const subscription = await this.subscriptionsDataService.findById(id);
    if (!subscription) {
      throw new SubscriptionNotFoundException(id);
    }

    if (newEndDate <= subscription.endDate) {
      throw new ValidationDataException('endDate', 'Новая дата окончания должна быть позже текущей');
    }

    await this.subscriptionsValidationService.validateUpdateData(id, {
      endDate: newEndDate,
      status: SubscriptionStatus.ACTIVE,
    });

    const updatedSubscription = await this.subscriptionsDataService.update(id, {
      endDate: newEndDate,
      status: SubscriptionStatus.ACTIVE,
    });

    await this.auditService.logSubscriptionRenewed({
      entityId: id,
      entityType: 'Subscription',
      companyId: subscription.companyId,
      changes: {
        before: {
          endDate: subscription.endDate,
          status: subscription.status,
        },
        after: {
          endDate: newEndDate,
          status: SubscriptionStatus.ACTIVE,
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

  private buildIdempotencyKey(companyId: string, idempotencyKey: string): string {
    const hash = createHash('sha256').update(`${companyId}:${idempotencyKey}`).digest('hex');
    return SUBSCRIPTIONS_CONSTANTS.REDIS_KEYS.IDEMPOTENCY_CREATE(companyId, hash);
  }

  private delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
      updatedAt,
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
      updatedAt,
    };
  }
}
