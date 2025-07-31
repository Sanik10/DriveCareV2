import { Injectable } from '@nestjs/common';
import { Appointment, AppointmentStatus } from '../../../database/entities';
import { AppointmentResponseDto } from '../dto/response/appointment-response.dto';
import { AppointmentTracking } from '../types/appointments.types';
import { IAppointmentsMapperService } from '../interfaces/appointments.interface';
import { APPOINTMENTS_CONSTANTS } from '../constants/appointments.constants';

@Injectable()
export class AppointmentsMapperService implements IAppointmentsMapperService {

  /**
   * 🎯 Основной маппинг Entity → ResponseDto
   */
  mapToResponseDto(appointment: Appointment): AppointmentResponseDto {
    return {
      id: appointment.id,
      companyId: appointment.companyId,
      customerId: appointment.customerId,
      customerName: this.formatCustomerName(appointment),
      vehicleId: appointment.vehicleId,
      vehicleInfo: this.formatVehicleInfo(appointment),
      mechanicId: appointment.mechanicId,
      mechanicName: this.formatMechanicName(appointment),
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      estimatedDuration: appointment.estimatedDuration,
      actualDuration: appointment.actualDuration,
      status: appointment.status,
      priority: appointment.priority,
      services: this.formatServices(appointment),
      description: appointment.description,
      customerNotes: appointment.customerNotes,
      mechanicNotes: appointment.mechanicNotes,
      contactPhone: appointment.contactPhone,
      contactEmail: appointment.contactEmail,
      reminderSent: appointment.reminderSent,
      confirmationSent: appointment.confirmationSent,
      rating: appointment.rating,
      feedback: appointment.feedback,
      estimatedCost: appointment.estimatedCost,
      finalCost: appointment.finalCost,
      createdAt: appointment.createdAt,
      updatedAt: appointment.updatedAt,
      // 🔥 Computed fields
      canCancel: this.canCancel(appointment),
      canReschedule: this.canReschedule(appointment),
      progressPercentage: this.calculateProgress(appointment),
      timeUntilStart: this.calculateTimeUntilStart(appointment),
    };
  }

  /**
   * 🎯 Массовый маппинг
   */
  mapArrayToResponseDto(appointments: Appointment[]): AppointmentResponseDto[] {
    return appointments.map(appointment => this.mapToResponseDto(appointment));
  }

  /**
   * 🎯 Базовая информация (для других модулей)
   */
  mapToBasicInfo(appointment: Appointment): { 
    id: string; 
    startTime: Date; 
    status: string; 
    customerName: string;
  } {
    return {
      id: appointment.id,
      startTime: appointment.startTime,
      status: appointment.status,
      customerName: this.formatCustomerName(appointment),
    };
  }

  /**
   * 🎯 Маппинг для real-time tracking
   */
  mapToTrackingDto(appointment: Appointment): AppointmentTracking {
    return {
      appointmentId: appointment.id,
      status: appointment.status,
      currentStep: this.getCurrentStep(appointment),
      progress: this.calculateProgress(appointment),
      estimatedCompletion: this.calculateEstimatedCompletion(appointment),
      actualDuration: appointment.actualDuration,
      delayReason: this.getDelayReason(appointment),
      nextActions: this.getNextActions(appointment),
      lastUpdated: appointment.updatedAt,
    };
  }

  /**
   * 🎯 Маппинг для календарного события
   */
  mapToCalendarEvent(appointment: Appointment): any {
    return {
      id: appointment.id,
      title: `${this.formatCustomerName(appointment)} - ${this.formatVehicleInfo(appointment)}`,
      start: appointment.startTime,
      end: appointment.endTime,
      color: this.getStatusColor(appointment.status),
      priority: appointment.priority,
      mechanicId: appointment.mechanicId,
      mechanicName: this.formatMechanicName(appointment),
      description: appointment.description || '',
      canEdit: this.canEdit(appointment),
    };
  }

  /**
   * 🎯 Маппинг для audit логирования
   */
  mapToAuditData(appointment: Appointment): any {
    return {
      id: appointment.id,
      companyId: appointment.companyId,
      customerId: appointment.customerId,
      mechanicId: appointment.mechanicId,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      status: appointment.status,
      priority: appointment.priority,
      estimatedCost: appointment.estimatedCost,
      finalCost: appointment.finalCost,
    };
  }

  // 🔒 Приватные вспомогательные методы

  private formatCustomerName(appointment: Appointment): string {
    if (appointment.customer) {
      const { firstName, lastName } = appointment.customer;
      return `${firstName} ${lastName}`.trim();
    }
    return 'Неизвестный клиент';
  }

  private formatVehicleInfo(appointment: Appointment): string {
    if (appointment.vehicle) {
      const { licensePlate } = appointment.vehicle;
      const modelInfo = appointment.vehicle.model 
        ? `${appointment.vehicle.model.brand?.name || ''} ${appointment.vehicle.model.name || ''}`.trim()
        : 'Неизвестная модель';
      
      return licensePlate 
        ? `${modelInfo} (${licensePlate})`
        : modelInfo;
    }
    return 'Неизвестный автомобиль';
  }

  private formatMechanicName(appointment: Appointment): string {
    if (appointment.mechanic) {
      const { firstName, lastName } = appointment.mechanic;
      return `${firstName} ${lastName}`.trim();
    }
    return 'Неназначенный мастер';
  }

