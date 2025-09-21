<!-- path: docs/BACKEND_TODO.md -->
# 🚀 BACKEND TODO — Накопившиеся задачи для полноценной работы UI

Документ-трекер для серверной части с методикой, статусом сегодняшней сессии и планом следующих итераций.

---

## ✅ Что сделали в этой сессии (Appointments)

- Нормализовали контракт фронт↔бэк для модуля Appointments:
  - Контроллер принимает статусы/приоритеты в любом регистре и синонимах (CANCELED/CANCELLED).
  - Маппер возвращает enum-значения в UPPER_CASE (ожидаемо фронтом).
  - Подтвердили контракты action-эндпоинтов:
    - POST /appointments/:id/confirm
    - POST /appointments/:id/cancel?reason=...
    - POST /appointments/:id/reschedule?startTime=...&endTime=...
    - POST /appointments/:id/complete (body: { finalCost?, mechanicNotes? })
    - POST /appointments/:id/rating?rating=...&feedback=...
    - GET  /appointments/:id/tracking
- Без миграций БД: вся нормализация на уровне контроллера/маппера.
- Подготовили почву для календаря/трекинга: трекинг стабильно отдает статусы и прогресс.

---

## 🧭 Методика (коротко)

- Сначала выравниваем DTO и enum'ы с фронтом; бэкенд допускает «грязный» ввод (разные регистры), наружу отдает «чистый» формат.
- Контроллеры — валидируем вход и нормализуем query/body; сервис — бизнес-логика; маппер — формат ответа.
- Для новых API сначала описываем ответ в DTO, потом добавляем черновую реализацию и постепенно насыщаем бизнес-логикой.

---

## 📋 КРИТИЧЕСКИ ВАЖНЫЕ API ENDPOINTS

### 1) 🎯 Customer Timeline API
Приоритет: HIGH  
Описание: Объединенный endpoint для истории взаимодействий с клиентом

Endpoint: GET /customers/:id/timeline

Ответ:
```ts
interface TimelineEvent {
  id: string;
  type: 'order' | 'payment' | 'appointment' | 'call' | 'email' | 'note' | 'vehicle' | 'profile';
  title: string;
  description: string;
  date: string; // ISO
  status: 'success' | 'info' | 'warning' | 'error';
  amount?: number;
  relatedId?: string;
  relatedType?: string;
  metadata?: Record<string, any>;
}

interface CustomerTimelineResponse {
  events: TimelineEvent[];
  totalEvents: number;
  nextCursor?: string;
}
```

Источники: Orders, Payments, Appointments, Service History, Vehicles, Audit Log, Custom Notes

---

### 2) 🚗 Vehicle Service Status API
Приоритет: HIGH  
Описание: Расчет статуса ТО автомобилей

Endpoint: GET /vehicles/:id/service-status

Ответ:
```ts
interface VehicleServiceStatus {
  vehicleId: string;
  needsService: boolean;
  daysUntilService?: number;
  lastServiceDate?: string;
  nextServiceDate?: string;
  serviceType: 'scheduled' | 'mileage' | 'overdue';
  mileageSinceLastService?: number;
  recommendedServices: string[];
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
}
```

Логика: интервалы по пробегу/времени/типу ТС, настраиваемые по бренду/модели.

---

### 3) 📅 Appointment Tracking API
Приоритет: MEDIUM  
Описание: Real-time трекинг прогресса

Endpoint: GET /appointments/:id/tracking

Ответ:
```ts
interface AppointmentTracking {
  appointmentId: string;
  status: string;
  currentStep: string;
  progress: number; // 0-100
  estimatedCompletion: string; // ISO
  actualDuration?: number;
  delayReason?: string;
  nextActions: string[];
  lastUpdated: string; // ISO
}
```

Этапы: ожидание -> диагностика -> ожидание запчастей -> работы -> контроль качества -> документы

---

### 4) 💰 Invoice Payment Progress API
Приоритет: HIGH

Endpoint: GET /invoices/:id/payment-progress

Ответ:
```ts
interface InvoicePaymentProgress {
  invoiceId: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  progressPercentage: number; // 0-100
  paymentStatus: 'unpaid' | 'partial' | 'paid' | 'overpaid';
  payments: Array<{ id: string; amount: number; method: string; date: string; status: string }>;
  nextPaymentDue?: string;
  overdueAmount?: number;
}
```

---

### 5) 💳 Payment Methods Management API
Приоритет: MEDIUM

Endpoints:
- GET /companies/:id/payment-methods
- PUT /companies/:id/payment-methods/:methodId
- POST /companies/:id/payment-methods/:methodId/test

