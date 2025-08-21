Принял первую пачку. Ниже — точечный аудит трех файлов (controller/module/service) с фокусом на безопасность, роли и комплаенс. В конце дам предлагаемый патч (фрагменты кода) и список следующих файлов, которые нужны для полного покрытия.

ЧТО ВАЖНО: сейчас в контроллере есть критическая уязвимость по multi-tenant (создание подписки по произвольному companyId из тела запроса). Это надо закрыть в первую очередь.

АУДИТ: SubscriptionsController

Критичное (устранить немедленно)
- Создание подписки: companyId берется из тела запроса.
  - Риск: пользователь может создать/подменить подписку для другой компании.
  - Фикс: игнорировать companyId из body и брать из req.user.companyId; либо изменить маршрут на /companies/:companyId/subscriptions и проверять param через guard. Также рекомендуется передать EnhancedValidationPipe на @Body.
- Роли: используются legacy-строки ('admin', 'owner').
  - Фикс: перейти на новый стандарт ролей:
    - platform: 'superadmin', 'platform_admin', 'auditor'
    - company: 'company_owner', 'company_admin', (+возможно 'cashier' для read-only)
  - Примеры:
    - create: superadmin, platform_admin, company_owner, company_admin
    - read: superadmin, platform_admin, company_owner, company_admin, cashier (read-only), auditor (read-only)
    - update/cancel: superadmin, platform_admin, company_owner (company_admin — по ТЗ чаще без права смены тарифа и критичных операций)
- Throttle: используется нестандартный вызов @Throttle({ default: { limit, ttl } }).
  - Риск: может не работать как ожидается (Nest Throttler ожидает @Throttle(limit, ttl) в секундах).
  - Фикс: заменить на @Throttle(10, 60) и т.д.
- Отсутствуют ParseUUIDPipe/ParseEnumPipe:
  - @Param('companyId') и @Param('id') без ParseUUIDPipe — риск невалидных значений и усложнение защиты.
  - @Query('status') без ParseEnumPipe — допускает любой текст.
  - Фикс: добавить ParseUUIDPipe и ParseEnumPipe(SubscriptionStatus).
- Нет интерсепторов безопасности/аудита на контроллере:
  - Фикс: @UseInterceptors(AuditLoggingInterceptor, SecurityHeadersInterceptor) + @ApiBearerAuth().

Высокий приоритет
- Проверка владения для создания:
  - Сейчас есть @AuthWithOwnership, но метаданные для companyId берутся из параметров/контекста, а не из тела.
  - Фикс:
    - Вариант 1 (без изменения API): в create() игнорировать dto.companyId, подставлять req.user.companyId и дополнительно использовать кастомный декоратор для guard, который указывает путь до companyId в body (если ваш композитный guard это поддерживает).
    - Вариант 2 (рекомендуется): изменить маршрут на POST /companies/:companyId/subscriptions, чтобы guard проверял param напрямую. Это несовместимое изменение API; подтвердите, если можно.
- Эндпоинт check-expired (CRON) доступен по HTTP:
  - Риск: публичная поверхность атаки для служебной операции.
  - Фикс: перенести в @Cron (Nest Schedule) и убрать публичный endpoint. Если нужен endpoint — добавить HMAC-подпись (Cron-Guard) и ограничить ролью 'system_operator' или только 'superadmin'+'platform_admin', + IP allowlist.

Средний приоритет
- Swagger примеры для create содержат companyId — лучше убрать (чтобы не обучать интеграторов неправильной модели).
- findByCompany:
  - Добавить ParseUUIDPipe; валидацию page>=1, limit>0 (если нет глобальной).
  - Для status — ParseEnumPipe(SubscriptionStatus, { optional: true }).
- findOne/findActiveByCompany:
  - Добавить ParseUUIDPipe.
  - Роли на чтение — можно дать cashier/auditor (read-only), если это соответствует политике.
- ApiTooManyRequestsResponse: TTL указан в мс в тексте, но Throttle работает в секундах — привести к единому формату.

Низкий приоритет/качество
- @ApiBearerAuth() — добавить для всех защищенных эндпоинтов.
- Логи: текущее логирование норм, но на проде уровень логов — info/debug и без чувствительных данных.
- Консистентность статусов: убедиться, что SubscriptionStatus совпадает со значениями в entity (lowercase 'active', 'pending', …). В примерах — 'suspended', 'canceled' — ок. Следует применять ParseEnumPipe и валидацию в DTO.
- Лимиты: в findByCompany safeLimit корректируется, но page не нормализуется — добавить проверку. Лучше переложить на ValidationService.validatePagination.

АУДИТ: SubscriptionsModule

Высокий приоритет
- Интерсепторы в DI:
  - Если AuditLoggingInterceptor и SecurityHeadersInterceptor имеют зависимости (AuditService и т.п.), их нужно добавить в providers, либо импортировать CommonModule, который их экспортирует. Сейчас в модуле только AuditService. Рекомендую:
    - import { AuditLoggingInterceptor, SecurityHeadersInterceptor } from '../../common/interceptors/...'
    - Добавить их в providers.
  - Либо подключить глобально в AppModule (если уже так сделано — ок, но тогда можно не дублировать).

Средний приоритет
- CommonModule: если AuditService обычно предоставляется через CommonModule — лучше импортировать CommonModule и убрать прямое объявление AuditService, чтобы не плодить одиночек.
- Экспорт: ок — SubscriptionsDataService, Mapper и Limits нужны другим.

АУДИТ: SubscriptionsService

Критичное
- Бизнес-проверка companyId при создании:
  - Сейчас сервис ожидает companyId из DTO. Даже если guard ок, лучше на уровне сервиса принудительно использовать companyId из контекста (приходит из контроллера). В контроллере мы подставим user.companyId, а в сервисе не должны доверять значению из внешнего тела.

Высокий приоритет
- findByCompany: добавить валидацию пагинации и статуса (через SubscriptionsValidationService), чтобы не надеяться на контроллер.
- getCompanySubscriptionStats: тянет до 1000 записей и считает по коду.
  - Риск: неточно/неэффективно при больших данных и может игнорировать MAX_ITEMS.
  - Фикс: сделать метод в DataService с агрегирующим COUNT(*) по статусам, либо отдельные count-запросы с индексами.

Средний приоритет
- checkExpiredSubscriptions: оставить как бизнес-метод, но публичный HTTP-эндпоинт убрать (см. выше).
- Логи: оставить, но на проде — корректные уровни.

Предлагаемые правки (фрагменты)

1) Controller — безопасность, роли, пайпы, интерсепторы, throttle, companyId из контекста

import правок:
- добавить:
  - UseInterceptors, ParseUUIDPipe, ParseEnumPipe, Req
  - ApiBearerAuth
  - AuditLoggingInterceptor, SecurityHeadersInterceptor
  - RequestWithUser (modules/auth/interfaces)

Аннотации на классе:
- @ApiBearerAuth()
- @UseInterceptors(AuditLoggingInterceptor, SecurityHeadersInterceptor)

Замена ролей и Throttle, пайпов:

@Post()
@AuthWithOwnership()
@Roles('superadmin', 'platform_admin', 'company_owner', 'company_admin')
@Throttle(10, 60)
async create(
  @Body(EnhancedValidationPipe) createSubscriptionDto: CreateSubscriptionDto,
  @Req() req: RequestWithUser,
): Promise<SubscriptionResponseDto> {
  // Игнорируем companyId из body — берём из контекста (мульти-арендная защита)
  const dto = { ...createSubscriptionDto, companyId: req.user.companyId };
  return this.subscriptionsService.create(dto);
}

