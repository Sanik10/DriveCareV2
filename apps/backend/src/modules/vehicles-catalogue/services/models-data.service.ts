import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VehicleModel } from '../../../database/entities/vehicle-model.entity';
import { ModelFilter, CreateModelData, UpdateModelData } from '../types/catalogue.types';
import { IModelsDataService } from '../interfaces/catalogue.interface';

@Injectable()
export class ModelsDataService implements IModelsDataService {
  constructor(
    @InjectRepository(VehicleModel)
    private readonly modelsRepository: Repository<VehicleModel>,
  ) {}

  async create(data: CreateModelData): Promise<VehicleModel> {
    const model = this.modelsRepository.create({
      ...data,
      isActive: data.isActive ?? true,
    });

    return this.modelsRepository.save(model);
  }

  async findAll(): Promise<VehicleModel[]> {
    return this.modelsRepository.find({
      where: { isDeleted: false },
      relations: ['brand'],
      order: { name: 'ASC' },
    });
  }

  async findById(id: string): Promise<VehicleModel | null> {
    return this.modelsRepository.findOne({
      where: { id, isDeleted: false },
      relations: ['brand', 'vehicles'],
    });
  }

  async findByNameAndBrand(name: string, brandId: string): Promise<VehicleModel | null> {
    return this.modelsRepository.findOne({
      where: { name, brandId, isDeleted: false },
    });
  }

  async findWithFilters(filter: ModelFilter): Promise<VehicleModel[]> {
    const {
      search,
      brandId,
      yearFrom,
      yearTo,
      class: modelClass,
      isActive,
      includeDeleted = false
    } = filter;

    const query = this.modelsRepository.createQueryBuilder('model')
      .leftJoinAndSelect('model.brand', 'brand')
      .leftJoinAndSelect('model.vehicles', 'vehicle', 'vehicle.isDeleted = false');

    if (!includeDeleted) {
      query.andWhere('model.isDeleted = false');
    }

    if (search) {
      query.andWhere(
        '(model.name ILIKE :search OR brand.name ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    if (brandId) {
      query.andWhere('model.brandId = :brandId', { brandId });
    }

    if (yearFrom !== undefined) {
      query.andWhere('(model.yearFrom IS NULL OR model.yearFrom <= :yearFrom)', { yearFrom });
    }

    if (yearTo !== undefined) {
      query.andWhere('(model.yearTo IS NULL OR model.yearTo >= :yearTo)', { yearTo });
    }

    if (modelClass) {
      query.andWhere('model.class ILIKE :class', { class: `%${modelClass}%` });
    }

    if (isActive !== undefined) {
      query.andWhere('model.isActive = :isActive', { isActive });
    }

    query.orderBy('brand.name', 'ASC').addOrderBy('model.name', 'ASC');

    return query.getMany();
  }

  async update(id: string, data: UpdateModelData): Promise<VehicleModel> {
    const updateData: Partial<VehicleModel> = {};
    
    Object.keys(data).forEach(key => {
      if (data[key] !== undefined) {
        updateData[key] = data[key];
      }
    });

    await this.modelsRepository.update(id, updateData);
    
    const updatedModel = await this.findById(id);
    if (!updatedModel) {
      throw new Error(`Model with id ${id} not found after update`);
    }
    
    return updatedModel;
  }

  async softDelete(id: string): Promise<void> {
    await this.modelsRepository.update(id, { 
      isDeleted: true, 
      deletedAt: new Date() 
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

  async countVehicles(modelId: string): Promise<number> {
    const result = await this.modelsRepository
      .createQueryBuilder('model')
      .leftJoin('model.vehicles', 'vehicle')
      .select('COUNT(vehicle.id)', 'count')
      .where('model.id = :modelId', { modelId })
      .andWhere('vehicle.isDeleted = false')
      .getRawOne();

    return parseInt(result.count) || 0;
  }

  async findByBrand(brandId: string): Promise<VehicleModel[]> {
    return this.modelsRepository.find({
      where: { brandId, isDeleted: false, isActive: true },
      order: { name: 'ASC' },
    });
  }
}
