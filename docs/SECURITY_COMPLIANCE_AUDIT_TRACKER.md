# 📋 DRIVECARE V2 — SECURITY & COMPLIANCE AUDIT TRACKER (RESET)

Дата создания: 06.08.2025  
Последнее обновление: 25.08.2025  
Статус: 🔄 ONGOING SECURITY AUDIT (ре-аудит с учётом ФЗ РФ)  
Методология: Enterprise Security Review + РФ-комплаенс (152‑ФЗ, 242‑ФЗ, 1119‑ПП, Приказ ФСТЭК №21)

---

## ✅ Что сделано (Core · Wave 1)

- CORS: разрешён трафик без Origin во всех средах (не блокируем health/webhooks/server‑to‑server).
- X‑Request‑ID: добавлена корреляция запросов; заголовок X‑Request‑ID проставляется на все ответы.
- Cache-Control: по умолчанию для API включён строгий no-store/no-cache (минимизация риска кэширования ПДн).
- Аудит:
  - Расширен пул AuditAction: добавлены SERVICE_*, SERVICE_CATEGORY_* и API_REQUEST_STARTED/API_REQUEST_COMPLETED.
  - Глобальный AuditLoggingInterceptor пишет безопасные события (без ПДн/секретов), логирует только безопасные X‑заголовки.
- Управление аудитом: AuditService уважает AUDIT_LOG_TO_DB; в проде AUDIT_CHAIN_KEY обязателен только если включена запись в БД.
- ENV: в .env.example добавлен AUDIT_LOG_TO_DB, а также X‑Idempotency‑Key разрешён в CORS заголовках.

Примечание: глобальный no-store конфликтует с будущим HTTP‑кэшем для публичных словарей (например, Vehicles‑Catalogue). Это закрыто в Wave 2 через декораторы CachePolicy/@AllowCache.

---

## ✅ Что сделано (Core · Wave 2)

- Кэш‑политика: добавлены декораторы CachePolicy/@AllowCache/@NoStore и поддержка в SecurityHeadersInterceptor. Теперь можно выборочно разрешать кэш для безопасных публичных GET.
- Throttling: подтверждена версия @nestjs/throttler (^6.4.0), подключены именованные профили в AppModule — 'global', 'auth', 'read', 'write'. Добавлена документация (docs/throttling.md).
- TypeORM logging: по умолчанию урезаны логи (без 'query'); включение verbose-логов через ENV DB_LOG_QUERIES=true. Добавлен порог медленных запросов DB_SLOW_QUERY_THRESHOLD_MS. Документация по CachePolicy добавлена (docs/cache-policy.md).

Что осталось применить по Wave 2 (точечно, на уровне модулей/роутов)
- Проставить @AllowCache на конкретных публичных GET:
  - vehicles-catalogue: GET /brands, /models?brandId, /types (TTL по бизнес-логике, например 3600s).
  - tariffs: GET /tariffs, /tariffs/active, /tariffs/popular, /tariffs/compare.
  - другие селекты без ПДн: например, /invoices/select/options — по усмотрению.
- Добавить @Throttle:
  - auth: login/register/refresh → 'auth'; logout*/sessions → 'write'; профилировка списков → 'read'.
  - services/categories: GET → 'read'; POST/PATCH/DELETE → 'write'; search → 'read'.
  - при необходимости вебхуки: выделить отдельный профиль 'webhook' (или временно 'write') + валидация подписи/ACL IP.
- TypeORM masking (если включать query‑логи): кастомный TypeORM Logger с маскированием конфиденциальных параметров (tokens/emails/phones/PAN и пр.). Сейчас mitigated за счёт отключения 'query' по умолчанию.

---

## 📊 MASTER MODULE TABLE (обновлено)

