// src/modules/inventory/types/inventory.types.ts
import { StockMovementType, StockMovementReason, AlertType, AlertPriority, TurnoverPeriod } from '../constants/inventory.constants';

// 📋 Основные интерфейсы для работы с данными
export interface InventoryFilter {
  companyId?: string;        // 🔒 Для security фильтрации
  partId?: string;
  categoryId?: string;
  lowStock?: boolean;
  location?: string;
  search?: string;          // Поиск по названию или номеру запчасти
  minQuantity?: number;
  maxQuantity?: number;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
  sortField?: InventorySortField;
  sortOrder?: SortOrder;
}

export interface UpdateInventoryData {
  quantity?: number;
  minQuantity?: number;
  location?: string;
  lastRestockDate?: Date;
  notes?: string;
}

// 📊 Статистика и отчеты
export interface StockSummary {
  companyId: string;
  totalParts: number;
  totalValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  averagePartValue: number;
  topCategories: Array<{
    categoryId: string;
    categoryName: string;
    partCount: number;
    totalValue: number;
  }>;
  recentMovements: number; // За последние 7 дней
}

export interface LowStockAlert {
  partId: string;
  partName: string;
  partNumber?: string;
  currentQuantity: number;
  minQuantity: number;
  shortage: number;
  categoryName: string;
  location?: string;
  lastMovementDate?: Date;
  priority: AlertPriority;
  estimatedRunOutDays?: number;
}

// 🔄 Резервирование
export interface PartReservation {
  id: string;
  partId: string;
  companyId: string;
  orderId?: string;
  quantity: number;
  reservedBy: string;
  reservedAt: Date;
  expiresAt?: Date;
  status: 'active' | 'expired' | 'released' | 'fulfilled';
  notes?: string;
}

export interface ReservationRequest {
  partId: string;
  quantity: number;
  orderId?: string;
  expiresAt?: Date;
  notes?: string;
}

export interface ReservationResponse {
  success: boolean;
  reservationId?: string;
  message: string;
  availableQuantity: number;
  reservedQuantity: number;
}

// 📈 Движения по складу
export interface StockMovementData {
  partId: string;
  companyId: string;
  type: StockMovementType;
  reason: StockMovementReason;
  quantity: number;           // Положительное для прихода, отрицательное для расхода
  previousQuantity: number;
  newQuantity: number;
  unitCost?: number;
  totalCost?: number;
  supplierId?: string;
  orderId?: string;
  userId: string;
  notes?: string;
  documentNumber?: string;    // Номер накладной, счета и т.д.
  movementDate?: Date;
}

export interface StockMovementFilter {
  companyId?: string;
  partId?: string;
  type?: StockMovementType;
  reason?: StockMovementReason;
  userId?: string;
  orderId?: string;
  supplierId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}

// 📊 Анализ оборачиваемости
export interface TurnoverAnalysis {
  partId: string;
  partName: string;
  categoryName: string;
  averageStock: number;
  totalIssued: number;
  totalReceived: number;
  turnoverRatio: number;      // Количество оборотов
  daysInStock: number;        // Средние дни на складе
  velocity: 'fast' | 'medium' | 'slow' | 'dead'; // Скорость оборачиваемости
  recommendation: string;     // Рекомендация по управлению
}

export interface TurnoverReportParams {
  companyId: string;
  period: TurnoverPeriod;
  dateFrom?: Date;
  dateTo?: Date;
  categoryId?: string;
  minTurnoverRatio?: number;
  maxTurnoverRatio?: number;
}

// 🚨 Уведомления и алерты
export interface InventoryAlertData {
  companyId: string;
  partId: string;
  type: AlertType;
  priority: AlertPriority;
  title: string;
  message: string;
  currentQuantity?: number;
  thresholdQuantity?: number;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

export interface AlertFilter {
  companyId?: string;
  partId?: string;
  type?: AlertType;
  priority?: AlertPriority;
  isActive?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
}

// 👥 Поставщики
export interface SupplierData {
  companyId: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  taxNumber?: string;
  paymentTerms?: string;
  deliveryTerms?: string;
  isActive: boolean;
  notes?: string;
}

export interface SupplierFilter {
  companyId?: string;
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

// 📦 Для интеграции с другими модулями
export interface PartAvailabilityCheck {
  partId: string;
  requestedQuantity: number;
  availableQuantity: number;
  canFulfill: boolean;
  shortageQuantity?: number;
  alternativeParts?: string[]; // ID альтернативных запчастей
  estimatedRestockDate?: Date;
}

export interface BulkPartAvailability {
  orderId?: string;
  parts: Array<{
    partId: string;
    quantity: number;
  }>;
  results: Array<PartAvailabilityCheck>;
  overallCanFulfill: boolean;
  totalShortage: number;
}

// 📊 Аналитика по локациям
export interface LocationAnalysis {
  location: string;
  partCount: number;
  totalValue: number;
  utilizationRate: number;    // Процент заполненности
  accessFrequency: number;    // Частота обращений
  recommendation: 'optimize' | 'relocate' | 'expand' | 'maintain';
}

// 🔍 Поиск и фильтрация
export type InventorySortField = 
  | 'partName'
  | 'quantity'
  | 'minQuantity'
  | 'location'
  | 'lastRestockDate'
  | 'totalValue'
  | 'turnoverRatio'
  | 'categoryName';

export type SortOrder = 'asc' | 'desc';

// 📊 Пагинация
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// 🎯 Constraints и лимиты
export const INVENTORY_CONSTRAINTS = {
  MAX_QUANTITY: 999999,
  MAX_MIN_QUANTITY: 1000,
  MAX_LOCATION_LENGTH: 100,
  MAX_NOTES_LENGTH: 500,
  MAX_RESERVATIONS_PER_PART: 50,
  RESERVATION_EXPIRY_HOURS: 24,
  MAX_MOVEMENT_HISTORY_DAYS: 365,
} as const;

// 🔄 Статусы и состояния
export type InventoryStatus = 'in_stock' | 'low_stock' | 'out_of_stock' | 'overstock';
export type ReservationStatus = 'active' | 'expired' | 'released' | 'fulfilled';
export type MovementStatus = 'pending' | 'completed' | 'cancelled';

// 🎨 Для UI компонентов
export interface InventoryDisplayItem {
  id: string;
  partName: string;
  partNumber?: string;
  quantity: number;
  minQuantity: number;
  status: InventoryStatus;
  location?: string;
  categoryName: string;
  lastMovement?: Date;
  value: number;
  lowStockWarning: boolean;
}

// 📱 Мобильные интерфейсы
export interface QuickStockUpdate {
  partId: string;
  quantityChange: number;     // +/- изменение
  reason: StockMovementReason;
  notes?: string;
  scanData?: {               // Для сканера штрих-кодов
    barcode: string;
    scannedAt: Date;
  };
}

export type { AlertPriority, AlertType, StockMovementType, StockMovementReason, TurnoverPeriod };