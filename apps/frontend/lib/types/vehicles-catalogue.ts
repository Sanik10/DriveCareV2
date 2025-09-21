// path: apps/frontend/lib/types/vehicles-catalogue.ts
export interface CatalogueBrand {
  id: string;
  name: string;
  country?: string;
  logoUrl?: string;
  isActive?: boolean;
  isVerified?: boolean;
}

export interface CatalogueModel {
  id: string;
  name: string;
  brandId?: string;
  brand?: { id: string; name: string } | null;
  yearFrom?: number;
  yearTo?: number;
  class?: string;
  isActive?: boolean;
  isVerified?: boolean;
}

export interface CatalogueType {
  id: string;
  name: string;
  description?: string;
  isActive?: boolean;
  isVerified?: boolean;
}

/* ===== External catalogue types (NHTSA vPIC) ===== */

export type ExternalSource = 'nhtsa';

export interface ExternalBrand {
  source: ExternalSource; // 'nhtsa'
  sourceId: number;
  name: string;
}

export interface ExternalModel {
  source: ExternalSource; // 'nhtsa'
  brandName: string;
  name: string;
  brandSourceId?: number;
}

export interface ImportExternalRequest {
  source?: ExternalSource; // default 'nhtsa'
  brandName?: string; // limit import to a single brand by name
  maxBrands?: number; // 1..500
  maxModelsPerBrand?: number; // 1..1000
  dryRun?: boolean; // preview mode (does not persist)
}

export interface ImportExternalResponse {
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
}
