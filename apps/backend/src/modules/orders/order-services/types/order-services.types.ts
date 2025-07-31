import { OrderServiceStatus } from '../../../../database/entities/order-service.entity';

// 📋 Интерфейсы для работы с данными
export interface AddServiceToOrderData {
  orderId: string;
  serviceId: string;
  price: number;
  quantity: number;
  discountPercent: number;
  totalAmount: number;
  status: OrderServiceStatus;
  mechanicId?: string | null;
  notes?: string | null;
  // 🔥 ДОБАВЛЕНО: поля из DTO для валидации
  customPrice?: number; 
}

export interface UpdateOrderServiceData {
  quantity?: number;
  price?: number;
  discountPercent?: number;
  totalAmount?: number;
  status?: OrderServiceStatus;
  mechanicId?: string | null;
  startTime?: Date;
  endTime?: Date;
  notes?: string | null;
}

// Остальные интерфейсы остаются без изменений...
export interface OrderServiceStats {
  orderId: string;
  totalServices: number;
  plannedServices: number;
  inProgressServices: number;
  completedServices: number;
  totalAmount: number;
  completionPercentage: number;
}

export interface ServiceStatusTransition {
  from: OrderServiceStatus;
  to: OrderServiceStatus;
  allowedRoles: string[];
  requiredChecks?: string[];
}

export interface ServiceFinancialSummary {
  serviceId: string;
  serviceName: string;
  quantity: number;
  basePrice: number;
  discountPercent: number;
  discountAmount: number;
  finalAmount: number;
}

export interface MechanicWorkload {
  mechanicId: string;
  mechanicName: string;
  activeServices: number;
  totalServices: number;
  averageDuration: number;
  isOverloaded: boolean;
}

export interface BulkAddServicesData {
  orderId: string;
  services: Array<{
    serviceId: string;
    quantity?: number;
    customPrice?: number;
    discountPercent?: number;
    mechanicId?: string;
    notes?: string;
  }>;
}

export interface BulkAddServicesResult {
  orderId: string;
  addedServices: string[];
  failedServices: Array<{
    serviceId: string;
    error: string;
  }>;
  totalAmount: number;
}

export interface OrderServiceFilter {
  orderId?: string;
  serviceId?: string;
  status?: OrderServiceStatus;
  mechanicId?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface ServicePerformanceReport {
  serviceId: string;
  serviceName: string;
  totalOrders: number;
  averageDuration: number;
  averagePrice: number;
  completionRate: number;
  popularityRank: number;
}

export interface MechanicPerformanceReport {
  mechanicId: string;
  mechanicName: string;
  totalServices: number;
  completedServices: number;
  averageDuration: number;
  efficiency: number;
  specializations: string[];
}

export const ORDER_SERVICE_CONSTRAINTS = {
  MAX_QUANTITY: 100,
  MAX_DISCOUNT_PERCENT: 100,
  MAX_NOTES_LENGTH: 1000,
  MAX_SERVICES_PER_ORDER: 50,
  MAX_MECHANIC_ACTIVE_SERVICES: 5,
} as const;

export type OrderServiceSortField = 
  | 'serviceName'
  | 'status'
  | 'totalAmount'
  | 'createdAt'
  | 'startTime'
  | 'endTime'
  | 'mechanicName'
  | 'duration';

export type SortOrder = 'asc' | 'desc';
