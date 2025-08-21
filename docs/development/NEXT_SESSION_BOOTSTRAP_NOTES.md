// path: docs/NEXT_SESSION_BOOTSTRAP_NOTES.md
# 🚀 DRIVECARE V2 — MODULE HARDENING PLAYBOOK (NEXT-SESSION BOOTSTRAP)

Назначение: быстрый «чек‑лист памяти» и единые паттерны, чтобы в следующей сессии без потери времени продолжать переработку модулей по тем же стандартам безопасности/комплаенса.  

Скопируй этот файл в новую сессию как контекст. Я буду запрашивать точные пути файлов и работать строго по коду.

---

## 1) Глобальные инварианты (что держим всегда)

- RBAC и Ownership:
  - Используем канонические роли: 'superadmin','company_owner','company_admin','inventory_manager', ... (согласно auth/types/auth.types.ts).
  - В контроллерах: @AuthWithOwnership + @Roles(...). Для ресурсных эндпоинтов — профильный декоратор @<Module>Resource (например, @PartResource).
  - CompanyOwnershipGuard всегда проверяет владение через профильный ValidationService.validate<Resource>Ownership.

- Superadmin правило:
  - На листингах/поисках/агрегатах — доступ только при явном ?companyId (иначе 400/403).
  - На ресурсных эндпоинтах с :id — доступ разрешён (компания определяется по самой сущности).

- Контроллеры:
  - Статические маршруты выше динамических (:id).
  - Нормализация query‑параметров: ParseBoolPipe для булевых, ParseIntPipe для чисел, строки — trim/ограничение длины.
  - Сортировки — только по whitelist, order asc|desc.
  - Лимиты пагинации — ≤ typed‑конфига (например, inventory.pagination.maxPageSize).

- DTO/XSS:
  - Свободные тексты — sanitize‑html (allowedTags: []), Transform + trim.
  - Строгие MaxLength/паттерны, numeric min/max/decimal‑places, логические бизнес‑правила (напр., selling ≥ cost*ratio).

- Data‑layer/SQL:
  - Строгая фильтрация по companyId во всех запросах.
  - Только параметризованные условия; In([...]) вместо any.
  - validate<Relation>Exists — через OR(companyId, NULL) для «глобальных» сущностей.
  - Никакой строковой конкатенации в SQL.

- Mapper/минимизация:
  - Доступ к себестоимости/ценам/derived (margin, profit) — только для CAN_VIEW_COSTS ролей модуля.
  - Для superadmin — не обходим ограничения по ролям «без companyId».

- Аудит:
  - Только типизированные AuditAction (без as any).
  - Метаданные ограничены по размеру, без токенов/секретов/ПДн в открытом виде.
  - События покрывают create/update/status/view/bulk/search.

- Идемпотентность:
  - Для bulk/критичных операций — X‑Idempotency‑Key (заголовок).
  - Redis NX + TTL (из typed‑конфига), повтор — возврат сохранённого результата; гонки — 409.
  - Примечание совместимости: lock реализуем через SETNX + PEXPIRE (шире совместим с клиентами Redis).

- Конфиг/ENV:
  - Используем typed‑config (configuration.ts) и Joi‑валидацию (validation.schema.ts).
  - Новые флаги — с безопасными дефолтами, описаниями и предикатами для production.

- Entity/DB:
  - timestamptz для дат; decimal(10–15,2) для денег.
  - partial unique индексы (например, (companyId, uniqueField) WHERE uniqueField IS NOT NULL).
  - CHECK: числовые поля ≥ 0; размеры/ограничения; индексы по companyId/foreign keys/createdAt.
  - При поиске — expression‑индексы LOWER(field) или pg_trgm (если требуется fuzzy/ILIKE масштабно).
  - 402‑ФЗ: публично не вызываем hard delete; используем soft‑delete/деактивацию/корректирующие операции.

---

## 2) Паттерн «Hardening» для нового модуля (шаги)

1) RBAC/Ownership
   - Ввести профильный @<Resource> декоратор (если нет).
   - В CompanyOwnershipGuard добавить кейс для ресурса: validate<Resource>Ownership(...).
   - В контроллерах: @AuthWithOwnership + @Roles(канонические роли).

2) Superadmin
   - На листингах/поисках/агрегатах — требовать ?companyId (иначе 400/403).
   - На :id — доступ разрешён (ресурс определяет компанию).

3) Контроллер
   - Поднять статические маршруты выше динамических.
   - Нормализовать query: булевы/числа/строки; обрезка строк; limit ≤ typed‑config.
   - Сортировки — whitelist полей + asc/desc.

