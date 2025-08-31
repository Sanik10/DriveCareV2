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
} from "@/lib/types/orders";

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

  // Services
  async getOrderServices(orderId: string): Promise<{ services: OrderServiceResponse[] }> {
    return request<{ services: OrderServiceResponse[] }>(`/orders/${orderId}/services`);
  }

  // Parts
  async getOrderParts(orderId: string): Promise<{ parts: OrderPartResponse[] }> {
    return request<{ parts: OrderPartResponse[] }>(`/orders/${orderId}/parts`);
  }
}

export const ordersAPI = new OrdersAPI();
