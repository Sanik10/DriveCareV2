import { Injectable } from '@nestjs/common';
import { WorkSchedulesDataService } from './work-schedules-data.service';
import { CreateScheduleDto } from '../dto/request/create-schedule.dto';
import { UpdateScheduleDto } from '../dto/request/update-schedule.dto';
import { CreateExceptionDto } from '../dto/request/create-exception.dto';
import { WorkSchedule } from '../../../database/entities';
import { IWorkSchedulesValidationService } from '../interfaces/work-schedules.interface';
import {
  WorkScheduleNotFoundException,
  WorkScheduleConflictException,
  ValidationDataException,
} from '../../../common/exceptions/domain.exceptions';
import { WORK_SCHEDULES_CONSTANTS, WORK_SCHEDULES_VALIDATION_MESSAGES } from '../constants/work-schedules.constants';

@Injectable()
export class WorkSchedulesValidationService implements IWorkSchedulesValidationService {
  constructor(private readonly dataService: WorkSchedulesDataService) {}

  async validateScheduleExists(id: string): Promise<WorkSchedule> {
    const schedule = await this.dataService.findById(id);
    if (!schedule) {
      throw new WorkScheduleNotFoundException(id);
    }
    return schedule;
  }

  async validateScheduleData(data: CreateScheduleDto | UpdateScheduleDto): Promise<void> {
    // День недели
    if (data.dayOfWeek !== undefined) {
      if (data.dayOfWeek < 0 || data.dayOfWeek > 6) {
        throw new ValidationDataException('dayOfWeek', WORK_SCHEDULES_VALIDATION_MESSAGES.INVALID_DAY_OF_WEEK);
      }
    }

    // Для рабочего дня требуется корректное время
    if (data.isDayOff !== true) {
      if (!data.startTime || !data.endTime) {
        throw new ValidationDataException('timeRange', 'Необходимо указать startTime и endTime для рабочего дня');
      }
    }

    // Рабочее время
    if (data.startTime && data.endTime) {
      await this.validateTimeRange(data.startTime, data.endTime);

      // Проверка длительности смены (MIN/MAX)
      const startMin = this.timeToMinutes(data.startTime);
      const endMin = this.timeToMinutes(data.endTime);
      const shiftHours = (endMin - startMin) / 60;

      if (shiftHours < WORK_SCHEDULES_CONSTANTS.MIN_SHIFT_HOURS) {
        throw new ValidationDataException(
          'timeRange',
          `Смена должна быть не короче ${WORK_SCHEDULES_CONSTANTS.MIN_SHIFT_HOURS} часов`,
        );
      }
      if (shiftHours > WORK_SCHEDULES_CONSTANTS.MAX_SHIFT_HOURS) {
        throw new ValidationDataException(
          'timeRange',
          `Смена не может превышать ${WORK_SCHEDULES_CONSTANTS.MAX_SHIFT_HOURS} часов`,
        );
      }
    }

    // Коэффициент эффективности
    if (data.efficiency !== undefined) {
      await this.validateEfficiency(data.efficiency as number);
    }

    // Перерыв
    if ((data.breakStartTime && !data.breakEndTime) || (!data.breakStartTime && data.breakEndTime)) {
      throw new ValidationDataException('breakTime', 'Укажите и начало, и конец перерыва');
    }

    if (data.breakStartTime && data.breakEndTime) {
      await this.validateTimeRange(data.breakStartTime, data.breakEndTime);

      if (data.startTime && data.endTime) {
        const workStart = this.timeToMinutes(data.startTime);
        const workEnd = this.timeToMinutes(data.endTime);
        const breakStart = this.timeToMinutes(data.breakStartTime);
        const breakEnd = this.timeToMinutes(data.breakEndTime);

        if (breakStart < workStart || breakEnd > workEnd) {
          throw new ValidationDataException('breakTime', 'Время перерыва должно быть в пределах рабочего времени');
        }

        const breakDuration = breakEnd - breakStart;
        if (breakDuration < WORK_SCHEDULES_CONSTANTS.MIN_BREAK_MINUTES) {
          throw new ValidationDataException(
            'breakTime',
            WORK_SCHEDULES_VALIDATION_MESSAGES.INSUFFICIENT_BREAK_TIME,
          );
        }
        if (breakDuration > WORK_SCHEDULES_CONSTANTS.MAX_BREAK_MINUTES) {
          throw new ValidationDataException(
            'breakTime',
            `Перерыв не может превышать ${WORK_SCHEDULES_CONSTANTS.MAX_BREAK_MINUTES} минут`,
          );
        }
      }
    }

    if (data.maxConsecutiveDays !== undefined) {
      if (data.maxConsecutiveDays > WORK_SCHEDULES_CONSTANTS.MAX_CONSECUTIVE_DAYS) {
        throw new ValidationDataException(
          'maxConsecutiveDays',
          WORK_SCHEDULES_VALIDATION_MESSAGES.TOO_MANY_CONSECUTIVE_DAYS,
        );
      }
    }
  }

