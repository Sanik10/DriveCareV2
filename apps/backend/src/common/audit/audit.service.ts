// path: apps/backend/src/common/audit/audit.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { createHmac } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AuditLog } from '../../database/entities/audit-log.entity';

export enum AuditAction {
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGIN_FAILED = 'USER_LOGIN_FAILED',
  USER_REGISTERED = 'USER_REGISTERED',
  USER_TOKEN_REFRESH_FAILED = 'USER_TOKEN_REFRESH_FAILED',
  USER_LOGOUT = 'USER_LOGOUT',
  USER_DEVICE_LOGOUT = 'USER_DEVICE_LOGOUT',
  USER_ALL_DEVICES_LOGOUT = 'USER_ALL_DEVICES_LOGOUT',
  USER_LOGIN_BLOCKED = 'USER_LOGIN_BLOCKED',
  USER_CREATED = 'USER_CREATED',
  USER_CREATION_FAILED = 'USER_CREATION_FAILED',
  USER_PROFILE_UPDATED = 'USER_PROFILE_UPDATED',
  USER_PROFILE_UPDATE_FAILED = 'USER_PROFILE_UPDATE_FAILED',
  USER_ROLE_CHANGED = 'USER_ROLE_CHANGED',
  USER_ROLE_CHANGE_FAILED = 'USER_ROLE_CHANGE_FAILED',
  USER_STATUS_CHANGED = 'USER_STATUS_CHANGED',
  USER_STATUS_CHANGE_FAILED = 'USER_STATUS_CHANGE_FAILED',
  USER_PASSWORD_RESET_BY_ADMIN = 'USER_PASSWORD_RESET_BY_ADMIN',
  USER_PASSWORD_RESET_FAILED = 'USER_PASSWORD_RESET_FAILED',
  USER_SOFT_DELETED = 'USER_SOFT_DELETED',
  USER_DELETION_FAILED = 'USER_DELETION_FAILED',
  USER_SELF_DEACTIVATED = 'USER_SELF_DEACTIVATED',
  USER_DATA_EXPORTED = 'USER_DATA_EXPORTED',
  USER_CONSENT_REVOKED = 'USER_CONSENT_REVOKED',

  ACCESS_DENIED = 'ACCESS_DENIED',
  PERMISSION_GRANTED = 'PERMISSION_GRANTED',
  API_ERROR = 'API_ERROR',
  SECURITY_VIOLATION = 'SECURITY_VIOLATION',
  UNAUTHORIZED_ACCESS_ATTEMPT = 'UNAUTHORIZED_ACCESS_ATTEMPT',

  // Generic API lifecycle
  API_REQUEST_STARTED = 'API_REQUEST_STARTED',
  API_REQUEST_COMPLETED = 'API_REQUEST_COMPLETED',

  HEALTH_CHECK_REQUESTED = 'HEALTH_CHECK_REQUESTED',
  SUPERADMIN_INFO_BLOCKED_PRODUCTION = 'SUPERADMIN_INFO_BLOCKED_PRODUCTION',
  SUPERADMIN_INFO_ACCESSED = 'SUPERADMIN_INFO_ACCESSED',
  SUPERADMIN_INFO_ERROR = 'SUPERADMIN_INFO_ERROR',

  SEEDS_BLOCKED_IN_PRODUCTION = 'SEEDS_BLOCKED_IN_PRODUCTION',
  SEEDS_COMPLETED = 'SEEDS_COMPLETED',
  SEEDS_FAILED = 'SEEDS_FAILED',
  SUPERADMIN_ROLE_CREATED = 'SUPERADMIN_ROLE_CREATED',
  SUPERADMIN_CREATION_FAILED = 'SUPERADMIN_CREATION_FAILED',
  SUPERADMIN_USER_CREATED = 'SUPERADMIN_USER_CREATED',
  SUPERADMIN_EXISTENCE_CHECK = 'SUPERADMIN_EXISTENCE_CHECK',

  COMPANY_CREATED = 'COMPANY_CREATED',
  COMPANY_UPDATED = 'COMPANY_UPDATED',
  COMPANY_STATUS_CHANGED = 'COMPANY_STATUS_CHANGED',
  COMPANY_DELETED = 'COMPANY_DELETED',

  TARIFF_CREATED = 'TARIFF_CREATED',
  TARIFF_UPDATED = 'TARIFF_UPDATED',
  TARIFF_STATUS_CHANGED = 'TARIFF_STATUS_CHANGED',
  TARIFF_DELETED = 'TARIFF_DELETED',
  TARIFF_VIEWED = 'TARIFF_VIEWED',
  TARIFFS_LISTED = 'TARIFFS_LISTED',
  TARIFFS_COMPARED = 'TARIFFS_COMPARED',
  TARIFFS_POPULAR_VIEWED = 'TARIFFS_POPULAR_VIEWED',
  TARIFF_STATS_VIEWED = 'TARIFF_STATS_VIEWED',
  TARIFF_SELECT_OPTIONS_VIEWED = 'TARIFF_SELECT_OPTIONS_VIEWED',

  SUBSCRIPTION_CREATED = 'SUBSCRIPTION_CREATED',
  SUBSCRIPTION_UPDATED = 'SUBSCRIPTION_UPDATED',
  SUBSCRIPTION_CANCELED = 'SUBSCRIPTION_CANCELED',
  SUBSCRIPTION_EXPIRED = 'SUBSCRIPTION_EXPIRED',
  SUBSCRIPTION_RENEWED = 'SUBSCRIPTION_RENEWED',

