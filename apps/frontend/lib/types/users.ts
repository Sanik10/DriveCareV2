// path: apps/frontend/lib/types/users.ts
export type UserStatus = 'active' | 'inactive' | 'suspended' | 'blocked' | string;

export interface RoleInfo {
  id: string;
  name: string; // slug роли (с бэка приходит name)
}

export interface UserResponse {
  id: string;
  email?: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  role?: RoleInfo | null;
  status?: UserStatus; // нормализуем из isActive

  // Доп. поля для карточки сотрудника
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string | null;
  specialization?: string | null;
}

export interface UsersQuery {
  search?: string;
  role?: string;
  page?: number;
  limit?: number;
  status?: 'active' | 'inactive' | 'suspended' | 'blocked'; // для удобства, маппим в isActive
}

export interface PaginatedUsersResponse {
  items: UserResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext?: boolean;
  hasPrev?: boolean;
}

/* Совместимость с существующими импортами */
export type Role = RoleInfo;
export type User = UserResponse;