@Get('company/:companyId')
@AuthWithOwnership()
@CompanySubscriptions()
@Throttle(50, 60)
async findByCompany(
  @Param('companyId', ParseUUIDPipe) companyId: string,
  @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  @Query('limit', new DefaultValuePipe(SUBSCRIPTIONS_CONSTANTS.DEFAULTS.PAGE_SIZE), ParseIntPipe) limit: number,
  @Query('status', new DefaultValuePipe(undefined), new ParseEnumPipe(SubscriptionStatus, { optional: true })) status?: SubscriptionStatus,
) { ... }

@Get('company/:companyId/active')
@AuthWithOwnership()
@CompanySubscriptions()
@Throttle(100, 60)
async findActiveByCompany(@Param('companyId', ParseUUIDPipe) companyId: string) { ... }

@Get(':id')
@AuthWithOwnership()
@SubscriptionResource()
@Roles('superadmin', 'platform_admin', 'company_owner', 'company_admin', 'cashier', 'auditor')
@Throttle(50, 60)
async findOne(@Param('id', ParseUUIDPipe) id: string) { ... }

@Patch(':id')
@AuthWithOwnership()
@SubscriptionResource()
@Roles('superadmin', 'platform_admin', 'company_owner') // company_admin без права смены тарифа/критичных опер.
@Throttle(20, 60)
async update(@Param('id', ParseUUIDPipe) id: string, @Body(EnhancedValidationPipe) dto: UpdateSubscriptionDto) { ... }

@Patch(':id/cancel')
@AuthWithOwnership()
@SubscriptionResource()
@Roles('superadmin', 'platform_admin', 'company_owner')
@Throttle(10, 60)
async cancel(@Param('id', ParseUUIDPipe) id: string) { ... }

@Post('check-expired')
@AuthWithOwnership()
// Рекомендуется удалить endpoint и перевести в @Cron, иначе:
@Roles('superadmin', 'platform_admin', 'system_operator')
@Throttle(1, 60)
async checkExpiredSubscriptions() { ... }

2) Module — DI интерсепторов/общего модуля

imports: [TypeOrmModule.forFeature([Subscription, Tariff, Company])/*, CommonModule*/]
providers: [
  SubscriptionsService,
  SubscriptionsDataService,
  SubscriptionsBusinessService,
  SubscriptionsValidationService,
  SubscriptionLimitsService,
  SubscriptionsMapperService,
  AuditService,
  // Интерсепторы, если не глобальные:
  AuditLoggingInterceptor,
  SecurityHeadersInterceptor,
]

3) Service — безопасная работа с companyId и валидацией

- В create: сервис уже принимает dto; контроллер подставляет companyId из req.user. Валидация create(dto) должна убеждаться, что dto.companyId валиден, но не из внешнего тела. Это ок.
- В findByCompany: добавить валидацию:
await this.subscriptionsValidationService.validatePagination(page, limit);
if (status) await this.subscriptionsValidationService.validateStatusFilter(status);

- В getCompanySubscriptionStats: заменить на агрегирующий метод в DataService (понадобится позже — когда пришлешь SubscriptionsDataService).

Роли — унификация (предлагаемый стандарт)

- Платформа:
  - 'superadmin'
  - 'platform_admin'
  - 'auditor' (read-only)
  - 'system_operator' (служебные/cron)
- Компания:
  - 'company_owner'
  - 'company_admin'
  - 'manager' (нет доступа к подпискам/финансам по умолчанию)
  - 'cashier' (может читать подписку)
Примечание: строки ролей должны совпадать с auth.constants.ts. Если у вас уже заведены PascalCase — согласуем и приведем к одному стандарту snake_case.

Что нужно дальше прислать для полного аудита субскрипшенов
- DTO: create-subscription.dto.ts, update-subscription.dto.ts, response DTO.
- constants/subscriptions.constants.ts
- types/subscriptions.types.ts (особенно enum SubscriptionStatus)
- services: subscriptions-business.service.ts, subscriptions-data.service.ts, subscriptions-validation.service.ts, subscriptions-mapper.service.ts, subscription-limits.service.ts
- common/decorators и guards, которые вы используете здесь: CompanySubscriptions, SubscriptionResource, AuthWithOwnership — чтобы проверить, как именно извлекается companyId/ресурс (особенно для create).
- database/entities/subscription.entity.ts (фактическая версия, сейчас в проекте) — сверим статусы, индексы, связи.

Дополнительно по комплаенсу и связке с биллингом
- В корневом модуле subscriptions мы закроем 0/10 по уязвимостям: RBAC/ownership, валидаторы, XSS, throttling, аудит.
- Служебный endpoint переведем в @Cron.
- Добавим совместимость с будущим submodule subscription-billing (compliance guard, webhook signature guard, права потребителя).
- После фикса контроллера/модуля/сервиса перейдем к слою data/validation/business — там добавим строгие проверки статусов/переходов, транзакции и инварианты.

Готов идти дальше. Пришли, пожалуйста, следующие файлы (DTO, constants, types, services), чтобы я продолжил аудит “файл за файлом” и дал патчи до уровня 0/10. Если допускаются несовместимые изменения API (вариант /companies/:companyId/subscriptions) — подтверждай, это самый чистый способ закрыть основную дыру.

Отлично, принял вторую пачку. Я внимательно просмотрел 6 файлов: constants, types, interfaces и 4 DTO. Ниже — сжатый итог, затем детальный аудит по каждому файлу с предложениями правок и точечными патчами. В конце — список следующих файлов, которые нужны для продолжения до уровня 0/10.

Критические замечания по текущему набору
- Multi-tenant риск при создании подписки: CreateSubscriptionDto принимает companyId из body. В контроллере это уже отмечено как уязвимость. Нужно принудительно подменять companyId из req.user.companyId (или вынести companyId в маршрут param) и/или убрать поле из DTO.
- Роли: в контроллере используются legacy ('admin', 'owner'). В этих файлах ролей нет, но важно синхронизировать RBAC на уровне контроллера/guard'ов: superadmin, platform_admin, company_owner, company_admin (+ читатели cashier, auditor).
- XSS/ввод: строковые поля (paymentMethod) не санитизируются. Нужна санитизация/нормализация и whitelisting.
- Комплаенс/финансы: создание/обновление подписки позволяет клиенту явно задавать status. Это критично — статус должен контролироваться бизнес-логикой (переходы по строгим правилам), а не напрямую из запроса.
- Валидация дат: используется IsDate + Type(() => Date). Безопаснее и предсказуемее — IsISO8601({ strict: true }) или IsDateString, и валидация endDate > startDate, startDate >= now (или согласно правилам).
- Типизация: types ссылаются на DTO через import(...) внутри типа PaginatedSubscriptionsResult — потенциальный цикл и нарушение слоев. Лучше тип вывести в общую model-типизацию без импорта DTO.

Детальный аудит и рекомендации

1) subscriptions.constants.ts
Что хорошо:
- Понятные DEFAULTS/REDIS_KEYS/CACHE_TTL, хорошие ключи для кэша.
- Аудит-экшены собраны из AuditAction.

Замечания/улучшения:
- Добавить явные RATE_LIMITS для контроллера, чтобы не хардкодить числа в декораторах:
  - CREATE: 10/мин, READ: 50/мин, GET_ACTIVE: 100/мин, UPDATE/CANCEL: 20/мин, CRON: 1/мин.
