<!-- path: docs/frontend/FRONTEND_APP_MAP.md -->
# 🗺️ DriveCare V2 — Карта приложения и навигация (MVP → P1)

Обновлено: 28.08.2025  
Цель: описать маршруты, назначение экранов и переходы без детализации бизнес‑логики.

---

## 1) Верхний уровень навигации

MVP (в продакшн сейчас)
- Login — аутентификация
- Invoices — список счетов
- Invoice — деталь счёта + оплата
- Checkout/Return — возвращение от PSP и поллинг статуса
- Tariffs — публичная страница с тарифами

P1 (после MVP, маршруты могут быть скрыты по ролям)
- Payments — журнал платежей/деталь
- Customers — клиенты
- Orders — заказы
- Inventory — склад и остатки
- Vehicles — транспорт и каталог
- Services — услуги (категории/наборы)
- Schedules — графики работ
- Company/Users — управление компанией и пользователями
- Billing — подписки/тарифы/методы оплаты

---

## 2) Маршруты и назначение

/auth/login (/login)
- Форма входа (email, password, 2FA?).
- Успех: RT cookie + access in‑memory → redirect на ?next или /invoices.

/invoices (приватно)
- Таблица счетов: №, Клиент, Сумма, Срок, Статус (бейдж).
- Клик по строке → /invoices/:id.
- Empty/Error/Skeleton состояния.

- API: GET /api/v1/invoices (пагинация/фильтры позже)
- Ошибка 401 → редирект на /login?next=/invoices

/invoices/:id (приватно)
- Карточка счёта: номер, клиент, сумма, срок, статус.
- CTA “Оплатить” — только при статусе PENDING.
- Линк “Назад” → /invoices.

- API: GET /api/v1/invoices/:id
- POST init‑payment (конкретный путь подтверждаем; временно /api/v1/payments с redirectUrl?)

/checkout/return (публично, но с проверкой контента)
- query: invoiceId (или paymentId — подтверждаем).
- Поллинг статуса счёта до PAID/FAILED/CANCELED или таймаута.
- Итого: бейдж статуса + действия (вернуться к счёту/списку).

- API: GET /api/v1/invoices/:id (повторные запросы)

/tariffs (публично)
- Список активных тарифов.
- В будущем: сравнение/детали/CTA.

- API: GET /api/v1/tariffs/active (фолбэк popular/page)

---

## 3) Сценарии переходов (Flows)

Авторизация
- Пользователь приходит на приватный маршрут → при 401 редирект на /login?next=<route>.
- Вход → refresh‑cookie в HttpOnly, access — в памяти → redirect на next.

Оплата счета
- На /invoices/:id нажимаем “Оплатить”.
- POST init payment → если redirectUrl — уходим на PSP.
- Возврат на /checkout/return?invoiceId={id}.
- Поллинг статуса до финала → показ результата.

Ошибки/сессии
- Любой приватный запрос при 401 → попытка /auth/refresh (refresh‑lock).
- Повторный 401 → redirect на /login?next=<current>.
- Ошибки сети/валидации → toast + локальные сообщения.

---

## 4) Скелеты экранов (Blueprints)

Login
- Header: “Войти в DriveCare”
- Fields: Email, Password, 2FA?
- CTA: “Войти”
- Help/Link: “Нет доступа? Тарифы”

Invoices
- Page title: “Счета”
- Table: № | Клиент | Сумма | Срок | Статус
- Empty: “Пусто. Счета не найдены.”
- Error: toast + подсказка
- Row: hover → переход в деталь

Invoice
- Title: “Счёт № {number}” + бейдж статуса справа (опц.)
- Grid 2 колонки: Клиент | Сумма | Срок | Статус
- Actions: [Оплатить] (только PENDING), [Назад]

Checkout/Return
- Title: “Проверяем оплату…”
- Sub: “Это займёт не более минуты”
- Progress (текст), результат бейджем

Tariffs
- Title: “Тарифы”
- Cards: название, цена/период, основные фичи, CTA

---

## 5) Права/роли (к направлению)

- Авторизация обязательна для всех приватных маршрутов (invoices, payments, orders и т.д.).
- Публичные — /tariffs (+ маркеры кеширования в P1).
- Детализация ролей (manager/admin/owner/superadmin) — в P1.

---

## 6) Что уточнить/подтвердить

- Точный эндпоинт init‑payment с redirectUrl (сейчас /payments — “record”, без редиректа).
- Return URL: invoiceId или paymentId в query.
- Формат пагинации инвойсов (items/total/page/limit?).
- Единый формат ошибок (statusCode/message/error/requestId?).

---