| # | Модуль | Тех. базлайн | Юр. базлайн (ФЗ РФ) | Приоритет | Статус |
|---|--------|--------------|---------------------|-----------|--------|
| 1 | auth | ✅ Tech‑hardened (RT cookie, jti, reuse‑det, 2FA) | 🟡 Требует финализации документов (политика/ретеншн/ДПА) | 🔴 Критический | ⏳ Pending (Legal) |
| 2 | users | ✅ Tech‑hardened (consents, self‑service, export) | 🟢 В основном готово; остались формальности | 🔴 Критический | 🟢 Near‑Ready |
| 3 | companies | ✅ Tech‑hardened (multi‑tenant, 152‑ФЗ fields, audit, RBAC) | 🟢 152‑ФЗ compliance добавлен | 🔴 Критический | 🟢 COMPLETED |
| 4 | payments | 🟢 Near‑Ready (Tech, без ККТ) | 🟡 54‑ФЗ/PCI pending | 🔴 Критический | 🟢 Near‑Ready (Tech) · ⏳ Pending (Legal) |
| 5 | invoices | 🟢 Near‑Ready (Tech) | 🟡 54‑ФЗ/402‑ФЗ pending | 🔴 Критический | 🟢 Near‑Ready (Tech) · ⏳ Pending (Legal) |
| 6 | subscriptions | ✅ Tech‑hardened (лимиты, статусы, idempotency, webhooks) | 🟡 Требует финализации 54‑ФЗ/161‑ФЗ (чеки/МИР/договоры) | 🟡 Высокий | 🟢 Near‑Ready (Tech) |
| 7 | payment-methods  | ✅ Tech‑hardened (encrypt cfg, RBAC, DTO, indices, checks) | 🟡 PCI/договоры/ретеншн — Pending | 🟡 Высокий | 🟢 Near‑Ready (Tech) |
| 8 | customers | ✅ Tech‑hardened (PII masking, consents, retention, ownership, subject‑rights, anonymization cron) | 🟢 Базовый 152‑ФЗ реализован; нужны орг‑документы | 🟡 Высокий | 🟢 COMPLETED (Tech) · ⏳ Pending (Legal Docs) |
| 9 | orders | ✅ Tech‑hardened (multi‑tenant, RBAC, XSS, audit, inventory, limits) | 🟡 152‑ФЗ частично (PII/аудит); 402‑ФЗ/54‑ФЗ — через связки | 🔴 Критический | 🟢 Near‑Ready (Tech) |
| 10 | inventory | ✅ Tech‑hardened (ownership, RBAC, XSS DTO, SQL‑фильтры, role‑costs, идемпотентные резервы + авто‑expire, 402‑ФЗ запрет удаления) | 🟡 Pending (орг‑регламенты) | 🟡 Высокий | 🟢 Near‑Ready (Tech) |
| 11 | inventory/parts | ✅ Tech‑Hardened (RBAC + @PartResource, sanitize DTO, whitelist сортировок/пагинации, audit, bulk idempotency, DB checks/indices) | 🟢 402‑ФЗ соблюдено; 152‑ФЗ N/A | 🟡 Высокий | 🟢 COMPLETED (Tech) |
| 12 | inventory/stock-movements | ✅ Tech‑Hardened (RBAC, superadmin‑rule, idempotency, Redis‑locks, XSS DTO, whitelist сортировок, audit) | 🟢 402‑ФЗ соблюдено; 152‑ФЗ N/A (PII минимизированы) | 🟡 Высокий | 🟢 COMPLETED (Tech) |
| 13 | inventory/suppliers | ✅ Tech‑Hardened (RBAC/superadmin‑rule, sanitize DTO, idempotency on bulk/rate, SQL filters, PII masking, audit, indices/timestamptz) | 🟡 152‑ФЗ light pending (орг‑процедуры/ретеншн) | 🟡 Высокий | 🟢 Near‑Ready (Tech) |
| 14 | inventory/alerts | ✅ Tech‑Hardened (RBAC + @InventoryAlertResource, superadmin‑rule, sanitize DTO, whitelist сортировок/пагинации, idempotency, settings persistence, scheduler, email notifications, DB checks/indices) | 🟢 402‑ФЗ соблюдено; 152‑ФЗ N/A | 🟡 Высокий | 🟢 Near‑Ready (Tech) |
| 15 | appointments | 🟢 Near‑Ready (Tech: RBAC/ownership, DTO XSS, tracking/stats) | 🟡 Pending | 🟢 Средний | 🟢 Near‑Ready (Tech) |
| 16 | work-schedules | 🟢 Near‑Ready (Tech) | 🟡 Pending (light) | 🟢 Средний | 🟢 Near‑Ready (Tech) |
| 17 | vehicles | ✅ Tech‑Hardened (RBAC/ownership, XSS DTO, audit, role‑based PII, DB checks/indices, no‑store) | 🟡 152‑ФЗ light pending (орг‑процедуры/ретеншн) | 🟢 Средний | 🟢 COMPLETED (Tech) |
| 18 | vehicles-catalogue | ✅ Tech‑Hardened (RBAC tightened, DTO sanitize/trim, pagination, normalized unique, timestamptz, audit CATALOGUE_*) | 🟢 N/A (ПДн не обрабатываются); аудит админских действий включён | 🟢 Средний | 🟢 COMPLETED (Tech) |
| 19 | services | 🟢 Near‑Ready (Tech) | Юр.: 🟢 N/A (ПДн напрямую не обрабатываются) | Приоритет: 🟢 Средний | Статус: 🟢 Near‑Ready (Tech) |
| 20 | services/categories | 🟢 Near‑Ready (Tech) | Юр.: 🟢 N/A (ПДн не обрабатываются) | Приоритет: 🟢 Средний | Статус: 🟢 Near‑Ready (Tech) |
| 21 | service-history | 🟢 Near‑Ready (Tech) | 🟡 152‑ФЗ light pending (орг‑процедуры/ретеншн) | 🟢 Средний | 🟢 Near‑Ready (Tech) |
| 22 | tariffs | ✅ Tech‑Hardened (RBAC tightened; цены в рублях; DTO sanitize; read/write аудит; имя в LOWER + unique; индексы; конфиг/ENV) | 🟢 N/A (ПДн не обрабатываются) | 🟢 Низкий | 🟢 COMPLETED (Tech) |

