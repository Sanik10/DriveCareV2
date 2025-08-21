# 🔥 **USERS MODULE - COMPLETE SECURITY REFACTORING PLAN**

**Version:** 2.0  
**Date:** 2025-01-06  
**Status:** EMERGENCY SECURITY FIXES REQUIRED  
**Security Score:** 1.8/10 - CATASTROPHIC  

---

## 📖 **1. USERS MODULE OVERVIEW**

### **Current Architecture**
```
modules/users/
├── users.module.ts              # Basic module
├── users.controller.ts          # ❌ EMPTY - NO API!
├── users.service.ts             # Basic CRUD only
├── constants/
│   └── users.constants.ts       # Basic constants
├── dto/
│   ├── request/
│   │   ├── create-user.dto.ts   # ❌ MULTI-TENANT BYPASS
│   │   └── update-user.dto.ts   # ❌ ROLE ESCALATION
│   └── response/
│       ├── user-response.dto.ts # ❌ DATA EXPOSURE
│       ├── profile-response.dto.ts
│       └── role.dto.ts
├── interfaces/
│   └── users.interface.ts
└── types/
    └── users.types.ts
```

### **Target Architecture (Enterprise-Grade)**
```
modules/users/
├── users.module.ts              # ✅ Full security module
├── users.controller.ts          # ✅ Complete API with guards
├── users.service.ts             # ✅ Orchestrator only
├── constants/
│   └── users.constants.ts       # ✅ Security constants
├── dto/
│   ├── request/
│   │   ├── create-user.dto.ts   # ✅ NO company_id
│   │   ├── update-user-profile.dto.ts  # ✅ Profile only
│   │   ├── update-user-role.dto.ts     # ✅ Role only
│   │   ├── update-user-status.dto.ts   # ✅ Status only
│   │   └── change-password.dto.ts      # ✅ Password only
│   └── response/
│       ├── user-response.dto.ts        # ✅ NO sensitive data
│       ├── user-list-response.dto.ts   # ✅ Minimal list view
│       └── paginated-users-response.dto.ts
├── services/
│   ├── users-business.service.ts       # ✅ Business logic
│   ├── users-data.service.ts           # ✅ Database operations
│   ├── users-mapper.service.ts         # ✅ DTO mapping
│   └── users-validation.service.ts     # ✅ Security validation
├── interfaces/
│   └── users.interface.ts              # ✅ Full interfaces
└── types/
    └── users.types.ts                  # ✅ Complete types
```

---

## 🚨 **2. CRITICAL VULNERABILITIES ANALYSIS**

### **🔴 CRITICAL (10/10) - 8 Issues**

#### **#30 - NO USER MANAGEMENT API**
**File:** `users.controller.ts`  
**Current:**
```typescript
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
  // ❌ COMPLETELY EMPTY - NO ENDPOINTS!
}
```
**Impact:** Users cannot be managed via API - BUSINESS CRITICAL  
**Fix Priority:** IMMEDIATE

#### **#31 - MULTI-TENANT BYPASS**
**File:** `create-user.dto.ts:10-15`  
**Current:**
```typescript
@IsUUID('4', { message: 'Некорректный UUID компании' })
@IsNotEmpty({ message: 'ID компании обязателен' })
company_id: string; // ❌ Can create user in ANY company!
```
**Impact:** Create users in other companies - DATA BREACH  
**Fix Priority:** IMMEDIATE

#### **#32 - ROLE ESCALATION**
**File:** `update-user.dto.ts:35-40`  
**Current:**
```typescript
@IsUUID('4', { message: 'Некорректный UUID роли' })
@IsOptional()
role_id?: string; // ❌ Can become superadmin!
```
**Impact:** Any user can escalate to superadmin - PRIVILEGE ESCALATION  
**Fix Priority:** IMMEDIATE

#### **#33 - WEAK PASSWORD VALIDATION**
**File:** `create-user.dto.ts:25`, `update-user.dto.ts:15`  
**Current:**
```typescript
@MinLength(6, { message: 'Пароль должен содержать минимум 6 символов' })
password: string; // ❌ "123456" passes!
```
**Impact:** Weak passwords allowed - SECURITY BREACH  
**Fix Priority:** IMMEDIATE

#### **#34 - XSS VULNERABILITY**
**File:** `create-user.dto.ts`, `update-user.dto.ts`  
**Current:**
```typescript
firstName?: string;  // ❌ Can inject: "<script>alert('XSS')</script>"
lastName?: string;   // ❌ Can inject: "<img src=x onerror=alert('XSS')>"
```
**Impact:** XSS attacks possible - CLIENT COMPROMISE  
**Fix Priority:** IMMEDIATE

#### **#35 - DATA EXPOSURE**
**File:** `user-response.dto.ts:23-25`  
**Current:**
```typescript
@ApiProperty({ example: 'uuid', description: 'ID компании', required: false })
company_id: string | null; // ❌ Exposes internal company IDs!
```
**Impact:** Internal IDs exposed - INFORMATION DISCLOSURE  
**Fix Priority:** HIGH

#### **#36 - NO SECURITY VALIDATION**
**File:** `users.service.ts:31-45`  
**Current:**
```typescript
async create(userData: Partial<User>): Promise<User> {
  // ❌ No company ownership validation
  // ❌ No role hierarchy validation  
  // ❌ No email uniqueness check
}
```
**Impact:** Bypass all security checks - COMPLETE BYPASS  
**Fix Priority:** IMMEDIATE

#### **#37 - NO TRANSACTION SAFETY**
**File:** `users.service.ts:31-50`  
**Current:**
```typescript
// ❌ No transaction for user creation - race conditions possible
```
**Impact:** Data inconsistency, race conditions - DATA CORRUPTION  
**Fix Priority:** HIGH

### **🔴 HIGH (8-9/10) - 4 Issues**

#### **#38 - NO MODULE SECURITY**
**File:** `users.module.ts`  
**Current:**
```typescript
@Module({
  imports: [TypeOrmModule.forFeature([User, Role])],
  // ❌ No AuditService, SecurityService, guards!
})
```

#### **#39 - NO AUDIT LOGGING**
**All operations without audit trail - COMPLIANCE VIOLATION**

#### **#40 - NO PHONE VALIDATION**
**File:** `create-user.dto.ts:55-60`  
**Current:**
```typescript
@IsOptional()
phone?: string; // ❌ No format validation
```

#### **#41 - NO 4-LAYER ARCHITECTURE**
**Missing business/data/mapper/validation services - ARCHITECTURAL DEBT**

---

## 🎯 **3. COMPLETE IMPLEMENTATION PLAN**

### **🔥 PHASE 1: EMERGENCY SECURITY FIXES (Priority 1)**

#### **Step 1.1: Fix Critical DTOs (10 minutes)**

