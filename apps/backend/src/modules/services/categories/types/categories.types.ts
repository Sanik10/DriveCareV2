import { RequestWithUser } from '../../../auth/interfaces/request-with-user.interface';

export interface CategoriesFilter {
  companyId?: string;
  includeGlobal?: boolean; // Включать ли глобальные категории
  search?: string;
  sortBy?: 'name' | 'createdAt' | 'updatedAt';
  sortOrder?: 'ASC' | 'DESC';
  page?: number;
  limit?: number;
  offset?: number;
}

export interface CategoryWithServicesCount {
  id: string;
  companyId: string | null;
  name: string;
  description?: string;
  isGlobal: boolean;
  servicesCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryStats {
  total: number;
  global: number;
  company: number;
  withServices: number;
  withoutServices: number;
  mostUsed: {
    categoryId: string;
    categoryName: string;
    servicesCount: number;
  }[];
}

export type UserWithCompany = RequestWithUser['user'];