4) DTO/XSS
   - Добавить sanitize‑html + Transform для строковых полей.
   - Строгие MaxLength/паттерны; numeric min/max/decimal places; бизнес‑валидации.

5) Data‑layer
   - Везде companyId; In([...]); parametrize; OR(companyId, NULL) для «общих» сущностей.
   - Устранить any/сырые SQL.

6) Mapper
   - Реализовать canViewCostsForRole(); скрывать cost/price/derived для «лишних» ролей.
   - Маскировать ПДн, если встречается.

7) Аудит
   - Добавить события в AuditAction (только Enum).
   - Логировать ключевые действия; ограничить метаданные.

8) Идемпотентность
   - X‑Idempotency‑Key; Redis NX + TTL; кеш/повтор/409 — по паттерну parts.

9) Конфиг
   - Добавить/переиспользовать typed‑ключи; обновить Joi/конфигурацию.

10) Entity/DB
   - Индексы/partial unique/check/timestamptz; длины полей в синхроне с DTO.
   - Исключить hard delete из публичного API.

---

## 3) Роли и разрешения (канон)

- company_owner, company_admin, inventory_manager — операционные права в Inventory.
- superadmin — только при явном companyId для листингов; ресурсные :id — допускаются.
- Общие CAN_VIEW_COSTS — ['superadmin','company_owner','company_admin','inventory_manager'] (для Inventory‑семейства).

---

## 4) Стандартизованные события аудита (переиспользовать)

- Создание/обновление/статус:
  - <ENTITY>_CREATED, <ENTITY>_UPDATED, <ENTITY>_STATUS_CHANGED, <ENTITY>_DELETED (soft)
- Просмотры/поиск:
  - <ENTITY>_VIEWED, <ENTITY>S_SEARCHED
- Bulk:
  - <ENTITY>S_BULK_UPDATED / _BULK_OPERATION
- Специфичные:
  - PRICE_CHANGED (для товаров/услуг), RESERVATION_CREATED/RELEASED (резервы), STOCK_* (движения), INVENTORY_ALERT_* (алерты)

Правила:
- Не писать ПДн/секреты в metadata/details.
- Ограничивать размер полей; хранить только необходимое для аудита.

---

## 5) Идемпотентность (паттерн)

- Заголовок: X‑Idempotency‑Key
- Redis:
  - lockKey: idemp:<area>:<op>:lock:<companyId>:<key>
  - resultKey: idemp:<area>:<op>:result:<companyId>:<key>
- Логика:
  - Если resultKey существует — вернуть кэш результата (200).
  - Иначе поставить lock (NX + TTL). Если lock уже стоит — 409.
  - Выполнить операцию → сохранить результат в resultKey (TTL) → снять lock.
- TTL: используем INVENTORY_IDEMPOTENCY_TTL_MS (единый дефолт 6h), без ввода дублей ключей.

---

## 6) Конфиг и ENV (типовой набор)

- Использовать уже существующие:
  - INVENTORY_MAX_PAGE_SIZE / <MODULE>_MAX_PAGE_SIZE
  - SANITIZE_INVENTORY_TEXTS / <MODULE>_SANITIZE_TEXTS
  - INVENTORY_IDEMPOTENCY_TTL_MS / <MODULE>_IDEMPOTENCY_TTL_MS
  - INVENTORY_ALERTS_ENABLED / INVENTORY_ALERTS_CRON (для алёртов)
- Добавления — только при реальной необходимости. Всегда:
  - validation.schema.ts: Joi‑валидация с безопасными дефолтами.
  - configuration.ts: registerAs('<module>') + typed‑доступ.

---

## 7) Entity/DB (без миграций, синхронизируем в dev)

- Поля:
  - createdAt/updatedAt: timestamptz
  - Денежные: decimal(10–15,2), CHECK ≥ 0
- Индексы:
  - companyId, foreign keys, createdAt
  - partial unique (companyId, uniqueField) WHERE uniqueField IS NOT NULL
  - (опционально) expression (LOWER(field)) для ILIKE
- Удаления:
  - Публичные API не вызывают hard delete — только soft/архив/корректировка.

---

## 8) Что запрашивать у тебя в начале работ по модулю (чтобы двигаться быстро)

- Контроллер/сервис/модуль:
  - apps/backend/src/modules/<module>/<module>.controller.ts
  - apps/backend/src/modules/<module>/<module>.service.ts
  - apps/backend/src/modules/<module>/<module>.module.ts
