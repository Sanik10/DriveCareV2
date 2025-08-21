// path: apps/backend/src/modules/inventory/stock-movements/stock-movements.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  HttpStatus,
  ParseUUIDPipe,
  DefaultValuePipe,
  ParseIntPipe,
  Req,
  BadRequestException,
  Headers,
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
import { StockMovementsService } from './stock-movements.service';
import { CreateMovementDto } from './dto/request/create-movement.dto';
import { BulkMovementsDto } from './dto/request/bulk-movements.dto';
import { BarcodeScanMovementDto } from './dto/request/barcode-movement.dto';
import { UpdateMovementDto } from './dto/request/update-movement.dto';
import { StockMovementResponseDto } from './dto/response/movement-response.dto';
import { PaginatedMovementsResponseDto } from './dto/response/paginated-movements-response.dto';
import { MovementSummaryResponseDto } from './dto/response/movement-summary-response.dto';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RequestWithUser } from '../../auth/interfaces/request-with-user.interface';
import { AuthWithOwnership, StockMovementResource } from '../../../common';
import { StockMovementFilter, MovementSortField, SortOrder } from './types/stock-movements.types';
import { INVENTORY_CONSTANTS } from '../constants/inventory.constants';

@ApiTags('📊 Движения по складу')
@Controller('stock-movements')
export class StockMovementsController {
  constructor(private readonly stockMovementsService: StockMovementsService) {}

  // Helpers
  private trimMax(value: string | undefined, max = 100): string | undefined {
    if (typeof value !== 'string') return undefined;
    const t = value.trim();
    return t.length > max ? t.slice(0, max) : t;
  }
  private ensureCompanyForSuperadmin(user: RequestWithUser['user'], companyId?: string) {
    if (user.role === 'superadmin') {
      if (!companyId) {
        throw new BadRequestException('Для superadmin требуется явный параметр companyId');
      }
      const uuidRe = /^[0-9a-fA-F-]{36}$/;
      if (!uuidRe.test(companyId)) throw new BadRequestException('Некорректный companyId');
    }
  }

  /**
   * 📊 Сводка движений за период (СТАТИЧЕСКИЙ)
   */
  @Get('analytics/summary')
  @AuthWithOwnership()
  @Roles('superadmin', 'company_owner', 'company_admin', 'inventory_manager')
  @ApiOperation({
    summary: 'Сводка движений за период',
    description: 'Получение аналитической сводки по движениям склада за указанный период.',
  })
  @ApiQuery({ name: 'dateFrom', required: true, description: 'Дата начала периода (ISO)' })
  @ApiQuery({ name: 'dateTo', required: true, description: 'Дата окончания периода (ISO)' })
  @ApiQuery({ name: 'companyId', required: false, description: 'ID компании (обязателен для superadmin)' })
  @ApiResponse({ status: HttpStatus.OK, type: MovementSummaryResponseDto })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async getMovementSummary(
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
    @Query('companyId') companyIdParam: string | undefined,
    @Req() req: RequestWithUser,
  ): Promise<MovementSummaryResponseDto> {
    this.ensureCompanyForSuperadmin(req.user, companyIdParam);
    const companyId = req.user.role === 'superadmin' ? (companyIdParam as string) : req.user.companyId;
    return this.stockMovementsService.getMovementSummary(companyId, new Date(dateFrom), new Date(dateTo));
  }

  /**
   * 📋 История движений конкретной запчасти (СТАТИЧЕСКИЙ)
   */
  @Get('part/:partId/history')
  @AuthWithOwnership()
  @Roles('superadmin', 'company_owner', 'company_admin', 'inventory_manager')
  @ApiOperation({
    summary: 'История движений запчасти',
    description: 'Получение полной истории движений конкретной запчасти.',
  })
  @ApiParam({ name: 'partId', description: 'ID запчасти' })
  @ApiQuery({ name: 'limit', required: false, description: 'Количество записей', example: 50 })
  @ApiQuery({ name: 'companyId', required: false, description: 'ID компании (обязателен для superadmin)' })
  @ApiResponse({ status: HttpStatus.OK, type: [StockMovementResponseDto] })
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  async getPartHistory(
    @Param('partId', ParseUUIDPipe) partId: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('companyId') companyIdParam: string | undefined,
    @Req() req: RequestWithUser,
  ): Promise<StockMovementResponseDto[]> {
    this.ensureCompanyForSuperadmin(req.user, companyIdParam);
    const companyId = req.user.role === 'superadmin' ? (companyIdParam as string) : req.user.companyId;
    const capped = Math.min(limit, INVENTORY_CONSTANTS.DEFAULTS.MAX_ITEMS);
    return this.stockMovementsService.getPartHistory(partId, companyId, capped, req.user.role);
  }