  CUSTOMER_CREATED = 'CUSTOMER_CREATED',
  CUSTOMER_UPDATED = 'CUSTOMER_UPDATED',
  CUSTOMER_STATUS_CHANGED = 'CUSTOMER_STATUS_CHANGED',
  CUSTOMER_DELETED = 'CUSTOMER_DELETED',
  CUSTOMER_VIEWED = 'CUSTOMER_VIEWED',
  CUSTOMER_DATA_EXPORTED = 'CUSTOMER_DATA_EXPORTED',
  CUSTOMER_CONSENT_REVOKED = 'CUSTOMER_CONSENT_REVOKED',
  CUSTOMER_ANONYMIZED = 'CUSTOMER_ANONYMIZED',

  VEHICLE_CREATED = 'VEHICLE_CREATED',
  VEHICLE_UPDATED = 'VEHICLE_UPDATED',
  VEHICLE_STATUS_CHANGED = 'VEHICLE_STATUS_CHANGED',
  VEHICLE_DELETED = 'VEHICLE_DELETED',
  VEHICLE_VIEWED = 'VEHICLE_VIEWED',
  VEHICLE_SERVICE_COMPLETED = 'VEHICLE_SERVICE_COMPLETED',
  VEHICLE_TRANSFERRED = 'VEHICLE_TRANSFERRED',
  VEHICLE_MILEAGE_UPDATED = 'VEHICLE_MILEAGE_UPDATED',
  VEHICLES_LISTED = 'VEHICLES_LISTED',

  LIMIT_CHECK_FAILED = 'LIMIT_CHECK_FAILED',
  LIMIT_EXCEEDED = 'LIMIT_EXCEEDED',

  PART_CREATED = 'PART_CREATED',
  PART_UPDATED = 'PART_UPDATED',
  PART_DELETED = 'PART_DELETED',
  PART_PRICE_CHANGED = 'PART_PRICE_CHANGED',
  PART_STATUS_CHANGED = 'PART_STATUS_CHANGED',
  PART_BULK_UPDATED = 'PART_BULK_UPDATED',
  PART_VIEWED = 'PART_VIEWED',
  PARTS_SEARCHED = 'PARTS_SEARCHED',
  PARTS_BULK_UPDATED = 'PARTS_BULK_UPDATED',

  INVENTORY_UPDATED = 'INVENTORY_UPDATED',
  RESERVATION_CREATED = 'RESERVATION_CREATED',
  RESERVATION_RELEASED = 'RESERVATION_RELEASED',
  STOCK_RESERVED_FOR_ORDER = 'STOCK_RESERVED_FOR_ORDER',
  STOCK_RELEASED_FROM_ORDER = 'STOCK_RELEASED_FROM_ORDER',

  INVENTORY_ALERT_CREATED = 'INVENTORY_ALERT_CREATED',
  INVENTORY_ALERT_UPDATED = 'INVENTORY_ALERT_UPDATED',
  INVENTORY_ALERT_DISMISSED = 'INVENTORY_ALERT_DISMISSED',
  INVENTORY_ALERTS_AUTO_DISMISSED = 'INVENTORY_ALERTS_AUTO_DISMISSED',
  INVENTORY_ALERTS_CLEANUP = 'INVENTORY_ALERTS_CLEANUP',
  INVENTORY_ALERT_SETTINGS_UPDATED = 'INVENTORY_ALERT_SETTINGS_UPDATED',
  INVENTORY_ALERT_TEST_NOTIFICATION = 'INVENTORY_ALERT_TEST_NOTIFICATION',

  STOCK_MOVEMENT_CREATED = 'STOCK_MOVEMENT_CREATED',
  STOCK_MOVEMENT_UPDATED = 'STOCK_MOVEMENT_UPDATED',
  STOCK_MOVEMENT_REVERSED = 'STOCK_MOVEMENT_REVERSED',
  BULK_STOCK_MOVEMENTS_CREATED = 'BULK_STOCK_MOVEMENTS_CREATED',
  BARCODE_SCAN_MOVEMENT = 'BARCODE_SCAN_MOVEMENT',
  STOCK_ADJUSTMENT_CREATED = 'STOCK_ADJUSTMENT_CREATED',
  STOCK_RECEIPT_CREATED = 'STOCK_RECEIPT_CREATED',
  STOCK_ISSUE_CREATED = 'STOCK_ISSUE_CREATED',

  SUPPLIER_CREATED = 'SUPPLIER_CREATED',
  SUPPLIER_UPDATED = 'SUPPLIER_UPDATED',
  SUPPLIER_DEACTIVATED = 'SUPPLIER_DEACTIVATED',
  SUPPLIER_ACTIVATED = 'SUPPLIER_ACTIVATED',
  SUPPLIER_CONTACT_UPDATED = 'SUPPLIER_CONTACT_UPDATED',
  SUPPLIER_ADDRESS_UPDATED = 'SUPPLIER_ADDRESS_UPDATED',
  SUPPLIER_RATED = 'SUPPLIER_RATED',
  SUPPLIER_PRICE_COMPARISON = 'SUPPLIER_PRICE_COMPARISON',
  SUPPLIER_ANALYTICS_VIEWED = 'SUPPLIER_ANALYTICS_VIEWED',
  SUPPLIERS_BULK_OPERATION = 'SUPPLIERS_BULK_OPERATION',
  BEST_SUPPLIER_SEARCH = 'BEST_SUPPLIER_SEARCH',
  TOP_SUPPLIERS_VIEWED = 'TOP_SUPPLIERS_VIEWED',

