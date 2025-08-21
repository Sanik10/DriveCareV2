export type CompanyStatus = 'active' | 'inactive';
export type SortOrder = 'asc' | 'desc';
export type CompanySortField = 'name' | 'createdAt' | 'email' | 'legalName';

// ✅ ЧИСТОЕ РЕШЕНИЕ: Правильная типизация WorkingHours
export interface WorkingHours {
  monday: {
    open: string;
    close: string;
    isOpen: boolean;
  };
  tuesday: {
    open: string;
    close: string;
    isOpen: boolean;
  };
  wednesday: {
    open: string;
    close: string;
    isOpen: boolean;
  };
  thursday: {
    open: string;
    close: string;
    isOpen: boolean;
  };
  friday: {
    open: string;
    close: string;
    isOpen: boolean;
  };
  saturday: {
    open: string;
    close: string;
    isOpen: boolean;
  };
  sunday: {
    open: string;
    close: string;
    isOpen: boolean;
  };
  // ✅ ЧИСТОЕ РЕШЕНИЕ: Index signature для совместимости типов
  [day: string]: {
    open: string;
    close: string;
    isOpen: boolean;
  };
}

export interface CompanyFilter {
  search?: string;
  isActive?: boolean;
  companyId?: string;
  page?: number;
  limit?: number;
  sortField?: CompanySortField;
  sortOrder?: SortOrder;
}

export interface PaginatedCompaniesResult {
  items: any[];
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
