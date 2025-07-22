# 🔐 **ПОЛНЫЙ ГАЙД: Регистрация и вход в DriveCare система**

## 🎯 **Обзор: 3 способа попасть в систему**

```typescript
// 3 основных пути в систему:
const registrationPaths = {
  selfRegistration: '🏢 Регистрация новой компании (ОСНОВНОЙ)',
  inviteRegistration: '👥 Приглашение в существующую компанию', 
  adminCreated: '👑 Создание superadmin-ом (служебный)'
};
```

---

# 🏢 **ПУТЬ #1: Self-Registration (Самостоятельная регистрация компании)**

## 🎯 **Это ОСНОВНОЙ путь для новых клиентов**

### 📋 **User Journey: От незнакомца до владельца компании**

#### **🌐 Шаг 1: Landing Page**
```bash
# Пользователь попадает на:
https://drivecare.ru

# Видит:
- "Современная CRM для автосервисов"
- "Попробовать бесплатно 30 дней"
- [КНОПКА: "Создать аккаунт"]
```

#### **📝 Шаг 2: Форма регистрации компании**
```typescript
// POST /api/v1/auth/register-company
interface RegisterCompanyDto {
  // Данные компании
  companyName: string;           // "АвтоСервис Профи"
  companyEmail: string;          // "info@autoservice-profi.ru"
  companyPhone?: string;         // "+7 (495) 123-45-67"
  companyAddress?: string;       // "г. Москва, ул. Автомобильная, 15"
  
  // Данные владельца (первого пользователя)
  ownerFirstName: string;        // "Иван"
  ownerLastName: string;         // "Петров"
  ownerEmail: string;            // "ivan@autoservice-profi.ru"
  ownerPassword: string;         // "SecurePassword123!"
  
  // Согласия
  acceptTerms: boolean;          // true
  acceptPrivacy: boolean;        // true
  subscribeNewsletter?: boolean; // false
}
```

#### **⚙️ Шаг 3: Система автоматически создает**
```typescript
// Что происходит в company-onboarding.service.ts:
async registerCompany(dto: RegisterCompanyDto) {
  
  // 1. 🏢 Создается компания
  const company = await this.companiesService.create({
    name: dto.companyName,
    email: dto.companyEmail,
    phone: dto.companyPhone,
    address: dto.companyAddress,
    isActive: true, // Сразу активна
  });

  // 2. 👤 Создается владелец компании  
  const owner = await this.usersService.create({
    firstName: dto.ownerFirstName,
    lastName: dto.ownerLastName,
    email: dto.ownerEmail,
    password: dto.ownerPassword,
    companyId: company.id,
    roleId: 'owner-role-uuid', // 🔒 Автоматически owner
  });

  // 3. 📋 Создается пробная подписка
  const trialSubscription = await this.subscriptionsService.create({
    companyId: company.id,
    tariffId: 'trial-tariff-uuid', // Пробный тариф
    startDate: new Date(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 дней
    status: 'active',
    autoRenew: false,
  });

  // 4. 🎯 Создаются базовые данные
  await this.seedBasicData(company.id); // Категории услуг, базовые настройки

  // 5. 📧 Отправляется welcome email
  await this.notificationService.sendWelcomeEmail(owner.email, company.name);

  return { company, owner, subscription: trialSubscription };
}
```

#### **🎉 Шаг 4: Добро пожаловать в систему!**
```typescript
// Пользователь автоматически авторизуется и попадает на:
https://app.drivecare.ru/dashboard

// С popup-ом:
"🎉 Добро пожаловать в DriveCare! 
Ваша пробная подписка активна до 01.02.2025
Начните с добавления первого клиента"

// Onboarding checklist:
☐ Добавить первого клиента
☐ Создать первый заказ  
☐ Настроить услуги компании
☐ Пригласить сотрудников
☐ Загрузить логотип компании
```

---

# 👥 **ПУТЬ #2: Invite Registration (Приглашение сотрудника)**

## 🎯 **Для добавления сотрудников в существующую компанию**

### 📋 **User Journey: От приглашения до сотрудника**

