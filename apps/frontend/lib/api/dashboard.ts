// path: apps/frontend/lib/api/dashboard.ts
import { ApiError } from '@/lib/types/auth'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1'

interface DashboardStats {
  totalOrders: number
  pendingOrders: number
  completedOrders: number
  totalRevenue: number
  monthlyRevenue: number
  lowStockItems: number
  activeCustomers: number
  appointmentsToday: number
}

interface DashboardData {
  stats: DashboardStats
  recentOrders: Array<{
    id: string
    customerName: string
    vehicleInfo: string
    status: string
    amount: number
    createdAt: string
  }>
  recentActivities: Array<{
    id: string
    type: string
    description: string
    timestamp: string
    user: string
  }>
  lowStockAlerts: Array<{
    id: string
    partName: string
    currentStock: number
    minThreshold: number
    supplier: string
  }>
}

class DashboardAPI {
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE}${endpoint}`
    const token = localStorage.getItem('accessToken')
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
      credentials: 'include',
      ...options,
    })

    const responseBody = await response.text()
    
    if (!response.ok) {
      console.error(`Dashboard API Error ${response.status}:`, responseBody)
      
      let error: ApiError
      try {
        error = JSON.parse(responseBody) as ApiError
      } catch {
        error = {
          message: responseBody || 'Неизвестная ошибка',
          statusCode: response.status
        }
      }
      
      throw new Error(JSON.stringify(error))
    }

    try {
      return JSON.parse(responseBody) as T
    } catch {
      return responseBody as T
    }
  }

  async getDashboardData(): Promise<DashboardData> {
    return this.request<DashboardData>('/dashboard')
  }

  async getStats(): Promise<DashboardStats> {
    return this.request<DashboardStats>('/dashboard/stats')
  }

  // Заглушки для будущих методов
  async getRecentOrders(): Promise<DashboardData['recentOrders']> {
    return []
  }

  async getRecentActivities(): Promise<DashboardData['recentActivities']> {
    return []
  }

  async getLowStockAlerts(): Promise<DashboardData['lowStockAlerts']> {
    return []
  }

  // Методы для обработки ошибок
  private handleError(error: unknown): never {
    console.error('Dashboard API Error:', error)
    
    if (error instanceof Error) {
      try {
        const errorData = JSON.parse(error.message) as ApiError
        throw new Error(errorData.message || 'Ошибка API')
      } catch (parseError: unknown) {
        console.error('Error parsing API error:', parseError)
        throw new Error('Неизвестная ошибка API')
      }
    }
    
    throw new Error('Неизвестная ошибка')
  }

  // Методы с обработкой ошибок
  async getDashboardDataSafe(): Promise<DashboardData | null> {
    try {
      return await this.getDashboardData()
    } catch (error: unknown) {
      this.handleError(error)
    }
  }

  async getStatsSafe(): Promise<DashboardStats | null> {
    try {
      return await this.getStats()
    } catch (error: unknown) {
      this.handleError(error)
    }
  }

  async getRecentOrdersSafe(): Promise<DashboardData['recentOrders']> {
    try {
      return await this.getRecentOrders()
    } catch (error: unknown) {
      console.error('Error fetching recent orders:', error)
      return []
    }
  }

  async getRecentActivitiesSafe(): Promise<DashboardData['recentActivities']> {
    try {
      return await this.getRecentActivities()
    } catch (error: unknown) {
      console.error('Error fetching recent activities:', error)
      return []
    }
  }

  async getLowStockAlertsSafe(): Promise<DashboardData['lowStockAlerts']> {
    try {
      return await this.getLowStockAlerts()
    } catch (error: unknown) {
      console.error('Error fetching low stock alerts:', error)
      return []
    }
  }
}

export const dashboardAPI = new DashboardAPI()
export type { DashboardData, DashboardStats }
