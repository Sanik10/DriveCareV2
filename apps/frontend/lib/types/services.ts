// path: apps/frontend/lib/types/services.ts

export interface ServiceCatalogueItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  // Бэкенд может отдавать duration или durationMinutes — поддержим оба
  durationMinutes?: number;
  duration?: number;
  taxable?: boolean;
  category?: {
    id: string;
    name: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface PaginatedServicesResponse {
  items: ServiceCatalogueItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ServicesQuery {
  search?: string;
  categoryId?: string;
  page?: number;
  limit?: number;
}

export interface CreateServiceRequest {
  name: string;
  price: number;
  // Отправляем durationMinutes; сервер может принять duration — маппится на бэке
  durationMinutes?: number;
  duration?: number;
  taxable?: boolean;
  categoryId?: string;
  description?: string;
}

export interface UpdateServiceRequest {
  name?: string;
  price?: number;
  durationMinutes?: number;
  duration?: number;
  taxable?: boolean;
  categoryId?: string;
  description?: string;
}
