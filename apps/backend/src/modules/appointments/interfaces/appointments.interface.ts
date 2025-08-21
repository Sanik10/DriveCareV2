// path: apps/backend/src/modules/appointments/interfaces/appointments.interface.ts
import { Appointment } from '../../../database/entities';
import {
  CreateAppointmentData,
  UpdateAppointmentData,
  AppointmentFilter,
  SmartSchedulingRequest,
  SmartSchedulingResponse,
  AppointmentTracking,
  AvailableSlot,
} from '../types/appointments.types';
import { AppointmentStatus } from '../../../database/entities';
import { AppointmentResponseDto } from '../dto/response/appointment-response.dto';

export interface IAppointmentsDataService {
  create(data: CreateAppointmentData): Promise<Appointment>;
  findAll(): Promise<Appointment[]>;
  findById(id: string): Promise<Appointment | null>;
  findByIdForCompany(id: string, companyId: string): Promise<Appointment | null>;
  findWithFilters(filter: AppointmentFilter): Promise<[Appointment[], number]>;
  update(id: string, data: UpdateAppointmentData): Promise<Appointment>;
  delete(id: string): Promise<void>;
  softDelete(id: string): Promise<void>;
  findByCustomer(customerId: string, companyId: string): Promise<Appointment[]>;
  findByMechanic(mechanicId: string, companyId: string, dateFrom: Date, dateTo: Date): Promise<Appointment[]>;
  findByDateRange(companyId: string, dateFrom: Date, dateTo: Date): Promise<Appointment[]>;
  countByStatus(companyId: string, status: AppointmentStatus): Promise<number>;
  findConflicts(
    mechanicId: string,
    startTime: Date,
    endTime: Date,
    excludeAppointmentId?: string,
    companyId?: string,
  ): Promise<Appointment[]>;
  existsForCompany(id: string, companyId: string): Promise<boolean>;
}

export interface IAppointmentsBusinessService {
  createAppointment(data: CreateAppointmentData): Promise<Appointment>;
  updateAppointment(id: string, data: UpdateAppointmentData): Promise<Appointment>;
  deleteAppointment(id: string): Promise<void>;
  softDeleteAppointment(id: string): Promise<void>;
  changeStatus(id: string, newStatus: string, userId: string): Promise<Appointment>;
  confirmAppointment(id: string, userId: string): Promise<Appointment>;
  completeAppointment(id: string, userId: string, completionData?: any): Promise<Appointment>;
  cancelAppointment(id: string, userId: string, reason?: string): Promise<Appointment>;
  rescheduleAppointment(id: string, newStartTime: Date, newEndTime: Date, userId: string): Promise<Appointment>;
  addRating(id: string, rating: number, feedback?: string): Promise<Appointment>;
}

export interface IAppointmentsValidationService {
  validateCreateData(data: CreateAppointmentData): Promise<void>;
  validateUpdateData(id: string, data: UpdateAppointmentData): Promise<void>;
  validateAppointmentExists(id: string): Promise<Appointment>;
  validateAppointmentOwnership(appointmentId: string, userCompanyId: string): Promise<Appointment>;
  validateTimeSlot(
    mechanicId: string,
    startTime: Date,
    endTime: Date,
    excludeAppointmentId?: string,
    companyId?: string,
  ): Promise<void>;
  validateMechanicAvailability(mechanicId: string, startTime: Date, endTime: Date): Promise<void>;
  validateServicesExist(serviceIds: string[], companyId: string): Promise<void>;
  validateCustomerAndVehicle(customerId: string, vehicleId: string, companyId: string): Promise<void>;
  validateStatusTransition(currentStatus: string, newStatus: string): Promise<void>;
  validateBusinessRules(data: CreateAppointmentData): Promise<void>;
  validateReschedulePermissions(appointmentId: string, userId: string): Promise<void>;
  validateCancellationPermissions(appointmentId: string, userId: string): Promise<void>;
}

export interface IAppointmentsMapperService {
  mapToResponseDto(appointment: Appointment, options?: { role?: string; maskPII?: boolean }): AppointmentResponseDto;
  mapArrayToResponseDto(
    appointments: Appointment[],
    options?: { role?: string; maskPII?: boolean },
  ): AppointmentResponseDto[];
  mapToBasicInfo(appointment: Appointment): { id: string; startTime: Date; status: string; customerName: string };
  mapToTrackingDto(appointment: Appointment): AppointmentTracking;
  mapToCalendarEvent(appointment: Appointment): any;
  mapToAuditData(appointment: Appointment): Record<string, unknown>;
}

export interface ISmartSchedulingService {
  findAvailableSlots(request: SmartSchedulingRequest, companyId: string): Promise<SmartSchedulingResponse>;
  checkAvailability(serviceIds: string[], date: Date, companyId: string): Promise<AvailableSlot[]>;
  optimizeSchedule(companyId: string, date: Date): Promise<any>;
  predictBestSlots(request: SmartSchedulingRequest, companyId: string): Promise<AvailableSlot[]>;
  calculateServiceDuration(serviceIds: string[], companyId: string): Promise<number>;
  findAlternativeSlots(request: SmartSchedulingRequest, companyId: string): Promise<AvailableSlot[]>;
}

export interface IConflictResolutionService {
  detectConflicts(mechanicId: string, startTime: Date, endTime: Date, excludeAppointmentId?: string): Promise<any[]>;
  resolveConflicts(conflicts: any[]): Promise<any>;
  suggestAlternatives(
    originalRequest: SmartSchedulingRequest,
    conflicts: any[],
  ): Promise<AvailableSlot[]>;
  validateNoConflicts(mechanicId: string, startTime: Date, endTime: Date): Promise<boolean>;
}
