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

  // ====== INVENTORY PARTS ====== (ДОБАВИТЬ)
  PART_CREATED = 'PART_CREATED',
  PART_UPDATED = 'PART_UPDATED', 
  PART_DELETED = 'PART_DELETED',
  PART_PRICE_CHANGED = 'PART_PRICE_CHANGED',
  PART_STATUS_CHANGED = 'PART_STATUS_CHANGED',
  PART_BULK_UPDATED = 'PART_BULK_UPDATED',
  PART_VIEWED = 'PART_VIEWED',
  PARTS_SEARCHED = 'PARTS_SEARCHED',
  PARTS_BULK_UPDATED = 'PARTS_BULK_UPDATED',

  // ====== INVENTORY ======
  INVENTORY_UPDATED = 'INVENTORY_UPDATED',
  RESERVATION_CREATED = 'RESERVATION_CREATED', 
  RESERVATION_RELEASED = 'RESERVATION_RELEASED',
  STOCK_RESERVED_FOR_ORDER = 'STOCK_RESERVED_FOR_ORDER',
  STOCK_RELEASED_FROM_ORDER = 'STOCK_RELEASED_FROM_ORDER',

  // ====== INVENTORY ALERTS ====== 🔥 ДОБАВЛЕНО
  INVENTORY_ALERT_CREATED = 'INVENTORY_ALERT_CREATED',
  INVENTORY_ALERT_UPDATED = 'INVENTORY_ALERT_UPDATED', 
  INVENTORY_ALERT_DISMISSED = 'INVENTORY_ALERT_DISMISSED',
  INVENTORY_ALERTS_AUTO_DISMISSED = 'INVENTORY_ALERTS_AUTO_DISMISSED',
  INVENTORY_ALERTS_CLEANUP = 'INVENTORY_ALERTS_CLEANUP',
  INVENTORY_ALERT_SETTINGS_UPDATED = 'INVENTORY_ALERT_SETTINGS_UPDATED',
  INVENTORY_ALERT_TEST_NOTIFICATION = 'INVENTORY_ALERT_TEST_NOTIFICATION',

  // ====== STOCK MOVEMENTS ======
  STOCK_MOVEMENT_CREATED = 'STOCK_MOVEMENT_CREATED',
  STOCK_MOVEMENT_UPDATED = 'STOCK_MOVEMENT_UPDATED',
  STOCK_MOVEMENT_REVERSED = 'STOCK_MOVEMENT_REVERSED',
  BULK_STOCK_MOVEMENTS_CREATED = 'BULK_STOCK_MOVEMENTS_CREATED',
  BARCODE_SCAN_MOVEMENT = 'BARCODE_SCAN_MOVEMENT',
  STOCK_ADJUSTMENT_CREATED = 'STOCK_ADJUSTMENT_CREATED',
  STOCK_RECEIPT_CREATED = 'STOCK_RECEIPT_CREATED',
  STOCK_ISSUE_CREATED = 'STOCK_ISSUE_CREATED',

  // ====== SUPPLIERS ======
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

  // ====== ORDERS ======
  ORDER_CREATED = 'ORDER_CREATED',
  ORDER_UPDATED = 'ORDER_UPDATED',
  ORDER_STATUS_CHANGED = 'ORDER_STATUS_CHANGED',
  ORDER_CANCELED = 'ORDER_CANCELED',
  ORDER_COMPLETED = 'ORDER_COMPLETED',
  ORDER_MECHANIC_ASSIGNED = 'ORDER_MECHANIC_ASSIGNED',
  ORDER_FINANCIALS_RECALCULATED = 'ORDER_FINANCIALS_RECALCULATED',
  ORDER_VIEWED = 'ORDER_VIEWED',
  ORDER_DELETED = 'ORDER_DELETED',

  // ====== ORDER SERVICES ======
  ORDER_SERVICE_ADDED = 'ORDER_SERVICE_ADDED',
  ORDER_SERVICE_UPDATED = 'ORDER_SERVICE_UPDATED',
  ORDER_SERVICE_REMOVED = 'ORDER_SERVICE_REMOVED',
  ORDER_SERVICE_STATUS_CHANGED = 'ORDER_SERVICE_STATUS_CHANGED',

  // ====== ORDER PARTS ======
  ORDER_PART_ADDED = 'ORDER_PART_ADDED',
  ORDER_PART_UPDATED = 'ORDER_PART_UPDATED',
  ORDER_PART_REMOVED = 'ORDER_PART_REMOVED',

  // ====== INVOICES ====== ✅ ДОБАВЛЕНО
  INVOICE_CREATED = 'invoice_created',
  INVOICE_UPDATED = 'invoice_updated', 
  INVOICE_STATUS_CHANGED = 'invoice_status_changed',
  INVOICE_CANCELED = 'invoice_canceled',
  INVOICE_PAID = 'invoice_paid',
  INVOICE_OVERDUE_DETECTED = 'invoice_overdue_detected',
  INVOICE_PAYMENT_RECEIVED = 'invoice_payment_received',
  INVOICE_AUTO_GENERATED_FROM_ORDER = 'invoice_auto_generated_from_order',
  INVOICE_VIEWED = 'invoice_viewed',
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

  // 🔥 НОВЫЕ: Методы для заказов
  async logOrderCreated(data: AuditLogData): Promise<void> {
    this.log(AuditAction.ORDER_CREATED, data);
  }

  async logOrderUpdated(data: AuditLogData): Promise<void> {
    this.log(AuditAction.ORDER_UPDATED, data);
  }

  async logOrderStatusChanged(data: AuditLogData): Promise<void> {
    this.log(AuditAction.ORDER_STATUS_CHANGED, data);
  }

  async logOrderCanceled(data: AuditLogData): Promise<void> {
    this.log(AuditAction.ORDER_CANCELED, { ...data, level: AuditLevel.WARNING });
  }

  async logOrderCompleted(data: AuditLogData): Promise<void> {
    this.log(AuditAction.ORDER_COMPLETED, data);
  }

  async logOrderMechanicAssigned(data: AuditLogData): Promise<void> {
    this.log(AuditAction.ORDER_MECHANIC_ASSIGNED, data);
  }

  async logOrderFinancialsRecalculated(data: AuditLogData): Promise<void> {
    this.log(AuditAction.ORDER_FINANCIALS_RECALCULATED, data);
  }

  async logOrderViewed(data: AuditLogData): Promise<void> {
    this.log(AuditAction.ORDER_VIEWED, data);
  }

  async logOrderDeleted(data: AuditLogData): Promise<void> {
    this.log(AuditAction.ORDER_DELETED, { ...data, level: AuditLevel.WARNING });
  }
}
