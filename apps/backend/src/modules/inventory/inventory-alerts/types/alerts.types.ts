// src/modules/inventory/inventory-alerts/types/alerts.types.ts
import { AlertType, AlertPriority } from '../../constants/inventory.constants';

export interface AlertFilter {
  companyId?: string;        // 🔒 Security фильтрация
  partId?: string;
  type?: AlertType;
  priority?: AlertPriority;
  isActive?: boolean;
  isDismissed?: boolean;
  createdFrom?: Date;
  createdTo?: Date;
  categoryId?: string;
  search?: string;           // Поиск по названию запчасти
  page?: number;
  limit?: number;
  sortField?: AlertSortField;
  sortOrder?: SortOrder;
}

export interface CreateAlertData {
  companyId: string;
  partId: string;
  type: AlertType;
  priority: AlertPriority;
  title: string;
  message: string;
  currentQuantity?: number;
  thresholdQuantity?: number;
  metadata?: AlertMetadata;
  triggeredBy?: string;       // ID пользователя или системы
}

export interface UpdateAlertData {
  priority?: AlertPriority;
  title?: string;
  message?: string;
  isDismissed?: boolean;
  isActive?: boolean; // 🔥 ДОБАВЛЕНО
  dismissedBy?: string;
  dismissedAt?: Date;
  metadata?: Record<string, any>; // 🔥 ИСПРАВЛЕНО: упрощенный тип вместо AlertMetadata
}

export interface AlertMetadata {
  // Для low_stock
  shortage?: number;
  estimatedRunOutDays?: number;
  lastMovementDate?: Date;
  
  // Для overstock  
  excessQuantity?: number;
  averageUsage?: number;
  
  // Для expired_reservation
  reservationId?: string;
  expiryDate?: Date;
  
  // Общие
  automaticallyCreated?: boolean;
  relatedMovementId?: string;
  supplierSuggestions?: string[];
}

export interface AlertSettings {
  companyId: string;
  userId?: string;           // Персональные настройки пользователя
  
  // Уведомления
  enableEmailNotifications: boolean;
  enablePushNotifications: boolean;
  emailAddresses: string[];
  
  // Пороги для алертов
  lowStockThreshold: number;
  criticalStockThreshold: number;
  overstockMultiplier: number;    // Во сколько раз больше мин. остатка
  
  // Типы алертов
  enabledAlertTypes: AlertType[];
  alertFrequency: 'immediate' | 'hourly' | 'daily';
  
  // Авто-действия
  autoDismissAfterRestock: boolean;
  autoDismissAfterHours: number;
  
  // Рабочее время для уведомлений
  workingHoursStart?: string;    // "09:00"
  workingHoursEnd?: string;      // "18:00"
  workingDays?: number[];        // [1,2,3,4,5] - пн-пт
  timezone?: string;
}

export interface AlertStats {
  companyId: string;
  period: {
    from: Date;
    to: Date;
  };
  
  totalAlerts: number;
  activeAlerts: number;
  dismissedAlerts: number;
  
  byType: Record<AlertType, {
    count: number;
    percentage: number;
  }>;
  
  byPriority: Record<AlertPriority, {
    count: number;
    percentage: number;
  }>;
  
  trends: {
    daily: Array<{
      date: string;
      created: number;
      dismissed: number;
      active: number;
    }>;
  };
  
  topPartsWithAlerts: Array<{
    partId: string;
    partName: string;
    alertCount: number;
    currentQuantity: number;
    minQuantity: number;
  }>;
  
  averageResponseTime: number;   // В часах
  criticalAlertsResolved: number;
}

export interface NotificationRequest {
  type: AlertType;
  priority: AlertPriority;
  subject: string;
  message: string;
  recipients: string[];
  metadata?: Record<string, any>;
}

export interface NotificationResult {
  success: boolean;
  sentCount: number;
  failedCount: number;
  errors: Array<{
    recipient: string;
    error: string;
  }>;
  sentAt: Date;
}

export interface AlertTriggerContext {
  partId: string;
  companyId: string;
  triggeredBy: 'stock_movement' | 'manual' | 'scheduled_check' | 'system';
  triggerData?: {
    movementId?: string;
    userId?: string;
    previousQuantity?: number;
    newQuantity?: number;
    changeReason?: string;
  };
}

// 🎯 Helper types
export type AlertSortField = 
  | 'createdAt' 
  | 'priority' 
  | 'type' 
  | 'partName'
  | 'currentQuantity'
  | 'shortage';

export type SortOrder = 'asc' | 'desc';

export type AlertAction = 'dismiss' | 'snooze' | 'escalate' | 'resolve';

// 📊 Analytics types
export interface AlertTrend {
  date: string;
  created: number;
  dismissed: number;
  active: number;
}

export interface CategoryAlertAnalysis {
  categoryId: string;
  categoryName: string;
  totalAlerts: number;
  criticalAlerts: number;
  averageResponseTime: number;
  mostProblematicParts: Array<{
    partId: string;
    partName: string;
    alertFrequency: number;
  }>;
}

// 🎨 UI Helper types
export interface AlertDisplayItem {
  id: string;
  type: AlertType;
  typeDisplay: string;
  priority: AlertPriority;
  priorityDisplay: string;
  title: string;
  message: string;
  partName: string;
  partNumber?: string;
  categoryName: string;
  currentQuantity?: number;
  thresholdQuantity?: number;
  shortage?: number;
  createdAt: Date;
  isActive: boolean;
  isDismissed: boolean;
  canDismiss: boolean;
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
}

// 📱 Mobile types
export interface QuickAlertInfo {
  id: string;
  partName: string;
  type: AlertType;
  priority: AlertPriority;
  shortage?: number;
  createdAt: Date;
}

// 🔔 Notification types
export interface AlertNotificationPayload {
  alertId: string;
  companyId: string;
  type: AlertType;
  priority: AlertPriority;
  partId: string;
  partName: string;
  currentQuantity?: number;
  minQuantity?: number;
  message: string;
  createdAt: Date;
}

// ⚡ Real-time types  
export interface AlertSubscription {
  companyId: string;
  userId: string;
  alertTypes: AlertType[];
  priorities: AlertPriority[];
  connectionId: string;
}

export const ALERTS_CONSTRAINTS = {
  MAX_EMAIL_ADDRESSES: 10,
  MAX_TITLE_LENGTH: 200,
  MAX_MESSAGE_LENGTH: 1000,
  MAX_ALERTS_PER_PART: 5,        // Максимум активных алертов на запчасть
  AUTO_DISMISS_AFTER_HOURS: 72,
  MAX_ALERT_RETENTION_DAYS: 365,
} as const;
