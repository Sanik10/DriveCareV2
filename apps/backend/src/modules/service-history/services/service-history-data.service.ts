import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VehicleServiceHistory } from '../../../database/entities/service-history.entity';
import { CreateServiceHistoryData, UpdateServiceHistoryData, ServiceHistoryFilter, ServiceHistoryStats } from '../types/service-history.types';
import { IServiceHistoryDataService } from '../interfaces/service-history.interface';
import { SERVICE_HISTORY_CONSTANTS } from '../constants/service-history.constants';
import { ValidationDataException } from '../../../common/exceptions/domain.exceptions';

@Injectable()
export class ServiceHistoryDataService implements IServiceHistoryDataService {
  constructor(
    @InjectRepository(VehicleServiceHistory)
    private readonly serviceHistoryRepository: Repository<VehicleServiceHistory>,
  ) {}

  async create(data: CreateServiceHistoryData): Promise<VehicleServiceHistory> {
    const serviceHistory = this.serviceHistoryRepository.create(data);
    return this.serviceHistoryRepository.save(serviceHistory);
  }

  async findAll(): Promise<VehicleServiceHistory[]> {
    return this.serviceHistoryRepository.find({
      where: { isDeleted: false },
      order: { date: 'DESC' },
      relations: ['vehicle', 'vehicle.customer', 'vehicle.model', 'vehicle.model.brand'],
    });
  }

  async findById(id: string): Promise<VehicleServiceHistory | null> {
    return this.serviceHistoryRepository.findOne({
      where: { id, isDeleted: false },
      relations: ['vehicle', 'vehicle.customer', 'vehicle.model', 'vehicle.model.brand'],
    });
  }

