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
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ServiceHistoryService } from './service-history.service';
import { CreateServiceHistoryDto } from './dto/request/create-service-history.dto';
import { UpdateServiceHistoryDto } from './dto/request/update-service-history.dto';
import { ServiceHistoryResponseDto } from './dto/response/service-history-response.dto';
import { PaginatedServiceHistoryResponseDto } from './dto/response/paginated-service-history-response.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { ServiceHistoryFilter } from './types/service-history.types';
import { SERVICE_HISTORY_CONSTANTS } from './constants/service-history.constants';
import { AuthWithOwnership, ServiceHistoryResource } from '../../common';

@ApiTags('🔧 История обслуживания')
@Controller('service-history')
export class ServiceHistoryController {
  constructor(private readonly serviceHistoryService: ServiceHistoryService) {}

  @Post()
  @AuthWithOwnership()
  @Roles('owner', 'admin', 'manager', 'mechanic')
  @ApiOperation({ 
    summary: 'Создание записи обслуживания',
    description: 'Создание новой записи истории обслуживания автомобиля. Автомобиль должен принадлежать компании пользователя.'
  })
  @ApiBody({ type: CreateServiceHistoryDto })
  @ApiResponse({ status: HttpStatus.CREATED, type: ServiceHistoryResponseDto })
  @ApiBadRequestResponse({ description: 'Некорректные данные или автомобиль не принадлежит компании' })
  @ApiUnauthorizedResponse({ description: 'Требуется авторизация' })
  @ApiForbiddenResponse({ description: 'Недостаточно прав доступа' })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async create(
    @Body() createServiceHistoryDto: CreateServiceHistoryDto,
    @Req() req: RequestWithUser,
  ): Promise<ServiceHistoryResponseDto> {
    return this.serviceHistoryService.createForUser(createServiceHistoryDto, req.user);
  }

