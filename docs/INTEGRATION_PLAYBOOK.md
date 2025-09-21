<!-- path: docs/INTEGRATION_PLAYBOOK.md -->
# 📘 Integration Playbook — Методика фронт↔бэк интеграции (DriveCare)

Практическое руководство и чек-листы для быстрой и безопасной интеграции модулей.

---

## Принципы

- Один модуль — один PR. Никаких «всего и сразу».
- Контракт превыше всего: сначала типы/DTO, потом код.
- Бэкенд допускает «грязный» ввод (регистр, синонимы), наружу отдает нормализованный формат.
- Дергаем API только через lib/api/core.ts (единая авторизация/повторы/идемпотентность).

---

## Контракт и типы

- Enums в ответах API → UPPER_CASE (фронт читает константы).
- Контроллеры принимают UPPER/lower/camel_snake регистры и синонимы (CANCELED/CANCELLED).
- Денежные поля: decimal в БД → number в ответах.
- Даты/время: ISO; фильтры по дням — YYYY‑MM‑DD (локально).

Чек-лист:
- Сверить lib/types/* с backend DTO.
- Если отличается — править backend mapper (желательно), иначе фронтовой маппинг в одном месте.

---

## Паттерны запроса (frontend)

- apiRequest(endpoint, { json, idempotencyKey, requireAuth: 'auto' })
- По 401 — авто refresh; не плодим конкурирующих refresh-запросов (core это делает).
- Stop-list в core: нельзя дотянуться до webhooks/system/hard-delete из UI.

---

## Избегаем бесконечных запросов

- В зависимостях useEffect/useCallback/useMemo — примитивы, не Date/объекты.
- Диапазон дат → мемоизировать как строки { rangeStartStr, rangeEndStr }.
- Поиск — debounce 200–300 мс (по месту, если нужно).
- Отменять интервалы и таймеры в cleanup; останавливать polling для терминальных статусов.

---

## Время и даты

- Фильтры календаря: локальная дата → toYMD (YYYY‑MM‑DD), чтобы не ловить UTC-сдвиги.
- UI показывает локальное время; API принимает/возвращает ISO (timestamptz).
- На бэке фильтруем между dateFrom/dateTo с учетом границ дня.

---

## UI состояния и UX

- Всегда: loading (skeleton), error (toast + retry), empty (подсказка/действие), success.
- Action-кнопки: локальный loading, блокировка двойного клика, тосты успеха/ошибки.
- Диалоги onConfirm — ловим ошибки, оставляем диалог открытым.

---

## Политики безопасности

- Авторизация — requireAuth: 'auto' (core), credentials: 'include'.
- Единый logout-flow: по fail-streak refresh или 401 без refresh.
- Никаких токенов в localStorage; токен — в памяти процесса + httpOnly refresh-cookie.

---

## Этапы интеграции модуля

1) Аудит UI: страницы/диалоги/селекты, текущие заглушки.
2) Карта эндпоинтов: list/detail/create/update/actions, фильтры/сортировки.
3) DTO-выравнивание: enums, имена полей, вложенные структуры.
4) Реализация:
   - Обновить lib/api/* клиент.
   - Подключить страницы и компоненты.
   - Добавить UX-состояния и тосты.
5) Перфоманс:
   - Мемоизация, очистка эффектов, стабильные ключи.
6) Тесты:
   - Smoke по основным сценариям, консоль без ошибок, SSR/CSR без конфликтов.
7) PR: короткий чек-лист и скрин-демо.

---

## Чек-лист готовности (DoD)

- [ ] Вся загрузка идет через apiRequest.
- [ ] DTO соответствуют backend; enums в UPPER_CASE.
- [ ] Нет бесконечных запросов/перерендеров.
- [ ] UX-состояния реализованы (loading/empty/error/success).
- [ ] Ошибки обрабатываются (toast + понятный текст).
- [ ] Консоль чистая, гидрация без предупреждений.
- [ ] Документация обновлена (FRONTEND_TODO/BACKEND_TODO).

---

## Рекомендованный порядок модулей

1) Invoices + Payments
2) Orders + Services
3) Customers (+ Timeline)
4) Vehicles (+ Service Status) + Vehicles Catalogue
5) Inventory (parts/alerts/movements/suppliers)
6) Payment Methods
7) Security + Users
8) Tariffs + Subscriptions
9) Work Schedules

---

## История решений (Appointments)

- Нормализованы статусы/приоритеты в ответах (UPPER_CASE).
- Контроллеры принимают любые регистры и CANCELLED как синоним.
- Трекинг — остановка polling для финальных статусов.
- Календарь — toYMD, чтобы исключить UTC-сдвиги.

---
