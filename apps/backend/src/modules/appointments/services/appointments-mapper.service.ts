// path: apps/backend/src/modules/appointments/services/appointments-mapper.service.ts
import { Injectable } from '@nestjs/common';
import { Appointment, AppointmentStatus, AppointmentPriority } from '../../../database/entities';
import { AppointmentResponseDto } from '../dto/response/appointment-response.dto';
import { AppointmentTracking } from '../types/appointments.types';
import { IAppointmentsMapperService } from '../interfaces/appointments.interface';
import { APPOINTMENTS_CONSTANTS } from '../constants/appointments.constants';

type ServiceInfo = { id: string; name: string; price: number; duration: number };

@Injectable()
export class AppointmentsMapperService implements IAppointmentsMapperService {
  /**
   * Основной маппинг Entity → ResponseDto
   * Отдаём статусы/приоритеты как enum (без преобразования в строки),
   * чтобы соответствовать типам DTO и избежать ошибок компиляции.
   */
  mapToResponseDto(
    appointment: Appointment,
    options?: { role?: string; maskPII?: boolean; serviceLookup?: Record<string, ServiceInfo> },
  ): AppointmentResponseDto {
    const dto: AppointmentResponseDto = {
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
      actualDuration: appointment.actualDuration ?? undefined,
      // Отдаём значение enum напрямую
      status: appointment.status,
      priority: appointment.priority,
      services: this.formatServices(appointment, options?.serviceLookup),
      description: appointment.description ?? undefined,
      customerNotes: appointment.customerNotes ?? undefined,
      mechanicNotes: appointment.mechanicNotes ?? undefined,
      contactPhone: appointment.contactPhone ?? undefined,
      contactEmail: appointment.contactEmail ?? undefined,
      reminderSent: appointment.reminderSent,
      confirmationSent: appointment.confirmationSent,
      rating: appointment.rating ?? undefined,
      feedback: appointment.feedback ?? undefined,
      estimatedCost: appointment.estimatedCost ? Number(appointment.estimatedCost) : undefined,
      finalCost: appointment.finalCost ? Number(appointment.finalCost) : undefined,
      createdAt: appointment.createdAt,
      updatedAt: appointment.updatedAt,
      // Computed
      canCancel: this.canCancel(appointment),
      canReschedule: this.canReschedule(appointment),
      progressPercentage: this.calculateProgress(appointment),
      timeUntilStart: this.calculateTimeUntilStart(appointment),
    };

    // Role-based PII masking (152‑ФЗ): механикам/диагностам скрываем PII по умолчанию
    const shouldMask = options?.maskPII === true || ['mechanic', 'diagnostic'].includes((options?.role || '').toLowerCase());

    return shouldMask ? this.maskPII(dto) : dto;
  }

  /**
   * Массовый маппинг
   */
  mapArrayToResponseDto(
    appointments: Appointment[],
    options?: { role?: string; maskPII?: boolean; serviceLookup?: Record<string, ServiceInfo> },
  ): AppointmentResponseDto[] {
    return appointments.map((a) => this.mapToResponseDto(a, options));
  }

  /**
   * Базовая информация (для других модулей)
   */
  mapToBasicInfo(appointment: Appointment): { id: string; startTime: Date; status: string; customerName: string } {
    return {
      id: appointment.id,
      startTime: appointment.startTime,
      status: appointment.status as unknown as string,
      customerName: this.formatCustomerName(appointment),
    };
  }

  /**
   * Маппинг для real-time tracking
   */
  mapToTrackingDto(appointment: Appointment): AppointmentTracking {
    return {
      appointmentId: appointment.id,
      // В интерфейсе AppointmentTracking статус — enum. Возвращаем как есть.
      status: appointment.status,
      currentStep: this.getCurrentStep(appointment),
      progress: this.calculateProgress(appointment),
      estimatedCompletion: this.calculateEstimatedCompletion(appointment),
      actualDuration: appointment.actualDuration ?? undefined,
      delayReason: this.getDelayReason(appointment),
      nextActions: this.getNextActions(appointment),
      lastUpdated: appointment.updatedAt,
    };
  }

  /**
   * Маппинг для календарного события
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
   * Маппинг для audit логирования (без ПДн)
   */
  mapToAuditData(appointment: Appointment): Record<string, unknown> {
    return {
      id: appointment.id,
      companyId: appointment.companyId,
      customerId: appointment.customerId,
      mechanicId: appointment.mechanicId,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      status: appointment.status,
      priority: appointment.priority,
      estimatedCost: appointment.estimatedCost ? Number(appointment.estimatedCost) : undefined,
      finalCost: appointment.finalCost ? Number(appointment.finalCost) : undefined,
    };
  }

  // ========= Private helpers =========

