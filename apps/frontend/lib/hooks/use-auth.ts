// path: apps/frontend/lib/hooks/use-auth.ts
import { useState, useEffect, useCallback, useRef } from 'react'
import { authAPI } from '@/lib/api/auth'
import type { UserInfo } from '@/lib/types/auth'

interface AuthState {
  user: UserInfo | null
  isLoading: boolean
  isAuthenticated: boolean
  error: string | null
}

interface ApiError {
  message: string
  statusCode?: number
}

// Глобальное состояние для всех экземпляров хука
let globalAuthState: AuthState = {
  user: null,
  isLoading: false,
  isAuthenticated: false,
  error: null
}

let authPromise: Promise<UserInfo> | null = null
let lastCheck = 0
let isInitialized = false
// Защита от частых запросов
let lastAuthRequest = 0
let isRequestInProgress = false
const MIN_REQUEST_INTERVAL = 1000
const CACHE_DURATION = 5 * 60 * 1000
const subscribers = new Set<(state: AuthState) => void>()

// НОВОЕ: флаг для отслеживания первичной проверки токена
let isInitialTokenCheckComplete = false
let initialTokenCheckPromise: Promise<boolean> | null = null

// Функция для уведомления всех подписчиков об изменении состояния
function notifySubscribers(newState: AuthState) {
  globalAuthState = newState
  subscribers.forEach(callback => callback(newState))
}

// Проверка доступности localStorage (для SSR)
function isLocalStorageAvailable(): boolean {
  try {
    return typeof window !== 'undefined' && window.localStorage !== undefined
  } catch {
    return false
  }
}

// УЛУЧШЕНО: инициализация состояния из localStorage БЕЗ установки isAuthenticated=true
function initializeAuthState(): AuthState {
  console.log('[useAuth] Инициализация состояния из localStorage')
  
  if (!isLocalStorageAvailable()) {
    console.log('[useAuth] localStorage недоступен (SSR)')
    return {
      user: null,
      isLoading: false,
      isAuthenticated: false,
      error: null
    }
  }

  try {
    const token = localStorage.getItem('accessToken')
    const userStr = localStorage.getItem('user')
    
    console.log('[useAuth] Проверка токена и пользователя:', { hasToken: !!token, hasUser: !!userStr })
    
    if (token && userStr) {
      const user = JSON.parse(userStr) as UserInfo
      
      if (user && user.id && user.email && user.firstName && user.lastName) {
        if (!user.role) {
          user.role = { id: '', name: 'user' }
        }
        
        console.log('[useAuth] Пользователь найден в localStorage, но требуется проверка токена:', user.email)
        
        // ИЗМЕНЕНО: НЕ устанавливаем isAuthenticated=true сразу!
        // Сначала нужно проверить токен на сервере
        return {
          user,
          isLoading: true, // показываем загрузку пока проверяем токен
          isAuthenticated: false, // НЕ считаем авторизованным пока не проверим
          error: null
        }
      }
    }
  } catch (error) {
    console.warn('[useAuth] Ошибка при чтении из localStorage:', error)
    if (isLocalStorageAvailable()) {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
    }
  }

  console.log('[useAuth] Инициализация: пользователь не найден')
  return {
    user: null,
    isLoading: false,
    isAuthenticated: false,
    error: null
  }
}

// НОВАЯ ФУНКЦИЯ: принудительная проверка токена при старте приложения
async function performInitialTokenCheck(): Promise<boolean> {
  if (isInitialTokenCheckComplete) {
    console.log('[useAuth] Первичная проверка токена уже завершена')
    return globalAuthState.isAuthenticated
  }

  if (initialTokenCheckPromise) {
    console.log('[useAuth] Ожидание существующей проверки токена')
    return initialTokenCheckPromise
  }

  if (!isLocalStorageAvailable()) {
    isInitialTokenCheckComplete = true
    return false
  }

  const token = localStorage.getItem('accessToken')
  if (!token) {
    console.log('[useAuth] Токен отсутствует, пропускаем проверку')
    isInitialTokenCheckComplete = true
    notifySubscribers({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      error: null
    })
    return false
  }

  console.log('[useAuth] Выполняем первичную проверку токена')

  initialTokenCheckPromise = (async () => {
    try {
      // Устанавливаем состояние загрузки
      notifySubscribers({
        ...globalAuthState,
        isLoading: true,
        error: null
      })

      const user = await authAPI.getProfile()
      
      if (!user || !user.email) {
        throw new Error('Invalid user data received')
      }
      
      if (!user.role) {
        user.role = { id: '', name: 'user' }
      }
      
      console.log('[useAuth] Первичная проверка токена успешна:', user.email)
      
      // Токен валидный - устанавливаем пользователя как авторизованного
      const newState = {
        user,
        isLoading: false,
        isAuthenticated: true,
        error: null
      }
      
      notifySubscribers(newState)
      localStorage.setItem('user', JSON.stringify(user))
      
      isInitialTokenCheckComplete = true
      return true
      
    } catch (error: unknown) {
      console.error('[useAuth] Первичная проверка токена не удалась:', error)
      
      // Очищаем невалидные данные
      if (isLocalStorageAvailable()) {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('user')
      }
      
      const newState = {
        user: null,
        isLoading: false,
        isAuthenticated: false,
        error: null
      }
      
      notifySubscribers(newState)
      
      isInitialTokenCheckComplete = true
      return false
    } finally {
      initialTokenCheckPromise = null
    }
  })()

  return initialTokenCheckPromise
}

