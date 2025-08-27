# 📋 Полная документация: Перенос и создание модулей в NestJS

## 📚 Содержание
1. [Перенос существующего модуля](#перенос-существующего-модуля)
2. [Создание нового модуля с нуля](#создание-нового-модуля-с-нуля)
3. [Структура модуля](#структура-модуля)
4. [Лучшие практики](#лучшие-практики)
5. [Типичные ошибки и решения](#типичные-ошибки-и-решения)

---

## 🔄 Перенос существующего модуля

### Шаг 1: Анализ структуры старого модуля

**Перед переносом изучите структуру:**

```bash
# Посмотрите структуру модуля
ls -R apps/auth-service/src/auth/

# Найдите все зависимости
grep -r "import.*from" apps/auth-service/src/auth/ | grep -v node_modules
```

### Шаг 2: Подготовка новой структуры

**Создайте папки в новом проекте:**

```bash
# Создаем структуру для Auth модуля
mkdir -p src/modules/auth/{dto,guards,strategies,decorators,interfaces,providers}
mkdir -p src/modules/auth/dto/{request,response}
```

### Шаг 3: Копирование файлов

**Копируйте файлы в правильном порядке:**

```bash
# 1. Основные файлы модуля
cp старый_проект/auth.module.ts src/modules/auth/
cp старый_проект/auth.controller.ts src/modules/auth/
cp старый_проект/auth.service.ts src/modules/auth/

# 2. DTO файлы
cp старый_проект/dto/request/* src/modules/auth/dto/request/
cp старый_проект/dto/response/* src/modules/auth/dto/response/

# 3. Guards и Strategies
cp старый_проект/guards/* src/modules/auth/guards/
cp старый_проект/strategies/* src/modules/auth/strategies/

# 4. Дополнительные файлы
cp старый_проект/decorators/* src/modules/auth/decorators/
cp старый_проект/interfaces/* src/modules/auth/interfaces/
```

### Шаг 4: Исправление Imports

**Обновите все import пути:**

#### В auth.module.ts:
```typescript
// БЫЛО:
import { UsersModule } from '../users/users.module';
import { UserSession } from './entities/user-session.entity';
import { AuditModule } from '@drivecare/common/audit';

// СТАЛО:
import { UsersModule } from '../users/users.module';
import { UserSession } from '../../database/entities/user-session.entity';
// Удаляем @drivecare/common/audit - создадим свой audit позже
```

#### В auth.service.ts:
```typescript
// БЫЛО:
import { UsersService } from '../users/users.service';
import { UserSession } from './entities/user-session.entity';
import { User } from '../users/entities/user.entity';

// СТАЛО:
import { UsersService } from '../users/users.service';
import { UserSession } from '../../database/entities/user-session.entity';
import { User } from '../../database/entities/user.entity';
```

#### В auth.controller.ts:
```typescript
// БЫЛО:
import { UsersService } from '../users/users.service';

// СТАЛО:
import { UsersService } from '../users/users.service';
```

### Шаг 5: Создание упрощенных зависимостей

**Создайте файл констант (`src/modules/auth/constants.ts`):**
```typescript
export const JWT_CONFIG = {
  secret: process.env.JWT_SECRET || 'your-secret-key',
  expiresIn: process.env.JWT_EXPIRATION || '15m',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d',
};
```

**Создайте упрощенный Redis provider (`src/modules/auth/redis.provider.ts`):**
```typescript
import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const RedisProvider: Provider = {
  provide: 'REDIS_CLIENT',
  useFactory: (configService: ConfigService) => {
    return new Redis({
      host: configService.get('REDIS_HOST', 'localhost'),
      port: configService.get('REDIS_PORT', 6380),
      retryDelayOnFailover: 100,
      lazyConnect: true,
    });
  },
  inject: [ConfigService],
};
```

### Шаг 6: Обновление auth.module.ts

**Создайте упрощенную версию модуля:**

**Файл: `src/modules/auth/auth.module.ts`**
```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RedisProvider } from './redis.provider';
import { RolesGuard } from './guards/roles.guard';

// Entities
import { UserSession } from '../../database/entities/user-session.entity';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: { 
          expiresIn: configService.get('JWT_EXPIRATION', '15m')
        },
      }),
    }),
    TypeOrmModule.forFeature([UserSession]),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 60,
      }
    ]),
    UsersModule,
  ],
  providers: [
    AuthService, 
    LocalStrategy, 
    JwtStrategy, 
    RedisProvider,
    RolesGuard,
  ],
  controllers: [AuthController],
  exports: [AuthService, RolesGuard, JwtModule],
})
export class AuthModule {}
```

### Шаг 7: Упрощение auth.service.ts

**Временно упростите сервис, убрав сложные зависимости:**

**Файл: `src/modules/auth/auth.service.ts`**
```typescript
import { Injectable, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { createHash } from 'crypto';

import { UsersService } from '../users/users.service';
import { UserSession } from '../../database/entities/user-session.entity';
import { User } from '../../database/entities/user.entity';

// DTO imports
import { LoginDto } from './dto/request/login.dto';
import { RegisterDto } from './dto/request/register.dto';
import { RefreshTokenDto } from './dto/request/refresh-token.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    @Inject('REDIS_CLIENT')
    private readonly redis: Redis,
    @InjectRepository(UserSession)
    private userSessionRepository: Repository<UserSession>,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    
    if (!user) {
      throw new Error('Invalid credentials');
    }
    
    if (!user.isActive) {
      throw new Error('User inactive');
    }
    
    const isPasswordValid = await this.usersService.comparePasswords(password, user.password_hash);
    
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }
    
    return user;
  }

  async login(loginDto: LoginDto, userAgent = '', ipAddress = '') {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    
    // Генерируем deviceId
    const deviceId = this.generateDeviceId(user.id, userAgent, ipAddress);
    
    // Создаем токены
    const tokens = await this.createTokens(user, userAgent, ipAddress, deviceId);
    
    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      ...tokens,
    };
  }

  async register(registerDto: RegisterDto) {
    // Проверяем существование пользователя
    const existingUser = await this.usersService.findByEmail(registerDto.email);
    
    if (existingUser) {
      throw new Error('User already exists');
    }
    
    // Создаем пользователя
    const newUser = await this.usersService.create({
      company_id: registerDto.company_id,
      email: registerDto.email,
      password_hash: registerDto.password,
      firstName: registerDto.firstName,
      lastName: registerDto.lastName,
      roleId: registerDto.role_id,
      phone: registerDto.phone,
      isActive: true,
    });
    
    return {
      id: newUser.id,
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
    };
  }

  // Упрощенные приватные методы
  private generateDeviceId(userId: string, userAgent: string, ipAddress: string): string {
    const deviceString = `${userId}:${userAgent}:${ipAddress}:${uuidv4()}`;
    return createHash('sha256').update(deviceString).digest('hex');
  }

  private async createTokens(user: User, userAgent: string, ipAddress: string, deviceId: string) {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role?.name || 'user',
      companyId: user.company_id,
      deviceId: deviceId
    };
    
    const accessToken = this.jwtService.sign(payload);
    
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION', '7d'),
    });
    
    // Сохраняем сессию
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    const session = this.userSessionRepository.create({
      userId: user.id,
      deviceId,
      deviceName: 'Unknown Device',
      refreshToken,
      userAgent,
      ipAddress,
      expiresAt,
      isActive: true
    });
    
    await this.userSessionRepository.save(session);
    
    return {
      accessToken,
      refreshToken,
      expiresIn: this.configService.get('JWT_EXPIRATION', '15m'),
    };
  }
}
```

### Шаг 8: Подключение к app.module.ts

**Обновите главный модуль приложения:**

**Файл: `src/app.module.ts`**
```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { getDatabaseConfig } from './database/database.config';

// Модули
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: getDatabaseConfig,
    }),
    AuthModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

---

## 🆕 Создание нового модуля с нуля

### Шаг 1: Генерация базовой структуры

```bash
# Заходим в backend
cd apps/backend

# Создаем модуль через CLI
nest generate module modules/companies
nest generate controller modules/companies
nest generate service modules/companies

# Создаем дополнительные папки
mkdir -p src/modules/companies/{dto,interfaces}
mkdir -p src/modules/companies/dto/{request,response}
```

### Шаг 2: Создание Entity (если еще нет)

**Файл: `src/database/entities/company.entity.ts`**
```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { User } from './user.entity';

@Entity('companies')
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 255 })
  address: string;

  @Column({ type: 'varchar', length: 50 })
  phone: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Отношения
  @OneToMany(() => User, user => user.company)
  users: User[];
}
```

### Шаг 3: Создание DTO

**Файл: `src/modules/companies/dto/request/create-company.dto.ts`**
```typescript
import { IsString, IsEmail, IsOptional, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCompanyDto {
  @ApiProperty({ example: 'AutoService Ltd', description: 'Название компании' })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'Профессиональный автосервис', description: 'Описание', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({ example: 'ул. Примерная, 123', description: 'Адрес' })
  @IsString()
  @MaxLength(255)
  address: string;

  @ApiProperty({ example: '+7 (999) 123-45-67', description: 'Телефон' })
  @IsString()
  @MaxLength(50)
  phone: string;

  @ApiProperty({ example: 'info@autoservice.com', description: 'Email' })
  @IsEmail()
  @MaxLength(255)
  email: string;
}
```

**Файл: `src/modules/companies/dto/response/company-response.dto.ts`**
```typescript
import { ApiProperty } from '@nestjs/swagger';

export class CompanyResponseDto {
  @ApiProperty({ example: 'uuid', description: 'ID компании' })
  id: string;

  @ApiProperty({ example: 'AutoService Ltd', description: 'Название' })
  name: string;

  @ApiProperty({ example: 'Описание компании', description: 'Описание' })
  description: string;

  @ApiProperty({ example: 'ул. Примерная, 123', description: 'Адрес' })
  address: string;

  @ApiProperty({ example: '+7 (999) 123-45-67', description: 'Телефон' })
  phone: string;

  @ApiProperty({ example: 'info@autoservice.com', description: 'Email' })
  email: string;

  @ApiProperty({ example: true, description: 'Активна ли компания' })
  isActive: boolean;

  @ApiProperty({ example: '2025-01-01T00:00:00Z', description: 'Дата создания' })
  createdAt: Date;

  @ApiProperty({ example: '2025-01-01T00:00:00Z', description: 'Дата обновления' })
  updatedAt: Date;
}
```

### Шаг 4: Создание Service

**Файл: `src/modules/companies/companies.service.ts`**
```typescript
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from '../../database/entities/company.entity';
import { CreateCompanyDto } from './dto/request/create-company.dto';
import { UpdateCompanyDto } from './dto/request/update-company.dto';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private companiesRepository: Repository<Company>,
  ) {}

  async create(createCompanyDto: CreateCompanyDto): Promise<Company> {
    // Проверяем уникальность email
    const existingCompany = await this.companiesRepository.findOne({
      where: { email: createCompanyDto.email }
    });

    if (existingCompany) {
      throw new ConflictException('Company with this email already exists');
    }

    const company = this.companiesRepository.create(createCompanyDto);
    return await this.companiesRepository.save(company);
  }

  async findAll(): Promise<Company[]> {
    return await this.companiesRepository.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' }
    });
  }

  async findOne(id: string): Promise<Company> {
    const company = await this.companiesRepository.findOne({
      where: { id, isActive: true }
    });

    if (!company) {
      throw new NotFoundException('Company not found');
    }

    return company;
  }

  async update(id: string, updateCompanyDto: UpdateCompanyDto): Promise<Company> {
    const company = await this.findOne(id);

    // Проверяем уникальность email если он обновляется
    if (updateCompanyDto.email && updateCompanyDto.email !== company.email) {
      const existingCompany = await this.companiesRepository.findOne({
        where: { email: updateCompanyDto.email }
      });

      if (existingCompany) {
        throw new ConflictException('Company with this email already exists');
      }
    }

    Object.assign(company, updateCompanyDto);
    return await this.companiesRepository.save(company);
  }

  async remove(id: string): Promise<void> {
    const company = await this.findOne(id);
    
    // Мягкое удаление - помечаем как неактивную
    company.isActive = false;
    await this.companiesRepository.save(company);
  }

  async findByEmail(email: string): Promise<Company | null> {
    return await this.companiesRepository.findOne({
      where: { email, isActive: true }
    });
  }
}
```

### Шаг 5: Создание Controller

**Файл: `src/modules/companies/companies.controller.ts`**
```typescript
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseUUIDPipe,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/request/create-company.dto';
import { UpdateCompanyDto } from './dto/request/update-company.dto';
import { CompanyResponseDto } from './dto/response/company-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Companies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Post()
  @Roles('admin', 'super-admin')
  @ApiOperation({ summary: 'Создать новую компанию' })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'Компания успешно создана',
    type: CompanyResponseDto 
  })
  @ApiResponse({ 
    status: HttpStatus.CONFLICT, 
    description: 'Компания с таким email уже существует' 
  })
  async create(@Body() createCompanyDto: CreateCompanyDto): Promise<CompanyResponseDto> {
    return await this.companiesService.create(createCompanyDto);
  }

  @Get()
  @Roles('admin', 'super-admin', 'manager')
  @ApiOperation({ summary: 'Получить список всех компаний' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Список компаний',
    type: [CompanyResponseDto] 
  })
  async findAll(): Promise<CompanyResponseDto[]> {
    return await this.companiesService.findAll();
  }

  @Get(':id')
  @Roles('admin', 'super-admin', 'manager')
  @ApiOperation({ summary: 'Получить компанию по ID' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Компания найдена',
    type: CompanyResponseDto 
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Компания не найдена' 
  })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<CompanyResponseDto> {
    return await this.companiesService.findOne(id);
  }

  @Patch(':id')
  @Roles('admin', 'super-admin')
  @ApiOperation({ summary: 'Обновить компанию' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Компания обновлена',
    type: CompanyResponseDto 
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCompanyDto: UpdateCompanyDto
  ): Promise<CompanyResponseDto> {
    return await this.companiesService.update(id, updateCompanyDto);
  }

  @Delete(':id')
  @Roles('super-admin')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить компанию' })
  @ApiResponse({ 
    status: HttpStatus.NO_CONTENT, 
    description: 'Компания удалена' 
  })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return await this.companiesService.remove(id);
  }
}
```

### Шаг 6: Создание Module

**Файл: `src/modules/companies/companies.module.ts`**
```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompaniesService } from './companies.service';
import { CompaniesController } from './companies.controller';
import { Company } from '../../database/entities/company.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Company])],
  controllers: [CompaniesController],
  providers: [CompaniesService],
  exports: [CompaniesService], // Экспортируем для использования в других модулях
})
export class CompaniesModule {}
```

---

## 📁 Структура модуля

### Правильная структура модуля NestJS:

```
src/modules/example/
├── 📄 example.module.ts           # Главный модуль
├── 📄 example.controller.ts       # REST контроллер
├── 📄 example.service.ts          # Бизнес-логика
├── 📁 dto/                        # Data Transfer Objects
│   ├── 📁 request/                # DTO для входящих данных
│   │   ├── create-example.dto.ts
│   │   ├── update-example.dto.ts
│   │   └── filter-example.dto.ts
│   └── 📁 response/               # DTO для ответов
│       ├── example-response.dto.ts
│       └── example-list-response.dto.ts
├── 📁 interfaces/                 # TypeScript интерфейсы
│   ├── example.interface.ts
│   └── example-config.interface.ts
├── 📁 guards/                     # Специфичные охранники
│   └── example-access.guard.ts
├── 📁 decorators/                 # Кастомные декораторы
│   └── example.decorator.ts
├── 📁 pipes/                      # Кастомные пайпы
│   └── example-validation.pipe.ts
├── 📁 exceptions/                 # Кастомные исключения
│   └── example.exceptions.ts
└── 📁 tests/                      # Тесты модуля
    ├── example.controller.spec.ts
    ├── example.service.spec.ts
    └── example.e2e-spec.ts
