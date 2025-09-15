// path: apps/frontend/lib/types/users.ts
export type UserStatus = 'active' | 'inactive' | 'blocked' | string;

export interface RoleInfo {
  id: string;
  name: string;
}

export interface UserResponse {
  id: string;
  email?: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  role?: RoleInfo | null;
  status?: UserStatus;
}

export interface UsersQuery {
  search?: string;
  role?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedUsersResponse {
  items: UserResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
