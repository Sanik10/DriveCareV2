// path: apps/backend/src/modules/appointments/types/appointments.types.ts
import { AppointmentStatus, AppointmentPriority } from '../../../database/entities';

export type SortOrder = 'asc' | 'desc';
export type AppointmentSortField = 'startTime' | 'createdAt' | 'status' | 'customerName' | 'priority';

export interface AppointmentFilter {
  search?: string;
  status?: AppointmentStatus;
  priority?: AppointmentPriority;
  mechanicId?: string;
  customerId?: string;
  vehicleId?: string;
  serviceId?: string;
  companyId?: string; // 🔒 Для security фильтрации
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
  sortField?: AppointmentSortField;
  sortOrder?: SortOrder;
}

export interface CreateAppointmentData {
  companyId: string;
  customerId: string;
  vehicleId: string;
  mechanicId: string;
  startTime: Date;
  endTime: Date;
  estimatedDuration: number;
  serviceIds: string[];
  status?: AppointmentStatus;
  priority?: AppointmentPriority;
  description?: string;
  customerNotes?: string;
  contactPhone?: string;
  contactEmail?: string;
  estimatedCost?: number;
}

export interface UpdateAppointmentData {
  mechanicId?: string;
  startTime?: Date;
  endTime?: Date;
  estimatedDuration?: number;
  serviceIds?: string[];
  status?: AppointmentStatus;
  priority?: AppointmentPriority;
  description?: string;
  customerNotes?: string;
  mechanicNotes?: string;
  contactPhone?: string;
  contactEmail?: string;
  estimatedCost?: number;
  finalCost?: number;
  rating?: number;
  feedback?: string;
  actualDuration?: number;
  reminderSent?: boolean;
  confirmationSent?: boolean;
}

// 🔥 Smart Scheduling Types
export interface SmartSchedulingRequest {
  customerId: string;
  vehicleId: string;
  serviceIds: string[];
  preferredDate?: Date;
  preferredTimeStart?: string; // "09:00"
  preferredTimeEnd?: string;   // "17:00"
  preferredMechanicId?: string;
  priority: AppointmentPriority;
  maxWaitingDays?: number;
  allowWeekends?: boolean;
}

export interface AvailableSlot {
  mechanicId: string;
  mechanicName: string;
  startTime: Date;
  endTime: Date;
  confidence: number;     // 0-1 (уверенность в рекомендации)
  totalCost: number;
  estimatedDuration: number;
  conflicts: ConflictInfo[];
}

export interface ConflictInfo {
  type: 'schedule' | 'appointment' | 'break' | 'holiday';
  description: string;
  conflictTime: Date;
  severity: 'low' | 'medium' | 'high';
}

export interface SmartSchedulingResponse {
  recommendedSlots: AvailableSlot[];
  alternatives: AvailableSlot[];
  nextAvailableDate: Date;
  estimatedWaitTime: number; // дней
}

// Real-time Tracking
export interface AppointmentTracking {
  appointmentId: string;
  status: AppointmentStatus;
  currentStep: string;
  progress: number;        // 0-100%
  estimatedCompletion: Date;
  actualDuration?: number;
  delayReason?: string;
  nextActions: string[];
  lastUpdated: Date;
}

// Bulk Operations
export interface BulkAppointmentOperation {
  appointmentIds: string[];
  operation: 'reschedule' | 'cancel' | 'confirm' | 'delete';
  newDate?: Date;
  newMechanicId?: string;
  reason?: string;
}

export interface BulkOperationResult {
  successful: number;
  failed: number;
  errors: Array<{
    appointmentId: string;
    error: string;
  }>;
}

// Appointment Statistics
export interface AppointmentStats {
  total: number;
  byStatus: Record<AppointmentStatus, number>;
  byPriority: Record<AppointmentPriority, number>;
  completionRate: number;
  averageDuration: number;
  noShowRate: number;
  customerSatisfaction: number;
  revenueGenerated: number;
}

// Customer Portal Types
export interface CustomerPortalFilter {
  customerId: string;
  dateFrom?: Date;
  dateTo?: Date;
  status?: AppointmentStatus[];
  includeHistory?: boolean;
}

export interface PublicAvailabilityRequest {
  serviceIds: string[];
  preferredDate: Date;
  timeRange?: {
    start: string; // "09:00"
    end: string;   // "17:00"
  };
}
