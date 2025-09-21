// path: apps/backend/src/modules/vehicles-catalogue/types/catalogue.types.ts
export interface BrandFilter {
  search?: string;
  country?: string;
  isActive?: boolean;
  isVerified?: boolean;
  includeDeleted?: boolean;
  page?: number;
  limit?: number;
}

export interface ModelFilter {
  search?: string;
  brandId?: string;
  yearFrom?: number;
  yearTo?: number;
  class?: string;
  isActive?: boolean;
  isVerified?: boolean;
  includeDeleted?: boolean;
  page?: number;
  limit?: number;
}

export interface TypeFilter {
  search?: string;
  isActive?: boolean;
  isVerified?: boolean;
  includeDeleted?: boolean;
  page?: number;
  limit?: number;
}

export interface CreateBrandData {
  name: string;
  country?: string;
  logoUrl?: string;
  isActive?: boolean;
  // advanced moderation/meta (optional)
  isVerified?: boolean;
  aliases?: string[];
  source?: string;
  sourceId?: string;
  moderationNotes?: string;
  assigneeUserId?: string;
  reviewedAt?: Date | null;
  reviewedByUserId?: string | null;
}

export interface UpdateBrandData {
  name?: string;
  country?: string;
  logoUrl?: string;
  isActive?: boolean;
  // advanced moderation/meta (optional)
  isVerified?: boolean;
  aliases?: string[];
  source?: string | null;
  sourceId?: string | null;
  moderationNotes?: string | null;
  assigneeUserId?: string | null;
  reviewedAt?: Date | null;
  reviewedByUserId?: string | null;
}

export interface CreateModelData {
  brandId: string;
  name: string;
  yearFrom?: number;
  yearTo?: number;
  class?: string;
  isActive?: boolean;
  // advanced moderation/meta (optional)
  isVerified?: boolean;
  aliases?: string[];
  source?: string;
  sourceId?: string;
  moderationNotes?: string;
  assigneeUserId?: string;
  reviewedAt?: Date | null;
  reviewedByUserId?: string | null;
}

export interface UpdateModelData {
  brandId?: string;
  name?: string;
  yearFrom?: number;
  yearTo?: number;
  class?: string;
  isActive?: boolean;
  // advanced moderation/meta (optional)
  isVerified?: boolean;
  aliases?: string[];
  source?: string | null;
  sourceId?: string | null;
  moderationNotes?: string | null;
  assigneeUserId?: string | null;
  reviewedAt?: Date | null;
  reviewedByUserId?: string | null;
}

export interface CreateTypeData {
  name: string;
  description?: string;
  isActive?: boolean;
  // moderation
  isVerified?: boolean;
  moderationNotes?: string;
  assigneeUserId?: string;
  reviewedAt?: Date | null;
  reviewedByUserId?: string | null;
}

export interface UpdateTypeData {
  name?: string;
  description?: string;
  isActive?: boolean;
  // moderation
  isVerified?: boolean;
  moderationNotes?: string | null;
  assigneeUserId?: string | null;
  reviewedAt?: Date | null;
  reviewedByUserId?: string | null;
}
