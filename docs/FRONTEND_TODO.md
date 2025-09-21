<!-- path: docs/FRONTEND_TODO.md -->
# 🧭 FRONTEND TODO — План работ по модулям и методике

Документ-трекер для UI (Next.js App Router + Shadcn/UI). Фиксируем статус, чек-листы и порядок модулей.

---

## ✅ Что сделано (Appointments)

- Убраны бесконечные перезагрузки календаря: стабильные ключи диапазона дат (YYYY‑MM‑DD), мемоизация.
- Исправлен падёж деталей записи (импорт иконки Calendar).
- Нормализованы статусы: CANCELED используется консистентно; цвета подтягиваются корректно.
- Live-трекинг останавливается для терминальных статусов (COMPLETED/CANCELED/NO_SHOW).
- Диалоги (cancel/reschedule/complete/rating): безопасные onConfirm с сохранением диалога при ошибке, валидация инпутов.
- Create-диалог: поддержка Smart-Schedule, Check-Availability, автоподстановка endTime по duration.

---

## 📐 Базовые правила интеграции

- Запросы только через lib/api/core.ts (apiRequest/apiRequestRaw): credentials: 'include', X-Idempotency-Key, авто-рефреш 401.
- Типы строго из lib/types/*, выравниваем с backend DTO. Маппинг только если без него никак.
- Избегаем бесконечных эффектов:
  - В зависимостях React — строки и примитивы (без Date-объектов).
  - useMemo/useCallback для стабильных функций.
- Даты и фильтры:
  - Локальная дата → YYYY‑MM‑DD (toYMD) для фильтров по дням/неделям/месяцам.
  - Время в UI — локализованное отображение, ISO хранение.
- UX состояния: skeleton (loading), error (toast + retry), empty (действие по месту), success.

Подробная методика: см. docs/INTEGRATION_PLAYBOOK.md

---

## 🗺️ Порядок модулей (предлагаемый)

1) Invoices + Payments (общие сценарии: выставление, оплата, прогресс)  
2) Orders + Services (kanban, создание/редактирование позиций)  
3) Customers (+ Timeline — блокер бэкенд API)  
4) Vehicles + Vehicles Catalogue (связки, выбор модели/типа)  
5) Inventory (+ alerts, suppliers, stock movements)  
6) Payment Methods (включение/тест)  
7) Security + Users (2FA, устройства, роли)  
8) Tariffs + Subscriptions (редактор тарифов, биллинг)  
9) Work Schedules (оптимизация, исключения)

---

## 📌 Задачи по модулям

- Invoices:
  - Подключить list/detail/new к реальным /invoices.
  - Состояния: оплата, возврат, генерация PDF (если есть), прогресс оплат (после API).
  - Исключить дергания: ключи пагинации/фильтров стабильны.

- Payments:
  - Интегрировать online-init, record, refund, статистику.
  - Webhook result page — отработка статусов.

- Orders:
  - Kanban: колонки по статусу, drag-n-drop → PATCH.
  - Диалоги добавления услуги/детали без моков.

- Services:
  - Редактор услуги (цена, длительность). Синхронизировать durationMinutes/duration.

- Customers:
  - Список/карточка клиента; блок «Timeline» (после /customers/:id/timeline).
  - Экспорт/анонимизация — привязка к API.

- Vehicles:
  - Список/карточка, связь с клиентом, сервис-статус (после /vehicles/:id/service-status).

- Inventory:
  - Parts/Stock movements/Alerts/Suppliers → реальные endpoints, фильтры/пагинация.

- Payment Methods:
  - Включение/выключение методов, тест-платеж (после API).

- Security:
  - 2FA/QR/Devices — проверки ошибок и UX состояния.

- Users:
  - Роли/статусы, смена пароля, сессии.

- Tariffs/Subscriptions:
  - Список/редактор тарифов, биллинговые сценарии.

- Work Schedules:
  - Расписания/исключения/оптимизация — рефакторинг эффектов и запросов.

---

## 🔁 Сквозные задачи

- Типы/DTO: выровнять lib/types/* c backend DTO (особенно enums).
- Ошибки/401: единая обработка (toast + редирект/очистка сессии).
- Скелетоны и empty-состояния — везде, где есть загрузка.
- Таймзоны: фильтрация по дням через локальный YYYY‑MM‑DD; ISO на бэкенд.
- Перфоманс: мемоизация, избегать тяжелых ререндеров, лимиты ответов (server-side фильтры).

---

## ⏱️ Оценка

- Типичный модуль списка/деталей: 1–2 дня (интеграция + отладка).
- Сложные (Orders/Inventory): 3–4 дня.
- Зависит от готовности API и согласованности DTO.

---

## 📅 Следующие шаги (рекомендация)

- Неделя 1: Invoices + Payments (включая прогресс оплат), выравнивание типов, базовый E2E сценарий оплаты счета.
- Неделя 2: Orders + Services, базовый Kanban, интеграция диалогов.
- Неделя 3: Customers + Timeline (после бекенда), Vehicles + Service Status.
