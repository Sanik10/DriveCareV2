// path: apps/backend/src/modules/tariffs/services/tariffs-data.service.ts
import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, In, Repository } from 'typeorm';
import { Tariff } from '../../../database/entities';
import { Subscription } from '../../../database/entities';
import { SubscriptionStatus } from '../../../database/entities/subscription.entity';
import { CreateTariffData, UpdateTariffData, TariffFilter, TariffMetricsMap } from '../types/tariffs.types';
import { ITariffsDataService } from '../interfaces/tariffs.interface';
import { TARIFFS_CONSTANTS } from '../constants/tariffs.constants';

@Injectable()
export class TariffsDataService implements ITariffsDataService {
  constructor(
    @InjectRepository(Tariff)
    private readonly tariffsRepository: Repository<Tariff>,
    @InjectRepository(Subscription)
    private readonly subscriptionsRepository: Repository<Subscription>,
  ) {}

  /**
   * Создание нового тарифа
   */
  async create(data: CreateTariffData): Promise<Tariff> {
    const name = this.normalizeName(data.name);
    const nameNormalized = name.toLowerCase();

    const dataToCreate: DeepPartial<Tariff> = {
      ...data,
      name,
      // рубли (decimal), без умножения на 100
      priceMonthly: data.priceMonthly,
      priceYearly: data.priceYearly,
      features: data.features || {},
      isActive: data.isActive ?? TARIFFS_CONSTANTS.DEFAULTS.DEFAULT_IS_ACTIVE,
      // нормализованное имя для case-insensitive уникальности
      nameNormalized,
    };

    try {
      const tariff = this.tariffsRepository.create(dataToCreate);
      return await this.tariffsRepository.save(tariff);
    } catch (e: any) {
      const code = e?.code ?? e?.driverError?.code;
      if (code === '23505') {
        // unique violation
        throw new ConflictException(`Тариф с названием "${name}" уже существует`);
      }
      throw e;
    }
  }

  /**
   * Получение всех тарифов
   */
  async findAll(onlyActive: boolean = false): Promise<Tariff[]> {
    const query = this.tariffsRepository.createQueryBuilder('tariff');

    if (onlyActive) {
      query.where('tariff.isActive = :isActive', { isActive: true });
    }

    query.orderBy('tariff.priceMonthly', 'ASC');

    return query.getMany();
  }

  /**
   * Поиск тарифа по ID
   */
  async findById(id: string): Promise<Tariff | null> {
    return this.tariffsRepository.findOne({
      where: { id },
    });
  }

  /**
   * Поиск тарифа по названию (case-insensitive)
   */
  async findByName(name: string): Promise<Tariff | null> {
    const nameNormalized = this.normalizeName(name).toLowerCase();
    return this.tariffsRepository.findOne({
      where: { nameNormalized },
    });
  }