  async validateScheduleConflicts(
    userId: string,
    dayOfWeek: number,
    companyId: string,
    excludeId?: string,
  ): Promise<void> {
    const existingSchedule = await this.dataService.findByUserAndDay(userId, dayOfWeek, companyId);
    if (existingSchedule && existingSchedule.id !== excludeId) {
      throw new WorkScheduleConflictException(userId, dayOfWeek);
    }
  }

  async validateTimeRange(startTime: string, endTime: string): Promise<void> {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

    if (!timeRegex.test(startTime)) {
      throw new ValidationDataException('startTime', WORK_SCHEDULES_VALIDATION_MESSAGES.INVALID_TIME_FORMAT);
    }
    if (!timeRegex.test(endTime)) {
      throw new ValidationDataException('endTime', WORK_SCHEDULES_VALIDATION_MESSAGES.INVALID_TIME_FORMAT);
    }

    const startMinutes = this.timeToMinutes(startTime);
    const endMinutes = this.timeToMinutes(endTime);

    if (endMinutes <= startMinutes) {
      throw new ValidationDataException('timeRange', WORK_SCHEDULES_VALIDATION_MESSAGES.INVALID_TIME_RANGE);
    }
  }

  async validateEfficiency(efficiency: number): Promise<void> {
    if (efficiency < WORK_SCHEDULES_CONSTANTS.MIN_EFFICIENCY || efficiency > WORK_SCHEDULES_CONSTANTS.MAX_EFFICIENCY) {
      throw new ValidationDataException('efficiency', WORK_SCHEDULES_VALIDATION_MESSAGES.INVALID_EFFICIENCY);
    }
  }

  async validateExceptionData(data: CreateExceptionDto): Promise<void> {
    await this.validateExceptionDateRange(data.startDate, data.endDate);
    await this.validateAdvanceNotice(data.startDate);

    if (data.isFullDay === false) {
      const st = (data as any).startTime;
      const et = (data as any).endTime;
      if (!st || !et) {
        throw new ValidationDataException('partialDay', 'Для частичного дня необходимо указать startTime и endTime');
      }
    }

    if (!data.isFullDay && data.startTime && data.endTime) {
      await this.validateTimeRange(data.startTime, data.endTime);
    }
  }

  async validateExceptionDateRange(startDate: string, endDate: string): Promise<void> {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new ValidationDataException('dateRange', 'Некорректный формат даты (ожидается ISO 8601)');
    }
    if (end < start) {
      throw new ValidationDataException('dateRange', WORK_SCHEDULES_VALIDATION_MESSAGES.INVALID_EXCEPTION_DATE_RANGE);
    }
  }

  async validateAdvanceNotice(startDate: string): Promise<void> {
    const start = new Date(startDate);
    const now = new Date();
    const daysInAdvance = Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (daysInAdvance < WORK_SCHEDULES_CONSTANTS.MIN_ADVANCE_NOTICE_DAYS) {
      throw new ValidationDataException(
        'advanceNotice',
        WORK_SCHEDULES_VALIDATION_MESSAGES.INSUFFICIENT_ADVANCE_NOTICE,
      );
    }
  }

  async validateUserBelongsToCompany(userId: string, companyId: string): Promise<void> {
    if (!userId || !companyId) {
      throw new ValidationDataException('user', 'Пользователь и компания обязательны');
    }
    const belongs = await this.dataService.userBelongsToCompany(userId, companyId);
    if (!belongs) {
      throw new ValidationDataException('userCompany', `Пользователь ${userId} не принадлежит компании ${companyId}`);
    }
  }

  async validateWorkScheduleOwnership(scheduleId: string, companyId: string): Promise<void> {
    const schedule = await this.validateScheduleExists(scheduleId);
    if (schedule.companyId !== companyId) {
      throw new ValidationDataException(
        'workScheduleOwnership',
        `Расписание ${scheduleId} не принадлежит компании ${companyId}`,
      );
    }
  }

  async validateSchedulePermissions(scheduleId: string, userId: string, action: string): Promise<void> {
    const schedule = await this.validateScheduleExists(scheduleId);
    if (schedule.userId !== userId) {
      throw new ValidationDataException(
        'schedulePermissions',
        `Недостаточно прав для выполнения действия "${action}" с расписанием ${scheduleId}`,
      );
    }
  }

  async validateScheduleEditPermissions(scheduleId: string, userId: string): Promise<void> {
    await this.validateSchedulePermissions(scheduleId, userId, 'edit');
  }

  async validateScheduleDeletePermissions(scheduleId: string, userId: string): Promise<void> {
    await this.validateSchedulePermissions(scheduleId, userId, 'delete');
  }

  // Helpers
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }
}
