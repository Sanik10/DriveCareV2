// src/modules/inventory/suppliers/types/suppliers.types.ts

// 📋 Основные интерфейсы для работы с данными
export interface SupplierFilter {
  companyId?: string;        // 🔒 Для security фильтрации
  search?: string;           // Поиск по названию, email, телефону
  isActive?: boolean;        // Фильтр по активности
  hasRecentDeliveries?: boolean; // Поставщики с недавними поставками
  minRating?: number;        // Минимальный рейтинг
  city?: string;            // Фильтр по городу
  country?: string;         // Фильтр по стране
  supplierType?: SupplierType; // Тип поставщика
  paymentTerms?: string;    // Условия оплаты
  page?: number;
  limit?: number;
  sortField?: SupplierSortField;
  sortOrder?: SortOrder;
}

export interface CreateSupplierData {
  companyId: string;         
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  website?: string;
  taxNumber?: string;
  supplierType: SupplierType;
  paymentTerms?: string;
  deliveryTerms?: string;
  notes?: string;
  isActive?: boolean; // ✅ ИСПРАВЛЕНО: сделали опциональным
  createdBy: string;
}

export interface UpdateSupplierData {
  name?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  website?: string;
  taxNumber?: string;
  supplierType?: SupplierType;
  paymentTerms?: string;
  deliveryTerms?: string;
  notes?: string;
  isActive?: boolean;
}

// ⭐ Рейтинговая система
export interface SupplierRatingData {
  qualityRating: number;     // 1-5: Качество товаров
  deliveryRating: number;    // 1-5: Скорость и надежность доставки
  priceRating: number;       // 1-5: Конкурентоспособность цен
  communicationRating?: number; // 1-5: Качество коммуникации
  comment?: string;          // Комментарий к оценке
}

export interface SupplierRating {
  id: string;
  supplierId: string;
  companyId: string;
  ratedBy: string;
  qualityRating: number;
  deliveryRating: number;
  priceRating: number;
  communicationRating?: number;
  averageRating: number;     // Вычисляемое поле
  comment?: string;
  createdAt: Date;
}

export interface SupplierAggregatedRating {
  supplierId: string;
  totalRatings: number;
  averageQuality: number;
  averageDelivery: number;
  averagePrice: number;
  averageCommunication: number;
  overallRating: number;
  lastRatedAt: Date;
}

// 📊 Аналитика поставщика
export interface SupplierAnalytics {
  supplierId: string;
  supplierName: string;
  period: AnalyticsPeriod;
  // Основные метрики
  totalOrders: number;
  totalValue: number;
  averageOrderValue: number;
  // Временные метрики
  averageDeliveryTime: number; // В днях
  onTimeDeliveryRate: number;  // В процентах
  // Качество
  defectRate: number;          // Процент брака
  returnRate: number;          // Процент возвратов
  // Рейтинги
  currentRating: SupplierAggregatedRating;
  ratingTrend: 'improving' | 'stable' | 'declining';
  // Финансовые показатели
  outstandingPayments: number;
  averagePaymentDelay: number; // В днях
  discountRate: number;        // Средний процент скидки
  // Топ товары
  topParts: Array<{
    partId: string;
    partName: string;
    partNumber: string;         // ✅ ДОБАВЛЕНО
    orderCount: number;
    totalValue: number;
    averagePrice: number;
    lastPrice: number;          // ✅ ДОБАВЛЕНО
    priceChange: number;        // ✅ ДОБАВЛЕНО
    lastOrderDate: Date;        // ✅ ДОБАВЛЕНО
  }>;
  // Тренды
  monthlyTrends: Array<{
    month: string;
    ordersCount: number;        // ✅ ИСПРАВЛЕНО с orders на ordersCount
    totalValue: number;         // ✅ ИСПРАВЛЕНО с value на totalValue
    averageRating: number;      // ✅ ИСПРАВЛЕНО с rating на averageRating
    onTimeDeliveryRate: number; // ✅ ДОБАВЛЕНО
    averageDeliveryTime: number;// ✅ ДОБАВЛЕНО
  }>;
}

// 📦 Bulk операции
export interface BulkSupplierOperation {
  operation: 'create' | 'update' | 'deactivate' | 'activate';
  suppliers: Array<BulkSupplierItem>;
  options?: {
    skipValidation?: boolean;
    continueOnError?: boolean;
    notifyOnCompletion?: boolean;
  };
}

export interface BulkSupplierItem {
  // Для идентификации (при update/deactivate)
  id?: string;
  
  // Данные поставщика
  name?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  website?: string;
  taxNumber?: string;
  supplierType?: SupplierType;
  paymentTerms?: string;
  deliveryTerms?: string;
  notes?: string;
  isActive?: boolean;
}

export interface BulkSupplierResult {
  successCount: number;
  failureCount: number;
  results: Array<{
    identifier: string;      // ID, email или taxNumber
    success: boolean;
    supplierId?: string;
    error?: string;
    warnings?: string[];
  }>;
  summary: {
    operation: string;
    totalProcessed: number;
    processingTime: number;  // В миллисекундах
    errors: Record<string, number>; // Группировка ошибок по типам
  };
}

// 💰 Сравнение цен
export interface PartPriceComparison {
  partId: string;
  partName: string;
  suppliers: Array<{
    supplierId: string;
    supplierName: string;
    price: number;
    currency: string;
    deliveryTime: number;    // В днях
    minOrderQuantity: number;
    lastUpdated: Date;
    rating: number;
    isPreferred: boolean;
    hasContract: boolean;
  }>;
  bestPrice: {
    supplierId: string;
    price: number;
    savings: number;         // Экономия по сравнению с самым дорогим
    savingsPercent: number;
  };
  priceRange: {
    min: number;
    max: number;
    average: number;
    median: number;
  };
}