  /**
   * Поиск с фильтрами и пагинацией
   * Внимание: фильтры по подписчикам и сортировка по подписчикам реализуются на уровне сервиса,
   * здесь — только базовые поля тарифа.
   */
  async findWithFilters(filter: TariffFilter): Promise<[Tariff[], number]> {
    const {
      search,
      isActive,
      minPrice,
      maxPrice,
      page = 1,
      limit = TARIFFS_CONSTANTS.DEFAULTS.PAGE_SIZE,
      sortField = 'priceMonthly',
      sortOrder = 'asc',
    } = filter;

    const safePage = Number.isFinite(page) && page > 0 ? page : 1;
    const safeLimit = Math.min(
      Math.max(1, Number.isFinite(limit) ? limit : TARIFFS_CONSTANTS.DEFAULTS.PAGE_SIZE),
      TARIFFS_CONSTANTS.DEFAULTS.MAX_ITEMS,
    );

    const query = this.tariffsRepository.createQueryBuilder('tariff');

    // Фильтр по поиску
    if (search) {
      query.where('(tariff.name ILIKE :search OR tariff.description ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    // Фильтр по статусу активности
    if (typeof isActive === 'boolean') {
      if (query.expressionMap.wheres.length === 0) {
        query.where('tariff.isActive = :isActive', { isActive });
      } else {
        query.andWhere('tariff.isActive = :isActive', { isActive });
      }
    }

    // Фильтр по цене (рубли)
    if (typeof minPrice === 'number') {
      query.andWhere('tariff.priceMonthly >= :minPrice', { minPrice });
    }

    if (typeof maxPrice === 'number') {
      query.andWhere('tariff.priceMonthly <= :maxPrice', { maxPrice });
    }

    // Сортировка (только по полям тарифа — сортировка по метрикам делается в сервисе)
    const sortColumn = this.mapSortField(sortField);
    query.orderBy(sortColumn, (sortOrder || 'asc').toUpperCase() as 'ASC' | 'DESC');

    // Пагинация
    const offset = (safePage - 1) * safeLimit;
    query.skip(offset).take(safeLimit);

    return query.getManyAndCount();
  }

  /**
   * Обновление тарифа
   */
  async update(id: string, data: UpdateTariffData): Promise<Tariff> {
    const updateData: DeepPartial<Tariff> = {};

    if (data.name !== undefined) {
      const name = this.normalizeName(data.name);
      updateData.name = name;
      (updateData as any).nameNormalized = name.toLowerCase();
    }
    if (data.description !== undefined) updateData.description = data.description;
    if (data.priceMonthly !== undefined) updateData.priceMonthly = data.priceMonthly;
    if (data.priceYearly !== undefined) updateData.priceYearly = data.priceYearly;
    if (data.maxUsers !== undefined) updateData.maxUsers = data.maxUsers;
    if (data.maxCustomers !== undefined) updateData.maxCustomers = data.maxCustomers;
    if (data.maxVehicles !== undefined) updateData.maxVehicles = data.maxVehicles;
    if (data.maxOrders !== undefined) updateData.maxOrders = data.maxOrders;
    if (data.features !== undefined) updateData.features = data.features;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    try {
      await this.tariffsRepository.update(id, updateData);
    } catch (e: any) {
      const code = e?.code ?? e?.driverError?.code;
      if (code === '23505') {
        throw new ConflictException(`Тариф с таким названием уже существует`);
      }
      throw e;
    }

    const updatedTariff = await this.findById(id);
    if (!updatedTariff) {
      throw new Error(`Tariff with id ${id} not found after update`);
    }

    return updatedTariff;
  }

  /**
   * Удаление тарифа
   */
  async delete(id: string): Promise<void> {
    await this.tariffsRepository.delete(id);
  }

  /**
   * Изменение статуса активности
   */
  async setActive(id: string, isActive: boolean): Promise<Tariff> {
    await this.tariffsRepository.update(id, { isActive });

    const updatedTariff = await this.findById(id);
    if (!updatedTariff) {
      throw new Error(`Tariff with id ${id} not found after status update`);
    }

    return updatedTariff;
  }

  /**
   * Получение популярных тарифов (по количеству активных подписчиков)
   */
  async getPopularTariffs(limit: number = 5): Promise<Tariff[]> {
    const activeTariffs = await this.findAll(true);
    if (!activeTariffs.length) return [];

    const metrics = await this.getSubscribersMetricsByTariff(activeTariffs.map((t) => t.id));
    const sorted = [...activeTariffs].sort((a, b) => {
      const am = metrics[a.id]?.activeSubscribers ?? 0;
      const bm = metrics[b.id]?.activeSubscribers ?? 0;
      if (bm !== am) return bm - am;
      // вторичная сортировка по цене по возрастанию
      return a.priceMonthly - b.priceMonthly;
    });

    return sorted.slice(0, Math.max(1, Math.min(limit, 50)));
  }

  /**
   * Метрики подписчиков по тарифам (distinct companyId):
   * - totalSubscribers: за всё время
   * - activeSubscribers: активные на текущий момент (status=active и дата в интервале)
   */
  async getSubscribersMetricsByTariff(ids: string[], now: Date = new Date()): Promise<TariffMetricsMap> {
    const map: TariffMetricsMap = {};
    if (!ids || ids.length === 0) return map;

    // Все подписчики за всё время
    const totalRows = await this.subscriptionsRepository
      .createQueryBuilder('s')
      .select('s.tariffId', 'tariffId')
      .addSelect('COUNT(DISTINCT s.companyId)', 'total')
      .where('s.tariffId IN (:...ids)', { ids })
      .groupBy('s.tariffId')
      .getRawMany<{ tariffId: string; total: string }>();

    // Активные подписчики на текущий момент
    const activeRows = await this.subscriptionsRepository
      .createQueryBuilder('s')
      .select('s.tariffId', 'tariffId')
      .addSelect('COUNT(DISTINCT s.companyId)', 'active')
      .where('s.tariffId IN (:...ids)', { ids })
      .andWhere('s.status = :status', { status: SubscriptionStatus.ACTIVE })
      .andWhere('s.startDate <= :now', { now })
      .andWhere('s.endDate > :now', { now })
      .groupBy('s.tariffId')
      .getRawMany<{ tariffId: string; active: string }>();

    totalRows.forEach((r) => {
      map[r.tariffId] = map[r.tariffId] || { activeSubscribers: 0, totalSubscribers: 0 };
      map[r.tariffId].totalSubscribers = Number(r.total) || 0;
    });

    activeRows.forEach((r) => {
      map[r.tariffId] = map[r.tariffId] || { activeSubscribers: 0, totalSubscribers: 0 };
      map[r.tariffId].activeSubscribers = Number(r.active) || 0;
    });

    // Инициализируем отсутствующие тарифы нулями
    ids.forEach((id) => {
      if (!map[id]) map[id] = { activeSubscribers: 0, totalSubscribers: 0 };
    });

    return map;
  }

  /**
   * Маппинг полей для сортировки по колонкам тарифа
   */
  private mapSortField(sortField: string): string {
    const fieldMap: Record<string, string> = {
      name: 'tariff.name',
      priceMonthly: 'tariff.priceMonthly',
      priceYearly: 'tariff.priceYearly',
      createdAt: 'tariff.createdAt',
      // activeSubscribers / totalSubscribers — не сортируем на уровне БД (делается в сервисе)
    };

    return fieldMap[sortField] || 'tariff.priceMonthly';
  }

  private normalizeName(name: string): string {
    return (name || '').trim().replace(/\s+/g, ' ');
  }
}
