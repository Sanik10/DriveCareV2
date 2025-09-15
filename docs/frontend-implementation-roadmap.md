# Frontend Implementation Roadmap — DriveCare V2

Назначение
- Дать чёткий порядок подключения модулей фронтенда с учётом зависимостей (что от чего зависит).
- Снизить риски конфликтов (“этот модуль требует другой”), ускорить E2E.
- Зафиксировать базовые тех‑правила, чтобы предотвращать ошибки на этапе разработки.

Золотые правила (безопасность)
- Никаких вызовов из UI к:
  - /subscription-billing/webhooks/*
  - /payments/webhooks/*, /payments/system/*
  - /stock-movements/integrations/*
  - Любые :id/hard (hard‑delete PII/первички)
- Backoffice only (в клиентском UI не делать): CRUD тарифов, PATCH/DELETE в vehicles-catalogue, hard‑delete любых сущностей.
- Для write‑операций с риском повтора — добавлять X‑Idempotency‑Key (create/bulk/scan/reverse; billing payment; alerts batch/test и т. п.).

Глобальные предпосылки (быстрый технический базис)
- API‑клиенты через buildApiUrl (убрать локальные API_BASE).
- Добавить safeFetch‑guard (паттерны webhooks/system/integrations/hard‑delete → бросать ошибку).
- Удалить сохранение refreshToken из localStorage (RT — только httpOnly cookie).
- Привести форматы: для PATCH статус/назначение передавать данные в body JSON (не в query).
- UI‑гварды/фичегейты по ролям (скрывать недоступные действия, не полагаться лишь на 403).

0) Technical baseline (сделать сразу)
- Правки: lib/api/orders.ts (status/mechanic → body JSON), (опц.) lib/api/vehicles.ts (mileage → body).
- Безопасность: safeFetch‑guard; убрать refreshToken из localStorage; роль‑гейтинг в UI.
- Унификация: везде buildApiUrl.

Зачем: снижает риск ошибок и ускоряет дальнейшие интеграции.

---

## Порядок модулей с зависимостями (что за чем)

1) Core CRM вертикаль (основа)
1.1 Customers
- Предпосылки: Auth/Security.
- Что сделать: статус, экспорт ПДн, отзыв согласия, анонимизация, дашборд.
- Зачем: клиенты — ядро данных; нужны для Orders, Vehicles, Appointments.

1.2 Vehicles
- Предпосылки: Customers.
- Что сделать: (есть) листинг/деталь/создание/пробег; добавить статус, дашборд.
- Зачем: ТС участвуют в заказах, сервис‑истории, записях.

1.3 Services
- Предпосылки: —
- Что сделать: есть листинг/редактирование/создание; добавить toggle‑status, bulk‑update, категории/селекторы; quick/for‑select.
- Зачем: подавать состав работ в заказы.

1.4 Parts
- Предпосылки: —
- Что сделать: есть листинг/редактирование/создание/поиск; добавить toggle‑status, bulk‑update, (позже) stats/analytics/popular.
- Зачем: состав заказов и дальнейший склад.

2) Orders (операционная основа)
- Предпосылки: Customers, Vehicles, Services, Parts.
- Что сделать: довести статусные операции и назначение (body JSON), пересчёт, удаление линий, (опц.) availability для parts.
- Зачем: связывает CRM и готовит инвойсинг.

3) Payment Methods (довести мелочи)
- Предпосылки: —
- Что сделать: (есть) листинг/деталь/создание/тоггл; добавить test‑integration, calculate‑fee, (опц.) bulk‑update.
- Зачем: подготовка к финансовому контуру.

4) Финансы — Invoices → Payments (критично)
4.1 Invoices (счета)
- Предпосылки: Orders.
- Что сделать: list/detail, create/from‑order, статус/блокировки, поиск/селекты/дашборд.
- Зачем: первичка для платежей.

4.2 Payments (платежи)
- Предпосылки: Invoices, Payment Methods.
- Что сделать: record/list/detail/refund/update, analytics/balance (без webhooks).
- Зачем: E2E “счёт → платёж → статус” и фин‑аналитика.

5) Subscriptions (подписка компании) + Tariffs (read‑only)
- Предпосылки: Auth (owner/admin).
- Что сделать: status/history + действия (create/update/cancel), оплата тарифа (subscription‑billing/payment, X‑Idempotency‑Key), compliance report. Tariffs — только read‑only страницы.
- Зачем: монетизация платформы (для арендатора).

6) Склад/Инвентарь
6.1 Stock Movements
- Предпосылки: Parts (желательно Orders).
- Что сделать: list/detail, create/bulk/scan/reverse (X‑Idempotency‑Key), аналитика.
- Зачем: база складских операций.

6.2 Inventory Alerts
- Предпосылки: Parts (+ усиливается Stock Movements).
- Что сделать: list/detail, critical, settings, test (X‑Idempotency‑Key), batch dismiss (X‑Idempotency‑Key), cleanup.
- Зачем: операционная эффективность склада.

6.3 Suppliers
- Предпосылки: Parts (+ желательно Stock Movements).
- Что сделать: list/detail/create/update/deactivate/rate/analytics/price‑comparison.
- Зачем: замкнуть контур закупок и аналитики поставок.

7) Work Schedules (графики)
- Предпосылки: Users (для привязки).
- Что сделать: list/detail/create/update/delete, исключения (create/status/delete).
- Зачем: фундамент для планирования.

8) Appointments (записи)
- Предпосылки: Work Schedules, Customers, Vehicles.
- Что сделать: list/detail/create/update/cancel/reschedule, smart‑schedule, check‑availability, tracking, разрезы client/mechanic/dashboard.
- Зачем: планирование работ и загрузки.

9) Service History (история обслуживания)
- Предпосылки: Vehicles (желательно Orders).
- Что сделать: list/по авто, create/update/soft delete, статистика.
- Зачем: послепродажная аналитика и рекомендации.

10) Tariffs (public read‑only)
- Предпосылки: —
- Что сделать: /tariffs, /active, /popular, /compare, /:id.
- Зачем: лендинги/маркетинг; не блокирует процессы.

11) Сводные дашборды (агрегаторы)
- Предпосылки: готовность модульных stats/analytics (customers/vehicles/invoices/payments/inventory/…).
- Что сделать: собрать общий /dashboard из модульных источников.
- Зачем: предоставить ключевые метрики; логично делать в конце.

---

## Зависимости (краткая матрица)
- Orders ← Customers, Vehicles, Services, Parts
- Invoices ← Orders
- Payments ← Invoices + Payment Methods
- Subscriptions — независимы от Orders/Invoices (но логичнее после Payments)
- Stock Movements ← Parts (желательны Orders)
- Inventory Alerts ← Parts (усиливается Stock Movements)
- Suppliers ← Parts (+ Stock Movements)
- Appointments ← Work Schedules + Customers + Vehicles
- Service History ← Vehicles (+ Orders)

---

## Что можно делать параллельно
- Технические базовые правки (safeFetch, buildApiUrl, роль‑гейтинг) — сразу и параллельно.
- Payment Methods “кнопки” (test‑integration/calculate‑fee) — параллельно с Invoices.
- Categories для Services и bulk/status для Parts — параллельно.
- Public Tariffs — в любой момент (read‑only).

---

## Чек‑лист “Старт каждого модуля”
- Сверить эндпоинты с политикой (UI‑safe).
- Проверить формат запросов (body vs query) — статус/назначение/массовые операции.
- Для write‑операций — добавить X‑Idempotency‑Key (если поддержано).
- Скрыть недоступные действия по роли в UI.
- Везде использовать buildApiUrl; опционально safeFetch‑guard.

---

## Модули, которые не реализуем в клиентском UI
- Вебхуки: /subscription-billing/webhooks/*, /payments/webhooks/*.
- Системные: /payments/system/*, /stock-movements/integrations/*.
- Backoffice only: CRUD тарифов, hard‑delete, PATCH/DELETE в vehicles‑catalogue.

---

## Предложение по спринтам (черновой план)
- Sprint 0: Technical baseline (правки API‑клиентов, guard, buildApiUrl, роль‑гейтинг).
- Sprint 1: Invoices (list/detail/create/from‑order) + Payment Methods buttons.
- Sprint 2: Payments (record/list/detail/refund/analytics/balance) + E2E “счёт → платёж”.
- Sprint 3: Subscriptions (status/history/actions/payment) + Public Tariffs (read‑only).
- Sprint 4: Inventory — Stock Movements + Inventory Alerts; затем Suppliers.
- Sprint 5: Work Schedules + Appointments.
- Sprint 6: Service History + сводные дашборды.

---

## Риски и как их снимаем
- Несовпадение форматов (query vs body): придерживаться body JSON, проверять контроллеры.
- Повторные write‑операции: X‑Idempotency‑Key.
- Лишние права/действия: роль‑гейтинг в UI.
- Случайные запреты: safeFetch‑guard.
- Сводные дашборды: делать последними, когда источники готовы.
