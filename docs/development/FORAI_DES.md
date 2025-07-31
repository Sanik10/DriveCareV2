# 🚀 **DriveCare V2 - Enterprise SaaS Platform для Автосервисов**
## 📋 **Полная документация проекта для ИИ ассистента**

---

## 🎯 **ОБЗОР ПРОЕКТА**

**DriveCare V2** - это enterprise SaaS платформа для управления автосервисами, разработанная на NestJS с применением принципов Clean Architecture + DDD (Domain Driven Design).

### **Ключевые характеристики:**
- 🏢 **Multi-tenant архитектура** - каждая компания работает изолированно
- 🛡️ **Security-First подход** - безопасность данных на каждом уровне
- 📊 **Enterprise-ready** - готовность к промышленной эксплуатации
- 🔄 **Subscription-based model** - SaaS с тарифными планами и лимитами
- 🎯 **TypeScript Strict Mode** - полная типизация без `any`

---

## 🏗️ **АРХИТЕКТУРНЫЕ ПРИНЦИПЫ**

### **1. Clean Architecture + DDD**
```
Presentation Layer (Controllers)
    ↓
Application Layer (Services)
    ↓ 
Domain Layer (Business Logic)
    ↓
Infrastructure Layer (Database, External APIs)
```

### **2. Security-First Architecture**
**ЗОЛОТОЕ ПРАВИЛО:** "Владелец компании A НЕ ДОЛЖЕН видеть данные компании B!"

### **3. Стандартизированные паттерны:**
- **MapperService Pattern** - чистое разделение Entity/DTO
- **Composable Guards System** - `@AuthWithOwnership()` + `@CompanyResource()`
- **Custom Exceptions** - вместо generic Error
- **Audit Everything** - логирование всех действий
- **Subscription Limits** - проверка лимитов SaaS модели

---

## 📁 **СТРУКТУРА ПРОЕКТА**

```
apps/backend/src/
├── 📱 app.module.ts                    # Главный модуль приложения
├── 🔧 main.ts                          # Entry point
├── 🔒 common/                          # Общие компоненты
│   ├── guards/                         # Security guards
│   │   ├── auth-with-ownership.guard.ts    # Композитный guard (JWT+Roles+Ownership)
│   │   └── company-ownership.guard.ts      # Проверка принадлежности ресурсов
│   ├── decorators/
│   │   └── resource.decorator.ts           # @CompanyResource(), @SubscriptionResource()
│   ├── exceptions/
│   │   ├── custom-exceptions.ts            # Auth исключения
│   │   └── domain.exceptions.ts            # Business исключения
│   └── audit/
│       └── audit.service.ts               # Система аудита
├── 🗂️ database/
│   ├── entities/                       # TypeORM entities
│   │   ├── index.ts                        # Экспорт всех entities
│   │   ├── company.entity.ts              # Компания
│   │   ├── subscription.entity.ts         # Подписки
│   │   ├── user.entity.ts                 # Пользователи
│   │   ├── order.entity.ts               # Заказы ✅
│   │   ├── inventory.entity.ts           # Склад ✅  
│   │   ├── payment.entity.ts             # Платежи ✅
│   │   ├── invoice.entity.ts             # Счета ✅
│   │   └── ... остальные entities
│   ├── migrations/                     # DB миграции
│   └── seeds/                          # Начальные данные
└── 📦 modules/                         # Бизнес модули
    ├── ✅ auth/                        # Аутентификация (95% готов)
    ├── ✅ companies/                   # Компании (100% готов)
    ├── ✅ subscriptions/               # Подписки (100% готов)
    ├── ✅ customers/                   # Клиенты (100% готов)
    ├── ✅ vehicles/                    # Автомобили (100% готов)
    ├── ✅ appointments/                # Записи (100% готов)
    ├── ✅ orders/                      # Заказы (100% готов - READY!)
    ├── ✅ services/                    # Услуги (100% готов)
    ├── ✅ work-schedules/              # Расписания (100% готов)
    ├── ✅ payment-methods/             # Способы оплаты (100% готов)
    ├── 🟡 inventory/                   # Склад (60% готов - В РАБОТЕ)
    ├── 🔄 users/                       # Пользователи (требует стандартизации)
    ├── 🔄 payments/                    # Платежи (30% готов - БД есть, API нужен)
    └── 🔄 invoices/                    # Счета (30% готов - БД есть, API нужен)
```

---

## 🏛️ **СТАНДАРТНАЯ СТРУКТУРА МОДУЛЯ**

### **Каждый модуль ДОЛЖЕН следовать этой архитектуре:**

