// path: apps/backend/src/modules/work-schedules/work-schedules.service.ts
import { Injectable, Logger, ForbiddenException, NotFoundException } from '@nestjs/common';
import { WorkSchedulesDataService } from './services/work-schedules-data.service';
import { WorkSchedulesMapperService } from './services/work-schedules-mapper.service';
import { WorkSchedulesValidationService } from './services/work-schedules-validation.service';
import { WorkSchedulesBusinessService } from './services/work-schedules-business.service';
import { CreateScheduleDto } from './dto/request/create-schedule.dto';
import { UpdateScheduleDto } from './dto/request/update-schedule.dto';
import { CreateExceptionDto } from './dto/request/create-exception.dto';
import { ScheduleResponseDto } from './dto/response/schedule-response.dto';
import { PaginatedSchedulesResponseDto } from './dto/response/paginated-schedules-response.dto';
import { WorkSchedulesFilter, UserWithCompany } from './types/work-schedules.types';
import { WORK_SCHEDULES_CONSTANTS } from './constants/work-schedules.constants';
import { AuditService, AuditAction, AuditLevel } from '../../common/audit/audit.service';
import { ExceptionResponseDto } from './dto/response/exception-response.dto';
import { ExceptionStatus } from '../../database/entities/schedule-exception.entity';
import { WorkScheduleConflictException } from '../../common/exceptions/domain.exceptions';

@Injectable()
export class WorkSchedulesService {
  private readonly logger = new Logger(WorkSchedulesService.name);

  constructor(
    private readonly dataService: WorkSchedulesDataService,
    private readonly mapperService: WorkSchedulesMapperService,
    private readonly validationService: WorkSchedulesValidationService,
    private readonly businessService: WorkSchedulesBusinessService,
    private readonly audit: AuditService,
  ) {}

  async create(createDto: CreateScheduleDto, user: UserWithCompany): Promise<ScheduleResponseDto> {
    this.logger.log(`Создание расписания для пользователя ${createDto.userId} компании ${user.companyId}`);

    // Проверка принадлежности пользователя компании
    await this.validationService.validateUserBelongsToCompany(createDto.userId, user.companyId);

    // Валидация данных
    await this.validationService.validateScheduleData(createDto);
    await this.validationService.validateScheduleConflicts(createDto.userId, createDto.dayOfWeek, user.companyId);

    try {
      const schedule = await this.dataService.create({
        ...createDto,
        companyId: user.companyId,
      });

      await this.audit.log(AuditAction.WORK_SCHEDULE_CREATED, {
        userId: user.id,
        companyId: user.companyId,
        level: AuditLevel.INFO,
        resourceType: 'work-schedule',
        resourceId: schedule.id,
        details: {
          userId: schedule.userId,
          dayOfWeek: schedule.dayOfWeek,
          isActive: schedule.isActive,
        },
      });

      this.logger.log(`Расписание успешно создано: ${schedule.id}`);
      return this.mapperService.mapScheduleToResponseDto(schedule);
    } catch (e: any) {
      // Ловим уникальный конфликт companyId+userId+dayOfWeek → 409
      const msg = String(e?.message || '');
      if (e?.code === '23505' || msg.includes('uq_work_schedule_company_user_day')) {
        throw new WorkScheduleConflictException(createDto.userId, createDto.dayOfWeek);
      }
      throw e;
    }
  }

