# 🚀 DriveCare V2 — Go‑Live Strategy (MVP) · P0.3 Delivered

Обновлено: 27.08.2025

Коротко: держим баланс скорость ↔ комплаенс. MVP — приёмка платежей через PSP (YooKassa), жёсткие линии по 161‑ФЗ/54‑ФЗ/402‑ФЗ/152‑ФЗ. В этой итерации (P0.3) мы довели прохождение за прокси, CSRF‑защиту refresh/cookie и безопасное кеширование публичных словарей.

---

## Что отгружено (P0.3 A/B/C)

A. Webhooks за прокси (Ingress/LB)
- Trust proxy: configurable (ENV TRUST_PROXY), корректная семантика req.ip/req.ips и X‑Forwarded‑For.
- ACL по IP: поддержка точных IP и IPv4 CIDR; берём кандидатов из req.ip/req.ips/remoteAddress.
- Raw‑body: лимит по ENV WEBHOOK_BODY_LIMIT (по умолчанию 128kb).

B. Auth: refresh/cookie hardening
- Refresh endpoint: Origin/Referer‑check (allow‑list = CORS_ORIGINS + FRONTEND_URL). Чужие домены — 403.
- RT cookie: httpOnly + Secure + SameSite (Lax/Strict/None; при None — Secure принудительно), корректный path = /{API_PREFIX}/auth, опционально COOKIE_DOMAIN; TTL через RT_COOKIE_MAX_AGE_MS.

