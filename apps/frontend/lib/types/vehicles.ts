// path: apps/frontend/lib/types/vehicles.ts
export type VehicleStatus = 'active' | 'inactive' | 'archived' | string;
export type EngineType = 'petrol' | 'diesel' | 'electric' | 'hybrid' | string;

export interface VehicleBrand {
  id: string;
  name: string;
}

export interface VehicleModel {
  id: string;
  name: string;
  brand?: VehicleBrand | null;
  brandId?: string;
}

export interface VehicleOwner {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  companyName?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface VehicleResponse {
  id: string;
  licensePlate?: string | null;
  vin?: string | null;
  mileage?: number | null;
  status?: VehicleStatus;

  // enrichers (optional from backend)
  year?: number | null;
  color?: string | null;
  engineType?: EngineType | null;
  // In liters (backend Create/Update DTO expects liters, e.g. 2.0)
  engineVolume?: number | null;

  // service dates (Update DTO)
  lastServiceDate?: string | Date | null;
  nextServiceDate?: string | Date | null;

  model?: VehicleModel | null;
  customer?: VehicleOwner | null;

  // computed fields
  serviceHistoryCount?: number;
  needsService?: boolean;
  daysUntilService?: number;

  createdAt: string;
  updatedAt: string;
}

export interface PaginatedVehiclesResponseMeta {
  totalByEngineType: Record<string, number>;
  averageMileage: number;
  vehiclesNeedingService: number;
  averageAge: number;
}

export interface PaginatedVehiclesResponse {
  items: VehicleResponse[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext?: boolean;
  hasPrev?: boolean;
  meta?: PaginatedVehiclesResponseMeta;
}

export interface VehiclesQuery {
  search?: string;
  status?: VehicleStatus;
  page?: number;
  limit?: number;
  customerId?: string;
  modelId?: string;
  vehicleTypeId?: string;
  engineType?: EngineType;
  yearFrom?: number;
  yearTo?: number;
  mileageFrom?: number;
  mileageTo?: number;
  hasServiceHistory?: boolean;
}

// Public catalogue types (no PII: no vin/plate/owner/company)
export interface VehiclePublicResponse {
  id: string;
  modelId: string;
  vehicleTypeId: string;

  year?: number | null;
  color?: string | null;
  engineType?: EngineType | null;
  // In liters
  engineVolume?: number | null;
  mileage?: number | null;

  // service dates (public response includes dates as strings)
  lastServiceDate?: string | null;
  nextServiceDate?: string | null;

  // computed
  serviceHistoryCount?: number;
  needsService?: boolean;
  daysUntilService?: number;

  // nested
  model?: VehicleModel | null;

  createdAt: string;
  updatedAt: string;

  // Optional UI helpers
  modelName?: string;
  brandName?: string;
  vehicleTypeName?: string;
  displayName?: string;
}

export interface PaginatedVehiclesPublicResponse {
  items: VehiclePublicResponse[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext?: boolean;
  hasPrev?: boolean;
  meta?: Record<string, unknown> | null;
}

export interface PublicVehiclesQuery {
  search?: string;
  page?: number;
  limit?: number;
  modelId?: string;
  vehicleTypeId?: string;
  engineType?: EngineType;
  yearFrom?: number;
  yearTo?: number;
  mileageFrom?: number;
  mileageTo?: number;
  hasServiceHistory?: boolean;
}

export interface CreateVehicleRequest {
  // Required
  customerId: string;
  modelId: string;
  vehicleTypeId: string;

  // Optional
  licensePlate?: string; // e.g. "А123БВ456"
  vin?: string;          // 17 chars
  mileage?: number;      // km
  year?: number;         // 1950..2050
  color?: string;        // free text
  engineType?: EngineType;
  engineVolume?: number; // liters, e.g. 2.0
  notes?: string;
}

export type UpdateVehicleRequest = Partial<CreateVehicleRequest> & {
  lastServiceDate?: string;
  nextServiceDate?: string;
};