  async findAll(filter: WorkSchedulesFilter): Promise<PaginatedSchedulesResponseDto> {
    this.logger.log(`Поиск расписаний с фильтрами: ${JSON.stringify({ ...filter, companyId: 'REDACTED' })}`);

    const safeFilter: WorkSchedulesFilter = {
      ...filter,
      page: Math.max(1, filter.page || 1),
      limit: Math.min(
        Math.max(1, filter.limit || WORK_SCHEDULES_CONSTANTS.DEFAULT_PAGE_SIZE),
        WORK_SCHEDULES_CONSTANTS.MAX_PAGE_SIZE,
      ),
    };

    const [schedules, total] = await this.dataService.findWithFilters(safeFilter);

    const page = safeFilter.page || 1;
    const limit = safeFilter.limit || WORK_SCHEDULES_CONSTANTS.DEFAULT_PAGE_SIZE;
    const totalPages = Math.ceil(total / Math.max(1, limit));

    await this.audit.log(AuditAction.WORK_SCHEDULES_LISTED, {
      level: AuditLevel.INFO,
      companyId: filter.companyId,
      details: { page, limit, total, userId: filter.userId || null, dayOfWeek: filter.dayOfWeek ?? null },
    });

    return {
      data: this.mapperService.mapScheduleArrayToResponseDto(schedules),
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNext: page < totalPages,
        hasPrevious: page > 1,
      },
    };
  }

  async findOne(id: string, user?: UserWithCompany): Promise<ScheduleResponseDto> {
    this.logger.log(`Поиск расписания ${id}`);
    const schedule = await this.validationService.validateScheduleExists(id);

    await this.audit.log(AuditAction.WORK_SCHEDULE_VIEWED, {
      userId: user?.id,
      companyId: user?.companyId || schedule.companyId,
      level: AuditLevel.INFO,
      resourceType: 'work-schedule',
      resourceId: id,
      details: { userId: schedule.userId, dayOfWeek: schedule.dayOfWeek },
    });

    return this.mapperService.mapScheduleToResponseDto(schedule);
  }

  async update(id: string, updateDto: UpdateScheduleDto, user?: UserWithCompany): Promise<ScheduleResponseDto> {
    this.logger.log(`Обновление расписания ${id}`);

    const existing = await this.validationService.validateScheduleExists(id);

    // Валидация данных: на partial-update валидируем объединённую модель
    const merged = {
      ...existing,
      ...updateDto,
    } as unknown as CreateScheduleDto | UpdateScheduleDto;
    await this.validationService.validateScheduleData(merged);

    // При изменении дня недели — проверка конфликта
    const nextDay = updateDto.dayOfWeek ?? existing.dayOfWeek;
    if (nextDay !== existing.dayOfWeek) {
      await this.validationService.validateScheduleConflicts(existing.userId, nextDay, existing.companyId, id);
    }

    // Обновление
    const updatedSchedule = await this.dataService.update(id, updateDto);

    await this.audit.log(AuditAction.WORK_SCHEDULE_UPDATED, {
      userId: user?.id,
      companyId: user?.companyId || updatedSchedule.companyId,
      level: AuditLevel.INFO,
      resourceType: 'work-schedule',
      resourceId: id,
      details: {
        userId: updatedSchedule.userId,
        changed: Object.keys(updateDto || {}),
      },
    });

    this.logger.log(`Расписание ${id} успешно обновлено`);
    return this.mapperService.mapScheduleToResponseDto(updatedSchedule);
  }

  async remove(id: string, user?: UserWithCompany): Promise<void> {
    this.logger.log(`Деактивация расписания ${id}`);
    await this.validationService.validateScheduleExists(id);
    await this.dataService.delete(id); // фактически деактивация (isActive=false)

    await this.audit.log(AuditAction.WORK_SCHEDULE_DELETED, {
      userId: user?.id,
      companyId: user?.companyId,
      level: AuditLevel.WARNING,
      resourceType: 'work-schedule',
      resourceId: id,
      details: { action: 'deactivated' },
    });

    this.logger.log(`Расписание ${id} деактивировано`);
  }

  async createException(createDto: CreateExceptionDto, user: UserWithCompany): Promise<ExceptionResponseDto> {
    this.logger.log(`Создание исключения для пользователя ${createDto.userId} компании ${user.companyId}`);

    // Проверка принадлежности пользователя компании
    await this.validationService.validateUserBelongsToCompany(createDto.userId, user.companyId);

    // Ограничение прав для механика: только для себя
    if (user.role === 'mechanic' && createDto.userId !== user.id) {
      throw new ForbiddenException('Mechanics can only create exceptions for themselves');
    }

    // Валидация данных исключения
    await this.validationService.validateExceptionData(createDto);

    // Создание исключения
    const exception = await this.dataService.createException({
      ...createDto,
      companyId: user.companyId,
    });

    await this.audit.log(AuditAction.SCHEDULE_EXCEPTION_CREATED, {
      userId: user.id,
      companyId: user.companyId,
      level: AuditLevel.INFO,
      resourceType: 'schedule-exception',
      resourceId: exception.id,
      details: {
        userId: exception.userId,
        type: exception.type,
        startDate: exception.startDate,
        endDate: exception.endDate,
        isFullDay: exception.isFullDay,
      },
    });

    this.logger.log(`Исключение успешно создано: ${exception.id}`);
    // Маскирование reason — по ролям/владению
    return this.mapperService.mapExceptionToResponseDto(exception, user);
  }

  async updateExceptionStatus(id: string, status: ExceptionStatus, actor: UserWithCompany): Promise<ExceptionResponseDto> {
    // Механики не могут менять статус исключений
    if ((actor.role || '').toLowerCase() === 'mechanic') {
      throw new ForbiddenException('Mechanics are not allowed to change exception status');
    }

    const existing = await this.dataService.getExceptionById(id);
    if (!existing) {
      throw new NotFoundException('Schedule exception not found');
    }
    if (existing.companyId !== actor.companyId) {
      throw new ForbiddenException('No access to exception of another company');
    }

    const updated = await this.dataService.updateExceptionStatus(id, status, actor?.id);
    await this.audit.log(AuditAction.SCHEDULE_EXCEPTION_STATUS_CHANGED, {
      userId: actor?.id,
      companyId: actor?.companyId || updated.companyId,
      level: AuditLevel.INFO,
      resourceType: 'schedule-exception',
      resourceId: id,
      details: {
        status,
        userId: updated.userId,
        type: updated.type,
      },
    });
    return this.mapperService.mapExceptionToResponseDto(updated, actor);
  }

  async deleteException(id: string, actor: UserWithCompany): Promise<void> {
    // Механикам удаление (анонимизация) исключений запрещено
    if ((actor.role || '').toLowerCase() === 'mechanic') {
      throw new ForbiddenException('Mechanics are not allowed to delete exceptions');
    }

    const existing = await this.dataService.getExceptionById(id);
    if (!existing) {
      throw new NotFoundException('Schedule exception not found');
    }
    if (existing.companyId !== actor.companyId) {
      throw new ForbiddenException('No access to exception of another company');
    }

    await this.dataService.deleteException(id);
    await this.audit.log(AuditAction.SCHEDULE_EXCEPTION_DELETED, {
      userId: actor?.id,
      companyId: actor?.companyId,
      level: AuditLevel.WARNING,
      resourceType: 'schedule-exception',
      resourceId: id,
      details: { anonymized: true },
    });
  }
}
