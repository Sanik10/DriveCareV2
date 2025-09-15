// path: apps/frontend/lib/api.ts
'use client';

import { LoginResponse, Invoice, Tariff } from './types';
import { apiRequest, setAccessToken, clearAccessToken, getAccessToken } from '@/lib/api/core';
import { paymentsAPI } from '@/lib/api/payments';

export const api = {
  auth: {
    async login(payload: { email: string; password: string }) {
      const data = await apiRequest<LoginResponse>('/auth/login', {
        method: 'POST',
        json: payload,
      });
      setAccessToken(data.accessToken ?? null);
      return data;
    },
    async logout() {
      await apiRequest('/auth/logout', { method: 'POST' });
      clearAccessToken();
    },
    getAccessToken() {
      return getAccessToken();
    },
  },

  invoices: {
    list: () => apiRequest<Invoice[]>('/invoices', { method: 'GET' }),
    get: (id: string) => apiRequest<Invoice>(`/invoices/${id}`, { method: 'GET' }),
  },

  payments: {
    /**
     * Инициирует онлайн‑оплату инвойса и возвращает redirectUrl (через PaymentInitResponse).
     * Поддерживает выбор paymentMethodId (multi-provider).
     * Оставлен как удобная обёртка; внутри проксируем на paymentsAPI.initOnline.
     */
    init: (invoiceId: string, amount?: number, paymentMethodId?: string, returnUrl?: string) => {
      const ret =
        returnUrl ||
        (typeof window !== 'undefined'
          ? `${window.location.origin}/dashboard/payments/result`
          : '/dashboard/payments/result');

      return paymentsAPI.initOnline(invoiceId, amount, paymentMethodId, ret);
    },
  },

  tariffs: {
    list: async () => {
      try {
        return await apiRequest<Tariff[]>('/tariffs/active', { method: 'GET' });
      } catch {
        try {
          return await apiRequest<Tariff[]>('/tariffs/popular', { method: 'GET' });
        } catch {
          return await apiRequest<Tariff[]>('/tariffs?page=1&limit=6', { method: 'GET' });
        }
      }
    },
  },
};
