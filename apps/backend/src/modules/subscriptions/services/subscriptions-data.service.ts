// path: apps/backend/src/modules/subscriptions/services/subscriptions-data.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Subscription, Tariff, Company } from '../../../database/entities';
import { CreateSubscriptionData, UpdateSubscriptionData } from '../types/subscriptions.types';
import { SubscriptionStatus } from '../../../database/entities/subscription.entity';
import { ISubscriptionsDataService } from '../interfaces/subscriptions.interface';
import { SUBSCRIPTIONS_CONSTANTS } from '../constants/subscriptions.constants';
import { SubscriptionNotFoundException } from '../../../common/exceptions/domain.exceptions';

@Injectable()
export class SubscriptionsDataService implements ISubscriptionsDataService {
  constructor(
    @InjectRepository(Subscription)
    private readonly subscriptionsRepository: Repository<Subscription>,
    @InjectRepository(Tariff)
    private readonly tariffsRepository: Repository<Tariff>,
    @InjectRepository(Company)
    private readonly companiesRepository: Repository<Company>,
  ) {}

  /**
   * Создание новой подписки (всегда PENDING по умолчанию)
   */
  async create(data: CreateSubscriptionData): Promise<Subscription> {
    const subscription = this.subscriptionsRepository.create({
      ...data,
      startDate: data.startDate || new Date(),
      status: SubscriptionStatus.PENDING,
      paymentMethod: data.paymentMethod || SUBSCRIPTIONS_CONSTANTS.DEFAULTS.DEFAULT_PAYMENT_METHOD,
      autoRenew: data.autoRenew ?? SUBSCRIPTIONS_CONSTANTS.DEFAULTS.AUTO_RENEW,
    });

    return this.subscriptionsRepository.save(subscription);
  }

  /**
   * Поиск подписки по ID
   */
  async findById(id: string): Promise<Subscription | null> {
    return this.subscriptionsRepository.findOne({
      where: { id },
      relations: ['tariff', 'company'],
    });
  }

  /**
   * Поиск подписок компании с пагинацией
   */
  async findByCompany(
    companyId: string,
    page: number = 1,
    limit: number = SUBSCRIPTIONS_CONSTANTS.DEFAULTS.PAGE_SIZE,
    status?: SubscriptionStatus,
  ): Promise<[Subscription[], number]> {
    const safePage = Math.max(1, page ?? 1);
    const safeLimit = Math.min(Math.max(1, limit ?? SUBSCRIPTIONS_CONSTANTS.DEFAULTS.PAGE_SIZE), SUBSCRIPTIONS_CONSTANTS.DEFAULTS.MAX_ITEMS);

    const query = this.subscriptionsRepository.createQueryBuilder('subscription')
      .where('subscription.companyId = :companyId', { companyId })
      .leftJoinAndSelect('subscription.tariff', 'tariff')
      .orderBy('subscription.createdAt', 'DESC');

    if (status) {
      query.andWhere('subscription.status = :status', { status });
    }

    const offset = (safePage - 1) * safeLimit;
    query.skip(offset).take(safeLimit);

    return query.getManyAndCount();
  }

  /**
   * Поиск активной подписки компании (с предсказуемым порядком)
   */
  async findActiveByCompany(companyId: string): Promise<Subscription | null> {
    return this.subscriptionsRepository.findOne({
      where: {
        companyId,
        status: SubscriptionStatus.ACTIVE,
      },
      relations: ['tariff'],
      order: { endDate: 'DESC', createdAt: 'DESC' },
    });
  }

  /**
   * Поиск истекших подписок
   */
  async findExpiredSubscriptions(): Promise<Subscription[]> {
    const now = new Date();

    return this.subscriptionsRepository.find({
      where: {
        status: SubscriptionStatus.ACTIVE,
        endDate: LessThan(now),
      },
      relations: ['company', 'tariff'],
    });
  }

  /**
   * Обновление подписки
   */
  async update(id: string, data: UpdateSubscriptionData): Promise<Subscription> {
    await this.subscriptionsRepository.update(id, data);

    const updatedSubscription = await this.findById(id);
    if (!updatedSubscription) {
      throw new SubscriptionNotFoundException(id);
    }

    return updatedSubscription;
  }

  /**
   * Удаление подписки
   */
  async delete(id: string): Promise<void> {
    await this.subscriptionsRepository.delete(id);
  }

  /**
   * Деактивация всех активных подписок компании
   */
  async deactivateCompanySubscriptions(companyId: string): Promise<number> {
    const result = await this.subscriptionsRepository.update(
      {
        companyId,
        status: SubscriptionStatus.ACTIVE,
      },
      { status: SubscriptionStatus.INACTIVE },
    );

    return result.affected || 0;
  }

  /**
   * Проверка существования компании
   */
  async companyExists(companyId: string): Promise<boolean> {
    const company = await this.companiesRepository.findOne({
      where: { id: companyId },
    });
    return !!company;
  }

  /**
   * Проверка существования тарифа
   */
  async tariffExists(tariffId: string): Promise<boolean> {
    const tariff = await this.tariffsRepository.findOne({
      where: { id: tariffId },
    });
    return !!tariff;
  }

  /**
   * Получение тарифа по ID
   */
  async findTariffById(tariffId: string): Promise<Tariff | null> {
    return this.tariffsRepository.findOne({
      where: { id: tariffId },
    });
  }

  /**
   * Агрегация: количество по статусам
   */
  async countByStatus(companyId: string): Promise<Record<SubscriptionStatus, number>> {
    const rows = await this.subscriptionsRepository.createQueryBuilder('s')
      .select('s.status', 'status')
      .addSelect('COUNT(*)', 'cnt')
      .where('s.companyId = :companyId', { companyId })
      .groupBy('s.status')
      .getRawMany<{ status: SubscriptionStatus; cnt: string }>();

    const map: Record<SubscriptionStatus, number> = {
      [SubscriptionStatus.ACTIVE]: 0,
      [SubscriptionStatus.PENDING]: 0,
      [SubscriptionStatus.SUSPENDED]: 0,
      [SubscriptionStatus.CANCELED]: 0,
      [SubscriptionStatus.EXPIRED]: 0,
      [SubscriptionStatus.INACTIVE]: 0,
    };

    for (const r of rows) {
      map[r.status] = Number(r.cnt);
    }
    return map;
  }
}
