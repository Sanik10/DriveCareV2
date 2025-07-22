import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  DefaultValuePipe,
  ParseIntPipe,
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
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionDto } from './dto/request/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/request/update-subscription.dto';
import { SubscriptionResponseDto } from './dto/response/subscription-response.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { SubscriptionStatus } from './types/subscriptions.types';
import { SUBSCRIPTIONS_CONSTANTS } from './constants/subscriptions.constants';
import { AuthWithOwnership, CompanySubscriptions, SubscriptionResource } from '../../common';

@ApiTags('📋 Подписки компаний')
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post()
  @AuthWithOwnership() // 🔥 ИСПРАВЛЕНО - используем композитный guard
  @Roles('superadmin', 'admin')
  @ApiOperation({ 
    summary: 'Создание новой подписки',
    description: 'Создание новой подписки для компании. Автоматически деактивирует предыдущие активные подписки. Доступно администраторам и суперадмину.'
  })
  @ApiBody({
    type: CreateSubscriptionDto,
    description: 'Данные для создания подписки',
    examples: {
      standard: {
        summary: 'Стандартная подписка',
        description: 'Создание годовой подписки на тариф "Стандарт"',
        value: {
          companyId: '123e4567-e89b-12d3-a456-426614174000',
          tariffId: '456e7890-e89b-12d3-a456-426614174001',
          startDate: '2025-01-01T00:00:00.000Z',
          endDate: '2025-12-31T23:59:59.999Z',
          status: 'active',
          paymentMethod: 'bank_transfer',
          autoRenew: false
        }
      },
      monthly: {
        summary: 'Месячная подписка',
        description: 'Создание месячной подписки с автопродлением',
        value: {
          companyId: '123e4567-e89b-12d3-a456-426614174000',
          tariffId: '789e0123-e89b-12d3-a456-426614174002',
          endDate: '2025-02-01T00:00:00.000Z',
          autoRenew: true
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '✅ Подписка успешно создана',
    type: SubscriptionResponseDto,
  })
  @ApiConflictResponse({
    description: '❌ У компании уже есть активная подписка',
    example: { 
      statusCode: 409, 
      message: 'У компании уже есть активная подписка (ID: xxx)',
      error: 'Conflict'
    }
  })
  @ApiBadRequestResponse({
    description: '❌ Некорректные данные',
    example: {
      statusCode: 400,
      message: ['Дата окончания должна быть позже даты начала'],
      error: 'Bad Request'
    }
  })
  @ApiNotFoundResponse({
    description: '❌ Компания или тариф не найдены',
    example: {
      statusCode: 404,
      message: 'Компания с ID xxx не найдена',
      error: 'Not Found'
    }
  })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Недостаточно прав доступа' })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 10 в минуту)' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async create(@Body() createSubscriptionDto: CreateSubscriptionDto): Promise<SubscriptionResponseDto> {
    return this.subscriptionsService.create(createSubscriptionDto);
  }

  @Get('company/:companyId')
  @AuthWithOwnership() // 🔥 ИСПРАВЛЕНО - используем композитный guard
  @CompanySubscriptions() // 🔥 КРИТИЧНО! Проверяем доступ к подпискам компании
  @ApiOperation({ 
    summary: 'Получение подписок компании',
    description: 'Получение списка подписок конкретной компании с пагинацией и фильтрацией по статусу.'
  })
  @ApiParam({
    name: 'companyId',
    type: String,
    description: 'ID компании',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Номер страницы',
    example: 1
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Количество элементов на странице',
    example: 10
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: SubscriptionStatus,
    description: 'Фильтр по статусу подписки',
    example: SubscriptionStatus.ACTIVE
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '✅ Список подписок успешно получен',
    example: {
      items: [],
      total: 5,
      page: 1,
      limit: 10,
      totalPages: 1
    }
  })
  @ApiNotFoundResponse({ description: '❌ Компания не найдена' })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 50 в минуту)' })
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  async findByCompany(
    @Param('companyId') companyId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(SUBSCRIPTIONS_CONSTANTS.DEFAULTS.PAGE_SIZE), ParseIntPipe) limit: number,
    @Query('status') status?: SubscriptionStatus,
  ) {
    const safeLimit = Math.min(limit, SUBSCRIPTIONS_CONSTANTS.DEFAULTS.MAX_ITEMS);
    return this.subscriptionsService.findByCompany(companyId, page, safeLimit, status);
  }

  @Get('company/:companyId/active')
  @AuthWithOwnership() // 🔥 ИСПРАВЛЕНО - используем композитный guard
  @CompanySubscriptions() // 🔥 КРИТИЧНО! Проверяем доступ к подпискам компании
  @ApiOperation({ 
    summary: 'Получение активной подписки компании',
    description: 'Получение текущей активной подписки компании с информацией о тарифе и лимитах.'
  })
  @ApiParam({
    name: 'companyId',
    type: String,
    description: 'ID компании',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '✅ Активная подписка найдена',
    type: SubscriptionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '📭 У компании нет активной подписки',
    example: null
  })
  @ApiNotFoundResponse({ description: '❌ Компания не найдена' })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 100 в минуту)' })
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  async findActiveByCompany(@Param('companyId') companyId: string): Promise<SubscriptionResponseDto | null> {
    return this.subscriptionsService.findActiveByCompany(companyId);
  }

  @Get(':id')
  @AuthWithOwnership() // 🔥 ИСПРАВЛЕНО - используем композитный guard
  @SubscriptionResource() // 🔥 ДОБАВЛЕНО - проверяем принадлежность подписки
  @ApiOperation({ 
    summary: 'Получение подписки по ID',
    description: 'Получение детальной информации о подписке по её идентификатору.'
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'ID подписки',
    example: '789e0123-e89b-12d3-a456-426614174002'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '✅ Подписка найдена',
    type: SubscriptionResponseDto,
  })
  @ApiNotFoundResponse({
    description: '❌ Подписка не найдена',
    example: {
      statusCode: 404,
      message: 'Подписка с ID xxx не найдена',
      error: 'Not Found'
    }
  })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 50 в минуту)' })
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  async findOne(@Param('id') id: string): Promise<SubscriptionResponseDto> {
    return this.subscriptionsService.findOne(id);
  }

  @Patch(':id')
  @AuthWithOwnership() // 🔥 ИСПРАВЛЕНО - используем композитный guard
  @SubscriptionResource() // 🔥 ДОБАВЛЕНО - проверяем принадлежность подписки
  @Roles('superadmin', 'admin')
  @ApiOperation({ 
    summary: 'Обновление подписки',
    description: 'Обновление параметров подписки: тариф, дата окончания, статус, способ оплаты.'
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'ID подписки',
    example: '789e0123-e89b-12d3-a456-426614174002'
  })
  @ApiBody({
    type: UpdateSubscriptionDto,
    description: 'Данные для обновления подписки',
    examples: {
      extend: {
        summary: 'Продление подписки',
        description: 'Продление подписки на год',
        value: {
          endDate: '2026-12-31T23:59:59.999Z'
        }
      },
      changeTariff: {
        summary: 'Смена тарифа',
        description: 'Переход на другой тариф',
        value: {
          tariffId: '999e8888-e89b-12d3-a456-426614174003'
        }
      },
      suspend: {
        summary: 'Приостановка подписки',
        description: 'Временная приостановка подписки',
        value: {
          status: 'suspended',
          autoRenew: false
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '✅ Подписка успешно обновлена',
    type: SubscriptionResponseDto,
  })
  @ApiNotFoundResponse({ description: '❌ Подписка не найдена' })
  @ApiBadRequestResponse({ description: '❌ Некорректные данные или невозможный переход статуса' })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Недостаточно прав доступа' })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 20 в минуту)' })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async update(
    @Param('id') id: string,
    @Body() updateSubscriptionDto: UpdateSubscriptionDto,
  ): Promise<SubscriptionResponseDto> {
    return this.subscriptionsService.update(id, updateSubscriptionDto);
  }

  @Patch(':id/cancel')
  @AuthWithOwnership() // 🔥 ИСПРАВЛЕНО - используем композитный guard
  @SubscriptionResource() // 🔥 КРИТИЧНО! Проверяем принадлежность подписки
  @Roles('superadmin', 'admin', 'owner')
  @ApiOperation({ 
    summary: 'Отмена подписки',
    description: 'Отмена подписки компании. Устанавливает статус "canceled" и отключает автопродление.'
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'ID подписки',
    example: '789e0123-e89b-12d3-a456-426614174002'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '✅ Подписка успешно отменена',
    type: SubscriptionResponseDto,
  })
  @ApiNotFoundResponse({ description: '❌ Подписка не найдена' })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Недостаточно прав доступа' })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 10 в минуту)' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async cancel(@Param('id') id: string): Promise<SubscriptionResponseDto> {
    return this.subscriptionsService.cancel(id);
  }

  @Post('check-expired')
  @AuthWithOwnership() // 🔥 ИСПРАВЛЕНО - используем композитный guard
  @Roles('superadmin', 'admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: '⏰ CRON: Проверка истекших подписок',
    description: 'Служебный endpoint для проверки и обработки истекших подписок. Используется планировщиком задач.'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '✅ Проверка завершена',
    example: { processedCount: 5, message: 'Обработано истекших подписок: 5' }
  })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Доступно только администраторам' })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 5 в минуту)' })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async checkExpiredSubscriptions(): Promise<{ processedCount: number; message: string }> {
    const processedCount = await this.subscriptionsService.checkExpiredSubscriptions();
    return {
      processedCount,
      message: `Обработано истекших подписок: ${processedCount}`
    };
  }
}
