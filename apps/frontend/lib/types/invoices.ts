// path: apps/frontend/lib/types/invoices.ts

export type InvoiceStatus = 'ISSUED' | 'PAID' | 'CANCELED';

export interface InvoiceRelatedOrder {
  id: string;
  orderNumber?: string;
  status?: string;
  description?: string;
  createdAt?: string;
}

export interface InvoiceRelatedCustomer {
  id: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  // PII поля могут отсутствовать для ролей ниже manager
  email?: string;
  phone?: string;
  type?: 'individual' | 'company' | string;
}

export interface InvoiceRelatedVehicle {
  id: string;
  vin?: string;
  licensePlate?: string;
  year?: number;
  displayName?: string;
}

export interface InvoiceRelatedCompany {
  id: string;
  name: string;
  legalName?: string;
  taxNumber?: string;
  address?: string;
  email: string;
  phone?: string;
}

export interface InvoicePayment {
  // Подробные типы платежа будут добавлены в модуле Payments
  [key: string]: unknown;
}

export interface Invoice {
  id: string;
  companyId: string;
  orderId: string;

  invoiceNumber: string;
  status: InvoiceStatus;

  issueDate: string; // ISO
  dueDate: string; // ISO

  amount: number; // без налогов
  taxAmount: number;
  totalAmount: number;

  notes?: string;

  createdAt: string; // ISO
  updatedAt: string; // ISO

  // Связанные сущности (могут отсутствовать в ответе)
  order?: InvoiceRelatedOrder;
  customer?: InvoiceRelatedCustomer;
  vehicle?: InvoiceRelatedVehicle;
  company?: InvoiceRelatedCompany;
  payments?: InvoicePayment[];

  // Вычисляемые поля
  displayStatus?: string;
  isOverdue?: boolean;
  daysUntilDue?: number;
  remainingAmount?: number;
  paidAmount?: number;
  taxPercentage?: number;

  // Разрешения
  canEdit?: boolean;
  canCancel?: boolean;
  canPay?: boolean;
}

export interface PaginatedInvoicesResponse {
  items: Invoice[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext?: boolean;
  hasPrev?: boolean;

  // Могут приходить только для ролей manager+
  totalAmount?: number;
  paidAmount?: number;
  pendingAmount?: number;

  // Доп. аналитика для owner/admin (может отсутствовать)
  averageAmount?: number;
  overduePercentage?: number;

  // Общедоступная метрика
  overdueCount?: number;
}

export interface InvoicesQuery {
  status?: InvoiceStatus;
  customerId?: string;
  orderId?: string;
  search?: string; // номер счета/поисковая строка
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string; // YYYY-MM-DD
  page?: number;
  limit?: number;
}

export interface CreateInvoiceRequest {
  companyId?: string; // выставляется на бэке из токена, но поле допускается
  orderId: string;
  invoiceNumber?: string;
  status?: InvoiceStatus;
  issueDate?: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  amount: number;
  taxAmount?: number;
  totalAmount?: number;
  notes?: string;
}

export interface CreateInvoiceFromOrderRequest {
  orderId: string;
  paymentTermsDays?: number; // по умолчанию 30
  discountPercent?: number;
  notes?: string;
}

export interface UpdateInvoiceRequest {
  status?: InvoiceStatus;
  dueDate?: string; // YYYY-MM-DD
  amount?: number;
  taxAmount?: number;
  totalAmount?: number;
  notes?: string;
}

export interface InvoiceSelectOption {
  id: string;
  label: string;
}

export interface InvoicesStats {
  total?: number;
  paid?: number;
  pending?: number;
  canceled?: number;
  overdueCount?: number;
  totalAmount?: number;
  paidAmount?: number;
  pendingAmount?: number;
}

/**
 * Отчет по просроченным счетам: формальный тип с запасом.
 * Backend может вернуть агрегаты и список счетов.
 */
export type OverdueReport = {
  total?: number;
  overdueCount?: number;
  totalAmount?: number;
  items?: Array<Partial<Invoice>>;
} & Record<string, unknown>;

/**
 * Допустимые переходы статусов (локальная копия для UI).
 */
export const INVOICE_STATUS_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  ISSUED: ['PAID', 'CANCELED'],
  PAID: [],
  CANCELED: [],
};
