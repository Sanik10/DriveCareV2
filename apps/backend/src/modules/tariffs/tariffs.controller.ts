// path: apps/backend/src/modules/tariffs/tariffs.controller.ts
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
  ParseBoolPipe,
  DefaultValuePipe,
  ParseIntPipe,
  ParseArrayPipe,
  BadRequestException,
  ParseFloatPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { TariffsService } from './tariffs.service';
import { CreateTariffDto } from './dto/request/create-tariff.dto';
import { UpdateTariffDto } from './dto/request/update-tariff.dto';
import { TariffResponseDto } from './dto/response/tariff-response.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TariffFilter } from './types/tariffs.types';
import { TARIFFS_CONSTANTS } from './constants/tariffs.constants';
import { AllowCache } from '../../common/decorators/cache-policy.decorator';

@ApiTags('💰 Тарифные планы')
@Controller('tariffs')
export class TariffsController {
  constructor(private readonly tariffsService: TariffsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'platform_admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Создание нового тарифного плана',
    description: 'Создание нового тарифа с лимитами и возможностями. Доступно только платформенным администраторам.',
  })
  @ApiBody({ type: CreateTariffDto })
  @ApiResponse({ status: HttpStatus.CREATED, type: TariffResponseDto })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async create(@Body() createTariffDto: CreateTariffDto): Promise<TariffResponseDto> {
    return this.tariffsService.create(createTariffDto);
  }

  // Публичный листинг — без метрик подписчиков
  @Get()
  @ApiOperation({
    summary: 'Получение списка тарифов (публично)',
    description: 'Публичный список тарифов с базовыми фильтрами. Метрики подписчиков не включаются.',
  })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'minPrice', required: false, type: Number })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'sortField',
    required: false,
    enum: ['name', 'priceMonthly', 'priceYearly', 'createdAt'],
  })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiResponse({ status: HttpStatus.OK })
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  async findAllPublic(
    @Query('search') search?: string,
    @Query('isActive', new DefaultValuePipe(undefined), new ParseBoolPipe({ optional: true })) isActive?: boolean,
    @Query('minPrice', new DefaultValuePipe(undefined), new ParseFloatPipe({ optional: true })) minPrice?: number,
    @Query('maxPrice', new DefaultValuePipe(undefined), new ParseFloatPipe({ optional: true })) maxPrice?: number,
    @Query('page', new DefaultValuePipe('1'), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(String(TARIFFS_CONSTANTS.DEFAULTS.PAGE_SIZE)), ParseIntPipe) limit?: number,
    @Query('sortField', new DefaultValuePipe('priceMonthly')) sortField?: string,
    @Query('sortOrder', new DefaultValuePipe('asc')) sortOrder?: 'asc' | 'desc',
  ) {
    const allowedSortFields = new Set(['name', 'priceMonthly', 'priceYearly', 'createdAt']);
    const sf = (sortField || 'priceMonthly').toString();
    if (!allowedSortFields.has(sf)) {
      throw new BadRequestException(`Недопустимое поле сортировки: ${sf}`);
    }

    const filter: TariffFilter = {
      search: (search || '').trim() || undefined,
      isActive,
      minPrice,
      maxPrice,
      page,
      limit: Math.min(
        Number.isFinite(limit as number) ? (limit as number) : TARIFFS_CONSTANTS.DEFAULTS.PAGE_SIZE,
        TARIFFS_CONSTANTS.DEFAULTS.MAX_ITEMS,
      ),
      sortField: sf as any,
      sortOrder: sortOrder === 'desc' ? 'desc' : 'asc',
    };

    // Важно: includeMetrics=false (по умолчанию)
    return this.tariffsService.findAll(filter, { includeMetrics: false });
  }

  // Админский листинг — с метриками подписчиков и расширенными фильтрами
  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'platform_admin')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Получение списка тарифов (админ, с метриками)',
    description:
      'Backoffice-листинг тарифов с расширенными фильтрами и метриками подписчиков (активные/всего уникальных компаний).',
  })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'minPrice', required: false, type: Number })
  @ApiQuery({ name: 'maxPrice', required: false, type: Number })
  @ApiQuery({ name: 'minActiveSubscribers', required: false, type: Number })
  @ApiQuery({ name: 'minTotalSubscribers', required: false, type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'sortField',
    required: false,
    enum: ['name', 'priceMonthly', 'priceYearly', 'createdAt', 'activeSubscribers', 'totalSubscribers'],
  })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  @ApiResponse({ status: HttpStatus.OK })
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  async findAllAdmin(
    @Query('search') search?: string,
    @Query('isActive', new DefaultValuePipe(undefined), new ParseBoolPipe({ optional: true })) isActive?: boolean,
    @Query('minPrice', new DefaultValuePipe(undefined), new ParseFloatPipe({ optional: true })) minPrice?: number,
    @Query('maxPrice', new DefaultValuePipe(undefined), new ParseFloatPipe({ optional: true })) maxPrice?: number,
    @Query('minActiveSubscribers', new DefaultValuePipe('0'), ParseIntPipe) minActiveSubscribers?: number,
    @Query('minTotalSubscribers', new DefaultValuePipe('0'), ParseIntPipe) minTotalSubscribers?: number,
    @Query('page', new DefaultValuePipe('1'), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(String(TARIFFS_CONSTANTS.DEFAULTS.PAGE_SIZE)), ParseIntPipe) limit?: number,
    @Query('sortField', new DefaultValuePipe('priceMonthly')) sortField?: string,
    @Query('sortOrder', new DefaultValuePipe('asc')) sortOrder?: 'asc' | 'desc',
  ) {
    const allowedSortFields = new Set([
      'name',
      'priceMonthly',
      'priceYearly',
      'createdAt',
      'activeSubscribers',
      'totalSubscribers',
    ]);
    const sf = (sortField || 'priceMonthly').toString();
    if (!allowedSortFields.has(sf)) {
      throw new BadRequestException(`Недопустимое поле сортировки: ${sf}`);
    }

    const filter: TariffFilter = {
      search: (search || '').trim() || undefined,
      isActive,
      minPrice,
      maxPrice,
      minActiveSubscribers: (minActiveSubscribers || 0) > 0 ? minActiveSubscribers : undefined,
      minTotalSubscribers: (minTotalSubscribers || 0) > 0 ? minTotalSubscribers : undefined,
      page,
      limit: Math.min(
        Number.isFinite(limit as number) ? (limit as number) : TARIFFS_CONSTANTS.DEFAULTS.PAGE_SIZE,
        TARIFFS_CONSTANTS.DEFAULTS.MAX_ITEMS,
      ),
      sortField: sf as any,
      sortOrder: sortOrder === 'desc' ? 'desc' : 'asc',
    };

    return this.tariffsService.findAll(filter, { includeMetrics: true });
  }

  // Публичные витрины — оставляем кэш, но уменьшаем TTL
  @Get('active')
  @AllowCache(60, 'public')
  @ApiOperation({ summary: 'Получение активных тарифов (публично)' })
  @ApiResponse({ status: HttpStatus.OK, type: [TariffResponseDto] })
  @Throttle({ default: { limit: 200, ttl: 60000 } })
  async findActive(): Promise<TariffResponseDto[]> {
    return this.tariffsService.findActive();
  }

  @Get('popular')
  @AllowCache(60, 'public')
  @ApiOperation({ summary: 'Получение популярных тарифов (публично)' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: HttpStatus.OK, type: [TariffResponseDto] })
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  async getPopular(@Query('limit', new DefaultValuePipe('5'), ParseIntPipe) limit: number): Promise<TariffResponseDto[]> {
    return this.tariffsService.getPopular(Math.min(limit, 10));
  }

  @Get('compare')
  @AllowCache(60, 'public')
  @ApiOperation({ summary: 'Сравнение тарифов (публично)' })
  @ApiQuery({ name: 'ids', required: true, type: [String] })
  @ApiResponse({ status: HttpStatus.OK, type: [TariffResponseDto] })
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  async compareTariffs(@Query('ids', new ParseArrayPipe({ items: String, separator: ',' })) ids: string[]): Promise<TariffResponseDto[]> {
    if (ids.length > 5) {
      throw new BadRequestException('Можно сравнивать максимум 5 тарифов одновременно');
    }
    return this.tariffsService.compareTariffs(ids);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получение тарифа по ID (публично)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: HttpStatus.OK, type: TariffResponseDto })
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  async findOne(@Param('id') id: string): Promise<TariffResponseDto> {
    return this.tariffsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'platform_admin')
  @ApiOperation({ summary: 'Обновление тарифа' })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: UpdateTariffDto })
  @ApiResponse({ status: HttpStatus.OK, type: TariffResponseDto })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async update(@Param('id') id: string, @Body() updateTariffDto: UpdateTariffDto): Promise<TariffResponseDto> {
    return this.tariffsService.update(id, updateTariffDto);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'platform_admin')
  @ApiOperation({ summary: 'Изменение статуса тарифа' })
  @ApiParam({ name: 'id', type: String })
  @ApiQuery({ name: 'isActive', required: true, type: Boolean })
  @ApiResponse({ status: HttpStatus.OK, type: TariffResponseDto })
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  async setActive(@Param('id') id: string, @Query('isActive', ParseBoolPipe) isActive: boolean): Promise<TariffResponseDto> {
    return this.tariffsService.setActive(id, isActive);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('superadmin', 'platform_admin')
  @ApiOperation({ summary: '🚨 Удаление тарифа (платформенные роли)' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async remove(@Param('id') id: string): Promise<void> {
    return this.tariffsService.remove(id);
  }
}
