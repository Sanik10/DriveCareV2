# 📋 DRIVECARE V2 — SECURITY & COMPLIANCE AUDIT TRACKER (RESET)

Дата создания: 06.08.2025  
Последнее обновление: 27.08.2025  
Статус: ✅ P0.3 (A/B/C) внедрён; Go‑Live Gate: E2E + секреты/политики  
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

### 🟢 Sprint P0 (сейчас) — критично для Go‑Live

Платежи/чеки (54‑ФЗ через PSP)
- [ ] .env (prod): ENABLE_FISCALIZATION=false; DEFAULT_PAYMENT_PROVIDER=yookassa|tinkoff; заданы ключи PSP (shopId/secret или terminalKey/password).
- [x] Разрешить только безналичные способы (card/bank). CASH скрыть в UI и запретить бизнес‑валидацией в проде (серверный бан включён).

Webhooks PSP (161‑ФЗ безопасность)
- [ ] Guard подписи (секрет/ключ провайдера).
  - Комментарий: у YooKassa криптоподписание вебхуков недоступно; применена компенсирующая мера — серверная проверка статуса у PSP + ACL IP. Криптоподпись (если появится у провайдера) — задача P1.
- [x] ACL по IP: WEBHOOK_ALLOWED_IPS (ENV), поддержка CIDR, доверие к X‑Forwarded‑For за прокси (trust proxy).
- [x] Throttling inline для webhook‑роутов (60/мин).
- [x] Мини‑идемпотентность: Redis set по ключу webhook:{provider}:{event}:{object.id}, TTL из ENV.
- [x] Серверная верификация статуса у PSP (YooKassa API) как компенсирующая мера по 161‑ФЗ.
- [x] Ограничение размера raw‑body на вебхуках (WEBHOOK_BODY_LIMIT).

“Первичка” (402‑ФЗ)
- [x] Запрет редактирования ключевых полей счёта после оплаты/фискализации.
- [x] Запрет удаления обработанных платежей: проверки на enum PaymentStatus.PROCESSED/REFUNDED/... везде, где нужно.

Prod‑конфигурация и безопасность
- [x] DB_LOG_QUERIES=false; DB_SLOW_QUERY_THRESHOLD_MS=500..1000 (в .env.production/.env.staging установлено 500; проверить на проде).
- [x] CORS_ORIGINS — только прод‑фронт; TLS; HSTS включается автоматически в prod (helmet в prod, выключено в dev/staging).
- [ ] Обновить секреты JWT/RT/COOKIE, зафиксировать версии (перед реальным продом).
- [x] TRUST_PROXY включён; req.ip/req.ips корректны за Ingress/LB.

Юридические документы (минимум)
- [ ] Публичная Политика ПДн (версия = PRIVACY_POLICY_VERSION).
- [ ] Договор/оферта с PSP: чеки выбивает провайдер; хранить у себя ID/URL чека.

