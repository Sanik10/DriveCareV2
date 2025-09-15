# FSD + DDD-lite Migration Tracker (Frontend)

Контекст: Next.js App Router, React 19, TS 5, Tailwind. Цель — FSD + DDD‑lite, строгие границы Server/Client, единый data‑layer, типобезопасность, единый UX ошибок/сессий.

Легенда статусов:
- ✅ Done
- 🛠 In progress
- 🧭 Planned
- ❓ Waiting info

## Wave 1 — Build/Lint Green + Invoices

- ✅ /dashboard/invoices: вынесены useSearchParams/useRouter в _client, страницы обёрнуты в Suspense:
  - app/dashboard/invoices/page.tsx → server-only
  - app/dashboard/invoices/_client/List.client.tsx → CSR
  - app/dashboard/invoices/[id]/page.tsx → server-only
  - app/dashboard/invoices/[id]/_client/Details.client.tsx → CSR
- ✅ Удалён styled‑jsx на страницах регистрации (auth/register):
  - (auth)/register/page.tsx → CSS Modules
  - (auth)/register/invite/page.tsx → CSS Modules
  - (auth)/register/success/page.tsx → CSS Modules
- 🛠 Закрытие lint‑warning’ов: актуальные правки в затронутых файлах, без eslint-disable.
- ❓ Осталось: app/dashboard/page.tsx — удалить styled‑jsx (нужен файл).

## Wave 2 — FSD Каркас и алиасы

- 🧭 Создать директории: shared/, entities/, features/, widgets/, providers/, store/.
- 🧭 Настроить tsconfig paths: @shared/*, @entities/*, @features/*, @widgets/*, @providers/*.
- 🧭 Перенести базовый UI в shared/ui; доменные UI — в entities/*/ui.

## Wave 3 — Data‑layer разрезание (invoices + payments)

- 🧭 shared/api/core.ts — общий клиент (apiRequest, endpoints, stop‑list, refresh 401, X‑Idempotency‑Key).
- 🧭 entities/invoice: model/{dto,types,mappers}.ts + api/invoices.api.ts + ui/*
- 🧭 entities/payment: model/{dto,types,mappers}.ts + api/payments.api.ts + ui/*
- ❓ Нужны файлы/контракты c бэка: payments.types.ts, PaymentResponseDTO (где confirmationUrl), статусы invoices.

## Wave 4 — Features (критичные сценарии)

- 🧭 features/pay-invoice: mutation + toasts + redirect по confirmationUrl.
- 🧭 features/refund-payment: mutation + модалка.
- 🧭 pages: /dashboard/payments, /dashboard/payments/[id], /dashboard/payments/result.

## Wave 5 — RBAC и UX сессии

- 🧭 shared/lib/hooks/use-permissions.ts — флаги canPay, canRefund, ...
- 🧭 apiRequest: централизованный 401/403 (уведомление + мягкий редирект).

## Wave 6 — Документация/чистка

- 🧭 README обновление: структура, алиасы, стоп‑лист, переменные окружения.
- 🧭 Удаление legacy lib/api/* и lib/types/* после миграции в entities/*.

Зависимости/ожидания:
- ❓ Прислать: 
  - apps/frontend/lib/api/core.ts
  - apps/frontend/lib/api/payments.ts
  - apps/frontend/lib/types/{invoices.ts,payments.ts}
  - apps/backend/src/modules/payments/types/payments.types.ts
  - apps/backend/src/modules/payments/dto/request/record-payment.dto.ts
  - apps/backend/src/modules/payments/dto/response/payment-response.dto.ts
  - apps/backend/src/modules/payments/payments.controller.ts
  - apps/backend/src/modules/invoices/types/invoices.types.ts
- ❓ RBAC: финальная матрица на pay/refund/test-integration.
