// src/modules/work-schedules/work-schedules.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  DefaultValuePipe,
  ParseIntPipe,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { WorkSchedulesService } from './work-schedules.service';
import { CreateScheduleDto } from './dto/request/create-schedule.dto';
import { UpdateScheduleDto } from './dto/request/update-schedule.dto';
import { CreateExceptionDto } from './dto/request/create-exception.dto';
import { ScheduleResponseDto } from './dto/response/schedule-response.dto';
import { PaginatedSchedulesResponseDto } from './dto/response/paginated-schedules-response.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { AuthWithOwnership, WorkScheduleResource } from '../../common';
import { WORK_SCHEDULES_CONSTANTS } from './constants/work-schedules.constants';

@ApiTags('📅 Управление расписаниями')
@Controller('work-schedules')
export class WorkSchedulesController {
  constructor(private readonly workSchedulesService: WorkSchedulesService) {}

  @Post()
  @AuthWithOwnership()
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ 
    summary: 'Создание расписания работы',
    description: 'Создание расписания работы для сотрудника компании.'
  })
  @ApiBody({ type: CreateScheduleDto })
  @ApiResponse({ status: HttpStatus.CREATED, type: ScheduleResponseDto })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Недостаточно прав доступа' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async create(
    @Body() createScheduleDto: CreateScheduleDto,
    @Req() req: RequestWithUser, // 🔥 ИСПРАВЛЕНО: перенесено в конец
  ): Promise<ScheduleResponseDto> {
    return this.workSchedulesService.create(createScheduleDto, req.user);
  }

  @Get()
  @AuthWithOwnership()
  @ApiOperation({ 
    summary: 'Получение списка расписаний',
    description: 'Получение списка расписаний работы с фильтрацией и пагинацией.'
  })
  @ApiQuery({ name: 'userId', required: false, description: 'ID пользователя' })
  @ApiQuery({ name: 'dayOfWeek', required: false, description: 'День недели (0-6)' })
  @ApiQuery({ name: 'isActive', required: false, description: 'Статус активности' })
  @ApiQuery({ name: 'page', required: false, description: 'Номер страницы' })
  @ApiQuery({ name: 'limit', required: false, description: 'Размер страницы' })
  @ApiResponse({ status: HttpStatus.OK, type: PaginatedSchedulesResponseDto })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async findAll(
    @Req() req: RequestWithUser, // 🔥 ИСПРАВЛЕНО: req должен быть обязательным параметром первым
    @Query('userId') userId?: string,
    @Query('dayOfWeek') dayOfWeek?: number,
    @Query('isActive') isActive?: boolean,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(WORK_SCHEDULES_CONSTANTS.DEFAULT_PAGE_SIZE), ParseIntPipe) limit: number = WORK_SCHEDULES_CONSTANTS.DEFAULT_PAGE_SIZE,
  ): Promise<PaginatedSchedulesResponseDto> {
    const filter = {
      userId,
      dayOfWeek,
      isActive,
      page,
      limit: Math.min(limit, WORK_SCHEDULES_CONSTANTS.MAX_PAGE_SIZE),
      companyId: req.user.role === 'superadmin' ? undefined : req.user.companyId,
    };

    return this.workSchedulesService.findAll(filter);
  }

  @Get(':id')
  @AuthWithOwnership()
  @WorkScheduleResource()
  @ApiOperation({ 
    summary: 'Получение расписания по ID',
    description: 'Получение детальной информации о расписании работы.'
  })
  @ApiParam({ name: 'id', description: 'ID расписания' })
  @ApiResponse({ status: HttpStatus.OK, type: ScheduleResponseDto })
  @ApiNotFoundResponse({ description: '❌ Расписание не найдено' })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Нет доступа к расписанию' })
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  async findOne(@Param('id') id: string): Promise<ScheduleResponseDto> {
    return this.workSchedulesService.findOne(id);
  }

  @Patch(':id')
  @AuthWithOwnership()
  @WorkScheduleResource()
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ 
    summary: 'Обновление расписания',
    description: 'Обновление расписания работы сотрудника.'
  })
  @ApiParam({ name: 'id', description: 'ID расписания' })
  @ApiBody({ type: UpdateScheduleDto })
  @ApiResponse({ status: HttpStatus.OK, type: ScheduleResponseDto })
  @ApiNotFoundResponse({ description: '❌ Расписание не найдено' })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Недостаточно прав или нет доступа к расписанию' })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async update(
    @Param('id') id: string,
    @Body() updateScheduleDto: UpdateScheduleDto,
  ): Promise<ScheduleResponseDto> {
    return this.workSchedulesService.update(id, updateScheduleDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @AuthWithOwnership()
  @WorkScheduleResource()
  @Roles('owner', 'admin')
  @ApiOperation({ 
    summary: 'Удаление расписания',
    description: 'Удаление расписания работы сотрудника.'
  })
  @ApiParam({ name: 'id', description: 'ID расписания' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiNotFoundResponse({ description: '❌ Расписание не найдено' })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Недостаточно прав или нет доступа к расписанию' })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async remove(@Param('id') id: string): Promise<void> {
    return this.workSchedulesService.remove(id);
  }

  @Post('exceptions')
  @AuthWithOwnership()
  @Roles('owner', 'admin', 'manager', 'mechanic')
  @ApiOperation({ 
    summary: 'Создание исключения в расписании',
    description: 'Создание исключения в расписании (отпуск, больничный и т.д.).'
  })
  @ApiBody({ type: CreateExceptionDto })
  @ApiResponse({ status: HttpStatus.CREATED })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Недостаточно прав доступа' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async createException(
    @Body() createExceptionDto: CreateExceptionDto,
    @Req() req: RequestWithUser,
  ): Promise<any> {
    return this.workSchedulesService.createException(createExceptionDto, req.user);
  }
}
