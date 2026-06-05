// path: apps/frontend/lib/api/dashboard.ts
import { apiRequest } from '@/lib/api/core';

interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalRevenue: number;
  monthlyRevenue: number;
  lowStockItems: number;
  activeCustomers: number;
  appointmentsToday: number;
}

interface DashboardData {
  stats: DashboardStats;
  recentOrders: Array<{
    id: string
    orderNumber?: string
    customerName: string
    vehicleInfo: string
    status: string
    amount: number
    createdAt: string
  }>;
  recentActivities: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
    user: string;
  }>;
  lowStockAlerts: Array<{
    id: string;
    partName: string;
    currentStock: number;
    minThreshold: number;
    supplier: string;
  }>;
}

type Paginated<T> = { items: T[]; total: number; page: number; limit: number; totalPages: number };
type OrderItem = {
  id: string
  orderNumber?: string
  status: string
  createdAt?: string

  totalAmount?: number
  finalAmount?: number

  customer?: {
    id: string
    firstName?: string
    lastName?: string
    companyName?: string
    fullName?: string
    name?: string
    email?: string
    phone?: string
  }

  vehicle?: {
    id: string
    licensePlate?: string
    plateNumber?: string
    model?: {
      name?: string
      brand?: { name?: string }
    }
  }
}

type BalanceByCurrency = Record<string, { received: number; refunded: number; net: number; pending: number }>;

type CompanyBalance = {
  companyId?: string;
  totalReceived?: number;
  totalRefunded?: number;
  netBalance?: number;
  pendingAmount?: number;
  disputedAmount?: number;
  balanceByCurrency?: BalanceByCurrency;
  lastUpdated?: string | Date;
  totalTransactions?: number;
  averageTransactionAmount?: number;
  last30DaysBalance?: number;
  monthlyGrowthPercentage?: number;
};

type LowStockItemApi = {
  partId: string;
  partName: string;
  partNumber?: string;
  currentQuantity: number;
  minQuantity: number;
  shortage: number;
  categoryName: string;
  location?: string;
  lastMovementDate?: string | Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedRunOutDays?: number;
};

type LegacyLowStockItem = {
  id?: string | number;
  partId?: string | number;
  partName?: string;
  name?: string;
  currentStock?: number;
  stock?: number;
  minThreshold?: number;
  minStock?: number;
  supplier?: { name?: string };
  supplierName?: string;
};

type LowStockApi =
  | { alerts?: LowStockItemApi[]; totalAlerts?: number }
  | { items?: LegacyLowStockItem[]; total?: number };

function safeNum(v: unknown, fallback = 0): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function safeText(v: unknown): string {
  if (v === null || v === undefined) return ""
  if (typeof v === "string") return v
  if (typeof v === "number") return String(v)

  if (typeof v === "object") {
    const obj = v as any
    const candidate =
      obj.name ?? obj.fullName ?? obj.title ?? obj.label ?? obj.value ?? obj.code ?? obj.id
    if (typeof candidate === "string" || typeof candidate === "number") return String(candidate)
  }

  return ""
}

function joinText(parts: unknown[], sep: string): string {
  return parts
    .map(safeText)
    .map((s) => s.trim())
    .filter(Boolean)
    .join(sep)
}

class DashboardAPI {
  async getStats(): Promise<DashboardStats> {
    const defaultBalance: CompanyBalance = { totalReceived: 0, netBalance: 0, last30DaysBalance: 0 };

    const [allOrders, completedOrders, inProgressOrders, awaitingPartsOrders, balance, lowStock] =
      await Promise.allSettled([
        apiRequest<Paginated<OrderItem>>('/orders?limit=1'),
        apiRequest<Paginated<OrderItem>>('/orders?status=completed&limit=1'),
        apiRequest<Paginated<OrderItem>>('/orders?status=in_progress&limit=1'),
        apiRequest<Paginated<OrderItem>>('/orders?status=awaiting_parts&limit=1'),
        apiRequest<CompanyBalance>('/payments/analytics/balance'),
        apiRequest<LowStockApi>('/inventory/alerts/low-stock'),
      ]);

    const totalOrders = allOrders.status === 'fulfilled' ? safeNum(allOrders.value.total) : 0;
    const completed = completedOrders.status === 'fulfilled' ? safeNum(completedOrders.value.total) : 0;
    const inProgress = inProgressOrders.status === 'fulfilled' ? safeNum(inProgressOrders.value.total) : 0;
    const awaiting = awaitingPartsOrders.status === 'fulfilled' ? safeNum(awaitingPartsOrders.value.total) : 0;

    const pendingOrders = inProgress + awaiting;

    const balValue: CompanyBalance = balance.status === 'fulfilled' ? balance.value : defaultBalance;

    const totalRevenue = safeNum(balValue.totalReceived ?? balValue.netBalance ?? 0);
    const monthlyRevenue = safeNum(balValue.last30DaysBalance ?? 0);

    let lowStockItems = 0;
    if (lowStock.status === 'fulfilled') {
      const val = lowStock.value;
      if ('alerts' in val && Array.isArray((val as { alerts?: unknown[] }).alerts)) {
        const alerts = (val as { alerts: LowStockItemApi[] }).alerts;
        lowStockItems = alerts.length;
      } else if ('items' in val && Array.isArray((val as { items?: unknown[] }).items)) {
        const items = (val as { items: LegacyLowStockItem[] }).items;
        lowStockItems = items.length;
      } else if ('total' in (val as { total?: number })) {
        lowStockItems = safeNum((val as { total?: number }).total);
      } else if ('totalAlerts' in (val as { totalAlerts?: number })) {
        lowStockItems = safeNum((val as { totalAlerts?: number }).totalAlerts);
      }
    }

    // Эти метрики заполним позже
    const activeCustomers = 0;
    const appointmentsToday = 0;

    return {
      totalOrders,
      pendingOrders,
      completedOrders: completed,
      totalRevenue,
      monthlyRevenue,
      lowStockItems,
      activeCustomers,
      appointmentsToday,
    };
  }