- Явные статусы-переходы (allowed transitions) для enforce в ValidationService.
- Разрешенные методы оплаты (enum/whitelist). Свободная строка для paymentMethod — риск.

Предлагаемый фрагмент:
export const SUBSCRIPTIONS_CONSTANTS = {
  ...
  RATE_LIMITS: {
    CREATE: { limit: 10, ttlSec: 60 },
    LIST: { limit: 50, ttlSec: 60 },
    GET_ACTIVE: { limit: 100, ttlSec: 60 },
    UPDATE: { limit: 20, ttlSec: 60 },
    CANCEL: { limit: 10, ttlSec: 60 },
    CRON: { limit: 1, ttlSec: 60 },
  },
  STATUS_TRANSITIONS: {
    pending:   ['active', 'canceled'],
    active:    ['suspended', 'canceled', 'expired'],
    suspended: ['active', 'canceled'],
    canceled:  [],
    expired:   [],
    inactive:  ['active'], // опционально, если используется
  } as const,
  PAYMENT_METHODS: ['manual','bank_transfer','card','mir','sbp','wallet'] as const,
} as const;

2) subscriptions.types.ts
Что хорошо:
- Перечисление статусов консистентно.
- Богатые типы для лимитов, статистики, multiple checks.

Замечания/улучшения:
- Вынести PaginatedSubscriptionsResult из зависимости на SubscriptionResponseDto. Типы не должны импортировать DTO (во избежание циклов).
- Ввести тип enum для paymentMethod, чтобы жёстко валидировать значения.
- Рассмотреть выделение StatusTransitionMap в types для повторного использования в validation.

Предлагаемый фрагмент:
export enum SubscriptionPaymentMethod {
  MANUAL = 'manual',
  BANK_TRANSFER = 'bank_transfer',
  CARD = 'card',
  MIR = 'mir',
  SBP = 'sbp',
  WALLET = 'wallet',
}

export interface SubscriptionListItem {
  id: string;
  companyId: string;
  startDate: Date;
  endDate: Date;
  status: SubscriptionStatus;
  paymentMethod: SubscriptionPaymentMethod | string;
  autoRenew: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedSubscriptionsResult {
  items: SubscriptionListItem[]; // без импорта DTO
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type StatusTransitionMap = Record<SubscriptionStatus, SubscriptionStatus[]>;

3) subscriptions.interface.ts
Что хорошо:
- Контракты слоев сформулированы корректно.

Замечания/улучшения:
- Чтобы усилить комплаенс, добавить метод для проверок возможного перехода статуса (или оставить это полностью в ValidationService — предпочтительно).
- Добавить в ISubscriptionsDataService агрегирующие методы для статистики (counts по статусам), чтобы не тянуть 1000 записей в память.

Предлагаемый фрагмент:
export interface ISubscriptionsDataService {
  ...
  countByStatus(companyId: string): Promise<Record<SubscriptionStatus, number>>;
}

4) create-subscription.dto.ts
Критично:
- companyId приходит из body. Это отверстие для multi-tenant атаки.
  - Рекомендация: убрать поле из DTO либо сделать @ApiHideProperty и в контроллере/бизнес-слое всегда подменять companyId значением из req.user.companyId. Лучший вариант — перенести companyId в param /companies/:companyId/subscriptions и убрать из DTO.
- status в create — не должен устанавливаться клиентом. Статус назначается бизнес-логикой (обычно pending→active после валидаций/оплаты).
- paymentMethod — свободная строка, без санитизации/whitelist.

Также:
- Перейти с IsDate на IsISO8601({ strict: true }) или IsDateString, плюс ручная проверка endDate > startDate.
- Тримминг/санитизация строковых полей (paymentMethod).
- Бизнес-правило: autoRenew = true допустимо только при подходящем методе оплаты (card/mir/sbp), а не manual/bank_transfer.

Предлагаемый патч (идея):
export class CreateSubscriptionDto {
  // УБРАТЬ ИЗ ПУБЛИЧНОГО API:
  // @ApiHideProperty()
  // companyId: string;

  @ApiProperty({ description: 'ID тарифного плана', example: '...' })
  @IsNotEmpty()
  @IsUUID(4)
  tariffId: string;

  @ApiPropertyOptional({ description: 'Дата начала (ISO8601)' })
  @IsOptional()
  @IsISO8601({ strict: true }, { message: 'startDate должен быть ISO8601' })
  startDate?: string; // заменить на string, а в маппере конвертировать в Date

  @ApiProperty({ description: 'Дата окончания (ISO8601)' })
  @IsNotEmpty()
  @IsISO8601({ strict: true }, { message: 'endDate должен быть ISO8601' })
  endDate: string;

  @ApiPropertyOptional({
    description: 'Способ оплаты',
    enum: SUBSCRIPTIONS_CONSTANTS.PAYMENT_METHODS,
    default: SUBSCRIPTIONS_CONSTANTS.DEFAULTS.DEFAULT_PAYMENT_METHOD
  })
  @IsOptional()
  @IsIn(SUBSCRIPTIONS_CONSTANTS.PAYMENT_METHODS as unknown as string[], { message: 'Недопустимый способ оплаты' })
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  paymentMethod?: string;

  @ApiPropertyOptional({ description: 'Автопродление', default: SUBSCRIPTIONS_CONSTANTS.DEFAULTS.AUTO_RENEW })
  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;

  // status — ИСКЛЮЧИТЬ из DTO, перевод статуса только бизнес-логикой
}

И обязательно: в ValidationService.validateCreateData проверять:
- endDate > (startDate || now),
- autoRenew => paymentMethod ∈ {card, mir, sbp},
- companyId из контекста, не из body,
- тариф существует и активен.

5) update-subscription.dto.ts
Замечания:
- Изменение status через общий update — риск. Лучше отдельный endpoint для смены статуса (с строгой проверкой переходов). Если оставляем в одном DTO — ValidationService обязан применять STATUS_TRANSITIONS и роль (кто может менять).
- paymentMethod — та же история с whitelist/sanitize.
- endDate — валидация ISO8601; нельзя устанавливать раньше startDate; продление должно быть > текущей endDate.

Предлагаемый патч (идея):
export class UpdateSubscriptionDto {
  @ApiPropertyOptional({ description: 'ID тарифного плана' })
  @IsOptional()
  @IsUUID(4)
  tariffId?: string;

  @ApiPropertyOptional({ description: 'Новая дата окончания (ISO8601)' })
  @IsOptional()
  @IsISO8601({ strict: true })
  endDate?: string;

  @ApiPropertyOptional({ description: 'Новый статус', enum: SubscriptionStatus })
  @IsOptional()
  @IsEnum(SubscriptionStatus)
  // Фактическая проверка допустимости перехода — в ValidationService
  status?: SubscriptionStatus;

  @ApiPropertyOptional({
    description: 'Способ оплаты',
    enum: SUBSCRIPTIONS_CONSTANTS.PAYMENT_METHODS
  })
  @IsOptional()
  @IsIn(SUBSCRIPTIONS_CONSTANTS.PAYMENT_METHODS as unknown as string[])
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  paymentMethod?: string;

  @ApiPropertyOptional({ description: 'Автопродление' })
  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;
}

6) paginated-subscriptions-response.dto.ts
Что хорошо:
- Чёткая модель пагинации.