**File:** `modules/users/dto/request/create-user.dto.ts`
```typescript
import { 
  IsEmail, 
  IsNotEmpty, 
  IsOptional, 
  IsUUID, 
  MinLength, 
  Matches,
  Length,
  IsPhoneNumber,
  Transform
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  // ❌ REMOVED: company_id field - will be set from JWT token
  
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email пользователя',
  })
  @IsEmail({}, { message: 'Некорректный email' })
  @IsNotEmpty({ message: 'Email обязателен' })
  @Length(1, 255, { message: 'Email не может превышать 255 символов' })
  email: string;

  @ApiProperty({
    example: 'SecurePass123!',
    description: 'Надежный пароль пользователя',
  })
  @IsNotEmpty({ message: 'Пароль обязателен' })
  @MinLength(8, { message: 'Минимум 8 символов' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'Пароль должен содержать: строчные, заглавные буквы, цифры и спецсимволы'
  })
  password: string;

  @ApiProperty({
    example: 'Иван',
    description: 'Имя пользователя',
  })
  @IsNotEmpty({ message: 'Имя обязательно' })
  @Length(1, 50, { message: 'Имя не может превышать 50 символов' })
  @Matches(/^[a-zA-Zа-яА-Я\s\-']+$/, { 
    message: 'Имя может содержать только буквы, пробелы, дефисы и апострофы' 
  })
  @Transform(({ value }) => value?.trim())
  firstName: string;

  @ApiProperty({
    example: 'Иванов',
    description: 'Фамилия пользователя',
  })
  @IsNotEmpty({ message: 'Фамилия обязательна' })
  @Length(1, 50, { message: 'Фамилия не может превышать 50 символов' })
  @Matches(/^[a-zA-Zа-яА-Я\s\-']+$/, { 
    message: 'Фамилия может содержать только буквы, пробелы, дефисы и апострофы' 
  })
  @Transform(({ value }) => value?.trim())
  lastName: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID роли',
  })
  @IsUUID('4', { message: 'Некорректный UUID роли' })
  @IsNotEmpty({ message: 'ID роли обязателен' })
  role_id: string;

  @ApiProperty({
    example: '+7 (999) 123-45-67',
    description: 'Телефон пользователя',
    required: false,
  })
  @IsOptional()
  @IsPhoneNumber('RU', { message: 'Некорректный российский номер телефона' })
  @Transform(({ value }) => value?.replace(/\D/g, '')) // Remove non-digits
  phone?: string;

  @ApiProperty({
    example: 'Специалист по двигателям',
    description: 'Специализация (для механиков)',
    required: false,
  })
  @IsOptional()
  @Length(1, 100, { message: 'Специализация не может превышать 100 символов' })
  @Matches(/^[a-zA-Zа-яА-Я\s\-'.,()]+$/, { 
    message: 'Специализация содержит недопустимые символы' 
  })
  @Transform(({ value }) => value?.trim())
  specialization?: string;
}
```

**File:** `modules/users/dto/request/update-user-profile.dto.ts` (NEW)
```typescript
import { 
  IsEmail, 
  IsOptional, 
  Length,
  Matches,
  IsPhoneNumber,
  Transform
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserProfileDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email пользователя',
    required: false,
  })
  @IsEmail({}, { message: 'Некорректный email' })
  @IsOptional()
  @Length(1, 255)
  email?: string;

  @ApiProperty({
    example: 'Иван',
    description: 'Имя пользователя',
    required: false,
  })
  @IsOptional()
  @Length(1, 50)
  @Matches(/^[a-zA-Zа-яА-Я\s\-']+$/)
  @Transform(({ value }) => value?.trim())
  firstName?: string;

  @ApiProperty({
    example: 'Иванов',
    description: 'Фамилия пользователя',
    required: false,
  })
  @IsOptional()
  @Length(1, 50)
  @Matches(/^[a-zA-Zа-яА-Я\s\-']+$/)
  @Transform(({ value }) => value?.trim())
  lastName?: string;

  @ApiProperty({
    example: '+7 (999) 123-45-67',
    description: 'Телефон пользователя',
    required: false,
  })
  @IsOptional()
  @IsPhoneNumber('RU')
  @Transform(({ value }) => value?.replace(/\D/g, ''))
  phone?: string;

  @ApiProperty({
    example: 'Специалист по двигателям',
    description: 'Специализация',
    required: false,
  })
  @IsOptional()
  @Length(1, 100)
  @Matches(/^[a-zA-Zа-яА-Я\s\-'.,()]+$/)
  @Transform(({ value }) => value?.trim())
  specialization?: string;
}
```

**File:** `modules/users/dto/request/update-user-role.dto.ts` (NEW)
```typescript
import { IsUUID, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserRoleDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID новой роли',
  })
  @IsUUID('4', { message: 'Некорректный UUID роли' })
  @IsNotEmpty({ message: 'ID роли обязателен' })
  role_id: string;
}
```

**File:** `modules/users/dto/request/update-user-status.dto.ts` (NEW)
```typescript
import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserStatusDto {
  @ApiProperty({
    example: true,
    description: 'Новый статус активности пользователя',
  })
  @IsBoolean({ message: 'Статус должен быть boolean' })
  isActive: boolean;
}
```

**File:** `modules/users/dto/request/change-password.dto.ts` (NEW)
```typescript
import { IsNotEmpty, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({
    example: 'OldPassword123!',
    description: 'Текущий пароль',
  })
  @IsNotEmpty({ message: 'Текущий пароль обязателен' })
  currentPassword: string;

  @ApiProperty({
    example: 'NewSecurePass456!',
    description: 'Новый надежный пароль',
  })
  @IsNotEmpty({ message: 'Новый пароль обязателен' })
  @MinLength(8, { message: 'Минимум 8 символов' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message: 'Пароль должен содержать: строчные, заглавные буквы, цифры и спецсимволы'
  })
  newPassword: string;
}
```

#### **Step 1.2: Fix Response DTOs (5 minutes)**

**File:** `modules/users/dto/response/user-response.dto.ts`
```typescript
import { ApiProperty } from '@nestjs/swagger';
import { RoleDto } from './role.dto';

export class UserResponseDto {
  @ApiProperty({ example: 'uuid', description: 'ID пользователя' })
  id: string;

  @ApiProperty({ example: 'user@example.com', description: 'Email' })
  email: string;

  @ApiProperty({ example: 'John', description: 'Имя' })
  firstName: string;

  @ApiProperty({ example: 'Doe', description: 'Фамилия' })
  lastName: string;

  @ApiProperty({ example: '+7 999 123 45 67', description: 'Телефон', required: false })
  phone?: string;

  @ApiProperty({ example: 'Специалист по двигателям', description: 'Специализация', required: false })
  specialization?: string;

  @ApiProperty({ example: true, description: 'Активен ли пользователь' })
  isActive: boolean;

  @ApiProperty({ description: 'Роль пользователя', type: RoleDto })
  role: RoleDto;

  // ❌ REMOVED: company_id - security risk!

  @ApiProperty({ example: '2025-01-01T00:00:00Z', description: 'Дата создания' })
  createdAt: Date;

  @ApiProperty({ example: '2025-01-01T00:00:00Z', description: 'Последний вход', required: false })
  lastLoginAt?: Date;
}
```