  ORDER_CREATED = 'ORDER_CREATED',
  ORDER_UPDATED = 'ORDER_UPDATED',
  ORDER_STATUS_CHANGED = 'ORDER_STATUS_CHANGED',
  ORDER_CANCELED = 'ORDER_CANCELED',
  ORDER_COMPLETED = 'ORDER_COMPLETED',
  ORDER_MECHANIC_ASSIGNED = 'ORDER_MECHANIC_ASSIGNED',
  ORDER_FINANCIALS_RECALCULATED = 'ORDER_FINANCIALS_RECALCULATED',
  ORDER_VIEWED = 'ORDER_VIEWED',
  ORDER_DELETED = 'ORDER_DELETED',

  ORDER_SERVICE_ADDED = 'ORDER_SERVICE_ADDED',
  ORDER_SERVICE_UPDATED = 'ORDER_SERVICE_UPDATED',
  ORDER_SERVICE_REMOVED = 'ORDER_SERVICE_REMOVED',
  ORDER_SERVICE_STATUS_CHANGED = 'ORDER_SERVICE_STATUS_CHANGED',

  ORDER_PART_ADDED = 'ORDER_PART_ADDED',
  ORDER_PART_UPDATED = 'ORDER_PART_UPDATED',
  ORDER_PART_REMOVED = 'ORDER_PART_REMOVED',

  INVOICE_CREATED = 'INVOICE_CREATED',
  INVOICE_UPDATED = 'INVOICE_UPDATED',
  INVOICE_STATUS_CHANGED = 'INVOICE_STATUS_CHANGED',
  INVOICE_CANCELED = 'INVOICE_CANCELED',
  INVOICE_PAID = 'INVOICE_PAID',
  INVOICE_OVERDUE_DETECTED = 'INVOICE_OVERDUE_DETECTED',
  INVOICE_PAYMENT_RECEIVED = 'INVOICE_PAYMENT_RECEIVED',
  INVOICE_AUTO_GENERATED_FROM_ORDER = 'INVOICE_AUTO_GENERATED_FROM_ORDER',
  INVOICE_VIEWED = 'INVOICE_VIEWED',

  PAYMENT_CREATED = 'PAYMENT_CREATED',
  PAYMENT_UPDATED = 'PAYMENT_UPDATED',
  PAYMENT_STATUS_CHANGED = 'PAYMENT_STATUS_CHANGED',
  PAYMENT_PROCESSED = 'PAYMENT_PROCESSED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PAYMENT_CANCELED = 'PAYMENT_CANCELED',
  PAYMENT_REFUNDED = 'PAYMENT_REFUNDED',
  PAYMENT_PARTIALLY_REFUNDED = 'PAYMENT_PARTIALLY_REFUNDED',
  PAYMENT_DISPUTED = 'PAYMENT_DISPUTED',
  PAYMENT_EXPIRED = 'PAYMENT_EXPIRED',
  PAYMENT_VIEWED = 'PAYMENT_VIEWED',
  PAYMENT_DELETED = 'PAYMENT_DELETED',
  PAYMENT_BALANCE_CALCULATED = 'PAYMENT_BALANCE_CALCULATED',
  PAYMENT_STATISTICS_GENERATED = 'PAYMENT_STATISTICS_GENERATED',
  PAYMENT_OVERDUE_PROCESSED = 'PAYMENT_OVERDUE_PROCESSED',

  APPOINTMENT_CREATED = 'APPOINTMENT_CREATED',
  APPOINTMENT_UPDATED = 'APPOINTMENT_UPDATED',
  APPOINTMENT_STATUS_CHANGED = 'APPOINTMENT_STATUS_CHANGED',
  APPOINTMENT_CONFIRMED = 'APPOINTMENT_CONFIRMED',
  APPOINTMENT_COMPLETED = 'APPOINTMENT_COMPLETED',
  APPOINTMENT_CANCELED = 'APPOINTMENT_CANCELED',
  APPOINTMENT_RESCHEDULED = 'APPOINTMENT_RESCHEDULED',
  APPOINTMENT_DELETED = 'APPOINTMENT_DELETED',
  APPOINTMENT_VIEWED = 'APPOINTMENT_VIEWED',
  APPOINTMENTS_LISTED = 'APPOINTMENTS_LISTED',
  APPOINTMENT_RATED = 'APPOINTMENT_RATED',
  APPOINTMENT_CHECK_AVAILABILITY = 'APPOINTMENT_CHECK_AVAILABILITY',

  WORK_SCHEDULE_CREATED = 'WORK_SCHEDULE_CREATED',
  WORK_SCHEDULE_UPDATED = 'WORK_SCHEDULE_UPDATED',
  WORK_SCHEDULE_DELETED = 'WORK_SCHEDULE_DELETED',
  WORK_SCHEDULE_VIEWED = 'WORK_SCHEDULE_VIEWED',
  WORK_SCHEDULES_LISTED = 'WORK_SCHEDULES_LISTED',

