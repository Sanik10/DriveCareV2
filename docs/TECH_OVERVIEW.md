<!-- path: docs/TECH_OVERVIEW.md -->
# DriveCare V2 — Technical Overview (Short)

Назначение: держать техническое описание отдельно от аудита. Здесь — структура/архитектура/инфра, без чек‑листов.

1) Архитектура (высокоуровнево)
- Backend: NestJS (modules/controllers/services), TypeORM (Postgres), Redis (caching/locks), Scheduler (cron)
- Мульти‑тенант: companyId isolation в data‑layer + Guards
- Безопасность: RBAC, Guards (@AuthWithOwnership + resource‑decorators), DTO‑валидация (class‑validator), XSS sanitize, whitelist сортировок
- Аудит: централизованный AuditService + HMAC‑цепь, маскирование ПДн
- Auth: JWT (AT) + RT в HttpOnly cookie, jti + reuse detection, 2FA (TOTP)
- Комплаенс: retention/anonymization поля и CRON (Customers, Appointments — план), no‑store заголовки на PII‑ответах

2) Bootstrap / Runtime
- main.ts: Helmet (HSTS prod only), CORS whitelist, raw‑body для webhooks, global pipes/filters/interceptors
- Грейсфул‑шатдаун: SIGINT/SIGTERM handlers (без app.enableShutdownHooks)
- Swagger: off в prod, on в non‑prod
- request size limits / compression: включены

3) Конфигурация/ENV
- ConfigModule.load(registerAs) + Joi‑валидация (validation.schema.ts)
- Важные ключи: JWT_*, RT_*, PWD_PEPPER, DEVICE_ID_SECRET, COOKIE_SECRET, AUDIT_CHAIN_KEY, PRIVACY_POLICY_TEXT_HASH (prod), DATABASE_URL/POSTGRES_*, REDIS_URL
- Окружения: development/staging/production (SEEDS_ENABLED/ALLOW_STAGING_SEEDS/DB_AUTO_SYNC_ON_SEEDS)