**File:** `modules/users/dto/response/paginated-users-response.dto.ts` (NEW)
```typescript
import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from './user-response.dto';

export class PaginatedUsersResponseDto {
  @ApiProperty({ 
    description: 'Список пользователей', 
    type: [UserResponseDto] 
  })
  users: UserResponseDto[];

  @ApiProperty({ example: 1, description: 'Текущая страница' })
  page: number;

  @ApiProperty({ example: 20, description: 'Элементов на странице' })
  limit: number;

  @ApiProperty({ example: 150, description: 'Общее количество пользователей' })
  total: number;

  @ApiProperty({ example: 8, description: 'Общее количество страниц' })
  totalPages: number;

  @ApiProperty({ example: true, description: 'Есть ли следующая страница' })
  hasNext: boolean;

  @ApiProperty({ example: false, description: 'Есть ли предыдущая страница' })
  hasPrev: boolean;
}
```

### **🔥 PHASE 2: COMPLETE CONTROLLER IMPLEMENTATION (Priority 1)**

#### **Step 2.1: Full Security Controller (20 minutes)**

**File:** `modules/users/users.controller.ts`
```typescript
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  ParseBoolPipe,
  DefaultValuePipe,
  ParseIntPipe,
  Req,
  UseGuards,
  UseInterceptors,
  UsePipes,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiBadRequestResponse,
  ApiTooManyRequestsResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { UsersService } from './users.service';
import { UsersBusinessService } from './services/users-business.service';
import { UsersValidationService } from './services/users-validation.service';

import { CreateUserDto } from './dto/request/create-user.dto';
import { UpdateUserProfileDto } from './dto/request/update-user-profile.dto';
import { UpdateUserRoleDto } from './dto/request/update-user-role.dto';
import { UpdateUserStatusDto } from './dto/request/update-user-status.dto';
import { ChangePasswordDto } from './dto/request/change-password.dto';

import { UserResponseDto } from './dto/response/user-response.dto';
import { PaginatedUsersResponseDto } from './dto/response/paginated-users-response.dto';

import { Roles } from '../auth/decorators/roles.decorator';
import { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { UserFilter } from './types/users.types';
import { USERS_CONSTANTS } from './constants/users.constants';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuditLoggingInterceptor } from '../../common/interceptors/audit-logging.interceptor';
import { EnhancedValidationPipe } from '../../common/pipes/enhanced-validation.pipe';

@ApiTags('👥 Управление пользователями')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditLoggingInterceptor)
@UsePipes(EnhancedValidationPipe)
@ApiBearerAuth('JWT-auth')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly usersBusinessService: UsersBusinessService,
    private readonly usersValidationService: UsersValidationService,
  ) {}

  @Post()
  @Roles('company_admin', 'company_owner', 'superadmin')
  @ApiOperation({ 
    summary: 'Создание нового пользователя',
    description: 'Создание нового пользователя в компании. Компания определяется автоматически из JWT токена.'
  })
  @ApiBody({
    type: CreateUserDto,
    description: 'Данные для создания пользователя',
    examples: {
      mechanic: {
        summary: 'Создание механика',
        value: {
          email: 'mechanic@autoservice.ru',
          password: 'SecurePass123!',
          firstName: 'Алексей',
          lastName: 'Механиков',
          role_id: '123e4567-e89b-12d3-a456-426614174000',
          phone: '+7 (999) 123-45-67',
          specialization: 'Специалист по двигателям'
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '✅ Пользователь успешно создан',
    type: UserResponseDto,
  })
  @ApiConflictResponse({
    description: '❌ Пользователь с таким email уже существует',
  })
  @ApiBadRequestResponse({
    description: '❌ Некорректные данные или роль не принадлежит компании',
  })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Недостаточно прав доступа' })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 10 в минуту)' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.CREATED)
  async createUser(
    @Body() createUserDto: CreateUserDto,
    @Req() req: RequestWithUser,
  ): Promise<UserResponseDto> {
    // ✅ SECURITY: company_id берется из JWT токена, не из DTO!
    const userData = { 
      ...createUserDto, 
      company_id: req.user.companyId 
    };
    
    // ✅ SECURITY: Валидация role assignment с проверкой иерархии
    await this.usersValidationService.validateRoleAssignment(
      req.user.id, 
      createUserDto.role_id, 
      req.user.companyId
    );
    
    return this.usersBusinessService.createUser(userData, req.user.id);
  }

  @Get()
  @Roles('company_admin', 'company_owner', 'manager', 'superadmin')
  @ApiOperation({ 
    summary: 'Получение списка пользователей компании',
    description: 'Получение пользователей с фильтрацией и пагинацией. Superadmin видит всех, остальные - только своей компании.'
  })
  @ApiQuery({ name: 'search', required: false, description: 'Поиск по имени, фамилии или email' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean, description: 'Фильтр по статусу' })
  @ApiQuery({ name: 'role', required: false, description: 'Фильтр по роли' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Номер страницы' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Элементов на странице' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '✅ Список пользователей успешно получен',
    type: PaginatedUsersResponseDto,
  })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 30 в минуту)' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async getUsers(
    @Req() req: RequestWithUser,
    @Query('search') search?: string,
    @Query('isActive') isActive?: boolean,
    @Query('role') role?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(USERS_CONSTANTS.PAGINATION.DEFAULT_LIMIT), ParseIntPipe) limit: number = USERS_CONSTANTS.PAGINATION.DEFAULT_LIMIT,
  ): Promise<PaginatedUsersResponseDto> {
    const filter: UserFilter = {
      search,
      isActive,
      role: role as any,
      page,
      limit: Math.min(limit, USERS_CONSTANTS.PAGINATION.MAX_LIMIT),
    };

    // ✅ SECURITY: Non-superadmin видят только свою компанию
    if (req.user.role !== 'superadmin') {
      filter.companyId = req.user.companyId;
    }

    return this.usersBusinessService.getUsers(filter);
  }

  @Get(':id')
  @Roles('company_admin', 'company_owner', 'manager', 'superadmin')
  @ApiOperation({ 
    summary: 'Получение пользователя по ID',
    description: 'Получение детальной информации о пользователе.'
  })
  @ApiParam({ name: 'id', description: 'ID пользователя' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '✅ Пользователь найден',
    type: UserResponseDto,
  })
  @ApiNotFoundResponse({ description: '❌ Пользователь не найден' })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 50 в минуту)' })
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  async getUserById(
    @Param('id') userId: string,
    @Req() req: RequestWithUser,
  ): Promise<UserResponseDto> {
    // ✅ SECURITY: Проверка принадлежности пользователя к компании
    await this.usersValidationService.validateUserAccess(userId, req.user.companyId, req.user.role);
    
    return this.usersBusinessService.getUserById(userId);
  }

  @Patch(':id/profile')
  @Roles('company_admin', 'company_owner', 'superadmin')
  @ApiOperation({ 
    summary: 'Обновление профиля пользователя',
    description: 'Обновление базовой информации пользователя (имя, email, телефон, специализация).'
  })
  @ApiParam({ name: 'id', description: 'ID пользователя' })
  @ApiBody({ type: UpdateUserProfileDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '✅ Профиль успешно обновлен',
    type: UserResponseDto,
  })
  @ApiNotFoundResponse({ description: '❌ Пользователь не найден' })
  @ApiConflictResponse({ description: '❌ Email уже используется' })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 20 в минуту)' })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async updateUserProfile(
    @Param('id') userId: string,
    @Body() updateDto: UpdateUserProfileDto,
    @Req() req: RequestWithUser,
  ): Promise<UserResponseDto> {
    // ✅ SECURITY: Проверка принадлежности пользователя к компании
    await this.usersValidationService.validateUserOwnership(userId, req.user.companyId);
    
    return this.usersBusinessService.updateUserProfile(userId, updateDto, req.user.id);
  }

  @Patch(':id/role')
  @Roles('company_admin', 'company_owner', 'superadmin')
  @ApiOperation({ 
    summary: 'Изменение роли пользователя',
    description: 'Изменение роли пользователя с проверкой иерархии прав.'
  })
  @ApiParam({ name: 'id', description: 'ID пользователя' })
  @ApiBody({ type: UpdateUserRoleDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '✅ Роль успешно изменена',
    type: UserResponseDto,
  })
  @ApiNotFoundResponse({ description: '❌ Пользователь или роль не найдены' })
  @ApiForbiddenResponse({ description: '❌ Нельзя назначить роль выше своей' })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 15 в минуту)' })
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  async updateUserRole(
    @Param('id') userId: string,
    @Body() updateDto: UpdateUserRoleDto,
    @Req() req: RequestWithUser,
  ): Promise<UserResponseDto> {
    // ✅ SECURITY: Валидация role assignment
    await this.usersValidationService.validateRoleAssignment(
      req.user.id, 
      updateDto.role_id, 
      req.user.companyId
    );
    
    // ✅ SECURITY: Проверка принадлежности пользователя к компании
    await this.usersValidationService.validateUserOwnership(userId, req.user.companyId);
    
    return this.usersBusinessService.updateUserRole(userId, updateDto, req.user.id);
  }

  @Patch(':id/status')
  @Roles('company_admin', 'company_owner', 'superadmin')
  @ApiOperation({ 
    summary: 'Изменение статуса пользователя',
    description: 'Активация или деактивация пользователя.'
  })
  @ApiParam({ name: 'id', description: 'ID пользователя' })
  @ApiBody({ type: UpdateUserStatusDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '✅ Статус успешно изменен',
    type: UserResponseDto,
  })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 15 в минуту)' })
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  async updateUserStatus(
    @Param('id') userId: string,
    @Body() updateDto: UpdateUserStatusDto,
    @Req() req: RequestWithUser,
  ): Promise<UserResponseDto> {
    // ✅ SECURITY: Проверка принадлежности пользователя к компании
    await this.usersValidationService.validateUserOwnership(userId, req.user.companyId);
    
    return this.usersBusinessService.updateUserStatus(userId, updateDto, req.user.id);
  }

  @Patch(':id/password')
  @Roles('company_admin', 'company_owner', 'superadmin')
  @ApiOperation({ 
    summary: 'Сброс пароля пользователя',
    description: 'Принудительный сброс пароля пользователя администратором.'
  })
  @ApiParam({ name: 'id', description: 'ID пользователя' })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '✅ Пароль успешно изменен',
  })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 10 в минуту)' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async resetUserPassword(
    @Param('id') userId: string,
    @Body() changePasswordDto: ChangePasswordDto,
    @Req() req: RequestWithUser,
  ): Promise<{ success: boolean; message: string }> {
    // ✅ SECURITY: Проверка принадлежности пользователя к компании
    await this.usersValidationService.validateUserOwnership(userId, req.user.companyId);
    
    return this.usersBusinessService.resetUserPassword(userId, changePasswordDto.newPassword, req.user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('company_owner', 'superadmin')
  @ApiOperation({ 
    summary: '🚨 Удаление пользователя (soft delete)',
    description: 'Мягкое удаление пользователя (деактивация). Физическое удаление доступно только суперадмину.'
  })
  @ApiParam({ name: 'id', description: 'ID пользователя' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: '✅ Пользователь успешно удален',
  })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 5 в минуту)' })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async deleteUser(
    @Param('id') userId: string,
    @Req() req: RequestWithUser,
  ): Promise<void> {
    // ✅ SECURITY: Проверка принадлежности пользователя к компании
    await this.usersValidationService.validateUserOwnership(userId, req.user.companyId);
    
    // ✅ SECURITY: Нельзя удалить самого себя
    await this.usersValidationService.validateNotSelfDeletion(userId, req.user.id);
    
    return this.usersBusinessService.deleteUser(userId, req.user.id);
  }
}
```

