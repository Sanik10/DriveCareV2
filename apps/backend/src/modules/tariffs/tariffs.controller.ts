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
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiBadRequestResponse,
  ApiTooManyRequestsResponse,
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
  @ApiBody({
    type: CreateTariffDto,
    description: 'Данные для создания тарифа (цены в рублях с точностью до копеек)',
    examples: {
      basic: {
        summary: 'Базовый тариф',
        description: 'Простой тариф для малых автосервисов',
        value: {
          name: 'Базовый',
          description: 'Идеальный выбор для небольших автосервисов',
          priceMonthly: 1000,
          priceYearly: 10000,
          maxUsers: 3,
          maxCustomers: 50,
          maxVehicles: 100,
          maxOrders: 200,
          features: {
            reports: false,
            analytics: false,
            api_access: false,
            priority_support: false,
            custom_fields: false,
          },
          isActive: true,
        },
      },
      premium: {
        summary: 'Премиум тариф',
        description: 'Безлимитный тариф для крупных автосервисов',
        value: {
          name: 'Премиум',
          description: 'Максимальные возможности для крупного бизнеса',
          priceMonthly: 5000,
          priceYearly: 50000,
          maxUsers: null,
          maxCustomers: null,
          maxVehicles: null,
          maxOrders: null,
          features: {
            reports: true,
            analytics: true,
            api_access: true,
            priority_support: true,
            custom_fields: true,
            integrations: true,
            white_label: true,
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '✅ Тариф успешно создан',
    type: TariffResponseDto,
  })
  @ApiConflictResponse({
    description: '❌ Тариф с таким названием уже существует',
    example: {
      statusCode: 409,
      message: 'Тариф с названием "Базовый" уже существует',
      error: 'Conflict',
    },
  })
  @ApiBadRequestResponse({
    description: '❌ Некорректные данные валидации',
    example: {
      statusCode: 400,
      message: ['Годовая цена должна предоставлять скидку минимум 1%'],
      error: 'Bad Request',
    },
  })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Недостаточно прав доступа' })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 10 в минуту)' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async create(@Body() createTariffDto: CreateTariffDto): Promise<TariffResponseDto> {
    return this.tariffsService.create(createTariffDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Получение списка тарифов с фильтрацией',
    description: 'Получение списка всех тарифов с возможностью фильтрации по статусу, цене и поиску.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Поиск по названию или описанию',
    example: 'стандарт',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Фильтр по статусу активности',
    example: true,
  })
  @ApiQuery({
    name: 'minPrice',
    required: false,
    type: Number,
    description: 'Минимальная цена в рублях (месячная)',
    example: 1000,
  })
  @ApiQuery({
    name: 'maxPrice',
    required: false,
    type: Number,
    description: 'Максимальная цена в рублях (месячная)',
    example: 5000,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Номер страницы',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Количество элементов на странице',
    example: 20,
  })
  @ApiQuery({
    name: 'sortField',
    required: false,
    enum: ['name', 'priceMonthly', 'priceYearly', 'createdAt'],
    description: 'Поле для сортировки',
    example: 'priceMonthly',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['asc', 'desc'],
    description: 'Порядок сортировки',
    example: 'asc',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '✅ Список тарифов успешно получен',
    example: {
      items: [],
      total: 3,
      page: 1,
      limit: 20,
      totalPages: 1,
    },
  })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 100 в минуту)' })
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  async findAll(
    @Query('search') search?: string,
    @Query('isActive', new DefaultValuePipe(undefined), ParseBoolPipe) isActive?: boolean,
    @Query('minPrice', new DefaultValuePipe(undefined), ParseFloatPipe) minPrice?: number,
    @Query('maxPrice', new DefaultValuePipe(undefined), ParseFloatPipe) maxPrice?: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(TARIFFS_CONSTANTS.DEFAULTS.PAGE_SIZE), ParseIntPipe) limit?: number,
    @Query('sortField', new DefaultValuePipe('priceMonthly')) sortField?: string,
    @Query('sortOrder', new DefaultValuePipe('asc')) sortOrder?: 'asc' | 'desc',
  ) {
    const filter: TariffFilter = {
      search: (search || '').trim() || undefined,
      isActive,
      minPrice,
      maxPrice,
      page,
      limit: Math.min(limit || TARIFFS_CONSTANTS.DEFAULTS.PAGE_SIZE, TARIFFS_CONSTANTS.DEFAULTS.MAX_ITEMS),
      sortField: sortField as any,
      sortOrder: sortOrder === 'desc' ? 'desc' : 'asc',
    };

    return this.tariffsService.findAll(filter);
  }

  @Get('active')
  @ApiOperation({
    summary: 'Получение активных тарифов',
    description: 'Получение списка только активных тарифов для публичного отображения.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '✅ Активные тарифы успешно получены',
    type: [TariffResponseDto],
  })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 200 в минуту)' })
  @Throttle({ default: { limit: 200, ttl: 60000 } })
  async findActive(): Promise<TariffResponseDto[]> {
    return this.tariffsService.findActive();
  }

  @Get('popular')
  @ApiOperation({
    summary: 'Получение популярных тарифов',
    description: 'Получение списка популярных тарифов (по количеству подписок).',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Количество тарифов',
    example: 3,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '✅ Популярные тарифы получены',
    type: [TariffResponseDto],
  })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 100 в минуту)' })
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  async getPopular(@Query('limit', new DefaultValuePipe(5), ParseIntPipe) limit: number): Promise<TariffResponseDto[]> {
    return this.tariffsService.getPopular(Math.min(limit, 10));
  }

  @Get('compare')
  @ApiOperation({
    summary: 'Сравнение тарифов',
    description: 'Получение данных для сравнения нескольких тарифов.',
  })
  @ApiQuery({
    name: 'ids',
    required: true,
    type: [String],
    description: 'Массив ID тарифов для сравнения',
    example: ['456e7890-e89b-12d3-a456-426614174001', '456e7890-e89b-12d3-a456-426614174002'],
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '✅ Данные для сравнения получены',
    type: [TariffResponseDto],
  })
  @ApiBadRequestResponse({ description: '❌ Некорректные ID тарифов' })
  @ApiNotFoundResponse({ description: '❌ Один или несколько тарифов не найдены' })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 50 в минуту)' })
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  async compareTariffs(@Query('ids', new ParseArrayPipe({ items: String, separator: ',' })) ids: string[]): Promise<TariffResponseDto[]> {
    if (ids.length > 5) {
      throw new BadRequestException('Можно сравнивать максимум 5 тарифов одновременно');
    }
    return this.tariffsService.compareTariffs(ids);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Получение тарифа по ID',
    description: 'Получение детальной информации о тарифе по его идентификатору.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'ID тарифа',
    example: '456e7890-e89b-12d3-a456-426614174001',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '✅ Тариф найден',
    type: TariffResponseDto,
  })
  @ApiNotFoundResponse({
    description: '❌ Тариф не найден',
    example: {
      statusCode: 404,
      message: 'Тариф с ID xxx не найден',
      error: 'Not Found',
    },
  })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 100 в минуту)' })
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  async findOne(@Param('id') id: string): Promise<TariffResponseDto> {
    return this.tariffsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'platform_admin')
  @ApiOperation({
    summary: 'Обновление тарифа',
    description: 'Обновление параметров тарифного плана: цены, лимиты, возможности.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'ID тарифа',
    example: '456e7890-e89b-12d3-a456-426614174001',
  })
  @ApiBody({
    type: UpdateTariffDto,
    description: 'Данные для обновления тарифа (цены в рублях)',
    examples: {
      priceUpdate: {
        summary: 'Изменение цен',
        description: 'Обновление месячной и годовой цены',
        value: {
          priceMonthly: 2500,
          priceYearly: 25000,
        },
      },
      limitsUpdate: {
        summary: 'Изменение лимитов',
        description: 'Увеличение лимитов тарифа',
        value: {
          maxUsers: 15,
          maxCustomers: 300,
          maxVehicles: 800,
        },
      },
      featuresUpdate: {
        summary: 'Добавление возможностей',
        description: 'Включение дополнительных features',
        value: {
          features: {
            reports: true,
            analytics: true,
            priority_support: true,
          },
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '✅ Тариф успешно обновлен',
    type: TariffResponseDto,
  })
  @ApiNotFoundResponse({ description: '❌ Тариф не найден' })
  @ApiConflictResponse({ description: '❌ Название уже используется другим тарифом' })
  @ApiBadRequestResponse({ description: '❌ Некорректные данные валидации' })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Недостаточно прав доступа' })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 20 в минуту)' })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async update(@Param('id') id: string, @Body() updateTariffDto: UpdateTariffDto): Promise<TariffResponseDto> {
    return this.tariffsService.update(id, updateTariffDto);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin', 'platform_admin')
  @ApiOperation({
    summary: 'Изменение статуса тарифа',
    description: 'Активация или деактивация тарифного плана.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'ID тарифа',
    example: '456e7890-e89b-12d3-a456-426614174001',
  })
  @ApiQuery({
    name: 'isActive',
    required: true,
    type: Boolean,
    description: 'Новый статус тарифа',
    example: false,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '✅ Статус тарифа изменен',
    type: TariffResponseDto,
  })
  @ApiNotFoundResponse({ description: '❌ Тариф не найден' })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Недостаточно прав доступа' })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 15 в минуту)' })
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  async setActive(@Param('id') id: string, @Query('isActive', ParseBoolPipe) isActive: boolean): Promise<TariffResponseDto> {
    return this.tariffsService.setActive(id, isActive);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('superadmin', 'platform_admin')
  @ApiOperation({
    summary: '🚨 Удаление тарифа (платформенные роли)',
    description: 'Полное удаление тарифного плана. Возможно только если нет активных подписок и тариф деактивирован.',
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'ID тарифа',
    example: '456e7890-e89b-12d3-a456-426614174001',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: '✅ Тариф успешно удален',
  })
  @ApiNotFoundResponse({ description: '❌ Тариф не найден' })
  @ApiBadRequestResponse({ description: '❌ Нельзя удалить тариф с активными подписками или активный тариф' })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Доступно только платформенным ролям' })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 5 в минуту)' })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async remove(@Param('id') id: string): Promise<void> {
    return this.tariffsService.remove(id);
  }
}
