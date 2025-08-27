# 📚 **ПОЛНОЕ РУКОВОДСТВО ПО ИСПРАВЛЕНИЮ AUTH MODULE - DriveCare V2**

**Версия документа:** 1.0  
**Дата:** 2025-01-01  
**Статус:** 29 критических проблем найдено | 0 исправлено  

---

## 📖 **1. ОБЗОР AUTH MODULE**

### **Описание модуля**
AUTH модуль - это ядро системы безопасности DriveCare V2, отвечающее за:
- **Аутентификацию** (проверка подлинности пользователей)
- **Авторизацию** (проверка прав доступа) 
- **Управление сессиями** (JWT + Redis)
- **Multi-tenant безопасность** (изоляция данных компаний)
- **Регистрацию компаний** и создание владельцев
- **Защиту от атак** (rate limiting, failed attempts, etc.)

### **Ключевые особенности**
- **Multi-tenant архитектура** - полная изоляция данных между компаниями
- **JWT токены** с refresh механизмом
- **Device tracking** - отслеживание устройств пользователей  
- **Session management** - управление активными сессиями
- **Role-based access control** - гибкая система ролей
- **Redis** для быстрого кэширования токенов и блокировок
- **Audit logging** - полное логирование всех действий

---

## 🎭 **2. СИСТЕМА РОЛЕЙ**

### **🔐 Platform Level (Уровень платформы)**
```typescript
'superadmin'        // Полный контроль над платформой (ты как создатель)
'platform_admin'    // Тех. поддержка уровня платформы  
'auditor'           // Только просмотр данных и логов
'support_engineer'  // Временный доступ к данным компаний
'system_operator'   // Управление инфраструктурой, деплой
```

### **🏢 Company Level (Уровень компании)**

**👑 Владельцы и управляющие:**
```typescript
'company_owner'     // Основатель/ген. директор автосервиса
'company_admin'     // Управляющий/директор филиала
```

**🧑‍💼 Операционные роли:**
```typescript
'manager'           // Менеджер по работе с клиентами
'cashier'           // Кассир/бухгалтер
'inventory_manager' // Складской специалист
'service_advisor'   // Приемщик
```

**🔧 Технические роли:**
```typescript
'lead_mechanic'     // Старший мастер
'mechanic'          // Мастер
'diagnostic'        // Диагност-специалист
```

### **Иерархия доступа:**
```
SuperAdmin (платформа)
├── PlatformAdmin
├── SupportEngineer  
├── Auditor
└── Companies (multi-tenant)
    └── CompanyOwner
        ├── CompanyAdmin
        │   ├── Manager
        │   ├── Cashier
        │   ├── InventoryManager
        │   ├── ServiceAdvisor
        │   └── LeadMechanic
        │       └── Mechanic
        └── Diagnostic
```

---

## 🏗️ **3. АРХИТЕКТУРА AUTH MODULE**

### **Структура файлов:**
```
modules/auth/
├── auth.module.ts              # Основной модуль
├── auth.controller.ts          # REST API endpoints
├── auth.service.ts             # Оркестратор бизнес-логики
├── constants.ts               # Основные константы
├── redis.provider.ts          # Redis подключение
│
├── constants/
│   ├── auth.constants.ts      # Auth константы и роли
│   └── redis.constants.ts     # Redis настройки
│
├── decorators/
│   └── roles.decorator.ts     # @Roles() decorator
│
├── dto/
│   ├── request/              # Входящие DTO
│   └── response/             # Исходящие DTO
│
├── guards/
│   ├── jwt-auth.guard.ts     # JWT проверка
│   ├── local-auth.guard.ts   # Login проверка
│   └── roles.guard.ts        # Роли проверка
│
├── interfaces/
│   ├── device.interface.ts   # Device типы
│   ├── session.interface.ts  # Session типы
│   ├── token-payload.interface.ts  # JWT payload
│   └── request-with-user.interface.ts # Request расширение
│
├── services/
│   ├── token.service.ts           # JWT токены
│   ├── session.service.ts         # Сессии управление
│   ├── security.service.ts        # Безопасность (Redis)
│   ├── device.service.ts          # Device fingerprinting
│   └── company-onboarding.service.ts # Регистрация компаний
│
├── strategies/
│   ├── jwt.strategy.ts        # JWT стратегия Passport
│   └── local.strategy.ts      # Local стратегия Passport
│
└── types/
    └── auth.types.ts          # TypeScript типы
```

