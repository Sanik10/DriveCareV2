import { CustomerType } from '../../../database/entities/customer.entity';

export type CustomerSortField = 'firstName' | 'lastName' | 'email' | 'createdAt' | 'loyaltyPoints' | 'companyName';

export type SortOrder = 'asc' | 'desc';

export interface CustomerFilter {
  search?: string;
  type?: CustomerType;
  isActive?: boolean;
  companyId?: string;
  source?: string;
  minLoyaltyPoints?: number;
  maxLoyaltyPoints?: number;
  createdFrom?: Date;
  createdTo?: Date;
  page?: number;
  limit?: number;
  sortField?: CustomerSortField;
  sortOrder?: SortOrder;
  includeDeleted?: boolean;
}

export interface CreateCustomerData {
  companyId: string;
  type: CustomerType;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  taxNumber?: string;
  email: string;
  phone: string;
  address?: string;
  source?: string;
  loyaltyPoints?: number;
  notes?: string;
  isActive?: boolean;
}

export interface UpdateCustomerData {
  type?: CustomerType;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  taxNumber?: string;
  email?: string;
  phone?: string;
  address?: string;
  source?: string;
  loyaltyPoints?: number;
  notes?: string;
  isActive?: boolean;
}

export interface PaginatedCustomersResult {
  items: any[]; // CustomerResponseDto[] - будет типизировано после создания DTO
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface CustomerStats {
  totalActive: number;
  totalInactive: number;
  totalIndividuals: number;
  totalCompanies: number;
  newThisMonth: number;
  averageLoyaltyPoints: number;
  totalLoyaltyPoints: number;
}

export interface CustomerBasicInfo {
  id: string;
  name: string; // Форматированное имя (firstName + lastName или companyName)
  email: string;
  phone: string;
  type: CustomerType;
  companyId: string;
  isActive: boolean;
}

export interface CustomerWithVehicles extends CustomerBasicInfo {
  vehiclesCount: number;
  totalServiceHistory: number;
  lastServiceDate?: Date;
  nextServiceDate?: Date;
}
