# 📋 DRIVECARE V2 — SECURITY & COMPLIANCE AUDIT TRACKER (RESET)

Дата создания: 06.08.2025  
Последнее обновление: 25.08.2025  
Статус: 🔄 ONGOING SECURITY AUDIT (ре-аудит с учётом ФЗ РФ)  
Методология: Enterprise Security Review + РФ-комплаенс (152‑ФЗ, 242‑ФЗ, 1119‑ПП, Приказ ФСТЭК №21)

---

## ✅ Что сделано (Core · Wave 1)

- CORS: разрешён трафик без Origin во всех средах (health/webhooks/server‑to‑server не блокируются).
- X‑Request‑ID: корреляция запросов; заголовок X‑Request‑ID на всех ответах.
- Cache-Control: по умолчанию для API — строгий no-store/no-cache (минимизация риска кэширования ПДн).
- Аудит:
  - Расширен пул AuditAction: добавлены SERVICE_*, SERVICE_CATEGORY_*, API_REQUEST_STARTED/API_REQUEST_COMPLETED.
  - Глобальный AuditLoggingInterceptor пишет безопасные события (без ПДн/секретов), логирует безопасные X‑заголовки.
- Управление аудитом: AuditService уважает AUDIT_LOG_TO_DB; в prod AUDIT_CHAIN_KEY обязателен только если включена запись в БД.
- ENV: в .env.example добавлен AUDIT_LOG_TO_DB; X‑Idempotency‑Key разрешён в CORS заголовках.

Примечание: глобальный no-store конфликтует с публичным кэшированием (Vehicles‑Catalogue и т.п.). В Wave 2 добавлены декораторы CachePolicy/@AllowCache для точечного разрешения кэша.

---

## ✅ Что сделано (Core · Wave 2)

- Кэш‑политика: добавлены декораторы CachePolicy/@AllowCache/@NoStore и поддержка в SecurityHeadersInterceptor (выборочное кэширование публичных GET).
- Throttling: подтверждена версия @nestjs/throttler (^6.4.0); в AppModule подключены профили 'global'/'auth'/'read'/'write'. Документация: docs/throttling.md.
- TypeORM logging: по умолчанию без 'query'; включение через ENV DB_LOG_QUERIES=true. Порог «медленных» запросов DB_SLOW_QUERY_THRESHOLD_MS. Документация по CachePolicy: docs/cache-policy.md.

Что осталось применить (точечно по модулям)
- Проставить @AllowCache на безопасные публичные GET:
  - vehicles-catalogue: GET /brands, /models?brandId, /types (TTL ≥ 3600s).
  - tariffs: GET /tariffs, /tariffs/active, /tariffs/popular, /tariffs/compare.
  - при необходимости — другие «селекты» без ПДн (например, /invoices/select/options).
- Расставить @Throttle:
  - auth: login/register/refresh → 'auth'; logout*/sessions → 'write'; списки → 'read'.
  - services/categories: GET → 'read'; POST/PATCH/DELETE → 'write'; search → 'read'.
  - webhooks: отдельный профиль 'webhook' (или временно 'write') + верификация подписи/ACL.
