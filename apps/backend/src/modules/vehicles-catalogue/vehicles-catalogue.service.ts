// path: apps/backend/src/modules/vehicles-catalogue/vehicles-catalogue.service.ts
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
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
import { AuditService, AuditAction } from '../../common/audit/audit.service';
import { CatalogueSuggestResponseDto } from './dto/suggest/suggest-response.dto';
import { CATALOGUE_CONSTANTS } from './constants/catalogue.constants';
import { ExternalCatalogueService, ExternalBrand, ExternalModel } from './services/external-catalogue.service';
import { ImportExternalDto } from './dto/external/import-external.dto';

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
    private readonly auditService: AuditService,
    private readonly externalCatalogueService: ExternalCatalogueService,
  ) {}

  private async safeAudit(action: AuditAction, payload: Record<string, any>) {
    try {
      await this.auditService.log(action, payload);
    } catch (e: any) {
      this.logger.warn(`Audit log failed (${action}): ${e?.message ?? e}`);
    }
  }

  // ===== BRANDS =====

  async createBrand(createBrandDto: CreateBrandDto): Promise<BrandResponseDto> {
    const brand = await this.catalogueBusinessService.createBrand(createBrandDto);
    await this.safeAudit(AuditAction.CATALOGUE_BRAND_UPDATED, {
      entityId: brand.id,
      entityType: 'VEHICLE_BRAND',
      details: { created: true },
    });
    return this.catalogueMapperService.mapBrandToResponseDto(brand);
  }

  async getBrands(filter: Partial<BrandFilter> & { isActive?: any; isVerified?: any } = {}): Promise<BrandResponseDto[]> {
    const brands = await this.brandsDataService.findWithFilters(filter as any as BrandFilter);
    await this.safeAudit(AuditAction.CATALOGUE_BRANDS_LISTED, {
      resourceType: 'VEHICLE_CATALOGUE',
      details: { filter },
    });
    return this.catalogueMapperService.mapBrandsArrayToResponseDto(brands);
  }

  async getBrand(id: string): Promise<BrandResponseDto> {
    const brand = await this.catalogueValidationService.validateBrandExists(id);
    await this.safeAudit(AuditAction.CATALOGUE_BRAND_VIEWED, {
      resourceType: 'VEHICLE_BRAND',
      entityId: id,
    });
    return this.catalogueMapperService.mapBrandToResponseDto(brand);
  }

  async updateBrand(id: string, updateBrandDto: UpdateBrandDto): Promise<BrandResponseDto> {
    const brand = await this.catalogueBusinessService.updateBrand(id, updateBrandDto);
    await this.safeAudit(AuditAction.CATALOGUE_BRAND_UPDATED, {
      entityId: brand.id,
      entityType: 'VEHICLE_BRAND',
      details: { update: true },
    });
    return this.catalogueMapperService.mapBrandToResponseDto(brand);
  }

  async deleteBrand(id: string): Promise<void> {
    await this.catalogueBusinessService.deleteBrand(id);
    await this.safeAudit(AuditAction.CATALOGUE_BRAND_UPDATED, {
      entityId: id,
      entityType: 'VEHICLE_BRAND',
      details: { deleted: true },
    });
  }

  async verifyBrand(id: string, isVerified: boolean): Promise<BrandResponseDto> {
    const brand = await this.brandsDataService.setVerified(id, isVerified);
    await this.safeAudit(AuditAction.CATALOGUE_BRAND_UPDATED, {
      entityId: brand.id,
      entityType: 'VEHICLE_BRAND',
      details: { isVerified },
    });
    return this.catalogueMapperService.mapBrandToResponseDto(brand);
  }

  // ===== MODELS =====

  async createModel(createModelDto: CreateModelDto): Promise<ModelResponseDto> {
    const model = await this.catalogueBusinessService.createModel(createModelDto);
    await this.safeAudit(AuditAction.CATALOGUE_MODEL_UPDATED, {
      entityId: model.id,
      entityType: 'VEHICLE_MODEL',
      details: { created: true },
    });
    return this.catalogueMapperService.mapModelToResponseDto(model);
  }

  async getModels(filter: Partial<ModelFilter> & { isActive?: any; isVerified?: any } = {}): Promise<ModelResponseDto[]> {
    const models = await this.modelsDataService.findWithFilters(filter as any as ModelFilter);
    await this.safeAudit(AuditAction.CATALOGUE_MODELS_LISTED, {
      resourceType: 'VEHICLE_CATALOGUE',
      details: { filter },
    });
    return this.catalogueMapperService.mapModelsArrayToResponseDto(models);
  }

  async getModel(id: string): Promise<ModelResponseDto> {
    const model = await this.catalogueValidationService.validateModelExists(id);
    await this.safeAudit(AuditAction.CATALOGUE_MODEL_VIEWED, {
      resourceType: 'VEHICLE_MODEL',
      entityId: id,
    });
    return this.catalogueMapperService.mapModelToResponseDto(model);
  }

  async updateModel(id: string, updateModelDto: UpdateModelDto): Promise<ModelResponseDto> {
    const model = await this.catalogueBusinessService.updateModel(id, updateModelDto);
    await this.safeAudit(AuditAction.CATALOGUE_MODEL_UPDATED, {
      entityId: model.id,
      entityType: 'VEHICLE_MODEL',
      details: { update: true },
    });
    return this.catalogueMapperService.mapModelToResponseDto(model);
  }

  async deleteModel(id: string): Promise<void> {
    await this.catalogueBusinessService.deleteModel(id);
    await this.safeAudit(AuditAction.CATALOGUE_MODEL_UPDATED, {
      entityId: id,
      entityType: 'VEHICLE_MODEL',
      details: { deleted: true },
    });
  }

  async verifyModel(id: string, isVerified: boolean): Promise<ModelResponseDto> {
    const model = await this.modelsDataService.setVerified(id, isVerified);
    await this.safeAudit(AuditAction.CATALOGUE_MODEL_UPDATED, {
      entityId: model.id,
      entityType: 'VEHICLE_MODEL',
      details: { isVerified },
    });
    return this.catalogueMapperService.mapModelToResponseDto(model);
  }

  // ===== TYPES =====

  async createType(createTypeDto: CreateTypeDto): Promise<TypeResponseDto> {
    const type = await this.catalogueBusinessService.createType(createTypeDto);
    await this.safeAudit(AuditAction.CATALOGUE_TYPE_UPDATED, {
      entityId: type.id,
      entityType: 'VEHICLE_TYPE',
      details: { created: true },
    });
    return this.catalogueMapperService.mapTypeToResponseDto(type);
  }

  async getTypes(filter: Partial<TypeFilter> = {}): Promise<TypeResponseDto[]> {
    const types = await this.typesDataService.findWithFilters(filter as TypeFilter);
    await this.safeAudit(AuditAction.CATALOGUE_TYPES_LISTED, {
      resourceType: 'VEHICLE_CATALOGUE',
      details: { filter },
    });
    return this.catalogueMapperService.mapTypesArrayToResponseDto(types);
  }

  async getType(id: string): Promise<TypeResponseDto> {
    const type = await this.catalogueValidationService.validateTypeExists(id);
    await this.safeAudit(AuditAction.CATALOGUE_TYPE_VIEWED, {
      resourceType: 'VEHICLE_TYPE',
      entityId: id,
    });
    return this.catalogueMapperService.mapTypeToResponseDto(type);
  }

  async updateType(id: string, updateTypeDto: UpdateTypeDto): Promise<TypeResponseDto> {
    const type = await this.catalogueBusinessService.updateType(id, updateTypeDto);
    await this.safeAudit(AuditAction.CATALOGUE_TYPE_UPDATED, {
      entityId: type.id,
      entityType: 'VEHICLE_TYPE',
      details: { update: true },
    });
    return this.catalogueMapperService.mapTypeToResponseDto(type);
  }

  async deleteType(id: string): Promise<void> {
    await this.catalogueBusinessService.deleteType(id);
    await this.safeAudit(AuditAction.CATALOGUE_TYPE_UPDATED, {
      entityId: id,
      entityType: 'VEHICLE_TYPE',
      details: { deleted: true },
    });
  }

  async verifyType(id: string, isVerified: boolean): Promise<TypeResponseDto> {
    const type = await this.typesDataService.setVerified(id, isVerified);
    await this.safeAudit(AuditAction.CATALOGUE_TYPE_UPDATED, {
      entityId: type.id,
      entityType: 'VEHICLE_TYPE',
      details: { isVerified },
    });
    return this.catalogueMapperService.mapTypeToResponseDto(type);
  }

  // ===== MERGE / TRANSFER =====

  async mergeBrand(sourceBrandId: string, targetBrandId: string): Promise<void> {
    if (sourceBrandId === targetBrandId) {
      throw new BadRequestException('sourceBrandId и targetBrandId не должны совпадать');
    }

    const [source, target] = await Promise.all([
      this.catalogueValidationService.validateBrandExists(sourceBrandId),
      this.catalogueValidationService.validateBrandExists(targetBrandId),
    ]);

    const modelsToMove = await this.modelsDataService.findByBrand(sourceBrandId);
    for (const model of modelsToMove) {
      const conflict = await this.modelsDataService.findByNameAndBrand(model.name, targetBrandId);
      if (conflict) {
        // попытка сохранить алиас — не критично, если колонки нет
        try {
          const aliases = Array.isArray(conflict['aliases']) ? [...(conflict as any)['aliases']] : [];
          if (!aliases.some((a) => (a || '').trim().toLowerCase() === model.name.trim().toLowerCase())) {
            aliases.push(model.name.trim());
            await this.modelsDataService.update(conflict.id, { aliases } as any);
          }
        } catch {
          // ignore alias update errors
        }
        await this.modelsDataService.mergeModels(model.id, conflict.id);
      } else {
        await this.modelsDataService.update(model.id, { brandId: targetBrandId });
      }
    }

    // Пытаемся добавить алиас исходного бренда в целевой; ошибки игнорируем
    try {
      const targetAliases = Array.isArray((target as any)['aliases']) ? [...(target as any)['aliases']] : [];
      if (!targetAliases.some((a) => (a || '').trim().toLowerCase() === source.name.trim().toLowerCase())) {
        targetAliases.push(source.name.trim());
        await this.brandsDataService.update(targetBrandId, { aliases: targetAliases } as any);
      }
    } catch {
      // ignore alias update errors
    }

    await this.brandsDataService.softDelete(sourceBrandId);

    await this.safeAudit(AuditAction.CATALOGUE_BRAND_UPDATED, {
      entityId: sourceBrandId,
      entityType: 'VEHICLE_BRAND',
      details: { mergedInto: targetBrandId, movedModels: modelsToMove.length },
    });

    this.logger.log(`Merged brand ${source.name} (${source.id}) into ${target.name} (${target.id})`);
  }

  async mergeModel(sourceModelId: string, targetModelId: string): Promise<void> {
    if (sourceModelId === targetModelId) {
      throw new BadRequestException('sourceModelId и targetModelId не должны совпадать');
    }

    const [source, target] = await Promise.all([
      this.catalogueValidationService.validateModelExists(sourceModelId),
      this.catalogueValidationService.validateModelExists(targetModelId),
    ]);

    // Пытаемся добавить алиас исходного имени — ошибки игнорируем
    try {
      const targetAliases = Array.isArray((target as any)['aliases']) ? [...(target as any)['aliases']] : [];
      if (!targetAliases.some((a) => (a || '').trim().toLowerCase() === source.name.trim().toLowerCase())) {
        targetAliases.push(source.name.trim());
        await this.modelsDataService.update(targetModelId, { aliases: targetAliases } as any);
      }
    } catch {
      // ignore alias update errors
    }

    await this.modelsDataService.mergeModels(sourceModelId, targetModelId);

    await this.safeAudit(AuditAction.CATALOGUE_MODEL_UPDATED, {
      entityId: sourceModelId,
      entityType: 'VEHICLE_MODEL',
      details: { mergedInto: targetModelId, sourceBrandId: source.brandId, targetBrandId: target.brandId },
    });

    this.logger.log(`Merged model ${source.name} (${source.id}) into ${target.name} (${target.id})`);
  }

  // ===== SUGGEST (fuzzy) =====

  async suggest(query: string, brandId?: string, limitBrands?: number, limitModels?: number): Promise<CatalogueSuggestResponseDto> {
    const q = (query || '').trim();
    if (q.length < CATALOGUE_CONSTANTS.SUGGEST.MIN_QUERY_LENGTH) {
      return { query: q, brands: [], models: [] };
    }

    const maxBrands = Math.max(1, Math.min(CATALOGUE_CONSTANTS.SUGGEST.MAX_BRANDS, Number(limitBrands) || CATALOGUE_CONSTANTS.SUGGEST.MAX_BRANDS));
    const maxModels = Math.max(1, Math.min(CATALOGUE_CONSTANTS.SUGGEST.MAX_MODELS, Number(limitModels) || CATALOGUE_CONSTANTS.SUGGEST.MAX_MODELS));

    const [brands, models] = await Promise.all([
      this.brandsDataService.findWithFilters({ search: q, page: 1, limit: 100 } as any),
      this.modelsDataService.findWithFilters({ search: q, brandId, page: 1, limit: 100 } as any),
    ]);

    const rankedBrands = brands
      .map((b) => ({ b, score: this.jaroWinkler(b.name, q) }))
      .sort((a, b) => b.score - a.score)
      .filter((x) => x.score >= CATALOGUE_CONSTANTS.SUGGEST.SIMILARITY_THRESHOLD)
      .slice(0, maxBrands)
      .map((x) => x.b);

    const rankedModels = models
      .map((m) => ({ m, score: this.jaroWinkler(`${(m as any).brand?.name ?? ''} ${m.name}`, q) }))
      .sort((a, b) => b.score - a.score)
      .filter((x) => x.score >= CATALOGUE_CONSTANTS.SUGGEST.SIMILARITY_THRESHOLD)
      .slice(0, maxModels)
      .map((x) => x.m);

    await this.safeAudit(AuditAction.CATALOGUE_BRANDS_LISTED, {
      resourceType: 'VEHICLE_CATALOGUE',
      details: { suggest: true, q, brandId, countBrands: rankedBrands.length, countModels: rankedModels.length },
    });

    return {
      query: q,
      brands: this.catalogueMapperService.mapBrandsArrayToResponseDto(rankedBrands),
      models: this.catalogueMapperService.mapModelsArrayToResponseDto(rankedModels),
    };
  }

  // ===== EXTERNAL SOURCES =====

  async externalBrands(source: 'nhtsa', search?: string, limit?: number): Promise<ExternalBrand[]> {
    const brands = await this.externalCatalogueService.fetchExternalBrands(source, search, limit);
    await this.safeAudit(AuditAction.CATALOGUE_BRANDS_LISTED, {
      resourceType: 'VEHICLE_CATALOGUE',
      details: { external: true, source, search, count: brands.length },
    });
    return brands;
  }

  async externalModels(source: 'nhtsa', brandName: string, limit?: number): Promise<ExternalModel[]> {
    const models = await this.externalCatalogueService.fetchExternalModels(source, brandName, limit);
    await this.safeAudit(AuditAction.CATALOGUE_MODELS_LISTED, {
      resourceType: 'VEHICLE_CATALOGUE',
      details: { external: true, source, brandName, count: models.length },
    });
    return models;
  }

  async importFromExternal(dto: ImportExternalDto) {
    const res = await this.externalCatalogueService.importFromExternal(dto.source, {
      brandName: dto.brandName,
      dryRun: dto.dryRun,
      maxBrands: dto.maxBrands,
      maxModelsPerBrand: dto.maxModelsPerBrand,
    });
    await this.safeAudit(AuditAction.CATALOGUE_BRANDS_LISTED, {
      resourceType: 'VEHICLE_CATALOGUE',
      details: { importFromExternal: true, source: dto.source, dryRun: dto.dryRun, summary: { ...res } },
    });
    return res;
  }

  // ===== Helpers =====

  private jaroWinkler(s1: string, s2: string): number {
    const m = this.jaro(s1, s2);
    const prefix = this.commonPrefixLength(s1.toLowerCase(), s2.toLowerCase(), 4);
    const p = 0.1;
    return m + prefix * p * (1 - m);
  }

  private jaro(s1: string, s2: string): number {
    const a = (s1 || '').toLowerCase();
    const b = (s2 || '').toLowerCase();
    if (a === b) return 1;
    const maxDist = Math.floor(Math.max(a.length, b.length) / 2) - 1;
    const aMatch = new Array(a.length).fill(false);
    const bMatch = new Array(b.length).fill(false);

    let matches = 0;
    for (let i = 0; i < a.length; i++) {
      const start = Math.max(0, i - maxDist);
      const end = Math.min(i + maxDist + 1, b.length);
      for (let j = start; j < end; j++) {
        if (bMatch[j]) continue;
        if (a[i] !== b[j]) continue;
        aMatch[i] = true;
        bMatch[j] = true;
        matches++;
        break;
      }
    }
    if (matches === 0) return 0;

    let t = 0;
    let k = 0;
    for (let i = 0; i < a.length; i++) {
      if (!aMatch[i]) continue;
      while (!bMatch[k]) k++;
      if (a[i] !== b[k]) t++;
      k++;
    }
    t = t / 2;
    return (matches / a.length + matches / b.length + (matches - t) / matches) / 3;
  }

  private commonPrefixLength(a: string, b: string, maxLen: number): number {
    const lim = Math.min(maxLen, a.length, b.length);
    let i = 0;
    for (; i < lim && a[i] === b[i]; i++);
    return i;
  }
}