#### **📧 Шаг 1: Владелец отправляет приглашение**
```typescript
// В интерфейсе DriveCare:
// Настройки → Сотрудники → "Пригласить сотрудника"

// POST /api/v1/users/invite
interface InviteUserDto {
  email: string;              // "mechanic@autoservice-profi.ru"
  firstName: string;          // "Александр"  
  lastName: string;           // "Сидоров"
  role: 'admin' | 'manager' | 'mechanic'; // Роль в компании
  sendEmail: boolean;         // true - отправить приглашение
}

// Система создает:
const invitation = {
  id: 'invite-uuid',
  email: 'mechanic@autoservice-profi.ru',
  companyId: owner.companyId, // 🔒 Привязка к компании владельца
  role: 'mechanic',
  invitedBy: owner.id,
  token: 'secure-invite-token-256-bit',
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 дней
  status: 'pending'
};
```

#### **📨 Шаг 2: Приглашенный получает email**
```html
<!-- Email template -->
<h2>Приглашение в команду "АвтоСервис Профи"</h2>
<p>Иван Петров приглашает вас присоединиться к команде в DriveCare</p>
<p>Ваша роль: Механик</p>

<a href="https://app.drivecare.ru/auth/invite/accept?token=secure-invite-token">
  Принять приглашение
</a>

<p><small>Ссылка действительна 7 дней</small></p>
```

#### **✅ Шаг 3: Регистрация по приглашению**
```typescript
// GET /auth/invite/accept?token=secure-invite-token
// Пользователь попадает на форму:

// POST /api/v1/auth/register-invite  
interface RegisterInviteDto {
  inviteToken: string;        // Из URL
  password: string;           // "SecurePassword123!"
  confirmPassword: string;    // "SecurePassword123!"
  acceptTerms: boolean;       // true
}

// Система автоматически:
async acceptInvite(dto: RegisterInviteDto) {
  // 1. Проверяем токен приглашения
  const invitation = await this.validateInviteToken(dto.inviteToken);
  
  // 2. Создаем пользователя с данными из приглашения
  const user = await this.usersService.create({
    firstName: invitation.firstName,
    lastName: invitation.lastName,
    email: invitation.email,
    password: dto.password,
    companyId: invitation.companyId, // 🔒 Автоматически привязываем к компании
    roleId: invitation.roleId,       // 🔒 Роль из приглашения
  });

  // 3. Помечаем приглашение как принятое
  await this.markInviteAsAccepted(invitation.id);

  // 4. Уведомляем владельца
  await this.notificationService.notifyInviterAboutAcceptance(invitation.invitedBy, user);

  return user;
}
```

#### **🎯 Шаг 4: Сотрудник в системе**
```typescript
// Новый сотрудник автоматически авторизуется и видит:
// - Данные ТОЛЬКО своей компании
// - Интерфейс согласно своей роли (mechanic = упрощенный)
// - Уведомление: "Добро пожаловать в команду АвтоСервис Профи!"
```

---

# 👑 **ПУТЬ #3: Admin Created (Создание superadmin)**

## 🎯 **Служебный путь для администрирования системы**

### 📋 **Когда используется:**
- Создание первого superadmin при развертывании
- Техническая поддержка
- Создание demo аккаунтов
- Восстановление доступа

### ⚙️ **Как происходит:**
```typescript
// Через seeds или админскую панель:
// POST /api/v1/admin/users (доступно только superadmin)

interface CreateUserDto {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: 'superadmin' | 'owner' | 'admin' | 'manager' | 'mechanic';
  companyId?: string; // null для superadmin
}

// Создание первого superadmin через seed:
npm run db:seed:superadmin
// Создает: admin@drivecare.ru / AdminPassword123!
```

---

# 🔐 **ПРОЦЕСС ВХОДА В СИСТЕМУ**

## 🌐 **Login Flow для всех пользователей**

### 📝 **Шаг 1: Форма авторизации**
```typescript
// POST /api/v1/auth/login
interface LoginDto {
  email: string;     // "ivan@autoservice-profi.ru"
  password: string;  // "SecurePassword123!"
  deviceName?: string; // "iPhone 15 Pro" (для multi-device)
  rememberMe?: boolean; // true = longer session
}
```

