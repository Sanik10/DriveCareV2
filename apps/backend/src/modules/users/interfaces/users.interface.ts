import { AuthRole, UserStatus, UserSortField, SortOrder } from '../../../modules/auth/types/auth.types';

export interface CreateUserData {
  company_id: string | null;
  email: string;
  password_hash: string;
  firstName: string;
  lastName: string;
  phone?: string;
  specialization?: string;
  roleId: string;
  isActive?: boolean;
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  specialization?: string;
  isActive?: boolean;
  roleId?: string;
}

export interface UserFilterOptions {
  companyId?: string;
  status?: UserStatus;
  role?: AuthRole;
  search?: string;
}

export interface UserSortOptions {
  field: UserSortField;
  order: SortOrder;
}

export interface UserQueryOptions {
  filter?: UserFilterOptions;
  sort?: UserSortOptions;
  page?: number;
  limit?: number;
}
