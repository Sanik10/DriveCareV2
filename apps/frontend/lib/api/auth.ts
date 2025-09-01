// path: apps/frontend/lib/api/auth.ts
import { buildApiUrl } from '@/lib/api/core';
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
  ApiError
} from '@/lib/types/auth'

interface SessionInfo {
  id: string
  deviceId: string
  deviceName?: string
  ip?: string
  userAgent?: string
  lastActivity: Date
  isActive: boolean
}

// Кеш для предотвращения дублирующихся запросов
const requestCache = new Map<string, Promise<unknown>>()
const CACHE_TIME = 1000 // 1 секунда

class AuthAPI {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = buildApiUrl(endpoint)
    const cacheKey = `${options.method || 'GET'}:${endpoint}:${options.body || ''}`
    
    // Проверка кеша запросов для GET /auth/me
    if (endpoint === '/auth/me' && (!options.method || options.method === 'GET')) {
      const cachedRequest = requestCache.get(cacheKey)
      if (cachedRequest) {
        console.log('[AuthAPI] Используем кешированный запрос для', endpoint)
        return cachedRequest as Promise<T>
      }
    }
    
    const requestPromise = this.executeRequest<T>(url, options)
    
    // Кешируем только GET запросы к /auth/me
    if (endpoint === '/auth/me') {
      requestCache.set(cacheKey, requestPromise)
      
      // Очищаем кеш через некоторое время
      setTimeout(() => {
        requestCache.delete(cacheKey)
      }, CACHE_TIME)
    }
    
    return requestPromise
  }

  private async executeRequest<T>(url: string, options: RequestInit): Promise<T> {
    console.log('[AuthAPI] Выполняю запрос:', options.method || 'GET', url)
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include', // для httpOnly cookies
      ...options,
    })

    const responseBody = await response.text()
    
    if (!response.ok) {
      console.error(`API Error ${response.status}:`, responseBody)
      
      let error: ApiError
      try {
        error = JSON.parse(responseBody) as ApiError
      } catch {
        error = {
          message: responseBody || 'Неизвестная ошибка',
          statusCode: response.status
        }
      }
      
      // Выбрасываем ошибку с JSON, чтобы фронтенд мог ее парсить
      throw new Error(JSON.stringify(error))
    }

    try {
      return JSON.parse(responseBody) as T
    } catch {
      return responseBody as T
    }
  }

  async login(data: LoginRequest): Promise<LoginResponse> {
    // ИСПРАВЛЕНО: возвращаемся к стандартному подходу без кастомных заголовков
    console.log('[AuthAPI] Стандартный логин без кастомных заголовков')
    
    const response = await this.request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data), // только email, password, twoFactorCode
    })
    
    // Сохраняем deviceId который вернул сервер
    if (response.deviceId) {
      console.log('[AuthAPI] Сохраняем deviceId от сервера:', response.deviceId)
      localStorage.setItem('deviceId', response.deviceId)
    }
    
    return response
  }

  async registerCompany(data: RegisterCompanyRequest): Promise<RegisterCompanyResponse> {
    console.log('API: Отправляем на /auth/register-company:', data)
    return this.request<RegisterCompanyResponse>('/auth/register-company', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async registerInvite(data: RegisterInviteRequest): Promise<LoginResponse> {
    return this.request<LoginResponse>('/auth/register-invite', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async refreshToken(): Promise<RefreshTokenResponse> {
    return this.request<RefreshTokenResponse>('/auth/refresh', {
      method: 'POST',
    })
  }

  async logout(): Promise<LogoutResponse> {
    return this.request<LogoutResponse>('/auth/logout', {
      method: 'POST',
    })
  }

  async logoutDevice(data: LogoutDeviceRequest): Promise<LogoutResponse> {
    return this.request<LogoutResponse>('/auth/logout-device', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async logoutAllDevices(): Promise<void> {
    return this.request<void>('/auth/logout-all-devices', {
      method: 'POST',
    })
  }

  async getProfile(): Promise<UserInfo> {
    const token = localStorage.getItem('accessToken')
    const headers: Record<string, string> = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    
    // ИСПРАВЛЕНО: API возвращает { user: {...} }, извлекаем user
    const response = await this.request<{ user: UserInfo }>('/auth/me', {
      headers,
    })
    
    console.log('[AuthAPI] Ответ getProfile:', response)
    
    // Возвращаем только пользователя
    return response.user
  }

  async getSessions(): Promise<SessionInfo[]> {
    const token = localStorage.getItem('accessToken')
    const headers: Record<string, string> = {}
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    return this.request<SessionInfo[]>('/auth/sessions', {
      headers,
    })
  }
}

export const authAPI = new AuthAPI()