```

---

## 🎯 Лучшие практики

### 1. Именование файлов и классов

```typescript
// ✅ Правильно
export class UsersService {}        // users.service.ts
export class CreateUserDto {}       // create-user.dto.ts
export class UserResponseDto {}     // user-response.dto.ts

// ❌ Неправильно
export class UserService {}         // Должно быть UsersService
export class UserDto {}             // Неспецифично
export class UserResponse {}        // Должно содержать Dto
```

### 2. Структура DTO

**Request DTO:**
```typescript
import { IsString, IsEmail, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'john@example.com', description: 'Email пользователя' })
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty({ example: 'John', description: 'Имя' })
  @IsString()
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'Doe', description: 'Фамилия', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;
}
```

**Response DTO:**
```typescript
import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({ example: 'uuid', description: 'ID пользователя' })
  id: string;

  @ApiProperty({ example: 'john@example.com', description: 'Email' })
  email: string;

  @ApiProperty({ example: 'John', description: 'Имя' })
  firstName: string;

  @ApiProperty({ example: 'Doe', description: 'Фамилия' })
  lastName: string;

  @ApiProperty({ example: '2025-01-01T00:00:00Z', description: 'Дата создания' })
  createdAt: Date;
}
```

### 3. Структура Service

```typescript
@Injectable()
export class ExampleService {
  constructor(
    @InjectRepository(Example)
    private exampleRepository: Repository<Example>,
    // Другие зависимости
  ) {}