- TypeORM masking (при включении query‑логов): кастомный Logger с маскированием чувствительных параметров (tokens/emails/phones/PAN).

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
| 7 | payment-methods | ✅ Tech‑hardened (encrypt cfg, RBAC, DTO, indices, checks) | 🟡 PCI/договоры/ретеншн — Pending | 🟡 Высокий | 🟢 Near‑Ready (Tech) |
| 8 | customers | ✅ Tech‑hardened (PII masking, consents, retention, ownership, subject‑rights, anonymization cron) | 🟢 Базовый 152‑ФЗ реализован; нужны орг‑документы | 🟡 Высокий | 🟢 COMPLETED (Tech) · ⏳ Pending (Legal Docs) |
| 9 | orders | ✅ Tech‑hardened (multi‑tenant, RBAC, XSS, audit, inventory, limits) | 🟡 152‑ФЗ частично; 402‑ФЗ/54‑ФЗ — через связки | 🔴 Критический | 🟢 Near‑Ready (Tech) |
| 10 | inventory | ✅ Tech‑hardened (ownership, RBAC, XSS DTO, SQL‑фильтры, role‑costs, идемпотентные резервы + авто‑expire, 402‑ФЗ запрет удаления) | 🟡 Pending (орг‑регламенты) | 🟡 Высокий | 🟢 Near‑Ready (Tech) |
| 11 | inventory/parts | ✅ Tech‑Hardened | 🟢 402‑ФЗ соблюдено; 152‑ФЗ N/A | 🟡 Высокий | 🟢 COMPLETED (Tech) |
| 12 | inventory/stock-movements | ✅ Tech‑Hardened | 🟢 402‑ФЗ соблюдено; 152‑ФЗ N/A | 🟡 Высокий | 🟢 COMPLETED (Tech) |
| 13 | inventory/suppliers | ✅ Tech‑Hardened | 🟡 152‑ФЗ light pending | 🟡 Высокий | 🟢 Near‑Ready (Tech) |
| 14 | inventory/alerts | ✅ Tech‑Hardened | 🟢 402‑ФЗ соблюдено; 152‑ФЗ N/A | 🟡 Высокий | 🟢 Near‑Ready (Tech) |
| 15 | appointments | 🟢 Near‑Ready (Tech) | 🟡 Pending | 🟢 Средний | 🟢 Near‑Ready (Tech) |
| 16 | work-schedules | 🟢 Tech улучшен (аудит/ретеншн‑поля/анонимизация) | 🟡 Pending (light) | 🟢 Средний | 🟢 Near‑Ready (Tech) |
| 17 | vehicles | ✅ Tech‑Hardened | 🟡 152‑ФЗ light pending | 🟢 Средний | 🟢 COMPLETED (Tech) |
| 18 | vehicles-catalogue | ✅ Tech‑Hardened | 🟢 N/A | 🟢 Средний | 🟢 COMPLETED (Tech) |
| 19 | services | 🟢 Near‑Ready (Tech) | 🟢 N/A | 🟢 Средний | 🟢 Near‑Ready (Tech) |
| 20 | services/categories | 🟢 Near‑Ready (Tech) | 🟢 N/A | 🟢 Средний | 🟢 Near‑Ready (Tech) |
| 21 | service-history | 🟢 Near‑Ready (Tech) | 🟡 152‑ФЗ light pending | 🟢 Средний | 🟢 Near‑Ready (Tech) |
| 22 | tariffs | ✅ Tech‑Hardened | 🟢 N/A | 🟢 Низкий | 🟢 COMPLETED (Tech) |

---

## 🧩 Work‑Schedules — детальное состояние (Tech Near‑Ready, обновлено)

Что внедрено (факт)
- Доменный аудит:
  - Расписания: WORK_SCHEDULE_CREATED/UPDATED/DELETED/VIEWED/SCHEDULES_LISTED — вызываются.
  - Исключения: помимо SCHEDULE_EXCEPTION_CREATED добавлены STATUS_CHANGED и DELETED (логируется факт анонимизации, без reason).
- Ретеншн/анонимизация исключений:
  - schedule_exceptions: добавлены поля dataRetentionUntil, anonymizedAt, anonymizedBy, piiAnonymized; индекс по (companyId, dataRetentionUntil).
  - На createException рассчитывается dataRetentionUntil (endDate + WORK_SCHEDULE_EXCEPTIONS_RETENTION_YEARS).
  - deleteException: физического удаления нет — анонимизация полей (reason/rejectionReason=null, piiAnonymized=true).
  - Cron‑анонимизация: реализован планировщик WorkSchedulesRetentionScheduler (ScheduleModule), с Redis‑lock per company; вызывает anonymizeExpiredExceptions. CRON берётся из WORK_SCHEDULE_EXCEPTIONS_ANON_CRON (дефолт 0 4 * * *).
