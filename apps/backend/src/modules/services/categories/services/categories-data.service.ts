// path: apps/backend/src/modules/services/categories/services/categories-data.service.ts
import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ServiceCategory, Service } from '../../../../database/entities';
import { CreateCategoryDto } from '../dto/request/create-category.dto';
import { UpdateCategoryDto } from '../dto/request/update-category.dto';
import { CategoriesFilter, CategoryStats, CategoryWithServicesCount } from '../types/categories.types';
import { CATEGORIES_CONSTANTS } from '../constants/categories.constants';

@Injectable()
export class CategoriesDataService {
  constructor(
    @InjectRepository(ServiceCategory)
    private readonly categoryRepository: Repository<ServiceCategory>,
    @InjectRepository(Service)
    private readonly serviceRepository: Repository<Service>,
  ) {}

  /**
   * 🔒 Получение всех категорий с фильтрацией по компании
   */
  async findWithFilters(filter: CategoriesFilter): Promise<[ServiceCategory[], number]> {
    const query = this.categoryRepository.createQueryBuilder('category');

    // 🔒 Фильтрация по компании и глобальным категориям
    if (filter.companyId) {
      if (filter.includeGlobal !== false) {
        // По умолчанию включаем глобальные категории
        query.andWhere(
          '(category.companyId = :companyId OR category.companyId IS NULL)', 
          { companyId: filter.companyId }
        );
      } else {
        // Только категории компании
        query.andWhere('category.companyId = :companyId', { companyId: filter.companyId });
      }
    } else if (filter.includeGlobal === true) {
      // Только глобальные категории
      query.andWhere('category.companyId IS NULL');
    }

    // Поиск по названию
    if (filter.search) {
      query.andWhere(
        '(category.name ILIKE :search OR category.description ILIKE :search)',
        { search: `%${filter.search}%` }
      );
    }

    // Сортировка
    const sortBy = filter.sortBy || CATEGORIES_CONSTANTS.DEFAULT_SORT_BY;
    const sortOrder = filter.sortOrder || CATEGORIES_CONSTANTS.DEFAULT_SORT_ORDER;
    query.orderBy(`category.${sortBy}`, sortOrder);

    // Пагинация
    if (filter.limit) {
      query.limit(filter.limit);
    }

    if (filter.offset) {
      query.offset(filter.offset);
    }

    return query.getManyAndCount();
  }

  /**
   * 🔍 Получение категории по ID
   */
  async findById(id: string): Promise<ServiceCategory | null> {
    return this.categoryRepository.findOne({
      where: { id }
    });
  }

  /**
   * 🔍 Поиск категории по названию
   */
  async findByName(name: string, companyId?: string): Promise<ServiceCategory | null> {
    const query = this.categoryRepository.createQueryBuilder('category')
      .where('category.name = :name', { name });

    if (companyId) {
      query.andWhere(
        '(category.companyId = :companyId OR category.companyId IS NULL)', 
        { companyId }
      );
    }

    return query.getOne();
  }

  /**
   * ➕ Создание новой категории
   */
  async create(dto: CreateCategoryDto, companyId: string | null): Promise<ServiceCategory> {
    const category = this.categoryRepository.create({
      ...dto,
      companyId, // null для глобальных категорий
    });

    return this.categoryRepository.save(category);
  }

  /**
   * ✏️ Обновление категории
   */
  async update(id: string, dto: UpdateCategoryDto): Promise<ServiceCategory> {
    await this.categoryRepository.update(id, dto);
    
    const updatedCategory = await this.findById(id);
    if (!updatedCategory) {
      throw new Error(`Category with id ${id} not found after update`);
    }
    
    return updatedCategory;
  }

  /**
   * 🗑️ Удаление категории
   */
  async remove(id: string): Promise<void> {
    await this.categoryRepository.delete(id);
  }

  /**
   * 📊 Получение статистики категорий по компании
   */
  async getCategoriesStats(companyId: string): Promise<CategoryStats> {
    // Основная статистика
    const [totalCompany, totalGlobal] = await Promise.all([
      this.categoryRepository.count({ 
        where: { companyId } 
      }),
      this.categoryRepository.count({ 
        where: { companyId: null } 
      })
    ]);

    // Категории с услугами vs без услуг
    const categoriesWithServices = await this.categoryRepository
      .createQueryBuilder('category')
      .leftJoin('services', 'service', 'service.categoryId = category.id')
      .select([
        'category.id',
        'category.name',
        'COUNT(service.id) as servicesCount'
      ])
      .where('(category.companyId = :companyId OR category.companyId IS NULL)', { companyId })
      .groupBy('category.id, category.name')
      .orderBy('servicesCount', 'DESC')
      .getRawMany();

    const withServices = categoriesWithServices.filter(cat => parseInt(cat.servicescount) > 0).length;
    const withoutServices = categoriesWithServices.filter(cat => parseInt(cat.servicescount) === 0).length;

    // Топ 5 самых используемых категорий
    const mostUsed = categoriesWithServices
      .slice(0, 5)
      .map(cat => ({
        categoryId: cat.category_id,
        categoryName: cat.category_name,
        servicesCount: parseInt(cat.servicescount) || 0,
      }));

    return {
      total: totalCompany + totalGlobal,
      global: totalGlobal,
      company: totalCompany,
      withServices,
      withoutServices,
      mostUsed,
    };
  }

  /**
   * 🌍 Создание глобальных категорий (для инициализации)
   */
  async createGlobalCategories(): Promise<ServiceCategory[]> {
    const globalCategories: Partial<ServiceCategory>[] = CATEGORIES_CONSTANTS.GLOBAL_CATEGORIES.map(name => ({
      name,
      description: `Глобальная категория: ${name}`,
      companyId: null, // Глобальная категория
    }));

    const categories = this.categoryRepository.create(globalCategories);
    return this.categoryRepository.save(categories);
  }

  /**
   * 🔍 ИСПРАВЛЕНО: Получение категорий с количеством услуг (полные данные)
   */
  async findWithServicesCount(companyId: string): Promise<CategoryWithServicesCount[]> {
    const result = await this.categoryRepository
      .createQueryBuilder('category')
      .leftJoin('services', 'service', 'service.categoryId = category.id AND service.companyId = :companyId', { companyId })
      .select([
        'category.id',
        'category.companyId',
        'category.name',
        'category.description',
        'category.createdAt',
        'category.updatedAt',
        'COUNT(service.id) as servicesCount'
      ])
      .where('(category.companyId = :companyId OR category.companyId IS NULL)', { companyId })
      .groupBy('category.id, category.companyId, category.name, category.description, category.createdAt, category.updatedAt')
      .orderBy('category.name', 'ASC')
      .getRawMany();

    return result.map(row => ({
      id: row.category_id,
      companyId: row.category_companyid,
      name: row.category_name,
      description: row.category_description,
      isGlobal: row.category_companyid === null,
      servicesCount: parseInt(row.servicescount) || 0,
      createdAt: new Date(row.category_createdat),
      updatedAt: new Date(row.category_updatedat),
    }));
  }
}
