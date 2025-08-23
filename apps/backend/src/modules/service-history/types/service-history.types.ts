// path: apps/backend/src/modules/service-history/types/service-history.types.ts
export type ServiceHistorySortField = 'date' | 'mileage' | 'createdAt' | 'nextServiceDate';
export type SortOrder = 'asc' | 'desc';

export interface ServiceHistoryFilter {
  search?: string;
  vehicleId?: string;
  companyId?: string;
  customerId?: string;
  orderId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  nextServiceFrom?: Date;
  nextServiceTo?: Date;
  mileageFrom?: number;
  mileageTo?: number;
  hasNextService?: boolean;
  page?: number;
  limit?: number;
  sortField?: ServiceHistorySortField;
  sortOrder?: SortOrder;
  includeDeleted?: boolean;
}

export interface CreateServiceHistoryData {
  vehicleId: string;
  companyId: string; // 🔥 КРИТИЧНО: Добавлено для безопасности
  orderId?: string;
  date: Date;
  mileage?: number;
  description: string;
  nextServiceDate?: Date;
  notes?: string;
}

export interface UpdateServiceHistoryData {
  orderId?: string;
  date?: Date;
  mileage?: number;
  description?: string;
  nextServiceDate?: Date;
  notes?: string;
}

export interface ServiceHistoryStats {
  totalRecords: number;
  averageServiceInterval: number; // В днях
  totalMileageServiced: number;
  upcomingServices: number;
  overdueServices: number;
  lastServiceDate?: Date;
  nextServiceDate?: Date;
  serviceFrequency: {
    thisMonth: number;
    lastMonth: number;
    thisYear: number;
  };
}

export interface ServiceHistoryBasicInfo {
  id: string;
  vehicleId: string;
  vehicleInfo: string;
  date: Date;
  description: string;
  mileage?: number;
  companyId: string;
  isOverdue?: boolean;
  daysUntilNextService?: number;
}

export interface ServiceHistoryWithVehicle extends ServiceHistoryBasicInfo {
  vehicle: {
    id: string;
    licensePlate?: string;
    vin?: string;
    model?: {
      name: string;
      brand?: {
        name: string;
      };
    };
    customer: {
      id: string;
      name: string;
    };
  };
  nextServiceDate?: Date;
  notes?: string;
  orderId?: string;
}

export interface VehicleServiceUpdate {
  vehicleId: string;
  lastServiceDate?: Date;
  nextServiceDate?: Date;
  currentMileage?: number;
}