  /**
   * 📊 Движения для аналитики (СТАТИЧЕСКИЙ)
   */
  @Get('analytics/data')
  @AuthWithOwnership()
  @Roles('superadmin', 'company_owner', 'company_admin', 'inventory_manager')
  @ApiOperation({
    summary: 'Данные движений для аналитики',
    description: 'Получение данных движений для построения графиков и отчетов.',
  })
  @ApiQuery({ name: 'dateFrom', required: true, description: 'Дата начала' })
  @ApiQuery({ name: 'dateTo', required: true, description: 'Дата окончания' })
  @ApiQuery({ name: 'categoryId', required: false, description: 'Фильтр по категории' })
  @ApiQuery({ name: 'companyId', required: false, description: 'ID компании (обязателен для superadmin)' })
  @ApiResponse({ status: HttpStatus.OK, type: [StockMovementResponseDto] })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async getAnalyticsData(
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
    @Query('categoryId') categoryId: string,
    @Query('companyId') companyIdParam: string | undefined,
    @Req() req: RequestWithUser,
  ): Promise<StockMovementResponseDto[]> {
    this.ensureCompanyForSuperadmin(req.user, companyIdParam);
    const companyId = req.user.role === 'superadmin' ? (companyIdParam as string) : req.user.companyId;
    return this.stockMovementsService.getMovementsForAnalytics(companyId, new Date(dateFrom), new Date(dateTo), categoryId, req.user.role);
  }

