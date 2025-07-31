// src/modules/inventory/stock-movements/stock-movements.controller.ts
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
import { StockMovementsService } from './stock-movements.service';
import { CreateMovementDto } from './dto/request/create-movement.dto';
import { BulkMovementsDto } from './dto/request/bulk-movements.dto';
import { BarcodeScanMovementDto } from './dto/request/barcode-movement.dto';
import { StockMovementResponseDto } from './dto/response/movement-response.dto';
import { PaginatedMovementsResponseDto } from './dto/response/paginated-movements-response.dto';
import { MovementSummaryResponseDto } from './dto/response/movement-summary-response.dto';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RequestWithUser } from '../../auth/interfaces/request-with-user.interface';
import { AuthWithOwnership, CompanyResource } from '../../../common';
import { StockMovementFilter } from './types/stock-movements.types';
import { INVENTORY_CONSTANTS } from '../constants/inventory.constants';

@ApiTags('📊 Движения по складу')
@Controller('stock-movements')
export class StockMovementsController {
  constructor(private readonly stockMovementsService: StockMovementsService) {}

  /**
   * 🔒 Получение истории движений
   */
  @Get()
  @AuthWithOwnership()
  @ApiOperation({ 
    summary: 'Получение истории движений по складу',
    description: 'Получение списка всех движений склада с фильтрацией. Суперадмин видит все, остальные - только свои движения.'
  })
  @ApiQuery({ name: 'partId', required: false, description: 'ID запчасти' })
  @ApiQuery({ name: 'type', required: false, description: 'Тип движения', enum: ['receipt', 'issue', 'adjustment', 'transfer'] })
  @ApiQuery({ name: 'reason', required: false, description: 'Причина движения' })
  @ApiQuery({ name: 'userId', required: false, description: 'ID создателя движения' })
  @ApiQuery({ name: 'orderId', required: false, description: 'ID связанного заказа' })
  @ApiQuery({ name: 'supplierId', required: false, description: 'ID поставщика' })
  @ApiQuery({ name: 'documentNumber', required: false, description: 'Номер документа' })
  @ApiQuery({ name: 'dateFrom', required: false, description: 'Дата начала периода' })
  @ApiQuery({ name: 'dateTo', required: false, description: 'Дата окончания периода' })
  @ApiQuery({ name: 'search', required: false, description: 'Поиск по названию запчасти или номеру документа' })
  @ApiQuery({ name: 'page', required: false, description: 'Номер страницы' })
  @ApiQuery({ name: 'limit', required: false, description: 'Размер страницы' })
  @ApiResponse({ status: HttpStatus.OK, type: PaginatedMovementsResponseDto })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  async findAll(
    @Req() req: RequestWithUser,
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
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(INVENTORY_CONSTANTS.DEFAULTS.PAGE_SIZE), ParseIntPipe) limit: number = INVENTORY_CONSTANTS.DEFAULTS.PAGE_SIZE,
  ): Promise<PaginatedMovementsResponseDto> {
    const filter: StockMovementFilter = {
      partId,
      type: type as any,
      reason: reason as any,
      userId,
      orderId,
      supplierId,
      documentNumber,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      search,
      page,
      limit: Math.min(limit, INVENTORY_CONSTANTS.DEFAULTS.MAX_ITEMS),
      // 🔒 КРИТИЧНО: Фильтрация по принадлежности
      companyId: req.user.role === 'superadmin' ? undefined : req.user.companyId,
    };

    return this.stockMovementsService.findAll(filter);
  }

  /**
   * 🔒 Получение конкретного движения
   */
  @Get(':id')
  @AuthWithOwnership()
  @CompanyResource()
  @ApiOperation({ 
    summary: 'Получение информации о движении',
    description: 'Получение детальной информации о конкретном движении по складу.'
  })
  @ApiParam({ name: 'id', description: 'ID движения' })
  @ApiResponse({ status: HttpStatus.OK, type: StockMovementResponseDto })
  @ApiNotFoundResponse({ description: '❌ Движение не найдено или нет доступа' })
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<StockMovementResponseDto> {
    return this.stockMovementsService.findOne(id);
  }

  /**
   * 📝 Создание движения
   */
  @Post()
  @AuthWithOwnership()
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ 
    summary: 'Создание движения по складу',
    description: 'Создание нового движения (приход, расход, корректировка) с автоматическим обновлением остатков.'
  })
  @ApiBody({ type: CreateMovementDto })
  @ApiResponse({ status: HttpStatus.CREATED, type: StockMovementResponseDto })
  @ApiBadRequestResponse({ description: '❌ Ошибка валидации данных' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async create(
    @Body() createMovementDto: CreateMovementDto,
    @Req() req: RequestWithUser,
  ): Promise<StockMovementResponseDto> {
    return this.stockMovementsService.create(createMovementDto, req.user);
  }

  /**
   * 📝 Обновление движения (ограниченное)
   */
  @Patch(':id')
  @AuthWithOwnership()
  @CompanyResource()
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ 
    summary: 'Обновление движения',
    description: 'Обновление ограниченного набора полей движения (цена, сумма, номер документа, заметки).'
  })
  @ApiParam({ name: 'id', description: 'ID движения' })
  @ApiBody({
    schema: {
      properties: {
        price: { type: 'number', description: 'Цена за единицу' },
        totalAmount: { type: 'number', description: 'Общая сумма' },
        documentNumber: { type: 'string', description: 'Номер документа' },
        notes: { type: 'string', description: 'Заметки' },
      }
    }
  })
  @ApiResponse({ status: HttpStatus.OK, type: StockMovementResponseDto })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateData: { 
      price?: number; 
      totalAmount?: number; 
      documentNumber?: string; 
      notes?: string;
    },
    @Req() req: RequestWithUser,
  ): Promise<StockMovementResponseDto> {
    return this.stockMovementsService.update(id, updateData, req.user);
  }

  /**
   * 📦 Bulk создание движений
   */
  @Post('bulk')
  @AuthWithOwnership()
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ 
    summary: 'Массовое создание движений',
    description: 'Создание множественных движений одной операцией (для инвентаризации, поступлений от поставщика).'
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
              error: { type: 'string' }
            }
          }
        },
        totalValue: { type: 'number' }
      }
    }
  })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async createBulk(
    @Body() bulkMovementsDto: BulkMovementsDto,
    @Req() req: RequestWithUser,
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
    return this.stockMovementsService.createBulk(bulkMovementsDto, req.user);
  }

  /**
   * 📱 Создание движения сканированием штрих-кода
   */
  @Post('scan')
  @AuthWithOwnership()
  @Roles('owner', 'admin', 'manager', 'mechanic')
  @ApiOperation({ 
    summary: 'Создание движения сканированием',
    description: 'Быстрое создание движения через сканирование штрих-кода (для мобильного приложения).'
  })
  @ApiBody({ type: BarcodeScanMovementDto })
  @ApiResponse({ status: HttpStatus.CREATED, type: StockMovementResponseDto })
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  async createFromBarcodeScan(
    @Body() barcodeScanDto: BarcodeScanMovementDto,
    @Req() req: RequestWithUser,
  ): Promise<StockMovementResponseDto> {
    return this.stockMovementsService.createFromBarcodeScan(barcodeScanDto, req.user);
  }

  /**
   * 🔄 Отмена движения
   */
  @Post(':id/reverse')
  @AuthWithOwnership()
  @CompanyResource()
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ 
    summary: 'Отмена движения',
    description: 'Создание обратного движения для отмены ошибочной операции.'
  })
  @ApiParam({ name: 'id', description: 'ID движения для отмены' })
  @ApiBody({
    schema: {
      properties: {
        reason: { 
          type: 'string', 
          description: 'Причина отмены',
          example: 'Ошибочно указано количество'
        }
      },
      required: ['reason']
    }
  })
  @ApiResponse({ status: HttpStatus.CREATED, type: StockMovementResponseDto })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async reverseMovement(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @Req() req: RequestWithUser,
  ): Promise<StockMovementResponseDto> {
    return this.stockMovementsService.reverseMovement(id, reason, req.user);
  }

  /**
   * 📊 Сводка движений за период
   */
  @Get('analytics/summary')
  @AuthWithOwnership()
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ 
    summary: 'Сводка движений за период',
    description: 'Получение аналитической сводки по движениям склада за указанный период.'
  })
  @ApiQuery({ name: 'dateFrom', required: true, description: 'Дата начала периода' })
  @ApiQuery({ name: 'dateTo', required: true, description: 'Дата окончания периода' })
  @ApiResponse({ status: HttpStatus.OK, type: MovementSummaryResponseDto })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async getMovementSummary(
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
    @Req() req: RequestWithUser,
  ): Promise<MovementSummaryResponseDto> {
    return this.stockMovementsService.getMovementSummary(
      req.user.companyId,
      new Date(dateFrom),
      new Date(dateTo)
    );
  }

  /**
   * 📋 История движений конкретной запчасти
   */
  @Get('part/:partId/history')
  @AuthWithOwnership()
  @ApiOperation({ 
    summary: 'История движений запчасти',
    description: 'Получение полной истории движений конкретной запчасти.'
  })
  @ApiParam({ name: 'partId', description: 'ID запчасти' })
  @ApiQuery({ name: 'limit', required: false, description: 'Количество записей', example: 50 })
  @ApiResponse({ status: HttpStatus.OK, type: [StockMovementResponseDto] })
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  async getPartHistory(
    @Param('partId', ParseUUIDPipe) partId: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Req() req: RequestWithUser,
  ): Promise<StockMovementResponseDto[]> {
    // 🔒 КРИТИЧНО: Используем companyId пользователя
    return this.stockMovementsService.getPartHistory(partId, req.user.companyId, limit);
  }

  /**
   * 📊 Движения для аналитики
   */
  @Get('analytics/data')
  @AuthWithOwnership()
  @Roles('owner', 'admin')
  @ApiOperation({ 
    summary: 'Данные движений для аналитики',
    description: 'Получение данных движений для построения графиков и отчетов.'
  })
  @ApiQuery({ name: 'dateFrom', required: true, description: 'Дата начала' })
  @ApiQuery({ name: 'dateTo', required: true, description: 'Дата окончания' })
  @ApiQuery({ name: 'categoryId', required: false, description: 'Фильтр по категории' })
  @ApiResponse({ status: HttpStatus.OK, type: [StockMovementResponseDto] })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async getAnalyticsData(
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
    @Query('categoryId') categoryId: string,
    @Req() req: RequestWithUser,
  ): Promise<StockMovementResponseDto[]> {
    return this.stockMovementsService.getMovementsForAnalytics(
      req.user.companyId,
      new Date(dateFrom),
      new Date(dateTo),
      categoryId
    );
  }

  /**
   * 🔄 Интеграционные endpoints для других модулей
   */

  /**
   * 🔗 Создание движений от выполнения заказа
   */
  @Post('integrations/from-order')
  @AuthWithOwnership()
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ 
    summary: 'Создание движений от заказа',
    description: 'Создание движений расхода при выполнении заказа (для интеграции с Orders модулем).'
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
              quantityUsed: { type: 'number' }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ status: HttpStatus.CREATED, type: [StockMovementResponseDto] })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async createFromOrder(
    @Body() data: {
      orderId: string;
      parts: Array<{ partId: string; quantityUsed: number }>;
    },
    @Req() req: RequestWithUser,
  ): Promise<StockMovementResponseDto[]> {
    return this.stockMovementsService.createMovementsFromOrder(
      data.orderId,
      data.parts,
      req.user
    );
  }

  /**
   * 🔗 Создание движений от поступления от поставщика
   */
  @Post('integrations/from-delivery')
  @AuthWithOwnership()
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ 
    summary: 'Создание движений от поставки',
    description: 'Создание движений прихода при поступлении от поставщика (для интеграции с Suppliers модулем).'
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
              unitPrice: { type: 'number' }
            }
          }
        }
      }
    }
  })
  @ApiResponse({ status: HttpStatus.CREATED, type: [StockMovementResponseDto] })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async createFromDelivery(
    @Body() data: {
      supplierId: string;
      deliveryNumber: string;
      parts: Array<{ 
        partId: string; 
        quantityReceived: number; 
        unitPrice?: number;
      }>;
    },
    @Req() req: RequestWithUser,
  ): Promise<StockMovementResponseDto[]> {
    return this.stockMovementsService.createMovementsFromDelivery(
      data.supplierId,
      data.deliveryNumber,
      data.parts,
      req.user
    );
  }
}
