<!-- path: docs/SECURITY_COMPLIANCE_AUDIT_TRACKER.md -->
# 📋 DRIVECARE V2 — SECURITY & COMPLIANCE AUDIT TRACKER (RESET)

Дата создания: 06.08.2025  
Последнее обновление: 22.08.2025  
Статус: 🔄 ONGOING SECURITY AUDIT (ре-аудит с учётом ФЗ РФ)  
Методология: Enterprise Security Review + РФ-комплаенс (152‑ФЗ, 242‑ФЗ, 1119‑ПП, Приказ ФСТЭК №21)

---

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
  - RBAC/Ownership: @AuthWithOwnership + @AppointmentResource на ресурсных эндпоинтах; superadmin‑rule — листинги требуют явный companyId.
  - Data‑layer: строгая фильтрация по companyId; безопасный findWithFilters (ILIKE/параметризация), whitelist сортировок, пагинация; findConflicts; агрегированная статистика.
  - Validation: проверка временных слотов/пересечений, рабочие часы/дни, проверка статусов (STATUS_TRANSITIONS), права на перенос/отмену.
  - DTO/XSS: sanitize‑html и лимиты на свободные тексты в Create/Update; строгие MaxLength/Min/Max; нормализация email/phone (E.164).
  - Mapper: role‑based маскирование ПДн (механики/диагносты), корректировка маски госномера (stripLicensePlate), вычисляемые поля и tracking DTO.
  - Entity: enum‑поля статусов/приоритетов; индексы; CHECK‑ограничения (rating, durations, costs); timestamptz; retention/anonymization поля.

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
| 16 | work-schedules | 🟡 Review pending | 🟡 Pending | 🟢 Средний | ⏳ Pending |
| 17 | vehicles | 🟡 Review pending | 🟡 Pending | 🟢 Средний | ⏳ Pending |
| 18 | vehicles-catalogue | 🟡 Review pending | 🟡 Pending | 🟢 Средний | ⏳ Pending |
| 19 | services | 🟡 Review pending | 🟡 Pending | 🟢 Средний | ⏳ Pending |
| 20 | services/categories | 🟡 Review pending | 🟡 Pending | 🟢 Средний | ⏳ Pending |
| 21 | service-history | 🟡 Review pending | 🟡 Pending | 🟢 Средний | ⏳ Pending |
| 22 | tariffs | 🟡 Review pending | 🟡 Pending | 🟢 Низкий | ⏳ Pending |

---

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

### 🟡 Юридическая база (light)
- 152‑ФЗ: минимизация ПДн по ролям (mapper), поля ретеншн/анонимизации в сущности.
- Требуется:
  - Регламент хранения/анонимизации данных записей (APPOINTMENT_DATA_RETENTION_YEARS + scheduler по аналогии с Customers).
  - Интеграция AuditService для событий (create/update/status/reschedule/addRating/view/tracking) с маскированием метаданных.

### 🧪 Короткий чеклист доводки Appointments
- [ ] AuditService: события APPOINTMENT_CREATED/UPDATED/STATUS_CHANGED/CONFIRMED/COMPLETED/CANCELED/RESCHEDULED/RATED/VIEWED/TRACKING_VIEWED.
- [ ] Superadmin‑policy: унифицировать требование companyId для customer/mechanic‑листингов или выводить companyId по сущности.
- [ ] DB‑уровень защиты от пересечений: EXCLUDE constraint (tstzrange + mechanic_id) для активных статусов.
- [ ] Перфоманс: оптимизировать smartSchedule/checkAvailability — батч‑получение занятых интервалов и расчёт свободных слотов в памяти.
- [ ] E2E/интеграционные тесты: RBAC/ownership, статус‑переходы, перенос/отмена в граничных условиях, рейтинг только для COMPLETED, PII‑маскирование по ролям.
- [ ] Ретеншн/анонимизация: добавить CRON + Redis‑lock на анонимизацию по срокам хранения (по аналогии с Customers).

---

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

### ✅ Реализовано (технически)
- RBAC/Ownership/RBAC, sanitize DTO, whitelist сортировок/пагинации, bulk idempotency, audit, индексы/check‑ограничения, timestamptz; 402‑ФЗ запрет hard delete.

### 🟡 Юридическая база (light)
- 402‑ФЗ: историчность (soft‑delete вместо hard delete), аудит изменений.
- 152‑ФЗ: ПДн не обрабатываются (N/A). 242‑ФЗ — контролируется инфрой.

### 🧪 Короткий чеклист доводки Parts
- [ ] ADR/README про требования companyId для superadmin на листингах.
- [ ] Нагрузочная ревизия троттлинга при больших bulk.
- [ ] Мониторинг по ошибкам идемпотентности и времени bulk.

---

## 🧩 Inventory/Stock‑Movements — детальное состояние (Tech‑Hardened, Completed)

[без изменений, см. предыдущую версию — раздел сохранён]

---

## 🧩 Inventory/Alerts — детальное состояние (Tech‑Hardened, Core Completed)

[без изменений, см. предыдущую версию — раздел сохранён]

---

## 🧩 Inventory/Suppliers — детальное состояние (Tech Near‑Ready, Legal light pending)

[без изменений, см. предыдущую версию — раздел сохранён]

---

## 👥 Customers — детальное состояние (Tech COMPLETED, Legal light pending)

[без изменений, см. предыдущую версию — раздел сохранён]

---

## 🧾 Orders — детальное состояние (Tech‑Hardened, Legal Pending)

[без изменений, см. предыдущую версию — раздел сохранён]

---

## 🚀 Очередь модулей (обновлено)

- Затем: Invoices — финализация 402‑ФЗ/54‑ФЗ, запреты по оплатам, интеграция с Orders.
- Далее: Inventory — подмодули и доводка:
  - stock‑movements — ГОТОВО (Tech‑Hardened); финализация E2E/индексы/check‑constraints, опционально DB‑блокировки.
  - suppliers — PII‑маскирование контактных данных, XSS, RBAC, whitelist сортировок/пагинации.
  - inventory‑alerts — E2E (superadmin‑правило, идемпотентность test/batch, XSS в DTO), мониторинг.
- Appointments — финализация: интеграция AuditService, DB EXCLUDE для пересечений, перфоманс smart‑schedule/check‑availability, E2E по RBAC/PII/статусам, ретеншн‑cron.
- Customers — финализация E2E и документации (152‑ФЗ), мониторинг ретеншн‑cron.

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

**Companies модуль готов к production!**

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
