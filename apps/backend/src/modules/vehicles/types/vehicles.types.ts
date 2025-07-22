import { EngineType } from '../../../database/entities/vehicle.entity';

export type VehicleSortField = 'createdAt' | 'licensePlate' | 'year' | 'mileage' | 'lastServiceDate';

export type SortOrder = 'asc' | 'desc';

export interface VehicleFilter {
  search?: string;
  customerId?: string;
  companyId?: string;
  modelId?: string;
  vehicleTypeId?: string;
  engineType?: EngineType;
  yearFrom?: number;
  yearTo?: number;
  mileageFrom?: number;
  mileageTo?: number;
  hasServiceHistory?: boolean;
  lastServiceFrom?: Date;
  lastServiceTo?: Date;
  page?: number;
  limit?: number;
  sortField?: VehicleSortField;
  sortOrder?: SortOrder;
  includeDeleted?: boolean;
}

export interface CreateVehicleData {
  customerId: string;
  companyId: string;
  modelId: string;
  vehicleTypeId: string;
  vin?: string;
  licensePlate?: string;
  year?: number;
  color?: string;
  engineType?: EngineType;
  engineVolume?: number;
  mileage?: number;
  notes?: string;
}

export interface UpdateVehicleData {
  customerId?: string; // 🔥 ДОБАВЛЕНО для transferVehicleToCustomer
  modelId?: string;
  vehicleTypeId?: string;
  vin?: string;
  licensePlate?: string;
  year?: number;
  color?: string;
  engineType?: EngineType;
  engineVolume?: number;
  mileage?: number;
  lastServiceDate?: Date;
  nextServiceDate?: Date;
  notes?: string;
}

export interface VehicleStats {
  totalVehicles: number;
  totalByEngineType: Record<EngineType, number>;
  averageMileage: number;
  vehiclesNeedingService: number;
  newThisMonth: number;
  averageAge: number;
}

export interface VehicleBasicInfo {
  id: string;
  displayName: string; // "BMW X5 (А123БВ456)" или "VIN: WBXXX"
  licensePlate?: string;
  vin?: string;
  year?: number;
  customerId: string;
  customerName: string;
  companyId: string;
  isActive: boolean;
}

export interface VehicleWithDetails extends VehicleBasicInfo {
  model: {
    id: string;
    name: string;
    brand: {
      id: string;
      name: string;
    };
  };
  vehicleType: {
    id: string;
    name: string;
  };
  serviceHistoryCount: number;
  lastServiceDate?: Date;
  nextServiceDate?: Date;
  mileage?: number;
}