Ответ:
```ts
interface PaymentMethod {
  id: string;
  type: 'cash' | 'card' | 'bank_transfer' | 'crypto' | 'qr' | 'installments';
  name: string;
  enabled: boolean;
  configuration: {
    commission?: number;
    minAmount?: number;
    maxAmount?: number;
    processingTime?: string;
    credentials?: Record<string, any>;
  };
  statistics: {
    totalTransactions: number;
    totalAmount: number;
    successRate: number;
    averageProcessingTime: number;
  };
  lastTested?: string;
  testStatus?: 'success' | 'failed' | 'pending';
}
```

---

## 📊 ДАННЫЕ И МИГРАЦИИ

### 6) 🗄️ Seed Data для Demo
Приоритет: MEDIUM

Нужно:
- 50–100 клиентов, 150–200 авто, 200–300 заказов, 100–150 записей, 50–80 счетов
- Таймлайны (10–20 событий на клиента)

---

### 7) 🚗 Vehicle Catalogue Data
Приоритет: HIGH  
Импорт реальной базы брендов/моделей/типов ТС

---

## 🔧 BACKEND УЛУЧШЕНИЯ

### 8) 📈 Analytics & Reporting (LOW)
- /analytics/dashboard, /orders/stats, /revenue/monthly, /mechanics/performance

### 9) 🔔 Notifications (MEDIUM)
- Напоминания, готовность, просрочки, инциденты

### 10) 📱 Mobile App API (LOW)
- Refresh tokens, push, offline-first, легкие payload'ы, upload фото ТС

---

## 🚀 PRODUCTION ГОТОВНОСТЬ

### 11) 🛡️ Security Hardening (HIGH)
- Rate limiting, валидация входа, CORS/helmet, XSS-safe ответы

### 12) 📊 Monitoring & Logging (HIGH)
- Pino/Winston, Prometheus, health checks, APM, Sentry

### 13) 🗄️ Database Optimization (MEDIUM)
- Индексы, pooling, реплики, партиции, бэкапы

---

## 🎯 СЛЕДУЮЩИЕ СПРИНТЫ

### Sprint 1 (Критичные API)
1. Customer Timeline
2. Vehicle Service Status
3. Invoice Payment Progress

### Sprint 2 (Данные)
1. Seed data
2. Vehicle Catalogue import
3. Timeline generation

### Sprint 3 (Production)
1. Security hardening
2. Monitoring
3. Performance

---

## 💡 ИДЕИ ДЛЯ БУДУЩЕГО

### 14) 🤖 AI-Powered
- Авто-диагностика, умное планирование (ML), прогноз запчастей, анализ фото

### 15) 🔗 Integrations
- 1С, Госуслуги, банковские API, мессенджеры

### 16) 📊 Advanced Analytics
- Прогноз выручки, RFM, A/B, predictive maintenance

---

## ℹ️ Принятые конвенции (важно)

- Enums в ответах API → UPPER_CASE (для фронта).
- Контроллеры допускают разный регистр/синонимы в query-параметрах.
- Денежные decimal — храним строкой в БД, на выходе отдаем number.
- Времена — timestamptz; на вход принимаем ISO.

Общий статус:
- ✅ CRUD готов
- 🟡 Нужны фиче-эндпоинты для UI
- 🔴 Требуются production-харденинг и наблюдаемость

ETA критичных задач: 2–3 недели

Связанные материалы: см. docs/INTEGRATION_PLAYBOOK.md (методика интеграции)














Коротко: проблему каталога решаем в 3 слоях — качество данных, UX-поиск, модерация. Плюс можно подмешать внешние источники (бесплатные есть). Ниже план и что именно предлагаю внедрить.

Что сделать прямо сейчас (без ломки схемы)
- Серверный поиск вместо “тащим весь список”
  - Фронт: в VehicleCreateDialog перевести Бренд/Модель/Тип на запросы с параметрами search/brandId/limit (десятки, не тысячи) с debounce. У тебя уже есть async-combobox — можно использовать его.
  - Бэк: твои эндпоинты уже поддерживают ?search и ?brandId. Я добавлю в фронтовый vehicles-catalogue API параметры (search, brandId, limit), чтобы не листать бесконечные списки.
- Предупреждение о дублях при создании
  - На CreateBrand/CreateModel валидация: если введённое имя “похоже” на существующее (фаззи-порог), возвращаем 409 с подсказками (какие бренды/модели вероятно имелись в виду). При желании allowDuplicate=true — пропускаем, но ставим метку “unverified”.

