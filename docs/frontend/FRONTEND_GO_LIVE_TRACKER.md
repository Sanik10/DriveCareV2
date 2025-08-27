
```

<!-- path: docs/frontend/FRONTEND_GO_LIVE_TRACKER.md -->
```md
<!-- path: docs/frontend/FRONTEND_GO_LIVE_TRACKER.md -->
# 🚀 DriveCare V2 — Frontend Go‑Live Tracker (MVP)

Обновлено: 27.08.2025  
Статус: P0 — в работе (фронт P0.8)

Цель: выкатить минимально жизнеспособный фронтенд: Login → Invoices → Оплата через PSP/record → Return/polling → Invoice.PAID.

---

## P0 (0–2 дня) — Задачи к запуску

Конфиг/ENV
- [x] next.config.js: dev‑rewrites `/api/v1/:path* → http://localhost:3001/api/v1/:path*`
- [x] .env.local.example: `NEXT_PUBLIC_API_BASE_URL=/api/v1`, `NEXT_PUBLIC_APP_BASE_URL=http://localhost:3000`

Токены и UI‑база
- [x] globals.css: дизайн‑токены (HSL), Tailwind v4, Geist
- [x] Компоненты: Button, Input, Card, Toast, Skeleton
- [x] Layout/Topbar (минимум) + WOW‑фон “Midnight Glow”

API/Безопасность
- [x] lib/api.ts: fetch wrapper (credentials: 'include', in‑memory access, refresh‑lock, 401 retry)
- [ ] X‑Request‑ID логируем в ErrorBoundary (перенесено в P1)
- [ ] Отдельный lib/auth.ts (не требуется в P0 — реализовано в lib/api.ts)

Страницы
- [x] /login: RHF+Zod, POST /auth/login
- [x] /invoices: GET /invoices (таблица, скелетоны)
- [x] /invoices/[id]: GET /invoices/:id + CTA “Оплатить”
- [x] /checkout/return: polling статуса (GET /invoices/:id)
- [x] /tariffs: публичная (клиентская) с фолбэком эндпоинтов

E2E/Smoke
- [ ] Playwright: авторизация → список счетов → карточка → init payment → симуляция возврата → PAID
- [x] Ручные проверки: ошибки/тосты, редирект на login, фокус‑ринги

Результат (ожидаемый): пользователь входит, видит список счетов, может инициировать оплату (redirectUrl — если выдаёт PSP), возвращается на Return и видит итог статуса.

---

## P1 (1–2 недели) — стабилизация

- [ ] TanStack Query: кэш, invalidate на действия (оплата, возврат)
- [ ] Dark theme + переключатель (.dark) с сохранением предпочтения
- [ ] Таблицы (TanStack Table) + фильтры/сортировки
- [ ] Улучшенный ErrorBoundary c X‑Request‑ID, retry, fallback
- [ ] Sentry + Web Vitals
- [ ] SSR/кэширование для /tariffs
- [ ] i18n (опц.)

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
- POST `/payments` (init/record) → `{ paymentId, invoiceId, redirectUrl? }`
- GET `/invoices/:id` (для статуса после возврата)
- GET `/tariffs/active` | `/tariffs/popular` | `/tariffs?page=1&limit=6`

---

## UX/QA чек‑лист

- [x] Ввод/валидация в /login, ошибки читаемые
- [x] В таблице /invoices есть скелетон/empty state
- [x] Кнопка “Оплатить” инициирует процесс; при наличии redirectUrl ведёт на PSP
- [x] Return показывает “Обрабатывается…” и останавливает polling на PAID/FAILED/timeout
- [ ] /tariffs SSR/кэш (перенесено в P1)
- [x] Фокус‑ринги контрастные, все интерактивы ≥ 40px
- [x] prefers‑reduced‑motion уважён

---

## Риски и план обхода

- Cookie/Origin в dev → решают rewrites (единый Origin)
- Задержки PSP → статусы + экспоненциальный polling (≤ 45 сек)
- Нечитаемые ошибки → тосты; ErrorBoundary с X‑Request‑ID (P1)
- Потеря сидов → предоставляем команду пересоздания БД/пользователей (бек)

---

## Коммуникация с бэком

- Контракт init/record payment: `POST /payments → { paymentId, invoiceId, redirectUrl? }` — подтвердить.
- RT‑cookie path и CORS учтены сервером.
- Публичные словари: доверяем Cache‑Control и Vary.

---

Ссылки
- Design System: `docs/frontend/FRONTEND_DESIGN_SYSTEM.md`
- Tech Spec: `docs/frontend/FRONTEND_TECH_SPEC.md`