### **🔥 PHASE 3: 4-LAYER ARCHITECTURE IMPLEMENTATION (Priority 1)**

#### **Step 3.1: Business Service (15 minutes)**

**File:** `modules/users/services/users-business.service.ts` (NEW)
```typescript
import { Injectable } from '@nestjs/common';
import { AuditService } from '../../../common/audit/audit.service';
import { UsersDataService } from './users-data.service';
import { UsersMapperService } from './users-mapper.service';
import { UsersValidationService } from './users-validation.service';

import { User } from '../../../database/entities/user.entity';
import { CreateUserDto } from '../dto/request/create-user.dto';
import { UpdateUserProfileDto } from '../dto/request/update-user-profile.dto';
import { UpdateUserRoleDto } from '../dto/request/update-user-role.dto';
import { UpdateUserStatusDto } from '../dto/request/update-user-status.dto';
import { UserResponseDto } from '../dto/response/user-response.dto';
import { PaginatedUsersResponseDto } from '../dto/response/paginated-users-response.dto';
import { UserFilter } from '../types/users.types';

@Injectable()
export class UsersBusinessService {
  constructor(
    private readonly usersDataService: UsersDataService,
    private readonly usersMapperService: UsersMapperService,
    private readonly usersValidationService: UsersValidationService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * ✅ Создание пользователя с полной бизнес-логикой
   */
  async createUser(userData: CreateUserDto & { company_id: string }, createdBy: string): Promise<UserResponseDto> {
    // Валидация данных
    await this.usersValidationService.validateCreateData(userData);
    
    // Создание пользователя в транзакции
    const user = await this.usersDataService.createUserWithTransaction(userData);
    
    // Audit logging
    await this.auditService.log('USER_CREATED' as any, {
      userId: createdBy,
      entityId: user.id,
      entityType: 'User',
      companyId: user.company_id,
      details: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role.name,
      },
      metadata: { createdBy },
    });
    
    return this.usersMapperService.mapToResponseDto(user);
  }

  /**
   * ✅ Получение списка пользователей с фильтрацией
   */
  async getUsers(filter: UserFilter): Promise<PaginatedUsersResponseDto> {
    const { users, total } = await this.usersDataService.findUsersWithFilter(filter);
    
    const userDtos = this.usersMapperService.mapArrayToResponseDto(users);
    
    const totalPages = Math.ceil(total / filter.limit);
    
    return {
      users: userDtos,
      page: filter.page,
      limit: filter.limit,
      total,
      totalPages,
      hasNext: filter.page < totalPages,
      hasPrev: filter.page > 1,
    };
  }

  /**
   * ✅ Получение пользователя по ID
   */
  async getUserById(userId: string): Promise<UserResponseDto> {
    const user = await this.usersDataService.findByIdWithRole(userId);
    return this.usersMapperService.mapToResponseDto(user);
  }

  /**
   * ✅ Обновление профиля пользователя
   */
  async updateUserProfile(userId: string, updateData: UpdateUserProfileDto, updatedBy: string): Promise<UserResponseDto> {
    // Валидация данных обновления
    await this.usersValidationService.validateUpdateProfileData(userId, updateData);
    
    const beforeUser = await this.usersDataService.findByIdWithRole(userId);
    
    // Обновление в транзакции
    const updatedUser = await this.usersDataService.updateUserWithTransaction(userId, updateData);
    
    // Audit logging
    await this.auditService.log('USER_UPDATED' as any, {
      userId: updatedBy,
      entityId: userId,
      entityType: 'User',
      companyId: updatedUser.company_id,
      changes: {
        before: this.usersMapperService.mapToAuditData(beforeUser),
        after: this.usersMapperService.mapToAuditData(updatedUser),
      },
      details: { updatedFields: Object.keys(updateData) },
      metadata: { updatedBy },
    });
    
    return this.usersMapperService.mapToResponseDto(updatedUser);
  }

  /**
   * ✅ Изменение роли пользователя
   */
  async updateUserRole(userId: string, updateData: UpdateUserRoleDto, updatedBy: string): Promise<UserResponseDto> {
    const beforeUser = await this.usersDataService.findByIdWithRole(userId);
    
    // Обновление роли в транзакции
    const updatedUser = await this.usersDataService.updateUserRoleWithTransaction(userId, updateData.role_id);
    
    // Audit logging для смены роли
    await this.auditService.log('USER_ROLE_CHANGED' as any, {
      userId: updatedBy,
      entityId: userId,
      entityType: 'User',
      companyId: updatedUser.company_id,
      changes: {
        before: { role: beforeUser.role.name },
        after: { role: updatedUser.role.name },
      },
      details: { 
        previousRole: beforeUser.role.name,
        newRole: updatedUser.role.name 
      },
      metadata: { updatedBy },
    });
    
    return this.usersMapperService.mapToResponseDto(updatedUser);
  }

  /**
   * ✅ Изменение статуса пользователя
   */
  async updateUserStatus(userId: string, updateData: UpdateUserStatusDto, updatedBy: string): Promise<UserResponseDto> {
    const beforeUser = await this.usersDataService.findByIdWithRole(userId);
    
    // Валидация изменения статуса
    this.usersValidationService.validateStatusChange(beforeUser.isActive, updateData.isActive);
    
    // Обновление статуса
    const updatedUser = await this.usersDataService.updateUserStatus(userId, updateData.isActive);
    
    // Audit logging
    await this.auditService.log('USER_STATUS_CHANGED' as any, {
      userId: updatedBy,
      entityId: userId,
      entityType: 'User',
      companyId: updatedUser.company_id,
      changes: {
        before: { isActive: beforeUser.isActive },
        after: { isActive: updatedUser.isActive },
      },
      details: { 
        action: updateData.isActive ? 'activated' : 'deactivated' 
      },
      metadata: { updatedBy },
    });
    
    return this.usersMapperService.mapToResponseDto(updatedUser);
  }

  /**
   * ✅ Сброс пароля пользователя администратором
   */
  async resetUserPassword(userId: string, newPassword: string, resetBy: string): Promise<{ success: boolean; message: string }> {
    // Хеширование нового пароля
    const hashedPassword = await this.usersDataService.hashPassword(newPassword);
    
    // Обновление пароля
    await this.usersDataService.updateUserPassword(userId, hashedPassword);
    
    // Audit logging
    await this.auditService.log('USER_PASSWORD_RESET' as any, {
      userId: resetBy,
      entityId: userId,
      entityType: 'User',
      details: { resetBy: 'admin' },
      metadata: { resetBy },
    });
    
    return {
      success: true,
      message: 'Пароль пользователя успешно сброшен'
    };
  }

  /**
   * ✅ Мягкое удаление пользователя
   */
  async deleteUser(userId: string, deletedBy: string): Promise<void> {
    const user = await this.usersDataService.findByIdWithRole(userId);
    
    // Мягкое удаление (деактивация)
    await this.usersDataService.softDeleteUser(userId, deletedBy);
    
    // Audit logging
    await this.auditService.log('USER_DELETED' as any, {
      userId: deletedBy,
      entityId: userId,
      entityType: 'User',
      companyId: user.company_id,
      details: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        deletionType: 'soft'
      },
      metadata: { deletedBy },
    });
  }
}
```

