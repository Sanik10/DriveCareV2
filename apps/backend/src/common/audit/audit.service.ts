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

  // Лимиты
  LIMIT_CHECK_FAILED = 'LIMIT_CHECK_FAILED',
  LIMIT_EXCEEDED = 'LIMIT_EXCEEDED',
}

export enum AuditLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
}

// Расширенный интерфейс с полной обратной совместимостью
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
  details?: Record<string, any>;  // Для auth модуля
  level?: AuditLevel;
  status?: string;                // Для auth модуля (error, blocked, etc.)
  userAgent?: string;
  ipAddress?: string;
  
  // Дополнительные поля для полной совместимости
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

    // Временно выводим в консоль, потом можно сохранять в БД
    console.log(`[AUDIT] ${action}:`, JSON.stringify(logEntry, null, 2));
    
    // TODO: Сохранить в audit_logs таблицу
    // await this.auditLogRepository.save(logEntry);
  }

  // Методы для аутентификации (существующие - полная совместимость)
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

  // Новые методы для компаний (типизированные)
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

  // Методы для тарифов
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

  // Методы для подписок
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

  // Методы для лимитов
  async logLimitCheckFailed(data: AuditLogData): Promise<void> {
    this.log(AuditAction.LIMIT_CHECK_FAILED, { ...data, level: AuditLevel.ERROR });
  }

  async logLimitExceeded(data: AuditLogData): Promise<void> {
    this.log(AuditAction.LIMIT_EXCEEDED, { ...data, level: AuditLevel.WARNING });
  }
}