C. Cache/Vary + Tariffs
- Security headers: Vary: Origin, Accept‑Encoding для всех кэшируемых публичных ответов (@AllowCache).
- Tariffs: серверный белый список sortField (name|priceMonthly|priceYearly|createdAt); невалидные ключи → 400.
- Публичные ответы /tariffs/* помечены @AllowCache(3600, 'public').

Изменённые файлы
- apps/backend/src/main.ts
- apps/backend/src/modules/payments/guards/webhook-ip-acl.guard.ts
- apps/backend/src/modules/payments/webhooks/payments-webhooks.controller.ts
- apps/backend/src/modules/auth/auth.controller.ts
- apps/backend/src/common/interceptors/security-headers.interceptor.ts
- apps/backend/src/modules/tariffs/tariffs.controller.ts
- apps/backend/src/config/validation.schema.ts

ENV/Config
- TRUST_PROXY, WEBHOOK_BODY_LIMIT, COOKIE_SECURE, COOKIE_SAMESITE, COOKIE_DOMAIN, RT_COOKIE_MAX_AGE_MS — добавлены и провалидированы.
- CORS_ORIGINS/FRONTEND_URL — источник allow‑list для refresh.

Критерии приёмки P0.3 — достигнуты
- Вебхуки проходят за прокси (Ingress/LB), ложных 403 по IP нет; повторы гасим Redis‑TTL.
- Публичные словари корректно кешируются с Vary; мусорные сортировки тарифов заблокированы.
- Refresh работает только с доверенных Origin/Referer; cookie‑флаги зафиксированы.

---

## Красные линии к Go‑Live (не торгуется)

- Платежи/54‑ФЗ/161‑ФЗ:
  - Оплата только через PSP, чеки выбивает провайдер по договору (ENABLE_FISCALIZATION=false).
  - Вебхуки PSP: ACL IP, throttling, мини‑идемпотентность (Redis), серверная проверка статуса у PSP (компенсация отсутствия криптоподписи).
  - Связка платеж ↔ счёт: PROCESSED → процессинг в Invoices; запрет правок первички; запрет удаления обработанных платежей.
- 152‑ФЗ/242‑ФЗ:
  - Политика ПДн публично + фиксация версии/хэша в системе (PRIVACY_POLICY_VERSION + PRIVACY_POLICY_TEXT_HASH в проде).
  - Локализация: БД/бэкапы/логи — в РФ; без ПДн в сторонние сервисы вне РФ.
  - Логи без ПДн/секретов; DB_LOG_QUERIES=false в проде.
- Безопасность API:
  - CORS — только белый список; HSTS в prod; TLS повсеместно.
  - X‑Request‑ID в каждом ответе; строгая кэш‑политика (no‑store; @AllowCache — только для словарей); Vary на словарях.

---

## План: что осталось до “зелёного” E2E (Go‑Live Gate)

- [ ] E2E‑сценарий: “счёт → оплата PSP → вебхук → Payment.PROCESSED → Invoice.PAID” — зелёный.
- [ ] Стенды/Прод: заполнить WEBHOOK_ALLOWED_IPS реальными IP/подсетями PSP; задать YOOKASSA_* ключи; TRUST_PROXY=1; проверить CORS_ORIGINS.
- [ ] Прод: сгенерировать PRIVACY_POLICY_TEXT_HASH, JWT/RT/COOKIE секреты (ротация), RT_*.
- [ ] Быстрые смоук‑тесты: запрет правок первички; возвраты; кэш‑контроль + Vary на публичных словарях.

---

## P0.3 Hardening — статус по этапам

### Этап A — Webhooks: надёжная доставка за прокси + быстрый E2E платеж — ВЫПОЛНЕНО
Файлы:
- apps/backend/src/main.ts
- apps/backend/src/modules/payments/guards/webhook-ip-acl.guard.ts
- apps/backend/src/modules/payments/webhooks/payments-webhooks.controller.ts

Критерии:
- Вебхуки от YooKassa проходят через Ingress/NGINX/Cloud LB без ложных 403.
- Повторный вебхук в течение TTL Redis не меняет состояние повторно.
- Серверная верификация статуса у PSP — активна.

### Этап B — Auth: защита refresh и куки — ВЫПОЛНЕНО
Файлы:
- apps/backend/src/modules/auth/auth.controller.ts
- apps/backend/src/config/validation.schema.ts

Критерии:
- Refresh endpoint отклоняет кросс‑оригинные запросы с чужих доменов (Origin/Referer‑check).
- Куки RT: httpOnly + secure + sameSite; корректные path/domain; без регрессий фронта.

### Этап C — Cache/Vary + Tariffs: безопасные публичные ответы — ВЫПОЛНЕНО
Файлы:
- apps/backend/src/common/interceptors/security-headers.interceptor.ts
- apps/backend/src/modules/tariffs/tariffs.controller.ts

Критерии:
- /vehicles‑catalogue/* и /tariffs/* корректно кешируются CDN/браузером с учётом Vary.
- Невалидный sortField в /tariffs → 400; валидные — работают.

---

## После запуска (P1, 1–2 недели)

Надёжность/устойчивость
- processed_events: полная идемпотентность и защита от out‑of‑order (игнор “старых” событий по updatedAt).
  - Файлы: apps/backend/src/modules/payments/services/webhook-idempotency.service.ts (+ новая сущность/репозиторий processed_events), apps/backend/src/modules/payments/webhooks/payments-webhooks.controller.ts, apps/backend/src/database/entities/processed-event.entity.ts (или в каталоге payments).
  - Критерии: повтор/старое событие не меняет состояние; тесты на гонки и re-delivery.

- @ThrottleProfile: алиасы профилей вместо inline лимитов.
  - Файлы: apps/backend/src/common/decorators/throttle-profile.decorator.ts, apps/backend/src/common/interceptors/throttle-profile.interceptor.ts, удалить inline в контроллерах.
  - Критерии: единообразные лимиты без дублирования.

- Logger masking: маски в TypeORM‑логгере (emails/phones/tokens/PAN) при DB_LOG_QUERIES=true.
  - Файлы: apps/backend/src/database/database.config.ts (или custom logger), конфиг логгера.
  - Критерии: инспекция логов — ПДн/секреты замаскированы.

Платежи/бухучёт
- Soft‑delete/полный отказ от физического удаления платежей; SOP корректировок (402‑ФЗ).
  - Файлы: apps/backend/src/modules/payments/services/payments-data.service.ts, payment.entity.ts (softDelete), guards.
- Overdue: учитывать PROCESSING, а не только PENDING.
- Унификация enum типов методов оплаты; трансформеры DECIMAL→number (или Money‑тип).
  - Файлы: apps/backend/src/database/entities/payment.entity.ts (+ ValueTransformer), общие types.

Документы (Legal)
- Регламенты фискализации/возвратов/корректировок; SLA чеков; хранение реквизитов ≥5 лет; DPA с процессорами.

---

## Масштабирование/качество (P2)

- Кэш/перформанс: ETag/Redis для публичных словарей.
- Appointments: EXCLUDE‑constraint; оптимизация smartSchedule/checkAvailability.
- Inventory/Orders: идемпотентность bulk, событийный пересчёт totals, запрет отмены оплаченных заказов.
- Наблюдаемость: метрики, трассировки, алерты (в т.ч. на провалы вебхуков).

---

## Ship‑чеклист P0 (обновлён)

- [ ] DEFAULT_PAYMENT_PROVIDER=yookassa; ключи PSP заданы.
- [x] ENABLE_FISCALIZATION=false; договор с PSP: чеки выбивает провайдер.
- [x] Вебхуки разовых оплат: ACL IP (+CIDR); throttling 60/мин; мини‑идемпотентность; серверная проверка статуса у PSP; trust proxy.
- [x] PROCESSED платежи нельзя удалять/редактировать; процессинг закрывает счёт корректно.
- [x] CORS — только нужные домены; HSTS в prod; TLS везде.
- [ ] PRIVACY_POLICY_TEXT_HASH задан в prod; версия согласий фиксируется.
- [x] DB_LOG_QUERIES=false; DB_SLOW_QUERY_THRESHOLD_MS=500..1000 (prod/staging).
- [x] Swagger выключен в prod.
- [x] Логи без ПДн/секретов; X‑Request‑ID в ответах; Health/webhooks работают без Origin.
- [x] Vary: Origin, Accept‑Encoding на публичных словарях; Tariffs sort whitelist.
- [x] Refresh: Origin/Referer‑check; RT cookie httpOnly+Secure+SameSite; корректный path/domain.
- [ ] Е2Е “счёт → оплата PSP → вебхук → Payment.PROCESSED → Invoice.PAID” — зелёный.

---

## Path‑Blocks Workflow (синхронизация с ИИ)

Шаг 1 (P0.3) — Выполнено  
Шаг 2 (Go‑Live Gate) — E2E/секреты/политики/ENV (без кода)  
Шаг 3 (P1 Reliability) — processed_events, @ThrottleProfile, Logger masking, Payments soft‑delete  
Шаг 4 (P1 Payments) — Tinkoff webhook статусы, Money‑тип/DECIMAL трансформеры

При старте Шага 3 ИИ запросит точные версии целевых файлов и вернёт только path‑blocks с полным содержимым.

---
