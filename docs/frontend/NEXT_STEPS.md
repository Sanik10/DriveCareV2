<!-- path: docs/frontend/NEXT_STEPS.md -->
# ▶️ Next Steps — что делаем дальше

Обновлено: 28.08.2025

## 1) Цвет и бренд‑присутствие (сделано частично)
- [x] Brand‑bar в шапке (градиент primary→accent)
- [x] Цвет ссылок → primary
- [ ] Иконка/лого бренда в шапке (нужен файл SVG/PNG)
- [ ] Акцентные подсветки для важных уведомлений (точечно)

Если хочешь больше цвета — предложу вариант “accent header” (тонкая цветная полоса секции страницы) для некоторых экранов.

## 2) Регистрация (предлагаю добавить P0.9)
Страницы:
- /register/company — регистрация компании
- (опц.) /register/invite — по приглашению

Нужны Swagger‑контракты:
- POST `/api/v1/auth/register-company` → тело/ответ/ошибки
- (опц.) POST `/api/v1/auth/register-invite`

UI:
- Поля: имя компании, email, пароль (+ подтверждение), согласие
- Результат: auto‑login или redirect на /login (уточнить поведение)

## 3) Init‑payment — уточнить и внедрить
- Подтвердить точный путь init‑payment, который возвращает `{ paymentId, invoiceId, redirectUrl }`
- Обновить lib/api.ts и кнопку “Оплатить”
- В Return подтверждаем, что query = invoiceId (или paymentId)

## 4) Навбар/профиль
- Иконка пользователя в правом углу, меню: Профиль (/auth/me), Выход (/auth/logout)
- Отображаем email/роль из `me`

Нужен Swagger:
- GET `/api/v1/auth/me` → DTO

## 5) /payments (журнал) — после подтверждения контрактов
- Таблица: дата, сумма, валюта, статус, invoiceId, transactionId
- Маппинг статусов: pending/processing/processed/failed/canceled/... → бейджи

Нужен Swagger:
- GET `/api/v1/payments` (форма ответа, пагинация)
- GET `/api/v1/payments/:id` (деталь — P1)

## 6) Техничка P1
- TanStack Query/Table
- ErrorBoundary + X‑Request‑ID
- Sentry + Web Vitals
- Dark theme toggle

## 7) Что прислать сейчас
- Swagger для:
  - /auth/register-company (+ /auth/register-invite, если нужно)
  - init‑payment (эндпоинт, тело, ответ)
  - /auth/me
  - /payments (list)
- Лого (SVG/PNG), если есть, для шапки