- Изоляция multi‑tenant: userBelongsToCompany исправлен (использует корректные поля User).
- Уникальность create расписаний: DB‑ошибка 23505/uq mapped → 409 WorkScheduleConflictException.
- Role‑based маскирование reason в ответах: встроено в mapper (админские роли видят тексты, механик — только свои, piiAnonymized всегда скрыто).
- Throttling в Work‑Schedules: применены inline лимиты @Throttle({ default: ... }) (единые профили по проекту — готовы, но в этом модуле пока не используются из-за несовместимости сигнатуры декоратора).

Что осталось
- Привести throttling к единому стилю профилей ('read'/'write') по проекту (с учётом версии @nestjs/throttler).
- (Опционально) публичные эндпоинты для смены статуса/удаления исключений в контроллере (сервис готов).
- E2E: RBAC/ownership, partial day, перерывы/длительности, сортировки/пагинация, отсутствие reason в аудите, 409‑конфликт, сценарии Cron‑анонимизации.

Юридическая база (light)
- 152‑ФЗ:
  - Сделано: минимизация (reason не попадает в аудит), сроки хранения/анонимизация — реализованы (поля + Cron + Redis‑lock), ответ API — role‑based маски.
  - Осталось: актуализировать орг‑регламенты (сроки/процедуры), SLA по обращениям.
- 242‑ФЗ: локализация на уровне инфры.
- 402‑ФЗ/54‑ФЗ/161‑ФЗ/PCI: неприменимо.

Короткий чеклист Work‑Schedules
- [x] AuditService: расписания (CRUD/View/List) и исключения (create/status/delete), без reason.
- [x] Superadmin‑policy (листинг): ?companyId обязателен; механикам — только свои.
- [x] no‑store глобально (API).
- [x] Ретеншн/анонимизация: поля, расчёт на create, delete=анонимизация, Cron + Redis‑lock.
- [x] DB‑индексы: добавлен индекс под ретеншн‑выборки.
- [ ] E2E: сценарии изоляции/конфликтов/маскирования/cron.

---

## 🧩 Appointments — детальное состояние (Tech Near‑Ready)

Юридическая база (light)
- 152‑ФЗ: минимизация ПДн по ролям (mapper), поля ретеншн/анонимизации в сущности есть.

Что осталось
- Ретеншн/анонимизация: Cron + Redis‑lock (по аналогии с Customers).
- Аудит событий: APPOINTMENT_* (create/update/status/reschedule/addRating/view/tracking).
- DB‑защита пересечений: EXCLUDE (tstzrange + mechanic_id) для активных статусов.
- Перфоманс: оптимизация smartSchedule/checkAvailability.
- E2E: статусы/перенос/отмена/рейтинг (COMPLETED‑only), PII‑маскирование по ролям.

---

## 🧩 Inventory — детальное состояние (Tech Near‑Ready)

Юридическая база (light)
- 152‑ФЗ: ПДн нет; минимизация отображения по ролям.
- 402‑ФЗ: историчность соблюдается; корректирующие операции и аудит.
- 242‑ФЗ: локализация — на уровне инфры.

Чеклист
- [ ] DB checks/индексы (quantity/minQuantity/цены/unique).
- [ ] E2E: RBAC/ownership, идемпотентность резервов, авто‑expire, low‑stock alerts.
- [ ] Регламенты (орг): SOP корректировок; доступ к себестоимости.

---

## 🧩 Inventory/Parts — состояние (Tech‑Hardened, Completed)
- 402‑ФЗ: soft‑delete, аудит.
- 152‑ФЗ: N/A. 242‑ФЗ — инфра.

---

## 🧩 Inventory/Stock‑Movements — состояние (Tech‑Hardened, Completed)
- 402‑ФЗ: reverse вместо удаления.
- 152‑ФЗ: N/A; минимизация в аудите.
- 242‑ФЗ: инфра.
- Чеклист: индексы/checks, конкуренция/блокировки, идемпотентность, XSS‑санитизация, ADR — в работе по E2E/докам.

---

