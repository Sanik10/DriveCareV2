import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { WorkSchedule, ScheduleException, User } from '../../../database/entities';
import { CreateScheduleDto } from '../dto/request/create-schedule.dto';
import { UpdateScheduleDto } from '../dto/request/update-schedule.dto';
import { CreateExceptionDto } from '../dto/request/create-exception.dto';
import { WorkSchedulesFilter } from '../types/work-schedules.types';
import { IWorkSchedulesDataService } from '../interfaces/work-schedules.interface';
import { WORK_SCHEDULES_CONSTANTS } from '../constants/work-schedules.constants';
import { ExceptionStatus, ExceptionType } from '../../../database/entities/schedule-exception.entity';

@Injectable()
export class WorkSchedulesDataService implements IWorkSchedulesDataService {
  constructor(
    @InjectRepository(WorkSchedule)
    private readonly workScheduleRepository: Repository<WorkSchedule>,
    @InjectRepository(ScheduleException)
    private readonly scheduleExceptionRepository: Repository<ScheduleException>,
  ) {}

  async create(data: CreateScheduleDto & { companyId: string }): Promise<WorkSchedule> {
    const eff = data.efficiency ?? WORK_SCHEDULES_CONSTANTS.DEFAULT_EFFICIENCY;

    const scheduleData: Partial<WorkSchedule> = {
      companyId: data.companyId,
      userId: data.userId,
      dayOfWeek: data.dayOfWeek,
      startTime: data.startTime ?? null,
      endTime: data.endTime ?? null,
      isDayOff: data.isDayOff || false,
      breakStartTime: data.breakStartTime ?? null,
      breakEndTime: data.breakEndTime ?? null,
      efficiency: typeof eff === 'number' ? eff.toFixed(2) : String(eff),
      skillMatrix: data.skillMatrix ?? [],
      shiftType: data.shiftType || 'flexible',
      maxConsecutiveDays: data.maxConsecutiveDays ?? 5,
      preferredDaysOff: data.preferredDaysOff ?? [],
      isActive: true,
    };

    const schedule = this.workScheduleRepository.create(scheduleData as WorkSchedule);
    return this.workScheduleRepository.save(schedule);
  }

  async findById(id: string): Promise<WorkSchedule | null> {
    return this.workScheduleRepository.findOne({ where: { id } });
  }

  async findByIdForCompany(id: string, companyId: string): Promise<WorkSchedule | null> {
    return this.workScheduleRepository.findOne({ where: { id, companyId } });
  }

  async existsForCompany(id: string, companyId: string): Promise<boolean> {
    const count = await this.workScheduleRepository.count({ where: { id, companyId } });
    return count > 0;
  }

  async findAll(): Promise<WorkSchedule[]> {
    return this.workScheduleRepository.find({
      order: { dayOfWeek: 'ASC', startTime: 'ASC' },
    });
  }

  async findWithFilters(filter: WorkSchedulesFilter): Promise<[WorkSchedule[], number]> {
    const {
      userId,
      dayOfWeek,
      isActive,
      companyId,
      page = 1,
      limit = WORK_SCHEDULES_CONSTANTS.DEFAULT_PAGE_SIZE,
      sortBy = 'dayOfWeek',
      sortOrder = 'ASC',
    } = filter;

    const query = this.workScheduleRepository.createQueryBuilder('schedule');

    // Обязательная фильтрация по companyId
    if (companyId) {
      query.andWhere('schedule.companyId = :companyId', { companyId });
    }

    if (userId) {
      query.andWhere('schedule.userId = :userId', { userId });
    }

    if (dayOfWeek !== undefined) {
      query.andWhere('schedule.dayOfWeek = :dayOfWeek', { dayOfWeek });
    }

    if (isActive !== undefined) {
      query.andWhere('schedule.isActive = :isActive', { isActive });
    }

    // Дополнительные фильтры
    if (filter.shiftType) {
      query.andWhere('schedule.shiftType = :shiftType', { shiftType: filter.shiftType });
    }
    if (filter.efficiencyMin !== undefined) {
      query.andWhere('schedule.efficiency >= :effMin', { effMin: filter.efficiencyMin });
    }
    if (filter.efficiencyMax !== undefined) {
      query.andWhere('schedule.efficiency <= :effMax', { effMax: filter.efficiencyMax });
    }
    if (filter.hasSkills && Array.isArray(filter.hasSkills) && filter.hasSkills.length > 0) {
      // jsonb contains: column @> :skills::jsonb
      query.andWhere('schedule.skillMatrix @> :skills', { skills: JSON.stringify(filter.hasSkills) });
    }
    if (filter.dateRange?.startDate && filter.dateRange?.endDate) {
      // Мэппинг диапазона дат → множество дней недели
      const start = new Date(filter.dateRange.startDate);
      const end = new Date(filter.dateRange.endDate);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && end >= start) {
        const days: number[] = [];
        const seen = new Set<number>();
        const cur = new Date(start);
        let guard = 0;
        while (cur <= end && guard < 400) {
          const d = cur.getDay();
          if (!seen.has(d)) {
            seen.add(d);
            days.push(d);
          }
          cur.setDate(cur.getDate() + 1);
          guard++;
        }
        if (days.length > 0) {
          query.andWhere('schedule.dayOfWeek IN (:...days)', { days });
        }
      }
    }

