// src/modules/work-schedules/work-schedules.service.ts - ИСПРАВЛЕННАЯ ВЕРСИЯ
import { Injectable, Logger } from '@nestjs/common';
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

@Injectable()
export class WorkSchedulesService {
  private readonly logger = new Logger(WorkSchedulesService.name);

  constructor(
    private readonly dataService: WorkSchedulesDataService,
    private readonly mapperService: WorkSchedulesMapperService,
    private readonly validationService: WorkSchedulesValidationService,
    private readonly businessService: WorkSchedulesBusinessService,
  ) {}

  async create(createDto: CreateScheduleDto, user: UserWithCompany): Promise<ScheduleResponseDto> {
    this.logger.log(`Создание расписания для пользователя ${createDto.userId} компании ${user.companyId}`);

    // 🛡️ Проверка безопасности
    await this.validationService.validateUserBelongsToCompany(createDto.userId, user.companyId);
    
    // 📊 Валидация данных
    await this.validationService.validateScheduleData(createDto);
    await this.validationService.validateScheduleConflicts(
      createDto.userId, 
      createDto.dayOfWeek, 
      user.companyId
    );

    // 💾 Создание
    const schedule = await this.dataService.create({
      ...createDto,
      companyId: user.companyId,
    });

    this.logger.log(`Расписание успешно создано: ${schedule.id}`);
    
    return this.mapperService.mapScheduleToResponseDto(schedule);
  }

  async findAll(filter: WorkSchedulesFilter): Promise<PaginatedSchedulesResponseDto> {
    this.logger.log(`Поиск расписаний с фильтрами: ${JSON.stringify(filter)}`);

    const [schedules, total] = await this.dataService.findWithFilters(filter);

    const page = filter.page || 1;
    const limit = filter.limit || WORK_SCHEDULES_CONSTANTS.DEFAULT_PAGE_SIZE;
    const totalPages = Math.ceil(total / limit);

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

  async findOne(id: string): Promise<ScheduleResponseDto> {
    this.logger.log(`Поиск расписания ${id}`);

    const schedule = await this.validationService.validateScheduleExists(id);
    
    return this.mapperService.mapScheduleToResponseDto(schedule);
  }

  async update(id: string, updateDto: UpdateScheduleDto): Promise<ScheduleResponseDto> {
    this.logger.log(`Обновление расписания ${id}`);

    // 🛡️ Проверка существования
    await this.validationService.validateScheduleExists(id);
    
    // 📊 Валидация данных
    await this.validationService.validateScheduleData(updateDto);

    // 💾 Обновление
    const updatedSchedule = await this.dataService.update(id, updateDto);

    this.logger.log(`Расписание ${id} успешно обновлено`);
    
    return this.mapperService.mapScheduleToResponseDto(updatedSchedule);
  }

  async remove(id: string): Promise<void> {
    this.logger.log(`Удаление расписания ${id}`);

    // 🛡️ Проверка существования
    await this.validationService.validateScheduleExists(id);
    
    await this.dataService.delete(id);

    this.logger.log(`Расписание ${id} успешно удалено`);
  }

  async createException(createDto: CreateExceptionDto, user: UserWithCompany): Promise<any> {
    this.logger.log(`Создание исключения для пользователя ${createDto.userId} компании ${user.companyId}`);

    // 🛡️ Проверка безопасности
    await this.validationService.validateUserBelongsToCompany(createDto.userId, user.companyId);
    
    // 📊 Валидация данных
    await this.validationService.validateExceptionData(createDto);

    // 💾 Создание исключения
    const exception = await this.dataService.createException({
      ...createDto,
      companyId: user.companyId,
    });

    this.logger.log(`Исключение успешно создано: ${exception.id}`);
    
    return this.mapperService.mapExceptionToResponseDto(exception);
  }
}
