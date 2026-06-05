// path: apps/frontend/lib/types/services.ts
export interface ServiceCategory {
  id: string
  name: string
  description?: string
  isActive?: boolean
  count?: number // Поле от эндпоинта with-services-count
  servicesCount?: number // Альтернативный вариант нейминга
}

export interface CreateCategoryRequest {
  name: string
  description?: string
}

export interface ServiceCatalogueItem {
  id: string
  categoryId: string // Обязательное поле от бэкенда
  categoryName?: string // Бэкенд может отдавать его в detailed маппинге
  name: string
  description?: string
  price: number
  durationMinutes: number
  isActive: boolean
  createdAt?: string
  updatedAt?: string
}

export interface BackendPaginatedServicesResponse {
  data: ServiceCatalogueItem[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
    hasNext: boolean
    hasPrevious: boolean
  }
}

export interface PaginatedServicesResponse {
  items: ServiceCatalogueItem[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export type ServicesSortBy = "name" | "price" | "durationMinutes" | "createdAt"
export type ServicesSortOrder = "ASC" | "DESC"

export interface ServicesQuery {
  search?: string
  categoryId?: string
  isActive?: boolean
  sortBy?: ServicesSortBy
  sortOrder?: ServicesSortOrder
  page?: number
  limit?: number
}

export interface CreateServiceRequest {
  name: string
  price: number
  durationMinutes: number
  categoryId: string
  isActive?: boolean
  description?: string
}

export interface UpdateServiceRequest {
  name?: string
  price?: number
  durationMinutes?: number
  categoryId?: string
  isActive?: boolean
  description?: string
}