---

## 🧩 Work‑Schedules — детальное состояние (Tech Near‑Ready)

### 🟡 Юридическая база (light)
- 152‑ФЗ: ПДн затрагиваются косвенно (userId, свободный текст reason).
  - Реализовано: минимизация, санитизация reason; строгие роли/ownership; глобальный аудит запросов; no‑store на уровне API по умолчанию.
  - Требуется: регламент хранения (RETENTION_YEARS) и анонимизация исключений по срокам (cron); доменные события аудита (create/update/delete/exceptions) с маскированием reason.
- 242‑ФЗ: хранение данных в РФ — на уровне инфры.
- 402‑ФЗ/54‑ФЗ/161‑ФЗ/PCI: неприменимо.

### 🧪 Короткий чеклист доводки Work‑Schedules
- [ ] AuditService: логирование на create/update/delete/view/list и для исключений (create/status/delete) с маскированием reason.
- [ ] Superadmin‑policy: требование companyId на листингах; ограничения для механиков.
- [x] no-store заголовки на эндпоинтах с ПДн/свободными текстами — включено глобально для API.
- [ ] Ретеншн: поле dataRetentionUntil (для исключений) + CRON анонимизации (Redis‑lock).
- [ ] DB‑миграции: индексы/unique/check в актуальном виде.
- [ ] E2E: RBAC/ownership, partial day, перерывы/длительности, сортировки/пагинация, маскирование reason в доменном аудите.

---

## 🧩 Appointments — детальное состояние (Tech Near‑Ready)

### 🟡 Юридическая база (light)
- 152‑ФЗ: минимизация ПДн по ролям (mapper), поля ретеншн/анонимизации в сущности.
- Требуется:
  - Регламент хранения/анонимизации данных записей (APPOINTMENT_DATA_RETENTION_YEARS + scheduler по аналогии с Customers).
  - Интеграция AuditService для событий (create/update/status/reschedule/addRating/view/tracking) с маскированием метаданных.
  - Примечание: no‑store для API уже действует глобально.

### 🧪 Короткий чеклист доводки Appointments
- [ ] AuditService: события APPOINTMENT_CREATED/UPDATED/STATUS_CHANGED/CONFIRMED/COMPLETED/CANCELED/RESCHEDULED/RATED/VIEWED/TRACKING_VIEWED.
- [ ] Superadmin‑policy: унифицировать требование companyId для customer/mechanic‑листингов или выводить companyId по сущности.
- [ ] DB‑уровень защиты от пересечений: EXCLUDE constraint (tstzrange + mechanic_id) для активных статусов.
- [ ] Перфоманс: оптимизировать smartSchedule/checkAvailability — батч‑получение занятых интервалов и расчёт свободных слотов в памяти.
- [ ] E2E/интеграционные тесты: RBAC/ownership, статус‑переходы, перенос/отмена в граничных условиях, рейтинг только для COMPLETED, PII‑маскирование по ролям.
- [ ] Ретеншн/анонимизация: добавить CRON + Redis‑lock на анонимизацию по срокам хранения (по аналогии с Customers).

