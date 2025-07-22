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
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/request/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/request/update-vehicle.dto';
import { VehicleResponseDto } from './dto/response/vehicle-response.dto';
import { PaginatedVehiclesResponseDto } from './dto/response/paginated-vehicles-response.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { VehicleFilter } from './types/vehicles.types';
import { VEHICLES_CONSTANTS } from './constants/vehicles.constants';
import { AuthWithOwnership, VehicleResource } from '../../common';

@ApiTags('🚗 Управление автопарком')
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  @AuthWithOwnership()
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ 
    summary: 'Создание нового автомобиля',
    description: 'Создание автомобиля для клиента компании. Доступно владельцам, админам и менеджерам.'
  })
  @ApiBody({ type: CreateVehicleDto })
  @ApiResponse({ status: HttpStatus.CREATED, type: VehicleResponseDto })
  @ApiConflictResponse({ description: 'Автомобиль с таким VIN или номером уже существует' })
  @ApiBadRequestResponse({ description: 'Некорректные данные или превышен лимит автомобилей' })
  @ApiUnauthorizedResponse({ description: 'Требуется авторизация' })
  @ApiForbiddenResponse({ description: 'Недостаточно прав доступа' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async create(
    @Body() createVehicleDto: CreateVehicleDto,
    @Req() req: RequestWithUser,
  ): Promise<VehicleResponseDto> {
    return this.vehiclesService.createForUser(createVehicleDto, req.user);
  }

  @Get()
  @AuthWithOwnership()
  @ApiOperation({ 
    summary: 'Получение списка автомобилей',
    description: 'Получение списка автомобилей с фильтрацией и пагинацией. Каждый видит только автомобили своей компании.'
  })
  @ApiQuery({ name: 'search', required: false, description: 'Поиск по VIN, номеру, цвету, модели' })
  @ApiQuery({ name: 'customerId', required: false, description: 'ID клиента для фильтрации' })
  @ApiQuery({ name: 'modelId', required: false, description: 'ID модели для фильтрации' })
  @ApiQuery({ name: 'vehicleTypeId', required: false, description: 'ID типа автомобиля' })
  @ApiQuery({ name: 'engineType', required: false, description: 'Тип двигателя' })
  @ApiQuery({ name: 'yearFrom', required: false, description: 'Год выпуска от' })
  @ApiQuery({ name: 'yearTo', required: false, description: 'Год выпуска до' })
  @ApiQuery({ name: 'mileageFrom', required: false, description: 'Пробег от (км)' })
  @ApiQuery({ name: 'mileageTo', required: false, description: 'Пробег до (км)' })
  @ApiQuery({ name: 'hasServiceHistory', required: false, description: 'Есть ли история обслуживания' })
  @ApiQuery({ name: 'page', required: false, description: 'Номер страницы' })
  @ApiQuery({ name: 'limit', required: false, description: 'Размер страницы' })
  @ApiResponse({ status: HttpStatus.OK, type: PaginatedVehiclesResponseDto })
  @ApiUnauthorizedResponse({ description: 'Требуется авторизация' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async findAll(
    @Req() req: RequestWithUser,
    @Query('search') search?: string,
    @Query('customerId') customerId?: string,
    @Query('modelId') modelId?: string,
    @Query('vehicleTypeId') vehicleTypeId?: string,
    @Query('engineType') engineType?: string,
    @Query('yearFrom', new DefaultValuePipe(null)) yearFrom?: number,
    @Query('yearTo', new DefaultValuePipe(null)) yearTo?: number,
    @Query('mileageFrom', new DefaultValuePipe(null)) mileageFrom?: number,
    @Query('mileageTo', new DefaultValuePipe(null)) mileageTo?: number,
    @Query('hasServiceHistory', new DefaultValuePipe(null)) hasServiceHistory?: boolean,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(VEHICLES_CONSTANTS.DEFAULTS.PAGE_SIZE), ParseIntPipe) limit: number = VEHICLES_CONSTANTS.DEFAULTS.PAGE_SIZE,
    @Query('sortField', new DefaultValuePipe('createdAt')) sortField: string = 'createdAt',
    @Query('sortOrder', new DefaultValuePipe('desc')) sortOrder: 'asc' | 'desc' = 'desc',
  ): Promise<PaginatedVehiclesResponseDto> {
    const filter: VehicleFilter = {
      search,
      customerId,
      modelId,
      vehicleTypeId,
      engineType: engineType as any,
      yearFrom,
      yearTo,
      mileageFrom,
      mileageTo,
      hasServiceHistory,
      page,
      limit: Math.min(limit, VEHICLES_CONSTANTS.DEFAULTS.MAX_ITEMS),
      sortField: sortField as any,
      sortOrder,
    };

    return this.vehiclesService.findAllForUser(req.user, filter);
  }

  @Get('customer/:customerId')
  @AuthWithOwnership()
  @ApiOperation({ 
    summary: 'Получение автомобилей клиента',
    description: 'Получение всех автомобилей конкретного клиента с проверкой принадлежности к компании.'
  })
  @ApiParam({ name: 'customerId', description: 'ID клиента' })
  @ApiResponse({ status: HttpStatus.OK, type: [VehicleResponseDto] })
  @ApiNotFoundResponse({ description: 'Клиент не найден' })
  @ApiUnauthorizedResponse({ description: 'Требуется авторизация' })
  @ApiForbiddenResponse({ description: 'Нет доступа к клиенту' })
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  async findByCustomer(
    @Param('customerId') customerId: string,
    @Req() req: RequestWithUser,
  ): Promise<VehicleResponseDto[]> {
    return this.vehiclesService.getVehiclesByCustomer(customerId, req.user);
  }

  @Get('stats/dashboard')
  @AuthWithOwnership()
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ 
    summary: 'Статистика по автопарку',
    description: 'Получение статистики по автомобилям для дашборда.'
  })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async getStats(@Req() req: RequestWithUser): Promise<any> {
    return this.vehiclesService.getStats(req.user.companyId!);
  }

  @Get(':id')
  @AuthWithOwnership()
  @VehicleResource()
  @ApiOperation({ 
    summary: 'Получение автомобиля по ID',
    description: 'Получение детальной информации об автомобиле с проверкой принадлежности к компании.'
  })
  @ApiParam({ name: 'id', description: 'ID автомобиля' })
  @ApiResponse({ status: HttpStatus.OK, type: VehicleResponseDto })
  @ApiNotFoundResponse({ description: 'Автомобиль не найден' })
  @ApiUnauthorizedResponse({ description: 'Требуется авторизация' })
  @ApiForbiddenResponse({ description: 'Нет доступа к автомобилю' })
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  async findOne(@Param('id') id: string): Promise<VehicleResponseDto> {
    return this.vehiclesService.findOne(id);
  }

  @Patch(':id')
  @AuthWithOwnership()
  @VehicleResource()
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ 
    summary: 'Обновление данных автомобиля',
    description: 'Обновление информации об автомобиле с проверкой принадлежности к компании.'
  })
  @ApiParam({ name: 'id', description: 'ID автомобиля' })
  @ApiBody({ type: UpdateVehicleDto })
  @ApiResponse({ status: HttpStatus.OK, type: VehicleResponseDto })
  @ApiNotFoundResponse({ description: 'Автомобиль не найден' })
  @ApiConflictResponse({ description: 'VIN или номер уже используется другим автомобилем' })
  @ApiBadRequestResponse({ description: 'Некорректные данные' })
  @ApiUnauthorizedResponse({ description: 'Требуется авторизация' })
  @ApiForbiddenResponse({ description: 'Недостаточно прав или нет доступа к автомобилю' })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async update(
    @Param('id') id: string,
    @Body() updateVehicleDto: UpdateVehicleDto,
  ): Promise<VehicleResponseDto> {
    return this.vehiclesService.update(id, updateVehicleDto);
  }

  @Patch(':id/mileage')
  @AuthWithOwnership()
  @VehicleResource()
  @Roles('owner', 'admin', 'manager', 'mechanic')
  @ApiOperation({ 
    summary: 'Обновление пробега автомобиля',
    description: 'Обновление текущего пробега с автоматическим расчетом дат ТО.'
  })
  @ApiParam({ name: 'id', description: 'ID автомобиля' })
  @ApiQuery({ name: 'mileage', type: Number, description: 'Новый пробег в км' })
  @ApiResponse({ status: HttpStatus.OK, type: VehicleResponseDto })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async updateMileage(
    @Param('id') id: string,
    @Query('mileage', ParseIntPipe) mileage: number,
  ): Promise<VehicleResponseDto> {
    return this.vehiclesService.updateMileage(id, mileage);
  }

  @Patch(':id/status')
  @AuthWithOwnership()
  @VehicleResource()
  @Roles('owner', 'admin')
  @ApiOperation({ 
    summary: 'Изменение статуса активности автомобиля',
    description: 'Активация или деактивация автомобиля.'
  })
  @ApiParam({ name: 'id', description: 'ID автомобиля' })
  @ApiQuery({ name: 'isActive', type: Boolean, description: 'Новый статус' })
  @ApiResponse({ status: HttpStatus.OK, type: VehicleResponseDto })
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  async setActive(
    @Param('id') id: string,
    @Query('isActive', ParseBoolPipe) isActive: boolean,
  ): Promise<VehicleResponseDto> {
    return this.vehiclesService.setActive(id, isActive);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @AuthWithOwnership()
  @VehicleResource()
  @Roles('owner', 'admin')
  @ApiOperation({ 
    summary: 'Деактивация автомобиля',
    description: 'Мягкое удаление автомобиля (деактивация). Доступно владельцам и админам.'
  })
  @ApiParam({ name: 'id', description: 'ID автомобиля' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiNotFoundResponse({ description: 'Автомобиль не найден' })
  @ApiUnauthorizedResponse({ description: 'Требуется авторизация' })
  @ApiForbiddenResponse({ description: 'Недостаточно прав доступа' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async remove(@Param('id') id: string): Promise<void> {
    return this.vehiclesService.remove(id);
  }

  @Delete(':id/hard')
  @HttpCode(HttpStatus.NO_CONTENT)
  @AuthWithOwnership()
  @VehicleResource()
  @Roles('superadmin')
  @ApiOperation({ 
    summary: 'Полное удаление автомобиля (только суперадмин)',
    description: 'ОПАСНАЯ ОПЕРАЦИЯ! Полное удаление автомобиля из базы данных.'
  })
  @ApiParam({ name: 'id', description: 'ID автомобиля' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiNotFoundResponse({ description: 'Автомобиль не найден' })
  @ApiUnauthorizedResponse({ description: 'Требуется авторизация' })
  @ApiForbiddenResponse({ description: 'Доступно только суперадминистратору' })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async hardRemove(@Param('id') id: string): Promise<void> {
    return this.vehiclesService.hardRemove(id);
  }
}
