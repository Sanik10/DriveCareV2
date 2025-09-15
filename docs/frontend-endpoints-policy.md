# Frontend endpoints policy (UI-safe vs System-only)

Префикс всех путей: /api/v1

Назначение: фиксируем, какие API-эндпоинты можно использовать во фронтенде (UI), а какие системные и запрещены для UI (webhooks/cron/internal).

Легенда:
- ✅ Allowed (UI): можно вызывать из фронтенда (с учётом RBAC)
- ⚠️ Admin-only (tenant): только для владельца/админа компании (UI для админов)
- 🧰 Backoffice (platform): только платформенные роли (superadmin/platform_admin), не для клиентского UI
- ⛔ System-only: системные/вебхуки/cron/интеграции — нельзя вызывать из фронтенда

Примечания:
- Везде подразумевается multi-tenant защита (JwtAuthGuard + AuthWithOwnership/CompanyOwnershipGuard).
- Роли 'owner'/'admin' в некоторых контроллерах = 'company_owner'/'company_admin' (легаси-алиасы).
- Идемпотентность: отправляйте X-Idempotency-Key там, где поддержано (см. примечания).

---

## Auth

| Method | Path | Категория |
|---|---|---|
| POST | /auth/login | ✅ |
| POST | /auth/register-company | ✅ |
| POST | /auth/register-invite | ✅ |
| POST | /auth/refresh | ✅ |
| POST | /auth/logout | ✅ |
| POST | /auth/logout-device | ✅ |
| POST | /auth/logout-all-devices | ✅ |
| GET | /auth/sessions | ✅ |
| GET | /auth/me | ✅ |
| POST | /auth/2fa/setup | ✅ |
| POST | /auth/2fa/enable | ✅ |
| POST | /auth/2fa/disable | ✅ |

---

## Users

| Method | Path | Категория |
|---|---|---|
| POST | /users | ⚠️ |
| GET | /users | ⚠️ |
| GET | /users/:id | ⚠️ |
| PATCH | /users/:id/profile | ⚠️ |
| PATCH | /users/:id/role | ⚠️ |
| PATCH | /users/:id/status | ⚠️ |
| PATCH | /users/:id/password | ⚠️ |
| DELETE | /users/:id | ⚠️ |
| PATCH | /users/me/profile | ✅ |
| POST | /users/me/deactivate | ✅ |
| GET | /users/me/export | ✅ |
| POST | /users/me/consent/revoke | ✅ |

---

## Companies

| Method | Path | Категория |
|---|---|---|
| POST | /companies | ⚠️ |
| GET | /companies | ⚠️ |
| GET | /companies/:id | ⚠️ |
| PATCH | /companies/:id | ⚠️ |
| DELETE | /companies/:id | 🧰 |
| PATCH | /companies/:id/status | 🧰 |

---

## Tariffs (глобальные тарифы)

| Method | Path | Категория |
|---|---|---|
| GET | /tariffs | ✅ (read-only) |
| GET | /tariffs/active | ✅ (read-only) |
| GET | /tariffs/popular | ✅ (read-only) |
| GET | /tariffs/compare | ✅ (read-only) |
| GET | /tariffs/:id | ✅ (read-only) |
| POST | /tariffs | 🧰 |
| PATCH | /tariffs/:id | 🧰 |
| PATCH | /tariffs/:id/status | 🧰 |
| DELETE | /tariffs/:id | 🧰 |

---

## Subscriptions (подписки компаний)

| Method | Path | Роли | Категория | Примечание |
|---|---|---|---|---|
| POST | /subscriptions | superadmin, platform_admin, company_owner, company_admin | ⚠️ | Идемпотентность: X-Idempotency-Key |
| GET | /subscriptions/company/:companyId | (Auth + CompanySubscriptions) | ✅ | Листинг по компании (guard проверяет принадлежность) |
| GET | /subscriptions/company/:companyId/active | (Auth + CompanySubscriptions) | ✅ | Активная подписка (read-only) |
| GET | /subscriptions/:id | superadmin, platform_admin, company_owner, company_admin, cashier, auditor | ✅ | Детали |
| PATCH | /subscriptions/:id | superadmin, platform_admin, company_owner | ⚠️ | Обновление (строгие роли) |
| PATCH | /subscriptions/:id/cancel | superadmin, platform_admin, company_owner | ⚠️ | Отмена: только owner/platform |
| POST | /subscriptions/check-expired | superadmin, platform_admin, system_operator | ⛔ | CRON/system-only |