4) БД/миграции/сиды
- TypeORM 0.3, CLI DataSource (apps/backend/src/database/data-source.ts), только один default‑экспорт
- Entities glob: src/**\/*.entity.ts
- Миграции: src/database/migrations
- Сиды: dev on; staging — по флагу; prod off

5) Кросс‑сервисные паттерны
- DTO sanitize‑html на свободных текстах
- Whitelist сортировок/лимиты (DoS‑защита)
- Идемпотентность: Redis NX+TTL (inventory parts/stock/alerts/bulk), X‑Idempotency‑Key
- Транзакции: критичные операции (orders/payments/inventory)
- Маскирование ПДн: мапперы/аудит

6) Наблюдаемость/операции (минимум)
- Health /api/v1/health
- JSON‑логи в stdout (план)
- Readiness probe (план)
- Sentry (план)

7) Деплой/CI
- Prod‑lite: build → migration:run → start; smoke
- Secrets из Secret Manager/ENV (не файлы)
- HSTS on в prod; CORS только фронту

8) Ссылки
- Audit Tracker: docs/SECURITY_COMPLIANCE_AUDIT_TRACKER.md
- Production Checklist: docs/PRODUCTION_CHECKLIST.md

## ✅ Что уже сделано

- **Users:**
  - Добавлена фиксация согласия ПДн при админском создании пользователя (user_consents + версия/хэш политики, IP/UA).
  - Добавлены права субъекта ПДн:
    - PATCH /users/me/profile — изменение своих данных;
    - POST /users/me/deactivate — self‑service деактивация;
    - GET /users/me/export — экспорт своих данных;
    - POST /users/me/consent/revoke — отзыв согласия.
  - Полная унификация хэширования паролей: argon2id + pepper (PWD_PEPPER).
  - Исправлен разнобой по валидации (телефон РФ, пароли).
  - Исправлены AuditAction — теперь без кастов "as any".

- **Auth/Infra:**
  - RT только в HttpOnly cookie, jti + reuse detection.
  - Device ID — HMAC с секретом.
  - 2FA (TOTP) + шифрование секрета.
  - Helmet, cookie-parser, CORS улучшены; no-store на чувствительных ответах.
  - Валидация .env: JWT_ALГ/секреты, RT_*, DEVICE_ID_SECRET, PWD_PEPPER, cookie‑флаги.
  - Добавлены ключи политики конфиденциальности в .env / validation.schema (PRIVACY_POLICY_TEXT_HASH обязателен в prod).
  - Восстановлено полное покрытие high-level методов в AuditService для всех модулей (auth/orders/subscriptions/tariffs/vehicles/limits/payments) + новые события для Customers.

- **Companies (НОВОЕ):**
  - Технически:
    - Строгая multi-tenant изоляция во всех методах data service
    - XSS protection с sanitizeHtml в DTO + Transform decorators
    - SQL injection protection с параметризованными запросами + whitelist сортировки
    - RBAC с проверкой прав на уровне controller и business service
    - Entity с индексами, constraints, timestamptz полями
    - Транзакционная безопасность для критических операций
    - Audit logging с маскированием ПДн
    - Performance optimization с selective field queries
    - Type-safe field mapping и валидация
  - 152-ФЗ compliance:
    - Добавлены поля: dataRetentionUntil, pdpConsentVersion, pdpConsentDate
    - Анонимизация связанных данных при удалении компании
    - Уведомление субъектов ПДн перед удалением (framework)
    - Маскирование email/phone в audit logs
    - Автоматическое вычисление сроков хранения ПДн
  - Безопасность:
    - Каскадная проверка связанных сущностей при удалении
    - Валидация разрешений на create/update/delete
    - Проверка активных подписок, заказов, платежей
    - Secure field mapping с explicit typing

- **Customers (ОБНОВЛЕНО, завершён Tech):**
  - Технически:
    - Entity: нормализованные поля emailNormalized, phoneE164; индексы: unique(companyId, emailNormalized), index(companyId, phoneE164); timestamptz; soft-delete (isDeleted/deletedAt).
    - Consents: marketingConsent/marketingConsentDate; pdpConsentVersion/pdpConsentDate (автоподстановка версии политики).
    - Ретеншн: dataRetentionUntil рассчитывается на create по CUSTOMER_DATA_RETENTION_YEARS.
    - Контроллер: ownership + Roles; исправленная сигнатура @Throttle; аудит операций.
    - Data-layer: строгая фильтрация по companyId, whitelist сортировки, пагинация с лимитом, поиск по ILIKE, relations: vehicles.
    - Mapper: class-transformer groups ('pii'/'redacted'); role-based маскирование email/phone; скрытие address/notes для нерелевантных ролей.
    - DTO: Transform‑санитизация свободных текстов; строгие MaxLength; нормализация email.
    - Audit: маскирование email/phone в метаданных; логирование create/update/delete/status/view.
    - Config: добавлены CUSTOMER_DATA_RETENTION_YEARS, SANITIZE_CUSTOMER_TEXTS, MAX_CUSTOMERS_PAGE_SIZE; customersConfig + typed доступ.
    - Права субъекта ПДн (152‑ФЗ) — реализовано:
      - GET /customers/:id/export — экспорт ПДн субъекта (customer + vehicles + summary по orders), ответ отдается как JSON‑attachment, заголовки no-store;
      - POST /customers/:id/consent/revoke — отзыв согласия (pdn_processing/marketing), аудит основания;
      - DELETE /customers/:id/anonymize — анонимизация ПДн клиента и связанных авто, ссылочная целостность не нарушается.
    - Анонимизация/ретеншн:
      - Поля в entity: anonymizedAt, anonymizedBy (timestamptz/uuid);
      - Сервис CustomerAnonymizationService (транзакционно; placeholder email; маскирование полей);
      - Планировщик CustomerRetentionScheduler — ежедневная анонимизация по dataRetentionUntil (03:00, Redis‑lock).
    - Scheduling:
      - Подключён @nestjs/schedule (ScheduleModule.forRoot());
      - Redis‑lock для идемпотентности: ключ customers:anonymize:running (TTL 15 минут).
    - AuditService: добавлены события CUSTOMER_DATA_EXPORTED, CUSTOMER_CONSENT_REVOKED, CUSTOMER_ANONYMIZED.
    - Config/schema: добавлен CUSTOMER_RETENTION_CRON (дефолт '0 3 * * *'; текущая реализация — статический 03:00).
  - 152‑ФЗ compliance:
    - Минимизация ПДн по ролям; фиксация согласий/версий; экспорт/анонимизация; регламент анонимизации по срокам хранения (cron).
    - Multi-tenant изоляция и soft-delete по умолчанию.
  - Организационные моменты (не код):
    - Обновить публичные документы (Политика ПДн, Положение о сроках хранения, порядок обработки запросов субъектов, Журнал обращений субъектов).
    - Формализовать SLA на выполнение запросов субъектов (15/30 дней согласно 152‑ФЗ).

- **Inventory (ОБНОВЛЕНО, Tech Near‑Ready):**
  - Безопасность/доступ:
    - Добавлен декоратор @InventoryResource и проверка владения в CompanyOwnershipGuard через InventoryValidationService.validateInventoryOwnership.
    - На всех эндпоинтах — @AuthWithOwnership + @Roles('company_owner','company_admin','inventory_manager'); superadmin — только при явном companyId.
    - Порядок маршрутов: статические до динамических (исключены коллизии с :id).
  - Контроллер/валидация:
    - Корректный boolean‑парсинг lowStock; нормализация page/limit с верхним порогом; обрезка/валидация строковых фильтров.
    - Резервирование: X-Idempotency-Key → идемпотентность на уровне Redis (NX + TTL).
  - Data‑layer:
    - Фильтрация low‑stock на уровне SQL; корректная фильтрация дат (>=), безопасные сортировки (whitelist).
    - findMultipleByCompany — через In(partIds).
    - Корректные агрегаты/статистика без мутаций QBs; SQL‑агрегации для totalValue/topCategories.
  - Mapper/минимизация:
    - Role‑based скрытие себестоимости/цен (только для CAN_VIEW_COSTS).
  - 402‑ФЗ:
    - Физическое удаление записей склада — запрещено; корректирующие движения вместо удаления; аудит изменений.
  - Резервы:
    - PartReservation + идемпотентность по X‑Idempotency‑Key; TTL из конфига; авто‑истечение каждые 15 минут (scheduler + Redis‑lock).
  - Config:
    - Валидация и typed доступ: INVENTORY_MAX_PAGE_SIZE, SANITIZE_INVENTORY_TEXTS, INVENTORY_ALERTS_CRON, INVENTORY_LOW_STOCK_THRESHOLD_DEFAULT, INVENTORY_IDEMPOTENCY_TTL_MS.
  - DTO/XSS:
    - UpdateInventoryDto: Transform‑санитизация свободных текстов (location, notes) через sanitize‑html; строгие паттерны и лимиты.

- **Inventory/Parts (НОВОЕ, Tech‑Hardened — завершено):**
  - RBAC/ownership, sanitize DTO, whitelist сортировок/пагинации, audit, bulk idempotency, DB checks/indices, 402‑ФЗ запрет hard delete.

- **Inventory/Alerts (ОБНОВЛЕНО, Tech‑Hardened — core + scheduler/notifications):**
  - RBAC/superadmin‑rule; sanitize DTO; whitelist сортировок/пагинации; idempotency; settings persistence; scheduler; email notifications; DB checks/indices.

- **Subscriptions + Billing:**
  - Идемпотентность create; валидные статус‑переходы; webhooks с подписью; dedup; маскирование gateway‑ответов; конфиги.

- **Payment‑methods:**
  - Шифрование конфигураций; индексы/ограничения; DTO‑валидации; RBAC и изоляция companyId; консистентные ответы.

- **Payments (обновлено, Tech Near‑Ready, без ККТ):**
  - Транзакционность, multi‑tenant фильтрация, упрощённая логика без ККТ, гармонизация типов, safeMetadata, анонимизация ПДн.

- **Invoices (обновлено, Tech Near‑Ready):**
  - Уникальность нумерации; decimal/timestamptz; RBAC; whitelist сортировок; XSS‑защита; строгие STATUS_TRANSITIONS.

- **Orders (обновлено, Tech‑Hardened):**
  - Multi‑tenant, Guards, расширенный RBAC, mass‑assignment защита, параметризованные запросы, транзакционность, PII‑маскирование, аудит, throttling.

- **Appointments (ОБНОВЛЕНО, Tech Near‑Ready):**
  - Фасад: добавлены методы getTracking, findByCustomer, findByMechanic, addRating; валидация рейтинга (1..5) и разрешение только для COMPLETED.
  - RBAC/Ownership: @AuthWithOwnership + @AppointmentResource на ресурсных эндпоинтах; superadmin‑rule — листинги требуют явный companyId (multi‑tenant безопасность).
  - Data‑layer: строгая фильтрация по companyId; безопасный findWithFilters (ILIKE/параметризация), whitelist сортировок, пагинация; findConflicts; агрегированная статистика.
  - Validation: проверка временных слотов/пересечений, рабочие часы/дни, проверка статусов (STATUS_TRANSITIONS), права на перенос/отмену.
  - DTO/XSS: sanitize‑html и лимиты на свободные тексты в Create/Update; строгие MaxLength/Min/Max; нормализация email/phone (E.164).
  - Mapper: role‑based маскирование ПДн (механики/диагносты), корректировка маски госномера (stripLicensePlate), вычисляемые поля и tracking DTO.
  - Entity/DB: enum‑поля статусов/приоритетов; индексы; CHECK‑ограничения (rating, durations, costs); timestamptz; retention/anonymization поля.

- **Work‑Schedules (ОБНОВЛЕНО, Tech Near‑Ready):**
  - RBAC/Ownership:
    - Единые роли: 'company_owner','company_admin','manager','mechanic','superadmin'; удалены legacy 'owner'/'admin'.
    - @AuthWithOwnership + @WorkScheduleResource на ресурсных эндпоинтах; механикам — доступ только к своим записям.
    - Superadmin‑правило: листинги требуют явный companyId; доступ к :id разрешён (companyId по сущности).
  - DTO/Validation:
    - Строгие HH:mm‑паттерны; проверка start<end; длительность смены 2..12 часов; перерыв 15..120 минут и внутри смены.
    - Partial day исключения: при isFullDay=false обязательны startTime/endTime.
    - @Type(() => Number) для числовых полей; лимиты/MaxLength; sanitize‑html на reason.
  - Data‑layer:
    - Обязательная фильтрация по companyId; whitelist сортировок; пагинация с верхним лимитом.
    - Фильтры: shiftType, efficiencyMin/Max, hasSkills (jsonb @>), dateRange → dayOfWeek; isActive.
    - Decimal efficiency хранится как string(3,2); нормализация на запись до .toFixed(2).
    - userBelongsToCompany(userId, companyId) для проверок владения.
  - Business/Mapper:
    - Приведение efficiency к числу перед расчётами; исправлены места затенения переменных.
    - Маскирование/минимизация; avatarUrl → undefined; безопасная нормализация jsonb массивов.
  - Audit:
    - Добавлены события WORK_SCHEDULE_* и SCHEDULE_EXCEPTION_*; маскирование/лимит метаданных.
  - Entity/DB:
    - Индексы: (companyId), (companyId,isActive), (companyId,dayOfWeek); unique(companyId,userId,dayOfWeek).
    - CHECK: корректность диапазонов времени; efficiency ∈ [0.5;2.0]; перерыв внутри смены и 15..120 минут; длительность смен 2..12 часов.

- **Vehicles (ОБНОВЛЕНО, Tech‑Hardened — завершено):**
  - Безопасность/PII:
    - Role‑based маппинг: для mechanic/diagnostic скрываются notes; vin → "***" + last6; номер → частично маскируется (A1••77).
    - no-store заголовки на детальных ответах и автомобилях клиента (findOne, findByCustomer).
    - Superadmin‑policy: для stats/dashboard обязателен ?companyId (как и для листинга).
  - Guards/RBAC:
    - @AuthWithOwnership + @VehicleResource на ресурсных эндпоинтах.
    - CompanyOwnershipGuard — кейс 'vehicle' с реальной проверкой владения (validateVehicleOwnership).
  - DTO/XSS/нормализация:
    - CreateVehicleDto: Transform для vin/номер (trim + upper), sanitize‑html для notes, строгие Length/Matches/Min/Max.
  - Data‑layer:
    - Строгая фильтрация по companyId; безопасные ILIKE/параметры; whitelist сортировок; пагинация с лимитом.
  - Mapper:
    - Новые методы mapToResponseDtoForRole/mapArrayToResponseDtoForRole; isActive берётся из entity.
  - Аудит:
    - VEHICLES_LISTED, VEHICLE_VIEWED; маскирование ПДн в метаданных; sanitizeVehicleDataMasked для before/after.
  - Entity/DB:
    - CHECK: mileage ≥ 0; engine_volume ∈ [0.1; 20.0]; year ∈ [1900; now+2].
    - Partial unique: vin (WHERE vin IS NOT NULL AND is_deleted=false); (companyId, licensePlate) аналогично.
    - createdAt/updatedAt/deletedAt → timestamptz; индексы companyId/customerId/isActive/isDeleted.

- Vehicles‑Catalogue (ОБНОВЛЕНО, Tech‑Hardened — завершено):
  - RBAC: write‑операции только для платформенных ролей ('superadmin','platform_admin'); удалён legacy‑алиас 'admin' (который давал 'company_admin').
  - Ввод/санитизация:
    - DTO: Transform‑trim/collapse для name/country/class; sanitize‑html для type.description; строгие Min/Max длины/года.
    - Query: добавлены page/limit (пагинация с верхним лимитом).
  - Аудит:
    - Добавлены события CATALOGUE_* в AuditAction;
    - Вызовы аудита на create/update/delete в бизнес‑слое и list/view в сервисе.
  - База данных/схема:
    - nameNormalized + уникальные индексы по нормализованным именам: brands (LOWER), models (brandId+LOWER), types (LOWER) с partial WHERE is_deleted=false;
    - createdAt/updatedAt/deletedAt → timestamptz.
    - Soft‑delete сохранён; hardDelete оставлен в data‑слое, но не используется бизнес‑логикой (историчность сохраняется).
  - Производительность:
    - Убрана подгрузка больших коллекций vehicles в листингах моделей/типов; бренды — без изменений по models (опционально улучшить COUNT’ом).
  - Конфиг: добавлен каталоговый раздел (pagination, sanitize, cacheTtl).


## 🧩 Appointments — детальное состояние (Tech Near‑Ready)

### ✅ Реализовано (технически)
- Контроллер/эндпоинты:
  - CRUD + статус‑операции: POST :id/confirm, POST :id/complete, POST :id/cancel, POST :id/reschedule.
  - Аналитика/слоты: POST smart-schedule, POST check-availability, GET stats/dashboard, GET :id/tracking.
  - Листинги: GET /appointments (фильтры/пагинация/сортировки); GET customer/:customerId; GET mechanic/:mechanicId?dateFrom&dateTo.
  - Везде @Throttle в формате { default: { limit, ttl } }.
- Guards/RBAC/ownership:
  - @AuthWithOwnership на всех эндпоинтах; @AppointmentResource на ресурсных.
  - Superadmin‑правило: листинги требуют явный companyId (multi‑tenant безопасность).
- Фасад (AppointmentsService):
  - Добавлены недостающие методы: getTracking, findByCustomer, findByMechanic, addRating.
  - addRating: рейтинг только 1..5 и только для COMPLETED; маппинг в DTO через маппер.
- Бизнес‑слой:
  - confirm → статус CONFIRMED + confirmationSent=true.
  - complete → статус COMPLETED + вычисление actualDuration.
  - reschedule → перенос с выставлением RESCHEDULED.
  - cancel → статус CANCELED (с логированием причины).
- Validation:
  - validateCreateData/UpdateData/StatusTransition; временной слот, пересечения и рабочие часы/дни.
  - Права на перенос/отмену (часы до начала; допустимые статусы).
- Data‑layer:
  - findWithFilters с обязательной фильтрацией по companyId; ILIKE‑поиск; фильтры по статусу/приоритету/клиенту/мастеру/дате; whitelist сортировок; пагинация.
  - findConflicts (пересечения по механикам/датам/компании); findByCustomer; findByMechanic (только активные статусы); агрегированная статистика.
  - update — mass‑assignment safe (whitelist полей); decimal → string.
- Mapper/минимизация ПДн:
  - Role‑based маскирование ПДн для ролей mechanic/diagnostic (имя клиента, контакты, заметки).
  - Исправлен алгоритм stripLicensePlate (корректная очистка номера в скобках).
  - Tracking DTO: текущий этап, прогресс, ETA, причины задержки, nextActions.
- DTO/XSS:
  - Create/Update — sanitize‑html на свободных текстах; строгие MaxLength/Min/Max; E.164 для телефона (RU), email‑валидация.
  - SmartSchedule/CheckAvailability — строгие схемы, временные окна/даты.
- Entity/DB:
  - Enum статусов/приоритетов; timestamptz; индексы (companyId, mechanicId, startTime, status), композитные индексы.
  - CHECK‑ограничения: rating ∈ [1;5], длительности/стоимости ≥ 0.
  - Поля ретеншн/анонимизации (dataRetentionUntil, anonymizedAt/by) — базис под 152‑ФЗ.

## 🧩 Work‑Schedules — детальное состояние (Tech Near‑Ready)

### ✅ Реализовано (технически)
- Guards/RBAC/ownership:
  - Единые роли: 'company_owner','company_admin','manager','mechanic','superadmin'; legacy 'owner'/'admin' удалены.
  - @AuthWithOwnership на всех эндпоинтах; @WorkScheduleResource — на ресурсных.
  - Superadmin‑правило: листинги требуют явный companyId; доступ к :id — разрешён (companyId по сущности).
  - Механики: листинг только своих расписаний; создание исключений — только на себя.
- Контроллер/валидация:
  - Везде @Throttle в формате { default: { limit, ttl } }.
  - Partial day: при isFullDay=false обязательны startTime/endTime; HH:mm‑паттерны.
  - Строгие проверки: start<end; длительность смены 2..12 ч; перерыв 15..120 мин и внутри рабочего времени.
  - DTO: @Type(() => Number) для чисел; MaxLength; sanitize‑html для reason.
- Data‑layer:
  - Обязательная фильтрация по companyId; whitelist сортировок; безопасная пагинация (≤ MAX_PAGE_SIZE).
  - Фильтры: shiftType; efficiencyMin/Max; hasSkills (jsonb @>); dateRange → dayOfWeek; isActive.
  - Исключения: поддержка dateRange/isFullDay/sortBy; сортировки по startDate/type/status/createdAt.
  - Decimal efficiency хранится как string(3,2) с нормализацией .toFixed(2).
  - userBelongsToCompany(userId, companyId) — проверка владения пользователем.
- Business/аналитика:
  - Приведение efficiency к числу (toNumericEfficiency) перед вычислениями.
  - Устранено затенение переменных при подсчёте часов; рекомендации по перерывам при сменах > 6 ч.
  - Аналитика покрытия учитывает полно‑дневные исключения; общая utilization.
- Mapper/минимизация:
  - Возврат efficiency как number; avatarUrl → undefined; безопасная нормализация skillMatrix/preferredDaysOff.
- Audit:
  - Добавлены AuditAction: WORK_SCHEDULE_CREATED/UPDATED/DELETED/VIEWED/WORK_SCHEDULES_LISTED и SCHEDULE_EXCEPTION_CREATED/STATUS_CHANGED/DELETED.
  - Маскирование/лимит метаданных; без утечки ПДн/свободных текстов.
- Entity/DB:
  - WorkSchedule: индексы (companyId), (companyId,isActive), (companyId,dayOfWeek); unique(companyId,userId,dayOfWeek).
  - CHECK: корректность временных диапазонов; efficiency ∈ [0.5;2.0]; перерыв внутри смены (15..120 мин); длительность смены 2..12 ч; timestamptz даты.
  - ScheduleException: индексы (companyId,userId), (companyId,status), (companyId,startDate,endDate); CHECK endDate ≥ startDate; при isFullDay=false обязательны startTime/endTime и endTime>startTime; reason — nullable.

## 🧩 Inventory — детальное состояние (Tech Near‑Ready)

### ✅ Реализовано (технически)
- Guards/Ownership/RBAC:
  - @InventoryResource на end‑поинтах с ресурсом склада; CompanyOwnershipGuard использует validateInventoryOwnership.
  - @AuthWithOwnership + @Roles('company_owner','company_admin','inventory_manager'); superadmin — только при явном companyId.
- Контроллер/валидация:
  - Корректный boolean‑парсинг lowStock; нормализация page/limit (≤ INVENTORY_MAX_PAGE_SIZE), обрезка строковых фильтров.
  - Статические маршруты выше динамических (исключены коллизии).
  - Резервы: поддержка X‑Idempotency‑Key; проброс в бизнес‑слой.
- Data‑layer:
  - SQL‑фильтр для low‑stock; корректные условия по датам (>=); безопасные сортировки; In(partIds) в выборках.
  - Отчёты/агрегаты: аккуратные агрегаты без мутации QueryBuilder; topCategories/totalValue через SUM/COUNT.
- Mapper/минимизация:
  - Скрытие costPrice/sellingPrice для ролей вне CAN_VIEW_COSTS (PII‑минимизация по ролям).
- 402‑ФЗ:
  - Никаких hard‑delete складских записей; корректирующие движения/архивация; полный аудит.
- Резервы:
  - Используется PartReservation; идемпотентность через Redis (NX + TTL), TTL берётся из typed‑конфига; авто‑истечение каждые 15 минут (scheduler с Redis‑lock); аудит событий.
- DTO/XSS:
  - UpdateInventoryDto: Transform‑санитизация (sanitize‑html) для location/notes; строгие паттерны/длины.
- Config:
  - validation.schema / configuration.ts: INVENTORY_MAX_PAGE_SIZE, SANITIZE_INVENTORY_TEXTS, INVENTORY_ALERTS_CRON, INVENTORY_LOW_STOCK_THRESHOLD_DEFAULT, INVENTORY_IDEMPOTENCY_TTL_MS; typed inventoryConfig.

## 🧩 Inventory/Parts — детальное состояние (Tech‑Hardened, Completed)

### ✅ Реализовано (технически)
- Guards/Ownership/RBAC:
  - Введён @PartResource; CompanyOwnershipGuard валидирует владение запчастью по companyId.
  - Все эндпоинты — под @AuthWithOwnership. Роли: чтение и обновления — 'company_owner','company_admin','inventory_manager'; деактивация — только 'company_owner','company_admin'.
  - Superadmin: листинги/поиски/агрегаты — только при явном companyId; ресурсные :id — доступ разрешён.
- Контроллер/валидация:
  - Статические маршруты выше динамических; нормализация query‑параметров; сортировки только по whitelist; limit ≤ inventory.pagination.maxPageSize (typed‑конфиг).
  - Bulk: поддержка X‑Idempotency‑Key (Redis NX + TTL); повтор — возврат сохранённого результата; параллельный запуск — 409.
- Data‑layer:
  - Фильтрация по companyId; безопасные IN/ILIKE; validateCategoryExists — OR(companyId, NULL) для глобальных категорий.
- Mapper/минимизация:
  - Скрытие costPrice/sellingPrice/производных (margin/profit) для ролей без CAN_VIEW_COSTS; superadmin не обходит без явного companyId.
- DTO/XSS:
  - Create/Update: sanitize‑html + Transform для name/brand/description; строгие MaxLength/паттерны; цены: MIN/MAX/decimal places + ratio selling≥cost.
- Аудит:
  - PART_CREATED/UPDATED/PRICE_CHANGED/STATUS_CHANGED/PARTS_BULK_UPDATED/PART_VIEWED/PARTS_SEARCHED — без any; ограничение размера метаданных.
- DB/Entity:
  - Частичный unique: (companyId, partNumber) WHERE partNumber IS NOT NULL;
  - CHECK: costPrice ≥ 0, sellingPrice ≥ 0;
  - Индексы: companyId, categoryId, createdAt; createdAt/updatedAt — timestamptz; imageUrl до 500 символов.

## 🧩 Inventory/Stock‑Movements — детальное состояние (Tech‑Hardened, Completed)

### ✅ Реализовано (технически)
- Guards/Ownership/RBAC:
  - Введён профильный декоратор @StockMovementResource.
  - CompanyOwnershipGuard: добавлен кейс 'stock-movement' с валидацией владения (companyId).
  - Контроллеры: @AuthWithOwnership + канонические роли ('superadmin','company_owner','company_admin','inventory_manager'); legacy алиасы нормализуются в декораторе Roles.
  - Superadmin‑правило: листинг/поиск/аналитика — только при явном ?companyId (иначе 400); ресурсные :id — разрешены (компания определяется по сущности).
- Контроллер/маршруты/валидация:
  - Статические маршруты ('analytics/*','part/:partId/history') подняты выше ':id' (исключает коллизии).
  - Нормализация query: trim/ограничения длины; whitelist сортировок (createdAt,type,quantity,totalAmount,partName,documentNumber); limit ≤ INVENTORY_MAX_PAGE_SIZE/DEFAULTS.MAX_ITEMS.
  - PATCH заменён на строгий UpdateMovementDto (sanitize‑html + Transform для строк; числовые лимиты).
  - Везде throttling; для create/bulk/scan/reverse — поддержка X‑Idempotency‑Key.
- DTO/XSS:
  - Create/Bulk/Scan/Update — строгие MaxLength/Min/Max/decimal‑places; преобразование чисел через class‑transformer; sanitize‑html для свободных текстов.
- Data‑layer/SQL:
  - Во всех запросах фильтрация по companyId.
  - Исправлены агрегаты getMovementSummary: независимые QueryBuilder без мутаций; корректные алиасы (partId/partName).
  - Поиск по “штрих‑коду” реализован через Part.partNumber (case‑insensitive) с companyId.
  - Параметризованные условия везде; ILIKE/ABS по whitelisted полям; In([...]) в batch‑операциях.
  - Публичный hard delete не используется (402‑ФЗ).
- Бизнес/транзакционность/идемпотентность:
  - Идемпотентность для create/bulk/scan/reverse/integrations (from‑order/from‑delivery): Redis‑ключи idemp:<area>:<op>:..., TTL из INVENTORY_IDEMPOTENCY_TTL_MS (дефолт 6h), повтор → возврат результата; гонка — 409.
  - Защита от гонок при обновлении остатков: лёгкая Redis‑блокировка на пару companyId+partId (lock:inventory:stock:update:*). Опция усиления — DB‑уровень (SELECT ... FOR UPDATE).
- Mapper/минимизация:
  - Сокрытие price/totalAmount для ролей без CAN_VIEW_COSTS; superadmin без companyId не обходит правила.
  - Исключение ПДн поставщика (contactName) из стандартных ответов.
- Аудит:
  - Строгие AuditAction: STOCK_MOVEMENT_CREATED/UPDATED/REVERSED/BULK_STOCK_MOVEMENTS_CREATED/BARCODE_SCAN_MOVEMENT.
  - Метаданные ограничены и маскируются (documentNumber/barcode → MASKED); без токенов/секретов/ПДн.
- Entity/DB:
  - StockMovement.createdAt → timestamptz.
  - Денежные поля — decimal(10,2); количества — integer; индексы по companyId/partId/createdAt рекомендованы.
- Совместимость/интеграции:
  - Интеграции из Orders/Suppliers: операции приход/расход с корректной аудитацией/идемпотентностью.

## 🧩 Inventory/Alerts — детальное состояние (Tech‑Hardened, Core Completed)

### ✅ Реализовано (технически)
- Guards/Ownership/RBAC:
  - Введён @InventoryAlertResource; CompanyOwnershipGuard обновлён (кейс 'inventory-alert', validateAlertOwnership).
  - @AuthWithOwnership на всех эндпоинтах; роли: чтение — 'superadmin','company_owner','company_admin','inventory_manager'; изменения — 'company_owner','company_admin'.
  - Superadmin‑правило: листинг/аналитика/critical — только при явном ?companyId; ресурсные :id — допускаются.
- Контроллер/маршруты/валидация:
  - Статические маршруты (analytics/stats, critical/list, settings/*, batch/*) подняты выше ':id'.
  - @Throttle в формате { default: { limit, ttl } }.
  - Нормализация query: булевы/числа; trim/ограничение длины search; whitelist сортировок; limit ≤ INVENTORY_MAX_PAGE_SIZE.
  - X‑Idempotency‑Key на write: POST test/notification и POST batch/dismiss.
- DTO/XSS:
  - UpdateAlertSettingsDto, TestNotificationDto — Transform + sanitize‑html; ArrayMaxSize для recipients; строгие Min/Max/enum.
- Data‑layer/SQL:
  - findWithFilters — companyId обязателен; безопасные условия; параметризованные запросы.
  - getAlertStats — исправлены join/алиасы (leftJoin Inventory по partId+companyId); стабильные имена полей.
  - Публичный hard delete отсутствует (402‑ФЗ).
- Mapper/минимизация:
  - Финансовые derived скрыты для ролей вне CAN_VIEW_COSTS; безопасные инсайты/статистика.
- Аудит:
  - INVENTORY_ALERT_CREATED / INVENTORY_ALERT_UPDATED / INVENTORY_ALERT_DISMISSED / INVENTORY_ALERTS_AUTO_DISMISSED / INVENTORY_ALERTS_CLEANUP / INVENTORY_ALERT_SETTINGS_UPDATED / INVENTORY_ALERT_TEST_NOTIFICATION.
- Идемпотентность (Redis):
  - Ключи: idemp:alerts:<op>:lock/result:<companyId>:<key>; TTL — INVENTORY_IDEMPOTENCY_TTL_MS; повтор → кэш, гонка → 409.
- Config/ENV:
  - INVENTORY_MAX_PAGE_SIZE, INVENTORY_ALERTS_ENABLED, INVENTORY_ALERTS_CRON, INVENTORY_IDEMPOTENCY_TTL_MS (typed inventoryConfig).
- Entity/DB:
  - InventoryAlert — timestamptz даты; индексы companyId/partId/createdAt; CHECK ≥ 0; согласованные имена колонок.

## 🧩 Inventory/Suppliers — детальное состояние (Tech Near‑Ready, Legal light pending)

### ✅ Реализовано (технически)
- Guards/Ownership/RBAC:
  - Используется @SupplierResource; эндпоинты под @AuthWithOwnership + канонические роли ('superadmin','company_owner','company_admin','inventory_manager').
  - Superadmin‑правило: листинг/аналитика — только при явном ?companyId; ресурсные :id — допускаются.
- Контроллер/валидация:
  - Статические маршруты выше ':id'; нормализация query; whitelist сортировок; limit ≤ INVENTORY_MAX_PAGE_SIZE/DEFAULTS.MAX_ITEMS.
  - Throttling на read/write; X‑Idempotency‑Key: POST bulk и POST :id/rate (Redis NX + TTL, кэш результата, гонка — 409).
- DTO/XSS:
  - sanitize‑html + Transform на свободные тексты; строгие MaxLength; валидации email/phone (E.164), URL.
- Data‑layer/SQL:
  - Везде companyId‑фильтрация; параметризованные условия; безопасные ILIKE; отказ от хрупких snake_case алиасов в пользу property‑paths.
- Mapper/минимизация:
  - Role‑based маскирование контактных ПДн (email/phone/contactName); безопасные derived.
- Аудит:
  - SUPPLIER_CREATED / SUPPLIER_UPDATED / SUPPLIER_CONTACT_UPDATED / SUPPLIER_ADDRESS_UPDATED / SUPPLIER_DEACTIVATED / SUPPLIER_RATED / SUPPLIER_PRICE_COMPARISON / SUPPLIER_ANALYTICS_VIEWED / SUPPLIERS_BULK_OPERATION.
  - Метаданные ограничены/маскированы; без секретов/ПДн в открытом виде.
- Идемпотентность:
  - Redis (NX + PX TTL=INVENTORY_IDEMPOTENCY_TTL_MS); повтор — кэш, гонка — 409.
- Entity/DB:
  - Индексы: companyId, isActive; partial unique (companyId,email)/(companyId,taxNumber) WHERE NOT NULL; createdAt/updatedAt — timestamptz.

## 👥 Customers — детальное состояние (Tech COMPLETED, Legal light pending)

### ✅ Реализовано (технически)
- Ownership/RBAC/throttling/audit — на всех эндпоинтах.
- Entity: emailNormalized, phoneE164; индексы; timestamptz; soft-delete; anonymizedAt/anonymizedBy.
- Consents: marketingConsent/Date; pdpConsentVersion/Date (валидация против PRIVACY_POLICY_VERSION).
- Retention: dataRetentionUntil на create (CUSTOMER_DATA_RETENTION_YEARS).
- Subject rights (152‑ФЗ):
  - GET /customers/:id/export — экспорт ПДн (customer + vehicles + orders summary), JSON‑attachment, no-store headers.
  - POST /customers/:id/consent/revoke — отзыв согласия (pdn_processing/marketing), аудит основания.
  - DELETE /customers/:id/anonymize — анонимизация ПДн клиента и связанных авто (ссылочная целостность сохраняется).
- Анонимизация/ретеншн:
  - CustomerAnonymizationService — транзакционно; placeholder email; маскирование; деактивация записи.
  - CustomerRetentionScheduler — ежедневный cron 03:00; Redis‑lock (customers:anonymize:running, TTL 15 мин).
- Mapper: class-transformer ('pii'/'redacted'); маскирование email/phone; скрытие свободных текстов для нерелевантных ролей.
- DTO: Transform‑санитизация HTML; лимиты длины; нормализация email.
- Data-layer: companyId фильтрация; whitelist сортировок; пагинация; поиск; relations: vehicles.
- Audit: CUSTOMER_DATA_EXPORTED / CUSTOMER_CONSENT_REVOKED / CUSTOMER_ANONYMIZED; HMAC‑цепь; без утечки сырых ПДн.
- Config:
  - customersConfig + typed доступ (retentionYears, sanitizeTextsEnabled, pagination.maxPageSize).
  - validation.schema: CUSTOMER_RETENTION_CRON, CUSTOMER_DATA_RETENTION_YEARS, SANITIZE_CUSTOMER_TEXTS, MAX_CUSTOMERS_PAGE_SIZE.
  - ScheduleModule.forRoot() подключён.

## 🧾 Orders — детальное состояние (Tech‑Hardened, Legal Pending)

### ✅ Реализовано (технически)
- Guards/Isolation: @AuthWithOwnership, @OrderResource; фильтрация по companyId.
- RBAC: роли расширены; Roles на list/status/assign.
- STATUS_TRANSITIONS: единый источник в ORDERS_CONSTANTS (жёсткая типизация).
- Mass‑assignment защита: ALLOWED_UPDATE_FIELDS; финансы — только через пересчёт.
- Валидации:
  - Создание: принадлежность customer/vehicle/assignedTo; лимиты через SubscriptionLimitsService.checkOrderLimit.
  - Механик: проверка роли/принадлежности; ограничение активных услуг ≤ 5.
  - Тексты: sanitizeHtml для description/customerComplaints/diagnosticResults/notes.
- Сабмодули:
  - Order‑Services: статусы; автозаполнение start/end; XSS‑санитизация; аудит; назначение механика.
  - Order‑Parts: резерв/освобождение склада; лимиты; аудит.
- Mapper/PII: маскирование ПДн; скрытие себестоимости.
- Audit: полное покрытие; userId в событиях; маскирование чувствительных параметров; HMAC‑цепь.
- Время/деньги: timestamptz; decimal(10–15,2).
- Throttling: на CRUD/листинги/статус/назначения.

## 🧩 Vehicles — детальное состояние (Tech‑Hardened, Completed Tech)

### ✅ Реализовано (технически)
- Guards/RBAC/Ownership:
  - Все эндпоинты под @AuthWithOwnership; ресурсные — под @VehicleResource.
  - CompanyOwnershipGuard: добавлен полноценный кейс 'vehicle' с валидацией владения через VehiclesValidationService.validateVehicleOwnership.
  - Superadmin‑policy: листинги требуют явный companyId (в контроллере), stats/dashboard — также требуют ?companyId для superadmin.
- Контроллер/безопасность:
  - Детальные ответы (GET :id) и автомобили клиента (GET customer/:customerId) отдают заголовки Cache-Control: no-store; Pragma: no-cache; Expires: 0.
  - Throttle в унифицированном формате { default: { limit, ttl } }.
- DTO/XSS/нормализация:
  - CreateVehicleDto: Transform для vin и licensePlate (trim + upper + нормализация пробелов), sanitize‑html для notes, строгие Length/Matches/Min/Max.
  - UpdateVehicleDto: sanitize‑html и лимиты для notes; DateString для дат ТО.
- Mapper/минимизация ПДн:
  - Роль‑ориентированная выдача: mapToResponseDtoForRole / mapArrayToResponseDtoForRole; для mechanic/diagnostic скрываются notes, vin → "***"+last6, номер → маска; displayName корректируется.
  - mapToBasicInfo: isActive берётся из entity (без допущений).
- Data‑layer/SQL:
  - Фильтрация по companyId обязательна; безопасные ILIKE; whitelist сортировок; пагинация с верхним лимитом.
- Бизнес/аудит:
  - События: VEHICLE_CREATED/UPDATED/STATUS_CHANGED/MILEAGE_UPDATED/SERVICE_COMPLETED/TRANSFERRED/VIEWED и VEHICLES_LISTED.
  - Метаданные маскированы (vinLast6, licensePlateMasked); before/after — через sanitizeVehicleDataMasked (без сырых ПДн).
- Entity/DB:
  - CHECK: mileage ≥ 0; engine_volume ∈ [0.1; 20.0]; year ∈ [1900; currentYear+2].
  - partial unique: vin WHERE vin IS NOT NULL AND is_deleted=false; (companyId, license_plate) WHERE license_plate IS NOT NULL AND is_deleted=false.
  - Индексы: companyId, customerId, isActive, isDeleted; timestamptz для createdAt/updatedAt/deletedAt.

## 🧩 Vehicles‑Catalogue — детальное состояние (Tech‑Hardened, COMPLETED)

### ✅ Реализовано (технически)
- RBAC:
  - Write: только 'superadmin','platform_admin'; legacy 'admin' исключён (ранее алиасился в 'company_admin').
  - @AuthWithOwnership используется, но CompanyOwnershipGuard для каталога пропускает (глобальный словарь).
- DTO/Validation/XSS:
  - Transform‑trim/collapse для строковых полей (name/country/class).
  - sanitize‑html для свободного текста (type.description).
  - Query‑параметры: добавлены page/limit, верхние лимиты (по конфигу).
- Аудит:
  - Добавлены AuditAction CATALOGUE_* (BRAND/MODEL/TYPE: CREATED/UPDATED/DELETED/VIEWED/LISTED).
  - Вызовы аудита в бизнес‑методах create/update/delete и в сервисе для list/view.
- Data‑layer:
  - Регистронезависимая уникальность через поля nameNormalized и unique индексы (partial WHERE is_deleted=false).
  - Поиск с ILIKE и нормализацией; отказ от подгрузки больших коллекций vehicles в листингах.
- Entities/DB:
  - Добавлены поля nameNormalized; все даты → timestamptz; индексы по normalized именам и soft‑delete.
- Конфиг:
  - Добавлен catalogueConfig (sanitizeTextsEnabled, pagination.default/max, cacheTtlSec) + Joi‑валидация.

## Services — детальное состояние (Tech Near‑Ready)

✅ Реализовано (технически)
- Guards/RBAC/Ownership:
  - @AuthWithOwnership + @ServiceResource на ресурсных эндпоинтах.
  - Roles: декоратор Roles нормализует legacy-алиасы owner/admin → company_owner/company_admin (совместимость).
- Контроллер/валидация:
  - Добавлены ParseUUIDPipe/ParseIntPipe для :id/:categoryId/maxDuration/minPrice/maxPrice.
  - Добавлен DTO BulkUpdateServicesDto (валидируется размеры/UUID, whitelist на структуру).
- Бизнес-слой/целостность:
  - Убраны прямые обращения фасада к data‑слою на изменяющих операциях: все write‑операции теперь проходят через ServicesBusinessService + ServicesValidationService.
  - Массовые обновления: mass‑assignment защита (whitelist полей).
- Data‑layer/SQL:
  - Фильтрация по companyId обязательна во всех запросах.
  - Исправлен price‑range (price BETWEEN :min AND :max).
  - Сортировки: введён whitelist полей/направления (валидация на уровне бизнес‑валидации + нормализация фильтра).
- Типы/интерфейсы:
  - Приведены сигнатуры фасада/интерфейсов к user‑aware методам (update/remove/toggle теперь принимают user).
- Компиляция/стабильность:
  - Исправлены ошибки сборки (несогласованные сигнатуры, отсутствующие методы).

Services/Categories — детальное состояние (Tech Near‑Ready)

✅ Реализовано (технически)
- Guards/RBAC/Ownership:
  - @AuthWithOwnership + @ServiceCategoryResource; запрет на правки/удаление глобальных категорий — через валидацию.
- Контроллер/валидация:
  - ParseUUIDPipe на :id; нормализация фильтров; методы требуют user, сигнатуры приведены к ICategoriesService.
- Бизнес-слой/целостность:
  - Фасад больше не обходит валидацию; все write‑операции через CategoriesBusinessService/ValidationService.
- Data‑layer/SQL:
  - Фильтрация по companyId или глобальные (companyId IS NULL) — корректна во всех выборках.
  - Сортировки: введён whitelist/валидация; статистика и withServicesCount — стабильные алиасы.
- Инициализация глобальных категорий:
  - Реализована, но требует идемпотентности (см. TODO).

## 🧩 Service‑History — детальное состояние (Tech Near‑Ready)

✅ Реализовано (технически)
- Guards/RBAC/Ownership:
  - @AuthWithOwnership на всех эндпоинтах; @ServiceHistoryResource на ресурсных.
  - CompanyOwnershipGuard: добавлен кейс 'service-history' → validateServiceHistoryOwnership (аудит PERMISSION_GRANTED/ACCESS_DENIED).
  - Superadmin‑policy: для листингов/статистики требуется явный ?companyId (иначе 400); для остальных companyId берётся из user.
- Контроллер/валидация:
  - ParseUUIDPipe для :id/:vehicleId; ParseBoolPipe для hasNextService; ParseIntPipe для mileageFrom/mileageTo/page/limit.
  - @Throttle в унифицированном формате на read/write эндпоинтах.
  - Swagger: объявлены поля sortField/sortOrder с whitelist значений; добавлен query ?companyId (только для superadmin).
- DTO/XSS:
  - Create/Update — sanitize‑html для description/notes (Transform), строгие MaxLength/форматы дат (IsDateString).
- Data‑layer/SQL:
  - Обязательная фильтрация по companyId (без него — ValidationDataException).
  - Безопасные сортировки по whitelist (date, mileage, createdAt, nextServiceDate); пагинация с верхним лимитом.
  - Поиск по ILIKE (description/notes); выборки upcoming/overdue; агрегаты для dashboard.
- Бизнес‑слой:
  - create/update/softDelete вызывают пересчёт дат ТО у автомобиля (updateVehicleServiceDates).
  - Логгирование переведено на AuditService (SERVICE_HISTORY_*).
- Mapper/минимизация ПДн:
  - Маскирование VIN (*** + last6) и госномера (A••77) в vehicleInfo; расчёт дней до/после обслуживания.
- Entity/DB:
  - VehicleServiceHistory: createdAt/updatedAt/deletedAt → timestamptz; индексы companyId/vehicleId/date/nextServiceDate/isDeleted.
- Конфиг/ENV:
  - Добавлен serviceHistoryConfig: SANITIZE_SERVICE_HISTORY_TEXTS, SERVICE_HISTORY_DEFAULT_PAGE_SIZE, SERVICE_HISTORY_MAX_PAGE_SIZE, SERVICE_HISTORY_SEARCH_LIMIT, SERVICE_HISTORY_NOTIFICATIONS_ENABLED.
  - Валидация в validation.schema + ключи добавлены в .env.example.

## Tariffs — детальное состояние (Tech‑Hardened, Completed Tech)

### ✅ Реализовано (технически)
- Guards/RBAC:
  - Убран @AuthWithOwnership (тарифы — глобальный словарь, не company‑scoped).
  - Write‑эндпоинты защищены связкой JwtAuthGuard + RolesGuard; доступ только для платформенных ролей: 'superadmin','platform_admin'.
  - Легаси‑алиасы ролей больше не используются на тарифах.
- Контроллер/валидация:
  - Нормализация query:
    - isActive — ParseBoolPipe.
    - minPrice/maxPrice — ParseFloatPipe (цены в рублях).
    - sortOrder — нормализован в 'asc'|'desc' с whitelist.
  - compareTariffs — корректный BadRequestException при ids.length > 5.
  - Throttle унифицирован.
- DTO/XSS:
  - Санитизация свободных текстов (name/description) через sanitize‑html + trim/collapse в Create/Update DTO.
  - Примеры и описания цен приведены к «рублям» (без копеек).
- Data‑layer/SQL:
  - Единицы измерения цен унифицированы на «рубли» (decimal(10,2)): фильтры minPrice/maxPrice без умножений на 100.
  - Case‑insensitive уникальность имени тарифа:
    - Добавлено поле nameNormalized (LOWER(name));
    - findByName работает по nameNormalized;
    - create/update заполняют nameNormalized.
- Entity/DB:
  - Tariff: добавлено nameNormalized + уникальный индекс uq_tariffs_name_normalized.
  - Индексы: idx_tariffs_active (is_active), idx_tariffs_created_at (created_at).
  - Сохраняются CHECK‑ограничения по ценам и лимитам.
- Mapper:
  - Форматирование цен — без деления на 100 (рубли).
  - Функции сравнения/статистики/селект‑опций адаптированы под рубли.
- Аудит:
  - Расширены события: TARIFF_VIEWED, TARIFFS_LISTED, TARIFFS_COMPARED, TARIFFS_POPULAR_VIEWED, TARIFF_STATS_VIEWED, TARIFF_SELECT_OPTIONS_VIEWED.
  - TariffsService логирует read‑операции; бизнес‑слой сохраняет create/update/status/delete.
  - Глобально: AuditLoggingInterceptor исправлен — по умолчанию успешные запросы → PERMISSION_GRANTED (раньше ошибочно API_ERROR).
- Config/ENV:
  - Добавлен tariffsConfig: sanitizeTextsEnabled, pagination.maxPageSize, cacheTtlSec.
  - Валидация: SANITIZE_TARIFF_TEXTS, TARIFFS_MAX_PAGE_SIZE, TARIFFS_CACHE_TTL_SEC в validation.schema.ts.
  - В .env добавлены SANITIZE_TARIFF_TEXTS, TARIFFS_MAX_PAGE_SIZE, TARIFFS_CACHE_TTL_SEC.