```
module-name/
├── 📋 module-name.module.ts              # TypeORM imports + DI
├── 🎛️ module-name.controller.ts          # REST endpoints с security
├── 🔧 module-name.service.ts             # Оркестратор сервисов
├── 📊 constants/
│   └── module-name.constants.ts          # Константы + лимиты
├── 🔬 services/                          # Микросервисы (Single Responsibility)
│   ├── module-name-business.service.ts       # 💼 Бизнес-логика
│   ├── module-name-data.service.ts           # 🗄️ Работа с БД + фильтрация
│   ├── module-name-validation.service.ts     # ✅ Валидация + security
│   └── module-name-mapper.service.ts         # 🔄 Entity ↔ DTO маппинг
├── 📝 dto/                              # Data Transfer Objects
│   ├── request/                              # Входящие DTO
│   └── response/                             # Исходящие DTO
├── 🔌 interfaces/                       # TypeScript интерфейсы
├── 🏷️ types/                            # Типы с обязательным companyId
├── 🚨 exceptions/                       # Кастомные исключения модуля
└── 🧪 __tests__/                       # Тесты (особенно security)
```

---

## 🛡️ **ОБЯЗАТЕЛЬНЫЕ SECURITY СТАНДАРТЫ**

### **1. Контроллер - ВСЕГДА с AuthWithOwnership:**
```typescript
@Controller('entity-name')
export class EntityController {
  
  @Get()
  @AuthWithOwnership() // 🔒 JWT + Roles + Ownership
  async findAll(@Req() req: RequestWithUser) {
    // 🔒 КРИТИЧНО: фильтрация по принадлежности
    const filter = { 
      companyId: req.user.role === 'superadmin' ? undefined : req.user.companyId 
    };
    return this.service.findAll(filter);
  }

  @Get(':id')
  @AuthWithOwnership()
  @CompanyResource() // 🔒 Проверка принадлежности ресурса
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }
}
```

### **2. DataService - ВСЕГДА с фильтрацией:**
```typescript
async findWithFilters(filter: EntityFilter): Promise<[Entity[], number]> {
  const query = this.repository.createQueryBuilder('entity');

  // 🔒 ОБЯЗАТЕЛЬНАЯ фильтрация по companyId
  if (filter.companyId) {
    query.andWhere('entity.companyId = :companyId', { companyId: filter.companyId });
  }

  return query.getManyAndCount();
}
```

### **3. ValidationService - проверка ownership:**
```typescript
async validateEntityOwnership(entityId: string, userCompanyId: string): Promise<Entity> {
  const entity = await this.dataService.findByIdForCompany(entityId, userCompanyId);
  
  if (!entity) {
    throw new ResourceOwnershipException('entity', entityId);
  }
  
  return entity;
}
```

---

## 📊 **ТЕКУЩЕЕ СОСТОЯНИЕ МОДУЛЕЙ**

### **🏆 ENTERPRISE LEVEL (95%+) - 6 модулей:**
1. **🔐 auth** - JWT, sessions, Redis, company onboarding (только система приглашений TODO)
2. **🏢 companies** - образцовая реализация с MapperService  
3. **📊 subscriptions** - шедевр с SubscriptionLimitsService
4. **💰 tariffs** - полная система тарифных планов
5. **📋 orders** - полная система заказов с подмодулями (order-services, order-parts)
6. **🚗 vehicles** + catalogue - управление автопарком с каталогом марок/моделей

### **✅ PRODUCTION READY (90%+) - 7 модулей:**
7. **👥 customers** - полный CRUD с validation и security
8. **🔧 services** + categories - каталог услуг с категориями
9. **📋 service-history** - история обслуживания автомобилей
10. **💳 payment-methods** - способы оплаты
11. **⏰ work-schedules** - расписания работы + исключения
12. **📅 appointments** - записи на обслуживание + smart scheduling
13. **📦 inventory** - складская система (основа готова, подмодули в процессе)

### **🔄 REQUIRES STANDARDIZATION (60%) - 1 модуль:**
14. **👤 users** - минимальная реализация, требует архитектурной доработки

### **🔄 PARTIALLY READY (30%) - MVP CRITICAL:**
15. **💸 payments** - 🗄️ БД готова ✅, API модуль нужен ❌ (3-4 дня работы)
16. **🧾 invoices** - 🗄️ БД готова ✅, API модуль нужен ❌ (2-3 дня работы)

### **❌ FUTURE FEATURES (0%) - После MVP:**
17. **🔐 permissions/roles** - гранулярные права (опционально)
18. **📊 analytics** - дашборды и отчеты (после MVP)
19. **🔔 notifications** - уведомления (после MVP)

**📈 Прогресс разработки: 88% от MVP (payments+invoices = 1 неделя до MVP!)**

---

## 🎯 **ДЕТАЛЬНЫЕ ЗАДАЧИ ПО МОДУЛЯМ**

### **📦 INVENTORY MODULE (В ПРОЦЕССЕ - 60% готов)**

