// src/modules/inventory/parts/parts.controller.ts
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
import { PartFilter } from './types/parts.types';
import { PARTS_CONSTANTS } from './constants/parts.constants';
import { AuthWithOwnership, CompanyResource } from '../../../common';

@ApiTags('📦 Управление запчастями')
@Controller('parts')
export class PartsController {
  constructor(private readonly partsService: PartsService) {}

  /**
   * 📝 Создание новой запчасти
   */
  @Post()
  @AuthWithOwnership()
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ 
    summary: 'Создание новой запчасти',
    description: 'Создание запчасти в каталоге компании. Доступно владельцам, админам и менеджерам.'
  })
  @ApiBody({ type: CreatePartDto })
  @ApiResponse({ status: HttpStatus.CREATED, type: PartResponseDto })
  @ApiConflictResponse({ description: 'Запчасть с таким номером уже существует' })
  @ApiBadRequestResponse({ description: 'Некорректные данные или превышен лимит запчастей' })
  @ApiUnauthorizedResponse({ description: 'Требуется авторизация' })
  @ApiForbiddenResponse({ description: 'Недостаточно прав доступа' })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async create(
    @Body() createPartDto: CreatePartDto,
    @Req() req: RequestWithUser,
  ): Promise<PartResponseDto> {
    return this.partsService.createForUser(createPartDto, req.user);
  }

  /**
   * 📋 Получение списка запчастей
   */
  @Get()
  @AuthWithOwnership()
  @ApiOperation({ 
    summary: 'Получение списка запчастей',
    description: 'Получение списка запчастей с фильтрацией и пагинацией. Каждый видит только запчасти своей компании.'
  })
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
  @ApiQuery({ name: 'sortField', required: false, description: 'Поле для сортировки' })
  @ApiQuery({ name: 'sortOrder', required: false, description: 'Порядок сортировки (asc/desc)' })
  @ApiResponse({ status: HttpStatus.OK, type: PaginatedPartsResponseDto })
  @ApiUnauthorizedResponse({ description: 'Требуется авторизация' })
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  async findAll(
    @Req() req: RequestWithUser,
    @Query('search') search?: string,
    @Query('categoryId') categoryId?: string,
    @Query('brand') brand?: string,
    @Query('isActive') isActive?: boolean,
    @Query('minCostPrice') minCostPrice?: number,
    @Query('maxCostPrice') maxCostPrice?: number,
    @Query('minSellingPrice') minSellingPrice?: number,
    @Query('maxSellingPrice') maxSellingPrice?: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(PARTS_CONSTANTS.DEFAULTS.PAGE_SIZE), ParseIntPipe) limit: number = PARTS_CONSTANTS.DEFAULTS.PAGE_SIZE,
    @Query('sortField', new DefaultValuePipe('createdAt')) sortField: string = 'createdAt',
    @Query('sortOrder', new DefaultValuePipe('desc')) sortOrder: 'asc' | 'desc' = 'desc',
  ): Promise<PaginatedPartsResponseDto> {
    const filter: PartFilter = {
      search,
      categoryId,
      brand,
      isActive,
      minCostPrice,
      maxCostPrice,
      minSellingPrice,
      maxSellingPrice,
      page,
      limit: Math.min(limit, PARTS_CONSTANTS.DEFAULTS.MAX_ITEMS),
      sortField: sortField as any,
      sortOrder,
      // 🔒 КРИТИЧНО: Фильтрация по принадлежности
      companyId: req.user.role === 'superadmin' ? undefined : req.user.companyId,
    };

    return this.partsService.findAllForUser(req.user, filter);
  }

  /**
   * 🔍 Получение запчасти по ID
   */
  @Get(':id')
  @AuthWithOwnership()
  @CompanyResource()
  @ApiOperation({ 
    summary: 'Получение запчасти по ID',
    description: 'Получение детальной информации о запчасти с проверкой принадлежности к компании.'
  })
  @ApiParam({ name: 'id', description: 'ID запчасти', format: 'uuid' })
  @ApiResponse({ status: HttpStatus.OK, type: PartResponseDto })
  @ApiNotFoundResponse({ description: 'Запчасть не найдена' })
  @ApiUnauthorizedResponse({ description: 'Требуется авторизация' })
  @ApiForbiddenResponse({ description: 'Нет доступа к запчасти' })
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<PartResponseDto> {
    return this.partsService.findOne(id);
  }

  /**
   * ✏️ Обновление запчасти
   */
  @Patch(':id')
  @AuthWithOwnership()
  @CompanyResource()
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ 
    summary: 'Обновление данных запчасти',
    description: 'Обновление информации о запчасти с проверкой принадлежности к компании.'
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

  /**
   * 🗑️ Удаление запчасти (деактивация)
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @AuthWithOwnership()
  @CompanyResource()
  @Roles('owner', 'admin')
  @ApiOperation({ 
    summary: 'Деактивация запчасти',
    description: 'Мягкое удаление запчасти (деактивация). Доступно владельцам и админам.'
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

  /**
   * 🔄 Изменение статуса активности
   */
  @Patch(':id/status')
  @AuthWithOwnership()
  @CompanyResource()
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ 
    summary: 'Изменение статуса активности запчасти',
    description: 'Активация или деактивация запчасти в каталоге.'
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

  /**
   * 🔍 Поиск запчастей
   */
  @Get('search/:query')
  @AuthWithOwnership()
  @ApiOperation({ 
    summary: 'Поиск запчастей',
    description: 'Интеллектуальный поиск запчастей по названию, номеру, бренду или описанию.'
  })
  @ApiParam({ name: 'query', description: 'Поисковый запрос' })
  @ApiQuery({ name: 'limit', required: false, description: 'Максимальное количество результатов' })
  @ApiResponse({ status: HttpStatus.OK, type: [PartResponseDto] })
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  async search(
    @Param('query') query: string,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
    @Req() req: RequestWithUser,
  ): Promise<PartResponseDto[]> {
    return this.partsService.searchParts(query, req.user.companyId, limit);
  }

  /**
   * 📂 Получение запчастей по категории
   */
  @Get('category/:categoryId')
  @AuthWithOwnership()
  @ApiOperation({ 
    summary: 'Получение запчастей по категории',
    description: 'Получение всех запчастей указанной категории.'
  })
  @ApiParam({ name: 'categoryId', description: 'ID категории', format: 'uuid' })
  @ApiQuery({ name: 'page', required: false, description: 'Номер страницы' })
  @ApiQuery({ name: 'limit', required: false, description: 'Размер страницы' })
  @ApiQuery({ name: 'isActive', required: false, description: 'Фильтр по статусу' })
  @ApiResponse({ status: HttpStatus.OK, type: PaginatedPartsResponseDto })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async findByCategory(
    @Param('categoryId', ParseUUIDPipe) categoryId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(PARTS_CONSTANTS.DEFAULTS.PAGE_SIZE), ParseIntPipe) limit: number = PARTS_CONSTANTS.DEFAULTS.PAGE_SIZE,
    @Req() req: RequestWithUser,
    @Query('isActive') isActive?: boolean,
  ): Promise<PaginatedPartsResponseDto> {
    const filter: PartFilter = {
      categoryId,
      isActive,
      page,
      limit: Math.min(limit, PARTS_CONSTANTS.DEFAULTS.MAX_ITEMS),
      companyId: req.user.companyId,
    };

    return this.partsService.findAllForUser(req.user, filter);
  }

  /**
   * 📦 Bulk обновление запчастей
   */
  @Patch('bulk/update')
  @AuthWithOwnership()
  @Roles('owner', 'admin')
  @ApiOperation({ 
    summary: 'Массовое обновление запчастей',
    description: 'Обновление нескольких запчастей одновременно. Доступно владельцам и админам.'
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
            }
          }
        },
      }
    }
  })
  @ApiBadRequestResponse({ description: 'Некорректные данные для обновления' })
  @ApiUnauthorizedResponse({ description: 'Требуется авторизация' })
  @ApiForbiddenResponse({ description: 'Недостаточно прав доступа' })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async bulkUpdate(
    @Body() bulkUpdateDto: BulkUpdatePartsDto,
    @Req() req: RequestWithUser,
  ): Promise<{
    successCount: number;
    failureCount: number;
    errors: Array<{ partId: string; error: string }>;
  }> {
    return this.partsService.bulkUpdate(bulkUpdateDto, req.user);
  }

  /**
   * 📈 Получение популярных запчастей
   */
  @Get('popular/list')
  @AuthWithOwnership()
  @ApiOperation({ 
    summary: 'Получение популярных запчастей',
    description: 'Получение списка наиболее часто используемых запчастей.'
  })
  @ApiQuery({ name: 'limit', required: false, description: 'Количество запчастей' })
  @ApiResponse({ status: HttpStatus.OK, type: [PartResponseDto] })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async getPopular(
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number = 20,
    @Req() req: RequestWithUser,
  ): Promise<PartResponseDto[]> {
    return this.partsService.getPopularParts(req.user.companyId, limit);
  }

  /**
   * 📊 Статистика по запчастям
   */
  @Get('stats/dashboard')
  @AuthWithOwnership()
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ 
    summary: 'Статистика по запчастям',
    description: 'Получение статистики по запчастям для дашборда.'
  })
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
            }
          }
        },
        averageCostPrice: { type: 'number' },
        averageSellingPrice: { type: 'number' },
        totalInventoryValue: { type: 'number' },
      }
    }
  })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async getStats(@Req() req: RequestWithUser): Promise<any> {
    return this.partsService.getStats(req.user.companyId);
  }

  /**
   * 💰 Анализ прибыльности
   */
  @Get('analytics/profitability')
  @AuthWithOwnership()
  @Roles('owner', 'admin')
  @ApiOperation({ 
    summary: 'Анализ прибыльности запчастей',
    description: 'Анализ маржинальности и прибыльности запчастей.'
  })
  @ApiResponse({ 
    status: HttpStatus.OK,
    schema: {
      properties: {
        highMarginParts: { type: 'array' },
        lowMarginParts: { type: 'array' },
        averageMargin: { type: 'number' },
      }
    }
  })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async analyzeProfitability(@Req() req: RequestWithUser): Promise<any> {
    return this.partsService.analyzeProfitability(req.user.companyId);
  }
}