  // 🔥 КРИТИЧНО: Безопасная фильтрация с обязательной проверкой companyId
  async findWithFilters(filter: ServiceHistoryFilter): Promise<[VehicleServiceHistory[], number]> {
    const {
      search,
      vehicleId,
      companyId,
      customerId,
      orderId,
      dateFrom,
      dateTo,
      nextServiceFrom,
      nextServiceTo,
      mileageFrom,
      mileageTo,
      hasNextService,
      page = 1,
      limit = SERVICE_HISTORY_CONSTANTS.DEFAULTS.PAGE_SIZE,
      sortField = 'date',
      sortOrder = 'desc',
      includeDeleted = false
    } = filter;

    // 🔒 КРИТИЧНО: Обязательная проверка companyId для безопасности
    if (!companyId) {
      throw new ValidationDataException(
        'companyId',
        'Company ID is required for security filtering'
      );
    }

    const query = this.serviceHistoryRepository.createQueryBuilder('serviceHistory')
      .leftJoinAndSelect('serviceHistory.vehicle', 'vehicle')
      .leftJoinAndSelect('vehicle.customer', 'customer')
      .leftJoinAndSelect('vehicle.model', 'model')
      .leftJoinAndSelect('model.brand', 'brand');

    // 🔒 ОБЯЗАТЕЛЬНАЯ фильтрация по companyId (первая и главная!)
    query.andWhere('serviceHistory.companyId = :companyId', { companyId });

    if (!includeDeleted) {
      query.andWhere('serviceHistory.isDeleted = false');
      query.andWhere('vehicle.isDeleted = false');
    }

    if (search) {
      query.andWhere(
        '(serviceHistory.description ILIKE :search OR serviceHistory.notes ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    if (vehicleId) {
      query.andWhere('serviceHistory.vehicleId = :vehicleId', { vehicleId });
    }

    if (customerId) {
      query.andWhere('vehicle.customerId = :customerId', { customerId });
    }

    if (orderId) {
      query.andWhere('serviceHistory.orderId = :orderId', { orderId });
    }

    if (dateFrom) {
      query.andWhere('serviceHistory.date >= :dateFrom', { dateFrom });
    }

    if (dateTo) {
      query.andWhere('serviceHistory.date <= :dateTo', { dateTo });
    }

    if (nextServiceFrom) {
      query.andWhere('serviceHistory.nextServiceDate >= :nextServiceFrom', { nextServiceFrom });
    }

    if (nextServiceTo) {
      query.andWhere('serviceHistory.nextServiceDate <= :nextServiceTo', { nextServiceTo });
    }

    if (mileageFrom !== undefined) {
      query.andWhere('serviceHistory.mileage >= :mileageFrom', { mileageFrom });
    }

    if (mileageTo !== undefined) {
      query.andWhere('serviceHistory.mileage <= :mileageTo', { mileageTo });
    }

    if (hasNextService !== undefined) {
      if (hasNextService) {
        query.andWhere('serviceHistory.nextServiceDate IS NOT NULL');
      } else {
        query.andWhere('serviceHistory.nextServiceDate IS NULL');
      }
    }

    const sortColumn = this.mapSortField(sortField);
    query.orderBy(sortColumn, sortOrder.toUpperCase() as 'ASC' | 'DESC');

    const offset = (page - 1) * limit;
    query.skip(offset).take(limit);

    return query.getManyAndCount();
  }

  async update(id: string, data: UpdateServiceHistoryData): Promise<VehicleServiceHistory> {
    const updateData: Partial<VehicleServiceHistory> = {};
    
    Object.keys(data).forEach(key => {
      if (data[key] !== undefined) {
        updateData[key] = data[key];
      }
    });

    await this.serviceHistoryRepository.update(id, updateData);
    
    const updatedServiceHistory = await this.findById(id);
    if (!updatedServiceHistory) {
      throw new Error(`Service history with id ${id} not found after update`);
    }
    
    return updatedServiceHistory;
  }

  async softDelete(id: string): Promise<void> {
    await this.serviceHistoryRepository.update(id, { 
      isDeleted: true, 
      deletedAt: new Date() 
    });
  }

  async hardDelete(id: string): Promise<void> {
    await this.serviceHistoryRepository.delete(id);
  }

  async getStats(companyId: string): Promise<ServiceHistoryStats> {
    const baseQuery = this.serviceHistoryRepository
      .createQueryBuilder('serviceHistory')
      .where('serviceHistory.companyId = :companyId', { companyId })
      .andWhere('serviceHistory.isDeleted = false');

    // Общая статистика
    const totalRecords = await baseQuery.getCount();

    // Предстоящие ТО (в ближайшие 30 дней)
    const upcomingDate = new Date();
    upcomingDate.setDate(upcomingDate.getDate() + 30);
    
    const upcomingServices = await this.serviceHistoryRepository
      .createQueryBuilder('serviceHistory')
      .where('serviceHistory.companyId = :companyId', { companyId })
      .andWhere('serviceHistory.isDeleted = false')
      .andWhere('serviceHistory.nextServiceDate IS NOT NULL')
      .andWhere('serviceHistory.nextServiceDate <= :upcomingDate', { upcomingDate })
      .andWhere('serviceHistory.nextServiceDate >= :now', { now: new Date() })
      .getCount();

    // Просроченные ТО
    const overdueServices = await this.serviceHistoryRepository
      .createQueryBuilder('serviceHistory')
      .where('serviceHistory.companyId = :companyId', { companyId })
      .andWhere('serviceHistory.isDeleted = false')
      .andWhere('serviceHistory.nextServiceDate IS NOT NULL')
      .andWhere('serviceHistory.nextServiceDate < :now', { now: new Date() })
      .getCount();

    // Средний интервал обслуживания (упрощенный расчет)
    const averageServiceInterval = 180; // TODO: Реализовать правильный расчет

    // Статистика по месяцам
    const thisMonth = new Date();
    thisMonth.setDate(1);
    
    const lastMonth = new Date(thisMonth);
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const thisYear = new Date();
    thisYear.setMonth(0);
    thisYear.setDate(1);

    const serviceFrequency = {
      thisMonth: await baseQuery
        .clone()
        .andWhere('serviceHistory.date >= :thisMonth', { thisMonth })
        .getCount(),
      
      lastMonth: await baseQuery
        .clone()
        .andWhere('serviceHistory.date >= :lastMonth', { lastMonth })
        .andWhere('serviceHistory.date < :thisMonth', { thisMonth })
        .getCount(),
      
      thisYear: await baseQuery
        .clone()
        .andWhere('serviceHistory.date >= :thisYear', { thisYear })
        .getCount(),
    };

    return {
      totalRecords,
      averageServiceInterval,
      totalMileageServiced: 0, // TODO: Реализовать
      upcomingServices,
      overdueServices,
      serviceFrequency,
    };
  }

  async countByCompany(companyId: string): Promise<number> {
    return this.serviceHistoryRepository.count({
      where: { companyId, isDeleted: false },
    });
  }

  async getLatestByVehicle(vehicleId: string): Promise<VehicleServiceHistory | null> {
    return this.serviceHistoryRepository.findOne({
      where: { vehicleId, isDeleted: false },
      order: { date: 'DESC' },
    });
  }

  async getUpcomingServices(companyId: string, days: number = 30): Promise<VehicleServiceHistory[]> {
	const futureDate = new Date();
	futureDate.setDate(futureDate.getDate() + days);

	return this.serviceHistoryRepository
		.createQueryBuilder('serviceHistory')
		.leftJoinAndSelect('serviceHistory.vehicle', 'vehicle')
		.leftJoinAndSelect('vehicle.customer', 'customer')
		.where('serviceHistory.companyId = :companyId', { companyId })
		.andWhere('serviceHistory.isDeleted = false')
		.andWhere('serviceHistory.nextServiceDate IS NOT NULL')
		.andWhere('serviceHistory.nextServiceDate <= :futureDate', { futureDate })
		.andWhere('serviceHistory.nextServiceDate >= :now', { now: new Date() })
		.orderBy('serviceHistory.nextServiceDate', 'ASC')
		.getMany();
  }

  async getOverdueServices(companyId: string): Promise<VehicleServiceHistory[]> {
	return this.serviceHistoryRepository
		.createQueryBuilder('serviceHistory')
		.leftJoinAndSelect('serviceHistory.vehicle', 'vehicle')
		.leftJoinAndSelect('vehicle.customer', 'customer')
		.where('serviceHistory.companyId = :companyId', { companyId })
		.andWhere('serviceHistory.isDeleted = false')
		.andWhere('serviceHistory.nextServiceDate IS NOT NULL')
		.andWhere('serviceHistory.nextServiceDate < :now', { now: new Date() })
		.orderBy('serviceHistory.nextServiceDate', 'ASC')
		.getMany();
  }

  private mapSortField(sortField: string): string {
    const fieldMap: Record<string, string> = {
      date: 'serviceHistory.date',
      mileage: 'serviceHistory.mileage',
      createdAt: 'serviceHistory.createdAt',
      nextServiceDate: 'serviceHistory.nextServiceDate',
    };

    return fieldMap[sortField] || 'serviceHistory.date';
  }
}
