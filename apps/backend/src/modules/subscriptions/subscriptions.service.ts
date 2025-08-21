import { Injectable, Logger } from '@nestjs/common';
import { SubscriptionsDataService } from './services/subscriptions-data.service';
import { SubscriptionsBusinessService } from './services/subscriptions-business.service';
import { SubscriptionsValidationService } from './services/subscriptions-validation.service';
import { SubscriptionLimitsService } from './services/subscription-limits.service';
import { SubscriptionsMapperService } from './services/subscriptions-mapper.service';
import { CreateSubscriptionDto } from './dto/request/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/request/update-subscription.dto';
import { SubscriptionResponseDto } from './dto/response/subscription-response.dto';
import { SubscriptionStatus, PaginatedSubscriptionsResult, TariffLimits } from './types/subscriptions.types';
import { SUBSCRIPTIONS_CONSTANTS } from './constants/subscriptions.constants';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private readonly subscriptionsDataService: SubscriptionsDataService,
    private readonly subscriptionsBusinessService: SubscriptionsBusinessService,
    private readonly subscriptionsValidationService: SubscriptionsValidationService,
    private readonly subscriptionLimitsService: SubscriptionLimitsService,
    private readonly subscriptionsMapperService: SubscriptionsMapperService,
  ) {}

  /**
   * Создание новой подписки (companyId подставляется в контроллере из req.user.companyId)
   */
  async create(createSubscriptionDto: CreateSubscriptionDto, idempotencyKey?: string): Promise<SubscriptionResponseDto> {
    this.logger.log(`Создание новой подписки для компании: ${createSubscriptionDto.companyId}`);

    await this.subscriptionsValidationService.validateCreateData(createSubscriptionDto);

    const subscription = await this.subscriptionsBusinessService.createSubscription(
      createSubscriptionDto,
      idempotencyKey,
    );

    this.logger.log(`Подписка успешно создана: ${subscription.id} для компании ${createSubscriptionDto.companyId}`);

    return this.subscriptionsMapperService.mapToResponseDto(subscription);
  }

  /**
   * Получение подписок компании с пагинацией
   */
  async findByCompany(
    companyId: string,
    page: number = 1,
    limit: number = SUBSCRIPTIONS_CONSTANTS.DEFAULTS.PAGE_SIZE,
    status?: SubscriptionStatus,
  ): Promise<PaginatedSubscriptionsResult> {
    this.logger.log(
      `Поиск подписок для компании: ${companyId}, страница: ${page}, лимит: ${limit}, статус: ${status}`,
    );

    await this.subscriptionsValidationService.validateCompanyExists(companyId);

    const [subscriptions, total] = await this.subscriptionsDataService.findByCompany(
      companyId,
      page,
      limit,
      status,
    );

    const totalPages = Math.ceil(total / limit);

    return {
      items: this.subscriptionsMapperService.mapArrayToResponseDto(subscriptions),
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

    return subscription ? this.subscriptionsMapperService.mapToResponseDto(subscription) : null;
  }

  /**
   * Получение подписки по ID
   */
  async findOne(id: string): Promise<SubscriptionResponseDto> {
    this.logger.log(`Поиск подписки по ID: ${id}`);

    const subscription = await this.subscriptionsValidationService.validateSubscriptionExists(id);

    return this.subscriptionsMapperService.mapToResponseDto(subscription);
  }

  /**
   * Обновление подписки
   */
  async update(id: string, updateSubscriptionDto: UpdateSubscriptionDto): Promise<SubscriptionResponseDto> {
    this.logger.log(`Обновление подписки: ${id}`);

    await this.subscriptionsValidationService.validateUpdateData(id, updateSubscriptionDto);

    const updatedSubscription = await this.subscriptionsBusinessService.updateSubscription(
      id,
      updateSubscriptionDto,
    );

    this.logger.log(`Подписка успешно обновлена: ${id}`);

    return this.subscriptionsMapperService.mapToResponseDto(updatedSubscription);
  }

  /**
   * Отмена подписки
   */
  async cancel(id: string): Promise<SubscriptionResponseDto> {
    this.logger.log(`Отмена подписки: ${id}`);

    const canceledSubscription = await this.subscriptionsBusinessService.cancelSubscription(id);

    this.logger.log(`Подписка успешно отменена: ${id}`);

    return this.subscriptionsMapperService.mapToResponseDto(canceledSubscription);
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
   * Проверка нескольких лимитов за один вызов
   */
  async checkMultipleLimits(
    companyId: string,
    checks: Array<{ type: keyof TariffLimits; currentCount: number; increment?: number }>,
  ) {
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
   * Получение краткой информации об активной подписке
   */
  async getActiveSubscriptionInfo(
    companyId: string,
  ): Promise<{ id: string; tariffName: string; endDate: Date } | null> {
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
   * Получение агрегированной статистики подписок компании (без загрузки большого массива)
   */
  async getCompanySubscriptionStats(companyId: string): Promise<{
    active: number;
    expired: number;
    canceled: number;
    total: number;
  }> {
    const counts = await this.subscriptionsDataService.countByStatus(companyId);

    const active = counts[SubscriptionStatus.ACTIVE] || 0;
    const expired = counts[SubscriptionStatus.EXPIRED] || 0;
    const canceled = counts[SubscriptionStatus.CANCELED] || 0;

    const total =
      (counts[SubscriptionStatus.ACTIVE] || 0) +
      (counts[SubscriptionStatus.PENDING] || 0) +
      (counts[SubscriptionStatus.SUSPENDED] || 0) +
      (counts[SubscriptionStatus.CANCELED] || 0) +
      (counts[SubscriptionStatus.EXPIRED] || 0) +
      (counts[SubscriptionStatus.INACTIVE] || 0);

    return { active, expired, canceled, total };
  }
}