## 🧩 Inventory/Alerts — состояние (Tech‑Hardened, Core Completed)
- 402‑ФЗ: только dismiss/auto‑dismiss.
- 152‑ФЗ: N/A; минимизация/маскирование в аудите.
- 242‑ФЗ: инфра.
- Чеклист: Scheduler + Redis‑lock, уведомления, E2E, ADR рассылок — в работе.

---

## 🧩 Inventory/Suppliers — состояние (Tech Near‑Ready, Legal light pending)
- 152‑ФЗ: базовая минимизация/маскирование выполнены; нужны документы (основания/сроки/SLA).
- 402‑ФЗ: deactivation вместо hard‑delete; аудит.
- 242‑ФЗ: инфра.
- Чеклист: ownership‑guard, E2E superadmin‑правило, идемпотентность rate/bulk, XSS‑DTO, обновить доки.

---

## 👥 Customers — состояние (Tech COMPLETED, Legal light pending)
- 152‑ФЗ: реализовано; нужны обновлённые документы (политика/процедуры/SLA).
- 242‑ФЗ: инфра.
- Чеклист:
  - [x] Экспорт/отзыв согласия/анонимизация/cron.
  - [x] no‑store глобально.
  - [ ] E2E: PII‑маскирование по ролям; ownership; идемпотентность анонимизации.
  - [ ] Обновить правовые регламенты.

---

## 🧾 Orders — состояние (Tech‑Hardened, Legal Pending)
- Конфигурация: лимиты в коде; пересчёт totals вручную; аналитика супер‑админа — только с ?companyId.
- Юридически: 152‑ФЗ retention уточнить; 402‑ФЗ/54‑ФЗ — блок отмены при оплатах через Payments/ККТ.
- Чеклист: ENV/Config, DB‑checks, E2E, интеграция с Payments/Invoices, событийный пересчёт totals.

---

## 🧩 Vehicles — состояние (Tech‑Hardened, Completed Tech)
- 152‑ФЗ: минимизация по ролям; маскирование в аудите; no‑store (глобально).
- Осталось: орг‑регламенты (основания/сроки/SLA), опциональная ретеншн‑анонимизация.
- Чеклист: E2E superadmin‑policy, роль‑маскирование, XSS‑санитизация notes, нормализация vin/номер.

---

## 🧩 Vehicles‑Catalogue — состояние (Tech‑Hardened, COMPLETED)
- 152‑ФЗ/242‑ФЗ: N/A; санитизация включена.
- 1119‑ПП: аудит админских изменений (CATALOGUE_*) включён.
- Чеклист: COUNT вместо лишних joins, @AllowCache + ETag/Redis, ADR по словарям/правам.

---

## Services — состояние (Tech Near‑Ready)
- 152‑ФЗ/242‑ФЗ: ПДн напрямую нет; sanitize свободных текстов нужен по флагу.
- 1119‑ПП: события SERVICE_* уже есть; нужно внедрить вызовы.
- 402‑ФЗ: политика удаления/деактивации — доработать.
- Чеклист: аудит, throttling, sanitize, идемпотентность bulk, индексы/уникальность, ENV/валидация, поиск‑лимиты, E2E.

---

## Services/Categories — состояние (Tech Near‑Ready)
- 152‑ФЗ: N/A; sanitize текстов рекомендован.
- Чеклист: аудит SERVICE_CATEGORY_*, throttling, sanitize‑html, ENV, идемпотентность initialize‑global, индексы/уникальность, E2E.

---

## 🧩 Service‑History — состояние (Tech Near‑Ready)
- 152‑ФЗ: косвенно ПДн; санитизация/маскирование сделаны; аудит включён; no‑store глобально.
- Чеклист: транзакционность, облегчённый листинг, лимит поиска, реальные метрики, E2E.

---

## 🧾 Tariffs — состояние (Tech‑Hardened, Completed Tech)
- 152‑ФЗ/242‑ФЗ: N/A.
- Важно: цены в рублях (decimal) — интеграции синхронизировать.
- Чеклист: @AllowCache на публичных GET, Redis‑кэш (опц.), идемпотентность create, блок удаления при активных подписках, E2E.

---

