<!-- path: docs/SECURITY_COMPLIANCE_AUDIT_TRACKER.md -->
# 📋 DRIVECARE V2 — SECURITY & COMPLIANCE AUDIT TRACKER (RESET)

Дата создания: 06.08.2025  
Последнее обновление: 26.08.2025  
Статус: 🔄 ONGOING SECURITY AUDIT (ре-аудит с учётом ФЗ РФ)  
Методология: Enterprise Security Review + РФ-комплаенс (152‑ФЗ, 242‑ФЗ, 1119‑ПП, Приказ ФСТЭК №21)

---

## 🎯 Цель MVP/Go‑Live

- Цель: выпустить минимально жизнеспособную версию (MVP) в прод и безопасно принять первых клиентов.
- Ограничения MVP:
  - Принимаем оплату только через PSP (YooKassa/Tinkoff) с фискализацией на стороне провайдера (ENABLE_FISCALIZATION=false). Наличные — временно отключены в проде.
  - Собственная ККТ/ОФД — позже, после подтверждения бизнес‑гипотез.
  - Модули MVP: auth, companies, users, customers, vehicles, work‑schedules, orders, invoices, payments.
- KPI первого запуска:
  - TTFB публичных словарей < 300 мс (с учётом @AllowCache); checkout < 20 сек; доля ошибок платежа < 2% (по PSP).
  - 0 ПДн/секретов в логах (DB_LOG_QUERIES=false); X‑Request‑ID в каждом ответе.
  - Успешный E2E‑сценарий “счёт → оплата PSP → вебхук → счёт PAID → запрет правок первички”.

Принцип ведения проекта
- Ничего не «отрезаем»: все модули остаются в коде и в трекере, двигаются по приоритетам.
- Для MVP ограничиваем включённые сценарии фичами/флагами (например, отключаем CASH в проде), не ломая архитектуру.
- Цепочка развития: P0 = запуск и безопасность платежей → P1 = стабильность и комплаенс‑доводка → P2 = перфоманс/масштабирование.

---

## 🚦 План выхода в прод (спринты/чеклисты)

### 🟢 Sprint P0 (сейчас, 1–2 дня) — критично для Go‑Live

Платежи/чеки (54‑ФЗ через PSP)
- [ ] .env (prod): ENABLE_FISCALIZATION=false; DEFAULT_PAYMENT_PROVIDER=yookassa|tinkoff; заданы ключи PSP (shopId/secret или terminalKey/password).
- [ ] Разрешить только безналичные способы (card/bank). CASH скрыть в UI и запретить бизнес‑валидацией в проде.

Webhooks PSP (161‑ФЗ безопасность)
- [ ] Guard подписи (секрет/ключ провайдера).
- [ ] ACL по IP: WEBHOOK_ALLOWED_IPS из документации PSP.
- [ ] Throttling inline для webhook‑роутов (например, 60/мин).
- [ ] Мини‑идемпотентность: отбрасывать повторный eventId (in‑memory/Redis set с TTL).

“Первичка” (402‑ФЗ)
- [x] Запрет редактирования ключевых полей счета после оплаты/фискализации.
- [ ] Запрет удаления обработанных платежей: проверки на enum PaymentStatus.PROCESSED везде.

Prod‑конфигурация и безопасность
- [x] DB_LOG_QUERIES=false; DB_SLOW_QUERY_THRESHOLD_MS=500..1000 (в .env.production/.env.staging установлено 500; проверить на проде).
- [x] CORS_ORIGINS — только прод‑фронт; TLS; HSTS включается автоматически в prod (helmet в prod, выключено в dev/staging).
- [ ] Обновить секреты JWT/RT/COOKIE, зафиксировать версии (перед реальным продом).

Юридические документы (минимум)
- [ ] Публичная Политика ПДн (версия = PRIVACY_POLICY_VERSION).
- [ ] Договор/оферта с PSP: чеки выбивает провайдер; хранить у себя ID/URL чека.

