// src/modules/invoices/types/invoices.types.ts (ДОПОЛНЕННАЯ ВЕРСИЯ)
import { InvoiceStatus } from '../../../database/entities/invoice.entity';
import { AuthRole } from '../../auth/types/auth.types'; // 🔥 ДОБАВЛЕН ИМПОРТ

export { InvoiceStatus } from '../../../database/entities/invoice.entity';

export interface InvoiceFilter {
  companyId?: string;
  orderId?: string;
  customerId?: string;
  status?: InvoiceStatus;
  dateFrom?: Date;
  dateTo?: Date;
  dueDateFrom?: Date;
  dueDateTo?: Date;
  amountFrom?: number;
  amountTo?: number;
  search?: string;
  includeOverdue?: boolean;
  page?: number;
  limit?: number;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateInvoiceData {
  companyId: string;
  orderId: string;
  invoiceNumber?: string;
  status?: InvoiceStatus;
  issueDate?: Date;
  dueDate: Date;
  amount: number;
  taxAmount?: number;
  totalAmount?: number;
  notes?: string;
}

export interface UpdateInvoiceData {
  status?: InvoiceStatus;
  dueDate?: Date;
  amount?: number;
  taxAmount?: number;
  totalAmount?: number;
  notes?: string;
}

// 🔥 ИСПРАВЛЕНО: Используем правильный тип роли и добавляем недостающие поля
export interface UserWithCompany {
  id: string;
  email: string;
  role: AuthRole; // Используем правильный enum
  companyId: string;
  firstName?: string;
  lastName?: string;
}

export interface InvoiceCalculationResult {
  amount: number;
  taxAmount: number;
  totalAmount: number;
  taxPercentage: number;
}

export interface OverdueInvoicesReport {
  totalOverdue: number;
  totalAmount: number;
  byCustomer: Array<{
    customerId: string;
    customerName: string;
    count: number;
    totalAmount: number;
    oldestInvoiceDate: Date;
  }>;
}

export interface InvoiceStatistics {
  total: number;
  byStatus: Record<string, number>;
  thisMonth: number;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  overdueAmount: number;
  overdueCount: number;
}

export interface OverdueInvoicesReport {
  totalOverdue: number;
  totalAmount: number;
  byCustomer: Array<{
    customerId: string;
    customerName: string;
    count: number;
    totalAmount: number;
    oldestInvoiceDate: Date;
  }>;
}