---

## 🧩 Inventory — детальное состояние (Tech Near‑Ready)

### 🟡 Юридическая база (light)
- 152‑ФЗ: ПДн в складе нет; применена минимизация отображаемых данных по ролям.
- 402‑ФЗ: соблюдена историчность — запрет на физическое удаление записей; корректирующие операции и аудит.
- 242‑ФЗ: хранение данных в РФ — контролируется инфрой (SERVER_REGION/LOCATION — RU).

### 🧪 Короткий чеклист доводки Inventory
- [ ] DB‑уровень: проверить/зафиксировать индексы и check‑constraints
  - unique(companyId, partId), quantity ≥ 0, minQuantity ≥ 0, selling/costPrice ≥ 0
- [ ] E2E/интеграция:
  - RBAC/ownership (включая требование companyId для superadmin),
  - идемпотентность резервов (повтор по X‑Idempotency‑Key),
  - авто‑expire резервов (scheduler),
  - корректность low‑stock alerts.
- [ ] Регламенты (орг): SOP по корректирующим движениям вместо удаления; правила доступа к себестоимости.

---

## 🧩 Inventory/Parts — детальное состояние (Tech‑Hardened, Completed)

### 🟡 Юридическая база (light)
- 402‑ФЗ: историчность (soft‑delete вместо hard delete), аудит изменений.
- 152‑ФЗ: ПДн не обрабатываются (N/A). 242‑ФЗ — контролируется инфрой.

### 🧪 Короткий чеклист доводки Parts
- [ ] Организационно: дополнить ADR/README по требованиям companyId для superadmin на листингах.
- [ ] Нагрузочное: ревизия троттлинга при больших bulk‑операциях (в проде).
- [ ] Мониторинг: дашборд по ошибкам идемпотентности (409) и времени bulk‑операций.

---

## 🧩 Inventory/Stock‑Movements — детальное состояние (Tech‑Hardened, Completed)

### 🟡 Юридическая база (light)
- 402‑ФЗ: историчность соблюдена — reverse вместо удаления; публичного hard‑delete нет.
- 152‑ФЗ: ПДн не обрабатываются; минимизация отображаемых данных и маскирование в аудите.
- 242‑ФЗ: локализация данных — на уровне инфры (RU).

### 🧪 Короткий чеклист доводки Stock‑Movements
- [ ] DB‑checks: quantity integer; price/totalAmount ≥ 0; индексы companyId/partId/createdAt; expression‑индексы для ILIKE при нагрузке.
- [ ] Транзакционность: при необходимости усилить Redis‑lock DB‑блокировкой.
- [ ] E2E:
  - Superadmin‑правило (листинг/аналитика) — 400 без ?companyId.
  - Идемпотентность: повтор → 200 (cached); гонка → 409.
  - Конкурентный расход — не приводит к отрицательным остаткам (ALLOW_NEGATIVE_STOCK=false).
  - XSS‑санитизация notes/documentNumber.
- [ ] Документация: ADR по идемпотентности/блокировкам; barcode=partNumber до ввода отдельного поля.

---

## 🧩 Inventory/Alerts — детальное состояние (Tech‑Hardened, Core Completed)

### 🟡 Юридическая база (light)
- 402‑ФЗ: историчность соблюдена — только dismiss/auto‑dismiss; публичного hard delete нет.
- 152‑ФЗ: ПДн не обрабатываются; минимизация/маскирование в аудите.
- 242‑ФЗ: локализация данных — на уровне инфры (RU).

### 🧪 Короткий чеклист доводки Alerts
- [ ] Scheduler: INVENTORY_ALERTS_CRON + Redis‑lock per company; авто‑dismiss по настройкам.
- [ ] Notifications: интеграция с email/push провайдером; dedup; rate‑limit.
- [ ] E2E: superadmin‑правило (листинг/аналитика/critical), идемпотентность test/batch, XSS в DTO.
- [ ] Документация: ADR по идемпотентности alerts; регламент рассылок/SLA.

---

## 🧩 Inventory/Suppliers — детальное состояние (Tech Near‑Ready, Legal light pending)