Смоук‑тесты (Go‑Live Gate)
- [ ] Регистрация → счёт → оплата PSP → вебхук → платеж PROCESSED → счёт PAID.
- [ ] Попытка редактировать первичку PAID‑счёта — отказ.
- [ ] Refund (частичный/полный) → аудит → корректные статусы.
- [x] Cache‑контроль и Vary: /vehicles‑catalogue/* и /tariffs/* — public, max‑age=3600, Vary: Origin, Accept‑Encoding; остальное — no‑store.
- [x] Refresh cookie: Origin/Referer‑check; HttpOnly + Secure + SameSite; корректный path/domain.

Результат P0: можно принимать первые платежи через PSP; статусы синхронизируются по вебхукам; риски кэша/логов минимизированы; CSRF‑углы refresh закрыты.

---

### 🟡 Sprint P1 (сразу после запуска, 1–2 недели) — стабилизация

- Webhooks (надёжность): полная идемпотентность (таблица processed_events), защита от out‑of‑order (по updatedAt).
- Masking‑логгер (TypeORM): маска emails/phones/tokens/PAN (при DB_LOG_QUERIES=true).
- Throttling‑обёртка: @ThrottleProfile('auth'|'read'|'write'|'webhook'); убрать inline‑лимиты.
- Документы: регламенты фискализации/возвратов/корректировок, хранение фискальных реквизитов, SLA чеков.
- Payments: soft‑delete/полный запрет физического удаления; overdue учитывать PROCESSING; унификация enum типов методов оплаты; трансформеры DECIMAL→number.

---

### 🔵 Sprint P2 (после стабилизации) — улучшения и масштабирование

- Кэш/перформанс: ETag/Redis‑кэш для публичных словарей.
- Appointments: EXCLUDE‑constraint; оптимизация smartSchedule/checkAvailability.
- Inventory/Orders: идемпотентность bulk; расширенные алерты; запрет отмены оплаченных заказов; событийный пересчёт totals.
- Наблюдаемость: метрики/трассировки/алерты.

---

## 🧾 Changelog миниспринта (27.08.2025)

P0.2 — Webhooks разовых оплат + hardening платежей/ретеншна

Core/Security
- Добавлен raw‑body для payments‑вебхуков:
  - Пути: /api/v1/payments/webhooks/yookassa и /api/v1/payments/webhooks/tinkoff из ENV (YOOKASSA_PAYMENTS_WEBHOOK_PATH/TINKOFF_PAYMENTS_WEBHOOK_PATH).
  - JSON‑парсер теперь корректно обходит эти маршруты.
- Webhook‑безопасность:
  - ACL по IP (WEBHOOK_ALLOWED_IPS, поддержка X‑Forwarded‑For; разрешён localhost в dev/staging).
  - Throttling 60/мин на вебхук‑роуты.
  - Мини‑идемпотентность (Redis set NX, TTL из WEBHOOK_IDEMPOTENCY_TTL_SEC) по ключу webhook:payments:{provider}:{event}:{object.id}.
  - YooKassa: серверная верификация статуса платежа через API (Basic Auth shopId/secret) как компенсирующая мера по 161‑ФЗ (у провайдера нет криптоподписи вебхука).
- ENV:
  - В .env добавлены ключи: YOOKASSA_PAYMENTS_WEBHOOK_PATH, TINKOFF_PAYMENTS_WEBHOOK_PATH, WEBHOOK_ALLOWED_IPS, WEBHOOK_IDEMPOTENCY_TTL_SEC.

Payments (54‑ФЗ/161‑ФЗ baseline)
- Внедрён контроллер вебхуков разовых оплат:
  - POST /payments/webhooks/yookassa — обновление статуса локального платежа по gatewayTransactionId=object.id (дубликаты отбрасываются; если платёж не найден — 202/лог).
  - POST /payments/webhooks/tinkoff — заготовка (без статусов), безопасно подтверждает событие.
- PROCESSED → Invoices.processPayment: при переходе статуса на PROCESSED закрываем счёт корректно.
- Запрет удаления финальных статусов (402‑ФЗ): нельзя удалять PROCESSED/REFUNDED/PARTIALLY_REFUNDED/DISPUTED/CHARGEBACK.
- Enum‑строгиe проверки: валидация и сравнения статусов переведены на PaymentStatus.* (без “магических строк”).
- Server‑side бан наличных в проде: если NODE_ENV=production и метод оплаты cash → отказ с подсказкой (MVP только безнал).
- Аудит: события обновления/рефандов/расчёта баланса/смены статусов сохраняются (без ПДн).

Work‑Schedules (152‑ФЗ ретеншн)
- Починен крон анонимизации исключений: убран прямой raw‑SQL на camelCase колонку; вместо поля piiAnonymized используется проверка anonymizedAt IS NULL и dataRetentionUntil (TypeORM корректно мапит snake_case). Ошибка “column e.piiAnonymized does not exist” устранена.

Документация
- Трекер и стратегия обновлены под P0.2: зафиксированы реализованные меры по 161‑ФЗ/402‑ФЗ/54‑ФЗ/152‑ФЗ; конкретизированы компенсирующие меры.

P0.3 — Trust proxy + refresh/cookie + Vary/Tariffs (A/B/C)

Core/Security
- Trust proxy: включена поддержка прокси/Ingress через ENV TRUST_PROXY; корректная обработка req.ip/req.ips и X‑Forwarded‑For.
- Webhook raw‑body: лимитируем размер через ENV WEBHOOK_BODY_LIMIT (по умолчанию 128kb).
- ACL по IP для вебхуков: поддержка точных IP и IPv4 CIDR, учитываем кандидаты из req.ip/req.ips/remoteAddress.
- Headers: добавлен Vary: Origin, Accept‑Encoding для кэшируемых публичных ответов (@AllowCache), чтобы избежать cache‑poisoning и неверной вариативности.

Auth
- Refresh endpoint: Origin/Referer‑check по allow‑list (CORS_ORIGINS + FRONTEND_URL); кросс‑оригинные запросы блокируются.
- RT cookie: httpOnly + secure + sameSite (Lax/Strict/None с авто‑принудительным Secure при None); корректный path = /{API_PREFIX}/auth; поддержка COOKIE_DOMAIN; TTL через RT_COOKIE_MAX_AGE_MS.
- Валидация ENV: запрет конфигурации SameSite=None без Secure.

Tariffs (публичные словари)
- Серверный белый список полей сортировки (name|priceMonthly|priceYearly|createdAt) в контроллере; невалидные ключи → 400.
- Публичные ответы кешируемые с @AllowCache + корректный Vary.

ENV (новые/важные)
- TRUST_PROXY, WEBHOOK_BODY_LIMIT, COOKIE_SECURE, COOKIE_SAMESITE, COOKIE_DOMAIN, RT_COOKIE_MAX_AGE_MS.

---

## ✅ Что сделано (Core · Wave 1)

- CORS: трафик без Origin разрешён (health/webhooks/server‑to‑server).
- X‑Request‑ID: корреляция; заголовок в каждом ответе.
- Cache‑Control: no‑store/no‑cache по умолчанию для API.
- Аудит: расширенные AuditAction; безопасный AuditLoggingInterceptor.
- Управление аудитом: AuditService учитывает AUDIT_LOG_TO_DB.
- ENV: добавлен AUDIT_LOG_TO_DB; X‑Idempotency‑Key в CORS заголовках.
- Примечание: публичный кэш решаем адресно через CachePolicy/@AllowCache.

## ✅ Что сделано (Core · Wave 2)

- Кэш‑политика: CachePolicy/@AllowCache/@NoStore; поддержка в SecurityHeadersInterceptor.
- Заголовки: Pragma/Expires добавляются только при no‑store/no‑cache.
- @AllowCache применён:
  - Vehicles‑Catalogue: GET /brands, /models (с brandId), /types — TTL=3600 (public).
  - Tariffs: GET /tariffs, /tariffs/active, /tariffs/popular, /tariffs/compare — TTL=3600 (public).
- Throttling: профили global/auth/read/write на уровне модуля; в контроллерах — inline до появления обёртки.
- TypeORM logging: по умолчанию без query; slow threshold через ENV.
- Документация: обновлена политика кэширования (docs/cache-policy.md).

## ✅ Что сделано (Core · Wave 3 — Pack P0.1)

- ENV ключи для вебхуков PSP: WEBHOOK_ALLOWED_IPS, WEBHOOK_IDEMPOTENCY_TTL_SEC — добавлены в .env.* и провалидированы Joi.
- Подготовлены пути вебхуков разовых оплат: YOOKASSA_PAYMENTS_WEBHOOK_PATH/TINKOFF_PAYMENTS_WEBHOOK_PATH.
- .env.production/.env.staging: DB_SLOW_QUERY_THRESHOLD_MS=500 (рекомендовано 500–1000 мс).
- DEFAULT_PAYMENT_PROVIDER=yookassa для MVP — согласовано и зафиксировано.
- Helmet/CSP/HSTS: включены корректно по окружениям (HSTS только prod).

## ✅ Что сделано (Core · Wave 4 — P0.2 вебхуки разовых оплат)

- Raw‑body включён для payments‑вебхуков (к путям из ENV).
- Вебхуки разовых оплат (YooKassa): ACL по IP, throttling 60/мин, мини‑идемпотентность (Redis), серверная верификация статуса у PSP.
- Контроллеры и DI: PaymentsWebhooksController, WebhookIpAclGuard, WebhookIdempotencyService, YooKassaPaymentsClient.
- Payments hardening: серверный бан CASH в проде; запрет удаления финальных статусов; enum‑строгие проверки статусов.
- Work‑Schedules: исправлен крон анонимизации (устранён SQL на несуществующую колонку).

## ✅ Что сделано (Core · Wave 5 — P0.3 A/B/C)

- Trust proxy (за Ingress/LB) + корректная обработка клиентского IP.
- Webhook ACL: поддержка CIDR; выбор IP из req.ip/req.ips/remoteAddress; raw‑body limit из ENV.
- Security headers: добавлен Vary для кэшируемых публичных ответов.
- Auth: Origin/Referer‑check на refresh; строгие cookie‑флаги (httpOnly, Secure, SameSite); корректный path/domain.
- Tariffs: серверный белый список sortField.

---

## 📊 MASTER MODULE TABLE (обновлено)

| # | Модуль | Тех. базлайн | Юр. базлайн (ФЗ РФ) | Приоритет | Статус |
|---|--------|--------------|---------------------|-----------|--------|
| 1 | auth | ✅ Tech‑hardened (RT cookie, jti, reuse‑det, 2FA, Origin‑check RT) | 🟡 Документы (политика/ретеншн/ДПА) | 🔴 Критический | 🟢 COMPLETED (Tech) |
| 2 | users | ✅ Tech‑hardened (consents, self‑service, export) | 🟢 В основном готово | 🔴 Критический | 🟢 Near‑Ready |
| 3 | companies | ✅ Tech‑hardened (multi‑tenant, 152‑ФЗ fields, audit, RBAC) | 🟢 152‑ФЗ | 🔴 Критический | 🟢 COMPLETED |
| 4 | payments | ✅ Tech baseline 54‑ФЗ/161‑ФЗ + вебхуки разовых оплат, запреты PROCESSED | 🟡 54‑ФЗ (ККТ/PCI) pending | 🔴 Критический | 🟢 Ready for E2E |
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
| 22 | tariffs | ✅ Tech‑Hardened (+ whitelist сортировки) | 🟢 N/A | 🟢 Низкий | 🟢 COMPLETED (Tech) |

---

## 🧩 Work‑Schedules — детальное состояние (Tech READY)

Что реализовано
- Контроллер:
  - PATCH /work-schedules/exceptions/:id/status — изменение статуса (approve/reject/…).
  - DELETE /work-schedules/exceptions/:id — логическое удаление (анонимизация).
  - RBAC/Ownership: механик не может менять/удалять исключения; механик создаёт исключение только себе; SuperAdmin при листинге — обязательно ?companyId.
  - Throttling: inline лимиты @Throttle({ default: ... }) на все методы (read/write‑семантика).
- Сервис/данные:
  - Проверки NotFound/Forbidden при смене статуса/удалении.
  - Аудит: SCHEDULE_EXCEPTION_STATUS_CHANGED, SCHEDULE_EXCEPTION_DELETED — без reason/rejectionReason.
- Ретеншн/анонимизация:
  - Поля dataRetentionUntil/anonymizedAt/anonymizedBy/piiAnonymized.
  - Cron‑анонимизация (WorkSchedulesRetentionScheduler) с Redis‑lock (CRON из ENV).
  - [Fix P0.2] Исправлена выборка для анонимизации: убран raw‑SQL на camelCase колонку; используется anonymizedAt IS NULL и dataRetentionUntil (без падений).
- Индексы/ENV:
  - Индекс под ретеншн‑выборки.
  - ENV: WORK_SCHEDULE_EXCEPTIONS_RETENTION_YEARS, WORK_SCHEDULE_EXCEPTIONS_ANON_CRON.

Что осталось
- E2E: RBAC/ownership; частичные дни/перерывы/границы; сортировки/пагинация; отсутствие reason в аудите; 409‑конфликт; сценарии Cron‑анонимизации.
- Документация: обновить docs/throttling.md и docs/retention.md.

Комплаенс
- 152‑ФЗ: минимизация ПДн (нет reason в аудите), сроки хранения/анонимизация — реализованы; нужны орг‑регламенты/SLA.
- 242‑ФЗ: локализация — инфра.
- 402‑ФЗ/54‑ФЗ/161‑ФЗ/PCI: неприменимо.

---

## 🧾 Invoices — детальное состояние (Tech Near‑Ready; 54‑ФЗ/402‑ФЗ baseline)

Что реализовано
- Сущность: InvoiceFiscalizationStatus (NOT_REQUIRED|PENDING|DONE|FAILED) + fiscalizedAt, ofdProvider, ofdReceiptUrl.
- Валидации/блокировки: запрет изменения первички после оплаты/фискализации; запрет отмены счёта при наличии PROCESSED платежей.
- Бизнес‑логика: Payment.PROCESSED → processPayment(invoiceId, amount, user); при полной оплате счёт → PAID.
- Аудит: INVOICE_CREATED/UPDATED/STATUS_CHANGED/CANCELED/PAID/OVERDUE_DETECTED/INVOICE_AUTO_GENERATED_FROM_ORDER — без ПДн.

Что осталось
- Документы/регламенты: неизменяемость первички; корректировки/возвраты; сроки хранения (≥5 лет).
- E2E: запреты правок после оплаты; агрегированный статус фискализации; сценарии отмены.

Комплаенс
- 54‑ФЗ/402‑ФЗ: тех. база внедрена; документы — pending.
- 242‑ФЗ: локализация — инфра.

---

## 💳 Payments — детальное состояние (Tech Ready for E2E; 54‑ФЗ/161‑ФЗ baseline)

Что реализовано
- Вебхуки разовых оплат (YooKassa):
  - ACL IP, throttling 60/мин, мини‑идемпотентность (Redis по event/object.id).
  - Серверная верификация статуса у PSP (succeeded/canceled) → маппинг в PaymentStatus → процессинг счёта.
  - Если локальный платёж не найден по gatewayTransactionId — 202 (без создания), лог‑аудит.
- Бизнес‑правила:
  - Наличные (cash): в production запрещены на серверной стороне (MVP).
  - Эквайринг: при смене статуса на PROCESSED — Invoices.processPayment(invoiceId, amount, user).
- Возвраты:
  - Полные/частичные; лимиты по времени; эскалация крупных возвратов; sanitization причин; аудит PAYMENT_REFUNDED.
- “Первичка” (402‑ФЗ):
  - Запрет удаления финальных статусов (PROCESSED/REFUNDED/…); enum‑строгие проверки.

Что осталось
- E2E: полный прогон “счёт → оплата PSP → вебхук → Payment.PROCESSED → Invoice.PAID”.
- Webhooks/Tinkoff: реализация статусов (скелет есть); полноценная логика — P1.
- Полная идемпотентность/out‑of‑order: таблица processed_events — P1.
- Интеграция с ККТ/ОФД — после MVP.
- TypeORM Logger masking — P1 (при DB_LOG_QUERIES=true).

Комплаенс
- 54‑ФЗ/161‑ФЗ: базовый тех‑baseline; чеки — на стороне провайдера для MVP.
- PCI DSS: область минимизирована (PAN/CVV не храним).

---

## Inventory/Alerts

---

## 🔧 Core — сводка статуса

- Trust proxy: включён через ENV, корректный IP за Ingress [x].
- Cache‑Control: строгий no‑store по умолчанию [x]; адресный @AllowCache [x]; фикса Pragma/Expires [x].
- Vary: для @AllowCache ответов добавлен Vary: Origin, Accept‑Encoding [x].
- Throttling: профили на модуле [x]; обёртка @ThrottleProfile — P1.
- TypeORM logging: урезание/slow threshold [x]; masking при DB_LOG_QUERIES=true — P1.
- Webhooks PSP (разовые оплаты): профиль 'webhook' + ACL IP + throttling + мини‑идемпотентность + серверная верификация статуса у PSP — [x] (P0.2).
- Helmet/HSTS/CSP: включены по окружениям (HSTS только prod) [x].
- X‑Request‑ID: в каждом ответе [x].
- Raw‑body: подключён для subscription‑billing и payments‑вебхуков; лимит из ENV [x].

ENV/Config (MVP, обязательные)
- NODE_ENV=production; API_PREFIX=/api/v1; CORS_ORIGINS=https://<prod-frontend>.
- TRUST_PROXY=1 (или список значений Express) в проде за LB/Ingress.
- JWT_SECRET, JWT_REFRESH_SECRET, COOKIE_SECRET, RT_* — сгенерировать перед продом.
- COOKIE_SECURE=true; COOKIE_SAMESITE=lax|strict|none; COOKIE_DOMAIN=<prod-domain>; RT_COOKIE_MAX_AGE_MS=604800000.
- DEFAULT_PAYMENT_PROVIDER=yookassa; ключи PSP (YOOKASSA_* или TINKOFF_*); WEBHOOK_ALLOWED_IPS; WEBHOOK_IDEMPOTENCY_TTL_SEC; WEBHOOK_BODY_LIMIT=128kb.
- ENABLE_FISCALIZATION=false; PRIVACY_POLICY_VERSION=1.0; PRIVACY_POLICY_TEXT_HASH (в проде обязателен).
- DB_LOG_QUERIES=false; DB_SLOW_QUERY_THRESHOLD_MS=500..1000.

Рекомендуемые
- PAYMENT_DATA_RETENTION_YEARS=5; OFD_PROVIDER=<наименование> (при реальной интеграции ККТ/ОФД).

---

## 🚀 Очередь модулей (спринт “доведение”)

1) Core
- [x] Webhooks PSP (разовые оплаты): ACL IP, throttling 60/мин, мини‑идемпотентность (Redis), серверная верификация — P0.2.
- [x] Trust proxy + CIDR в ACL + raw‑body limit — P0.3.
- [ ] Guard подписи провайдера — P1 (если доступно у PSP).
- [ ] @ThrottleProfile обёртка — P1.
- [ ] TypeORM Logger Masking (emails/phones/tokens/PAN) — P1.

2) Payments/Invoices
- [x] Во всех местах проверки статусов — использовать enum PaymentStatus.* — P0.2.
- [x] Отключение CASH в проде (UI + серверные валидации) — P0.2.
- [ ] E2E: редактирование/отмена после оплаты; агрегированный статус фискализации; refunds — P1.
- [ ] Документы: регламенты фискализации/возвратов/корректировок; хранение фискальных реквизитов; SLA чеков — P1.
- [ ] processed_events + out‑of‑order защита — P1.

3) Auth
- [x] Origin/Referer‑check на refresh; cookie флаги и путь — P0.3.
- [ ] Документы: политика ПДн/ретеншн/ДПА — P1 (Legal).

4) Tariffs
- [x] Белый список sortField + @AllowCache + Vary — P0.3.

5) Work‑Schedules
- [x] Fix анонимизации (ошибка колонки) — P0.2.
- [ ] E2E: RBAC/ownership; partial/перерывы/границы; сортировки/пагинация; отсутствие reason в аудите; 409‑конфликт; Cron‑анонимизация — P1.
- [ ] Документация: обновить docs/throttling.md и docs/retention.md — P1.

6) Appointments
- [ ] Cron‑анонимизация; аудит APPOINTMENT_*; EXCLUDE‑constraint; перфоманс; E2E — P2.

7) Customers
- [ ] E2E: PII‑маскирование/ownership/идемпотентность анонимизации; проверка no‑store экспорта — P2.

8) Inventory/Orders
- [ ] E2E: резервы/expire/запрет отмены оплаченных; интеграция Payments/Invoices; событийный пересчёт totals — P2.

---

## 📌 Принятые решения и заметки (P0.3)

- PSP на MVP: YooKassa (быстрый онбординг, стабильные IP; чеки — у провайдера).
- Безопасность вебхуков: ACL IP + throttling + мини‑идемпотентность + серверная верификация у PSP; trust proxy за Ingress.
- Создание платежа на вебхуке при его отсутствии — выключено (202/лог). “create‑if‑missing” — отдельный флаг в P1 после подтверждения metadata от PSP.
- PROD: ENABLE_FISCALIZATION=false; наличные — серверно запрещены (MVP).
- Refresh: только с доверенных Origin/Referer; RT‑cookie с httpOnly+Secure+SameSite; корректный path/domain.
- Публичный кэш: @AllowCache только на словарях; Vary: Origin, Accept‑Encoding.

---

## 🟩 Go‑Live Gate — что должно быть сделано до релиза

- [ ] Заполнить WEBHOOK_ALLOWED_IPS реальными IP/подсетями PSP.
- [ ] Установить TRUST_PROXY=1 (или соответствующую строку) в проде.
- [ ] Сгенерировать и загрузить секреты: JWT_SECRET, JWT_REFRESH_SECRET, COOKIE_SECRET, RT_*.
- [ ] Установить PRIVACY_POLICY_TEXT_HASH и опубликовать Политику ПДн (PRIVACY_POLICY_VERSION).
- [ ] Проверить CORS_ORIGINS на точный прод‑домен фронта.
- [ ] Прогнать E2E: “счёт → оплата PSP → вебхук → Payment.PROCESSED → Invoice.PAID” — зелёный.
- [ ] Быстрые смоук‑тесты: запрет правок первички; возвраты; кэш‑контроль + Vary на словарях.

---

## Риски и как их снимаем

- Подмена/повторы вебхуков (161‑ФЗ): ACL IP (+CIDR) + throttling + Redis‑идемпотентность + серверная проверка статуса у PSP + trust proxy за Ingress.
- CSRF на refresh: Origin/Referer‑check; RT‑cookie httpOnly+Secure+SameSite; строгий path/domain.
- Cache‑poisoning/неверная вариативность: Vary: Origin, Accept‑Encoding для кэшируемых публичных ответов.
- 402‑ФЗ первичка: запрет удаления финальных статусов и редактирования первички — реализовано; SOP корректировок — в P1.
- 54‑ФЗ: чеки — на стороне провайдера; локально храним связку (ID/URL/реквизиты) — регламенты в P1.

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
