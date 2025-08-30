# DriveCare · Design Direction v0.3 (NeoCarbon Refined)

Статус: утверждён (смягченная палитра для enterprise)  
Дата: 2025-08-28

## 1. Вектор бренда
- Красиво и технологично. Премиум-уровень (banking/Apple вайб), но функциональность в приоритете.
- Тон интерфейса: уверенный, чистый, быстрый. Высокая читабельность при большой плотности данных.
- Тема: дефолт — dark; поддерживаются light и system.

## 2. Палитры и токены (обновлено v0.3)

Dark (основная):
- bg: #0B0F13
- surface-1/2: #0F141A / #151E27
- border: #1F2933
- text / muted: #E7ECF3 / #A6B0BF
- primary: #00D4AA (смягченный mint)
- secondary: #0EA5E9 (sky вместо cyan)
- accent: #6366F1 (indigo)
- success/warn/danger: #22C55E / #F59E0B / #EF4444

Light:
- bg: #F6F8FB
- surface-1/2: #FFFFFF / #EEF2F7
- border: #E5E9F0
- text / muted: #0F172A / #556274
- primary: #00CFA8
- secondary: #0EA5E9
- accent: #6366F1
- success/warn/danger: #16A34A / #D97706 / #DC2626

Градиенты:
- primary-gradient: 135°, primary → secondary → accent
- surface-glow: мягкая радиальная подсветка rgba(primary, 0.06)

Статусы заказов:
- new: sky-400
- in_progress: blue-500
- awaiting_parts: amber-500
- completed: emerald-500
- canceled: rose-500

Статусы услуг:
- planned: slate-400
- in_progress: blue-500
- completed: emerald-500

## 3. Типографика и иконки
- Geist (уже в проекте), веса 400/500/600/700.
- Размеры: H1 28–32/700, H2 22–24/600, H3 18–20/600, Body 14–16/400–500, Mono 13–14.
- Иконки: Lucide (stroke 1.5–1.75).

## 4. Радиусы/тени/поверхности
- Радиусы: карточки 24, кнопки/инпуты 14.
- Тени: мягкие, с лёгким акцентным glow.
- Стекло: backdrop-blur + тонкий градиент, аккуратные бордеры.

## 5. Навигация (App Shell)
- Topbar: переключатель компании, поиск/командная палитра (⌘K), быстрые действия (+), язык RU/EN, тема, профиль.
- Sidebar: Dashboard, Orders, Customers, Vehicles, Appointments, Invoices, Payments, Reports, Settings.
- Slide-over для быстрого просмотра сущностей.

## 6. Ключевые экраны (CRM-фокус, первоочередно)
- Auth (Login, Register Company, Onboarding 3 шага)
- Dashboard: Сегодня, Незакрытые счета, Низкие остатки (stub), Записи
- Customers: список + профиль (таймлайн)
- Vehicles: список + деталь
- Orders: таблица + Канбан; деталь (Services, Parts, Finance, History)
- Appointments: календарь/лист

## 7. Переходы/анимации
- Page: fade + 4px slide (220–260ms, ease-out). Reduced motion — только opacity.
- Slide-over: справа, 320ms, лёгкая пружина.
- Hover строк/карточек: lift 1px + подсветка бордера.
- Focus: 2px ring в primary, радиус 24.

## 8. Компоненты (MVP)
- AppShell, Breadcrumbs, Tabs
- DataTable (TanStack + виртуализация)
- Form Kit (React Hook Form + Zod)
- StatusBadge (orders/services)
- Card, Sheet, Modal, Toast
- Combobox/Command, DatePicker
- Charts: Apex/ECharts

## 9. Доступность/перфоманс
- Контраст WCAG AA, крупные кликабельные зоны, клавиатурная навигация.
- prefers-reduced-motion учитывается.
- В таблицах — виртуальный скролл.

## 10. i18n
- RU/EN через next-intl (подключим на втором шаге). Ключи: common, auth, orders, customers, vehicles, invoices, payments.

## 11. UX "Orders" на базе API
- Список: фильтры (status, assignedTo, customer/vehicle, search), сохранение в URL. Пагинация.
- Канбан: колонки — new / in_progress / awaiting_parts / completed / canceled. DnD меняет статус.
- Деталь: заголовок (номер, клиент, авто, статус, исполнитель; кнопки: "Выставить счёт", "Отменить", "Завершить"). Вкладки:
  - Services: добавление/статусы/назначение механика/start/complete
  - Parts: список/переключение customer-provided/availability
  - Finance: суммы/скидки/пересчёт
  - History: события/лог
- Создание: Stepper (Клиент → Авто → Услуги/Запчасти → Итог). Валидация по DTO.

## 12. Роли и доступ (Multi-tenant)
- SuperAdmin, PlatformAdmin, Auditor
- CompanyOwner, CompanyAdmin  
- Manager, Cashier, InventoryManager, ServiceAdvisor
- Mechanic, LeadMechanic, Diagnostic
- SupportEngineer, SystemOperator, DevOps

## 13. Следующие шаги
1) Внедрить токены и темы (эти файлы).  
2) AppShell и страницы Orders list + detail.  
3) DTO из backend → точные формы.  
4) Подключить i18n (RU/EN).
