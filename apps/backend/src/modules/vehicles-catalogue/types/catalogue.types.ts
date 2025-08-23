// path: apps/backend/src/modules/vehicles-catalogue/types/catalogue.types.ts
export interface BrandFilter {
  search?: string;
  country?: string;
  isActive?: boolean;
  includeDeleted?: boolean;
}

export interface ModelFilter {
  search?: string;
  brandId?: string;
  yearFrom?: number;
  yearTo?: number;
  class?: string;
  isActive?: boolean;
  includeDeleted?: boolean;
}

export interface TypeFilter {
  search?: string;
  isActive?: boolean;
  includeDeleted?: boolean;
}

export interface CreateBrandData {
  name: string;
  country?: string;
  logoUrl?: string;
  isActive?: boolean;
}

export interface UpdateBrandData {
  name?: string;
  country?: string;
  logoUrl?: string;
  isActive?: boolean;
}

export interface CreateModelData {
  brandId: string;
  name: string;
  yearFrom?: number;
  yearTo?: number;
  class?: string;
  isActive?: boolean;
}

export interface UpdateModelData {
  brandId?: string;
  name?: string;
  yearFrom?: number;
  yearTo?: number;
  class?: string;
  isActive?: boolean;
}

export interface CreateTypeData {
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateTypeData {
  name?: string;
  description?: string;
  isActive?: boolean;
}
