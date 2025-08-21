// path: apps/backend/src/modules/appointments/services/appointments-validation.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { AppointmentsDataService } from './appointments-data.service';
import { Appointment } from '../../../database/entities';
import { CreateAppointmentData, UpdateAppointmentData } from '../types/appointments.types';
import { IAppointmentsValidationService } from '../interfaces/appointments.interface';
import {
  AppointmentNotFoundException,
  AppointmentConflictException,
  ResourceOwnershipException,
  ValidationDataException,
} from '../../../common/exceptions/domain.exceptions';
import { APPOINTMENTS_CONSTANTS, STATUS_TRANSITIONS } from '../constants/appointments.constants';

@Injectable()
export class AppointmentsValidationService implements IAppointmentsValidationService {
  private readonly logger = new Logger(AppointmentsValidationService.name);

  constructor(private readonly appointmentsDataService: AppointmentsDataService) {}

  /**
   * Валидация данных для создания записи
   */
  async validateCreateData(data: CreateAppointmentData): Promise<void> {
    // Временные рамки и пересечения
    await this.validateTimeSlot(data.mechanicId, data.startTime, data.endTime, undefined, data.companyId);

    // Рабочие часы/выходные
    await this.validateMechanicAvailability(data.mechanicId, data.startTime, data.endTime);

    // Услуги
    await this.validateServicesExist(data.serviceIds, data.companyId);

    // Клиент и авто
    await this.validateCustomerAndVehicle(data.customerId, data.vehicleId, data.companyId);

    // Бизнес-правила (окна бронирования)
    await this.validateBusinessRules(data);
  }

  /**
   * Валидация данных для обновления записи
   */
  async validateUpdateData(id: string, data: UpdateAppointmentData): Promise<void> {
    const appointment = await this.validateAppointmentExists(id);

    // При изменении времени проверяем пересечения
    if (data.startTime && data.endTime) {
      const mechanicId = data.mechanicId || appointment.mechanicId;
      await this.validateTimeSlot(mechanicId, data.startTime, data.endTime, id, appointment.companyId);
    }

    // Проверяем возможный переход статуса
    if (data.status) {
      await this.validateStatusTransition(appointment.status, data.status);
    }

    // Проверяем корректность услуг
    if (data.serviceIds) {
      await this.validateServicesExist(data.serviceIds, appointment.companyId);
    }
  }

  /**
   * Проверка существования записи
   */
  async validateAppointmentExists(id: string): Promise<Appointment> {
    const appointment = await this.appointmentsDataService.findById(id);

    if (!appointment) {
      throw new AppointmentNotFoundException(id);
    }

    return appointment;
  }

  /**
   * Валидация ownership при доступе к записи
   */
  async validateAppointmentOwnership(appointmentId: string, userCompanyId: string): Promise<Appointment> {
    const appointment = await this.appointmentsDataService.findByIdForCompany(appointmentId, userCompanyId);

    if (!appointment) {
      // Не раскрываем, существует ли запись - просто запрещаем доступ
      throw new ResourceOwnershipException('appointment', appointmentId);
    }

    return appointment;
  }

  /**
   * Валидация временного слота (+ companyId для multi-tenant безопасности)
   */
  async validateTimeSlot(
    mechanicId: string,
    startTime: Date,
    endTime: Date,
    excludeAppointmentId?: string,
    companyId?: string,
  ): Promise<void> {
    if (endTime <= startTime) {
      throw new ValidationDataException('timeSlot', 'Время окончания должно быть позже времени начала');
    }

    const durationMinutes = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
    if (durationMinutes < APPOINTMENTS_CONSTANTS.VALIDATION.MIN_DURATION) {
      throw new ValidationDataException(
        'duration',
        `Минимальная продолжительность записи ${APPOINTMENTS_CONSTANTS.VALIDATION.MIN_DURATION} минут`,
      );
    }

    if (durationMinutes > APPOINTMENTS_CONSTANTS.VALIDATION.MAX_DURATION) {
      throw new ValidationDataException(
        'duration',
        `Максимальная продолжительность записи ${APPOINTMENTS_CONSTANTS.VALIDATION.MAX_DURATION} минут`,
      );
    }

    const conflicts = await this.appointmentsDataService.findConflicts(
      mechanicId,
      startTime,
      endTime,
      excludeAppointmentId,
      companyId,
    );

    if (conflicts.length > 0) {
      throw new AppointmentConflictException(startTime.toISOString(), endTime.toISOString());
    }
  }

  /**
   * Валидация доступности мастера (базовая проверка расписания: часы/дни)
   */
  async validateMechanicAvailability(_mechanicId: string, startTime: Date, endTime: Date): Promise<void> {
    const startHour = startTime.getHours();
    const endHour = endTime.getHours();

    const workingStart = parseInt(APPOINTMENTS_CONSTANTS.BUSINESS_RULES.WORKING_HOURS_START.split(':')[0]);
    const workingEnd = parseInt(APPOINTMENTS_CONSTANTS.BUSINESS_RULES.WORKING_HOURS_END.split(':')[0]);

    if (startHour < workingStart || endHour > workingEnd) {
      throw new ValidationDataException(
        'workingHours',
        `Запись должна быть в рабочие часы: ${APPOINTMENTS_CONSTANTS.BUSINESS_RULES.WORKING_HOURS_START}-${APPOINTMENTS_CONSTANTS.BUSINESS_RULES.WORKING_HOURS_END}`,
      );
    }

    const dayOfWeek = startTime.getDay();
    if (dayOfWeek === 0) {
      throw new ValidationDataException('workingDays', 'Нельзя записаться на воскресенье');
    }
  }

