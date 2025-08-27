<!-- path: docs/frontend/FRONTEND_TECH_SPEC.md -->
# 🛠️ DriveCare V2 — Frontend Tech Spec

Обновлено: 27.08.2025 (актуализировано под текущую реализацию)  
Цель: зафиксировать архитектуру, маршруты, взаимодействие с API, безопасность и планы внедрения.

---

## 0) Сводка прогресса (P0 Snapshot)

Реализовано
- [x] Next.js 15.4 (App Router) + React 19 + TypeScript
- [x] Dev‑rewrites: `/api/v1 → http://localhost:3001/api/v1`
- [x] ENV пример: `apps/frontend/.env.local.example` (BASE_URL=/api/v1)
- [x] Tailwind v4 + CSS Variables (HSL) + PostCSS (`@tailwindcss/postcss`)
- [x] Шрифты: Geist (local via next/font)
- [x] UI: Button, Input, Card, Skeleton, Toast (sonner)
- [x] Layout/Topbar, фон “Midnight Glow”, фокус‑ринги
- [x] lib/api.ts: credentials: 'include', in‑memory access token, refresh‑lock, 401→retry
- [x] Страницы: /login, /invoices, /invoices/[id], /checkout/return, /tariffs
- [x] Return: polling 1→2→4→8→15 сек (≤ ~45 c)
- [x] A11y: видимые фокусы, respects prefers‑reduced‑motion

Осталось в P0
- [ ] Тестовые креды (email/пароль от сидов) для smoke‑прогона
- [ ] Подтвердить контракт POST /payments (init/record) → { paymentId, invoiceId, redirectUrl? }
- [ ] Smoke E2E (ручной/Playwright)

P1 (после P0)
- [ ] TanStack Query + Table (кэш/инвалидации/сорт/фильтр)
- [ ] Dark‑theme toggle (.dark) + сохранение предпочтения
- [ ] Sentry + Web Vitals
- [ ] ErrorBoundary с X‑Request‑ID, retry, fallback
- [ ] i18n (опц.)

---

## 1) Стек и ключевые библиотеки

- Next.js 15 (App Router), React 19, TypeScript
- Стили: TailwindCSS v4 + CSS Variables (HSL токены)
  - Подключение Tailwind: `@import "tailwindcss";` в `app/globals.css`
  - Конфиг: `tailwind.config.ts` (darkMode: 'class', theme.extend через токены)
- Формы/валидация: React Hook Form + Zod
- HTTP: встроенный fetch (credentials: 'include')
- Состояние: пока не требуется (Zustand — опц. для UI‑флагов)
- Иконки: Lucide
- Тосты: sonner
- Тесты: Playwright (E2E) — план, Jest/Vitest — опц.

Node ≥ 20.10. Браузеры: последние 2 версии.

---

## 2) Структура проекта

```
apps/frontend/
├─ next.config.js                 // rewrites /api/v1 → backend:3001
├─ app/
│  ├─ layout.tsx                  // шапка/навигация, Toast provider
│  ├─ login/page.tsx              // вход (RHF+Zod)
│  ├─ invoices/page.tsx           // список счетов (table + skeleton)
│  ├─ invoices/[id]/page.tsx      // карточка + CTA “Оплатить”
│  ├─ checkout/return/page.tsx    // возврат PSP + polling
│  ├─ tariffs/page.tsx            // тарифы (публичные, фолбэк эндпоинтов)
│  ├─ globals.css                 // токены, Tailwind v4, WOW‑классы
│  └─ fonts.ts                    // Geist (local)
├─ lib/
│  ├─ api.ts                      // fetch wrapper (in‑memory access token + refresh‑lock)
│  └─ types.ts                    // DTO (Invoice, Tariff, LoginResponse, PaymentInitResponse)
├─ components/ui/                 // Button, Input, Card, Skeleton, Toast
├─ tailwind.config.ts             // Tailwind v4 theme (darkMode: 'class')
├─ postcss.config.js              // @tailwindcss/postcss + autoprefixer
└─ .env.local(.example)
```

