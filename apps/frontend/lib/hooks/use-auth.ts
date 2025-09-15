// path: apps/frontend/lib/hooks/use-auth.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { authAPI } from '@/lib/api/auth';
import type { UserInfo } from '@/lib/types/auth';
import { clearAccessToken } from '@/lib/api/core';

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

// Глобальное состояние для всех экземпляров хука
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

  // Подписка на глобальное состояние
  useEffect(() => {
    const onUpdate = (s: AuthState) => setAuthState(s);
    subscribers.add(onUpdate);
    return () => {
      subscribers.delete(onUpdate);
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
        notifySubscribers({
          ...globalAuthState,
          isLoading: true,
          error: null,
        });
      }

      authPromise = authAPI.getProfile();

      try {
        const user = await authPromise;

        if (!user || !user.email) {
          throw new Error('Invalid user data received');
        }
        if (!user.role) {
          user.role = { id: '', name: 'user' } as UserInfo['role'];
        }

        const newState: AuthState = {
          user,
          isLoading: false,
          isAuthenticated: true,
          error: null,
        };

        notifySubscribers(newState);
        return user;
      } catch (err) {
        let message = 'Ошибка авторизации';
        try {
          const parsed = JSON.parse((err as Error).message) as ApiError;
          if (parsed?.statusCode === 429) message = 'Слишком много запросов, попробуйте позже';
          if (parsed?.statusCode === 401) message = 'Сессия истекла';
        } catch {
          // ignore
        }

        const newState: AuthState = {
          user: null,
          isLoading: false,
          isAuthenticated: false,
          error: message,
        };
        notifySubscribers(newState);
        return null;
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
    if (!user.role) {
      user.role = { id: '', name: 'user' } as UserInfo['role'];
    }
    const newState: AuthState = {
      user,
      isLoading: false,
      isAuthenticated: true,
      error: null,
    };
    lastCheck = Date.now();
    notifySubscribers(newState);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authAPI.logout().catch(() => void 0);
    } finally {
      clearAccessToken();
      const newState: AuthState = {
        user: null,
        isLoading: false,
        isAuthenticated: false,
        error: null,
      };
      notifySubscribers(newState);
      lastCheck = 0;
      isRequestInProgress = false;
    }
  }, []);

  const clearError = useCallback(() => {
    if (globalAuthState.error) {
      notifySubscribers({ ...globalAuthState, error: null });
    }
  }, []);

  const clearCache = useCallback(() => {
    lastCheck = 0;
  }, []);

  return {
    ...authState,
    checkAuth,
    setAuthUser,
    logout,
    clearError,
    clearCache,
  };
}
