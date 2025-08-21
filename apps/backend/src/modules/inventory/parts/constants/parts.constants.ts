// path: apps/backend/src/modules/inventory/parts/constants/parts.constants.ts
import { AuditAction } from '../../../../common/audit/audit.service';
import { AuthRole } from '../../../auth/types/auth.types';

export const PARTS_CONSTANTS = {
  VALIDATION: {
    MIN_NAME_LENGTH: 2,
    MAX_NAME_LENGTH: 255,
    MAX_PART_NUMBER_LENGTH: 100,
    MAX_BRAND_LENGTH: 100,
    MAX_DESCRIPTION_LENGTH: 1000,
    MAX_IMAGE_URL_LENGTH: 500,
    MIN_PRICE: 0.01,
    MAX_PRICE: 999999.99,
    PRICE_DECIMAL_PLACES: 2,
  },

  DEFAULTS: {
    PAGE_SIZE: 25,
    MAX_ITEMS: 100,
    DEFAULT_IS_ACTIVE: true,
    BULK_OPERATION_MAX_ITEMS: 50,
  },

  SEARCH: {
    MIN_SEARCH_LENGTH: 2,
    MAX_SEARCH_LENGTH: 100,
  },

  PERMISSIONS: {
    CAN_VIEW: ['superadmin', 'company_owner', 'company_admin', 'inventory_manager'] as AuthRole[],
    CAN_CREATE: ['superadmin', 'company_owner', 'company_admin', 'inventory_manager'] as AuthRole[],
    CAN_UPDATE: ['superadmin', 'company_owner', 'company_admin', 'inventory_manager'] as AuthRole[],
    CAN_DELETE: ['superadmin', 'company_owner', 'company_admin'] as AuthRole[],
    CAN_BULK_UPDATE: ['superadmin', 'company_owner', 'company_admin'] as AuthRole[],
    CAN_VIEW_COSTS: ['superadmin', 'company_owner', 'company_admin', 'inventory_manager'] as AuthRole[],
    CAN_UPDATE_PRICES: ['superadmin', 'company_owner', 'company_admin', 'inventory_manager'] as AuthRole[],
  },

  AUDIT_ACTIONS: {
    CREATE: AuditAction.PART_CREATED,
    UPDATE: AuditAction.PART_UPDATED,
    DELETE: AuditAction.PART_DELETED,
  },

  BUSINESS_RULES: {
    DUPLICATE_PART_NUMBER_ALLOWED: false,
    REQUIRE_PART_NUMBER: false,
    REQUIRE_BRAND: false,
    AUTO_GENERATE_PART_NUMBER: true,
    MIN_SELLING_PRICE_RATIO: 1.0,
    SELLING_PRICE_MARKUP_WARNING: 300,
  },

  FILES: {
    ALLOWED_IMAGE_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp'],
    MAX_IMAGE_SIZE_MB: 5,
  },
} as const;