### 🟡 Юридическая база (light)
- 152‑ФЗ: контактные ПДн контрагентов — минимизация/маскирование реализованы. Pending: обновить правовые документы (основания, сроки хранения, порядок обращений); опционально SUPPLIER_DATA_RETENTION_YEARS + cron анонимизации.
- 402‑ФЗ: публичный hard delete отсутствует; применяется деактивация; ведётся аудит.
- 242‑ФЗ: локализация данных — на уровне инфраструктуры (RU).

### 🧪 Короткий чеклист доводки Suppliers
- [ ] CompanyOwnershipGuard: кейс 'supplier' → SuppliersValidationService.validateSupplierOwnership.
- [ ] E2E/интеграция: superadmin‑правило (листинг/аналитика без ?companyId → 400); идемпотентность rate/bulk; XSS‑санитизация DTO.
- [ ] Документы/152‑ФЗ: обновить Policy/процедуры; регламенты хранения/анонимизации.
- [ ] Аналитика: при отсутствии таблицы supplier_ratings — убрать зависимость или добавить миграцию.

---

## 👥 Customers — детальное состояние (Tech COMPLETED, Legal light pending)

### 🟡 Юридическая база (Pending light)
- 152‑ФЗ: базовый набор реализован. Требуется: обновление Политики ПДн, регламентов хранения/анонимизации, SLA по обращениям; публичные процедуры (формы/контакты).
- 242‑ФЗ: соблюдается на уровне инфраструктуры; контролировать сторонние сервисы.

### 🧪 Короткий чеклист доводки Customers
- [x] GET /customers/:id/export
- [x] POST /customers/:id/consent/revoke
- [x] DELETE /customers/:id/anonymize
- [x] Cron‑анонимизация по сроку хранения
- [x] no-store для экспорта — включено глобально для API
- [ ] E2E: PII‑маскирование по ролям; ownership; идемпотентность анонимизации
- [ ] Документация/правовые регламенты (152‑ФЗ)

---

## 🧾 Orders — детальное состояние (Tech‑Hardened, Legal Pending)

### 🔧 Ограничения и текущая конфигурация
- maxOrders: null/undefined/−1 → безлимит; при отсутствии активной подписки — запрет создания.
- Нет лимитов на кол-во позиций в тарифе — внутренние лимиты: MAX_PARTS_PER_ORDER=100; MAX_SERVICES_PER_ORDER=50.
- SuperAdmin мульти‑компанийная аналитика — off (нужен явный companyId).
- Автопересчёт totals — вручную (/orders/:id/recalculate).
- Ограничения отмены при оплатах — включатся после финализации связей с Payments/Invoices.

### 🟡 Юридическая база (Pending)
- 152‑ФЗ: актуализировать retention/локализацию (ORDER_DATA_RETENTION_YEARS), регламент хранения.
- 402‑ФЗ/54‑ФЗ: запрет отмены при оплатах; фискальные события через Payments/ККТ.

### 🧪 Короткий чеклист доводки
- [ ] Env/Config: ORDER_DATA_RETENTION_YEARS, SANITIZE_NOTES_ENABLED.
- [ ] DB Check‑constraints: price ≥ 0; quantity ≥ 1; discountPercent ∈ [0;100].
- [ ] E2E: статусы/услуги, назначение механика, склады, пересчёт totals, RBAC.
- [ ] Payments/Invoices: запрет отмены при оплаченных платежах/счетах; опциональный авто‑инвойс.
- [ ] Автопересчёт totals по событийной модели.

---

## 🧩 Vehicles — детальное состояние (Tech‑Hardened, Completed Tech)

### 🟡 Юридическая база (light)
- 152‑ФЗ:
  - Реализовано: минимизация ПДн по ролям; маскирование ПДн в аудите; no‑store на PII‑ответах (теперь — и глобально для API).
  - Требуется: орг‑регламенты (основание и сроки хранения данных об авто, порядок обращений субъектов). Опционально — VEHICLE_DATA_RETENTION_YEARS + cron‑анонимизация (если политика требует).
- 242‑ФЗ: соблюдается на уровне инфраструктуры (локализация БД/бэкапов в РФ).
- 402‑ФЗ/54‑ФЗ/161‑ФЗ/PCI: неприменимо.

### 🧪 Короткий чеклист доводки Vehicles
- [ ] E2E/интеграция:
  - Superadmin‑policy: без ?companyId → 400 на листингах/статистике.
  - Role‑based маскирование в списках и деталях (mechanic/diagnostic).
  - XSS‑санитизация notes; нормализация vin/номер.
