// src/modules/orders/constants/orders.constants.ts
import { OrderStatus } from '../types/orders.types';

export const ORDERS_CONSTANTS = {
  DEFAULTS: {
    PAGE_SIZE: 20,
    MAX_ITEMS: 100,
    STATUS: OrderStatus.NEW,
    TAX_RATE: 0.18,
  },

  VALIDATION: {
    ORDER_NUMBER: {
      MIN_LENGTH: 10,
      MAX_LENGTH: 50,
      PATTERN: /^ORD-\d{4}-\d{5}$/,
    },
    DESCRIPTION: { MAX_LENGTH: 1000 },
    CUSTOMER_COMPLAINTS: { MAX_LENGTH: 2000 },
    DIAGNOSTIC_RESULTS: { MAX_LENGTH: 2000 },
    MILEAGE: { MIN: 0, MAX: 9_999_999 },
  },

  STATUS_TRANSITIONS: {
    [OrderStatus.NEW]: [OrderStatus.IN_PROGRESS, OrderStatus.CANCELED],
    [OrderStatus.IN_PROGRESS]: [OrderStatus.AWAITING_PARTS, OrderStatus.COMPLETED, OrderStatus.CANCELED],
    [OrderStatus.AWAITING_PARTS]: [OrderStatus.IN_PROGRESS, OrderStatus.CANCELED],
    [OrderStatus.COMPLETED]: [],
    [OrderStatus.CANCELED]: [],
  } as Record<OrderStatus, OrderStatus[]>,

  ROLES: {
    CAN_CREATE: ['company_owner', 'company_admin', 'manager'],
    CAN_UPDATE: ['company_owner', 'company_admin', 'manager'],
    CAN_DELETE: ['company_owner', 'company_admin'],
    CAN_ASSIGN_MECHANIC: ['company_owner', 'company_admin', 'manager', 'lead_mechanic'],
    CAN_CHANGE_STATUS: ['company_owner', 'company_admin', 'manager', 'mechanic', 'lead_mechanic', 'service_advisor'],
    CAN_VIEW_ALL: ['company_owner', 'company_admin', 'manager', 'mechanic', 'lead_mechanic', 'service_advisor'],
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

  ALLOWED_UPDATE_FIELDS: [
    'status',
    'assignedTo',
    'description',
    'customerComplaints',
    'diagnosticResults',
    'mileage',
    'estimatedCompletionTime',
    'actualCompletionTime',
    'discountAmount',
  ] as const,
} as const;
