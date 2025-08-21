// src/modules/payments/payments.controller.ts (✅ SECURITY GUARDS ADDED)

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UsePipes,
  Request,
  Logger,
  ParseUUIDPipe,
  HttpStatus,
  HttpCode,
  DefaultValuePipe,
  ParseIntPipe,
  ParseBoolPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiBearerAuth,
  ApiSecurity,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiBadRequestResponse,
  ApiTooManyRequestsResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CompanyOwnershipGuard } from '../../common/guards/company-ownership.guard';
// ✅ ДОБАВЛЕНЫ SECURITY INTERCEPTORS И PIPES
import { AuditLoggingInterceptor } from '../../common/interceptors/audit-logging.interceptor';
import { EnhancedValidationPipe } from '../../common/pipes/enhanced-validation.pipe';
import { PaymentsService } from './payments.service';
import { RecordPaymentDto } from './dto/request/record-payment.dto';
import { RefundPaymentDto } from './dto/request/refund-payment.dto';
import { UpdatePaymentDto } from './dto/request/update-payment.dto';
import { PaymentResponseDto } from './dto/response/payment-response.dto';
import { PaginatedPaymentsResponseDto } from './dto/response/paginated-payments-response.dto';
import { PaymentStatisticsDto } from './dto/response/payment-statistics.dto';
import { CompanyBalanceDto } from './dto/response/company-balance.dto';
import { PaymentFilter, PaymentStatus } from './types/payments.types';
import { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { PAYMENTS_CONSTANTS } from './constants/payments.constants';

@ApiTags('💳 Управление платежами')
@ApiBearerAuth()
@ApiSecurity('JWT')
@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard, CompanyOwnershipGuard)
// ✅ ДОБАВЛЕНЫ ГЛОБАЛЬНЫЕ SECURITY INTERCEPTORS И PIPES
@UseInterceptors(AuditLoggingInterceptor)
@UsePipes(EnhancedValidationPipe)
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * 💰 Запись платежа
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(...PAYMENTS_CONSTANTS.ROLES.CAN_RECORD_PAYMENT)
  @ApiOperation({ 
    summary: 'Записать новый платеж',
    description: `
    🎯 **ОСНОВНАЯ ОПЕРАЦИЯ** - Создание нового платежа в системе с полной валидацией и аудитом.
    
    **Возможности:**
    • 💰 Запись платежей по счетам (инвойсам)
    • 💱 Поддержка мультивалютности с курсами обмена
    • 🔒 Автоматическая валидация лимитов и принадлежности
    • 📊 Интеграция с платежными системами
    • 🎭 Различные способы оплаты (наличные, карты, переводы)
    • 📋 Автоматическое обновление статуса счета
    
    **Роли:** company_admin, manager, company_owner, superadmin
    **Лимиты:** 50 платежей в час на компанию
    `
  })
  @ApiBody({
    type: RecordPaymentDto,
    description: 'Данные для записи платежа',
    examples: {
      cashPayment: {
        summary: '💵 Наличная оплата',
        description: 'Простая оплата наличными деньгами',
        value: {
          invoiceId: '123e4567-e89b-12d3-a456-426614174000',
          paymentMethodId: '789e4567-e89b-12d3-a456-426614174000',
          amount: 15000.00,
          currency: 'RUB',
          transactionId: 'CASH-2024-001',
          notes: 'Оплата за ремонт двигателя наличными'
        }
      },
      cardPayment: {
        summary: '💳 Оплата картой',
        description: 'Оплата банковской картой через эквайринг',
        value: {
          invoiceId: '123e4567-e89b-12d3-a456-426614174000',
          paymentMethodId: '789e4567-e89b-12d3-a456-426614174000',
          amount: 25000.00,
          currency: 'RUB',
          transactionId: 'CARD-2024-00123',
          gatewayTransactionId: 'sberbank_acq_tr_456789',
          gatewayFee: 375.00,
          gatewayResponse: {
            status: 'approved',
            authCode: 'ABC123',
            rrn: '123456789012'
          },
          notes: 'Оплата картой Visa **** 1234'
        }
      },
      currencyExchange: {
        summary: '💱 Валютная оплата',
        description: 'Оплата в иностранной валюте с конвертацией',
        value: {
          invoiceId: '123e4567-e89b-12d3-a456-426614174000',
          paymentMethodId: '789e4567-e89b-12d3-a456-426614174000',
          amount: 25000.00,
          currency: 'RUB',
          originalAmount: 250.00,
          originalCurrency: 'USD',
          exchangeRate: 100.00,
          transactionId: 'USD-CONV-2024-001',
          notes: 'Оплата $250 по курсу 100₽/$'
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '✅ Платеж успешно записан и обработан',
    type: PaymentResponseDto,
  })
  @ApiBadRequestResponse({
    description: '❌ Некорректные данные платежа',
    example: {
      statusCode: 400,
      message: [
        'Сумма платежа должна быть больше 0.01',
        'ID счета обязателен',
        'Способ оплаты не найден'
      ],
      error: 'Bad Request'
    }
  })
  @ApiConflictResponse({
    description: '❌ Конфликт данных',
    example: {
      statusCode: 409,
      message: 'ID транзакции CASH-2024-001 уже существует',
      error: 'Conflict'
    }
  })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ 
    description: '❌ Недостаточно прав или превышены лимиты подписки',
    example: {
      statusCode: 403,
      message: 'Превышен лимит платежей: 1500/1500',
      error: 'Forbidden'
    }
  })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 50 в час)' })
  @Throttle({ default: { limit: 50, ttl: 3600000 } })
  async recordPayment(
    @Body() recordPaymentDto: RecordPaymentDto,
    @Request() req: RequestWithUser,
  ): Promise<PaymentResponseDto> {
    this.logger.log(`Recording payment for company ${req.user.companyId}`);
    
    return this.paymentsService.recordPayment(recordPaymentDto, req.user);
  }

  /**
   * 📋 Получение всех платежей компании
   */
  @Get()
  @Roles(...PAYMENTS_CONSTANTS.ROLES.CAN_VIEW_PAYMENT_HISTORY)
  @ApiOperation({ 
    summary: 'Получить список платежей',
    description: `
    📊 **АНАЛИЗ ПЛАТЕЖЕЙ** - Получение списка платежей компании с мощными возможностями фильтрации.
    
    **Возможности фильтрации:**
    • 🔍 Поиск по ID транзакции, примечаниям
    • 📅 Фильтрация по датам (период)
    • 💰 Фильтрация по сумме (диапазон)
    • 📊 Фильтрация по статусу платежа
    • 💳 Фильтрация по способу оплаты
    • 📋 Фильтрация по счету (invoice)
    
    **Сортировка:** по дате, сумме, статусу, создания
    **Пагинация:** до 100 элементов на страницу
    **Роли:** company_admin, manager, company_owner, superadmin
    `
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
    description: 'Количество элементов на странице (максимум 100)',
    example: 20
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: PaymentStatus,
    description: 'Фильтр по статусу платежа',
    example: PaymentStatus.PROCESSED
  })
  @ApiQuery({
    name: 'invoiceId',
    required: false,
    type: String,
    description: 'Фильтр по ID счета',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiQuery({
    name: 'paymentMethodId',
    required: false,
    type: String,
    description: 'Фильтр по способу оплаты',
    example: '789e4567-e89b-12d3-a456-426614174000'
  })
  @ApiQuery({
    name: 'amountFrom',
    required: false,
    type: Number,
    description: 'Минимальная сумма платежа',
    example: 1000
  })
  @ApiQuery({
    name: 'amountTo',
    required: false,
    type: Number,
    description: 'Максимальная сумма платежа',
    example: 50000
  })
  @ApiQuery({
    name: 'dateFrom',
    required: false,
    type: String,
    description: 'Дата начала периода (ISO 8601)',
    example: '2024-01-01'
  })
  @ApiQuery({
    name: 'dateTo',
    required: false,
    type: String,
    description: 'Дата окончания периода (ISO 8601)',
    example: '2024-12-31'
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Поиск по ID транзакции, примечаниям или gateway ID',
    example: 'CASH-2024'
  })
  @ApiQuery({
    name: 'sortField',
    required: false,
    enum: ['paymentDate', 'amount', 'status', 'createdAt'],
    description: 'Поле для сортировки',
    example: 'paymentDate'
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['asc', 'desc'],
    description: 'Порядок сортировки',
    example: 'desc'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '✅ Список платежей успешно получен',
    type: PaginatedPaymentsResponseDto,
  })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Недостаточно прав доступа' })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 100 в минуту)' })
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  async getPayments(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Request() req: RequestWithUser,
    @Query('status') status?: PaymentStatus,
    @Query('invoiceId') invoiceId?: string,
    @Query('paymentMethodId') paymentMethodId?: string,
    @Query('amountFrom') amountFrom?: number,
    @Query('amountTo') amountTo?: number,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('search') search?: string,
    @Query('sortField', new DefaultValuePipe('paymentDate')) sortField: string = 'paymentDate',
    @Query('sortOrder', new DefaultValuePipe('desc')) sortOrder: 'asc' | 'desc' = 'desc',
  ): Promise<PaginatedPaymentsResponseDto> {
    this.logger.log(`Getting payments for company ${req.user.companyId}`);
    
    const filter: PaymentFilter = {
      page,
      limit: Math.min(limit, PAYMENTS_CONSTANTS.DEFAULTS.MAX_ITEMS),
      status,
      invoiceId,
      paymentMethodId,
      amountFrom,
      amountTo,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      search,
      sortField,
      sortOrder,
      companyId: req.user.companyId,
    };

    return this.paymentsService.getPayments(filter);
  }

  /**
   * 🔍 Получение платежа по ID
   */
  @Get(':id')
  @Roles(...PAYMENTS_CONSTANTS.ROLES.CAN_VIEW_PAYMENT_HISTORY)
  @ApiOperation({ 
    summary: 'Получить детали платежа',
    description: `
    🔍 **ДЕТАЛЬНАЯ ИНФОРМАЦИЯ** - Получение полной информации о конкретном платеже.
    
    **Включает:**
    • 💰 Основные данные платежа (сумма, валюта, статус)
    • 📋 Связанный счет (invoice) и заказ
    • 💳 Информация о способе оплаты
    • 🌐 Данные платежного шлюза (безопасные)
    • 📊 История изменений статуса
    • 💱 Данные валютного обмена (если применимо)
    
    **Безопасность:** Автоматическая проверка принадлежности к компании
    `
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Уникальный идентификатор платежа',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '✅ Платеж найден и возвращен',
    type: PaymentResponseDto,
  })
  @ApiNotFoundResponse({
    description: '❌ Платеж не найден',
    example: {
      statusCode: 404,
      message: 'Payment with ID 123e4567-e89b-12d3-a456-426614174000 not found',
      error: 'Not Found'
    }
  })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Платеж не принадлежит вашей компании' })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 200 в минуту)' })
  @Throttle({ default: { limit: 200, ttl: 60000 } })
  async getPaymentById(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: RequestWithUser,
  ): Promise<PaymentResponseDto> {
    this.logger.log(`Getting payment ${id} for company ${req.user.companyId}`);
    
    return this.paymentsService.getPaymentById(id, req.user);
  }

  /**
   * ✏️ Обновление платежа
   */
  @Put(':id')
  @Roles(...PAYMENTS_CONSTANTS.ROLES.CAN_PROCESS_PAYMENT)
  @ApiOperation({ 
    summary: 'Обновить платеж',
    description: `
    ✏️ **УПРАВЛЕНИЕ ПЛАТЕЖАМИ** - Обновление информации о платеже с бизнес-логикой.
    
    **Возможности обновления:**
    • 📊 Изменение статуса (с валидацией переходов)
    • 🔍 Обновление ID транзакции
    • 📝 Редактирование примечаний
    • 🌐 Обновление данных платежного шлюза
    • 📋 Изменение безопасных метаданных
    
    **Ограничения:**
    • Финальные статусы (processed, refunded) имеют ограниченные возможности изменения
    • Автоматическая валидация переходов между статусами
    • Аудит всех изменений
    
    **Роли:** company_admin, manager, company_owner, superadmin
    `
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Уникальный идентификатор платежа',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiBody({
    type: UpdatePaymentDto,
    description: 'Данные для обновления платежа',
    examples: {
      statusUpdate: {
        summary: '📊 Изменение статуса',
        description: 'Обновление статуса платежа',
        value: {
          status: 'processed',
          notes: 'Платеж подтвержден банком'
        }
      },
      gatewayUpdate: {
        summary: '🌐 Обновление данных шлюза',
        description: 'Добавление информации от платежного шлюза',
        value: {
          gatewayTransactionId: 'sberbank_12345',
          gatewayFee: 150.00
        }
      },
      notesUpdate: {
        summary: '📝 Обновление примечаний',
        description: 'Добавление дополнительной информации',
        value: {
          notes: 'Платеж обработан вручную после технических проблем'
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '✅ Платеж успешно обновлен',
    type: PaymentResponseDto,
  })
  @ApiNotFoundResponse({ description: '❌ Платеж не найден' })
  @ApiBadRequestResponse({
    description: '❌ Некорректные данные или невозможный переход статуса',
    example: {
      statusCode: 400,
      message: 'Cannot change payment status from processed to pending',
      error: 'Bad Request'
    }
  })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Недостаточно прав доступа' })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 30 в минуту)' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async updatePayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePaymentDto: UpdatePaymentDto,
    @Request() req: RequestWithUser,
  ): Promise<PaymentResponseDto> {
    this.logger.log(`Updating payment ${id} for company ${req.user.companyId}`);
    
    return this.paymentsService.updatePayment(id, updatePaymentDto, req.user);
  }

  /**
   * 🔄 Возврат платежа
   */
  @Post(':id/refund')
  @Roles(...PAYMENTS_CONSTANTS.ROLES.CAN_REFUND_PAYMENT)
  @ApiOperation({ 
    summary: 'Оформить возврат платежа',
    description: `
    🔄 **ВОЗВРАТ СРЕДСТВ** - Полный или частичный возврат платежа с соблюдением бизнес-правил.
    
    **Типы возвратов:**
    • 💯 Полный возврат (100% суммы)
    • ⚡ Частичный возврат (часть суммы)
    • 🔄 Возврат на другой платежный метод
    
    **Ограничения:**
    • Возврат только обработанных платежей (status: processed)
    • Максимальный срок возврата: ${PAYMENTS_CONSTANTS.DEFAULTS.MAX_REFUND_DAYS} дней
    • Крупные возвраты требуют подтверждения владельца
    
    **Роли:** company_admin, company_owner, superadmin (НЕ manager/mechanic)
    `
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Уникальный идентификатор платежа для возврата',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiBody({
    type: RefundPaymentDto,
    description: 'Данные для оформления возврата',
    examples: {
      fullRefund: {
        summary: '💯 Полный возврат',
        description: 'Возврат полной суммы платежа',
        value: {
          amount: 15000.00,
          reason: 'Отказ от услуги по инициативе клиента',
          notes: 'Клиент передумал делать ремонт'
        }
      },
      partialRefund: {
        summary: '⚡ Частичный возврат',
        description: 'Возврат части суммы',
        value: {
          amount: 5000.00,
          reason: 'Некачественное выполнение работ',
          notes: 'Возврат за невыполненную покраску',
          refundMethodId: '789e4567-e89b-12d3-a456-426614174001'
        }
      },
      disputeRefund: {
        summary: '⚖️ Возврат по спору',
        description: 'Возврат в результате разрешения спора',
        value: {
          amount: 12000.00,
          reason: 'Решение по спору с клиентом',
          notes: 'Возврат согласно решению арбитража'
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '✅ Возврат успешно обработан',
    type: PaymentResponseDto,
  })
  @ApiNotFoundResponse({ description: '❌ Платеж не найден' })
  @ApiBadRequestResponse({
    description: '❌ Невозможно выполнить возврат',
    example: {
      statusCode: 400,
      message: 'Cannot refund payment older than 365 days. Payment is 400 days old.',
      error: 'Bad Request'
    }
  })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ 
    description: '❌ Недостаточно прав или требуется подтверждение владельца',
    example: {
      statusCode: 403,
      message: 'Large refunds require owner or admin approval',
      error: 'Forbidden'
    }
  })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 10 в час)' })
  @Throttle({ default: { limit: 10, ttl: 3600000 } })
  async refundPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() refundPaymentDto: RefundPaymentDto,
    @Request() req: RequestWithUser,
  ): Promise<PaymentResponseDto> {
    this.logger.log(`Processing refund for payment ${id}, company ${req.user.companyId}`);
    
    return this.paymentsService.refundPayment(id, refundPaymentDto, req.user);
  }

  /**
   * 📊 Статистика платежей компании
   */
  @Get('analytics/statistics')
  @Roles(...PAYMENTS_CONSTANTS.ROLES.CAN_VIEW_FINANCIAL_REPORTS)
  @ApiOperation({ 
    summary: 'Аналитика платежей',
    description: `
    📊 **ФИНАНСОВАЯ АНАЛИТИКА** - Подробная статистика платежей компании для принятия решений.
    
    **Метрики включают:**
    • 💰 Общая сумма и количество платежей
    • 📊 Разбивка по статусам (успешные, неудачные, возвраты)
    • 💱 Статистика по валютам
    • 💳 Популярность способов оплаты
    • 📈 Тренды и динамика (месяц, год)
    • ⚡ Скорость обработки платежей
    • 🎯 Показатели успешности и возвратов
    
    **Роли:** company_admin, company_owner, superadmin (финансовые отчеты)
    **Кэширование:** 15 минут
    `
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '✅ Статистика успешно получена',
    type: PaymentStatisticsDto,
  })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Недостаточно прав для просмотра финансовых отчетов' })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 20 в час)' })
  @Throttle({ default: { limit: 20, ttl: 3600000 } })
  async getPaymentStatistics(
    @Request() req: RequestWithUser,
  ): Promise<PaymentStatisticsDto> {
    this.logger.log(`Getting payment statistics for company ${req.user.companyId}`);
    
    return this.paymentsService.getPaymentStatistics(req.user);
  }

  /**
   * 💰 Баланс компании
   */
  @Get('analytics/balance')
  @Roles(...PAYMENTS_CONSTANTS.ROLES.CAN_VIEW_COMPANY_BALANCE)
  @ApiOperation({ 
    summary: 'Финансовый баланс компании',
    description: `
    💰 **ФИНАНСОВЫЙ БАЛАНС** - Текущее финансовое состояние компании по платежам.
    
    **Показатели баланса:**
    • 💰 Общая сумма полученных платежей
    • 🔄 Сумма возвратов и частичных возвратов
    • 📊 Чистый баланс (получено - возвращено)
    • ⏳ Средства в обработке (pending)
    • ⚖️ Спорные платежи (disputed)
    • 💱 Разбивка по валютам
    
    **Обновление:** в реальном времени
    **Роли:** company_admin, manager, company_owner, superadmin
    `
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '✅ Баланс компании получен',
    type: CompanyBalanceDto,
  })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Недостаточно прав доступа' })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 30 в час)' })
  @Throttle({ default: { limit: 30, ttl: 3600000 } })
  async getCompanyBalance(
    @Request() req: RequestWithUser,
  ): Promise<CompanyBalanceDto> {
    this.logger.log(`Getting company balance for ${req.user.companyId}`);
    
    return this.paymentsService.getCompanyBalance(req.user);
  }

  /**
   * 🗑️ Удаление платежа (только для админов/владельцев)
   */
  @Delete(':id')
  // ✅ ИСПРАВЛЕНО: Новые роли вместо старых
  @Roles('superadmin', 'company_owner', 'company_admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ 
    summary: '🚨 Удалить платеж (ОПАСНО)',
    description: `
    🚨 **ОПАСНАЯ ОПЕРАЦИЯ** - Полное удаление платежа из системы.
    
    ⚠️ **ВНИМАНИЕ:**
    • Операция необратима
    • Нарушает финансовую отчетность
    • Рекомендуется использовать отмену вместо удаления
    • Доступно только администраторам
    
    **Ограничения:**
    • Нельзя удалить обработанные платежи (используйте возврат)
    • Сохраняется запись в аудит-логе
    • Требует подтверждения высокого уровня
    
    **Роли:** company_admin, company_owner, superadmin
    `
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Уникальный идентификатор платежа для удаления',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: '✅ Платеж успешно удален',
  })
  @ApiNotFoundResponse({ description: '❌ Платеж не найден' })
  @ApiBadRequestResponse({
    description: '❌ Невозможно удалить платеж',
    example: {
      statusCode: 400,
      message: 'Cannot delete processed payment. Use refund instead.',
      error: 'Bad Request'
    }
  })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Доступно только администраторам' })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 5 в час)' })
  @Throttle({ default: { limit: 5, ttl: 3600000 } })
  async deletePayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: RequestWithUser,
  ): Promise<void> {
    this.logger.log(`Deleting payment ${id} for company ${req.user.companyId}`);
    
    return this.paymentsService.deletePayment(id, req.user);
  }

  /**
   * 🚨 Обработка просроченных платежей (только для системных задач)
   */
  @Post('system/process-overdue')
  // ✅ ИСПРАВЛЕНО: Новые роли вместо старых
  @Roles('superadmin', 'company_owner', 'company_admin')
  @ApiOperation({ 
    summary: '🤖 Обработать просроченные платежи',
    description: `
    🤖 **СИСТЕМНАЯ ОПЕРАЦИЯ** - Автоматическая обработка просроченных платежей.
    
    **Что происходит:**
    • ⏰ Поиск платежей, просроченных более ${PAYMENTS_CONSTANTS.DEFAULTS.PAYMENT_TIMEOUT_MINUTES} минут
    • 📊 Автоматическое изменение статуса pending → expired
    • 🗑️ Отмена критично просроченных платежей
    • 📋 Обновление связанных счетов
    • 📊 Генерация отчета по обработке
    
    **Периодичность:** рекомендуется запускать каждый час
    **Роли:** company_admin, company_owner, superadmin
    `
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '✅ Просроченные платежи обработаны',
    schema: {
      type: 'object',
      properties: {
        processed: { 
          type: 'number', 
          example: 15,
          description: 'Общее количество обработанных платежей'
        },
        expired: { 
          type: 'number', 
          example: 12,
          description: 'Количество платежей, помеченных как просроченные'
        },
        cancelled: { 
          type: 'number', 
          example: 3,
          description: 'Количество отмененных платежей'
        },
      },
    },
  })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Доступно только администраторам' })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 3 в час)' })
  @ApiInternalServerErrorResponse({ description: '❌ Ошибка при обработке просроченных платежей' })
  @Throttle({ default: { limit: 3, ttl: 3600000 } })
  async processOverduePayments(
    @Request() req: RequestWithUser,
  ): Promise<{ processed: number; expired: number; cancelled: number }> {
    this.logger.log(`Processing overdue payments for company ${req.user.companyId}`);
    
    return this.paymentsService.processOverduePayments(req.user);
  }
}
