// src/modules/payment-methods/payment-methods.controller.ts - ПОЛНАЯ ПРОФЕССИОНАЛЬНАЯ ВЕРСИЯ

import { 
  Controller, 
  Get, 
  Post, 
  Patch, 
  Delete, 
  Body, 
  Param, 
  Query,
  Req,
  HttpStatus,
  HttpCode,
  DefaultValuePipe,
  ParseIntPipe,
  ParseBoolPipe,
  ParseUUIDPipe,
  Logger,
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiQuery, 
  ApiParam,
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
import { AuthWithOwnership, PaymentMethodResource } from '../../common';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { PaymentMethodsService } from './payment-methods.service';
import { CreatePaymentMethodDto } from './dto/request/create-payment-method.dto';
import { UpdatePaymentMethodDto } from './dto/request/update-payment-method.dto';
import { PaymentMethodResponseDto } from './dto/response/payment-method-response.dto';
import { PaginatedPaymentMethodsResponseDto } from './dto/response/paginated-payment-methods-response.dto';
import { 
  PaymentMethodsFilter, 
  PaymentMethodType, 
  PaymentMethodSortBy, 
  SortOrder 
} from './types/payment-methods.types';

@ApiTags('💳 Способы оплаты')
@ApiBearerAuth()
@ApiSecurity('JWT')
@Controller('payment-methods')
@AuthWithOwnership() // 🛡️ Security: JWT + Roles + Ownership на весь контроллер
export class PaymentMethodsController {
  private readonly logger = new Logger(PaymentMethodsController.name);

  constructor(private readonly paymentMethodsService: PaymentMethodsService) {}

  /**
   * 📋 Получение списка способов оплаты
   */
  @Get()
  @ApiOperation({ 
    summary: 'Получить способы оплаты компании',
    description: `
    📋 **УПРАВЛЕНИЕ СПОСОБАМИ ОПЛАТЫ** - Получение списка всех настроенных способов оплаты компании.
    
    **Возможности фильтрации:**
    • 🔍 Поиск по названию и описанию
    • 💳 Фильтрация по типу (наличные, карты, переводы)
    • ✅ Фильтрация по статусу активности
    • 🔄 Поддержка возвратов
    • ✅ Требование верификации
    • 🔗 Наличие настроенной интеграции
    
    **Типы способов оплаты:**
    • 💵 **cash** - Наличные деньги
    • 💳 **card** - Банковские карты
    • 🏦 **bank_transfer** - Банковские переводы
    • 📅 **installments** - Рассрочка
    • 🏢 **corporate** - Корпоративные карты
    • 📱 **digital_wallet** - Цифровые кошельки
    • ₿ **crypto** - Криптовалюты
    • 📝 **check** - Чеки
    • 🌐 **wire_transfer** - SWIFT переводы
    
    **Роли:** все авторизованные пользователи компании
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
    description: 'Количество элементов на странице (максимум 50)',
    example: 20
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Поиск по названию или описанию',
    example: 'карта'
  })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: PaymentMethodType,
    description: 'Фильтр по типу способа оплаты',
    example: PaymentMethodType.CARD
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Фильтр по статусу активности',
    example: true
  })
  @ApiQuery({
    name: 'supportsRefunds',
    required: false,
    type: Boolean,
    description: 'Поддерживает ли возвраты',
    example: true
  })
  @ApiQuery({
    name: 'requiresVerification',
    required: false,
    type: Boolean,
    description: 'Требует ли верификации',
    example: false
  })
  @ApiQuery({
    name: 'hasIntegration',
    required: false,
    type: Boolean,
    description: 'Настроена ли интеграция с платежным шлюзом',
    example: true
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['name', 'type', 'createdAt', 'processingFee'],
    description: 'Поле для сортировки',
    example: 'name'
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['asc', 'desc'],
    description: 'Порядок сортировки',
    example: 'asc'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '✅ Список способов оплаты получен',
    type: PaginatedPaymentMethodsResponseDto,
  })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 100 в минуту)' })
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  async findAll(
    @Req() req: RequestWithUser,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('type') type?: PaymentMethodType,
    @Query('isActive', new DefaultValuePipe(undefined)) isActive?: boolean,
    @Query('supportsRefunds', new DefaultValuePipe(undefined)) supportsRefunds?: boolean,
    @Query('requiresVerification', new DefaultValuePipe(undefined)) requiresVerification?: boolean,
    @Query('hasIntegration', new DefaultValuePipe(undefined)) hasIntegration?: boolean,
    @Query('sortBy', new DefaultValuePipe('name')) sortBy: string = 'name',
    @Query('sortOrder', new DefaultValuePipe('asc')) sortOrder: 'asc' | 'desc' = 'asc',
  ): Promise<PaginatedPaymentMethodsResponseDto> {
    this.logger.log(`Getting payment methods for company ${req.user.companyId}`);

    const filter: PaymentMethodsFilter = {
      page,
      limit: Math.min(limit, 50),
      search,
      type,
      isActive,
      supportsRefunds,
      requiresVerification,
      hasIntegration,
      sortBy: sortBy as PaymentMethodSortBy,
      sortOrder: (sortOrder?.toUpperCase() as SortOrder) || 'ASC',
    };

    return this.paymentMethodsService.findAllForUser(req.user, filter);
  }

  /**
   * 📊 Статистика способов оплаты
   */
  @Get('stats')
  @Roles('admin', 'manager', 'owner', 'superadmin')
  @ApiOperation({ 
    summary: 'Статистика способов оплаты',
    description: `
    📊 **АНАЛИТИКА СПОСОБОВ ОПЛАТЫ** - Детальная статистика использования способов оплаты.
    
    **Метрики включают:**
    • 📊 Общее количество настроенных способов
    • ✅ Количество активных/неактивных методов
    • 💳 Разбивка по типам (карты, наличные, переводы)
    • 🔄 Методы с поддержкой возвратов
    • 🔗 Методы с настроенными интеграциями
    • 💰 Средняя комиссия за обработку
    • 📈 Популярность использования
    
    **Роли:** admin, manager, owner, superadmin
    **Кэширование:** 30 минут
    `
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '✅ Статистика получена',
    schema: {
      type: 'object',
      properties: {
        total: { type: 'number', example: 8 },
        active: { type: 'number', example: 6 },
        byType: {
          type: 'object',
          example: {
            card: 3,
            cash: 2,
            bank_transfer: 2,
            digital_wallet: 1
          }
        },
        supportsRefunds: { type: 'number', example: 5 },
        hasIntegration: { type: 'number', example: 4 },
        avgProcessingFee: { type: 'number', example: 2.5 }
      }
    }
  })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Недостаточно прав доступа' })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 30 в час)' })
  @Throttle({ default: { limit: 30, ttl: 3600000 } })
  async getStats(@Req() req: RequestWithUser): Promise<any> {
    this.logger.log(`Getting payment methods stats for company ${req.user.companyId}`);
    return this.paymentMethodsService.getStats(req.user);
  }

  /**
   * 🔍 Поиск способов оплаты
   */
  @Get('search')
  @ApiOperation({ 
    summary: 'Поиск способов оплаты',
    description: `
    🔍 **БЫСТРЫЙ ПОИСК** - Поиск способов оплаты по названию с автодополнением.
    
    **Возможности поиска:**
    • 📝 Поиск по названию (частичное совпадение)
    • 📋 Поиск по описанию
    • 🏷️ Поиск по тегам и метаданным
    • 💳 Поиск по типу способа оплаты
    
    **Использование:** для автодополнения в формах создания платежей
    **Лимит результатов:** 10 самых релевантных
    `
  })
  @ApiQuery({
    name: 'q',
    required: true,
    type: String,
    description: 'Поисковый запрос (минимум 2 символа)',
    example: 'сбер'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '✅ Результаты поиска получены',
    type: [PaymentMethodResponseDto],
  })
  @ApiBadRequestResponse({
    description: '❌ Некорректный поисковый запрос',
    example: {
      statusCode: 400,
      message: 'Search query must be at least 2 characters long',
      error: 'Bad Request'
    }
  })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 60 в минуту)' })
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async search(
    @Query('q') query: string,
    @Req() req: RequestWithUser
  ): Promise<PaymentMethodResponseDto[]> {
    this.logger.log(`Searching payment methods: "${query}" for company ${req.user.companyId}`);
    return this.paymentMethodsService.search(query, req.user);
  }

  /**
   * ⚡ Активные способы оплаты (быстрый доступ)
   */
  @Get('quick')
  @ApiOperation({ 
    summary: 'Активные способы оплаты для быстрого доступа',
    description: `
    ⚡ **БЫСТРЫЙ ДОСТУП** - Получение списка активных способов оплаты в упрощенном формате.
    
    **Особенности:**
    • Только активные методы (isActive: true)
    • Упрощенный формат данных
    • Оптимизирован для UI компонентов
    • Включает основную информацию о комиссиях
    
    **Использование:** для списков в интерфейсе оформления заказов
    **Кэширование:** 15 минут
    `
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '✅ Активные способы оплаты получены',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
          name: { type: 'string', example: 'Сбербанк Онлайн' },
          type: { type: 'string', example: 'digital_wallet' },
          isActive: { type: 'boolean', example: true },
          processingFee: { type: 'number', example: 1.5 }
        }
      }
    }
  })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 120 в минуту)' })
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  async getActiveQuick(@Req() req: RequestWithUser): Promise<Array<{
    id: string;
    name: string;
    type: string;
    isActive: boolean;
    processingFee?: number;
  }>> {
    this.logger.log(`Getting quick active payment methods for company ${req.user.companyId}`);
    return this.paymentMethodsService.getActiveQuick(req.user);
  }

  /**
   * 📋 Способы оплаты для dropdown компонентов
   */
  @Get('for-select')
  @ApiOperation({ 
    summary: 'Способы оплаты для select/dropdown',
    description: `
    📋 **UI КОМПОНЕНТЫ** - Данные способов оплаты в формате для dropdown/select компонентов.
    
    **Формат данных:**
    • value: ID способа оплаты
    • label: Отображаемое название
    • disabled: Статус доступности
    • meta: Дополнительная информация (тип, комиссия, иконка)
    
    **Использование:** для React Select, HTML select и подобных компонентов
    **Сортировка:** по популярности и алфавиту
    `
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '✅ Данные для select компонентов получены',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          value: { type: 'string', example: '123e4567-e89b-12d3-a456-426614174000' },
          label: { type: 'string', example: 'Сбербанк Онлайн (1.5%)' },
          disabled: { type: 'boolean', example: false },
          meta: {
            type: 'object',
            properties: {
              type: { type: 'string', example: 'digital_wallet' },
              fee: { type: 'number', example: 1.5 },
              icon: { type: 'string', example: '📱' },
              supportsRefunds: { type: 'boolean', example: true }
            }
          }
        }
      }
    }
  })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 150 в минуту)' })
  @Throttle({ default: { limit: 150, ttl: 60000 } })
  async getForSelect(@Req() req: RequestWithUser): Promise<Array<{
    value: string;
    label: string;
    disabled?: boolean;
    meta?: any;
  }>> {
    this.logger.log(`Getting payment methods for select for company ${req.user.companyId}`);
    return this.paymentMethodsService.getForSelect(req.user);
  }

  /**
   * 💳 Способы оплаты по типу
   */
  @Get('type/:type')
  @ApiOperation({ 
    summary: 'Получить способы оплаты по типу',
    description: `
    💳 **ФИЛЬТРАЦИЯ ПО ТИПУ** - Получение всех способов оплаты определенного типа.
    
    **Доступные типы:**
    • 💵 **cash** - Наличные деньги
    • 💳 **card** - Банковские карты (Visa, MasterCard, МИР)
    • 🏦 **bank_transfer** - Банковские переводы
    • 📅 **installments** - Рассрочка и кредиты
    • 🏢 **corporate** - Корпоративные карты и счета
    • 📱 **digital_wallet** - Цифровые кошельки (СберПэй, ЮMoney)
    • ₿ **crypto** - Криптовалюты
    • 📝 **check** - Чеки и векселя
    • 🌐 **wire_transfer** - Международные переводы SWIFT
    
    **Использование:** для группировки в интерфейсе
    `
  })
  @ApiParam({
    name: 'type',
    enum: PaymentMethodType,
    description: 'Тип способа оплаты',
    example: PaymentMethodType.CARD
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '✅ Способы оплаты по типу получены',
    type: [PaymentMethodResponseDto],
  })
  @ApiBadRequestResponse({
    description: '❌ Некорректный тип способа оплаты',
    example: {
      statusCode: 400,
      message: 'Invalid payment method type: invalid_type',
      error: 'Bad Request'
    }
  })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 80 в минуту)' })
  @Throttle({ default: { limit: 80, ttl: 60000 } })
  async findByType(
    @Param('type') type: PaymentMethodType,
    @Req() req: RequestWithUser
  ): Promise<PaymentMethodResponseDto[]> {
    this.logger.log(`Getting payment methods by type ${type} for company ${req.user.companyId}`);
    return this.paymentMethodsService.findByType(type, req.user);
  }

  /**
   * 🔍 Получение способа оплаты по ID
   */
  @Get(':id')
  @PaymentMethodResource() // 🛡️ Проверка: paymentMethod.companyId === user.companyId
  @ApiOperation({ 
    summary: 'Получить способ оплаты по ID',
    description: `
    🔍 **ДЕТАЛЬНАЯ ИНФОРМАЦИЯ** - Получение полной информации о конкретном способе оплаты.
    
    **Включает:**
    • 💳 Основные данные (название, тип, описание)
    • 💰 Настройки комиссий и лимитов
    • 🔗 Конфигурацию интеграций
    • 📊 Статистику использования
    • 🔄 Настройки возвратов
    • 🛡️ Параметры безопасности
    
    **Безопасность:** Автоматическая проверка принадлежности к компании
    `
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'Уникальный идентификатор способа оплаты',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '✅ Способ оплаты найден',
    type: PaymentMethodResponseDto,
  })
  @ApiNotFoundResponse({
    description: '❌ Способ оплаты не найден',
    example: {
      statusCode: 404,
      message: 'Payment method with ID 123e4567-e89b-12d3-a456-426614174000 not found',
      error: 'Not Found'
    }
  })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Способ оплаты не принадлежит вашей компании' })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 200 в минуту)' })
  @Throttle({ default: { limit: 200, ttl: 60000 } })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<PaymentMethodResponseDto> {
    this.logger.log(`Getting payment method ${id}`);
    return this.paymentMethodsService.findOne(id);
  }

  /**
   * ✅ Проверка доступности способа оплаты
   */
  @Get(':id/availability')
  @PaymentMethodResource()
  @ApiOperation({ 
    summary: 'Проверить доступность способа оплаты',
    description: `
    ✅ **ПРОВЕРКА ДОСТУПНОСТИ** - Валидация возможности использования способа оплаты.
    
    **Проверяется:**
    • 🔄 Статус активности метода
    • 🔗 Работоспособность интеграции
    • 💰 Соблюдение лимитов
    • 🕐 Рабочие часы (для некоторых методов)
    • 🛡️ Блокировки и ограничения
    • 📍 Географические ограничения
    
    **Использование:** перед созданием платежа
    **Кэширование:** 5 минут
    `
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'ID способа оплаты для проверки',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '✅ Результат проверки доступности',
    schema: {
      type: 'object',
      properties: {
        available: { type: 'boolean', example: true },
        paymentMethod: { 
          $ref: '#/components/schemas/PaymentMethodResponseDto',
          description: 'Данные способа оплаты (если доступен)'
        },
        reason: { 
          type: 'string', 
          example: 'Payment method is temporarily unavailable',
          description: 'Причина недоступности (если недоступен)'
        }
      }
    }
  })
  @ApiNotFoundResponse({ description: '❌ Способ оплаты не найден' })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Доступ запрещен' })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 300 в минуту)' })
  @Throttle({ default: { limit: 300, ttl: 60000 } })
  async checkAvailability(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: RequestWithUser
  ): Promise<{ available: boolean; paymentMethod?: PaymentMethodResponseDto; reason?: string }> {
    this.logger.log(`Checking availability of payment method ${id} for company ${req.user.companyId}`);
    return this.paymentMethodsService.checkAvailability(id, req.user);
  }

  /**
   * 📊 Лимиты способа оплаты
   */
  @Get(':id/limits')
  @PaymentMethodResource()
  @Roles('admin', 'manager', 'owner', 'superadmin')
  @ApiOperation({ 
    summary: 'Получить лимиты способа оплаты',
    description: `
    📊 **ЛИМИТЫ И ОГРАНИЧЕНИЯ** - Информация о лимитах использования способа оплаты.
    
    **Типы лимитов:**
    • 💰 Минимальная/максимальная сумма платежа
    • 📅 Дневные/месячные лимиты
    • 🔢 Количество транзакций в период
    • 🌍 Географические ограничения
    • 🕐 Временные ограничения
    • 💳 Валютные ограничения
    
    **Роли:** admin, manager, owner, superadmin
    `
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'ID способа оплаты',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '✅ Лимиты получены',
    schema: {
      type: 'object',
      properties: {
        minAmount: { type: 'number', example: 1 },
        maxAmount: { type: 'number', example: 500000 },
        dailyLimit: { type: 'number', example: 1000000 },
        monthlyLimit: { type: 'number', example: 10000000 },
        maxTransactionsPerDay: { type: 'number', example: 100 },
        supportedCurrencies: { 
          type: 'array', 
          items: { type: 'string' },
          example: ['RUB', 'USD', 'EUR']
        },
        workingHours: {
          type: 'object',
          properties: {
            start: { type: 'string', example: '09:00' },
            end: { type: 'string', example: '21:00' },
            timezone: { type: 'string', example: 'Europe/Moscow' }
          }
        }
      }
    }
  })
  @ApiNotFoundResponse({ description: '❌ Способ оплаты не найден' })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Недостаточно прав доступа' })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 50 в минуту)' })
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  async getLimits(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: RequestWithUser
  ): Promise<any> {
    this.logger.log(`Getting limits for payment method ${id}`);
    return this.paymentMethodsService.getPaymentMethodLimits(id, req.user.companyId);
  }

  /**
   * ➕ Создание нового способа оплаты
   */
  @Post()
  @Roles('owner', 'admin') // 🔒 Только admin+ могут создавать способы оплаты
  @ApiOperation({ 
    summary: 'Создать новый способ оплаты',
    description: `
    ➕ **СОЗДАНИЕ СПОСОБА ОПЛАТЫ** - Добавление нового способа оплаты в систему компании.
    
    **Возможности настройки:**
    • 💳 Выбор типа способа оплаты
    • 💰 Настройка комиссий и лимитов
    • 🔗 Конфигурация интеграций с платежными системами
    • 🔄 Настройки возвратов
    • 🛡️ Параметры безопасности и верификации
    • 📋 Метаданные и дополнительная информация
    
    **Валидация:**
    • Уникальность названия в рамках компании
    • Корректность настроек интеграции
    • Соответствие лимитов и комиссий
    
    **Роли:** admin, owner, superadmin
    `
  })
  @ApiBody({
    type: CreatePaymentMethodDto,
    description: 'Данные для создания способа оплаты',
    examples: {
      cashMethod: {
        summary: '💵 Наличная оплата',
        description: 'Простой способ оплаты наличными деньгами',
        value: {
          name: 'Наличные в кассе',
          type: 'cash',
          description: 'Оплата наличными деньгами при получении услуги',
          isActive: true,
          supportsRefunds: true,
          requiresVerification: false,
          processingFee: 0,
          minAmount: 1,
          maxAmount: 100000,
          configuration: {
            cashierRequired: true,
            receiptRequired: true
          }
        }
      },
      bankCardMethod: {
        summary: '💳 Банковская карта',
        description: 'Оплата банковскими картами через эквайринг',
        value: {
          name: 'Банковская карта (Сбер)',
          type: 'card',
          description: 'Оплата картами Visa, MasterCard, МИР через эквайринг Сбербанка',
          isActive: true,
          supportsRefunds: true,
          requiresVerification: true,
          processingFee: 2.5,
          minAmount: 10,
          maxAmount: 500000,
          configuration: {
            merchantId: 'merchant_12345',
            terminalId: 'terminal_67890',
            apiKey: 'sk_test_***',
            testMode: false,
            supportedBrands: ['visa', 'mastercard', 'mir'],
            requireCvv: true,
            require3ds: true
          },
          metadata: {
            bankName: 'Сбербанк',
            contractNumber: 'SB-2024-001',
            supportPhone: '+7 (495) 123-45-67'
          }
        }
      },
      digitalWalletMethod: {
        summary: '📱 Цифровой кошелек',
        description: 'Оплата через цифровые кошельки и приложения',
        value: {
          name: 'СберПэй',
          type: 'digital_wallet',
          description: 'Быстрая оплата через приложение СберБанк',
          isActive: true,
          supportsRefunds: true,
          requiresVerification: false,
          processingFee: 1.5,
          minAmount: 1,
          maxAmount: 300000,
          configuration: {
            walletType: 'sberpay',
            merchantId: 'sberpay_merchant_789',
            apiEndpoint: 'https://api.sberpay.ru/v1',
            webhookUrl: 'https://mycompany.ru/webhooks/sberpay',
            currency: 'RUB'
          }
        }
      },
      installmentMethod: {
        summary: '📅 Рассрочка',
        description: 'Оплата в рассрочку без переплат',
        value: {
          name: 'Рассрочка 0-0-12',
          type: 'installments',
          description: 'Рассрочка на 12 месяцев без процентов',
          isActive: true,
          supportsRefunds: false,
          requiresVerification: true,
          processingFee: 3.5,
          minAmount: 10000,
          maxAmount: 2000000,
          configuration: {
            provider: 'tinkoff_installments',
            maxPeriodMonths: 12,
            minFirstPayment: 0,
            interestRate: 0,
            documentRequired: true
          }
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '✅ Способ оплаты успешно создан',
    type: PaymentMethodResponseDto,
  })
  @ApiBadRequestResponse({
    description: '❌ Некорректные данные',
    example: {
      statusCode: 400,
      message: [
        'Название способа оплаты обязательно',
        'Некорректный тип способа оплаты',
        'Комиссия не может быть отрицательной'
      ],
      error: 'Bad Request'
    }
  })
  @ApiConflictResponse({
    description: '❌ Способ оплаты с таким названием уже существует',
    example: {
      statusCode: 409,
      message: 'Payment method with name "Наличные в кассе" already exists',
      error: 'Conflict'
    }
  })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Недостаточно прав доступа' })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 10 в час)' })
  @Throttle({ default: { limit: 10, ttl: 3600000 } })
  async create(
    @Body() dto: CreatePaymentMethodDto,
    @Req() req: RequestWithUser
  ): Promise<PaymentMethodResponseDto> {
    this.logger.log(`Creating payment method for company ${req.user.companyId}`);
    return this.paymentMethodsService.createForUser(dto, req.user);
  }

  /**
   * 🔄 Массовое обновление способов оплаты
   */
  @Post('bulk-update')
  @Roles('owner', 'admin')
  @ApiOperation({ 
    summary: 'Массовое обновление способов оплаты',
    description: `
    🔄 **МАССОВЫЕ ОПЕРАЦИИ** - Одновременное обновление нескольких способов оплаты.
    
    **Возможности:**
    • 📊 Изменение статуса активности для группы методов
    • 💰 Массовое обновление комиссий
    • 🔧 Изменение настроек конфигурации
    • 📋 Обновление метаданных
    
    **Использование:**
    • Сезонные изменения комиссий
    • Массовая активация/деактивация
    • Обновление настроек интеграций
    
    **Роли:** admin, owner, superadmin
    `
  })
  @ApiBody({
    description: 'Данные для массового обновления',
    schema: {
      type: 'object',
      properties: {
        paymentMethodIds: {
          type: 'array',
          items: { type: 'string' },
          example: [
            '123e4567-e89b-12d3-a456-426614174000',
            '456e7890-e89b-12d3-a456-426614174000'
          ],
          description: 'Массив ID способов оплаты для обновления'
        },
        updates: {
          $ref: '#/components/schemas/UpdatePaymentMethodDto',
          description: 'Изменения, которые нужно применить'
        }
      },
      required: ['paymentMethodIds', 'updates']
    },
    examples: {
      massDeactivation: {
        summary: '❌ Массовая деактивация',
        description: 'Отключение нескольких способов оплаты одновременно',
        value: {
          paymentMethodIds: [
            '123e4567-e89b-12d3-a456-426614174000',
            '456e7890-e89b-12d3-a456-426614174000'
          ],
          updates: {
            isActive: false,
            description: 'Временно отключен на период технических работ'
          }
        }
      },
      feeUpdate: {
        summary: '💰 Обновление комиссий',
        description: 'Изменение размера комиссии для группы методов',
        value: {
          paymentMethodIds: [
            '123e4567-e89b-12d3-a456-426614174000',
            '456e7890-e89b-12d3-a456-426614174000'
          ],
          updates: {
            processingFee: 2.0
          }
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '✅ Массовое обновление выполнено',
    schema: {
      type: 'object',
      properties: {
        updated: { type: 'number', example: 5 },
        failed: { type: 'number', example: 1 },
        message: { type: 'string', example: 'Массовое обновление завершено: 5 успешно, 1 ошибка' }
      }
    }
  })
  @ApiBadRequestResponse({ description: '❌ Некорректные данные для обновления' })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Недостаточно прав доступа' })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 5 в час)' })
  @Throttle({ default: { limit: 5, ttl: 3600000 } })
  async bulkUpdate(
    @Body() dto: { paymentMethodIds: string[]; updates: UpdatePaymentMethodDto },
    @Req() req: RequestWithUser
  ): Promise<{ updated: number; failed: number; message: string }> {
    this.logger.log(`Bulk updating ${dto.paymentMethodIds.length} payment methods for company ${req.user.companyId}`);
    return this.paymentMethodsService.bulkUpdate(dto.paymentMethodIds, dto.updates, req.user);
  }

  /**
   * 🧪 Тестирование интеграции
   */
  @Post(':id/test-integration')
  @PaymentMethodResource()
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ 
    summary: 'Тестировать интеграцию способа оплаты',
    description: `
    🧪 **ТЕСТИРОВАНИЕ ИНТЕГРАЦИЙ** - Проверка работоспособности интеграции с платежной системой.
    
    **Проверяется:**
    • 🔗 Подключение к API платежной системы
    • 🔑 Валидность ключей и токенов
    • 📊 Доступность тестовых операций
    • 💳 Поддерживаемые методы оплаты
    • 🔄 Обработка webhook'ов
    • ⚡ Скорость ответа API
    
    **Типы тестов:**
    • Создание тестового платежа (без списания)
    • Проверка статуса интеграции
    • Валидация настроек webhook'ов
    
    **Роли:** admin, manager, owner, superadmin
    `
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'ID способа оплаты для тестирования',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '✅ Тестирование завершено',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        testResults: {
          type: 'object',
          properties: {
            connectionTest: { type: 'boolean', example: true },
            authenticationTest: { type: 'boolean', example: true },
            paymentTest: { type: 'boolean', example: true },
            webhookTest: { type: 'boolean', example: false },
            responseTime: { type: 'number', example: 234 }
          }
        },
        errors: {
          type: 'array',
          items: { type: 'string' },
          example: ['Webhook URL не отвечает']
        },
        recommendations: {
          type: 'array',
          items: { type: 'string' },
          example: ['Проверьте настройки webhook URL']
        }
      }
    }
  })
  @ApiNotFoundResponse({ description: '❌ Способ оплаты не найден' })
  @ApiBadRequestResponse({
    description: '❌ Интеграция не настроена',
    example: {
      statusCode: 400,
      message: 'Payment method has no integration configuration',
      error: 'Bad Request'
    }
  })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Недостаточно прав доступа' })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 20 в час)' })
  @Throttle({ default: { limit: 20, ttl: 3600000 } })
  async testIntegration(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: RequestWithUser
  ): Promise<any> {
    this.logger.log(`Testing integration for payment method ${id}`);
    return this.paymentMethodsService.testIntegration(id, req.user);
  }

  /**
   * 💰 Расчет комиссии
   */
  @Post(':id/calculate-fee')
  @PaymentMethodResource()
  @ApiOperation({ 
    summary: 'Рассчитать комиссию за платеж',
    description: `
    💰 **РАСЧЕТ КОМИССИЙ** - Точный расчет комиссии за обработку платежа.
    
    **Включает в расчет:**
    • 📊 Базовый процент комиссии
    • 💰 Фиксированные сборы
    • 🎯 Специальные тарифы (объемные скидки)
    • 💱 Валютные конверсии
    • 🏦 Межбанковские комиссии
    
    **Типы комиссий:**
    • Процентная (от суммы платежа)
    • Фиксированная (постоянная сумма)
    • Комбинированная (процент + фиксированная)
    • Прогрессивная (зависит от суммы)
    
    **Использование:** для отображения итоговой суммы в чеке
    `
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'ID способа оплаты',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiBody({
    description: 'Сумма для расчета комиссии',
    schema: {
      type: 'object',
      properties: {
        amount: {
          type: 'number',
          minimum: 0.01,
          example: 15000.00,
          description: 'Сумма платежа для расчета комиссии'
        }
      },
      required: ['amount']
    },
    examples: {
      smallPayment: {
        summary: '💰 Небольшой платеж',
        description: 'Расчет комиссии для платежа 1000 рублей',
        value: { amount: 1000.00 }
      },
      largePayment: {
        summary: '💎 Крупный платеж',
        description: 'Расчет комиссии для платежа 100000 рублей',
        value: { amount: 100000.00 }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '✅ Комиссия рассчитана',
    schema: {
      type: 'object',
      properties: {
        amount: { 
          type: 'number', 
          example: 15000.00,
          description: 'Изначальная сумма платежа'
        },
        fee: { 
          type: 'number', 
          example: 375.00,
          description: 'Размер комиссии'
        },
        totalAmount: { 
          type: 'number', 
          example: 15375.00,
          description: 'Итоговая сумма к оплате (сумма + комиссия)'
        },
        feePercentage: { 
          type: 'number', 
          example: 2.5,
          description: 'Процент комиссии'
        }
      }
    }
  })
  @ApiNotFoundResponse({ description: '❌ Способ оплаты не найден' })
  @ApiBadRequestResponse({
    description: '❌ Некорректная сумма',
    example: {
      statusCode: 400,
      message: 'Amount must be greater than 0.01',
      error: 'Bad Request'
    }
  })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 500 в час)' })
  @Throttle({ default: { limit: 500, ttl: 3600000 } })
  async calculateFee(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { amount: number },
    @Req() req: RequestWithUser
  ): Promise<{
    amount: number;
    fee: number;
    totalAmount: number;
    feePercentage: number;
  }> {
    this.logger.log(`Calculating fee for payment method ${id}, amount: ${dto.amount}`);
    return this.paymentMethodsService.calculateProcessingFee(id, dto.amount, req.user.companyId);
  }

  /**
   * ✏️ Обновление способа оплаты
   */
  @Patch(':id')
  @PaymentMethodResource() // 🛡️ Нельзя редактировать чужие способы оплаты
  @Roles('owner', 'admin')
  @ApiOperation({ 
    summary: 'Обновить способ оплаты',
    description: `
    ✏️ **РЕДАКТИРОВАНИЕ СПОСОБА ОПЛАТЫ** - Изменение настроек существующего способа оплаты.
    
    **Возможности изменения:**
    • 📝 Название и описание
    • 💰 Размер комиссий и лимиты
    • 🔧 Настройки интеграции
    • ✅ Статус активности
    • 🔄 Настройки возвратов
    • 📋 Метаданные и дополнительная информация
    
    **Ограничения:**
    • Нельзя изменить тип способа оплаты
    • Изменения настроек интеграции требуют повторного тестирования
    • Некоторые изменения требуют подтверждения владельца
    
    **Роли:** admin, owner, superadmin
    `
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'ID способа оплаты для обновления',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiBody({
    type: UpdatePaymentMethodDto,
    description: 'Данные для обновления способа оплаты',
    examples: {
      nameUpdate: {
        summary: '📝 Изменение названия',
        description: 'Обновление названия и описания',
        value: {
          name: 'Сбербанк Онлайн (Новый)',
          description: 'Обновленная интеграция с СберБанк Онлайн'
        }
      },
      feeUpdate: {
        summary: '💰 Изменение комиссии',
        description: 'Обновление размера комиссии',
        value: {
          processingFee: 2.0,
          minAmount: 10,
          maxAmount: 1000000
        }
      },
      configurationUpdate: {
        summary: '🔧 Обновление настроек',
        description: 'Изменение конфигурации интеграции',
        value: {
          configuration: {
            apiKey: 'new_api_key_***',
            testMode: false,
            webhookUrl: 'https://new-domain.ru/webhooks/payment'
          }
        }
      },
      statusUpdate: {
        summary: '⚡ Изменение статуса',
        description: 'Активация/деактивация способа оплаты',
        value: {
          isActive: false,
          description: 'Временно отключен на период обновления системы'
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '✅ Способ оплаты успешно обновлен',
    type: PaymentMethodResponseDto,
  })
  @ApiNotFoundResponse({ description: '❌ Способ оплаты не найден' })
  @ApiBadRequestResponse({
    description: '❌ Некорректные данные для обновления',
    example: {
      statusCode: 400,
      message: 'Processing fee cannot be negative',
      error: 'Bad Request'
    }
  })
  @ApiConflictResponse({
    description: '❌ Конфликт данных',
    example: {
      statusCode: 409,
      message: 'Payment method with this name already exists',
      error: 'Conflict'
    }
  })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Недостаточно прав доступа' })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 30 в час)' })
  @Throttle({ default: { limit: 30, ttl: 3600000 } })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePaymentMethodDto
  ): Promise<PaymentMethodResponseDto> {
    this.logger.log(`Updating payment method ${id}`);
    return this.paymentMethodsService.update(id, dto);
  }

  /**
   * 🔄 Переключение статуса
   */
  @Post(':id/toggle-status')
  @PaymentMethodResource()
  @Roles('owner', 'admin')
  @ApiOperation({ 
    summary: 'Переключить статус активности',
    description: `
    🔄 **БЫСТРОЕ ПЕРЕКЛЮЧЕНИЕ** - Быстрое включение/отключение способа оплаты.
    
    **Функциональность:**
    • ⚡ Мгновенное изменение статуса isActive
    • 🔍 Автоматическая проверка зависимостей
    • 📊 Обновление связанных настроек
    • 📝 Запись в аудит-лог
    
    **Безопасность:**
    • Проверка наличия активных платежей
    • Предупреждение о влиянии на текущие операции
    • Возможность отката изменений
    
    **Использование:** для быстрого управления в интерфейсе
    `
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'ID способа оплаты',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '✅ Статус успешно изменен',
    type: PaymentMethodResponseDto,
  })
  @ApiNotFoundResponse({ description: '❌ Способ оплаты не найден' })
  @ApiBadRequestResponse({
    description: '❌ Невозможно изменить статус',
    example: {
      statusCode: 400,
      message: 'Cannot deactivate payment method with active payments',
      error: 'Bad Request'
    }
  })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Недостаточно прав доступа' })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 50 в час)' })
  @Throttle({ default: { limit: 50, ttl: 3600000 } })
  async toggleStatus(@Param('id', ParseUUIDPipe) id: string): Promise<PaymentMethodResponseDto> {
    this.logger.log(`Toggling status for payment method ${id}`);
    return this.paymentMethodsService.toggleStatus(id);
  }

  /**
   * 🗑️ Удаление способа оплаты
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @PaymentMethodResource() // 🛡️ Нельзя удалять чужие способы оплаты
  @Roles('owner', 'admin') // 🔒 Только admin+ могут удалять
  @ApiOperation({ 
    summary: '🚨 Удалить способ оплаты (ОПАСНО)',
    description: `
    🚨 **ОПАСНАЯ ОПЕРАЦИЯ** - Полное удаление способа оплаты из системы.
    
    ⚠️ **ВНИМАНИЕ:**
    • Операция необратима
    • Повлияет на связанные платежи и отчеты
    • Рекомендуется деактивация вместо удаления
    • Требует подтверждения владельца
    
    **Проверки перед удалением:**
    • Отсутствие активных платежей
    • Отсутствие запланированных операций
    • Отсутствие настроенных интеграций
    
    **Альтернатива:** используйте деактивацию (isActive: false)
    **Роли:** admin, owner, superadmin
    `
  })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'ID способа оплаты для удаления',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: '✅ Способ оплаты успешно удален',
  })
  @ApiNotFoundResponse({ description: '❌ Способ оплаты не найден' })
  @ApiBadRequestResponse({
    description: '❌ Невозможно удалить способ оплаты',
    example: {
      statusCode: 400,
      message: 'Cannot delete payment method with active payments',
      error: 'Bad Request'
    }
  })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Недостаточно прав доступа' })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 5 в час)' })
  @Throttle({ default: { limit: 5, ttl: 3600000 } })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    this.logger.log(`Deleting payment method ${id}`);
    await this.paymentMethodsService.remove(id);
  }

  // ========== АНАЛИТИЧЕСКИЕ ЭНДПОИНТЫ ==========

  /**
   * 📊 Аналитика использования
   */
  @Get('analytics/usage')
  @Roles('owner', 'admin', 'manager')
  @ApiOperation({ 
    summary: 'Аналитика использования способов оплаты',
    description: `
    📊 **АНАЛИТИКА ИСПОЛЬЗОВАНИЯ** - Детальная статистика популярности способов оплаты.
    
    **🚧 СТАТУС: В РАЗРАБОТКЕ**
    
    **Планируемые метрики:**
    • 📈 Количество платежей по каждому методу
    • 💰 Объем средств по способам оплаты
    • ⚡ Скорость обработки платежей
    • ✅ Процент успешных операций
    • 🔄 Количество возвратов по методам
    • 📅 Временные тренды использования
    • 👥 Предпочтения клиентов
    
    **Будет доступно после:** интеграции с модулем платежей
    `
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '📋 Информация о планируемой функциональности',
    schema: {
      type: 'object',
      properties: {
        message: { 
          type: 'string',
          example: 'Аналитика использования будет доступна после интеграции с системой платежей'
        },
        companyId: { type: 'string' },
        availableAfter: { 
          type: 'string',
          example: 'Orders & Payments modules implementation'
        },
        plannedFeatures: {
          type: 'array',
          items: { type: 'string' },
          example: [
            'Success rates by payment method',
            'Payment volume analysis',
            'Customer preferences tracking',
            'Processing time analytics'
          ]
        }
      }
    }
  })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Недостаточно прав доступа' })
  async getUsageAnalytics(@Req() req: RequestWithUser): Promise<any> {
    this.logger.log(`Getting usage analytics for company ${req.user.companyId} (PLANNED FEATURE)`);
    return {
      message: 'Аналитика использования будет доступна после интеграции с системой платежей',
      companyId: req.user.companyId,
      availableAfter: 'Orders & Payments modules implementation',
      plannedFeatures: [
        'Success rates by payment method',
        'Average processing times',
        'Peak usage analysis',
        'Fraud detection metrics',
        'Customer preferences',
        'Payment volume trends',
        'Refund rate analysis'
      ],
    };
  }

  /**
   * ⚡ Аналитика производительности
   */
  @Get('analytics/performance')
  @Roles('owner', 'admin')
  @ApiOperation({ 
    summary: 'Аналитика производительности способов оплаты',
    description: `
    ⚡ **АНАЛИТИКА ПРОИЗВОДИТЕЛЬНОСТИ** - Технические метрики работы способов оплаты.
    
    **🚧 СТАТУС: В РАЗРАБОТКЕ**
    
    **Планируемые метрики:**
    • ⚡ Скорость обработки платежей
    • 📊 Процент успешных транзакций
    • 🔍 Анализ ошибок и сбоев
    • 🕐 Время отклика API
    • 📈 Пиковые нагрузки
    • 🛡️ Метрики безопасности
    • 🔄 Частота использования
    
    **Будет доступно после:** полной интеграции с платежными системами
    **Роли:** admin, owner, superadmin
    `
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '📋 Информация о планируемой функциональности',
    schema: {
      type: 'object',
      properties: {
        message: { 
          type: 'string',
          example: 'Аналитика производительности будет доступна после интеграции с системой платежей'
        },
        features: {
          type: 'array',
          items: { type: 'string' },
          example: [
            'Success rates by payment method',
            'Average processing times',
            'Peak usage analysis',
            'Fraud detection metrics',
            'Customer preferences'
          ]
        }
      }
    }
  })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Недостаточно прав доступа' })
  async getPerformanceAnalytics(@Req() req: RequestWithUser): Promise<any> {
    this.logger.log(`Getting performance analytics for company ${req.user.companyId} (PLANNED FEATURE)`);
    return {
      message: 'Аналитика производительности будет доступна после интеграции с системой платежей',
      features: [
        'Success rates by payment method',
        'Average processing times',
        'Peak usage analysis',
        'Fraud detection metrics',
        'Customer preferences',
        'API response time monitoring',
        'Error rate tracking',
        'Integration health monitoring'
      ],
    };
  }

  /**
   * 📤 Экспорт способов оплаты
   */
  @Post('export')
  @Roles('owner', 'admin')
  @ApiOperation({ 
    summary: 'Экспорт списка способов оплаты',
    description: `
    📤 **ЭКСПОРТ ДАННЫХ** - Выгрузка списка способов оплаты в различных форматах.
    
    **🚧 СТАТУС: В РАЗРАБОТКЕ**
    
    **Планируемые форматы:**
    • 📊 **CSV** - для работы с таблицами
    • 📈 **XLSX** - для анализа в Excel
    • 📄 **PDF** - для печати и архивирования
    • 🔧 **JSON** - для интеграций
    
    **Возможности фильтрации:** по всем доступным параметрам
    **Роли:** admin, owner, superadmin
    `
  })
  @ApiBody({
    description: 'Параметры экспорта',
    schema: {
      type: 'object',
      properties: {
        format: {
          type: 'string',
          enum: ['csv', 'xlsx', 'pdf', 'json'],
          example: 'xlsx',
          description: 'Формат экспорта'
        },
        filters: {
          $ref: '#/components/schemas/PaymentMethodsFilter',
          description: 'Фильтры для экспорта (опционально)'
        }
      },
      required: ['format']
    },
    examples: {
      xlsxExport: {
        summary: '📈 Экспорт в Excel',
        description: 'Выгрузка всех активных способов оплаты в Excel',
        value: {
          format: 'xlsx',
          filters: { isActive: true }
        }
      },
      csvExport: {
        summary: '📊 Экспорт в CSV',
        description: 'Выгрузка данных в CSV для анализа',
        value: {
          format: 'csv'
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '📋 Информация о планируемой функциональности',
    schema: {
      type: 'object',
      properties: {
        message: { 
          type: 'string',
          example: 'Функция экспорта будет реализована в следующих версиях'
        },
        requestedFormat: { type: 'string' },
        availableFormats: {
          type: 'array',
          items: { type: 'string' },
          example: ['csv', 'xlsx', 'pdf']
        }
      }
    }
  })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Недостаточно прав доступа' })
  async exportPaymentMethods(
    @Body() dto: { format: 'csv' | 'xlsx' | 'pdf'; filters?: PaymentMethodsFilter },
    @Req() req: RequestWithUser
  ): Promise<any> {
    this.logger.log(`Export payment methods request: ${dto.format} for company ${req.user.companyId} (PLANNED FEATURE)`);
    return {
      message: 'Функция экспорта будет реализована в следующих версиях',
      requestedFormat: dto.format,
      availableFormats: ['csv', 'xlsx', 'pdf'],
      plannedFeatures: [
        'Customizable column selection',
        'Advanced filtering options',
        'Scheduled export reports',
        'Email delivery of exports'
      ]
    };
  }

  /**
   * 📥 Импорт способов оплаты
   */
  @Post('import')
  @Roles('owner', 'admin')
  @ApiOperation({ 
    summary: 'Импорт способов оплаты из файла',
    description: `
    📥 **ИМПОРТ ДАННЫХ** - Массовое создание способов оплаты из файла.
    
    **🚧 СТАТУС: В РАЗРАБОТКЕ**
    
    **Планируемые возможности:**
    • 📊 Импорт из CSV/XLSX файлов
    • ✅ Валидация данных перед импортом
    • 🔄 Обновление существующих записей
    • 📋 Детальный отчет об импорте
    • 🚨 Предварительный просмотр изменений
    
    **Валидация:**
    • Уникальность названий в рамках компании
    • Корректность типов способов оплаты
    • Валидность настроек интеграций
    
    **Роли:** admin, owner, superadmin
    `
  })
  @ApiBody({
    description: 'Данные для импорта',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { type: 'object' },
          description: 'Массив данных способов оплаты'
        },
        validateOnly: {
          type: 'boolean',
          example: false,
          description: 'Только валидация без сохранения'
        }
      },
      required: ['data']
    }
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '📋 Информация о планируемой функциональности',
    schema: {
      type: 'object',
      properties: {
        message: { 
          type: 'string',
          example: 'Функция импорта будет реализована в следующих версиях'
        },
        supportedFormats: {
          type: 'array',
          items: { type: 'string' },
          example: ['csv', 'xlsx', 'json']
        },
        validationRules: {
          type: 'array',
          items: { type: 'string' },
          example: [
            'Unique names within company',
            'Valid payment method types',
            'Proper integration configurations',
            'Valid limits and fees'
          ]
        }
      }
    }
  })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Недостаточно прав доступа' })
  async importPaymentMethods(
    @Body() dto: { data: any[]; validateOnly?: boolean },
    @Req() req: RequestWithUser
  ): Promise<any> {
    this.logger.log(`Import payment methods request for company ${req.user.companyId} (PLANNED FEATURE)`);
    return {
      message: 'Функция импорта будет реализована в следующих версиях',
      supportedFormats: ['csv', 'xlsx', 'json'],
      validationRules: [
        'Unique names within company',
        'Valid payment method types',
        'Proper integration configurations',
        'Valid limits and fees',
        'Required fields validation',
        'Data type validation'
      ],
      plannedFeatures: [
        'Dry-run validation mode',
        'Conflict resolution strategies',
        'Batch processing with progress tracking',
        'Rollback capabilities'
      ]
    };
  }
}
