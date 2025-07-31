// src/modules/inventory/parts/services/parts-data.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Part, PartCategory, Company } from '../../../../database/entities';
import { PartFilter, CreatePartData, UpdatePartData } from '../types/parts.types';
import { PARTS_CONSTANTS } from '../constants/parts.constants';

@Injectable()
export class PartsDataService {
  constructor(
    @InjectRepository(Part)
    private readonly partRepository: Repository<Part>,
    @InjectRepository(PartCategory)
    private readonly partCategoryRepository: Repository<PartCategory>,
    @InjectRepository(Company)
    private readonly companyRepository: Repository<Company>,
  ) {}

  /**
   * 🔒 Поиск всех запчастей с фильтрацией
   */
  async findWithFilters(filter: PartFilter): Promise<[Part[], number]> {
    const query = this.partRepository.createQueryBuilder('part')
      .leftJoinAndSelect('part.category', 'category');

    // 🔒 ОБЯЗАТЕЛЬНАЯ фильтрация по companyId
    if (filter.companyId) {
      query.andWhere('part.companyId = :companyId', { companyId: filter.companyId });
    }

    // Фильтр по категории
    if (filter.categoryId) {
      query.andWhere('part.categoryId = :categoryId', { categoryId: filter.categoryId });
    }

    // Фильтр по бренду
    if (filter.brand) {
      query.andWhere('part.brand ILIKE :brand', { brand: `%${filter.brand}%` });
    }

    // Фильтр по статусу активности
    if (filter.isActive !== undefined) {
      query.andWhere('part.isActive = :isActive', { isActive: filter.isActive });
    }

    // Поиск по названию, номеру запчасти, бренду или описанию
    if (filter.search && filter.search.length >= PARTS_CONSTANTS.SEARCH.MIN_SEARCH_LENGTH) {
      query.andWhere(
        '(part.name ILIKE :search OR part.partNumber ILIKE :search OR part.brand ILIKE :search OR part.description ILIKE :search)',
        { search: `%${filter.search}%` }
      );
    }

    // Фильтр по ценовому диапазону (себестоимость)
    if (filter.minCostPrice !== undefined) {
      query.andWhere('part.costPrice >= :minCostPrice', { minCostPrice: filter.minCostPrice });
    }

    if (filter.maxCostPrice !== undefined) {
      query.andWhere('part.costPrice <= :maxCostPrice', { maxCostPrice: filter.maxCostPrice });
    }

    // Фильтр по ценовому диапазону (цена продажи)
    if (filter.minSellingPrice !== undefined) {
      query.andWhere('part.sellingPrice >= :minSellingPrice', { minSellingPrice: filter.minSellingPrice });
    }

    if (filter.maxSellingPrice !== undefined) {
      query.andWhere('part.sellingPrice <= :maxSellingPrice', { maxSellingPrice: filter.maxSellingPrice });
    }

    // Фильтр по дате создания
    if (filter.createdFrom) {
      query.andWhere('part.createdAt >= :createdFrom', { createdFrom: filter.createdFrom });
    }

    if (filter.createdTo) {
      query.andWhere('part.createdAt <= :createdTo', { createdTo: filter.createdTo });
    }

    // Сортировка
    const sortField = filter.sortField || 'createdAt';
    const sortOrder = filter.sortOrder || 'DESC';
    
    switch (sortField) {
      case 'name':
        query.orderBy('part.name', sortOrder.toUpperCase() as 'ASC' | 'DESC');
        break;
      case 'partNumber':
        query.orderBy('part.partNumber', sortOrder.toUpperCase() as 'ASC' | 'DESC');
        break;
      case 'brand':
        query.orderBy('part.brand', sortOrder.toUpperCase() as 'ASC' | 'DESC');
        break;
      case 'costPrice':
        query.orderBy('part.costPrice', sortOrder.toUpperCase() as 'ASC' | 'DESC');
        break;
      case 'sellingPrice':
        query.orderBy('part.sellingPrice', sortOrder.toUpperCase() as 'ASC' | 'DESC');
        break;
      case 'category':
        query.orderBy('category.name', sortOrder.toUpperCase() as 'ASC' | 'DESC');
        break;
      case 'createdAt':
      default:
        query.orderBy('part.createdAt', sortOrder.toUpperCase() as 'ASC' | 'DESC');
    }

    // Пагинация
    if (filter.page && filter.limit) {
      const skip = (filter.page - 1) * filter.limit;
      query.skip(skip).take(filter.limit);
    }

    return query.getManyAndCount();
  }

