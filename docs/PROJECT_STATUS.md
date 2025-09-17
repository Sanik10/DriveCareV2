<!-- path: docs/PROJECT_STATUS.md -->
# DriveCare V2 — текущий статус и дорожная карта (актуально)

Эта сводка объединяет реальное состояние проекта (backend+frontend), ключевые правила безопасности и план развития фронта (с учётом онлайн‑оплаты через YooKassa).

Обновлено: текущей сессией
- Tariffs: полная доработка Backoffice (CRUD, расширенные фильтры/сортировки, скрытие метрик от публичного API), подсчёт метрик по подпискам, маркетинговые флаги (recommended/badge/tags/highlight/shelf_position) с UI‑переключателями вместо «сырого» JSON, безопасное удаление.
- Appointments: асинхронные селекты клиент/авто/мастер/услуги; Smart‑Schedule диалог с автоподстановкой; диалоги Complete/Rating вместо prompt; мини‑виджет трекинга; нормализация статусов/приоритетов; check‑availability поддерживает timeRange.
- API‑клиенты: нормализация ответов; фикс даты в деталях инвойса; усиленный core (stop‑лист, авто refresh, X‑Idempotency‑Key).

---

## Краткий статус

Backend
- Платежи:
  - POST /payments/online/init (YooKassa) — в продакшн‑качестве: чек (54‑ФЗ) на стороне провайдера, Redis‑идемпотентность, RBAC/ownership guards, аудит.
  - Вебхуки /payments/webhooks/yookassa — IP ACL + Redis идемпотентность + серверная верификация статуса у провайдера (161‑ФЗ/PCI).
  - Инвойсы: связка “инвойс → платёж → update invoice”: при status=processed вызывается invoicesService.processPayment.
  - Модуль Payments: валидации/бизнес‑логика/аудит — покрыто; защищены финальные статусы (hard delete недоступен).
- Tariffs (новое):
  - Публичные GET эндпоинты — без метрик подписчиков: /tariffs, /tariffs/active, /tariffs/popular, /tariffs/compare, /tariffs/:id.
  - Админ‑листинг с метриками: GET /tariffs/admin (superadmin, platform_admin) — расширенные фильтры/сортировки по activeSubscribers/totalSubscribers.
  - CRUD: POST /tariffs, PATCH /tariffs/:id, PATCH /tariffs/:id/status, DELETE /tariffs/:id (удаление запрещено при активных/исторических подписках и если тариф активен).
  - Подсчёт метрик по подпискам: distinct companyId по статусу и датам (active на текущий момент и total за всё время).
  - Бизнес‑правила: годовая цена ≤ monthly×12 и скидка ≥1%, валидация лимитов, уникальность названия (case‑insensitive).
  - Маркетинговые поля в features: recommended, badge(popular|best_value|new|sale|recommended|hot), tags[], highlight, shelf_position; нормализация/валидация на бэкенде.
  - Audit: логирование create/update/status/delete/list/view/compare/popular.
- Subscriptions:
  - Сущность с ограничением uniq_active_subscription_per_company, статусами ACTIVE/PENDING/SUSPENDED/CANCELED/EXPIRED/INACTIVE, индексацией по датам; используется для метрик тарифов.
- Сущности и инфраструктура:
  - Индексы/чек‑констрейнты, PII/retention/фискальные поля в Payment.
  - Безопасность: глобальные interceptors/pipes, троттлинг, роли.

Frontend
- Сборка и качество: Next build OK; ESLint — есть предупреждения (почистим отдельно).
- Tariffs Backoffice (новое):
  - /platform/tariffs — листинг с расширенными фильтрами: search, isActive, min/max price, minActiveSubscribers, minTotalSubscribers, сортировка по цене/дате/метрикам, пагинация, быстрый toggle активности, удаление.
  - /platform/tariffs/new и /platform/tariffs/[id] — форма с UI‑переключателями для функциональных и маркетинговых фич (recommended/badge/tags/highlight/shelf_position). «Сырой» JSON скрыт; оставлен как продвинутая зона редактирования (с валидацией).
  - API‑клиент tariffsAPI.list — теперь бьёт в /tariffs/admin (метрики видны только платформенным ролям).
  - PlatformGuard — гейтинг Backoffice по ролям (superadmin/platform_admin).
- Tariffs Public:
  - /tariffs (публичный каталог), /tariffs/compare — read‑only, без метрик, только «красивые» плашки.