Смоук‑тесты
- [ ] Регистрация → счёт → оплата PSP → вебхук → платеж PROCESSED → счёт PAID.
- [ ] Попытка редактировать первичку PAID‑счёта — отказ.
- [ ] Refund (частичный/полный) → аудит → корректные статусы.
- [ ] Cache‑контроль: /vehicles‑catalogue/* и /tariffs/* — public, max‑age=3600; остальное — no‑store.

Результат P0: можно принимать первые платежи через PSP; статусы синхронизируются по вебхукам; риски кэша/логов минимизированы.

---

### 🟡 Sprint P1 (сразу после запуска, 1–2 недели) — стабилизация

- Webhooks (надёжность): полная идемпотентность (таблица processed_events), защита от out‑of‑order (updatedAt).
- Masking‑логгер (TypeORM): маска emails/phones/tokens/PAN (при DB_LOG_QUERIES=true).
- Throttling‑обёртка: @ThrottleProfile('auth'|'read'|'write'|'webhook'); убрать inline‑лимиты.
- Tariffs: белый список sortField (валидация в контроллере/DTO).
- Документы: регламенты фискализации/возвратов/корректировок, хранение фискальных реквизитов, SLA чеков.

---

### 🔵 Sprint P2 (после стабилизации) — улучшения и масштабирование

- Кэш/перформанс: ETag/Redis‑кэш для публичных словарей.
- Appointments: EXCLUDE‑constraint; оптимизация smartSchedule/checkAvailability.
- Inventory/Orders: идемпотентность bulk; расширенные алерты; запрет отмены оплаченных заказов; событийный пересчёт totals.
- Наблюдаемость: метрики/трассировки/алерты.

---

## 🧾 Changelog миниспринта (26.08.2025)

Core/Cache/Безопасность (ранее зафиксировано)
- Устранён конфликт кэширования: Pragma/Expires выставляются только при no‑store/no‑cache; при @AllowCache не ставятся и удаляются.
- Выборочное кэширование: @AllowCache (TTL=3600, public) на vehicles‑catalogue и tariffs.

Юридический baseline
- Invoices: добавлен InvoiceFiscalizationStatus (NOT_REQUIRED|PENDING|DONE|FAILED) + поля fiscalizedAt, ofdProvider, ofdReceiptUrl; валидатор блокирует изменения первички после оплаты/фискализации.
- Payments: при переходе платежа в PROCESSED вызывается processPayment(invoiceId, amount, user); безопасные refunds с фискальной заглушкой; аудит; sanitization причин возврата.

Стабилизация
- Приведены типы UserWithCompany (Invoices/Payments); исправлены типы в валидаторе счетов.

Добавлено в Pack P0.1 (Core bootstrap)
- ENV/Config:
  - Добавлены ключи для безопасности вебхуков PSP: WEBHOOK_ALLOWED_IPS, WEBHOOK_IDEMPOTENCY_TTL_SEC (дефолт 300 сек) в .env.example/.env.staging/.env.production; поддержка в validation.schema.ts и configuration.ts.
  - Подготовлены пути вебхуков для разовых оплат (пока без логики): YOOKASSA_PAYMENTS_WEBHOOK_PATH=payments/webhooks/yookassa, TINKOFF_PAYMENTS_WEBHOOK_PATH=payments/webhooks/tinkoff.
  - Зафиксирован DEFAULT_PAYMENT_PROVIDER=yookassa для MVP.
  - В .env.production и .env.staging установлен DB_SLOW_QUERY_THRESHOLD_MS=500 (рекомендация P0).
- CORS/Helmet:
  - Включён HSTS строго в проде; CSP/headers через helmet; запросы без Origin (health/webhooks/server‑to‑server) разрешены.
  - X‑Request‑ID принудительно добавляется в каждый ответ.
- Raw body:
  - Подключён raw‑body для subscription‑billing вебхуков (как было); маршруты для payments‑вебхуков будут добавлены в P0.2.
- Документация/решения:
  - Решение MVP: PSP по умолчанию — YooKassa; на первом запуске включаем только разовые оплаты; подписки/рекуррент — позже (с юристами).
  - 242‑ФЗ: план размещения БД/бэкапов в РФ (VPS в РФ — reg.ru) — подтверждён как целевое.

Риски/наблюдения P0.1
- Вебхуки для разовых оплат (payments/*) ещё не заведены (требуются подпись/ACL/throttle/идемпотентность) — P0.2.
- Запрет удаления платежей со статусом PROCESSED требуется проверить сквозь все эндпоинты — P0.
- В проде перед релизом обязательно сгенерировать и проставить PRIVACY_POLICY_TEXT_HASH, JWT/RT/COOKIE секреты, RT_* (ротация).
- CASH должен быть отключён в проде (UI/валидаторы) — проверить при P0.2.

---

## ✅ Что сделано (Core · Wave 1)

- CORS: трафик без Origin разрешён (health/webhooks/server‑to‑server).
- X‑Request‑ID: корреляция; заголовок в каждом ответе.
- Cache‑Control: no‑store/no‑cache по умолчанию для API.
- Аудит: расширенные AuditAction; безопасный AuditLoggingInterceptor.
- Управление аудитом: AuditService учитывает AUDIT_LOG_TO_DB.
- ENV: добавлен AUDIT_LOG_TO_DB; X‑Idempotency‑Key в CORS заголовках.

Примечание: публичный кэш решаем адресно через CachePolicy/@AllowCache.

---

## ✅ Что сделано (Core · Wave 2)

- Кэш‑политика: CachePolicy/@AllowCache/@NoStore; поддержка в SecurityHeadersInterceptor.
- Заголовки: Pragma/Expires добавляются только при no‑store/no‑cache.
- @AllowCache применён:
  - Vehicles‑Catalogue: GET /brands, /models (с brandId), /types — TTL=3600 (public).
  - Tariffs: GET /tariffs, /tariffs/active, /tariffs/popular, /tariffs/compare — TTL=3600 (public).
- Throttling: профили global/auth/read/write на уровне модуля; в контроллерах — inline до появления обёртки.
- TypeORM logging: по умолчанию без query; slow threshold через ENV.
- Документация: обновлена политика кэширования (docs/cache-policy.md).

Юридический минимальный baseline:
- Invoices (54‑ФЗ/402‑ФЗ): агрегированный фискальный статус; запреты правок первички после оплаты/фискализации.
- Payments (54‑ФЗ/161‑ФЗ): PROCESSED → закрытие счёта; refunds; фискальные заглушки; аудит и sanitization.

---

## ✅ Что сделано (Core · Wave 3 — Pack P0.1)

- ENV ключи для вебхуков PSP: WEBHOOK_ALLOWED_IPS, WEBHOOK_IDEMPOTENCY_TTL_SEC — добавлены в .env.* и провалидированы Joi.
- Подготовлены пути вебхуков разовых оплат: YOOKASSA_PAYMENTS_WEBHOOK_PATH/TINKOFF_PAYMENTS_WEBHOOK_PATH (проводка в P0.2).
- .env.production/.env.staging: DB_SLOW_QUERY_THRESHOLD_MS=500 (рекомендовано 500–1000 мс).
- DEFAULT_PAYMENT_PROVIDER=yookassa для MVP — согласовано и зафиксировано.
- Helmet/CSP/HSTS: включены корректно по окружениям (HSTS только prod).

---

## 📊 MASTER MODULE TABLE (обновлено)

| # | Модуль | Тех. базлайн | Юр. базлайн (ФЗ РФ) | Приоритет | Статус |
|---|--------|--------------|---------------------|-----------|--------|
| 1 | auth | ✅ Tech‑hardened (RT cookie, jti, reuse‑det, 2FA) | 🟡 Документы (политика/ретеншн/ДПА) | 🔴 Критический | ⏳ Pending (Legal) |
| 2 | users | ✅ Tech‑hardened (consents, self‑service, export) | 🟢 В основном готово | 🔴 Критический | 🟢 Near‑Ready |
| 3 | companies | ✅ Tech‑hardened (multi‑tenant, 152‑ФЗ fields, audit, RBAC) | 🟢 152‑ФЗ | 🔴 Критический | 🟢 COMPLETED |
| 4 | payments | ✅ Tech baseline 54‑ФЗ/161‑ФЗ (фиск. поля, связка со счетами, refunds, аудит) | 🟡 54‑ФЗ (ККТ/PCI) pending | 🔴 Критический | 🟢 Near‑Ready (Tech) · ⏳ Pending (Legal/Provider) |
| 5 | invoices | ✅ Tech baseline 54‑ФЗ/402‑ФЗ (фиск. статус, запреты изменений) | 🟡 Документы/регламенты | 🔴 Критический | 🟢 Near‑Ready (Tech) |
| 6 | subscriptions | ✅ Tech‑hardened (лимиты, статусы, idempotency, webhooks) | 🟡 54‑ФЗ/161‑ФЗ финализация | 🟡 Высокий | 🟢 Near‑Ready (Tech) |
| 7 | payment-methods | ✅ Tech‑hardened (encrypt cfg, RBAC, DTO, indices, checks) | 🟡 PCI/договоры/ретеншн | 🟡 Высокий | 🟢 Near‑Ready (Tech) |
| 8 | customers | ✅ Tech‑hardened (PII masking, consents, retention, anonymization cron) | 🟢 152‑ФЗ базово | 🟡 Высокий | 🟢 COMPLETED (Tech) · ⏳ Pending (Legal Docs) |
| 9 | orders | ✅ Tech‑hardened | 🟡 152‑ФЗ частично; 402‑ФЗ/54‑ФЗ через связки | 🔴 Критический | 🟢 Near‑Ready (Tech) |
| 10 | inventory | ✅ Tech‑hardened | 🟡 Орг‑регламенты | 🟡 Высокий | 🟢 Near‑Ready (Tech) |
| 11 | inventory/parts | ✅ Tech‑Hardened | 🟢 402‑ФЗ | 🟡 Высокий | 🟢 COMPLETED (Tech) |
| 12 | inventory/stock‑movements | ✅ Tech‑Hardened | 🟢 402‑ФЗ | 🟡 Высокий | 🟢 COMPLETED (Tech) |
| 13 | inventory/suppliers | ✅ Tech‑Hardened | 🟡 152‑ФЗ light | 🟡 Высокий | 🟢 Near‑Ready (Tech) |
| 14 | inventory/alerts | ✅ Tech‑Hardened | 🟢 402‑ФЗ | 🟡 Высокий | 🟢 Near‑Ready (Tech) |
| 15 | appointments | 🟢 Near‑Ready (Tech) | 🟡 Light pending | 🟢 Средний | 🟢 Near‑Ready (Tech) |
| 16 | work‑schedules | ✅ Tech‑hardened | 🟡 Light pending | 🟢 Средний | 🟢 READY (Tech) |
| 17 | vehicles | ✅ Tech‑Hardened | 🟡 152‑ФЗ light | 🟢 Средний | 🟢 COMPLETED (Tech) |
| 18 | vehicles‑catalogue | ✅ Tech‑Hardened | 🟢 N/A | 🟢 Средний | 🟢 COMPLETED (Tech) |
| 19 | services | 🟢 Near‑Ready (Tech) | 🟢 N/A | 🟢 Средний | 🟢 Near‑Ready (Tech) |
| 20 | services/categories | 🟢 Near‑Ready (Tech) | 🟢 N/A | 🟢 Средний | 🟢 Near‑Ready (Tech) |
| 21 | service‑history | 🟢 Near‑Ready (Tech) | 🟡 152‑ФЗ light | 🟢 Средний | 🟢 Near‑Ready (Tech) |
| 22 | tariffs | ✅ Tech‑Hardened | 🟢 N/A | 🟢 Низкий | 🟢 COMPLETED (Tech) |

---

## 🧩 Work‑Schedules — детальное состояние (Tech READY)

Что реализовано
- Контроллер:
  - PATCH /work-schedules/exceptions/:id/status — изменение статуса исключения (approve/reject/…).
  - DELETE /work-schedules/exceptions/:id — логическое удаление (анонимизация).
  - RBAC/Ownership: механик не может менять/удалять исключения; механик создаёт исключение только себе; SuperAdmin при листинге — обязательно ?companyId.
  - Throttling: inline лимиты @Throttle({ default: ... }) на все методы (read/write‑семантика).
- Сервис/данные:
  - Проверки NotFound/Forbidden при смене статуса/удалении.
  - Аудит: SCHEDULE_EXCEPTION_STATUS_CHANGED, SCHEDULE_EXCEPTION_DELETED — без reason/rejectionReason.
- Ретеншн/анонимизация:
  - Поля dataRetentionUntil/anonymizedAt/anonymizedBy/piiAnonymized.
  - Cron‑анонимизация (WorkSchedulesRetentionScheduler) с Redis‑lock на компанию (CRON из ENV).
- Индексы/ENV:
  - Индекс под ретеншн‑выборки добавлен.
  - ENV: WORK_SCHEDULE_EXCEPTIONS_RETENTION_YEARS, WORK_SCHEDULE_EXCEPTIONS_ANON_CRON.

Что осталось
- E2E: RBAC/ownership; частичные дни/перерывы/границы; сортировки/пагинация; отсутствие reason в аудите; 409‑конфликт; сценарии Cron‑анонимизации.
- Документация: обновить docs/throttling.md и docs/retention.md.

Комплаенс
- 152‑ФЗ: минимизация ПДн (нет reason в аудите), сроки хранения/анонимизация — реализованы; нужны орг‑регламенты/SLA.
- 242‑ФЗ: локализация — инфра.
- 402‑ФЗ/54‑ФЗ/161‑ФЗ/PCI: неприменимо.

---

## 🧩 Appointments — детальное состояние (Tech Near‑Ready)

Что реализовано
- Сущность: поля ретеншн/анонимизации.
- Логика: статусы, переносы, отмены; маскирование ПДн в ответах по ролям.

Что осталось
- Ретеншн/анонимизация: Cron + Redis‑lock.
- Аудит: события APPOINTMENT_* (create/update/status/reschedule/addRating/view/tracking).
- DB: EXCLUDE‑constraint (tstzrange + mechanic_id) для активных статусов (исключение пересечений).
- Перформанс: оптимизация smartSchedule/checkAvailability.
- E2E: статусы/перенос/отмена/рейтинг (только COMPLETED), маскирование ПДн по ролям.

Комплаенс
- 152‑ФЗ: минимизация по ролям; для MVP не блокер.
- 242‑ФЗ/402‑ФЗ/54‑ФЗ/161‑ФЗ/PCI: N/A.

---

## 🧾 Invoices — детальное состояние (Tech Near‑Ready; 54‑ФЗ/402‑ФЗ baseline)

Что реализовано
- Сущность:
  - InvoiceFiscalizationStatus (NOT_REQUIRED, PENDING, DONE, FAILED).
  - Поля: fiscalizedAt, ofdProvider, ofdReceiptUrl.
- Валидации/блокировки:
  - Запрет изменения первичных реквизитов после оплаты/фискализации: amount, taxAmount, totalAmount, issueDate, dueDate, invoiceNumber, orderId, companyId.
  - Запрет отмены счета при наличии принятых платежей (Payment.status=PROCESSED).
- Бизнес‑логика:
  - При поступлении платежа в статус PROCESSED выполняется processPayment(invoiceId, amount, user); при полной оплате счёт → PAID.
- Аудит: INVOICE_CREATED/UPDATED/STATUS_CHANGED/CANCELED/PAID/OVERDUE_DETECTED/INVOICE_AUTO_GENERATED_FROM_ORDER — без ПДн.

Что осталось
- Документы/регламенты: неизменяемость первички; порядок корректировок/возвратов; сроки хранения (≥5 лет).
- E2E: запреты правок после оплаты; агрегированный статус фискализации; сценарии отмены.

Комплаенс
- 54‑ФЗ/402‑ФЗ: техническая база внедрена; документы — pending.
- 242‑ФЗ: локализация — инфра.

---

## 💳 Payments — детальное состояние (Tech Near‑Ready; 54‑ФЗ/161‑ФЗ baseline)

Что реализовано
- Бизнес‑правила:
  - Наличные (cash): при создании — авто‑PROCESSED (если флаг включён) и вызов InvoicesService.processPayment.
  - Эквайринг: при смене статуса на PROCESSED (по вебхуку) — вызов processPayment(invoiceId, amount, user).
- Фискализация (заглушка при ENABLE_FISCALIZATION=true):
  - Поля чека и возврата (fiscalReceiptNumber/Date, kktSerialNumber, fiscalDocumentNumber/Attribute, fiscalRefund*).
- Возвраты:
  - Полные/частичные; лимиты по времени; эскалация крупных возвратов; sanitization причин; аудит PAYMENT_REFUNDED.
- Аудит: PAYMENT_RECORDED/UPDATED/REFUNDED/PAYMENT_STATUS_CHANGED/BALANCE_CALCULATED — без ПДн.

Что осталось
- Webhooks PSP (разовые оплаты): подпись/ACL IP/throttle/микро‑идемпотентность — P0.2.
- Полная идемпотентность/защита от out‑of‑order — P1.
- Интеграция с ККТ/ОФД — после MVP.
- TypeORM Logger masking — P1 (при DB_LOG_QUERIES=true).

Комплаенс
- 54‑ФЗ/161‑ФЗ: базовый тех‑baseline; чеки — на стороне PSP для MVP.
- PCI DSS: область минимизирована (не храним PAN/CVV).

---

## 🧩 Inventory — детальное состояние (Tech Near‑Ready)

Что реализовано
- RBAC/ownership; DTO‑валидация с XSS‑санитизацией; SQL‑фильтры; видимость себестоимости по ролям; резервы с авто‑expire; запрет удаления по 402‑ФЗ.

Что осталось
- DB‑checks/индексы (quantity/minQuantity/цены/unique).
- E2E: RBAC/ownership; идемпотентность резервов; авто‑expire; low‑stock alerts.
- Регламенты (орг): SOP корректировок; доступ к себестоимости.

Комплаенс
- 152‑ФЗ: ПДн нет; отображение — по ролям.
- 402‑ФЗ: историчность соблюдается.
- 242‑ФЗ: локализация — инфра.

---

## 🧩 Inventory/Parts — состояние (Tech‑Hardened, COMPLETED)

- Реализовано: soft‑delete, аудит, XSS‑защита.
- Комплаенс: 402‑ФЗ — ок; 152‑ФЗ/242‑ФЗ — N/A/инфра.

---

## 🧩 Inventory/Stock‑Movements — состояние (Tech‑Hardened, COMPLETED)

- Реализовано: обратимые операции (reverse), индексы/checks, XSS‑санитизация.
- Комплаенс: 402‑ФЗ — ок; 152‑ФЗ — N/A.

---

## 🧩 Inventory/Alerts — состояние (Tech‑Hardened, Near‑Ready)

- Реализовано: dismiss/auto‑dismiss; шедулер; Redis‑lock.
- Осталось: уведомления, E2E, ADR рассылок.
- Комплаенс: 402‑ФЗ — ок.

---

## 🧩 Inventory/Suppliers — состояние (Tech Near‑Ready)

- Реализовано: деактивация вместо удаления; аудит; DTO‑валидация.
- Осталось: ownership‑guard; E2E superadmin‑правило; идемпотентность rate/bulk; обновление доков.
- Комплаенс: 402‑ФЗ — ок; 152‑ФЗ light — документы/SLA.

---

## 👥 Customers — состояние (Tech COMPLETED, Legal light pending)

Что реализовано
- Экспорт/отзыв согласия/анонимизация/cron; global no‑store; маскирование ПДн по ролям.

Что осталось
- E2E: маскирование/ownership/идемпотентность анонимизации; обновление правовых регламентов.

Комплаенс
- 152‑ФЗ: базово готово; документы — pending.
- 242‑ФЗ: инфра.

---

## 🧾 Orders — состояние (Tech‑Hardened, Legal Pending)

Что реализовано
- Лимиты в коде; ручной пересчёт totals; аналитика супер‑админа только с ?companyId.

Что осталось
- ENV/Config; DB‑checks; E2E; интеграция с Payments/Invoices (запрет отмены оплаченных); событийный пересчёт totals.

Комплаенс
- 152‑ФЗ: retention уточнить; 402‑ФЗ/54‑ФЗ: блок отмены при оплатах.

---

## 🧩 Vehicles — состояние (Tech‑Hardened, COMPLETED)

Что реализовано
- Минимизация по ролям; маскирование в аудите; global no‑store; нормализация VIN/госномера.

Что осталось
- E2E superadmin‑policy; XSS‑санитизация notes.

Комплаенс
- 152‑ФЗ light — документы/SLA.

---

## 🧩 Vehicles‑Catalogue — состояние (Tech‑Hardened, COMPLETED)

Что реализовано
- @AllowCache на /brands, /models (brandId), /types — TTL=3600, public; санитизация; аудит админских изменений (CATALOGUE_*).

Что осталось
- ETag/Redis (при повышенных нагрузках); ADR по словарям/правам.

Комплаенс
- 152‑ФЗ/242‑ФЗ — N/A.

---

## Services — состояние (Tech Near‑Ready)

Что реализовано
- Базовая CRUD‑логика; поиск; DTO‑валидация.

Что осталось
- Вызовы AuditService (SERVICE_*); throttling; sanitize свободных текстов; идемпотентность bulk; индексы/уникальность; ENV/валидация; E2E.

Комплаенс
- 152‑ФЗ/242‑ФЗ — ПДн нет (при корректной конфигурации полей).

---

## Services/Categories — состояние (Tech Near‑Ready)

Что реализовано
- Базовая CRUD‑логика; DTO‑валидация.

Что осталось
- Аудит SERVICE_CATEGORY_*; throttling; sanitize‑html; ENV; идемпотентность initialize‑global; индексы/уникальность; E2E.

Комплаенс
- 152‑ФЗ — N/A.

---

## 🧩 Service‑History — состояние (Tech Near‑Ready)

Что реализовано
- Санитизация/маскирование; аудит; global no‑store.

Что осталось
- Транзакционность; облегчённый листинг; лимиты поиска; реальные метрики; E2E.

Комплаенс
- 152‑ФЗ — косвенно ПДн; меры минимизации учтены.

---

## 🧾 Tariffs — состояние (Tech‑Hardened, COMPLETED)

Что реализовано
- @AllowCache на публичных GET (TTL=3600); DTO‑валидация; CRUD.

Что осталось
- Белый список sortField (P1); E2E; блок удаления при активных подписках.

Комплаенс
- 152‑ФЗ/242‑ФЗ — N/A.

---

## 🧩 Companies — состояние (COMPLETED)

- Технически: готово; RBAC/мульти‑тенантность; аудит.
- Юридически: 152‑ФЗ — готово.

---

## 🔧 Core — сводка статуса

- Cache‑Control: строгий no‑store по умолчанию [x]; адресный @AllowCache [x]; фикса Pragma/Expires [x].
- Throttling: профили на модуле [x]; обёртка @ThrottleProfile — P1.
- TypeORM logging: урезание/slow threshold [x]; masking при DB_LOG_QUERIES=true — P1.
- Webhooks PSP: профиль 'webhook' + подпись/ACL IP — P0 к Go‑Live (ENV подготовлены в P0.1).
- Helmet/HSTS/CSP: включены по окружениям (HSTS только prod) [x].
- X‑Request‑ID: в каждом ответе [x].

ENV/Config (MVP, обязательные)
- NODE_ENV=production; API_PREFIX=/api/v1; CORS_ORIGINS=https://<prod-frontend>.
- JWT_SECRET, JWT_REFRESH_SECRET, COOKIE_SECRET, RT_* — сгенерированы (TODO перед продом).
- DEFAULT_PAYMENT_PROVIDER=yookassa; ключи PSP (YOOKASSA_* или TINKOFF_*); WEBHOOK_ALLOWED_IPS; WEBHOOK_IDEMPOTENCY_TTL_SEC.
- ENABLE_FISCALIZATION=false; PRIVACY_POLICY_VERSION=1.0; PRIVACY_POLICY_TEXT_HASH (в проде обязателен).
- DB_LOG_QUERIES=false; DB_SLOW_QUERY_THRESHOLD_MS=500..1000.

Рекомендуемые
- PAYMENT_DATA_RETENTION_YEARS=5; OFD_PROVIDER=<наименование> (при реальной интеграции ККТ/ОФД).

---

## 🚀 Очередь модулей (спринт “доведение”)

1) Core
- [ ] Webhooks PSP (разовые оплаты): подпись (YooKassa), ACL по IP, throttling 60/мин, мини‑идемпотентность (Redis set, TTL из ENV) — P0.2.
- [ ] @ThrottleProfile обёртка — P1.
- [ ] TypeORM Logger Masking (emails/phones/tokens/PAN) — P1.
- [ ] Vary для кэшируемых ответов (Origin, Accept‑Encoding; при необходимости Accept) — P1.

2) Payments/Invoices
- [ ] Во всех местах проверки статусов — использовать enum PaymentStatus.* (без строк) — P0.
- [ ] E2E: редактирование/отмена после оплаты; агрегированный статус фискализации; refunds — P1.
- [ ] Документы: регламенты фискализации/возвратов/корректировок; хранение фискальных реквизитов; SLA чеков — P1.
- [ ] Отключение CASH в проде (UI + серверные валидации) — P0.

3) Work‑Schedules
- [ ] E2E: RBAC/ownership; partial/перерывы/границы; сортировки/пагинация; отсутствие reason в аудите; 409‑конфликт; Cron‑анонимизация — P1.
- [ ] Документация: обновить docs/throttling.md и docs/retention.md — P1.

4) Appointments
- [ ] Cron‑анонимизация; аудит APPOINTMENT_*; EXCLUDE‑constraint; перфоманс; E2E — P2.

5) Services/Categories
- [ ] Аудит; throttling; sanitize‑html; идемпотентность bulk; индексы/уникальность; ENV/валидация; E2E — P2.

6) Customers
- [ ] E2E: PII‑маскирование/ownership/идемпотентность анонимизации; проверка no‑store экспорта — P2.

7) Inventory/Orders
- [ ] E2E: резервы/expire/запрет отмены оплаченных; интеграция Payments/Invoices; событийный пересчёт totals — P2.

---

## Совет по read/write профилям (throttling)

- Статус: профили настроены на уровне модуля; декоратор @Throttle требует объект опций.
- План:
  - Быстрый (P1): добавить @ThrottleProfile — тонкий декоратор, мапящий в @Throttle({ default: { limit, ttl } }) из конфигурации.
  - Архитектурный (P2): возможное обновление @nestjs/throttler при появлении нативной поддержки алиасов.
- Не использовать неофициальный синтаксис @Throttle('read').

---

## 📌 Принятые решения и заметки (P0.1)

- PSP на MVP: YooKassa (быстрый онбординг, простая подпись вебхуков, стабильные IP; чеки на стороне провайдера).
- На первом этапе включаем только разовые оплаты; подписки/рекуррент — позже (требуют юр.документов).
- Raw‑body для вебхуков сейчас подключен для subscription‑billing; для payments будет добавлен в P0.2.
- PROD шаблоны ENV обновлены: DB_SLOW_QUERY_THRESHOLD_MS=500, HSTS включается автоматически в prod.
- Перед продом: сгенерировать PRIVACY_POLICY_TEXT_HASH, JWT/RT/COOKIE секреты, RT_*; проверить CORS_ORIGINS на точный домен фронта.
- 242‑ФЗ: план размещения БД/бэкапов в РФ (VPS в РФ — reg.ru) — учтён как целевой.

---

## 🔐 Роли и доступ (DriveCare Platform)

Роль | Описание
--- | ---
SuperAdmin | Полный контроль: все компании/подписки/логи/конфигурация/монетизация.
PlatformAdmin | Просмотр любой компании (read‑only/ограниченный write), роли/тарифы.
Auditor (опц.) | Только просмотр данных и логов.

### 🏢 Уровень компании (Multi‑tenant)

Роль | Описание
--- | ---
CompanyOwner | Компания/подписка/пользователи.
CompanyAdmin | Управление филиалом; почти полный доступ.

### Операционные роли

Роль | Описание
--- | ---
Manager | Клиенты/заказы/расписание (без фин/склада).
Cashier | Счета/платежи/документы (без склада/заказов).
InventoryManager | Склад/запасы/движение.
ServiceAdvisor | Записи на обслуживание; связка клиентов и механиков.

### Технические роли

Роль | Описание
--- | ---
Mechanic | Видит только свои назначения; меняет статусы; комментарии.
LeadMechanic | Контролирует механиков; перераспределяет задания.
Diagnostic | Отдельная диагностическая роль.

### Платформенные тех. роли

Роль | Описание
--- | ---
SupportEngineer | Техподдержка; временный доступ по запросу.
SystemOperator | Деплой/ENV/миграции.
DevOps / Maintainer | Инфраструктура, логи, доступ к БД, CI/CD.

### Дерево ролей

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