  /**
   * 🔒 Получение истории движений (листинг)
   */
  @Get()
  @AuthWithOwnership()
  @Roles('superadmin', 'company_owner', 'company_admin', 'inventory_manager')
  @ApiOperation({
    summary: 'Получение истории движений по складу',
    description: 'Список всех движений склада с фильтрацией. Суперадмин видит только при явном companyId.',
  })
  @ApiQuery({ name: 'companyId', required: false, description: 'ID компании (обязателен для superadmin)' })
  @ApiQuery({ name: 'partId', required: false, description: 'ID запчасти' })
  @ApiQuery({ name: 'type', required: false, description: 'Тип движения', enum: ['receipt', 'issue', 'adjustment', 'transfer', 'reservation', 'release'] })
  @ApiQuery({ name: 'reason', required: false, description: 'Причина движения', enum: ['purchase', 'order_fulfillment', 'inventory_count', 'damage', 'expiry', 'loss', 'correction'] })
  @ApiQuery({ name: 'userId', required: false, description: 'ID создателя движения' })
  @ApiQuery({ name: 'orderId', required: false, description: 'ID связанного заказа' })
  @ApiQuery({ name: 'supplierId', required: false, description: 'ID поставщика' })
  @ApiQuery({ name: 'documentNumber', required: false, description: 'Номер документа' })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'Дата начала периода' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'Дата окончания периода' })
  @ApiQuery({ name: 'search', required: false, description: 'Поиск по названию запчасти или номеру документа' })
  @ApiQuery({ name: 'sortField', required: false, enum: ['createdAt', 'type', 'quantity', 'totalAmount', 'partName', 'documentNumber'] })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'page', required: false, description: 'Номер страницы' })
  @ApiQuery({ name: 'limit', required: false, description: 'Размер страницы' })
  @ApiResponse({ status: HttpStatus.OK, type: PaginatedMovementsResponseDto })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Недостаточно прав' })
  @ApiBadRequestResponse({ description: '❌ Некорректные параметры' })
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  async findAll(
    @Req() req: RequestWithUser,
    @Query('companyId') companyIdParam?: string,
    @Query('partId') partId?: string,
    @Query('type') type?: string,
    @Query('reason') reason?: string,
    @Query('userId') userId?: string,
    @Query('orderId') orderId?: string,
    @Query('supplierId') supplierId?: string,
    @Query('documentNumber') documentNumber?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('search') search?: string,
    @Query('sortField') sortField?: MovementSortField,
    @Query('sortOrder') sortOrder?: SortOrder,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(INVENTORY_CONSTANTS.DEFAULTS.PAGE_SIZE), ParseIntPipe) limit: number = INVENTORY_CONSTANTS.DEFAULTS.PAGE_SIZE,
  ): Promise<PaginatedMovementsResponseDto> {
    // Superadmin rule
    this.ensureCompanyForSuperadmin(req.user, companyIdParam);
    const companyId = req.user.role === 'superadmin' ? (companyIdParam as string) : req.user.companyId;

    // Normalize inputs
    const sortWhitelist: MovementSortField[] = ['createdAt', 'type', 'quantity', 'totalAmount', 'partName', 'documentNumber'];
    const normalizedSortField = sortWhitelist.includes((sortField as any)) ? sortField : 'createdAt';
    const normalizedSortOrder: SortOrder = (sortOrder === 'asc' || sortOrder === 'desc') ? sortOrder : 'desc';

    const filter: StockMovementFilter = {
      companyId,
      partId,
      type: type as any,
      reason: reason as any,
      userId,
      orderId,
      supplierId,
      documentNumber: this.trimMax(documentNumber, 50),
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      search: this.trimMax(search, 100),
      page,
      limit: Math.min(limit, INVENTORY_CONSTANTS.DEFAULTS.MAX_ITEMS),
      sortField: normalizedSortField,
      sortOrder: normalizedSortOrder,
    };

    return this.stockMovementsService.findAll(filter, req.user.role);
  }

  /**
   * 🔒 Получение конкретного движения (ресурсный)
   */
  @Get(':id')
  @AuthWithOwnership()
  @StockMovementResource()
  @Roles('superadmin', 'company_owner', 'company_admin', 'inventory_manager')
  @ApiOperation({
    summary: 'Получение информации о движении',
    description: 'Получение детальной информации о конкретном движении по складу.',
  })
  @ApiParam({ name: 'id', description: 'ID движения' })
  @ApiResponse({ status: HttpStatus.OK, type: StockMovementResponseDto })
  @ApiNotFoundResponse({ description: '❌ Движение не найдено или нет доступа' })
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: RequestWithUser): Promise<StockMovementResponseDto> {
    return this.stockMovementsService.findOne(id, req.user.role);
  }

  /**
   * 📝 Создание движения
   */
  @Post()
  @AuthWithOwnership()
  @Roles('company_owner', 'company_admin', 'inventory_manager')
  @ApiOperation({
    summary: 'Создание движения по складу',
    description: 'Создание нового движения (приход, расход, корректировка) с автоматическим обновлением остатков.',
  })
  @ApiBody({ type: CreateMovementDto })
  @ApiResponse({ status: HttpStatus.CREATED, type: StockMovementResponseDto })
  @ApiBadRequestResponse({ description: '❌ Ошибка валидации данных' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async create(
    @Body() createMovementDto: CreateMovementDto,
    @Req() req: RequestWithUser,
    @Headers('x-idempotency-key') idempotencyKey?: string,
  ): Promise<StockMovementResponseDto> {
    return this.stockMovementsService.create(createMovementDto, req.user, req.user.role, idempotencyKey);
  }

  /**
   * 📝 Обновление движения (ограниченное)
   */
  @Patch(':id')
  @AuthWithOwnership()
  @StockMovementResource()
  @Roles('company_owner', 'company_admin', 'inventory_manager')
  @ApiOperation({
    summary: 'Обновление движения',
    description: 'Обновление ограниченного набора полей движения (цена, сумма, номер документа, заметки).',
  })
  @ApiParam({ name: 'id', description: 'ID движения' })
  @ApiBody({ type: UpdateMovementDto })
  @ApiResponse({ status: HttpStatus.OK, type: StockMovementResponseDto })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateData: UpdateMovementDto,
    @Req() req: RequestWithUser,
  ): Promise<StockMovementResponseDto> {
    return this.stockMovementsService.update(id, updateData, req.user, req.user.role);
  }

  /**
   * 📦 Bulk создание движений
   */
  @Post('bulk')
  @AuthWithOwnership()
  @Roles('company_owner', 'company_admin', 'inventory_manager')
  @ApiOperation({
    summary: 'Массовое создание движений',
    description: 'Создание множественных движений одной операцией (для инвентаризации, поступлений от поставщика).',
  })
  @ApiBody({ type: BulkMovementsDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    schema: {
      properties: {
        successCount: { type: 'number' },
        failureCount: { type: 'number' },
        results: {
          type: 'array',
          items: {
            properties: {
              partId: { type: 'string' },
              success: { type: 'boolean' },
              movementId: { type: 'string' },
              error: { type: 'string' },
            },
          },
        },
        totalValue: { type: 'number' },
      },
    },
  })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async createBulk(
    @Body() bulkMovementsDto: BulkMovementsDto,
    @Req() req: RequestWithUser,
    @Headers('x-idempotency-key') idempotencyKey?: string,
  ): Promise<{
    successCount: number;
    failureCount: number;
    results: Array<{
      partId: string;
      success: boolean;
      movementId?: string;
      error?: string;
    }>;
    totalValue: number;
  }> {
    return this.stockMovementsService.createBulk(bulkMovementsDto, req.user, idempotencyKey);
  }

  /**
   * 📱 Создание движения сканированием штрих-кода
   */
  @Post('scan')
  @AuthWithOwnership()
  @Roles('company_owner', 'company_admin', 'inventory_manager')
  @ApiOperation({
    summary: 'Создание движения сканированием',
    description: 'Быстрое создание движения через сканирование штрих-кода (для мобильного приложения).',
  })
  @ApiBody({ type: BarcodeScanMovementDto })
  @ApiResponse({ status: HttpStatus.CREATED, type: StockMovementResponseDto })
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  async createFromBarcodeScan(
    @Body() barcodeScanDto: BarcodeScanMovementDto,
    @Req() req: RequestWithUser,
    @Headers('x-idempotency-key') idempotencyKey?: string,
  ): Promise<StockMovementResponseDto> {
    return this.stockMovementsService.createFromBarcodeScan(barcodeScanDto, req.user, req.user.role, idempotencyKey);
  }

  /**
   * 🔄 Отмена движения
   */
  @Post(':id/reverse')
  @AuthWithOwnership()
  @StockMovementResource()
  @Roles('company_owner', 'company_admin', 'inventory_manager')
  @ApiOperation({
    summary: 'Отмена движения',
    description: 'Создание обратного движения для отмены ошибочной операции.',
  })
  @ApiParam({ name: 'id', description: 'ID движения для отмены' })
  @ApiBody({
    schema: {
      properties: {
        reason: {
          type: 'string',
          description: 'Причина отмены',
          example: 'Ошибочно указано количество',
        },
      },
      required: ['reason'],
    },
  })
  @ApiResponse({ status: HttpStatus.CREATED, type: StockMovementResponseDto })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async reverseMovement(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @Req() req: RequestWithUser,
    @Headers('x-idempotency-key') idempotencyKey?: string,
  ): Promise<StockMovementResponseDto> {
    return this.stockMovementsService.reverseMovement(id, reason, req.user, req.user.role, idempotencyKey);
  }

  /**
   * 🔗 Создание движений от выполнения заказа (интеграция)
   */
  @Post('integrations/from-order')
  @AuthWithOwnership()
  @Roles('company_owner', 'company_admin', 'inventory_manager')
  @ApiOperation({
    summary: 'Создание движений от заказа',
    description: 'Создание движений расхода при выполнении заказа (для интеграции с Orders модулем).',
  })
  @ApiBody({
    schema: {
      properties: {
        orderId: { type: 'string', description: 'ID заказа' },
        parts: {
          type: 'array',
          items: {
            properties: {
              partId: { type: 'string' },
              quantityUsed: { type: 'number' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.CREATED, type: [StockMovementResponseDto] })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async createFromOrder(
    @Body() data: { orderId: string; parts: Array<{ partId: string; quantityUsed: number }> },
    @Req() req: RequestWithUser,
    @Headers('x-idempotency-key') idempotencyKey?: string,
  ): Promise<StockMovementResponseDto[]> {
    const movements = await this.stockMovementsService.createMovementsFromOrder(data.orderId, data.parts, req.user, idempotencyKey);
    return movements.map((m) => m); // already mapped inside service
  }

  /**
   * 🔗 Создание движений от поступления от поставщика (интеграция)
   */
  @Post('integrations/from-delivery')
  @AuthWithOwnership()
  @Roles('company_owner', 'company_admin', 'inventory_manager')
  @ApiOperation({
    summary: 'Создание движений от поставки',
    description: 'Создание движений прихода при поступлении от поставщика (для интеграции с Suppliers модулем).',
  })
  @ApiBody({
    schema: {
      properties: {
        supplierId: { type: 'string', description: 'ID поставщика' },
        deliveryNumber: { type: 'string', description: 'Номер поставки' },
        parts: {
          type: 'array',
          items: {
            properties: {
              partId: { type: 'string' },
              quantityReceived: { type: 'number' },
              unitPrice: { type: 'number' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.CREATED, type: [StockMovementResponseDto] })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async createFromDelivery(
    @Body()
    data: {
      supplierId: string;
      deliveryNumber: string;
      parts: Array<{ partId: string; quantityReceived: number; unitPrice?: number }>;
    },
    @Req() req: RequestWithUser,
    @Headers('x-idempotency-key') idempotencyKey?: string,
  ): Promise<StockMovementResponseDto[]> {
    const movements = await this.stockMovementsService.createMovementsFromDelivery(
      data.supplierId,
      data.deliveryNumber,
      data.parts,
      req.user,
      idempotencyKey,
    );
    return movements.map((m) => m); // already mapped inside service
  }
}