#### **Step 3.2: Data Service (15 minutes)**

**File:** `modules/users/services/users-data.service.ts` (NEW)
```typescript
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { User } from '../../../database/entities/user.entity';
import { Role } from '../../../database/entities/role.entity';
import { CreateUserDto } from '../dto/request/create-user.dto';
import { UpdateUserProfileDto } from '../dto/request/update-user-profile.dto';
import { UserFilter } from '../types/users.types';

@Injectable()
export class UsersDataService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
    private dataSource: DataSource,
  ) {}

  /**
   * ✅ Создание пользователя в транзакции
   */
  async createUserWithTransaction(userData: CreateUserDto & { company_id: string }): Promise<User> {
    return this.dataSource.transaction(async manager => {
      // Проверка уникальности email
      const existingUser = await manager.findOne(User, { 
        where: { email: userData.email } 
      });
      
      if (existingUser) {
        throw new ConflictException(`Пользователь с email ${userData.email} уже существует`);
      }
      
      // Проверка существования роли
      const role = await manager.findOne(Role, { 
        where: { id: userData.role_id } 
      });
      
      if (!role) {
        throw new NotFoundException(`Роль с ID ${userData.role_id} не найдена`);
      }
      
      // Хеширование пароля
      const hashedPassword = await this.hashPassword(userData.password);
      
      // Создание пользователя
      const newUser = manager.create(User, {
        ...userData,
        password_hash: hashedPassword,
        roleId: userData.role_id,
      });
      
      const savedUser = await manager.save(newUser);
      
      // Загружаем пользователя с ролью
      return manager.findOne(User, {
        where: { id: savedUser.id },
        relations: ['role']
      });
    });
  }

  /**
   * ✅ Поиск пользователей с фильтрацией
   */
  async findUsersWithFilter(filter: UserFilter): Promise<{ users: User[]; total: number }> {
    const queryBuilder = this.usersRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .orderBy(`user.${filter.sortField || 'createdAt'}`, filter.sortOrder || 'DESC');

    // Фильтр по компании
    if (filter.companyId) {
      queryBuilder.andWhere('user.company_id = :companyId', { companyId: filter.companyId });
    }

    // Поиск по имени, фамилии или email
    if (filter.search) {
      queryBuilder.andWhere(
        '(LOWER(user.firstName) LIKE LOWER(:search) OR LOWER(user.lastName) LIKE LOWER(:search) OR LOWER(user.email) LIKE LOWER(:search))',
        { search: `%${filter.search}%` }
      );
    }

    // Фильтр по статусу
    if (filter.isActive !== undefined) {
      queryBuilder.andWhere('user.isActive = :isActive', { isActive: filter.isActive });
    }

    // Фильтр по роли
    if (filter.role) {
      queryBuilder.andWhere('role.name = :role', { role: filter.role });
    }

    // Пагинация
    const total = await queryBuilder.getCount();
    
    queryBuilder
      .skip((filter.page - 1) * filter.limit)
      .take(filter.limit);

    const users = await queryBuilder.getMany();

    return { users, total };
  }

  /**
   * ✅ Поиск пользователя по ID с ролью
   */
  async findByIdWithRole(id: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['role']
    });

    if (!user) {
      throw new NotFoundException(`Пользователь с ID ${id} не найден`);
    }

    return user;
  }

  /**
   * ✅ Поиск пользователя по email
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email },
      relations: ['role']
    });
  }

  /**
   * ✅ Обновление пользователя в транзакции
   */
  async updateUserWithTransaction(id: string, updateData: UpdateUserProfileDto): Promise<User> {
    return this.dataSource.transaction(async manager => {
      // Проверка уникальности email (если изменяется)
      if (updateData.email) {
        const existingUser = await manager.findOne(User, {
          where: { email: updateData.email }
        });
        
        if (existingUser && existingUser.id !== id) {
          throw new ConflictException(`Email ${updateData.email} уже используется другим пользователем`);
        }
      }
      
      // Обновление данных
      await manager.update(User, id, updateData);
      
      // Возврат обновленного пользователя
      return manager.findOne(User, {
        where: { id },
        relations: ['role']
      });
    });
  }

  /**
   * ✅ Обновление роли пользователя в транзакции
   */
  async updateUserRoleWithTransaction(userId: string, roleId: string): Promise<User> {
    return this.dataSource.transaction(async manager => {
      // Проверка существования роли
      const role = await manager.findOne(Role, { where: { id: roleId } });
      if (!role) {
        throw new NotFoundException(`Роль с ID ${roleId} не найдена`);
      }
      
      // Обновление роли
      await manager.update(User, userId, { roleId });
      
      // Возврат обновленного пользователя
      return manager.findOne(User, {
        where: { id: userId },
        relations: ['role']
      });
    });
  }

  /**
   * ✅ Обновление статуса пользователя
   */
  async updateUserStatus(userId: string, isActive: boolean): Promise<User> {
    await this.usersRepository.update(userId, { isActive });
    
    return this.findByIdWithRole(userId);
  }

  /**
   * ✅ Обновление пароля пользователя
   */
  async updateUserPassword(userId: string, hashedPassword: string): Promise<void> {
    await this.usersRepository.update(userId, { 
      password_hash: hashedPassword 
    });
  }

  /**
   * ✅ Мягкое удаление пользователя
   */
  async softDeleteUser(userId: string, deletedBy: string): Promise<void> {
    await this.usersRepository.update(userId, {
      isActive: false,
      deletedAt: new Date(),
      deletedBy: deletedBy,
    });
  }

  /**
   * ✅ Хеширование пароля
   */
  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(12); // 12 rounds для 2025
    return bcrypt.hash(password, salt);
  }

  /**
   * ✅ Сравнение паролей
   */
  async comparePasswords(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  /**
   * ✅ Обновление времени последнего входа
   */
  async updateLastLogin(userId: string): Promise<void> {
    await this.usersRepository.update(userId, { 
      lastLoginAt: new Date() 
    });
  }

  /**
   * ✅ Получение количества пользователей по компании
   */
  async getUserCountByCompany(companyId: string): Promise<number> {
    return this.usersRepository.count({
      where: { company_id: companyId }
    });
  }

  /**
   * ✅ Получение активных пользователей по компании
   */
  async getActiveUsersByCompany(companyId: string): Promise<User[]> {
    return this.usersRepository.find({
      where: { 
        company_id: companyId,
        isActive: true 
      },
      relations: ['role']
    });
  }
}
```

