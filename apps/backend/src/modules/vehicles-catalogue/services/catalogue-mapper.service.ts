// path: apps/backend/src/modules/vehicles-catalogue/services/catalogue-mapper.service.ts
import { Injectable } from '@nestjs/common';
import { VehicleBrand, VehicleModel, VehicleType } from '../../../database/entities';
import { BrandResponseDto } from '../dto/brands/brand-response.dto';
import { ModelResponseDto } from '../dto/models/model-response.dto';
import { TypeResponseDto } from '../dto/types/type-response.dto';

@Injectable()
export class CatalogueMapperService {

  // ====== BRANDS MAPPING ======

  mapBrandToResponseDto(brand: VehicleBrand): BrandResponseDto {
    return {
      id: brand.id,
      name: brand.name,
      country: brand.country,
      logoUrl: brand.logoUrl,
      isActive: brand.isActive,
      createdAt: brand.createdAt,
      updatedAt: brand.updatedAt,
      modelsCount: brand.models?.length || 0,
    };
  }

  mapBrandsArrayToResponseDto(brands: VehicleBrand[]): BrandResponseDto[] {
    return brands.map(brand => this.mapBrandToResponseDto(brand));
  }

  // ====== MODELS MAPPING ======

  mapModelToResponseDto(model: VehicleModel): ModelResponseDto {
    const dto: ModelResponseDto = {
      id: model.id,
      brandId: model.brandId,
      name: model.name,
      yearFrom: model.yearFrom,
      yearTo: model.yearTo,
      class: model.class,
      isActive: model.isActive,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
      vehiclesCount: model.vehicles?.length || 0,
    };

    // Добавляем информацию о бренде если она есть
    if (model.brand) {
      dto.brand = this.mapBrandToResponseDto(model.brand);
      dto.fullName = `${model.brand.name} ${model.name}`;
    }

    return dto;
  }

  mapModelsArrayToResponseDto(models: VehicleModel[]): ModelResponseDto[] {
    return models.map(model => this.mapModelToResponseDto(model));
  }

  // ====== TYPES MAPPING ======

  mapTypeToResponseDto(type: VehicleType): TypeResponseDto {
    return {
      id: type.id,
      name: type.name,
      description: type.description,
      isActive: type.isActive,
      createdAt: type.createdAt,
      updatedAt: type.updatedAt,
      vehiclesCount: type.vehicles?.length || 0,
    };
  }

  mapTypesArrayToResponseDto(types: VehicleType[]): TypeResponseDto[] {
    return types.map(type => this.mapTypeToResponseDto(type));
  }

  // ====== UTILITY MAPPING ======

  mapBrandToSelectOption(brand: VehicleBrand): { value: string; label: string; disabled?: boolean } {
    return {
      value: brand.id,
      label: brand.name,
      disabled: !brand.isActive,
    };
  }

  mapModelToSelectOption(model: VehicleModel): { value: string; label: string; disabled?: boolean } {
    return {
      value: model.id,
      label: model.brand ? `${model.brand.name} ${model.name}` : model.name,
      disabled: !model.isActive,
    };
  }

  mapTypeToSelectOption(type: VehicleType): { value: string; label: string; disabled?: boolean } {
    return {
      value: type.id,
      label: type.name,
      disabled: !type.isActive,
    };
  }
}
