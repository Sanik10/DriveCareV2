// path: apps/backend/src/modules/appointments/appointments.service.ts
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
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
import { AppointmentTrackingDto } from './dto/response/smart-schedule-response.dto';
import { AppointmentFilter, SmartSchedulingRequest } from './types/appointments.types';
import { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { APPOINTMENTS_CONSTANTS } from './constants/appointments.constants';
import { AppointmentStatus } from '../../database/entities';

type ServiceInfo = { id: string; name: string; price: number; duration: number };

@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    private readonly appointmentsDataService: AppointmentsDataService,
    private readonly appointmentsBusinessService: AppointmentsBusinessService,
    private readonly appointmentsValidationService: AppointmentsValidationService,
    private readonly appointmentsMapperService: AppointmentsMapperService,
  ) {}

  async createForUser(
    createAppointmentDto: CreateAppointmentDto,
    user: RequestWithUser['user'],
  ): Promise<AppointmentResponseDto> {
    this.logger.log(`Создание записи для пользователя: ${user.id}`);

    const createData = {
      ...createAppointmentDto,
      companyId: user.companyId!,
    };

    await this.appointmentsValidationService.validateCreateData(createData);
    const appointment = await this.appointmentsBusinessService.createAppointment(createData);

    this.logger.log(`Запись успешно создана: ${appointment.id} для компании ${user.companyId}`);
    return this.appointmentsMapperService.mapToResponseDto(appointment, { role: user.role });
  }

  async findAllForUser(
    user: RequestWithUser['user'],
    filter: AppointmentFilter = {},
  ): Promise<PaginatedAppointmentsResponseDto> {
    this.logger.log(`Поиск записей для пользователя: ${user.id}`);

    if (user.role === 'superadmin' && !filter.companyId) {
      throw new BadRequestException('companyId is required for superadmin listings');
    }

    const secureFilter: AppointmentFilter = {
      ...filter,
      companyId: user.role === 'superadmin' ? filter.companyId : user.companyId!,
    };

    const [appointments, total] = await this.appointmentsDataService.findWithFilters(secureFilter);

    const page = filter.page || 1;
    const limit = filter.limit || APPOINTMENTS_CONSTANTS.DEFAULTS.PAGE_SIZE;
    const totalPages = Math.ceil(total / limit);

    return {
      items: this.appointmentsMapperService.mapArrayToResponseDto(appointments, { role: user.role }),
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findOne(id: string): Promise<AppointmentResponseDto> {
    this.logger.log(`Поиск записи по ID: ${id}`);
    const appointment = await this.appointmentsValidationService.validateAppointmentExists(id);
    return this.appointmentsMapperService.mapToResponseDto(appointment);
  }

  async update(id: string, updateAppointmentDto: UpdateAppointmentDto): Promise<AppointmentResponseDto> {
    this.logger.log(`Обновление записи: ${id}`);
    await this.appointmentsValidationService.validateUpdateData(id, updateAppointmentDto);
    const updatedAppointment = await this.appointmentsBusinessService.updateAppointment(id, updateAppointmentDto);
    this.logger.log(`Запись успешно обновлена: ${id}`);
    return this.appointmentsMapperService.mapToResponseDto(updatedAppointment);
  }

  async remove(id: string): Promise<void> {
    this.logger.log(`Удаление записи: ${id}`);
    await this.appointmentsValidationService.validateAppointmentExists(id);
    await this.appointmentsBusinessService.softDeleteAppointment(id);
    this.logger.log(`Запись успешно удалена: ${id}`);
  }

  async hardRemove(id: string): Promise<void> {
    this.logger.log(`Жесткое удаление записи: ${id}`);
    await this.appointmentsValidationService.validateAppointmentExists(id);
    await this.appointmentsBusinessService.deleteAppointment(id);
    this.logger.log(`Запись жестко удалена: ${id}`);
  }

  async confirmAppointment(id: string, user: RequestWithUser['user']): Promise<AppointmentResponseDto> {
    this.logger.log(`Подтверждение записи: ${id} пользователем ${user.id}`);
    const updatedAppointment = await this.appointmentsBusinessService.confirmAppointment(id, user.id);
    return this.appointmentsMapperService.mapToResponseDto(updatedAppointment);
  }

  async completeAppointment(
    id: string,
    user: RequestWithUser['user'],
    completionData?: any,
  ): Promise<AppointmentResponseDto> {
    this.logger.log(`Завершение записи: ${id} пользователем ${user.id}`);
    const updatedAppointment = await this.appointmentsBusinessService.completeAppointment(id, user.id, completionData);
    return this.appointmentsMapperService.mapToResponseDto(updatedAppointment);
  }

  async cancelAppointment(id: string, user: RequestWithUser['user'], reason?: string): Promise<AppointmentResponseDto> {
    this.logger.log(`Отмена записи: ${id} пользователем ${user.id}`);
    await this.appointmentsValidationService.validateCancellationPermissions(id, user.id);
    const updatedAppointment = await this.appointmentsBusinessService.cancelAppointment(id, user.id, reason);
    return this.appointmentsMapperService.mapToResponseDto(updatedAppointment);
  }

  async rescheduleAppointment(
    id: string,
    newStartTime: Date,
    newEndTime: Date,
    user: RequestWithUser['user'],
  ): Promise<AppointmentResponseDto> {
    this.logger.log(`Перенос записи: ${id} на ${newStartTime.toISOString()} пользователем ${user.id}`);

    await this.appointmentsValidationService.validateReschedulePermissions(id, user.id);

    const existing = await this.appointmentsValidationService.validateAppointmentExists(id);
    await this.appointmentsValidationService.validateTimeSlot(
      existing.mechanicId,
      newStartTime,
      newEndTime,
      id,
      existing.companyId,
    );
    await this.appointmentsValidationService.validateMechanicAvailability(
      existing.mechanicId,
      newStartTime,
      newEndTime,
    );

    const updatedAppointment = await this.appointmentsBusinessService.rescheduleAppointment(
      id,
      newStartTime,
      newEndTime,
      user.id,
    );

    return this.appointmentsMapperService.mapToResponseDto(updatedAppointment);
  }

  /**
   * Умное планирование записи: поиск свободных слотов в пределах окна предпочтений
   */
  async smartSchedule(smartScheduleDto: SmartScheduleDto, user: RequestWithUser['user']): Promise<SmartScheduleResponseDto> {
    this.logger.log(`Умное планирование для пользователя: ${user.id}`);

    const req: SmartSchedulingRequest = { ...smartScheduleDto };
    const companyId = user.companyId!;
    const date = req.preferredDate ? new Date(req.preferredDate) : new Date();
    date.setHours(0, 0, 0, 0);

    const windowStartStr = req.preferredTimeStart || APPOINTMENTS_CONSTANTS.BUSINESS_RULES.WORKING_HOURS_START;
    const windowEndStr = req.preferredTimeEnd || APPOINTMENTS_CONSTANTS.BUSINESS_RULES.WORKING_HOURS_END;

    const dayStart = new Date(date);
    const dayEnd = new Date(date);
    const [wsH, wsM] = windowStartStr.split(':').map((x) => parseInt(x, 10));
    const [weH, weM] = windowEndStr.split(':').map((x) => parseInt(x, 10));
    dayStart.setHours(wsH, wsM, 0, 0);
    dayEnd.setHours(weH, weM, 0, 0);

    const slotBuffer = APPOINTMENTS_CONSTANTS.BUSINESS_RULES.SLOT_BUFFER_MINUTES;
    const durationPerService = APPOINTMENTS_CONSTANTS.DEFAULTS.DEFAULT_DURATION;
    const totalDuration = (smartScheduleDto.serviceIds?.length || 1) * durationPerService;

    // Кандидаты мастеров
    const mechanics =
      req.preferredMechanicId ? [req.preferredMechanicId] : await this.appointmentsDataService.getMechanicIdsByCompany(companyId);

    const availableSlots: {
      mechanicId: string;
      startTime: Date;
      endTime: Date;
      confidence: number;
    }[] = [];

    // Сканируем доступные слоты по всем мастерам в пределах дня
    for (const mechanicId of mechanics) {
      let cursor = new Date(dayStart);
      while (cursor.getTime() + totalDuration * 60000 <= dayEnd.getTime()) {
        const slotStart = new Date(cursor);
        const slotEnd = new Date(cursor.getTime() + totalDuration * 60000);

        // Проверка пересечений
        const conflicts = await this.appointmentsDataService.findConflicts(
          mechanicId,
          slotStart,
          slotEnd,
          undefined,
          companyId,
        );

        if (conflicts.length === 0) {
          // Оценка доверия (простейшая, с учётом приоритета)
          const priorityWeight =
            smartScheduleDto.priority === 'urgent'
              ? 1.0
              : smartScheduleDto.priority === 'high'
              ? 0.9
              : smartScheduleDto.priority === 'normal'
              ? 0.8
              : 0.7;
          availableSlots.push({
            mechanicId,
            startTime: slotStart,
            endTime: slotEnd,
            confidence: priorityWeight,
          });
        }

        // Смещаем курсор на буфер
        cursor = new Date(cursor.getTime() + slotBuffer * 60000);
      }
    }

    // Сортируем по уверенности и времени
    availableSlots.sort((a, b) => (b.confidence - a.confidence) || (a.startTime.getTime() - b.startTime.getTime()));

    // Формируем DTO
    const toDto = (s: { mechanicId: string; startTime: Date; endTime: Date; confidence: number }) => ({
      mechanicId: s.mechanicId,
      mechanicName: '', // можно обогатить при необходимости
      startTime: s.startTime,
      endTime: s.endTime,
      confidence: s.confidence,
      totalCost: 0, // без интеграции с каталогом услуг
      estimatedDuration: totalDuration,
      conflicts: [],
      recommendationReason: req.preferredMechanicId ? 'Предпочитаемый мастер' : 'Доступное окно',
    });

    const maxAlt = APPOINTMENTS_CONSTANTS.SMART_SCHEDULING.MAX_ALTERNATIVE_SLOTS;
    const recommended = availableSlots.slice(0, maxAlt).map(toDto);
    const alternatives = availableSlots.slice(maxAlt, maxAlt * 2).map(toDto);

    // Следующая доступная дата: если нет слотов сегодня — двигаемся вперёд
    let nextAvailableDate = new Date(date);
    if (availableSlots.length === 0) {
      const maxDays = smartScheduleDto.maxWaitingDays || APPOINTMENTS_CONSTANTS.DEFAULTS.BOOKING_ADVANCE_DAYS;
      for (let i = 1; i <= maxDays; i++) {
        const d = new Date(date);
        d.setDate(date.getDate() + i);
        // Берём рабочие дни (исключая воскресенье)
        if (d.getDay() === 0) continue;
        nextAvailableDate = d;
        break;
      }
    }

    return {
      recommendedSlots: recommended,
      alternatives,
      nextAvailableDate,
      estimatedWaitTime: availableSlots.length > 0 ? 0 : 1,
      generalRecommendation: availableSlots.length > 0 ? 'Найдены подходящие слоты' : 'Рекомендуем выбрать ближайшую доступную дату',
    };
  }

  /**
   * Проверка доступности слотов (на дату)
   */
  async checkAvailability(serviceIds: string[], date: Date, user: RequestWithUser['user']): Promise<
    Array<{
      mechanicId: string;
      startTime: Date;
      endTime: Date;
      confidence: number;
    }>
  > {
    this.logger.log(`Проверка доступности на ${date.toISOString()} для пользователя: ${user.id}`);

    const companyId = user.companyId!;
    const day = new Date(date);
    day.setHours(0, 0, 0, 0);

    const windowStartStr = APPOINTMENTS_CONSTANTS.BUSINESS_RULES.WORKING_HOURS_START;
    const windowEndStr = APPOINTMENTS_CONSTANTS.BUSINESS_RULES.WORKING_HOURS_END;

    const dayStart = new Date(day);
    const dayEnd = new Date(day);
    const [wsH, wsM] = windowStartStr.split(':').map((x) => parseInt(x, 10));
    const [weH, weM] = windowEndStr.split(':').map((x) => parseInt(x, 10));
    dayStart.setHours(wsH, wsM, 0, 0);
    dayEnd.setHours(weH, weM, 0, 0);

    const slotBuffer = APPOINTMENTS_CONSTANTS.BUSINESS_RULES.SLOT_BUFFER_MINUTES;
    const durationPerService = APPOINTMENTS_CONSTANTS.DEFAULTS.DEFAULT_DURATION;
    const totalDuration = (serviceIds?.length || 1) * durationPerService;

    const mechanics = await this.appointmentsDataService.getMechanicIdsByCompany(companyId);

    const slots: { mechanicId: string; startTime: Date; endTime: Date; confidence: number }[] = [];
    for (const mechanicId of mechanics) {
      let cursor = new Date(dayStart);
      while (cursor.getTime() + totalDuration * 60000 <= dayEnd.getTime()) {
        const slotStart = new Date(cursor);
        const slotEnd = new Date(cursor.getTime() + totalDuration * 60000);

        const conflicts = await this.appointmentsDataService.findConflicts(
          mechanicId,
          slotStart,
          slotEnd,
          undefined,
          companyId,
        );

        if (conflicts.length === 0) {
          slots.push({
            mechanicId,
            startTime: slotStart,
            endTime: slotEnd,
            confidence: 0.8,
          });
        }

        cursor = new Date(cursor.getTime() + slotBuffer * 60000);
      }
    }

    // Сортировка по времени (раньше — выше)
    slots.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
    return slots;
  }

  /**
   * Статистика записей
   */
  async getStats(companyId: string): Promise<any> {
    this.logger.log(`Получение статистики записей для компании: ${companyId}`);
    const stats = await this.appointmentsDataService.getStats(companyId);
    return stats;
  }

  /**
   * Реал-тайм трекинг записи
   */
  async getTracking(id: string): Promise<AppointmentTrackingDto> {
    this.logger.log(`Tracking по записи: ${id}`);
    const appointment = await this.appointmentsValidationService.validateAppointmentExists(id);
    return this.appointmentsMapperService.mapToTrackingDto(appointment) as unknown as AppointmentTrackingDto;
  }

  /**
   * Список записей клиента (в пределах компании пользователя)
   */
  async findByCustomer(
    customerId: string,
    user: RequestWithUser['user'],
  ): Promise<AppointmentResponseDto[]> {
    this.logger.log(`Записи клиента ${customerId} для пользователя ${user.id}`);

    if (user.role === 'superadmin' && !user.companyId) {
      throw new BadRequestException('companyId is required for superadmin');
    }
    const companyId = user.companyId!;

    const items = await this.appointmentsDataService.findByCustomer(customerId, companyId);
    return this.appointmentsMapperService.mapArrayToResponseDto(items, { role: user.role });
  }

  /**
   * Список записей мастера за период (в пределах компании пользователя)
   */
  async findByMechanic(
    mechanicId: string,
    dateFrom: Date,
    dateTo: Date,
    user: RequestWithUser['user'],
  ): Promise<AppointmentResponseDto[]> {
    this.logger.log(
      `Записи мастера ${mechanicId} c ${dateFrom.toISOString()} по ${dateTo.toISOString()} для пользователя ${user.id}`,
    );

    if (user.role === 'superadmin' && !user.companyId) {
      throw new BadRequestException('companyId is required for superadmin');
    }
    const companyId = user.companyId!;

    const items = await this.appointmentsDataService.findByMechanic(mechanicId, companyId, dateFrom, dateTo);
    return this.appointmentsMapperService.mapArrayToResponseDto(items, { role: user.role });
  }

  /**
   * Добавление оценки/отзыва к завершённой записи
   */
  async addRating(id: string, rating: number, feedback?: string): Promise<AppointmentResponseDto> {
    this.logger.log(`Добавление рейтинга ${rating} для записи ${id}`);

    if (Number.isNaN(rating) || rating < APPOINTMENTS_CONSTANTS.RATING.MIN_RATING || rating > APPOINTMENTS_CONSTANTS.RATING.MAX_RATING) {
      throw new BadRequestException(
        `rating должен быть целым числом в диапазоне ${APPOINTMENTS_CONSTANTS.RATING.MIN_RATING}..${APPOINTMENTS_CONSTANTS.RATING.MAX_RATING}`,
      );
    }

    const appointment = await this.appointmentsValidationService.validateAppointmentExists(id);
    if (appointment.status !== AppointmentStatus.COMPLETED) {
      throw new BadRequestException('Оценку можно оставить только для завершённой записи');
    }

    const updated = await this.appointmentsBusinessService.addRating(id, rating, feedback);
    return this.appointmentsMapperService.mapToResponseDto(updated);
  }

  /**
   * Массовые операции с записями
   */
  async bulkOperation(
    appointmentIds: string[],
    operation: 'reschedule' | 'cancel' | 'confirm' | 'delete',
    user: RequestWithUser['user'],
    payload?: { startTime?: Date; endTime?: Date; reason?: string },
  ): Promise<{
    successful: number;
    failed: number;
    errors: Array<{ appointmentId: string; error: string }>;
  }> {
    this.logger.log(`Массовая операция ${operation} для записей: ${appointmentIds.join(', ')}`);

    let successful = 0;
    const errors: Array<{ appointmentId: string; error: string }> = [];

    for (const id of appointmentIds) {
      try {
        switch (operation) {
          case 'confirm':
            await this.confirmAppointment(id, user);
            break;
          case 'cancel':
            await this.cancelAppointment(id, user, payload?.reason);
            break;
          case 'delete':
            await this.remove(id);
            break;
          case 'reschedule':
            if (!payload?.startTime || !payload?.endTime) {
              throw new BadRequestException('startTime и endTime обязательны для операции reschedule');
            }
            await this.rescheduleAppointment(id, payload.startTime, payload.endTime, user);
            break;
          default:
            throw new BadRequestException(`Операция ${operation} не поддерживается`);
        }
        successful += 1;
      } catch (e: any) {
        errors.push({ appointmentId: id, error: e?.message || String(e) });
      }
    }

    return {
      successful,
      failed: appointmentIds.length - successful,
      errors,
    };
  }
}
