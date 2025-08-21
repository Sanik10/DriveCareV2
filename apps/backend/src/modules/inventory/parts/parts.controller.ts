// path: apps/backend/src/modules/inventory/parts/parts.controller.ts
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
  DefaultValuePipe,
  ParseIntPipe,
  ParseBoolPipe,
  ParseUUIDPipe,
  Req,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { PartsService } from './parts.service';
import { CreatePartDto } from './dto/request/create-part.dto';
import { UpdatePartDto } from './dto/request/update-part.dto';
import { BulkUpdatePartsDto } from './dto/request/bulk-update-parts.dto';
import { PartResponseDto } from './dto/response/part-response.dto';
import { PaginatedPartsResponseDto } from './dto/response/paginated-parts-response.dto';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RequestWithUser } from '../../auth/interfaces/request-with-user.interface';
import { PartFilter, PartSortField, SortOrder } from './types/parts.types';
import { PARTS_CONSTANTS } from './constants/parts.constants';
import { AuthWithOwnership, PartResource } from '../../../common';

@ApiTags('📦 Управление запчастями')
@Controller('parts')
export class PartsController {
  constructor(private readonly partsService: PartsService) {}

  // ---------- Статические маршруты (выше динамических :id) ----------

  @Get('search/:query')
  @AuthWithOwnership()
  @Roles('company_owner', 'company_admin', 'inventory_manager')
  @ApiOperation({
    summary: 'Поиск запчастей',
    description: 'Поиск по названию, номеру, бренду или описанию. Для superadmin обязателен companyId.',
  })
  @ApiParam({ name: 'query', description: 'Поисковый запрос' })
  @ApiQuery({ name: 'limit', required: false, description: 'Максимальное количество результатов' })
  @ApiQuery({ name: 'companyId', required: false, description: 'ID компании (обязательно для superadmin)' })
  @ApiResponse({ status: HttpStatus.OK, type: [PartResponseDto] })
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  async search(
    @Param('query') query: string,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
    @Query('companyId') companyId: string | undefined,
    @Req() req: RequestWithUser,
  ): Promise<PartResponseDto[]> {
    if (req.user.role === 'superadmin') {
      if (!companyId) throw new BadRequestException('companyId is required for superadmin');
    } else {
      companyId = req.user.companyId!;
    }
    return this.partsService.searchParts(query, companyId, limit, req.user.role);
  }

