import { WorkSchedule, ScheduleException } from '../../../database/entities';
import { CreateScheduleDto } from '../dto/request/create-schedule.dto';
import { UpdateScheduleDto } from '../dto/request/update-schedule.dto';
import { CreateExceptionDto } from '../dto/request/create-exception.dto';
import {
  WorkSchedulesFilter,
  ScheduleExceptionsFilter,
} from '../types/work-schedules.types';
import { ExceptionStatus, ExceptionType } from '../../../database/entities/schedule-exception.entity';
import { ScheduleResponseDto } from '../dto/response/schedule-response.dto';
import { ExceptionResponseDto } from '../dto/response/exception-response.dto';

export interface IWorkSchedulesDataService {
  // Basic CRUD for WorkSchedule
  create(data: CreateScheduleDto & { companyId: string }): Promise<WorkSchedule>;
  findById(id: string): Promise<WorkSchedule | null>;
  findByIdForCompany(id: string, companyId: string): Promise<WorkSchedule | null>;
  existsForCompany(id: string, companyId: string): Promise<boolean>;
  findAll(): Promise<WorkSchedule[]>;
  findWithFilters(filter: WorkSchedulesFilter): Promise<[WorkSchedule[], number]>;
  update(id: string, data: Partial<UpdateScheduleDto>): Promise<WorkSchedule>;
  delete(id: string): Promise<void>;

  // Schedule-specific queries
  findByUserId(userId: string, companyId: string): Promise<WorkSchedule[]>;
  findByUserAndDay(userId: string, dayOfWeek: number, companyId: string): Promise<WorkSchedule | null>;
  findActiveByCompany(companyId: string): Promise<WorkSchedule[]>;
  findActiveByCompanyAndDayOfWeek(companyId: string, dayOfWeek: number): Promise<WorkSchedule[]>;

  // Exceptions
  createException(data: CreateExceptionDto & { companyId: string }): Promise<ScheduleException>;
  findExceptions(filter: ScheduleExceptionsFilter & { companyId: string }): Promise<[ScheduleException[], number]>;
  findExceptionsForDate(companyId: string, date: Date, userIds?: string[]): Promise<ScheduleException[]>;
  updateExceptionStatus(id: string, status: ExceptionStatus, approvedBy?: string): Promise<ScheduleException>;
  deleteException(id: string): Promise<void>;

  // Users / Ownership
  userBelongsToCompany(userId: string, companyId: string): Promise<boolean>;
}

export interface IWorkSchedulesValidationService {
  validateScheduleExists(id: string): Promise<WorkSchedule>;
  validateScheduleData(data: CreateScheduleDto | UpdateScheduleDto): Promise<void>;
  validateScheduleConflicts(userId: string, dayOfWeek: number, companyId: string, excludeId?: string): Promise<void>;
  validateExceptionData(data: CreateExceptionDto): Promise<void>;
  validateUserBelongsToCompany(userId: string, companyId: string): Promise<void>;
  validateWorkScheduleOwnership(scheduleId: string, companyId: string): Promise<void>;
  validateSchedulePermissions(scheduleId: string, userId: string, action: string): Promise<void>;
  validateScheduleEditPermissions(scheduleId: string, userId: string): Promise<void>;
  validateScheduleDeletePermissions(scheduleId: string, userId: string): Promise<void>;
}

export interface IWorkSchedulesMapperService {
  mapScheduleToResponseDto(schedule: WorkSchedule): ScheduleResponseDto;
  mapScheduleArrayToResponseDto(schedules: WorkSchedule[]): ScheduleResponseDto[];
  mapExceptionToResponseDto(exception: ScheduleException): ExceptionResponseDto;
  mapExceptionArrayToResponseDto(exceptions: ScheduleException[]): ExceptionResponseDto[];
}