Замечания:
- Можно добавить поля hasNext/hasPrev (не критично).
- Если уйдем от зависимостей типов на DTO (см. выше), здесь всё ок.

7) subscription-response.dto.ts
Что хорошо:
- DTO информативный с вложенным TariffInfoDto; нет чувствительных данных.

Замечания:
- Дополнительно можно скрывать часть полей по ролям в MapperService (например, cashier/auditor read-only).
- Поле paymentMethod — норм, но если появится чувствительная детализация — выносить в урезанную форму либо фильтровать по ролям.

Ролевая модель (синхронизация)
- Платформа:
  - 'superadmin', 'platform_admin', 'auditor', 'system_operator'
- Компания:
  - 'company_owner', 'company_admin', 'cashier' (read), без legacy 'admin'/'owner'
- Контроллер должен быть обновлен: create/read — superadmin, platform_admin, company_owner, company_admin; update/cancel — superadmin, platform_admin, company_owner; read — добавить cashier, auditor (read-only), если это соответствует политике.

Обязательные правки (минимальный чеклист на данном этапе)
- Убрать возможность задавать companyId и status на create из клиента: companyId — из контекста; status — выставляет бизнес-слой.
- Для update — статус менять только с проверкой переходов (STATUS_TRANSITIONS) и ролей.
- Санитизация и whitelist для paymentMethod; IsISO8601 для дат; проверка endDate > startDate.
- Перестать импортировать DTO в types (PaginatedSubscriptionsResult) — заменить на чистые model-типы.
- В constants добавить RATE_LIMITS, STATUS_TRANSITIONS, PAYMENT_METHODS.

Небольшие патчи (готовы к вставке)

1) constants — добавить статусы/методы/лимиты:

export const SUBSCRIPTIONS_CONSTANTS = {
  ...,
  RATE_LIMITS: {
    CREATE: { limit: 10, ttlSec: 60 },
    LIST: { limit: 50, ttlSec: 60 },
    GET_ACTIVE: { limit: 100, ttlSec: 60 },
    UPDATE: { limit: 20, ttlSec: 60 },
    CANCEL: { limit: 10, ttlSec: 60 },
    CRON: { limit: 1, ttlSec: 60 },
  },
  STATUS_TRANSITIONS: {
    pending:   ['active', 'canceled'],
    active:    ['suspended', 'canceled', 'expired'],
    suspended: ['active', 'canceled'],
    canceled:  [],
    expired:   [],
    inactive:  ['active'],
  } as const,
  PAYMENT_METHODS: ['manual','bank_transfer','card','mir','sbp','wallet'] as const,
} as const;

2) types — удалить импорт DTO в PaginatedSubscriptionsResult и ввести модель:

export interface SubscriptionListItem {
  id: string;
  companyId: string;
  startDate: Date;
  endDate: Date;
  status: SubscriptionStatus;
  paymentMethod: string;
  autoRenew: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedSubscriptionsResult {
  items: SubscriptionListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

3) DTO — запретить client-side status на create и санитизация paymentMethod
- Исключить status из CreateSubscriptionDto.
- В обоих DTO:
  @IsIn(SUBSCRIPTIONS_CONSTANTS.PAYMENT_METHODS as unknown as string[])
  @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)

4) ValidationService (будет применено, когда пришлёте файл)
- validateCreateData:
  - companyId из контекста,
  - тариф активен,
  - endDate > (startDate || now),
  - если autoRenew === true → paymentMethod ∈ {card, mir, sbp}.
- validateUpdateData:
  - если status меняется → допустим ли переход (STATUS_TRANSITIONS[current] содержит newStatus),
  - изменение тарифа — только роли superadmin/platform_admin/company_owner,
  - продление — newEndDate > currentEndDate.

Запрос на следующие файлы для продолжения аудита
Чтобы довести модуль до 0/10 и синхронизировать с будущим subscription-billing, пришли, пожалуйста:
- services:
  - subscriptions-business.service.ts
  - subscriptions-data.service.ts
  - subscriptions-validation.service.ts
  - subscriptions-mapper.service.ts
  - subscription-limits.service.ts
- database/entities/subscription.entity.ts (фактическая текущая версия)
- common/guards и декораторы, используемые в контроллере:
  - AuthWithOwnership, CompanySubscriptions, SubscriptionResource
- modules/auth/constants/auth.constants.ts (финальная матрица ролей)
- Если есть — глобальная EnhancedValidationPipe (проверю, хватает ли там XSS-санитизации)

Как только получу эти файлы — сделаю следующий проход: закрою статусные переходы, транзакционность, индексы, агрегацию статистики, уберу HTTP CRON, добавлю строгие ограничения по ролям и подготовлю совместимость с субмодулем billing (включая NPS/MIR и комплаенс hooks).

Отлично, спасибо! Разобрал subscription-limits.service. Ниже — выводы по безопасности/надежности и точечные правки. В конце попрошу прислать subscriptions-business.service.ts для следующего шага.

Ключевые находки и риски
- Multi-tenant целостность:
  - Сервис доверяет companyId из вызова. Это ок для внутреннего использования, но важно, чтобы контроллер/guards всегда подставляли companyId из контекста. На уровне сервиса можно добавить “fail secure” поведение при невалидном UUID.
- Возможны гонки при проверке лимитов:
  - checkLimit сравнивает currentCount + increment с limit без атомарности. При параллельных операциях возможна гонка (два запроса пройдут проверку). Для финпотоков нужно либо транзакционное резервирование, либо распределённая блокировка.
- Неиспользуемые REDIS_KEYS/CACHE_TTL:
  - Есть константы кэша, но сервис каждый раз идёт в БД. Это ударит по производительности при высоких нагрузках. Рекомендую кэшировать “активную подписку с тарифом” на TTL и инвалидировать при изменениях.
- Неопределённость при дубликатах ACTIVE:
  - getActiveSubscription берёт первый попавшийся findOne без сортировки. Если (по багу) активных две, выбор неявный. Лучше сортировать по endDate DESC (или createdAt DESC) и/or закрепить на уровне БД уникальный partial индекс (companyId, status='active').
- Аудит без контекста пользователя:
  - logLimitCheckFailed/logLimitExceeded пишутся без userId, ip, userAgent. Для комплаенса лучше логировать контекст (если доступен).
- Потенциальная неэффективность checkMultipleLimits:
  - Сейчас N раз ходит в БД (через checkLimit). Лучше получить активную подписку один раз.
- Мелочи:
  - Импорт Tariff не используется (чистка).
  - Нет валидации, что currentCount и increment — неотрицательные целые.

Рекомендованные изменения (безопасность и надёжность)
1) Жёсткая выборка “активной” подписки
- Добавить сортировку по endDate DESC, createdAt DESC, плюс relations: ['tariff'] уже есть.

private async getActiveSubscription(companyId: string): Promise<Subscription | null> {
  return this.subscriptionsRepository.findOne({
    where: { companyId, status: SubscriptionStatus.ACTIVE },
    relations: ['tariff'],
    order: { endDate: 'DESC', createdAt: 'DESC' },
  });
}

2) Кэширование активной подписки и лимитов
- Использовать SUBSCRIPTIONS_CONSTANTS.REDIS_KEYS.ACTIVE_SUBSCRIPTION и CACHE_TTL.ACTIVE_SUBSCRIPTION.
- Инвалидировать кэш при create/update/cancel подписки (в бизнес‑сервисе).

