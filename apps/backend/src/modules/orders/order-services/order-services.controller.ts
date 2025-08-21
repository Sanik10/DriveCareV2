// path: src/modules/orders/order-services/order-services.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Req,
  ParseEnumPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { OrderServicesService } from './order-services.service';
import { AddServiceToOrderDto } from './dto/request/add-service-to-order.dto';
import { UpdateOrderServiceDto } from './dto/request/update-order-service.dto';
import { OrderServiceResponseDto } from './dto/response/order-service-response.dto';
import { OrderServicesListResponseDto } from './dto/response/order-services-list-response.dto';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RequestWithUser } from '../../auth/interfaces/request-with-user.interface';
import { AuthWithOwnership, OrderResource } from '../../../common';
import { OrderServiceStatus } from '../../../database/entities/order-service.entity';

@ApiTags('🔧 Управление услугами в заказах')
@Controller('orders/:orderId/services')
export class OrderServicesController {
  constructor(private readonly orderServicesService: OrderServicesService) {}

  @Post()
  @AuthWithOwnership()
  @OrderResource('orderId')
  @Roles('company_owner', 'company_admin', 'manager')
  @ApiOperation({
    summary: 'Добавление услуги в заказ',
    description: 'Добавление новой услуги в заказ с автоматическим расчетом стоимости.',
  })
  @ApiParam({ name: 'orderId', description: 'ID заказа' })
  @ApiBody({ type: AddServiceToOrderDto })
  @ApiResponse({ status: HttpStatus.CREATED, type: OrderServiceResponseDto })
  @ApiBadRequestResponse({ description: '❌ Некорректные данные или услуга уже добавлена' })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Недостаточно прав или нет доступа к заказу' })
  @ApiNotFoundResponse({ description: '❌ Заказ или услуга не найдены' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async addServiceToOrder(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() addServiceDto: AddServiceToOrderDto,
    @Req() req: RequestWithUser,
  ): Promise<OrderServiceResponseDto> {
    return this.orderServicesService.addServiceToOrder(orderId, addServiceDto, req.user);
  }

  @Get()
  @AuthWithOwnership()
  @OrderResource('orderId')
  @ApiOperation({
    summary: 'Получение списка услуг заказа',
    description: 'Получение всех услуг заказа с информацией о выполнении и стоимости.',
  })
  @ApiParam({ name: 'orderId', description: 'ID заказа' })
  @ApiResponse({ status: HttpStatus.OK, type: OrderServicesListResponseDto })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Нет доступа к заказу' })
  @ApiNotFoundResponse({ description: '❌ Заказ не найден' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async getOrderServices(@Param('orderId', ParseUUIDPipe) orderId: string): Promise<OrderServicesListResponseDto> {
    return this.orderServicesService.getOrderServices(orderId);
  }

  @Patch(':serviceId')
  @AuthWithOwnership()
  @OrderResource('orderId')
  @Roles('company_owner', 'company_admin', 'manager')
  @ApiOperation({ summary: 'Обновление услуги в заказе' })
  @ApiParam({ name: 'orderId', description: 'ID заказа' })
  @ApiParam({ name: 'serviceId', description: 'ID услуги в заказе' })
  @ApiBody({ type: UpdateOrderServiceDto })
  @ApiResponse({ status: HttpStatus.OK, type: OrderServiceResponseDto })
  @ApiBadRequestResponse({ description: '❌ Некорректные данные' })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Недостаточно прав или нет доступа' })
  @ApiNotFoundResponse({ description: '❌ Услуга не найдена' })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async updateOrderService(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Body() updateDto: UpdateOrderServiceDto,
    @Req() req: RequestWithUser,
  ): Promise<OrderServiceResponseDto> {
    return this.orderServicesService.updateOrderService(orderId, serviceId, updateDto, req.user);
  }

  @Delete(':serviceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @AuthWithOwnership()
  @OrderResource('orderId')
  @Roles('company_owner', 'company_admin', 'manager')
  @ApiOperation({ summary: 'Удаление услуги из заказа' })
  @ApiParam({ name: 'orderId', description: 'ID заказа' })
  @ApiParam({ name: 'serviceId', description: 'ID услуги в заказе' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Недостаточно прав или нет доступа' })
  @ApiNotFoundResponse({ description: '❌ Услуга не найдена' })
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  async removeServiceFromOrder(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Req() req: RequestWithUser,
  ): Promise<void> {
    return this.orderServicesService.removeServiceFromOrder(orderId, serviceId, req.user);
  }

  @Patch(':serviceId/status')
  @AuthWithOwnership()
  @OrderResource('orderId')
  @Roles('company_owner', 'company_admin', 'manager', 'mechanic', 'lead_mechanic')
  @ApiOperation({ summary: 'Изменение статуса выполнения услуги' })
  @ApiParam({ name: 'orderId', description: 'ID заказа' })
  @ApiParam({ name: 'serviceId', description: 'ID услуги в заказе' })
  @ApiBody({ schema: { properties: { status: { enum: Object.values(OrderServiceStatus) } } } })
  @ApiResponse({ status: HttpStatus.OK, type: OrderServiceResponseDto })
  @Throttle({ default: { limit: 25, ttl: 60000 } })
  async updateServiceStatus(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Body('status', new ParseEnumPipe(OrderServiceStatus)) status: OrderServiceStatus,
    @Req() req: RequestWithUser,
  ): Promise<OrderServiceResponseDto> {
    return this.orderServicesService.updateServiceStatus(orderId, serviceId, status, req.user);
  }

  @Patch(':serviceId/mechanic')
  @AuthWithOwnership()
  @OrderResource('orderId')
  @Roles('company_owner', 'company_admin', 'manager', 'lead_mechanic')
  @ApiOperation({ summary: 'Назначение механика на услугу' })
  @ApiParam({ name: 'orderId', description: 'ID заказа' })
  @ApiParam({ name: 'serviceId', description: 'ID услуги в заказе' })
  @ApiResponse({ status: HttpStatus.OK, type: OrderServiceResponseDto })
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  async assignMechanicToService(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Body('mechanicId', ParseUUIDPipe) mechanicId: string,
    @Req() req: RequestWithUser,
  ): Promise<OrderServiceResponseDto> {
    return this.orderServicesService.assignMechanicToService(orderId, serviceId, mechanicId, req.user);
  }

  @Patch(':serviceId/start')
  @AuthWithOwnership()
  @OrderResource('orderId')
  @Roles('company_owner', 'company_admin', 'manager', 'mechanic', 'lead_mechanic')
  @ApiOperation({ summary: 'Начать выполнение услуги' })
  @ApiParam({ name: 'orderId', description: 'ID заказа' })
  @ApiParam({ name: 'serviceId', description: 'ID услуги в заказе' })
  @ApiResponse({ status: HttpStatus.OK, type: OrderServiceResponseDto })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async startService(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Req() req: RequestWithUser,
  ): Promise<OrderServiceResponseDto> {
    return this.orderServicesService.startService(orderId, serviceId, req.user);
  }

  @Patch(':serviceId/complete')
  @AuthWithOwnership()
  @OrderResource('orderId')
  @Roles('company_owner', 'company_admin', 'manager', 'mechanic', 'lead_mechanic')
  @ApiOperation({ summary: 'Завершить выполнение услуги' })
  @ApiParam({ name: 'orderId', description: 'ID заказа' })
  @ApiParam({ name: 'serviceId', description: 'ID услуги в заказе' })
  @ApiResponse({ status: HttpStatus.OK, type: OrderServiceResponseDto })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async completeService(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Body('notes') notes: string | undefined,
    @Req() req: RequestWithUser,
  ): Promise<OrderServiceResponseDto> {
    return this.orderServicesService.completeService(orderId, serviceId, notes, req.user);
  }
}