---

## Subscription-Billing (оплата тарифа, webhooks)

| Method | Path | Категория | Примечание |
|---|---|---|---|
| POST | /subscription-billing | ⚠️ | Создать (PENDING). X-Idempotency-Key |
| POST | /subscription-billing/payment | ⚠️ | Оплатить подписку. X-Idempotency-Key |
| DELETE | /subscription-billing/:id | ⚠️ | Отмена |
| GET | /subscription-billing/active | ✅ | Read-only |
| GET | /subscription-billing/compliance/report | ⚠️ | Отчёт владельцу |
| POST | /subscription-billing/webhooks/:provider | ⛔ | Webhooks (raw-body/signature) |

---

## Payment-Methods

| Method | Path | Категория |
|---|---|---|
| GET | /payment-methods | ✅ |
| GET | /payment-methods/stats | ✅ |
| GET | /payment-methods/search | ✅ |
| GET | /payment-methods/quick | ✅ |
| GET | /payment-methods/for-select | ✅ |
| GET | /payment-methods/type/:type | ✅ |
| GET | /payment-methods/:id | ✅ |
| GET | /payment-methods/:id/availability | ✅ |
| GET | /payment-methods/:id/limits | ✅ |
| POST | /payment-methods | ⚠️ |
| POST | /payment-methods/bulk-update | ⚠️ |
| POST | /payment-methods/:id/test-integration | ⚠️ |
| POST | /payment-methods/:id/calculate-fee | ⚠️ |
| PATCH | /payment-methods/:id | ⚠️ |
| POST | /payment-methods/:id/toggle-status | ⚠️ |
| DELETE | /payment-methods/:id | ⚠️ |

---

## Payments (платежи по инвойсам)

| Method | Path | Категория | Примечание |
|---|---|---|---|
| POST | /payments | ✅ | Создание платежа |
| GET | /payments | ✅ | Листинг с фильтрами |
| GET | /payments/:id | ✅ | Детали |
| POST | /payments/online/init | ✅ | Онлайн-инициация оплаты (redirect). X-Idempotency-Key |
| PUT | /payments/:id | ⚠️ | Обновить статус/метаданные |
| POST | /payments/:id/refund | ⚠️ | Возврат (полный/частичный). X-Idempotency-Key |
| GET | /payments/analytics/statistics | ⚠️ | Фин. аналитика |
| GET | /payments/analytics/balance | ✅ | Баланс компании |
| DELETE | /payments/:id | ⚠️ | Опасная операция (предпочтителен refund) |
| POST | /payments/system/process-overdue | ⛔ | System-only |
| POST | /payments/webhooks/yookassa | ⛔ | System-only (ACL, raw-body, идемпотентность) |
| POST | /payments/webhooks/tinkoff | ⛔ | System-only (ACL, raw-body, идемпотентность) |

---

## Invoices

| Method | Path | Категория |
|---|---|---|
| POST | /invoices | ✅ |
| POST | /invoices/from-order | ✅ |
| GET | /invoices | ✅ |
| GET | /invoices/:id | ✅ |
| PATCH | /invoices/:id | ⚠️ |
| PATCH | /invoices/:id/status | ⚠️ |
| DELETE | /invoices/:id | ⚠️ |
| GET | /invoices/stats/dashboard | ⚠️ |
| GET | /invoices/overdue/report | ⚠️ |
| GET | /invoices/search/:query | ✅ |
| GET | /invoices/select/options | ✅ |

---

## Orders (общие)

| Method | Path | Категория |
|---|---|---|
| POST | /orders | ✅ |
| GET | /orders | ✅ |
| GET | /orders/:id | ✅ |
| PATCH | /orders/:id | ⚠️ |
| PATCH | /orders/:id/status | ⚠️ |
| PATCH | /orders/:id/assign | ⚠️ |
| DELETE | /orders/:id | ⚠️ |
| PATCH | /orders/:id/recalculate | ⚠️ |

### Orders: Services (по заказу)

