# path: docs/SECURITY_FRONTEND.md
# Frontend Security Posture (Payments, Auth, Methods)

Что важно
- Не хранить токены в localStorage/sessionStorage; accessToken — только в памяти, refresh — httpOnly cookie.
- deviceId хранится только в sessionStorage для UI‑пометки (эпемерно).
- Любые денежные write‑операции — с X‑Idempotency‑Key.
- Никогда не вызывать webhooks/system/integrations ручки из UI (стоп‑лист на клиенте).
- Не логировать ПДн/секреты/реквизиты; не показывать ключи интеграций в UI.

Точки контроля
- apiRequest (lib/api/core.ts):
  - Stop‑list: /payments/webhooks/*, /payments/system/*, /subscription-billing/webhooks/*, /stock-movements/integrations/*, любые /:id/hard, /subscriptions/check-expired.
  - 401 → авто‑refresh; повтор только 1 раз.
  - X‑Idempotency‑Key для init/refund/payment-methods mutating ops.
- Payments UI:
  - Роль‑гейтинг: Refund — только owner/admin. Оплата онлайн — owner/admin/manager.
  - Результат оплаты: статус только с бэка (GET /payments/:id), игнорировать query провайдера.
- Payment-Methods:
  - Секреты скрыты (password), отключены автозаполнение/автокоррекция; видны только owner/admin.
- Security/Auth:
  - /auth/me кэшируется кратковременно; 401 → мягкий logout+редирект.
  - Сессии устройств: текущий девайс определяется по deviceId из sessionStorage; logout‑all очищает состояние.

Нормативные ориентиры
- 54‑ФЗ — чек на стороне провайдера (ОФД); мы передаём агрегированные позиции (без фискальных реквизитов).
- 152‑ФЗ, ПП РФ № 1119 — минимизация ПДн, запрет хранения секретов/токенов в небезопасных хранилищах.
- 161‑ФЗ/PCI DSS — отсутствие карточных данных на фронте; строгий стоп‑лист; идемпотентность.
- 115‑ФЗ — корректное отображение статусов/отказов, без лишних ПДн.
