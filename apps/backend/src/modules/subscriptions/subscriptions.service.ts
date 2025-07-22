import { Injectable, Logger } from '@nestjs/common';
import { SubscriptionsDataService } from './services/subscriptions-data.service';
import { SubscriptionsBusinessService } from './services/subscriptions-business.service';
import { SubscriptionsValidationService } from './services/subscriptions-validation.service';
import { SubscriptionLimitsService } from './services/subscription-limits.service';
import { SubscriptionsMapperService } from './services/subscriptions-mapper.service'; // 🔥 ДОБАВЛЕНО
import { CreateSubscriptionDto } from './dto/request/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/request/update-subscription.dto';
import { SubscriptionResponseDto } from './dto/response/subscription-response.dto';
import { SubscriptionStatus, PaginatedSubscriptionsResult, TariffLimits } from './types/subscriptions.types'; // 🔥 ДОБАВЛЕНО TariffLimits
import { SUBSCRIPTIONS_CONSTANTS } from './constants/subscriptions.constants';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private readonly subscriptionsDataService: SubscriptionsDataService,
    private readonly subscriptionsBusinessService: SubscriptionsBusinessService,
    private readonly subscriptionsValidationService: SubscriptionsValidationService,
    private readonly subscriptionLimitsService: SubscriptionLimitsService,
    private readonly subscriptionsMapperService: SubscriptionsMapperService, // 🔥 ДОБАВЛЕНО
  ) {}

  /**
   * Создание новой подписки
   */
  async create(createSubscriptionDto: CreateSubscriptionDto): Promise<SubscriptionResponseDto> {
    this.logger.log(`Создание новой подписки для компании: ${createSubscriptionDto.companyId}`);

    // Валидация данных
    await this.subscriptionsValidationService.validateCreateData(createSubscriptionDto);

    // Создание через бизнес-сервис
    const subscription = await this.subscriptionsBusinessService.createSubscription(createSubscriptionDto);

    this.logger.log(`Подписка успешно создана: ${subscription.id} для компании ${createSubscriptionDto.companyId}`);

    return this.subscriptionsMapperService.mapToResponseDto(subscription); // 🔥 ИСПРАВЛЕНО: используем MapperService
  }

  /**
   * Получение подписок компании с пагинацией
   */
  async findByCompany(
    companyId: string,
    page: number = 1,
    limit: number = SUBSCRIPTIONS_CONSTANTS.DEFAULTS.PAGE_SIZE,
    status?: SubscriptionStatus
  ): Promise<PaginatedSubscriptionsResult> {
    this.logger.log(`Поиск подписок для компании: ${companyId}, страница: ${page}, лимит: ${limit}, статус: ${status}`);

    // Проверяем существование компании
    await this.subscriptionsValidationService.validateCompanyExists(companyId);

    const [subscriptions, total] = await this.subscriptionsDataService.findByCompany(companyId, page, limit, status);

    const totalPages = Math.ceil(total / limit);

    return {
      items: this.subscriptionsMapperService.mapArrayToResponseDto(subscriptions), // 🔥 ИСПРАВЛЕНО: используем MapperService
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Получение активной подписки компании
   */
  async findActiveByCompany(companyId: string): Promise<SubscriptionResponseDto | null> {
    this.logger.log(`Поиск активной подписки для компании: ${companyId}`);

    const subscription = await this.subscriptionsDataService.findActiveByCompany(companyId);
    
    return subscription ? this.subscriptionsMapperService.mapToResponseDto(subscription) : null; // 🔥 ИСПРАВЛЕНО: используем MapperService
  }

  /**
   * Получение подписки по ID
   */
  async findOne(id: string): Promise<SubscriptionResponseDto> {
    this.logger.log(`Поиск подписки по ID: ${id}`);

    const subscription = await this.subscriptionsValidationService.validateSubscriptionExists(id);

    return this.subscriptionsMapperService.mapToResponseDto(subscription); // 🔥 ИСПРАВЛЕНО: используем MapperService
  }

  /**
   * Обновление подписки
   */
  async update(id: string, updateSubscriptionDto: UpdateSubscriptionDto): Promise<SubscriptionResponseDto> {
    this.logger.log(`Обновление подписки: ${id}`);

    // Валидация данных
    await this.subscriptionsValidationService.validateUpdateData(id, updateSubscriptionDto);

    // Обновление через бизнес-сервис
    const updatedSubscription = await this.subscriptionsBusinessService.updateSubscription(id, updateSubscriptionDto);

    this.logger.log(`Подписка успешно обновлена: ${id}`);

    return this.subscriptionsMapperService.mapToResponseDto(updatedSubscription); // 🔥 ИСПРАВЛЕНО: используем MapperService
  }

  /**
   * Отмена подписки
   */
  async cancel(id: string): Promise<SubscriptionResponseDto> {
    this.logger.log(`Отмена подписки: ${id}`);

    // Отмена через бизнес-сервис
    const canceledSubscription = await this.subscriptionsBusinessService.cancelSubscription(id);

    this.logger.log(`Подписка успешно отменена: ${id}`);

    return this.subscriptionsMapperService.mapToResponseDto(canceledSubscription); // 🔥 ИСПРАВЛЕНО: используем MapperService
  }

  /**
   * 🔥 CRON: Проверка истекших подписок
   */
  async checkExpiredSubscriptions(): Promise<number> {
    this.logger.log('Запуск проверки истекших подписок');

    const processedCount = await this.subscriptionsBusinessService.processExpiredSubscriptions();

    this.logger.log(`Проверка истекших подписок завершена. Обработано: ${processedCount}`);

    return processedCount;
  }

  /**
   * 🔥 ПУБЛИЧНЫЕ методы для проверки лимитов (используются другими модулями)
   */
  async checkUserLimit(companyId: string, currentCount: number, increment: number = 1) {
    return this.subscriptionLimitsService.checkUserLimit(companyId, currentCount, increment);
  }

  async checkCustomerLimit(companyId: string, currentCount: number, increment: number = 1) {
    return this.subscriptionLimitsService.checkCustomerLimit(companyId, currentCount, increment);
  }

  async checkVehicleLimit(companyId: string, currentCount: number, increment: number = 1) {
    return this.subscriptionLimitsService.checkVehicleLimit(companyId, currentCount, increment);
  }

  async checkOrderLimit(companyId: string, currentCount: number, increment: number = 1) {
    return this.subscriptionLimitsService.checkOrderLimit(companyId, currentCount, increment);
  }

  /**
   * Получение информации о лимитах компании
   */
  async getCompanyLimitsInfo(companyId: string) {
    return this.subscriptionLimitsService.getCompanyLimitsInfo(companyId);
  }

  /**
   * 🔥 ИСПРАВЛЕНО: Строгие типы для проверки множественных лимитов
   */
  async checkMultipleLimits(companyId: string, checks: Array<{ type: keyof TariffLimits; currentCount: number; increment?: number }>) {
    return this.subscriptionLimitsService.checkMultipleLimits(companyId, checks);
  }

  /**
   * Вспомогательные методы для других модулей
   */
  async hasActiveSubscription(companyId: string): Promise<boolean> {
    const subscription = await this.subscriptionsDataService.findActiveByCompany(companyId);
    return !!subscription;
  }

  /**
   * 🔥 УЛУЧШЕНО: Получение информации об активной подписке с использованием MapperService
   */
  async getActiveSubscriptionInfo(companyId: string): Promise<{ id: string; tariffName: string; endDate: Date } | null> {
    const subscription = await this.subscriptionsDataService.findActiveByCompany(companyId);
    if (!subscription) return null;

    const basicInfo = this.subscriptionsMapperService.mapToBasicInfo(subscription);
    return {
      id: basicInfo.id,
      tariffName: basicInfo.tariffName || 'Unknown',
      endDate: basicInfo.endDate,
    };
  }

  /**
   * 🔥 НОВОЕ: Получение статистики подписок компании
   */
  async getCompanySubscriptionStats(companyId: string): Promise<{
    active: number;
    expired: number;
    canceled: number;
    total: number;
  }> {
    const [allSubscriptions] = await this.subscriptionsDataService.findByCompany(companyId, 1, 1000);
    
    const stats = {
      active: 0,
      expired: 0,
      canceled: 0,
      total: allSubscriptions.length,
    };

    allSubscriptions.forEach(subscription => {
      switch (subscription.status) {
        case SubscriptionStatus.ACTIVE:
          stats.active++;
          break;
        case SubscriptionStatus.EXPIRED:
          stats.expired++;
          break;
        case SubscriptionStatus.CANCELED:
          stats.canceled++;
          break;
      }
    });

    return stats;
  }

  // 🔥 УДАЛЕНО: Приватный метод mapToResponseDto
  // Теперь вся логика маппинга в SubscriptionsMapperService
}