| Method | Path | Роли | Категория |
|---|---|---|---|
| POST | /orders/:orderId/services | owner, admin, manager | ✅ |
| GET | /orders/:orderId/services | (Auth+OrderResource) | ✅ |
| PATCH | /orders/:orderId/services/:serviceId | owner, admin, manager | ⚠️ |
| DELETE | /orders/:orderId/services/:serviceId | owner, admin, manager | ⚠️ |
| PATCH | /orders/:orderId/services/:serviceId/status | owner, admin, manager, mechanic, lead_mechanic | ⚠️ |
| PATCH | /orders/:orderId/services/:serviceId/mechanic | owner, admin, manager, lead_mechanic | ⚠️ |
| PATCH | /orders/:orderId/services/:serviceId/start | owner, admin, manager, mechanic, lead_mechanic | ⚠️ |
| PATCH | /orders/:orderId/services/:serviceId/complete | owner, admin, manager, mechanic, lead_mechanic | ⚠️ |

### Orders: Parts (по заказу)

| Method | Path | Роли | Категория |
|---|---|---|---|
| POST | /orders/:orderId/parts | owner, admin, manager | ✅ |
| GET | /orders/:orderId/parts | (Auth+OrderResource) | ✅ |
| PATCH | /orders/:orderId/parts/:partId | owner, admin, manager | ⚠️ |
| DELETE | /orders/:orderId/parts/:partId | owner, admin, manager | ⚠️ |
| PATCH | /orders/:orderId/parts/:partId/customer-provided | owner, admin, manager | ⚠️ |
| GET | /orders/:orderId/parts/:partId/availability | (Auth+OrderResource) | ✅ |

---

## Customers

| Method | Path | Категория |
|---|---|---|
| POST | /customers | ✅ |
| GET | /customers | ✅ |
| GET | /customers/:id | ✅ |
| PATCH | /customers/:id | ⚠️ |
| DELETE | /customers/:id | ⚠️ |
| DELETE | /customers/:id/hard | 🧰 |
| PATCH | /customers/:id/status | ⚠️ |
| GET | /customers/stats/dashboard | ⚠️ |
| GET | /customers/:id/export | ✅ |
| POST | /customers/:id/consent/revoke | ✅ |
| DELETE | /customers/:id/anonymize | ⚠️ |

---

## Vehicles

| Method | Path | Категория |
|---|---|---|
| POST | /vehicles | ✅ |
| GET | /vehicles | ✅ |
| GET | /vehicles/customer/:customerId | ✅ |
| GET | /vehicles/stats/dashboard | ⚠️ |
| GET | /vehicles/:id | ✅ |
| PATCH | /vehicles/:id | ⚠️ |
| PATCH | /vehicles/:id/mileage | ⚠️ |
| PATCH | /vehicles/:id/status | ⚠️ |
| DELETE | /vehicles/:id | ⚠️ |
| DELETE | /vehicles/:id/hard | 🧰 |

---

## Vehicles-Catalogue (глобальный словарь)

Brands:
| Method | Path | Категория |
|---|---|---|
| GET | /vehicles-catalogue/brands | ✅ |
| GET | /vehicles-catalogue/brands/:id | ✅ |
| POST | /vehicles-catalogue/brands | ⚠️ |
| PATCH | /vehicles-catalogue/brands/:id | 🧰 |
| DELETE | /vehicles-catalogue/brands/:id | 🧰 |

Models:
| Method | Path | Категория |
|---|---|---|
| GET | /vehicles-catalogue/models | ✅ |
| GET | /vehicles-catalogue/models/:id | ✅ |
| POST | /vehicles-catalogue/models | ⚠️ |
| PATCH | /vehicles-catalogue/models/:id | 🧰 |
| DELETE | /vehicles-catalogue/models/:id | 🧰 |

Types:
| Method | Path | Категория |
|---|---|---|
| GET | /vehicles-catalogue/types | ✅ |
| GET | /vehicles-catalogue/types/:id | ✅ |
| POST | /vehicles-catalogue/types | ⚠️ |
| PATCH | /vehicles-catalogue/types/:id | 🧰 |
| DELETE | /vehicles-catalogue/types/:id | 🧰 |

---

## Services (услуги)

| Method | Path | Роли | Категория | Примечание |
|---|---|---|---|---|
| GET | /services | (Auth) | ✅ | С фильтрами |
| GET | /services/stats | (Auth) | ✅ | |
| GET | /services/search?q= | (Auth) | ✅ | |
| GET | /services/quick | (Auth) | ✅ | Быстрые услуги |
| GET | /services/for-select | (Auth) | ✅ | Для селектов |
| GET | /services/category/:categoryId | (Auth) | ✅ | По категории |
| GET | /services/price-range | (Auth) | ✅ | minPrice/maxPrice |
| GET | /services/quick-services?maxDuration= | (Auth) | ✅ | |
| GET | /services/:id | (Auth+ServiceResource) | ✅ | |
| GET | /services/:id/availability | (Auth+ServiceResource) | ✅ | |
| POST | /services | owner, admin, manager | ⚠️ | |
| POST | /services/bulk-update | owner, admin | ⚠️ | Массовое обновление |
| PATCH | /services/:id | owner, admin, manager | ⚠️ | |
| POST | /services/:id/toggle-status | owner, admin, manager | ⚠️ | |
| DELETE | /services/:id | owner, admin | ⚠️ | |