#### **✅ Уже реализовано:**
- ✅ Основная структура `inventory/` модуля
- ✅ `InventoryService` с базовым функционалом
- ✅ Интеграция с orders для резервирования запчастей
- ✅ `PartsService` с полным CRUD
- ✅ Security guards и фильтрация по companyId
- ✅ MapperService для DTO преобразований

#### **🔄 В процессе разработки:**
- 🔄 `StockMovementsService` - движения товаров (50% готов)
- 🔄 `SuppliersService` - управление поставщиками (планируется)
- 🔄 `InventoryAlertsService` - уведомления о низких остатках (планируется)

### **👤 USERS MODULE (ТРЕБУЕТ СТАНДАРТИЗАЦИИ)**

#### **✅ Текущее состояние:**
- ✅ Базовый `UsersService` работает
- ✅ Интеграция с Auth модулем
- ✅ Основные методы (findByEmail, findById, create)

#### **📋 Нужно добавить:**
- [ ] Создать микросервисы (users-data, users-business, users-validation, users-mapper)
- [ ] Добавить полноценный CRUD контроллер с security
- [ ] Реализовать admin панель для управления пользователями
- [ ] Добавить DTO для request/response
- [ ] Создать security тесты

### **💸 PAYMENTS & INVOICES MODULE (30% готов - КРИТИЧЕН ДЛЯ MVP!)**

#### **🚨 ВЫСОКИЙ ПРИОРИТЕТ - необходим для монетизации:**

**✅ Что уже готово (30%):**
- ✅ **Database schema:** таблицы `payments`, `invoices` созданы
- ✅ **Entities:** payment.entity.ts, invoice.entity.ts существуют
- ✅ **Relationships:** связи с orders, companies настроены
- ✅ **Migrations:** структура БД применена

**❌ Что нужно создать (70% = 5-7 дней):**
- ❌ **API модули:** controllers, services, DTO
- ❌ **Business logic:** workflow, statuses, calculations
- ❌ **Security:** guards, validation, ownership checks
- ❌ **Integration:** с orders и payment-methods

#### **Реальная оценка времени: 1 неделя вместо 2-х!**

**1. Invoices Module (2-3 дня):**
```typescript
class InvoicesService {
  async createInvoiceFromOrder(orderId: string)         // Использует готовые entities
  async updateInvoiceStatus(invoiceId: string, status)  // Статусы: issued/paid/overdue
  async generateInvoiceNumber(): string                 // Авто-номера
  async calculateInvoiceTotals(invoiceId: string)       // Сумма + налоги
}
```

**2. Payments Module (3-4 дня):**
```typescript
class PaymentsService {
  async recordPayment(invoiceId: string, amount: number, methodId: string)  // Готовые entities
  async getPaymentHistory(companyId: string)                               // С фильтрацией
  async calculateBalance(companyId: string)                                // Баланс компании
  async checkOverdueInvoices(companyId: string)                           // Просрочка
}
```

### **📊 ANALYTICS & REPORTING (ПОСЛЕ MVP)**

#### **Планируемые модули:**
- **analytics** - дашборды с KPI и метриками
- **reports** - генерация PDF отчетов
- **notifications** - email/SMS уведомления

---

## 📋 **ROADMAP CHECKLIST - ПОЭТАПНОЕ ВЫПОЛНЕНИЕ**

### **🎯 ЗАВЕРШЕННЫЕ ЭТАПЫ ✅**

#### **✅ ЭТАП 1: ОСНОВНЫЕ МОДУЛИ (ГОТОВО)**
- [x] ✅ AUTH система с JWT + multi-device sessions
- [x] ✅ COMPANIES управление с полной security изоляцией
- [x] ✅ SUBSCRIPTIONS с тарифными планами и лимитами
- [x] ✅ CUSTOMERS полный CRUD с validation
- [x] ✅ VEHICLES управление автопарком + каталог
- [x] ✅ SERVICES каталог услуг + категории
- [x] ✅ APPOINTMENTS записи на обслуживание
- [x] ✅ WORK-SCHEDULES расписания работы
- [x] ✅ ORDERS система заказов с подмодулями
- [x] ✅ PAYMENT-METHODS способы оплаты

### **🎯 ТЕКУЩИЙ ЭТАП: КРИТИЧНЫЕ ДОРАБОТКИ ДЛЯ MVP**

#### **🔥 Week 1: Payments & Invoices (БД готова!)**
- [x] **Days 1-3: Invoices Module**
  - [x] Создать `InvoicesModule` + контроллер (entities уже есть!)
  - [x] Реализовать `InvoicesService` с готовыми entities
  - [x] Создать DTO на основе существующих полей БД
  - [x] Автоматическое создание инвойсов из заказов
  - [x] Система статусов: ISSUED → PAID → OVERDUE → CANCELLED
  - [x] Security guards + фильтрация по companyId

