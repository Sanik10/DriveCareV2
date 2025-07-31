// src/modules/inventory/stock-movements/types/stock-movements.types.ts
import { StockMovementType, StockMovementReason } from '../../constants/inventory.constants';

// 📋 Основные интерфейсы
export interface StockMovementFilter {
  companyId?: string;        // 🔒 Security фильтрация
  partId?: string;
  type?: StockMovementType;
  reason?: StockMovementReason;
  userId?: string;           // Кто создал движение
  orderId?: string;          // Связь с заказом
  supplierId?: string;       // Связь с поставщиком
  documentNumber?: string;   // Номер документа
  dateFrom?: Date;
  dateTo?: Date;
  minQuantity?: number;
  maxQuantity?: number;
  search?: string;           // Поиск по названию запчасти или номеру документа
  page?: number;
  limit?: number;
  sortField?: MovementSortField;
  sortOrder?: SortOrder;
}

export interface CreateMovementData {
  companyId: string;
  partId: string;
  type: StockMovementType;
  reason: StockMovementReason;
  quantity: number;          // Положительное для прихода, отрицательное для расхода
  price?: number;            // Цена за единицу
  totalAmount?: number;      // Общая сумма
  orderId?: string;
  supplierId?: string;
  documentNumber?: string;
  notes?: string;
  userId: string;            // Кто создает движение
  movementDate?: Date;       // По умолчанию - текущая дата
}

export interface UpdateMovementData {
  price?: number;
  totalAmount?: number;
  documentNumber?: string;
  notes?: string;
}

// 🔄 Batch операции - ЕДИНСТВЕННОЕ определение
export interface BulkMovementRequest {
  movements: Array<{
    partId: string;
    type: StockMovementType;
    reason: StockMovementReason;
    quantity: number;
    price?: number;
    notes?: string;
  }>;
  documentNumber?: string;  // Общий номер документа для всех движений
  supplierId?: string;      // Для массового прихода от поставщика
  orderId?: string;         // Для массового расхода по заказу
  globalNotes?: string;     // Общие заметки
}

export interface BulkMovementResponse {
  successCount: number;
  failureCount: number;
  results: Array<{
    partId: string;
    success: boolean;
    movementId?: string;
    error?: string;
  }>;
  totalValue: number;
}

// 📊 Аналитические интерфейсы
export interface MovementSummary {
  companyId: string;
  period: {
    from: Date;
    to: Date;
  };
  totalMovements: number;
  receipts: {
    count: number;
    totalQuantity: number;
    totalValue: number;
  };
  issues: {
    count: number;
    totalQuantity: number;
    totalValue: number;
  };
  adjustments: {
    count: number;
    positiveAdjustments: number;
    negativeAdjustments: number;
  };
  topParts: Array<{
    partId: string;
    partName: string;
    movementCount: number;
    netQuantity: number;  // Приход - расход
  }>;
}

export interface PartMovementHistory {
  partId: string;
  partName: string;
  movements: Array<{
    id: string;
    type: StockMovementType;
    reason: StockMovementReason;
    quantity: number;
    runningBalance: number;  // Остаток после операции
    date: Date;
    documentNumber?: string;
    createdBy: string;
  }>;
  currentStock: number;
  totalReceived: number;
  totalIssued: number;
}

// 📱 Мобильные операции
export interface QuickMovementRequest {
  barcode?: string;         // Штрих-код запчасти
  partId?: string;          // Или прямой ID
  quantity: number;
  type: StockMovementType;
  reason: StockMovementReason;
  location?: string;        // Текущая локация
  notes?: string;
}

export interface BarcodeMovementRequest {
  barcode: string;
  quantity: number;
  type: 'receipt' | 'issue';  // Упрощенные типы для мобильного
  location?: string;
  notes?: string;
}

// 📊 Отчеты и аналитика
export interface MovementTrends {
  daily: Array<{
    date: string;
    receipts: number;
    issues: number;
    adjustments: number;
  }>;
  weekly: Array<{
    week: string;
    receipts: number;
    issues: number;
    net: number;
  }>;
  monthly: Array<{
    month: string;
    receipts: number;
    issues: number;
    net: number;
    value: number;
  }>;
}

export interface CategoryMovementAnalysis {
  categoryId: string;
  categoryName: string;
  totalMovements: number;
  receipts: number;
  issues: number;
  netMovement: number;
  valueMovement: number;
  topParts: Array<{
    partId: string;
    partName: string;
    movements: number;
  }>;
}

// 🎯 Фильтры и сортировка
export type MovementSortField = 
  | 'createdAt'
  | 'type'
  | 'quantity'
  | 'totalAmount'
  | 'partName'
  | 'documentNumber'
  | 'createdBy';

export type SortOrder = 'asc' | 'desc';

// 🚨 Валидация и ошибки
export interface MovementValidationError {
  field: string;
  message: string;
  currentValue?: any;
  expectedValue?: any;
}

export interface StockImpactAnalysis {
  partId: string;
  currentStock: number;
  requestedQuantity: number;
  newStock: number;
  wouldGoNegative: boolean;
  wouldTriggerAlert: boolean;
  impactLevel: 'low' | 'medium' | 'high' | 'critical';
}

// 🔄 Integration интерфейсы
export interface OrderMovementIntegration {
  orderId: string;
  orderNumber: string;
  parts: Array<{
    partId: string;
    quantityUsed: number;
    quantityReturned?: number;
  }>;
  totalMovements: number;
  status: 'pending' | 'completed' | 'partially_completed';
}

export interface SupplierDeliveryIntegration {
  supplierId: string;
  supplierName: string;
  deliveryNumber: string;
  deliveryDate: Date;
  parts: Array<{
    partId: string;
    quantityOrdered: number;
    quantityReceived: number;
    unitPrice: number;
  }>;
  totalValue: number;
  status: 'pending' | 'received' | 'partial';
}

// 📋 Constants
export const STOCK_MOVEMENT_CONSTRAINTS = {
  MAX_QUANTITY: 99999,
  MAX_BULK_OPERATIONS: 100,
  MAX_NOTES_LENGTH: 500,
  MAX_DOCUMENT_NUMBER_LENGTH: 50,
  MOVEMENT_RETENTION_DAYS: 2555, // 7 лет для аудита
} as const;

// 🎨 UI Helper types
export interface MovementDisplayItem {
  id: string;
  partName: string;
  partNumber?: string;
  type: StockMovementType;
  typeDisplay: string;
  reason: StockMovementReason;
  reasonDisplay: string;
  quantity: number;
  quantityDisplay: string;      // "+5" или "-3"
  price?: number;
  totalAmount?: number;
  documentNumber?: string;
  createdAt: Date;
  createdBy: string;
  notes?: string;
  impactLevel: 'positive' | 'negative' | 'neutral';
}
