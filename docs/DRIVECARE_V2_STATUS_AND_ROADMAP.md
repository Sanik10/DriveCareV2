<!-- path: docs/DRIVECARE_V2_STATUS_AND_ROADMAP.md -->
# DriveCare V2 — текущий статус и дорожная карта (актуально)

Эта сводка объединяет реальное состояние проекта (backend+frontend), ключевые правила безопасности и план развития фронта (с учётом онлайн‑оплаты через YooKassa).

Обновлено: текущей сессией (Auth Reliability: boot‑refresh + tokenReady‑барьер, единый 401‑refresh/ретраи, преэмптив по exp, BroadcastChannel sync; стабилизация Login/Register — изоляция шагов, уникальные id/autoComplete; отказ от localStorage для токенов; Next build OK, ESLint 0)

---

## Краткий статус

Backend
- Платежи:
  - POST /payments/online/init (YooKassa) — в продакшн‑качестве: чек (54‑ФЗ) на стороне провайдера, Redis‑идемпотентность, RBAC/ownership guards, аудит.
  - Вебхуки /payments/webhooks/yookassa — IP ACL + Redis идемпотентность + серверная верификация статуса у провайдера (161‑ФЗ/PCI).
  - Инвойсы: связка “инвойс → платёж → update invoice”: при status=processed вызывается invoicesService.processPayment.
  - Модуль Payments: валидации/бизнес‑логика/аудит — покрыто; защищены финальные статусы (hard delete недоступен).
- Сущности: индексы/чек‑констрейнты, PII/retention/фискальные поля в Payment.
- Безопасность: глобальные interceptors/pipes, троттлинг, роли.
- Appointments (API):
  - Контроллер поддерживает list/get/create/update/delete(+hard), status‑actions (confirm/complete/cancel/reschedule/rating), tracking; фильтры и сортировка; гварды ownership.
  - check‑availability — поддерживает timeRange (HH:mm–HH:mm) и буфер слотов.
  - smart‑schedule — учитывает priority/allowWeekends/maxWaitingDays, возвращает estimatedWaitTime и nextAvailableDate.
  - Mapper: PII‑маскирование по ролям (152‑ФЗ) для mechanic/diagnostic.

Frontend
- Сборка и качество: Next build OK; ESLint — 0 предупреждений/ошибок.
- Auth/Login/Register:
  - In‑memory accessToken + HttpOnly refresh‑cookie (без localStorage); единый boot‑refresh на старте, барьер tokenReady для всех requireAuth‑запросов.
  - Централизованный 401‑обработчик в apiRequest: один общий refreshing Promise, прозрачно ретраит запросы, антишторм при параллельных вызовах.
  - Преэмптивное обновление access по exp; триггеры visibility/focus/online (троттлинг).
  - Синхронизация вкладок через BroadcastChannel('auth') (login/refresh/logout).
  - Регистрация: строгая изоляция шагов (раздельные формы, remount по key, уникальные id/name, корректные autoComplete), предсказуемый возврат “Назад/Вперёд”.
- Payments UI:
  - /dashboard/payments — список с фильтрами + виджет баланса.
  - /dashboard/payments/[id] — детальная + возврат (refund) с X‑Idempotency‑Key; кнопка «Возврат» видна только owner/admin (UI‑роль‑гейтинг).
  - /dashboard/payments/result — страница результата после редиректа.
  - Оплата из счёта: кнопка “Оплатить онлайн” на invoice details → redirect (YooKassa); если активных online‑методов >1 — выбор paymentMethodId перед init.
- Payment‑Methods UI: роль‑гейтинг (owner/admin), скрытие интеграционных данных, API Key — password field. Admin‑only: «Проверить интеграцию», «Рассчитать комиссию».
- Invoices:
  - Создание счёта из заказа — готово (страница “Новый счёт”).
  - Листинг/деталь/статусы/отмена/поиск/дашборд — готовы.
  - Блок «Платежи по счёту» на деталке — последние N платежей + ссылки; CTA «Возврат» только для owner/admin.
- Appointments:
  - /dashboard/appointments — листинг (статус/приоритет/даты/поиск), пагинация, refresh.
  - Create‑диалог (manager+): асинхронные селекты (клиент/авто/мастер/услуги), автоподстановка окончания по длительности, Check‑Availability (спиннер/ошибка/«нет слотов»/«N слотов»), выбор слота подставляет время.
  - Smart‑Schedule диалог: параметры (дата/окно/приоритет/предпочт. мастер/выходные), рекомендации + автоподстановка.
  - /dashboard/appointments/[id] — детальная с действиями: подтверждение, отмена (диалог причины), перенос (диалог), завершение (диалог итоговой стоимости/заметок), оценка (диалог); проверка статуса (tracking toast) + мини‑виджет прогресса с автопуллингом.
  - UI tolerant к регистру статусов/приоритетов (case‑insensitive).
