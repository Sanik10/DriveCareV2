// path: apps/frontend/lib/api.ts
'use client';

import { LoginResponse, PaymentInitResponse, Invoice, Tariff } from './types';
import { getApiBase } from '@/lib/api/core';

const BASE = getApiBase();

let accessToken: string | null = null;
let refreshPromise: Promise<void> | null = null;

async function refresh() {
  if (!refreshPromise) {
    refreshPromise = fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
      .then(async (r) => {
        if (!r.ok) throw new Error('Refresh failed');
        const data: LoginResponse = await r.json();
        accessToken = data.accessToken ?? null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

async function request<T>(
  path: string,
  init: RequestInit & { json?: unknown } = {}
): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type') && init.json) headers.set('Content-Type', 'application/json');
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  const res = await fetch(`${BASE}${path.startsWith('/') ? path : `/${path}`}`, {
    ...init,
    headers,
    credentials: 'include',
    body: init.json ? JSON.stringify(init.json) : init.body,
  });

  if (res.status === 401) {
    await refresh();
    const retryHeaders = new Headers(init.headers);
    if (!retryHeaders.has('Content-Type') && init.json) retryHeaders.set('Content-Type', 'application/json');
    if (accessToken) retryHeaders.set('Authorization', `Bearer ${accessToken}`);
    const retry = await fetch(`${BASE}${path.startsWith('/') ? path : `/${path}`}`, {
      ...init,
      headers: retryHeaders,
      credentials: 'include',
      body: init.json ? JSON.stringify(init.json) : init.body,
    });
    if (!retry.ok) throw new Error(`Request failed: ${retry.status}`);
    return retry.json();
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Request failed: ${res.status}`);
  }

  return res.json();
}

export const api = {
  auth: {
    async login(payload: { email: string; password: string }) {
      const data = await request<LoginResponse>('/auth/login', { method: 'POST', json: payload });
      accessToken = data.accessToken ?? null;
      return data;
    },
    async logout() {
      await request('/auth/logout', { method: 'POST' });
      accessToken = null;
    },
    getAccessToken() {
      return accessToken;
    },
  },
  invoices: {
    list: () => request<Invoice[]>('/invoices', { method: 'GET' }),
    get: (id: string) => request<Invoice>(`/invoices/${id}`, { method: 'GET' }),
  },
  payments: {
    init: (invoiceId: string) =>
      request<PaymentInitResponse | unknown>('/payments', { method: 'POST', json: { invoiceId } }) as Promise<PaymentInitResponse>,
  },
  tariffs: {
    list: async () => {
      try {
        return await request<Tariff[]>('/tariffs/active', { method: 'GET' });
      } catch {
        try {
          return await request<Tariff[]>('/tariffs/popular', { method: 'GET' });
        } catch {
          return await request<Tariff[]>('/tariffs?page=1&limit=6', { method: 'GET' });
        }
      }
    },
  },
};