  /**
   * Валидация существования услуг (базовая)
   */
  async validateServicesExist(serviceIds: string[], companyId: string): Promise<void> {
    if (serviceIds.length === 0) {
      throw new ValidationDataException('services', 'Необходимо выбрать хотя бы одну услугу');
    }

    if (serviceIds.length > APPOINTMENTS_CONSTANTS.VALIDATION.MAX_SERVICES_PER_APPOINTMENT) {
      throw new ValidationDataException(
        'services',
        `Максимум ${APPOINTMENTS_CONSTANTS.VALIDATION.MAX_SERVICES_PER_APPOINTMENT} услуг на запись`,
      );
    }

    this.logger.debug(`validateServicesExist: ${serviceIds.length} services for company ${companyId}`);
  }

  /**
   * Валидация клиента и автомобиля (базовая)
   */
  async validateCustomerAndVehicle(customerId: string, vehicleId: string, companyId: string): Promise<void> {
    if (!customerId || !vehicleId) {
      throw new ValidationDataException('customerVehicle', 'Необходимо выбрать клиента и автомобиль');
    }
    this.logger.debug(`validateCustomerAndVehicle: customerId=${customerId}, vehicleId=${vehicleId}, companyId=${companyId}`);
  }

  /**
   * Валидация перехода статуса
   */
  async validateStatusTransition(currentStatus: string, newStatus: string): Promise<void> {
    const allowedTransitions = STATUS_TRANSITIONS[currentStatus] || [];

    if (!allowedTransitions.includes(newStatus)) {
      throw new ValidationDataException(
        'statusTransition',
        `Невозможно изменить статус с "${currentStatus}" на "${newStatus}". Разрешенные переходы: ${allowedTransitions.join(', ')}`,
      );
    }
  }

  /**
   * Валидация бизнес-правил (окна бронирования)
   */
  async validateBusinessRules(data: CreateAppointmentData): Promise<void> {
    const now = new Date();
    const maxAdvanceMs = APPOINTMENTS_CONSTANTS.BUSINESS_RULES.MAX_ADVANCE_BOOKING_DAYS * 24 * 60 * 60 * 1000;

    if (data.startTime.getTime() - now.getTime() > maxAdvanceMs) {
      throw new ValidationDataException(
        'advanceBooking',
        `Нельзя записаться более чем на ${APPOINTMENTS_CONSTANTS.BUSINESS_RULES.MAX_ADVANCE_BOOKING_DAYS} дней вперед`,
      );
    }

    const minAdvanceMs = APPOINTMENTS_CONSTANTS.BUSINESS_RULES.MIN_ADVANCE_BOOKING_HOURS * 60 * 60 * 1000;

    if (data.startTime.getTime() - now.getTime() < minAdvanceMs) {
      throw new ValidationDataException(
        'advanceBooking',
        `Необходимо записываться минимум за ${APPOINTMENTS_CONSTANTS.BUSINESS_RULES.MIN_ADVANCE_BOOKING_HOURS} часа`,
      );
    }

    if (data.startTime < now) {
      throw new ValidationDataException('pastTime', 'Нельзя записаться на прошедшее время');
    }
  }

  /**
   * Валидация прав на перенос записи
   */
  async validateReschedulePermissions(appointmentId: string, _userId: string): Promise<void> {
    const appointment = await this.validateAppointmentExists(appointmentId);

    if (!APPOINTMENTS_CONSTANTS.STATUSES.EDITABLE_STATUSES.includes(appointment.status)) {
      throw new ValidationDataException('rescheduleStatus', `Нельзя перенести запись со статусом "${appointment.status}"`);
    }

    const now = new Date();
    const startTime = new Date(appointment.startTime);
    const hoursUntilStart = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilStart < APPOINTMENTS_CONSTANTS.DEFAULTS.CANCELLATION_HOURS_BEFORE) {
      throw new ValidationDataException(
        'rescheduleTime',
        `Нельзя перенести запись менее чем за ${APPOINTMENTS_CONSTANTS.DEFAULTS.CANCELLATION_HOURS_BEFORE} часа до начала`,
      );
    }
  }

  /**
   * Валидация прав на отмену записи
   */
  async validateCancellationPermissions(appointmentId: string, _userId: string): Promise<void> {
    const appointment = await this.validateAppointmentExists(appointmentId);

    if (!APPOINTMENTS_CONSTANTS.STATUSES.CANCELLABLE_STATUSES.includes(appointment.status)) {
      throw new ValidationDataException('cancelStatus', `Нельзя отменить запись со статусом "${appointment.status}"`);
    }

    const now = new Date();
    const startTime = new Date(appointment.startTime);
    const hoursUntilStart = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilStart < APPOINTMENTS_CONSTANTS.DEFAULTS.CANCELLATION_HOURS_BEFORE) {
      throw new ValidationDataException(
        'cancelTime',
        `Нельзя отменить запись менее чем за ${APPOINTMENTS_CONSTANTS.DEFAULTS.CANCELLATION_HOURS_BEFORE} часа до начала`,
      );
    }
  }
}