  SCHEDULE_EXCEPTION_CREATED = 'SCHEDULE_EXCEPTION_CREATED',
  SCHEDULE_EXCEPTION_STATUS_CHANGED = 'SCHEDULE_EXCEPTION_STATUS_CHANGED',
  SCHEDULE_EXCEPTION_DELETED = 'SCHEDULE_EXCEPTION_DELETED',

  // ====== VEHICLES CATALOGUE ======
  CATALOGUE_BRAND_CREATED = 'CATALOGUE_BRAND_CREATED',
  CATALOGUE_BRAND_UPDATED = 'CATALOGUE_BRAND_UPDATED',
  CATALOGUE_BRAND_DELETED = 'CATALOGUE_BRAND_DELETED',
  CATALOGUE_BRAND_VIEWED = 'CATALOGUE_BRAND_VIEWED',
  CATALOGUE_BRANDS_LISTED = 'CATALOGUE_BRANDS_LISTED',

  CATALOGUE_MODEL_CREATED = 'CATALOGUE_MODEL_CREATED',
  CATALOGUE_MODEL_UPDATED = 'CATALOGUE_MODEL_UPDATED',
  CATALOGUE_MODEL_DELETED = 'CATALOGUE_MODEL_DELETED',
  CATALOGUE_MODEL_VIEWED = 'CATALOGUE_MODEL_VIEWED',
  CATALOGUE_MODELS_LISTED = 'CATALOGUE_MODELS_LISTED',

  CATALOGUE_TYPE_CREATED = 'CATALOGUE_TYPE_CREATED',
  CATALOGUE_TYPE_UPDATED = 'CATALOGUE_TYPE_UPDATED',
  CATALOGUE_TYPE_DELETED = 'CATALOGUE_TYPE_DELETED',
  CATALOGUE_TYPE_VIEWED = 'CATALOGUE_TYPE_VIEWED',
  CATALOGUE_TYPES_LISTED = 'CATALOGUE_TYPES_LISTED',

  // ====== SERVICE HISTORY ======
  SERVICE_HISTORY_CREATED = 'SERVICE_HISTORY_CREATED',
  SERVICE_HISTORY_UPDATED = 'SERVICE_HISTORY_UPDATED',
  SERVICE_HISTORY_DEACTIVATED = 'SERVICE_HISTORY_DEACTIVATED',
  SERVICE_HISTORY_DELETED = 'SERVICE_HISTORY_DELETED',
  SERVICE_HISTORY_VIEWED = 'SERVICE_HISTORY_VIEWED',
  SERVICE_HISTORY_LISTED = 'SERVICE_HISTORY_LISTED',
  SERVICE_HISTORY_STATS_VIEWED = 'SERVICE_HISTORY_STATS_VIEWED',
  VEHICLE_HISTORY_VIEWED = 'VEHICLE_HISTORY_VIEWED',

  // ====== SERVICES ======
  SERVICE_CREATED = 'SERVICE_CREATED',
  SERVICE_UPDATED = 'SERVICE_UPDATED',
  SERVICE_DELETED = 'SERVICE_DELETED',
  SERVICE_STATUS_CHANGED = 'SERVICE_STATUS_CHANGED',
  SERVICES_LISTED = 'SERVICES_LISTED',
  SERVICE_VIEWED = 'SERVICE_VIEWED',
  SERVICES_SEARCHED = 'SERVICES_SEARCHED',
  SERVICE_BULK_UPDATED = 'SERVICE_BULK_UPDATED',
  SERVICE_STATS_VIEWED = 'SERVICE_STATS_VIEWED',

  // ====== SERVICE CATEGORIES ======
  SERVICE_CATEGORY_CREATED = 'SERVICE_CATEGORY_CREATED',
  SERVICE_CATEGORY_UPDATED = 'SERVICE_CATEGORY_UPDATED',
  SERVICE_CATEGORY_DELETED = 'SERVICE_CATEGORY_DELETED',
  SERVICE_CATEGORIES_LISTED = 'SERVICE_CATEGORIES_LISTED',
  SERVICE_CATEGORY_VIEWED = 'SERVICE_CATEGORY_VIEWED',
  SERVICE_CATEGORIES_SEARCHED = 'SERVICE_CATEGORIES_SEARCHED',
  SERVICE_CATEGORY_STATS_VIEWED = 'SERVICE_CATEGORY_STATS_VIEWED',
  SERVICE_CATEGORY_INITIALIZED_GLOBAL = 'SERVICE_CATEGORY_INITIALIZED_GLOBAL',
}

export enum AuditLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
}

interface AuditLogData {
  entityId?: string;
  entityType?: string;
  companyId?: string;
  userId?: string;
  deviceId?: string;
  changes?: {
    before?: any;
    after?: any;
  };
  metadata?: Record<string, any>;
  details?: Record<string, any>;
  level?: AuditLevel;
  status?: string;
  userAgent?: string;
  ipAddress?: string;
  resourceType?: string;
  resourceId?: string;
  service?: string;
  [key: string]: any;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  private readonly chainKey: string;
  private readonly isProduction: boolean;
  private readonly logToDb: boolean;