#### **Step 3.3: Validation Service (15 minutes)**

**File:** `modules/users/services/users-validation.service.ts` (NEW)
```typescript
import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { UsersDataService } from './users-data.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../../../database/entities/role.entity';
import { User } from '../../../database/entities/user.entity';
import { CreateUserDto } from '../dto/request/create-user.dto';
import { UpdateUserProfileDto } from '../dto/request/update-user-profile.dto';
import { AuthRole } from '../../auth/types/auth.types';

@Injectable()
export class UsersValidationService {
  constructor(
    private readonly usersDataService: UsersDataService,
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  /**
   * ✅ Валидация назначения роли с проверкой иерархии
   */
  async validateRoleAssignment(
    assignerId: string, 
    targetRoleId: string, 
    companyId: string
  ): Promise<void> {
    // Получаем данные о назначающем пользователе
    const assigner = await this.usersDataService.findByIdWithRole(assignerId);
    
    // Получаем целевую роль
    const targetRole = await this.rolesRepository.findOne({ 
      where: { id: targetRoleId } 
    });
    
    if (!targetRole) {
      throw new NotFoundException(`Роль с ID ${targetRoleId} не найдена`);
    }
    
    // ✅ CRITICAL: Проверка принадлежности роли к компании
    if (targetRole.companyId !== companyId && targetRole.companyId !== null) {
      throw new ForbiddenException('Нельзя назначить роль из другой компании');
    }
    
    // ✅ CRITICAL: Проверка иерархии ролей
    if (!this.canAssignRole(assigner.role.name as AuthRole, targetRole.name as AuthRole)) {
      throw new ForbiddenException('Нельзя назначить роль равную или выше своей');
    }
  }

  /**
   * ✅ Проверка иерархии ролей
   */
  private canAssignRole(assignerRole: AuthRole, targetRole: AuthRole): boolean {
    const hierarchy: Record<AuthRole, number> = {
      // Platform level
      'superadmin': 100,
      'platform_admin': 90,
      'auditor': 85,
      'support_engineer': 80,
      'system_operator': 75,
      
      // Company level
      'company_owner': 70,
      'company_admin': 60,
      'manager': 50,
      'lead_mechanic': 40,
      'service_advisor': 35,
      'cashier': 30,
      'inventory_manager': 30,
      'mechanic': 20,
      'diagnostic': 20,
    };
    
    const assignerLevel = hierarchy[assignerRole] || 0;
    const targetLevel = hierarchy[targetRole] || 0;
    
    // Можно назначить роль только ниже своей
    return assignerLevel > targetLevel;
  }

  /**
   * ✅ Валидация принадлежности пользователя к компании
   */
  async validateUserOwnership(userId: string, companyId: string): Promise<void> {
    const user = await this.usersDataService.findByIdWithRole(userId);
    
    if (user.company_id !== companyId) {
      throw new ForbiddenException('Пользователь принадлежит другой компании');
    }
  }

  /**
   * ✅ Валидация доступа к пользователю (для просмотра)
   */
  async validateUserAccess(userId: string, userCompanyId: string, userRole: AuthRole): Promise<void> {
    // Superadmin имеет доступ ко всем пользователям
    if (userRole === 'superadmin') {
      return;
    }
    
    // Остальные только к своей компании
    await this.validateUserOwnership(userId, userCompanyId);
  }

  /**
   * ✅ Валидация данных создания пользователя
   */
  async validateCreateData(userData: CreateUserDto & { company_id: string }): Promise<void> {
    // Проверка уникальности email
    const existingUser = await this.usersDataService.findByEmail(userData.email);
    if (existingUser) {
      throw new BadRequestException(`Пользователь с email ${userData.email} уже существует`);
    }
    
    // Проверка существования роли
    const role = await this.rolesRepository.findOne({ 
      where: { id: userData.role_id } 
    });
    
    if (!role) {
      throw new NotFoundException(`Роль с ID ${userData.role_id} не найдена`);
    }
    
    // Проверка принадлежности роли к компании
    if (role.companyId !== userData.company_id && role.companyId !== null) {
      throw new ForbiddenException('Роль не принадлежит вашей компании');
    }
    
    // Дополнительные валидации
    this.validateContactInfo(userData);
  }

  /**
   * ✅ Валидация данных обновления профиля
   */
  async validateUpdateProfileData(userId: string, updateData: UpdateUserProfileDto): Promise<void> {
    // Проверка уникальности email (если изменяется)
    if (updateData.email) {
      const existingUser = await this.usersDataService.findByEmail(updateData.email);
      if (existingUser && existingUser.id !== userId) {
        throw new BadRequestException(`Email ${updateData.email} уже используется другим пользователем`);
      }
    }
    
    // Дополнительные валидации
    this.validateContactInfo(updateData);
  }

  /**
   * ✅ Валидация изменения статуса
   */
  validateStatusChange(currentStatus: boolean, newStatus: boolean): void {
    if (currentStatus === newStatus) {
      throw new BadRequestException(
        `Пользователь уже имеет статус ${newStatus ? 'активен' : 'неактивен'}`
      );
    }
  }

  /**
   * ✅ Валидация что пользователь не удаляет сам себя
   */
  validateNotSelfDeletion(targetUserId: string, currentUserId: string): void {
    if (targetUserId === currentUserId) {
      throw new ForbiddenException('Нельзя удалить самого себя');
    }
  }

  /**
   * ✅ Валидация контактной информации
   */
  private validateContactInfo(data: Partial<CreateUserDto | UpdateUserProfileDto>): void {
    // Проверка телефона (дополнительная к декоратору)
    if (data.phone) {
      const cleanPhone = data.phone.replace(/\D/g, '');
      if (cleanPhone.length < 10 || cleanPhone.length > 15) {
        throw new BadRequestException('Некорректная длина номера телефона');
      }
    }
    
    // Проверка имени и фамилии на XSS
    if (data.firstName) {
      this.validateTextFieldForXSS(data.firstName, 'firstName');
    }
    
    if (data.lastName) {
      this.validateTextFieldForXSS(data.lastName, 'lastName');
    }
    
    if (data.specialization) {
      this.validateTextFieldForXSS(data.specialization, 'specialization');
    }
  }

  /**
   * ✅ Проверка текстовых полей на XSS
   */
  private validateTextFieldForXSS(value: string, fieldName: string): void {
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe/i,
      /<object/i,
      /<embed/i,
    ];
    
    for (const pattern of xssPatterns) {
      if (pattern.test(value)) {
        throw new BadRequestException(`Поле ${fieldName} содержит недопустимые символы`);
      }
    }
  }
}
```

