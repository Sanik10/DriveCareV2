// path: apps/frontend/lib/types/vehicles-catalogue.ts
export interface CatalogueBrand {
  id: string;
  name: string;
}

export interface CatalogueModel {
  id: string;
  name: string;
  brandId?: string;
  brand?: { id: string; name: string } | null;
}

export interface CatalogueType {
  id: string;
  name: string;
}
