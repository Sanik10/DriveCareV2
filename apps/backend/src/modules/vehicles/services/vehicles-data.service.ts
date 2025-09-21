// path: apps/backend/src/modules/vehicles/services/vehicles-data.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicle } from '../../../database/entities/vehicle.entity';
import { CreateVehicleData, UpdateVehicleData, VehicleFilter, VehicleStats } from '../types/vehicles.types';
import { IVehiclesDataService } from '../interfaces/vehicles.interface';
import { VEHICLES_CONSTANTS } from '../constants/vehicles.constants';

@Injectable()
export class VehiclesDataService implements IVehiclesDataService {
  constructor(
    @InjectRepository(Vehicle)
    private readonly vehiclesRepository: Repository<Vehicle>,
  ) {}

  async create(data: CreateVehicleData): Promise<Vehicle> {
    const vehicle = this.vehiclesRepository.create({
      ...data,
      mileage: data.mileage ?? VEHICLES_CONSTANTS.DEFAULTS.DEFAULT_MILEAGE,
    });
    return this.vehiclesRepository.save(vehicle);
  }

  async findAll(): Promise<Vehicle[]> {
    return this.vehiclesRepository.find({
      where: { isDeleted: false },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<Vehicle | null> {
    return this.vehiclesRepository.findOne({
      where: { id, isDeleted: false },
      relations: ['customer', 'model', 'model.brand', 'vehicleType', 'serviceHistory'],
    });
  }

  async findByVin(vin: string): Promise<Vehicle | null> {
    return this.vehiclesRepository.findOne({
      where: { vin, isDeleted: false },
    });
  }

  async findByLicensePlate(licensePlate: string, companyId: string): Promise<Vehicle | null> {
    return this.vehiclesRepository.findOne({
      where: { licensePlate, companyId, isDeleted: false },
    });
  }

  async findWithFilters(filter: VehicleFilter): Promise<[Vehicle[], number]> {
    const {
      search,
      customerId,
      companyId,
      modelId,
      vehicleTypeId,
      engineType,
      yearFrom,
      yearTo,
      mileageFrom,
      mileageTo,
      hasServiceHistory,
      lastServiceFrom,
      lastServiceTo,
      page = 1,
      limit = VEHICLES_CONSTANTS.DEFAULTS.PAGE_SIZE,
      sortField = 'createdAt',
      sortOrder = 'desc',
      includeDeleted = false,
    } = filter;

    const qb = this.vehiclesRepository
      .createQueryBuilder('vehicle')
      .leftJoinAndSelect('vehicle.customer', 'customer')
      .leftJoinAndSelect('vehicle.model', 'model')
      .leftJoinAndSelect('model.brand', 'brand')
      .leftJoinAndSelect('vehicle.vehicleType', 'vehicleType')
      .leftJoinAndSelect('vehicle.serviceHistory', 'serviceHistory', 'serviceHistory.isDeleted = false');

    // Обязательная фильтрация по компании
    if (companyId) {
      qb.andWhere('vehicle.companyId = :companyId', { companyId });
    }

    if (!includeDeleted) {
      qb.andWhere('vehicle.isDeleted = false');
    }

    const trimmedSearch = typeof search === 'string' ? search.trim() : '';
    if (trimmedSearch && trimmedSearch.length >= VEHICLES_CONSTANTS.SEARCH.MIN_SEARCH_LENGTH) {
      qb.andWhere(
        '(vehicle.vin ILIKE :search OR vehicle.licensePlate ILIKE :search OR vehicle.color ILIKE :search OR vehicle.notes ILIKE :search OR customer.firstName ILIKE :search OR customer.lastName ILIKE :search OR customer.companyName ILIKE :search OR model.name ILIKE :search OR brand.name ILIKE :search)',
        { search: `%${trimmedSearch}%` },
      );
    }

    if (customerId) {
      qb.andWhere('vehicle.customerId = :customerId', { customerId });
    }
    if (modelId) {
      qb.andWhere('vehicle.modelId = :modelId', { modelId });
    }
    if (vehicleTypeId) {
      qb.andWhere('vehicle.vehicleTypeId = :vehicleTypeId', { vehicleTypeId });
    }
    if (engineType) {
      qb.andWhere('vehicle.engineType = :engineType', { engineType });
    }
    if (yearFrom !== undefined && yearFrom !== null) {
      qb.andWhere('vehicle.year >= :yearFrom', { yearFrom });
    }
    if (yearTo !== undefined && yearTo !== null) {
      qb.andWhere('vehicle.year <= :yearTo', { yearTo });
    }
    if (mileageFrom !== undefined && mileageFrom !== null) {
      qb.andWhere('vehicle.mileage >= :mileageFrom', { mileageFrom });
    }
    if (mileageTo !== undefined && mileageTo !== null) {
      qb.andWhere('vehicle.mileage <= :mileageTo', { mileageTo });
    }
    if (hasServiceHistory !== undefined && hasServiceHistory !== null) {
      if (hasServiceHistory) qb.andWhere('serviceHistory.id IS NOT NULL');
      else qb.andWhere('serviceHistory.id IS NULL');
    }
    if (lastServiceFrom) {
      qb.andWhere('vehicle.lastServiceDate >= :lastServiceFrom', { lastServiceFrom });
    }
    if (lastServiceTo) {
      qb.andWhere('vehicle.lastServiceDate <= :lastServiceTo', { lastServiceTo });
    }

    const sortColumn = this.mapSortField(sortField || 'createdAt');
    const normalizedOrder: 'ASC' | 'DESC' = String(sortOrder || 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    qb.orderBy(sortColumn, normalizedOrder);

    const rawLimit = typeof limit === 'number' ? limit : VEHICLES_CONSTANTS.DEFAULTS.PAGE_SIZE;
    const safeLimit = Math.min(Math.max(1, rawLimit), VEHICLES_CONSTANTS.DEFAULTS.MAX_ITEMS);
    const safePage = Math.max(1, typeof page === 'number' ? page : 1);
    const offset = (safePage - 1) * safeLimit;

    qb.skip(offset).take(safeLimit);

    return qb.getManyAndCount();
  }

  // ======= Публичные выборки (без ПДн и без companyId) =======

  async findPublicById(id: string): Promise<Vehicle | null> {
    return this.vehiclesRepository
      .createQueryBuilder('vehicle')
      .leftJoinAndSelect('vehicle.model', 'model')
      .leftJoinAndSelect('model.brand', 'brand')
      .leftJoinAndSelect('vehicle.vehicleType', 'vehicleType')
      .leftJoinAndSelect('vehicle.serviceHistory', 'serviceHistory', 'serviceHistory.isDeleted = false')
      .where('vehicle.id = :id', { id })
      .andWhere('vehicle.isDeleted = false')
      .andWhere('vehicle.isActive = true')
      .getOne();
  }

  async findPublicWithFilters(filter: Partial<VehicleFilter>): Promise<[Vehicle[], number]> {
    const {
      search,
      modelId,
      vehicleTypeId,
      engineType,
      yearFrom,
      yearTo,
      mileageFrom,
      mileageTo,
      hasServiceHistory,
      lastServiceFrom,
      lastServiceTo,
      page = 1,
      limit = VEHICLES_CONSTANTS.DEFAULTS.PAGE_SIZE,
      sortField = 'createdAt',
      sortOrder = 'desc',
    } = filter;

    const qb = this.vehiclesRepository
      .createQueryBuilder('vehicle')
      .leftJoinAndSelect('vehicle.model', 'model')
      .leftJoinAndSelect('model.brand', 'brand')
      .leftJoinAndSelect('vehicle.vehicleType', 'vehicleType')
      .leftJoinAndSelect('vehicle.serviceHistory', 'serviceHistory', 'serviceHistory.isDeleted = false')
      .where('vehicle.isDeleted = false')
      .andWhere('vehicle.isActive = true');

    const trimmedSearch = typeof search === 'string' ? search.trim() : '';
    if (trimmedSearch && trimmedSearch.length >= VEHICLES_CONSTANTS.PUBLIC.MIN_SEARCH_LENGTH) {
      qb.andWhere(
        '(model.name ILIKE :search OR brand.name ILIKE :search OR vehicleType.name ILIKE :search OR vehicle.color ILIKE :search)',
        { search: `%${trimmedSearch}%` },
      );
    }

    if (modelId) {
      qb.andWhere('vehicle.modelId = :modelId', { modelId });
    }
    if (vehicleTypeId) {
      qb.andWhere('vehicle.vehicleTypeId = :vehicleTypeId', { vehicleTypeId });
    }
    if (engineType) {
      qb.andWhere('vehicle.engineType = :engineType', { engineType });
    }
    if (yearFrom !== undefined && yearFrom !== null) {
      qb.andWhere('vehicle.year >= :yearFrom', { yearFrom });
    }
    if (yearTo !== undefined && yearTo !== null) {
      qb.andWhere('vehicle.year <= :yearTo', { yearTo });
    }
    if (mileageFrom !== undefined && mileageFrom !== null) {
      qb.andWhere('vehicle.mileage >= :mileageFrom', { mileageFrom });
    }
    if (mileageTo !== undefined && mileageTo !== null) {
      qb.andWhere('vehicle.mileage <= :mileageTo', { mileageTo });
    }
    if (hasServiceHistory !== undefined && hasServiceHistory !== null) {
      if (hasServiceHistory) qb.andWhere('serviceHistory.id IS NOT NULL');
      else qb.andWhere('serviceHistory.id IS NULL');
    }
    if (lastServiceFrom) {
      qb.andWhere('vehicle.lastServiceDate >= :lastServiceFrom', { lastServiceFrom });
    }
    if (lastServiceTo) {
      qb.andWhere('vehicle.lastServiceDate <= :lastServiceTo', { lastServiceTo });
    }

    const sortColumn = this.mapSortField(sortField || 'createdAt');
    const normalizedOrder: 'ASC' | 'DESC' = String(sortOrder || 'desc').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    qb.orderBy(sortColumn, normalizedOrder);

    const rawLimit = typeof limit === 'number' ? limit : VEHICLES_CONSTANTS.DEFAULTS.PAGE_SIZE;
    const safeLimit = Math.min(Math.max(1, rawLimit), VEHICLES_CONSTANTS.DEFAULTS.MAX_ITEMS);
    const safePage = Math.max(1, typeof page === 'number' ? page : 1);
    const offset = (safePage - 1) * safeLimit;

    qb.skip(offset).take(safeLimit);

    return qb.getManyAndCount();
  }

  async update(id: string, data: UpdateVehicleData): Promise<Vehicle> {
    const updateData: Partial<Vehicle> = {};
    Object.keys(data).forEach((key) => {
      if ((data as any)[key] !== undefined) {
        (updateData as any)[key] = (data as any)[key];
      }
    });

    await this.vehiclesRepository.update(id, updateData);

    const updatedVehicle = await this.findById(id);
    if (!updatedVehicle) {
      throw new Error(`Vehicle with id ${id} not found after update`);
    }
    return updatedVehicle;
  }

  async softDelete(id: string): Promise<void> {
    await this.vehiclesRepository.update(id, {
      isDeleted: true,
      deletedAt: new Date(),
    });
  }

  async hardDelete(id: string): Promise<void> {
    await this.vehiclesRepository.delete(id);
  }

  async setActive(id: string, isActive: boolean): Promise<Vehicle> {
    await this.vehiclesRepository.update(id, { isActive });
    const updatedVehicle = await this.findById(id);
    if (!updatedVehicle) {
      throw new Error(`Vehicle with id ${id} not found after status update`);
    }
    return updatedVehicle;
  }

  async updateMileage(id: string, mileage: number): Promise<Vehicle> {
    await this.vehiclesRepository.update(id, { mileage });
    const updatedVehicle = await this.findById(id);
    if (!updatedVehicle) {
      throw new Error(`Vehicle with id ${id} not found after mileage update`);
    }
    return updatedVehicle;
  }

  async updateServiceDates(id: string, lastServiceDate?: Date, nextServiceDate?: Date): Promise<Vehicle> {
    const updateData: Partial<Vehicle> = {};
    if (lastServiceDate !== undefined) updateData.lastServiceDate = lastServiceDate;
    if (nextServiceDate !== undefined) updateData.nextServiceDate = nextServiceDate;

    await this.vehiclesRepository.update(id, updateData);
    const updatedVehicle = await this.findById(id);
    if (!updatedVehicle) {
      throw new Error(`Vehicle with id ${id} not found after service dates update`);
    }
    return updatedVehicle;
  }

  async getStats(companyId: string): Promise<VehicleStats> {
    const stats = await this.vehiclesRepository
      .createQueryBuilder('vehicle')
      .select([
        'COUNT(*) as "totalVehicles"',
        "COUNT(*) FILTER (WHERE vehicle.engineType = 'petrol') as \"petrolCount\"",
        "COUNT(*) FILTER (WHERE vehicle.engineType = 'diesel') as \"dieselCount\"",
        "COUNT(*) FILTER (WHERE vehicle.engineType = 'electric') as \"electricCount\"",
        "COUNT(*) FILTER (WHERE vehicle.engineType = 'hybrid') as \"hybridCount\"",
        'COALESCE(AVG(vehicle.mileage), 0) as "averageMileage"',
        'COUNT(*) FILTER (WHERE vehicle.nextServiceDate <= CURRENT_DATE) as "needingService"',
        'COALESCE(AVG(EXTRACT(YEAR FROM CURRENT_DATE) - vehicle.year), 0) as "averageAge"',
      ])
      .where('vehicle.companyId = :companyId', { companyId })
      .andWhere('vehicle.isDeleted = false')
      .getRawOne();

    return {
      totalVehicles: parseInt(stats.totalVehicles) || 0,
      totalByEngineType: {
        petrol: parseInt(stats.petrolCount) || 0,
        diesel: parseInt(stats.dieselCount) || 0,
        electric: parseInt(stats.electricCount) || 0,
        hybrid: parseInt(stats.hybridCount) || 0,
      },
      averageMileage: parseFloat(stats.averageMileage) || 0,
      vehiclesNeedingService: parseInt(stats.needingService) || 0,
      newThisMonth: 0,
      averageAge: parseFloat(stats.averageAge) || 0,
    };
  }

  async countByCompany(companyId: string): Promise<number> {
    return this.vehiclesRepository.count({ where: { companyId, isDeleted: false } });
  }

  async countByCustomer(customerId: string): Promise<number> {
    return this.vehiclesRepository.count({ where: { customerId, isDeleted: false } });
  }

  async findVehiclesNeedingService(companyId: string): Promise<Vehicle[]> {
    return this.vehiclesRepository.find({
      where: { companyId, isDeleted: false },
      relations: ['customer', 'model', 'model.brand'],
      order: { nextServiceDate: 'ASC' },
    });
  }

  private mapSortField(sortField: string): string {
    const fieldMap: Record<string, string> = {
      licensePlate: 'vehicle.licensePlate',
      year: 'vehicle.year',
      mileage: 'vehicle.mileage',
      lastServiceDate: 'vehicle.lastServiceDate',
      createdAt: 'vehicle.createdAt',
    };
    return fieldMap[sortField] || 'vehicle.createdAt';
  }
}