- [ ] Организационно (152‑ФЗ): регламент хранения/удаления; журнал обращений субъектов; SLA.

---

## 🧩 Vehicles‑Catalogue — детальное состояние (Tech‑Hardened, COMPLETED)

### 🟡 Юридическая база (light)
- 152‑ФЗ/242‑ФЗ: ПДн не обрабатываются (N/A). Санитизация свободных текстов включена. 
- 1119‑ПП/ФСТЭК (организационно): аудит админских изменений включён (CATALOGUE_*).

### 🧪 Короткий чеклист дальнейшей доводки Vehicles‑Catalogue
- [ ] Перфоманс: заменить leftJoinAndSelect моделей в листинге брендов на COUNT (relation count без загрузки коллекций).
- [ ] Кэш: применить @AllowCache для:
  - [ ] GET /brands (TTL ≥ 3600s),
  - [ ] GET /models?brandId,
  - [ ] GET /types.
  - Для продвинутого кэша: Redis/HTTP‑кэш + ETag с инвалидацией при изменениях (см. docs/cache-policy.md).
- [ ] Документация: ADR по глобальным словарям и платформенным правам (write только платформенные роли).

---

## Services — детальное состояние (Tech Near‑Ready)

🟡 Юридическая база (light)
- 152‑ФЗ/242‑ФЗ: ПДн напрямую не обрабатываются; свободные тексты (name/description) могут потенциально включать ПДн — требуется санитизация (см. TODO).
- 1119‑ПП/ФСТЭК: аудит админских операций обязателен — события добавлены в AuditAction, требуется внедрение вызовов.
- 402‑ФЗ: запрет удаления справочников, влияющих на первичку — требуется доработка политики удаления/деактивации (см. TODO).

🧪 Короткий чеклист доводки Services
- [ ] Audit: события SERVICE_* уже в AuditAction; требуется вызывать AuditService во всех операциях (LISTED/VIEWED/CREATED/UPDATED/STATUS_CHANGED/DELETED/BULK_UPDATED/SEARCHED/STATS_VIEWED) с маскированием метаданных.
- [ ] Throttling: расставить @Throttle — GET → 'read'; POST/PATCH/DELETE → 'write'; search → 'read'.
- [ ] Sanitize/XSS: опциональная санитизация name/description (SANITIZE_SERVICE_TEXTS) + trim/collapse в DTO.
- [ ] Config/ENV: ввести servicesConfig и Joi‑валидацию (SERVICES_DEFAULT_PAGE_SIZE, SERVICES_MAX_PAGE_SIZE, SERVICES_MAX_DURATION_MINUTES, SERVICES_MAX_SERVICE_PRICE, SERVICES_SEARCH_LIMIT, SANITIZE_SERVICE_TEXTS, SERVICES_IDEMPOTENCY_TTL_MS).
- [ ] Идемпотентность: X‑Idempotency‑Key для bulk‑update (Redis NX + TTL, кэш результата, гонка → 409).
- [ ] БД/миграции: индексы (companyId, companyId+isActive, companyId+categoryId, createdAt), CHECK (price ≥0; durationMinutes >0), timestamptz дат; уникальность (companyId, LOWER(name)) — если бизнес‑правило требует; политика удаления (soft‑delete/запрет при ссылках на order_services).
- [ ] Поиск: ограничить результаты (SERVICES_SEARCH_LIMIT) и добавить rate‑limit.
- [ ] E2E: RBAC/ownership, сортировки (whitelist), фильтры, статус/удаление, поиск (≥2 символов), bulk (идемпотентность).

---

Services/Categories — детальное состояние (Tech Near‑Ready)

🟡 Юридическая база (light)
- ПДн не обрабатываются; sanitize свободных текстов рекомендован.

