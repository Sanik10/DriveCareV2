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

  async create(data: CreateBrandData): Promise<VehicleBrand> {
    const brand = this.brandsRepository.create({
      ...data,
      name: data.name?.trim().replace(/\s+/g, ' '),
      nameNormalized: this.normalizeName(data.name),
      isActive: data.isActive ?? true,
    });

    return this.brandsRepository.save(brand);
  }

  async findAll(): Promise<VehicleBrand[]> {
    return this.brandsRepository.find({
      where: { isDeleted: false },
      order: { name: 'ASC' },
    });
  }

  async findById(id: string): Promise<VehicleBrand | null> {
    return this.brandsRepository.findOne({
      where: { id, isDeleted: false },
      relations: ['models'],
    });
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
      isActive,
      includeDeleted = false,
      page = CATALOGUE_CONSTANTS.PAGINATION.DEFAULT_PAGE,
      limit = CATALOGUE_CONSTANTS.PAGINATION.DEFAULT_LIMIT,
    } = filter;

    const safeLimit = Math.min(
      Math.max(1, Number(limit) || CATALOGUE_CONSTANTS.PAGINATION.DEFAULT_LIMIT),
      CATALOGUE_CONSTANTS.PAGINATION.MAX_PAGE_SIZE,
    );
    const safePage = Math.max(1, Number(page) || CATALOGUE_CONSTANTS.PAGINATION.DEFAULT_PAGE);

    const query = this.brandsRepository
      .createQueryBuilder('brand')
      .leftJoinAndSelect('brand.models', 'model', 'model.isDeleted = false');

    if (!includeDeleted) {
      query.andWhere('brand.isDeleted = false');
    }

    if (search) {
      query.andWhere('brand.name ILIKE :search', { search: `%${search.trim()}%` });
    }

    if (country) {
      query.andWhere('brand.country ILIKE :country', { country: `%${country.trim()}%` });
    }

    if (isActive !== undefined) {
      query.andWhere('brand.isActive = :isActive', { isActive });
    }

    query.orderBy('brand.name', 'ASC').take(safeLimit).skip((safePage - 1) * safeLimit);

    return query.getMany();
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

    await this.brandsRepository.update(id, updateData);

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
