import { Injectable, Logger } from '@nestjs/common';
import { AppointmentsDataService } from './services/appointments-data.service';
import { AppointmentsBusinessService } from './services/appointments-business.service';
import { AppointmentsValidationService } from './services/appointments-validation.service';
import { AppointmentsMapperService } from './services/appointments-mapper.service';
import { CreateAppointmentDto } from './dto/request/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/request/update-appointment.dto';
import { SmartScheduleDto } from './dto/request/smart-schedule.dto';
import { AppointmentResponseDto } from './dto/response/appointment-response.dto';
import { PaginatedAppointmentsResponseDto } from './dto/response/paginated-appointments-response.dto';
import { SmartScheduleResponseDto } from './dto/response/smart-schedule-response.dto';
import { AppointmentFilter, SmartSchedulingRequest } from './types/appointments.types';
import { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { APPOINTMENTS_CONSTANTS } from './constants/appointments.constants';

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    private readonly appointmentsDataService: AppointmentsDataService,
    private readonly appointmentsBusinessService: AppointmentsBusinessService,
    private readonly appointmentsValidationService: AppointmentsValidationService,
    private readonly appointmentsMapperService: AppointmentsMapperService,
  ) {}

  /**
   * Создание новой записи для пользователя
   */
  async createForUser(createAppointmentDto: CreateAppointmentDto, user: RequestWithUser['user']): Promise<AppointmentResponseDto> {
    this.logger.log(`Создание записи для пользователя: ${user.id}`);

    const createData = {
      ...createAppointmentDto,
      companyId: user.companyId!, // Обязательно устанавливаем companyId пользователя
    };

    // Валидация данных
    await this.appointmentsValidationService.validateCreateData(createData);

    // Создание через бизнес-сервис
    const appointment = await this.appointmentsBusinessService.createAppointment(createData);

    this.logger.log(`Запись успешно создана: ${appointment.id} для компании ${user.companyId}`);

    return this.appointmentsMapperService.mapToResponseDto(appointment);
  }

  /**
   * Получение всех записей для пользователя с фильтрацией
   */
  async findAllForUser(user: RequestWithUser['user'], filter: AppointmentFilter = {}): Promise<PaginatedAppointmentsResponseDto> {
    this.logger.log(`Поиск записей для пользователя: ${user.id}`);

    // 🔒 КРИТИЧНО: Устанавливаем companyId для безопасности
    const secureFilter: AppointmentFilter = {
      ...filter,
      companyId: user.role === 'superadmin' ? filter.companyId : user.companyId!,
    };

    const [appointments, total] = await this.appointmentsDataService.findWithFilters(secureFilter);

    const page = filter.page || 1;
    const limit = filter.limit || APPOINTMENTS_CONSTANTS.DEFAULTS.PAGE_SIZE;
    const totalPages = Math.ceil(total / limit);

    return {
      items: this.appointmentsMapperService.mapArrayToResponseDto(appointments),
      total,
      page,
      limit,
      totalPages,
    };
  }

  /**
   * Получение записи по ID (с проверкой принадлежности)
   */
  async findOne(id: string): Promise<AppointmentResponseDto> {
    this.logger.log(`Поиск записи по ID: ${id}`);

    const appointment = await this.appointmentsValidationService.validateAppointmentExists(id);

    return this.appointmentsMapperService.mapToResponseDto(appointment);
  }

  /**
   * Обновление записи
   */
  async update(id: string, updateAppointmentDto: UpdateAppointmentDto): Promise<AppointmentResponseDto> {
    this.logger.log(`Обновление записи: ${id}`);

    // Валидация данных
    await this.appointmentsValidationService.validateUpdateData(id, updateAppointmentDto);

    // Обновление через бизнес-сервис
    const updatedAppointment = await this.appointmentsBusinessService.updateAppointment(id, updateAppointmentDto);

    this.logger.log(`Запись успешно обновлена: ${id}`);

    return this.appointmentsMapperService.mapToResponseDto(updatedAppointment);
  }

  /**
   * Удаление записи (мягкое удаление)
   */
  async remove(id: string): Promise<void> {
    this.logger.log(`Удаление записи: ${id}`);

    // Проверяем существование записи
    await this.appointmentsValidationService.validateAppointmentExists(id);

    // Удаление через бизнес-сервис
    await this.appointmentsBusinessService.softDeleteAppointment(id);

    this.logger.log(`Запись успешно удалена: ${id}`);
  }

  /**
   * Жесткое удаление записи (только суперадмин)
   */
  async hardRemove(id: string): Promise<void> {
    this.logger.log(`Жесткое удаление записи: ${id}`);

    // Проверяем существование записи
    await this.appointmentsValidationService.validateAppointmentExists(id);

    // Жесткое удаление через бизнес-сервис
    await this.appointmentsBusinessService.deleteAppointment(id);

    this.logger.log(`Запись жестко удалена: ${id}`);
  }

  /**
   * Подтверждение записи
   */
  async confirmAppointment(id: string, user: RequestWithUser['user']): Promise<AppointmentResponseDto> {
    this.logger.log(`Подтверждение записи: ${id} пользователем ${user.id}`);

    const updatedAppointment = await this.appointmentsBusinessService.confirmAppointment(id, user.id);

    return this.appointmentsMapperService.mapToResponseDto(updatedAppointment);
  }

  /**
   * Завершение записи
   */
  async completeAppointment(id: string, user: RequestWithUser['user'], completionData?: any): Promise<AppointmentResponseDto> {
    this.logger.log(`Завершение записи: ${id} пользователем ${user.id}`);

    const updatedAppointment = await this.appointmentsBusinessService.completeAppointment(id, user.id, completionData);

    return this.appointmentsMapperService.mapToResponseDto(updatedAppointment);
  }

  /**
   * Отмена записи
   */
  async cancelAppointment(id: string, user: RequestWithUser['user'], reason?: string): Promise<AppointmentResponseDto> {
    this.logger.log(`Отмена записи: ${id} пользователем ${user.id}`);

    // Проверяем права на отмену
    await this.appointmentsValidationService.validateCancellationPermissions(id, user.id);

    const updatedAppointment = await this.appointmentsBusinessService.cancelAppointment(id, user.id, reason);

    return this.appointmentsMapperService.mapToResponseDto(updatedAppointment);
  }

  /**
   * Перенос записи
   */
  async rescheduleAppointment(
    id: string, 
    newStartTime: Date, 
    newEndTime: Date, 
    user: RequestWithUser['user']
  ): Promise<AppointmentResponseDto> {
    this.logger.log(`Перенос записи: ${id} на ${newStartTime} пользователем ${user.id}`);

    // Проверяем права на перенос
    await this.appointmentsValidationService.validateReschedulePermissions(id, user.id);

    const updatedAppointment = await this.appointmentsBusinessService.rescheduleAppointment(
      id, 
      newStartTime, 
      newEndTime, 
      user.id
    );

    return this.appointmentsMapperService.mapToResponseDto(updatedAppointment);
  }

  /**
   * 🔥 Умное планирование записи
   */
  async smartSchedule(smartScheduleDto: SmartScheduleDto, user: RequestWithUser['user']): Promise<SmartScheduleResponseDto> {
    this.logger.log(`Умное планирование для пользователя: ${user.id}`);

    const request: SmartSchedulingRequest = {
      ...smartScheduleDto,
    };

    // TODO: Реализация умного планирования
    // Заглушка для демонстрации структуры
    return {
      recommendedSlots: [],
      alternatives: [],
      nextAvailableDate: new Date(),
      estimatedWaitTime: 1,
      generalRecommendation: 'Умное планирование будет реализовано в следующей версии',
    };
  }

  /**
   * Проверка доступности слотов
   */
  async checkAvailability(serviceIds: string[], date: Date, user: RequestWithUser['user']): Promise<any[]> {
    this.logger.log(`Проверка доступности на ${date} для пользователя: ${user.id}`);

    // TODO: Реализация проверки доступности
    return [];
  }

  /**
   * Получение записей клиента
   */
  async findByCustomer(customerId: string, user: RequestWithUser['user']): Promise<AppointmentResponseDto[]> {
    this.logger.log(`Поиск записей клиента: ${customerId}`);

    const appointments = await this.appointmentsDataService.findByCustomer(customerId, user.companyId!);

    return this.appointmentsMapperService.mapArrayToResponseDto(appointments);
  }

  /**
   * Получение записей мастера
   */
  async findByMechanic(mechanicId: string, dateFrom: Date, dateTo: Date, user: RequestWithUser['user']): Promise<AppointmentResponseDto[]> {
    this.logger.log(`Поиск записей мастера: ${mechanicId} с ${dateFrom} по ${dateTo}`);

    const appointments = await this.appointmentsDataService.findByMechanic(mechanicId, dateFrom, dateTo);

    return this.appointmentsMapperService.mapArrayToResponseDto(appointments);
  }

  /**
   * Статистика записей
   */
  async getStats(companyId: string): Promise<any> {
    this.logger.log(`Получение статистики записей для компании: ${companyId}`);

    // TODO: Реализация статистики
    return {
      total: 0,
      byStatus: {},
      completionRate: 0,
      averageRating: 0,
    };
  }

  /**
   * Массовые операции с записями
   */
  async bulkOperation(appointmentIds: string[], operation: string, user: RequestWithUser['user']): Promise<any> {
    this.logger.log(`Массовая операция ${operation} для записей: ${appointmentIds.join(', ')}`);

    // TODO: Реализация массовых операций
    return {
      successful: 0,
      failed: 0,
      errors: [],
    };
  }

  /**
   * Добавление оценки к записи
   */
  async addRating(id: string, rating: number, feedback?: string): Promise<AppointmentResponseDto> {
    this.logger.log(`Добавление оценки ${rating} к записи: ${id}`);

    const updatedAppointment = await this.appointmentsBusinessService.addRating(id, rating, feedback);

    return this.appointmentsMapperService.mapToResponseDto(updatedAppointment);
  }

  /**
   * Получение tracking информации о записи
   */
  async getTracking(id: string): Promise<any> {
    this.logger.log(`Получение tracking информации для записи: ${id}`);

    const appointment = await this.appointmentsValidationService.validateAppointmentExists(id);

    return this.appointmentsMapperService.mapToTrackingDto(appointment);
  }
}
