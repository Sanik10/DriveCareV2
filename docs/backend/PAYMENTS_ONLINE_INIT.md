<!-- path: docs/backend/PAYMENTS_ONLINE_INIT.md -->
# Payments Online Init (YooKassa) — актуальная реализация

Назначение: описывает действующий UI-безопасный сценарий онлайн‑оплаты инвойсов через YooKassa с редиректом из фронтенда и безопасной обработкой статусов и чеков (54‑ФЗ).

Состояние: Готово в коде (контроллер/сервис/клиент/вебхуки). Эндпоинт стабилен и использует лучшие практики безопасности (JWT+RBAC+ownership guard, идемпотентность, валидация, аудит, IP‑ACL для вебхуков, серверная проверка статуса у провайдера).

---

## Эндпоинт

POST /api/v1/payments/online/init

- Guards: JwtAuthGuard + RolesGuard + CompanyOwnershipGuard
- Роли: CAN_RECORD_PAYMENT (company_owner, company_admin, manager)
- Throttle: 20/мин
- Заголовки:
  - X-Idempotency-Key: рекомендуется (UUID). Используется как кэш ответов (Redis) и пробрасывается в YooKassa как Idempotence-Key.
- Ответ: 201 Created, JSON с redirectUrl для оплаты

Контроллер:
- apps/backend/src/modules/payments/payments.controller.ts → POST /payments/online/init

Сервис:
- apps/backend/src/modules/payments/payments.service.ts → initOnlinePayment()

Клиент YooKassa:
- apps/backend/src/modules/payments/services/yookassa-payments.client.ts

Вебхуки:
- apps/backend/src/modules/payments/webhooks/payments-webhooks.controller.ts → POST /payments/webhooks/yookassa

---

## Контракт API

Request (DTO): OnlinePaymentInitDto
- invoiceId: UUID — инвойс компании со статусом issued
- amount?: number — если не указано, берётся remainingAmount по инвойсу (частичная оплата поддержана с пропорцией по чеку)
- currency?: 'RUB' | 'USD' | ... — по умолчанию RUB
- paymentMethodId?: UUID — активный способ оплаты компании с gatewayType='yookassa' (если не указан — берётся последний активный)
- returnUrl: string — куда редиректить после успешной/несостоявшейся оплаты
- locale?: 'ru_RU' | 'en_US' — локаль платёжной страницы (default: ru_RU)
- capture?: boolean — сразу “захватывать” платёж после авторизации (default: true)
- customer?: { email?: string; phone?: string } — переопределение данных плательщика (иначе берём из customer заказа)
- metadata?: Record<string, string> — безопасные метаданные (лимит 5KB, ключи/значения урезаются под лимиты YooKassa)
- description?: string — описание (до 255 символов)

Response (DTO): OnlinePaymentInitResponseDto
- paymentId: string — локальный ID Payment в БД (status=processing)
- provider: 'yookassa'
- status: 'pending' | 'processing' — технический статус инициации
- redirectUrl: string — ссылка для редиректа на платёжную страницу
- expiresAt?: string (ISO) — если присутствует в ответе YooKassa

Примеры:

Request:
{
  "invoiceId": "c3a1d4f2-90e3-4a17-b6e1-4a92a7a48c0a",
  "amount": 5000.00,
  "returnUrl": "https://app.example.com/dashboard/payments/result",
  "locale": "ru_RU",
  "capture": true,
  "customer": { "email": "ivan@example.com", "phone": "+79991234567" },
  "metadata": { "source": "web_app", "campaign": "spring" },
  "description": "Оплата счёта INV-2025-00012 по заказу ORD-00123"
}

Response:
{
  "paymentId": "a7f2b1d4-2f77-4d0b-9b76-3b2f9a4c1e2a",
  "provider": "yookassa",
  "status": "pending",
  "redirectUrl": "https://yookassa.ru/checkout/confirm?payment_token=...",
  "expiresAt": "2025-01-31T12:34:56.000Z"
}

---

## Формирование чека (54‑ФЗ)

Чек формируется на стороне YooKassa (receipt в createPayment). Мы передаём:
- receipt.items:
  - для заказа: позиции услуг (payment_subject='service') и запчастей (payment_subject='commodity')
  - для инвойса без позиций — одна позиция “Оплата по счёту”
- Пропорциональная частичная оплата: суммы позиций масштабируются по доле amount / invoice.totalAmount, с корректировкой последней позиции на округление
- vat_code: по умолчанию 1 (без НДС). При появлении налоговых полей в сущностях добавим маппинг на 4/3/2/1/6/5
- payment_mode: 'full_payment'
- customer.email/phone: из сущности Customer заказа, допускается переопределение через DTO.customer
- tax_system_code: сейчас не передаётся (зависит от настроек компании/ОСН/УСН). Будет добавлено при наличии полей в Company/PaymentMethod

