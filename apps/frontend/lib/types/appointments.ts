// path: apps/frontend/lib/types/appointments.ts

// Статусы и приоритеты — синхронизированы с backend enums (AppointmentStatus/AppointmentPriority)
export type AppointmentStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELED'
  | 'NO_SHOW'
  | 'RESCHEDULED';

export type AppointmentPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface AppointmentServiceItem {
  id: string;
  name: string;
  price: number;
  duration: number;
}

export interface Appointment {
  id: string;
  companyId: string;

  customerId: string;
  customerName: string;

  vehicleId: string;
  vehicleInfo: string;

  mechanicId: string;
  mechanicName: string;

  startTime: string; // ISO
  endTime: string; // ISO
  estimatedDuration: number;
  actualDuration?: number;

  status: AppointmentStatus;
  priority: AppointmentPriority;

  services: AppointmentServiceItem[];

  description?: string;
  customerNotes?: string;
  mechanicNotes?: string;

  contactPhone?: string;
  contactEmail?: string;

  reminderSent: boolean;
  confirmationSent: boolean;

  rating?: number;
  feedback?: string;

  estimatedCost?: number;
  finalCost?: number;

  createdAt: string; // ISO
  updatedAt: string; // ISO

  // Вычисляемые/разрешения
  canCancel: boolean;
  canReschedule: boolean;
  progressPercentage: number;
  timeUntilStart?: number;
}

export interface PaginatedAppointmentsResponse {
  items: Appointment[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AppointmentsQuery {
  search?: string;
  status?: AppointmentStatus;
  priority?: AppointmentPriority;
  mechanicId?: string;
  customerId?: string;
  vehicleId?: string;
  serviceId?: string;
  dateFrom?: string; // ISO date or YYYY-MM-DD
  dateTo?: string; // ISO date or YYYY-MM-DD
  page?: number;
  limit?: number;
  sortField?: 'startTime' | 'createdAt' | 'status' | 'customerName' | 'priority';
  sortOrder?: 'asc' | 'desc';
}

export interface CreateAppointmentRequest {
  customerId: string;
  vehicleId: string;
  mechanicId: string;

  startTime: string; // ISO
  endTime: string; // ISO

  estimatedDuration: number;
  serviceIds: string[];

  priority?: AppointmentPriority;

  description?: string;
  customerNotes?: string;

  contactPhone?: string;
  contactEmail?: string;

  estimatedCost?: number;
}

export interface AvailabilitySlot {
  mechanicId: string;
  startTime: string; // ISO
  endTime: string; // ISO
  confidence: number;
}

export interface SmartScheduleRequest {
  customerId: string;
  vehicleId: string;
  serviceIds: string[];
  priority: AppointmentPriority;
  preferredDate?: string; // YYYY-MM-DD
  preferredTimeStart?: string; // HH:mm
  preferredTimeEnd?: string; // HH:mm
  preferredMechanicId?: string;
  maxWaitingDays?: number;
  allowWeekends?: boolean;
}

export type ConflictSeverity = 'low' | 'medium' | 'high';
export type ConflictType = 'schedule' | 'appointment' | 'break' | 'holiday';

export interface SmartScheduleSlot extends AvailabilitySlot {
  mechanicName: string;
  totalCost: number;
  estimatedDuration: number;
  conflicts: Array<{
    type: ConflictType;
    description: string;
    conflictTime: string; // ISO
    severity: ConflictSeverity;
  }>;
  recommendationReason?: string;
}

export interface SmartScheduleResponse {
  recommendedSlots: SmartScheduleSlot[];
  alternatives: SmartScheduleSlot[];
  nextAvailableDate: string; // ISO
  estimatedWaitTime: number;
  generalRecommendation?: string;
}

export interface AppointmentTracking {
  appointmentId: string;
  status: string;
  currentStep: string;
  progress: number; // 0-100
  estimatedCompletion: string; // ISO
  actualDuration?: number;
  delayReason?: string;
  nextActions: string[];
  lastUpdated: string; // ISO
}

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  DRAFT: 'Черновик',
  SCHEDULED: 'Запланирована',
  CONFIRMED: 'Подтверждена',
  IN_PROGRESS: 'В работе',
  COMPLETED: 'Завершена',
  CANCELED: 'Отменена',
  NO_SHOW: 'Неявка',
  RESCHEDULED: 'Перенесена',
};

export const APPOINTMENT_PRIORITY_LABELS: Record<AppointmentPriority, string> = {
  LOW: 'Низкий',
  NORMAL: 'Обычный',
  HIGH: 'Высокий',
  URGENT: 'Срочно',
};
