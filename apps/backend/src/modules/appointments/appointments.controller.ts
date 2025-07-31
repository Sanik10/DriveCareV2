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
  ParseBoolPipe,
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
  ApiConflictResponse,
  ApiBadRequestResponse,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/request/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/request/update-appointment.dto';
import { SmartScheduleDto, CheckAvailabilityDto } from './dto/request/smart-schedule.dto';
import { AppointmentResponseDto } from './dto/response/appointment-response.dto';
import { PaginatedAppointmentsResponseDto } from './dto/response/paginated-appointments-response.dto';
import { SmartScheduleResponseDto, AppointmentTrackingDto } from './dto/response/smart-schedule-response.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { AppointmentFilter } from './types/appointments.types';
import { APPOINTMENTS_CONSTANTS } from './constants/appointments.constants';
import { AuthWithOwnership, AppointmentResource } from '../../common';

@ApiTags('🕐 Управление записями')
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @AuthWithOwnership()
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ 
    summary: 'Создание новой записи',
    description: 'Создание записи на обслуживание для клиента. Доступно владельцам, админам и менеджерам.'
  })
  @ApiBody({ 
    type: CreateAppointmentDto,
    examples: {
      regularService: {
        summary: 'Обычная запись на ТО',
        value: {
          customerId: '123e4567-e89b-12d3-a456-426614174000',
          vehicleId: '456e7890-e89b-12d3-a456-426614174001',
          mechanicId: '789e0123-e89b-12d3-a456-426614174002',
          startTime: '2025-01-15T10:00:00.000Z',
          endTime: '2025-01-15T12:00:00.000Z',
          estimatedDuration: 120,
          serviceIds: ['service-1-uuid', 'service-2-uuid'],
          priority: 'normal',
          description: 'Плановое ТО-1',
          contactPhone: '+7 (495) 123-45-67'
        }
      },
      urgentRepair: {
        summary: 'Срочный ремонт',
        value: {
          customerId: '123e4567-e89b-12d3-a456-426614174000',
          vehicleId: '456e7890-e89b-12d3-a456-426614174001',
          mechanicId: '789e0123-e89b-12d3-a456-426614174002',
          startTime: '2025-01-15T09:00:00.000Z',
          endTime: '2025-01-15T11:00:00.000Z',
          estimatedDuration: 120,
          serviceIds: ['urgent-repair-uuid'],
          priority: 'urgent',
          description: 'Не заводится двигатель',
          customerNotes: 'Автомобиль на эвакуаторе'
        }
      }
    }
  })
  @ApiResponse({ status: HttpStatus.CREATED, type: AppointmentResponseDto })
  @ApiConflictResponse({ description: 'Конфликт времени записи' })
  @ApiBadRequestResponse({ description: 'Некорректные данные или превышен лимит записей' })
  @ApiUnauthorizedResponse({ description: 'Требуется авторизация' })
  @ApiForbiddenResponse({ description: 'Недостаточно прав доступа' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async create(
    @Body() createAppointmentDto: CreateAppointmentDto,
    @Req() req: RequestWithUser,
  ): Promise<AppointmentResponseDto> {
    return this.appointmentsService.createForUser(createAppointmentDto, req.user);
  }

  @Get()
  @AuthWithOwnership()
  @ApiOperation({ 
    summary: 'Получение списка записей',
    description: 'Получение списка записей с фильтрацией и пагинацией. Каждый видит только записи своей компании.'
  })
  @ApiQuery({ name: 'search', required: false, description: 'Поиск по клиенту, описанию' })
  @ApiQuery({ name: 'status', required: false, description: 'Фильтр по статусу' })
  @ApiQuery({ name: 'priority', required: false, description: 'Фильтр по приоритету' })
  @ApiQuery({ name: 'mechanicId', required: false, description: 'Фильтр по мастеру' })
  @ApiQuery({ name: 'customerId', required: false, description: 'Фильтр по клиенту' })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'Дата начала периода' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'Дата окончания периода' })
  @ApiQuery({ name: 'page', required: false, description: 'Номер страницы' })
  @ApiQuery({ name: 'limit', required: false, description: 'Размер страницы' })
  @ApiResponse({ status: HttpStatus.OK, type: PaginatedAppointmentsResponseDto })
  @ApiUnauthorizedResponse({ description: 'Требуется авторизация' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async findAll(
    @Req() req: RequestWithUser,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('mechanicId') mechanicId?: string,
    @Query('customerId') customerId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(APPOINTMENTS_CONSTANTS.DEFAULTS.PAGE_SIZE), ParseIntPipe) limit: number = APPOINTMENTS_CONSTANTS.DEFAULTS.PAGE_SIZE,
    @Query('sortField', new DefaultValuePipe('startTime')) sortField: string = 'startTime',
    @Query('sortOrder', new DefaultValuePipe('asc')) sortOrder: 'asc' | 'desc' = 'asc',
  ): Promise<PaginatedAppointmentsResponseDto> {
    const filter: AppointmentFilter = {
      search,
      status: status as any,
      priority: priority as any,
      mechanicId,
      customerId,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      page,
      limit: Math.min(limit, APPOINTMENTS_CONSTANTS.DEFAULTS.MAX_ITEMS),
      sortField: sortField as any,
      sortOrder,
    };

    return this.appointmentsService.findAllForUser(req.user, filter);
  }

  @Get(':id')
  @AuthWithOwnership()
  @AppointmentResource()
  @ApiOperation({ 
    summary: 'Получение записи по ID',
    description: 'Получение детальной информации о записи с проверкой принадлежности к компании.'
  })
  @ApiParam({ name: 'id', description: 'ID записи' })
  @ApiResponse({ status: HttpStatus.OK, type: AppointmentResponseDto })
  @ApiNotFoundResponse({ description: 'Запись не найдена' })
  @ApiUnauthorizedResponse({ description: 'Требуется авторизация' })
  @ApiForbiddenResponse({ description: 'Нет доступа к записи' })
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  async findOne(@Param('id') id: string): Promise<AppointmentResponseDto> {
    return this.appointmentsService.findOne(id);
  }

  @Patch(':id')
  @AuthWithOwnership()
  @AppointmentResource()
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ 
    summary: 'Обновление записи',
    description: 'Обновление информации о записи с проверкой принадлежности к компании.'
  })
  @ApiParam({ name: 'id', description: 'ID записи' })
  @ApiBody({ type: UpdateAppointmentDto })
  @ApiResponse({ status: HttpStatus.OK, type: AppointmentResponseDto })
  @ApiNotFoundResponse({ description: 'Запись не найдена' })
  @ApiConflictResponse({ description: 'Конфликт времени записи' })
  @ApiBadRequestResponse({ description: 'Некорректные данные' })
  @ApiUnauthorizedResponse({ description: 'Требуется авторизация' })
  @ApiForbiddenResponse({ description: 'Недостаточно прав или нет доступа к записи' })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async update(
    @Param('id') id: string,
    @Body() updateAppointmentDto: UpdateAppointmentDto,
  ): Promise<AppointmentResponseDto> {
    return this.appointmentsService.update(id, updateAppointmentDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @AuthWithOwnership()
  @AppointmentResource()
  @Roles('owner', 'admin')
  @ApiOperation({ 
    summary: 'Мягкое удаление записи',
    description: 'Деактивация записи (мягкое удаление). Доступно владельцам и админам.'
  })
  @ApiParam({ name: 'id', description: 'ID записи' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiNotFoundResponse({ description: 'Запись не найдена' })
  @ApiUnauthorizedResponse({ description: 'Требуется авторизация' })
  @ApiForbiddenResponse({ description: 'Недостаточно прав доступа' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async remove(@Param('id') id: string): Promise<void> {
    return this.appointmentsService.remove(id);
  }

  @Delete(':id/hard')
  @HttpCode(HttpStatus.NO_CONTENT)
  @AuthWithOwnership()
  @AppointmentResource()
  @Roles('superadmin')
  @ApiOperation({ 
    summary: 'Полное удаление записи (только суперадмин)',
    description: 'ОПАСНАЯ ОПЕРАЦИЯ! Полное удаление записи из базы данных.'
  })
  @ApiParam({ name: 'id', description: 'ID записи' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiNotFoundResponse({ description: 'Запись не найдена' })
  @ApiUnauthorizedResponse({ description: 'Требуется авторизация' })
  @ApiForbiddenResponse({ description: 'Доступно только суперадминистратору' })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async hardRemove(@Param('id') id: string): Promise<void> {
    return this.appointmentsService.hardRemove(id);
  }

  // 🔥 SMART FEATURES

  @Post('smart-schedule')
  @AuthWithOwnership()
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ 
    summary: '🧠 Умное планирование записи',
    description: 'Интеллектуальный поиск оптимального времени для записи с учетом предпочтений клиента и загрузки мастеров.'
  })
  @ApiBody({ type: SmartScheduleDto })
  @ApiResponse({ status: HttpStatus.OK, type: SmartScheduleResponseDto })
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  async smartSchedule(
    @Body() smartScheduleDto: SmartScheduleDto,
    @Req() req: RequestWithUser,
  ): Promise<SmartScheduleResponseDto> {
    return this.appointmentsService.smartSchedule(smartScheduleDto, req.user);
  }

  @Post('check-availability')
  @AuthWithOwnership()
  @ApiOperation({ 
    summary: 'Проверка доступности слотов',
    description: 'Проверка доступных временных слотов для указанных услуг.'
  })
  @ApiBody({ type: CheckAvailabilityDto })
  @ApiResponse({ status: HttpStatus.OK })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async checkAvailability(
    @Body() checkDto: CheckAvailabilityDto,
    @Req() req: RequestWithUser,
  ): Promise<any[]> {
    return this.appointmentsService.checkAvailability(checkDto.serviceIds, checkDto.date, req.user);
  }

  // STATUS OPERATIONS

  @Post(':id/confirm')
  @AuthWithOwnership()
  @AppointmentResource()
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ 
    summary: 'Подтверждение записи',
    description: 'Подтверждение записи и отправка уведомления клиенту.'
  })
  @ApiParam({ name: 'id', description: 'ID записи' })
  @ApiResponse({ status: HttpStatus.OK, type: AppointmentResponseDto })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async confirm(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
  ): Promise<AppointmentResponseDto> {
    return this.appointmentsService.confirmAppointment(id, req.user);
  }

  @Post(':id/complete')
  @AuthWithOwnership()
  @AppointmentResource()
  @Roles('owner', 'admin', 'manager', 'mechanic')
  @ApiOperation({ 
    summary: 'Завершение записи',
    description: 'Отметка о завершении работ по записи.'
  })
  @ApiParam({ name: 'id', description: 'ID записи' })
  @ApiResponse({ status: HttpStatus.OK, type: AppointmentResponseDto })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async complete(
    @Param('id') id: string,
    @Req() req: RequestWithUser,
    @Body() completionData?: any,
  ): Promise<AppointmentResponseDto> {
    return this.appointmentsService.completeAppointment(id, req.user, completionData);
  }

  @Post(':id/cancel')
  @AuthWithOwnership()
  @AppointmentResource()
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ 
    summary: 'Отмена записи',
    description: 'Отмена записи с указанием причины.'
  })
  @ApiParam({ name: 'id', description: 'ID записи' })
  @ApiResponse({ status: HttpStatus.OK, type: AppointmentResponseDto })
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  async cancel(
    @Param('id') id: string,
    @Query('reason') reason: string,
    @Req() req: RequestWithUser,
  ): Promise<AppointmentResponseDto> {
    return this.appointmentsService.cancelAppointment(id, req.user, reason);
  }

  @Post(':id/reschedule')
  @AuthWithOwnership()
  @AppointmentResource()
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ 
    summary: 'Перенос записи',
    description: 'Перенос записи на новое время.'
  })
  @ApiParam({ name: 'id', description: 'ID записи' })
  @ApiResponse({ status: HttpStatus.OK, type: AppointmentResponseDto })
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  async reschedule(
    @Param('id') id: string,
    @Query('startTime') startTime: string,
    @Query('endTime') endTime: string,
    @Req() req: RequestWithUser,
  ): Promise<AppointmentResponseDto> {
    return this.appointmentsService.rescheduleAppointment(
      id, 
      new Date(startTime), 
      new Date(endTime), 
      req.user
    );
  }

  // ANALYTICS & TRACKING

  @Get(':id/tracking')
  @AuthWithOwnership()
  @AppointmentResource()
  @ApiOperation({ 
    summary: '📊 Real-time отслеживание записи',
    description: 'Получение информации о текущем статусе и прогрессе выполнения записи.'
  })
  @ApiParam({ name: 'id', description: 'ID записи' })
  @ApiResponse({ status: HttpStatus.OK, type: AppointmentTrackingDto })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async getTracking(@Param('id') id: string): Promise<AppointmentTrackingDto> {
    return this.appointmentsService.getTracking(id);
  }

  @Get('customer/:customerId')
  @AuthWithOwnership()
  @ApiOperation({ 
    summary: 'Записи клиента',
    description: 'Получение всех записей конкретного клиента.'
  })
  @ApiParam({ name: 'customerId', description: 'ID клиента' })
  @ApiResponse({ status: HttpStatus.OK, type: [AppointmentResponseDto] })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async findByCustomer(
    @Param('customerId') customerId: string,
    @Req() req: RequestWithUser,
  ): Promise<AppointmentResponseDto[]> {
    return this.appointmentsService.findByCustomer(customerId, req.user);
  }

  @Get('mechanic/:mechanicId')
  @AuthWithOwnership()
  @ApiOperation({ 
    summary: 'Записи мастера',
    description: 'Получение записей конкретного мастера в указанном диапазоне дат.'
  })
  @ApiParam({ name: 'mechanicId', description: 'ID мастера' })
  @ApiQuery({ name: 'dateFrom', required: true, description: 'Дата начала' })
  @ApiQuery({ name: 'dateTo', required: true, description: 'Дата окончания' })
  @ApiResponse({ status: HttpStatus.OK, type: [AppointmentResponseDto] })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async findByMechanic(
    @Param('mechanicId') mechanicId: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
    @Req() req: RequestWithUser,
  ): Promise<AppointmentResponseDto[]> {
    return this.appointmentsService.findByMechanic(
      mechanicId, 
      new Date(dateFrom), 
      new Date(dateTo), 
      req.user
    );
  }

  @Get('stats/dashboard')
  @AuthWithOwnership()
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ 
    summary: 'Статистика записей',
    description: 'Получение статистики записей для дашборда.'
  })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async getStats(@Req() req: RequestWithUser): Promise<any> {
    return this.appointmentsService.getStats(req.user.companyId!);
  }

  @Post(':id/rating')
  @AuthWithOwnership()
  @AppointmentResource()
  @ApiOperation({ 
    summary: 'Добавление оценки',
    description: 'Добавление оценки и отзыва к завершенной записи.'
  })
  @ApiParam({ name: 'id', description: 'ID записи' })
  @ApiResponse({ status: HttpStatus.OK, type: AppointmentResponseDto })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async addRating(
    @Param('id') id: string,
    @Query('rating', ParseIntPipe) rating: number,
    @Query('feedback') feedback?: string,
  ): Promise<AppointmentResponseDto> {
    return this.appointmentsService.addRating(id, rating, feedback);
  }
}
