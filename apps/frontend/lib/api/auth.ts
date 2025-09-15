// path: apps/frontend/lib/api/auth.ts
import { apiRequest, setAccessToken, clearAccessToken } from '@/lib/api/core';
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

// Краткоживущий кеш запросов к /auth/me, чтобы не плодить параллельные вызовы
const requestCache = new Map<string, Promise<unknown>>();
const CACHE_TIME_MS = 1000;

class AuthAPI {
  private async request<T>(endpoint: string, init: Parameters<typeof apiRequest>[1] = {}): Promise<T> {
    return apiRequest<T>(endpoint, init);
  }

  private saveDeviceId(deviceId?: string | null) {
    try {
      if (!deviceId) return;
      // Храним deviceId только в sessionStorage (эпhemeral), чтобы помечать текущее устройство в UI
      if (typeof window !== 'undefined') {
        window.sessionStorage.setItem('deviceId', deviceId);
      }
    } catch {
      // ignore
    }
  }

  async login(data: LoginRequest): Promise<LoginResponse> {
    const res = await this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      json: data,
      requireAuth: false,
    });
    // Сохраняем accessToken в in-memory (без localStorage)
    setAccessToken(res.accessToken ?? null, { source: 'login' });
    // Сохраняем deviceId эпемерно
    this.saveDeviceId(res.deviceId);
    return res;
  }

  async registerCompany(data: RegisterCompanyRequest): Promise<RegisterCompanyResponse> {
    // Backend возвращает { company, owner, message } — без токенов
    const res = await this.request<RegisterCompanyResponse>('/auth/register-company', {
      method: 'POST',
      json: data,
      requireAuth: false,
    });
    return res;
  }

  // В текущем бэкенде endpoint отключён (404). Оставляем метод для будущей поддержки.
  async registerInvite(data: RegisterInviteRequest): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/register-invite', {
      method: 'POST',
      json: data,
      requireAuth: false,
    });
  }

  async refreshToken(): Promise<RefreshTokenResponse> {
    // Обычно refresh инициируется автоматически в apiRequest при 401,
    // но метод оставляем для явных вызовов в редких случаях.
    return this.request<RefreshTokenResponse>('/auth/refresh', { method: 'POST', requireAuth: false });
  }

  async logout(): Promise<LogoutResponse> {
    const res = await this.request<LogoutResponse>('/auth/logout', { method: 'POST' });
    // Гарантированно очищаем in-memory токен
    clearAccessToken();
    try {
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem('deviceId');
      }
    } catch {
      // ignore
    }
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
    clearAccessToken();
    try {
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem('deviceId');
      }
    } catch {
      // ignore
    }
  }

  async getProfile(): Promise<UserInfo> {
    const cacheKey = 'GET:/auth/me';
    const cached = requestCache.get(cacheKey);
    if (cached) {
      return (await cached) as UserInfo;
    }

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
