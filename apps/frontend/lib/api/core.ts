// path: apps/frontend/lib/api/core.ts

/**
 * Базовый URL API для фронта.
 * Приоритет:
 * - NEXT_PUBLIC_API_URL (например: http://localhost:3001/api/v1)
 * - NEXT_PUBLIC_API_BASE_URL (например: /api/v1 или полный URL)
 * - fallback: http://localhost:3001/api/v1
 */
export function getApiBase(): string {
  const base =
    (process.env.NEXT_PUBLIC_API_URL as string) ||
    (process.env.NEXT_PUBLIC_API_BASE_URL as string) ||
    'http://localhost:3001/api/v1';
  return base.replace(/\/+$/, '');
}

/**
 * Склейка базового URL и endpoint.
 */
export function buildApiUrl(endpoint: string): string {
  const base = getApiBase();
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}${path}`;
}

/**
 * Stop-list guard: блокируем системные/вебхуки/интеграции/hard-delete в UI.
 */
const STOP_LIST: RegExp[] = [
  /\/subscription-billing\/webhooks\//i,
  /\/payments\/webhooks\//i,
  /\/payments\/system\//i,
  /\/stock-movements\/integrations\//i,
  /\/hard(?:$|[/?#])/i, // любые :id/hard
];

function extractPath(input: string): string {
  try {
    const u = new URL(input);
    return u.pathname;
  } catch {
    return input;
  }
}

function isForbidden(endpointOrUrl: string): boolean {
  const path = extractPath(endpointOrUrl);
  return STOP_LIST.some((re) => re.test(path));
}

const isBrowser = typeof window !== 'undefined';

/**
 * Хранилище accessToken (в памяти процесса фронта).
 * Не используем localStorage для токенов.
 */
let ACCESS_TOKEN: string | null = null;

/**
 * BroadcastChannel для синхронизации вкладок.
 */
type AuthEvent = { type: 'login' | 'logout' | 'refreshed'; ts: number };
let authChannel: BroadcastChannel | null = null;

/**
 * Барьер готовности токена на старте (boot refresh).
 */
let tokenReadyResolved = false;
let tokenReadyResolve: (() => void) | null = null;
const tokenReadyPromise = new Promise<void>((res) => {
  tokenReadyResolve = () => {
    tokenReadyResolved = true;
    res();
  };
});

/**
 * Управление рефрешем/штормозащитой/преэмптивом.
 */
let refreshing: Promise<void> | null = null;
let refreshFailStreak = 0;
// let lastRefreshAt = 0; // убрано как неиспользуемое
let proactiveTimeout: ReturnType<typeof setTimeout> | null = null;
let bootstrapStarted = false;
let lastExternalTrigger = 0;

const PROACTIVE_MARGIN_SEC = 60; // обновляем за минуту до exp
const EXTERNAL_TRIGGER_MIN_MS = 150_000; // не чаще 2.5 минут
const MAX_REFRESH_FAIL_STREAK = 3;

/**
 * Утилита: безопасное декодирование exp из JWT (без проверки подписи).
 */
function decodeTokenExp(token?: string | null): number | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(atob(parts[1]));
    if (payload && typeof payload.exp === 'number') {
      return payload.exp;
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Планировщик преэмптивного refresh по exp.
 */
function scheduleProactiveRefresh() {
  if (!isBrowser) return;
  if (proactiveTimeout) {
    clearTimeout(proactiveTimeout);
    proactiveTimeout = null;
  }
  const exp = decodeTokenExp(ACCESS_TOKEN);
  if (!exp) return;

  const nowSec = Math.floor(Date.now() / 1000);
  const dueInSec = Math.max(0, exp - PROACTIVE_MARGIN_SEC - nowSec);
  if (dueInSec <= 0) {
    // уже пора обновить
    void preemptiveRefresh();
    return;
  }
  proactiveTimeout = setTimeout(() => {
    void preemptiveRefresh();
  }, dueInSec * 1000);
}

/**
 * Событийные триггеры (focus/visibility/online) с троттлингом.
 */
function shouldTriggerExternalRefresh(): boolean {
  const now = Date.now();
  if (now - lastExternalTrigger < EXTERNAL_TRIGGER_MIN_MS) return false;
  lastExternalTrigger = now;
  return true;
}

async function preemptiveRefresh(): Promise<void> {
  try {
    await refreshAccessToken();
  } catch {
    // тихо игнорируем — fail-safe будет обработан в refreshAccessToken
  }
}

/**
 * Инициализация Bootstrap: один раз на вкладку.
 * - настройка BroadcastChannel
 * - boot refresh перед массовыми запросами
 * - преэмптивное обновление и внешние триггеры
 */
export function initAuthBootstrap(): void {
  if (!isBrowser || bootstrapStarted) return;
  bootstrapStarted = true;

  // BroadcastChannel
  try {
    authChannel = new BroadcastChannel('auth');
    authChannel.onmessage = (e: MessageEvent<AuthEvent>) => {
      const data = e.data;
      if (!data || !data.type) return;
      if (data.type === 'login') {
        // На другом табе залогинились — подтянем свой access через refresh-cookie
        void preemptiveRefresh();
      } else if (data.type === 'logout') {
        // На другом табе разлогинились — очистим токен
        clearAccessToken();
      } else if (data.type === 'refreshed') {
        // no-op
      }
    };
  } catch {
    authChannel = null;
  }

  // Сразу делаем boot refresh (тихо), чтобы не было шторма 401
  void (async () => {
    try {
      await refreshAccessToken();
    } catch {
      // если куки нет/протух — просто резолвим барьер, UI отработает logout/редирект сам
    } finally {
      if (!tokenReadyResolved) tokenReadyResolve?.();
    }
  })();

  // Триггеры окна
  const handler = () => {
    if (!shouldTriggerExternalRefresh()) return;
    // обновляем только если токен скоро протухнет
    const exp = decodeTokenExp(ACCESS_TOKEN);
    const nowSec = Math.floor(Date.now() / 1000);
    if (exp && exp - nowSec <= PROACTIVE_MARGIN_SEC + 15) {
      void preemptiveRefresh();
    }
  };
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') handler();
  });
  window.addEventListener('focus', handler);
  window.addEventListener('online', handler);

  // Расписание преэмптива по exp
  scheduleProactiveRefresh();
}

/**
 * Гарантирует, что bootstrap запущен (если apiRequest дернули раньше провайдера).
 */
function ensureBootstrapStarted() {
  if (!bootstrapStarted) {
    initAuthBootstrap();
  }
}

function emitAuthEvent(type: AuthEvent['type']) {
  if (!authChannel) return;
  try {
    authChannel.postMessage({ type, ts: Date.now() });
  } catch {
    // ignore
  }
}

export function setAccessToken(token: string | null, opts?: { source?: 'login' | 'refresh' | 'manual'; silent?: boolean }) {
  ACCESS_TOKEN = token ?? null;
  scheduleProactiveRefresh();
  if (isBrowser && !opts?.silent) {
    emitAuthEvent(token ? (opts?.source === 'refresh' ? 'refreshed' : 'login') : 'logout');
  }
}

export function getAccessToken(): string | null {
  return ACCESS_TOKEN;
}

export function clearAccessToken() {
  ACCESS_TOKEN = null;
  scheduleProactiveRefresh();
}

/**
 * Обновление accessToken по httpOnly refresh cookie.
 * Централизовано: один refreshing Promise на все запросы.
 */
export async function refreshAccessToken(): Promise<void> {
  if (refreshing) return refreshing;

  refreshing = fetch(buildApiUrl('/auth/refresh'), {
    method: 'POST',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  })
    .then(async (r) => {
      if (!r.ok) {
        refreshFailStreak++;
        if (r.status === 401 || r.status === 403 || refreshFailStreak >= MAX_REFRESH_FAIL_STREAK) {
          // fail-safe: мягкий logout
          clearAccessToken();
          if (!tokenReadyResolved) tokenReadyResolve?.();
        }
        throw new Error(`Refresh failed: ${r.status}`);
      }
      const data = (await r.json()) as { accessToken?: string | null };
      setAccessToken(data?.accessToken ?? null, { source: 'refresh', silent: true });
      // lastRefreshAt = Date.now(); // убрано как неиспользуемое
      refreshFailStreak = 0;
    })
    .catch((err) => {
      throw err;
    })
    .finally(() => {
      refreshing = null;
      // В любом случае считаем барьер токена пройденным после первой попытки boot refresh
      if (!tokenReadyResolved) tokenReadyResolve?.();
    });

  return refreshing;
}

/**
 * Ожидание готовности токена на старте (boot refresh).
 */
async function waitForTokenReady(): Promise<void> {
  if (tokenReadyResolved) return;
  return tokenReadyPromise;
}

export function generateIdempotencyKey(): string {
  try {
    const g = globalThis as unknown as { crypto?: { randomUUID?: () => string } };
    const uuid = g.crypto?.randomUUID?.();
    if (uuid) return uuid;
  } catch {
    // noop
  }
  return `idemp_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