  constructor(private readonly config: ConfigService, @InjectDataSource() private readonly dataSource: DataSource) {
    this.logToDb =
      (this.config.get<boolean>('AUDIT_LOG_TO_DB') ??
        this.config.get<boolean>('security.audit.logToDb')) === true;

    this.chainKey =
      this.config.get<string>('AUDIT_CHAIN_KEY') || this.config.get<string>('security.audit.chainKey') || '';
    this.isProduction = this.config.get('NODE_ENV') === 'production';

    // В проде требуем ключ только если запись в БД включена
    if (this.isProduction && this.logToDb && !this.chainKey) {
      throw new Error('AUDIT_CHAIN_KEY is required in production when AUDIT_LOG_TO_DB=true');
    }
  }

  async log(action: AuditAction, data: AuditLogData): Promise<void> {
    // В dev/test можно отключить запись аудита в БД для снижения шума
    if (!this.logToDb) {
      return;
    }

    const repo = this.dataSource.getRepository(AuditLog);
    const nowIso = new Date().toISOString();
    const level = data.level || AuditLevel.INFO;

    const sanitized = this.sanitize({
      ...data,
      level,
      status: data.status || 'success',
    });

    const prevHash = await this.getLastHash(sanitized.companyId);

    const chainPayload = JSON.stringify({
      ts: nowIso,
      action,
      userId: sanitized.userId || null,
      companyId: sanitized.companyId || null,
      resourceId: sanitized.resourceId || null,
      resourceType: sanitized.resourceType || null,
      ipAddress: sanitized.ipAddress || null,
      userAgent: sanitized.userAgent || null,
      level,
      prev: prevHash || null,
      details: sanitized.details || null,
    });

    const chainCurr = this.hmac(chainPayload);

    const entity = repo.create({
      userId: sanitized.userId || null,
      companyId: sanitized.companyId || null,
      action,
      level,
      ipAddress: sanitized.ipAddress || null,
      userAgent: sanitized.userAgent || null,
      resourceId: sanitized.resourceId || null,
      resourceType: sanitized.resourceType || null,
      details: sanitized.details || null,
      status: sanitized.status || 'success',
      service: sanitized.service || 'backend',
      deviceId: sanitized.deviceId || null,
      chainPrev: prevHash || null,
      chainCurr,
    });

    try {
      await repo.save(entity);
    } catch (e: any) {
      this.logger.error(`Failed to persist audit log: ${e?.message || e}`);
    }
  }

  private hmac(data: string): string {
    const key = this.chainKey || 'dev-audit-chain-key';
    return createHmac('sha256', key).update(data).digest('hex');
  }

  private async getLastHash(companyId?: string): Promise<string | null> {
    const repo = this.dataSource.getRepository(AuditLog);
    const last = await repo.findOne({
      where: companyId ? { companyId } : {},
      order: { createdAt: 'DESC' },
      select: ['chainCurr'],
    });
    return last?.chainCurr || null;
  }

  private sanitize(data: AuditLogData): AuditLogData {
    const clone: AuditLogData = { ...data };
    const dropKeyPatterns = ['token', 'refreshToken', 'password', 'secret', 'cvv', 'pan', 'apiKey', 'authorization'];
    const limit = (obj?: Record<string, any>) => {
      if (!obj) return obj;
      const res: Record<string, any> = {};
      for (const [k, v] of Object.entries(obj)) {
        if (dropKeyPatterns.some((p) => k.toLowerCase().includes(p))) continue;
        if (typeof v === 'string' && v.length > 2000) res[k] = v.slice(0, 2000);
        else res[k] = v;
      }
      const size = Buffer.byteLength(JSON.stringify(res), 'utf8');
      const max = 20 * 1024;
      if (size > max) {
        const trimmed: Record<string, any> = {};
        let current = 0;
        for (const [k, v] of Object.entries(res)) {
          const chunk = Buffer.byteLength(JSON.stringify({ [k]: v }), 'utf8');
          if (current + chunk > max) break;
          trimmed[k] = v;
          current += chunk;
        }
        return trimmed;
      }
      return res;
    };
    clone.details = limit(clone.details);
    clone.metadata = limit(clone.metadata);
    return clone;
  }

  // ===== Convenience wrappers (kept for backwards compatibility across modules) =====

