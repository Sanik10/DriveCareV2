// src/modules/work-schedules/services/work-schedules-validation.service.ts
import { Injectable } from '@nestjs/common';
import { WorkSchedulesDataService } from './work-schedules-data.service';
import { CreateScheduleDto } from '../dto/request/create-schedule.dto';
import { UpdateScheduleDto } from '../dto/request/update-schedule.dto';
import { CreateExceptionDto } from '../dto/request/create-exception.dto';
import { WorkSchedule, ScheduleException } from '../../../database/entities';
import { IWorkSchedulesValidationService } from '../interfaces/work-schedules.interface';
import { 
  WorkScheduleNotFoundException,
  WorkScheduleConflictException,
  ValidationDataException 
} from '../../../common/exceptions/domain.exceptions';
import { 
  WORK_SCHEDULES_CONSTANTS, 
  WORK_SCHEDULES_VALIDATION_MESSAGES 
} from '../constants/work-schedules.constants';

@Injectable()
export class WorkSchedulesValidationService implements IWorkSchedulesValidationService {
  constructor(
    private readonly dataService: WorkSchedulesDataService,
  ) {}

  /**
   * 🔒 Проверка существования расписания
   */
  async validateScheduleExists(id: string): Promise<WorkSchedule> {
    const schedule = await this.dataService.findById(id);
    
    if (!schedule) {
      throw new WorkScheduleNotFoundException(id);
    }

    return schedule;
  }

  /**
   * 🔒 Валидация данных расписания
   */
  async validateScheduleData(data: CreateScheduleDto | UpdateScheduleDto): Promise<void> {
    // Проверка дня недели
    if (data.dayOfWeek !== undefined) {
      if (data.dayOfWeek < 0 || data.dayOfWeek > 6) {
        throw new ValidationDataException('dayOfWeek', WORK_SCHEDULES_VALIDATION_MESSAGES.INVALID_DAY_OF_WEEK);
      }
    }

    // Проверка времени
    if (data.startTime && data.endTime) {
      await this.validateTimeRange(data.startTime, data.endTime);
    }

    // Проверка эффективности
    if (data.efficiency !== undefined) {
      await this.validateEfficiency(data.efficiency);
    }

    // Проверка перерыва
    if (data.breakStartTime && data.breakEndTime) {
      await this.validateTimeRange(data.breakStartTime, data.breakEndTime);
      
      // Проверка что перерыв в рабочее время
      if (data.startTime && data.endTime) {
        const workStart = this.timeToMinutes(data.startTime);
        const workEnd = this.timeToMinutes(data.endTime);
        const breakStart = this.timeToMinutes(data.breakStartTime);
        const breakEnd = this.timeToMinutes(data.breakEndTime);

        if (breakStart < workStart || breakEnd > workEnd) {
          throw new ValidationDataException(
            'breakTime',
            'Время перерыва должно быть в пределах рабочего времени'
          );
        }

        // Проверка минимального времени перерыва
        const breakDuration = breakEnd - breakStart;
        if (breakDuration < WORK_SCHEDULES_CONSTANTS.MIN_BREAK_MINUTES) {
          throw new ValidationDataException(
            'breakTime',
            WORK_SCHEDULES_VALIDATION_MESSAGES.INSUFFICIENT_BREAK_TIME
          );
        }
      }
    }

    // Проверка максимальных рабочих дней подряд
    if (data.maxConsecutiveDays !== undefined) {
      if (data.maxConsecutiveDays > WORK_SCHEDULES_CONSTANTS.MAX_CONSECUTIVE_DAYS) {
        throw new ValidationDataException(
          'maxConsecutiveDays',
          WORK_SCHEDULES_VALIDATION_MESSAGES.TOO_MANY_CONSECUTIVE_DAYS
        );
      }
    }
  }

  /**
   * 🔒 Проверка конфликтов расписания
   */
  async validateScheduleConflicts(
    userId: string, 
    dayOfWeek: number, 
    companyId: string, 
    excludeId?: string
  ): Promise<void> {
    const existingSchedule = await this.dataService.findByUserAndDay(userId, dayOfWeek, companyId);
    
    if (existingSchedule && existingSchedule.id !== excludeId) {
      throw new WorkScheduleConflictException(userId, dayOfWeek);
    }
  }

  /**
   * 🔒 Валидация времени
   */
  async validateTimeRange(startTime: string, endTime: string): Promise<void> {
    // Проверка формата времени
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    
    if (!timeRegex.test(startTime)) {
      throw new ValidationDataException('startTime', WORK_SCHEDULES_VALIDATION_MESSAGES.INVALID_TIME_FORMAT);
    }
    
    if (!timeRegex.test(endTime)) {
      throw new ValidationDataException('endTime', WORK_SCHEDULES_VALIDATION_MESSAGES.INVALID_TIME_FORMAT);
    }

    // Проверка что время окончания после времени начала
    const startMinutes = this.timeToMinutes(startTime);
    const endMinutes = this.timeToMinutes(endTime);
    
    if (endMinutes <= startMinutes) {
      throw new ValidationDataException('timeRange', WORK_SCHEDULES_VALIDATION_MESSAGES.INVALID_TIME_RANGE);
    }
  }

  /**
   * 🔒 Валидация коэффициента эффективности
   */
  async validateEfficiency(efficiency: number): Promise<void> {
    if (efficiency < WORK_SCHEDULES_CONSTANTS.MIN_EFFICIENCY || 
        efficiency > WORK_SCHEDULES_CONSTANTS.MAX_EFFICIENCY) {
      throw new ValidationDataException('efficiency', WORK_SCHEDULES_VALIDATION_MESSAGES.INVALID_EFFICIENCY);
    }
  }

  /**
   * 🔒 Валидация данных исключения
   */
  async validateExceptionData(data: CreateExceptionDto): Promise<void> {
    // Проверка диапазона дат
    await this.validateExceptionDateRange(data.startDate, data.endDate);
    
    // Проверка заблаговременности подачи заявки
    await this.validateAdvanceNotice(data.startDate);

    // Проверка времени для частичного дня
    if (!data.isFullDay && data.startTime && data.endTime) {
      await this.validateTimeRange(data.startTime, data.endTime);
    }
  }

  /**
   * 🔒 Валидация диапазона дат исключения
   */
  async validateExceptionDateRange(startDate: string, endDate: string): Promise<void> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (end < start) {
      throw new ValidationDataException(
        'dateRange',
        WORK_SCHEDULES_VALIDATION_MESSAGES.INVALID_EXCEPTION_DATE_RANGE
      );
    }
  }

  /**
   * 🔒 Валидация заблаговременности подачи заявки
   */
  async validateAdvanceNotice(startDate: string): Promise<void> {
    const start = new Date(startDate);
    const now = new Date();
    const daysInAdvance = Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysInAdvance < WORK_SCHEDULES_CONSTANTS.MIN_ADVANCE_NOTICE_DAYS) {
      throw new ValidationDataException(
        'advanceNotice',
        WORK_SCHEDULES_VALIDATION_MESSAGES.INSUFFICIENT_ADVANCE_NOTICE
      );
    }
  }

  /**
   * 🔒 Проверка принадлежности пользователя к компании
   */
  async validateUserBelongsToCompany(userId: string, companyId: string): Promise<void> {
    // TODO: Реализовать проверку через UserService когда будет готов
    // Пока что просто заглушка
    if (!userId || !companyId) {
      throw new ValidationDataException('user', 'Пользователь должен принадлежать к компании');
    }
  }

  /**
   * 🔒 Приватные вспомогательные методы
   */
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }
}