// НОВАЯ ФУНКЦИЯ: принудительная установка пользователя (для логина)
function setUser(user: UserInfo) {
  console.log('[useAuth] Устанавливаем пользователя принудительно:', user.email)
  
  const newState = {
    user,
    isLoading: false,
    isAuthenticated: true,
    error: null
  }
  
  notifySubscribers(newState)
  lastCheck = Date.now() // обновляем кеш
  isInitialTokenCheckComplete = true // помечаем что проверка завершена
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>(() => {
    // инициализируем состояние только на клиенте
    if (typeof window !== 'undefined' && !isInitialized) {
      console.log('[useAuth] Первичная инициализация на клиенте')
      globalAuthState = initializeAuthState()
      isInitialized = true
    }
    return globalAuthState
  })
  
  const isFirstMount = useRef(true)
  const componentId = useRef(Math.random().toString(36).substr(2, 9))

  console.log(`[useAuth:${componentId.current}] Рендер:`, {
    isLoading: authState.isLoading,
    isAuthenticated: authState.isAuthenticated,
    hasUser: !!authState.user,
    userEmail: authState.user?.email,
    isFirstMount: isFirstMount.current,
    isInitialTokenCheckComplete
  })

  // Подписываемся на изменения глобального состояния
  useEffect(() => {
    const updateState = (newState: AuthState) => {
      console.log(`[useAuth:${componentId.current}] Обновление состояния:`, {
        isLoading: newState.isLoading,
        isAuthenticated: newState.isAuthenticated,
        hasUser: !!newState.user,
        userEmail: newState.user?.email
      })
      setAuthState(newState)
    }
    
    subscribers.add(updateState)
    
    return () => {
      subscribers.delete(updateState)
    }
  }, [])

  // НОВЫЙ ЭФФЕКТ: принудительная проверка токена при первом монтировании
  useEffect(() => {
    const currentComponentId = componentId.current // ИСПРАВЛЕНИЕ ESLINT WARNING

    if (isFirstMount.current && typeof window !== 'undefined') {
      isFirstMount.current = false
      
      // Если есть токен но еще не проверяли его - проверяем
      if (!isInitialTokenCheckComplete && localStorage.getItem('accessToken')) {
        console.log(`[useAuth:${currentComponentId}] Запускаем принудительную проверку токена`)
        performInitialTokenCheck().catch((error) => {
          console.error(`[useAuth:${currentComponentId}] Ошибка при принудительной проверке токена:`, error)
        })
      }
    }

    return () => {
      console.log(`[useAuth:${currentComponentId}] Cleanup эффекта проверки токена`)
    }
  }, [])

  const checkAuth = useCallback(async (forceRefresh = false): Promise<UserInfo | null> => {
    const now = Date.now()
    
    console.log(`[useAuth:${componentId.current}] checkAuth вызван:`, {
      forceRefresh,
      hasCachedUser: !!globalAuthState.user,
      isRequestInProgress,
      timeSinceLastRequest: now - lastAuthRequest,
      cacheAge: now - lastCheck
    })
    
    // Защита от частых запросов
    if (!forceRefresh && isRequestInProgress) {
      console.log(`[useAuth:${componentId.current}] Запрос уже выполняется, пропускаем`)
      if (authPromise) {
        try {
          return await authPromise
        } catch {
          return null
        }
      }
      return globalAuthState.user
    }

    if (!forceRefresh && (now - lastAuthRequest) < MIN_REQUEST_INTERVAL) {
      console.log(`[useAuth:${componentId.current}] Слишком частые запросы, пропускаем`)
      return globalAuthState.user
    }
    
    // Используем кеш если недавно проверяли и не форсируем обновление
    if (!forceRefresh && globalAuthState.user && (now - lastCheck) < CACHE_DURATION) {
      console.log(`[useAuth:${componentId.current}] Использую кеш`)
      return globalAuthState.user
    }

    // Если уже идет запрос - ждем его
    if (authPromise && !forceRefresh) {
      console.log(`[useAuth:${componentId.current}] Ожидание существующего запроса`)
      try {
        return await authPromise
      } catch {
        return null
      }
    }

    if (!isLocalStorageAvailable()) {
      console.log(`[useAuth:${componentId.current}] localStorage недоступен`)
      return null
    }

    const token = localStorage.getItem('accessToken')
    if (!token) {
      console.log(`[useAuth:${componentId.current}] Токен не найден`)
      const newState = {
        user: null,
        isLoading: false,
        isAuthenticated: false,
        error: null
      }
      notifySubscribers(newState)
      return null
    }

    console.log(`[useAuth:${componentId.current}] Делаю запрос к API /auth/me`)

    // Отмечаем что запрос начался
    isRequestInProgress = true
    lastAuthRequest = now

    // Показываем загрузку только если это первая проверка или принудительное обновление
    if (globalAuthState.isLoading || forceRefresh) {
      notifySubscribers({
        ...globalAuthState,
        isLoading: true,
        error: null
      })
    }

    // Создаем Promise для предотвращения множественных запросов
    authPromise = authAPI.getProfile()
    
    try {
      const user = await authPromise
      lastCheck = now
      
      console.log(`[useAuth:${componentId.current}] API запрос успешен:`, {
        email: user?.email,
        id: user?.id,
        fullUser: user
      })
      
      if (!user || !user.email) {
        console.error(`[useAuth:${componentId.current}] Получен невалидный пользователь:`, user)
        throw new Error('Invalid user data received')
      }
      
      if (!user.role) {
        user.role = { id: '', name: 'user' }
      }
      
      const newState = {
        user,
        isLoading: false,
        isAuthenticated: true,
        error: null
      }
      
      notifySubscribers(newState)
      localStorage.setItem('user', JSON.stringify(user))
      
      return user
    } catch (error: unknown) {
      console.error(`[useAuth:${componentId.current}] Ошибка API запроса:`, error)
      
      let errorMessage = 'Ошибка авторизации'
      let shouldClearTokens = true
      
      try {
        const errorData = JSON.parse((error as Error).message) as ApiError
        if (errorData.statusCode === 429) {
          errorMessage = 'Слишком много запросов, попробуйте позже'
          shouldClearTokens = false
        } else if (errorData.statusCode === 401) {
          errorMessage = 'Сессия истекла'
          shouldClearTokens = true
        }
      } catch {
        // Если не удалось распарсить ошибку
      }
      
      if (shouldClearTokens) {
        console.log(`[useAuth:${componentId.current}] Очищаем токены из-за ошибки`)
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        localStorage.removeItem('user')
      }
      
      const newState = {
        user: null,
        isLoading: false,
        isAuthenticated: false,
        error: errorMessage
      }
      
      notifySubscribers(newState)
      
      return null
    } finally {
      isRequestInProgress = false
      authPromise = null
    }
  }, [])

  // НОВАЯ ФУНКЦИЯ: установка пользователя после логина
  const setAuthUser = useCallback((user: UserInfo) => {
    console.log(`[useAuth:${componentId.current}] setAuthUser вызван для:`, user.email)
    setUser(user)
  }, [])

  const logout = useCallback(async () => {
    console.log(`[useAuth:${componentId.current}] logout вызван`)
    
    // Проверяем есть ли валидный токен перед попыткой logout на бэкенде
    const token = localStorage.getItem('accessToken')
    const shouldCallBackend = token && globalAuthState.isAuthenticated
    
    if (shouldCallBackend) {
      try {
        console.log(`[useAuth:${componentId.current}] Вызываю API logout`)
        await authAPI.logout()
      } catch (error: unknown) {
        console.warn(`[useAuth:${componentId.current}] Ошибка при logout (игнорируем):`, error)
        // Игнорируем ошибки при logout, т.к. токен может быть уже невалидным
      }
    } else {
      console.log(`[useAuth:${componentId.current}] Пропускаю API logout (нет валидного токена)`)
    }
    
    // В любом случае очищаем локальные данные
    if (isLocalStorageAvailable()) {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
    }
    
    const newState = {
      user: null,
      isLoading: false,
      isAuthenticated: false,
      error: null
    }
    
    notifySubscribers(newState)
    lastCheck = 0
    isRequestInProgress = false
    lastAuthRequest = 0
    
    // Сбрасываем флаги проверки токена
    isInitialTokenCheckComplete = false
    initialTokenCheckPromise = null
  }, [])

  const clearError = useCallback(() => {
    if (globalAuthState.error) {
      notifySubscribers({
        ...globalAuthState,
        error: null
      })
    }
  }, [])

  const clearCache = useCallback(() => {
    lastCheck = 0
  }, [])

  return {
    ...authState,
    checkAuth,
    setAuthUser,
    logout,
    clearError,
    clearCache
  }
}
