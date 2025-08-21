import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  DefaultValuePipe,
  ParseIntPipe,
  ParseUUIDPipe,
  ParseEnumPipe,
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
  ApiTooManyRequestsResponse,
  ApiBearerAuth,
  ApiHeader,
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
import { AuditLoggingInterceptor } from '../../common/interceptors/audit-logging.interceptor';
import { SecurityHeadersInterceptor } from '../../common/interceptors/security-headers.interceptor';
import { EnhancedValidationPipe } from '../../common/pipes/enhanced-validation.pipe';
import { RequestWithUser } from '../auth/interfaces/request-with-user.interface';

@ApiTags('📋 Подписки компаний')
@ApiBearerAuth()
@UseInterceptors(AuditLoggingInterceptor, SecurityHeadersInterceptor)
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Post()
  @AuthWithOwnership()
  @Roles('superadmin', 'platform_admin', 'company_owner', 'company_admin')
  @ApiOperation({
    summary: 'Создание новой подписки',
    description:
      'Создание новой подписки для компании. Новая подписка создаётся в статусе PENDING. Автоматически деактивирует предыдущие активные подписки.',
  })
  @ApiHeader({
    name: 'Idempotency-Key',
    required: false,
    description: 'Ключ идемпотентности для безопасных повторов запроса (1–128 символов)',
    schema: { type: 'string', minLength: 1, maxLength: 128 },
  })
  @ApiHeader({
    name: 'X-Idempotency-Key',
    required: false,
    description: 'Альтернативное имя заголовка идемпотентности',
    schema: { type: 'string', minLength: 1, maxLength: 128 },
  })
  @ApiBody({
    type: CreateSubscriptionDto,
    description: 'Данные для создания подписки',
    examples: {
      standard: {
        summary: 'Стандартная подписка',
        description: 'Создание годовой подписки на тариф "Стандарт"',
        value: {
          tariffId: '456e7890-e89b-12d3-a456-426614174001',
          startDate: '2025-01-01T00:00:00.000Z',
          endDate: '2025-12-31T23:59:59.999Z',
          paymentMethod: 'bank_transfer',
          autoRenew: false,
        },
      },
      monthly: {
        summary: 'Месячная подписка',
        description: 'Создание месячной подписки с автопродлением',
        value: {
          tariffId: '789e0123-e89b-12d3-a456-426614174002',
          endDate: '2025-02-01T00:00:00.000Z',
          autoRenew: true,
          paymentMethod: 'card',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '✅ Подписка успешно создана',
    type: SubscriptionResponseDto,
  })
  @ApiConflictResponse({ description: '❌ Конфликт активной подписки' })
  @ApiBadRequestResponse({ description: '❌ Некорректные данные' })
  @ApiNotFoundResponse({ description: '❌ Компания или тариф не найдены' })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Недостаточно прав доступа' })
  @ApiTooManyRequestsResponse({
    description: `⚠️ Слишком много запросов (лимит: ${SUBSCRIPTIONS_CONSTANTS.RATE_LIMITS.CREATE.limit} в минуту)`,
  })
  @Throttle({ default: { limit: SUBSCRIPTIONS_CONSTANTS.RATE_LIMITS.CREATE.limit, ttl: SUBSCRIPTIONS_CONSTANTS.RATE_LIMITS.CREATE.ttlSec * 1000 } })
  async create(
    @Body(EnhancedValidationPipe) createSubscriptionDto: CreateSubscriptionDto,
    @Req() req: RequestWithUser,
  ): Promise<SubscriptionResponseDto> {
    const dto = { ...createSubscriptionDto, companyId: req.user.companyId! };
    const idempotencyKey =
      (req.headers['idempotency-key'] as string) ||
      (req.headers['x-idempotency-key'] as string) ||
      undefined;

    return this.subscriptionsService.create(dto, idempotencyKey);
  }

  @Get('company/:companyId')
  @AuthWithOwnership()
  @CompanySubscriptions()
  @ApiOperation({
    summary: 'Получение подписок компании',
    description: 'Получение списка подписок конкретной компании с пагинацией и фильтрацией по статусу.',
  })
  @ApiParam({ name: 'companyId', type: String, description: 'ID компании', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Номер страницы', example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Количество элементов на странице', example: 10 })
  @ApiQuery({ name: 'status', required: false, enum: SubscriptionStatus, description: 'Фильтр по статусу подписки', example: SubscriptionStatus.ACTIVE })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '✅ Список подписок успешно получен',
    example: { items: [], total: 5, page: 1, limit: 10, totalPages: 1 },
  })
  @ApiNotFoundResponse({ description: '❌ Компания не найдена' })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiTooManyRequestsResponse({
    description: `⚠️ Слишком много запросов (лимит: ${SUBSCRIPTIONS_CONSTANTS.RATE_LIMITS.LIST.limit} в минуту)`,
  })
  @Throttle({ default: { limit: SUBSCRIPTIONS_CONSTANTS.RATE_LIMITS.LIST.limit, ttl: SUBSCRIPTIONS_CONSTANTS.RATE_LIMITS.LIST.ttlSec * 1000 } })
  async findByCompany(
    @Param('companyId', ParseUUIDPipe) companyId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(SUBSCRIPTIONS_CONSTANTS.DEFAULTS.PAGE_SIZE), ParseIntPipe) limit: number,
    @Query('status', new ParseEnumPipe(SubscriptionStatus, { optional: true })) status?: SubscriptionStatus,
  ) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), SUBSCRIPTIONS_CONSTANTS.DEFAULTS.MAX_ITEMS);
    return this.subscriptionsService.findByCompany(companyId, safePage, safeLimit, status);
  }

  @Get('company/:companyId/active')
  @AuthWithOwnership()
  @CompanySubscriptions()
  @ApiOperation({
    summary: 'Получение активной подписки компании',
    description: 'Получение текущей активной подписки компании с информацией о тарифе и лимитах.',
  })
  @ApiParam({ name: 'companyId', type: String, description: 'ID компании', example: '123e4567-e89b-12d3-a456-426614174000' })
  @ApiResponse({ status: HttpStatus.OK, description: '✅ Активная подписка найдена', type: SubscriptionResponseDto })
  @ApiResponse({ status: HttpStatus.OK, description: '📭 У компании нет активной подписки', example: null })
  @ApiNotFoundResponse({ description: '❌ Компания не найдена' })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiTooManyRequestsResponse({
    description: `⚠️ Слишком много запросов (лимит: ${SUBSCRIPTIONS_CONSTANTS.RATE_LIMITS.GET_ACTIVE.limit} в минуту)`,
  })
  @Throttle({ default: { limit: SUBSCRIPTIONS_CONSTANTS.RATE_LIMITS.GET_ACTIVE.limit, ttl: SUBSCRIPTIONS_CONSTANTS.RATE_LIMITS.GET_ACTIVE.ttlSec * 1000 } })
  async findActiveByCompany(@Param('companyId', ParseUUIDPipe) companyId: string): Promise<SubscriptionResponseDto | null> {
    return this.subscriptionsService.findActiveByCompany(companyId);
  }

  @Get(':id')
  @AuthWithOwnership()
  @SubscriptionResource()
  @Roles('superadmin', 'platform_admin', 'company_owner', 'company_admin', 'cashier', 'auditor')
  @ApiOperation({ summary: 'Получение подписки по ID', description: 'Получение детальной информации о подписке по её идентификатору.' })
  @ApiParam({ name: 'id', type: String, description: 'ID подписки', example: '789e0123-e89b-12d3-a456-426614174002' })
  @ApiResponse({ status: HttpStatus.OK, description: '✅ Подписка найдена', type: SubscriptionResponseDto })
  @ApiNotFoundResponse({ description: '❌ Подписка не найдена' })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiTooManyRequestsResponse({
    description: `⚠️ Слишком много запросов (лимит: ${SUBSCRIPTIONS_CONSTANTS.RATE_LIMITS.LIST.limit} в минуту)`,
  })
  @Throttle({ default: { limit: SUBSCRIPTIONS_CONSTANTS.RATE_LIMITS.LIST.limit, ttl: SUBSCRIPTIONS_CONSTANTS.RATE_LIMITS.LIST.ttlSec * 1000 } })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<SubscriptionResponseDto> {
    return this.subscriptionsService.findOne(id);
  }

  @Patch(':id')
  @AuthWithOwnership()
  @SubscriptionResource()
  @Roles('superadmin', 'platform_admin', 'company_owner')
  @ApiOperation({ summary: 'Обновление подписки', description: 'Обновление параметров подписки: тариф, дата окончания, статус, способ оплаты.' })
  @ApiParam({ name: 'id', type: String, description: 'ID подписки', example: '789e0123-e89b-12d3-a456-426614174002' })
  @ApiBody({ type: UpdateSubscriptionDto, description: 'Данные для обновления подписки' })
  @ApiResponse({ status: HttpStatus.OK, description: '✅ Подписка успешно обновлена', type: SubscriptionResponseDto })
  @ApiNotFoundResponse({ description: '❌ Подписка не найдена' })
  @ApiBadRequestResponse({ description: '❌ Некорректные данные или невозможный переход статуса' })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Недостаточно прав доступа' })
  @ApiTooManyRequestsResponse({
    description: `⚠️ Слишком много запросов (лимит: ${SUBSCRIPTIONS_CONSTANTS.RATE_LIMITS.UPDATE.limit} в минуту)`,
  })
  @Throttle({ default: { limit: SUBSCRIPTIONS_CONSTANTS.RATE_LIMITS.UPDATE.limit, ttl: SUBSCRIPTIONS_CONSTANTS.RATE_LIMITS.UPDATE.ttlSec * 1000 } })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(EnhancedValidationPipe) updateSubscriptionDto: UpdateSubscriptionDto,
  ): Promise<SubscriptionResponseDto> {
    return this.subscriptionsService.update(id, updateSubscriptionDto);
  }

  @Patch(':id/cancel')
  @AuthWithOwnership()
  @SubscriptionResource()
  @Roles('superadmin', 'platform_admin', 'company_owner')
  @ApiOperation({
    summary: 'Отмена подписки',
    description: 'Отмена подписки компании. Устанавливает статус "canceled" и отключает автопродление.',
  })
  @ApiParam({ name: 'id', type: String, description: 'ID подписки', example: '789e0123-e89b-12d3-a456-426614174002' })
  @ApiResponse({ status: HttpStatus.OK, description: '✅ Подписка успешно отменена', type: SubscriptionResponseDto })
  @ApiNotFoundResponse({ description: '❌ Подписка не найдена' })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Недостаточно прав доступа' })
  @ApiTooManyRequestsResponse({
    description: `⚠️ Слишком много запросов (лимит: ${SUBSCRIPTIONS_CONSTANTS.RATE_LIMITS.CANCEL.limit} в минуту)`,
  })
  @Throttle({ default: { limit: SUBSCRIPTIONS_CONSTANTS.RATE_LIMITS.CANCEL.limit, ttl: SUBSCRIPTIONS_CONSTANTS.RATE_LIMITS.CANCEL.ttlSec * 1000 } })
  async cancel(@Param('id', ParseUUIDPipe) id: string): Promise<SubscriptionResponseDto> {
    return this.subscriptionsService.cancel(id);
  }

  @Post('check-expired')
  @AuthWithOwnership()
  @Roles('superadmin', 'platform_admin', 'system_operator')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '⏰ CRON: Проверка истекших подписок',
    description: 'Служебный endpoint для проверки и обработки истекших подписок. Используется планировщиком задач.',
  })
  @ApiResponse({ status: HttpStatus.OK, description: '✅ Проверка завершена', example: { processedCount: 5, message: 'Обработано истекших подписок: 5' } })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Доступно только администраторам' })
  @ApiTooManyRequestsResponse({
    description: `⚠️ Слишком много запросов (лимит: ${SUBSCRIPTIONS_CONSTANTS.RATE_LIMITS.CRON.limit} в минуту)`,
  })
  @Throttle({ default: { limit: SUBSCRIPTIONS_CONSTANTS.RATE_LIMITS.CRON.limit, ttl: SUBSCRIPTIONS_CONSTANTS.RATE_LIMITS.CRON.ttlSec * 1000 } })
  async checkExpiredSubscriptions(): Promise<{ processedCount: number; message: string }> {
    const processedCount = await this.subscriptionsService.checkExpiredSubscriptions();
    return { processedCount, message: `Обработано истекших подписок: ${processedCount}` };
  }
}
