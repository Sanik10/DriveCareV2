// path: apps/backend/src/modules/vehicles-catalogue/vehicles-catalogue.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { BrandsDataService } from './services/brands-data.service';
import { ModelsDataService } from './services/models-data.service';
import { TypesDataService } from './services/types-data.service';
import { CatalogueBusinessService } from './services/catalogue-business.service';
import { CatalogueValidationService } from './services/catalogue-validation.service';
import { CatalogueMapperService } from './services/catalogue-mapper.service';
import { CreateBrandDto } from './dto/brands/create-brand.dto';
import { UpdateBrandDto } from './dto/brands/update-brand.dto';
import { BrandResponseDto } from './dto/brands/brand-response.dto';
import { CreateModelDto } from './dto/models/create-model.dto';
import { UpdateModelDto } from './dto/models/update-model.dto';
import { ModelResponseDto } from './dto/models/model-response.dto';
import { CreateTypeDto } from './dto/types/create-type.dto';
import { UpdateTypeDto } from './dto/types/update-type.dto';
import { TypeResponseDto } from './dto/types/type-response.dto';
import { BrandFilter, ModelFilter, TypeFilter } from './types/catalogue.types';

@Injectable()
export class VehiclesCatalogueService {
  private readonly logger = new Logger(VehiclesCatalogueService.name);

  constructor(
    private readonly brandsDataService: BrandsDataService,
    private readonly modelsDataService: ModelsDataService,
    private readonly typesDataService: TypesDataService,
    private readonly catalogueBusinessService: CatalogueBusinessService,
    private readonly catalogueValidationService: CatalogueValidationService,
    private readonly catalogueMapperService: CatalogueMapperService,
  ) {}

  // 🏭 ========== BRANDS ==========

  async createBrand(createBrandDto: CreateBrandDto): Promise<BrandResponseDto> {
    const brand = await this.catalogueBusinessService.createBrand(createBrandDto);
    return this.catalogueMapperService.mapBrandToResponseDto(brand);
  }

  async getBrands(filter: Partial<BrandFilter> = {}): Promise<BrandResponseDto[]> {
    const brands = await this.brandsDataService.findWithFilters(filter);
    return this.catalogueMapperService.mapBrandsArrayToResponseDto(brands);
  }

  async getBrand(id: string): Promise<BrandResponseDto> {
    const brand = await this.catalogueValidationService.validateBrandExists(id);
    return this.catalogueMapperService.mapBrandToResponseDto(brand);
  }

  async updateBrand(id: string, updateBrandDto: UpdateBrandDto): Promise<BrandResponseDto> {
    const brand = await this.catalogueBusinessService.updateBrand(id, updateBrandDto);
    return this.catalogueMapperService.mapBrandToResponseDto(brand);
  }

  async deleteBrand(id: string): Promise<void> {
    await this.catalogueBusinessService.deleteBrand(id);
  }

  // 🚗 ========== MODELS ==========

  async createModel(createModelDto: CreateModelDto): Promise<ModelResponseDto> {
    const model = await this.catalogueBusinessService.createModel(createModelDto);
    return this.catalogueMapperService.mapModelToResponseDto(model);
  }

  async getModels(filter: Partial<ModelFilter> = {}): Promise<ModelResponseDto[]> {
    const models = await this.modelsDataService.findWithFilters(filter);
    return this.catalogueMapperService.mapModelsArrayToResponseDto(models);
  }

  async getModel(id: string): Promise<ModelResponseDto> {
    const model = await this.catalogueValidationService.validateModelExists(id);
    return this.catalogueMapperService.mapModelToResponseDto(model);
  }

  async updateModel(id: string, updateModelDto: UpdateModelDto): Promise<ModelResponseDto> {
    const model = await this.catalogueBusinessService.updateModel(id, updateModelDto);
    return this.catalogueMapperService.mapModelToResponseDto(model);
  }

  async deleteModel(id: string): Promise<void> {
    await this.catalogueBusinessService.deleteModel(id);
  }

  // 🚙 ========== TYPES ==========

  async createType(createTypeDto: CreateTypeDto): Promise<TypeResponseDto> {
    const type = await this.catalogueBusinessService.createType(createTypeDto);
    return this.catalogueMapperService.mapTypeToResponseDto(type);
  }

  async getTypes(filter: Partial<TypeFilter> = {}): Promise<TypeResponseDto[]> {
    const types = await this.typesDataService.findWithFilters(filter);
    return this.catalogueMapperService.mapTypesArrayToResponseDto(types);
  }

  async getType(id: string): Promise<TypeResponseDto> {
    const type = await this.catalogueValidationService.validateTypeExists(id);
    return this.catalogueMapperService.mapTypeToResponseDto(type);
  }

  async updateType(id: string, updateTypeDto: UpdateTypeDto): Promise<TypeResponseDto> {
    const type = await this.catalogueBusinessService.updateType(id, updateTypeDto);
    return this.catalogueMapperService.mapTypeToResponseDto(type);
  }

  async deleteType(id: string): Promise<void> {
    await this.catalogueBusinessService.deleteType(id);
  }
}
