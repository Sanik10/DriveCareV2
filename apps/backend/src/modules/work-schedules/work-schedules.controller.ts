// path: apps/backend/src/modules/work-schedules/work-schedules.controller.ts
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
  BadRequestException,
  ForbiddenException,
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
import { UpdateExceptionStatusDto } from './dto/request/update-exception-status.dto';
import { ScheduleResponseDto } from './dto/response/schedule-response.dto';
import { PaginatedSchedulesResponseDto } from './dto/response/paginated-schedules-response.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { AuthWithOwnership, WorkScheduleResource } from '../../common';
import { WORK_SCHEDULES_CONSTANTS } from './constants/work-schedules.constants';
import { ExceptionResponseDto } from './dto/response/exception-response.dto';

@ApiTags('📅 Управление расписаниями')
@Controller('work-schedules')
export class WorkSchedulesController {
  constructor(private readonly workSchedulesService: WorkSchedulesService) {}

  @Post()
  @AuthWithOwnership()
  @Roles('owner', 'admin', 'manager', 'company_owner', 'company_admin')
  @ApiOperation({
    summary: 'Создание расписания работы',
    description: 'Создание расписания работы для сотрудника компании.',
  })
  @ApiBody({ type: CreateScheduleDto })
  @ApiResponse({ status: HttpStatus.CREATED, type: ScheduleResponseDto })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Недостаточно прав доступа' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async create(
    @Body() createScheduleDto: CreateScheduleDto,
    @Req() req: RequestWithUser,
  ): Promise<ScheduleResponseDto> {
    return this.workSchedulesService.create(createScheduleDto, req.user);
  }

  @Get()
  @AuthWithOwnership()
  @Roles('owner', 'admin', 'manager', 'mechanic', 'company_owner', 'company_admin')
  @ApiOperation({
    summary: 'Получение списка расписаний',
    description: 'Получение списка расписаний работы с фильтрацией и пагинацией.',
  })
  @ApiQuery({ name: 'userId', required: false, description: 'ID пользователя' })
  @ApiQuery({ name: 'dayOfWeek', required: false, description: 'День недели (0-6)' })
  @ApiQuery({ name: 'isActive', required: false, description: 'Статус активности (true/false)' })
  @ApiQuery({ name: 'page', required: false, description: 'Номер страницы' })
  @ApiQuery({ name: 'limit', required: false, description: 'Размер страницы' })
  @ApiQuery({ name: 'companyId', required: false, description: 'ID компании (обязательно для superadmin)' })
  @ApiResponse({ status: HttpStatus.OK, type: PaginatedSchedulesResponseDto })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async findAll(
    @Req() req: RequestWithUser,
    @Query('userId') userId?: string,
    @Query('dayOfWeek') dayOfWeekParam?: string,
    @Query('isActive') isActiveParam?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(WORK_SCHEDULES_CONSTANTS.DEFAULT_PAGE_SIZE), ParseIntPipe)
    limit: number = WORK_SCHEDULES_CONSTANTS.DEFAULT_PAGE_SIZE,
    @Query('companyId') companyId?: string,
  ): Promise<PaginatedSchedulesResponseDto> {
    if (req.user.role === 'superadmin' && !companyId) {
      throw new BadRequestException('companyId is required for superadmin listings');
    }

    if (dayOfWeekParam !== undefined && dayOfWeekParam !== null && dayOfWeekParam !== '') {
      const parsed = Number(dayOfWeekParam);
      if (Number.isNaN(parsed) || parsed < 0 || parsed > 6) {
        throw new BadRequestException('dayOfWeek must be a number in range 0..6');
      }
    }

    // Механикам — только свои расписания
    if (req.user.role === 'mechanic' && userId && userId !== req.user.id) {
      throw new ForbiddenException('Mechanics can only query their own schedules');
    }

    const dayOfWeek =
      dayOfWeekParam !== undefined && dayOfWeekParam !== null && dayOfWeekParam !== ''
        ? Number(dayOfWeekParam)
        : undefined;

    const isActive =
      isActiveParam !== undefined && isActiveParam !== null && isActiveParam !== ''
        ? ['true', '1'].includes(isActiveParam.toLowerCase())
          ? true
          : ['false', '0'].includes(isActiveParam.toLowerCase())
          ? false
          : undefined
        : undefined;

    const normalizedPage = Math.max(1, page);
    const normalizedLimit = Math.min(Math.max(1, limit), WORK_SCHEDULES_CONSTANTS.MAX_PAGE_SIZE);
    const effectiveUserId = req.user.role === 'mechanic' ? (userId ?? req.user.id) : userId;

    const filter = {
      userId: effectiveUserId,
      dayOfWeek,
      isActive,
      page: normalizedPage,
      limit: normalizedLimit,
      companyId: req.user.role === 'superadmin' ? companyId! : req.user.companyId!,
    };

    return this.workSchedulesService.findAll(filter);
  }

  @Get(':id')
  @AuthWithOwnership()
  @WorkScheduleResource()
  @ApiOperation({
    summary: 'Получение расписания по ID',
    description: 'Получение детальной информации о расписании работы.',
  })
  @ApiParam({ name: 'id', description: 'ID расписания' })
  @ApiResponse({ status: HttpStatus.OK, type: ScheduleResponseDto })
  @ApiNotFoundResponse({ description: '❌ Расписание не найдено' })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Нет доступа к расписанию' })
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  async findOne(@Param('id') id: string, @Req() req: RequestWithUser): Promise<ScheduleResponseDto> {
    return this.workSchedulesService.findOne(id, req.user);
  }

  @Patch(':id')
  @AuthWithOwnership()
  @WorkScheduleResource()
  @Roles('owner', 'admin', 'manager', 'company_owner', 'company_admin')
  @ApiOperation({
    summary: 'Обновление расписания',
    description: 'Обновление расписания работы сотрудника.',
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
    @Req() req: RequestWithUser,
  ): Promise<ScheduleResponseDto> {
    return this.workSchedulesService.update(id, updateScheduleDto, req.user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @AuthWithOwnership()
  @WorkScheduleResource()
  @Roles('owner', 'admin', 'company_owner', 'company_admin')
  @ApiOperation({
    summary: 'Удаление расписания',
    description: 'Деактивация расписания (историчность сохраняется).',
  })
  @ApiParam({ name: 'id', description: 'ID расписания' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiNotFoundResponse({ description: '❌ Расписание не найдено' })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Недостаточно прав или нет доступа к расписанию' })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async remove(@Param('id') id: string, @Req() req: RequestWithUser): Promise<void> {
    return this.workSchedulesService.remove(id, req.user);
  }

  @Post('exceptions')
  @AuthWithOwnership()
  @Roles('owner', 'admin', 'manager', 'mechanic', 'company_owner', 'company_admin')
  @ApiOperation({
    summary: 'Создание исключения в расписании',
    description: 'Создание исключения в расписании (отпуск, больничный и т.д.).',
  })
  @ApiBody({ type: CreateExceptionDto })
  @ApiResponse({ status: HttpStatus.CREATED, type: ExceptionResponseDto })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Недостаточно прав доступа' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async createException(
    @Body() createExceptionDto: CreateExceptionDto,
    @Req() req: RequestWithUser,
  ): Promise<ExceptionResponseDto> {
    // Механик может создавать исключения только для себя
    if (req.user.role === 'mechanic' && createExceptionDto.userId !== req.user.id) {
      throw new ForbiddenException('Mechanics can only create exceptions for themselves');
    }
    return this.workSchedulesService.createException(createExceptionDto, req.user);
  }

  @Patch('exceptions/:id/status')
  @AuthWithOwnership()
  @Roles('owner', 'admin', 'manager', 'company_owner', 'company_admin')
  @ApiOperation({
    summary: 'Смена статуса исключения',
    description: 'Обновление статуса исключения расписания (approve/reject/etc).',
  })
  @ApiParam({ name: 'id', description: 'ID исключения' })
  @ApiBody({ type: UpdateExceptionStatusDto })
  @ApiResponse({ status: HttpStatus.OK, type: ExceptionResponseDto })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Недостаточно прав доступа' })
  @ApiNotFoundResponse({ description: '❌ Исключение не найдено' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async updateExceptionStatus(
    @Param('id') id: string,
    @Body() dto: UpdateExceptionStatusDto,
    @Req() req: RequestWithUser,
  ): Promise<ExceptionResponseDto> {
    return this.workSchedulesService.updateExceptionStatus(id, dto.status, req.user);
  }

  @Delete('exceptions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @AuthWithOwnership()
  @Roles('owner', 'admin', 'company_owner', 'company_admin')
  @ApiOperation({
    summary: 'Удаление исключения (анонимизация)',
    description:
      'Логическое удаление исключения: персональные поля анонимизируются, запись сохраняется для историчности.',
  })
  @ApiParam({ name: 'id', description: 'ID исключения' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Недостаточно прав доступа' })
  @ApiNotFoundResponse({ description: '❌ Исключение не найдено' })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async deleteException(@Param('id') id: string, @Req() req: RequestWithUser): Promise<void> {
    return this.workSchedulesService.deleteException(id, req.user);
  }
}
