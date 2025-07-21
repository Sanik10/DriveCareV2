# 📋 DriveCare Development Guide - Стандарты разработки модулей

## 🎯 Архитектурный стандарт: Clean Architecture + Domain-Driven Design

### Основные принципы:
1. **Single Responsibility Principle** - один класс = одна ответственность
2. **Dependency Inversion** - зависимости через интерфейсы
3. **Domain segregation** - разделение по доменам
4. **Feature-based structure** - группировка по функциональности

---

## 📁 Стандартная структура модуля

```
module-name/
├── module-name.module.ts          # Основной модуль
├── module-name.controller.ts      # HTTP контроллер
├── module-name.service.ts         # Основной сервис (оркестратор)
├── constants/
│   ├── module-name.constants.ts   # Константы модуля
│   └── redis.constants.ts         # Redis константы (если нужно)
├── services/                      # Микросервисы
│   ├── business-logic.service.ts  # Бизнес-логика
│   ├── data-access.service.ts     # Доступ к данным
│   ├── external-api.service.ts    # Внешние API
│   └── validation.service.ts      # Валидация
├── dto/
│   ├── request/                   # DTO для входящих данных
│   │   ├── create-entity.dto.ts
│   │   └── update-entity.dto.ts
│   └── response/                  # DTO для ответов
│       ├── entity-response.dto.ts
│       └── list-response.dto.ts
├── interfaces/                    # TypeScript интерфейсы
│   ├── entity.interface.ts
│   └── service.interface.ts
├── types/                         # TypeScript типы
│   └── module-name.types.ts
├── guards/                        # Гарды авторизации
│   └── custom.guard.ts
├── decorators/                    # Кастомные декораторы
│   └── custom.decorator.ts
├── strategies/                    # Passport стратегии (для auth)
│   └── custom.strategy.ts
└── providers/                     # Кастомные провайдеры
    └── external.provider.ts
```

---

## 🏗️ Пошаговый checklist создания модуля

### Шаг 1: Планирование архитектуры
- [ ] Определить основные entities
- [ ] Выделить бизнес-логику в микросервисы
- [ ] Спроектировать API endpoints
- [ ] Определить зависимости от других модулей

### Шаг 2: Создание базовой структуры
```bash
mkdir src/modules/module-name
cd src/modules/module-name
mkdir constants services dto/{request,response} interfaces types
touch module-name.module.ts module-name.controller.ts module-name.service.ts
```

### Шаг 3: Константы и типы
```typescript
// constants/module-name.constants.ts
export const MODULE_CONSTANTS = {
  DEFAULTS: {
    PAGE_SIZE: 20,
    MAX_ITEMS: 100,
  },
  REDIS_KEYS: {
    CACHE: (id: string) => `module:cache:${id}`,
  },
} as const;

// types/module-name.types.ts
export type EntityStatus = 'active' | 'inactive' | 'pending';
export type SortOrder = 'asc' | 'desc';
```

### Шаг 4: Интерфейсы
```typescript
// interfaces/entity.interface.ts
export interface CreateEntityData {
  name: string;
  description?: string;
}

export interface EntityFilter {
  status?: EntityStatus;
  search?: string;
  page?: number;
  limit?: number;
}
```

### Шаг 5: DTO с валидацией
```typescript
// dto/request/create-entity.dto.ts
import { IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEntityDto {
  @ApiProperty({ example: 'Entity Name', description: 'Название сущности' })
  @IsNotEmpty({ message: 'Название обязательно' })
  @MaxLength(255, { message: 'Название не может превышать 255 символов' })
  name: string;

  @ApiProperty({ example: 'Description', description: 'Описание', required: false })
  @IsOptional()
  @MaxLength(1000, { message: 'Описание не может превышать 1000 символов' })
  description?: string;
}
```

### Шаг 6: Микросервисы
```typescript
// services/entity-business.service.ts
@Injectable()
export class EntityBusinessService {
  constructor(
    private entityDataService: EntityDataService,
    private auditService: AuditService,
  ) {}

  async createEntity(data: CreateEntityData): Promise<Entity> {
    // Бизнес-логика создания
    const entity = await this.entityDataService.create(data);
    await this.auditService.log('ENTITY_CREATED', { entityId: entity.id });
    return entity;
  }
}
```

### Шаг 7: Основной сервис (оркестратор)
```typescript
// module-name.service.ts
@Injectable()
export class ModuleNameService {
  constructor(
    private entityBusinessService: EntityBusinessService,
    private entityDataService: EntityDataService,
  ) {}

  async create(dto: CreateEntityDto): Promise<EntityResponseDto> {
    const entity = await this.entityBusinessService.createEntity(dto);
    return this.mapToResponseDto(entity);
  }

  private mapToResponseDto(entity: Entity): EntityResponseDto {
    return {
      id: entity.id,
      name: entity.name,
      description: entity.description,
      createdAt: entity.createdAt,
    };
  }
}
```

