// path: src/modules/orders/orders.controller.ts
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
  ParseEnumPipe,
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

  @Post()
  @AuthWithOwnership()
  @Roles('company_owner', 'company_admin', 'manager')
  @ApiOperation({ summary: 'Создание нового заказа', description: 'Создание заказа в своей компании' })
  @ApiBody({ type: CreateOrderDto })
  @ApiResponse({ status: HttpStatus.CREATED, type: OrderResponseDto })
  @ApiBadRequestResponse({ description: '❌ Некорректные данные валидации' })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Недостаточно прав доступа' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async create(@Body() dto: CreateOrderDto, @Req() req: RequestWithUser): Promise<OrderResponseDto> {
    return this.ordersService.createForUser(dto, req.user);
  }

  @Get()
  @AuthWithOwnership()
  @Roles(...ORDERS_CONSTANTS.ROLES.CAN_VIEW_ALL)
  @ApiOperation({ summary: 'Получение списка заказов', description: 'С фильтрацией и пагинацией' })
  @ApiResponse({ status: HttpStatus.OK, type: PaginatedOrdersResponseDto })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async findAll(
    @Req() req: RequestWithUser,
    @Query('customerId') customerId?: string,
    @Query('vehicleId') vehicleId?: string,
    @Query('status', new ParseEnumPipe(OrderStatus)) status?: OrderStatus,
    @Query('assignedTo') assignedTo?: string,
    @Query('search') search?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page = 1,
    @Query('limit', new DefaultValuePipe(ORDERS_CONSTANTS.DEFAULTS.PAGE_SIZE), ParseIntPipe)
    limit = ORDERS_CONSTANTS.DEFAULTS.PAGE_SIZE,
  ): Promise<PaginatedOrdersResponseDto> {
    const filter: OrderFilter = {
      customerId,
      vehicleId,
      status,
      assignedTo,
      search,
      page,
      limit: Math.min(limit, ORDERS_CONSTANTS.DEFAULTS.MAX_ITEMS),
      companyId: req.user.role === 'superadmin' ? undefined : req.user.companyId,
    };
    return this.ordersService.findAll(filter);
  }

  @Get(':id')
  @AuthWithOwnership()
  @OrderResource()
  @ApiOperation({ summary: 'Получение заказа по ID', description: 'Детальная информация с связями' })
  @ApiParam({ name: 'id', description: 'ID заказа' })
  @ApiResponse({ status: HttpStatus.OK, type: OrderResponseDto })
  @ApiNotFoundResponse({ description: '❌ Заказ не найден или нет доступа' })
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<OrderResponseDto> {
    return this.ordersService.findOne(id);
  }

  @Patch(':id')
  @AuthWithOwnership()
  @OrderResource()
  @Roles('company_owner', 'company_admin', 'manager')
  @ApiOperation({ summary: 'Обновление заказа' })
  @ApiParam({ name: 'id', description: 'ID заказа' })
  @ApiBody({ type: UpdateOrderDto })
  @ApiResponse({ status: HttpStatus.OK, type: OrderResponseDto })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateOrderDto, @Req() req: RequestWithUser): Promise<OrderResponseDto> {
    return this.ordersService.update(id, dto, req.user);
  }

  @Patch(':id/status')
  @AuthWithOwnership()
  @OrderResource()
  @Roles('company_owner', 'company_admin', 'manager', 'mechanic', 'lead_mechanic', 'service_advisor')
  @ApiOperation({ summary: 'Изменение статуса заказа' })
  @ApiParam({ name: 'id', description: 'ID заказа' })
  @ApiQuery({ name: 'status', enum: OrderStatus, description: 'Новый статус заказа' })
  @ApiResponse({ status: HttpStatus.OK, type: OrderResponseDto })
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('status', new ParseEnumPipe(OrderStatus)) status: OrderStatus,
    @Req() req: RequestWithUser,
  ): Promise<OrderResponseDto> {
    return this.ordersService.updateStatus(id, status, req.user);
  }

  @Patch(':id/assign')
  @AuthWithOwnership()
  @OrderResource()
  @Roles('company_owner', 'company_admin', 'manager', 'lead_mechanic')
  @ApiOperation({ summary: 'Назначение исполнителя заказа' })
  @ApiParam({ name: 'id', description: 'ID заказа' })
  @ApiQuery({ name: 'mechanicId', description: 'ID механика' })
  @ApiResponse({ status: HttpStatus.OK, type: OrderResponseDto })
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  async assignMechanic(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('mechanicId', ParseUUIDPipe) mechanicId: string,
    @Req() req: RequestWithUser,
  ): Promise<OrderResponseDto> {
    return this.ordersService.assignMechanic(id, mechanicId, req.user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @AuthWithOwnership()
  @OrderResource()
  @Roles('company_owner', 'company_admin', 'manager')
  @ApiOperation({ summary: 'Отмена заказа (soft)' })
  @ApiParam({ name: 'id', description: 'ID заказа' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async cancelOrder(@Param('id', ParseUUIDPipe) id: string, @Req() req: RequestWithUser): Promise<void> {
    return this.ordersService.cancelOrder(id, req.user);
  }

  @Patch(':id/recalculate')
  @AuthWithOwnership()
  @OrderResource()
  @Roles('company_owner', 'company_admin', 'manager')
  @ApiOperation({ summary: 'Пересчет финансов заказа' })
  @ApiParam({ name: 'id', description: 'ID заказа' })
  @ApiResponse({ status: HttpStatus.OK, type: OrderResponseDto })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async recalculateOrderTotals(@Param('id', ParseUUIDPipe) id: string, @Req() req: RequestWithUser): Promise<OrderResponseDto> {
    return this.ordersService.recalculateOrderTotals(id, req.user);
  }
}
