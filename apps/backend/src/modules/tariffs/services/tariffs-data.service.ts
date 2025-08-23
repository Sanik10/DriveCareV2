// path: apps/backend/src/modules/tariffs/services/tariffs-data.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DeepPartial } from 'typeorm';
import { Tariff } from '../../../database/entities';
import { CreateTariffData, UpdateTariffData, TariffFilter } from '../types/tariffs.types';
import { ITariffsDataService } from '../interfaces/tariffs.interface';
import { TARIFFS_CONSTANTS } from '../constants/tariffs.constants';

@Injectable()
export class TariffsDataService implements ITariffsDataService {
  constructor(
    @InjectRepository(Tariff)
    private readonly tariffsRepository: Repository<Tariff>,
  ) {}

  /**
   * Создание нового тарифа
   */
  async create(data: CreateTariffData): Promise<Tariff> {
    const name = (data.name || '').trim();
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

    const tariff = this.tariffsRepository.create(dataToCreate);
    return this.tariffsRepository.save(tariff);
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
    const nameNormalized = (name || '').trim().toLowerCase();
    return this.tariffsRepository.findOne({
      where: { nameNormalized },
    });
  }

  /**
   * Поиск с фильтрами и пагинацией
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

    const query = this.tariffsRepository.createQueryBuilder('tariff');

    // Фильтр по поиску
    if (search) {
      query.where('(tariff.name ILIKE :search OR tariff.description ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    // Фильтр по статусу активности
    if (typeof isActive === 'boolean') {
      query.andWhere('tariff.isActive = :isActive', { isActive });
    }

    // Фильтр по цене (рубли)
    if (typeof minPrice === 'number') {
      query.andWhere('tariff.priceMonthly >= :minPrice', { minPrice });
    }

    if (typeof maxPrice === 'number') {
      query.andWhere('tariff.priceMonthly <= :maxPrice', { maxPrice });
    }

    // Сортировка
    const sortColumn = this.mapSortField(sortField);
    query.orderBy(sortColumn, (sortOrder || 'asc').toUpperCase() as 'ASC' | 'DESC');

    // Пагинация
    const offset = (page - 1) * limit;
    query.skip(offset).take(limit);

    return query.getManyAndCount();
  }

  /**
   * Обновление тарифа
   */
  async update(id: string, data: UpdateTariffData): Promise<Tariff> {
    const updateData: DeepPartial<Tariff> = {};

    if (data.name !== undefined) {
      const name = (data.name || '').trim();
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

    await this.tariffsRepository.update(id, updateData);

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
   * Получение популярных тарифов (по количеству подписок)
   */
  async getPopularTariffs(limit: number = 5): Promise<Tariff[]> {
    // TODO: заменить на реальный подсчёт по подпискам
    return this.tariffsRepository.find({
      where: { isActive: true },
      order: { priceMonthly: 'ASC' },
      take: limit,
    });
  }

  /**
   * Маппинг полей для сортировки
   */
  private mapSortField(sortField: string): string {
    const fieldMap: Record<string, string> = {
      name: 'tariff.name',
      priceMonthly: 'tariff.priceMonthly',
      priceYearly: 'tariff.priceYearly',
      createdAt: 'tariff.createdAt',
    };

    return fieldMap[sortField] || 'tariff.priceMonthly';
  }
}
