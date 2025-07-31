// src/modules/orders/order-parts/types/order-parts.types.ts

// 📋 Интерфейсы для работы с данными
export interface AddPartToOrderData {
  orderId: string;
  partId: string;
  price: number;
  quantity: number;
  discountPercent: number;
  totalAmount: number;
  isCustomerProvided: boolean;
  customPrice?: number;
}

export interface UpdateOrderPartData {
  quantity?: number;
  price?: number;
  discountPercent?: number;
  totalAmount?: number;
  isCustomerProvided?: boolean;
}

// 📊 Интерфейсы для статистики
export interface OrderPartsStats {
  orderId: string;
  totalParts: number;
  customerProvidedParts: number;
  ourParts: number;
  totalAmount: number;
  needsInventoryCheck: boolean;
  lowStockWarnings: string[];
}

export interface PartAvailabilityInfo {
  partId: string;
  partName: string;
  available: number;
  reserved: number;
  inCurrentOrder: number;
  canAddToOrder: boolean;
  maxQuantity: number;
  lowStock: boolean;
  minQuantity: number;
}

export interface BulkAddPartsData {
  orderId: string;
  parts: Array<{
    partId: string;
    quantity?: number;
    customPrice?: number;
    discountPercent?: number;
    isCustomerProvided?: boolean;
  }>;
}

export interface BulkAddPartsResult {
  orderId: string;
  addedParts: string[];
  failedParts: Array<{
    partId: string;
    error: string;
    reason: 'NOT_FOUND' | 'INSUFFICIENT_STOCK' | 'VALIDATION_ERROR' | 'ALREADY_EXISTS';
  }>;
  totalAmount: number;
  inventoryUpdated: boolean;
}

export interface OrderPartFilter {
  orderId?: string;
  partId?: string;
  isCustomerProvided?: boolean;
  priceFrom?: number;
  priceTo?: number;
  categoryId?: string;
}

export interface PartFinancialSummary {
  partId: string;
  partName: string;
  quantity: number;
  basePrice: number;
  discountPercent: number;
  discountAmount: number;
  finalAmount: number;
  isCustomerProvided: boolean;
  margin?: number;
}

export interface InventoryReservation {
  partId: string;
  orderId: string;
  quantity: number;
  reservedAt: Date;
  expiresAt?: Date;
}

export interface PartCategoryDistribution {
  categoryId: string;
  categoryName: string;
  partCount: number;
  totalAmount: number;
  averagePrice: number;
}

export const ORDER_PARTS_CONSTRAINTS = {
  MAX_QUANTITY_PER_PART: 1000,
  MAX_DISCOUNT_PERCENT: 100,
  MAX_PARTS_PER_ORDER: 100,
  RESERVATION_EXPIRY_HOURS: 24,
  MIN_STOCK_WARNING_THRESHOLD: 5,
} as const;

export type OrderPartSortField = 
  | 'partName'
  | 'quantity'
  | 'totalAmount'
  | 'isCustomerProvided'
  | 'createdAt'
  | 'category';

export type SortOrder = 'asc' | 'desc';

// 🔄 Интерфейсы для workflow
export interface PartReservationRequest {
  partId: string;
  quantity: number;
  orderId: string;
  expiryHours?: number;
}

export interface PartReservationResponse {
  success: boolean;
  reservedQuantity: number;
  availableQuantity: number;
  reservationId?: string;
  message: string;
}

// 📊 Интерфейсы для отчетности
export interface PartUsageReport {
  partId: string;
  partName: string;
  totalOrders: number;
  totalQuantityUsed: number;
  averageQuantityPerOrder: number;
  totalRevenue: number;
  averagePrice: number;
  popularityRank: number;
}

export interface InventoryImpactReport {
  orderId: string;
  partsReserved: Array<{
    partId: string;
    partName: string;
    quantityReserved: number;
    remainingStock: number;
    needsRestock: boolean;
  }>;
  totalPartsReserved: number;
  lowStockAlerts: string[];
}