  @Get()
  @AuthWithOwnership()
  @ApiOperation({ 
    summary: 'Получение истории обслуживания',
    description: 'Получение списка записей обслуживания с фильтрацией. Пользователи видят только записи своей компании.'
  })
  @ApiQuery({ name: 'search', required: false, description: 'Поиск по описанию работ' })
  @ApiQuery({ name: 'vehicleId', required: false, description: 'ID автомобиля для фильтрации' })
  @ApiQuery({ name: 'customerId', required: false, description: 'ID клиента для фильтрации' })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'Дата обслуживания от (YYYY-MM-DD)' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'Дата обслуживания до (YYYY-MM-DD)' })
  @ApiQuery({ name: 'mileageFrom', required: false, description: 'Пробег от (км)' })
  @ApiQuery({ name: 'mileageTo', required: false, description: 'Пробег до (км)' })
  @ApiQuery({ name: 'hasNextService', required: false, description: 'Есть ли запланированное следующее ТО' })
  @ApiQuery({ name: 'page', required: false, description: 'Номер страницы' })
  @ApiQuery({ name: 'limit', required: false, description: 'Размер страницы' })
  @ApiResponse({ status: HttpStatus.OK, type: PaginatedServiceHistoryResponseDto })
  @ApiUnauthorizedResponse({ description: 'Требуется авторизация' })
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  async findAll(
    @Req() req: RequestWithUser,
    @Query('search') search?: string,
    @Query('vehicleId') vehicleId?: string,
    @Query('customerId') customerId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('mileageFrom', new DefaultValuePipe(null)) mileageFrom?: number,
    @Query('mileageTo', new DefaultValuePipe(null)) mileageTo?: number,
    @Query('hasNextService', new DefaultValuePipe(null)) hasNextService?: boolean,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(SERVICE_HISTORY_CONSTANTS.DEFAULTS.PAGE_SIZE), ParseIntPipe) limit: number = SERVICE_HISTORY_CONSTANTS.DEFAULTS.PAGE_SIZE,
    @Query('sortField', new DefaultValuePipe('date')) sortField: string = 'date',
    @Query('sortOrder', new DefaultValuePipe('desc')) sortOrder: 'asc' | 'desc' = 'desc',
  ): Promise<PaginatedServiceHistoryResponseDto> {
    const filter: ServiceHistoryFilter = {
      search,
      vehicleId,
      customerId,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      mileageFrom,
      mileageTo,
      hasNextService,
      page,
      limit: Math.min(limit, SERVICE_HISTORY_CONSTANTS.DEFAULTS.MAX_ITEMS),
      sortField: sortField as any,
      sortOrder,
    };

    return this.serviceHistoryService.findAllForUser(req.user, filter);
  }

  @Get('vehicle/:vehicleId')
  @AuthWithOwnership()
  @ApiOperation({ 
    summary: 'История обслуживания автомобиля',
    description: 'Получение всей истории обслуживания конкретного автомобиля с проверкой принадлежности.'
  })
  @ApiParam({ name: 'vehicleId', description: 'ID автомобиля' })
  @ApiResponse({ status: HttpStatus.OK, type: [ServiceHistoryResponseDto] })
  @ApiNotFoundResponse({ description: 'Автомобиль не найден или нет доступа' })
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  async findByVehicle(
    @Param('vehicleId') vehicleId: string,
    @Req() req: RequestWithUser,
  ): Promise<ServiceHistoryResponseDto[]> {
    return this.serviceHistoryService.getServiceHistoryByVehicle(vehicleId, req.user);
  }

  @Get('stats/dashboard')
  @AuthWithOwnership()
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ 
    summary: 'Статистика по обслуживанию',
    description: 'Получение статистики по обслуживанию для дашборда.'
  })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async getStats(@Req() req: RequestWithUser): Promise<any> {
    return this.serviceHistoryService.getStats(req.user.companyId!);
  }

  @Get(':id')
  @AuthWithOwnership()
  @ServiceHistoryResource()
  @ApiOperation({ 
    summary: 'Получение записи обслуживания по ID',
    description: 'Получение детальной информации о записи обслуживания с проверкой принадлежности.'
  })
  @ApiParam({ name: 'id', description: 'ID записи обслуживания' })
  @ApiResponse({ status: HttpStatus.OK, type: ServiceHistoryResponseDto })
  @ApiNotFoundResponse({ description: 'Запись не найдена' })
  @ApiUnauthorizedResponse({ description: 'Требуется авторизация' })
  @ApiForbiddenResponse({ description: 'Нет доступа к записи' })
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  async findOne(@Param('id') id: string): Promise<ServiceHistoryResponseDto> {
    return this.serviceHistoryService.findOne(id);
  }

  @Patch(':id')
  @AuthWithOwnership()
  @ServiceHistoryResource()
  @Roles('owner', 'admin', 'manager', 'mechanic')
  @ApiOperation({ 
    summary: 'Обновление записи обслуживания',
    description: 'Обновление информации о записи обслуживания с проверкой принадлежности.'
  })
  @ApiParam({ name: 'id', description: 'ID записи обслуживания' })
  @ApiBody({ type: UpdateServiceHistoryDto })
  @ApiResponse({ status: HttpStatus.OK, type: ServiceHistoryResponseDto })
  @ApiNotFoundResponse({ description: 'Запись не найдена' })
  @ApiBadRequestResponse({ description: 'Некорректные данные' })
  @ApiUnauthorizedResponse({ description: 'Требуется авторизация' })
  @ApiForbiddenResponse({ description: 'Недостаточно прав или нет доступа к записи' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async update(
    @Param('id') id: string,
    @Body() updateServiceHistoryDto: UpdateServiceHistoryDto,
  ): Promise<ServiceHistoryResponseDto> {
    return this.serviceHistoryService.update(id, updateServiceHistoryDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @AuthWithOwnership()
  @ServiceHistoryResource()
  @Roles('owner', 'admin')
  @ApiOperation({ 
    summary: 'Удаление записи обслуживания',
    description: 'Мягкое удаление записи обслуживания. Доступно владельцам и админам.'
  })
  @ApiParam({ name: 'id', description: 'ID записи обслуживания' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiNotFoundResponse({ description: 'Запись не найдена' })
  @ApiUnauthorizedResponse({ description: 'Требуется авторизация' })
  @ApiForbiddenResponse({ description: 'Недостаточно прав доступа' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async remove(@Param('id') id: string): Promise<void> {
    return this.serviceHistoryService.remove(id);
  }

  @Delete(':id/hard')
  @HttpCode(HttpStatus.NO_CONTENT)
  @AuthWithOwnership()
  @ServiceHistoryResource()
  @Roles('superadmin')
  @ApiOperation({ 
    summary: 'Полное удаление записи (только суперадмин)',
    description: 'ОПАСНАЯ ОПЕРАЦИЯ! Полное удаление записи из базы данных.'
  })
  @ApiParam({ name: 'id', description: 'ID записи обслуживания' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async hardRemove(@Param('id') id: string): Promise<void> {
    return this.serviceHistoryService.hardRemove(id);
  }
}