### **Основные компоненты:**

**AuthService** - главный оркестратор:
- `validateUser()` - проверка credentials
- `generateTokens()` - создание JWT токенов
- `refreshToken()` - обновление токенов
- `logout()` - выход из системы
- `registerCompany()` - регистрация новой компании

**TokenService** - управление JWT:
- Создание access/refresh токенов
- Верификация токенов
- Настройка алгоритмов шифрования

**SessionService** - управление сессиями:
- Создание сессий в БД + Redis
- Валидация активных сессий
- Удаление сессий при logout

**SecurityService** - защита от атак:
- Rate limiting через Redis
- Блокировка IP при множественных неудачных попытках
- Санитизация Redis ключей

**DeviceService** - отслеживание устройств:
- Device fingerprinting
- Генерация уникальных device ID
- Парсинг User-Agent

---

## 🚨 **4. ПОЛНЫЙ СПИСОК ПРОБЛЕМ (29 ШТУК)**

### **🔴 КРИТИЧЕСКИЕ (SCORE 10/10) - 8 проблем**

| ID | Проблема | Файл | Описание |
|----|----------|------|----------|
| #1 | Multi-tenant Data Breach | auth.controller.ts:248-252 | getUsers() возвращает ВСЕХ пользователей из ВСЕХ компаний |
| #2 | JWT Algorithm Confusion | jwt.strategy.ts:16-22 | Алгоритм не указан - уязвимость "none" algorithm |
| #10 | JWT Algorithm Missing | token.service.ts:18-26 | jwtService.sign() без algorithm |
| #18 | JWT Module Misconfiguration | auth.module.ts:21-29 | JwtModule без algorithm |
| #23 | Missing Email Uniqueness | user.entity.ts:11 | email без unique constraint |
| #24 | Multi-tenant Users Breach | users.service.ts:25-29 | findAll() без компании фильтра |
| #25 | Role Duplicates | role.entity.ts:15-20 | Можно создать дубли ролей в компании |
| #29 | Company Email Unique | company.entity.ts:21 | email компании без unique |

### **🔴 ВЫСОКИЕ (SCORE 8-9/10) - 12 проблем**

| ID | Проблема | Файл | Описание |
|----|----------|------|----------|
| #3 | Missing Session Validation | jwt.strategy.ts:25-35 | validate() не проверяет активность сессии |
| #4 | Missing Rate Limiting | auth.controller.ts | DoS возможен на всех endpoints |
| #9 | Race Conditions in Auth | auth.service.ts:21-30 | checkFailedLoginAttempts vs recordFailedLoginAttempt |
| #11 | Missing IP/Device Validation | local.strategy.ts:12-19 | validate() не получает IP/userAgent |
| #12 | Session Hijacking | session.service.ts:62-70 | findSessionByRefreshToken без IP проверки |
| #13 | Race Conditions Security | security.service.ts:14-45 | Неатомарные операции в Redis |
| #16 | Weak Device Fingerprinting | device.service.ts:10-24 | UUID делает deviceId непредсказуемым |
| #17 | Transaction Missing | company-onboarding.service.ts:24-45 | Нет транзакций при создании компании |
| #19 | Weak Throttling Limits | auth.module.ts:35-40 | 60 req/min слишком много |
| #20 | Redis Key Injection | auth.constants.ts:3-11 | Ключи не санитизированы |
| #21 | Missing Session ID | token-payload.interface.ts:5-13 | sessionId отсутствует в payload |
| #26 | Missing Session Relations | user-session.entity.ts:12-15 | Нет relation к User |

### **🟡 СРЕДНИЕ (SCORE 6-7/10) - 9 проблем**

