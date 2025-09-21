// path: apps/backend/src/modules/vehicles-catalogue/services/catalogue-mapper.service.ts
import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';

import { VehicleBrand, VehicleModel, VehicleType } from '../../../database/entities';

import { BrandResponseDto } from '../dto/brands/brand-response.dto';
import { ModelResponseDto } from '../dto/models/model-response.dto';
import { TypeResponseDto } from '../dto/types/type-response.dto';

@Injectable()
export class CatalogueMapperService {
  // ===== BRANDS =====
  mapBrandToResponseDto(brand: VehicleBrand): BrandResponseDto {
    if (!brand) return undefined as unknown as BrandResponseDto;

    return plainToInstance(BrandResponseDto, {
      id: brand.id,
      name: brand.name,
      country: brand.country ?? null,
      logoUrl: brand.logoUrl ?? null,
      isActive: brand.isActive ?? true,
      isVerified: brand.isVerified ?? false,
      createdAt: brand.createdAt,
      updatedAt: brand.updatedAt,
    });
  }

  mapBrandsArrayToResponseDto(brands: VehicleBrand[]): BrandResponseDto[] {
    if (!Array.isArray(brands) || brands.length === 0) return [];
    return brands.map((b) => this.mapBrandToResponseDto(b));
  }

  mapBrandToSelectOption(brand: VehicleBrand): { value: string; label: string; disabled?: boolean } {
    return {
      value: brand.id,
      label: brand.name,
      disabled: brand.isActive === false || (brand as any).isDeleted === true,
    };
  }

  // ===== MODELS =====
  mapModelToResponseDto(model: VehicleModel): ModelResponseDto {
    if (!model) return undefined as unknown as ModelResponseDto;

    // Если relation brand подгружен — положим нормализованный BrandResponseDto
    const brand = (model as any).brand as VehicleBrand | undefined;
    const brandDto = brand ? this.mapBrandToResponseDto(brand) : undefined;

    const fullName = brandDto?.name ? `${brandDto.name} ${model.name}` : model.name;

    return plainToInstance(ModelResponseDto, {
      id: model.id,
      brandId: model.brandId,
      name: model.name,
      yearFrom: model.yearFrom ?? null,
      yearTo: model.yearTo ?? null,
      class: model.class ?? null,
      isActive: model.isActive ?? true,
      isVerified: model.isVerified ?? false,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
      brand: brandDto,
      fullName,
    });
  }

  mapModelsArrayToResponseDto(models: VehicleModel[]): ModelResponseDto[] {
    if (!Array.isArray(models) || models.length === 0) return [];
    return models.map((m) => this.mapModelToResponseDto(m));
  }

  mapModelToSelectOption(model: VehicleModel): { value: string; label: string; disabled?: boolean } {
    const brand = (model as any).brand as VehicleBrand | undefined;
    const label = brand?.name ? `${brand.name} ${model.name}` : model.name;
    return {
      value: model.id,
      label,
      disabled: model.isActive === false || (model as any).isDeleted === true,
    };
  }

  // ===== TYPES =====
  mapTypeToResponseDto(type: VehicleType): TypeResponseDto {
    if (!type) return undefined as unknown as TypeResponseDto;

    return plainToInstance(TypeResponseDto, {
      id: type.id,
      name: type.name,
      description: type.description ?? null,
      isActive: type.isActive ?? true,
      isVerified: type.isVerified ?? false,
      createdAt: type.createdAt,
      updatedAt: type.updatedAt,
    });
  }

  mapTypesArrayToResponseDto(types: VehicleType[]): TypeResponseDto[] {
    if (!Array.isArray(types) || types.length === 0) return [];
    return types.map((t) => this.mapTypeToResponseDto(t));
  }

  mapTypeToSelectOption(type: VehicleType): { value: string; label: string; disabled?: boolean } {
    return {
      value: type.id,
      label: type.name,
      disabled: type.isActive === false || (type as any).isDeleted === true,
    };
  }
}
