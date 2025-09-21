// path: apps/backend/src/modules/vehicles-catalogue/services/external-catalogue.service.ts
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { BrandsDataService } from './brands-data.service';
import { ModelsDataService } from './models-data.service';
import { CreateBrandData, CreateModelData } from '../types/catalogue.types';

export type ExternalSource = 'nhtsa';

export interface ExternalBrand {
  source: ExternalSource;
  sourceId: number;
  name: string;
}

export interface ExternalModel {
  source: ExternalSource;
  brandName: string;
  name: string;
  brandSourceId?: number;
}

@Injectable()
export class ExternalCatalogueService {
  private readonly logger = new Logger(ExternalCatalogueService.name);

  constructor(
    private readonly brandsData: BrandsDataService,
    private readonly modelsData: ModelsDataService,
  ) {}

  // ===== Public API (fetch only) =====

  async fetchExternalBrands(source: ExternalSource, search?: string, limit = 100): Promise<ExternalBrand[]> {
    switch (source) {
      case 'nhtsa':
        return this.fetchNhtsaBrands(search, limit);
      default:
        return [];
    }
  }

  async fetchExternalModels(
    source: ExternalSource,
    brandName: string,
    limit = 200,
  ): Promise<ExternalModel[]> {
    switch (source) {
      case 'nhtsa':
        return this.fetchNhtsaModels(brandName, limit);
      default:
        return [];
    }
  }

  // ===== Public API (import) =====

  async importFromExternal(
    source: ExternalSource,
    options: {
      brandName?: string;
      dryRun?: boolean;
      maxBrands?: number;
      maxModelsPerBrand?: number;
    } = {},
  ): Promise<{
    importedBrands: number;
    importedModels: number;
    skippedBrands: number;
    skippedModels: number;
    details: {
      brandsCreated: { id: string; name: string }[];
      brandsSkipped: { name: string }[];
      modelsCreated: { id: string; brandId: string; brandName: string; name: string }[];
      modelsSkipped: { brandName: string; name: string }[];
    };
  }> {
    const { brandName, dryRun = false, maxBrands = 200, maxModelsPerBrand = 500 } = options;

    const brands = brandName
      ? await this.fetchExternalBrands(source, brandName, 1)
      : await this.fetchExternalBrands(source, undefined, maxBrands);

    let importedBrands = 0;
    let importedModels = 0;
    let skippedBrands = 0;
    let skippedModels = 0;

    const details = {
      brandsCreated: [] as { id: string; name: string }[],
      brandsSkipped: [] as { name: string }[],
      modelsCreated: [] as { id: string; brandId: string; brandName: string; name: string }[],
      modelsSkipped: [] as { brandName: string; name: string }[],
    };

    for (const b of brands) {
      // Проверяем/создаём бренд
      const existingBrand = await this.brandsData.findByName(b.name);
      let brandId: string;

      if (!existingBrand) {
        if (dryRun) {
          importedBrands++;
          details.brandsCreated.push({ id: 'DRY_RUN', name: b.name });
          brandId = 'DRY_RUN';
        } else {
          const brandData: CreateBrandData = {
            name: b.name,
            isActive: true,
            isVerified: false,
            source: source,
            sourceId: String(b.sourceId),
          };
          const created = await this.brandsData.create(brandData);
          importedBrands++;
          details.brandsCreated.push({ id: created.id, name: created.name });
          brandId = created.id;
        }
      } else {
        skippedBrands++;
        details.brandsSkipped.push({ name: existingBrand.name });
        brandId = existingBrand.id;
      }

      // Загружаем модели конкретного бренда
      const models = await this.fetchExternalModels(source, b.name, maxModelsPerBrand);

      for (const m of models) {
        // Проверяем/создаём модель
        const exists = existingBrand
          ? await this.modelsData.findByNameAndBrand(m.name, existingBrand.id)
          : dryRun
          ? null
          : await this.modelsData.findByNameAndBrand(m.name, brandId);

        if (!exists) {
          if (dryRun) {
            importedModels++;
            details.modelsCreated.push({ id: 'DRY_RUN', brandId, brandName: b.name, name: m.name });
          } else {
            const createModel: CreateModelData = {
              brandId,
              name: m.name,
              yearFrom: null as any,
              yearTo: null as any,
              class: null as any,
              isActive: true,
              isVerified: false,
              source: source,
              sourceId: m.brandSourceId ? String(m.brandSourceId) : undefined,
            };
            const created = await this.modelsData.create(createModel);
            importedModels++;
            details.modelsCreated.push({
              id: created.id,
              brandId,
              brandName: b.name,
              name: created.name,
            });
          }
        } else {
          skippedModels++;
          details.modelsSkipped.push({ brandName: b.name, name: m.name });
        }
      }
    }

    return { importedBrands, importedModels, skippedBrands, skippedModels, details };
  }

  // ===== NHTSA implementation =====

  private async fetchNhtsaBrands(search?: string, limit = 100): Promise<ExternalBrand[]> {
    try {
      const url = 'https://vpic.nhtsa.dot.gov/api/vehicles/getallmakes?format=json';
      const data = await this.fetchJson(url);

      const results = Array.isArray(data?.Results) ? data.Results : [];
      const normalizedSearch = (search || '').trim().toLowerCase();
      const filtered = results
        .map((r: any) => ({
          source: 'nhtsa' as const,
          sourceId: Number(r?.Make_ID),
          name: String(r?.Make_Name || '').trim(),
        }))
        .filter((b: ExternalBrand) => b.name.length > 0);

      const final = normalizedSearch
        ? filtered.filter((b) => b.name.toLowerCase().includes(normalizedSearch))
        : filtered;

      return final.slice(0, Math.max(1, Math.min(500, Number(limit) || 100)));
    } catch (e: any) {
      this.logger.error(`fetchNhtsaBrands failed: ${e?.message ?? e}`);
      throw new InternalServerErrorException('Failed to fetch brands from NHTSA');
    }
  }

  private async fetchNhtsaModels(brandName: string, limit = 200): Promise<ExternalModel[]> {
    try {
      const safeBrand = encodeURIComponent((brandName || '').trim());
      const url = `https://vpic.nhtsa.dot.gov/api/vehicles/getmodelsformake/${safeBrand}?format=json`;
      const data = await this.fetchJson(url);

      const results = Array.isArray(data?.Results) ? data.Results : [];
      const mapped: ExternalModel[] = results
        .map((r: any) => ({
          source: 'nhtsa' as const,
          brandName: String(r?.Make_Name || '').trim(),
          name: String(r?.Model_Name || '').trim(),
          brandSourceId: Number(r?.Make_ID) || undefined,
        }))
        .filter((m) => m.name.length > 0);

      return mapped.slice(0, Math.max(1, Math.min(1000, Number(limit) || 200)));
    } catch (e: any) {
      this.logger.error(`fetchNhtsaModels failed: ${e?.message ?? e}`);
      throw new InternalServerErrorException('Failed to fetch models from NHTSA');
    }
  }

  // ===== Utils =====

  private async fetchJson(url: string): Promise<any> {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 15000);
    try {
      const res = await fetch(url, {
        signal: ac.signal,
        headers: {
          'user-agent': 'DriveCare/1.0 (+https://drivecare.local)',
          accept: 'application/json',
        },
      } as any);
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`HTTP ${res.status}: ${text}`);
      }
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }
}
