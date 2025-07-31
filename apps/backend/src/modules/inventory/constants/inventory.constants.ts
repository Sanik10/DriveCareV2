// src/modules/inventory/constants/inventory.constants.ts
export const INVENTORY_CONSTANTS = {
  DEFAULTS: {
    PAGE_SIZE: 25,
    MAX_ITEMS: 100,
    MIN_QUANTITY: 0,
    LOW_STOCK_THRESHOLD: 5,
    RESERVATION_EXPIRY_HOURS: 24,
  },

  VALIDATION: {
    QUANTITY: {
      MIN: 0,
      MAX: 999999,
    },
    MIN_QUANTITY: {
      MIN: 0,
      MAX: 1000,
    },
    LOCATION: {
      MAX_LENGTH: 100,
      PATTERN: /^[A-Z0-9-]+$/, // A1-B2, SHELF-1, etc.
    },
    NOTES: {
      MAX_LENGTH: 500,
    },
  },

  STOCK_MOVEMENTS: {
    TYPES: {
      RECEIPT: 'receipt',           // Приход товара
      ISSUE: 'issue',              // Расход товара
      ADJUSTMENT: 'adjustment',     // Инвентаризация
      TRANSFER: 'transfer',        // Перемещение
      RESERVATION: 'reservation',   // Резервирование
      RELEASE: 'release',          // Освобождение резерва
    } as const,
    
    REASONS: {
      PURCHASE: 'purchase',         // Закупка
      ORDER_FULFILLMENT: 'order_fulfillment', // Выполнение заказа
      INVENTORY_COUNT: 'inventory_count',      // Инвентаризация
      DAMAGE: 'damage',            // Брак/повреждение
      EXPIRY: 'expiry',           // Истечение срока
      LOSS: 'loss',               // Потеря
      CORRECTION: 'correction',    // Корректировка
    } as const,
  },

  ALERTS: {
    TYPES: {
      LOW_STOCK: 'low_stock',
      OUT_OF_STOCK: 'out_of_stock',
      OVERSTOCK: 'overstock',
      EXPIRED_RESERVATION: 'expired_reservation',
    } as const,
    
    PRIORITIES: {
      LOW: 'low',
      MEDIUM: 'medium',
      HIGH: 'high',
      CRITICAL: 'critical',
    } as const,
    
    AUTO_DISMISS_HOURS: 72,
  },

  BUSINESS_RULES: {
    ALLOW_NEGATIVE_STOCK: false,
    AUTO_CREATE_ALERTS: true,
    AUTO_EXPIRE_RESERVATIONS: true,
    REQUIRE_LOCATION: false,
    TRACK_COST_PRICE: true,
    ENABLE_BARCODE_SCANNING: true,
  },

  ROLES: {
    CAN_VIEW: ['owner', 'admin', 'manager', 'mechanic'],
    CAN_UPDATE_QUANTITIES: ['owner', 'admin', 'manager'],
    CAN_UPDATE_SETTINGS: ['owner', 'admin'],
    CAN_DELETE: ['owner', 'admin'],
    CAN_CREATE_ADJUSTMENTS: ['owner', 'admin', 'manager'],
    CAN_VIEW_COSTS: ['owner', 'admin'],
    CAN_MANAGE_SUPPLIERS: ['owner', 'admin', 'manager'],
  },

  AUDIT_ACTIONS: {
    QUANTITY_UPDATED: 'inventory_quantity_updated',
    SETTINGS_UPDATED: 'inventory_settings_updated',
    STOCK_RECEIVED: 'stock_received',
    STOCK_ISSUED: 'stock_issued',
    STOCK_ADJUSTED: 'stock_adjusted',
    RESERVATION_CREATED: 'reservation_created',
    RESERVATION_RELEASED: 'reservation_released',
    ALERT_CREATED: 'inventory_alert_created',
    ALERT_DISMISSED: 'inventory_alert_dismissed',
  },

  REPORTS: {
    TURNOVER_PERIODS: {
      DAILY: 'daily',
      WEEKLY: 'weekly', 
      MONTHLY: 'monthly',
      QUARTERLY: 'quarterly',
      YEARLY: 'yearly',
    } as const,
    
    MAX_EXPORT_RECORDS: 10000,
    DEFAULT_PERIOD_DAYS: 30,
  },
} as const;

// 🔥 ИСПРАВЛЕНИЕ: Правильный экспорт типов
export type StockMovementType = typeof INVENTORY_CONSTANTS.STOCK_MOVEMENTS.TYPES[keyof typeof INVENTORY_CONSTANTS.STOCK_MOVEMENTS.TYPES];
export type StockMovementReason = typeof INVENTORY_CONSTANTS.STOCK_MOVEMENTS.REASONS[keyof typeof INVENTORY_CONSTANTS.STOCK_MOVEMENTS.REASONS];
export type AlertType = typeof INVENTORY_CONSTANTS.ALERTS.TYPES[keyof typeof INVENTORY_CONSTANTS.ALERTS.TYPES];
export type AlertPriority = typeof INVENTORY_CONSTANTS.ALERTS.PRIORITIES[keyof typeof INVENTORY_CONSTANTS.ALERTS.PRIORITIES]; // ✅ ЭКСПОРТИРУЕМ
export type TurnoverPeriod = typeof INVENTORY_CONSTANTS.REPORTS.TURNOVER_PERIODS[keyof typeof INVENTORY_CONSTANTS.REPORTS.TURNOVER_PERIODS];
