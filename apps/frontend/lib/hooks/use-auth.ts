// path: apps/frontend/lib/hooks/use-auth.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { authAPI } from '@/lib/api/auth';
import type { UserInfo } from '@/lib/types/auth';

interface AuthState {
  user: UserInfo | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

interface ApiError {
  message: string;
  statusCode?: number;
}

let globalAuthState: AuthState = {
  user: null,
  isLoading: true,
  isAuthenticated: false,
  error: null,
};

let authPromise: Promise<UserInfo> | null = null;
let lastCheck = 0;
let isInitialized = false;
let isRequestInProgress = false;

const MIN_REQUEST_INTERVAL = 1000;
const CACHE_DURATION = 5 * 60 * 1000;
const subscribers = new Set<(state: AuthState) => void>();

function notifySubscribers(newState: AuthState) {
  globalAuthState = newState;
  subscribers.forEach((cb) => cb(newState));
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>(() => {
    if (typeof window !== 'undefined' && !isInitialized) {
      isInitialized = true;
    }
    return globalAuthState;
  });

  const firstMount = useRef(true);

  useEffect(() => {
    const onUpdate = (s: AuthState) => setAuthState(s);
    subscribers.add(onUpdate);

    const handleAuthChange = (e: Event) => {
      const type = (e as CustomEvent).detail;
      if (type === 'logout') {
        notifySubscribers({
          user: null,
          isLoading: false,
          isAuthenticated: false,
          error: null,
        });
        lastCheck = 0;
      } else if (type === 'login') {
        lastCheck = 0;
        void checkAuth(true);
      }
    };

    window.addEventListener('auth-change', handleAuthChange);

    return () => {
      subscribers.delete(onUpdate);
      window.removeEventListener('auth-change', handleAuthChange);
    };
  }, []);

  const checkAuth = useCallback(
    async (forceRefresh = false): Promise<UserInfo | null> => {
      const now = Date.now();

      if (!forceRefresh && isRequestInProgress) {
        if (authPromise) {
          try {
            return await authPromise;
          } catch {
            return null;
          }
        }
        return globalAuthState.user;
      }

      if (!forceRefresh && globalAuthState.user && now - lastCheck < CACHE_DURATION) {
        return globalAuthState.user;
      }

      if (!forceRefresh && now - lastCheck < MIN_REQUEST_INTERVAL) {
        return globalAuthState.user;
      }

      isRequestInProgress = true;
      lastCheck = now;

      if (globalAuthState.isLoading || forceRefresh) {
        notifySubscribers({ ...globalAuthState, isLoading: true, error: null });
      }

      authPromise = authAPI.getProfile();

      try {
        const user = await authPromise;
        if (!user || !user.email) throw new Error('Invalid user data received');
        if (!user.role) user.role = { id: '', name: 'user' } as UserInfo['role'];

        const newState: AuthState = { user, isLoading: false, isAuthenticated: true, error: null };
        notifySubscribers(newState);
        return user;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        let message = 'Ошибка сети. Проверьте подключение.';
        let isUnauthorized = false;

        // Пытаемся понять, это обрыв связи (Cmd+R) или реальный отказ в доступе
        try {
          if (errMsg.includes('401')) isUnauthorized = true;
          const parsed = JSON.parse(errMsg) as ApiError;
          if (parsed?.statusCode === 429) message = 'Слишком много запросов, попробуйте позже';
          if (parsed?.statusCode === 401) {
            isUnauthorized = true;
            message = 'Сессия истекла';
          }
        } catch {
          if (errMsg.includes('401')) isUnauthorized = true;
        }

        if (isUnauthorized) {
          // Реальный 401 от бэкенда -> честно выкидываем на логин
          const newState: AuthState = { user: null, isLoading: false, isAuthenticated: false, error: message };
          notifySubscribers(newState);
          return null;
        } else {
          // Это сетевая ошибка (например, прерванный запрос при Cmd+R из-за Fast Refresh).
          // Мы НЕ ставим isAuthenticated: false. Мы просто оставляем isLoading: true, 
          // чтобы интерфейс подождал, пока Next.js автоматически перегрузит страницу до конца.
          if (!globalAuthState.isAuthenticated) {
            // Если сессии еще не было загружено вообще, зависаем в Loader, не редиректим
            return null; 
          }
          
          const newState: AuthState = { ...globalAuthState, isLoading: false, error: message };
          notifySubscribers(newState);
          return globalAuthState.user;
        }
      } finally {
        isRequestInProgress = false;
        authPromise = null;
      }
    },
    []
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!firstMount.current) return;
    firstMount.current = false;

    if (!globalAuthState.user && !globalAuthState.error) {
      notifySubscribers({ ...globalAuthState, isLoading: true });
    }

    void checkAuth(false);
  }, [checkAuth]);

  const setAuthUser = useCallback((user: UserInfo) => {
    if (!user.role) user.role = { id: '', name: 'user' } as UserInfo['role'];
    notifySubscribers({ user, isLoading: false, isAuthenticated: true, error: null });
    lastCheck = Date.now();
  }, []);

  const logout = useCallback(async () => {
    try {
      await authAPI.logout().catch(() => void 0);
    } finally {
      notifySubscribers({ user: null, isLoading: false, isAuthenticated: false, error: null });
      lastCheck = 0;
      isRequestInProgress = false;
    }
  }, []);

  const clearError = useCallback(() => {
    if (globalAuthState.error) notifySubscribers({ ...globalAuthState, error: null });
  }, []);

  const clearCache = useCallback(() => {
    lastCheck = 0;
  }, []);

  return { ...authState, checkAuth, setAuthUser, logout, clearError, clearCache };
}
