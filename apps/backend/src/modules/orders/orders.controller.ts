// src/modules/orders/orders.controller.ts
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
  ParseUUIDPipe,
  DefaultValuePipe,
  ParseIntPipe,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/request/create-order.dto';
import { UpdateOrderDto } from './dto/request/update-order.dto';
import { OrderResponseDto } from './dto/response/order-response.dto';
import { PaginatedOrdersResponseDto } from './dto/response/paginated-orders-response.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { AuthWithOwnership, OrderResource } from '../../common';
import { OrderFilter, OrderStatus } from './types/orders.types';
import { ORDERS_CONSTANTS } from './constants/orders.constants';

@ApiTags('📋 Управление заказами')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /**
   * 🔒 Создание заказа - только для своей компании
   */
  @Post()
  @AuthWithOwnership()
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ 
    summary: 'Создание нового заказа',
    description: 'Создание заказа для компании пользователя. Владельцы, админы и менеджеры могут создавать заказы.'
  })
  @ApiBody({ type: CreateOrderDto })
  @ApiResponse({ status: HttpStatus.CREATED, type: OrderResponseDto })
  @ApiBadRequestResponse({ description: '❌ Некорректные данные валидации' })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Недостаточно прав доступа' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async create(
    @Body() createOrderDto: CreateOrderDto,
    @Req() req: RequestWithUser,
  ): Promise<OrderResponseDto> {
    return this.ordersService.createForUser(createOrderDto, req.user);
  }

  /**
   * 🔒 Список заказов - только своих
   */
  @Get()
  @AuthWithOwnership()
  @ApiOperation({ 
    summary: 'Получение списка заказов',
    description: 'Получение списка заказов с фильтрацией. Суперадмин видит все, остальные - только заказы своей компании.'
  })
  @ApiQuery({ name: 'customerId', required: false, description: 'ID клиента' })
  @ApiQuery({ name: 'vehicleId', required: false, description: 'ID автомобиля' })
  @ApiQuery({ name: 'status', required: false, enum: OrderStatus, description: 'Статус заказа' })
  @ApiQuery({ name: 'assignedTo', required: false, description: 'ID исполнителя' })
  @ApiQuery({ name: 'search', required: false, description: 'Поиск по номеру заказа или описанию' })
  @ApiQuery({ name: 'page', required: false, description: 'Номер страницы' })
  @ApiQuery({ name: 'limit', required: false, description: 'Размер страницы' })
  @ApiResponse({ status: HttpStatus.OK, type: PaginatedOrdersResponseDto })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async findAll(
    @Req() req: RequestWithUser, // 🔥 ИСПРАВЛЕНО: req перенесен в начало как обязательный
    @Query('customerId') customerId?: string,
    @Query('vehicleId') vehicleId?: string,
    @Query('status') status?: OrderStatus,
    @Query('assignedTo') assignedTo?: string,
    @Query('search') search?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(ORDERS_CONSTANTS.DEFAULTS.PAGE_SIZE), ParseIntPipe) limit: number = ORDERS_CONSTANTS.DEFAULTS.PAGE_SIZE,
  ): Promise<PaginatedOrdersResponseDto> {
    const filter: OrderFilter = {
      customerId,
      vehicleId,
      status,
      assignedTo,
      search,
      page,
      limit: Math.min(limit, ORDERS_CONSTANTS.DEFAULTS.MAX_ITEMS),
      // 🔒 КРИТИЧНО: Фильтрация по принадлежности
      companyId: req.user.role === 'superadmin' ? undefined : req.user.companyId,
    };

    return this.ordersService.findAll(filter);
  }

  /**
   * 🔒 Получение заказа по ID с проверкой принадлежности
   */
  @Get(':id')
  @AuthWithOwnership()
  @OrderResource()
  @ApiOperation({ 
    summary: 'Получение заказа по ID',
    description: 'Получение детальной информации о заказе с услугами и запчастями.'
  })
  @ApiParam({ name: 'id', description: 'ID заказа' })
  @ApiResponse({ status: HttpStatus.OK, type: OrderResponseDto })
  @ApiNotFoundResponse({ description: '❌ Заказ не найден или нет доступа' })
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<OrderResponseDto> {
    return this.ordersService.findOne(id);
  }

  /**
   * 🔒 Обновление заказа с проверкой принадлежности
   */
  @Patch(':id')
  @AuthWithOwnership()
  @OrderResource()
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ 
    summary: 'Обновление заказа',
    description: 'Обновление информации о заказе. Доступно владельцам, админам и менеджерам.'
  })
  @ApiParam({ name: 'id', description: 'ID заказа' })
  @ApiBody({ type: UpdateOrderDto })
  @ApiResponse({ status: HttpStatus.OK, type: OrderResponseDto })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateOrderDto: UpdateOrderDto,
  ): Promise<OrderResponseDto> {
    return this.ordersService.update(id, updateOrderDto);
  }

  /**
   * 🔒 Изменение статуса заказа
   */
  @Patch(':id/status')
  @AuthWithOwnership()
  @OrderResource()
  @Roles('owner', 'admin', 'manager', 'mechanic')
  @ApiOperation({ 
    summary: 'Изменение статуса заказа',
    description: 'Изменение статуса заказа в рамках workflow.'
  })
  @ApiParam({ name: 'id', description: 'ID заказа' })
  @ApiQuery({ name: 'status', enum: OrderStatus, description: 'Новый статус заказа' })
  @ApiResponse({ status: HttpStatus.OK, type: OrderResponseDto })
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('status') status: OrderStatus,
  ): Promise<OrderResponseDto> {
    return this.ordersService.updateStatus(id, status);
  }

  /**
   * 🔒 Назначение исполнителя заказа
   */
  @Patch(':id/assign')
  @AuthWithOwnership()
  @OrderResource()
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ 
    summary: 'Назначение исполнителя заказа',
    description: 'Назначение механика на выполнение заказа.'
  })
  @ApiParam({ name: 'id', description: 'ID заказа' })
  @ApiQuery({ name: 'mechanicId', description: 'ID механика' })
  @ApiResponse({ status: HttpStatus.OK, type: OrderResponseDto })
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  async assignMechanic(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('mechanicId', ParseUUIDPipe) mechanicId: string,
  ): Promise<OrderResponseDto> {
    return this.ordersService.assignMechanic(id, mechanicId);
  }

  /**
   * 🔒 Отмена заказа (мягкое удаление)
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @AuthWithOwnership()
  @OrderResource()
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ 
    summary: 'Отмена заказа',
    description: 'Отмена заказа (изменение статуса на CANCELED).'
  })
  @ApiParam({ name: 'id', description: 'ID заказа' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async cancelOrder(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.ordersService.cancelOrder(id);
  }

  /**
   * 🔒 Пересчет финансов заказа
   */
  @Patch(':id/recalculate')
  @AuthWithOwnership()
  @OrderResource()
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ 
    summary: 'Пересчет финансов заказа',
    description: 'Автоматический пересчет totalAmount, discountAmount, taxAmount, finalAmount на основе услуг и запчастей.'
  })
  @ApiParam({ name: 'id', description: 'ID заказа' })
  @ApiResponse({ status: HttpStatus.OK, type: OrderResponseDto })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async recalculateOrderTotals(@Param('id', ParseUUIDPipe) id: string): Promise<OrderResponseDto> {
    return this.ordersService.recalculateOrderTotals(id);
  }
}
