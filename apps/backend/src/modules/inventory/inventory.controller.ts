// src/modules/inventory/inventory.controller.ts
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
import { InventoryService } from './inventory.service';
import { UpdateInventoryDto } from './dto/request/update-inventory.dto';
import { InventoryResponseDto } from './dto/response/inventory-response.dto';
import { PaginatedInventoryResponseDto } from './dto/response/paginated-inventory-response.dto';
import { StockSummaryResponseDto } from './dto/response/stock-summary-response.dto';
import { LowStockAlertsResponseDto } from './dto/response/low-stock-alerts-response.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { AuthWithOwnership, CompanyResource } from '../../common';
import { InventoryFilter } from './types/inventory.types';
import { INVENTORY_CONSTANTS } from './constants/inventory.constants';

@ApiTags('📦 Управление складом')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  /**
   * 🔒 Получение остатков на складе
   */
  @Get()
  @AuthWithOwnership()
  @ApiOperation({ 
    summary: 'Получение остатков на складе',
    description: 'Получение списка всех запчастей на складе с фильтрацией и поиском. Суперадмин видит все, остальные - только свой склад.'
  })
  @ApiQuery({ name: 'partId', required: false, description: 'ID запчасти' })
  @ApiQuery({ name: 'categoryId', required: false, description: 'ID категории' })
  @ApiQuery({ name: 'lowStock', required: false, description: 'Только запчасти с низким остатком' })
  @ApiQuery({ name: 'location', required: false, description: 'Местоположение на складе' })
  @ApiQuery({ name: 'search', required: false, description: 'Поиск по названию или номеру запчасти' })
  @ApiQuery({ name: 'page', required: false, description: 'Номер страницы' })
  @ApiQuery({ name: 'limit', required: false, description: 'Размер страницы' })
  @ApiResponse({ status: HttpStatus.OK, type: PaginatedInventoryResponseDto })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  async findAll(
    @Req() req: RequestWithUser,
    @Query('partId') partId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('lowStock') lowStock?: boolean,
    @Query('location') location?: string,
    @Query('search') search?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(INVENTORY_CONSTANTS.DEFAULTS.PAGE_SIZE), ParseIntPipe) limit: number = INVENTORY_CONSTANTS.DEFAULTS.PAGE_SIZE,
  ): Promise<PaginatedInventoryResponseDto> {
    const filter: InventoryFilter = {
      partId,
      categoryId,
      lowStock,
      location,
      search,
      page,
      limit: Math.min(limit, INVENTORY_CONSTANTS.DEFAULTS.MAX_ITEMS),
      // 🔒 КРИТИЧНО: Фильтрация по принадлежности
      companyId: req.user.role === 'superadmin' ? undefined : req.user.companyId,
    };

    return this.inventoryService.findAll(filter);
  }

  /**
   * 🔒 Получение информации о конкретной позиции
   */
  @Get(':id')
  @AuthWithOwnership()
  @CompanyResource()
  @ApiOperation({ 
    summary: 'Получение информации о позиции на складе',
    description: 'Получение детальной информации о запчасти на складе с историей движений.'
  })
  @ApiParam({ name: 'id', description: 'ID позиции в инвентаре' })
  @ApiResponse({ status: HttpStatus.OK, type: InventoryResponseDto })
  @ApiNotFoundResponse({ description: '❌ Позиция не найдена или нет доступа' })
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<InventoryResponseDto> {
    return this.inventoryService.findOne(id);
  }

  /**
   * 🔒 Обновление информации о складе
   */
  @Patch(':id')
  @AuthWithOwnership()
  @CompanyResource()
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ 
    summary: 'Обновление информации о складе',
    description: 'Обновление минимального количества, местоположения и других параметров складской позиции.'
  })
  @ApiParam({ name: 'id', description: 'ID позиции в инвентаре' })
  @ApiBody({ type: UpdateInventoryDto })
  @ApiResponse({ status: HttpStatus.OK, type: InventoryResponseDto })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateInventoryDto: UpdateInventoryDto,
  ): Promise<InventoryResponseDto> {
    return this.inventoryService.update(id, updateInventoryDto);
  }

  /**
   * 📊 Сводка по складу
   */
  @Get('summary/overview')
  @AuthWithOwnership()
  @ApiOperation({ 
    summary: 'Сводная информация по складу',
    description: 'Получение общей статистики по складу: общее количество позиций, стоимость, уведомления.'
  })
  @ApiResponse({ status: HttpStatus.OK, type: StockSummaryResponseDto })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async getStockSummary(@Req() req: RequestWithUser): Promise<StockSummaryResponseDto> {
    return this.inventoryService.getStockSummary(req.user.companyId);
  }

  /**
   * 🚨 Уведомления о низких остатках
   */
  @Get('alerts/low-stock')
  @AuthWithOwnership()
  @ApiOperation({ 
    summary: 'Уведомления о низких остатках',
    description: 'Получение списка запчастей с остатком ниже минимального уровня.'
  })
  @ApiResponse({ status: HttpStatus.OK, type: LowStockAlertsResponseDto })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async getLowStockAlerts(@Req() req: RequestWithUser): Promise<LowStockAlertsResponseDto> {
    return this.inventoryService.getLowStockAlerts(req.user.companyId);
  }

  /**
   * 🔄 Проверка доступности для заказа
   */
  @Get('availability/:partId')
  @AuthWithOwnership()
  @ApiOperation({ 
    summary: 'Проверка доступности запчасти',
    description: 'Проверка текущего наличия запчасти и возможности резервирования для заказа.'
  })
  @ApiParam({ name: 'partId', description: 'ID запчасти' })
  @ApiQuery({ name: 'quantity', required: false, description: 'Требуемое количество' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    schema: {
      properties: {
        partId: { type: 'string' },
        available: { type: 'number' },
        canReserve: { type: 'boolean' },
        maxReservable: { type: 'number' },
        location: { type: 'string' },
      }
    }
  })
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  async checkAvailability(
    @Param('partId', ParseUUIDPipe) partId: string,
    @Query('quantity', new DefaultValuePipe(1), ParseIntPipe) quantity: number = 1,
    @Req() req: RequestWithUser,
  ): Promise<{
    partId: string;
    available: number;
    canReserve: boolean;
    maxReservable: number;
    location: string;
  }> {
    return this.inventoryService.checkAvailability(partId, quantity, req.user.companyId);
  }

  /**
   * 🔒 Резервирование запчастей для заказа
   */
  @Post('reserve')
  @AuthWithOwnership()
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ 
    summary: 'Резервирование запчастей',
    description: 'Резервирование определенного количества запчастей для заказа.'
  })
  @ApiBody({
    schema: {
      properties: {
        partId: { type: 'string' },
        quantity: { type: 'number' },
        orderId: { type: 'string' },
        expiresAt: { type: 'string', format: 'date-time' },
      }
    }
  })
  @ApiResponse({ status: HttpStatus.OK })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async reserveParts(
    @Body() reservationData: {
      partId: string;
      quantity: number;
      orderId?: string;
      expiresAt?: Date;
    },
    @Req() req: RequestWithUser,
  ): Promise<{ success: boolean; message: string; reservationId?: string }> {
    return this.inventoryService.reserveParts(reservationData, req.user);
  }

  /**
   * 🔓 Освобождение резерва
   */
  @Delete('reserve/:reservationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @AuthWithOwnership()
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ 
    summary: 'Освобождение резерва',
    description: 'Освобождение зарезервированного количества запчастей.'
  })
  @ApiParam({ name: 'reservationId', description: 'ID резервирования' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async releaseReservation(
    @Param('reservationId', ParseUUIDPipe) reservationId: string,
  ): Promise<void> {
    return this.inventoryService.releaseReservation(reservationId);
  }

  /**
   * 📊 Отчет по оборачиваемости
   */
  @Get('reports/turnover')
  @AuthWithOwnership()
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ 
    summary: 'Отчет по оборачиваемости склада',
    description: 'Анализ движения запчастей за период с расчетом оборачиваемости.'
  })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'Дата начала периода' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'Дата окончания периода' })
  @ApiQuery({ name: 'categoryId', required: false, description: 'Фильтр по категории' })
  @ApiResponse({ status: HttpStatus.OK })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async getTurnoverReport(
	@Req() req: RequestWithUser,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('categoryId') categoryId?: string,
  ): Promise<any> {
    return this.inventoryService.getTurnoverReport({
      companyId: req.user.companyId,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      categoryId,
    });
  }
}
