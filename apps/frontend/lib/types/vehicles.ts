// path: apps/frontend/lib/types/vehicles.ts
export type VehicleStatus = 'active' | 'inactive' | 'archived' | string;

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
  model?: VehicleModel | null;
  customer?: VehicleOwner | null;

  // Дополнительные вычисляемые поля с бэка (опционально)
  serviceHistoryCount?: number;
  needsService?: boolean;
  daysUntilService?: number;

  createdAt: string;
  updatedAt: string;
}

export interface PaginatedVehiclesResponse {
  items: VehicleResponse[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface VehiclesQuery {
  search?: string;
  status?: VehicleStatus;
  page?: number;
  limit?: number;
  customerId?: string;
  modelId?: string;
  vehicleTypeId?: string;
  engineType?: string;
  yearFrom?: number;
  yearTo?: number;
  mileageFrom?: number;
  mileageTo?: number;
  hasServiceHistory?: boolean;
}

export interface CreateVehicleRequest {
  customerId: string;
  modelId: string;
  vehicleTypeId: string;
  licensePlate?: string;
  vin?: string;
  mileage?: number;
  year?: number;
  color?: string;
  engineType?: string;
  engineVolume?: number;
  notes?: string;
}

export type UpdateVehicleRequest = Partial<CreateVehicleRequest>;