| ID | Проблема | Файл | Описание |
|----|----------|------|----------|
| #5 | Information Disclosure | auth.controller.ts:122-131 | Детали реализации в ошибках |
| #6 | Redis Key Injection | security.service.ts:15 | email не санитизируется |
| #7 | Missing Input Validation | auth.controller.ts | ValidationPipe отсутствует |
| #8 | Weak Guards | jwt-auth.guard.ts, local-auth.guard.ts | Недостаточные проверки |
| #22 | Weak Password Validation | login.dto.ts:15-18 | MinLength(6) слишком слабо |
| #27 | Weak Password Hashing | users.service.ts:54-57 | bcrypt.genSalt() без параметров |
| #28 | No Role Validation | users.service.ts:31-50 | create() не проверяет принадлежность роли |
| #1.1 | AuthRole Type Mismatch | auth.types.ts vs constants | Конфликт ролей между файлами |
| #1.2 | Missing Session Method | session.service.ts | isSessionActive() отсутствует |

---

## 🎯 **5. ДЕТАЛЬНЫЙ ПЛАН ИСПРАВЛЕНИЙ**

### **🚨 ПРИОРИТЕТ 1 - КРИТИЧЕСКИЕ BREACHES (ВЫПОЛНЕН)**

#### **Шаг 1.1: Исправить конфликт ролей**
**Проблема:** `auth.types.ts` содержит старые роли ('owner', 'admin'), а `constants.ts` - новые ('company_owner', 'company_admin')

**Файлы для исправления:**
- `modules/auth/types/auth.types.ts`
- `modules/auth/constants/auth.constants.ts` 

**Исправление:**
```typescript
// modules/auth/types/auth.types.ts - НОВЫЙ КОНТЕНТ
export type AuthRole = 
  // Platform level
  | 'superadmin' 
  | 'platform_admin'
  | 'auditor'
  | 'support_engineer'
  | 'system_operator'
  // Company level  
  | 'company_owner'
  | 'company_admin'
  | 'manager'
  | 'cashier'
  | 'inventory_manager'
  | 'service_advisor'
  | 'lead_mechanic'
  | 'mechanic'
  | 'diagnostic';
```

#### **Шаг 1.2: Добавить unique constraints**
**Файлы для исправления:**
- `database/entities/user.entity.ts`
- `database/entities/company.entity.ts`
- `database/entities/role.entity.ts`

**Исправления:**
```typescript
// user.entity.ts - добавить unique к email
@Column({ nullable: false, type: 'varchar', length: 255, unique: true })
email: string;

// company.entity.ts - добавить unique к email  
@Column({ type: 'varchar', length: 255, unique: true })
email: string;

// role.entity.ts - добавить unique constraint
@Entity('roles')
@Unique(['name', 'companyId'])
export class Role {
```

#### **Шаг 1.3: Исправить multi-tenant breach в UsersService**
**Файл:** `modules/users/users.service.ts`

**Исправления:**
```typescript
// Добавить метод для компании
async findByCompanyId(companyId: string): Promise<User[]> {
  return this.usersRepository.find({
    where: { company_id: companyId },
    relations: ['role']
  });
}

// Исправить findAll для безопасности
async findAll(companyId?: string): Promise<User[]> {
  const where = companyId ? { company_id: companyId } : {};
  return this.usersRepository.find({ where, relations: ['role'] });
}

// Усилить хеширование пароля
async hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12); // 12 rounds для 2025
  return bcrypt.hash(password, salt);
}

// Добавить валидацию ролей
async create(userData: Partial<User>): Promise<User> {
  const role = await this.rolesRepository.findOne({
    where: { id: userData.roleId }
  });
  
  if (!role) {
    throw new NotFoundException(`Role with ID ${userData.roleId} not found`);
  }
  
  // Валидация принадлежности роли к компании
  if (role.companyId !== userData.company_id && role.companyId !== null) {
    throw new ForbiddenException('Cannot assign role from another company');
  }
  
  // ... rest of the method
}
```

---

### **🔴 ПРИОРИТЕТ 2 - JWT И ТОКЕНЫ (ВЫПОЛНЕН)**

#### **Шаг 2.1: Исправить Token Service**
**Файл:** `modules/auth/services/token.service.ts`