- FSD алиасы: @app/*, @shared/*, @entities/*, @features/*, @widgets/*, @providers/*, @store/* — подключены.
- Unified API client (lib/api/core.ts): stop‑лист, JSON через init.json, X‑Idempotency‑Key, apiRequestRaw для blob/stream, boot‑refresh/tokenReady, единый 401‑ретрай, преэмптив, BroadcastChannel.

---

## Политика безопасности (Frontend endpoints policy — выдержка)

UI‑safe (примеры): /auth/*, /customers/*, /orders/*, /invoices/*, /payments (без /webhooks и /system), /payment‑methods/* (CRUD только для арендатора), /appointments/*.

Стоп‑лист (запрещено из UI):
- /subscription-billing/webhooks/*
- /payments/webhooks/*, /payments/system/*
- /stock-movements/integrations/*
- Любые hard‑удаления PII/первички

Рекомендации:
- Для write‑операций — X‑Idempotency‑Key (billing payment, stock bulk/scan/reverse, alerts batch/test/dismiss и т. п.).
- Скрывать недоступные действия по роли в UI (не полагаться на 403).

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

## FSD (Frontend)

Алиасы: @app/*, @shared/*, @entities/*, @features/*, @widgets/*, @providers/*, @store/*

План разрезки (постепенно):
- entities/invoices — dto/types/mappers, api.
- entities/payments — dto/types/mappers, api (initOnline, refund, list/detail/balance).
- features/pay-invoice — вызов initOnline + redirect (подключено; поддержан выбор online‑метода).
- features/refund-payment — действие на деталке платежа (подключено; UI‑роль‑гейтинг для owner/admin).
- entities/appointments — dto/types/mappers, api (list/get/create + actions/availability/tracking/smart‑schedule).
- shared/ui — универсальные компоненты/хелперы (добавлены AsyncCombobox/AsyncMultiSelect).

---

## Frontend Feature Tracker (актуально)

Легенда: [x] сделано, [~] частично, [ ] не сделано, 🚫 не делать (UI)

1) Auth + Security
- [x] Логин/регистрация, 2FA, сессии, logout‑all
- [~] UX при истекшем RT‑cookie (уведомление/мягкий редирект) — логика fail‑safe готова, добавим единый toast

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

10) Subscriptions + Tariffs (read‑only)
- [ ] Подписки компании (status/history/actions/payment)
- [ ] Tariffs — публичные read‑only страницы

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
- Не хранить токены/PII в localStorage (access — только in‑memory; refresh — только HttpOnly cookie).
- X‑Idempotency‑Key — на write‑операциях, где поддержано.
- Передача статусов/назначений — через JSON body, если ожидает бэкенд; где контроллер использует query (cancel/reschedule/rating) — UI передаёт через query.
- UI‑гейтинг по ролям — скрывать недоступные действия.
- Статусы/приоритеты: в API — нижний регистр; UI допускает обе формы и нормализует при фильтрации.
- Формат денег: приводить к двум знакам и локали ru‑RU (унифицируем в shared/utils).

---

## Честная оценка текущей сессии

Сделано (честно и полно):
- Auth/Security + Login/Register:
  - Boot‑refresh + tokenReady‑барьер на старте, единый 401‑refresh/ретраии с антиштормом, преэмптив по exp, триггеры focus/visibility/online.
  - BroadcastChannel между вкладками (login/refresh/logout).
  - Отказ от localStorage для токенов; логин/инвайт страницы очищены от хранения секретов.
  - Мастер регистрации: раздельные формы на шаг, remount по key, уникальные id/name, корректные autoComplete, чистый возврат “Назад/Вперёд”.
  - Сборка/линт: Next build OK, ESLint — 0.
- Appointments:
  - Асинхронные селекты, Smart‑Schedule, диалоги Complete/Rating, трекинг в деталке, check‑availability c timeRange.
- API‑клиенты:
  - servicesAPI/usersAPI — нормализация разнородных ответов.
- Invoices/Payments:
  - «Платежи по счёту», UI‑роль‑гейтинг Refund; фикс типизации даты.

Что ещё требует доработок:
- Auth UX: единый toast “Сессия истекла” + мягкий редирект (fail‑safe сценарий готов).
- Appointments:
  - Smart‑Schedule v2: интеграция с рабочими графиками/исключениями.
  - Обогащение деталки записи (услуги с ценами/длительностью).
  - Единые форматтеры денег/времени; явная TZ‑нормализация в формах datetime‑local.
- Payment‑Methods:
  - Bulk‑операции (admin‑only) — добавить UI.
- Payments:
  - Аналитика /payments/analytics/statistics — графики, фильтры дат/методов.
- Полировка:
  - Микро‑скелетоны/плейсхолдеры; единый FeatureGuard по ролям.

---

## Следующие шаги (рекомендации на 1–2 спринта)

Спринт A — Appointments v2
- Интеграция Smart‑Schedule с Work‑Schedules/исключениями.
- Деталка записи: блок услуг с ценами/длительностью; улучшения UI состояний.
- Нормализация TZ/format денег (shared/utils), валидации времени до отправки.

Спринт B — Полировка и аналитика
- Auth UX: глобальный toast “Сессия истекла” + мягкий редирект.
- Payment‑Methods: bulk‑операции (admin‑only).
- Payments: аналитика (статистика) — графики, фильтры дат/методов.
- Invoices UX: скрыть изменения при PAID, быстрые ссылки на платежи.

---

## Разработчикам: полезные команды

Frontend
- npm run lint — линт (цель: 0 предупреждений/ошибок)
- npm run build — билд Next.js

Backend
- npm run build — билд NestJS

Прочее
- Стоп‑лист защищён на уровне lib/api/core.ts
- Идемпотентность: generateIdempotencyKey() в lib/api/core.ts
- AuthBootstrap провайдер запускает boot‑refresh максимально рано из layout

---

## Соответствие требованиям

- 54‑ФЗ: чек формируется у ОФД (через YooKassa), мы передаём корректные позиции.
- 152‑ФЗ: минимизация ПДн, retention‑политика, санитайз, безопасные логи; маскирование ПДн по ролям; отсутствие токенов в localStorage.
- 161‑ФЗ/PCI: серверная верификация статуса, ACL для вебхуков, идемпотентность, отсутствие “сырых” карточных данных в БД.