  // Access/security
  async logAccessDenied(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.ACCESS_DENIED, { ...data, level: data.level || AuditLevel.WARNING });
  }
  async logPermissionGranted(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.PERMISSION_GRANTED, { ...data, level: data.level || AuditLevel.INFO });
  }
  async logApiError(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.API_ERROR, { ...data, level: data.level || AuditLevel.ERROR });
  }
  async logSecurityViolation(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.SECURITY_VIOLATION, { ...data, level: AuditLevel.ERROR });
  }
  async logApiRequestStarted(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.API_REQUEST_STARTED, { ...data, level: data.level || AuditLevel.INFO });
  }
  async logApiRequestCompleted(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.API_REQUEST_COMPLETED, { ...data, level: data.level || AuditLevel.INFO });
  }

  // Auth/session
  async logLogin(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.USER_LOGIN, data);
  }
  async logLoginFailed(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.USER_LOGIN_FAILED, { ...data, level: data.level || AuditLevel.WARNING });
  }
  async logRegistration(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.USER_REGISTERED, data);
  }
  async logTokenRefresh(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.USER_LOGIN, { ...data, type: 'refresh' });
  }
  async logTokenRefreshFailed(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.USER_TOKEN_REFRESH_FAILED, { ...data, level: data.level || AuditLevel.WARNING });
  }
  async logLogout(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.USER_LOGOUT, data);
  }
  async logDeviceLogout(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.USER_DEVICE_LOGOUT, data);
  }
  async logAllDevicesLogout(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.USER_ALL_DEVICES_LOGOUT, data);
  }

  // Companies
  async logCompanyCreated(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.COMPANY_CREATED, data);
  }
  async logCompanyUpdated(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.COMPANY_UPDATED, data);
  }
  async logCompanyDeleted(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.COMPANY_DELETED, { ...data, level: data.level || AuditLevel.WARNING });
  }
  async logCompanyStatusChanged(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.COMPANY_STATUS_CHANGED, data);
  }

  // Tariffs
  async logTariffCreated(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.TARIFF_CREATED, data);
  }
  async logTariffUpdated(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.TARIFF_UPDATED, data);
  }
  async logTariffDeleted(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.TARIFF_DELETED, { ...data, level: data.level || AuditLevel.WARNING });
  }
  async logTariffStatusChanged(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.TARIFF_STATUS_CHANGED, data);
  }
  async logTariffsListed(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.TARIFFS_LISTED, data);
  }
  async logTariffViewed(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.TARIFF_VIEWED, data);
  }
  async logTariffsCompared(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.TARIFFS_COMPARED, data);
  }
  async logTariffsPopularViewed(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.TARIFFS_POPULAR_VIEWED, data);
  }
  async logTariffStatsViewed(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.TARIFF_STATS_VIEWED, data);
  }
  async logTariffSelectOptionsViewed(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.TARIFF_SELECT_OPTIONS_VIEWED, data);
  }

  // Subscriptions
  async logSubscriptionCreated(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.SUBSCRIPTION_CREATED, data);
  }
  async logSubscriptionUpdated(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.SUBSCRIPTION_UPDATED, data);
  }
  async logSubscriptionCanceled(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.SUBSCRIPTION_CANCELED, { ...data, level: data.level || AuditLevel.WARNING });
  }
  async logSubscriptionExpired(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.SUBSCRIPTION_EXPIRED, { ...data, level: data.level || AuditLevel.WARNING });
  }
  async logSubscriptionRenewed(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.SUBSCRIPTION_RENEWED, data);
  }

  // Customers
  async logCustomerCreated(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.CUSTOMER_CREATED, data);
  }
  async logCustomerUpdated(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.CUSTOMER_UPDATED, data);
  }
  async logCustomerStatusChanged(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.CUSTOMER_STATUS_CHANGED, data);
  }
  async logCustomerDeleted(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.CUSTOMER_DELETED, { ...data, level: data.level || AuditLevel.WARNING });
  }
  async logCustomerViewed(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.CUSTOMER_VIEWED, data);
  }
  async logCustomerExported(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.CUSTOMER_DATA_EXPORTED, data);
  }
  async logCustomerConsentRevoked(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.CUSTOMER_CONSENT_REVOKED, { ...data, level: data.level || AuditLevel.INFO });
  }
  async logCustomerAnonymized(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.CUSTOMER_ANONYMIZED, { ...data, level: data.level || AuditLevel.INFO });
  }

  // Vehicles
  async logVehicleCreated(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.VEHICLE_CREATED, data);
  }
  async logVehicleUpdated(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.VEHICLE_UPDATED, data);
  }
  async logVehicleStatusChanged(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.VEHICLE_STATUS_CHANGED, data);
  }
  async logVehicleMileageUpdated(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.VEHICLE_MILEAGE_UPDATED, data);
  }
  async logVehicleServiceCompleted(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.VEHICLE_SERVICE_COMPLETED, data);
  }
  async logVehicleViewed(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.VEHICLE_VIEWED, data);
  }
  async logVehicleTransferred(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.VEHICLE_TRANSFERRED, data);
  }
  async logVehiclesListed(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.VEHICLES_LISTED, data);
  }

  // Orders
  async logOrderCreated(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.ORDER_CREATED, data);
  }
  async logOrderUpdated(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.ORDER_UPDATED, data);
  }
  async logOrderCompleted(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.ORDER_COMPLETED, data);
  }
  async logOrderStatusChanged(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.ORDER_STATUS_CHANGED, data);
  }
  async logOrderMechanicAssigned(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.ORDER_MECHANIC_ASSIGNED, data);
  }
  async logOrderCanceled(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.ORDER_CANCELED, { ...data, level: data.level || AuditLevel.WARNING });
  }
  async logOrderFinancialsRecalculated(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.ORDER_FINANCIALS_RECALCULATED, data);
  }

  // Limits
  async logLimitCheckFailed(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.LIMIT_CHECK_FAILED, { ...data, level: data.level || AuditLevel.ERROR });
  }
  async logLimitExceeded(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.LIMIT_EXCEEDED, { ...data, level: data.level || AuditLevel.WARNING });
  }

  // Payments
  async logPaymentCreated(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.PAYMENT_CREATED, data);
  }
  async logPaymentUpdated(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.PAYMENT_UPDATED, data);
  }
  async logPaymentStatusChanged(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.PAYMENT_STATUS_CHANGED, data);
  }
  async logPaymentProcessed(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.PAYMENT_PROCESSED, data);
  }
  async logPaymentFailed(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.PAYMENT_FAILED, { ...data, level: data.level || AuditLevel.WARNING });
  }
  async logPaymentCanceled(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.PAYMENT_CANCELED, { ...data, level: data.level || AuditLevel.WARNING });
  }
  async logPaymentRefunded(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.PAYMENT_REFUNDED, data);
  }
  async logPaymentPartiallyRefunded(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.PAYMENT_PARTIALLY_REFUNDED, data);
  }
  async logPaymentDisputed(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.PAYMENT_DISPUTED, { ...data, level: data.level || AuditLevel.WARNING });
  }
  async logPaymentExpired(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.PAYMENT_EXPIRED, { ...data, level: data.level || AuditLevel.WARNING });
  }
  async logPaymentViewed(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.PAYMENT_VIEWED, data);
  }
  async logPaymentDeleted(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.PAYMENT_DELETED, { ...data, level: data.level || AuditLevel.WARNING });
  }
  async logPaymentBalanceCalculated(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.PAYMENT_BALANCE_CALCULATED, data);
  }
  async logPaymentStatisticsGenerated(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.PAYMENT_STATISTICS_GENERATED, data);
  }
  async logPaymentOverdueProcessed(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.PAYMENT_OVERDUE_PROCESSED, data);
  }

  // Invoices
  async logInvoiceCreated(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.INVOICE_CREATED, data);
  }
  async logInvoiceUpdated(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.INVOICE_UPDATED, data);
  }
  async logInvoiceStatusChanged(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.INVOICE_STATUS_CHANGED, data);
  }
  async logInvoiceCanceled(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.INVOICE_CANCELED, { ...data, level: data.level || AuditLevel.WARNING });
  }
  async logInvoicePaid(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.INVOICE_PAID, data);
  }
  async logInvoiceOverdueDetected(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.INVOICE_OVERDUE_DETECTED, data);
  }
  async logInvoicePaymentReceived(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.INVOICE_PAYMENT_RECEIVED, data);
  }
  async logInvoiceAutoGeneratedFromOrder(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.INVOICE_AUTO_GENERATED_FROM_ORDER, data);
  }
  async logInvoiceViewed(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.INVOICE_VIEWED, data);
  }

  // Appointments
  async logAppointmentCreated(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.APPOINTMENT_CREATED, data);
  }
  async logAppointmentUpdated(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.APPOINTMENT_UPDATED, data);
  }
  async logAppointmentStatusChanged(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.APPOINTMENT_STATUS_CHANGED, data);
  }
  async logAppointmentConfirmed(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.APPOINTMENT_CONFIRMED, data);
  }
  async logAppointmentCompleted(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.APPOINTMENT_COMPLETED, data);
  }
  async logAppointmentCanceled(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.APPOINTMENT_CANCELED, { ...data, level: data.level || AuditLevel.WARNING });
  }
  async logAppointmentRescheduled(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.APPOINTMENT_RESCHEDULED, data);
  }
  async logAppointmentDeleted(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.APPOINTMENT_DELETED, { ...data, level: data.level || AuditLevel.WARNING });
  }
  async logAppointmentViewed(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.APPOINTMENT_VIEWED, data);
  }
  async logAppointmentsListed(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.APPOINTMENTS_LISTED, data);
  }
  async logAppointmentRated(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.APPOINTMENT_RATED, data);
  }
  async logAppointmentCheckAvailability(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.APPOINTMENT_CHECK_AVAILABILITY, data);
  }

  // Work schedules
  async logWorkScheduleCreated(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.WORK_SCHEDULE_CREATED, data);
  }
  async logWorkScheduleUpdated(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.WORK_SCHEDULE_UPDATED, data);
  }
  async logWorkScheduleDeleted(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.WORK_SCHEDULE_DELETED, { ...data, level: data.level || AuditLevel.WARNING });
  }
  async logWorkScheduleViewed(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.WORK_SCHEDULE_VIEWED, data);
  }
  async logWorkSchedulesListed(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.WORK_SCHEDULES_LISTED, data);
  }

  // Schedule exceptions
  async logScheduleExceptionCreated(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.SCHEDULE_EXCEPTION_CREATED, data);
  }
  async logScheduleExceptionStatusChanged(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.SCHEDULE_EXCEPTION_STATUS_CHANGED, data);
  }
  async logScheduleExceptionDeleted(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.SCHEDULE_EXCEPTION_DELETED, { ...data, level: data.level || AuditLevel.WARNING });
  }

  // Inventory alerts
  async logInventoryAlertCreated(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.INVENTORY_ALERT_CREATED, data);
  }
  async logInventoryAlertUpdated(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.INVENTORY_ALERT_UPDATED, data);
  }
  async logInventoryAlertDismissed(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.INVENTORY_ALERT_DISMISSED, data);
  }
  async logInventoryAlertsAutoDismissed(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.INVENTORY_ALERTS_AUTO_DISMISSED, data);
  }
  async logInventoryAlertsCleanup(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.INVENTORY_ALERTS_CLEANUP, data);
  }
  async logInventoryAlertSettingsUpdated(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.INVENTORY_ALERT_SETTINGS_UPDATED, data);
  }
  async logInventoryAlertTestNotification(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.INVENTORY_ALERT_TEST_NOTIFICATION, data);
  }

  // Stock movements
  async logStockMovementCreated(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.STOCK_MOVEMENT_CREATED, data);
  }
  async logStockMovementUpdated(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.STOCK_MOVEMENT_UPDATED, data);
  }
  async logStockMovementReversed(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.STOCK_MOVEMENT_REVERSED, data);
  }
  async logBulkStockMovementsCreated(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.BULK_STOCK_MOVEMENTS_CREATED, data);
  }
  async logBarcodeScanMovement(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.BARCODE_SCAN_MOVEMENT, data);
  }
  async logStockAdjustmentCreated(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.STOCK_ADJUSTMENT_CREATED, data);
  }
  async logStockReceiptCreated(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.STOCK_RECEIPT_CREATED, data);
  }
  async logStockIssueCreated(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.STOCK_ISSUE_CREATED, data);
  }

  // Parts
  async logPartCreated(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.PART_CREATED, data);
  }
  async logPartUpdated(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.PART_UPDATED, data);
  }
  async logPartDeleted(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.PART_DELETED, data);
  }
  async logPartPriceChanged(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.PART_PRICE_CHANGED, data);
  }
  async logPartStatusChanged(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.PART_STATUS_CHANGED, data);
  }
  async logPartViewed(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.PART_VIEWED, data);
  }
  async logPartsSearched(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.PARTS_SEARCHED, data);
  }
  async logPartsBulkUpdated(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.PARTS_BULK_UPDATED, data);
  }

  // Suppliers
  async logSupplierCreated(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.SUPPLIER_CREATED, data);
  }
  async logSupplierUpdated(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.SUPPLIER_UPDATED, data);
  }
  async logSupplierDeactivated(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.SUPPLIER_DEACTIVATED, data);
  }
  async logSupplierActivated(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.SUPPLIER_ACTIVATED, data);
  }
  async logSupplierContactUpdated(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.SUPPLIER_CONTACT_UPDATED, data);
  }
  async logSupplierAddressUpdated(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.SUPPLIER_ADDRESS_UPDATED, data);
  }
  async logSupplierRated(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.SUPPLIER_RATED, data);
  }
  async logSupplierPriceComparison(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.SUPPLIER_PRICE_COMPARISON, data);
  }
  async logSupplierAnalyticsViewed(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.SUPPLIER_ANALYTICS_VIEWED, data);
  }
  async logSuppliersBulkOperation(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.SUPPLIERS_BULK_OPERATION, data);
  }
  async logBestSupplierSearch(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.BEST_SUPPLIER_SEARCH, data);
  }
  async logTopSuppliersViewed(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.TOP_SUPPLIERS_VIEWED, data);
  }

  // ===== Services =====
  async logServiceCreated(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.SERVICE_CREATED, data);
  }
  async logServiceUpdated(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.SERVICE_UPDATED, data);
  }
  async logServiceDeleted(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.SERVICE_DELETED, { ...data, level: data.level || AuditLevel.WARNING });
  }
  async logServiceStatusChanged(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.SERVICE_STATUS_CHANGED, data);
  }
  async logServicesListed(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.SERVICES_LISTED, data);
  }
  async logServiceViewed(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.SERVICE_VIEWED, data);
  }
  async logServicesSearched(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.SERVICES_SEARCHED, data);
  }
  async logServiceBulkUpdated(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.SERVICE_BULK_UPDATED, data);
  }
  async logServiceStatsViewed(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.SERVICE_STATS_VIEWED, data);
  }

  // ===== Service Categories =====
  async logServiceCategoryCreated(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.SERVICE_CATEGORY_CREATED, data);
  }
  async logServiceCategoryUpdated(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.SERVICE_CATEGORY_UPDATED, data);
  }
  async logServiceCategoryDeleted(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.SERVICE_CATEGORY_DELETED, { ...data, level: data.level || AuditLevel.WARNING });
  }
  async logServiceCategoriesListed(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.SERVICE_CATEGORIES_LISTED, data);
  }
  async logServiceCategoryViewed(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.SERVICE_CATEGORY_VIEWED, data);
  }
  async logServiceCategoriesSearched(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.SERVICE_CATEGORIES_SEARCHED, data);
  }
  async logServiceCategoryStatsViewed(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.SERVICE_CATEGORY_STATS_VIEWED, data);
  }
  async logServiceCategoryInitializedGlobal(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.SERVICE_CATEGORY_INITIALIZED_GLOBAL, data);
  }

  // ===== Service History =====
  async logServiceHistoryCreated(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.SERVICE_HISTORY_CREATED, data);
  }
  async logServiceHistoryUpdated(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.SERVICE_HISTORY_UPDATED, data);
  }
  async logServiceHistoryDeactivated(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.SERVICE_HISTORY_DEACTIVATED, data);
  }
  async logServiceHistoryDeleted(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.SERVICE_HISTORY_DELETED, { ...data, level: data.level || AuditLevel.WARNING });
  }
  async logServiceHistoryViewed(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.SERVICE_HISTORY_VIEWED, data);
  }
  async logServiceHistoriesListed(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.SERVICE_HISTORY_LISTED, data);
  }
  async logServiceHistoryStatsViewed(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.SERVICE_HISTORY_STATS_VIEWED, data);
  }
  async logVehicleHistoryViewed(data: AuditLogData): Promise<void> {
    await this.log(AuditAction.VEHICLE_HISTORY_VIEWED, data);
  }
}
