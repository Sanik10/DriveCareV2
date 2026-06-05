// path: apps/frontend/lib/api/core.ts
export function getApiBase(): string {
  const base =
    (process.env.NEXT_PUBLIC_API_URL as string) ||
    (process.env.NEXT_PUBLIC_API_BASE_URL as string) ||
    'http://localhost:3001/api/v1';
  return base.replace(/\/+$/, '');
}

export function buildApiUrl(endpoint: string): string {
  const base = getApiBase();
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}${path}`;
}

const STOP_LIST: RegExp[] = [
  /\/subscription-billing\/webhooks\//i,
  /\/payments\/webhooks\//i,
  /\/payments\/system\//i,
  /\/stock-movements\/integrations\//i,
  /\/hard(?:$|[/?#])/i,
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
let authChannel: BroadcastChannel | null = null;
let bootstrapStarted = false;

export function initAuthBootstrap(): void {
  if (!isBrowser || bootstrapStarted) return;
  bootstrapStarted = true;

  try {
    authChannel = new BroadcastChannel('auth');
    authChannel.onmessage = (e: MessageEvent<{ type: string }>) => {
      if (e.data?.type) {
        window.dispatchEvent(new CustomEvent('auth-change', { detail: e.data.type }));
      }
    };
  } catch {
    authChannel = null;
  }
}

function ensureBootstrapStarted() {
  if (!bootstrapStarted) {
    initAuthBootstrap();
  }
}

export function notifyAuthChange(type: 'login' | 'logout') {
  if (isBrowser) {
    window.dispatchEvent(new CustomEvent('auth-change', { detail: type }));
    try {
      authChannel?.postMessage({ type, ts: Date.now() });
    } catch {
      // ignore
    }
  }
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
  idempotencyKey?: string;
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

export async function apiRequest<T>(endpoint: string, init: ApiRequestInit = {}): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : buildApiUrl(endpoint);

  if (isForbidden(url)) {
    throw new Error(`Forbidden endpoint from UI: ${extractPath(url)} (blocked by stop-list)`);
  }

  if (isBrowser) ensureBootstrapStarted();

  const headers = new Headers(init.headers);
  const hasJsonBody = typeof init.json !== 'undefined';

  if (hasJsonBody && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }
  if (init.idempotencyKey) {
    headers.set('X-Idempotency-Key', init.idempotencyKey);
  }

  const res = await fetch(url, {
    ...init,
    headers,
    credentials: 'include',
    body: hasJsonBody ? JSON.stringify(init.json) : init.body,
  });

  if (!res.ok) {
    if (res.status === 401 && isBrowser) {
      const ignoreList = ['/auth/login', '/auth/logout'];
      const shouldIgnore = ignoreList.some((path) => url.includes(path));
      
      if (!shouldIgnore) {
        notifyAuthChange('logout');
      }
    }

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

export async function apiRequestRaw(endpoint: string, init: ApiRequestInit = {}): Promise<Response> {
  const url = endpoint.startsWith('http') ? endpoint : buildApiUrl(endpoint);

  if (isForbidden(url)) {
    throw new Error(`Forbidden endpoint from UI: ${extractPath(url)} (blocked by stop-list)`);
  }

  if (isBrowser) ensureBootstrapStarted();

  const headers = new Headers(init.headers);
  const hasJsonBody = typeof init.json !== 'undefined';

  if (hasJsonBody && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (!headers.has('Accept')) {
    headers.set('Accept', '*/*');
  }
  if (init.idempotencyKey) {
    headers.set('X-Idempotency-Key', init.idempotencyKey);
  }

  const res = await fetch(url, {
    ...init,
    headers,
    credentials: 'include',
    body: hasJsonBody ? JSON.stringify(init.json) : init.body,
  });

  if (!res.ok) {
    if (res.status === 401 && isBrowser) {
      const ignoreList = ['/auth/login', '/auth/logout'];
      const shouldIgnore = ignoreList.some((path) => url.includes(path));
      
      if (!shouldIgnore) {
        notifyAuthChange('logout');
      }
    }
    const statusText = res.statusText || 'Request failed';
    throw new Error(`Request failed: ${res.status} ${statusText}`);
  }

  return res;
}