- Payments UI:
  - /dashboard/payments — список с фильтрами + виджет баланса.
  - /dashboard/payments/[id] — детальная + возврат (refund) с X‑Idempotency‑Key (видно только owner/admin).
  - /dashboard/payments/result — страница результата после редиректа.
  - Оплата из счёта: кнопка “Оплатить онлайн” на invoice details; при >1 активном онлайн‑методе — выбор paymentMethodId.
- Payment‑Methods UI: роль‑гейтинг (owner/admin), скрытие интеграционных данных, API Key — password field. Admin‑only: «Проверить интеграцию», «Рассчитать комиссию».
- Invoices:
  - Создание счёта из заказа — готово; листинг/деталь/статусы/отмена/поиск/дашборд; блок «Платежи по счёту».
- Appointments:
  - Листинг (статус/приоритет/даты/поиск), пагинация, refresh; Create‑диалог (асинхронные селекты), Check‑Availability, Smart‑Schedule; детальная с action‑диалогами; трекинг; tolerant к регистру статусов/приоритетов.
- FSD алиасы: @app/*, @shared/*, @entities/*, @features/*, @widgets/*, @providers/*, @store/* — подключены.
- Unified API client (lib/api/core.ts): stop‑лист, авто refresh по 401, JSON через init.json, X‑Idempotency‑Key, apiRequestRaw для blob/stream.

---

## Политика безопасности (Frontend endpoints policy — выдержка)

UI‑safe (примеры): /auth/*, /customers/*, /orders/*, /invoices/*, /payments (без /webhooks и /system), /payment‑methods/* (CRUD только для арендатора), /appointments/*.

Tariffs (обновлено):
- Публичные (read‑only, без метрик): 
  - GET /tariffs, /tariffs/active, /tariffs/popular, /tariffs/compare, /tariffs/:id — ✅ Allowed (UI)
- Backoffice (платформенные роли, с метриками и CRUD):
  - GET /tariffs/admin — 🧰 Backoffice (platform)
  - POST /tariffs — 🧰
  - PATCH /tariffs/:id — 🧰
  - PATCH /tariffs/:id/status — 🧰
  - DELETE /tariffs/:id — 🧰 (ограничено бизнес‑правилами)

Стоп‑лист (запрещено из UI):
- /subscription-billing/webhooks/*
- /payments/webhooks/*, /payments/system/*
- /stock-movements/integrations/*
- Любые hard‑удаления PII/первички

Рекомендации:
- Для write‑операций — X‑Idempotency‑Key (billing payment, stock bulk/scan/reverse, alerts batch/test/dismiss и т. п.).
- Скрывать недоступные действия по роли в UI (не полагаться на 403).
- Метрики тарифов показывать только в Backoffice (скрыты из публичных ответов).

---

## Модуль Payments (онлайн‑оплата)

- Эндпоинт: POST /payments/online/init — готов.
- Роли: CAN_RECORD_PAYMENT (owner, admin, manager).
- Идемпотентность: заголовок X‑Idempotency‑Key + кэш в Redis и Idempotence‑Key к провайдеру.
- Чек: receipt.items собирается из позиций заказа/инвойса; частичная оплата — пропорционально.
- Вебхуки: /payments/webhooks/yookassa (⛔ system‑only), обязательная серверная проверка статуса.
- Front: кнопка “Оплатить онлайн” на счёте; страницы списка/детали/результата; возврат (refund) из деталки; при наличии >1 активного online‑метода — выбор paymentMethodId перед инициацией.

Подробности: docs/backend/PAYMENTS_ONLINE_INIT.md

---

## Tariffs — детали реализации (новое)

Сущность Tariff:
- Поля: name, nameNormalized (уникальный индекс для case‑insensitive), description, priceMonthly, priceYearly, лимиты (maxUsers/maxCustomers/maxVehicles/maxOrders), features (jsonb), isActive, createdAt, updatedAt.
- Чек‑констрейнты по ценам/лимитам; индексы по name/isActive/createdAt.

Сущность Subscription:
- Поля: companyId, tariffId, startDate, endDate, status(enum), autoRenew и др.; индексы.
- Ограничение uniq_active_subscription_per_company для статуса active.

Бизнес‑логика:
- create/update: валидация цен/лимитов/названия, нормализация features (включая маркетинговые поля).
- toggle status: аудирование; деактивация скрывает тариф из витрины, действующие подписки не трогаются.
- delete: запрещено для активных тарифов и для тарифов с активными/историческими подписками.
- Метрики: TariffsDataService.getSubscribersMetricsByTariff → { activeSubscribers, totalSubscribers } по distinct companyId.

Контроллер:
- GET /tariffs (public): без метрик; базовые фильтры/сортировка.
- GET /tariffs/admin (backoffice): расширенные фильтры (minActiveSubscribers, minTotalSubscribers), сортировка по метрикам; метрики включены в ответ.
- Публичные витрины /active, /popular, /compare — с AllowCache(60, 'public'), но без метрик.

Mapper:
- Возвращает isRecommended на основе features.recommended или badge ∈ {recommended, best_value} (либо эвристика по названию).

---

## FSD (Frontend)

Алиасы: @app/*, @shared/*, @entities/*, @features/*, @widgets/*, @providers/*, @store/*

План разрезки (постепенно):
- entities/invoices — dto/types/mappers, api.
- entities/payments — dto/types/mappers, api (initOnline, refund, list/detail/balance).
- features/pay-invoice — вызов initOnline + redirect (подключено; поддержан выбор online‑метода).
- features/refund-payment — действие на деталке платежа (подключено; UI‑роль‑гейтинг для owner/admin).
- entities/appointments — dto/types/mappers, api (list/get/create + actions/availability/tracking/smart‑schedule).
- shared/ui — универсальные компоненты/хелперы (добавлены AsyncCombobox/AsyncMultiSelect).
- entities/tariffs — [новое] dto/types/mappers, api (admin/public split), Backoffice features/filters, маркетинговые переключатели.

---

## Frontend Feature Tracker (актуально)

Легенда: [x] сделано, [~] частично, [ ] не сделано, 🚫 не делать (UI)

1) Auth + Security
- [x] Логин/регистрация, 2FA, сессии, logout‑all
- [~] UX при истекшем RT‑cookie (уведомление/мягкий редирект)

2) Customers
- [x] Листинг/деталь/создание
- [ ] Статус/анонимизация/дашборд/отзыв согласия — UI

3) Vehicles
- [x] Листинг/деталь/создание/пробег
- [ ] Статус/дашборд — UI

4) Services + Categories
- [x] Листинг/редактирование/создание
- [ ] toggle‑status/bulk/category/quick — UI

5) Parts
- [x] Листинг/редактирование/создание/поиск
- [ ] status/bulk/stats/analytics — UI

6) Orders
- [x] Листинг/деталь/создание, добавление услуг/запчастей, смена статусов услуг/exec (JSON body)
- [x] Смена статуса/назначение по заказу — совместимо с бэком
- [ ] availability для parts — UI (опционально)

7) Payment Methods
- [x] Листинг/деталь/создание/toggle‑статус — с роль‑гейтингом и скрытием секретов
- [~] test‑integration/calculate‑fee/bulk — UI (выполнено: test‑integration, calculate‑fee; осталось: bulk)

8) Invoices
- [x] Листинг/деталь/создание/from‑order
- [x] Смена статуса/отмена/поиск/дашборд/отчёт по просрочкам
- [x] Блок «Платежи по счёту» (последние N платежей + ссылки; CTA «Возврат» только для owner/admin)

9) Payments (UI)
- [x] Листинг/деталь, refund (с X‑Idempotency‑Key), баланс (виджет)
- [ ] Аналитика (GET /payments/analytics/statistics)
- [x] Онлайн‑инициация (features/pay‑invoice)
- [x] UI‑роль‑гейтинг кнопки Refund (видна только owner/admin)
- [x] Выбор online‑метода при оплате, если методов >1 (multi‑provider)

10) Subscriptions + Tariffs
- [ ] Подписки компании (status/history/actions/payment)
- [x] Tariffs Backoffice: листинг с метриками, CRUD, status‑toggle, расширенные фильтры/сортировки, маркетинговые переключатели
- [~] Tariffs Public (read‑only): каталог/сравнение без метрик (UI‑полировка/дизайн)

11) Inventory: Stock Movements / Alerts / Suppliers — UI
- [ ] Stock‑movements: list/detail/create/bulk/scan/reverse + analytics
- [ ] Alerts: list/detail/settings/test/batch/cleanup
- [ ] Suppliers: list/detail/create/update/deactivate/rate/analytics

12) Appointments / Work Schedules / Service History — UI
- [x] Appointments: листинг + Create dialog + Detail + действия (confirm/cancel/reschedule/complete/rating) + Check‑Availability + Smart‑Schedule (диалог)
  - [x] Справочники в UI (селекты механиков/клиентов/авто/услуг)
  - [x] Smart‑Schedule (диалог с рекомендациями и автоподстановкой)
  - [x] Улучшение UX (диалоги вместо prompt)
  - [~] Smart‑Schedule v2: учёт рабочих графиков/исключений (work‑schedules)
  - [ ] Показ услуг с ценами/длительностью в деталке записи (обогащение)

---

## Технические правила (frontend)

- Все запросы только через lib/api/core.ts (buildApiUrl + stop‑лист guard).
- X‑Idempotency‑Key — на write‑операциях, где поддержано.
- Публичные страницы тарифов — без метрик и без «сырого» JSON.
- Передача статусов/назначений — через JSON body, если ожидает бэкенд; где контроллер использует query — UI передаёт через query.
- UI‑гейтинг по ролям — скрывать недоступные действия.
- Статусы/приоритеты: в API — нижний регистр; UI допускает обе формы и нормализует при фильтрации.
- Формат денег: приводить к двум знакам и локали ru‑RU (shared/utils).

---

## Честная оценка текущей сессии

Сделано (честно и полно):
- Tariffs:
  - Публичный/админский split: /tariffs (public, без метрик) и /tariffs/admin (backoffice, с метриками).
  - Метрики: подсчёт activeSubscribers/totalSubscribers по distinct companyId + статус/даты; сортировки/фильтры в админ‑листинге.
  - CRUD и status‑toggle; безопасность удаления (блок при активных/исторических подписках, запрет удаления активного тарифа).
  - Маркетинговые флаги: recommended/badge/tags/highlight/shelf_position — валидация/нормализация на бэке, удобные переключатели в UI.
  - Backoffice UI: продвинутые фильтры/сортировки/пагинация, быстрый toggle, удаление, PlatformGuard.
  - API‑клиент: list() переведён на /tariffs/admin; публичные active/popular/compare — без метрик.
  - Документация: добавлен контракт тарифов docs/frontend/TARIFFS_UI_CONTRACT.md.
- Appointments:
  - Асинхронные селекты, Smart‑Schedule, действия через Dialog‑формы; трекинг; check‑availability с timeRange.
- API‑клиенты:
  - servicesAPI/usersAPI — нормализация разнородных ответов.
- Invoices/Payments:
  - «Платежи по счёту» и UI‑роль‑гейтинг Refund; фикс дат в деталях инвойса.

Что ещё требует доработок:
- Tariffs:
  - Пресеты фич (быстрое заполнение “Старт/Стандарт/Премиум”), bulk‑операции (массовая деактивация/бейдж), планирование деприкации (deprecatedAt/allowNewSubscriptions).
  - Публичный UX (дизайн карточек/сравнения, бейджи, подсветка, порядок по shelf_position).
- Appointments:
  - Smart‑Schedule v2: интеграция с Work‑Schedules/исключениями.
  - Обогащение деталки (услуги с ценами/длительностью).
- Payment‑Methods:
  - Bulk‑операции (admin‑only) — добавить UI.
- Payments:
  - Аналитика /payments/analytics/statistics — экран с графиками и фильтрами.
- Полировка:
  - Скелетоны/плейсхолдеры; единый FeatureGuard; общий форматтер денег/времени и TZ‑нормализация.

---

## Следующие шаги (рекомендации на 1–2 спринта)

Спринт A — Tariffs UX/операции
- Пресеты тарифов (1‑клик заполнение features/лимитов).
- Bulk‑операции: массовый status‑toggle, назначение badge, изменение shelf_position.
- Публичный UX карточек/сравнения: бейджи, подсветка, порядок по shelf_position.

Спринт B — Appointments v2 и аналитика
- Интеграция Smart‑Schedule с Work‑Schedules/исключениями.
- Payments: аналитика (статистика) — графики, фильтры дат/методов.
- Нормализация TZ/format денег (shared/utils), валидации времени до отправки.

---

## Разработчикам: полезные команды

Frontend
- npm run lint — линт
- npm run build — билд Next.js

Backend
- npm run build — билд NestJS

Прочее
- Стоп‑лист защищён на уровне lib/api/core.ts
- Идемпотентность: generateIdempotencyKey() в lib/api/core.ts

---

## Соответствие требованиям

- 54‑ФЗ: чек формируется у ОФД (через YooKassa), мы передаём корректные позиции.
- 152‑ФЗ: минимизация ПДн, retention‑политика, санитайз, безопасные логи; маскирование ПДн по ролям.
- 161‑ФЗ/PCI: серверная верификация статуса, ACL для вебхуков, идемпотентность, отсутствие “сырых” карточных данных в БД.