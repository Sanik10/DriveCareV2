// path: apps/backend/src/modules/work-schedules/services/work-schedules-mapper.service.ts
import { Injectable } from '@nestjs/common';
import { WorkSchedule, ScheduleException } from '../../../database/entities';
import { ScheduleResponseDto } from '../dto/response/schedule-response.dto';
import { IWorkSchedulesMapperService } from '../interfaces/work-schedules.interface';
import { DAY_NAMES } from '../constants/work-schedules.constants';
import { ExceptionResponseDto } from '../dto/response/exception-response.dto';
import { UserWithCompany } from '../types/work-schedules.types';

@Injectable()
export class WorkSchedulesMapperService implements IWorkSchedulesMapperService {
  mapScheduleToResponseDto(schedule: WorkSchedule): ScheduleResponseDto {
    const skillMatrix = this.safeNormalizeArray<string>(schedule.skillMatrix, []);
    const preferredDaysOff = this.safeNormalizeArray<number>(schedule.preferredDaysOff, []);
    const efficiency = this.toNumericEfficiency(schedule.efficiency);

    return {
      id: schedule.id,
      companyId: schedule.companyId,
      userId: schedule.userId,
      dayOfWeek: schedule.dayOfWeek,
      dayName: DAY_NAMES[schedule.dayOfWeek] || 'Неизвестно',
      startTime: schedule.startTime as string,
      endTime: schedule.endTime as string,
      isDayOff: schedule.isDayOff,
      breakStartTime: schedule.breakStartTime as string | undefined,
      breakEndTime: schedule.breakEndTime as string | undefined,
      efficiency,
      skillMatrix,
      shiftType: schedule.shiftType,
      maxConsecutiveDays: schedule.maxConsecutiveDays,
      preferredDaysOff,
      isActive: schedule.isActive,
      workingHours: this.calculateWorkingHours(schedule),
      createdAt: schedule.createdAt,
      updatedAt: schedule.updatedAt,
    };
  }

  mapScheduleArrayToResponseDto(schedules: WorkSchedule[]): ScheduleResponseDto[] {
    return schedules.map((schedule) => this.mapScheduleToResponseDto(schedule));
  }

  mapExceptionToResponseDto(exception: ScheduleException, currentUser?: UserWithCompany): ExceptionResponseDto {
    const mask = this.shouldMaskExceptionText(exception, currentUser);

    return {
      id: exception.id,
      companyId: exception.companyId,
      userId: exception.userId,
      type: exception.type,
      startDate: exception.startDate,
      endDate: exception.endDate,
      isFullDay: exception.isFullDay,
      startTime: exception.startTime || undefined,
      endTime: exception.endTime || undefined,
      reason: mask ? undefined : exception.reason || undefined,
      status: exception.status,
      approvedBy: exception.approvedBy || undefined,
      approvedAt: exception.approvedAt || undefined,
      rejectionReason: mask ? undefined : exception.rejectionReason || undefined,
      affectedAppointments: this.safeNormalizeArray<string>(exception.affectedAppointments, []),
      createdAt: exception.createdAt,
      updatedAt: exception.updatedAt,
    };
  }

  mapExceptionArrayToResponseDto(exceptions: ScheduleException[], currentUser?: UserWithCompany): ExceptionResponseDto[] {
    return exceptions.map((e) => this.mapExceptionToResponseDto(e, currentUser));
  }

  mapScheduleWithUserInfo(schedule: WorkSchedule, userInfo?: any): ScheduleResponseDto {
    const baseDto = this.mapScheduleToResponseDto(schedule);
    if (userInfo) {
      baseDto.user = {
        firstName: userInfo.firstName || '',
        lastName: userInfo.lastName || '',
        specialization: userInfo.specialization || '',
        avatarUrl: userInfo.avatarUrl || undefined,
      };
    }
    return baseDto;
  }

  mapToSelectOption(schedule: WorkSchedule): { value: string; label: string; disabled: boolean } {
    const dayName = DAY_NAMES[schedule.dayOfWeek] || 'Неизвестно';
    const timeRange = `${schedule.startTime} - ${schedule.endTime}`;
    return {
      value: schedule.id,
      label: `${dayName}: ${timeRange}`,
      disabled: !schedule.isActive,
    };
  }

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

  private calculateWorkingHours(schedule: WorkSchedule): {
    totalHours: number;
    effectiveHours: number;
    breakHours: number;
  } {
    if (schedule.isDayOff) {
      return { totalHours: 0, effectiveHours: 0, breakHours: 0 };
    }

    const startMinutes = this.timeToMinutes(schedule.startTime!);
    const endMinutes = this.timeToMinutes(schedule.endTime!);
    const totalMinutes = Math.max(0, endMinutes - startMinutes);
    const totalHours = totalMinutes / 60;

    let breakHours = 0;
    if (schedule.breakStartTime && schedule.breakEndTime) {
      const breakStartMinutes = this.timeToMinutes(schedule.breakStartTime);
      const breakEndMinutes = this.timeToMinutes(schedule.breakEndTime);
      breakHours = Math.max(0, (breakEndMinutes - breakStartMinutes) / 60);
    }

    const effectiveHours = Math.max(0, totalHours - breakHours);

    return {
      totalHours,
      effectiveHours,
      breakHours,
    };
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return (hours || 0) * 60 + (minutes || 0);
  }

  private safeNormalizeArray<T>(value: unknown, fallback: T[]): T[] {
    if (!value) return fallback;
    if (Array.isArray(value)) return value as T[];
    try {
      if (typeof value === 'string') {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? (parsed as T[]) : fallback;
      }
      return fallback;
    } catch {
      return fallback;
    }
  }

  private toNumericEfficiency(eff: string | number | null | undefined): number {
    if (typeof eff === 'number') return eff;
    const n = Number(eff);
    return Number.isFinite(n) && !Number.isNaN(n) ? n : 1;
  }

  private shouldMaskExceptionText(exception: ScheduleException, currentUser?: UserWithCompany): boolean {
    // Если уже анонимизировано по ретеншну — маскируем всегда
    if (exception.piiAnonymized) return true;

    if (!currentUser) return true;

    // Разрешённые роли, которые могут видеть тексты: админские и менеджерские
    const privilegedRoles = new Set([
      'superadmin',
      'owner',
      'admin',
      'manager',
      'company_owner',
      'company_admin',
    ]);

    if (privilegedRoles.has((currentUser.role || '').toLowerCase())) {
      return false;
    }

    // Механик может видеть только свои собственные исключения
    if ((currentUser.role || '').toLowerCase() === 'mechanic') {
      return currentUser.id !== exception.userId;
    }

    // По умолчанию — маскируем
    return true;
  }
}