  /**
   * 🔒 Поиск запчасти по ID
   */
  async findById(id: string): Promise<Part | null> {
    return this.partRepository.findOne({
      where: { id },
      relations: ['category'],
    });
  }

  /**
   * 🔒 Поиск запчасти по ID и компании
   */
  async findByIdAndCompany(id: string, companyId: string): Promise<Part | null> {
    return this.partRepository.findOne({
      where: { 
        id,
        companyId, // 🔒 КРИТИЧНО: проверяем принадлежность
      },
      relations: ['category'],
    });
  }

  /**
   * 🔒 Создание новой запчасти
   */
  async create(data: CreatePartData): Promise<Part> {
    const part = this.partRepository.create(data);
    return this.partRepository.save(part);
  }

  /**
   * 📝 Обновление запчасти
   */
  async update(id: string, data: UpdatePartData): Promise<Part> {
    await this.partRepository.update(id, data);
    
    const updatedPart = await this.findById(id);
    if (!updatedPart) {
      throw new Error(`Part with id ${id} not found after update`);
    }
    
    return updatedPart;
  }

  /**
   * ❌ Удаление запчасти (деактивация)
   */
  async softDelete(id: string): Promise<void> {
    await this.partRepository.update(id, { isActive: false });
  }

  /**
   * ❌ Полное удаление запчасти (только для superadmin)
   */
  async hardDelete(id: string): Promise<void> {
    await this.partRepository.delete(id);
  }

  /**
   * 🔄 Изменение статуса активности
   */
  async setActive(id: string, isActive: boolean): Promise<Part> {
    await this.partRepository.update(id, { isActive });
    
    const updatedPart = await this.findById(id);
    if (!updatedPart) {
      throw new Error(`Part with id ${id} not found after status update`);
    }
    
    return updatedPart;
  }

  /**
   * 🔍 Поиск по номеру запчасти
   */
  async findByPartNumber(partNumber: string, companyId: string): Promise<Part | null> {
    return this.partRepository.findOne({
      where: { 
        partNumber,
        companyId, // 🔒 КРИТИЧНО: фильтрация по компании
      },
      relations: ['category'],
    });
  }

  /**
   * 📊 Получение статистики по запчастям компании
   */
  async getCompanyPartsStats(companyId: string): Promise<{
    totalActive: number;
    totalInactive: number;
    averageCostPrice: number;
    averageSellingPrice: number;
    totalInventoryValue: number;
  }> {
    const [totalActive, totalInactive, priceStats] = await Promise.all([
      // Активные запчасти
      this.partRepository.count({
        where: { companyId, isActive: true },
      }),
      
      // Неактивные запчасти
      this.partRepository.count({
        where: { companyId, isActive: false },
      }),
      
      // Статистика по ценам
      this.partRepository
        .createQueryBuilder('part')
        .select([
          'AVG(part.costPrice) as avgCostPrice',
          'AVG(part.sellingPrice) as avgSellingPrice',
          'SUM(part.costPrice) as totalInventoryValue',
        ])
        .where('part.companyId = :companyId', { companyId })
        .andWhere('part.isActive = true')
        .getRawOne(),
    ]);

    return {
      totalActive,
      totalInactive,
      averageCostPrice: parseFloat(priceStats.avgcostprice) || 0,
      averageSellingPrice: parseFloat(priceStats.avgsellingprice) || 0,
      totalInventoryValue: parseFloat(priceStats.totalinventoryvalue) || 0,
    };
  }

