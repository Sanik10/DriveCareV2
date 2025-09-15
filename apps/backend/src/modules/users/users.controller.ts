// path: apps/backend/src/modules/users/users.controller.ts
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
import { UsersBusinessService } from './services/users-business.service'; // ✅ ДОБАВЛЕНО
import { CreateUserDto } from './dto/request/create-user.dto';
import { UpdateUserProfileDto } from './dto/request/update-user-profile.dto'; // ✅ ДОБАВЛЕНО
import { UpdateUserRoleDto } from './dto/request/update-user-role.dto'; // ✅ ДОБАВЛЕНО
import { UpdateUserStatusDto } from './dto/request/update-user-status.dto'; // ✅ ДОБАВЛЕНО
import { ChangePasswordDto } from './dto/request/change-password.dto'; // ✅ ДОБАВЛЕНО
import { UserResponseDto } from './dto/response/user-response.dto';

import { Roles } from '../auth/decorators/roles.decorator';
import { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { USERS_CONSTANTS } from './constants/users.constants';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuditLoggingInterceptor } from '../../common/interceptors/audit-logging.interceptor';
import { EnhancedValidationPipe } from '../../common/pipes/enhanced-validation.pipe';
import { UserConsentType } from '../../database/entities/user-consent.entity';

@ApiTags('👥 Управление пользователями')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditLoggingInterceptor)
@UsePipes(EnhancedValidationPipe)
@ApiBearerAuth('JWT-auth')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly usersBusinessService: UsersBusinessService, // ✅ ДОБАВЛЕНО
  ) {}

  // ✅ СУЩЕСТВУЮЩИЕ ЭНДПОЙНТЫ (без изменений)
  
  @Post()
  @Roles('company_admin', 'company_owner', 'superadmin')
  @ApiOperation({ 
    summary: 'Создание нового пользователя',
    description: '🔐 SECURITY: Компания определяется автоматически из JWT токена. Нельзя создать пользователя в чужой компании.'
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
          phone: '+79991234567',
          specialization: 'Специалист по двигателям'
        }
      },
      manager: {
        summary: 'Создание менеджера',
        value: {
          email: 'manager@autoservice.ru',
          password: 'SecureManager456!',
          firstName: 'Мария',
          lastName: 'Менеджерова',
          role_id: '123e4567-e89b-12d3-a456-426614174001',
          phone: '+79991234568'
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
    schema: {
      example: {
        statusCode: 409,
        message: 'Пользователь с email mechanic@autoservice.ru уже существует',
        error: 'Conflict'
      }
    }
  })
  @ApiBadRequestResponse({
    description: '❌ Некорректные данные или роль не принадлежит компании',
    schema: {
      example: {
        statusCode: 400,
        message: [
          'Пароль должен содержать: строчные, заглавные буквы, цифры и спецсимволы',
          'Нельзя назначить роль из другой компании'
        ],
        error: 'Bad Request'
      }
    }
  })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ 
    description: '❌ Недостаточно прав доступа или попытка назначить роль выше своей',
    schema: {
      example: {
        statusCode: 403,
        message: 'Нельзя назначить роль равную или выше своей',
        error: 'Forbidden'
      }
    }
  })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 10 в минуту)' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.CREATED)
  async createUser(
    @Body() createUserDto: CreateUserDto,
    @Req() req: RequestWithUser,
  ): Promise<UserResponseDto> {
    const userData = { ...createUserDto, company_id: req.user.companyId };
    const context = { ipAddress: req.ip || '', userAgent: (req.headers['user-agent'] as string) || '' };
    return this.usersBusinessService.createUser(userData, req.user.id, context);
  }

  @Get()
  @Roles('company_admin', 'company_owner', 'manager', 'superadmin')
  @ApiOperation({ 
    summary: 'Получение списка пользователей компании',
    description: '🔐 SECURITY: Superadmin видит всех пользователей, остальные роли - только своей компании.'
  })
  @ApiQuery({ 
    name: 'search', 
    required: false, 
    description: 'Поиск по имени, фамилии или email',
    example: 'Иван'
  })
  @ApiQuery({ 
    name: 'isActive', 
    required: false, 
    type: Boolean, 
    description: 'Фильтр по статусу активности',
    example: true
  })
  @ApiQuery({ 
    name: 'role', 
    required: false, 
    description: 'Фильтр по роли',
    example: 'mechanic'
  })
  @ApiQuery({ 
    name: 'page', 
    required: false, 
    type: Number, 
    description: 'Номер страницы (начинается с 1)',
    example: 1
  })
  @ApiQuery({ 
    name: 'limit', 
    required: false, 
    type: Number, 
    description: 'Количество элементов на странице (максимум 100)',
    example: 20
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '✅ Список пользователей успешно получен',
    schema: {
      example: {
        users: [
          {
            id: 'uuid',
            email: 'user@example.com',
            firstName: 'Иван',
            lastName: 'Иванов',
            phone: '+79991234567',
            isActive: true,
            role: { id: 'uuid', name: 'mechanic' },
            createdAt: '2025-01-06T00:00:00Z'
          }
        ],
        page: 1,
        limit: 20,
        total: 150,
        totalPages: 8,
        hasNext: true,
        hasPrev: false
      }
    }
  })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 30 в минуту)' })
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  async getUsers(
    @Req() req: RequestWithUser,
    @Query('search') search?: string,
    @Query('isActive', new DefaultValuePipe(undefined), ParseBoolPipe) isActive?: boolean,
    @Query('role') role?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(USERS_CONSTANTS.PAGINATION.DEFAULT_LIMIT), ParseIntPipe) limit: number = USERS_CONSTANTS.PAGINATION.DEFAULT_LIMIT,
  ) {
    const filter = {
      search,
      isActive,
      role,
      page,
      limit: Math.min(limit, USERS_CONSTANTS.PAGINATION.MAX_LIMIT),
    };
    return this.usersService.getUsersSecure(filter, req.user);
  }

  @Get(':id')
  @Roles('company_admin', 'company_owner', 'manager', 'superadmin')
  @ApiOperation({ 
    summary: 'Получение пользователя по ID',
    description: '🔐 SECURITY: Проверяется принадлежность пользователя к компании.'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'UUID пользователя',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '✅ Пользователь найден',
    type: UserResponseDto,
  })
  @ApiNotFoundResponse({ 
    description: '❌ Пользователь не найден',
    schema: {
      example: {
        statusCode: 404,
        message: 'Пользователь с ID 123e4567-e89b-12d3-a456-426614174000 не найден',
        error: 'Not Found'
      }
    }
  })
  @ApiForbiddenResponse({
    description: '❌ Пользователь принадлежит другой компании',
    schema: {
      example: {
        statusCode: 403,
        message: 'Пользователь принадлежит другой компании',
        error: 'Forbidden'
      }
    }
  })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 50 в минуту)' })
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  async getUserById(
    @Param('id') userId: string,
    @Req() req: RequestWithUser,
  ): Promise<UserResponseDto> {
    return this.usersService.getUserByIdSecure(userId, req.user);
  }

  // ✅ НОВЫЕ ЭНДПОЙНТЫ

  @Patch(':id/profile')
  @Roles('company_admin', 'company_owner', 'superadmin')
  @ApiOperation({ 
    summary: '✏️ Обновление профиля пользователя',
    description: '🔐 SECURITY: Можно обновлять только пользователей своей компании. Проверяется уникальность email при изменении.'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'UUID пользователя для обновления',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiBody({
    type: UpdateUserProfileDto,
    description: 'Данные для обновления профиля (все поля опциональны)',
    examples: {
      updateBasicInfo: {
        summary: 'Обновление базовой информации',
        value: {
          firstName: 'Александр',
          lastName: 'Механиков',
          phone: '+79991234567'
        }
      },
      updateEmailAndSpecialization: {
        summary: 'Изменение email и специализации',
        value: {
          email: 'new.email@autoservice.ru',
          specialization: 'Ведущий специалист по диагностике'
        }
      },
      fullUpdate: {
        summary: 'Полное обновление профиля',
        value: {
          email: 'updated@autoservice.ru',
          firstName: 'Михаил',
          lastName: 'Сервисов',
          phone: '+79991234999',
          specialization: 'Старший мастер по ремонту'
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '✅ Профиль пользователя успешно обновлен',
    type: UserResponseDto,
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'updated@autoservice.ru',
        firstName: 'Михаил',
        lastName: 'Сервисов',
        phone: '+79991234999',
        specialization: 'Старший мастер по ремонту',
        isActive: true,
        role: {
          id: 'role-uuid',
          name: 'mechanic'
        },
        createdAt: '2025-01-01T00:00:00Z',
        lastLoginAt: '2025-01-06T00:00:00Z'
      }
    }
  })
  @ApiNotFoundResponse({ 
    description: '❌ Пользователь не найден',
    schema: {
      example: {
        statusCode: 404,
        message: 'Пользователь с ID 123e4567-e89b-12d3-a456-426614174000 не найден',
        error: 'Not Found'
      }
    }
  })
  @ApiConflictResponse({
    description: '❌ Email уже используется другим пользователем',
    schema: {
      example: {
        statusCode: 409,
        message: 'Email updated@autoservice.ru уже используется другим пользователем',
        error: 'Conflict'
      }
    }
  })
  @ApiBadRequestResponse({
    description: '❌ Некорректные данные профиля',
    schema: {
      example: {
        statusCode: 400,
        message: [
          'Некорректный формат email',
          'Имя может содержать только буквы, пробелы, дефисы и апострофы',
          'Некорректный российский номер телефона'
        ],
        error: 'Bad Request'
      }
    }
  })
  @ApiForbiddenResponse({
    description: '❌ Пользователь принадлежит другой компании',
    schema: {
      example: {
        statusCode: 403,
        message: 'Пользователь принадлежит другой компании',
        error: 'Forbidden'
      }
    }
  })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 20 в минуту)' })
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async updateUserProfile(
    @Param('id') userId: string,
    @Body() updateProfileDto: UpdateUserProfileDto,
    @Req() req: RequestWithUser,
  ): Promise<UserResponseDto> {
    return this.usersBusinessService.updateUserProfile(userId, updateProfileDto, req.user.id);
  }

  @Patch(':id/role')
  @Roles('company_owner', 'superadmin')
  @ApiOperation({ 
    summary: '🔄 Изменение роли пользователя',
    description: '🔐 SECURITY: Критическая операция! Можно назначать только роли ниже своей. Проверяется принадлежность роли к компании.'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'UUID пользователя для изменения роли',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiBody({
    type: UpdateUserRoleDto,
    description: 'Новая роль пользователя',
    examples: {
      promoteToManager: {
        summary: 'Повышение до менеджера',
        value: {
          role_id: '456e7890-e89b-12d3-a456-426614174001'
        }
      },
      demoteToMechanic: {
        summary: 'Понижение до механика',
        value: {
          role_id: '789e1234-e89b-12d3-a456-426614174002'
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '✅ Роль пользователя успешно изменена',
    type: UserResponseDto,
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'user@autoservice.ru',
        firstName: 'Иван',
        lastName: 'Иванов',
        phone: '+79991234567',
        specialization: 'Специалист по диагностике',
        isActive: true,
        role: {
          id: '456e7890-e89b-12d3-a456-426614174001',
          name: 'manager'
        },
        createdAt: '2025-01-01T00:00:00Z',
        lastLoginAt: '2025-01-06T00:00:00Z'
      }
    }
  })
  @ApiNotFoundResponse({ 
    description: '❌ Пользователь или роль не найдены',
    schema: {
      example: {
        statusCode: 404,
        message: 'Роль с ID 456e7890-e89b-12d3-a456-426614174001 не найдена',
        error: 'Not Found'
      }
    }
  })
  @ApiBadRequestResponse({
    description: '❌ Некорректный UUID роли',
    schema: {
      example: {
        statusCode: 400,
        message: ['Некорректный UUID роли'],
        error: 'Bad Request'
      }
    }
  })
  @ApiForbiddenResponse({
    description: '❌ Нельзя назначить роль равную или выше своей, или роль из другой компании',
    schema: {
      examples: {
        hierarchyViolation: {
          summary: 'Нарушение иерархии ролей',
          value: {
            statusCode: 403,
            message: 'Нельзя назначить роль равную или выше своей',
            error: 'Forbidden'
          }
        },
        wrongCompanyRole: {
          summary: 'Роль из другой компании',
          value: {
            statusCode: 403,
            message: 'Роль не принадлежит вашей компании',
            error: 'Forbidden'
          }
        }
      }
    }
  })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 5 в минуту)' })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async updateUserRole(
    @Param('id') userId: string,
    @Body() updateRoleDto: UpdateUserRoleDto,
    @Req() req: RequestWithUser,
  ): Promise<UserResponseDto> {
    return this.usersBusinessService.updateUserRole(userId, updateRoleDto, req.user.id);
  }

  @Patch(':id/status')
  @Roles('company_admin', 'company_owner', 'superadmin')
  @ApiOperation({ 
    summary: '🔄 Изменение статуса пользователя',
    description: '🔐 SECURITY: Активация/деактивация пользователя. Можно применять только к пользователям своей компании.'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'UUID пользователя для изменения статуса',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiBody({
    type: UpdateUserStatusDto,
    description: 'Новый статус активности пользователя',
    examples: {
      activate: {
        summary: 'Активация пользователя',
        value: {
          isActive: true
        }
      },
      deactivate: {
        summary: 'Деактивация пользователя',
        value: {
          isActive: false
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '✅ Статус пользователя успешно изменен',
    type: UserResponseDto,
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'user@autoservice.ru',
        firstName: 'Иван',
        lastName: 'Иванов',
        phone: '+79991234567',
        specialization: 'Специалист по диагностике',
        isActive: false,
        role: {
          id: 'role-uuid',
          name: 'mechanic'
        },
        createdAt: '2025-01-01T00:00:00Z',
        lastLoginAt: '2025-01-06T00:00:00Z'
      }
    }
  })
  @ApiNotFoundResponse({ 
    description: '❌ Пользователь не найден',
    schema: {
      example: {
        statusCode: 404,
        message: 'Пользователь с ID 123e4567-e89b-12d3-a456-426614174000 не найден',
        error: 'Not Found'
      }
    }
  })
  @ApiBadRequestResponse({
    description: '❌ Некорректное значение статуса или нарушение бизнес-правил',
    schema: {
      examples: {
        invalidStatus: {
          summary: 'Некорректный тип статуса',
          value: {
            statusCode: 400,
            message: ['Статус активности должен быть true или false'],
            error: 'Bad Request'
          }
        },
        businessRule: {
          summary: 'Нарушение бизнес-правила',
          value: {
            statusCode: 400,
            message: 'Пользователь уже имеет данный статус',
            error: 'Bad Request'
          }
        }
      }
    }
  })
  @ApiForbiddenResponse({
    description: '❌ Пользователь принадлежит другой компании',
    schema: {
      example: {
        statusCode: 403,
        message: 'Пользователь принадлежит другой компании',
        error: 'Forbidden'
      }
    }
  })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 15 в минуту)' })
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async updateUserStatus(
    @Param('id') userId: string,
    @Body() updateStatusDto: UpdateUserStatusDto,
    @Req() req: RequestWithUser,
  ): Promise<UserResponseDto> {
    return this.usersBusinessService.updateUserStatus(userId, updateStatusDto, req.user.id);
  }

  @Patch(':id/password')
  @Roles('company_owner', 'superadmin')
  @ApiOperation({ 
    summary: '🔑 Административный сброс пароля',
    description: '🔐 SECURITY: Критическая операция! Только владельцы компании и суперадмины могут сбрасывать пароли. Полное логирование операции.'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'UUID пользователя для сброса пароля',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiBody({
    type: ChangePasswordDto,
    description: 'Новый надежный пароль для пользователя',
    examples: {
      strongPassword: {
        summary: 'Надежный пароль',
        value: {
          newPassword: 'NewSecure123!'
        }
      },
      complexPassword: {
        summary: 'Сложный пароль',
        value: {
          newPassword: 'Temp@2025$ecure'
        }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '✅ Пароль успешно сброшен',
    schema: {
      example: {
        success: true,
        message: 'Пароль пользователя Иван Иванов успешно сброшен'
      }
    }
  })
  @ApiNotFoundResponse({ 
    description: '❌ Пользователь не найден',
    schema: {
      example: {
        statusCode: 404,
        message: 'Пользователь с ID 123e4567-e89b-12d3-a456-426614174000 не найден',
        error: 'Not Found'
      }
    }
  })
  @ApiBadRequestResponse({
    description: '❌ Пароль не соответствует требованиям безопасности',
    schema: {
      example: {
        statusCode: 400,
        message: [
          'Пароль должен содержать минимум 8 символов',
          'Пароль должен содержать: строчные буквы, заглавные буквы, цифры и спецсимволы (@$!%*?&)'
        ],
        error: 'Bad Request'
      }
    }
  })
  @ApiForbiddenResponse({
    description: '❌ Недостаточно прав или пользователь из другой компании',
    schema: {
      examples: {
        insufficientRights: {
          summary: 'Недостаточно прав',
          value: {
            statusCode: 403,
            message: 'Недостаточно прав для сброса пароля',
            error: 'Forbidden'
          }
        },
        wrongCompany: {
          summary: 'Другая компания',
          value: {
            statusCode: 403,
            message: 'Пользователь принадлежит другой компании',
            error: 'Forbidden'
          }
        }
      }
    }
  })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 3 в минуту)' })
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async resetUserPassword(
    @Param('id') userId: string,
    @Body() changePasswordDto: ChangePasswordDto,
    @Req() req: RequestWithUser,
  ): Promise<{ success: boolean; message: string }> {
    return this.usersBusinessService.resetUserPassword(
      userId, 
      changePasswordDto.newPassword, 
      req.user.id
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('company_owner', 'superadmin')
  @ApiOperation({ 
    summary: '🚨 Удаление пользователя (деактивация)',
    description: '🔐 SECURITY: Мягкое удаление (деактивация). Нельзя удалить самого себя.'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'UUID пользователя для удаления',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: '✅ Пользователь успешно удален (деактивирован)',
  })
  @ApiNotFoundResponse({ description: '❌ Пользователь не найден' })
  @ApiForbiddenResponse({ 
    description: '❌ Нельзя удалить самого себя или пользователя из другой компании',
    schema: {
      example: {
        statusCode: 403,
        message: 'Нельзя удалить самого себя',
        error: 'Forbidden'
      }
    }
  })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 5 в минуту)' })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async deleteUser(
    @Param('id') userId: string,
    @Req() req: RequestWithUser,
  ): Promise<void> {
    return this.usersService.deleteUserSecure(userId, req.user);
  }

  @Patch('me/profile')
  @Roles('mechanic','diagnostic','lead_mechanic','service_advisor','inventory_manager','cashier','manager','company_admin','company_owner','superadmin')
  @ApiOperation({ summary: '✏️ Обновление собственного профиля (self-service)' })
  @HttpCode(HttpStatus.OK)
  async updateMyProfile(
    @Body() dto: UpdateUserProfileDto,
    @Req() req: RequestWithUser,
  ): Promise<UserResponseDto> {
    // actorId == targetId: обновляем свой профиль
    return this.usersBusinessService.updateUserProfile(req.user.id, dto, req.user.id);
  }

  @Post('me/deactivate')
  @Roles(
    'mechanic','diagnostic','lead_mechanic','service_advisor','inventory_manager',
    'cashier','manager','company_admin','company_owner','system_operator','support_engineer','auditor','platform_admin','superadmin'
  )
  @ApiOperation({ summary: '🛑 Деактивация своего аккаунта (право субъекта ПДн)' })
  @ApiResponse({ status: 200, description: '✅ Аккаунт деактивирован', schema: { example: { success: true } } })
  @HttpCode(HttpStatus.OK)
  async deactivateMe(@Req() req: RequestWithUser) {
    await this.usersBusinessService.deactivateSelf(req.user.id);
    return { success: true };
  }

  @Get('me/export')
  @Roles(
    'mechanic','diagnostic','lead_mechanic','service_advisor','inventory_manager',
    'cashier','manager','company_admin','company_owner','system_operator','support_engineer','auditor','platform_admin','superadmin'
  )
  @ApiOperation({ summary: '📦 Экспорт своих данных (право субъекта ПДн)' })
  @ApiResponse({
    status: 200,
    description: '✅ Данные экспортированы',
    schema: { example: { profile: { /* ... */ }, consents: [], exportedAt: '2025-01-01T00:00:00Z' } }
  })
  async exportMyData(@Req() req: RequestWithUser) {
    return this.usersBusinessService.exportMyData(req.user.id);
  }

  @Post('me/consent/revoke')
  @Roles(
    'mechanic','diagnostic','lead_mechanic','service_advisor','inventory_manager',
    'cashier','manager','company_admin','company_owner','system_operator','support_engineer','auditor','platform_admin','superadmin'
  )
  @ApiOperation({ summary: '📝 Отзыв согласия на обработку ПДн' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        consentType: { type: 'string', enum: ['pdn_processing', 'marketing'], default: 'pdn_processing' }
      }
    }
  })
  @ApiResponse({ status: 200, description: '✅ Согласие отозвано', schema: { example: { success: true } } })
  @HttpCode(HttpStatus.OK)
  async revokeMyConsent(@Req() req: RequestWithUser, @Body('consentType') consentType?: string) {
    const type = (consentType as UserConsentType) || UserConsentType.PDN_PROCESSING;
    return this.usersBusinessService.revokeMyConsent(req.user.id, type);
  }
}
