// path: apps/backend/src/modules/inventory/inventory.controller.ts
import {
  Controller, Get, Post, Body, Patch, Param, Delete, Query, HttpCode, HttpStatus,
  ParseUUIDPipe, DefaultValuePipe, ParseIntPipe, Req, BadRequestException, Headers,
} from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery, ApiBody, ApiHeader,
  ApiUnauthorizedResponse, ApiForbiddenResponse, ApiNotFoundResponse, ApiBadRequestResponse,
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
import { AuthWithOwnership, InventoryResource } from '../../common';
import { InventoryFilter } from './types/inventory.types';
import { INVENTORY_CONSTANTS } from './constants/inventory.constants';

@ApiTags('📦 Управление складом')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  // Единая логика выбора companyId: superadmin обязан указывать companyId
  private resolveCompanyId(req: RequestWithUser, companyIdParam?: string): string {
    if (req.user.role === 'superadmin') {
      if (!companyIdParam) {
        throw new BadRequestException('Для superadmin требуется указать companyId в запросе');
      }
      return companyIdParam;
    }
    return req.user.companyId;
  }

  @Get()
  @AuthWithOwnership()
  @Roles('company_owner', 'company_admin', 'inventory_manager')
  @ApiOperation({
    summary: 'Получение остатков на складе',
    description: 'Список позиций склада с фильтрацией/поиском. Superadmin — только при явном companyId.',
  })
  @ApiQuery({ name: 'companyId', required: false, description: 'ID компании (обязательно для superadmin)' })
  @ApiQuery({ name: 'partId', required: false })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiQuery({ name: 'lowStock', required: false, description: 'true/false' })
  @ApiQuery({ name: 'location', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiResponse({ status: HttpStatus.OK, type: PaginatedInventoryResponseDto })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: 'Недостаточно прав доступа' })
  @ApiBadRequestResponse({ description: 'Некорректные параметры фильтра' })
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  async findAll(
    @Req() req: RequestWithUser,
    @Query('companyId') companyIdParam?: string,
    @Query('partId') partId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('lowStock') lowStockParam?: string,
    @Query('location') locationRaw?: string,
    @Query('search') searchRaw?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(INVENTORY_CONSTANTS.DEFAULTS.PAGE_SIZE), ParseIntPipe) limit: number = INVENTORY_CONSTANTS.DEFAULTS.PAGE_SIZE,
  ): Promise<PaginatedInventoryResponseDto> {
    let lowStock: boolean | undefined = undefined;
    if (typeof lowStockParam === 'string') {
      const v = lowStockParam.trim().toLowerCase();
      if (v === 'true' || v === '1') lowStock = true;
      else if (v === 'false' || v === '0') lowStock = false;
    }

    const companyId = this.resolveCompanyId(req, companyIdParam);

    // Нормализация page/limit
    page = Number.isFinite(page) && page > 0 ? page : 1;
    const maxLimit = INVENTORY_CONSTANTS.DEFAULTS.MAX_ITEMS;
    limit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, maxLimit) : INVENTORY_CONSTANTS.DEFAULTS.PAGE_SIZE;

    // Гигиена строк
    const MAX_SEARCH_LEN = 100;
    const location = locationRaw?.trim().slice(0, INVENTORY_CONSTANTS.VALIDATION.LOCATION.MAX_LENGTH);
    const search = searchRaw?.trim().slice(0, MAX_SEARCH_LEN);

    const filter: InventoryFilter = {
      companyId,
      partId,
      categoryId,
      lowStock,
      location,
      search,
      page,
      limit,
    };

    return this.inventoryService.findAllForUser(req.user, filter);
  }

  @Get('summary/overview')
  @AuthWithOwnership()
  @Roles('company_owner', 'company_admin', 'inventory_manager')
  @ApiOperation({ summary: 'Сводная информация по складу' })
  @ApiQuery({ name: 'companyId', required: false, description: 'ID компании (обязательно для superadmin)' })
  @ApiResponse({ status: HttpStatus.OK, type: StockSummaryResponseDto })
  @ApiForbiddenResponse({ description: 'Недостаточно прав доступа' })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async getStockSummary(@Req() req: RequestWithUser, @Query('companyId') companyIdParam?: string): Promise<StockSummaryResponseDto> {
    const companyId = this.resolveCompanyId(req, companyIdParam);
    return this.inventoryService.getStockSummary(companyId);
  }

  @Get('alerts/low-stock')
  @AuthWithOwnership()
  @Roles('company_owner', 'company_admin', 'inventory_manager')
  @ApiOperation({ summary: 'Уведомления о низких остатках' })
  @ApiQuery({ name: 'companyId', required: false, description: 'ID компании (обязательно для superadmin)' })
  @ApiResponse({ status: HttpStatus.OK, type: LowStockAlertsResponseDto })
  @ApiForbiddenResponse({ description: 'Недостаточно прав доступа' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async getLowStockAlerts(@Req() req: RequestWithUser, @Query('companyId') companyIdParam?: string): Promise<LowStockAlertsResponseDto> {
    const companyId = this.resolveCompanyId(req, companyIdParam);
    return this.inventoryService.getLowStockAlerts(companyId);
  }

  @Get('availability/:partId')
  @AuthWithOwnership()
  @Roles('company_owner', 'company_admin', 'inventory_manager')
  @ApiOperation({ summary: 'Проверка доступности запчасти' })
  @ApiParam({ name: 'partId', description: 'ID запчасти' })
  @ApiQuery({ name: 'companyId', required: false, description: 'ID компании (обязательно для superadmin)' })
  @ApiQuery({ name: 'quantity', required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    schema: { properties: { partId: { type: 'string' }, available: { type: 'number' }, canReserve: { type: 'boolean' }, maxReservable: { type: 'number' }, location: { type: 'string' } } },
  })
  @ApiForbiddenResponse({ description: 'Недостаточно прав доступа' })
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  async checkAvailability(
    @Param('partId', ParseUUIDPipe) partId: string,
    @Query('quantity', new DefaultValuePipe(1), ParseIntPipe) quantity: number = 1,
    @Query('companyId') companyIdParam: string | undefined,
    @Req() req: RequestWithUser,
  ): Promise<{ partId: string; available: number; canReserve: boolean; maxReservable: number; location: string }> {
    const companyId = this.resolveCompanyId(req, companyIdParam);
    return this.inventoryService.checkAvailability(partId, quantity, companyId);
  }

  @Get('reports/turnover')
  @AuthWithOwnership()
  @Roles('company_owner', 'company_admin', 'inventory_manager')
  @ApiOperation({ summary: 'Отчет по оборачиваемости склада' })
  @ApiQuery({ name: 'companyId', required: false, description: 'ID компании (обязательно для superadmin)' })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiQuery({ name: 'categoryId', required: false })
  @ApiResponse({ status: HttpStatus.OK })
  @ApiForbiddenResponse({ description: 'Недостаточно прав доступа' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async getTurnoverReport(
    @Req() req: RequestWithUser,
    @Query('companyId') companyIdParam?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('categoryId') categoryId?: string,
  ): Promise<any> {
    const companyId = this.resolveCompanyId(req, companyIdParam);
    return this.inventoryService.getTurnoverReport({
      companyId,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      categoryId,
    });
  }

  @Post('reserve')
  @AuthWithOwnership()
  @Roles('company_owner', 'company_admin', 'inventory_manager')
  @ApiOperation({ summary: 'Резервирование запчастей' })
  @ApiHeader({ name: 'X-Idempotency-Key', required: false, description: 'Ключ идемпотентности для безопасного повтора запроса' })
  @ApiBody({ schema: { properties: { partId: { type: 'string' }, quantity: { type: 'number' }, orderId: { type: 'string' }, expiresAt: { type: 'string', format: 'date-time' } } } })
  @ApiResponse({ status: HttpStatus.OK })
  @ApiForbiddenResponse({ description: 'Недостаточно прав доступа' })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async reserveParts(
    @Body() reservationData: { partId: string; quantity: number; orderId?: string; expiresAt?: Date },
    @Headers('x-idempotency-key') idempotencyKey: string | undefined,
    @Req() req: RequestWithUser,
  ): Promise<{ success: boolean; message: string; reservationId?: string }> {
    return this.inventoryService.reserveParts({ ...reservationData, idempotencyKey }, req.user);
  }

  @Delete('reserve/:reservationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @AuthWithOwnership()
  @Roles('company_owner', 'company_admin', 'inventory_manager')
  @ApiOperation({ summary: 'Освобождение резерва' })
  @ApiParam({ name: 'reservationId', description: 'ID резервирования' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiForbiddenResponse({ description: 'Недостаточно прав доступа' })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async releaseReservation(@Param('reservationId', ParseUUIDPipe) reservationId: string): Promise<void> {
    return this.inventoryService.releaseReservation(reservationId);
  }

  @Get(':id')
  @AuthWithOwnership()
  @InventoryResource()
  @Roles('company_owner', 'company_admin', 'inventory_manager')
  @ApiOperation({ summary: 'Получение позиции на складе', description: 'Ownership enforced' })
  @ApiParam({ name: 'id', description: 'ID позиции' })
  @ApiResponse({ status: HttpStatus.OK, type: InventoryResponseDto })
  @ApiForbiddenResponse({ description: 'Недостаточно прав доступа' })
  @ApiNotFoundResponse({ description: 'Позиция не найдена' })
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: RequestWithUser): Promise<InventoryResponseDto> {
    return this.inventoryService.findOneForUser(id, req.user);
  }

  @Patch(':id')
  @AuthWithOwnership()
  @InventoryResource()
  @Roles('company_owner', 'company_admin', 'inventory_manager')
  @ApiOperation({ summary: 'Обновление информации о складе' })
  @ApiParam({ name: 'id', description: 'ID позиции' })
  @ApiBody({ type: UpdateInventoryDto })
  @ApiResponse({ status: HttpStatus.OK, type: InventoryResponseDto })
  @ApiForbiddenResponse({ description: 'Недостаточно прав доступа' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() updateInventoryDto: UpdateInventoryDto): Promise<InventoryResponseDto> {
    return this.inventoryService.update(id, updateInventoryDto);
  }
}
