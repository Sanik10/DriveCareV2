// path: apps/backend/src/modules/auth/decorators/roles.decorator.ts
// import { SetMetadata } from '@nestjs/common';
// import { AuthRole } from '../types/auth.types';

// export const ROLES_KEY = 'roles';
// export const Roles = (...roles: AuthRole[]) => SetMetadata(ROLES_KEY, roles);

import { SetMetadata } from '@nestjs/common';
import { AuthRole } from '../types/auth.types';

export const ROLES_KEY = 'roles';

// Алиасы legacy → канонические роли
const roleAliasMap = {
  owner: 'company_owner',
  admin: 'company_admin',
} as const;

export type RoleInput = AuthRole | keyof typeof roleAliasMap;

/**
 * Принимает как канонические роли, так и legacy-алиасы 'owner'/'admin',
 * и всегда мапит в канон для guard'ов.
 */
export const Roles = (...roles: RoleInput[]) => {
  const normalized = roles.map((r) => (roleAliasMap[r as keyof typeof roleAliasMap] || r)) as AuthRole[];
  return SetMetadata(ROLES_KEY, normalized);
};