Как остановить “Lrada” раз и навсегда
- Нормализация имени
  - Уже есть nameNormalized. Добавляем:
    - транслитерацию (латиница↔кириллица) и фиксы частых опечаток (V↔У, A↔А и т.п.),
    - свёртку спецсимволов и двойных пробелов.
- Фаззи-проверка на дубль
  - Используем PostgreSQL pg_trgm (similarity, word_similarity) или Jaro-Winkler на уровне сервиса.
  - Порог, например, >= 0.88 — считаем кандидатом на дубль.
  - В CreateBrand/CreateModel: если нашлись кандидаты — 409 с suggestions: [{id, name, similarity}].
- Алиасы и канонизация (governance)
  - Вводим алиасы: brand_aliases и model_aliases (aliasNormalized уникален в рамках бренда). В поиске учитываем алиасы.
  - “Склейка/перенос” (merge): системный админ выбирает “Lrada” → “Lada”, бэкенд переносит модели/ТС и помечает источник как удалённый. Алиасом “Lrada” указывает на “Lada”.
  - Статус валидации: isVerified (бренд/модель/тип). Поиск ранжирует Verified выше, не верифицированные помечаются UI-лейблом.
- Модерация/ревизия
  - Фоновая задача “detector”: ищет свежесозданные номенклатуры с похожестью > порога → кладёт в очередь “на проверку”.
  - В админке — список “Подозрения на дубль” с быстрыми действиями: Merge, Mark as Verified, Add alias.

UX-поиск и выбор на фронте
- Асинхронные селекты (поиск вместо длинного списка)
  - Brand: вводишь 2+ символа — бэкенд возвращает top-10 с сортировкой: Verified → популярность (сколько моделей/ТС) → текстовая релевантность.
  - Model: фильтруется по brandId, тоже асинхронно. “Создать новую модель” — доступно, но с предупреждением о похожих.
  - Type: асинхронный, 2+ символа.
- Подсказки и исправления
  - Если пользователь вводит “lrada”, показываем “Возможно, вы имели в виду Lada?” (с backend suggestions).
  - Для русско-латинских подстановок — сразу показывать нормализованный вариант (UI hint).

Внешние бесплатные источники (можно автонаполнить базу)
- NHTSA vPIC API (США, free, без ключа) — марки/модели, стабильная доступность.
  - Плюсы: бесплатно, просто. Минусы: акцент на US-рынок, могут не покрыть локальные/редкие рынки.
  - https://vpic.nhtsa.dot.gov/api/
- CarQuery API (free tier) — марки/модели/годы. 
  - Плюсы: достаточно полный. Минусы: лимиты, лицензия для коммерции уточняется.
  - https://www.carqueryapi.com/
- Wikidata (SPARQL) — можно вытянуть бренды/модели, но нужны чистка/нормализация.
  - Плюсы: свободная. Минусы: неоднородность данных.
- Практика: делаем однократный импорт топ-брендов/моделей, проставляем isVerified=true и блокируем создание “очевидных дублей” (но оставляем escape hatch через админа).

Админка каталога (реально и нужно)
- Раздел в платформенной админке:
  - Таб “Бренды”: поиск, фильтры Verified/Unverified, действия: Verify/Deactivate, Merge, Add alias.
  - Таб “Модели”: то же, плюс фильтр по бренду.
  - Таб “Типы”: Verify/Deactivate/Merge.
  - Таб “Подозрения на дубли”: список пар с similarity score, быстрые Merge/Ignore.
- Аудит: все операции (merge/verify/alias) логируются.

Что нужно поменять на бэке (минимальный MVP без миграций)
- Фаззи-поиск и подсказки:
  - Добавить в CatalogueValidationService/BusinessService:
    - проверку похожести при создании,
    - эндпоинт GET /vehicles-catalogue/suggest?q=… (вернёт brands[], models[]).
- Ранжирование поиска:
  - В data services (brands/models/types) сортировка: isVerified DESC, popularity DESC (vehiclesCount/modelsCount), text_similarity DESC.
- У тебя уже есть уникальные индексы nameNormalized — отлично. Они предотвращают точные дубли. Мы добавим мягкие правила для “похожих”.

Что нужно поменять на фронте (быстрый выигрыш)
- VehicleCreateDialog:
  - Не грузим весь список при открытии.
  - Используем асинхронные запросы с параметрами search/brandId/limit (20).
  - Кнопка “Создать” — перед отправкой показываем модал, если пришли suggestions от бэка.
- vehicles-catalogue API-клиент:
  - Добавить параметры для brands/models/types: { search?, brandId?, page?, limit? }.
  - В ensureBrand/ensureModel использовать не полные списки, а фильтрованные (по search).