---

## Service Categories

| Method | Path | Роли | Категория |
|---|---|---|---|
| GET | /services/categories | (Auth) | ✅ |
| GET | /services/categories/stats | (Auth) | ✅ |
| GET | /services/categories/search?q= | (Auth) | ✅ |
| GET | /services/categories/for-select | (Auth) | ✅ |
| GET | /services/categories/with-services-count | (Auth) | ✅ |
| GET | /services/categories/grouped | (Auth) | ✅ |
| GET | /services/categories/:id | (Auth+ServiceCategoryResource) | ✅ |
| POST | /services/categories | owner, admin, manager | ⚠️ |
| POST | /services/categories/initialize-global | superadmin | 🧰 |
| PATCH | /services/categories/:id | owner, admin, manager | ⚠️ |
| DELETE | /services/categories/:id | owner, admin | ⚠️ |

---

## Service History

| Method | Path | Роли | Категория | Примечание |
|---|---|---|---|---|
| POST | /service-history | owner, admin, manager, mechanic | ✅ | |
| GET | /service-history | (Auth) | ✅ | Фильтры; superadmin обязан указать ?companyId |
| GET | /service-history/vehicle/:vehicleId | (Auth) | ✅ | История по авто |
| GET | /service-history/stats/dashboard | owner, admin, manager | ⚠️ | |
| GET | /service-history/:id | (Auth+ServiceHistoryResource) | ✅ | |
| PATCH | /service-history/:id | owner, admin, manager, mechanic | ⚠️ | |
| DELETE | /service-history/:id | owner, admin | ⚠️ | Soft delete |
| DELETE | /service-history/:id/hard | superadmin | 🧰 | Полное удаление (Backoffice) |

---

## Appointments (записи)

| Method | Path | Категория |
|---|---|---|
| POST | /appointments | ✅ |
| GET | /appointments | ✅ |
| GET | /appointments/:id | ✅ |
| PATCH | /appointments/:id | ⚠️ |
| DELETE | /appointments/:id | ⚠️ |
| DELETE | /appointments/:id/hard | 🧰 |
| POST | /appointments/smart-schedule | ✅ |
| POST | /appointments/check-availability | ✅ |
| POST | /appointments/:id/confirm | ⚠️ |
| POST | /appointments/:id/complete | ⚠️ |
| POST | /appointments/:id/cancel | ⚠️ |
| POST | /appointments/:id/reschedule | ⚠️ |
| GET | /appointments/:id/tracking | ✅ |
| GET | /appointments/customer/:customerId | ✅ |
| GET | /appointments/mechanic/:mechanicId | ✅ |
| GET | /appointments/stats/dashboard | ⚠️ |
| POST | /appointments/:id/rating | ✅ |

---

## Inventory (сводка/резервы)

| Method | Path | Категория | Примечание |
|---|---|---|---|
| GET | /inventory | ✅ | |
| GET | /inventory/summary/overview | ✅ | |
| GET | /inventory/alerts/low-stock | ✅ | |
| GET | /inventory/availability/:partId | ✅ | |
| GET | /inventory/reports/turnover | ⚠️ | |
| POST | /inventory/reserve | ✅ | X-Idempotency-Key |
| DELETE | /inventory/reserve/:reservationId | ✅ | |
| GET | /inventory/:id | ✅ | |
| PATCH | /inventory/:id | ⚠️ | |

---

## Inventory/Parts

| Method | Path | Категория |
|---|---|---|
| GET | /parts | ✅ |
| GET | /parts/:id | ✅ |
| POST | /parts | ⚠️ |
| PATCH | /parts/:id | ⚠️ |
| DELETE | /parts/:id | ⚠️ |
| PATCH | /parts/:id/status | ⚠️ |
| PATCH | /parts/bulk/update | ⚠️ |
| GET | /parts/search/:query | ✅ |
| GET | /parts/category/:categoryId | ✅ |
| GET | /parts/popular/list | ✅ |
| GET | /parts/stats/dashboard | ⚠️ |
| GET | /parts/analytics/profitability | ⚠️ |

