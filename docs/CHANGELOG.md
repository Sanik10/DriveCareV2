# path: docs/CHANGELOG.md

DriveCare V2 — CHANGELOG

Дата: 2025-09-15
Область: Frontend (Payments, Payment-Methods, Auth/Security, Shared API, UI)

Итог: Сборка проходит, ESLint — 0 предупреждений/ошибок. Next 15.4.2.

Ключевые изменения
- Безопасность и соответствие ФЗ/PCI:
  - Убрано хранение access/refresh токенов в localStorage на фронте. Авторизация через in-memory accessToken и httpOnly refresh cookie (152‑ФЗ, ПП РФ №1119).
  - deviceId сохраняется эпемерно в sessionStorage (только для UI-пометки текущего устройства), не в localStorage.
  - Единый apiRequest со стоп‑листом: блокирует вызовы system-only/webhooks/integrations/hard-delete; 401 auto-refresh; X‑Idempotency‑Key на write-операциях (161‑ФЗ/PCI, 54‑ФЗ).
  - Обновлена Frontend endpoints policy: /payments/online/init — ✅ Allowed (UI), refund/init — с X‑Idempotency‑Key.

- Payments (инициация/результат/деталь/листинг):
  - /dashboard/payments/result: серверная верификация статуса по /payments/:id; учёт статусов expired/chargeback как fail; безопасная очистка lastPaymentId.
  - /dashboard/payments/[id]: возврат через диалог (без prompt), валидация суммы/причины, идемпотентный вызов refund; UI‑гейтинг (owner/admin).
  - /dashboard/payments: типизация фильтров без any, убраны неиспользуемые импорты; баланс компании отображается независимо от листинга.
  - features/pay-invoice: при >1 активном online‑методе — выбор paymentMethodId; lastPaymentId сохраняется в sessionStorage.

- Payment-Methods (листинг/деталь/создание):
  - Полный перевод на apiRequest (stop‑лист, auth, 401‑refresh). Все write‑операции с X‑Idempotency‑Key (create/update/toggle/test/calculate/remove).
  - Деталь: скрытие секретов (input type="password", отключено автодополнение), явные предупреждения; роль‑гейтинг owner/admin (+легаси owner/admin).
  - Создание: убран несуществующий ConfirmDialog, вычищены ошибки линтера; сохранение через API с идемпотентностью.
  - Листинг: безопасная обработка ошибок, UI‑гейтинг на действия.

- Auth/Security:
  - use-auth: in-memory токен, авто‑refresh по cookie, без localStorage для токенов/пользователя; троттлинг и кэширование /auth/me; 0 PII в логах.
  - authAPI: login/register/register-invite — установка in-memory токена; deviceId сохраняется в sessionStorage; logout чистит in-memory токен.
  - securityAPI: переведён на apiRequest; кэширование/антиспам для /auth/sessions.
  - /dashboard/security: пометка “Это устройство” по deviceId из sessionStorage; 401 → logout и редирект на /login.

- Shared API/Components:
  - servicesAPI/usersAPI: нормализация разнородных ответов без any; поддержка {items}, {users}, массивов; подсчёт total/страниц.
  - AsyncCombobox/AsyncMultiSelect: снят any (AbortError через DOMException), предсказуемые типы T для meta.
  - ServicesMultiSelect: совместимость duration/durationMinutes без any.

- Invoices:
  - Деталь счёта: кнопка “Оплатить онлайн” доступна для CAN_RECORD_PAYMENT (owner/admin/manager); платежи по счёту — ссылки на детали платежей; возврат — только из деталки платежа с роль‑гейтингом.
  - Новый счёт (from order): мелкие правки клиента; без неиспользуемых импортов/переменных (линт 0).

Обновлённые/добавленные файлы
- Безопасность/ядро:
  - apps/frontend/lib/api/core.ts — расширен стоп‑лист (в т.ч. /subscriptions/check-expired), авто‑refresh, X‑Idempotency‑Key.
  - apps/frontend/lib/hooks/use-auth.ts — in-memory токен, кэш/троттлинг /auth/me, очистка без localStorage.
  - apps/frontend/lib/api/auth.ts — apiRequest; deviceId → sessionStorage; setAccessToken/clearAccessToken.

- Payments/Payment-Methods:
  - apps/frontend/lib/api/payments.ts — initOnline/refund/list/get/balance (идемпотентность на write).
  - apps/frontend/lib/api/payment-methods.ts — полный переход на apiRequest; X‑Idempotency‑Key на write/test/calc/remove.
  - apps/frontend/app/dashboard/payments/result/page.tsx — серверная верификация, финализация статусов.
  - apps/frontend/app/dashboard/payments/[id]/page.tsx — диалог возврата; валидации; UI‑гейтинг.
  - apps/frontend/app/dashboard/payments/page.tsx — чистка линта, типизация.
  - apps/frontend/app/dashboard/payment-methods/page.tsx — роль‑гейтинг; вызовы через apiRequest.
  - apps/frontend/app/dashboard/payment-methods/[id]/page.tsx — защита секретов, ввод/редактирование, test/calculate кнопки.
  - apps/frontend/app/dashboard/payment-methods/new/page.tsx — убран несуществующий ConfirmDialog, чистка линта.

- Auth/Security:
  - apps/frontend/lib/api/security.ts — apiRequest + кэширование/антиспам.
  - apps/frontend/app/dashboard/security/page.tsx — sessionStorage deviceId, корректный 401‑флоу.

- Shared:
  - apps/frontend/components/ui/async-combobox.tsx — без any; корректная обработка AbortError.
  - apps/frontend/components/ui/async-multiselect.tsx — без any; корректная обработка AbortError.
  - apps/frontend/components/appointments/selects/ServicesMultiSelect.tsx — снят any (legacy duration).
  - apps/frontend/lib/api/services.ts — без any, гибкая нормализация.
  - apps/frontend/lib/api/users.ts — без any, гибкая нормализация.
  - apps/frontend/lib/types.ts — реэкспорт PaymentInitResponse из ./types/payments (убрано дублирование).

- Invoices:
  - apps/frontend/app/dashboard/invoices/[id]/_client/Details.client.tsx — RBAC на оплату (owner/admin/manager).
  - apps/frontend/app/dashboard/invoices/new/_client/NewInvoice.client.tsx — линт 0.

- Документация/политики:
  - docs/frontend-endpoints-policy.md — добавлен POST /payments/online/init (✅ Allowed), пометки про X‑Idempotency‑Key.
  - docs/CHANGELOG.md — текущий файл.

Регуляторные соответствия
- 54‑ФЗ: чек формирует провайдер (YooKassa). Front не обрабатывает фискальные реквизиты; статусы подтверждаются сервером.
- 152‑ФЗ и ПП РФ №1119: минимизация ПДн и секретов на фронте; отсутствие токенов в localStorage; маскирование интеграционных ключей; отказ от логирования ПДн.
- 161‑ФЗ и PCI DSS: отсутствие сбора карточных реквизитов на фронте; идемпотентность платежных операций; запрет вызова system-only/webhooks.
- 115‑ФЗ: корректная индикация отказов/блокировок без излишних ПДн.

Побочные эффекты/миграция
- Если в окружении/старых вкладках браузера остались accessToken/refreshToken в localStorage — они игнорируются; желательно очистить их вручную или через логаут.
- deviceId хранится в sessionStorage (маркер текущего устройства). Для корректной пометки “Это устройство” требуется новая сессия после логина.