🧪 Короткий чеклист доводки Categories
- [ ] Audit: SERVICE_CATEGORY_* уже в AuditAction; требуется вызовы (LISTED/VIEWED/CREATED/UPDATED/DELETED/STATS_VIEWED/SEARCHED/INITIALIZED_GLOBAL).
- [ ] Throttling: расставить @Throttle — GET → 'read'; POST/PATCH/DELETE → 'write'.
- [ ] Sanitize/XSS: SANITIZE_CATEGORY_TEXTS + sanitize‑html/trim в DTO.
- [ ] Config/ENV: categoriesConfig (pagination.max, sanitize flag).
- [ ] Идемпотентность initialize‑global: upsert/ON CONFLICT DO NOTHING.
- [ ] БД/миграции: timestamptz дат, индексы (companyId, createdAt), уникальность (companyId, LOWER(name)) c учётом глобальных (companyId IS NULL).
- [ ] E2E: глобальные категории read‑only; удаление запрещено при связях с services.

---

## 🧩 Service‑History — детальное состояние (Tech Near‑Ready)

🟡 Юридическая база (light)
- 152‑ФЗ: косвенно затрагиваются ПДн (customerName в связанных данных, свободные тексты).
  - Реализовано: санитизация текстов, маскирование VIN/номера, строгая ownership‑проверка, аудит, глобальный no‑store.
  - Требуется: регламенты хранения (опционально dataRetentionUntil + cron анонимизации).

🧪 Короткий чеклист доводки Service‑History
- [ ] Транзакционность: объединить create/update/softDelete истории и обновление vehicle в одну транзакцию (manager.transaction).
- [ ] Перфоманс: облегчённый листинг без тяжёлых relations; лимит на текстовый поиск (SERVICE_HISTORY_SEARCH_LIMIT).
- [ ] Аналитика: заменить заглушку averageServiceInterval на реальный расчёт (по разнице дат); метрики по overdue/upcoming.
- [ ] E2E/интеграция: superadmin‑policy (?companyId), ownership, XSS‑санитизация, сортировки/пагинация, аудит.

---

## 🧾 Tariffs — детальное состояние (Tech‑Hardened, Completed Tech)

### 🟡 Юридическая база (light)
- 152‑ФЗ/242‑ФЗ: ПДн не обрабатываются (N/A).
- Безопасность: минимизация XSS через санитизацию текстов; строгие RBAC; аудит read/write операций без утечки ПДн.

### ⚠️ Важные совместимые изменения
- Цены в API и БД — в рублях (decimal), не в копейках. Все примеры и фильтры скорректированы. Интеграции, ожидающие «копейки», нужно синхронизировать.

### 🧪 Короткий чеклист доводки Tariffs
- [ ] Кэш: применить @AllowCache для GET:
  - [ ] /tariffs, [ ] /tariffs/active, [ ] /tariffs/popular, [ ] /tariffs/compare (TTL ≥ 600–3600s).
- [ ] Redis‑кэш (опционально) для findAll/active + инвалидация.
- [ ] Идемпотентность create (X‑Idempotency‑Key) — по аналогии с inventory.
- [ ] Блок удаления при активных подписках — включить реальную проверку после интеграции с Subscriptions.
- [ ] E2E/интеграция: RBAC платформенных ролей, нормализация query, фильтры цен в рублях, аудит read/write.

---

## 🧩 Companies — детальное состояние (COMPLETED)

Технически: ✅ ГОТОВО  
Юридически: ✅ 152‑ФЗ ГОТОВО  
Статус: 🟢 COMPLETED

Следующие пункты:
- [x] Multi-tenant isolation — РЕАЛИЗОВАНО
- [x] XSS/SQL injection protection — РЕАЛИЗОВАНО  
- [x] RBAC с проверкой прав — РЕАЛИЗОВАНО
- [x] 152‑ФЗ поля и процедуры — РЕАЛИЗОВАНО
- [x] Audit с маскированием ПДн — РЕАЛИЗОВАНО
- [x] Entity constraints и индексы — РЕАЛИЗОВАНО
- [x] Транзакционная безопасность — РЕАЛИЗОВАНО
- [x] Performance optimization — РЕАЛИЗОВАНО

---

## 🔧 Core — сводка статуса

- CORS (no Origin): [x] DONE
- X‑Request‑ID: [x] DONE
- Cache‑Control по умолчанию (no‑store): [x] DONE; выборочное кеширование через @AllowCache: [x] инфраструктура есть, [-] применить к эндпоинтам
- Throttling профили ('global','auth','read','write'): [x] DONE; [-] расставить @Throttle по контроллерам
- TypeORM logging: [x] урезание/slow threshold; [-] masking при включении DB_LOG_QUERIES=true
- Webhooks: [-] профиль rate‑limit (например, 'webhook') + подпись/ACL IP