### 🔍 **Шаг 2: Система проверяет**
```typescript
async login(dto: LoginDto) {
  // 1. 🔍 Ищем пользователя по email
  const user = await this.usersService.findByEmail(dto.email);
  if (!user) throw new UnauthorizedException('Неверные учетные данные');

  // 2. 🔒 Проверяем пароль
  const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
  if (!isPasswordValid) throw new UnauthorizedException('Неверные учетные данные');

  // 3. ✅ Проверяем активность пользователя и компании
  if (!user.isActive) throw new UnauthorizedException('Аккаунт деактивирован');
  if (user.company && !user.company.isActive) {
    throw new UnauthorizedException('Компания деактивирована');
  }

  // 4. 📋 Проверяем подписку (если не superadmin)
  if (user.role !== 'superadmin') {
    const hasActiveSubscription = await this.subscriptionsService.hasActiveSubscription(user.companyId);
    if (!hasActiveSubscription) {
      throw new UnauthorizedException('Подписка неактивна. Обратитесь к администратору');
    }
  }

  // 5. 🎫 Создаем токены
  const tokens = await this.tokenService.generateTokens(user);

  // 6. 💾 Сохраняем сессию
  const session = await this.sessionService.createSession({
    userId: user.id,
    deviceName: dto.deviceName,
    refreshToken: tokens.refreshToken,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 дней
  });

  // 7. 📊 Обновляем last login
  await this.usersService.updateLastLogin(user.id);

  return {
    user: this.mapUserToResponse(user),
    tokens,
    session: { id: session.id, deviceName: session.deviceName }
  };
}
```

### 🎯 **Шаг 3: Перенаправление по ролям**
```typescript
// Frontend определяет куда направить пользователя:
const redirectAfterLogin = (user: User) => {
  switch (user.role) {
    case 'superadmin':
      return '/admin/dashboard'; // Админская панель со всеми компаниями
      
    case 'owner':
      return '/dashboard'; // Полный доступ к своей компании
      
    case 'admin':
      return '/dashboard'; // Административный доступ к своей компании
      
    case 'manager':
      return '/orders'; // Фокус на заказах и клиентах
      
    case 'mechanic':
      return '/orders?assigned=me'; // Только назначенные заказы
      
    default:
      return '/dashboard';
  }
};
```

---

# 🎭 **РОЛИ И ПРАВА ДОСТУПА**

## 👑 **SuperAdmin (Системный администратор)**
```typescript
const superadminPermissions = {
  companies: ['create', 'read', 'update', 'delete'], // ВСЕ компании
  users: ['create', 'read', 'update', 'delete'],     // ВСЕ пользователи  
  subscriptions: ['create', 'read', 'update', 'delete'], // ВСЕ подписки
  tariffs: ['create', 'read', 'update', 'delete'],   // Управление тарифами
  system: ['backup', 'restore', 'monitoring'],       // Системные операции
  
  companyFilter: null, // 🔒 Видит данные ВСЕХ компаний
};

// Используется для:
// - Техническая поддержка
// - Управление тарифами
// - Системное администрирование
// - Помощь клиентам
```

## 🏢 **Owner (Владелец компании)**
```typescript
const ownerPermissions = {
  company: ['read', 'update'],           // Только СВОЯ компания
  users: ['create', 'read', 'update', 'delete'], // Только сотрудники СВОЕЙ компании
  customers: ['create', 'read', 'update', 'delete'], // Только клиенты СВОЕЙ компании
  orders: ['create', 'read', 'update', 'delete'],    // Только заказы СВОЕЙ компании
  inventory: ['create', 'read', 'update', 'delete'], // Только склад СВОЕЙ компании
  reports: ['read'],                     // Полная аналитика СВОЕЙ компании
  subscription: ['read', 'update'],     // СВОЯ подписка
  
  companyFilter: user.companyId, // 🔒 Видит только данные СВОЕЙ компании
};
```

## 🛠️ **Admin (Администратор компании)**
```typescript
const adminPermissions = {
  company: ['read'],                     // Только СВОЯ компания (без редактирования)
  users: ['create', 'read', 'update'],  // Сотрудники СВОЕЙ компании (без удаления)
  customers: ['create', 'read', 'update', 'delete'], // Полный доступ к клиентам
  orders: ['create', 'read', 'update', 'delete'],    // Полный доступ к заказам
  inventory: ['create', 'read', 'update'],           // Управление складом
  reports: ['read'],                     // Аналитика СВОЕЙ компании
  
  companyFilter: user.companyId, // 🔒 Видит только данные СВОЕЙ компании
};
```

## 📊 **Manager (Менеджер)**
```typescript
const managerPermissions = {
  customers: ['create', 'read', 'update'], // Работа с клиентами
  orders: ['create', 'read', 'update'],    // Управление заказами
  inventory: ['read'],                     // Просмотр остатков
  reports: ['read'],                       // Базовые отчеты
  
  companyFilter: user.companyId, // 🔒 Видит только данные СВОЕЙ компании
};
```

