import { Injectable } from '@nestjs/common';

export enum AuditAction {
  // Аутентификация
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGIN_FAILED = 'USER_LOGIN_FAILED',
  USER_REGISTERED = 'USER_REGISTERED',
  USER_TOKEN_REFRESH_FAILED = 'USER_TOKEN_REFRESH_FAILED',
  USER_LOGOUT = 'USER_LOGOUT',
  USER_DEVICE_LOGOUT = 'USER_DEVICE_LOGOUT',
  USER_ALL_DEVICES_LOGOUT = 'USER_ALL_DEVICES_LOGOUT',
  USER_LOGIN_BLOCKED = 'USER_LOGIN_BLOCKED',

  // Компании
  COMPANY_CREATED = 'COMPANY_CREATED',
  COMPANY_UPDATED = 'COMPANY_UPDATED',
  COMPANY_STATUS_CHANGED = 'COMPANY_STATUS_CHANGED',
  COMPANY_DELETED = 'COMPANY_DELETED',

  // Тарифы
  TARIFF_CREATED = 'TARIFF_CREATED',
  TARIFF_UPDATED = 'TARIFF_UPDATED',
  TARIFF_STATUS_CHANGED = 'TARIFF_STATUS_CHANGED',
  TARIFF_DELETED = 'TARIFF_DELETED',

  // Подписки
  SUBSCRIPTION_CREATED = 'SUBSCRIPTION_CREATED',
  SUBSCRIPTION_UPDATED = 'SUBSCRIPTION_UPDATED',
  SUBSCRIPTION_CANCELED = 'SUBSCRIPTION_CANCELED',
  SUBSCRIPTION_EXPIRED = 'SUBSCRIPTION_EXPIRED',
  SUBSCRIPTION_RENEWED = 'SUBSCRIPTION_RENEWED',

  // Клиенты
  CUSTOMER_CREATED = 'CUSTOMER_CREATED',
  CUSTOMER_UPDATED = 'CUSTOMER_UPDATED',
  CUSTOMER_STATUS_CHANGED = 'CUSTOMER_STATUS_CHANGED',
  CUSTOMER_DELETED = 'CUSTOMER_DELETED',
  CUSTOMER_VIEWED = 'CUSTOMER_VIEWED',

  // 🔥 ДОБАВЛЕНО: Автомобили
  VEHICLE_CREATED = 'VEHICLE_CREATED',
  VEHICLE_UPDATED = 'VEHICLE_UPDATED',
  VEHICLE_STATUS_CHANGED = 'VEHICLE_STATUS_CHANGED',
  VEHICLE_DELETED = 'VEHICLE_DELETED',
  VEHICLE_VIEWED = 'VEHICLE_VIEWED',
  VEHICLE_SERVICE_COMPLETED = 'VEHICLE_SERVICE_COMPLETED',
  VEHICLE_TRANSFERRED = 'VEHICLE_TRANSFERRED',
  VEHICLE_MILEAGE_UPDATED = 'VEHICLE_MILEAGE_UPDATED',

  // Лимиты
  LIMIT_CHECK_FAILED = 'LIMIT_CHECK_FAILED',
  LIMIT_EXCEEDED = 'LIMIT_EXCEEDED',
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
  [key: string]: any;
}

@Injectable()
export class AuditService {
  async log(action: AuditAction, data: AuditLogData): Promise<void> {
    const logEntry = {
      timestamp: new Date().toISOString(),
      action,
      level: data.level || AuditLevel.INFO,
      ...data,
    };

    console.log(`[AUDIT] ${action}:`, JSON.stringify(logEntry, null, 2));
  }

  // Методы для аутентификации (существующие)
  async logLogin(data: any): Promise<void> {
    this.log(AuditAction.USER_LOGIN, data);
  }

  async logLoginFailed(data: any): Promise<void> {
    this.log(AuditAction.USER_LOGIN_FAILED, { ...data, level: data.level || AuditLevel.WARNING });
  }

  async logRegistration(data: any): Promise<void> {
    this.log(AuditAction.USER_REGISTERED, data);
  }

  async logTokenRefresh(data: any): Promise<void> {
    this.log(AuditAction.USER_LOGIN, { ...data, type: 'refresh' });
  }

  async logTokenRefreshFailed(data: any): Promise<void> {
    this.log(AuditAction.USER_TOKEN_REFRESH_FAILED, { ...data, level: data.level || AuditLevel.WARNING });
  }

  async logLogout(data: any): Promise<void> {
    this.log(AuditAction.USER_LOGOUT, data);
  }

  async logDeviceLogout(data: any): Promise<void> {
    this.log(AuditAction.USER_DEVICE_LOGOUT, data);
  }

  async logAllDevicesLogout(data: any): Promise<void> {
    this.log(AuditAction.USER_ALL_DEVICES_LOGOUT, data);
  }

