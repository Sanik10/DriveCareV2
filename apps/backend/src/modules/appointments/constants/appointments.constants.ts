import { AppointmentStatus } from '../../../database/entities';

export const APPOINTMENTS_CONSTANTS = {
  DEFAULTS: {
    PAGE_SIZE: 20,
    MAX_ITEMS: 100,
    DEFAULT_DURATION: 60, // минут
    REMINDER_HOURS_BEFORE: 24,
    BOOKING_ADVANCE_DAYS: 30,
    CANCELLATION_HOURS_BEFORE: 2,
  },
  VALIDATION: {
    DESCRIPTION_MAX_LENGTH: 1000,
    NOTES_MAX_LENGTH: 2000,
    FEEDBACK_MAX_LENGTH: 1000,
    MIN_DURATION: 15, // минут
    MAX_DURATION: 480, // 8 часов
    MAX_SERVICES_PER_APPOINTMENT: 10,
    PHONE_MAX_LENGTH: 50,
    EMAIL_MAX_LENGTH: 255,
  },
  BUSINESS_RULES: {
    MIN_ADVANCE_BOOKING_HOURS: 2,
    MAX_ADVANCE_BOOKING_DAYS: 90,
    WORKING_HOURS_START: '08:00',
    WORKING_HOURS_END: '20:00',
    LUNCH_BREAK_START: '12:00',
    LUNCH_BREAK_END: '13:00',
    SLOT_BUFFER_MINUTES: 15, // буфер между записями
  },
  SMART_SCHEDULING: {
    CONFIDENCE_THRESHOLD: 0.7, // минимальная уверенность для рекомендации
    MAX_ALTERNATIVE_SLOTS: 5,
    OPTIMIZATION_WEIGHT: {
      CUSTOMER_PREFERENCE: 0.4,
      MECHANIC_EFFICIENCY: 0.3,
      TRAVEL_TIME: 0.2,
      COST_OPTIMIZATION: 0.1,
    },
  },
  NOTIFICATIONS: {
    REMINDER_TEMPLATE: 'appointment_reminder',
    CONFIRMATION_TEMPLATE: 'appointment_confirmation',
    CANCELLATION_TEMPLATE: 'appointment_cancellation',
    RESCHEDULE_TEMPLATE: 'appointment_reschedule',
    COMPLETION_TEMPLATE: 'appointment_completion',
  },
  REDIS_KEYS: {
    APPOINTMENT_CACHE: (id: string) => `appointment:cache:${id}`,
    MECHANIC_SCHEDULE: (mechanicId: string, date: string) => `schedule:${mechanicId}:${date}`,
    AVAILABLE_SLOTS: (companyId: string, date: string) => `slots:${companyId}:${date}`,
    CUSTOMER_APPOINTMENTS: (customerId: string) => `customer:appointments:${customerId}`,
  },
  AUDIT_ACTIONS: {
    APPOINTMENT_CREATED: 'appointment_created',
    APPOINTMENT_UPDATED: 'appointment_updated',
    APPOINTMENT_STATUS_CHANGED: 'appointment_status_changed',
    APPOINTMENT_CONFIRMED: 'appointment_confirmed',
    APPOINTMENT_COMPLETED: 'appointment_completed',
    APPOINTMENT_CANCELED: 'appointment_canceled',
    APPOINTMENT_RESCHEDULED: 'appointment_rescheduled',
    APPOINTMENT_DELETED: 'appointment_deleted',
  },
  STATUSES: {
    ACTIVE_STATUSES: [
      AppointmentStatus.DRAFT, 
      AppointmentStatus.SCHEDULED, 
      AppointmentStatus.CONFIRMED, 
      AppointmentStatus.IN_PROGRESS
    ] as AppointmentStatus[],
    COMPLETED_STATUSES: [
      AppointmentStatus.COMPLETED, 
      AppointmentStatus.CANCELED, 
      AppointmentStatus.NO_SHOW
    ] as AppointmentStatus[],
    EDITABLE_STATUSES: [
      AppointmentStatus.DRAFT, 
      AppointmentStatus.SCHEDULED, 
      AppointmentStatus.CONFIRMED
    ] as AppointmentStatus[],
    CANCELLABLE_STATUSES: [
      AppointmentStatus.DRAFT, 
      AppointmentStatus.SCHEDULED, 
      AppointmentStatus.CONFIRMED
    ] as AppointmentStatus[],
  },
  RATING: {
    MIN_RATING: 1,
    MAX_RATING: 5,
    DEFAULT_RATING: 5,
  },
} as const;

// Status transition rules
export const STATUS_TRANSITIONS = {
  [AppointmentStatus.DRAFT]: [AppointmentStatus.SCHEDULED, AppointmentStatus.CANCELED],
  [AppointmentStatus.SCHEDULED]: [AppointmentStatus.CONFIRMED, AppointmentStatus.CANCELED, AppointmentStatus.RESCHEDULED],
  [AppointmentStatus.CONFIRMED]: [AppointmentStatus.IN_PROGRESS, AppointmentStatus.CANCELED, AppointmentStatus.NO_SHOW, AppointmentStatus.RESCHEDULED],
  [AppointmentStatus.IN_PROGRESS]: [AppointmentStatus.COMPLETED, AppointmentStatus.CANCELED],
  [AppointmentStatus.COMPLETED]: [], // final state
  [AppointmentStatus.CANCELED]: [], // final state  
  [AppointmentStatus.NO_SHOW]: [], // final state
  [AppointmentStatus.RESCHEDULED]: [AppointmentStatus.SCHEDULED], // creates new appointment
} as const;

// Priority weights for smart scheduling
export const PRIORITY_WEIGHTS = {
  low: 0.5,
  normal: 1.0,
  high: 1.5,
  urgent: 2.0,
} as const;
