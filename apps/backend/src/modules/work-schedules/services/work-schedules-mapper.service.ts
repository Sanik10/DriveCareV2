// src/modules/work-schedules/services/work-schedules-mapper.service.ts
import { Injectable } from '@nestjs/common';
import { WorkSchedule, ScheduleException } from '../../../database/entities';
import { ScheduleResponseDto } from '../dto/response/schedule-response.dto';
import { IWorkSchedulesMapperService } from '../interfaces/work-schedules.interface';
import { DAY_NAMES } from '../constants/work-schedules.constants';

@Injectable()
export class WorkSchedulesMapperService implements IWorkSchedulesMapperService {
  
  /**
   * 🎯 Основной маппинг WorkSchedule → ScheduleResponseDto
   */
  mapScheduleToResponseDto(schedule: WorkSchedule): ScheduleResponseDto {
    // 🔥 Парсим JSON поля обратно в массивы
    const skillMatrix = schedule.skillMatrix ? JSON.parse(schedule.skillMatrix) : [];
    const preferredDaysOff = schedule.preferredDaysOff ? JSON.parse(schedule.preferredDaysOff) : [];

    return {
      id: schedule.id,
      companyId: schedule.companyId,
      userId: schedule.userId,
      dayOfWeek: schedule.dayOfWeek,
      dayName: DAY_NAMES[schedule.dayOfWeek] || 'Неизвестно',
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      isDayOff: schedule.isDayOff,
      breakStartTime: schedule.breakStartTime,
      breakEndTime: schedule.breakEndTime,
      efficiency: schedule.efficiency,
      skillMatrix: skillMatrix,
      shiftType: schedule.shiftType,
      maxConsecutiveDays: schedule.maxConsecutiveDays,
      preferredDaysOff: preferredDaysOff,
      isActive: schedule.isActive,
      // 🔥 Вычисляемые поля
      workingHours: this.calculateWorkingHours(schedule),
      createdAt: schedule.createdAt,
      updatedAt: schedule.updatedAt,
    };
  }

  /**
   * 🎯 Массовый маппинг
   */
  mapScheduleArrayToResponseDto(schedules: WorkSchedule[]): ScheduleResponseDto[] {
    return schedules.map(schedule => this.mapScheduleToResponseDto(schedule));
  }

  /**
   * 🎯 Маппинг ScheduleException → ResponseDto
   */
  mapExceptionToResponseDto(exception: ScheduleException): any {
    return {
      id: exception.id,
      companyId: exception.companyId,
      userId: exception.userId,
      type: exception.type,
      startDate: exception.startDate,
      endDate: exception.endDate,
      isFullDay: exception.isFullDay,
      startTime: exception.startTime,
      endTime: exception.endTime,
      reason: exception.reason,
      status: exception.status,
      approvedBy: exception.approvedBy,
      approvedAt: exception.approvedAt,
      rejectionReason: exception.rejectionReason,
      affectedAppointments: exception.affectedAppointments,
      createdAt: exception.createdAt,
      updatedAt: exception.updatedAt,
    };
  }

  /**
   * 🎯 Массовый маппинг исключений
   */
  mapExceptionArrayToResponseDto(exceptions: ScheduleException[]): any[] {
    return exceptions.map(exception => this.mapExceptionToResponseDto(exception));
  }

  /**
   * 🎯 Маппинг с информацией о пользователе (для расширенных случаев)
   */
  mapScheduleWithUserInfo(schedule: WorkSchedule, userInfo?: any): ScheduleResponseDto {
    const baseDto = this.mapScheduleToResponseDto(schedule);
    
    if (userInfo) {
      baseDto.user = {
        firstName: userInfo.firstName || '',
        lastName: userInfo.lastName || '',
        specialization: userInfo.specialization || '',
        avatarUrl: userInfo.avatarUrl || null,
      };
    }

    return baseDto;
  }

  /**
   * 🎯 Для выпадающих списков
   */
  mapToSelectOption(schedule: WorkSchedule): { value: string; label: string; disabled: boolean } {
    const dayName = DAY_NAMES[schedule.dayOfWeek] || 'Неизвестно';
    const timeRange = `${schedule.startTime} - ${schedule.endTime}`;
    
    return {
      value: schedule.id,
      label: `${dayName}: ${timeRange}`,
      disabled: !schedule.isActive,
    };
  }

  /**
   * 🎯 Базовая информация (для других модулей)
   */
  mapToBasicInfo(schedule: WorkSchedule): { 
    id: string; 
    userId: string; 
    dayOfWeek: number; 
    companyId: string;
    timeRange: string;
    isActive: boolean;
  } {
    return {
      id: schedule.id,
      userId: schedule.userId,
      dayOfWeek: schedule.dayOfWeek,
      companyId: schedule.companyId,
      timeRange: `${schedule.startTime} - ${schedule.endTime}`,
      isActive: schedule.isActive,
    };
  }

  /**
   * 🔒 Приватные вспомогательные методы
   */
  private calculateWorkingHours(schedule: WorkSchedule): {
    totalHours: number;
    effectiveHours: number;
    breakHours: number;
  } {
    if (schedule.isDayOff) {
      return { totalHours: 0, effectiveHours: 0, breakHours: 0 };
    }

    const startMinutes = this.timeToMinutes(schedule.startTime);
    const endMinutes = this.timeToMinutes(schedule.endTime);
    const totalMinutes = endMinutes - startMinutes;
    const totalHours = totalMinutes / 60;

    let breakHours = 0;
    if (schedule.breakStartTime && schedule.breakEndTime) {
      const breakStartMinutes = this.timeToMinutes(schedule.breakStartTime);
      const breakEndMinutes = this.timeToMinutes(schedule.breakEndTime);
      breakHours = (breakEndMinutes - breakStartMinutes) / 60;
    }

    const effectiveHours = totalHours - breakHours;

    return {
      totalHours: Math.max(0, totalHours),
      effectiveHours: Math.max(0, effectiveHours),
      breakHours: Math.max(0, breakHours),
    };
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }
}
