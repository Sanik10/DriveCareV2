// src/modules/orders/order-parts/order-parts.controller.ts
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
import { OrderPartsService } from './order-parts.service';
import { AddPartToOrderDto } from './dto/request/add-part-to-order.dto';
import { UpdateOrderPartDto } from './dto/request/update-order-part.dto';
import { OrderPartResponseDto } from './dto/response/order-part-response.dto';
import { OrderPartsListResponseDto } from './dto/response/order-parts-list-response.dto';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RequestWithUser } from '../../auth/interfaces/request-with-user.interface';
import { AuthWithOwnership, OrderResource } from '../../../common';

@ApiTags('🔧 Управление запчастями в заказах')
@Controller('orders/:orderId/parts')
export class OrderPartsController {
  constructor(private readonly orderPartsService: OrderPartsService) {}

  /**
   * 🔒 Добавление запчасти в заказ
   */
  @Post()
  @AuthWithOwnership()
  @OrderResource('orderId') // 🔒 Проверяем что заказ принадлежит компании
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ 
    summary: 'Добавление запчасти в заказ',
    description: 'Добавление новой запчасти в существующий заказ с проверкой остатков и автоматическим расчетом стоимости.'
  })
  @ApiParam({ name: 'orderId', description: 'ID заказа' })
  @ApiBody({ type: AddPartToOrderDto })
  @ApiResponse({ status: HttpStatus.CREATED, type: OrderPartResponseDto })
  @ApiBadRequestResponse({ description: '❌ Некорректные данные или недостаточно запчастей на складе' })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Недостаточно прав или нет доступа к заказу' })
  @ApiNotFoundResponse({ description: '❌ Заказ или запчасть не найдены' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async addPartToOrder(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() addPartDto: AddPartToOrderDto,
    @Req() req: RequestWithUser,
  ): Promise<OrderPartResponseDto> {
    return this.orderPartsService.addPartToOrder(orderId, addPartDto, req.user);
  }

  /**
   * 🔒 Получение списка запчастей заказа
   */
  @Get()
  @AuthWithOwnership()
  @OrderResource('orderId')
  @ApiOperation({ 
    summary: 'Получение списка запчастей заказа',
    description: 'Получение всех запчастей, добавленных в заказ, с информацией о наличии и стоимости.'
  })
  @ApiParam({ name: 'orderId', description: 'ID заказа' })
  @ApiResponse({ status: HttpStatus.OK, type: OrderPartsListResponseDto })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Нет доступа к заказу' })
  @ApiNotFoundResponse({ description: '❌ Заказ не найден' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async getOrderParts(
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ): Promise<OrderPartsListResponseDto> {
    return this.orderPartsService.getOrderParts(orderId);
  }

  /**
   * 🔒 Обновление запчасти в заказе
   */
  @Patch(':partId')
  @AuthWithOwnership()
  @OrderResource('orderId')
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ 
    summary: 'Обновление запчасти в заказе',
    description: 'Изменение параметров запчасти: количество, цена, скидка. Автоматический пересчет стоимости.'
  })
  @ApiParam({ name: 'orderId', description: 'ID заказа' })
  @ApiParam({ name: 'partId', description: 'ID запчасти в заказе' })
  @ApiBody({ type: UpdateOrderPartDto })
  @ApiResponse({ status: HttpStatus.OK, type: OrderPartResponseDto })
  @ApiBadRequestResponse({ description: '❌ Некорректные данные или недостаточно запчастей на складе' })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Недостаточно прав или нет доступа' })
  @ApiNotFoundResponse({ description: '❌ Запчасть в заказе не найдена' })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async updateOrderPart(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Param('partId', ParseUUIDPipe) partId: string,
    @Body() updateDto: UpdateOrderPartDto,
  ): Promise<OrderPartResponseDto> {
    return this.orderPartsService.updateOrderPart(orderId, partId, updateDto);
  }

  /**
   * 🔒 Удаление запчасти из заказа
   */
  @Delete(':partId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @AuthWithOwnership()
  @OrderResource('orderId')
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ 
    summary: 'Удаление запчасти из заказа',
    description: 'Удаление запчасти из заказа с освобождением резерва и автоматическим пересчетом общей стоимости.'
  })
  @ApiParam({ name: 'orderId', description: 'ID заказа' })
  @ApiParam({ name: 'partId', description: 'ID запчасти в заказе' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Недостаточно прав или нет доступа' })
  @ApiNotFoundResponse({ description: '❌ Запчасть в заказе не найдена' })
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  async removePartFromOrder(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Param('partId', ParseUUIDPipe) partId: string,
  ): Promise<void> {
    return this.orderPartsService.removePartFromOrder(orderId, partId);
  }

  /**
   * 🔒 Переключение типа запчасти (клиентская/наша)
   */
  @Patch(':partId/customer-provided')
  @AuthWithOwnership()
  @OrderResource('orderId')
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ 
    summary: 'Переключение типа запчасти',
    description: 'Переключение между запчастью клиента и запчастью из склада. Влияет на расчет стоимости и резервирование.'
  })
  @ApiParam({ name: 'orderId', description: 'ID заказа' })
  @ApiParam({ name: 'partId', description: 'ID запчасти в заказе' })
  @ApiResponse({ status: HttpStatus.OK, type: OrderPartResponseDto })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async toggleCustomerProvided(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Param('partId', ParseUUIDPipe) partId: string,
    @Body('isCustomerProvided') isCustomerProvided: boolean,
  ): Promise<OrderPartResponseDto> {
    return this.orderPartsService.toggleCustomerProvided(orderId, partId, isCustomerProvided);
  }

  /**
   * 🔒 Проверка наличия запчасти на складе
   */
  @Get(':partId/availability')
  @AuthWithOwnership()
  @OrderResource('orderId')
  @ApiOperation({ 
    summary: 'Проверка наличия запчасти',
    description: 'Проверка текущего наличия запчасти на складе и возможности добавления в заказ.'
  })
  @ApiParam({ name: 'orderId', description: 'ID заказа' })
  @ApiParam({ name: 'partId', description: 'ID запчасти в системе (не в заказе)' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    schema: {
      properties: {
        partId: { type: 'string' },
        available: { type: 'number' },
        reserved: { type: 'number' },
        canAddToOrder: { type: 'boolean' },
        maxQuantity: { type: 'number' },
      }
    }
  })
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  async checkPartAvailability(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Param('partId', ParseUUIDPipe) partId: string,
  ): Promise<{
    partId: string;
    available: number;
    reserved: number;
    canAddToOrder: boolean;
    maxQuantity: number;
  }> {
    return this.orderPartsService.checkPartAvailability(orderId, partId);
  }
}
