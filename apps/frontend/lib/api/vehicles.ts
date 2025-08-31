// path: apps/frontend/lib/api/vehicles.ts
import type {
  VehiclesQuery,
  PaginatedVehiclesResponse,
  VehicleResponse,
  CreateVehicleRequest,
  UpdateVehicleRequest,
} from '@/lib/types/vehicles';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

interface ApiError {
  message: string;
  statusCode?: number;
}

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
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      credentials: 'include',
      ...options,
    });

    const text = await res.text();

    if (!res.ok) {
      let err: ApiError;
      try {
        err = JSON.parse(text) as ApiError;
      } catch {
        err = { message: text || 'Unknown error', statusCode: res.status };
      }
      throw new Error(JSON.stringify(err));
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      return text as unknown as T;
    }
  }

  async getVehicles(query: VehiclesQuery = {}): Promise<PaginatedVehiclesResponse> {
    const qs = buildQuery(query as Record<string, unknown>);
    return this.request<PaginatedVehiclesResponse>(`/vehicles${qs}`);
  }

  async getVehicle(id: string): Promise<VehicleResponse> {
    return this.request<VehicleResponse>(`/vehicles/${id}`);
  }

  async getCustomerVehicles(customerId: string): Promise<VehicleResponse[]> {
    return this.request<VehicleResponse[]>(`/vehicles/customer/${customerId}`);
  }

  async createVehicle(data: CreateVehicleRequest): Promise<VehicleResponse> {
    return this.request<VehicleResponse>('/vehicles', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateVehicle(id: string, data: UpdateVehicleRequest): Promise<VehicleResponse> {
    return this.request<VehicleResponse>(`/vehicles/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async updateMileage(id: string, mileage: number): Promise<VehicleResponse> {
    const qs = buildQuery({ mileage });
    return this.request<VehicleResponse>(`/vehicles/${id}/mileage${qs}`, {
      method: 'PATCH',
    });
  }

  async deleteVehicle(id: string): Promise<void> {
    await this.request<void>(`/vehicles/${id}`, { method: 'DELETE' });
  }
}

export const vehiclesAPI = new VehiclesAPI();
