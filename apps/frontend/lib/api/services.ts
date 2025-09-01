// path: apps/frontend/lib/api/services.ts
import type {
  PaginatedServicesResponse,
  ServicesQuery,
  ServiceCatalogueItem,
  CreateServiceRequest,
  UpdateServiceRequest,
} from '@/lib/types/services'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'

interface ApiError {
  message: string
  statusCode?: number
}

function buildQuery(params: Record<string, unknown>) {
  const q = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '' || Number.isNaN(v)) return
    q.set(k, String(v))
  })
  const s = q.toString()
  return s ? `?${s}` : ''
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null

  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    credentials: 'include',
    ...options,
  })

  const text = await res.text()

  if (!res.ok) {
    let err: ApiError
    try {
      err = JSON.parse(text) as ApiError
    } catch {
      err = { message: text || 'Unknown error', statusCode: res.status }
    }
    throw new Error(JSON.stringify(err))
  }

  try {
    return JSON.parse(text) as T
  } catch {
    return text as unknown as T
  }
}

class ServicesAPI {
  async search(query: ServicesQuery = {}): Promise<PaginatedServicesResponse> {
    const qs = buildQuery(query as Record<string, unknown>)
    return request<PaginatedServicesResponse>(`/services${qs}`)
  }

  async get(id: string): Promise<ServiceCatalogueItem> {
    return request<ServiceCatalogueItem>(`/services/${id}`)
  }

  async create(payload: CreateServiceRequest): Promise<ServiceCatalogueItem> {
    return request<ServiceCatalogueItem>('/services', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }

  async update(id: string, payload: UpdateServiceRequest): Promise<ServiceCatalogueItem> {
    return request<ServiceCatalogueItem>(`/services/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  }

  async remove(id: string): Promise<void> {
    await request<void>(`/services/${id}`, { method: 'DELETE' })
  }
}

export const servicesAPI = new ServicesAPI()
