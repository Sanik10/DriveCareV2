import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Service } from '../../../database/entities';
import { CreateServiceDto } from '../dto/request/create-service.dto';
import { UpdateServiceDto } from '../dto/request/update-service.dto';
import { ServicesFilter, ServiceStats } from '../types/services.types';
import { SERVICES_CONSTANTS } from '../constants/services.constants';

@Injectable()
export class ServicesDataService {
  constructor(
    @InjectRepository(Service)
    private readonly serviceRepository: Repository<Service>,
  ) {}

  /**
   * 🔒 Получение всех услуг с обязательной фильтрацией по companyId
   */
  async findWithFilters(filter: ServicesFilter): Promise<[Service[], number]> {
    const query = this.serviceRepository.createQueryBuilder('service');

    // 🔒 ОБЯЗАТЕЛЬНАЯ фильтрация по companyId
    if (filter.companyId) {
      query.andWhere('service.companyId = :companyId', { companyId: filter.companyId });
    }

    // Фильтрация по категории
    if (filter.categoryId) {
      query.andWhere('service.categoryId = :categoryId', { categoryId: filter.categoryId });
    }

    // Фильтрация по активности
    if (filter.isActive !== undefined) {
      query.andWhere('service.isActive = :isActive', { isActive: filter.isActive });
    }

    // Поиск по названию и описанию
    if (filter.search) {
      query.andWhere(
        '(service.name ILIKE :search OR service.description ILIKE :search)',
        { search: `%${filter.search}%` }
      );
    }

    // Фильтрация по ценовому диапазону
    if (filter.minPrice !== undefined) {
      query.andWhere('service.price >= :minPrice', { minPrice: filter.minPrice });
    }

    if (filter.maxPrice !== undefined) {
      query.andWhere('service.price <= :maxPrice', { maxPrice: filter.maxPrice });
    }

    // Фильтрация по длительности
    if (filter.minDuration !== undefined) {
      query.andWhere('service.durationMinutes >= :minDuration', { minDuration: filter.minDuration });
    }

    if (filter.maxDuration !== undefined) {
      query.andWhere('service.durationMinutes <= :maxDuration', { maxDuration: filter.maxDuration });
    }

    // Сортировка
    const sortBy = filter.sortBy || SERVICES_CONSTANTS.DEFAULT_SORT_BY;
    const sortOrder = filter.sortOrder || SERVICES_CONSTANTS.DEFAULT_SORT_ORDER;
    query.orderBy(`service.${sortBy}`, sortOrder);

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
   * 🔍 Получение услуги по ID
   */
  async findById(id: string): Promise<Service | null> {
    return this.serviceRepository.findOne({
      where: { id }
    });
  }

  /**
   * 🔒 Получение услуг по категории с фильтрацией по компании
   */
  async findByCategory(categoryId: string, companyId: string): Promise<Service[]> {
    return this.serviceRepository.find({
      where: { 
        categoryId,
        companyId, // 🔒 Обязательная фильтрация
        isActive: true // Только активные услуги
      },
      order: { name: 'ASC' }
    });
  }

  /**
   * 🔒 Получение активных услуг компании (для быстрых операций)
   */
  async findActiveByCompany(companyId: string): Promise<Service[]> {
    return this.serviceRepository.find({
      where: { 
        companyId,
        isActive: true
      },
      order: { name: 'ASC' }
    });
  }

  /**
   * 🔒 Поиск услуг по названию в компании
   */
  async searchByName(name: string, companyId: string, limit: number = 10): Promise<Service[]> {
    return this.serviceRepository
      .createQueryBuilder('service')
      .where('service.companyId = :companyId', { companyId })
      .andWhere('service.name ILIKE :name', { name: `%${name}%` })
      .andWhere('service.isActive = :isActive', { isActive: true })
      .orderBy('service.name', 'ASC')
      .limit(limit)
      .getMany();
  }

  /**
   * ➕ Создание новой услуги
   */
  async create(dto: CreateServiceDto, companyId: string): Promise<Service> {
    const service = this.serviceRepository.create({
      ...dto,
      companyId, // 🔒 Привязываем к компании
      isActive: dto.isActive ?? true, // По умолчанию активная
    });

    return this.serviceRepository.save(service);
  }

  /**
   * ✏️ Обновление услуги
   */
  async update(id: string, dto: UpdateServiceDto): Promise<Service> {
    await this.serviceRepository.update(id, dto);
    
    // Возвращаем обновленную сущность
    const updatedService = await this.findById(id);
    if (!updatedService) {
      throw new Error(`Service with id ${id} not found after update`);
    }
    
    return updatedService;
  }

  /**
   * 🗑️ Удаление услуги
   */
  async remove(id: string): Promise<void> {
    await this.serviceRepository.delete(id);
  }

  /**
   * 🔄 Переключение статуса активности
   */
  async toggleStatus(id: string): Promise<Service> {
    const service = await this.findById(id);
    if (!service) {
      throw new Error(`Service with id ${id} not found`);
    }

    service.isActive = !service.isActive;
    return this.serviceRepository.save(service);
  }

  /**
   * 🔥 Массовое обновление услуг
   */
  async bulkUpdate(serviceIds: string[], updates: Partial<UpdateServiceDto>): Promise<number> {
    const result = await this.serviceRepository.update(serviceIds, updates);
    return result.affected || 0;
  }

  /**
   * 🔥 Массовое переключение статуса
   */
  async bulkToggleStatus(serviceIds: string[], isActive: boolean): Promise<number> {
    const result = await this.serviceRepository.update(serviceIds, { isActive });
    return result.affected || 0;
  }

  /**
   * 📊 Получение статистики услуг по компании
   */
  async getServicesStats(companyId: string): Promise<ServiceStats> {
    const basicStats = await this.serviceRepository
      .createQueryBuilder('service')
      .select([
        'COUNT(*) as total',
        'COUNT(CASE WHEN service.isActive = true THEN 1 END) as active',
        'COUNT(CASE WHEN service.isActive = false THEN 1 END) as inactive',
        'AVG(service.price) as avgPrice',
        'AVG(service.durationMinutes) as avgDuration'
      ])
      .where('service.companyId = :companyId', { companyId })
      .getRawOne();

    const categoryStats = await this.serviceRepository
      .createQueryBuilder('service')
      .leftJoin('service_categories', 'category', 'category.id = service.categoryId')
      .select([
        'service.categoryId as categoryId',
        'category.name as categoryName',
        'COUNT(*) as count'
      ])
      .where('service.companyId = :companyId', { companyId })
      .groupBy('service.categoryId, category.name')
      .orderBy('count', 'DESC')
      .getRawMany();

    return {
      total: parseInt(basicStats.total) || 0,
      active: parseInt(basicStats.active) || 0,
      inactive: parseInt(basicStats.inactive) || 0,
      avgPrice: parseFloat(basicStats.avgprice) || 0,
      avgDuration: parseFloat(basicStats.avgduration) || 0,
      byCategory: categoryStats.map(stat => ({
        categoryId: stat.categoryid,
        categoryName: stat.categoryname || 'Без категории',
        count: parseInt(stat.count) || 0,
      })),
    };
  }

  /**
   * 📊 Получение топ услуг по популярности (для аналитики)
   */
  async getTopServicesByUsage(companyId: string, limit: number = 10): Promise<Service[]> {
    // TODO: Implement when orders system is ready
    // For now, return services ordered by creation date
    return this.serviceRepository.find({
      where: { 
        companyId,
        isActive: true
      },
      order: { createdAt: 'DESC' },
      take: limit
    });
  }

  /**
   * 💰 Получение услуг в ценовом диапазоне
   */
  async findByPriceRange(
    companyId: string, 
    minPrice: number, 
    maxPrice: number
  ): Promise<Service[]> {
    return this.serviceRepository.find({
      where: {
        companyId,
        isActive: true,
      },
      order: { price: 'ASC' }
    });
  }

  /**
   * ⏱️ Получение услуг по длительности
   */
  async findByDuration(
    companyId: string, 
    maxDuration: number
  ): Promise<Service[]> {
    return this.serviceRepository
      .createQueryBuilder('service')
      .where('service.companyId = :companyId', { companyId })
      .andWhere('service.durationMinutes <= :maxDuration', { maxDuration })
      .andWhere('service.isActive = :isActive', { isActive: true })
      .orderBy('service.durationMinutes', 'ASC')
      .getMany();
  }
}