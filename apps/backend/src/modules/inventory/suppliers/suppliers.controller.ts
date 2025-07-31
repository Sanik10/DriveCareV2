// src/modules/inventory/suppliers/suppliers.controller.ts
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
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/request/create-supplier.dto';
import { UpdateSupplierDto } from './dto/request/update-supplier.dto';
import { BulkSuppliersDto } from './dto/request/bulk-suppliers.dto';
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

  /**
   * 🔒 Получение всех поставщиков компании
   */
  @Get()
  @AuthWithOwnership() // 🛡️ JWT + Roles + Ownership
  @ApiOperation({ 
    summary: 'Получение списка поставщиков',
    description: 'Получение всех поставщиков компании с фильтрацией и поиском. Суперадмин видит все, остальные - только своих поставщиков.'
  })
  @ApiQuery({ name: 'search', required: false, description: 'Поиск по названию, email или телефону' })
  @ApiQuery({ name: 'isActive', required: false, description: 'Фильтр по активности', type: Boolean })
  @ApiQuery({ name: 'hasRecentDeliveries', required: false, description: 'Поставщики с недавними поставками', type: Boolean })
  @ApiQuery({ name: 'minRating', required: false, description: 'Минимальный рейтинг', type: Number })
  @ApiQuery({ name: 'city', required: false, description: 'Фильтр по городу' })
  @ApiQuery({ name: 'page', required: false, description: 'Номер страницы' })
  @ApiQuery({ name: 'limit', required: false, description: 'Размер страницы' })
  @ApiResponse({ status: HttpStatus.OK, type: PaginatedSuppliersResponseDto })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  async findAll(
    @Req() req: RequestWithUser,
    @Query('search') search?: string,
    @Query('isActive') isActive?: boolean,
    @Query('hasRecentDeliveries') hasRecentDeliveries?: boolean,
    @Query('minRating') minRating?: number,
    @Query('city') city?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(INVENTORY_CONSTANTS.DEFAULTS.PAGE_SIZE), ParseIntPipe) limit: number = INVENTORY_CONSTANTS.DEFAULTS.PAGE_SIZE,
  ): Promise<PaginatedSuppliersResponseDto> {
    const filter: SupplierFilter = {
      search,
      isActive,
      hasRecentDeliveries,
      minRating,
      city,
      page,
      limit: Math.min(limit, INVENTORY_CONSTANTS.DEFAULTS.MAX_ITEMS),
      // 🔒 КРИТИЧНО: Автоматическая фильтрация по принадлежности
      companyId: req.user.role === 'superadmin' ? undefined : req.user.companyId,
    };

    return this.suppliersService.findAll(filter);
  }

  /**
   * 🔒 Получение конкретного поставщика
   */
  @Get(':id')
  @AuthWithOwnership()
  @SupplierResource() // 🛡️ Проверка ownership через CompanyOwnershipGuard
  @ApiOperation({ 
    summary: 'Получение информации о поставщике',
    description: 'Получение детальной информации о поставщике с рейтингом и статистикой.'
  })
  @ApiParam({ name: 'id', description: 'ID поставщика' })
  @ApiResponse({ status: HttpStatus.OK, type: SupplierResponseDto })
  @ApiNotFoundResponse({ description: '❌ Поставщик не найден или нет доступа' })
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<SupplierResponseDto> {
    return this.suppliersService.findOne(id);
  }

  /**
   * 📝 Создание поставщика
   */
  @Post()
  @AuthWithOwnership()
  @Roles('owner', 'admin', 'manager') // 🔐 RBAC: только менеджеры и выше
  @ApiOperation({ 
    summary: 'Создание нового поставщика',
    description: 'Создание нового поставщика с автоматической привязкой к компании пользователя.'
  })
  @ApiBody({ type: CreateSupplierDto })
  @ApiResponse({ status: HttpStatus.CREATED, type: SupplierResponseDto })
  @ApiBadRequestResponse({ description: '❌ Ошибка валидации данных' })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async create(
    @Body() createSupplierDto: CreateSupplierDto,
    @Req() req: RequestWithUser,
  ): Promise<SupplierResponseDto> {
    return this.suppliersService.create(createSupplierDto, req.user);
  }

  /**
   * 📝 Обновление поставщика
   */
  @Patch(':id')
  @AuthWithOwnership()
  @SupplierResource()
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ 
    summary: 'Обновление информации о поставщике',
    description: 'Обновление данных поставщика с сохранением истории изменений.'
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

  /**
   * 🗑️ Деактивация поставщика
   */
  @Patch(':id/deactivate')
  @AuthWithOwnership()
  @SupplierResource()
  @Roles('owner', 'admin')
  @ApiOperation({ 
    summary: 'Деактивация поставщика',
    description: 'Деактивация поставщика (soft delete). Поставщик останется в системе, но станет неактивным.'
  })
  @ApiParam({ name: 'id', description: 'ID поставщика' })
  @ApiResponse({ status: HttpStatus.OK, type: SupplierResponseDto })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: RequestWithUser,
  ): Promise<SupplierResponseDto> {
    return this.suppliersService.deactivate(id, req.user);
  }

  /**
   * ⭐ Оценка поставщика
   */
  @Post(':id/rate')
  @AuthWithOwnership()
  @SupplierResource()
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ 
    summary: 'Оценка поставщика',
    description: 'Выставление оценки поставщику по качеству, доставке и ценам.'
  })
  @ApiParam({ name: 'id', description: 'ID поставщика' })
  @ApiBody({
    schema: {
      properties: {
        qualityRating: { type: 'number', minimum: 1, maximum: 5, description: 'Оценка качества (1-5)' },
        deliveryRating: { type: 'number', minimum: 1, maximum: 5, description: 'Оценка доставки (1-5)' },
        priceRating: { type: 'number', minimum: 1, maximum: 5, description: 'Оценка цен (1-5)' },
        comment: { type: 'string', description: 'Комментарий к оценке' },
      },
      required: ['qualityRating', 'deliveryRating', 'priceRating']
    }
  })
  @ApiResponse({ status: HttpStatus.OK, type: SupplierRatingResponseDto })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async rateSupplier(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() ratingData: {
      qualityRating: number;
      deliveryRating: number;
      priceRating: number;
      comment?: string;
    },
    @Req() req: RequestWithUser,
  ): Promise<SupplierRatingResponseDto> {
    return this.suppliersService.rateSupplier(id, ratingData, req.user);
  }

  /**
   * 💰 Сравнение цен между поставщиками
   */
  @Get(':id/price-comparison/:partId')
  @AuthWithOwnership()
  @SupplierResource()
  @ApiOperation({ 
    summary: 'Сравнение цен на запчасть',
    description: 'Сравнение цен на конкретную запчасть между всеми поставщиками компании.'
  })
  @ApiParam({ name: 'id', description: 'ID основного поставщика' })
  @ApiParam({ name: 'partId', description: 'ID запчасти' })
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
              isPreferred: { type: 'boolean' }
            }
          }
        },
        bestPrice: { type: 'number' },
        bestPriceSupplierId: { type: 'string' }
      }
    }
  })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async comparePartPrices(
    @Param('id', ParseUUIDPipe) supplierId: string,
    @Param('partId', ParseUUIDPipe) partId: string,
    @Req() req: RequestWithUser,
  ): Promise<any> {
    return this.suppliersService.comparePartPrices(partId, req.user.companyId);
  }

  /**
   * 📊 Аналитика по поставщику
   */
  @Get(':id/analytics')
  @AuthWithOwnership()
  @SupplierResource()
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ 
    summary: 'Аналитика по поставщику',
    description: 'Детальная аналитика: объемы закупок, частота поставок, рейтинги, тренды.'
  })
  @ApiParam({ name: 'id', description: 'ID поставщика' })
  @ApiQuery({ name: 'period', required: false, description: 'Период анализа', enum: ['month', 'quarter', 'year'] })
  @ApiResponse({ status: HttpStatus.OK, type: SupplierAnalyticsResponseDto })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async getSupplierAnalytics(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('period') period: 'month' | 'quarter' | 'year' = 'quarter',
    @Req() req: RequestWithUser,
  ): Promise<SupplierAnalyticsResponseDto> {
    return this.suppliersService.getSupplierAnalytics(id, period, req.user.companyId);
  }

  /**
   * 📦 Массовые операции
   */
  @Post('bulk')
  @AuthWithOwnership()
  @Roles('owner', 'admin')
  @ApiOperation({ 
    summary: 'Массовые операции с поставщиками',
    description: 'Массовое создание, обновление или деактивация поставщиков.'
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
              error: { type: 'string' }
            }
          }
        }
      }
    }
  })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async bulkOperations(
    @Body() bulkSuppliersDto: BulkSuppliersDto,
    @Req() req: RequestWithUser,
  ): Promise<{
    successCount: number;
    failureCount: number;
    results: Array<{
      identifier: string;
      success: boolean;
      supplierId?: string;
      error?: string;
    }>;
  }> {
    return this.suppliersService.bulkOperations(bulkSuppliersDto, req.user);
  }

  /**
   * 🔍 Поиск лучшего поставщика для запчасти
   */
  @Get('best-for-part/:partId')
  @AuthWithOwnership()
  @ApiOperation({ 
    summary: 'Поиск лучшего поставщика для запчасти',
    description: 'Автоматический подбор оптимального поставщика на основе цены, рейтинга и сроков доставки.'
  })
  @ApiParam({ name: 'partId', description: 'ID запчасти' })
  @ApiQuery({ name: 'prioritize', required: false, description: 'Приоритет выбора', enum: ['price', 'quality', 'delivery'] })
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
            score: { type: 'number' }
          }
        },
        alternatives: { type: 'array' }
      }
    }
  })
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  async findBestSupplierForPart(
    @Param('partId', ParseUUIDPipe) partId: string,
    @Query('prioritize') prioritize: 'price' | 'quality' | 'delivery' = 'price',
    @Req() req: RequestWithUser,
  ): Promise<any> {
    return this.suppliersService.findBestSupplierForPart(partId, prioritize, req.user.companyId);
  }

  /**
   * 📈 Топ поставщики компании
   */
  @Get('top/performers')
  @AuthWithOwnership()
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ 
    summary: 'Топ поставщики компании',
    description: 'Рейтинг лучших поставщиков по объемам, качеству и надежности.'
  })
  @ApiQuery({ name: 'limit', required: false, description: 'Количество поставщиков в топе' })
  @ApiQuery({ name: 'period', required: false, description: 'Период анализа', enum: ['month', 'quarter', 'year'] })
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
              rank: { type: 'number' }
            }
          }
        }
      }
    }
  })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async getTopPerformers(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number = 10,
    @Query('period') period: 'month' | 'quarter' | 'year' = 'quarter',
    @Req() req: RequestWithUser,
  ): Promise<any> {
    return this.suppliersService.getTopPerformers(req.user.companyId, period, limit);
  }
}
