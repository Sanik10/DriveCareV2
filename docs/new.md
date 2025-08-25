Принял. Делаю Audit по Work‑Schedules на основе присланных файлов (без правок кода). Ниже — объективная картина, P0/P1/P2 план, затронутые файлы, зависимости и quick wins.

Покрытие аудита
- Рассмотрены: controller, module, service, business, data, mapper, validation.
- Не рассмотрены (нет файлов): work-schedule.entity.ts, schedule-exception.entity.ts, конфиги workSchedules, cron/lock реализация.

Ключевые находки

P0 — критично

1) Некорректная проверка принадлежности пользователя компании (userBelongsToCompany)
- Где: WorkSchedulesDataService.userBelongsToCompany
- Проблема: используются имена полей уровня БД ('company_id') вместо имён свойств Entity ('companyId'). В TypeORM find options должны использоваться имена свойств Entity. Сейчас:
  - select: ['id', 'company_id'] — вероятно некорректно (Entity свойство, скорее всего, companyId).
  - where: { id: userId, company_id: companyId } — условие по company_id может быть проигнорировано/вызвать ошибку.
- Риск: ложные результаты belongsToCompany → нарушение изоляции компаний (security/152‑ФЗ).
- Эффект правки: корректная изоляция multi‑tenant.

2) Отсутствует доменный аудит для жизненного цикла исключений
- Где: WorkSchedulesService
- Уже есть: SCHEDULE_EXCEPTION_CREATED.
- Нет: SCHEDULE_EXCEPTION_STATUS_CHANGED, SCHEDULE_EXCEPTION_DELETED, а также VIEW/LIST (если будут эндпоинты).
- Риск: неполнота аудита административных действий (1119‑ПП/ФСТЭК).
- Эффект правки: полнота журнала аудита.

3) Отсутствует ретеншн/анонимизация исключений
- Где: ScheduleException Entity/модуль
- Нет полей dataRetentionUntil/anonymizedAt/anonymizedBy и Cron‑процесса (с Redis‑lock).
- Риск: нарушение «ограничения сроков хранения/минимизации» (152‑ФЗ).
- Эффект правки: соответствие срокам хранения, снижение объёма ПДн.

P1 — важно

4) Обработка гонок/уникальности при создании расписания
- Где: WorkSchedulesService.create / DataService.create
- Есть DB‑unique (companyId, userId, dayOfWeek), но при конфликте выбросится сырой DB‑error → 500. Лучше ловить и маппить на WorkScheduleConflictException (пользовательский 409).
- Эффект правки: предсказуемые ошибки, лучшая DX.

5) Санитизация/маскирование reason в аудите и ответах
- Аудит: reason в details не пишется — хорошо.
- Ответы API: reason возвращается в ExceptionResponseDto без role‑based маскирования. Для ролей «mechanic»/«diagnostic» возможно требуется маскирование/обрезка (бизнес‑правило).
- Эффект правки: «минимизация» ПДн в выдаче (152‑ФЗ).

6) Политика удаления исключений
- Сейчас deleteException — физическое удаление. Для управляемых сроков хранения предпочтительно:
  - soft‑delete (isDeleted/ deletedAt) или
  - «анонимизация» контента (reason → null/‘[REDACTED]’), при этом запись остаётся для аудита.
- Эффект: обеспечивается «историчность» и прозрачный учёт операций обработки (152‑ФЗ/1119‑ПП).

7) Трассировка и аудит исключений LIST/VIEW (если добавятся эндпоинты)
- Для полноты следа (1119‑ПП) пригодится SCHEDULE_EXCEPTIONS_LISTED/VIEWED при появлении соответствующих маршрутов.

P2 — полезные улучшения

8) Единообразный Throttle-подход
- В контроллере используется объектный @Throttle({ default: { ... } }). С учётом внедрённых профилей ('read'/'write'/'auth'), лучше унифицировать:
  - GET → @Throttle('read'), write → @Throttle('write').
- Эффект: единый стандарт по всему приложению.

