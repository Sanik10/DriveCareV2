// path: apps/backend/src/modules/vehicles-catalogue/services/models-data.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VehicleModel } from '../../../database/entities/vehicle-model.entity';
import { Vehicle } from '../../../database/entities/vehicle.entity';
import { ModelFilter, CreateModelData, UpdateModelData } from '../types/catalogue.types';
import { IModelsDataService } from '../interfaces/catalogue.interface';
import { CATALOGUE_CONSTANTS } from '../constants/catalogue.constants';

@Injectable()
export class ModelsDataService implements IModelsDataService {
  constructor(
    @InjectRepository(VehicleModel)
    private readonly modelsRepository: Repository<VehicleModel>,
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

  async create(data: CreateModelData): Promise<VehicleModel> {
    const model = this.modelsRepository.create({
      ...data,
      name: data.name?.trim().replace(/\s+/g, ' '),
      nameNormalized: this.normalizeName(data.name),
      isActive: data.isActive ?? true,
      isVerified: data.isVerified ?? false,
    } as VehicleModel);

    return this.modelsRepository.save(model);
  }

  async findAll(): Promise<VehicleModel[]> {
    return this.modelsRepository
      .createQueryBuilder('model')
      .select([
        'model.id',
        'model.brandId',
        'model.name',
        'model.nameNormalized',
        'model.yearFrom',
        'model.yearTo',
        'model.class',
        'model.isActive',
        'model.isVerified',
        'model.isDeleted',
        'model.deletedAt',
        'model.createdAt',
        'model.updatedAt',
      ])
      .leftJoin('model.brand', 'brand')
      .addSelect(['brand.id', 'brand.name'])
      .where('model.isDeleted = false')
      .orderBy('brand.name', 'ASC')
      .addOrderBy('model.name', 'ASC')
      .getMany();
  }

  async findById(id: string): Promise<VehicleModel | null> {
    return this.modelsRepository
      .createQueryBuilder('model')
      .select([
        'model.id',
        'model.brandId',
        'model.name',
        'model.nameNormalized',
        'model.yearFrom',
        'model.yearTo',
        'model.class',
        'model.isActive',
        'model.isVerified',
        'model.isDeleted',
        'model.deletedAt',
        'model.createdAt',
        'model.updatedAt',
      ])
      .leftJoin('model.brand', 'brand')
      .addSelect(['brand.id', 'brand.name'])
      .where('model.id = :id', { id })
      .andWhere('model.isDeleted = false')
      .getOne();
  }

  async findByNameAndBrand(name: string, brandId: string): Promise<VehicleModel | null> {
    const nameNormalized = this.normalizeName(name);
    return this.modelsRepository.findOne({
      where: { nameNormalized, brandId, isDeleted: false },
    });
  }

  async findWithFilters(filter: ModelFilter): Promise<VehicleModel[]> {
    const {
      search,
      brandId,
      yearFrom,
      yearTo,
      class: modelClass,
      includeDeleted = false,
      page = CATALOGUE_CONSTANTS.PAGINATION.DEFAULT_PAGE,
      limit = CATALOGUE_CONSTANTS.PAGINATION.DEFAULT_LIMIT,
    } = filter;

    const isActive = this.toBool((filter as any).isActive);
    const isVerified = this.toBool((filter as any).isVerified);

    const safeLimit = Math.min(
      Math.max(1, Number(limit) || CATALOGUE_CONSTANTS.PAGINATION.DEFAULT_LIMIT),
      CATALOGUE_CONSTANTS.PAGINATION.MAX_PAGE_SIZE,
    );
    const safePage = Math.max(1, Number(page) || CATALOGUE_CONSTANTS.PAGINATION.DEFAULT_PAGE);

    const qb = this.modelsRepository
      .createQueryBuilder('model')
      .select([
        'model.id',
        'model.brandId',
        'model.name',
        'model.nameNormalized',
        'model.yearFrom',
        'model.yearTo',
        'model.class',
        'model.isActive',
        'model.isVerified',
        'model.isDeleted',
        'model.deletedAt',
        'model.createdAt',
        'model.updatedAt',
      ])
      .leftJoin('model.brand', 'brand')
      .addSelect(['brand.id', 'brand.name']);

    if (!includeDeleted) {
      qb.andWhere('model.isDeleted = false');
    }

    if (search) {
      qb.andWhere('(model.name ILIKE :search OR brand.name ILIKE :search)', {
        search: `%${search.trim()}%`,
      });
    }

    if (brandId) {
      qb.andWhere('model.brandId = :brandId', { brandId });
    }

    if (yearFrom !== undefined) {
      qb.andWhere('(model.yearFrom IS NULL OR model.yearFrom <= :yearFrom)', { yearFrom });
    }

    if (yearTo !== undefined) {
      qb.andWhere('(model.yearTo IS NULL OR model.yearTo >= :yearTo)', { yearTo });
    }

    if (modelClass) {
      qb.andWhere('model.class ILIKE :class', { class: `%${modelClass.trim()}%` });
    }

    if (isActive !== undefined) {
      qb.andWhere('model.isActive = :isActive', { isActive });
    }

    if (isVerified === true) {
      qb.andWhere('model.isVerified = true');
    } else if (isVerified === false) {
      qb.andWhere('(model.isVerified = false OR model.isVerified IS NULL)');
    }

    qb.orderBy('brand.name', 'ASC')
      .addOrderBy('model.name', 'ASC')
      .take(safeLimit)
      .skip((safePage - 1) * safeLimit);

    return qb.getMany();
  }

  async update(id: string, data: UpdateModelData): Promise<VehicleModel> {
    const updateData: Partial<VehicleModel> = {};

    Object.keys(data).forEach((key) => {
      const k = key as keyof UpdateModelData;
      const v = data[k];
      if (v !== undefined) {
        (updateData as any)[k] = typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : v;
      }
    });

    if (data.name !== undefined) {
      (updateData as any).nameNormalized = this.normalizeName(data.name);
    }

    await this.modelsRepository.update(id, updateData as any);

    const updatedModel = await this.findById(id);
    if (!updatedModel) {
      throw new Error(`Model with id ${id} not found after update`);
    }

    return updatedModel;
  }

  async softDelete(id: string): Promise<void> {
    await this.modelsRepository.update(id, {
      isDeleted: true,
      deletedAt: new Date(),
    });
  }

  async hardDelete(id: string): Promise<void> {
    await this.modelsRepository.delete(id);
  }

  async setActive(id: string, isActive: boolean): Promise<VehicleModel> {
    await this.modelsRepository.update(id, { isActive });

    const updatedModel = await this.findById(id);
    if (!updatedModel) {
      throw new Error(`Model with id ${id} not found after status update`);
    }

    return updatedModel;
  }

  // Верификация (минимально — только флаг)
  async setVerified(id: string, isVerified: boolean): Promise<VehicleModel> {
    await this.modelsRepository.update(id, { isVerified } as any);
    const updatedModel = await this.findById(id);
    if (!updatedModel) {
      throw new Error(`Model with id ${id} not found after verify update`);
    }
    return updatedModel;
  }

  async countVehicles(modelId: string): Promise<number> {
    const result = await this.modelsRepository
      .createQueryBuilder('model')
      .leftJoin('model.vehicles', 'vehicle')
      .select('COUNT(vehicle.id)', 'count')
      .where('model.id = :modelId', { modelId })
      .andWhere('vehicle.isDeleted = false')
      .getRawOne();

    return parseInt(result?.count, 10) || 0;
  }

  async findByBrand(brandId: string): Promise<VehicleModel[]> {
    return this.modelsRepository
      .createQueryBuilder('model')
      .select([
        'model.id',
        'model.brandId',
        'model.name',
        'model.nameNormalized',
        'model.yearFrom',
        'model.yearTo',
        'model.class',
        'model.isActive',
        'model.isVerified',
        'model.isDeleted',
        'model.deletedAt',
        'model.createdAt',
        'model.updatedAt',
      ])
      .where('model.brandId = :brandId', { brandId })
      .andWhere('model.isDeleted = false')
      .orderBy('model.name', 'ASC')
      .getMany();
  }

  async mergeModels(sourceModelId: string, targetModelId: string): Promise<void> {
    if (sourceModelId === targetModelId) return;

    await this.modelsRepository.manager
      .getRepository(Vehicle)
      .createQueryBuilder()
      .update(Vehicle)
      .set({ modelId: targetModelId })
      .where('model_id = :sourceModelId', { sourceModelId })
      .execute();

    await this.softDelete(sourceModelId);
  }
}