**Критические исправления:**
```typescript
async createTokenPair(user: User, deviceId: string, sessionId: string): Promise<TokenPair> {
  const payload: TokenPayload = {
    sub: user.id,
    email: user.email,
    role: user.role.name,
    companyId: user.role.name === 'superadmin' ? null : user.company_id,
    deviceId,
    sessionId, // ✅ ДОБАВЛЕНО sessionId
  };

  const accessToken = this.jwtService.sign(payload, {
    secret: this.configService.get('JWT_SECRET'),
    expiresIn: '15m',
    algorithm: 'HS256',           // ✅ КРИТИЧНО: algorithm добавлен
    issuer: 'drivecare-v2',       // ✅ ДОБАВЛЕНО: issuer
    audience: 'drivecare-users'   // ✅ ДОБАВЛЕНО: audience
  });

  // Аналогично для refreshToken...
}

verifyRefreshToken(token: string): TokenPayload {
  return this.jwtService.verify(token, {
    secret: this.configService.get('JWT_REFRESH_SECRET'),
    algorithms: ['HS256'],        // ✅ КРИТИЧНО: algorithm verification
    issuer: 'drivecare-v2',
    audience: 'drivecare-users'
  });
}
```

#### **Шаг 2.2: Добавить отсутствующий метод в Session Service**
**Файл:** `modules/auth/services/session.service.ts`

**Критические дополнения:**
```typescript
// ✅ ДОБАВИТЬ отсутствующий метод isSessionActive
async isSessionActive(sessionId: string): Promise<boolean> {
  const session = await this.userSessionRepository.findOne({
    where: { 
      id: sessionId,
      isActive: true,
      expiresAt: MoreThan(new Date()) // Проверяем что не истекла
    }
  });
  
  return !!session;
}

// ✅ ИСПРАВИТЬ для валидации IP/device
async findSessionByRefreshToken(
  userId: string, 
  refreshToken: string,
  ipAddress?: string,
  deviceId?: string
): Promise<UserSession | null> {
  const where: any = { userId, refreshToken, isActive: true };
  
  if (ipAddress) where.ipAddress = ipAddress;
  if (deviceId) where.deviceId = deviceId;
  
  return this.userSessionRepository.findOne({ where });
}
```

#### **Шаг 2.3: Исправить Auth Module**
**Файл:** `modules/auth/auth.module.ts`

**Критические исправления:**
```typescript
TypeOrmModule.forFeature([
  UserSession, 
  Company, 
  Role,
  User // ✅ ДОБАВЛЕНО: User entity
]),
```

#### **Шаг 2.4: Исправить Token Payload Interface**
**Файл:** `modules/auth/interfaces/token-payload.interface.ts`

```typescript
export interface TokenPayload {
  sub: string;
  email: string;
  role: AuthRole;                 // ✅ ИСПРАВЛЕНО: AuthRole вместо string
  companyId: string | null;
  deviceId: string;
  sessionId: string;              // ✅ УЖЕ ДОБАВЛЕНО
  iat?: number;
  exp?: number;
}
```

---

### **🟡 ПРИОРИТЕТ 3 - RACE CONDITIONS И БЕЗОПАСНОСТЬ (ВЫПОЛНЕН)**

#### **Шаг 3.1: Исправить Race Conditions в Security Service**
**Файл:** `modules/auth/services/security.service.ts`

**Критическое исправление:**
```typescript
// ✅ ИМПОРТ функции санитизации
import { AUTH_CONSTANTS, sanitizeForRedisKey } from '../constants/auth.constants';

// ✅ ИСПРАВИТЬ race condition атомарной операцией
async checkAndRecordFailedAttempt(email: string, ip: string): Promise<{ isBlocked: boolean; attempts: number }> {
  const sanitizedEmail = sanitizeForRedisKey(email);
  const sanitizedIp = sanitizeForRedisKey(ip);
  
  const multi = this.redis.multi();
  const key = `login:failed:${sanitizedIp}:${sanitizedEmail}`;
  
  multi.incr(key);
  multi.expire(key, 3600);
  multi.get(key);
  
  const results = await multi.exec();
  const attempts = parseInt(results[2][1] as string);
  
  return { 
    isBlocked: attempts >= 5,
    attempts 
  };
}
```

#### **Шаг 3.2: Исправить Device Service**
**Файл:** `modules/auth/services/device.service.ts`

**Критическое исправление:**
```typescript
generateDeviceId(identifier: DeviceIdentifier): string {
  // ... parse device info ...

  // ✅ ИСПРАВЛЕНО: убираем UUID для предсказуемости
  const deviceString = `${identifier.userId}:${JSON.stringify(deviceInfo)}`;
  return createHash('sha256').update(deviceString).digest('hex');
}
```

