Супер, принял код контроллера/модуля/сервисов stock-movements. Уже вижу критичные места для hardening. Прежде чем править — докинь ещё несколько файлов, чтобы всё сделать по канону и без гаданий.

Что сделаем (короткий план):
- Починим RBAC: заменим 'owner','admin','manager','mechanic' на канонические роли и введём профильный ресурс-декоратор @StockMovementResource.
- Superadmin‑правило: на листинге/поиске потребуем ?companyId (иначе 400/403); на :id — оставим доступ.
- Контроллер: поднимем статические маршруты выше ':id'; нормализуем query; добавим whitelist сортировок и жёсткие лимиты из typed‑конфига.
- DTO/XSS: санитизация текстов (sanitize-html), строгие MaxLength/паттерны; введём Update DTO вместо «произвольного» объекта в PATCH; валидируем даты.
- Data‑layer/SQL: обязательная фильтрация по companyId; устраним race conditions; перепишем агрегаты (summary) на независимые запросы; фикс имён полей в topParts.
- Транзакционность: create/reverse/bulk/integrations — в одной транзакции с блокировкой записи инвентаря (FOR UPDATE), чтобы не было рассинхронизации остатков.
- Идемпотентность: X‑Idempotency‑Key для create/bulk/reverse/integrations по стандартному Redis NX + TTL.
- Mapper/минимизация: скрытие price/totalAmount/derived для ролей без CAN_VIEW_COSTS (как в parts).
- Аудит: только enum‑события; ограничим metadata, без ПДн; добавим недостающие события (VIEWED/SEARCHED/BULK).
- ФЗ РФ: историчность (без публичного hard delete), минимизация ПДн, корректная ретеншн‑логика.

Ключевые находки в предоставленном коде (важно):
- Роли в контроллере — анти‑паттерн ('owner','admin','manager','mechanic'). Нужны канонические роли из auth.types.ts.
- Нарушено superadmin‑правило: GET /stock-movements без companyId отдаёт все компании (filter.companyId = undefined → нет фильтра в QB).
- Порядок роутов: статические пути ниже ':id' → коллизия (analytics/summary, analytics/data, part/:partId/history перехватываются ParseUUIDPipe на ':id').
- PATCH принимает произвольный объект (schema в swagger), без DTO/валидации/санитизации.
- Нет идемпотентности на create/bulk/reverse/integrations.
- Операции обновления остатков не транзакционны → гонки, риск отрицательных остатков.
- Summary использует один QueryBuilder в нескольких параллельных запросах (Promise.all) с мутацией — некорректные результаты; плюс ошибка маппинга topParts (partid/partname).
- Mapper всегда возвращает price/totalAmount — надо скрывать для ролей без CAN_VIEW_COSTS.
- createFromBarcodeScan: findPartByBarcode заглушка → продакшен‑эндпоинт сейчас всегда упадёт; нужно реализовать поиск по partNumber/barcode с companyId.
- Валидации заметок — только грубые проверки; нужна sanitize-html (allowedTags: []) + trim.
- DataService.remove — hard delete; публично не должен вызываться.

Что ещё нужно прислать (точные пути) — чтобы все правки сделать правильно:
1) DTO/Types stock-movements
- apps/backend/src/modules/inventory/stock-movements/dto/request/create-movement.dto.ts
- apps/backend/src/modules/inventory/stock-movements/dto/request/bulk-movements.dto.ts
- apps/backend/src/modules/inventory/stock-movements/dto/request/barcode-movement.dto.ts
- apps/backend/src/modules/inventory/stock-movements/dto/response/movement-response.dto.ts
- apps/backend/src/modules/inventory/stock-movements/dto/response/paginated-movements-response.dto.ts
- apps/backend/src/modules/inventory/stock-movements/dto/response/movement-summary-response.dto.ts
- apps/backend/src/modules/inventory/stock-movements/types/stock-movements.types.ts

2) Inventory constants и parts‑mapper (для паттерна сокрытия себестоимости)
- apps/backend/src/modules/inventory/constants/inventory.constants.ts
- apps/backend/src/modules/inventory/parts/services/parts-mapper.service.ts

