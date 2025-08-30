// path: apps/frontend/lib/api/security.ts
import type {
  SessionDevice,
  TwoFASetupResponse,
  TwoFAEnableRequest,
  TwoFADisableRequest,
  LogoutDeviceRequest,
  SecurityResponse
} from '@/lib/types/security'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'

interface ApiError {
  message: string
  statusCode?: number
}

// Глобальная защита от спама запросов
let sessionsCache: SessionDevice[] | null = null
let sessionsCacheTime = 0
let isSessionsRequestInProgress = false
let sessionsPromise: Promise<SessionDevice[]> | null = null

const CACHE_DURATION = 30 * 1000 // 30 секунд
const MIN_REQUEST_INTERVAL = 2000 // 2 секунды между запросами

class SecurityAPI {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE}${endpoint}`
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers,
      },
      credentials: 'include',
      ...options,
    })

    const responseBody = await response.text()
    
    if (!response.ok) {
      console.error(`Security API Error ${response.status}:`, responseBody)
      
      let error: ApiError
      try {
        error = JSON.parse(responseBody) as ApiError
      } catch {
        error = {
          message: responseBody || 'Неизвестная ошибка',
          statusCode: response.status
        }
      }
      
      throw new Error(JSON.stringify(error))
    }

    try {
      return JSON.parse(responseBody) as T
    } catch {
      return responseBody as T
    }
  }

  // Управление сессиями с защитой от спама
  async getSessions(forceRefresh = false): Promise<SessionDevice[]> {
    const now = Date.now()
    
    console.log('[SecurityAPI] getSessions вызван:', {
      forceRefresh,
      hasCachedData: !!sessionsCache,
      cacheAge: now - sessionsCacheTime,
      isRequestInProgress: isSessionsRequestInProgress
    })
    
    // 1) Возвращаем кэш если он свежий и не форсируем обновление
    if (!forceRefresh && sessionsCache && (now - sessionsCacheTime) < CACHE_DURATION) {
      console.log('[SecurityAPI] Возвращаем данные из кэша')
      return sessionsCache
    }
    
    // 2) Если запрос уже выполняется - ждем его
    if (isSessionsRequestInProgress && sessionsPromise) {
      console.log('[SecurityAPI] Ожидание существующего запроса')
      return sessionsPromise
    }
    
    // 3) Защита от слишком частых запросов:
    //    - если нет кэша, то выполняем запрос несмотря на интервал (чтобы не возвращать пустой список)
    //    - если кэш есть и он не очень старый, возвращаем кэш
    if (!forceRefresh && sessionsCacheTime > 0 && (now - sessionsCacheTime) < MIN_REQUEST_INTERVAL) {
      if (sessionsCache) {
        console.log('[SecurityAPI] Слишком частые запросы, возвращаем кэш')
        return sessionsCache
      }
      // Кэша нет — короткая задержка и делаем запрос, чтобы не показывать пусто
      const wait = MIN_REQUEST_INTERVAL - (now - sessionsCacheTime)
      if (wait > 0 && wait < MIN_REQUEST_INTERVAL) {
        console.log('[SecurityAPI] Слишком рано, ждем', wait, 'мс и запрашиваем')
        await new Promise((r) => setTimeout(r, wait))
      }
    }
    
    console.log('[SecurityAPI] Выполняем запрос к API')
    
    isSessionsRequestInProgress = true
    sessionsPromise = this.request<SessionDevice[]>('/auth/sessions')
    
    try {
      const sessions = await sessionsPromise
      
      // Обновляем кэш
      sessionsCache = sessions
      sessionsCacheTime = Date.now()
      
      console.log('[SecurityAPI] Данные получены и кешированы:', sessions.length, 'сессий')
      
      return sessions
    } catch (error) {
      console.error('[SecurityAPI] Ошибка получения сессий:', error)
      // Если есть кэш — лучше вернуть его, чем падать (стабильность UI)
      if (sessionsCache) {
        console.warn('[SecurityAPI] Возвращаем устаревший кэш из-за ошибки')
        return sessionsCache
      }
      throw error
    } finally {
      isSessionsRequestInProgress = false
      sessionsPromise = null
    }
  }

  // Очистка кэша (например, после логаута устройства)
  clearSessionsCache(): void {
    console.log('[SecurityAPI] Очистка кэша сессий')
    sessionsCache = null
    sessionsCacheTime = 0
  }

  async logoutDevice(data: LogoutDeviceRequest): Promise<SecurityResponse> {
    const result = await this.request<SecurityResponse>('/auth/logout-device', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    
    // Очищаем кэш после изменения сессий
    this.clearSessionsCache()
    
    return result
  }

  async logoutAllDevices(): Promise<SecurityResponse> {
    const result = await this.request<SecurityResponse>('/auth/logout-all-devices', {
      method: 'POST',
    })
    
    // Очищаем кэш после изменения сессий
    this.clearSessionsCache()
    
    return result
  }

  // 2FA Management
  async setup2FA(): Promise<TwoFASetupResponse> {
    return this.request<TwoFASetupResponse>('/auth/2fa/setup', {
      method: 'POST',
    })
  }

  async enable2FA(data: TwoFAEnableRequest): Promise<SecurityResponse> {
    return this.request<SecurityResponse>('/auth/2fa/enable', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async disable2FA(data: TwoFADisableRequest): Promise<SecurityResponse> {
    return this.request<SecurityResponse>('/auth/2fa/disable', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }
}

export const securityAPI = new SecurityAPI()