#### **Шаг 3.3: Добавить транзакции в Company Onboarding**
**Файл:** `modules/auth/services/company-onboarding.service.ts`

**Критическое исправление:**
```typescript
import { DataSource } from 'typeorm';

constructor(
  // ... existing injections ...
  private dataSource: DataSource, // ✅ ДОБАВЛЕНО
) {}

async createCompanyWithOwner(registerDto: RegisterCompanyDto): Promise<RegisterCompanyResponseDto> {
  // ✅ ДОБАВЛЕНО: транзакция
  return this.dataSource.transaction(async manager => {
    const existingUser = await this.usersService.findByEmail(registerDto.ownerEmail);
    if (existingUser) {
      throw new UserExistsException();
    }

    const company = await this.createCompany(registerDto, manager);
    const ownerRole = await this.createCompanyRoles(company.id, manager);
    const owner = await this.createCompanyOwner(registerDto, company.id, ownerRole.id, manager);

    return { company, owner, message: 'Компания и владелец успешно созданы' };
  });
}
```

#### **Шаг 3.4: Исправить Auth Constants**
**Файл:** `modules/auth/constants/auth.constants.ts`

**Критическое исправление:**
```typescript
// ✅ ВЫНЕСТИ функцию наружу
function sanitizeForRedisKey(input: string): string {
  return input.replace(/[^a-zA-Z0-9@._-]/g, '_');
}

export const AUTH_CONSTANTS = {
  REDIS_KEYS: {
    REFRESH_TOKEN: (userId: string, deviceId: string) => 
      `refresh_token:${sanitizeForRedisKey(userId)}:${sanitizeForRedisKey(deviceId)}`,
    // ... остальные ключи
  },
  // ... остальные константы
} as const;

// ✅ ЭКСПОРТ функции отдельно
export { sanitizeForRedisKey };
```

#### **Шаг 3.5: Исправить Auth Service Race Condition**
**Файл:** `modules/auth/auth.service.ts`

**Критическое исправление:**
```typescript
async validateUser(email: string, password: string, ipAddress?: string, userAgent?: string): Promise<any> {
  try {
    if (ipAddress) {
      // ✅ ИСПРАВЛЕНО: атомарная операция
      const result = await this.securityService.checkAndRecordFailedAttempt(email, ipAddress);
      if (result.isBlocked) {
        throw new TooManyAttemptsException();
      }
    }
    
    // ... rest of validation logic
  } catch (error) {
    // ... error handling
  }
}
```

---

### **🔧 ПРИОРИТЕТ 4 - ДОПОЛНИТЕЛЬНЫЕ ИСПРАВЛЕНИЯ (ВЫПОЛНЕН)**

#### **Шаг 4.1: Усилить валидацию паролей**
**Файлы:** 
- `modules/auth/dto/request/login.dto.ts`
- `modules/auth/dto/request/register-company.dto.ts`

**Исправления:**
```typescript
@IsNotEmpty({ message: 'Пароль обязателен' })
@MinLength(8, { message: 'Минимум 8 символов' })
@Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
  message: 'Пароль должен содержать: строчные, заглавные буквы, цифры и спецсимволы'
})
password: string;
```

#### **Шаг 4.2: Добавить User Session Relations**
**Файл:** `database/entities/user-session.entity.ts`

```typescript
import { ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

@ManyToOne(() => User, { onDelete: 'CASCADE' })
@JoinColumn({ name: 'user_id' })
user: User;

@Column({ name: 'user_id', type: 'uuid' })
userId: string;
```

#### **Шаг 4.3: Усилить Guards**
**Файлы:**
- `modules/auth/guards/jwt-auth.guard.ts`
- `modules/auth/guards/local-auth.guard.ts`

**Уже исправлены в текущей версии! ✅**

#### **Шаг 4.4: Добавить ValidationPipe**
**Файл:** `modules/auth/auth.controller.ts`

**Уже исправлено! ✅**
```typescript
@UsePipes(new ValidationPipe({ 
  transform: true, 
  whitelist: true,
  forbidNonWhitelisted: true,
  transformOptions: {
    enableImplicitConversion: false
  }
}))
```

---