    const sortColumn = this.mapSortField(sortBy);
    const order = (sortOrder || 'ASC').toString().toUpperCase();
    const normalizedOrder: 'ASC' | 'DESC' = order === 'DESC' ? 'DESC' : 'ASC';
    query.orderBy(sortColumn, normalizedOrder);

    const safeLimit = Math.min(Math.max(1, limit), WORK_SCHEDULES_CONSTANTS.MAX_PAGE_SIZE);
    const safePage = Math.max(1, page);
    const offset = (safePage - 1) * safeLimit;
    query.skip(offset).take(safeLimit);

    return query.getManyAndCount();
  }

  async update(id: string, data: Partial<UpdateScheduleDto>): Promise<WorkSchedule> {
    const updateData: Partial<WorkSchedule> = {};

    if (data.dayOfWeek !== undefined) updateData.dayOfWeek = data.dayOfWeek;
    if (data.startTime !== undefined) updateData.startTime = data.startTime;
    if (data.endTime !== undefined) updateData.endTime = data.endTime;
    if (data.isDayOff !== undefined) updateData.isDayOff = data.isDayOff;
    if (data.breakStartTime !== undefined) updateData.breakStartTime = data.breakStartTime ?? null;
    if (data.breakEndTime !== undefined) updateData.breakEndTime = data.breakEndTime ?? null;
    if (data.efficiency !== undefined) {
      const eff = data.efficiency as any;
      updateData.efficiency = eff?.toFixed ? (eff as number).toFixed(2) : String(eff);
    }
    if ((data as any).isActive !== undefined) {
      (updateData as any).isActive = (data as any).isActive;
    }
    if (data.shiftType !== undefined) updateData.shiftType = data.shiftType;
    if (data.maxConsecutiveDays !== undefined) updateData.maxConsecutiveDays = data.maxConsecutiveDays;

    if (data.skillMatrix !== undefined) {
      updateData.skillMatrix = data.skillMatrix ?? [];
    }
    if (data.preferredDaysOff !== undefined) {
      updateData.preferredDaysOff = data.preferredDaysOff ?? [];
    }

    await this.workScheduleRepository.update(id, updateData as any);

    const updatedSchedule = await this.findById(id);
    if (!updatedSchedule) {
      throw new Error(`WorkSchedule with id ${id} not found after update`);
    }

    return updatedSchedule;
  }

  // Soft-delete: деактивация вместо физического удаления
  async delete(id: string): Promise<void> {
    await this.workScheduleRepository.update(id, { isActive: false } as any);
  }

  async findByUserId(userId: string, companyId: string): Promise<WorkSchedule[]> {
    return this.workScheduleRepository.find({
      where: { userId, companyId },
      order: { dayOfWeek: 'ASC' },
    });
  }

  async findByUserAndDay(userId: string, dayOfWeek: number, companyId: string): Promise<WorkSchedule | null> {
    return this.workScheduleRepository.findOne({
      where: { userId, dayOfWeek, companyId },
    });
  }

  async findActiveByCompany(companyId: string): Promise<WorkSchedule[]> {
    return this.workScheduleRepository.find({
      where: { companyId, isActive: true },
      order: { dayOfWeek: 'ASC', startTime: 'ASC' },
    });
  }

  async findActiveByCompanyAndDayOfWeek(companyId: string, dayOfWeek: number): Promise<WorkSchedule[]> {
    return this.workScheduleRepository.find({
      where: { companyId, isActive: true, dayOfWeek },
      order: { startTime: 'ASC' },
    });
  }

  async createException(data: CreateExceptionDto & { companyId: string }): Promise<ScheduleException> {
    const entity = this.scheduleExceptionRepository.create({
      companyId: data.companyId,
      userId: data.userId,
      type: data.type,
      startDate: data.startDate as any,
      endDate: data.endDate as any,
      isFullDay: data.isFullDay ?? true,
      startTime: data.startTime ?? null,
      endTime: data.endTime ?? null,
      reason: data.reason ?? null,
      status: ExceptionStatus.PENDING,
      approvedBy: null,
      approvedAt: null,
      rejectionReason: null,
      affectedAppointments: [], // список ID затронутых записей (jsonb)
      coverageAnalysis: null,
    } as Partial<ScheduleException>);
    return this.scheduleExceptionRepository.save(entity);
  }

  async findExceptions(
    filter: {
      companyId: string;
      userId?: string;
      type?: ExceptionType;
      status?: ExceptionStatus;
      page?: number;
      limit?: number;
      dateFrom?: Date;
      dateTo?: Date;
      dateRange?: { startDate: Date; endDate: Date };
      isFullDay?: boolean;
      sortBy?: 'startDate' | 'type' | 'status' | 'createdAt';
      sortOrder?: 'ASC' | 'DESC';
    },
  ): Promise<[ScheduleException[], number]> {
    const query = this.scheduleExceptionRepository.createQueryBuilder('exception');

    query.andWhere('exception.companyId = :companyId', { companyId: filter.companyId });

    if (filter.userId) {
      query.andWhere('exception.userId = :userId', { userId: filter.userId });
    }

    if (filter.type) {
      query.andWhere('exception.type = :type', { type: filter.type });
    }

    if (filter.status) {
      query.andWhere('exception.status = :status', { status: filter.status });
    }

    // Поддержка dateRange, совместимо с dateFrom/dateTo
    const dateFrom = filter.dateRange?.startDate || filter.dateFrom;
    const dateTo = filter.dateRange?.endDate || filter.dateTo;
    if (dateFrom && dateTo) {
      query.andWhere('(exception.startDate <= :dateTo AND exception.endDate >= :dateFrom)', {
        dateFrom,
        dateTo,
      });
    } else if (dateFrom) {
      query.andWhere('exception.endDate >= :dateFrom', { dateFrom });
    } else if (dateTo) {
      query.andWhere('exception.startDate <= :dateTo', { dateTo });
    }

    if (filter.isFullDay !== undefined) {
      query.andWhere('exception.isFullDay = :isFullDay', { isFullDay: filter.isFullDay });
    }

    const page = Math.max(1, filter.page || 1);
    const limit = Math.min(filter.limit || WORK_SCHEDULES_CONSTANTS.DEFAULT_PAGE_SIZE, WORK_SCHEDULES_CONSTANTS.MAX_PAGE_SIZE);
    const offset = (page - 1) * limit;

    query.skip(offset).take(limit);
    const sortBy = filter.sortBy || 'startDate';
    const sortOrder = (filter.sortOrder || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const sortMap: Record<string, string> = {
      startDate: 'exception.startDate',
      type: 'exception.type',
      status: 'exception.status',
      createdAt: 'exception.createdAt',
    };
    query.orderBy(sortMap[sortBy] || 'exception.startDate', sortOrder as 'ASC' | 'DESC');

    return query.getManyAndCount();
  }

  async findExceptionsForDate(companyId: string, date: Date, userIds?: string[]): Promise<ScheduleException[]> {
    const qb = this.scheduleExceptionRepository
      .createQueryBuilder('e')
      .where('e.companyId = :companyId', { companyId })
      .andWhere(':date BETWEEN e.startDate AND e.endDate', { date });

    if (userIds && userIds.length > 0) {
      qb.andWhere('e.userId IN (:...userIds)', { userIds });
    }

    return qb.getMany();
  }

  async updateExceptionStatus(id: string, status: ExceptionStatus, approvedBy?: string): Promise<ScheduleException> {
    const updateData: Partial<ScheduleException> = { status };
    if (approvedBy) {
      updateData.approvedBy = approvedBy;
      updateData.approvedAt = new Date() as any;
    }

    await this.scheduleExceptionRepository.update(id, updateData);

    const exception = await this.scheduleExceptionRepository.findOne({ where: { id } });
    if (!exception) {
      throw new Error(`ScheduleException with id ${id} not found after update`);
    }

    return exception;
  }

  async deleteException(id: string): Promise<void> {
    await this.scheduleExceptionRepository.delete(id);
  }

  private mapSortField(sortField: string): string {
    const fieldMap: Record<string, string> = {
      dayOfWeek: 'schedule.dayOfWeek',
      startTime: 'schedule.startTime',
      endTime: 'schedule.endTime',
      efficiency: 'schedule.efficiency',
      createdAt: 'schedule.createdAt',
    };
    return fieldMap[sortField] || 'schedule.dayOfWeek';
  }

  // ===== Users / Ownership =====
  async userBelongsToCompany(userId: string, companyId: string): Promise<boolean> {
    if (!userId || !companyId) return false;
    const repo = this.workScheduleRepository.manager.getRepository(User);
    const user = await repo.findOne({
      select: ['id', 'company_id'],
      where: { id: userId, company_id: companyId as any },
    });
    return !!user;
  }
}
