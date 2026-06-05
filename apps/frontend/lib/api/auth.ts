// path: apps/frontend/lib/api/auth.ts
import { apiRequest, notifyAuthChange } from '@/lib/api/core';
import type {
  LoginRequest,
  LoginResponse,
  RegisterCompanyRequest,
  RegisterCompanyResponse,
  RegisterInviteRequest,
  RefreshTokenResponse,
  LogoutResponse,
  LogoutDeviceRequest,
  UserInfo,
} from '@/lib/types/auth';

interface SessionInfo {
  id: string;
  deviceId: string;
  deviceName?: string;
  ip?: string;
  userAgent?: string;
  lastActivity: Date;
  isActive: boolean;
}

const requestCache = new Map<string, Promise<unknown>>();
const CACHE_TIME_MS = 1000;

class AuthAPI {
  private async request<T>(endpoint: string, init: Parameters<typeof apiRequest>[1] = {}): Promise<T> {
    return apiRequest<T>(endpoint, init);
  }

  private saveDeviceId(deviceId?: string | null) {
    try {
      if (!deviceId) return;
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('deviceId', deviceId);
      }
    } catch {}
  }

  async login(data: LoginRequest): Promise<LoginResponse> {
    const res = await this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      json: data,
    });
    this.saveDeviceId(res.deviceId);
    notifyAuthChange('login');
    return res;
  }

  async registerCompany(data: RegisterCompanyRequest): Promise<RegisterCompanyResponse> {
    return this.request<RegisterCompanyResponse>('/auth/register-company', {
      method: 'POST',
      json: data,
    });
  }

  async registerInvite(data: RegisterInviteRequest): Promise<{ message: string }> {
    const res = await this.request<any>('/auth/register-invite', {
      method: 'POST',
      json: data,
    });
    notifyAuthChange('login');
    return res;
  }

  async refreshToken(): Promise<RefreshTokenResponse> {
    return this.request<RefreshTokenResponse>('/auth/refresh', { method: 'POST' });
  }

  async logout(): Promise<LogoutResponse> {
    const res = await this.request<LogoutResponse>('/auth/logout', { method: 'POST' });
    notifyAuthChange('logout');
    try {
      if (typeof window !== 'undefined') window.sessionStorage.removeItem('deviceId');
    } catch {}
    return res;
  }

  async logoutDevice(data: LogoutDeviceRequest): Promise<LogoutResponse> {
    return this.request<LogoutResponse>('/auth/logout-device', {
      method: 'POST',
      json: data,
    });
  }

  async logoutAllDevices(): Promise<void> {
    await this.request<void>('/auth/logout-all-devices', { method: 'POST' });
    notifyAuthChange('logout');
    try {
      if (typeof window !== 'undefined') window.sessionStorage.removeItem('deviceId');
    } catch {}
  }

  async getProfile(): Promise<UserInfo> {
    const cacheKey = 'GET:/auth/me';
    const cached = requestCache.get(cacheKey);
    if (cached) return (await cached) as UserInfo;

    const p = (async () => {
      const resp = await this.request<{ user: UserInfo }>('/auth/me', { method: 'GET' });
      return resp.user;
    })();

    requestCache.set(cacheKey, p);
    setTimeout(() => requestCache.delete(cacheKey), CACHE_TIME_MS);

    return p;
  }

  async getSessions(): Promise<SessionInfo[]> {
    return this.request<SessionInfo[]>('/auth/sessions', { method: 'GET' });
  }
}

export const authAPI = new AuthAPI();