### Шаг 8: Контроллер с документацией
```typescript
// module-name.controller.ts
@ApiTags('📋 Модуль')
@Controller('module-name')
export class ModuleNameController {
  constructor(private moduleService: ModuleNameService) {}

  @ApiOperation({ summary: 'Создание сущности' })
  @ApiBody({ type: CreateEntityDto })
  @ApiResponse({ status: 201, type: EntityResponseDto })
  @ApiBadRequestResponse({ description: 'Некорректные данные' })
  @Post()
  async create(@Body() dto: CreateEntityDto): Promise<EntityResponseDto> {
    return this.moduleService.create(dto);
  }
}
```

### Шаг 9: Модуль
```typescript
// module-name.module.ts
@Module({
  imports: [
    TypeOrmModule.forFeature([Entity]),
    // другие модули
  ],
  providers: [
    ModuleNameService,
    EntityBusinessService,
    EntityDataService,
  ],
  controllers: [ModuleNameController],
  exports: [ModuleNameService],
})
export class ModuleNameModule {}
```

---

## 🌱 Система сидирования БД

### 1. Создание Seeds Service
```typescript
// database/seeds/seeds.service.ts
@Injectable()
export class SeedsService {
  private readonly logger = new Logger(SeedsService.name);

  async runAllSeeds(): Promise<void> {
    this.logger.log('🌱 Starting database seeding...');
    
    try {
      await this.createSystemRoles();
      await this.createSuperAdmin();
      await this.createDefaultSettings();
      
      this.logger.log('✅ Database seeding completed successfully!');
    } catch (error) {
      this.logger.error('❌ Database seeding failed:', error.message);
      throw error;
    }
  }
}
```

### 2. Интеграция в AppModule
```typescript
// app.module.ts
export class AppModule implements OnModuleInit {
  constructor(private readonly seedsService: SeedsService) {}

  async onModuleInit() {
    if (process.env.NODE_ENV !== 'test') {
      await this.seedsService.runAllSeeds();
    }
  }
}
```

### 3. Ручной запуск seeds
```typescript
// package.json
{
  "scripts": {
    "seeds:run": "ts-node -r tsconfig-paths/register src/database/seeds/run-seeds.ts"
  }
}
```

---

## 🚨 Типичные ошибки и как их избежать

### 1. TypeScript ошибки в Swagger
```typescript
// ❌ Неправильно
example: {
  value: { name: 'test' }
}

// ✅ Правильно
examples: {
  example1: {
    summary: 'Пример',
    value: { name: 'test' }
  }
}
```

### 2. Redis конфигурация
```typescript
// ❌ Неправильно - используем несуществующие опции
new Redis({
  retryDelayOnFailover: 100, // Не существует
})

// ✅ Правильно - минимальная конфигурация
new Redis({
  host: 'localhost',
  port: 6380,
  lazyConnect: true,
})
```

### 3. TypeORM where clause
```typescript
// ❌ Неправильно - MongoDB синтаксис
whereClause.field = { $ne: value };

// ✅ Правильно - TypeORM синтаксис
import { Not } from 'typeorm';
whereClause.field = Not(value);
```

### 4. Nullable поля в Entity
```typescript
// ❌ Неправильно - поле required, но может быть null
@Column({ type: 'uuid' })
company_id: string;

// ✅ Правильно - nullable поле
@Column({ type: 'uuid', nullable: true })
company_id: string | null;
```

### 5. Возвращаемые типы в контроллере
```typescript
// ❌ Неправильно - несоответствие типов
async method(): Promise<UserDto> {
  return this.service.method(); // возвращает void
}

// ✅ Правильно - соответствие типов
async method(): Promise<UserDto> {
  const result = await this.service.method();
  return this.mapToDto(result);
}
```

---

## 🔒 Стандарты безопасности

### 1. Роли и права
```typescript
// types/auth.types.ts
export type AuthRole = 'superadmin' | 'owner' | 'admin' | 'manager' | 'mechanic';

// guards/roles.guard.ts
// Superadmin всегда имеет доступ ко всему
if (userRole === 'superadmin') {
  return true;
}
```

### 2. JWT авторизация в Swagger
```typescript
// main.ts
.addBearerAuth({
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
}, 'JWT-auth')

// controller.ts
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'superadmin')
```

### 3. Валидация входных данных
```typescript
@IsEmail({}, { message: 'Некорректный email' })
@IsNotEmpty({ message: 'Email обязателен' })
@MaxLength(255, { message: 'Email слишком длинный' })
email: string;
```

### 4. Rate Limiting
```typescript
// По endpoint
@Throttle({ default: { limit: 10, ttl: 60000 } })

// Глобально в модуле
ThrottlerModule.forRoot([{
  name: 'default',
  ttl: 60000,
  limit: 100,
}])
```

---

## 🗃️ Стандарты работы с БД

### 1. Entity пример
```typescript
@Entity('entities')
export class Entity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
```

### 2. Repository паттерн
```typescript
@Injectable()
export class EntityDataService {
  constructor(
    @InjectRepository(Entity)
    private repository: Repository<Entity>,
  ) {}

  async findWithPagination(filter: EntityFilter): Promise<[Entity[], number]> {
    const query = this.repository.createQueryBuilder('entity');
    
    if (filter.search) {
      query.andWhere('entity.name ILIKE :search', { 
        search: `%${filter.search}%` 
      });
    }
    
    return query
      .skip((filter.page - 1) * filter.limit)
      .take(filter.limit)
      .getManyAndCount();
  }
}
```