## 🧩 Companies — состояние (COMPLETED)
- Технически: ✅ ГОТОВО
- Юридически: ✅ 152‑ФЗ ГОТОВО

---

## 🔧 Core — сводка статуса

- CORS (no Origin): [x] DONE
- X‑Request‑ID: [x] DONE
- Cache‑Control (no‑store по умолчанию): [x] DONE; @AllowCache инфраструктура: [x] DONE; применение по модулям: [ ] TODO
- Throttling профили 'global'/'auth'/'read'/'write': [x] DONE; расстановка по контроллерам: [ ] TODO
- TypeORM logging: [x] урезание/slow threshold; masking при DB_LOG_QUERIES=true: [ ] TODO
- Webhooks: профиль throttling 'webhook' + подпись/ACL IP: [ ] TODO
- Work‑Schedules конфиг/валидация ENV (ретеншн/CRON): [x] DONE; .env.example обновить переменные: [ ] TODO

ENV для Work‑Schedules
- WORK_SCHEDULE_EXCEPTIONS_RETENTION_YEARS — [добавлено в конфиг/валидацию]
- WORK_SCHEDULE_EXCEPTIONS_ANON_CRON — [добавлено в конфиг/валидацию]
- Примечание: строки в .env.example пока не добавлены (нужно дописать).

---

## 🚀 Очередь модулей (спринт “доведение”)

1) Core (применение по модулям)
- @AllowCache на vehicles‑catalogue/tariffs публичных GET (+ ETag/Redis — опционально).
- Расстановка @Throttle профилей в Auth/Services/Categories/прочих.
- TypeORM Logger (masking) — при необходимости включать query‑логи.
- Webhooks: профиль 'webhook' + проверка подписи/ACL IP.

2) Work‑Schedules
- E2E: RBAC/ownership, partial/перерывы/границы, сортировки/пагинация, отсутствие reason в аудите, 409 конфликт, Cron‑анонимизация.

3) Appointments
- Cron‑анонимизация; аудит APPOINTMENT_*; EXCLUDE‑constraint; перфоманс; E2E.

4) Services/Categories
- Вызовы AuditService; throttling; sanitize; идемпотентность bulk; индексы/уникальность; ENV/валидация; E2E.

5) Customers
- E2E: PII‑маскирование/ownership/идемпотентность анонимизации; no‑store экспорта — проверка.

6) Inventory/Orders
- E2E: резервы/expire/superadmin‑правило; интеграция Payments/Invoices (запрет отмены оплаченных).

---

🔐 Топ-уровень доступа (DriveCare Platform)

Роль | Описание
--- | ---
SuperAdmin | Полный контроль над всеми компаниями, пользователями, подписками, логами, конфигурацией и монетизацией.
PlatformAdmin | Поддержка уровня платформы: просмотр любой компании (read‑only/ограниченный write), администрирование ролей/тарифов.
Auditor (опц.) | Только просмотр данных и логов (без права редактирования).

🏢 Уровень компании (Multi-tenant)

Роль | Описание
--- | ---
CompanyOwner | Управление профилем компании, подпиской, пользователями.
CompanyAdmin | Управление филиалом; почти полный доступ, кроме критичных операций.

Операционные роли

Роль | Описание
--- | ---
Manager | Работа с клиентами/заказами/расписанием (без финансов и склада).
Cashier | Счета/платежи/документы (без склада и заказов).
InventoryManager | Склад/запасы/движение.
ServiceAdvisor | Записи на обслуживание, связка клиентов и механиков.

Технические роли

Роль | Описание
--- | ---
Mechanic | Видит только свои назначения; меняет статусы; комментарии.
LeadMechanic | Контролирует механиков; перераспределяет задания.
Diagnostic | Отдельная диагностическая роль.

Платформенные тех. роли

Роль | Описание
--- | ---
SupportEngineer | Техподдержка; временный доступ по запросу.
SystemOperator | Деплой/ENV/миграции.
DevOps / Maintainer | Инфраструктура, логи, доступ к БД, CI/CD.

Дерево ролей

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