Пример (если используете CacheModule):

import { Inject, Optional } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

constructor(
  @InjectRepository(Subscription) private readonly subscriptionsRepository: Repository<Subscription>,
  private readonly auditService: AuditService,
  @Optional() @Inject(CACHE_MANAGER) private readonly cache?: Cache,
) {}

private async getActiveSubscriptionCached(companyId: string): Promise<Subscription | null> {
  const key = SUBSCRIPTIONS_CONSTANTS.REDIS_KEYS.ACTIVE_SUBSCRIPTION(companyId);
  if (this.cache) {
    const cached = await this.cache.get<Subscription>(key);
    if (cached) return cached;
  }
  const sub = await this.getActiveSubscription(companyId);
  if (this.cache && sub) {
    await this.cache.set(key, sub, SUBSCRIPTIONS_CONSTANTS.CACHE_TTL.ACTIVE_SUBSCRIPTION);
  }
  return sub;
}

public async invalidateCompanyCaches(companyId: string): Promise<void> {
  if (!this.cache) return;
  await this.cache.del(SUBSCRIPTIONS_CONSTANTS.REDIS_KEYS.ACTIVE_SUBSCRIPTION(companyId));
  await this.cache.del(SUBSCRIPTIONS_CONSTANTS.REDIS_KEYS.COMPANY_LIMITS(companyId));
}

3) Защита от гонок: “проверить и зарезервировать”
- Для критичных операций добавьте метод с распределённой блокировкой (redlock) по ключу companyId+limitType. Это даёт “один владелец” на короткое время для атомарной проверки/резерва.
- Если redlock ещё не подключён, можно начать с простой сериализации через Redis SET NX PX.

Идея API:
async checkAndReserveLimit(companyId: string, type: keyof TariffLimits, getCurrentCount: () => Promise<number>, increment = 1, ctx?: AuditContext): Promise<LimitCheckResult> {
  // 1) Acquire lock: subscriptions:lock:${companyId}:${type}, TTL ~ 3-5 сек
  // 2) current = await getCurrentCount()  // рассчитываем на момент блокировки
  // 3) validate against limit
  // 4) release lock
}

Примечание: возвращаемый результат одинаковый, но этот метод предназначен для использования внутри бизнес-операций, где сразу после проверки идёт запись (чтобы окна гонки не было).

4) Аудит с контекстом
- Расширить методы checkUserLimit/checkCustomerLimit/... так, чтобы опционально принимать контекст аудит‑события: { userId, userIp, userAgent, requestId }. Если есть — логируем в auditService вместе с companyId и limitType.

Пример расширения сигнатур (обратная совместимость):
async checkUserLimit(companyId: string, currentCount: number, increment = 1, ctx?: AuditContext): Promise<LimitCheckResult> { ... }

И использовать:
await this.auditService.logLimitExceeded({ companyId, userId: ctx?.userId, metadata: { ... } });

5) Оптимизация checkMultipleLimits
- Избежать N запросов к БД: получить активную подписку один раз и считать лимиты в памяти.

Пример замены метода:
async checkMultipleLimits(companyId: string, checks: Array<{ type: keyof TariffLimits; currentCount: number; increment?: number; }>): Promise<Array<LimitCheckResult & { type: keyof TariffLimits }>> {
  const subscription = await this.getActiveSubscriptionCached(companyId);
  const results: Array<LimitCheckResult & { type: keyof TariffLimits }> = [];

  for (const check of checks) {
    const limit = subscription?.tariff ? subscription.tariff[check.type] : null;
    const increment = check.increment ?? 1;
    const current = check.currentCount;

    if (!subscription || !subscription.tariff) {
      await this.auditService.logLimitCheckFailed({ companyId, metadata: { limitType: check.type, reason: 'No active subscription', currentCount: current, increment } });
      results.push({ allowed: false, currentCount: current, limit: null, limitType: String(check.type), type: check.type });
      continue;
    }

    if (limit === null || limit === undefined || limit === -1) {
      results.push({ allowed: true, currentCount: current, limit: null, limitType: String(check.type), type: check.type });
      continue;
    }

    const newCount = current + increment;
    const allowed = newCount <= limit;

    if (!allowed) {
      await this.auditService.logLimitExceeded({
        companyId,
        metadata: { limitType: check.type, currentCount: current, increment, newCount, limit, tariffName: subscription.tariff.name }
      });
    }
    results.push({ allowed, currentCount: current, limit, limitType: String(check.type), type: check.type });
  }

  return results;
}

6) Валидация входа (fail secure)
- На уровне сервиса: мягкая проверка на UUID v4 и неотрицательные currentCount/increment; при ошибке — логировать audit и возвращать allowed=false. Это защитит от случайных вызовов без пайпов.

Пример:
private isValidUuidV4(id: string): boolean { return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id); }

7) DB-уровень: уникальность “активной” подписки
- Рекомендую добавить частичный уникальный индекс:
  - Уникальность по (company_id) WHERE status = 'active'
- И индекс на (company_id, status) уже есть? Если нет — добавить.
- Это устраняет двусмысленность при чтении активной подписки.

8) Чистка и минимальные улучшения
- Удалить неиспользуемый импорт Tariff.
- В getCompanyLimitsInfo — isUnlimited: возможно логичнее считать “безлимитность” по каждой метрике, а флаг isUnlimited оставить как “все метрики без лимитов”. Это у вас уже так — норм.

Что потребуется добавить в модуль
- Если подключаем кэш: импорт CacheModule (или ваш Redis провайдер) в SubscriptionsModule и прокинуть CACHE_MANAGER.
- Инвалидацию кэша вызывать из SubscriptionsBusinessService при create/update/cancel.

Мини-патч для SubscriptionsModule (если кэш локальный)
imports: [
  TypeOrmModule.forFeature([Subscription, Tariff, Company]),
  // CacheModule.register() — если ещё не глобален
],

Тесты (минимум)
- Возврат allowed=false, когда нет активной подписки + создаётся audit событие.
- Безлимитный тариф (null/-1) → allowed=true.
- Порог: newCount == limit → allowed=true; newCount == limit+1 → false.
- checkMultipleLimits делает ровно 1 вызов БД для подписки.
- (При внедрении блокировок) два параллельных вызова checkAndReserve для одного типа лимита → второй отклонён.

Важно для комплаенса и нулевого риска
- Fail-secure поведение при ошибках БД/кэша: возвращать allowed=false, логировать аудит.
- Аудит должен содержать контекст (userId/ip/userAgent) — добавьте опционально в вызовы, где доступно.
- Интеграция с будущим subscription-billing: при смене тарифа/отмене/истечении обязательно инвалидировать кэш лимитов/активной подписки.

Готов двигаться дальше. Пришли, пожалуйста:
- subscriptions-business.service.ts (следующий важнейший слой для транзакций, статусных переходов, инвалидации кэшa и аудита).
- subscriptions-data.service.ts (посмотрю запросы, индексы, транзакции и добавлю countByStatus).
- subscriptions-validation.service.ts (перенесём туда проверку переходов статусов, дат, autoRenew/paymentMethod).
- subscriptions-mapper.service.ts (для роли-ориентированной выдачи).
- database/entities/subscription.entity.ts (сверим enum/индексы; подготовим миграцию на частичный уникальный индекс ACTIVE).

Отлично, теперь вижу ключевые слои: limits, business, data, mapper, validation. Иду по ним “без скидок” — цель 0/10 уязвимостей и готовность к интеграции с subscription-billing и комплаенсом.

