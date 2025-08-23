// path: apps/backend/src/modules/vehicles-catalogue/services/catalogue-business.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { BrandsDataService } from './brands-data.service';
import { ModelsDataService } from './models-data.service';
import { TypesDataService } from './types-data.service';
import { CatalogueValidationService } from './catalogue-validation.service';
import { VehicleBrand, VehicleModel, VehicleType } from '../../../database/entities';
import {
  CreateBrandData,
  UpdateBrandData,
  CreateModelData,
  UpdateModelData,
  CreateTypeData,
  UpdateTypeData,
} from '../types/catalogue.types';
import { ICatalogueBusinessService } from '../interfaces/catalogue.interface';
import { CATALOGUE_CONSTANTS } from '../constants/catalogue.constants';
import { AuditService, AuditAction } from '../../../common/audit/audit.service';

@Injectable()
export class CatalogueBusinessService implements ICatalogueBusinessService {
  private readonly logger = new Logger(CatalogueBusinessService.name);

  constructor(
    private readonly brandsDataService: BrandsDataService,
    private readonly modelsDataService: ModelsDataService,
    private readonly typesDataService: TypesDataService,
    private readonly catalogueValidationService: CatalogueValidationService,
    private readonly auditService: AuditService,
  ) {}

  // ====== BRANDS BUSINESS LOGIC ======

  async createBrand(data: CreateBrandData): Promise<VehicleBrand> {
    this.catalogueValidationService.validateBrandData(data);
    await this.catalogueValidationService.validateBrandNameUniqueness(data.name);

    const brand = await this.brandsDataService.create(data);

    this.logger.log(`Created brand: ${brand.name} (${brand.id})`);
    await this.auditService.log(AuditAction.CATALOGUE_BRAND_CREATED, {
      entityId: brand.id,
      entityType: 'VEHICLE_BRAND',
      details: { name: brand.name, country: brand.country },
    });

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
    await this.auditService.log(AuditAction.CATALOGUE_BRAND_UPDATED, {
      entityId: updatedBrand.id,
      entityType: 'VEHICLE_BRAND',
      details: { nameBefore: existingBrand.name, nameAfter: updatedBrand.name },
      changes: {
        before: { name: existingBrand.name, country: existingBrand.country, isActive: existingBrand.isActive },
        after: { name: updatedBrand.name, country: updatedBrand.country, isActive: updatedBrand.isActive },
      },
    });

    return updatedBrand;
  }

  async deleteBrand(id: string): Promise<void> {
    const brand = await this.catalogueValidationService.validateBrandExists(id);
    await this.catalogueValidationService.validateBrandCanBeDeleted(id);

    await this.brandsDataService.softDelete(id);

    this.logger.log(`Deleted brand: ${brand.name} (${brand.id})`);
    await this.auditService.log(AuditAction.CATALOGUE_BRAND_DELETED, {
      entityId: brand.id,
      entityType: 'VEHICLE_BRAND',
      details: { softDelete: true },
    });
  }

  // ====== MODELS BUSINESS LOGIC ======

  async createModel(data: CreateModelData): Promise<VehicleModel> {
    await this.catalogueValidationService.validateBrandExists(data.brandId);

    this.catalogueValidationService.validateModelData(data);
    await this.catalogueValidationService.validateModelNameUniqueness(data.name, data.brandId);

    const model = await this.modelsDataService.create(data);

    this.logger.log(`Created model: ${model.name} (${model.id}) for brand ${model.brandId}`);
    await this.auditService.log(AuditAction.CATALOGUE_MODEL_CREATED, {
      entityId: model.id,
      entityType: 'VEHICLE_MODEL',
      details: { name: model.name, brandId: model.brandId },
    });

    return model;
  }

  async updateModel(id: string, data: UpdateModelData): Promise<VehicleModel> {
    const existingModel = await this.catalogueValidationService.validateModelExists(id);

    if (data.brandId && data.brandId !== existingModel.brandId) {
      await this.catalogueValidationService.validateBrandExists(data.brandId);
    }

    this.catalogueValidationService.validateModelData(data);

    const brandId = data.brandId || existingModel.brandId;
    if (data.name && data.name !== existingModel.name) {
      await this.catalogueValidationService.validateModelNameUniqueness(data.name, brandId, id);
    }

    const updatedModel = await this.modelsDataService.update(id, data);

    this.logger.log(`Updated model: ${updatedModel.name} (${updatedModel.id})`);
    await this.auditService.log(AuditAction.CATALOGUE_MODEL_UPDATED, {
      entityId: updatedModel.id,
      entityType: 'VEHICLE_MODEL',
      details: { nameBefore: existingModel.name, nameAfter: updatedModel.name, brandIdBefore: existingModel.brandId, brandIdAfter: updatedModel.brandId },
      changes: {
        before: { name: existingModel.name, brandId: existingModel.brandId, class: existingModel.class, isActive: existingModel.isActive },
        after: { name: updatedModel.name, brandId: updatedModel.brandId, class: updatedModel.class, isActive: updatedModel.isActive },
      },
    });

    return updatedModel;
  }

  async deleteModel(id: string): Promise<void> {
    const model = await this.catalogueValidationService.validateModelExists(id);
    await this.catalogueValidationService.validateModelCanBeDeleted(id);

    await this.modelsDataService.softDelete(id);

    this.logger.log(`Deleted model: ${model.name} (${model.id})`);
    await this.auditService.log(AuditAction.CATALOGUE_MODEL_DELETED, {
      entityId: model.id,
      entityType: 'VEHICLE_MODEL',
      details: { softDelete: true },
    });
  }

  // ====== TYPES BUSINESS LOGIC ======

  async createType(data: CreateTypeData): Promise<VehicleType> {
    this.catalogueValidationService.validateTypeData(data);
    await this.catalogueValidationService.validateTypeNameUniqueness(data.name);

    const type = await this.typesDataService.create(data);

    this.logger.log(`Created vehicle type: ${type.name} (${type.id})`);
    await this.auditService.log(AuditAction.CATALOGUE_TYPE_CREATED, {
      entityId: type.id,
      entityType: 'VEHICLE_TYPE',
      details: { name: type.name },
    });

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
    await this.auditService.log(AuditAction.CATALOGUE_TYPE_UPDATED, {
      entityId: updatedType.id,
      entityType: 'VEHICLE_TYPE',
      details: { nameBefore: existingType.name, nameAfter: updatedType.name },
      changes: {
        before: { name: existingType.name, isActive: existingType.isActive },
        after: { name: updatedType.name, isActive: updatedType.isActive },
      },
    });

    return updatedType;
  }

  async deleteType(id: string): Promise<void> {
    const type = await this.catalogueValidationService.validateTypeExists(id);
    await this.catalogueValidationService.validateTypeCanBeDeleted(id);

    await this.typesDataService.softDelete(id);

    this.logger.log(`Deleted vehicle type: ${type.name} (${type.id})`);
    await this.auditService.log(AuditAction.CATALOGUE_TYPE_DELETED, {
      entityId: type.id,
      entityType: 'VEHICLE_TYPE',
      details: { softDelete: true },
    });
  }
}
