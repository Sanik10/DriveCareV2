// path: apps/frontend/lib/types/customers.ts
export type CustomerStatus = 'active' | 'inactive' | 'deleted' | string;
export type CustomerType = 'individual' | 'company';

export interface CustomerResponse {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
  phone?: string | null;
  email?: string | null;
  status?: CustomerStatus;
  createdAt: string;
  updatedAt: string;
  // опциональные поля с бэка
  vehiclesCount?: number;
  displayName?: string;
}

export interface PaginatedCustomersResponse {
  items: CustomerResponse[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CustomersQuery {
  search?: string;
  status?: CustomerStatus;
  page?: number;
  limit?: number;
}

export interface CreateCustomerRequest {
  type?: CustomerType; // default: 'individual'
  firstName?: string;
  lastName?: string;
  companyName?: string;
  phone: string; // ОБЯЗАТЕЛЬНО (по бэку)
  email: string; // ОБЯЗАТЕЛЬНО (по бэку)
  // ниже — опциональные поля, есть в DTO
  address?: string;
  source?: string;
  loyaltyPoints?: number;
  notes?: string;
  isActive?: boolean;
  marketingConsent?: boolean;
  pdpConsentVersion?: string;
}

export type UpdateCustomerRequest = Partial<CreateCustomerRequest>;