Критические находки (устранить в первую очередь)
- Активный статус по умолчанию при создании
  - Где: SubscriptionsDataService.create — status по умолчанию ставится ACTIVE.
  - Риск: подписка активируется без прохождения комплаенса/оплаты; обход бизнес-правил.
  - Фикс: по умолчанию PENDING; перевод в ACTIVE — только через бизнес-логику (после billing-compliance).
- Отмена подписки без валидации перехода статуса
  - Где: SubscriptionsBusinessService.cancelSubscription — прямое обновление на CANCELED без вызова ValidationService.
  - Риск: обход правил переходов, возможные нарушения прав потребителей/договорных условий.
  - Фикс: либо дергать SubscriptionsValidationService.validateUpdateData перед апдейтом, либо вынести cancel в отдельный валидатор validateCancel.
- Нет транзакций при “деактивация старых + создание новой”
  - Где: createSubscription (autoDeactivatePreviousSubscriptions → create) выполняется в разных запросах.
  - Риск: гонки/двойная ACTIVE при параллельных запросах.
  - Фикс: обернуть в транзакцию QueryRunner: деактивация старых → вставка новой → аудит → commit. В паре с частичным уникальным индексом на ACTIVE это даст 100% консистентность.
- Возможность иметь несколько ACTIVE
  - Где: нет уникального ограничения в БД; findActiveByCompany без сортировки.
  - Риск: неоднозначные чтения и некорректные лимиты.
  - Фикс: частичный уникальный индекс (company_id, status='active') + order в findActiveByCompany.
- Гонки/перегрузка БД на проверке лимитов
  - Где: SubscriptionLimitsService.checkLimit — каждый раз дергает БД; checkMultipleLimits делает N запросов.
  - Риск: гонки и перфоманс под нагрузкой.
  - Фикс: кэш активной подписки (TTL 30 мин), единичная выборка в checkMultipleLimits; для критичных операций — распределенная блокировка (redlock) и метод checkAndReserveLimit.
- Несогласованность методов оплаты
  - Где: ValidationService.validateBusinessRules — ['manual', 'bank_transfer', 'credit_card', 'cash'].
  - Риск: в биллинге по комплаенсу РФ нужен NPS: MIR, SBP, без “cash” для подписок.
  - Фикс: выровнять с SUBSCRIPTIONS_CONSTANTS.PAYMENT_METHODS (manual, bank_transfer, card, mir, sbp, wallet) и использовать единую проверку.
- Прямые Error вместо доменных исключений
  - Где: BusinessService.update/cancel/renew, DataService.update — throw new Error(...)
  - Риск: неконсистентные ответы API; сложнее трекать аудит/метрики.
  - Фикс: использовать кастомные domain exceptions.

Рекомендованные изменения по файлам

1) subscriptions-data.service.ts — безопасность и целостность
- create: статус по умолчанию PENDING, игнорировать входящий status
  - Чтобы клиент не мог проставить ACTIVE через DTO.
- findActiveByCompany: добавить сортировку по endDate DESC, createdAt DESC.
- update: заменить throw Error на SubscriptionNotFoundException.
- Новый метод countByStatus для статистики (чтобы не грузить 1000 записей в память).

Пример патча:
async create(data: CreateSubscriptionData): Promise<Subscription> {
  const subscription = this.subscriptionsRepository.create({
    ...data,
    startDate: data.startDate || new Date(),
    status: SubscriptionStatus.PENDING, // было ACTIVE
    paymentMethod: data.paymentMethod || SUBSCRIPTIONS_CONSTANTS.DEFAULTS.DEFAULT_PAYMENT_METHOD,
    autoRenew: data.autoRenew ?? SUBSCRIPTIONS_CONSTANTS.DEFAULTS.AUTO_RENEW,
  });
  return this.subscriptionsRepository.save(subscription);
}

async findActiveByCompany(companyId: string): Promise<Subscription | null> {
  return this.subscriptionsRepository.findOne({
    where: { companyId, status: SubscriptionStatus.ACTIVE },
    relations: ['tariff'],
    order: { endDate: 'DESC', createdAt: 'DESC' },
  });
}

async update(id: string, data: UpdateSubscriptionData): Promise<Subscription> {
  await this.subscriptionsRepository.update(id, data);
  const updated = await this.findById(id);
  if (!updated) throw new SubscriptionNotFoundException(id);
  return updated;
}

async countByStatus(companyId: string): Promise<Record<SubscriptionStatus, number>> {
  const rows = await this.subscriptionsRepository.createQueryBuilder('s')
    .select('s.status', 'status')
    .addSelect('COUNT(*)', 'cnt')
    .where('s.companyId = :companyId', { companyId })
    .groupBy('s.status')
    .getRawMany<{ status: SubscriptionStatus; cnt: string }>();
  const map: Record<SubscriptionStatus, number> = {
    active: 0, pending: 0, suspended: 0, canceled: 0, expired: 0, inactive: 0,
  } as any;
  for (const r of rows) map[r.status] = Number(r.cnt);
  return map;
}

2) subscriptions-business.service.ts — транзакции, валидация, кэш
- createSubscription: исполнять “деактивация старых + создание новой (PENDING)” атомарно в транзакции; лог аудит — после insert. Не активировать без billing-compliance.
- cancelSubscription: перед апдейтом — валидация перехода (validateUpdateData) или новая validateCancel; использовать доменные исключения; после апдейта — инвалидировать кэш активной подписки.
- renewSubscription: валидация (newEndDate > currentEndDate), права, транзакция; после — аудит и инвалидация кэша.
- Везде: добавить инвалидацию кэша лимитов/активной подписки.

Схема транзакции (эскиз):
async createSubscription(data: CreateSubscriptionData): Promise<Subscription> {
  const runner = this.subscriptionsDataService.getQueryRunner(); // добавить метод-обертку
  await runner.startTransaction();
  try {
    await this.subscriptionsDataService.deactivateCompanySubscriptionsTx(runner, data.companyId);
    const subscription = await this.subscriptionsDataService.createTx(runner, { ...data, status: SubscriptionStatus.PENDING });
    await this.auditService.logSubscriptionCreated({ ... });
    await runner.commitTransaction();
    await this.invalidateCompanyCaches(data.companyId);
    return subscription;
  } catch (e) {
    await runner.rollbackTransaction();
    throw e;
  } finally {
    await runner.release();
  }
}

И аналогично для cancel/renew/update при смене статуса/тарифа.

3) subscriptions-limits.service.ts — перфоманс, гонки, аудит
- Кэш активной подписки (TTL 30 мин) и лимитов; инвалидация из бизнес-сервиса при create/update/cancel.
- checkMultipleLimits: получать подписку один раз и считать в памяти.
- Подготовить метод checkAndReserveLimit с Redis-локом для критичных потоков (после интеграции с billing).
- Логи audit — по возможности с user контекстом (userId/ip/userAgent).

Пример оптимизации checkMultipleLimits (как в прошлом сообщении) — единичный запрос к БД.