---

## 📝 Naming Conventions

### 1. Файлы и папки
- `kebab-case` для папок: `user-management/`
- `kebab-case.type.ts` для файлов: `user-response.dto.ts`

### 2. Классы и интерфейсы
- `PascalCase` для классов: `UserService`
- `PascalCase` с префиксом `I` для интерфейсов: `IUserRepository`

### 3. Переменные и методы
- `camelCase`: `findUserById()`
- Константы `SCREAMING_SNAKE_CASE`: `MAX_RETRY_ATTEMPTS`

### 4. API endpoints
- `kebab-case`: `/api/v1/user-management/users`
- HTTP методы по REST: GET, POST, PUT, DELETE

---

## 🧪 Тестирование (для будущего)

### 1. Структура тестов
```
src/
├── modules/
│   └── module-name/
│       ├── __tests__/
│       │   ├── module-name.service.spec.ts
│       │   ├── module-name.controller.spec.ts
│       │   └── integration/
│       │       └── module-name.integration.spec.ts
```

### 2. Пример unit теста
```typescript
describe('ModuleNameService', () => {
  let service: ModuleNameService;
  let mockRepository: jest.Mocked<Repository<Entity>>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ModuleNameService,
        {
          provide: getRepositoryToken(Entity),
          useValue: createMockRepository(),
        },
      ],
    }).compile();

    service = module.get<ModuleNameService>(ModuleNameService);
    mockRepository = module.get(getRepositoryToken(Entity));
  });

  it('should create entity', async () => {
    const dto = { name: 'Test' };
    const entity = { id: '1', ...dto };
    
    mockRepository.save.mockResolvedValue(entity);
    
    const result = await service.create(dto);
    
    expect(result.name).toBe(dto.name);
    expect(mockRepository.save).toHaveBeenCalledWith(dto);
  });
});
```

---

## 🚀 Масштабирование и продакшен

### 1. Environment конфигурация
```typescript
// .env.production
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@prod-host:5432/drivecare
REDIS_URL=redis://redis-host:6379
JWT_SECRET=super-secure-production-secret
```

### 2. Docker конфигурация
```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3001
CMD ["node", "dist/main"]
```

### 3. Health checks
```typescript
// health.controller.ts
@Get('health')
async getHealth() {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'DriveCare API',
    version: process.env.npm_package_version,
    database: await this.checkDatabase(),
    redis: await this.checkRedis(),
  };
}
```

### 4. Мониторинг и логирование
```typescript
// Структурированные логи
logger.log({
  action: 'USER_CREATED',
  userId: user.id,
  companyId: user.companyId,
  timestamp: new Date().toISOString(),
  metadata: { userAgent, ipAddress }
});
```

---

## 🚀 Финальный checklist перед завершением модуля

- [ ] Все TypeScript ошибки исправлены
- [ ] `npm run build` проходит без ошибок
- [ ] Swagger документация полная и корректная
- [ ] JWT авторизация настроена для защищённых endpoints
- [ ] Все DTO имеют валидацию
- [ ] Константы вынесены в отдельные файлы
- [ ] Сервисы разделены по ответственности
- [ ] Audit логирование добавлено для важных операций
- [ ] Обработка ошибок реализована
- [ ] Rate limiting настроен для публичных endpoints
- [ ] Seeds работают корректно
- [ ] Nullable поля правильно типизированы

---

## 🎯 Специфика проекта DriveCare

### Роли в системе:
- `superadmin` - системный администратор (полный доступ) 👑
- `owner` - владелец компании  
- `admin` - администратор компании
- `manager` - менеджер
- `mechanic` - механик

### Стандартные imports:
```typescript
// Всегда используем эти imports для авторизации
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
```

### Обязательные сервисы в каждом модуле:
- `AuditService` для логирования действий
- `ConfigService` для конфигурации
- Соответствующие Entity repositories

### Учётные данные суперадмина:
- Email: `superadmin@drivecare.com`
- Password: `secure_password654321!`
- Создаётся автоматически при запуске приложения

---

## 🎯 Реальный опыт разработки

### Проблемы которые мы решили:
1. **Проблема регистрации**: создали два flow (компания + инвайт)
2. **Раздутый сервис**: разбили на микросервисы
3. **TypeScript ошибки**: стандартизировали подходы
4. **Nullable поля**: правильная типизация для superadmin
5. **Redis конфигурация**: минимальная рабочая настройка

### Лучшие практики:
1. **Всегда начинай с констант и типов** - это экономит время
2. **Используй микросервисы** - легче тестировать и поддерживать
3. **Swagger документация обязательна** - экономит время на фронтенде
4. **Audit логирование** - незаменимо для отладки и безопасности
5. **Seeds для базовых данных** - ускоряет разработку

---

**Этот гайд поможет поддерживать единый стандарт разработки во всех модулях DriveCare! 🚀**