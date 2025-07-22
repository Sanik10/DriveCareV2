export type CompanyStatus = 'active' | 'inactive';
export type SortOrder = 'asc' | 'desc';
export type CompanySortField = 'name' | 'createdAt' | 'email' | 'legalName';

export interface WorkingHours {
  [day: string]: {
    open: string;
    close: string;
    isOpen: boolean;
  };
}

export interface CompanyFilter {
  search?: string;
  isActive?: boolean;
  companyId?: string; // 🔥 ДОБАВЛЕНО для фильтрации по принадлежности
  page?: number;
  limit?: number;
  sortField?: CompanySortField;
  sortOrder?: SortOrder;
}

export interface PaginatedCompaniesResult {
  items: any[]; // CompanyResponseDto[]
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CompanySubscriptionInfo {
  id: string;
  tariffName: string;
  endDate: Date;
  status: string;
}

export interface CreateCompanyData {
  name: string;
  legalName: string;
  taxNumber?: string;
  address?: string;
  phone?: string;
  email: string;
  website?: string;
  logoUrl?: string;
  workingHours?: WorkingHours;
  isActive?: boolean;
}

export interface UpdateCompanyData {
  name?: string;
  legalName?: string;
  taxNumber?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logoUrl?: string;
  workingHours?: WorkingHours;
  isActive?: boolean;
}