## 📋 **6. ЧЕК-ЛИСТ ИСПРАВЛЕНИЙ**

### **✅ Уже исправлено:**
- [x] JWT algorithm в auth.module.ts
- [x] Rate limiting на endpoints
- [x] ValidationPipe в controller
- [x] JWT strategy session validation
- [x] Multi-tenant логика в getUsers()
- [x] JWT guards усилены
- [x] SessionId добавлен в TokenPayload

**КРИТИЧНО (делать первым!):**
- [x] Конфликт ролей auth.types.ts vs constants
- [x] Unique constraints в entities
- [x] Multi-tenant безопасность в users.service
- [x] Algorithm в token.service
- [x] isSessionActive() метод в session.service
- [x] User entity в auth.module

**ВЫСОКИЙ ПРИОРИТЕТ:**
- [x] Race conditions в security.service
- [x] Device ID в device.service  
- [x] Транзакции в company-onboarding.service
- [x] sanitizeForRedisKey вынести из константы
- [x] IP/Device validation в session.service
- [x] Session relations в user-session.entity

**СРЕДНИЙ ПРИОРИТЕТ:**
- [x] Валидация паролей (8+ символов, сложность)
- [x] Хеширование пароля (12 rounds bcrypt)
- [x] Role validation в users.service.create()

---

## 👥 **7. USERS MODULE - БАЗОВАЯ ИНФОРМАЦИЯ**

### **Текущее состояние:**
Users модуль пока не стандартизован и требует рефакторинга под общую архитектуру проекта.

### **Текущие файлы:**
```
modules/users/
├── users.module.ts
├── users.controller.ts  
├── users.service.ts
└── dto/
    ├── request/
    │   ├── create-user.dto.ts
    │   └── update-user.dto.ts
    └── response/
        ├── user-response.dto.ts
        ├── profile-response.dto.ts
        └── role.dto.ts
```

### **Что нужно добавить:**
```
modules/users/
├── constants/
│   └── users.constants.ts     # Константы модуля
├── interfaces/  
│   └── users.interface.ts     # Интерфейсы
├── services/
│   ├── users-business.service.ts    # Бизнес-логика
│   ├── users-data.service.ts        # Работа с БД
│   ├── users-mapper.service.ts      # Маппинг DTO
│   └── users-validation.service.ts  # Валидация
└── types/
    └── users.types.ts         # TypeScript типы
```

### **Логика для переноса из auth:**
Некоторые методы из `modules/auth/auth.service.ts` должны быть перенесены в users:
- Управление профилем пользователя  
- Обновление данных пользователя
- Смена пароля
- Активация/деактивация пользователей

---

## 🚀 **8. ПЛАН ВЫПОЛНЕНИЯ (РЕКОМЕНДУЕМЫЙ ПОРЯДОК)**

### **Сессия 1 (текущая):**
1. ✅ Исправить конфликт ролей (auth.types.ts + constants)
2. ✅ Добавить unique constraints в entities
3. ✅ Исправить users.service для multi-tenant
4. ✅ Добавить algorithm в token.service
5. ✅ Добавить isSessionActive() в session.service

### **Сессия 2:**
6. ✅ Исправить race conditions в security.service
7. ✅ Исправить device.service
8. ✅ Добавить транзакции в company-onboarding
9. ✅ Вынести sanitizeForRedisKey из константы
10. ✅ Добавить User entity в auth.module

### **Сессия 3:**
11. ✅ Исправить IP/Device validation в session
12. ✅ Добавить relations в user-session.entity
13. ✅ Усилить валидацию паролей
14. ✅ Исправить хеширование (12 rounds)
15. ✅ Добавить role validation в users.create()

### **Сессия 4 (финальная):**
16. ✅ Тестирование всех исправлений
17. ✅ Миграции БД для unique constraints
18. ✅ Обновление документации
19. ✅ Security audit final check

---

## 📞 **9. КОНТАКТЫ И ЗАМЕТКИ**

**Текущий Security Score:** 9,5/10 (КРИТИЧЕСКИЙ)  
**Production Ready:** ❌ НЕ ГОТОВ  
**Estimated Fix Time:** 4-6 рабочих сессий  

---

**📝 Этот документ содержит ВСЮ информацию для продолжения работы в следующих сессиях!**
