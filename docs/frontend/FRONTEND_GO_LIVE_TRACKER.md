<!-- path: docs/frontend/FRONTEND_GO_LIVE_TRACKER.md -->
# 🚀 DriveCare V2 — Frontend Go‑Live Tracker (MVP)

Обновлено: 28.08.2025  
Статус: P0 — в работе (фронт P0.9)

Цель: выкатить минимально жизнеспособный фронтенд: Login → Invoices → Оплата через PSP/record → Return/polling → Invoice.PAID.

---

## P0 (0–2 дня) — Задачи к запуску

Конфиг/ENV
- [x] next.config.js: dev‑rewrites `/api/v1/:path* → http://localhost:3001/api/v1/:path*`
- [x] .env.local.example: `NEXT_PUBLIC_API_BASE_URL=/api/v1`, `NEXT_PUBLIC_APP_BASE_URL=http://localhost:3000`

Токены и UI‑база
- [x] globals.css: HSL‑токены, Tailwind v4, Geist, банк‑стиль
- [x] Компоненты: Button, Input, Card, Toast, Skeleton, Badge
- [x] Layout/Topbar (brand‑bar), чистые белые поверхности (без hero‑фонов на прикладных экранах)

API/Безопасность
- [x] lib/api.ts: fetch wrapper (credentials: 'include', in‑memory access, refresh‑lock, 401 retry)
- [ ] X‑Request‑ID в ErrorBoundary (перенесено в P1)
- [ ] Отдельный lib/auth.ts (не требуется в P0 — реализовано в lib/api.ts)

Страницы
- [x] /login: RHF+Zod, POST /auth/login
- [x] /invoices: GET /invoices (таблица, скелетоны)
- [x] /invoices/[id]: GET /invoices/:id + CTA “Оплатить”
- [x] /checkout/return: polling статуса (GET /invoices/:id)
- [x] /tariffs: публичная (фолбэк эндпоинтов)

E2E/Smoke
- [ ] Playwright: авторизация → список счетов → карточка → init payment → симуляция возврата → PAID
- [x] Ручные проверки: ошибки/тосты, редирект на login, фокус‑ринги

Ожидаемый результат: пользователь входит, видит список счетов, инициирует оплату (redirectUrl — если выдаёт PSP), возвращается на Return и видит итог статуса.

---

## P1 (1–2 недели) — стабилизация и расширение

- [ ] TanStack Query: кэш, invalidate на действия (оплата, возврат)
- [ ] Таблицы (TanStack Table) + фильтры/сортировки
- [ ] Улучшенный ErrorBoundary c X‑Request‑ID, retry, fallback
- [ ] Sentry + Web Vitals
- [ ] Dark theme + переключатель (.dark) с сохранением предпочтения
- [ ] SSR/кэширование для /tariffs
- [ ] i18n (опц.)
- [ ] (Опц.) /payments — журнал платежей

---

## ENV и параметры

- Dev:
  - `NEXT_PUBLIC_API_BASE_URL=/api/v1`
  - Return URL в PSP: `http://localhost:3000/checkout/return?invoiceId={id}`
- Staging/Prod:
  - `NEXT_PUBLIC_API_BASE_URL=https://api.<domain>/api/v1`
  - `NEXT_PUBLIC_APP_BASE_URL=https://app.<domain>`
  - Return URL: `https://app.<domain>/checkout/return?invoiceId={id}`

---

## API контракты (минимум)

- POST `/auth/login` | `/auth/refresh` | `/auth/logout`
- GET `/invoices`, `/invoices/:id`
- POST `/payments` (init/record) → `{ paymentId, invoiceId, redirectUrl? }` (подтвердить init‑эндпоинт)
- GET `/invoices/:id` (для статуса после возврата)
- GET `/tariffs/active` | `/tariffs/popular` | `/tariffs?page=1&limit=6`

---

## UX/QA чек‑лист

- [x] Ввод/валидация в /login, ошибки читаемые
- [x] В таблице /invoices есть скелетон/empty state
- [x] Кнопка “Оплатить” инициирует процесс; при наличии redirectUrl ведёт на PSP
- [x] Return показывает “Обрабатываем…” и останавливает polling на PAID/FAILED/timeout
- [x] Фокус‑ринги контрастные, все интерактивы ≥ 40px
- [x] prefers‑reduced‑motion уважён

---

## Риски и план обхода

- Cookie/Origin в dev → решают rewrites (единый Origin)
- Задержки PSP → статусы + экспоненциальный polling (≤ 45 сек)
- Нечитаемые ошибки → тосты; ErrorBoundary с X‑Request‑ID (P1)
- Контракт init‑payment не подтверждён → запросить точный путь/ответ у бэка

---

## Коммуникация с бэком

- Подтвердить init‑payment эндпоинт: `POST /payments → { paymentId, invoiceId, redirectUrl? }` или другой путь
- RT‑cookie path и CORS учтены сервером
- Публичные словари: доверяем Cache‑Control и Vary

---

Ссылки
- Design System: `docs/frontend/FRONTEND_DESIGN_SYSTEM.md`
- Tech Spec: `docs/frontend/FRONTEND_TECH_SPEC.md`
