// path: apps/frontend/lib/api/security.ts
import { apiRequest } from '@/lib/api/core';
import type {
  SessionDevice,
  TwoFASetupResponse,
  TwoFAEnableRequest,
  TwoFADisableRequest,
  LogoutDeviceRequest,
  SecurityResponse,
} from '@/lib/types/security';

// Кэш и защита от частых запросов к /auth/sessions
let sessionsCache: SessionDevice[] | null = null;
let sessionsCacheTime = 0;
let isSessionsRequestInProgress = false;
let sessionsPromise: Promise<SessionDevice[]> | null = null;

const CACHE_DURATION = 30 * 1000; // 30 секунд
const MIN_REQUEST_INTERVAL = 2000; // 2 секунды между запросами

class SecurityAPI {
  private async request<T>(endpoint: string, init: Parameters<typeof apiRequest>[1] = {}): Promise<T> {
    return apiRequest<T>(endpoint, init);
  }

  // Управление сессиями с кэшем и защитой от спама
  async getSessions(forceRefresh = false): Promise<SessionDevice[]> {
    const now = Date.now();

    // 1) Свежий кэш
    if (!forceRefresh && sessionsCache && now - sessionsCacheTime < CACHE_DURATION) {
      return sessionsCache;
    }

    // 2) Уже идёт запрос — ждём его
    if (isSessionsRequestInProgress && sessionsPromise) {
      return sessionsPromise;
    }

    // 3) Интервал между запросами
    if (!forceRefresh && sessionsCacheTime > 0 && now - sessionsCacheTime < MIN_REQUEST_INTERVAL) {
      if (sessionsCache) return sessionsCache;
      const wait = MIN_REQUEST_INTERVAL - (now - sessionsCacheTime);
      if (wait > 0 && wait < MIN_REQUEST_INTERVAL) {
        await new Promise((r) => setTimeout(r, wait));
      }
    }

    isSessionsRequestInProgress = true;
    sessionsPromise = this.request<SessionDevice[]>('/auth/sessions', { method: 'GET' });

    try {
      const sessions = await sessionsPromise;

      // Обновляем кэш
      sessionsCache = sessions;
      sessionsCacheTime = Date.now();

      return sessions;
    } catch (error) {
      // Если есть кэш — возвращаем его
      if (sessionsCache) return sessionsCache;
      throw error;
    } finally {
      isSessionsRequestInProgress = false;
      sessionsPromise = null;
    }
  }

  clearSessionsCache(): void {
    sessionsCache = null;
    sessionsCacheTime = 0;
  }

  async logoutDevice(data: LogoutDeviceRequest): Promise<SecurityResponse> {
    const result = await this.request<SecurityResponse>('/auth/logout-device', {
      method: 'POST',
      json: data,
    });
    this.clearSessionsCache();
    return result;
  }

  async logoutAllDevices(): Promise<SecurityResponse> {
    const result = await this.request<SecurityResponse>('/auth/logout-all-devices', {
      method: 'POST',
    });
    this.clearSessionsCache();
    return result;
  }

  // 2FA
  async setup2FA(): Promise<TwoFASetupResponse> {
    return this.request<TwoFASetupResponse>('/auth/2fa/setup', { method: 'POST' });
  }

  async enable2FA(data: TwoFAEnableRequest): Promise<SecurityResponse> {
    return this.request<SecurityResponse>('/auth/2fa/enable', {
      method: 'POST',
      json: data,
    });
  }

  async disable2FA(data: TwoFADisableRequest): Promise<SecurityResponse> {
    return this.request<SecurityResponse>('/auth/2fa/disable', {
      method: 'POST',
      json: data,
    });
  }
}

export const securityAPI = new SecurityAPI();