- [x] **Days 4-7: Payments Module + Integration**
  - [x] Создать `PaymentsModule` + контроллер (entities готовы!)
  - [x] Реализовать `PaymentsService` с готовыми entities  
  - [x] Запись платежей и привязка к инвойсам
  - [x] Интеграция с payment-methods модулем
  - [x] Расчет баланса компании + проверка просрочек
  - [x] **КРИТИЧНО:** Subscription billing integration
  - [x] E2E тестирование: Order → Invoice → Payment

**🔥 MVP READY через неделю!**

#### **⚡ Week 2: Inventory & Users доработки**
- [ ] **Inventory доработки (3-4 дня)**
  - [ ] Завершить StockMovementsService
  - [ ] Реализовать SuppliersService
  - [ ] Добавить InventoryAlertsService
  - [ ] Создать отчеты по движению товаров

- [ ] **Users стандартизация (2-3 дня)**
  - [ ] Создать микросервисы (data, business, validation, mapper)
  - [ ] Добавить полноценный CRUD контроллер
  - [ ] Создать security тесты

### **🎯 БУДУЩИЕ ЭТАПЫ (ПОСЛЕ MVP)**

#### **ЭТАП 2: ADVANCED FEATURES (Опционально)**
- [ ] Analytics дашборды с KPI
- [ ] Notifications email/SMS уведомления
- [ ] Reports генерация PDF отчетов
- [ ] Mobile API для мобильного приложения

---

## ✅ **КРИТИЧЕСКИ ВАЖНЫЕ ПРОВЕРКИ ПОСЛЕ КАЖДОГО МОДУЛЯ**

### **Security Checklist:**
- [ ] 🛡️ Все endpoints имеют `@AuthWithOwnership()`
- [ ] 🔒 Все find методы фильтруются по `companyId`
- [ ] 🎯 Все ID параметры проверяются через `@CompanyResource()`
- [ ] 🚨 Используются кастомные исключения вместо `Error`
- [ ] 📊 Нет `any` типов в коде

### **Architecture Checklist:**
- [ ] 🏗️ Модуль следует стандартной структуре
- [ ] 🔄 MapperService создан и используется
- [ ] 🔧 TypeORM entities правильно импортированы в модуль
- [ ] 📝 DTO созданы для всех request/response
- [ ] 🧪 Security тесты написаны

### **Integration Checklist:**
- [ ] 🔗 Модуль интегрирован с SubscriptionLimitsService
- [ ] 📋 Audit логирование настроено
- [ ] 🎯 Swagger документация полная
- [ ] ⚡ Rate limiting настроен
- [ ] 🔍 E2E тесты покрывают основные сценарии

---

## 🎯 **КЛЮЧЕВЫЕ КОМАНДЫ ДЛЯ РАБОТЫ С ПРОЕКТОМ**

```bash
# Запуск в development
npm run start:dev

# Генерация миграции
npm run migration:generate -- --name=CreateOrderTables

# Запуск миграций
npm run migration:run

# Запуск тестов
npm run test
npm run test:e2e

# Генерация Swagger документации
npm run build && npm run start:prod
# Документация доступна на /api/docs
```

---

## 🚀 **ИТОГ ДЛЯ ИИ АССИСТЕНТА**

DriveCare V2 - это **enterprise-ready SaaS платформа** с **88% готовностью** и **качеством кода 9.5/10**.

**🔥 КАРДИНАЛЬНОЕ ИЗМЕНЕНИЕ СТАТУСА:**
- ✅ **13 из 16 MVP модулей ready** для production
- 🔄 **1 модуль (inventory)** дорабатывается (60% готов)
- 📋 **1 модуль (users)** требует стандартизации  
- ⚡ **2 модуля (payments+invoices)** БД готова, API = 1 неделя!

**Основные принципы работы:**
1. **Security-First** - каждая компания видит только свои данные
2. **Clean Architecture** - четкое разделение ответственности  
3. **Subscription-based** - проверка лимитов на каждом действии
4. **TypeScript Strict** - полная типизация без any

**🚨 КРИТИЧНЫЕ приоритеты для MVP (1-2 недели!):**
1. **Payments + Invoices** - БД готова, API модули = 5-7 дней ⚡
2. **Inventory** - завершить подмодули (3-4 дня)
3. **Users** - стандартизировать архитектуру (2-3 дня)

**💡 ПРОРЫВ:** Database schema готова = время разработки сокращено в 3 раза!

**🚀 MVP READY через 1-2 недели вместо 6 недель!**

**Архитектурные паттерны установлены** - следовать существующим образцам Companies/Subscriptions/Orders модулей.