9) Role‑based выдача reason
- Возможна дополнительная логика: показывать reason только авторам/руководителям (RBAC). Сейчас это не реализовано, но можно учесть при доработке.

10) Идемпотентность createException (не критично)
- При повторной отправке из UI/мобилки можно предусмотреть X‑Idempotency‑Key на создание исключения.

Соответствие требованиям РФ

- 152‑ФЗ
  - Минимизация: reason не уходит в аудит — хорошо; в ответах — нужно уточнить маскирование по ролям (P1).
  - Сроки хранения: отсутствуют поля/cron — нужно внедрить (P0).
  - Учёт операций: аудит CRUD расписаний и исключений нужен (частично реализовано; расширить — P0).
- 242‑ФЗ
  - Локализация данных — на уровне инфры. Модуль не противоречит.
- 402‑ФЗ/54‑ФЗ/161‑ФЗ/PCI
  - Неприменимо к модулю расписаний.
- 1119‑ПП/ФСТЭК
  - Аудит админских операций — расширить покрытие исключений (P0).
- Безопасность разработки
  - Валидация DTO/входных данных — есть (ValidationPipe + service‑level).
  - SQLi/XSS — DTO‑валидация + EnhancedValidationPipe; свободные тексты (reason) проходят XSS‑проверку — ок.

Качество кода и архитектура

- Слои разделены (controller/service/data/validation/mapper/business).
- RBAC/ownership: на контроллере — @AuthWithOwnership + @WorkScheduleResource (по id‑эндпоинтам), findAll — ручные проверки (superadmin требует companyId, mechanic — только свои) — хорошо.
- Observability: логирование и аудит сделаны, но отсутствует аудит для исключений status/delete.
- Транзакции: не требуются для простых операций; на будущее — статус‑смена исключений + каскадное влияние на Appointments делать транзакционно.

Приоритетный план изменений

P0 (сначала)
1) Исправить userBelongsToCompany: использовать имена свойств Entity (companyId), а не имена колонок. Применить и к select, и к where. Добавить тест/проверку.
2) Доменный аудит исключений:
   - SCHEDULE_EXCEPTION_STATUS_CHANGED на updateExceptionStatus;
   - SCHEDULE_EXCEPTION_DELETED на deleteException (без reason);
   - Если появятся эндпоинты list/view — SCHEDULE_EXCEPTIONS_LISTED/VIEWED.
3) Ретеншн/анонимизация исключений:
   - schedule-exception.entity.ts: добавить поля dataRetentionUntil, anonymizedAt, anonymizedBy, piiAnonymized (bool).
   - DataService.createException: рассчитать dataRetentionUntil (endDate + N лет из конфигурации).
   - Cron‑анонимайзер: планировщик в модуле Work‑Schedules (ScheduleModule уже есть), с Redis‑lock (common/redis) для компании; операция — очистка reason/персональных полей → piiAnonymized=true.

P1 (следом)
4) Обработка уникальности при создании расписания: ловить уникальный конфликт (companyId,userId,dayOfWeek) и маппить на WorkScheduleConflictException (HTTP 409).
5) Role‑based маскирование reason в ответах (mapper): по ролям (например, mechanic видит только своё; admin/owner — все; остальные — скрыть или обрезать).
6) Политика удаления исключений: вместо физического delete — либо soft‑delete, либо анонимизация содержимого; при любом удалении — аудит.

P2 (улучшения)
7) Унифицировать @Throttle на 'read'/'write' профили; оставить локальные лимиты только при необходимости.
8) Идемпотентность createException с X‑Idempotency‑Key (опционально).
9) Метрики/дашборд: ошибки конфликта/валидаторов, частота исключений по типам.