  @Get('category/:categoryId')
  @AuthWithOwnership()
  @Roles('company_owner', 'company_admin', 'inventory_manager')
  @ApiOperation({
    summary: 'Получение запчастей по категории',
    description: 'Получение всех запчастей указанной категории. Для superadmin обязателен companyId.',
  })
  @ApiParam({ name: 'categoryId', description: 'ID категории', format: 'uuid' })
  @ApiQuery({ name: 'page', required: false, description: 'Номер страницы' })
  @ApiQuery({ name: 'limit', required: false, description: 'Размер страницы' })
  @ApiQuery({ name: 'isActive', required: false, description: 'Фильтр по статусу' })
  @ApiQuery({ name: 'companyId', required: false, description: 'ID компании (обязательно для superadmin)' })
  @ApiResponse({ status: HttpStatus.OK, type: PaginatedPartsResponseDto })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async findByCategory(
    @Req() req: RequestWithUser,
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(PARTS_CONSTANTS.DEFAULTS.PAGE_SIZE), ParseIntPipe) limit: number = PARTS_CONSTANTS.DEFAULTS.PAGE_SIZE,
    @Query('isActive', new DefaultValuePipe(undefined), ParseBoolPipe) isActive?: boolean,
    @Query('companyId') companyId?: string,
  ): Promise<PaginatedPartsResponseDto> {
    if (req.user.role === 'superadmin') {
      if (!companyId) throw new BadRequestException('companyId is required for superadmin');
    } else {
      companyId = req.user.companyId!;
    }

    const filter: PartFilter = {
      categoryId,
      isActive,
      page,
      limit,
      companyId,
    };

    return this.partsService.findAllForUser(req.user, filter);
  }

  @Get('popular/list')
  @AuthWithOwnership()
  @Roles('company_owner', 'company_admin', 'inventory_manager')
  @ApiOperation({
    summary: 'Получение популярных запчастей',
    description: 'Получение списка наиболее часто используемых запчастей. Для superadmin обязателен companyId.',
  })
  @ApiQuery({ name: 'limit', required: false, description: 'Количество запчастей' })
  @ApiQuery({ name: 'companyId', required: false, description: 'ID компании (обязательно для superadmin)' })
  @ApiResponse({ status: HttpStatus.OK, type: [PartResponseDto] })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async getPopular(
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number = 20,
    @Query('companyId') companyId: string | undefined,
    @Req() req: RequestWithUser,
  ): Promise<PartResponseDto[]> {
    if (req.user.role === 'superadmin') {
      if (!companyId) throw new BadRequestException('companyId is required for superadmin');
    } else {
      companyId = req.user.companyId!;
    }
    return this.partsService.getPopularParts(companyId, limit, req.user.role);
  }

  @Get('stats/dashboard')
  @AuthWithOwnership()
  @Roles('company_owner', 'company_admin', 'inventory_manager')
  @ApiOperation({
    summary: 'Статистика по запчастям',
    description: 'Получение статистики по запчастям для дашборда. Для superadmin обязателен companyId.',
  })
  @ApiQuery({ name: 'companyId', required: false, description: 'ID компании (обязательно для superadmin)' })
  @ApiResponse({
    status: HttpStatus.OK,
    schema: {
      properties: {
        totalActive: { type: 'number' },
        totalInactive: { type: 'number' },
        totalByCategory: {
          type: 'array',
          items: {
            properties: {
              categoryId: { type: 'string' },
              categoryName: { type: 'string' },
              count: { type: 'number' },
            },
          },
        },
        averageCostPrice: { type: 'number' },
        averageSellingPrice: { type: 'number' },
        totalInventoryValue: { type: 'number' },
      },
    },
  })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async getStats(
    @Query('companyId') companyId: string | undefined,
    @Req() req: RequestWithUser,
  ): Promise<any> {
    if (req.user.role === 'superadmin') {
      if (!companyId) throw new BadRequestException('companyId is required for superadmin');
    } else {
      companyId = req.user.companyId!;
    }
    return this.partsService.getStats(companyId);
  }

  @Get('analytics/profitability')
  @AuthWithOwnership()
  @Roles('company_owner', 'company_admin')
  @ApiOperation({
    summary: 'Анализ прибыльности запчастей',
    description: 'Анализ маржинальности и прибыльности запчастей. Для superadmin обязателен companyId.',
  })
  @ApiQuery({ name: 'companyId', required: false, description: 'ID компании (обязательно для superadmin)' })
  @ApiResponse({
    status: HttpStatus.OK,
    schema: {
      properties: {
        highMarginParts: { type: 'array' },
        lowMarginParts: { type: 'array' },
        averageMargin: { type: 'number' },
      },
    },
  })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async analyzeProfitability(
    @Query('companyId') companyId: string | undefined,
    @Req() req: RequestWithUser,
  ): Promise<any> {
    if (req.user.role === 'superadmin') {
      if (!companyId) throw new BadRequestException('companyId is required for superadmin');
    } else {
      companyId = req.user.companyId!;
    }
    return this.partsService.analyzeProfitability(companyId);
  }

  // ---------- Динамические маршруты с :id ----------

  @Post()
  @AuthWithOwnership()
  @Roles('company_owner', 'company_admin', 'inventory_manager')
  @ApiOperation({
    summary: 'Создание новой запчасти',
    description: 'Создание запчасти в каталоге компании.',
  })
  @ApiBody({ type: CreatePartDto })
  @ApiResponse({ status: HttpStatus.CREATED, type: PartResponseDto })
  @ApiConflictResponse({ description: 'Запчасть с таким номером уже существует' })
  @ApiBadRequestResponse({ description: 'Некорректные данные или превышен лимит запчастей' })
  @ApiUnauthorizedResponse({ description: 'Требуется авторизация' })
  @ApiForbiddenResponse({ description: 'Недостаточно прав доступа' })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async create(@Body() createPartDto: CreatePartDto, @Req() req: RequestWithUser): Promise<PartResponseDto> {
    return this.partsService.createForUser(createPartDto, req.user);
  }

  @Get()
  @AuthWithOwnership()
  @Roles('company_owner', 'company_admin', 'inventory_manager')
  @ApiOperation({
    summary: 'Получение списка запчастей',
    description:
      'Фильтрация/пагинация. Для superadmin обязателен companyId. Строковые фильтры нормализуются и обрезаются по длине.',
  })
  @ApiQuery({ name: 'companyId', required: false, description: 'ID компании (обязательно для superadmin)' })
  @ApiQuery({ name: 'search', required: false, description: 'Поиск по названию, номеру, бренду или описанию' })
  @ApiQuery({ name: 'categoryId', required: false, description: 'Фильтр по категории' })
  @ApiQuery({ name: 'brand', required: false, description: 'Фильтр по бренду' })
  @ApiQuery({ name: 'isActive', required: false, description: 'Статус активности' })
  @ApiQuery({ name: 'minCostPrice', required: false, description: 'Минимальная себестоимость' })
  @ApiQuery({ name: 'maxCostPrice', required: false, description: 'Максимальная себестоимость' })
  @ApiQuery({ name: 'minSellingPrice', required: false, description: 'Минимальная цена продажи' })
  @ApiQuery({ name: 'maxSellingPrice', required: false, description: 'Максимальная цена продажи' })
  @ApiQuery({ name: 'page', required: false, description: 'Номер страницы' })
  @ApiQuery({ name: 'limit', required: false, description: 'Размер страницы' })
  @ApiQuery({ name: 'sortField', required: false, description: 'Поле для сортировки (name|partNumber|brand|costPrice|sellingPrice|createdAt|category)' })
  @ApiQuery({ name: 'sortOrder', required: false, description: 'Порядок сортировки (asc|desc)' })
  @ApiResponse({ status: HttpStatus.OK, type: PaginatedPartsResponseDto })
  @ApiUnauthorizedResponse({ description: 'Требуется авторизация' })
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  async findAll(
    @Req() req: RequestWithUser,
    @Query('companyId') companyId?: string,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('brand') brand?: string,
    @Query('isActive', new DefaultValuePipe(undefined), ParseBoolPipe) isActive?: boolean,
    @Query('minCostPrice') minCostPriceRaw?: string,
    @Query('maxCostPrice') maxCostPriceRaw?: string,
    @Query('minSellingPrice') minSellingPriceRaw?: string,
    @Query('maxSellingPrice') maxSellingPriceRaw?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(PARTS_CONSTANTS.DEFAULTS.PAGE_SIZE), ParseIntPipe) limit: number = PARTS_CONSTANTS.DEFAULTS.PAGE_SIZE,
    @Query('sortField', new DefaultValuePipe('createdAt')) sortFieldRaw: string = 'createdAt',
    @Query('sortOrder', new DefaultValuePipe('desc')) sortOrderRaw: string = 'desc',
  ): Promise<PaginatedPartsResponseDto> {
    if (req.user.role === 'superadmin') {
      if (!companyId) throw new BadRequestException('companyId is required for superadmin');
    } else {
      companyId = req.user.companyId!;
    }

    const clampStr = (v?: string, max = 100) => (v ? String(v).slice(0, max).trim() : undefined);
    const normalizeSearch = clampStr(search, PARTS_CONSTANTS.SEARCH.MAX_SEARCH_LENGTH);
    const normalizeBrand = clampStr(brand, PARTS_CONSTANTS.VALIDATION.MAX_BRAND_LENGTH);

    const toNum = (s?: string): number | undefined => (s !== undefined ? Number(s) : undefined);
    const minCostPrice = toNum(minCostPriceRaw);
    const maxCostPrice = toNum(maxCostPriceRaw);
    const minSellingPrice = toNum(minSellingPriceRaw);
    const maxSellingPrice = toNum(maxSellingPriceRaw);

    const allowedSortFields: PartSortField[] = ['name', 'partNumber', 'brand', 'costPrice', 'sellingPrice', 'createdAt', 'category'];
    const sortField = allowedSortFields.includes(sortFieldRaw as PartSortField) ? (sortFieldRaw as PartSortField) : 'createdAt';
    const sortOrder: SortOrder = sortOrderRaw === 'asc' ? 'asc' : 'desc';

    const filter: PartFilter = {
      search: normalizeSearch,
      categoryId,
      brand: normalizeBrand,
      isActive,
      minCostPrice,
      maxCostPrice,
      minSellingPrice,
      maxSellingPrice,
      page,
      limit,
      sortField,
      sortOrder,
      companyId,
    };

    return this.partsService.findAllForUser(req.user, filter);
  }

  @Get(':id')
  @AuthWithOwnership()
  @Roles('company_owner', 'company_admin', 'inventory_manager')
  @PartResource()
  @ApiOperation({
    summary: 'Получение запчасти по ID',
    description: 'Детальная информация о запчасти. Проверка владения выполняется Guard’ом.',
  })
  @ApiParam({ name: 'id', description: 'ID запчасти', format: 'uuid' })
  @ApiResponse({ status: HttpStatus.OK, type: PartResponseDto })
  @ApiNotFoundResponse({ description: 'Запчасть не найдена' })
  @ApiUnauthorizedResponse({ description: 'Требуется авторизация' })
  @ApiForbiddenResponse({ description: 'Нет доступа к запчасти' })
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  async findOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: RequestWithUser): Promise<PartResponseDto> {
    return this.partsService.findOne(id, req.user.role);
  }

  @Patch(':id')
  @AuthWithOwnership()
  @PartResource()
  @Roles('company_owner', 'company_admin', 'inventory_manager')
  @ApiOperation({
    summary: 'Обновление данных запчасти',
    description: 'Обновление информации о запчасти с проверкой принадлежности к компании.',
  })
  @ApiParam({ name: 'id', description: 'ID запчасти', format: 'uuid' })
  @ApiBody({ type: UpdatePartDto })
  @ApiResponse({ status: HttpStatus.OK, type: PartResponseDto })
  @ApiNotFoundResponse({ description: 'Запчасть не найдена' })
  @ApiConflictResponse({ description: 'Номер запчасти уже используется' })
  @ApiBadRequestResponse({ description: 'Некорректные данные' })
  @ApiUnauthorizedResponse({ description: 'Требуется авторизация' })
  @ApiForbiddenResponse({ description: 'Недостаточно прав или нет доступа к запчасти' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePartDto: UpdatePartDto,
    @Req() req: RequestWithUser,
  ): Promise<PartResponseDto> {
    return this.partsService.update(id, updatePartDto, req.user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @AuthWithOwnership()
  @PartResource()
  @Roles('company_owner', 'company_admin')
  @ApiOperation({
    summary: 'Деактивация запчасти',
    description: 'Мягкое удаление запчасти (деактивация). Доступно владельцам и админам.',
  })
  @ApiParam({ name: 'id', description: 'ID запчасти', format: 'uuid' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @ApiNotFoundResponse({ description: 'Запчасть не найдена' })
  @ApiUnauthorizedResponse({ description: 'Требуется авторизация' })
  @ApiForbiddenResponse({ description: 'Недостаточно прав доступа' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: RequestWithUser): Promise<void> {
    return this.partsService.remove(id, req.user);
  }

  @Patch(':id/status')
  @AuthWithOwnership()
  @PartResource()
  @Roles('company_owner', 'company_admin', 'inventory_manager')
  @ApiOperation({
    summary: 'Изменение статуса активности запчасти',
    description: 'Активация или деактивация запчасти в каталоге.',
  })
  @ApiParam({ name: 'id', description: 'ID запчасти', format: 'uuid' })
  @ApiQuery({ name: 'isActive', type: Boolean, description: 'Новый статус' })
  @ApiResponse({ status: HttpStatus.OK, type: PartResponseDto })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async setActive(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('isActive', ParseBoolPipe) isActive: boolean,
    @Req() req: RequestWithUser,
  ): Promise<PartResponseDto> {
    return this.partsService.setActive(id, isActive, req.user);
  }

  @Patch('bulk/update')
  @AuthWithOwnership()
  @Roles('company_owner', 'company_admin')
  @ApiOperation({
    summary: 'Массовое обновление запчастей',
    description: 'Обновление нескольких запчастей одновременно. Идемпотентно при наличии X-Idempotency-Key.',
  })
  @ApiBody({ type: BulkUpdatePartsDto })
  @ApiResponse({
    status: HttpStatus.OK,
    schema: {
      properties: {
        successCount: { type: 'number' },
        failureCount: { type: 'number' },
        errors: {
          type: 'array',
          items: {
            properties: {
              partId: { type: 'string' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Некорректные данные для обновления' })
  @ApiUnauthorizedResponse({ description: 'Требуется авторизация' })
  @ApiForbiddenResponse({ description: 'Недостаточно прав доступа' })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async bulkUpdate(
    @Body() bulkUpdateDto: BulkUpdatePartsDto,
    @Headers('x-idempotency-key') idempotencyKey: string | undefined,
    @Req() req: RequestWithUser,
  ): Promise<{
    successCount: number;
    failureCount: number;
    errors: Array<{ partId: string; error: string }>;
  }> {
    return this.partsService.bulkUpdate(bulkUpdateDto, req.user, idempotencyKey);
  }
}