- DTO/response/константы/типы:
  - apps/backend/src/modules/<module>/dto/request/*
  - apps/backend/src/modules/<module>/dto/response/*
  - apps/backend/src/modules/<module>/constants/*.ts
  - apps/backend/src/modules/<module>/types/*.ts
- services (business/data/validation/mapper):
  - apps/backend/src/modules/<module>/services/*.ts
- Entities:
  - apps/backend/src/database/entities/<entity>.entity.ts (все связанные)
- Guards/Decorators/Audit:
  - apps/backend/src/common/decorators/resource.decorator.ts
  - apps/backend/src/common/guards/company-ownership.guard.ts
  - apps/backend/src/common/audit/audit.service.ts
- Config/ENV:
  - apps/backend/src/config/validation.schema.ts
  - apps/backend/src/config/configuration.ts
- Redis (если будет идемпотентность/webhooks/locks):
  - apps/backend/src/common/redis/*.ts
- package.json (для совместимости @nestjs/throttler и т.п.)

---

## 9) Acceptance‑критерии «Готово» (для каждого модуля)

- RBAC/Ownership:
  - @AuthWithOwnership + @<Resource>, канонические роли; superadmin — по правилам (list/aggregate только с companyId).
- DTO/XSS:
  - sanitize‑html, строгие лимиты/паттерны; корректные ошибки валидации.
- Контроллер:
  - Статические над динамическими; нормализованные query; whitelist сортировок; limit ≤ typed‑config.
- Data‑layer:
  - companyId фильтрация; In([...]); параметризованные запросы; OR(companyId,NULL) для «общих» сущностей.
- Mapper:
  - Скрытие чувствительных полей по ролям.
- Аудит:
  - События без any; маскирование и ограничение метаданных.
- Идемпотентность:
  - X‑Idempotency‑Key + Redis NX + TTL; повтор — возврат; гонка — 409.
- Entity/DB:
  - Индексы/partial unique/check/timestamptz; длины полей в синхроне с DTO.
- 402‑ФЗ/152‑ФЗ/242‑ФЗ/54‑ФЗ:
  - Историчность (нет hard delete), ПДн‑минимизация; локализация данных — без утечек в сторонние сервисы; фискальные ограничения (если затрагиваются).

---

## 10) Известные анти‑паттерны (избегать)

- Роли 'owner','admin' в контроллерах (использовать канон + alias‑маппер только в декораторе, если есть).
- Суперадмин без companyId на листинге (утечка всех компаний).
- Сортировка не по whitelist; строковая конкатенация в SQL.
- any/касты enum’ов в AuditAction.
- findMultipleByIds с id: partIds as any (нужно In(partIds)).
- validateCategoryExists с whereClause.companyId = [companyId, null] (нужно OR в QB).
- Публичный вызов hardDelete.

---

## 11) Примеры «что мы уже сделали в Inventory/Parts» (для повтора в других модулях)

- @PartResource + проверка владения в Guard через PartsValidationService.
- Superadmin: ?companyId обязателен на list/search/aggregates; :id допускается.
- Контроллер: нормализация запросов, whitelist сортировок, typed‑лимиты, статические пути выше динамических.
- DTO: sanitize‑html + Transform; строгие лимиты/паттерны; ценовые проверки.
- Data‑layer: фильтрация companyId; In([...]); OR(companyId,NULL) для категорий; параметризованные условия.
- Mapper: скрытие cost/price/derived для ролей без CAN_VIEW_COSTS.
- Аудит: PART_CREATED/UPDATED/PRICE_CHANGED/STATUS_CHANGED/PARTS_BULK_UPDATED/PART_VIEWED/PARTS_SEARCHED.
- Идемпотентность: X‑Idempotency‑Key + Redis NX + TTL; повтор — кэш результата; гонка — 409.
- Entity: partial unique (companyId, partNumber), CHECK ≥ 0, индексы, timestamptz.

---

## 12) Короткий «стартовый» пинг-лист

- Дай мне:
  - controller/service/module
  - DTO request/response
  - services (business/data/validation/mapper)
  - constants/types
  - entities
  - resource.decorator.ts, company-ownership.guard.ts, audit.service.ts
  - configuration.ts, validation.schema.ts
  - redis.* (если про идемпотентность)
  - package.json (для совместимости декораторов/версий)
- Сразу скажу, что будем исправлять:
  - роли/ownership, superadmin‑правило, сортировки/лимиты, DTO‑санитизация, data‑layer In/OR, mapper‑минимизация, audit enums, идемпотентность, entity‑индексы/checks, timestamptz.

---

## 13) Ближайший модуль: Inventory/Alerts — контекст и нюансы

- Конфиг без дублей: используем INVENTORY_ALERTS_ENABLED и INVENTORY_ALERTS_CRON из typed‑конфига; идемпотентность/дедуп — тот же INVENTORY_IDEMPOTENCY_TTL_MS (6h по умолчанию).
- RBAC/Ownership: те же роли, что и в Inventory; superadmin — только с явным ?companyId на листингах/аналитике; ресурсные :id — допускаются.
- Безопасность payload’ов: алерты не содержат ПДн и чувствительных цен для ролей вне CAN_VIEW_COSTS; агрегируй и маскируй (например, counts вместо списков).
- Redis‑ключи (канон): 
  - дедуп нотификаций — idemp:alerts:dispatch:<companyId>:<type>:<entityId>:<hash>;
  - лок на шедулере — lock:alerts:scheduler:<companyId> (один ран в интервал CRON).
- Аудит событий для алёртов — используем строгие enum’ы: INVENTORY_ALERT_CREATED / _UPDATED / _DISMISSED / INVENTORY_ALERTS_AUTO_DISMISSED / INVENTORY_ALERT_SETTINGS_UPDATED / INVENTORY_ALERT_TEST_NOTIFICATION (метаданные ограничиваем, без ПДн).
- Контроллеры: тест‑нотификация/настройки — под @AuthWithOwnership + @Roles(...); статические пути выше ':id'; троттлинг на write‑эндпоинтах.
- Data‑layer: фильтрация по companyId во всех запросах; параметризованные условия; индексы по (companyId, createdAt) + частичные/выражения при необходимости ILIKE.
- 402‑ФЗ/152‑ФЗ/242‑ФЗ: алёрты не удаляем «жёстко» в публичном API; минимизация ПДн в телах; локализация исполнения/хранения — RU.

## 14) Конвенции ответа и формат правок (для следующей сессии)

- Не гадать содержимое файлов. Сначала запросить точные пути и текущие версии файлов, которые нужны для правок.
- Перед любыми изменениями — полный просмотр/аудит модуля (контроллер, сервисы business/data/validation/mapper, DTO, entities, guards, config, redis, package.json).
- Код присылать целиком файлами (не дифы), строго в блоке (```):
  - Точно указывать путь: `// path: <путь к файлу>` прямо внутри блока: путь к файлу и его содержимое, прямо в одном блоке.
  - Внутри — полный актуальный контент файла.
- Минимальный рефакторинг: править только то, что необходимо по безопасности/комплаенсу/совместимости; не менять публичные контракты без явной причины.
- Всегда проверять:
  - RBAC/Ownership + профильный декоратор ресурса.
  - Superadmin‑правило (листинги/агрегаты — только с ?companyId).
  - Порядок маршрутов: статические над динамическими.
  - Нормализацию query/валидацию DTO (sanitize‑html, Transform, MaxLength/Min/Max/enum/decimal places).
  - Data‑layer: companyId везде; параметризованные запросы; In([...]); OR(companyId,NULL) для «общих» сущностей; без сырого SQL.
  - Mapper: скрытие чувствительных и derived полей по ролям (CAN_VIEW_COSTS).
  - Идемпотентность: X‑Idempotency‑Key; Redis NX + TTL; повтор → кэш; гонка → 409.
  - Аудит: только типизированные AuditAction; метаданные ограничены и без ПДн.
  - Entity/DB: timestamptz/decimal; индексы/partial unique/check; длины полей синхронизированы с DTO.
  - Typed‑config + Joi: новые ключи добавлять аккуратно с безопасными дефолтами и прод‑предикатами.
- Если для правки нужны новые ENV/флаги:
  - Сначала обновить validation.schema.ts и configuration.ts (typed‑доступ), затем .env.example.
- Инструменты/ритуалы:
  - Поддерживать троттлинг (@nestjs/throttler) в актуальной сигнатуре версии.
  - Для трекера — запускать `npm run tracker:sync` (или pre‑commit hook) и при необходимости `TRACKER_WRITE=1 npm run tracker:sync`.

---

## 15) Быстрый «режим въезда» в новый модуль

- Пришли (либо подтверди пути):  
  controller/service/module, DTO request/response, services (business/data/validation/mapper), constants/types, entities, resource.decorator.ts, company-ownership.guard.ts, audit.service.ts, configuration.ts, validation.schema.ts, redis.*, package.json.
- Я вернусь с:
  - Коротким планом, списком гепов/рисков, acceptance‑критериями.
  - Полными файлами с правками в формате `// path: ...`.