// 🔍 Поиск лучшего поставщика
export interface BestSupplierCriteria {
  partId: string;
  prioritize: 'price' | 'quality' | 'delivery' | 'balanced';
  maxDeliveryTime?: number;
  minRating?: number;
  preferredSuppliers?: string[]; // Предпочтительные поставщики
  excludeSuppliers?: string[];   // Исключить поставщиков
  weights?: {
    priceWeight: number;      // 0-1
    qualityWeight: number;    // 0-1
    deliveryWeight: number;   // 0-1
    reliabilityWeight: number; // 0-1
  };
}

export interface SupplierRecommendation {
  supplierId: string;
  supplierName: string;
  score: number;            // Общий балл 0-100
  price: number;
  rating: number;
  deliveryTime: number;
  reliability: number;      // Процент выполненных в срок заказов
  reasons: string[];        // Причины рекомендации
  warnings: string[];       // Потенциальные проблемы
  alternatives: Array<{
    supplierId: string;
    supplierName: string;
    score: number;
    mainAdvantage: string;
  }>;
}

// 📈 Топ поставщики
export interface TopSupplierMetrics {
  supplierId: string;
  supplierName: string;
  rank: number;
  totalOrders: number;
  totalValue: number;
  averageRating: number;
  onTimeDeliveryRate: number;
  defectRate: number;
  marketShare: number;      // Процент от общих закупок компании
  loyaltyScore: number;     // Как долго работаем с поставщиком
  improvementTrend: 'up' | 'down' | 'stable';
}

// 🔄 Интеграция с другими модулями
export interface SupplierOrderIntegration {
  supplierId: string;
  orderId: string;
  deliveryDate: Date;
  actualDeliveryDate?: Date;
  isOnTime: boolean;
  parts: Array<{
    partId: string;
    orderedQuantity: number;
    deliveredQuantity: number;
    unitPrice: number;
    defectiveQuantity?: number;
  }>;
  totalValue: number;
  status: 'pending' | 'shipped' | 'delivered' | 'cancelled';
}

export interface SupplierPaymentIntegration {
  supplierId: string;
  invoiceId: string;
  amount: number;
  currency: string;
  dueDate: Date;
  paidDate?: Date;
  status: 'pending' | 'paid' | 'overdue' | 'disputed';
  paymentMethod: string;
  discountApplied?: number;
}

// 📱 Мобильные интерфейсы
export interface QuickSupplierInfo {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  rating: number;
  isActive: boolean;
  lastOrderDate?: Date;
  preferredContact: 'phone' | 'email' | 'whatsapp';
}

export interface SupplierContactAttempt {
  supplierId: string;
  contactMethod: 'phone' | 'email' | 'whatsapp' | 'sms';
  contactedBy: string;
  reason: string;
  notes?: string;
  responseReceived: boolean;
  followUpRequired: boolean;
  createdAt: Date;
}

// 🎯 Фильтры и сортировка
export type SupplierSortField = 
  | 'name'
  | 'rating'
  | 'totalOrders'
  | 'totalValue'
  | 'lastOrderDate'
  | 'createdAt'
  | 'city'
  | 'onTimeDeliveryRate';

export type SortOrder = 'asc' | 'desc';

export type SupplierType = 
  | 'manufacturer'    // Производитель
  | 'distributor'     // Дистрибьютор
  | 'wholesaler'      // Оптовик
  | 'retailer'        // Розничный продавец
  | 'service_provider' // Поставщик услуг
  | 'other';          // Другое

export type AnalyticsPeriod = 'month' | 'quarter' | 'year';

// 📊 Constraints и лимиты
export const SUPPLIER_CONSTRAINTS = {
  MAX_NAME_LENGTH: 255,
  MAX_CONTACT_NAME_LENGTH: 100,
  MAX_EMAIL_LENGTH: 255,
  MAX_PHONE_LENGTH: 50,
  MAX_ADDRESS_LENGTH: 500,
  MAX_WEBSITE_LENGTH: 255,
  MAX_TAX_NUMBER_LENGTH: 50,
  MAX_NOTES_LENGTH: 1000,
  MAX_PAYMENT_TERMS_LENGTH: 200,
  MAX_DELIVERY_TERMS_LENGTH: 200,
  MIN_RATING: 1,
  MAX_RATING: 5,
  MAX_BULK_OPERATIONS: 100,
  MAX_SUPPLIERS_PER_COMPANY: 500, // Лимит по тарифу
  RATING_RETENTION_MONTHS: 24,     // Сколько хранить старые рейтинги
} as const;

// 🔄 Статусы и состояния
export type SupplierStatus = 'active' | 'inactive' | 'suspended' | 'blocked';
export type DeliveryStatus = 'pending' | 'shipped' | 'delivered' | 'delayed' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'overdue' | 'disputed' | 'cancelled';

// 🎨 Для UI компонентов
export interface SupplierDisplayItem {
  id: string;
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  city?: string;
  rating: number;
  totalOrders: number;
  totalValue: number;
  lastOrderDate?: Date;
  isActive: boolean;
  supplierType: SupplierType;
  onTimeDeliveryRate: number;
  preferredBadge?: string; // "Надежный", "Выгодный", "Быстрый"
}

// ✅ ИСПРАВЛЕНО: Убрали дублирующиеся экспорты в конце файла
