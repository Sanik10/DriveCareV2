# Frontend Feature Tracker — DriveCare V2

Назначение: контроль выполнения UI по модулям. Статусы основаны на структуре frontend (app/*, components/*, lib/api/*), политике эндпоинтов и результате аудита страниц/клиентов.

Легенда статусов:
- [x] Сделано
- [~] Частично
- [ ] Не сделано
- 🚫 Не делать (запрещено политикой или out-of-scope для арендатора)

Имеющиеся frontend-модули (по коду, актуально):
- Страницы: auth (login/register), dashboard: customers, orders (+new/+detail), parts, payment-methods (+new/+detail), services, vehicles (+detail), security, invoices (+new/+detail)
- Компоненты: customers (create), orders (kanban, add part/service dialogs), parts (edit), services (edit), security (2FA, sessions), vehicles (create)
- API-клиенты: auth, customers, orders, parts, payment-methods, services, vehicles, security, vehicles-catalogue, invoices

Итого:
- Базовые модули CRM/склад — готовы.
- Операции по заказам — реализованы (включая сервисы/детали; статус/назначения — совместимы с текущим backend API).
- Финансы: Invoices — реализованы листинг/деталь/смена статуса/отмена, добавлены создание (вручную и из заказа), базовая аналитика (stats) и отчёт по просрочкам; селект‑опции — позже.
- Операционные модули (appointments/work-schedules/suppliers/alerts/stock-movements/service-history) — предстоят.

---

## Sprint 0 — Baseline: что сделано в коде

- [x] Единый безопасный API-клиент (lib/api/core.ts → apiRequest):
  - Stop-list guard: блокируются webhooks/system/integrations/hard-delete.
  - Авто refresh по 401 (POST /auth/refresh), повтор запроса, хранение accessToken в памяти.
  - Единый buildApiUrl, JSON body через init.json, X-Idempotency-Key поддержан.
- [x] Убран Mantine-зависимый Skeleton → локальный компонент (components/ui/skeleton.tsx).
- [x] Dashboard API: отказ от /dashboard* заглушек; сбор метрик из UI-safe ручек (/orders, /payments/analytics/balance, /inventory/alerts/low-stock).
- [x] Добавлена навигация на инвойсы с дашборда (карточка “Счета” → /dashboard/invoices).
- [x] Orders API (frontend): 
  - order-services status/mechanic → JSON body (в соответствии с backend).
  - order status/assign — оставлены в query (?status, ?mechanicId), как ожидает текущий backend.
- [x] Invoices (frontend): добавлены lib/types/invoices.ts, lib/api/invoices.ts, страницы /dashboard/invoices, /dashboard/invoices/new и /dashboard/invoices/[id]; поддержаны:
  - Листинг с фильтрами (status/search), пагинация.
  - Детальная страница счёта.
  - Создание: вручную (POST /invoices) и “из заказа” (POST /invoices/from-order).
  - Смена статуса (PATCH /invoices/:id/status).
  - Отмена/удаление счёта (DELETE /invoices/:id) — с подтверждением.
  - Базовая аналитика и отчёт: /invoices/stats/dashboard, /invoices/overdue/report.
- [x] Сборка Next проходит; устранены критичные TS-ошибки.

Что осталось по baseline:
- [ ] UX при истечении RT-cookie: уведомление/мягкий редирект (сейчас — авто refresh без уведомления).
- [~] Роль‑гейтинг в UI: точечно добавлен в Invoices (кнопки), нужен системный helper/компонент для всего приложения.

---

## 1) Auth + Security

Страницы: app/(auth)/login, register (+invite/success), dashboard/security  
API: lib/api/auth.ts, lib/api/security.ts

- [x] Логин/регистрация (компания/по инвайту)
- [x] 2FA (setup/enable/disable)
- [x] Сессии устройств, logout / logout-device / logout-all
- [~] Обработка истекших RT-cookie (есть авто refresh по 401; UX: уведомление/редирект — нет)
- [~] UI-гварды/фичегейты по ролям (точечно в Invoices; нужен общий helper по всему UI)

Приоритет: высокий (UX/безопасность)

---

## 2) Customers

Страницы: dashboard/customers, customers/[id]  
API: lib/api/customers.ts

- [x] Листинг клиентов
- [x] Детальная карточка
- [x] Создание (диалог)
- [ ] Изменение статуса (PATCH /customers/:id/status)
- [ ] Экспорт ПДн (GET /customers/:id/export) — API есть, UI нет
- [ ] Отзыв согласия (POST /customers/:id/consent/revoke) — API есть, UI нет
- [ ] Анонимизация (DELETE /customers/:id/anonymize)
- [ ] Дашборд статистики (GET /customers/stats/dashboard)

Приоритет: средний (правовые действия и аналитика)

---

## 3) Vehicles

Страницы: dashboard/vehicles, vehicles/[id]  
API: lib/api/vehicles.ts, vehicles-catalogue.ts

- [x] Листинг/деталь
- [x] Создание (диалог)
- [x] Обновление пробега (PATCH /vehicles/:id/mileage)
- [ ] Смена статуса (PATCH /vehicles/:id/status)
- [ ] Дашборд (GET /vehicles/stats/dashboard)
- [x] Использование каталога (brands/models/types) в селекторах

Приоритет: средний

---

## 4) Services (услуги) + Categories

Страницы: dashboard/services  
Компоненты: services/service-edit-dialog.tsx  
API: lib/api/services.ts

- [x] Листинг/редактирование (диалог)
- [x] Создание услуги
- [ ] Тоггл статуса (POST /services/:id/toggle-status)
- [ ] Массовые обновления (POST /services/bulk-update)
- [ ] Фильтрация по категориям + селекторы (GET /services/category/:categoryId, /for-select)
- [ ] Быстрые списки (GET /services/quick, /quick-services?maxDuration=)

Categories (бэкенд есть; отдельного UI нет):
- [ ] Лист/поиск/селекты/группировка (/services/categories/*)
- [ ] CRUD категорий (owner/admin/manager)
- 🚫 initialize-global (POST /services/categories/initialize-global) — только супер‑админ (бэкофис)

Приоритет: средний

---

## 5) Parts (запчасти)

Страницы: dashboard/parts  
Компоненты: parts/part-edit-dialog.tsx  
API: lib/api/parts.ts

- [x] Листинг
- [x] Редактирование
- [x] Создание
- [ ] Тоггл статуса (PATCH /parts/:id/status)
- [ ] Массовые обновления (PATCH /parts/bulk/update) + X-Idempotency-Key
- [x] Поиск (GET /parts/search/:query)
- [ ] Популярные (GET /parts/popular/list)
- [ ] Дашборд/аналитика (GET /parts/stats/dashboard, /parts/analytics/profitability)

Приоритет: средний

---

## 6) Orders (+ services/parts внутри заказа)

Страницы: dashboard/orders, orders/new, orders/[id]  
Компоненты: components/orders/* (kanban, add dialogs)  
API: lib/api/orders.ts

- [x] Листинг/деталь/создание заказа
- [x] Добавление услуг/запчастей (диалоги, X-Idempotency-Key на create)
- [x] Смена статуса заказа (PATCH /orders/:id/status) — backend ожидает ?status= (Query)
- [x] Назначение исполнителя (PATCH /orders/:id/assign) — backend ожидает ?mechanicId= (Query)
- [x] Пересчёт итогов (PATCH /orders/:id/recalculate)
- [x] Удаление услуг/запчастей из заказа
- [x] Управление статусами услуг (start/complete/status), назначение механика — JSON body (согласно backend)
- [ ] Проверка доступности запчасти (GET /orders/:orderId/parts/:partId/availability) — не подтверждено в UI

Примечание: изначальная рекомендация — status/mechanic в body JSON. Фронт приведён к текущему контракту бэкенда: для заказа — Query, для услуг — JSON.

Приоритет: высокий (операционные сценарии)

---

## 7) Payment Methods

Страницы: dashboard/payment-methods, payment-methods/new, payment-methods/[id]  
API: lib/api/payment-methods.ts

- [x] Листинг/деталь/создание
- [x] Тоггл статуса (POST /payment-methods/:id/toggle-status)
- [ ] Тест интеграции (POST /payment-methods/:id/test-integration)
- [ ] Расчёт комиссии (POST /payment-methods/:id/calculate-fee)
- [ ] Массовые обновления (POST /payment-methods/bulk-update)

Приоритет: средний

---

## 8) Invoices (счета)

Страницы: dashboard/invoices, invoices/new, invoices/[id]  
API: lib/api/invoices.ts

- [x] Листинг (GET /invoices) — фильтры status/search
- [x] Создание (POST /invoices) и “из заказа” (POST /invoices/from-order) — UI добавлен (/dashboard/invoices/new, поддержка ?orderId=)
- [~] Детальная карточка/блокировки после оплаты — карточка и смена статуса есть; ограничения по workflow применены в UI (нельзя изменить статус из PAID/CANCELED), доп. блокировки редактирования — в работе
- [~] Отмена/удаление (DELETE /invoices/:id) — есть подтверждение; регуляторные оговорки/UX (402‑ФЗ) — в работе
- [~] Поиск/селекты/дашборд — подключены /invoices/search/:query (typeahead), /invoices/stats/dashboard (карточки), /invoices/overdue/report (скачивание JSON); /invoices/select/options — не используется пока

Приоритет: критический (связка с Payments)

---

## 9) Payments (платежи) — добавить UI

Страницы: dashboard/payments, payments/[id]  
API: lib/api/payments.ts

- [ ] Создание платежа (POST /payments)
- [ ] Листинг/деталь (GET /payments, /:id)
- [ ] Рефанды (POST /payments/:id/refund)
- [ ] Обновление (PUT /payments/:id) — админ
- [ ] Баланс/аналитика (GET /payments/analytics/*)
- 🚫 Никаких вызовов /payments/webhooks/* и /payments/system/*

Приоритет: критический (Go‑Live: деньги)

---

## 10) Subscriptions (подписка компании) — добавить UI

Раздел: dashboard/billing/subscription  
API: lib/api/subscriptions.ts (+ при необходимости subscription-billing.ts)

- [ ] Активная подписка (GET /subscriptions/company/:companyId/active)
- [ ] История подписок (GET /subscriptions/company/:companyId)
- [ ] Создать/обновить/отменить (POST/PATCH /subscriptions/*)
- [ ] Оплата тарифа (POST /subscription-billing/payment) + X-Idempotency-Key
- [ ] Compliance report (GET /subscription-billing/compliance/report)
- 🚫 Webhooks (subscription-billing/webhooks/*) — system-only

Приоритет: высокий

---

## 11) Inventory Alerts (уведомления склада) — добавить UI

Страницы: dashboard/inventory/alerts  
API: lib/api/inventory-alerts.ts

- [ ] Листинг/деталь (GET /inventory/alerts, /:id)
- [ ] Критические (GET /inventory/alerts/critical/list)
- [ ] Настройки (GET/PATCH settings/current|update)
- [ ] Тест уведомления (POST /inventory/alerts/test/notification) + X-Idempotency-Key
- [ ] Массовое dismiss (POST /inventory/alerts/batch/dismiss) + X-Idempotency-Key
- [ ] Очистка истёкших (DELETE /inventory/alerts/cleanup/expired)

Приоритет: высокий

---

## 12) Stock Movements (движения склада) — добавить UI

Страницы: dashboard/stock-movements  
API: lib/api/stock-movements.ts

- [ ] Листинг/деталь (GET /stock-movements, /:id)
- [ ] Создать/массово/скан/реверс (POST /…, /bulk, /scan, /:id/reverse) + X-Idempotency-Key
- [ ] Аналитика (GET /stock-movements/analytics/*)
- 🚫 Интеграции (POST /stock-movements/integrations/*) — system-only

Приоритет: средний‑высокий

---

## 13) Suppliers (поставщики) — добавить UI

Страницы: dashboard/suppliers, suppliers/[id]  
API: lib/api/suppliers.ts

- [ ] Листинг/деталь/создание/обновление
- [ ] Деактивация, рейтинг, сравнение цен
- [ ] Аналитика по поставщику

Приоритет: средний

---

## 14) Appointments (записи) — добавить UI

Страницы: dashboard/appointments, appointments/new, appointments/[id]  
API: lib/api/appointments.ts

- [ ] Листинг/деталь/создание/обновление/отмена/перенос
- [ ] Smart‑schedule, check‑availability
- [ ] Трекинг (GET /appointments/:id/tracking)
- [ ] По клиенту/механику/дашборд

Приоритет: средний

---

## 15) Work Schedules (графики) — добавить UI

Страницы: dashboard/work-schedules  
API: lib/api/work-schedules.ts

- [ ] Листинг/деталь/создание/обновление/удаление
- [ ] Исключения (create/status/delete)

Приоритет: средний

---

## 16) Service History — добавить UI

Страницы: dashboard/service-history (+ вкладка на vehicle/[id])  
API: lib/api/service-history.ts

- [ ] Листинг (фильтры), история по авто
- [ ] Создание/обновление/мягкое удаление
- [ ] Дашборд статистики
- 🚫 Hard delete — только супер‑админ (бэкофис)

Приоритет: средний

---

## 17) Vehicles Catalogue (глобальный словарь)

Страниц нет — используется для селектов  
API: lib/api/vehicles-catalogue.ts

- [x] Используются GET /brands|models|types
- 🚫 CRUD каталога (PATCH/DELETE) — бэкофис платформы

Приоритет: низкий (как отдельные экраны)

---

## 18) Tariffs (публичный каталог тарифов)

Страниц нет  
API: lib/api/tariffs.ts (read‑only)

- [ ] Публичные страницы: /tariffs, /tariffs/active, /tariffs/popular, /tariffs/compare, /tariffs/:id
- 🚫 CRUD тарифов — бэкофис

Приоритет: низкий (маркетинговые страницы)

---

# Блок “Добавить API‑клиенты” (lib/api)

- [x] invoices.ts
- [ ] payments.ts
- [ ] subscriptions.ts (+ при необходимости subscription-billing.ts)
- [ ] inventory-alerts.ts
- [ ] stock-movements.ts
- [ ] suppliers.ts
- [ ] appointments.ts
- [ ] work-schedules.ts
- [ ] service-history.ts
- [ ] tariffs.ts (read‑only)

# Блок “Добавить типы” (lib/types)

- [x] invoices.ts
- [ ] payments.ts
- [ ] subscriptions.ts
- [ ] inventory-alerts.ts
- [ ] stock-movements.ts
- [ ] suppliers.ts
- [ ] appointments.ts
- [ ] work-schedules.ts
- [ ] service-history.ts
- [ ] tariffs.ts

# Роуты (app/dashboard) — прогресс

- [x] dashboard/invoices, invoices/new, invoices/[id]
- [ ] dashboard/payments, payments/[id]
- [ ] dashboard/inventory/alerts
- [ ] dashboard/stock-movements
- [ ] dashboard/suppliers, suppliers/[id]
- [ ] dashboard/appointments, appointments/new, appointments/[id]
- [ ] dashboard/work-schedules
- [ ] dashboard/service-history (+ вкладка на vehicle/[id])
- [ ] dashboard/billing/subscription (статус/оплата тарифа)

# Политика безопасности (напоминания)

- 🚫 Не вызывать из UI: /payments/webhooks/*, /payments/system/*, /subscription-billing/webhooks/*, /stock-movements/integrations/*
- 🧰 Backoffice only: CRUD тарифов, hard‑delete PII/первички, каталог PATCH/DELETE
- ✅ Для write‑операций, где поддержано — отправлять X‑Idempotency‑Key

---

# Frontend API Usage Audit (актуализация)

Основано на файлах:
- apps/frontend/lib/api/{auth,security,customers,vehicles,vehicles-catalogue,services,parts,orders,payment-methods,core,invoices,dashboard}.ts

Легенда:
- ✅ OK — корректные и разрешённые эндпоинты
- ⚠️ GAP — отсутствует важный эндпоинт (рекомендация добавить)
- 🛠 FIX — несоответствие формату/маршруту (нужна правка)
- 🚫 FORBIDDEN — запрещённый эндпоинт (не найден — хорошо)

Итог:
- Запрещённые эндпоинты не дергаются (stop‑list guard — включён).
- Orders: для order-services переведено на body JSON; для order status/assign — оставлено Query по текущему контракту backend (рекомендуется в будущем унифицировать).
- Dashboard: заменены /dashboard* на реальные UI‑safe ручки модулей.
- Унификация API: везде через apiRequest/buildApiUrl, refresh на 401.

Подробно:
- Auth/Security — ✅ OK
- Customers — ✅ OK, GAP: status/anonymize/stats UI
- Vehicles — ✅ OK, GAP: status/stats UI
- Services — ✅ OK, GAP: toggle/bulk/category/quick
- Parts — ✅ OK, GAP: status/bulk/stats/analytics (search — уже есть)
- Orders — 🛠 FIX частично: order-services → JSON body (готово); order status/assign остаются в Query (требуется серверная унификация для полного перехода)
- Payment Methods — ✅ OK, GAP: test-integration/calculate-fee/bulk
- Vehicles‑Catalogue — ✅ OK (GET), CRUD не используем
- Core — ✅ OK: runtime‑guard, refresh, idempotency, buildApiUrl
- Dashboard API — ✅ OK: сборка из модульных ручек (orders/payments/inventory)

---
