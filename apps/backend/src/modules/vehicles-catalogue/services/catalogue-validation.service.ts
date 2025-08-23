// path: apps/backend/src/modules/vehicles-catalogue/services/catalogue-validation.service.ts
import { Injectable } from '@nestjs/common';
import { BrandsDataService } from './brands-data.service';
import { ModelsDataService } from './models-data.service';
import { TypesDataService } from './types-data.service';
import { VehicleBrand, VehicleModel, VehicleType } from '../../../database/entities';
import { CreateBrandData, UpdateBrandData, CreateModelData, UpdateModelData, CreateTypeData, UpdateTypeData } from '../types/catalogue.types';
import { ICatalogueValidationService } from '../interfaces/catalogue.interface';
import { 
  VehicleBrandNotFoundException,
  VehicleModelNotFoundException,
  VehicleTypeNotFoundException,
  ValidationDataException
} from '../../../common/exceptions/domain.exceptions';
import { CATALOGUE_CONSTANTS } from '../constants/catalogue.constants';

@Injectable()
export class CatalogueValidationService implements ICatalogueValidationService {
  constructor(
    private readonly brandsDataService: BrandsDataService,
    private readonly modelsDataService: ModelsDataService,
    private readonly typesDataService: TypesDataService,
  ) {}

  // ====== BRANDS VALIDATION ======

  async validateBrandExists(id: string): Promise<VehicleBrand> {
    const brand = await this.brandsDataService.findById(id);
    
    if (!brand) {
      throw new VehicleBrandNotFoundException(id);
    }

    return brand;
  }

  async validateBrandNameUniqueness(name: string, excludeId?: string): Promise<void> {
    const existingBrand = await this.brandsDataService.findByName(name);
    
    if (existingBrand && existingBrand.id !== excludeId) {
      throw new ValidationDataException(
        'name',
        `Бренд с названием "${name}" уже существует`
      );
    }
  }

  async validateBrandCanBeDeleted(id: string): Promise<void> {
    const modelsCount = await this.brandsDataService.countModels(id);
    
    if (modelsCount > 0) {
      throw new ValidationDataException(
        'brand',
        `Нельзя удалить бренд, у которого есть модели (количество: ${modelsCount})`
      );
    }
  }

  validateBrandData(data: Partial<CreateBrandData | UpdateBrandData>): void {
    if (data.name) {
      if (data.name.length < CATALOGUE_CONSTANTS.VALIDATION.MIN_NAME_LENGTH) {
        throw new ValidationDataException(
          'name',
          `Название должно содержать минимум ${CATALOGUE_CONSTANTS.VALIDATION.MIN_NAME_LENGTH} символа`
        );
      }

      if (data.name.length > CATALOGUE_CONSTANTS.VALIDATION.MAX_NAME_LENGTH) {
        throw new ValidationDataException(
          'name',
          `Название не может превышать ${CATALOGUE_CONSTANTS.VALIDATION.MAX_NAME_LENGTH} символов`
        );
      }
    }

    if (data.logoUrl) {
      const urlRegex = /^https?:\/\/.+\..+/i;
      if (!urlRegex.test(data.logoUrl)) {
        throw new ValidationDataException(
          'logoUrl',
          'Некорректный формат URL логотипа'
        );
      }
    }
  }

  // ====== MODELS VALIDATION ======

  async validateModelExists(id: string): Promise<VehicleModel> {
    const model = await this.modelsDataService.findById(id);
    
    if (!model) {
      throw new VehicleModelNotFoundException(id);
    }

    return model;
  }

  async validateModelNameUniqueness(name: string, brandId: string, excludeId?: string): Promise<void> {
    const existingModel = await this.modelsDataService.findByNameAndBrand(name, brandId);
    
    if (existingModel && existingModel.id !== excludeId) {
      throw new ValidationDataException(
        'name',
        `Модель с названием "${name}" уже существует у данного бренда`
      );
    }
  }

  async validateModelCanBeDeleted(id: string): Promise<void> {
    const vehiclesCount = await this.modelsDataService.countVehicles(id);
    
    if (vehiclesCount > 0) {
      throw new ValidationDataException(
        'model',
        `Нельзя удалить модель, которая используется в автомобилях (количество: ${vehiclesCount})`
      );
    }
  }

