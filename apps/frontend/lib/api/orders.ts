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
} from '@/lib/types/orders';
import type { PartAvailability } from '@/lib/types/parts';
import { apiRequest, generateIdempotencyKey } from '@/lib/api/core';

function buildQuery(params: Record<string, unknown>) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '' || Number.isNaN(v)) return;
    q.set(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

class OrdersAPI {
  // Orders
  async getOrders(query: OrdersQuery = {}): Promise<PaginatedOrdersResponse> {
    const qs = buildQuery(query as Record<string, unknown>);
    return apiRequest<PaginatedOrdersResponse>(`/orders${qs}`);
  }

  async getOrder(id: string): Promise<OrderResponse> {
    return apiRequest<OrderResponse>(`/orders/${id}`);
  }

  async createOrder(data: CreateOrderRequest): Promise<OrderResponse> {
    return apiRequest<OrderResponse>('/orders', {
      method: 'POST',
      json: data,
    });
  }

  async updateOrder(id: string, data: UpdateOrderRequest): Promise<OrderResponse> {
    return apiRequest<OrderResponse>(`/orders/${id}`, {
      method: 'PATCH',
      json: data,
    });
  }

  // ВНИМАНИЕ: backend для статуса заказа принимает Query (?status=)
  async updateOrderStatus(id: string, status: OrderStatus): Promise<OrderResponse> {
    const qs = buildQuery({ status });
    return apiRequest<OrderResponse>(`/orders/${id}/status${qs}`, {
      method: 'PATCH',
    });
  }

  // ВНИМАНИЕ: backend для назначения механика на заказ принимает Query (?mechanicId=)
  async assignMechanic(id: string, mechanicId: string): Promise<OrderResponse> {
    const qs = buildQuery({ mechanicId });
    return apiRequest<OrderResponse>(`/orders/${id}/assign${qs}`, {
      method: 'PATCH',
    });
  }

  async recalculateTotals(id: string): Promise<OrderResponse> {
    return apiRequest<OrderResponse>(`/orders/${id}/recalculate`, { method: 'PATCH' });
  }

  // Services (order lines)
  async getOrderServices(orderId: string): Promise<{ services: OrderServiceResponse[] }> {
    return apiRequest<{ services: OrderServiceResponse[] }>(`/orders/${orderId}/services`);
  }

  async addServiceToOrder(orderId: string, payload: AddServiceToOrderRequest): Promise<OrderServiceResponse> {
    return apiRequest<OrderServiceResponse>(`/orders/${orderId}/services`, {
      method: 'POST',
      json: payload,
      idempotencyKey: generateIdempotencyKey(),
    });
  }

  async updateOrderService(
    orderId: string,
    serviceId: string,
    payload: UpdateOrderServiceRequest,
  ): Promise<OrderServiceResponse> {
    return apiRequest<OrderServiceResponse>(`/orders/${orderId}/services/${serviceId}`, {
      method: 'PATCH',
      json: payload,
    });
  }

  async deleteOrderService(orderId: string, serviceId: string): Promise<void> {
    await apiRequest<void>(`/orders/${orderId}/services/${serviceId}`, { method: 'DELETE' });
  }

  // ВНИМАНИЕ: backend ожидает статус в JSON body
  async updateOrderServiceStatus(
    orderId: string,
    serviceId: string,
    status: 'planned' | 'in_progress' | 'completed',
  ): Promise<OrderServiceResponse> {
    return apiRequest<OrderServiceResponse>(`/orders/${orderId}/services/${serviceId}/status`, {
      method: 'PATCH',
      json: { status },
    });
  }

  // ВНИМАНИЕ: backend ожидает mechanicId в JSON body
  async assignServiceMechanic(orderId: string, serviceId: string, mechanicId: string): Promise<OrderServiceResponse> {
    return apiRequest<OrderServiceResponse>(`/orders/${orderId}/services/${serviceId}/mechanic`, {
      method: 'PATCH',
      json: { mechanicId },
    });
  }

  async startService(orderId: string, serviceId: string): Promise<OrderServiceResponse> {
    return apiRequest<OrderServiceResponse>(`/orders/${orderId}/services/${serviceId}/start`, { method: 'PATCH' });
  }

  async completeService(orderId: string, serviceId: string, notes?: string): Promise<OrderServiceResponse> {
    return apiRequest<OrderServiceResponse>(`/orders/${orderId}/services/${serviceId}/complete`, {
      method: 'PATCH',
      json: { notes },
    });
  }

  // Parts (order lines)
  async getOrderParts(orderId: string): Promise<{ parts: OrderPartResponse[] }> {
    return apiRequest<{ parts: OrderPartResponse[] }>(`/orders/${orderId}/parts`);
  }

  async addPartToOrder(orderId: string, payload: AddPartToOrderRequest): Promise<OrderPartResponse> {
    return apiRequest<OrderPartResponse>(`/orders/${orderId}/parts`, {
      method: 'POST',
      json: payload,
      idempotencyKey: generateIdempotencyKey(),
    });
  }

  async updateOrderPart(orderId: string, partId: string, payload: UpdateOrderPartRequest): Promise<OrderPartResponse> {
    return apiRequest<OrderPartResponse>(`/orders/${orderId}/parts/${partId}`, {
      method: 'PATCH',
      json: payload,
    });
  }

  async deleteOrderPart(orderId: string, partId: string): Promise<void> {
    await apiRequest<void>(`/orders/${orderId}/parts/${partId}`, { method: 'DELETE' });
  }

  async toggleCustomerProvided(
    orderId: string,
    partId: string,
    isCustomerProvided: boolean,
  ): Promise<OrderPartResponse> {
    return apiRequest<OrderPartResponse>(`/orders/${orderId}/parts/${partId}/customer-provided`, {
      method: 'PATCH',
      json: { isCustomerProvided },
    });
  }

  async checkPartAvailability(orderId: string, partId: string): Promise<PartAvailability> {
    return apiRequest<PartAvailability>(`/orders/${orderId}/parts/${partId}/availability`);
  }
}

export const ordersAPI = new OrdersAPI();
