# path: apps/frontend/docs/frontend/FSD_MIGRATION_TRACKER.md
# FSD + DDD-lite Migration Tracker (Frontend)

Легенда:
- ✅ Done
- 🛠 In progress
- 🧭 Planned
- ❓ Waiting info

## Wave 1 — Build/Lint Green + Invoices

- ✅ /dashboard/invoices и /dashboard/invoices/[id]: вынесены useSearchParams/useRouter в _client; страницы серверные под Suspense.
- ✅ /dashboard/invoices/new: переведена на Server + Suspense + _client (исправлен CSR‑bailout).
- ✅ (auth)/register/*: удалён styled‑jsx, переведено на CSS Modules.
- ✅ /dashboard/page.tsx: удалён styled‑jsx → dashboard.module.css; наведен порядок с типами.
- ✅ (auth)/login: удалён styled‑jsx → login.module.css.
- 🛠 Lint: остались предупреждения в ряде страниц/компонентов и в lib/api/*. Требуются точные файлы для безошибочных правок.

## Wave 2 — FSD Каркас и алиасы

- 🧭 Создать директории: shared/, entities/, features/, widgets/, providers/, store/ (+ .md заглушки).
- 🧭 Настроить tsconfig paths: @shared/*, @entities/*, @features/*, @widgets/*, @providers/*.

## Wave 3 — Data‑layer (invoices + payments)

- ✅ Получены статусы платежей с бэка: PaymentStatus (pending, processing, processed, failed, canceled, refunded, partially_refunded, disputed, chargeback, expired).
- ❓ Подтвердить контракт и поток для онлайновых платежей ЮKassa (где confirmationUrl?).
- 🧭 Разрезать lib/api → shared/api + entities/*/api; lib/types → entities/*/model.
- 🧭 entities/invoice, entities/payment: dto/types/mappers + api + ui.
- 🧭 features: pay-invoice (redirect), refund-payment (модалка+mutation).

## Wave 4 — Features

- 🧭 features/pay-invoice: mutation + toasts + redirect по confirmationUrl.
- 🧭 features/refund-payment: mutation + confirm dialog.
- 🧭 pages: /dashboard/payments, /dashboard/payments/[id], /dashboard/payments/result.

## Wave 5 — RBAC и UX сессии

- 🧭 shared/lib/hooks/use-permissions: флаги (canPay, canRefund, canViewFinReports и др.).
- 🧭 apiRequest: централизованный 401/403 (уведомление + мягкий редирект).

## Wave 6 — Документация/чистка

- 🧭 README, архитектурные правила, стоп‑лист, env.
- 🧭 Удаление legacy lib/api/* и lib/types/* после миграции.

---

## Lint → 0 warnings: чек‑лист оставшихся мест

Требуются файлы для правок без отключения правил:
- lib/api/core.ts
- lib/api/dashboard.ts
- lib/api/payment-methods.ts
- lib/api/orders.ts
- pages:
  - dashboard/customers/[id] — удалить неиспользуемые импорты
  - dashboard/parts — фикс зависимостей useEffect
  - dashboard/payment-methods/page|[id]|new — unused и deps
  - dashboard/orders/page|[id] — any типы
  - dashboard/vehicles/[id] — no-empty
- components:
  - orders/order-kanban.tsx — any типы
  - orders/order-service-add-dialog.tsx — any
  - vehicles/vehicle-create-dialog.tsx — зависимость useCallback (ensureCatalogueIds)

---

## Backend (ЮKassa init)

На текущем контракте PaymentResponseDto отсутствует confirmationUrl. YooKassaPaymentsClient содержит только checkPaymentStatus. Для реализации редиректа в UI требуется эндпоинт/DTO, возвращающий ссылку подтверждения.

Требуется:
- Подтвердить/прислать: где формируется confirmationUrl (эндпоинт/DTO/сервис init).
- Файлы:
  - apps/backend/src/modules/payments/services/payments-business.service.ts (получен)
  - apps/backend/src/modules/payments/services/payments-data.service.ts (получен)
  - apps/backend/src/modules/payments/payments.service.ts (получен)
  - apps/backend/src/modules/payments/services/yookassa-payments.client.ts (получен)
  - Если init выполняется в другом месте — пришлите соответствующий контроллер/DTO.

После подтверждения контракта добавим features/pay-invoice с редиректом и typed api-клиент.
