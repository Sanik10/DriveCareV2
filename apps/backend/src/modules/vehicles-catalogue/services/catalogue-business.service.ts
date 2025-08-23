// path: apps/backend/src/modules/vehicles-catalogue/services/catalogue-business.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { BrandsDataService } from './brands-data.service';
import { ModelsDataService } from './models-data.service';
import { TypesDataService } from './types-data.service';
import { CatalogueValidationService } from './catalogue-validation.service';
import { VehicleBrand, VehicleModel, VehicleType } from '../../../database/entities';
import { CreateBrandData, UpdateBrandData, CreateModelData, UpdateModelData, CreateTypeData, UpdateTypeData } from '../types/catalogue.types';
import { ICatalogueBusinessService } from '../interfaces/catalogue.interface';
import { CATALOGUE_CONSTANTS } from '../constants/catalogue.constants';

@Injectable()
export class CatalogueBusinessService implements ICatalogueBusinessService {
  private readonly logger = new Logger(CatalogueBusinessService.name);

  constructor(
    private readonly brandsDataService: BrandsDataService,
    private readonly modelsDataService: ModelsDataService,
    private readonly typesDataService: TypesDataService,
    private readonly catalogueValidationService: CatalogueValidationService,
  ) {}

  // ====== BRANDS BUSINESS LOGIC ======

  async createBrand(data: CreateBrandData): Promise<VehicleBrand> {
    this.catalogueValidationService.validateBrandData(data);
    await this.catalogueValidationService.validateBrandNameUniqueness(data.name);

    const brand = await this.brandsDataService.create(data);
    
    this.logger.log(`Created brand: ${brand.name} (${brand.id})`);
    
    // TODO: Добавить audit логирование

    return brand;
  }

  async updateBrand(id: string, data: UpdateBrandData): Promise<VehicleBrand> {
    const existingBrand = await this.catalogueValidationService.validateBrandExists(id);
    
    this.catalogueValidationService.validateBrandData(data);
    
    if (data.name && data.name !== existingBrand.name) {
      await this.catalogueValidationService.validateBrandNameUniqueness(data.name, id);
    }

    const updatedBrand = await this.brandsDataService.update(id, data);
    
    this.logger.log(`Updated brand: ${updatedBrand.name} (${updatedBrand.id})`);
    
    // TODO: Добавить audit логирование

    return updatedBrand;
  }

  async deleteBrand(id: string): Promise<void> {
    const brand = await this.catalogueValidationService.validateBrandExists(id);
    await this.catalogueValidationService.validateBrandCanBeDeleted(id);
    
    await this.brandsDataService.softDelete(id);
    
    this.logger.log(`Deleted brand: ${brand.name} (${brand.id})`);
    
    // TODO: Добавить audit логирование
  }

  // ====== MODELS BUSINESS LOGIC ======

  async createModel(data: CreateModelData): Promise<VehicleModel> {
    // Проверяем что бренд существует
    await this.catalogueValidationService.validateBrandExists(data.brandId);
    
    this.catalogueValidationService.validateModelData(data);
    await this.catalogueValidationService.validateModelNameUniqueness(data.name, data.brandId);

    const model = await this.modelsDataService.create(data);
    
    this.logger.log(`Created model: ${model.name} (${model.id}) for brand ${model.brandId}`);
    
    // TODO: Добавить audit логирование

    return model;
  }

  async updateModel(id: string, data: UpdateModelData): Promise<VehicleModel> {
    const existingModel = await this.catalogueValidationService.validateModelExists(id);
    
    // Если меняется бренд, проверяем что новый бренд существует
    if (data.brandId && data.brandId !== existingModel.brandId) {
      await this.catalogueValidationService.validateBrandExists(data.brandId);
    }
    
    this.catalogueValidationService.validateModelData(data);
    
    // Проверяем уникальность имени в рамках бренда
    const brandId = data.brandId || existingModel.brandId;
    if (data.name && data.name !== existingModel.name) {
      await this.catalogueValidationService.validateModelNameUniqueness(data.name, brandId, id);
    }

    const updatedModel = await this.modelsDataService.update(id, data);
    
    this.logger.log(`Updated model: ${updatedModel.name} (${updatedModel.id})`);
    
    // TODO: Добавить audit логирование

    return updatedModel;
  }

  async deleteModel(id: string): Promise<void> {
    const model = await this.catalogueValidationService.validateModelExists(id);
    await this.catalogueValidationService.validateModelCanBeDeleted(id);
    
    await this.modelsDataService.softDelete(id);
    
    this.logger.log(`Deleted model: ${model.name} (${model.id})`);
    
    // TODO: Добавить audit логирование
  }

  // ====== TYPES BUSINESS LOGIC ======

  async createType(data: CreateTypeData): Promise<VehicleType> {
    this.catalogueValidationService.validateTypeData(data);
    await this.catalogueValidationService.validateTypeNameUniqueness(data.name);

    const type = await this.typesDataService.create(data);
    
    this.logger.log(`Created vehicle type: ${type.name} (${type.id})`);
    
    // TODO: Добавить audit логирование

    return type;
  }

  async updateType(id: string, data: UpdateTypeData): Promise<VehicleType> {
    const existingType = await this.catalogueValidationService.validateTypeExists(id);
    
    this.catalogueValidationService.validateTypeData(data);
    
    if (data.name && data.name !== existingType.name) {
      await this.catalogueValidationService.validateTypeNameUniqueness(data.name, id);
    }

    const updatedType = await this.typesDataService.update(id, data);
    
    this.logger.log(`Updated vehicle type: ${updatedType.name} (${updatedType.id})`);
    
    // TODO: Добавить audit логирование

    return updatedType;
  }

  async deleteType(id: string): Promise<void> {
    const type = await this.catalogueValidationService.validateTypeExists(id);
    await this.catalogueValidationService.validateTypeCanBeDeleted(id);
    
    await this.typesDataService.softDelete(id);
    
    this.logger.log(`Deleted vehicle type: ${type.name} (${type.id})`);
    
    // TODO: Добавить audit логирование
  }
}
