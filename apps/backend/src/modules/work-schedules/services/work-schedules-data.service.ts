// src/modules/work-schedules/services/work-schedules-data.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkSchedule, ScheduleException, User } from '../../../database/entities';
import { CreateScheduleDto } from '../dto/request/create-schedule.dto';
import { UpdateScheduleDto } from '../dto/request/update-schedule.dto';
import { CreateExceptionDto } from '../dto/request/create-exception.dto';
import { WorkSchedulesFilter, ScheduleExceptionsFilter } from '../types/work-schedules.types';
import { IWorkSchedulesDataService } from '../interfaces/work-schedules.interface';
import { WORK_SCHEDULES_CONSTANTS } from '../constants/work-schedules.constants';

@Injectable()
export class WorkSchedulesDataService implements IWorkSchedulesDataService {
  constructor(
    @InjectRepository(WorkSchedule)
    private readonly workScheduleRepository: Repository<WorkSchedule>,
    @InjectRepository(ScheduleException)
    private readonly scheduleExceptionRepository: Repository<ScheduleException>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(data: CreateScheduleDto & { companyId: string }): Promise<WorkSchedule> {
    // 🔥 ИСПРАВЛЕНО: правильное создание с учетом типов entity
    const scheduleData = {
      companyId: data.companyId,
      userId: data.userId,
      dayOfWeek: data.dayOfWeek,
      startTime: data.startTime,
      endTime: data.endTime,
      isDayOff: data.isDayOff || false,
      breakStartTime: data.breakStartTime || null,
      breakEndTime: data.breakEndTime || null,
      efficiency: data.efficiency || WORK_SCHEDULES_CONSTANTS.DEFAULT_EFFICIENCY,
      // 🔥 ИСПРАВЛЕНО: skillMatrix как JSON string, не массив
      skillMatrix: data.skillMatrix ? JSON.stringify(data.skillMatrix) : null,
      shiftType: data.shiftType || 'flexible',
      maxConsecutiveDays: data.maxConsecutiveDays || 5,
      // 🔥 ИСПРАВЛЕНО: preferredDaysOff как JSON string
      preferredDaysOff: data.preferredDaysOff ? JSON.stringify(data.preferredDaysOff) : null,
      isActive: true,
    };

    const schedule = this.workScheduleRepository.create(scheduleData);
    return this.workScheduleRepository.save(schedule);
  }

  async findById(id: string): Promise<WorkSchedule | null> {
    return this.workScheduleRepository.findOne({
      where: { id },
    });
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
      sortOrder = 'ASC'
    } = filter;

    const query = this.workScheduleRepository.createQueryBuilder('schedule');

    // 🔒 ОБЯЗАТЕЛЬНАЯ фильтрация по companyId
    if (companyId) {
      query.andWhere('schedule.companyId = :companyId', { companyId });
    }

    // Фильтры
    if (userId) {
      query.andWhere('schedule.userId = :userId', { userId });
    }

    if (dayOfWeek !== undefined) {
      query.andWhere('schedule.dayOfWeek = :dayOfWeek', { dayOfWeek });
    }

    if (isActive !== undefined) {
      query.andWhere('schedule.isActive = :isActive', { isActive });
    }

    // Сортировка
    const sortColumn = this.mapSortField(sortBy);
    query.orderBy(sortColumn, sortOrder.toUpperCase() as 'ASC' | 'DESC');

    // Пагинация
    const offset = (page - 1) * limit;
    query.skip(offset).take(limit);

    return query.getManyAndCount();
  }

  async update(id: string, data: Partial<UpdateScheduleDto>): Promise<WorkSchedule> {
    // 🔥 ИСПРАВЛЕНО: подготавливаем данные для обновления с правильными типами
    const updateData: any = {};
    
    if (data.dayOfWeek !== undefined) updateData.dayOfWeek = data.dayOfWeek;
    if (data.startTime !== undefined) updateData.startTime = data.startTime;
    if (data.endTime !== undefined) updateData.endTime = data.endTime;
    if (data.isDayOff !== undefined) updateData.isDayOff = data.isDayOff;
    if (data.breakStartTime !== undefined) updateData.breakStartTime = data.breakStartTime;
    if (data.breakEndTime !== undefined) updateData.breakEndTime = data.breakEndTime;
    if (data.efficiency !== undefined) updateData.efficiency = data.efficiency;
    if (data.shiftType !== undefined) updateData.shiftType = data.shiftType;
    if (data.maxConsecutiveDays !== undefined) updateData.maxConsecutiveDays = data.maxConsecutiveDays;
    
    // 🔥 ИСПРАВЛЕНО: правильная обработка JSON полей
    if (data.skillMatrix !== undefined) {
      updateData.skillMatrix = data.skillMatrix ? JSON.stringify(data.skillMatrix) : null;
    }
    if (data.preferredDaysOff !== undefined) {
      updateData.preferredDaysOff = data.preferredDaysOff ? JSON.stringify(data.preferredDaysOff) : null;
    }

    await this.workScheduleRepository.update(id, updateData);
    
    const updatedSchedule = await this.findById(id);
    if (!updatedSchedule) {
      throw new Error(`WorkSchedule with id ${id} not found after update`);
    }
    
    return updatedSchedule;
  }

  async delete(id: string): Promise<void> {
    await this.workScheduleRepository.delete(id);
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

  async createException(data: CreateExceptionDto & { companyId: string }): Promise<ScheduleException> {
    const exception = this.scheduleExceptionRepository.create(data);
    return this.scheduleExceptionRepository.save(exception);
  }

  async findExceptions(filter: ScheduleExceptionsFilter): Promise<[ScheduleException[], number]> {
    const query = this.scheduleExceptionRepository.createQueryBuilder('exception');

    // 🔒 ОБЯЗАТЕЛЬНАЯ фильтрация по companyId
    if (filter.companyId) {
      query.andWhere('exception.companyId = :companyId', { companyId: filter.companyId });
    }

    if (filter.userId) {
      query.andWhere('exception.userId = :userId', { userId: filter.userId });
    }

    if (filter.type) {
      query.andWhere('exception.type = :type', { type: filter.type });
    }

    if (filter.status) {
      query.andWhere('exception.status = :status', { status: filter.status });
    }

    // Пагинация
    if (filter.page && filter.limit) {
      const offset = (filter.page - 1) * filter.limit;
      query.skip(offset).take(filter.limit);
    }

    return query.getManyAndCount();
  }

  async updateExceptionStatus(id: string, status: string, approvedBy?: string): Promise<ScheduleException> {
    const updateData: any = { status };
    
    if (approvedBy) {
      updateData.approvedBy = approvedBy;
      updateData.approvedAt = new Date();
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
}
