// path: apps/backend/src/modules/inventory/suppliers/suppliers.controller.ts
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
  Headers,
  BadRequestException,
  ParseBoolPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
  ApiBadRequestResponse,
  ApiTooManyRequestsResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/request/create-supplier.dto';
import { UpdateSupplierDto } from './dto/request/update-supplier.dto';
import { BulkSuppliersDto } from './dto/request/bulk-suppliers.dto';
import { RateSupplierDto } from './dto/request/rate-supplier.dto';
import { SupplierResponseDto } from './dto/response/supplier-response.dto';
import { PaginatedSuppliersResponseDto } from './dto/response/paginated-suppliers-response.dto';
import { SupplierRatingResponseDto } from './dto/response/supplier-rating-response.dto';
import { SupplierAnalyticsResponseDto } from './dto/response/supplier-analytics-response.dto';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RequestWithUser } from '../../auth/interfaces/request-with-user.interface';
import { AuthWithOwnership, SupplierResource } from '../../../common';
import { SupplierFilter } from './types/suppliers.types';
import { INVENTORY_CONSTANTS } from '../constants/inventory.constants';

@ApiTags('🏪 Управление поставщиками')
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  // =========================
  // Статические маршруты (выше ':id')
  // =========================

  @Get('best-for-part/:partId')
  @AuthWithOwnership()
  @Roles('superadmin', 'company_owner', 'company_admin', 'inventory_manager')
  @ApiOperation({
    summary: 'Поиск лучшего поставщика для запчасти',
    description: 'Автоматический подбор оптимального поставщика на основе цены, рейтинга и сроков доставки.',
  })
  @ApiParam({ name: 'partId', description: 'ID запчасти' })
  @ApiQuery({
    name: 'prioritize',
    required: false,
    description: 'Приоритет выбора',
    enum: ['price', 'quality', 'delivery'],
  })
  @ApiQuery({
    name: 'companyId',
    required: false,
    description: 'ID компании (обязательно для superadmin)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    schema: {
      properties: {
        partId: { type: 'string' },
        bestSupplier: {
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            price: { type: 'number' },
            rating: { type: 'number' },
            deliveryTime: { type: 'number' },
            score: { type: 'number' },
          },
        },
        alternatives: { type: 'array' },
      },
    },
  })
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  async findBestSupplierForPart(
    @Param('partId', ParseUUIDPipe) partId: string,
    @Query('prioritize') prioritize: 'price' | 'quality' | 'delivery' = 'price',
    @Query('companyId') companyId: string | undefined,
    @Req() req: RequestWithUser,
  ): Promise<any> {
    const effectiveCompanyId = req.user.role === 'superadmin' ? companyId : req.user.companyId;
    if (req.user.role === 'superadmin' && !effectiveCompanyId) {
      throw new BadRequestException('companyId обязателен для superadmin');
    }
    return this.suppliersService.findBestSupplierForPart(partId, prioritize, effectiveCompanyId!);
  }

  @Get('top/performers')
  @AuthWithOwnership()
  @Roles('superadmin', 'company_owner', 'company_admin', 'inventory_manager')
  @ApiOperation({
    summary: 'Топ поставщики компании',
    description: 'Рейтинг лучших поставщиков по объемам, качеству и надежности.',
  })
  @ApiQuery({ name: 'limit', required: false, description: 'Количество поставщиков в топе' })
  @ApiQuery({
    name: 'period',
    required: false,
    description: 'Период анализа',
    enum: ['month', 'quarter', 'year'],
  })
  @ApiQuery({
    name: 'companyId',
    required: false,
    description: 'ID компании (обязательно для superadmin)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    schema: {
      properties: {
        period: { type: 'string' },
        topSuppliers: {
          type: 'array',
          items: {
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              totalOrders: { type: 'number' },
              totalValue: { type: 'number' },
              averageRating: { type: 'number' },
              onTimeDeliveryRate: { type: 'number' },
              rank: { type: 'number' },
            },
          },
        },
      },
    },
  })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async getTopPerformers(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
    @Query('period') period: 'month' | 'quarter' | 'year' = 'quarter',
    @Query('companyId') companyId: string | undefined,
    @Req() req: RequestWithUser,
  ): Promise<any> {
    const effectiveCompanyId = req.user.role === 'superadmin' ? companyId : req.user.companyId;
    if (req.user.role === 'superadmin' && !effectiveCompanyId) {
      throw new BadRequestException('companyId обязателен для superadmin');
    }
    const safeLimit = Math.min(Math.max(1, limit), INVENTORY_CONSTANTS.DEFAULTS.MAX_ITEMS);
    return this.suppliersService.getTopPerformers(effectiveCompanyId!, period, safeLimit);
  }

  @Post('bulk')
  @AuthWithOwnership()
  @Roles('company_owner', 'company_admin')
  @ApiOperation({
    summary: 'Массовые операции с поставщиками',
    description: 'Массовое создание, обновление или деактивация поставщиков.',
  })
  @ApiBody({ type: BulkSuppliersDto })
  @ApiResponse({
    status: HttpStatus.OK,
    schema: {
      properties: {
        successCount: { type: 'number' },
        failureCount: { type: 'number' },
        results: {
          type: 'array',
          items: {
            properties: {
              identifier: { type: 'string' },
              success: { type: 'boolean' },
              supplierId: { type: 'string' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
  })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async bulkOperations(
    @Body() bulkSuppliersDto: BulkSuppliersDto,
    @Headers('x-idempotency-key') idempotencyKey: string | undefined,
    @Req() req: RequestWithUser,
  ) {
    return this.suppliersService.bulkOperations(bulkSuppliersDto, req.user, idempotencyKey);
  }

  // =========================
  // Динамические маршруты (:id)
  // =========================

  @Get()
  @AuthWithOwnership()
  @Roles('superadmin', 'company_owner', 'company_admin', 'inventory_manager')
  @ApiOperation({
    summary: 'Получение списка поставщиков',
    description:
      'Получение всех поставщиков компании с фильтрацией и поиском. Суперадмин видит данные только при явном companyId.',
  })
  @ApiQuery({ name: 'search', required: false, description: 'Поиск по названию, email или телефону' })
  @ApiQuery({ name: 'isActive', required: false, description: 'Фильтр по активности', type: Boolean })
  @ApiQuery({ name: 'hasRecentDeliveries', required: false, description: 'Поставщики с недавними поставками', type: Boolean })
  @ApiQuery({ name: 'minRating', required: false, description: 'Минимальный рейтинг', type: Number })
  @ApiQuery({ name: 'city', required: false, description: 'Фильтр по городу' })
  @ApiQuery({ name: 'country', required: false, description: 'Фильтр по стране' })
  @ApiQuery({ name: 'supplierType', required: false, description: 'Тип поставщика' })
  @ApiQuery({ name: 'page', required: false, description: 'Номер страницы' })
  @ApiQuery({ name: 'limit', required: false, description: 'Размер страницы' })
  @ApiQuery({ name: 'companyId', required: false, description: 'ID компании (обязательно для superadmin)' })
  @ApiResponse({ status: HttpStatus.OK, type: PaginatedSuppliersResponseDto })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Нет доступа' })
  @ApiTooManyRequestsResponse({ description: '❌ Слишком много запросов' })
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  async findAll(
    @Req() req: RequestWithUser,
    @Query('search') search?: string,
    @Query('isActive', new ParseBoolPipe({ optional: true })) isActive?: boolean,
    @Query('hasRecentDeliveries', new ParseBoolPipe({ optional: true })) hasRecentDeliveries?: boolean,
    @Query('minRating') minRating?: number,
    @Query('city') city?: string,
    @Query('country') country?: string,
    @Query('supplierType') supplierType?: string,
    @Query('companyId') companyId?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(INVENTORY_CONSTANTS.DEFAULTS.PAGE_SIZE), ParseIntPipe)
    limit: number = INVENTORY_CONSTANTS.DEFAULTS.PAGE_SIZE,
  ): Promise<PaginatedSuppliersResponseDto> {
    const effectiveCompanyId = req.user.role === 'superadmin' ? companyId : req.user.companyId;
    if (req.user.role === 'superadmin' && !effectiveCompanyId) {
      throw new BadRequestException('companyId обязателен для superadmin');
    }

    const filter: SupplierFilter = {
      search: typeof search === 'string' ? search.trim() : search,
      isActive,
      hasRecentDeliveries,
      minRating: typeof minRating === 'string' ? Number(minRating) : minRating,
      city: typeof city === 'string' ? city.trim() : city,
      country: typeof country === 'string' ? country.trim() : country,
      supplierType: supplierType as any,
      page,
      limit: Math.min(Math.max(1, limit), INVENTORY_CONSTANTS.DEFAULTS.MAX_ITEMS),
      companyId: effectiveCompanyId,
    };

    return this.suppliersService.findAll(filter, req.user);
  }

  @Get(':id')
  @AuthWithOwnership()
  @SupplierResource()
  @Roles('superadmin', 'company_owner', 'company_admin', 'inventory_manager')
  @ApiOperation({
    summary: 'Получение информации о поставщике',
    description: 'Получение детальной информации о поставщике с рейтингом и статистикой.',
  })
  @ApiParam({ name: 'id', description: 'ID поставщика' })
  @ApiResponse({ status: HttpStatus.OK, type: SupplierResponseDto })
  @ApiNotFoundResponse({ description: '❌ Поставщик не найден или нет доступа' })
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: RequestWithUser): Promise<SupplierResponseDto> {
    return this.suppliersService.findOne(id, req.user);
  }

  @Post()
  @AuthWithOwnership()
  @Roles('company_owner', 'company_admin', 'inventory_manager')
  @ApiOperation({
    summary: 'Создание нового поставщика',
    description: 'Создание нового поставщика с автоматической привязкой к компании пользователя.',
  })
  @ApiBody({ type: CreateSupplierDto })
  @ApiResponse({ status: HttpStatus.CREATED, type: SupplierResponseDto })
  @ApiBadRequestResponse({ description: '❌ Ошибка валидации данных' })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async create(@Body() createSupplierDto: CreateSupplierDto, @Req() req: RequestWithUser): Promise<SupplierResponseDto> {
    return this.suppliersService.create(createSupplierDto, req.user);
  }

  @Patch(':id')
  @AuthWithOwnership()
  @SupplierResource()
  @Roles('company_owner', 'company_admin', 'inventory_manager')
  @ApiOperation({
    summary: 'Обновление информации о поставщике',
    description: 'Обновление данных поставщика с сохранением истории изменений.',
  })
  @ApiParam({ name: 'id', description: 'ID поставщика' })
  @ApiBody({ type: UpdateSupplierDto })
  @ApiResponse({ status: HttpStatus.OK, type: SupplierResponseDto })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateSupplierDto: UpdateSupplierDto,
    @Req() req: RequestWithUser,
  ): Promise<SupplierResponseDto> {
    return this.suppliersService.update(id, updateSupplierDto, req.user);
  }

  @Patch(':id/deactivate')
  @AuthWithOwnership()
  @SupplierResource()
  @Roles('company_owner', 'company_admin')
  @ApiOperation({
    summary: 'Деактивация поставщика',
    description: 'Деактивация поставщика (soft delete). Поставщик останется в системе, но станет неактивным.',
  })
  @ApiParam({ name: 'id', description: 'ID поставщика' })
  @ApiResponse({ status: HttpStatus.OK, type: SupplierResponseDto })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async deactivate(@Param('id', ParseUUIDPipe) id: string, @Req() req: RequestWithUser): Promise<SupplierResponseDto> {
    return this.suppliersService.deactivate(id, req.user);
  }

  @Post(':id/rate')
  @AuthWithOwnership()
  @SupplierResource()
  @Roles('company_owner', 'company_admin', 'inventory_manager')
  @ApiOperation({
    summary: 'Оценка поставщика',
    description: 'Выставление оценки поставщику по качеству, доставке и ценам.',
  })
  @ApiParam({ name: 'id', description: 'ID поставщика' })
  @ApiBody({ type: RateSupplierDto })
  @ApiResponse({ status: HttpStatus.OK, type: SupplierRatingResponseDto })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async rateSupplier(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() ratingData: RateSupplierDto,
    @Headers('x-idempotency-key') idempotencyKey: string | undefined,
    @Req() req: RequestWithUser,
  ): Promise<SupplierRatingResponseDto> {
    return this.suppliersService.rateSupplier(id, ratingData, req.user, idempotencyKey);
  }

  @Get(':id/price-comparison/:partId')
  @AuthWithOwnership()
  @SupplierResource()
  @Roles('superadmin', 'company_owner', 'company_admin', 'inventory_manager')
  @ApiOperation({
    summary: 'Сравнение цен на запчасть',
    description: 'Сравнение цен на конкретную запчасть между всеми поставщиками компании.',
  })
  @ApiParam({ name: 'id', description: 'ID основного поставщика' })
  @ApiParam({ name: 'partId', description: 'ID запчасти' })
  @ApiQuery({
    name: 'companyId',
    required: false,
    description: 'ID компании (обязательно для superadmin)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    schema: {
      properties: {
        partId: { type: 'string' },
        partName: { type: 'string' },
        suppliers: {
          type: 'array',
          items: {
            properties: {
              supplierId: { type: 'string' },
              supplierName: { type: 'string' },
              price: { type: 'number' },
              deliveryTime: { type: 'number' },
              rating: { type: 'number' },
              lastOrderDate: { type: 'string' },
              isPreferred: { type: 'boolean' },
            },
          },
        },
        bestPrice: { type: 'number' },
        bestPriceSupplierId: { type: 'string' },
      },
    },
  })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async comparePartPrices(
    @Param('id', ParseUUIDPipe) _supplierId: string,
    @Param('partId', ParseUUIDPipe) partId: string,
    @Query('companyId') companyId: string | undefined,
    @Req() req: RequestWithUser,
  ): Promise<any> {
    const effectiveCompanyId =
      req.user.role === 'superadmin' ? companyId : req.user.companyId;
    if (req.user.role === 'superadmin' && !effectiveCompanyId) {
      throw new BadRequestException('companyId обязателен для superadmin');
    }
    return this.suppliersService.comparePartPrices(partId, effectiveCompanyId!);
  }

  @Get(':id/analytics')
  @AuthWithOwnership()
  @SupplierResource()
  @Roles('superadmin', 'company_owner', 'company_admin', 'inventory_manager')
  @ApiOperation({
    summary: 'Аналитика по поставщику',
    description: 'Детальная аналитика: объемы закупок, частота поставок, рейтинги, тренды.',
  })
  @ApiParam({ name: 'id', description: 'ID поставщика' })
  @ApiQuery({
    name: 'period',
    required: false,
    description: 'Период анализа',
    enum: ['month', 'quarter', 'year'],
  })
  @ApiQuery({
    name: 'companyId',
    required: false,
    description: 'ID компании (обязательно для superadmin)',
  })
  @ApiResponse({ status: HttpStatus.OK, type: SupplierAnalyticsResponseDto })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async getSupplierAnalytics(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('period') period: 'month' | 'quarter' | 'year' = 'quarter',
    @Query('companyId') companyId: string | undefined,
    @Req() req: RequestWithUser,
  ): Promise<SupplierAnalyticsResponseDto> {
    const effectiveCompanyId =
      req.user.role === 'superadmin' ? companyId : req.user.companyId;
    if (req.user.role === 'superadmin' && !effectiveCompanyId) {
      throw new BadRequestException('companyId обязателен для superadmin');
    }
    return this.suppliersService.getSupplierAnalytics(id, period, effectiveCompanyId!);
  }
}
