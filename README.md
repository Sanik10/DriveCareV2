# DriveCare CRM - Полная документация проекта

## 📋 Содержание

1. [Архитектура проекта](#архитектура-проекта)
2. [Структура проекта](#структура-проекта)
3. [Технологический стек](#технологический-стек)
4. [Установка и запуск](#установка-и-запуск)
5. [Разработка](#разработка)
6. [База данных](#база-данных)
7. [API документация](#api-документация)
8. [Конфигурация](#конфигурация)
9. [Деплой](#деплой)
10. [Лучшие практики](#лучшие-практики)

---

## 🏗️ Архитектура проекта

### Выбранная архитектура: **Модульный монолит в монорепо**

**Почему именно эта архитектура:**

1. **Модульный монолит** вместо микросервисов:
   - ✅ Простота разработки и отладки
   - ✅ Единая база данных и транзакции
   - ✅ Нет сложности с межсервисной коммуникацией
   - ✅ Легкий рефакторинг и изменения
   - ✅ Возможность легко выделить в микросервисы позже

2. **Монорепо** с Turborepo:
   - ✅ Общие типы и утилиты между frontend и backend
   - ✅ Единая система сборки и тестирования
   - ✅ Синхронизация версий зависимостей
   - ✅ Простой CI/CD pipeline

### Диаграмма архитектуры

```
┌─────────────────────────────────────────────────────────────┐
│                    DriveCare CRM                            │
├─────────────────────────────────────────────────────────────┤
│  Frontend (Next.js)          │  Backend (NestJS)            │
│  ├── Dashboard              │  ├── Auth Module             │
│  ├── Companies              │  ├── Users Module            │
│  ├── Customers              │  ├── Companies Module        │
│  ├── Orders                 │  ├── Customers Module        │
│  ├── Inventory              │  ├── Orders Module           │
│  └── Reports                │  ├── Inventory Module        │
│                             │  └── Reports Module          │
├─────────────────────────────────────────────────────────────┤
│                   Shared Libraries                          │
│  ├── Types & Interfaces    │  ├── UI Components           │
│  ├── Utilities             │  └── Configurations          │
├─────────────────────────────────────────────────────────────┤
│                     Infrastructure                          │
│  ├── PostgreSQL            │  ├── Redis                   │
│  ├── Docker                │  └── Nginx (Production)      │
└─────────────────────────────────────────────────────────────┘
```

---

## 📁 Структура проекта

```
DriveCarV2/
├── 📁 apps/                           # Приложения
│   ├── 📁 backend/                    # NestJS API
│   │   ├── 📁 src/
│   │   │   ├── 📁 modules/            # Бизнес-модули
│   │   │   │   ├── 📁 auth/           # Аутентификация
│   │   │   │   │   ├── auth.controller.ts
│   │   │   │   │   ├── auth.service.ts
│   │   │   │   │   ├── auth.module.ts
│   │   │   │   │   ├── 📁 dto/        # Data Transfer Objects
│   │   │   │   │   ├── 📁 guards/     # Охранники авторизации
│   │   │   │   │   └── 📁 strategies/ # Passport стратегии
│   │   │   │   ├── 📁 users/          # Пользователи
│   │   │   │   ├── 📁 companies/      # Автосервисы
│   │   │   │   ├── 📁 customers/      # Клиенты
│   │   │   │   ├── 📁 vehicles/       # Автомобили
│   │   │   │   ├── 📁 orders/         # Заказы на ремонт
│   │   │   │   ├── 📁 services/       # Услуги
│   │   │   │   ├── 📁 inventory/      # Склад запчастей
│   │   │   │   ├── 📁 payments/       # Платежи
│   │   │   │   └── 📁 reports/        # Отчеты
│   │   │   ├── 📁 database/           # База данных
│   │   │   │   ├── 📁 entities/       # TypeORM entities
│   │   │   │   ├── 📁 migrations/     # Миграции БД
│   │   │   │   ├── 📁 seeds/          # Начальные данные
│   │   │   │   └── database.config.ts # Конфигурация БД
│   │   │   ├── 📁 common/             # Общие компоненты
│   │   │   │   ├── 📁 guards/         # Глобальные охранники
│   │   │   │   ├── 📁 interceptors/   # Перехватчики
│   │   │   │   ├── 📁 decorators/     # Декораторы
│   │   │   │   ├── 📁 filters/        # Фильтры исключений
│   │   │   │   ├── 📁 pipes/          # Пайпы валидации
│   │   │   │   └── 📁 types/          # TypeScript типы
│   │   │   ├── 📁 config/             # Конфигурации
│   │   │   │   ├── app.config.ts      # Общие настройки
│   │   │   │   ├── jwt.config.ts      # JWT настройки
│   │   │   │   └── redis.config.ts    # Redis настройки
│   │   │   ├── main.ts                # Точка входа
│   │   │   └── app.module.ts          # Корневой модуль
│   │   ├── 📁 test/                   # E2E тесты
│   │   ├── package.json
│   │   ├── nest-cli.json
│   │   └── tsconfig.json
│   └── 📁 frontend/                   # Next.js приложение
│       ├── 📁 app/                    # App Router (Next.js 13+)
│       │   ├── 📁 dashboard/          # Главная панель
│       │   ├── 📁 companies/          # Управление автосервисами
│       │   ├── 📁 customers/          # Клиенты
│       │   ├── 📁 vehicles/           # Автомобили
│       │   ├── 📁 orders/             # Заказы
│       │   ├── 📁 inventory/          # Склад
│       │   ├── 📁 payments/           # Платежи
│       │   ├── 📁 reports/            # Отчеты
│       │   ├── 📁 auth/               # Авторизация
│       │   ├── layout.tsx             # Общий Layout
│       │   └── page.tsx               # Главная страница
│       ├── 📁 components/             # React компоненты
│       │   ├── 📁 ui/                 # UI компоненты
│       │   ├── 📁 forms/              # Формы
│       │   ├── 📁 tables/             # Таблицы
│       │   └── 📁 charts/             # Графики
│       ├── 📁 lib/                    # Утилиты
│       │   ├── api.ts                 # API клиент
│       │   ├── auth.ts                # Авторизация
│       │   └── utils.ts               # Вспомогательные функции
│       ├── 📁 types/                  # TypeScript типы
│       └── package.json
├── 📁 packages/                       # Общие пакеты
│   ├── 📁 shared/                     # Общие типы и утилиты
│   │   ├── 📁 types/                  # TypeScript типы
│   │   │   ├── auth.types.ts          # Типы авторизации
│   │   │   ├── user.types.ts          # Типы пользователей
│   │   │   ├── company.types.ts       # Типы компаний
│   │   │   ├── customer.types.ts      # Типы клиентов
│   │   │   ├── order.types.ts         # Типы заказов
│   │   │   └── api.types.ts           # API типы
│   │   ├── 📁 constants/              # Константы
│   │   ├── 📁 utils/                  # Утилиты
│   │   └── package.json
│   ├── 📁 ui/                         # UI библиотека
│   │   ├── 📁 components/             # Переиспользуемые компоненты
│   │   └── package.json
│   └── 📁 config/                     # Общие конфигурации
│       ├── 📁 eslint/                 # ESLint конфигурации
│       ├── 📁 typescript/             # TypeScript конфигурации
│       └── package.json
├── 📁 docs/                           # Документация
│   ├── 📁 api/                        # API документация
│   ├── 📁 deployment/                 # Инструкции по деплою
│   ├── 📁 development/                # Руководство разработчика
│   └── architecture.md               # Архитектурные решения
├── 📁 tools/                          # Инструменты и скрипты
│   ├── 📁 scripts/                    # Bash скрипты
│   │   ├── setup.sh                   # Скрипт установки
│   │   ├── seed-db.sh                 # Заполнение БД
│   │   └── backup-db.sh               # Бэкап БД
│   └── 📁 docker/                     # Docker конфигурации
│       ├── Dockerfile.backend         # Backend образ
│       ├── Dockerfile.frontend        # Frontend образ
│       └── docker-compose.prod.yml    # Production compose
├── 📄 docker-compose.yml              # Development окружение
├── 📄 .env                            # Переменные окружения
├── 📄 .env.example                    # Пример конфигурации
├── 📄 .gitignore                      # Git ignore
├── 📄 package.json                    # Root package.json
├── 📄 turbo.json                      # Turborepo конфигурация
└── 📄 README.md                       # Этот файл
```

---

## 🛠️ Технологический стек

### Backend
- **Framework:** NestJS 10.x
- **Language:** TypeScript 5.x
- **Database:** PostgreSQL 16
- **ORM:** TypeORM 0.3.x
- **Cache:** Redis 7
- **Authentication:** JWT + Refresh Tokens
- **Validation:** class-validator + class-transformer
- **Documentation:** Swagger/OpenAPI
- **Testing:** Jest

### Frontend
- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript 5.x
- **Styling:** Tailwind CSS
- **UI Library:** Shadcn/ui + Radix UI
- **State Management:** Zustand
- **Forms:** React Hook Form + Zod
- **HTTP Client:** Axios
- **Charts:** Recharts

### Infrastructure
- **Containerization:** Docker + Docker Compose
- **Monorepo:** Turborepo
- **Package Manager:** npm
- **Reverse Proxy:** Nginx (Production)
- **Process Manager:** PM2 (Production)

### Development Tools
- **Code Quality:** ESLint + Prettier
- **Git Hooks:** Husky + lint-staged
- **Testing:** Jest + Testing Library
- **API Testing:** Postman/Insomnia

---

## 🚀 Установка и запуск

### Предварительные требования

```bash
# Проверьте версии
node --version    # >= 20.0.0
npm --version     # >= 10.0.0
docker --version  # >= 24.0.0
```

### Быстрый старт

```bash
# 1. Клонирование и установка
git clone <repository-url> drivecare
cd drivecare
npm install

# 2. Настройка окружения
cp .env.example .env
# Отредактируйте .env файл

# 3. Запуск инфраструктуры
docker-compose up -d

# 4. Запуск приложений
npm run dev
```

### Подробная установка

#### 1. Клонирование проекта
```bash
git clone <repository-url> drivecare
cd drivecare
```

#### 2. Установка зависимостей
```bash
# Установка всех зависимостей для всех приложений
npm install

# Или для конкретного приложения
npm install --workspace=backend
npm install --workspace=frontend
```

#### 3. Настройка переменных окружения
```bash
# Создание файла окружения
cp .env.example .env

# Отредактируйте .env файл:
nano .env
```

#### 4. Запуск инфраструктуры
```bash
# Запуск PostgreSQL и Redis
docker-compose up -d

# Проверка статуса
docker-compose ps

# Просмотр логов
docker-compose logs -f
```

#### 5. Инициализация базы данных
```bash
# Применение миграций
npm run db:migrate

# Заполнение начальными данными
npm run db:seed
```

#### 6. Запуск приложений
```bash
# Запуск всех приложений (frontend + backend)
npm run dev

# Или запуск отдельно
npm run dev:backend   # Backend на порту 3001
npm run dev:frontend  # Frontend на порту 3000
```

---

## 💻 Разработка

### Команды разработки

```bash
# Запуск в режиме разработки
npm run dev              # Все приложения
npm run dev:backend      # Только backend
npm run dev:frontend     # Только frontend

# Сборка
npm run build            # Все приложения
npm run build:backend    # Только backend
npm run build:frontend   # Только frontend

# Тестирование
npm run test             # Все тесты
npm run test:backend     # Backend тесты
npm run test:frontend    # Frontend тесты
npm run test:e2e         # E2E тесты

# Линтинг и форматирование
npm run lint             # Проверка кода
npm run lint:fix         # Исправление ошибок
npm run format           # Форматирование кода

# Проверка типов
npm run type-check       # TypeScript проверка
```

### Создание нового модуля (Backend)

```bash
# Заходим в backend
cd apps/backend

# Создаем модуль
nest generate module modules/example
nest generate controller modules/example
nest generate service modules/example

# Создаем entity
mkdir src/database/entities
touch src/database/entities/example.entity.ts

# Создаем DTO
mkdir src/modules/example/dto
touch src/modules/example/dto/create-example.dto.ts
touch src/modules/example/dto/update-example.dto.ts
```

### Создание новой страницы (Frontend)

```bash
# Заходим в frontend
cd apps/frontend

# Создаем новую страницу
mkdir app/example
touch app/example/page.tsx
touch app/example/layout.tsx

# Создаем компонент
mkdir components/example
touch components/example/ExampleList.tsx
touch components/example/ExampleForm.tsx
```

### Работа с базой данных

```bash
# Создание миграции
npm run db:migration:create --name="CreateExampleTable"

# Применение миграций
npm run db:migration:run

# Откат миграции
npm run db:migration:revert

# Сброс базы данных
npm run db:drop

# Синхронизация схемы (только для разработки)
npm run db:sync
```

### Заполнение данными

```bash
# Запуск всех seeds
npm run db:seed

# Запуск конкретного seed
npm run db:seed:users
npm run db:seed:companies
```

---

## 🗄️ База данных

### Схема базы данных

```sql
-- Основные таблицы
Users           -- Пользователи системы
Companies       -- Автосервисы
Customers       -- Клиенты автосервисов
Vehicles        -- Автомобили клиентов
Orders          -- Заказы на ремонт
Services        -- Услуги автосервиса
OrderServices   -- Связь заказов и услуг
Parts           -- Запчасти
Inventory       -- Склад запчастей
OrderParts      -- Использованные запчасти
Payments        -- Платежи
Invoices        -- Счета
AuditLogs       -- Логи изменений
```

### Основные Entity

#### User Entity
```typescript
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ type: 'enum', enum: UserRole })
  role: UserRole;

  @ManyToOne(() => Company)
  company: Company;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

#### Company Entity
```typescript
@Entity('companies')
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  address: string;

  @Column()
  phone: string;

  @Column({ unique: true })
  email: string;

  @OneToMany(() => User, user => user.company)
  users: User[];

  @OneToMany(() => Customer, customer => customer.company)
  customers: Customer[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### Миграции

```bash
# Создание новой миграции
npm run typeorm migration:create src/database/migrations/CreateUserTable

# Применение миграций
npm run typeorm migration:run

# Откат последней миграции
npm run typeorm migration:revert

# Показать статус миграций
npm run typeorm migration:show
```

### Подключение к базе данных

```bash
# Подключение через psql
psql -h localhost -p 5433 -U postgres -d drivecare

# Подключение через Docker
docker exec -it drivecarev2-postgres-1 psql -U postgres -d drivecare

# Бэкап базы данных
docker exec drivecarev2-postgres-1 pg_dump -U postgres drivecare > backup.sql

# Восстановление из бэкапа
docker exec -i drivecarev2-postgres-1 psql -U postgres drivecare < backup.sql
```

---

## 📚 API документация

### Swagger/OpenAPI

API документация автоматически генерируется и доступна по адресу:
- **Development:** http://localhost:3001/docs
- **Production:** https://api.drivecare.com/docs

### Основные эндпоинты

#### Аутентификация
```
POST   /api/v1/auth/register    # Регистрация
POST   /api/v1/auth/login       # Авторизация
POST   /api/v1/auth/refresh     # Обновление токена
POST   /api/v1/auth/logout      # Выход
GET    /api/v1/auth/profile     # Профиль пользователя
```

#### Пользователи
```
GET    /api/v1/users            # Список пользователей
GET    /api/v1/users/:id        # Конкретный пользователь
POST   /api/v1/users            # Создание пользователя
PUT    /api/v1/users/:id        # Обновление пользователя
DELETE /api/v1/users/:id        # Удаление пользователя
```

#### Компании
```
GET    /api/v1/companies        # Список компаний
GET    /api/v1/companies/:id    # Конкретная компания
POST   /api/v1/companies        # Создание компании
PUT    /api/v1/companies/:id    # Обновление компании
DELETE /api/v1/companies/:id    # Удаление компании
```

#### Клиенты
```
GET    /api/v1/customers        # Список клиентов
GET    /api/v1/customers/:id    # Конкретный клиент
POST   /api/v1/customers        # Создание клиента
PUT    /api/v1/customers/:id    # Обновление клиента
DELETE /api/v1/customers/:id    # Удаление клиента
```

#### Заказы
```
GET    /api/v1/orders           # Список заказов
GET    /api/v1/orders/:id       # Конкретный заказ
POST   /api/v1/orders           # Создание заказа
PUT    /api/v1/orders/:id       # Обновление заказа
DELETE /api/v1/orders/:id       # Удаление заказа
PATCH  /api/v1/orders/:id/status # Изменение статуса
```

### Форматы ответов

#### Успешный ответ
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Example"
  },
  "meta": {
    "timestamp": "2025-01-01T00:00:00Z",
    "version": "1.0"
  }
}
```

#### Ошибка
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Email is required"
      }
    ]
  },
  "meta": {
    "timestamp": "2025-01-01T00:00:00Z",
    "version": "1.0"
  }
}
```

---

## ⚙️ Конфигурация

### Переменные окружения

#### `.env` файл
```bash
# === DATABASE ===
DATABASE_URL=postgresql://postgres:135137@localhost:5433/drivecare
POSTGRES_HOST=localhost
POSTGRES_PORT=5433
POSTGRES_USERNAME=postgres
POSTGRES_PASSWORD=135137
POSTGRES_DATABASE=drivecare

# === REDIS ===
REDIS_URL=redis://localhost:6380
REDIS_HOST=localhost
REDIS_PORT=6380

# === JWT ===
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

# === APPLICATION ===
NODE_ENV=development
PORT=3001
API_PREFIX=api/v1

# === FRONTEND ===
FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1

# === EMAIL ===
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# === FILE STORAGE ===
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760  # 10MB

# === MONITORING ===
SENTRY_DSN=your-sentry-dsn
LOG_LEVEL=debug
```

#### Конфигурации по окружениям

##### Development (.env.development)
```bash
NODE_ENV=development
LOG_LEVEL=debug
DB_SYNC=true
CORS_ORIGIN=http://localhost:3000
```

##### Staging (.env.staging)
```bash
NODE_ENV=staging
LOG_LEVEL=info
DB_SYNC=false
CORS_ORIGIN=https://staging.drivecare.com
```

##### Production (.env.production)
```bash
NODE_ENV=production
LOG_LEVEL=error
DB_SYNC=false
CORS_ORIGIN=https://drivecare.com
```

### Конфигурационные модули

#### Database Config
```typescript
// apps/backend/src/config/database.config.ts
export const getDatabaseConfig = (configService: ConfigService): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: configService.get('POSTGRES_HOST'),
  port: configService.get('POSTGRES_PORT'),
  username: configService.get('POSTGRES_USERNAME'),
  password: configService.get('POSTGRES_PASSWORD'),
  database: configService.get('POSTGRES_DATABASE'),
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
  synchronize: configService.get('NODE_ENV') === 'development',
  logging: configService.get('LOG_LEVEL') === 'debug',
});
```

#### JWT Config
```typescript
// apps/backend/src/config/jwt.config.ts
export const getJwtConfig = (configService: ConfigService): JwtModuleOptions => ({
  secret: configService.get('JWT_SECRET'),
  signOptions: {
    expiresIn: configService.get('JWT_EXPIRATION', '15m'),
  },
});
```

---

## 🚀 Деплой

### Development деплой

```bash
# Запуск в development режиме
npm run dev

# Сборка для production
npm run build

# Запуск production сборки локально
npm run start:prod
```

### Production деплой

#### Docker Production Setup

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    restart: always
    environment:
      POSTGRES_USER: ${POSTGRES_USERNAME}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DATABASE}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - app_network

  redis:
    image: redis:7-alpine
    restart: always
    volumes:
      - redis_data:/data
    networks:
      - app_network

  backend:
    build:
      context: .
      dockerfile: tools/docker/Dockerfile.backend
    restart: always
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - postgres
      - redis
    networks:
      - app_network

  frontend:
    build:
      context: .
      dockerfile: tools/docker/Dockerfile.frontend
    restart: always
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
    depends_on:
      - backend
    networks:
      - app_network

  nginx:
    image: nginx:alpine
    restart: always
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./tools/docker/nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend
    networks:
      - app_network

volumes:
  postgres_data:
  redis_data:

networks:
  app_network:
    driver: bridge
```

#### Backend Dockerfile

```dockerfile
# tools/docker/Dockerfile.backend
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
COPY turbo.json ./

FROM base AS deps
RUN npm ci --only=production

FROM base AS build
RUN npm ci
COPY . .
RUN npm run build:backend

FROM node:20-alpine AS runtime
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/apps/backend/dist ./dist
COPY --from=build /app/apps/backend/package.json ./package.json

EXPOSE 3001
USER node
CMD ["node", "dist/main.js"]
```

#### Frontend Dockerfile

```dockerfile
# tools/docker/Dockerfile.frontend
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
COPY turbo.json ./

FROM base AS deps
RUN npm ci --only=production

FROM base AS build
RUN npm ci
COPY . .
RUN npm run build:frontend

FROM node:20-alpine AS runtime
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/apps/frontend/.next ./.next
COPY --from=build /app/apps/frontend/package.json ./package.json

EXPOSE 3000
USER node
CMD ["npm", "start"]
```

#### Деплой команды

```bash
# Сборка и деплой на production
docker-compose -f docker-compose.prod.yml up -d --build

# Применение миграций на production
docker-compose -f docker-compose.prod.yml exec backend npm run db:migrate

# Просмотр логов
docker-compose -f docker-compose.prod.yml logs -f

# Обновление без даунтайма
./tools/scripts/zero-downtime-deploy.sh
```

---

## 🎯 Лучшие практики

### Структура кода

1. **Модульность**: Каждый бизнес-домен в отдельном модуле
2. **Слоистая архитектура**: Controller → Service → Repository
3. **Dependency Injection**: Используйте DI контейнер NestJS
4. **Валидация**: Всегда валидируйте входящие данные
5. **Типизация**: Строгая типизация с TypeScript

### Безопасность

1. **Аутентификация**: JWT + Refresh Token стратегия
2. **Авторизация**: Role-based access control (RBAC)
3. **Валидация**: Sanitize и validate все входящие данные
4. **CORS**: Настройте CORS для production
5. **Rate Limiting**: Ограничьте количество запросов
6. **SQL Injection**: Используйте параметризованные запросы
7. **Secrets**: Никогда не коммитьте секреты в Git

### База данных

1. **Миграции**: Всегда используйте миграции вместо sync
2. **Индексы**: Создавайте индексы для часто запрашиваемых полей
3. **Транзакции**: Используйте транзакции для критических операций
4. **Бэкапы**: Регулярно создавайте бэкапы
5. **Мониторинг**: Отслеживайте производительность запросов

### Frontend

1. **Компоненты**: Создавайте переиспользуемые компоненты
2. **State Management**: Используйте Zustand для глобального состояния
3. **Формы**: React Hook Form + Zod для валидации
4. **Загрузка**: Показывайте loading состояния
5. **Ошибки**: Обрабатывайте ошибки пользовательским способом
6. **SEO**: Оптимизируйте для поисковых систем
7. **Доступность**: Следуйте принципам a11y

### Тестирование

1. **Unit Tests**: Покрытие сервисов и утилит
2. **Integration Tests**: Тестирование API эндпоинтов
3. **E2E Tests**: Критические пользовательские сценарии
4. **Coverage**: Стремитесь к 80%+ покрытию
5. **TDD**: Test-Driven Development для критических функций

### Мониторинг и логирование

1. **Structured Logging**: JSON формат для логов
2. **Error Tracking**: Используйте Sentry или аналог
3. **Metrics**: Отслеживайте ключевые метрики
4. **Health Checks**: Эндпоинты для проверки здоровья
5. **APM**: Application Performance Monitoring

### Git и CI/CD

1. **Branching Strategy**: Git Flow или GitHub Flow
2. **Commit Messages**: Conventional Commits
3. **Code Review**: Обязательный peer review
4. **Automated Testing**: Запускайте тесты в CI
5. **Automated Deployment**: CD pipeline для production

---

## 📝 Заметки и документация

### Где писать документацию

1. **README.md** - Общая информация и быстрый старт
2. **docs/** - Подробная документация
   - `docs/api/` - API документация
   - `docs/deployment/` - Инструкции по деплою
   - `docs/development/` - Руководство разработчика
3. **Swagger** - Интерактивная API документация
4. **Код** - JSDoc комментарии для сложной логики
5. **Wiki** - Бизнес процессы и требования

### Полезные команды

```bash
# Проверка здоровья системы
npm run health-check

# Анализ размера бандла
npm run analyze

# Проверка безопасности
npm audit

# Обновление зависимостей
npm run update-deps

# Очистка кэша
npm run clean

# Генерация документации
npm run docs:generate
```

### Контакты и поддержка

- **Техническая поддержка**: tech@drivecare.com
- **Документация**: https://docs.drivecare.com
- **Issue Tracker**: GitHub Issues
- **Slack/Discord**: #drivecare-dev