#### **Step 3.4: Mapper Service (10 minutes)**

**File:** `modules/users/services/users-mapper.service.ts` (NEW)
```typescript
import { Injectable } from '@nestjs/common';
import { User } from '../../../database/entities/user.entity';
import { UserResponseDto } from '../dto/response/user-response.dto';
import { RoleDto } from '../dto/response/role.dto';

@Injectable()
export class UsersMapperService {
  
  /**
   * ✅ Основной маппинг Entity → ResponseDto
   */
  mapToResponseDto(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      specialization: user.specialization,
      isActive: user.isActive,
      role: this.mapRoleToDto(user.role),
      // ❌ SECURITY: НЕ включаем company_id в response!
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    };
  }

  /**
   * ✅ Маппинг для списков
   */
  mapArrayToResponseDto(users: User[]): UserResponseDto[] {
    return users.map(user => this.mapToResponseDto(user));
  }

  /**
   * ✅ Маппинг роли
   */
  private mapRoleToDto(role: any): RoleDto {
    return {
      id: role.id,
      name: role.name,
    };
  }

  /**
   * ✅ Маппинг для audit logging (безопасные данные)
   */
  mapToAuditData(user: User): Partial<User> {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      specialization: user.specialization,
      isActive: user.isActive,
      // ❌ НЕ логируем пароли и чувствительные данные!
    };
  }

  /**
   * ✅ Базовая информация о пользователе (для других модулей)
   */
  mapToBasicInfo(user: User): { 
    id: string; 
    email: string; 
    fullName: string; 
    isActive: boolean;
  } {
    return {
      id: user.id,
      email: user.email,
      fullName: `${user.firstName} ${user.lastName}`,
      isActive: user.isActive,
    };
  }

  /**
   * ✅ Маппинг для выпадающих списков
   */
  mapToSelectOption(user: User): { value: string; label: string; disabled?: boolean } {
    return {
      value: user.id,
      label: `${user.firstName} ${user.lastName} (${user.role.name})`,
      disabled: !user.isActive,
    };
  }
}
```

### **🔥 PHASE 4: MODULE CONFIGURATION (Priority 2)**

#### **Step 4.1: Update Module (5 minutes)**