Готов реализовать. Для точечных правок пришли, пожалуйста (чтобы не гадать по реализациям):
NEED FILES:
- apps/backend/src/modules/vehicles-catalogue/services/brands-data.service.ts
- apps/backend/src/modules/vehicles-catalogue/services/models-data.service.ts
- apps/backend/src/modules/vehicles-catalogue/services/types-data.service.ts
- apps/backend/src/modules/vehicles-catalogue/services/catalogue-validation.service.ts
- apps/backend/src/modules/vehicles-catalogue/services/catalogue-business.service.ts
- apps/backend/src/modules/vehicles-catalogue/types/catalogue.types.ts
- apps/backend/src/modules/vehicles-catalogue/constants/catalogue.constants.ts

На фронт (для асинхронных селектов в форме добавления ТС):
- apps/frontend/components/ui/async-combobox.tsx (есть в проекте)
- apps/frontend/components/vehicles/vehicle-create-dialog.tsx (я обновлю под async-поиск)
- apps/frontend/lib/api/vehicles-catalogue.ts (добавлю параметры search/brandId/limit)

Хочешь — можем пойти маленькими шагами:
1) Я обновляю vehicles-catalogue.ts на фронте (параметры поиска) и VehicleCreateDialog — переезд на серверный поиск.
2) На бэке добавляю suggest-эндпоинт с фаззи-логикой и предупреждение о дублях в create.
3) Далее — merge/alias/verify и страницу админки.



























Ниже — сжатое резюме того, что уже сделано, как это будет работать дальше, как это обычно решают “большие” системы, и как мы организуем модерацию для суперадмина (с отдельным UI‑модулем).

Что уже исправили у нас (готово)
- Авторизация каталога на фронте:
  - vehicles-catalogue.ts переведён на общий apiRequest (теперь токен и baseURL подставляются корректно), 401 исчезает.
- “Публичные авто” без ПДн:
  - На бэке добавлены GET /vehicles/public и /vehicles/public/:id + маппинг и фильтрация.
  - На фронте добавлены клиенты getPublicVehicles/getPublicVehicle.
- Каталог: фундамент для качества данных и модерации
  - В сущности Brand/Model/Type добавлено поле isVerified (верификация модератором).
  - Ранжирование в выборках: isVerified DESC → имя/бренд (в списках модели и бренды “подтверждённые” идут первыми).
  - Фаззи‑подсказки (suggest):
    - GET /vehicles-catalogue/suggest?q=…&brandId=… — Jaro‑Winkler, возвращает ближайшие бренды/модели.
  - Слияния (merge) без потери данных:
    - POST /vehicles-catalogue/brands/:id/merge { targetBrandId }
    - POST /vehicles-catalogue/models/:id/merge { targetModelId }
    - При слиянии модели все автомобили переводятся на целевую; при слиянии бренда — переносим модели; при конфликте моделей внутри бренда — сливаем модели (переводим авто).
  - Клиент каталога на фронте:
    - Методы brands/models/types теперь поддерживают параметры search/brandId/limit (серверный поиск вместо “всё сразу”).
    - ensureBrand/ensureModel/ensureType используют серверный поиск (а не полный список в память).

Почему это решает “Lrada vs Lada”
- Перед созданием мы ищем похожие записи и подсказываем (suggest → “Вы имели в виду Lada?”).
- Если кто‑то всё же создаст “Lrada”, запись не верифицирована (isVerified=false), а модератор увидит её в списке “подозрений” и за 1 клик выполнит Merge → “Lrada → Lada” (автоматический перенос связей).
- В выдаче у пользователей сначала показываются подтверждённые бренды/модели, что минимизирует выбор “мусора”.

Как это обычно делают “большие” системы (MDM‑подход)
- Канонический справочник (verified master data) + слой пользовательских предложений.
- Нормализация (тримминг, свёртка пробелов, транслитерация, диакритика), алиасы (синонимы), иерархии.
- Фаззи‑матчинг (trigram/Jaro) c ручной модерацией.
- Управление жизненным циклом: New → Unverified → Verified → Deprecated → Merged.
- Ранжирование по “качеству”: verified, популярность (сколько моделей/ТС привязано), текстовая релевантность.
- Внешние источники (импорт) как “подсказка” и стартовые данные; производство — через модерацию.

Как это будет работать у нас по шагам
- Пользователь вводит бренд/модель:
  - Фронт делает /vehicles-catalogue/models?search=…&brandId=… и /suggest?q=… (подсказки).
  - Если выбирает существующее — ок. Если создаёт новое — оно будет isVerified=false.
