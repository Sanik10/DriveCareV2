import { Injectable } from '@nestjs/common';

export enum AuditAction {
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGIN_FAILED = 'USER_LOGIN_FAILED',
  USER_REGISTERED = 'USER_REGISTERED',
  USER_TOKEN_REFRESH_FAILED = 'USER_TOKEN_REFRESH_FAILED',
  USER_LOGOUT = 'USER_LOGOUT',
  USER_DEVICE_LOGOUT = 'USER_DEVICE_LOGOUT',
  USER_ALL_DEVICES_LOGOUT = 'USER_ALL_DEVICES_LOGOUT',
  USER_LOGIN_BLOCKED = 'USER_LOGIN_BLOCKED',
}

export enum AuditLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
}

@Injectable()
export class AuditService {
  async log(action: AuditAction, data: any): Promise<void> {
    // Временно просто выводим в консоль
    console.log(`[AUDIT] ${action}:`, data);
  }

  async logLogin(data: any): Promise<void> {
    this.log(AuditAction.USER_LOGIN, data);
  }

  async logLoginFailed(data: any): Promise<void> {
    this.log(AuditAction.USER_LOGIN_FAILED, data);
  }

  async logRegistration(data: any): Promise<void> {
    this.log(AuditAction.USER_REGISTERED, data);
  }

  async logTokenRefresh(data: any): Promise<void> {
    this.log(AuditAction.USER_LOGIN, { ...data, type: 'refresh' });
  }

  async logTokenRefreshFailed(data: any): Promise<void> {
    this.log(AuditAction.USER_TOKEN_REFRESH_FAILED, data);
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
}