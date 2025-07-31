// src/modules/orders/constants/orders.constants.ts
import { OrderStatus } from '../types/orders.types';

export const ORDERS_CONSTANTS = {
  DEFAULTS: {
    PAGE_SIZE: 20,
    MAX_ITEMS: 100,
    STATUS: OrderStatus.NEW,
    TAX_RATE: 0.18, // 18% НДС
  },

  VALIDATION: {
    ORDER_NUMBER: {
      MIN_LENGTH: 10,
      MAX_LENGTH: 50,
      PATTERN: /^ORD-\d{4}-\d{5}$/, // ORD-YYYY-NNNNN
    },
    DESCRIPTION: {
      MAX_LENGTH: 1000,
    },
    CUSTOMER_COMPLAINTS: {
      MAX_LENGTH: 2000,
    },
    DIAGNOSTIC_RESULTS: {
      MAX_LENGTH: 2000,
    },
    MILEAGE: {
      MIN: 0,
      MAX: 9999999, // 9,999,999 км
    },
  },

  STATUS_TRANSITIONS: {
    [OrderStatus.NEW]: [OrderStatus.IN_PROGRESS, OrderStatus.CANCELED],
    [OrderStatus.IN_PROGRESS]: [OrderStatus.AWAITING_PARTS, OrderStatus.COMPLETED, OrderStatus.CANCELED],
    [OrderStatus.AWAITING_PARTS]: [OrderStatus.IN_PROGRESS, OrderStatus.CANCELED],
    [OrderStatus.COMPLETED]: [], // Завершенный заказ нельзя изменить
    [OrderStatus.CANCELED]: [], // Отмененный заказ нельзя изменить
  } as const,

  ROLES: {
    CAN_CREATE: ['owner', 'admin', 'manager'],
    CAN_UPDATE: ['owner', 'admin', 'manager'],
    CAN_DELETE: ['owner', 'admin'],
    CAN_ASSIGN_MECHANIC: ['owner', 'admin', 'manager'],
    CAN_CHANGE_STATUS: ['owner', 'admin', 'manager', 'mechanic'],
    CAN_VIEW_ALL: ['owner', 'admin', 'manager'],
    CAN_VIEW_ASSIGNED: ['mechanic'],
  },

  AUDIT_ACTIONS: {
    CREATED: 'order_created',
    UPDATED: 'order_updated',
    STATUS_CHANGED: 'order_status_changed',
    MECHANIC_ASSIGNED: 'order_mechanic_assigned',
    CANCELED: 'order_canceled',
    COMPLETED: 'order_completed',
    FINANCIALS_RECALCULATED: 'order_financials_recalculated',
    VIEWED: 'order_viewed',
  },

  BUSINESS_RULES: {
    AUTO_COMPLETE_ON_ALL_SERVICES_DONE: true,
    REQUIRE_MECHANIC_FOR_IN_PROGRESS: true,
    ALLOW_EDIT_COMPLETED_ORDERS: false,
    AUTO_CALCULATE_TAX: true,
    SEND_NOTIFICATIONS_ON_STATUS_CHANGE: true,
  },
} as const;
