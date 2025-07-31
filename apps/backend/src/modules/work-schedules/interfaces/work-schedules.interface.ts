// src/modules/work-schedules/interfaces/work-schedules.interface.ts
import { WorkSchedule, ScheduleException } from '../../../database/entities';
// 🔥 ИСПРАВЛЯЕМ импорты DTO - прямые пути
import { CreateScheduleDto } from '../dto/request/create-schedule.dto';
import { UpdateScheduleDto } from '../dto/request/update-schedule.dto';
import { CreateExceptionDto } from '../dto/request/create-exception.dto';
import { 
  WorkSchedulesFilter, 
  ScheduleExceptionsFilter, 
  OptimizationRequest, 
  OptimizationResult,
  CoverageAnalysis,
  MechanicCapacity,
  WorkScheduleStats,
  ExceptionStats,
  BulkUpdateResult
} from '../types/work-schedules.types';

export interface IWorkSchedulesDataService {
  // Basic CRUD for WorkSchedule
  create(data: CreateScheduleDto & { companyId: string }): Promise<WorkSchedule>;
  findById(id: string): Promise<WorkSchedule | null>;
  findAll(): Promise<WorkSchedule[]>;
  findWithFilters(filter: WorkSchedulesFilter): Promise<[WorkSchedule[], number]>;
  update(id: string, data: Partial<UpdateScheduleDto>): Promise<WorkSchedule>;
  delete(id: string): Promise<void>;
  
  // Schedule-specific queries
  findByUserId(userId: string, companyId: string): Promise<WorkSchedule[]>;
  findByUserAndDay(userId: string, dayOfWeek: number, companyId: string): Promise<WorkSchedule | null>;
  findActiveByCompany(companyId: string): Promise<WorkSchedule[]>;
  
  // Exception management
  createException(data: CreateExceptionDto & { companyId: string }): Promise<ScheduleException>;
  findExceptions(filter: ScheduleExceptionsFilter): Promise<[ScheduleException[], number]>;
  updateExceptionStatus(id: string, status: string, approvedBy?: string): Promise<ScheduleException>;
  deleteException(id: string): Promise<void>;
}

export interface IWorkSchedulesValidationService {
  validateScheduleExists(id: string): Promise<WorkSchedule>;
  validateScheduleData(data: CreateScheduleDto | UpdateScheduleDto): Promise<void>;
  validateScheduleConflicts(userId: string, dayOfWeek: number, companyId: string, excludeId?: string): Promise<void>;
  validateExceptionData(data: CreateExceptionDto): Promise<void>;
  validateUserBelongsToCompany(userId: string, companyId: string): Promise<void>;
}

export interface IWorkSchedulesMapperService {
  mapScheduleToResponseDto(schedule: WorkSchedule): any;
  mapScheduleArrayToResponseDto(schedules: WorkSchedule[]): any[];
  mapExceptionToResponseDto(exception: ScheduleException): any;
}
