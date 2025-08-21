// path: src/appointments/appointments.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { AppointmentsDataService } from './appointments-data.service';
import { Appointment, AppointmentStatus } from '../../../database/entities';
import { CreateAppointmentData, UpdateAppointmentData } from '../types/appointments.types';
import { IAppointmentsBusinessService } from '../interfaces/appointments.interface';

@Injectable()
export class AppointmentsBusinessService implements IAppointmentsBusinessService {
  private readonly logger = new Logger(AppointmentsBusinessService.name);

  constructor(
    private readonly appointmentsDataService: AppointmentsDataService,
  ) {}

  /**
   * Создание записи с бизнес-логикой
   */
  async createAppointment(data: CreateAppointmentData): Promise<Appointment> {
    const appointmentData = {
      ...data,
      status: AppointmentStatus.DRAFT,
    };

    const appointment = await this.appointmentsDataService.create(appointmentData);

    // Логируем создание
    this.logger.log(`Создана запись: ${appointment.id} для клиента ${appointment.customerId}`);

    return appointment;
  }

  /**
   * Обновление записи с бизнес-логикой
   */
  async updateAppointment(id: string, data: UpdateAppointmentData): Promise<Appointment> {
    const beforeAppointment = await this.appointmentsDataService.findById(id);
    if (!beforeAppointment) {
      throw new Error(`Appointment with id ${id} not found`);
    }

    const updatedAppointment = await this.appointmentsDataService.update(id, data);

    // Логируем обновление
    this.logger.log(`Обновлена запись: ${id}, поля: ${Object.keys(data).join(', ')}`);

    return updatedAppointment;
  }

  /**
   * Жесткое удаление записи с бизнес-логикой
   */
  async deleteAppointment(id: string): Promise<void> {
    const appointment = await this.appointmentsDataService.findById(id);
    if (!appointment) {
      throw new Error(`Appointment with id ${id} not found`);
    }

    await this.appointmentsDataService.delete(id);

    // Логируем удаление
    this.logger.log(`Удалена запись: ${id} (жесткое удаление)`);
  }

  /**
   * Мягкое удаление записи с бизнес-логикой
   */
  async softDeleteAppointment(id: string): Promise<void> {
    const appointment = await this.appointmentsDataService.findById(id);
    if (!appointment) {
      throw new Error(`Appointment with id ${id} not found`);
    }

    await this.appointmentsDataService.softDelete(id);

    // Логируем мягкое удаление
    this.logger.log(`Удалена запись: ${id} (мягкое удаление)`);
  }

  /**
   * Изменение статуса записи с бизнес-логикой
   */
  async changeStatus(id: string, newStatus: string, userId: string): Promise<Appointment> {
    const appointment = await this.appointmentsDataService.findById(id);
    if (!appointment) {
      throw new Error(`Appointment with id ${id} not found`);
    }

    const oldStatus = appointment.status;
    const updatedAppointment = await this.appointmentsDataService.update(id, { 
      status: newStatus as AppointmentStatus 
    });

    // Логируем изменение статуса
    this.logger.log(`Изменен статус записи ${id}: ${oldStatus} -> ${newStatus} пользователем ${userId}`);

    return updatedAppointment;
  }

  /**
   * Подтверждение записи
   */
  async confirmAppointment(id: string, userId: string): Promise<Appointment> {
    const updatedAppointment = await this.changeStatus(id, AppointmentStatus.CONFIRMED, userId);
    
    // Обновляем флаг подтверждения
    await this.appointmentsDataService.update(id, { 
      confirmationSent: true 
    });

    // Логируем подтверждение
    this.logger.log(`Подтверждена запись: ${id} пользователем ${userId}`);

    return updatedAppointment;
  }

  /**
   * Завершение записи
   */
  async completeAppointment(id: string, userId: string, completionData?: any): Promise<Appointment> {
    const appointment = await this.appointmentsDataService.findById(id);
    if (!appointment) {
      throw new Error(`Appointment with id ${id} not found`);
    }

    // Вычисляем фактическую продолжительность
    const actualDuration = this.calculateActualDuration(appointment);
    
    const updateData: UpdateAppointmentData = {
      status: AppointmentStatus.COMPLETED,
      actualDuration,
      ...completionData,
    };

    const updatedAppointment = await this.appointmentsDataService.update(id, updateData);

    // Логируем завершение
    this.logger.log(`Завершена запись: ${id} пользователем ${userId}, длительность: ${actualDuration} мин`);

    return updatedAppointment;
  }

  /**
   * Отмена записи
   */
  async cancelAppointment(id: string, userId: string, reason?: string): Promise<Appointment> {
    const updatedAppointment = await this.changeStatus(id, AppointmentStatus.CANCELED, userId);

    // Логируем отмену с причиной
    this.logger.log(`Отменена запись: ${id} пользователем ${userId}${reason ? `, причина: ${reason}` : ''}`);

    return updatedAppointment;
  }

  /**
   * Перенос записи
   */
  async rescheduleAppointment(
    id: string, 
    newStartTime: Date, 
    newEndTime: Date, 
    userId: string
  ): Promise<Appointment> {
    const appointment = await this.appointmentsDataService.findById(id);
    if (!appointment) {
      throw new Error(`Appointment with id ${id} not found`);
    }

    const oldStartTime = appointment.startTime;
    const oldEndTime = appointment.endTime;

    const updatedAppointment = await this.appointmentsDataService.update(id, {
      startTime: newStartTime,
      endTime: newEndTime,
      status: AppointmentStatus.RESCHEDULED,
    });

    // Логируем перенос
    this.logger.log(`Перенесена запись: ${id} с ${oldStartTime} на ${newStartTime} пользователем ${userId}`);

    return updatedAppointment;
  }

  /**
   * Добавление оценки и отзыва
   */
  async addRating(id: string, rating: number, feedback?: string): Promise<Appointment> {
    const updatedAppointment = await this.appointmentsDataService.update(id, {
      rating,
      feedback,
    });

    // Логируем добавление оценки
    this.logger.log(`Добавлена оценка ${rating} для записи ${id}${feedback ? ' с отзывом' : ''}`);

    return updatedAppointment;
  }

  /**
   * Вычисление фактической продолжительности
   */
  private calculateActualDuration(appointment: Appointment): number {
    const startTime = new Date(appointment.startTime);
    const now = new Date();
    return Math.round((now.getTime() - startTime.getTime()) / (1000 * 60)); // в минутах
  }
}