- Ночной/фоновый детектор (чуть позже добавим):
  - Проверяет новые записи на похожие и формирует “подозрения” (duplicates queue).
- Модерация суперадмином:
  - В админке “Каталог” есть вкладки: Бренды, Модели, Типы, Подозрения.
  - На “Подозрениях” видны пары с similarity‑score и действия: Merge, Mark as Verified, Ignore, Delete.
  - Merge делает ровно то, что ты ожидаешь: переносит связи, мягко удаляет источник.

Что будет на странице суперадмина (UI как отдельный модуль — да, так и сделаем)
Предлагаю модуль на фронте: app/platform/catalogue с вкладками
- Brands
  - Таблица: Name, Country, ModelsCount, isActive, isVerified, UpdatedAt
  - Действия: Verify/Unverify, Edit, Deactivate, Merge…
- Models
  - Фильтр по бренду, таблица: Brand, Model, VehiclesCount, isVerified
  - Действия: Verify/Unverify, Merge (внутри бренда или между брендами), Delete…
- Types
  - Таблица: Name, VehiclesCount, isVerified, isActive
  - Действия: Verify/Unverify, Delete, Edit…
- Suspects (подозрения на дубли)
  - Список пар: Left vs Right, Similarity, CountAttached (модели/ТС), CreatedAt
  - Действия: Merge into Right, Merge into Left, Mark as Verified (оба), Ignore
- Import
  - Импорт из vPIC/CarQuery (по брендам/моделям): пред‑просмотр → выбор → импорт как Verified.

UX нюансы для поиска/создания
- Асинхронные селекты (async-combobox) с дебаунсом, top‑10 релевантных.
- Before create: если suggest вернул хорошие кандидаты — показываем подтверждающее модальное окно с предложениями (снизит “Lrada” до минимума).
- В списке результатов — Verified выше, затем по популярности (кол-во моделей/ТС), затем по релевантности.

Бесплатные источники, которые можно подключить
- NHTSA vPIC API — бесплатный, стабильный. Хорош для брендов/моделей (US‑центричен).
- CarQuery — есть free tier (ограничения надо уточнить), покрытие шире.
- Wikidata — можно тянуть базу брендов/моделей, но нужна нормализация.
Реалистично: импортируем топовые бренды/модели (100–300), помечаем Verified — это даст хороший “скелет”, а остальное — через модерацию.

План работ по этапам
- Этап 1 (сейчас уже частично готов)
  - [готово] suggest + merge endpoints, isVerified, ранжирование.
  - [сделаем] verify/unverify endpoints (PATCH /brands/:id/verify, /models/:id/verify, /types/:id/verify).
  - [сделаем] async‑поиск в VehicleCreateDialog (перевести на async‑combobox; минимальные изменения).
- Этап 2
  - Админка каталога на фронте (app/platform/catalogue): Brands/Models/Types/Suspects.
  - Сервер: эндпоинты для suspects (список/действия), verify/unverify.
  - Фоновый детектор дублей (cron/queue) — формирует “подозрения”.
- Этап 3
  - Алиасы (brand_aliases, model_aliases) и учёт алиасов в поиске/нормализации.
  - Импорт из vPIC/CarQuery (батч‑импорт + ручная верификация).
- Этап 4
  - Тонкая нормализация: транслитерация, свёртка диакритики, чёрные списки распространённых опечаток.

Что из “фундамента” у нас уже ок и что добавим
- Уже ок:
  - Нормализованные поля nameNormalized, soft‑delete, индексы.
  - Безопасные merge‑операции с переносом связей.
  - Фаззи‑поиск + ранжирование Verified.
- Добавим:
  - verify/unverify + suspects + alias — это замкнёт цикл “качество данных → модерация → стабильность”.

Предлагаю следующий шаг
- Я добавляю verify/unverify + минимальную вкладку “Brands” в админке каталога (таблица + действия Verify/Unverify/Merge).
- Для этого понадобятся:
  - Backend: обновление vehicles-catalogue.controller/service (PATCH /brands/:id/verify, аналогично для models/types).
  - Frontend: 
    - новый модуль app/platform/catalogue,
    - клиент для verify/unverify/merge,
    - список брендов с действиями.
- Уточни:
  - хотим ли “company_admin” видеть и создавать записи (как сейчас) — да, но новые автоматически Unverified?
  - названия ролей для модерации: superadmin/platform_admin — ок?

Если окей — скажи, и я сразу накину код для verify/unverify + первую страницу каталога (Brands) в платформенной админке.