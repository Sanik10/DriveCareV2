// path: apps/backend/src/modules/vehicles-catalogue/services/brands-data.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VehicleBrand } from '../../../database/entities/vehicle-brand.entity';
import { BrandFilter, CreateBrandData, UpdateBrandData } from '../types/catalogue.types';
import { IBrandsDataService } from '../interfaces/catalogue.interface';
import { CATALOGUE_CONSTANTS } from '../constants/catalogue.constants';

@Injectable()
export class BrandsDataService implements IBrandsDataService {
  constructor(
    @InjectRepository(VehicleBrand)
    private readonly brandsRepository: Repository<VehicleBrand>,
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

  async create(data: CreateBrandData): Promise<VehicleBrand> {
    const brand = this.brandsRepository.create({
      ...data,
      name: data.name?.trim().replace(/\s+/g, ' '),
      nameNormalized: this.normalizeName(data.name),
      isActive: data.isActive ?? true,
      isVerified: data.isVerified ?? false,
    } as VehicleBrand);

    return this.brandsRepository.save(brand);
  }

  async findAll(): Promise<VehicleBrand[]> {
    return this.brandsRepository
      .createQueryBuilder('brand')
      .select([
        'brand.id',
        'brand.name',
        'brand.nameNormalized',
        'brand.country',
        'brand.logoUrl',
        'brand.isActive',
        'brand.isVerified',
        'brand.isDeleted',
        'brand.deletedAt',
        'brand.createdAt',
        'brand.updatedAt',
      ])
      .where('brand.isDeleted = false')
      .orderBy('brand.name', 'ASC')
      .getMany();
  }

  async findById(id: string): Promise<VehicleBrand | null> {
    return this.brandsRepository
      .createQueryBuilder('brand')
      .select([
        'brand.id',
        'brand.name',
        'brand.nameNormalized',
        'brand.country',
        'brand.logoUrl',
        'brand.isActive',
        'brand.isVerified',
        'brand.isDeleted',
        'brand.deletedAt',
        'brand.createdAt',
        'brand.updatedAt',
      ])
      .where('brand.id = :id', { id })
      .andWhere('brand.isDeleted = false')
      .getOne();
  }

  async findByName(name: string): Promise<VehicleBrand | null> {
    const nameNormalized = this.normalizeName(name);
    return this.brandsRepository.findOne({
      where: { nameNormalized, isDeleted: false },
    });
  }

  async findWithFilters(filter: BrandFilter): Promise<VehicleBrand[]> {
    const {
      search,
      country,
      includeDeleted = false,
      page = CATALOGUE_CONSTANTS.PAGINATION.DEFAULT_PAGE,
      limit = CATALOGUE_CONSTANTS.PAGINATION.DEFAULT_LIMIT,
    } = filter;

    const rawIsActive = (filter as any).isActive;
    const rawIsVerified = (filter as any).isVerified;

    const isActive = this.toBool(rawIsActive);
    const isVerified = this.toBool(rawIsVerified);

    const safeLimit = Math.min(
      Math.max(1, Number(limit) || CATALOGUE_CONSTANTS.PAGINATION.DEFAULT_LIMIT),
      CATALOGUE_CONSTANTS.PAGINATION.MAX_PAGE_SIZE,
    );
    const safePage = Math.max(1, Number(page) || CATALOGUE_CONSTANTS.PAGINATION.DEFAULT_PAGE);

    const qb = this.brandsRepository
      .createQueryBuilder('brand')
      .select([
        'brand.id',
        'brand.name',
        'brand.nameNormalized',
        'brand.country',
        'brand.logoUrl',
        'brand.isActive',
        'brand.isVerified',
        'brand.isDeleted',
        'brand.deletedAt',
        'brand.createdAt',
        'brand.updatedAt',
      ]);

    if (!includeDeleted) {
      qb.andWhere('brand.isDeleted = false');
    }

    if (search) {
      qb.andWhere('brand.name ILIKE :search', { search: `%${search.trim()}%` });
    }

    if (country) {
      qb.andWhere('brand.country ILIKE :country', { country: `%${country.trim()}%` });
    }

    if (isActive !== undefined) {
      qb.andWhere('brand.isActive = :isActive', { isActive });
    }

    // трактуем "неподтвержденные" как false ИЛИ NULL
    if (isVerified === true) {
      qb.andWhere('brand.isVerified = true');
    } else if (isVerified === false) {
      qb.andWhere('(brand.isVerified = false OR brand.isVerified IS NULL)');
    }

    qb.orderBy('brand.name', 'ASC')
      .take(safeLimit)
      .skip((safePage - 1) * safeLimit);

    return qb.getMany();
  }

  async update(id: string, data: UpdateBrandData): Promise<VehicleBrand> {
    const updateData: Partial<VehicleBrand> = {};

    Object.keys(data).forEach((key) => {
      const k = key as keyof UpdateBrandData;
      const v = data[k];
      if (v !== undefined) {
        (updateData as any)[k] = typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : v;
      }
    });

    if (data.name !== undefined) {
      (updateData as any).nameNormalized = this.normalizeName(data.name);
    }

    await this.brandsRepository.update(id, updateData as any);

    const updatedBrand = await this.findById(id);
    if (!updatedBrand) {
      throw new Error(`Brand with id ${id} not found after update`);
    }

    return updatedBrand;
  }

  async softDelete(id: string): Promise<void> {
    await this.brandsRepository.update(id, {
      isDeleted: true,
      deletedAt: new Date(),
    });
  }

  async hardDelete(id: string): Promise<void> {
    await this.brandsRepository.delete(id);
  }

  async setActive(id: string, isActive: boolean): Promise<VehicleBrand> {
    await this.brandsRepository.update(id, { isActive });

    const updatedBrand = await this.findById(id);
    if (!updatedBrand) {
      throw new Error(`Brand with id ${id} not found after status update`);
    }

    return updatedBrand;
  }

  // Обновление верификации (без обязательной зависимости от наличия reviewedAt колонки)
  async setVerified(id: string, isVerified: boolean): Promise<VehicleBrand> {
    await this.brandsRepository.update(id, { isVerified } as any);
    const updatedBrand = await this.findById(id);
    if (!updatedBrand) {
      throw new Error(`Brand with id ${id} not found after verify update`);
    }
    return updatedBrand;
  }

  async countModels(brandId: string): Promise<number> {
    const result = await this.brandsRepository
      .createQueryBuilder('brand')
      .leftJoin('brand.models', 'model')
      .select('COUNT(model.id)', 'count')
      .where('brand.id = :brandId', { brandId })
      .andWhere('model.isDeleted = false')
      .getRawOne();

    return parseInt(result?.count, 10) || 0;
  }
}
