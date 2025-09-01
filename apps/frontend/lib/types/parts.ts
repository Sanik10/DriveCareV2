// path: apps/frontend/lib/types/parts.ts

export interface PartCatalogueItem {
  id: string
  name: string
  partNumber?: string
  brand?: string
  description?: string
  sellingPrice: number
  category?: {
    id: string
    name: string
  }
  createdAt?: string
  updatedAt?: string
}

export interface PaginatedPartsResponse {
  items: PartCatalogueItem[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface PartsQuery {
  search?: string
  categoryId?: string
  page?: number
  limit?: number
}

export interface PartAvailability {
  partId: string
  available: number
  reserved: number
  canAddToOrder: boolean
  maxQuantity: number
}

export interface CreatePartRequest {
  name: string
  partNumber?: string
  brand?: string
  sellingPrice: number
  categoryId?: string
  description?: string
}

export interface UpdatePartRequest {
  name?: string
  partNumber?: string
  brand?: string
  sellingPrice?: number
  categoryId?: string
  description?: string
}