---

## 3) ENV и dev‑rewrites

- Dev:
  - `NEXT_PUBLIC_API_BASE_URL=/api/v1`
  - next.config.js rewrites:
    - `/api/v1/:path* → http://localhost:3001/api/v1/:path*`
- Staging/Prod:
  - `NEXT_PUBLIC_API_BASE_URL=https://api.<domain>/api/v1`
  - `NEXT_PUBLIC_APP_BASE_URL=https://app.<domain>`

Дополнительно (P1): `NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_BUILD_HASH`.

---

## 4) Безопасность и сессии

- Все запросы: `credentials: 'include'`
- Refresh токен — HttpOnly cookie (сервер делает Origin/Referer‑check)
- Access токен — только в памяти (in‑memory), не сохраняем в storage
- Алгоритм 401:
  1) Разовый `/auth/refresh` (refresh‑lock)
  2) Повтор исходного запроса
  3) При повторном 401 — redirect на `/login?next=...`
- CSP: избегать inline; PSP — редирект (не iframe)

---

## 5) API контракты (используемые фронтом)

Auth
- POST `/auth/login` → `{ user, accessToken, expiresIn?, deviceId? }` (+ RT в cookie)
- POST `/auth/refresh` → `{ user, accessToken, expiresIn?, deviceId? }`
- POST `/auth/logout`

Invoices
- GET `/invoices` → список инвойсов
- GET `/invoices/:id` → деталь инвойса

Payments (MVP)
- POST `/payments` (init/record) → ожидаем `{ paymentId, invoiceId, provider?, redirectUrl? }`
  - Если `redirectUrl` есть → уходим на PSP
  - Иначе (record) — подтверждаем локально (P1 уточнить UX)

Public
- GET `/tariffs/active` | `/tariffs/popular` | `/tariffs?page=1&limit=6` (фолбэк на фронте)

---

## 6) Маршруты и флоу

/login
- RHF+Zod (email/password)
- Успех: RT cookie + access in‑memory → redirect на `?next` или `/invoices`

/invoices
- Таблица счетов, скелетоны
- 401 → `/login?next=/invoices`

/invoices/[id]
- Реквизиты, статус, сумма, срок
- “Оплатить” → POST `/payments` → redirectUrl (если выдан)

/checkout/return
- query: `invoiceId`
- Polling статуса инвойса: 1→2→4→8→15 сек (≤ ~45 сек)

/tariffs
- Публичная; фолбэк эндпоинтов при ошибках

---

## 7) Перфоманс/кэш

- Публичные страницы: SSR/edge (P1)
- Приватные: no‑store на сервере (фронт не кэширует)
- Prefetch: мягкий (P1)
- Медиа: `next/image` при необходимости

---

## 8) Ошибки и UX

- Toasts: успех/ошибки
- Skeleton / Empty States
- prefers‑reduced‑motion: учитываем
- ErrorBoundary + X‑Request‑ID (P1)

---

## 9) Тестирование

E2E (Playwright) — план
- login → invoices → invoice → init payment → simulate return → PAID
- cancel на PSP → Return → FAILED/CANCELED

Unit — опционально
- api.ts (refresh‑lock)
- формы: валидация схемами
- базовые UI‑компоненты

---

## 10) CI/CD

- Линт: `eslint --max-warnings 0`
- Типы: `tsc --noEmit`
- Build: `next build`
- Превью: Vercel/Netlify/др.
- Secrets: .env.* через Secret Manager

---

## 11) Что ещё нужно для полного P0

- Тестовые креды (email/пароль сидового пользователя)
- Подтвердить точный контракт POST /payments и Return URL (invoiceId|paymentId)
- Лого/фавикон бренда (если есть) для шапки

---

## 12) Риски и обход

- Dev cookies/Origin: решено rewrites
- PSP задержки: есть экспоненциальный polling + читаемые статусы
- Несовпадение статусов: истина по вебхуку; добавим “Обновить статус” (P1)
- Перфоманс: избегаем глобального состояния; серверные компоненты для статичных блоков (P1)