export type ApiRequestInit = RequestInit & {
  json?: unknown;
  retryOn401?: boolean;
  idempotencyKey?: string;
  /**
   * Требовать ли готовый токен перед запросом.
   * auto — все, кроме публичных /auth/login|register-company|register-invite|refresh (+ read-only /tariffs)
   */
  requireAuth?: boolean | 'auto';
};

function toJsonOrText<T>(res: Response): Promise<T> {
  return res
    .text()
    .then((txt) => {
      if (!txt) return undefined as unknown as T;
      try {
        return JSON.parse(txt) as T;
      } catch {
        return txt as unknown as T;
      }
    })
    .catch(() => undefined as unknown as T);
}

function hasMessage(o: unknown): o is { message?: string } {
  return !!o && typeof o === 'object' && 'message' in o;
}

function isPublicEndpoint(url: string): boolean {
  const path = extractPath(url).toLowerCase();
  return (
    /^\/auth\/login$/.test(path) ||
    /^\/auth\/register-company$/.test(path) ||
    /^\/auth\/register-invite$/.test(path) ||
    /^\/auth\/refresh$/.test(path) ||
    /^\/tariffs(\/|$)/.test(path)
  );
}

async function withAuthAwareFetch(
  url: string,
  init: ApiRequestInit,
  headers: Headers,
  doFetch: () => Promise<Response>
): Promise<Response> {
  const reqAuth =
    init.requireAuth === 'auto' || typeof init.requireAuth === 'undefined'
      ? !isPublicEndpoint(url)
      : !!init.requireAuth;

  if (isBrowser) {
    ensureBootstrapStarted();
    if (reqAuth) {
      await waitForTokenReady();
    }
  }

  let res = await doFetch();

  // 401 → пробуем обновить токен и повторить 1 раз
  if (res.status === 401 && init.retryOn401 !== false) {
    try {
      await refreshAccessToken();
      const refreshed = getAccessToken();
      if (refreshed) {
        headers.set('Authorization', `Bearer ${refreshed}`);
      } else {
        headers.delete('Authorization');
      }
      res = await doFetch();
    } catch {
      // провал refresh — отдадим исходный 401 ниже
    }
  }

  return res;
}

