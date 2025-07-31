// src/modules/inventory/parts/types/parts.types.ts
import { Part } from '../../../../database/entities';

export type PartSortField = 'name' | 'partNumber' | 'brand' | 'costPrice' | 'sellingPrice' | 'createdAt' | 'category';
export type SortOrder = 'asc' | 'desc';

export interface PartFilter {
  search?: string;
  categoryId?: string;
  brand?: string;
  isActive?: boolean;
  companyId?: string;
  minCostPrice?: number;
  maxCostPrice?: number;
  minSellingPrice?: number;
  maxSellingPrice?: number;
  createdFrom?: Date;
  createdTo?: Date;
  page?: number;
  limit?: number;
  sortField?: PartSortField;
  sortOrder?: SortOrder;
  includeDeleted?: boolean;
}

export interface CreatePartData {
  companyId: string;
  categoryId: string;
  name: string;
  partNumber?: string;
  brand?: string;
  description?: string;
  costPrice: number;
  sellingPrice: number;
  imageUrl?: string;
  isActive?: boolean;
}

export interface UpdatePartData {
  categoryId?: string;
  name?: string;
  partNumber?: string;
  brand?: string;
  description?: string;
  costPrice?: number;
  sellingPrice?: number;
  imageUrl?: string;
  isActive?: boolean;
}

export interface BulkUpdatePartData {
  partIds: string[];
  updateData: {
    categoryId?: string;
    costPrice?: number;
    sellingPrice?: number;
    isActive?: boolean;
  };
}

export interface PaginatedPartsResult {
  items: Part[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PartStats {
  totalActive: number;
  totalInactive: number;
  totalByCategory: Array<{
    categoryId: string;
    categoryName: string;
    count: number;
  }>;
  averageCostPrice: number;
  averageSellingPrice: number;
  totalInventoryValue: number;
  mostExpensivePart: {
    id: string;
    name: string;
    costPrice: number;
  } | null;
  cheapestPart: {
    id: string;
    name: string;
    costPrice: number;
  } | null;
}

export interface PartBasicInfo {
  id: string;
  name: string;
  partNumber?: string;
  brand?: string;
  categoryName: string;
  costPrice: number;
  sellingPrice: number;
  isActive: boolean;
  companyId: string;
}

export interface PartWithInventory extends PartBasicInfo {
  currentStock: number;
  minStock: number;
  needsRestock: boolean;
  lastMovementDate?: Date;
}

export interface PartSearchResult {
  id: string;
  name: string;
  partNumber?: string;
  brand?: string;
  categoryName: string;
  costPrice: number;
  sellingPrice: number;
  isActive: boolean;
  relevanceScore: number;
}

export interface BulkOperationResult {
  successCount: number;
  failureCount: number;
  errors: Array<{
    partId: string;
    error: string;
  }>;
}
