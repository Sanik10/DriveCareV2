<!-- path: docs/BILLING_SETUP.md -->
# Billing Setup (YooKassa/Tinkoff) + Return Flow

1) ENV (backend)
- FRONTEND_URL: https://front.example.com (без завершающего слеша)
- NEXT_PUBLIC_API_URL: https://api.example.com/api/v1 (во фронте)
- YOOKASSA_SHOP_ID / YOOKASSA_SECRET_KEY — из кабинета YooKassa
- DEFAULT_PAYMENT_PROVIDER=yookassa
- SERVER_REGION=RU, SERVER_LOCATION=Russia, DATA_PROCESSING_LOCATION=RU (ФЗ‑242)

2) YooKassa
- Return URL в кабинете: https://front.example.com/dashboard/payments/result
  (бэк добавляет ?context=subscription автоматически)
- Webhook (опционально): POST https://api.example.com/api/v1/subscription-billing/webhooks/yookassa
  Важно: raw-body не должен модифицироваться прокси.

3) CORS
- Разрешить домен фронта на бэке: http(s)://front.example.com

4) Поток оплаты (подписка)
- POST /subscription-billing (создать PENDING)
- POST /subscription-billing/payment → redirectUrl (сохраняем paymentId в sessionStorage)
- Возврат → /dashboard/payments/result?context=subscription
  - Страница опрашивает GET /subscription-billing/active (до 60с)
  - При ACTIVE → “Подписка активирована”, кнопка в /dashboard/billing

5) Отладка
- 404 на /subscription-billing: проверить, что SubscriptionBillingModule импортирован и AppModule подключает SubscriptionsModule.
- 401/403: проверить роли (superadmin/platform_admin/company_owner/company_admin).
- Ошибки YooKassa — дадут 400/500, но не 404.