/**
 * Единый безопасный запрос к API.
 * - Блокирует stop-list (webhooks/system/integrations/hard-delete)
 * - Добавляет credentials: 'include'
 * - Авторизация: Authorization: Bearer <accessToken>, если есть
 * - JSON body через init.json
 * - Авто-обновление токена при 401 (единый refreshing Promise)
 * - Поддержка X-Idempotency-Key
 * - Гейтинг по tokenReady на старте (requireAuth)
 */
export async function apiRequest<T>(endpoint: string, init: ApiRequestInit = {}): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : buildApiUrl(endpoint);

  if (isForbidden(url)) {
    throw new Error(`Forbidden endpoint from UI: ${extractPath(url)} (blocked by stop-list)`);
  }

  const headers = new Headers(init.headers);

  // JSON headers
  const hasJsonBody = typeof init.json !== 'undefined';
  if (hasJsonBody && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  // Authorization
  const token = getAccessToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Idempotency
  if (init.idempotencyKey) {
    headers.set('X-Idempotency-Key', init.idempotencyKey);
  }

  const doFetch = async (): Promise<Response> =>
    fetch(url, {
      ...init,
      headers,
      credentials: 'include',
      body: hasJsonBody ? JSON.stringify(init.json) : init.body,
    });

  const res = await withAuthAwareFetch(url, init, headers, doFetch);

  if (!res.ok) {
    const payload = await toJsonOrText<unknown>(res);
    let message = `Request failed: ${res.status}`;
    if (typeof payload === 'string' && payload) {
      message = payload;
    } else if (hasMessage(payload) && typeof payload.message === 'string') {
      message = payload.message;
    }
    throw new Error(message);
  }

  return toJsonOrText<T>(res);
}

/**
 * Низкоуровневый запрос с возвратом Response (для blob/stream).
 * Повторяет безопасность apiRequest:
 * - stop-list, credentials, Authorization, JSON через init.json, 401 refresh, X-Idempotency-Key, tokenReady gating.
 */
export async function apiRequestRaw(endpoint: string, init: ApiRequestInit = {}): Promise<Response> {
  const url = endpoint.startsWith('http') ? endpoint : buildApiUrl(endpoint);

  if (isForbidden(url)) {
    throw new Error(`Forbidden endpoint from UI: ${extractPath(url)} (blocked by stop-list)`);
  }

  const headers = new Headers(init.headers);

  // JSON headers
  const hasJsonBody = typeof init.json !== 'undefined';
  if (hasJsonBody && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (!headers.has('Accept')) {
    headers.set('Accept', '*/*');
  }

  // Authorization
  const token = getAccessToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Idempotency
  if (init.idempotencyKey) {
    headers.set('X-Idempotency-Key', init.idempotencyKey);
  }

  const doFetch = async (): Promise<Response> =>
    fetch(url, {
      ...init,
      headers,
      credentials: 'include',
      body: hasJsonBody ? JSON.stringify(init.json) : init.body,
    });

  const res = await withAuthAwareFetch(url, init, headers, doFetch);

  if (!res.ok) {
    // Не читаем тело здесь, чтобы не съесть поток для Blob-потребителей
    const statusText = res.statusText || 'Request failed';
    throw new Error(`Request failed: ${res.status} ${statusText}`);
  }

  return res;
}