  // Методы для компаний (существующие)
  async logCompanyCreated(data: AuditLogData): Promise<void> {
    this.log(AuditAction.COMPANY_CREATED, data);
  }

  async logCompanyUpdated(data: AuditLogData): Promise<void> {
    this.log(AuditAction.COMPANY_UPDATED, data);
  }

  async logCompanyStatusChanged(data: AuditLogData): Promise<void> {
    this.log(AuditAction.COMPANY_STATUS_CHANGED, data);
  }

  async logCompanyDeleted(data: AuditLogData): Promise<void> {
    this.log(AuditAction.COMPANY_DELETED, { ...data, level: AuditLevel.WARNING });
  }

  // Методы для тарифов (существующие)
  async logTariffCreated(data: AuditLogData): Promise<void> {
    this.log(AuditAction.TARIFF_CREATED, data);
  }

  async logTariffUpdated(data: AuditLogData): Promise<void> {
    this.log(AuditAction.TARIFF_UPDATED, data);
  }

  async logTariffStatusChanged(data: AuditLogData): Promise<void> {
    this.log(AuditAction.TARIFF_STATUS_CHANGED, data);
  }

  async logTariffDeleted(data: AuditLogData): Promise<void> {
    this.log(AuditAction.TARIFF_DELETED, { ...data, level: AuditLevel.WARNING });
  }

  // Методы для подписок (существующие)
  async logSubscriptionCreated(data: AuditLogData): Promise<void> {
    this.log(AuditAction.SUBSCRIPTION_CREATED, data);
  }

  async logSubscriptionUpdated(data: AuditLogData): Promise<void> {
    this.log(AuditAction.SUBSCRIPTION_UPDATED, data);
  }

  async logSubscriptionCanceled(data: AuditLogData): Promise<void> {
    this.log(AuditAction.SUBSCRIPTION_CANCELED, { ...data, level: AuditLevel.WARNING });
  }

  async logSubscriptionExpired(data: AuditLogData): Promise<void> {
    this.log(AuditAction.SUBSCRIPTION_EXPIRED, { ...data, level: AuditLevel.WARNING });
  }

  async logSubscriptionRenewed(data: AuditLogData): Promise<void> {
    this.log(AuditAction.SUBSCRIPTION_RENEWED, data);
  }

  // Методы для клиентов (существующие)
  async logCustomerCreated(data: AuditLogData): Promise<void> {
    this.log(AuditAction.CUSTOMER_CREATED, data);
  }

  async logCustomerUpdated(data: AuditLogData): Promise<void> {
    this.log(AuditAction.CUSTOMER_UPDATED, data);
  }

  async logCustomerStatusChanged(data: AuditLogData): Promise<void> {
    this.log(AuditAction.CUSTOMER_STATUS_CHANGED, data);
  }

  async logCustomerDeleted(data: AuditLogData): Promise<void> {
    this.log(AuditAction.CUSTOMER_DELETED, { ...data, level: AuditLevel.WARNING });
  }

  async logCustomerViewed(data: AuditLogData): Promise<void> {
    this.log(AuditAction.CUSTOMER_VIEWED, data);
  }

  // 🔥 НОВЫЕ: Методы для автомобилей
  async logVehicleCreated(data: AuditLogData): Promise<void> {
    this.log(AuditAction.VEHICLE_CREATED, data);
  }

  async logVehicleUpdated(data: AuditLogData): Promise<void> {
    this.log(AuditAction.VEHICLE_UPDATED, data);
  }

  async logVehicleStatusChanged(data: AuditLogData): Promise<void> {
    this.log(AuditAction.VEHICLE_STATUS_CHANGED, data);
  }

  async logVehicleDeleted(data: AuditLogData): Promise<void> {
    this.log(AuditAction.VEHICLE_DELETED, { ...data, level: AuditLevel.WARNING });
  }

  async logVehicleViewed(data: AuditLogData): Promise<void> {
    this.log(AuditAction.VEHICLE_VIEWED, data);
  }

  async logVehicleServiceCompleted(data: AuditLogData): Promise<void> {
    this.log(AuditAction.VEHICLE_SERVICE_COMPLETED, data);
  }

  async logVehicleTransferred(data: AuditLogData): Promise<void> {
    this.log(AuditAction.VEHICLE_TRANSFERRED, data);
  }

  async logVehicleMileageUpdated(data: AuditLogData): Promise<void> {
    this.log(AuditAction.VEHICLE_MILEAGE_UPDATED, data);
  }

  // Методы для лимитов (существующие)
  async logLimitCheckFailed(data: AuditLogData): Promise<void> {
    this.log(AuditAction.LIMIT_CHECK_FAILED, { ...data, level: AuditLevel.ERROR });
  }

  async logLimitExceeded(data: AuditLogData): Promise<void> {
    this.log(AuditAction.LIMIT_EXCEEDED, { ...data, level: AuditLevel.WARNING });
  }
}