---

## Inventory/Stock-Movements

| Method | Path | Категория | Примечание |
|---|---|---|---|
| GET | /stock-movements | ✅ | |
| GET | /stock-movements/:id | ✅ | |
| POST | /stock-movements | ⚠️ | X-Idempotency-Key |
| PATCH | /stock-movements/:id | ⚠️ | |
| POST | /stock-movements/bulk | ⚠️ | X-Idempotency-Key |
| POST | /stock-movements/scan | ⚠️ | X-Idempotency-Key |
| POST | /stock-movements/:id/reverse | ⚠️ | X-Idempotency-Key |
| GET | /stock-movements/analytics/summary | ⚠️ | |
| GET | /stock-movements/part/:partId/history | ✅ | |
| GET | /stock-movements/analytics/data | ⚠️ | |
| POST | /stock-movements/integrations/from-order | ⛔ | Server-to-server |
| POST | /stock-movements/integrations/from-delivery | ⛔ | Server-to-server |

---

## Inventory/Suppliers

| Method | Path | Категория |
|---|---|---|
| GET | /suppliers | ✅ |
| GET | /suppliers/:id | ✅ |
| POST | /suppliers | ⚠️ |
| PATCH | /suppliers/:id | ⚠️ |
| PATCH | /suppliers/:id/deactivate | ⚠️ |
| POST | /suppliers/bulk | ⚠️ |
| POST | /suppliers/:id/rate | ✅ |
| GET | /suppliers/:id/price-comparison/:partId | ✅ |
| GET | /suppliers/best-for-part/:partId | ✅ |
| GET | /suppliers/top/performers | ✅ |
| GET | /suppliers/:id/analytics | ⚠️ |

---

## Inventory/Alerts (уведомления)

| Method | Path | Роли | Категория | Примечание |
|---|---|---|---|---|
| GET | /inventory/alerts/analytics/stats | superadmin, company_owner, company_admin, inventory_manager | ⚠️ | |
| GET | /inventory/alerts/critical/list | superadmin, company_owner, company_admin, inventory_manager | ✅ | |
| GET | /inventory/alerts/settings/current | superadmin, company_owner, company_admin, inventory_manager | ⚠️ | |
| PATCH | /inventory/alerts/settings/update | company_owner, company_admin | ⚠️ | |
| POST | /inventory/alerts/test/notification | company_owner, company_admin | ⚠️ | X-Idempotency-Key |
| DELETE | /inventory/alerts/cleanup/expired | company_owner, company_admin | ⚠️ | Housekeeping (tenant-admin) |
| POST | /inventory/alerts/batch/dismiss | company_owner, company_admin, inventory_manager | ⚠️ | X-Idempotency-Key |
| GET | /inventory/alerts | superadmin, company_owner, company_admin, inventory_manager | ✅ | |
| GET | /inventory/alerts/:id | superadmin, company_owner, company_admin, inventory_manager | ✅ | |
| DELETE | /inventory/alerts/:id/dismiss | company_owner, company_admin, inventory_manager | ✅ | |

---

# Стоп-лист (НЕ вызывать из фронта)
- ⛔ /subscription-billing/webhooks/*
- ⛔ /payments/webhooks/*
- ⛔ /payments/system/*
- ⛔ /stock-movements/integrations/*
- ⛔ “hard”-удаления PII/первички из клиентского UI (используются только в бэкофисе платформы): например, /service-history/:id/hard, /customers/:id/hard, /vehicles/:id/hard
- ⛔ Любые специфичные CRON/внутренние ручки (если не требуется защищённый админ-UI). Пример: /subscriptions/check-expired

# Рекомендации по UI
- Идемпотентность: добавляйте X-Idempotency-Key (UUID) для subscription-billing (create/payment), inventory reserve, parts bulk, stock-movements create/bulk/scan/reverse, inventory-alerts test/notification и batch/dismiss.
- Payments: онлайн-инициация /payments/online/init и возвраты /payments/:id/refund — всегда с X-Idempotency-Key.
- Payments: не трогать /payments/webhooks/* и /payments/system/*.
- Tariffs: только read-only страницы (каталог/сравнение); CRUD — отдельный бэкофис.
- Vehicles-Catalogue: GET безопасны для селектов; POST create — можно в админ-UI арендатора; PATCH/DELETE — только бэкофис.
