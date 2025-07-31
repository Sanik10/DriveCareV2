// src/modules/orders/types/orders.types.ts
import { OrderStatus as OrderStatusEnum } from '../../../database/entities/order.entity';

// 🔄 Экспортируем enum для удобства
export { OrderStatus } from '../../../database/entities/order.entity';

// 📋 Интерфейсы для работы с данными
export interface OrderFilter {
  companyId?: string;       // 🔒 Для security фильтрации
  customerId?: string;
  vehicleId?: string;
  status?: OrderStatusEnum;
  assignedTo?: string;
  createdBy?: string;
  search?: string;         // Поиск по номеру заказа, описанию
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
  sortField?: OrderSortField;
  sortOrder?: SortOrder;
}

export interface CreateOrderData {
  companyId?: string;       // 🔥 ИСПРАВЛЕНО: делаем опциональным
  customerId: string;
  vehicleId: string;
  orderNumber?: string;     // 🔥 ИСПРАВЛЕНО: делаем опциональным - генерируется автоматически
  status?: OrderStatusEnum;
  createdBy: string;
  assignedTo?: string;
  description?: string;
  customerComplaints?: string;
  mileage?: number;
  estimatedCompletionTime?: Date | string;
  discountAmount?: number;
}

export interface UpdateOrderData {
  status?: OrderStatusEnum;
  assignedTo?: string;
  description?: string;
  customerComplaints?: string;
  diagnosticResults?: string;
  mileage?: number;
  estimatedCompletionTime?: Date | string;
  actualCompletionTime?: Date | string;
  totalAmount?: number;
  discountAmount?: number;
  taxAmount?: number;
  finalAmount?: number;
  updatedBy?: string;      // Для аудита
  
  // 🔥 ДОБАВЛЕНО: поля для validation проверок (но не для реального обновления)
  companyId?: string;      // Для проверки что не пытается изменить
  orderNumber?: string;    // Для проверки что не пытается изменить
}

export type OrderSortField = 
  | 'orderNumber'
  | 'status'
  | 'totalAmount'
  | 'finalAmount'
  | 'createdAt'
  | 'estimatedCompletionTime'
  | 'customerName';

export type SortOrder = 'asc' | 'desc';

// 📊 Интерфейсы для статистики
export interface OrdersStatistics {
  total: number;
  byStatus: Record<OrderStatusEnum, number>;
  thisMonth: number;
  totalAmount: number;
  averageOrderValue: number;
  completionRate: number;
}

// 🔄 Workflow интерфейсы
export interface StatusTransition {
  from: OrderStatusEnum;
  to: OrderStatusEnum;
  allowedRoles: string[];
  requiredFields?: string[];
  businessRules?: string[];
}

// 💰 Финансовые интерфейсы
export interface OrderFinancials {
  servicesTotal: number;
  partsTotal: number;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  finalAmount: number;
  taxRate: number;
}
