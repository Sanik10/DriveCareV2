<!-- path: docs/frontend/FRONTEND_DESIGN_SYSTEM.md -->
# 🎨 DriveCare V2 — Frontend Design System (MVP → P1)

Обновлено: 27.08.2025 (актуализировано под Tailwind v4)  
Цель: зафиксировать визуальную систему и правила, чтобы собрать “вау‑эффект” интерфейса без потери доступности и производительности.

Ключевые принципы
- Читаемость и скорость: лаконичные формы, высокая контрастность, быстрые переходы (150–250 мс).
- Уверенность и “инженерность”: строгая сетка, аккуратные тени, равномерные отступы.
- “Вау без перегруза”: живые градиенты и микроанимации в нужных местах (CTA/хедер/плейсхолдеры), остальное — спокойное.
- A11y/Контраст: соблюдаем контраст ≥ 4.5:1 для текста, фокус‑ринги всегда видны.

Базовый стек UI (факт на P0)
- CSS/Tailwind: TailwindCSS v4 + CSS Variables (HSL токены). Подключение: `@import "tailwindcss";` в `app/globals.css` (без `@apply` в базовых слоях).
- Шрифты: Geist (Variable) через `next/font/local` + системные fallback.
- Иконки: Lucide.
- Компоненты: минимальный кастомный набор (Button/Input/Card/Toast/Skeleton). Radix/shadcn — план на P1.

---

## 1) Цветовая палитра (сине‑оранжевая база + “неожиданные” акценты)

Палитра построена на HSL‑токенах: простая инверсия дарк‑темы и предсказуемые контрасты.

