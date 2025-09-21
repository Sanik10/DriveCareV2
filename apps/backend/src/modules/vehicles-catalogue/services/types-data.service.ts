// path: apps/backend/src/modules/vehicles-catalogue/services/types-data.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VehicleType } from '../../../database/entities/vehicle-type.entity';
import { TypeFilter, CreateTypeData, UpdateTypeData } from '../types/catalogue.types';
import { ITypesDataService } from '../interfaces/catalogue.interface';
import { CATALOGUE_CONSTANTS } from '../constants/catalogue.constants';

@Injectable()
export class TypesDataService implements ITypesDataService {
  constructor(
    @InjectRepository(VehicleType)
    private readonly typesRepository: Repository<VehicleType>,
  ) {}

  private normalizeName(input?: string): string {
    return (input || '').trim().replace(/\s+/g, ' ').toLowerCase();
  }

  private toBool(value: unknown): boolean | undefined {
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'boolean') return value;
    const s = String(value).trim().toLowerCase();
    if (s === 'true') return true;
    if (s === 'false') return false;
    return undefined;
  }

  async create(data: CreateTypeData): Promise<VehicleType> {
    const type = this.typesRepository.create({
      ...data,
      name: data.name?.trim().replace(/\s+/g, ' '),
      nameNormalized: this.normalizeName(data.name),
      isActive: data.isActive ?? true,
      isVerified: data.isVerified ?? false,
    } as VehicleType);

    return this.typesRepository.save(type);
  }

  async findAll(): Promise<VehicleType[]> {
    return this.typesRepository
      .createQueryBuilder('type')
      .select([
        'type.id',
        'type.name',
        'type.nameNormalized',
        'type.description',
        'type.isActive',
        'type.isVerified',
        'type.isDeleted',
        'type.deletedAt',
        'type.createdAt',
        'type.updatedAt',
      ])
      .where('type.isDeleted = false')
      .orderBy('type.name', 'ASC')
      .getMany();
  }

  async findById(id: string): Promise<VehicleType | null> {
    return this.typesRepository
      .createQueryBuilder('type')
      .select([
        'type.id',
        'type.name',
        'type.nameNormalized',
        'type.description',
        'type.isActive',
        'type.isVerified',
        'type.isDeleted',
        'type.deletedAt',
        'type.createdAt',
        'type.updatedAt',
      ])
      .where('type.id = :id', { id })
      .andWhere('type.isDeleted = false')
      .getOne();
  }

  async findByName(name: string): Promise<VehicleType | null> {
    const nameNormalized = this.normalizeName(name);
    return this.typesRepository.findOne({
      where: { nameNormalized, isDeleted: false },
    });
  }

  async findWithFilters(filter: TypeFilter): Promise<VehicleType[]> {
    const {
      search,
      isActive,
      includeDeleted = false,
      page = CATALOGUE_CONSTANTS.PAGINATION.DEFAULT_PAGE,
      limit = CATALOGUE_CONSTANTS.PAGINATION.DEFAULT_LIMIT,
    } = filter;

    const rawIsVerified = (filter as any).isVerified;
    const isVerified = this.toBool(rawIsVerified);

    const safeLimit = Math.min(
      Math.max(1, Number(limit) || CATALOGUE_CONSTANTS.PAGINATION.DEFAULT_LIMIT),
      CATALOGUE_CONSTANTS.PAGINATION.MAX_PAGE_SIZE,
    );
    const safePage = Math.max(1, Number(page) || CATALOGUE_CONSTANTS.PAGINATION.DEFAULT_PAGE);

    const qb = this.typesRepository
      .createQueryBuilder('type')
      .select([
        'type.id',
        'type.name',
        'type.nameNormalized',
        'type.description',
        'type.isActive',
        'type.isVerified',
        'type.isDeleted',
        'type.deletedAt',
        'type.createdAt',
        'type.updatedAt',
      ]);

    if (!includeDeleted) {
      qb.andWhere('type.isDeleted = false');
    }

    if (search) {
      qb.andWhere('(type.name ILIKE :search OR type.description ILIKE :search)', {
        search: `%${search.trim()}%`,
      });
    }

    if (isActive !== undefined) {
      qb.andWhere('type.isActive = :isActive', { isActive });
    }

    if (isVerified === true) {
      qb.andWhere('type.isVerified = true');
    } else if (isVerified === false) {
      qb.andWhere('(type.isVerified = false OR type.isVerified IS NULL)');
    }

    qb.orderBy('type.name', 'ASC')
      .take(safeLimit)
      .skip((safePage - 1) * safeLimit);

    return qb.getMany();
  }

  async update(id: string, data: UpdateTypeData): Promise<VehicleType> {
    const updateData: Partial<VehicleType> = {};

    Object.keys(data).forEach((key) => {
      const k = key as keyof UpdateTypeData;
      const v = data[k];
      if (v !== undefined) {
        (updateData as any)[k] = typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : v;
      }
    });

    if (data.name !== undefined) {
      (updateData as any).nameNormalized = this.normalizeName(data.name);
    }

    await this.typesRepository.update(id, updateData as any);

    const updatedType = await this.findById(id);
    if (!updatedType) {
      throw new Error(`Type with id ${id} not found after update`);
    }

    return updatedType;
  }

  async softDelete(id: string): Promise<void> {
    await this.typesRepository.update(id, {
      isDeleted: true,
      deletedAt: new Date(),
    });
  }

  async hardDelete(id: string): Promise<void> {
    await this.typesRepository.delete(id);
  }

  async setActive(id: string, isActive: boolean): Promise<VehicleType> {
    await this.typesRepository.update(id, { isActive });

    const updatedType = await this.findById(id);
    if (!updatedType) {
      throw new Error(`Type with id ${id} not found after status update`);
    }

    return updatedType;
  }

  // Верификация (минимально — только флаг)
  async setVerified(id: string, isVerified: boolean): Promise<VehicleType> {
    await this.typesRepository.update(id, { isVerified } as any);
    const updatedType = await this.findById(id);
    if (!updatedType) {
      throw new Error(`Type with id ${id} not found after verify update`);
    }
    return updatedType;
  }

  async countVehicles(typeId: string): Promise<number> {
    const result = await this.typesRepository
      .createQueryBuilder('type')
      .leftJoin('type.vehicles', 'vehicle')
      .select('COUNT(vehicle.id)', 'count')
      .where('type.id = :typeId', { typeId })
      .andWhere('vehicle.isDeleted = false')
      .getRawOne();

    return parseInt(result?.count, 10) || 0;
  }
}
