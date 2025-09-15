// path: apps/frontend/lib/api/vehicles.ts
import { apiRequest, generateIdempotencyKey } from '@/lib/api/core';
import type {
  VehiclesQuery,
  PaginatedVehiclesResponse,
  VehicleResponse,
  CreateVehicleRequest,
  UpdateVehicleRequest,
} from '@/lib/types/vehicles';

function buildQuery(params: Record<string, unknown>) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    q.set(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

class VehiclesAPI {
  async getVehicles(query: VehiclesQuery = {}): Promise<PaginatedVehiclesResponse> {
    const qs = buildQuery(query as Record<string, unknown>);
    return apiRequest<PaginatedVehiclesResponse>(`/vehicles${qs}`, { method: 'GET' });
  }

  async getVehicle(id: string): Promise<VehicleResponse> {
    return apiRequest<VehicleResponse>(`/vehicles/${id}`, { method: 'GET' });
  }

  async getCustomerVehicles(customerId: string): Promise<VehicleResponse[]> {
    return apiRequest<VehicleResponse[]>(`/vehicles/customer/${customerId}`, { method: 'GET' });
  }

  async createVehicle(data: CreateVehicleRequest): Promise<VehicleResponse> {
    return apiRequest<VehicleResponse>('/vehicles', {
      method: 'POST',
      json: data,
      idempotencyKey: generateIdempotencyKey(),
    });
  }

  async updateVehicle(id: string, data: UpdateVehicleRequest): Promise<VehicleResponse> {
    return apiRequest<VehicleResponse>(`/vehicles/${id}`, {
      method: 'PATCH',
      json: data,
      idempotencyKey: generateIdempotencyKey(),
    });
  }

  async updateMileage(id: string, mileage: number): Promise<VehicleResponse> {
    const qs = buildQuery({ mileage });
    return apiRequest<VehicleResponse>(`/vehicles/${id}/mileage${qs}`, {
      method: 'PATCH',
      idempotencyKey: generateIdempotencyKey(),
    });
  }

  async deleteVehicle(id: string): Promise<void> {
    await apiRequest<void>(`/vehicles/${id}`, {
      method: 'DELETE',
      idempotencyKey: generateIdempotencyKey(),
    });
  }
}

export const vehiclesAPI = new VehiclesAPI();