  private maskPII(dto: AppointmentResponseDto): AppointmentResponseDto {
    const clone: AppointmentResponseDto = { ...dto };
    // Маскируем имя клиента (Иван П. / И. Петров)
    if (clone.customerName) clone.customerName = this.maskName(clone.customerName);
    // Маскируем контакты
    if (clone.contactEmail) clone.contactEmail = this.maskEmail(clone.contactEmail);
    if (clone.contactPhone) clone.contactPhone = this.maskPhone(clone.contactPhone);
    // Маскируем госномер в vehicleInfo (оставим марку/модель)
    if (clone.vehicleInfo) clone.vehicleInfo = this.stripLicensePlate(clone.vehicleInfo);
    // Заметки скрываем
    clone.customerNotes = undefined;
    clone.mechanicNotes = undefined;
    clone.feedback = undefined;
    return clone;
  }

  private maskName(fullName: string): string {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 1) + '***';
    const [first, last] = [parts[0], parts[1]];
    return `${first ? first[0] + '.' : ''} ${last ? last[0] + '***' : ''}`.trim();
  }

  private maskEmail(email: string): string {
    const [user, domain] = email.split('@');
    if (!domain) return '***';
    const maskedUser = user.length <= 2 ? '*'.repeat(user.length) : user[0] + '*'.repeat(user.length - 2) + user[user.length - 1];
    return `${maskedUser}@${domain}`;
  }

  private maskPhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 4) return '***';
    const masked = '*'.repeat(Math.max(0, digits.length - 4)) + digits.slice(-4);
    return masked;
  }

  private stripLicensePlate(vehicleInfo: string): string {
    // Удаляем скобки с содержимым в конце строки: "Model (A123BC77)" -> "Model"
    return vehicleInfo.replace(/\s*\([^)]*\)\s*$/, '').trim();
  }

  private formatCustomerName(appointment: Appointment): string {
    if (appointment.customer) {
      const { firstName, lastName } = appointment.customer as any;
      return `${firstName || ''} ${lastName || ''}`.trim() || 'Неизвестный клиент';
    }
    return 'Неизвестный клиент';
  }

  private formatVehicleInfo(appointment: Appointment): string {
    if (appointment.vehicle) {
      const { licensePlate } = appointment.vehicle as any;
      const modelInfo = (appointment.vehicle as any).model
        ? `${(appointment.vehicle as any).model.brand?.name || ''} ${(appointment.vehicle as any).model.name || ''}`.trim()
        : 'Неизвестная модель';

      return licensePlate ? `${modelInfo} (${licensePlate})` : modelInfo;
    }
    return 'Неизвестный автомобиль';
  }

  private formatMechanicName(appointment: Appointment): string {
    if (appointment.mechanic) {
      const { firstName, lastName } = appointment.mechanic as any;
      return `${firstName || ''} ${lastName || ''}`.trim() || 'Неназначенный мастер';
    }
    return 'Неназначенный мастер';
  }

  private formatServices(
    appointment: Appointment,
    serviceLookup?: Record<string, ServiceInfo>,
  ): Array<{ id: string; name: string; price: number; duration: number }> {
    const defaults = {
      name: 'Услуга',
      price: 0,
      duration: APPOINTMENTS_CONSTANTS.DEFAULTS.DEFAULT_DURATION,
    };
    return (appointment.serviceIds || []).map((serviceId) => {
      const found = serviceLookup?.[serviceId];
      return {
        id: serviceId,
        name: found?.name ?? defaults.name,
        price: found?.price ?? defaults.price,
        duration: found?.duration ?? defaults.duration,
      };
    });
  }

  private canCancel(appointment: Appointment): boolean {
    const now = new Date();
    const startTime = new Date(appointment.startTime);
    const hoursUntilStart = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    return (
      APPOINTMENTS_CONSTANTS.STATUSES.CANCELLABLE_STATUSES.includes(appointment.status) &&
      hoursUntilStart >= APPOINTMENTS_CONSTANTS.DEFAULTS.CANCELLATION_HOURS_BEFORE
    );
  }

  private canReschedule(appointment: Appointment): boolean {
    const now = new Date();
    const startTime = new Date(appointment.startTime);
    const hoursUntilStart = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60);

    return (
      APPOINTMENTS_CONSTANTS.STATUSES.EDITABLE_STATUSES.includes(appointment.status) &&
      hoursUntilStart >= APPOINTMENTS_CONSTANTS.DEFAULTS.CANCELLATION_HOURS_BEFORE
    );
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

    return Math.round((startTime.getTime() - now.getTime()) / (1000 * 60));
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
        return '#808080';
      case AppointmentStatus.SCHEDULED:
        return '#1E90FF';
      case AppointmentStatus.CONFIRMED:
        return '#2E8B57';
      case AppointmentStatus.IN_PROGRESS:
        return '#FF8C00';
      case AppointmentStatus.COMPLETED:
        return '#800080';
      case AppointmentStatus.CANCELED:
        return '#DC143C';
      case AppointmentStatus.NO_SHOW:
        return '#8B0000';
      default:
        return '#808080';
    }
  }
}