  /**
   * 📊 Получение статистики по категориям
   */
  async getCategoriesStats(companyId: string): Promise<Array<{
    categoryId: string;
    categoryName: string;
    count: number;
  }>> {
    const result = await this.partRepository
      .createQueryBuilder('part')
      .leftJoin('part.category', 'category')
      .select([
        'category.id as categoryId',
        'category.name as categoryName',
        'COUNT(*) as count',
      ])
      .where('part.companyId = :companyId', { companyId })
      .andWhere('part.isActive = true')
      .groupBy('category.id, category.name')
      .orderBy('count', 'DESC')
      .getRawMany();

    return result.map(item => ({
      categoryId: item.categoryid,
      categoryName: item.categoryname || 'Без категории',
      count: parseInt(item.count),
    }));
  }

  /**
   * 🔒 Проверка существования категории
   */
  async validateCategoryExists(categoryId: string, companyId?: string): Promise<boolean> {
    const whereClause: any = { id: categoryId };
    
    // Если указана компания, проверяем принадлежность или глобальность категории
    if (companyId) {
      whereClause.companyId = [companyId, null]; // null для глобальных категорий
    }
    
    const count = await this.partCategoryRepository.count({
      where: whereClause,
    });
    
    return count > 0;
  }

  /**
   * 🔒 Проверка существования компании
   */
  async validateCompanyExists(companyId: string): Promise<boolean> {
    const count = await this.companyRepository.count({
      where: { id: companyId },
    });
    return count > 0;
  }

  /**
   * 📦 Bulk операции - получение нескольких запчастей
   */
  async findMultipleByIds(partIds: string[], companyId: string): Promise<Part[]> {
    if (partIds.length === 0) return [];

    return this.partRepository.find({
      where: { 
        id: partIds as any, // TypeORM's In operator
        companyId, // 🔒 КРИТИЧНО: фильтрация по компании
      },
      relations: ['category'],
    });
  }

  /**
   * 📦 Bulk обновление запчастей
   */
  async bulkUpdate(partIds: string[], updateData: UpdatePartData, companyId: string): Promise<number> {
    const result = await this.partRepository
      .createQueryBuilder()
      .update(Part)
      .set(updateData)
      .where('id IN (:...partIds)', { partIds })
      .andWhere('companyId = :companyId', { companyId }) // 🔒 КРИТИЧНО: фильтрация по компании
      .execute();

    return result.affected || 0;
  }

  /**
   * 🔍 Продвинутый поиск запчастей
   */
  async advancedSearch(searchTerm: string, companyId: string, limit: number = 10): Promise<Part[]> {
    return this.partRepository
      .createQueryBuilder('part')
      .leftJoinAndSelect('part.category', 'category')
      .where('part.companyId = :companyId', { companyId })
      .andWhere('part.isActive = true')
      .andWhere(
        `(
          part.name ILIKE :search OR 
          part.partNumber ILIKE :search OR 
          part.brand ILIKE :search OR 
          part.description ILIKE :search OR
          category.name ILIKE :search
        )`,
        { search: `%${searchTerm}%` }
      )
      .orderBy(
        `CASE 
          WHEN part.name ILIKE :exactSearch THEN 1
          WHEN part.partNumber ILIKE :exactSearch THEN 2
          WHEN part.brand ILIKE :exactSearch THEN 3
          ELSE 4
        END`,
        'ASC'
      )
      .setParameter('exactSearch', `${searchTerm}%`)
      .limit(limit)
      .getMany();
  }

  /**
   * 📈 Получение популярных запчастей
   */
  async getPopularParts(companyId: string, limit: number = 20): Promise<Part[]> {
    // TODO: Реализовать на основе статистики заказов
    // Пока возвращаем последние добавленные активные запчасти
    return this.partRepository.find({
      where: { 
        companyId,
        isActive: true,
      },
      relations: ['category'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * 💰 Получение самых дорогих/дешевых запчастей
   */
  async getPriceExtremes(companyId: string): Promise<{
    mostExpensive: Part | null;
    cheapest: Part | null;
  }> {
    const [mostExpensive, cheapest] = await Promise.all([
      this.partRepository.findOne({
        where: { companyId, isActive: true },
        relations: ['category'],
        order: { costPrice: 'DESC' },
      }),
      this.partRepository.findOne({
        where: { companyId, isActive: true },
        relations: ['category'],
        order: { costPrice: 'ASC' },
      }),
    ]);

    return { mostExpensive, cheapest };
  }
}