  // Публичные методы
  async create(createDto: CreateExampleDto): Promise<Example> {}
  async findAll(filters?: FilterDto): Promise<Example[]> {}
  async findOne(id: string): Promise<Example> {}
  async update(id: string, updateDto: UpdateExampleDto): Promise<Example> {}
  async remove(id: string): Promise<void> {}

  // Приватные методы
  private async validateUniqueness(field: string): Promise<void> {}
  private transformToResponse(entity: Example): ExampleResponseDto {}
}
```

### 4. Структура Controller

```typescript
@ApiTags('Examples')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('examples')
export class ExampleController {
  constructor(private readonly exampleService: ExampleService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Создать новый пример' })
  async create(@Body() createDto: CreateExampleDto) {}

  @Get()
  @ApiOperation({ summary: 'Получить список примеров' })
  async findAll(@Query() filters: FilterExampleDto) {}

  @Get(':id')
  @ApiOperation({ summary: 'Получить пример по ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {}

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить пример' })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() updateDto: UpdateExampleDto) {}

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить пример' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {}
}
```

---

## ⚠️ Типичные ошибки и решения

### 1. Неправильные imports

**❌ Проблема:**
```typescript
import { User } from '../../../database/entities/user.entity';
```

**✅ Решение:**
```typescript
import { User } from '../../database/entities/user.entity';
// Или создайте barrel export в entities/index.ts
import { User } from '../../database/entities';
```

### 2. Забытое подключение модуля

**❌ Проблема:** Модуль создан, но не подключен к app.module.ts

**✅ Решение:**
```typescript
// src/app.module.ts
@Module({
  imports: [
    // ...другие модули
    ExampleModule, // Добавить новый модуль
  ],
})
export class AppModule {}
```

### 3. Отсутствие экспорта в module

**❌ Проблема:**
```typescript
@Module({
  providers: [ExampleService],
  // Забыли exports
})
export class ExampleModule {}
```

**✅ Решение:**
```typescript
@Module({
  providers: [ExampleService],
  exports: [ExampleService], // Экспортируем для других модулей
})
export class ExampleModule {}
```

### 4. Неправильная работа с Entity в TypeORM

**❌ Проблема:**
```typescript
// Не подключили entity в module
@Module({
  imports: [TypeOrmModule.forFeature([])], // Пустой массив
})
```

**✅ Решение:**
```typescript
@Module({
  imports: [TypeOrmModule.forFeature([Example])], // Добавили entity
})
```

---

## 🚀 Быстрый чеклист создания модуля

### ✅ Чеклист для нового модуля:

1. **Создание структуры:**
   - [ ] `module.ts` - главный модуль
   - [ ] `controller.ts` - REST контроллер  
   - [ ] `service.ts` - бизнес-логика
   - [ ] `dto/request/` - входящие DTO
   - [ ] `dto/response/` - исходящие DTO

2. **Entity подключение:**
   - [ ] Entity создан в `database/entities/`
   - [ ] Entity подключен в `module.ts`
   - [ ] Entity добавлен в `database.config.ts`

3. **Зависимости:**
   - [ ] Все imports корректны
   - [ ] Модуль экспортирует нужные сервисы
   - [ ] Модуль подключен в `app.module.ts`

4. **Валидация и документация:**
   - [ ] DTO содержат валидацию `class-validator`
   - [ ] Контроллеры содержат Swagger декораторы
   - [ ] Роли и права доступа настроены

5. **Тестирование:**
   - [ ] Приложение запускается без ошибок
   - [ ] Эндпоинты доступны в Swagger
   - [ ] Базовые CRUD операции работают
