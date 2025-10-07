// path: apps/backend/src/modules/users/types/users.types.ts
import { AuthRole, UserStatus, UserSortField, SortOrder } from '../../auth/types/auth.types';

/**
 * 🔧 USERS MODULE TYPES
 * 
 * Comprehensive type definitions для enterprise users module
 */

// ✅ Data interfaces для создания и обновления
export interface CreateUserData {
  company_id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  specialization?: string;
  role_id: string;
  isActive?: boolean;
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  specialization?: string;
  isActive?: boolean;
  role_id?: string;
  email?: string;
}

// ✅ Фильтрация и поиск
export interface UserFilter {
  companyId?: string;
  search?: string;
  isActive?: boolean;
  role?: AuthRole;
  page: number;
  limit: number;
  sortField?: UserSortField;
  sortOrder?: SortOrder;
}

export interface UserQueryOptions {
  filter?: UserFilter;
  page?: number;
  limit?: number;
  includeInactive?: boolean;
  includeDeleted?: boolean;
}

// ✅ Операции и события
export type UserOperationType = 
  | 'create'
  | 'update_profile' 
  | 'update_role'
  | 'update_status'
  | 'update_password'
  | 'delete'
  | 'restore'
  | 'password_reset'
  | 'login'
  | 'logout'
  | 'export'
  | 'import'
  | 'bulk_update'
  | 'bulk_delete';

// ✅ Типы ошибок валидации
export type UserValidationError = 
  | 'email_exists'
  | 'invalid_email'
  | 'weak_password'
  | 'invalid_role'
  | 'company_mismatch'
  | 'role_hierarchy_violation'
  | 'self_deletion_attempt'
  | 'self_role_change_attempt'
  | 'xss_detected'
  | 'sql_injection_detected'
  | 'invalid_phone_format'
  | 'invalid_name_format'
  | 'specialization_too_long'
  | 'user_limit_exceeded'
  | 'inactive_role_assignment';

// ✅ Security и роли
export interface RoleHierarchy {
  [roleName: string]: number;
}

export interface UserSecurityContext {
  userId: string;
  companyId: string | null;
  role: AuthRole;
  permissions?: string[];
  sessionId?: string;
  deviceId?: string;
  ipAddress?: string;
  lastActivity?: Date;
}

// ✅ Audit и логирование
export interface AuditUserData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  specialization?: string;
  isActive: boolean;
  role: string;
  createdAt: Date;
  lastLoginAt?: Date;
}

export interface UserAuditEvent {
  operation: UserOperationType;
  userId: string;
  targetUserId?: string;
  companyId: string;
  changes?: {
    before?: Partial<AuditUserData>;
    after?: Partial<AuditUserData>;
  };
  metadata: {
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
    executionTime?: number;
    errorDetails?: string;
  };
}

// ✅ Статистика и аналитика
export interface UserStats {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  newUsersThisMonth: number;
  recentlyActiveUsers: number; // За последние 30 дней
  neverLoggedInUsers: number;
  byRole: Record<string, number>;
  byDepartment?: Record<string, number>;
}

export interface UserActivityStats {
  userId: string;
  lastLoginAt?: Date;
  totalLogins: number;
  averageSessionDuration?: number;
  mostActiveHours: number[]; // Часы дня (0-23)
  devicesUsed: number;
  ipAddressesUsed: number;
}

// ✅ Экспорт и импорт
export interface UserExportOptions {
  format: 'csv' | 'xlsx' | 'json';
  fields: UserExportField[];
  filters?: UserFilter;
  includeInactive?: boolean;
  includeAuditInfo?: boolean;
}

export type UserExportField = 
  | 'id'
  | 'email'
  | 'firstName'
  | 'lastName'
  | 'phone'
  | 'specialization'
  | 'role'
  | 'isActive'
  | 'createdAt'
  | 'lastLoginAt'
  | 'company';

export interface UserImportData {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  specialization?: string;
  roleName: string;
  isActive?: boolean;
  temporaryPassword?: string;
}

export interface UserImportResult {
  success: boolean;
  totalProcessed: number;
  successfulImports: number;
  failedImports: number;
  errors: Array<{
    row: number;
    email: string;
    error: string;
  }>;
  warnings: Array<{
    row: number;
    email: string;
    warning: string;
  }>;
}

// ✅ Bulk операции
export interface BulkUserOperation {
  operation: 'activate' | 'deactivate' | 'delete' | 'update_role' | 'export';
  userIds: string[];
  parameters?: {
    newRoleId?: string;
    reason?: string;
    notifyUsers?: boolean;
  };
}

export interface BulkOperationResult {
  success: boolean;
  totalRequested: number;
  successfulOperations: number;
  failedOperations: number;
  results: Array<{
    userId: string;
    success: boolean;
    error?: string;
  }>;
}

// ✅ Pagination и сортировка
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface SortOptions {
  field: UserSortField;
  order: SortOrder;
}

// ✅ Уведомления и события
export interface UserNotificationEvent {
  type: 'user_created' | 'user_updated' | 'user_deleted' | 'role_changed' | 'password_reset';
  userId: string;
  companyId: string;
  triggeredBy: string;
  data: Record<string, any>;
  shouldNotifyUser: boolean;
  shouldNotifyAdmins: boolean;
  emailTemplate?: string;
}

// ✅ API Response типы
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    requestId: string;
    timestamp: Date;
    executionTime: number;
  };
}

export type UserApiResponse<T = any> = ApiResponse<T>;

// ✅ Валидация и бизнес-правила
export interface UserValidationRule {
  field: keyof CreateUserData | keyof UpdateUserData;
  validator: (value: any, context?: UserSecurityContext) => boolean | Promise<boolean>;
  errorMessage: string;
  severity: 'error' | 'warning';
}

export interface UserBusinessRule {
  name: string;
  description: string;
  applies: (operation: UserOperationType, context: UserSecurityContext) => boolean;
  validate: (data: any, context: UserSecurityContext) => Promise<boolean>;
  errorMessage: string;
}

// ✅ Search и автокомплит
export interface UserSearchOptions {
  query: string;
  fields: ('firstName' | 'lastName' | 'email' | 'specialization')[];
  limit?: number;
  includeInactive?: boolean;
  companyId?: string;
  roleFilter?: AuthRole[];
}

export interface UserSearchResult {
  id: string;
  displayName: string;
  email: string;
  role: string;
  isActive: boolean;
  avatar?: string;
  highlightedFields: string[];
}

// ✅ Настройки модуля
export interface UsersModuleConfig {
  pagination: {
    defaultLimit: number;
    maxLimit: number;
  };
  security: {
    passwordRequirements: {
      minLength: number;
      requireUppercase: boolean;
      requireLowercase: boolean;
      requireNumbers: boolean;
      requireSpecialChars: boolean;
    };
    sessionTimeout: number;
    maxFailedAttempts: number;
    lockoutDuration: number;
  };
  audit: {
    enableAuditLog: boolean;
    auditSensitiveOperations: boolean;
    retentionPeriod: number;
  };
  notifications: {
    enableEmailNotifications: boolean;
    enableSmsNotifications: boolean;
    notificationTemplates: Record<string, string>;
  };
}
