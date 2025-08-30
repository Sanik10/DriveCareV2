<!-- path: docs/frontend/FRONTEND_TECH_SPEC.md -->
# 🛠️ DriveCare V2 — Frontend Tech Spec

Обновлено: 28.08.2025  
Цель: зафиксировать архитектуру, маршруты, взаимодействие с API, безопасность и планы внедрения.

---

## 0) Сводка прогресса (P0 Snapshot)

Реализовано
- [x] Next.js 15.4 (App Router) + React 19 + TypeScript
- [x] Dev‑rewrites: `/api/v1 → http://localhost:3001/api/v1`
- [x] ENV пример: `apps/frontend/.env.local.example` (BASE_URL=/api/v1)
- [x] Tailwind v4 + CSS Variables (HSL) + PostCSS
- [x] Шрифты: Geist (local via next/font)
- [x] UI: Button, Input, Card, Skeleton, Toast, Badge
- [x] Layout/Topbar (brand‑bar), чистые белые поверхности без hero‑фона
- [x] lib/api.ts: credentials: 'include', in‑memory access token, refresh‑lock, 401→retry
- [x] Страницы: /login, /invoices, /invoices/[id], /checkout/return, /tariffs
- [x] Return: polling 1→2→4→8→15 сек (≤ ~45 c)
- [x] A11y: видимые фокусы, respects prefers‑reduced‑motion

Осталось в P0
- [ ] Тестовые креды (email/пароль от сидов) для smoke‑прогона
- [ ] Подтвердить init‑payment эндпоинт → { paymentId, invoiceId, redirectUrl? }
- [ ] Smoke E2E (ручной/Playwright)

P1 (после P0)
- [ ] TanStack Query + Table (кэш/инвалидации/сорт/фильтр)
- [ ] Dark‑theme toggle (.dark) + сохранение предпочтения
- [ ] Sentry + Web Vitals
- [ ] ErrorBoundary с X‑Request‑ID, retry, fallback
- [ ] i18n (опц.)
- [ ] /payments (журнал) — после подтверждения контрактов

---

## 1) Стек и ключевые библиотеки

- Next.js 15 (App Router), React 19, TypeScript
- TailwindCSS v4 + CSS Variables (HSL‑токены)
- RHF + Zod, Lucide, Sonner
- Node ≥ 20.10; поддержка последних 2 версий браузеров

---

## 2) Структура проекта

```
apps/frontend/
├─ next.config.js
├─ app/
│  ├─ layout.tsx
│  ├─ login/page.tsx
│  ├─ invoices/page.tsx
│  ├─ invoices/[id]/page.tsx
│  ├─ checkout/return/page.tsx
│  ├─ tariffs/page.tsx
│  ├─ globals.css
│  └─ fonts.ts
├─ lib/
│  ├─ api.ts
│  └─ types.ts
├─ components/ui/ (Button, Input, Card, Skeleton, Toast, Badge)
├─ tailwind.config.ts
├─ postcss.config.js
└─ .env.local(.example)
```

---

## 3) ENV и dev‑rewrites

- Dev:
  - `NEXT_PUBLIC_API_BASE_URL=/api/v1`
  - rewrites: `/api/v1/:path* → http://localhost:3001/api/v1/:path*`
- Staging/Prod:
  - `NEXT_PUBLIC_API_BASE_URL=https://api.<domain>/api/v1`
  - `NEXT_PUBLIC_APP_BASE_URL=https://app.<domain>`

---

## 4) Безопасность и сессии

- Запросы: `credentials: 'include'`
- Refresh токен — HttpOnly cookie; access — в памяти
- 401 алгоритм:
  1) `/auth/refresh` (refresh‑lock)
  2) повтор исходного запроса
  3) повторный 401 → redirect `/login?next=...`
- CSP: избегать inline; PSP — редирект (не iframe)

---

## 5) API контракты (используемые фронтом)

Auth
- POST `/auth/login` → `{ user, accessToken, expiresIn?, deviceId? }`
- POST `/auth/refresh` → `{ user, accessToken, ... }`
- POST `/auth/logout`

Invoices
- GET `/invoices` → список или пагинация `{ items, ... }`
- GET `/invoices/:id` → деталь

Payments (MVP)
- POST init/record → ожидаем `{ paymentId, invoiceId, redirectUrl? }` (уточнить путь)

Public
- GET `/tariffs/active` | `/tariffs/popular` | `/tariffs?page=1&limit=6`

---

## 6) Маршруты и флоу

/login → вход и редирект
/invoices → список; 401 → /login?next=...
/invoices/[id] → деталь; “Оплатить” → init payment
/checkout/return → polling статуса по invoiceId
/tariffs → публичная

---

## 7) Перфоманс/кэш

- Публичные: SSR/edge (P1)
- Приватные: no‑store
- Prefetch: мягкий (P1)

---

## 8) Ошибки и UX

- Toasts, Skeleton/Empty
- prefers‑reduced‑motion
- ErrorBoundary + X‑Request‑ID (P1)

---

## 9) Тестирование

- E2E (Playwright): login → invoices → invoice → init → return → PAID
- Unit (опц.): api.ts, формы, UI

---

## 10) CI/CD

- eslint, tsc, next build
- Превью: Vercel/Netlify
- Secrets: Secret Manager

---

## 11) Что ещё нужно для полного P0

- Тестовые креды
- Точный контракт init‑payment + Return URL (invoiceId|paymentId)
- Лого/фавикон для шапки (если есть)