4) subscriptions-validation.service.ts — единая “истина” правил
- CompanyNotFoundException: использовать вместо ValidationDataException для компании.
- Статусы/переходы: синхронизировать с SUBSCRIPTIONS_CONSTANTS.STATUS_TRANSITIONS (чтобы не дублировать логику).
- Payment methods: заменить списки на SUBSCRIPTIONS_CONSTANTS.PAYMENT_METHODS, убрать “cash”, заменить “credit_card” на “card” и добавить “mir”, “sbp”.
- Продление: при update endDate — проверять, что endDate > currentEndDate (а не только > startDate).
- Активировать только через billing/compliance: запретить переход в ACTIVE в общем update без подтверждения (временный флаг через конфиг: COMPLIANCE_STRICT_MODE).

Фрагменты:
if (!exists) {
  throw new CompanyNotFoundException(companyId);
}

private validateStatusTransition(current: SubscriptionStatus, next?: SubscriptionStatus) {
  if (!next) return;
  const allowed = SUBSCRIPTIONS_CONSTANTS.STATUS_TRANSITIONS[current] || [];
  if (!allowed.includes(next)) {
    throw new SubscriptionStatusTransitionException(current, next);
  }
}

private validateBusinessRules(data: CreateSubscriptionData): void {
  // ...
  if (data.paymentMethod) {
    const allowed = SUBSCRIPTIONS_CONSTANTS.PAYMENT_METHODS as unknown as string[];
    if (!allowed.includes(data.paymentMethod)) {
      throw new ValidationDataException('paymentMethod', `Неподдерживаемый способ оплаты: ${data.paymentMethod}`);
    }
  }
}

5) subscriptions-mapper.service.ts — роль-ориентированная выдача (рекомендация)
- Сейчас DTO без чувствительных полей — ок. Но лучше подготовить возможность фильтровать поля по ролям (cashier/auditor — только чтение).
- Никакого PII/секретов — ок.

DB и миграции (обязательно)
- Частичный уникальный индекс: одна ACTIVE на компанию.
  - Postgres: CREATE UNIQUE INDEX uniq_active_subscription_per_company ON subscriptions (company_id) WHERE status = 'active';
- Индекс на (company_id, status), (company_id, end_date).
- Если в entity нет isActive у Tariff — учесть валидатор (вы используете tariff.isActive в ValidationService).

Интеграция с ролями (RBAC)
- Контроллер: заменить legacy роли на новый стандарт:
  - create, list, getActive, getOne: superadmin, platform_admin, company_owner, company_admin (+ read для cashier, auditor).
  - update, cancel: superadmin, platform_admin, company_owner.
- Валидация прав внутри бизнес-операций (особенно смена тарифа/статуса).

Мини-патчи (готовые вставки)

A) DataService.create — статус PENDING
status: SubscriptionStatus.PENDING,

B) ValidationService — company exception и методы оплаты
if (!exists) throw new CompanyNotFoundException(companyId);
const allowedPaymentMethods = SUBSCRIPTIONS_CONSTANTS.PAYMENT_METHODS as unknown as string[];
if (data.paymentMethod && !allowedPaymentMethods.includes(data.paymentMethod)) {
  throw new ValidationDataException('paymentMethod', `Неподдерживаемый способ оплаты: ${data.paymentMethod}`);
}

C) BusinessService.cancel — валидация перехода и доменные ошибки
async cancelSubscription(id: string): Promise<Subscription> {
  this.logger.log(`Отмена подписки: ${id}`);
  const before = await this.subscriptionsDataService.findById(id);
  if (!before) throw new SubscriptionNotFoundException(id);

  // Валидация перехода
  await this.subscriptionsValidationService.validateUpdateData(id, { status: SubscriptionStatus.CANCELED, autoRenew: false });

  const updated = await this.subscriptionsDataService.update(id, { status: SubscriptionStatus.CANCELED, autoRenew: false });

  await this.auditService.logSubscriptionCanceled({ ... });
  await this.invalidateCompanyCaches(before.companyId);
  return updated;
}

D) LimitsService.checkMultipleLimits — единичное чтение подписки
см. оптимизированный вариант из моего предыдущего сообщения.

E) DataService.findActiveByCompany — сортировка
order: { endDate: 'DESC', createdAt: 'DESC' },

F) Частичный уникальный индекс (миграция)
await queryRunner.query(`
  CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_subscription_per_company
  ON subscriptions (company_id)
  WHERE status = 'active'
`);

Что ещё рекомендую
- Перенести CRON endpoint в @Cron (Nest Schedule) — убрать HTTP-поверхность. Если нужен endpoint для ручного запуска — ввести HMAC‑подпись и роль system_operator.
- Вынести RATE_LIMITS, STATUS_TRANSITIONS и PAYMENT_METHODS в SUBSCRIPTIONS_CONSTANTS (выше показано) и использовать в DTO/валидации/контроллере.
- Инвалидация кэша: добавить метод invalidateCompanyCaches(companyId) в SubscriptionLimitsService (или общий CacheService) и дергать его из бизнес-сервиса после create/update/cancel/renew.

Что ещё нужно прислать для финализации (и 0/10)
- database/entities/subscription.entity.ts — сверим enum статусов, индексы; подготовлю миграции (partial unique, композитные индексы).
- modules/auth/constants/auth.constants.ts — чтобы точно прошить новые роли.
- common/decorators/guards: AuthWithOwnership, CompanySubscriptions, SubscriptionResource — проверю, как именно подставляется companyId (особенно для create).
- Если планируете кэш (Redis/CacheModule) — конфиг/провайдер кэша.

Готов продолжать. После этих правок мы получим:
- Безопасный жизненный цикл подписки (PENDING → ACTIVE только через billing/compliance),
- Консистентность по ACTIVE (БД и транзакции),
- Предсказуемые лимиты (кэш + отсутствие гонок),
- Чистый RBAC и доменные ошибки,
- Готовность к подключению subscription-billing с ФЗ‑комплаенсом.

Принял! Отличная пачка — теперь видна полная картина по subs. У нас достаточно материалов, чтобы готовить патч‑план для 0/10. Ниже — что нашёл в новых файлах, что правим и что нужно подтвердить/докинуть.

Критичные моменты (закрываем в первую очередь)
- Дублирование enum SubscriptionStatus:
  - Есть в entity и в modules/subscriptions/types. Риск рассинхронизации.
  - Предлагаю сделать единственный источник: использовать enum из entity везде, а в types просто реэкспортировать.
- Проверка принадлежности подписки в guard:
  - CompanyOwnershipGuard.checkSubscriptionOwnership сейчас “возвращает true” (пометка “Real validation в сервисе”).
  - Для 0/10 это недопустимо. Нужна реальная проверка через SubscriptionsValidationService.
- Создание подписки активной по умолчанию в data‑слое:
  - В entity дефолт PENDING — ок. Но в SubscriptionsDataService.create принудительно ставится ACTIVE. Это нужно исправить на PENDING, а переход в ACTIVE делать только через бизнес‑процесс биллинга/комплаенса.
- Уникальность ACTIVE на компанию:
  - В БД нет частичного уникального индекса (company_id WHERE status='active'). Добавим миграцию — это «сейфти-нет» против гонок.
- Поля дат: entity хранит start_date/end_date как date, а в API примеры — c временем/часовым поясом.
  - Риск неточностей по таймзонам и «границам суток».
  - Если допустимо — мигрируем на timestamp (timestamptz) для точности. Если нет — валидацию/бизнес‑логику адаптируем под date.

Предлагаемые точечные правки (фрагменты кода)

1) DataService: create → PENDING, findActive сортировать, update — доменное исключение
- SubscriptionsDataService.create:

async create(data: CreateSubscriptionData): Promise<Subscription> {
  const subscription = this.subscriptionsRepository.create({
    ...data,
    startDate: data.startDate || new Date(),
    status: SubscriptionStatus.PENDING, // было: ACTIVE
    paymentMethod: data.paymentMethod || SUBSCRIPTIONS_CONSTANTS.DEFAULTS.DEFAULT_PAYMENT_METHOD,
    autoRenew: data.autoRenew ?? SUBSCRIPTIONS_CONSTANTS.DEFAULTS.AUTO_RENEW,
  });
  return this.subscriptionsRepository.save(subscription);
}

- findActiveByCompany с сортировкой:

async findActiveByCompany(companyId: string): Promise<Subscription | null> {
  return this.subscriptionsRepository.findOne({
    where: { companyId, status: SubscriptionStatus.ACTIVE },
    relations: ['tariff'],
    order: { endDate: 'DESC', createdAt: 'DESC' },
  });
}

- update — доменное исключение:

async update(id: string, data: UpdateSubscriptionData): Promise<Subscription> {
  await this.subscriptionsRepository.update(id, data);
  const updated = await this.findById(id);
  if (!updated) throw new SubscriptionNotFoundException(id);
  return updated;
}

2) Guard: реальная проверка принадлежности подписки
- CompanyOwnershipGuard.checkSubscriptionOwnership — добавить так же, как для customers/payments:

private async checkSubscriptionOwnership(
  user: RequestWithUser['user'],
  subscriptionId: string,
  request: any,
): Promise<boolean> {
  if (!user.companyId) {
    await this.auditService.log(AuditAction.ACCESS_DENIED, { /* ... */ });
    throw new ForbiddenException('Пользователь не принадлежит ни к одной компании');
  }

  try {
    const { SubscriptionsValidationService } = await import('../../modules/subscriptions/services/subscriptions-validation.service');
    const validationService = this.moduleRef.get(SubscriptionsValidationService, { strict: false });

    if (validationService) {
      const sub = await validationService.validateSubscriptionExists(subscriptionId);
      if (sub.companyId !== user.companyId) {
        await this.auditService.log(AuditAction.ACCESS_DENIED, { /* ... */ });
        throw new ForbiddenException(`Подписка ${subscriptionId} не принадлежит компании ${user.companyId}`);
      }
      await this.auditService.log(AuditAction.PERMISSION_GRANTED, { /* ... */ });
      return true;
    }

    this.logger.error('SubscriptionsValidationService not found — denying access');
    throw new ForbiddenException('Доступ к подписке временно недоступен');

  } catch (error) {
    await this.auditService.log(AuditAction.ACCESS_DENIED, { /* ... */ });
    throw new ForbiddenException(`Нет доступа к подписке ${subscriptionId}`);
  }
}

3) Миграция: уникальная ACTIVE на компанию
- Создадим migration:

await queryRunner.query(`
  CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_subscription_per_company
  ON subscriptions (company_id)
  WHERE status = 'active'
`);

- Плюс индексы на (company_id, status), (company_id, end_date) — у вас уже частично есть; добавим композитные при необходимости.

4) Контроллер: новые роли, пайпы, companyId из контекста, Throttle нормализовать
- Роли: заменить 'admin'/'owner' → 'platform_admin'/'company_owner'/'company_admin' и добавить read для 'cashier'/'auditor' там, где позволено.
- Пайпы: ParseUUIDPipe/ParseEnumPipe.
- companyId на create: игнорировать из body, взять из req.user.companyId.
- Throttle: @Throttle(limit, ttlSeconds) вместо объекта.

Пример create:

@Post()
@AuthWithOwnership()
@Roles('superadmin', 'platform_admin', 'company_owner', 'company_admin')
@Throttle(10, 60)
async create(
  @Body(EnhancedValidationPipe) dto: CreateSubscriptionDto,
  @Req() req: RequestWithUser,
): Promise<SubscriptionResponseDto> {
  const safeDto = { ...dto, companyId: req.user.companyId }; // переписываем companyId
  return this.subscriptionsService.create(safeDto);
}

5) DTO и Validation: запрет статуса в create, whitelist методов оплаты
- CreateSubscriptionDto: исключить поле status (или @ApiHideProperty + игнорировать), paymentMethod валидировать через whitelist и санитизировать.
- UpdateSubscriptionDto: paymentMethod — whitelist, status — только через валидатор переходов.
- ValidationService:
  - validateBusinessRules: заменить allowedPaymentMethods на SUBSCRIPTIONS_CONSTANTS.PAYMENT_METHODS (mir, sbp, card и т.д.), убрать 'cash'.
  - validateUpdateData: при endDate проверять > текущего endDate (для продления).
  - validateStatusTransition: брать правила из SUBSCRIPTIONS_CONSTANTS.STATUS_TRANSITIONS (единый источник, без дублирования).

6) Единый enum (устранить дубли)
- В modules/subscriptions/types.ts удалить локальный enum и реэкспортнуть из entity:

export { SubscriptionStatus } from '../../../database/entities/subscription.entity';

- Либо, если хотите оставить как есть — минимум проверить, что везде используются одинаковые значения. Я рекомендую унифицировать, как мы делали в payments.

7) Даты: date → timestamp (если можно)
- Сейчас entity хранит start_date/end_date как date, но API работает с ISO datetime. Для точности (таймзоны, «истекает в 23:59:59.999Z») лучше перейти на timestamp/timestamptz.
- Нужна ваша отмашка на миграцию. Если нет — добавим строгую нормализацию дат в ValidationService (округления/сравнения к полуночи локального TZ).

Что ещё нужно/подтвердить от вас
- Можно ли:
  1) Убрать возможность выставлять status в CreateSubscriptionDto (или хотя бы игнорировать на сервере)?
  2) Поменять HTTP маршрут на POST /companies/:companyId/subscriptions? Если да — это самый чистый вариант для multi-tenant (guard берёт companyId из params). Если нет — будем всегда подменять companyId из req.user.
  3) Добавить миграции: partial unique index для ACTIVE, и по желанию смену типа date → timestamp?
  4) Унифицировать enum SubscriptionStatus: использовать enum из entity (и реэкспорт в types)?
- Кэш Redis для лимитов/активной подписки:
  - Могу добавить кэш (TTL 30 мин) в SubscriptionLimitsService + инвалидация после create/update/cancel/renew. Подтверди, что Redis доступен (CacheModule/Redis provider).
- Хотите, чтобы 'platform_admin' тоже обходил ownership в guard (как superadmin)? Обычно да для read-only, но это решаемо политикой ролей. Сейчас bypass только у superadmin — норм.

Если ок — следующий шаг
- Я подготовлю PR‑патч по вышеуказанным пунктам (controller, data, validation, guard, миграция, types unification) и чек‑лист тестов.
- Параллельно начну каркас субмодуля subscription-billing (контроллер/модуль/сервисы + 3 новые entity и миграции), как в вашей спецификации.

Если что-то ещё прислать
- Пока нам достаточно. Опционально можешь скинуть:
  - config/validation.schema.ts — на предмет COMPLIANCE_STRICT_MODE и региональных переменных.
  - common/pipes/enhanced-validation.pipe.ts — чтобы убедиться, что строки санитизируются (paymentMethod).
- И дайте “да/нет” по: смена маршрута create, миграции (partial unique + timestamp), унификация enum.

Готов двигаться. Как утвердим эти пункты — высылаю детальный diff и начну имплементацию billing‑субмодуля. 🚀