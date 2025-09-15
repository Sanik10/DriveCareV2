// path: apps/frontend/lib/types.ts
export type InvoiceStatus = 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED' | 'CANCELED';

export interface Invoice {
  id: string;
  number: string;
  amount: number;
  currency: string;
  dueDate: string;
  status: InvoiceStatus;
  customerName?: string;
}

export interface Tariff {
  id: string;
  name: string;
  price?: number;
  currency?: string;
  period?: string;
  features?: string[];
}

// В целях единообразия и отсутствия дублирования типов оплаты,
// реэкспортируем PaymentInitResponse из специализированного модуля платежей.
export type { PaymentInitResponse } from './types/payments';

export interface User {
  id: string;
  email: string;
  role?: string;
  [key: string]: unknown;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  expiresIn?: number;
  deviceId?: string;
}