## 🔧 **Mechanic (Механик)**
```typescript
const mechanicPermissions = {
  orders: ['read', 'update'], // Только назначенные заказы + обновление статуса
  customers: ['read'],        // Просмотр информации о клиентах
  inventory: ['read'],        // Просмотр наличия запчастей
  
  additionalFilters: {
    orders: 'assigned_to = :userId', // 🔒 Только СВОИ заказы
  },
  
  companyFilter: user.companyId, // 🔒 Видит только данные СВОЕЙ компании
};
```

---

# 🔄 **LIFECYCLE ПОЛЬЗОВАТЕЛЯ**

## 📊 **Статусы пользователя**
```typescript
enum UserStatus {
  PENDING_INVITE = 'pending_invite',     // Приглашен, но не зарегистрирован
  ACTIVE = 'active',                     // Активный пользователь
  INACTIVE = 'inactive',                 // Временно деактивирован
  SUSPENDED = 'suspended',               // Заблокирован за нарушения
  DELETED = 'deleted'                    // Мягко удален
}
```

## 🔄 **Типичные сценарии**

### **🎯 Успешная регистрация компании:**
```
1. Пользователь регистрируется → Owner
2. Получает 30 дней trial подписки
3. Приглашает сотрудников → Admin, Manager, Mechanic
4. Через 30 дней покупает подписку
5. Работает с системой
```

### **⚠️ Проблемы с подпиской:**
```
1. Подписка истекает
2. Все пользователи компании получают ограничения
3. Система отправляет уведомления
4. После 7 дней - доступ только на чтение
5. После 30 дней - полная блокировка
```

### **👥 Управление сотрудниками:**
```
1. Owner приглашает сотрудника
2. Сотрудник регистрируется по приглашению
3. Получает доступ согласно роли
4. Owner может изменить роль или деактивировать
5. При увольнении - деактивация или удаление
```

---

# 🛡️ **SECURITY В ПРОЦЕССЕ РЕГИСТРАЦИИ**

## 🔒 **Защита от злоупотреблений**

### **1. Rate Limiting**
```typescript
// Ограничения на регистрацию:
@Throttle({ default: { limit: 3, ttl: 3600000 } }) // 3 регистрации в час с IP
async registerCompany() {}

@Throttle({ default: { limit: 10, ttl: 3600000 } }) // 10 попыток входа в час
async login() {}
```

### **2. Email верификация**
```typescript
// После регистрации отправляется email:
"Подтвердите регистрацию в DriveCare"
[ССЫЛКА: подтверждения]

// До подтверждения - ограниченный доступ
```

### **3. Валидация данных**
```typescript
// Строгая валидация всех данных:
@IsEmail()
@IsNotEmpty()
email: string;

@IsStrongPassword({
  minLength: 8,
  minUppercase: 1,
  minNumbers: 1,
  minSymbols: 1
})
password: string;
```

### **4. Защита приглашений**
```typescript
// Приглашения защищены:
- Уникальный токен на каждое приглашение
- Срок действия 7 дней
- Одноразовое использование
- Проверка существования email-а
```

---

# 🎯 **РЕКОМЕНДАЦИИ ПО UX**

## ✅ **Хорошие практики:**

### **1. Onboarding новых компаний**
```typescript
const onboardingSteps = [
  '🏢 Настройка профиля компании',
  '👥 Приглашение первого сотрудника', 
  '👤 Добавление первого клиента',
  '📝 Создание первого заказа',
  '⚙️ Настройка услуг и цен'
];
```

### **2. Прогрессивное раскрытие функций**
```typescript
// Не показывать сразу все возможности
// Начинать с базовых функций:
const basicFeatures = ['customers', 'orders'];
const advancedFeatures = ['inventory', 'reports', 'integrations']; // Показать позже
```

### **3. Помощь и поддержка**
```typescript
// В интерфейсе всегда доступно:
- 💬 Чат с поддержкой
- 📞 Телефон техподдержки  
- 📚 База знаний
- 🎥 Видео-уроки
- 📧 Email для обратной связи
```

---

**🎯 Вот такая полная картина процесса регистрации и входа! Основной путь - self-registration, где любой владелец автосервиса может зарегистрироваться сам и получить рабочую систему за пару минут! 🚀**
