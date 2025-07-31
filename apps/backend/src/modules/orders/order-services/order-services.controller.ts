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

  /**
   * 🔒 Добавление услуги в заказ
   */
  @Post()
  @AuthWithOwnership()
  @OrderResource('orderId') // 🔒 Проверяем что заказ принадлежит компании
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ 
    summary: 'Добавление услуги в заказ',
    description: 'Добавление новой услуги в существующий заказ с автоматическим расчетом стоимости.'
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

  /**
   * 🔒 Получение списка услуг заказа
   */
  @Get()
  @AuthWithOwnership()
  @OrderResource('orderId')
  @ApiOperation({ 
    summary: 'Получение списка услуг заказа',
    description: 'Получение всех услуг, добавленных в заказ, с информацией о выполнении и стоимости.'
  })
  @ApiParam({ name: 'orderId', description: 'ID заказа' })
  @ApiResponse({ status: HttpStatus.OK, type: OrderServicesListResponseDto })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Нет доступа к заказу' })
  @ApiNotFoundResponse({ description: '❌ Заказ не найден' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async getOrderServices(
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ): Promise<OrderServicesListResponseDto> {
    return this.orderServicesService.getOrderServices(orderId);
  }

  /**
   * 🔒 Обновление услуги в заказе
   */
  @Patch(':serviceId')
  @AuthWithOwnership()
  @OrderResource('orderId')
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ 
    summary: 'Обновление услуги в заказе',
    description: 'Изменение параметров услуги: количество, цена, скидка. Автоматический пересчет стоимости.'
  })
  @ApiParam({ name: 'orderId', description: 'ID заказа' })
  @ApiParam({ name: 'serviceId', description: 'ID услуги в заказе' })
  @ApiBody({ type: UpdateOrderServiceDto })
  @ApiResponse({ status: HttpStatus.OK, type: OrderServiceResponseDto })
  @ApiBadRequestResponse({ description: '❌ Некорректные данные' })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Недостаточно прав или нет доступа' })
  @ApiNotFoundResponse({ description: '❌ Услуга в заказе не найдена' })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async updateOrderService(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Body() updateDto: UpdateOrderServiceDto,
  ): Promise<OrderServiceResponseDto> {
    return this.orderServicesService.updateOrderService(orderId, serviceId, updateDto);
  }

  /**
   * 🔒 Удаление услуги из заказа
   */
  @Delete(':serviceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @AuthWithOwnership()
  @OrderResource('orderId')
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ 
    summary: 'Удаление услуги из заказа',
    description: 'Удаление услуги из заказа с автоматическим пересчетом общей стоимости.'
  })
  @ApiParam({ name: 'orderId', description: 'ID заказа' })
  @ApiParam({ name: 'serviceId', description: 'ID услуги в заказе' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Недостаточно прав или нет доступа' })
  @ApiNotFoundResponse({ description: '❌ Услуга в заказе не найдена' })
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  async removeServiceFromOrder(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
  ): Promise<void> {
    return this.orderServicesService.removeServiceFromOrder(orderId, serviceId);
  }

  /**
   * 🔒 Изменение статуса выполнения услуги
   */
  @Patch(':serviceId/status')
  @AuthWithOwnership()
  @OrderResource('orderId')
  @Roles('owner', 'admin', 'manager', 'mechanic')
  @ApiOperation({ 
    summary: 'Изменение статуса выполнения услуги',
    description: 'Изменение статуса услуги: planned → in_progress → completed. Доступно механикам.'
  })
  @ApiParam({ name: 'orderId', description: 'ID заказа' })
  @ApiParam({ name: 'serviceId', description: 'ID услуги в заказе' })
  @ApiResponse({ status: HttpStatus.OK, type: OrderServiceResponseDto })
  @Throttle({ default: { limit: 25, ttl: 60000 } })
  async updateServiceStatus(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Body('status') status: OrderServiceStatus,
    @Req() req: RequestWithUser,
  ): Promise<OrderServiceResponseDto> {
    return this.orderServicesService.updateServiceStatus(orderId, serviceId, status, req.user);
  }

  /**
   * 🔒 Назначение механика на услугу
   */
  @Patch(':serviceId/mechanic')
  @AuthWithOwnership()
  @OrderResource('orderId')
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ 
    summary: 'Назначение механика на услугу',
    description: 'Назначение конкретного механика для выполнения услуги в заказе.'
  })
  @ApiParam({ name: 'orderId', description: 'ID заказа' })
  @ApiParam({ name: 'serviceId', description: 'ID услуги в заказе' })
  @ApiResponse({ status: HttpStatus.OK, type: OrderServiceResponseDto })
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  async assignMechanicToService(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Body('mechanicId', ParseUUIDPipe) mechanicId: string,
  ): Promise<OrderServiceResponseDto> {
    return this.orderServicesService.assignMechanicToService(orderId, serviceId, mechanicId);
  }

  /**
   * 🔒 Начать выполнение услуги
   */
  @Patch(':serviceId/start')
  @AuthWithOwnership()
  @OrderResource('orderId')
  @Roles('owner', 'admin', 'manager', 'mechanic')
  @ApiOperation({ 
    summary: 'Начать выполнение услуги',
    description: 'Отметить начало выполнения услуги с фиксацией времени начала.'
  })
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

  /**
   * 🔒 Завершить выполнение услуги
   */
  @Patch(':serviceId/complete')
  @AuthWithOwnership()
  @OrderResource('orderId')
  @Roles('owner', 'admin', 'manager', 'mechanic')
  @ApiOperation({ 
    summary: 'Завершить выполнение услуги',
    description: 'Отметить завершение выполнения услуги с фиксацией времени окончания и возможными заметками.'
  })
  @ApiParam({ name: 'orderId', description: 'ID заказа' })
  @ApiParam({ name: 'serviceId', description: 'ID услуги в заказе' })
  @ApiResponse({ status: HttpStatus.OK, type: OrderServiceResponseDto })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async completeService(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Param('serviceId', ParseUUIDPipe) serviceId: string,
    @Body('notes') notes?: string,
    @Req() req?: RequestWithUser,
  ): Promise<OrderServiceResponseDto> {
    return this.orderServicesService.completeService(orderId, serviceId, notes, req?.user);
  }
}
