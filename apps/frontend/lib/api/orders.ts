// path: apps/frontend/lib/api/orders.ts
import type {
  OrdersQuery,
  PaginatedOrdersResponse,
  OrderResponse,
  CreateOrderRequest,
  UpdateOrderRequest,
  OrderServicesListResponse,
  OrderServiceResponse,
  AddServiceToOrderRequest,
  UpdateOrderServiceRequest,
  OrderPartsListResponse,
  OrderPartResponse,
  AddPartToOrderRequest,
  UpdateOrderPartRequest,
  OrderStatus,
  OrderServiceStatus,
} from '@/lib/types/orders'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'

interface ApiError {
  message: string
  statusCode?: number
}

function buildQuery(params: Record<string, unknown>) {
  const q = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return
    q.set(k, String(v))
  })
  const s = q.toString()
  return s ? `?${s}` : ''
}

// Простая защита от дублей запросов (StrictMode/быстрые клики)
const cache = new Map<string, { promise: Promise<unknown>, timer: ReturnType<typeof setTimeout> | null }>()
const CACHE_TTL_MS = 800

class OrdersAPI {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE}${endpoint}`
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null

    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      credentials: 'include',
      ...options,
    })

    const body = await res.text()

    if (!res.ok) {
      let err: ApiError
      try {
        err = JSON.parse(body) as ApiError
      } catch {
        err = { message: body || 'Unknown error', statusCode: res.status }
      }
      throw new Error(JSON.stringify(err))
    }

    try {
      return JSON.parse(body) as T
    } catch {
      return body as unknown as T
    }
  }

  // Orders
  async getOrders(query: OrdersQuery = {}): Promise<PaginatedOrdersResponse> {
    const qs = buildQuery(query as Record<string, unknown>)
    const endpoint = `/orders${qs}`
    const cacheKey = `GET:${endpoint}`

    // Используем кэш для предотвращения дублей
    const cached = cache.get(cacheKey)
    if (cached) {
      return cached.promise as Promise<PaginatedOrdersResponse>
    }

    const promise = this.request<PaginatedOrdersResponse>(endpoint)
    cache.set(cacheKey, { promise, timer: null })

    // Сбрасываем кэш через короткое время
    const timer = setTimeout(() => {
      const item = cache.get(cacheKey)
      if (item) cache.delete(cacheKey)
    }, CACHE_TTL_MS)
    cache.set(cacheKey, { promise, timer })

    try {
      return await promise
    } finally {
      // Ничего — очистка по таймеру
    }
  }

  async getOrder(id: string): Promise<OrderResponse> {
    return this.request<OrderResponse>(`/orders/${id}`)
  }

  async createOrder(data: CreateOrderRequest): Promise<OrderResponse> {
    return this.request<OrderResponse>('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateOrder(id: string, data: UpdateOrderRequest): Promise<OrderResponse> {
    return this.request<OrderResponse>(`/orders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async updateOrderStatus(id: string, status: OrderStatus): Promise<OrderResponse> {
    const qs = buildQuery({ status })
    return this.request<OrderResponse>(`/orders/${id}/status${qs}`, {
      method: 'PATCH',
    })
  }

  async assignOrderMechanic(id: string, mechanicId: string): Promise<OrderResponse> {
    const qs = buildQuery({ mechanicId })
    return this.request<OrderResponse>(`/orders/${id}/assign${qs}`, {
      method: 'PATCH',
    })
  }

  async recalculateTotals(id: string): Promise<OrderResponse> {
    return this.request<OrderResponse>(`/orders/${id}/recalculate`, {
      method: 'PATCH',
    })
  }

  // Services
  async getOrderServices(orderId: string): Promise<OrderServicesListResponse> {
    return this.request<OrderServicesListResponse>(`/orders/${orderId}/services`)
  }

  async addService(orderId: string, data: AddServiceToOrderRequest): Promise<OrderServiceResponse> {
    return this.request<OrderServiceResponse>(`/orders/${orderId}/services`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateService(orderId: string, serviceId: string, data: UpdateOrderServiceRequest): Promise<OrderServiceResponse> {
    return this.request<OrderServiceResponse>(`/orders/${orderId}/services/${serviceId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async removeService(orderId: string, serviceId: string): Promise<void> {
    await this.request<void>(`/orders/${orderId}/services/${serviceId}`, {
      method: 'DELETE',
    })
  }

  async updateServiceStatus(orderId: string, serviceId: string, status: OrderServiceStatus): Promise<OrderServiceResponse> {
    return this.request<OrderServiceResponse>(`/orders/${orderId}/services/${serviceId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
  }

  async assignServiceMechanic(orderId: string, serviceId: string): Promise<OrderServiceResponse> {
    return this.request<OrderServiceResponse>(`/orders/${orderId}/services/${serviceId}/mechanic`, {
      method: 'PATCH',
    })
  }

  async startService(orderId: string, serviceId: string): Promise<OrderServiceResponse> {
    return this.request<OrderServiceResponse>(`/orders/${orderId}/services/${serviceId}/start`, {
      method: 'PATCH',
    })
  }

  async completeService(orderId: string, serviceId: string): Promise<OrderServiceResponse> {
    return this.request<OrderServiceResponse>(`/orders/${orderId}/services/${serviceId}/complete`, {
      method: 'PATCH',
    })
  }

  // Parts
  async getOrderParts(orderId: string): Promise<OrderPartsListResponse> {
    return this.request<OrderPartsListResponse>(`/orders/${orderId}/parts`)
  }

  async addPart(orderId: string, data: AddPartToOrderRequest): Promise<OrderPartResponse> {
    return this.request<OrderPartResponse>(`/orders/${orderId}/parts`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updatePart(orderId: string, partId: string, data: UpdateOrderPartRequest): Promise<OrderPartResponse> {
    return this.request<OrderPartResponse>(`/orders/${orderId}/parts/${partId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  async removePart(orderId: string, partId: string): Promise<void> {
    await this.request<void>(`/orders/${orderId}/parts/${partId}`, {
      method: 'DELETE',
    })
  }

  async toggleCustomerProvided(orderId: string, partId: string): Promise<OrderPartResponse> {
    return this.request<OrderPartResponse>(`/orders/${orderId}/parts/${partId}/customer-provided`, {
      method: 'PATCH',
    })
  }

  async checkPartAvailability(orderId: string, partId: string): Promise<{
    partId: string
    available: number
    reserved: number
    canAddToOrder: boolean
    maxQuantity: number
  }> {
    return this.request<{
      partId: string
      available: number
      reserved: number
      canAddToOrder: boolean
      maxQuantity: number
    }>(`/orders/${orderId}/parts/${partId}/availability`)
  }
}

export const ordersAPI = new OrdersAPI()