  async getRecentOrders(): Promise<DashboardData["recentOrders"]> {
    try {
      const data = await apiRequest<Paginated<OrderItem>>("/orders?limit=5")

      return (data.items || []).map((o) => {
        const customerName =
          safeText(o.customer?.companyName) ||
          joinText([o.customer?.firstName, o.customer?.lastName], " ") ||
          safeText(o.customer?.fullName) ||
          safeText(o.customer?.name) ||
          "Клиент"

        const brandName = safeText(o.vehicle?.model?.brand?.name)
        const modelName = safeText(o.vehicle?.model?.name)
        const plate = safeText(o.vehicle?.licensePlate ?? o.vehicle?.plateNumber)

        const vehicleInfo = joinText([brandName, modelName, plate], " • ") || "ТС"

        const amount = safeNum(o.finalAmount ?? o.totalAmount ?? 0)

        return {
          id: o.id,
          orderNumber: safeText(o.orderNumber) || undefined,
          customerName,
          vehicleInfo,
          status: safeText(o.status) || "draft",
          amount,
          createdAt: (o.createdAt as any) || "",
        }
      })
    } catch {
      return []
    }
  }

  async getLowStockAlerts(): Promise<DashboardData['lowStockAlerts']> {
    try {
      const data = await apiRequest<LowStockApi>('/inventory/alerts/low-stock');

      // Новая форма: alerts[]
      if ('alerts' in data && Array.isArray((data as { alerts?: unknown[] }).alerts)) {
        const alerts = (data as { alerts: LowStockItemApi[] }).alerts;
        return alerts.map((it) => ({
          id: String(it.partId),
          partName: it.partName,
          currentStock: safeNum(it.currentQuantity),
          minThreshold: safeNum(it.minQuantity),
          supplier: '',
        }));
      }

      // Fallback: items[]
      if ('items' in data && Array.isArray((data as { items?: unknown[] }).items)) {
        const items = (data as { items: LegacyLowStockItem[] }).items;
        return items.map((it) => ({
          id: String(it.id ?? it.partId ?? Math.random()),
          partName: String(it.partName ?? it.name ?? 'Запчасть'),
          currentStock: safeNum(it.currentStock ?? it.stock ?? 0),
          minThreshold: safeNum(it.minThreshold ?? it.minStock ?? 0),
          supplier: String(it.supplier?.name ?? it.supplierName ?? ''),
        }));
      }

      return [];
    } catch {
      return [];
    }
  }

  async getDashboardData(): Promise<DashboardData> {
    const [stats, recentOrders, lowStockAlerts] = await Promise.all([
      this.getStats(),
      this.getRecentOrders(),
      this.getLowStockAlerts(),
    ]);

    return {
      stats,
      recentOrders,
      recentActivities: [],
      lowStockAlerts,
    };
  }

  async getDashboardDataSafe(): Promise<DashboardData | null> {
    try {
      return await this.getDashboardData();
    } catch (error: unknown) {
      console.error('Dashboard API Error:', error);
      return null;
    }
  }

  async getStatsSafe(): Promise<DashboardStats | null> {
    try {
      return await this.getStats();
    } catch (error: unknown) {
      console.error('Dashboard API Error:', error);
      return null;
    }
  }

  async getRecentOrdersSafe(): Promise<DashboardData['recentOrders']> {
    try {
      return await this.getRecentOrders();
    } catch (error: unknown) {
      console.error('Error fetching recent orders:', error);
      return [];
    }
  }

  async getLowStockAlertsSafe(): Promise<DashboardData['lowStockAlerts']> {
    try {
      return await this.getLowStockAlerts();
    } catch (error: unknown) {
      console.error('Error fetching low stock alerts:', error);
      return [];
    }
  }
}

export const dashboardAPI = new DashboardAPI();
export type { DashboardData, DashboardStats };