Затронутые файлы/модули (для следующей волны Edits)
- apps/backend/src/modules/work-schedules/services/work-schedules-data.service.ts — P0: userBelongsToCompany; P0: аудит исключений status/delete; P1: delete→soft/anonymize.
- apps/backend/src/modules/work-schedules/work-schedules.service.ts — P0: аудит исключений status/delete; P1: ловля уникального конфликта (create).
- apps/backend/src/modules/work-schedules/work-schedules.controller.ts — при добавлении эндпоинтов для exceptions status/list/view — RBAC + @Throttle.
- apps/backend/src/modules/work-schedules/work-schedules.module.ts — регистрировать scheduler.
- apps/backend/src/modules/work-schedules/services/work-schedules-validation.service.ts — возможно расширение проверок прав для исключений, если появится update/delete.
- apps/backend/src/modules/work-schedules/services/work-schedules-mapper.service.ts — P1: role‑based маскирование reason.
- apps/backend/src/database/entities/schedule-exception.entity.ts — P0: dataRetentionUntil, anonymizedAt/By, piiAnonymized.
- apps/backend/src/modules/work-schedules/services/work-schedules-retention.scheduler.ts — P0: новый файл (Cron + Redis‑lock).
- apps/backend/src/config/configuration.ts — секция workSchedules: { exceptionsRetentionYears, exceptionsAnonymizeCron }.
- apps/backend/src/config/validation.schema.ts — валидация ENV (WORK_SCHEDULE_EXCEPTIONS_RETENTION_YEARS, WORK_SCHEDULE_EXCEPTIONS_ANON_CRON).
- apps/backend/src/common/redis/* — использовать существующий модуль; новых правок не требуется, если API достаточно.

Зависимости
- ENV:
  - WORK_SCHEDULE_EXCEPTIONS_RETENTION_YEARS (например, 3–5 лет; согласовать с политикой).
  - WORK_SCHEDULE_EXCEPTIONS_ANON_CRON (например, '0 4 * * *').
- БД:
  - Добавление полей в schedule_exceptions (миграции не обязательны — вы допускаете пересоздание БД).
- Redis:
  - Используем common/redis для lock (ключ per company).

Риски
- userBelongsToCompany баг может приводить к обходу изоляции — фикс приоритетный.
- Физическое удаление исключений без аудита — потеря следа. Лучше soft/anonymize + аудит.
- Внедрение ретеншна требует миграции/пересоздания схемы и аккуратной настройки cron/lock.

Quick wins
- Быстро поправить userBelongsToCompany (companyId вместо company_id).
- Добавить аудит на updateExceptionStatus/deleteException (без reason).
- В конфиг сразу добавить флаги ретеншна и крон; Cron‑класс можно подключить позже.
- В create schedule — try/catch на UniqueViolation (code '23505') → 409.

Готов перейти к Edits. Если ок, пришли, пожалуйста, точные версии:
- apps/backend/src/database/entities/schedule-exception.entity.ts
- apps/backend/src/database/entities/work-schedule.entity.ts

И подтверди желаемые ENV (годы хранения и CRON), чтобы я добавил секцию workSchedules в configuration/validation и создал scheduler с Redis‑lock.

Принял файлы. Ниже Audit по Work‑Schedules (без кода) с приоритизированным планом, зависимостями и quick wins.

Что рассмотрено
- Контроллер/сервис/слои: work-schedules.controller.ts, work-schedules.service.ts, services/* (business/data/mapper/validation), work-schedules.module.ts
- Сущности: work-schedule.entity.ts, schedule-exception.entity.ts
- Конфиги: configuration.ts, validation.schema.ts

Ключевые находки

P0 — критично
1) Проверка принадлежности пользователя компании (userBelongsToCompany)
- Где: WorkSchedulesDataService.userBelongsToCompany
- Проблема: используются имена уровня БД ('company_id') вместо имён свойств Entity в find options (TypeORM ожидает имена свойств Entity). В Users таблице действительно есть столбец company_id (см. миграции), но в where/select должны использоваться property‑неймы Entity. Текущая проверка может работать некорректно и пропускать посторонние userId.
- Риск: нарушение изоляции компаний (multi‑tenant) → прямой риск для 152‑ФЗ.
- Нужно: перейти на property‑имена Entity (вероятно companyId) и не смешивать snake_case в find options.

2) Доменный аудит исключений — покрытие неполное
- Уже есть: SCHEDULE_EXCEPTION_CREATED.
- Нет: SCHEDULE_EXCEPTION_STATUS_CHANGED (approve/reject), SCHEDULE_EXCEPTION_DELETED; также нет LIST/VIEW (если появятся соответствующие эндпоинты).
- Риск: неполный след админских операций (1119‑ПП/ФСТЭК).
- Нужно: добавить вызовы AuditService для status‑change/delete (без reason), и для будущих list/view.

3) Ретеншн/анонимизация исключений отсутствуют
- Сущность ScheduleException не содержит полей dataRetentionUntil, anonymizedAt, anonymizedBy, piiAnonymized.
- Нет Cron‑процесса и Redis‑lock для пакетной анонимизации.
- Риск: несоответствие принципу ограничения сроков хранения (152‑ФЗ).
- Нужно: добавить поля ретеншна в сущность, рассчитывать dataRetentionUntil при create, внедрить Cron‑анонимизацию (с Redis‑lock per company/tenant).

P1 — важно
4) Уникальный конфликт при создании расписания
- В БД есть unique(companyId,userId,dayOfWeek). Сейчас при гонке пользователю вернётся сырой DB‑error (500).
- Нужно: ловить уникальное нарушение (например, code '23505') и маппить на WorkScheduleConflictException → 409.

5) Маскирование reason в ответах (role‑based)
- В аудите reason не пишется — хорошо. Но в ExceptionResponseDto reason возвращается без маски.
- Нужно: в маппере/сервисе применять маскирование/обрезку reason для ролей, которым не положено видеть полный текст (минимизация ПДн, 152‑ФЗ). Минимум — механик видит только свои; прочие — по RBAC.

6) Политика удаления исключений
- deleteException выполняет физическое удаление.
- Рекомендация: либо soft‑delete (isDeleted/deletedAt), либо «анонимизация» содержимого (reason → null/[REDACTED], piiAnonymized=true) с сохранением записи для аудита.

7) Аудит LIST/VIEW для исключений (на будущее)
- Если появятся эндпоинты для листинга/просмотра исключений — добавить SCHEDULE_EXCEPTIONS_LISTED/VIEWED.

P2 — улучшения
8) Единообразный throttling
- Сейчас используются inline @Throttle({ default: { ... } }). С учётом подключённых профилей 'read'/'write' — стоит унифицировать: GET → 'read', write → 'write'.

9) Идемпотентность createException (опционально)
- X‑Idempotency‑Key на создание исключений снизит риск дублей от UI/мобилы.

10) Расширить валидацию прав для исключений
- В контроллере есть ограничение для механика «только для себя» на create. Если будут status‑update/delete — добавить явные проверки валидации владения/прав.

Соответствие РФ‑требованиям (сводно)
- 152‑ФЗ: минимизация (аудит без reason — ок); выдача reason в API без role‑mask — доработать (P1); сроки хранения — нет (P0).
- 242‑ФЗ: локализация на уровне инфры — модуль не противоречит.
- 1119‑ПП/ФСТЭК: аудит админских операций — нужно расширить покрытие (P0).
- 402‑ФЗ/54‑ФЗ/161‑ФЗ/PCI: неприменимо к модулю расписаний.

Качество кода/архитектура
- Слои разделены корректно (controller/service/data/validation/mapper/business).
- RBAC/ownership: детальные GET/PATCH/DELETE защищены @WorkScheduleResource; листинг — ручные проверки (superadmin → companyId обязателен; механику — только свои) — хорошо.
- Валидация: хорошая проверка форматов/диапазонов/перерывов/длительности; advanced notice реализован.
- Наблюдаемость: логирование + аудит по основным сценариям; расширить для исключений.

Приоритетный план изменений (с ожидаемым эффектом)

P0 (сначала)
- WorkSchedulesDataService.userBelongsToCompany: перейти на property‑имена Entity (companyId). Эффект: восстановление строгой изоляции компаний.
- Audit исключений: добавить SCHEDULE_EXCEPTION_STATUS_CHANGED и SCHEDULE_EXCEPTION_DELETED. Эффект: полнота следа (1119‑ПП).
- Ретеншн/анонимизация исключений:
  - Добавить поля: dataRetentionUntil, anonymizedAt, anonymizedBy, piiAnonymized.
  - Рассчитывать dataRetentionUntil на create (например, endDate + N лет).
  - Cron‑задача с Redis‑lock (компанийный ключ) — обнуление reason/PII, проставление piiAnonymized=true. Эффект: соответствие 152‑ФЗ.

P1
- Обработка 23505 на create расписания → WorkScheduleConflictException (409).
- Role‑based маскирование reason в ExceptionResponseDto (в маппере/сервисе, с учётом роли/owner).
- Политика удаления исключений → soft‑delete или анонимизация, с аудитом.

P2
- Перевести @Throttle на профили 'read'/'write' для единообразия.
- Идемпотентность createException (X‑Idempotency‑Key).
- (Опц.) Мелкие аналитики/метрики по исключениям.

Затронутые файлы (для Edits)
- apps/backend/src/modules/work-schedules/services/work-schedules-data.service.ts
  - P0: userBelongsToCompany (property‑имена).
  - P0: аудит исключений на status/delete (если логика в data/service).
  - P1: delete → soft/anonymize (если решим).
- apps/backend/src/modules/work-schedules/work-schedules.service.ts
  - P0: Audit on status change/delete (при реализации эндпоинтов).
  - P1: try/catch 23505 → WorkScheduleConflictException.
  - P1: role‑based маскирование reason (может быть в маппере).
- apps/backend/src/modules/work-schedules/services/work-schedules-mapper.service.ts
  - P1: маскирование reason по ролям/владению.
- apps/backend/src/modules/work-schedules/work-schedules.controller.ts
  - Если добавим endpoints для exception status/delete/list/view — RBAC + @Throttle('write'/'read') + AuditService.
- apps/backend/src/database/entities/schedule-exception.entity.ts
  - P0: поля dataRetentionUntil, anonymizedAt, anonymizedBy, piiAnonymized.
- apps/backend/src/modules/work-schedules/work-schedules.module.ts
  - P0: регистрируем scheduler (Cron) и подключаем Redis‑lock.
- apps/backend/src/modules/work-schedules/services/work-schedules-retention.scheduler.ts
  - P0: новый файл — Cron + Redis‑lock.
- apps/backend/src/config/configuration.ts и validation.schema.ts
  - P0: секция workSchedules: { exceptionsRetentionYears, exceptionsAnonymizeCron } и их валидация.

Зависимости
- ENV:
  - WORK_SCHEDULE_EXCEPTIONS_RETENTION_YEARS (напр., 3–5, согласовать).
  - WORK_SCHEDULE_EXCEPTIONS_ANON_CRON (напр., '0 4 * * *').
- Redis: common/redis уже есть; использовать для lock.
- БД: добавление новых полей к schedule_exceptions (миграция допустима через пересоздание).

Риски
- userBelongsToCompany в текущем виде — потенциальный обход изоляции. Это P0.
- Физическое удаление исключений без аудита — потеря следа; лучше soft/anonymize.
- Ретеншн требует добавления полей и Cron — без этого 152‑ФЗ по срокам хранения не закрыт.

Quick wins
- Исправить userBelongsToCompany на property‑имена (companyId).
- Добавить аудит на updateExceptionStatus/deleteException (без reason).
- Добавить ENV/валидацию workSchedules.* (для ретеншна), даже до реализации Cron — чтобы не забыть.

Готов перейти к Edits. Если ок:
- Скажи желаемые значения по умолчанию для WORK_SCHEDULE_EXCEPTIONS_RETENTION_YEARS (предложение: 5) и WORK_SCHEDULE_EXCEPTIONS_ANON_CRON (предложение: 0 4 * * *).
- Подтверди, что выбираем стратегию удаления исключений: soft‑delete или «анонимизация содержимого» (рекомендую анонимизацию).
После этого пришлю path‑blocks: сущность (с полями ретеншна), конфиги, валидатор, scheduler, аудит и фикс userBelongsToCompany.