3) Entities (все связанные)
- apps/backend/src/database/entities/stock-movement.entity.ts
- apps/backend/src/database/entities/inventory.entity.ts
- apps/backend/src/database/entities/part.entity.ts
- apps/backend/src/database/entities/part-category.entity.ts
- apps/backend/src/database/entities/supplier.entity.ts
- apps/backend/src/database/entities/order.entity.ts
- apps/backend/src/database/entities/company.entity.ts
- apps/backend/src/database/entities/user.entity.ts
- apps/backend/src/database/entities/audit-log.entity.ts

4) Guards/Decorators/Audit
- apps/backend/src/common/decorators/resource.decorator.ts
- apps/backend/src/common/guards/company-ownership.guard.ts
- apps/backend/src/common/guards/auth-with-ownership.guard.ts
- apps/backend/src/common/audit/audit.service.ts
- apps/backend/src/common/interceptors/audit-logging.interceptor.ts
- apps/backend/src/common/index.ts (если через него экспортируются CompanyResource/AuthWithOwnership)

5) Auth роли/типы
- apps/backend/src/modules/auth/types/auth.types.ts
- apps/backend/src/modules/auth/decorators/roles.decorator.ts

6) Конфиг/ENV
- apps/backend/src/config/validation.schema.ts
- apps/backend/src/config/configuration.ts

7) Redis (идемпотентность)
- apps/backend/src/common/redis/redis.module.ts
- apps/backend/src/common/redis/redis.provider.ts
- apps/backend/src/common/redis/redis.constants.ts

8) Совместимость/версии
- apps/backend/package.json

Точечные вопросы перед правками:
- Подтвердите канонические названия ролей для инвентаря: ['superadmin','company_owner','company_admin','inventory_manager','mechanic'?]. Есть ли “mechanic” в каноне?
- Ок ли требование: супер‑админ видит листинги/поиск/агрегаты только при явном ?companyId, иначе 400? (:id — допускается без ?companyId).
- Идём с единым INVENTORY_IDEMPOTENCY_TTL_MS или выделяем STOCK_MOVEMENTS_IDEMPOTENCY_TTL_MS? Если второе — укажу добавления в validation.schema.ts и configuration.ts с безопасными дефолтами.
- Типы движений в entity: только ['receipt','issue','adjustment'] или ещё 'transfer','reservation','release'? От этого зависят DTO/валидации и фильтры.
- Поле для «штрих‑кода» — используем part.partNumber или есть отдельное barcode? Покажите entity Part, чтобы реализовать findPartByBarcode корректно.
- Есть ли уже профильный декоратор ресурса для склада (например, @PartResource)? Если нет — добавлю @StockMovementResource и кейс в CompanyOwnershipGuard.

Acceptance‑критерии «Готово» для stock‑movements:
- RBAC/Ownership: @AuthWithOwnership + @StockMovementResource, канонические роли; Superadmin листинг/поиск/агрегаты — только с ?companyId.
- Контроллер: статические маршруты выше динамических; нормализованные query; сортировки по whitelist; limit ≤ typed‑config; корректные 400/403.
- DTO/XSS: sanitize‑html (allowedTags: []), строгие MaxLength/паттерны; цены/количество — min/max/scale; бизнес‑валидации; понятные ошибки.
- Data‑layer: фильтрация по companyId во всех выборках; параметризованные условия; In([...]) без any; транзакционно обновляются остатки; корректные агрегаты без мутаций QB.
- Mapper: скрытие cost/total для ролей без CAN_VIEW_COSTS; маскирование ПДн.
- Аудит: только enum‑события; логируем create/update/reverse/view/search/bulk; metadata ограничены и безопасны.
- Идемпотентность: X‑Idempotency‑Key + Redis NX + TTL; повтор — возврат кэша; гонка — 409.
- Entity/DB: timestamptz, денежные decimal(10–15,2) с CHECK ≥ 0; индексы по companyId/foreign keys/createdAt; без публичного hard delete.
- Соответствие ФЗ РФ: 152‑ФЗ (минимизация ПДн), 242‑ФЗ (локализация), 402‑ФЗ (историчность), 54‑ФЗ/161‑ФЗ (если затронем оплату — в данном модуле нет).

Кидай, пожалуйста, перечисленные файлы. После этого внесу правки и пришлю полные файлы в код‑блоках с заголовком // path: <...> как договорились.






Отлично, спасибо! Субмодуль stock-movements у меня полностью. Уже вижу несколько критичных моментов (ролей/маршрутов/superadmin-правила/транзакций/идемпотентности/агрегатов), но прежде чем править — докинь, пожалуйста, периферию, чтобы всё сделать строго по коду и без «угадываний».