---

## 🚀 Очередь модулей

1) Core (Wave 2 — применение)
- Проставить @AllowCache на vehicles‑catalogue/tariffs публичных GET (+ опционально ETag/Redis).
- Расставить @Throttle('auth'|'read'|'write') в Auth/Services/Categories (и при необходимости в публичных листингах других модулей).
- Типовой TypeORM Logger с маскированием параметров (включается при DB_LOG_QUERIES=true).
- Вебхуки: профиль throttling 'webhook' + проверка подписи/ACL IP.

2) Work‑Schedules
- Доменный аудит (create/update/delete/view/list; exceptions create/status/delete с маскированием reason).
- Ретеншн/анонимизация исключений; Redis‑lock; E2E.

3) Appointments
- Аудит событий; EXCLUDE constraint (tstzrange+mechanic_id) для пересечений активных статусов; ретеншн/анонимизация; оптимизация smartSchedule.

4) Services/Categories
- Внедрить вызовы AuditService; throttling; sanitize; идемпотентность; индексы/уникальность; конфиги/валидатор ENV.

5) Customers
- E2E: PII‑маскирование по ролям; ownership; идемпотентность анонимизации; проверить no‑store экспорта.

6) Inventory/Orders
- Завершить E2E по резервам, авто‑expire, superadmin‑правилу; интеграция Payments/Invoices (блок отмены оплаченных).

---

🔐 Топ-уровень доступа (DriveCare Platform)

Роль | Описание
--- | ---
SuperAdmin | Ты как создатель проекта, полный контроль над всеми компаниями, пользователями, подписками, логами, конфигурацией и монетизацией.
PlatformAdmin | Тех. поддержка уровня платформы: может просматривать данные любой компании (в режиме read-only или ограниченного write), администрировать роли, тарификации, помогать с регистрацией.
Auditor (опционально) | Только просмотр данных и логов (без права редактирования) — удобно при привлечении сторонней проверки или аудитора.

⸻

🏢 Уровень компании (Multi-tenant)

👑 Владельцы и управляющие

Роль | Описание
--- | ---
CompanyOwner | Основатель или генеральный директор автосервиса. Имеет право редактировать профиль компании, подписку, управлять пользователями, назначать админов.
CompanyAdmin | Управляющий или директор филиала. Почти полный доступ, кроме удаления компании, смены тарифа и некоторых критичных операций.

🧑‍💼 Операционные роли

Роль | Описание
--- | ---
Manager | Менеджер по работе с клиентами. Может создавать/изменять заказы, видеть клиентов, управлять расписанием, но не имеет доступа к финансам или складу.
Cashier | Кассир или бухгалтер: работа со счетами, платежами, генерацией документов, но без доступа к складу и заказам.
InventoryManager | Складской специалист: управление запасами, движение товара, поступление и списание запчастей.
ServiceAdvisor | Приемщик. Ведёт записи на обслуживание, связывает клиентов с заказами, взаимодействует с механиками.

🔧 Технические роли

Роль | Описание
--- | ---
Mechanic | Мастер. Видит только свои заказы или назначения, может менять статус работы, добавлять комментарии.
LeadMechanic | Старший мастер. Контролирует других механиков, может перераспределять заказы, контролировать завершение работ.
Diagnostic | Диагност-специалист: отдельная роль, если диагностика отделена от основного ремонта.

⸻

🛠️ Технические роли (только у платформы)

Роль | Описание
--- | ---
SupportEngineer | Сотрудник техподдержки. Имеет временный доступ к данным компании (по запросу), может смотреть ошибки, помогать в решении проблем.
SystemOperator | Внутренняя роль (для тебя): может деплоить новые версии, менять переменные окружения, запускать миграции и прочее.
DevOps / Maintainer | Для будущей команды — управляет инфраструктурой, логами, доступом к базе и CI/CD.

⸻

🔒 Резюме в виде дерева

SuperAdmin  
├── PlatformAdmin  
│   ├── SupportEngineer  
│   └── Auditor  
├── SystemOperator  
└── Companies  
    └── CompanyOwner  
        ├── CompanyAdmin  
        │   ├── Manager  
        │   ├── Cashier  
        │   ├── InventoryManager  
        │   ├── ServiceAdvisor  
        │   └── LeadMechanic  
        │       └── Mechanic  
        └── Diagnostic