Метаданные YooKassa (metadata):
- company_id, invoice_id, order_id, created_by_user, provider: 'yookassa' + поля из DTO.metadata (обрезаются в лимитах)

---

## Поведение на сервере

1) Валидация:
- invoice существует, принадлежит компании пользователя, статус=issued
- amount > 0 и ≤ remainingAmount по инвойсу
- Подбор/проверка PaymentMethod (gatewayType='yookassa', активный, с credentials)

2) Создание локального Payment:
- paymentsBusinessService.recordPaymentForCompany() с initial status=processing
- Сохраняем safeMetadata: idempotencyKey, returnUrl, provider

3) Вызов YooKassa:
- createPayment() с Idempotence-Key (из X-Idempotency-Key)
- Передаём amount, currency, description, confirmation.redirect, capture, locale, receipt, metadata
- На успех: сохраняем gatewayTransactionId (YK payment id), safeMetadata.redirectUrl, yk_status

4) Ответ клиенту:
- Возвращаем paymentId + redirectUrl

5) Изменение статуса:
- Вебхук /payments/webhooks/yookassa (⛔ system-only)
  - IP ACL guard + Redis идемпотентность
  - Обязательная серверная проверка статуса у YooKassa (checkPaymentStatus)
  - 'succeeded' → Payment.status=processed → синхронизация инвойса (invoicesService.processPayment)
  - 'canceled' → Payment.status=canceled
  - 'pending' → без действий

---

## Идемпотентность

- UI: X-Idempotency-Key (UUID) — рекомендуется на каждый init
- Redis cache: ключ вида payments:online:init:{companyId}:{invoiceId}:{amount|full}:{idempotencyKey} на 15 минут
- YooKassa: заголовок Idempotence-Key в createPayment

Повторный вызов с тем же ключом → вернём ранее выданный paymentId/redirectUrl.

---

## Безопасность

- JwtAuthGuard + RolesGuard + CompanyOwnershipGuard
- RBAC: CAN_RECORD_PAYMENT
- Троттлинг: 20/мин
- Санитайз на текстовых полях DTO, size‑лимиты на metadata и gatewayResponse
- Секреты YooKassa шифруются в PaymentMethod.gatewayApiKey (AES‑256‑GCM) с ключом PM_ENC_KEY (base64, 32 байта)
- Вебхуки:
  - IP ACL (Whitelist), Redis идемпотентность
  - Серверная верификация статуса у провайдера перед изменением в БД
- Логи: безопасные (маскирование), аудит по ключевым событиям
- 152‑ФЗ: минимизация ПДн (email/phone только для чека, не сохраняем лишнее в БД), политика хранения данных (retention)

---

## Конфигурация и окружение

Требования:
- В БД: активный PaymentMethod компании с gatewayType='yookassa'
  - gatewayMerchantId: SHOP_ID для YooKassa (строка)
  - gatewayApiKey: SECRET_KEY (шифруется прозрачно на запись через PM_ENC_KEY)
- ENV:
  - PM_ENC_KEY — base64 ключ шифрования (32 байта). Обязательно в production.
  - (Опционально fallback, но в текущей реализации не используется) YOOKASSA_SHOP_ID, YOOKASSA_SECRET_KEY

Пример PM_ENC_KEY:
PM_ENC_KEY=7O1t0o4s6vU3c9asYBqvVhV3f9Gd0pJQ6yL0o3y2u5g=

---

## Примеры

cURL (init):
curl -X POST "https://api.example.com/api/v1/payments/online/init" \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -H "X-Idempotency-Key: 2f38a1a0-7b85-4b3e-8a44-9c1a0d7e9b5d" \
  -d '{
    "invoiceId":"c3a1d4f2-90e3-4a17-b6e1-4a92a7a48c0a",
    "amount":5000.00,
    "returnUrl":"https://app.example.com/dashboard/payments/result",
    "locale":"ru_RU",
    "capture":true,
    "customer":{"email":"ivan@example.com","phone":"+79991234567"}
  }'

cURL (poll status):
curl -H "Authorization: Bearer <ACCESS_TOKEN>" \
  "https://api.example.com/api/v1/payments/<paymentId>"

Ожидание статуса: при успешном вебхуке Payment.status → processed (и invoice синхронизируется).

---

## Известные ограничения (MVP)

- tax_system_code пока не отправляется (ожидаем настройки в Company/PaymentMethod)
- vat_code=1 (без НДС) по умолчанию — добавим маппинг при появлении полей налогов
- Частичная оплата — пропорциональная; финальные расхождения на уровне копеек корректируются последней позицией чека
- Фронт может опционально реализовать polling /payments/:id, но основным источником правды является вебхук YooKassa

---