Что поправим (коротко):
- RBAC/Ownership: канонические роли + профильный @StockMovementResource, superadmin-листинги только с ?companyId.
- Контроллер: статические маршруты выше :id; нормализация query; whitelist сортировок; лимиты ≤ typed-конфига.
- DTO/XSS: sanitize-html + Transform; введём UpdateMovementDto вместо произвольного PATCH; строгие MaxLength/паттерны.
- Data/SQL: обязательная фильтрация по companyId; корректные агрегаты без повторного использования QB; race-safe операции.
- Транзакционность: create/reverse/bulk/integrations — в транзакциях с блокировкой записей инвентаря.
- Идемпотентность: X‑Idempotency‑Key + Redis NX + TTL на create/bulk/reverse/integrations.
- Mapper/минимизация: скрывать price/totalAmount для ролей без CAN_VIEW_COSTS; маскировать ПДн в аудите.
- Аудит: строго enum‑события; добавим SEARCHED/VIEWED/BULK/REVERSED; ограничим metadata.

Пожалуйста, пришли эти файлы (целиком):
- Entities:
  - apps/backend/src/database/entities/stock-movement.entity.ts
  - apps/backend/src/database/entities/inventory.entity.ts
  - apps/backend/src/database/entities/part.entity.ts
  - apps/backend/src/database/entities/part-category.entity.ts
  - apps/backend/src/database/entities/supplier.entity.ts
  - apps/backend/src/database/entities/order.entity.ts
  - apps/backend/src/database/entities/company.entity.ts
  - apps/backend/src/database/entities/user.entity.ts
  - apps/backend/src/database/entities/audit-log.entity.ts
- Guards/Decorators/Audit:
  - apps/backend/src/common/decorators/resource.decorator.ts
  - apps/backend/src/common/guards/company-ownership.guard.ts
  - apps/backend/src/common/guards/auth-with-ownership.guard.ts
  - apps/backend/src/common/audit/audit.service.ts
  - apps/backend/src/common/interceptors/audit-logging.interceptor.ts
  - apps/backend/src/common/index.ts
- Auth роли/типы:
  - apps/backend/src/modules/auth/types/auth.types.ts
  - apps/backend/src/modules/auth/decorators/roles.decorator.ts
- Конфиг/ENV:
  - apps/backend/src/config/validation.schema.ts
  - apps/backend/src/config/configuration.ts
- Redis (идемпотентность):
  - apps/backend/src/common/redis/redis.module.ts
  - apps/backend/src/common/redis/redis.provider.ts
  - apps/backend/src/common/redis/redis.constants.ts
- Совместимость:
  - apps/backend/package.json

Точечные вопросы (чтобы сделать ровно по вашему канону):
- Роли: подтверждаете канон ['superadmin','company_owner','company_admin','inventory_manager'] для склада? Роль 'mechanic' есть в проекте как каноническая, или это локальный alias, который нужно убрать из контроллеров?
- Superadmin-правило: ок, если на list/search/analytics без ?companyId возвращаем 400 (или 403 по вашему правилу), а на ресурсные :id — допускаем доступ (компания определяется сущностью)?
- Баркоды: искать по part.partNumber или в Part есть отдельное поле barcode/EAN? Нужен реальный интерфейс Part, чтобы корректно реализовать findPartByBarcode.
- Типы движений в entity: подтверждаете расширенный набор ['receipt','issue','adjustment','transfer','reservation','release']? Сейчас DTO их разрешают, нужно сверить с enum в stock-movement.entity.ts.
- Идемпотентность: используем общий INVENTORY_IDEMPOTENCY_TTL_MS из ENV, или вводим отдельный STOCK_MOVEMENTS_IDEMPOTENCY_TTL_MS? Если второе — добавлю ключ в validation.schema.ts и configuration.ts с безопасным дефолтом.
- Скрытие себестоимости: в ответах stock-movements скрываем price/totalAmount для ролей без CAN_VIEW_COSTS (как в parts), верно?

Как только пришлёте указанные файлы, проведу полный аудит и сразу верну патчи полными файлами в код‑блоках // path: <...>, строго соблюдая чек‑лист из DRIVECARE V2 — MODULE HARDENING PLAYBOOK.