  validateModelData(data: Partial<CreateModelData | UpdateModelData>): void {
    if (data.name) {
      if (data.name.length < CATALOGUE_CONSTANTS.VALIDATION.MIN_NAME_LENGTH) {
        throw new ValidationDataException(
          'name',
          `Название должно содержать минимум ${CATALOGUE_CONSTANTS.VALIDATION.MIN_NAME_LENGTH} символа`
        );
      }

      if (data.name.length > CATALOGUE_CONSTANTS.VALIDATION.MAX_NAME_LENGTH) {
        throw new ValidationDataException(
          'name',
          `Название не может превышать ${CATALOGUE_CONSTANTS.VALIDATION.MAX_NAME_LENGTH} символов`
        );
      }
    }

    // Валидация годов производства
    if (data.yearFrom && data.yearTo) {
      if (data.yearFrom > data.yearTo) {
        throw new ValidationDataException(
          'yearFrom',
          'Год начала производства не может быть позже года окончания'
        );
      }
    }

    if (data.yearFrom) {
      if (data.yearFrom < CATALOGUE_CONSTANTS.VALIDATION.MIN_YEAR || 
          data.yearFrom > CATALOGUE_CONSTANTS.VALIDATION.MAX_YEAR) {
        throw new ValidationDataException(
          'yearFrom',
          `Год должен быть от ${CATALOGUE_CONSTANTS.VALIDATION.MIN_YEAR} до ${CATALOGUE_CONSTANTS.VALIDATION.MAX_YEAR}`
        );
      }
    }

    if (data.yearTo) {
      if (data.yearTo < CATALOGUE_CONSTANTS.VALIDATION.MIN_YEAR || 
          data.yearTo > CATALOGUE_CONSTANTS.VALIDATION.MAX_YEAR) {
        throw new ValidationDataException(
          'yearTo',
          `Год должен быть от ${CATALOGUE_CONSTANTS.VALIDATION.MIN_YEAR} до ${CATALOGUE_CONSTANTS.VALIDATION.MAX_YEAR}`
        );
      }
    }
  }

  // ====== TYPES VALIDATION ======

  async validateTypeExists(id: string): Promise<VehicleType> {
    const type = await this.typesDataService.findById(id);
    
    if (!type) {
      throw new VehicleTypeNotFoundException(id);
    }

    return type;
  }

  async validateTypeNameUniqueness(name: string, excludeId?: string): Promise<void> {
    const existingType = await this.typesDataService.findByName(name);
    
    if (existingType && existingType.id !== excludeId) {
      throw new ValidationDataException(
        'name',
        `Тип ТС с названием "${name}" уже существует`
      );
    }
  }

  async validateTypeCanBeDeleted(id: string): Promise<void> {
    const vehiclesCount = await this.typesDataService.countVehicles(id);
    
    if (vehiclesCount > 0) {
      throw new ValidationDataException(
        'type',
        `Нельзя удалить тип ТС, который используется в автомобилях (количество: ${vehiclesCount})`
      );
    }
  }

  validateTypeData(data: Partial<CreateTypeData | UpdateTypeData>): void {
    if (data.name) {
      if (data.name.length < CATALOGUE_CONSTANTS.VALIDATION.MIN_NAME_LENGTH) {
        throw new ValidationDataException(
          'name',
          `Название должно содержать минимум ${CATALOGUE_CONSTANTS.VALIDATION.MIN_NAME_LENGTH} символа`
        );
      }

      if (data.name.length > CATALOGUE_CONSTANTS.VALIDATION.MAX_NAME_LENGTH) {
        throw new ValidationDataException(
          'name',
          `Название не может превышать ${CATALOGUE_CONSTANTS.VALIDATION.MAX_NAME_LENGTH} символов`
        );
      }
    }

    if (data.description && data.description.length > CATALOGUE_CONSTANTS.VALIDATION.MAX_DESCRIPTION_LENGTH) {
      throw new ValidationDataException(
        'description',
        `Описание не может превышать ${CATALOGUE_CONSTANTS.VALIDATION.MAX_DESCRIPTION_LENGTH} символов`
      );
    }
  }
}