Основные
- Primary Blue (основа бренда)
  - 50: hsl(222 100% 97%)
  - 100: hsl(222 95% 92%)
  - 200: hsl(223 90% 86%)
  - 300: hsl(224 85% 78%)
  - 400: hsl(226 80% 68%)
  - 500: hsl(228 85% 60%)  — базовая кнопка/ссылка (≈ #2D60FF)
  - 600: hsl(230 85% 54%)  — hover/насыщение
  - 700: hsl(232 80% 46%)  — active/на тёмном
  - 800: hsl(234 75% 38%)
  - 900: hsl(236 70% 30%)

- Accent Orange (контрастный акцент)
  - 50: hsl(30 100% 97%)
  - 100: hsl(30 95% 92%)
  - 200: hsl(28 92% 84%)
  - 300: hsl(27 90% 75%)
  - 400: hsl(26 90% 65%)
  - 500: hsl(26 95% 56%)  — акцентные CTA/важные бейджи (≈ #FF7A18)
  - 600: hsl(25 95% 50%)
  - 700: hsl(23 90% 44%)
  - 800: hsl(22 90% 38%)
  - 900: hsl(20 88% 32%)

Нейтрали (аккуратные, “инженерные”)
- Ink:    hsl(218 44% 9%)    — основной фон тёмных блоков, текст в дарк‑теме
- Slate:  hsl(220 43% 14%)
- Graphite: hsl(218 32% 18%)
- Steel:  hsl(215 27% 26%)
- Smoke:  hsl(215 20% 45%)   — вторичный текст
- Dust:   hsl(214 20% 64%)
- Cloud:  hsl(210 25% 85%)   — бордеры/тонкие линии
- Snow:   hsl(210 33% 98%)   — фон светлых страниц

Семантика
- Success: hsl(158 64% 45%)  (≈ #10B981)
- Warning: hsl(38 92% 50%)   (янтарь)
- Danger:  hsl(0 84% 60%)    (≈ #EF4444)
- Info:    hsl(201 94% 46%)  (≈ #38BDF8)

“Неожиданные” акценты (для редкого вау)
- Electric Purple: hsl(270 90% 60%) — редкие подсветки/иллюстрации
- Neo‑Teal:        hsl(173 66% 45%) — графики/позитивные метрики
- Solar Lime:      hsl(78 85% 52%)  — микро‑акцент

Градиенты
- “Hyperdrive”: linear-gradient(45deg, var(--color-primary-500), var(--color-accent-500))
- “Midnight Glow”: radial-gradient(120% 120% at 0% 0%, hsl(235 80% 22%), hsl(228 85% 60% / 0.2))
- “Signal Pulse”: linear-gradient(90deg, var(--color-accent-400), var(--color-accent-600))

Рекомендации контраста
- Текст на цветных CTA: всегда белый (hsl(0 0% 100%))
- Текст на Snow/Cloud: Ink/Slate, предпочтительно Ink
- Айконы/бордеры: на 1–2 шага темнее/светлее фона

---

## 2) Design Tokens (CSS Variables, Tailwind v4)

Токены определяются в `apps/frontend/app/globals.css`. В Tailwind v4 используем `@import "tailwindcss";` и обычный CSS без `@apply` для базового слоя.

Пример (фрагмент globals.css):
```css
@import "tailwindcss";

:root {
  --color-primary-500: 228 85% 60%;
  --color-primary-600: 230 85% 54%;
  --color-accent-500: 26 95% 56%;
  --color-accent-600: 25 95% 50%;
  --bg-page: 210 33% 98%;
  --bg-elev-1: 0 0% 100%;
  --bg-elev-2: 210 33% 98%;
  --fg-primary: 218 44% 9%;
  --fg-secondary: 215 20% 45%;
  --fg-invert: 0 0% 100%;
  --focus: 26 95% 56%;
  --radius-sm: 8px; --radius-md: 12px; --radius-lg: 16px;
  --shadow-sm: 0 1px 2px hsl(215 27% 26% / .08);
  --shadow-md: 0 6px 18px hsl(215 27% 26% / .12);
  --shadow-lg: 0 12px 30px hsl(215 27% 26% / .18);
  --ease-out: cubic-bezier(.22,.8,.36,1);
  --dur-base: 220ms;
}
/* Дарк‑тема */
.dark { /* ...см. файл в репозитории */ }

/* WOW helpers */
.bg-midnight-glow { background: radial-gradient(120% 120% at 0% 0%, hsl(235 80% 22%), hsl(228 85% 60% / .2)); }
.bg-hyperdrive { background-image: linear-gradient(45deg, hsl(var(--color-primary-500)), hsl(var(--color-accent-500))); }
```

Tailwind конфиг (`tailwind.config.ts`):
```ts
export default {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}','./components/**/*.{ts,tsx}','./pages/**/*.{ts,tsx}','./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: { page: 'hsl(var(--bg-page))', elev1: 'hsl(var(--bg-elev-1))', elev2: 'hsl(var(--bg-elev-2))' },
        fg: { primary: 'hsl(var(--fg-primary))', secondary: 'hsl(var(--fg-secondary))', invert: 'hsl(var(--fg-invert))' },
        primary: { 500: 'hsl(var(--color-primary-500))', 600: 'hsl(var(--color-primary-600))' },
        accent: { 500: 'hsl(var(--color-accent-500))', 600: 'hsl(var(--color-accent-600))' },
        success: 'hsl(var(--color-success))', warning: 'hsl(var(--color-warning))',
        danger: 'hsl(var(--color-danger))', info: 'hsl(var(--color-info))',
        cloud: 'hsl(var(--color-cloud))', smoke: 'hsl(var(--color-smoke))', focus: 'hsl(var(--focus))',
      },
      borderRadius: { sm: 'var(--radius-sm)', md: 'var(--radius-md)', lg: 'var(--radius-lg)' },
      boxShadow: { sm: 'var(--shadow-sm)', md: 'var(--shadow-md)', lg: 'var(--shadow-lg)' },
      transitionTimingFunction: { 'ease-out': 'var(--ease-out)' },
      transitionDuration: { base: 'var(--dur-base)' },
    },
  },
  plugins: [],
};
```

PostCSS (факт):
```js
export default { plugins: { '@tailwindcss/postcss': {}, autoprefixer: {} } };
```

---

## 3) Типографика и масштаб

- Базовый размер: 16px (1rem).
- Иерархия:
  - h1: 30–36 / 700
  - h2: 24–28 / 700
  - h3: 20 / 600
  - body: 14/16 / 400–500
  - caption: 12 / 400 (вспомогательные подписи)
- Межстрочный интервал: 1.4–1.6.
- Веса: 400/500/600/700; избегать 800+.

---

## 4) Сетка, отступы, радиусы, тени

- Сетка: 4‑пиксельный шаг (4/8/12/16/24/32/48/64).
- Радиусы: sm 8px, md 12px, lg 16px (карточки — md).
- Elevation:
  - sm: наведение/меню
  - md: карточки/модалки
  - lg: крупные выпадающие панели/оверлеи
- Разделители: 1px Cloud (светлая), на тёмной — 1px белый 8% (hsl(0 0% 100% / .08)).

---

## 5) Компоненты (минимальный набор P0)

- Button: primary (blue, градиент, breathing), accent (orange), secondary (outline), ghost, destructive.
- Input: контрастный, видимый focus‑ring; placeholder — Smoke.
- Card: фон elev‑1, скругление md, shadow‑md, внутренние отступы 20px.
- Skeleton: мягкий, без резких вспышек.
- Toast: справа сверху; 4s auto‑dismiss.

P1 (план): Radix/shadcn/ui, Badge, Table на TanStack Table, Modal.

---

## 6) Микроанимации и “вау”‑эффекты

- CTA‑кнопки: subtle gradient + лёгкий breathing (7s, ≤ 4%).
- Хедер/герой: radial‑gradient “Midnight Glow”.
- Наведение на карточку: shadow‑md→lg + translateY(-2px), dur 220ms.
- Переходы между страницами: 150–200ms, без перегруза.
- Return: статусный прогресс, “искра” на “Оплачено”.

prefers-reduced-motion: отключаем анимации.

---

## 7) Доступность

- Контраст: основной текст ≥ 7:1, вторичный ≥ 4.5:1.
- Фокус: всегда видимый outline (2px) контрастного цвета.
- Хит‑зоны: tappable ≥ 40x40px.
- Статусы: цвет + иконка + текст.
- Live‑regions: для тостов/статусов платежа.

---

## 8) Data Viz (цветобезопасные палитры)

- Series: [hsl(201 94% 46%), hsl(173 66% 45%), hsl(270 90% 60%), hsl(26 95% 56%), hsl(38 92% 50%), hsl(0 84% 60%)]
- Доп.градации: использовать 70%/50% насыщенности того же тона.

---

## 9) Иллюстрации и изображения

- Абстрактные формы механики/шестерни (монохром + синий акцент).
- Избегать “стока”; добавлять лёгкий grain/noise (умеренно).
- SVG‑иконки (Lucide), stroke 1.5–2.

---

## 10) Внедрение

P0 (реализовано)
- Токены в `globals.css`, Tailwind v4, Geist.
- Компоненты: Button/Input/Card/Toast/Skeleton.
- Страницы: Login/Invoices/Invoice/Return/Tariffs.

P1 (план)
- Dark‑theme переключатель + сохранение.
- Таблицы/фильтры (TanStack Table), статусные бейджи.
- Sentry + Web Vitals.
