// path: apps/backend/src/modules/auth/types/auth.types.ts
export type AuthRole = 
  // Platform level
  | 'superadmin' 
  | 'platform_admin'
  | 'auditor'
  | 'support_engineer'
  | 'system_operator'
  // Company level  
  | 'company_owner'
  | 'company_admin'
  | 'manager'
  | 'cashier'
  | 'inventory_manager'
  | 'service_advisor'
  | 'lead_mechanic'
  | 'mechanic'
  | 'diagnostic';

export type RegistrationFlow = 'company_creation' | 'invite_acceptance';

export type SessionStatus = 'active' | 'expired' | 'revoked';

export type AuditStatus = 'success' | 'failed' | 'error' | 'blocked';

// ✅ ДОБАВЛЕНО: Типы для users модуля
export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending';

export type UserSortField = 'firstName' | 'lastName' | 'email' | 'createdAt' | 'lastLoginAt';

export type SortOrder = 'ASC' | 'DESC';
