// path: apps/frontend/lib/api/orders.ts
import type {
  OrdersQuery,
  PaginatedOrdersResponse,
  OrderResponse,
  CreateOrderRequest,
  UpdateOrderRequest,
  OrderServiceResponse,
  OrderPartResponse,
  OrderStatus,
  AddServiceToOrderRequest,
  UpdateOrderServiceRequest,
  AddPartToOrderRequest,
  UpdateOrderPartRequest,
} from "@/lib/types/orders";
import type { PartAvailability } from "@/lib/types/parts";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

interface ApiError {
  message: string;
  statusCode?: number;
}

function buildQuery(params: Record<string, unknown>) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "" || Number.isNaN(v)) return;
    q.set(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : "";
}

function idempotencyKey(): string {
  // Browser-safe UUID
  try {
    // @ts-expect-error crypto exists in modern browsers
    if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  } catch {}
  return `idemp_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    credentials: "include",
    ...options,
  });

  const text = await res.text();

  if (!res.ok) {
    let err: ApiError;
    try {
      err = JSON.parse(text) as ApiError;
    } catch {
      err = { message: text || "Unknown error", statusCode: res.status };
    }
    throw new Error(JSON.stringify(err));
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T;
  }
}

class OrdersAPI {
  // Orders
  async getOrders(query: OrdersQuery = {}): Promise<PaginatedOrdersResponse> {
    const qs = buildQuery(query as Record<string, unknown>);
    return request<PaginatedOrdersResponse>(`/orders${qs}`);
  }

  async getOrder(id: string): Promise<OrderResponse> {
    return request<OrderResponse>(`/orders/${id}`);
  }

  async createOrder(data: CreateOrderRequest): Promise<OrderResponse> {
    return request<OrderResponse>("/orders", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateOrder(id: string, data: UpdateOrderRequest): Promise<OrderResponse> {
    return request<OrderResponse>(`/orders/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  async updateOrderStatus(id: string, status: OrderStatus): Promise<OrderResponse> {
    const qs = buildQuery({ status });
    return request<OrderResponse>(`/orders/${id}/status${qs}`, {
      method: "PATCH",
    });
  }

  async assignMechanic(id: string, mechanicId: string): Promise<OrderResponse> {
    const qs = buildQuery({ mechanicId });
    return request<OrderResponse>(`/orders/${id}/assign${qs}`, {
      method: "PATCH",
    });
  }

  async recalculateTotals(id: string): Promise<OrderResponse> {
    return request<OrderResponse>(`/orders/${id}/recalculate`, { method: "PATCH" });
  }

  // Services (order lines)
  async getOrderServices(orderId: string): Promise<{ services: OrderServiceResponse[] }> {
    return request<{ services: OrderServiceResponse[] }>(`/orders/${orderId}/services`);
  }

  async addServiceToOrder(orderId: string, payload: AddServiceToOrderRequest): Promise<OrderServiceResponse> {
    return request<OrderServiceResponse>(`/orders/${orderId}/services`, {
      method: "POST",
      headers: { "X-Idempotency-Key": idempotencyKey() },
      body: JSON.stringify(payload),
    });
  }

  async updateOrderService(orderId: string, serviceId: string, payload: UpdateOrderServiceRequest): Promise<OrderServiceResponse> {
    return request<OrderServiceResponse>(`/orders/${orderId}/services/${serviceId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  }

  async deleteOrderService(orderId: string, serviceId: string): Promise<void> {
    await request<void>(`/orders/${orderId}/services/${serviceId}`, { method: "DELETE" });
  }

  async updateOrderServiceStatus(orderId: string, serviceId: string, status: 'planned' | 'in_progress' | 'completed'): Promise<OrderServiceResponse> {
    const qs = buildQuery({ status });
    return request<OrderServiceResponse>(`/orders/${orderId}/services/${serviceId}/status${qs}`, { method: "PATCH" });
  }

  async assignServiceMechanic(orderId: string, serviceId: string, mechanicId: string): Promise<OrderServiceResponse> {
    const qs = buildQuery({ mechanicId });
    return request<OrderServiceResponse>(`/orders/${orderId}/services/${serviceId}/mechanic${qs}`, { method: "PATCH" });
  }

  async startService(orderId: string, serviceId: string): Promise<OrderServiceResponse> {
    return request<OrderServiceResponse>(`/orders/${orderId}/services/${serviceId}/start`, { method: "PATCH" });
  }

  async completeService(orderId: string, serviceId: string, notes?: string): Promise<OrderServiceResponse> {
    return request<OrderServiceResponse>(`/orders/${orderId}/services/${serviceId}/complete`, {
      method: "PATCH",
      body: JSON.stringify({ notes }),
    });
  }

  // Parts (order lines)
  async getOrderParts(orderId: string): Promise<{ parts: OrderPartResponse[] }> {
    return request<{ parts: OrderPartResponse[] }>(`/orders/${orderId}/parts`);
  }

  async addPartToOrder(orderId: string, payload: AddPartToOrderRequest): Promise<OrderPartResponse> {
    return request<OrderPartResponse>(`/orders/${orderId}/parts`, {
      method: "POST",
      headers: { "X-Idempotency-Key": idempotencyKey() },
      body: JSON.stringify(payload),
    });
  }

  async updateOrderPart(orderId: string, partId: string, payload: UpdateOrderPartRequest): Promise<OrderPartResponse> {
    return request<OrderPartResponse>(`/orders/${orderId}/parts/${partId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  }

  async deleteOrderPart(orderId: string, partId: string): Promise<void> {
    await request<void>(`/orders/${orderId}/parts/${partId}`, { method: "DELETE" });
  }

  async toggleCustomerProvided(orderId: string, partId: string, isCustomerProvided: boolean): Promise<OrderPartResponse> {
    return request<OrderPartResponse>(`/orders/${orderId}/parts/${partId}/customer-provided`, {
      method: "PATCH",
      body: JSON.stringify({ isCustomerProvided }),
    });
  }

  async checkPartAvailability(orderId: string, partId: string): Promise<PartAvailability> {
    return request<PartAvailability>(`/orders/${orderId}/parts/${partId}/availability`);
  }
}

export const ordersAPI = new OrdersAPI();