**File:** `modules/users/users.module.ts`
```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UsersController } from './users.controller';
import { UsersService } from './users.service';

// ✅ NEW: 4-layer services
import { UsersBusinessService } from './services/users-business.service';
import { UsersDataService } from './services/users-data.service';
import { UsersMapperService } from './services/users-mapper.service';
import { UsersValidationService } from './services/users-validation.service';

// ✅ Entities
import { User } from '../../database/entities/user.entity';
import { Role } from '../../database/entities/role.entity';

// ✅ Common modules for security
import { CommonModule } from '../../common/common.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Role]),
    CommonModule, // ✅ For AuditService, EnhancedValidationPipe
    AuthModule,   // ✅ For guards and decorators
  ],
  controllers: [UsersController],
  providers: [
    // ✅ Legacy service (for backward compatibility)
    UsersService,
    
    // ✅ NEW: 4-layer architecture
    UsersBusinessService,
    UsersDataService,
    UsersMapperService,
    UsersValidationService,
  ],
  exports: [
    UsersService, // ✅ Keep for backward compatibility
    UsersBusinessService,
    UsersDataService,
    UsersMapperService,
    UsersValidationService,
  ],
})
export class UsersModule {}
```

#### **Step 4.2: Update Constants (3 minutes)**

**File:** `modules/users/constants/users.constants.ts`
```typescript
export const USERS_CONSTANTS = {
  PAGINATION: {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
  },
  
  VALIDATION: {
    MIN_PASSWORD_LENGTH: 8,
    MAX_NAME_LENGTH: 50,
    MAX_EMAIL_LENGTH: 255,
    MAX_PHONE_LENGTH: 15,
    MAX_SPECIALIZATION_LENGTH: 100,
  },
  
  SECURITY: {
    PASSWORD_HASH_ROUNDS: 12,
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION_MINUTES: 15,
  },
  
  ROLES: {
    HIERARCHY: {
      // Platform level
      'superadmin': 100,
      'platform_admin': 90,
      'auditor': 85,
      'support_engineer': 80,
      'system_operator': 75,
      
      // Company level
      'company_owner': 70,
      'company_admin': 60,
      'manager': 50,
      'lead_mechanic': 40,
      'service_advisor': 35,
      'cashier': 30,
      'inventory_manager': 30,
      'mechanic': 20,
      'diagnostic': 20,
    }
  },
  
  DEFAULTS: {
    USER_STATUS: 'active',
    SORT_FIELD: 'createdAt',
    SORT_ORDER: 'DESC',
  }
} as const;
```

#### **Step 4.3: Update Types (3 minutes)**

**File:** `modules/users/types/users.types.ts`
```typescript
import { AuthRole, UserStatus, UserSortField, SortOrder } from '../../auth/types/auth.types';

export interface CreateUserData {
  company_id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  specialization?: string;
  role_id: string;
  isActive?: boolean;
}

export interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  specialization?: string;
  isActive?: boolean;
  role_id?: string;
}

export interface UserFilter {
  companyId?: string;
  search?: string;
  isActive?: boolean;
  role?: AuthRole;
  page: number;
  limit: number;
  sortField?: UserSortField;
  sortOrder?: SortOrder;
}

export interface UserQueryOptions {
  filter?: UserFilter;
  page?: number;
  limit?: number;
}

export type UserOperationType = 
  | 'create'
  | 'update_profile' 
  | 'update_role'
  | 'update_status'
  | 'delete'
  | 'password_reset'
  | 'login'
  | 'logout';

export type UserValidationError = 
  | 'email_exists'
  | 'invalid_email'
  | 'weak_password'
  | 'invalid_role'
  | 'company_mismatch'
  | 'role_hierarchy_violation'
  | 'self_deletion_attempt'
  | 'xss_detected';

// ✅ NEW: Security interfaces
export interface RoleHierarchy {
  [key: string]: number;
}

export interface UserSecurityContext {
  userId: string;
  companyId: string;
  role: AuthRole;
  permissions?: string[];
}

export interface AuditUserData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  specialization?: string;
  isActive: boolean;
  role: string;
}
```

---

## 🧪 **4. TESTING PLAN**

### **Security Tests Required:**
1. **Multi-tenant isolation** - Cannot access other company users
2. **Role escalation prevention** - Cannot assign higher roles
3. **XSS protection** - Script injection blocked
4. **SQL injection protection** - Database queries sanitized
5. **Password strength** - Weak passwords rejected
6. **Email uniqueness** - Duplicate emails blocked
7. **Audit logging** - All operations logged

---

## ⏱️ **5. IMPLEMENTATION TIMELINE**

### **EMERGENCY PHASE (Day 1 - 2 hours)**
- ✅ Fix critical DTOs (30 min)
- ✅ Implement full controller (45 min)
- ✅ Create validation service (30 min)
- ✅ Basic testing (15 min)

### **ARCHITECTURE PHASE (Day 2 - 3 hours)**
- ✅ Implement 4-layer services (90 min)
- ✅ Add audit logging (30 min)
- ✅ Update module configuration (30 min)
- ✅ Comprehensive testing (30 min)

### **POLISH PHASE (Day 3 - 1 hour)**
- ✅ Code review
- ✅ Documentation update
- ✅ Performance optimization
- ✅ Final security audit

---

## 🎯 **6. SUCCESS CRITERIA**

### **Security Score Target: 9.8/10**
- ❌ No critical vulnerabilities
- ❌ No multi-tenant bypasses
- ❌ No role escalation possible
- ❌ No XSS vulnerabilities
- ❌ No data exposure
- ✅ Complete audit trail
- ✅ Transaction safety
- ✅ Input validation

### **Functional Requirements:**
- ✅ Full CRUD API
- ✅ Role-based access control
- ✅ Multi-tenant isolation
- ✅ Password management
- ✅ User status management
- ✅ Comprehensive filtering
- ✅ Audit logging

---

## 📞 **7. EMERGENCY CONTACTS & NOTES**

**Current Status:** READY FOR IMPLEMENTATION  
**Estimated Fix Time:** 6 hours total  
**Security Priority:** CRITICAL - PRODUCTION BLOCKER  

**Key Files to Create/Modify:**
1. `users.controller.ts` - COMPLETE REWRITE
2. `create-user.dto.ts` - SECURITY FIXES
3. `update-user-*.dto.ts` - NEW SEPARATED DTOs
4. `user-response.dto.ts` - REMOVE SENSITIVE DATA
5. `users-business.service.ts` - NEW SERVICE
6. `users-data.service.ts` - NEW SERVICE
7. `users-validation.service.ts` - NEW SERVICE
8. `users-mapper.service.ts` - NEW SERVICE
9. `users.module.ts` - ADD SECURITY MODULES

**⚠️ CRITICAL:** This document contains ALL information needed to continue in any new session!

---

**📝 ГОТОВ К ВЫПОЛНЕНИЮ - НАЧИНАЕМ EMERGENCY SECURITY RESPONSE!** 🚨