  private formatServices(appointment: Appointment): Array<{
    id: string;
    name: string;
    price: number;
    duration: number;
  }> {
    // TODO: Интеграция с services модулем для получения детальной информации
    return appointment.serviceIds.map(serviceId => ({
      id: serviceId,
      name: 'Услуга', // Заглушка
      price: 0, // Заглушка
      duration: 0, // Заглушка
    }));
  }

  private canCancel(appointment: Appointment): boolean {
    const now = new Date();
    const startTime = new Date(appointment.startTime);
    const hoursUntilStart = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    return APPOINTMENTS_CONSTANTS.STATUSES.CANCELLABLE_STATUSES.includes(appointment.status) &&
           hoursUntilStart >= APPOINTMENTS_CONSTANTS.DEFAULTS.CANCELLATION_HOURS_BEFORE;
  }

  private canReschedule(appointment: Appointment): boolean {
    const now = new Date();
    const startTime = new Date(appointment.startTime);
    const hoursUntilStart = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    return APPOINTMENTS_CONSTANTS.STATUSES.EDITABLE_STATUSES.includes(appointment.status) &&
           hoursUntilStart >= APPOINTMENTS_CONSTANTS.DEFAULTS.CANCELLATION_HOURS_BEFORE;
  }

  private canEdit(appointment: Appointment): boolean {
    return APPOINTMENTS_CONSTANTS.STATUSES.EDITABLE_STATUSES.includes(appointment.status);
  }

  private calculateProgress(appointment: Appointment): number {
    switch (appointment.status) {
      case AppointmentStatus.DRAFT:
        return 10;
      case AppointmentStatus.SCHEDULED:
        return 25;
      case AppointmentStatus.CONFIRMED:
        return 50;
      case AppointmentStatus.IN_PROGRESS:
        return this.calculateInProgressPercentage(appointment);
      case AppointmentStatus.COMPLETED:
        return 100;
      case AppointmentStatus.CANCELED:
      case AppointmentStatus.NO_SHOW:
        return 0;
      default:
        return 0;
    }
  }

  private calculateInProgressPercentage(appointment: Appointment): number {
    const now = new Date();
    const startTime = new Date(appointment.startTime);
    const endTime = new Date(appointment.endTime);
    
    if (now < startTime) return 50;
    if (now > endTime) return 95;
    
    const totalDuration = endTime.getTime() - startTime.getTime();
    const elapsed = now.getTime() - startTime.getTime();
    
    return Math.min(95, Math.max(50, 50 + (elapsed / totalDuration) * 45));
  }

  private calculateTimeUntilStart(appointment: Appointment): number | undefined {
    const now = new Date();
    const startTime = new Date(appointment.startTime);
    
    if (startTime <= now) return undefined;
    
    return Math.round((startTime.getTime() - now.getTime()) / (1000 * 60)); // в минутах
  }

  private getCurrentStep(appointment: Appointment): string {
    switch (appointment.status) {
      case AppointmentStatus.DRAFT:
        return 'Создание записи';
      case AppointmentStatus.SCHEDULED:
        return 'Ожидание подтверждения';
      case AppointmentStatus.CONFIRMED:
        return 'Подтверждена, ожидание начала';
      case AppointmentStatus.IN_PROGRESS:
        return 'Выполнение работ';
      case AppointmentStatus.COMPLETED:
        return 'Работы завершены';
      case AppointmentStatus.CANCELED:
        return 'Отменена';
      case AppointmentStatus.NO_SHOW:
        return 'Клиент не явился';
      default:
        return 'Неизвестный статус';
    }
  }

  private calculateEstimatedCompletion(appointment: Appointment): Date {
    if (appointment.status === AppointmentStatus.IN_PROGRESS) {
      const now = new Date();
      const estimatedEnd = new Date(appointment.endTime);
      
      // Если уже прошло больше запланированного времени, добавляем 30 минут
      if (now > estimatedEnd) {
        return new Date(now.getTime() + 30 * 60 * 1000);
      }
      
      return estimatedEnd;
    }
    
    return new Date(appointment.endTime);
  }

  private getDelayReason(appointment: Appointment): string | undefined {
    const now = new Date();
    const plannedEnd = new Date(appointment.endTime);
    
    if (appointment.status === AppointmentStatus.IN_PROGRESS && now > plannedEnd) {
      return 'Превышено запланированное время';
    }
    
    return undefined;
  }

  private getNextActions(appointment: Appointment): string[] {
    switch (appointment.status) {
      case AppointmentStatus.DRAFT:
        return ['Подтвердить время', 'Уточнить детали'];
      case AppointmentStatus.SCHEDULED:
        return ['Подтвердить запись', 'Отправить напоминание'];
      case AppointmentStatus.CONFIRMED:
        return ['Подготовить рабочее место', 'Проверить наличие запчастей'];
      case AppointmentStatus.IN_PROGRESS:
        return ['Выполнить диагностику', 'Обновить статус работ'];
      case AppointmentStatus.COMPLETED:
        return ['Получить оценку', 'Оформить документы'];
      default:
        return [];
    }
  }

  private getStatusColor(status: AppointmentStatus): string {
    switch (status) {
      case AppointmentStatus.DRAFT:
        return '#gray';
      case AppointmentStatus.SCHEDULED:
        return '#blue';
      case AppointmentStatus.CONFIRMED:
        return '#green';
      case AppointmentStatus.IN_PROGRESS:
        return '#orange';
      case AppointmentStatus.COMPLETED:
        return '#purple';
      case AppointmentStatus.CANCELED:
        return '#red';
      case AppointmentStatus.NO_SHOW:
        return '#darkred';
      default:
        return '#gray';
    }
  }
}
