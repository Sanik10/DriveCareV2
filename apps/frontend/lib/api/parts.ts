// path: apps/frontend/lib/api/parts.ts
import type {
  PaginatedPartsResponse,
  PartsQuery,
  PartCatalogueItem,
  CreatePartRequest,
  UpdatePartRequest,
} from '@/lib/types/parts'

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

class PartsAPI {
  async search(query: PartsQuery & { search: string }): Promise<PaginatedPartsResponse> {
    const { search, page = 1, limit = 10, categoryId } = query
    const qs = buildQuery({ page, limit, categoryId })
    return request<PaginatedPartsResponse>(`/parts/search/${encodeURIComponent(search)}${qs}`)
  }

  async list(query: PartsQuery = {}): Promise<PaginatedPartsResponse> {
    const qs = buildQuery(query as Record<string, unknown>)
    return request<PaginatedPartsResponse>(`/parts${qs}`)
  }

  async get(id: string): Promise<PartCatalogueItem> {
    return request<PartCatalogueItem>(`/parts/${id}`)
  }

  async create(payload: CreatePartRequest): Promise<PartCatalogueItem> {
    return request<PartCatalogueItem>('/parts', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  }

  async update(id: string, payload: UpdatePartRequest): Promise<PartCatalogueItem> {
    return request<PartCatalogueItem>(`/parts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    })
  }

  async remove(id: string): Promise<void> {
    await request<void>(`/parts/${id}`, { method: 'DELETE' })
  }
}

export const partsAPI = new PartsAPI()
