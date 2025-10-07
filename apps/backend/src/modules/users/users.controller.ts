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
import { CreateUserDto } from './dto/request/create-user.dto';
import { UpdateUserProfileDto } from './dto/request/update-user-profile.dto';
import { UpdateUserRoleDto } from './dto/request/update-user-role.dto';
import { UpdateUserStatusDto } from './dto/request/update-user-status.dto';
import { ChangePasswordDto } from './dto/request/change-password.dto';
import { UserResponseDto } from './dto/response/user-response.dto';

import { Roles } from '../auth/decorators/roles.decorator';
import { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { USERS_CONSTANTS } from './constants/users.constants';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuditLoggingInterceptor } from '../../common/interceptors/audit-logging.interceptor';
import { EnhancedValidationPipe } from '../../common/pipes/enhanced-validation.pipe';

// 🔐 NEW: System Role Protection Guard
import { SystemRoleProtectionGuard } from './guards/system-role-protection.guard';

// Инвайты и роли
import { UsersInvitationsService } from './services/users-invitations.service';
import { RoleHierarchyService } from './services/role-hierarchy.service';
import { CreateInviteDto } from './dto/request/create-invite.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../../database/entities/role.entity';

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
    private readonly usersInvitationsService: UsersInvitationsService,
    private readonly roleHierarchyService: RoleHierarchyService,
    @InjectRepository(Role) private readonly rolesRepo: Repository<Role>,
  ) {}

  @Post()
  @Roles('company_admin', 'company_owner', 'superadmin')
  @ApiOperation({
    summary: 'Создание нового пользователя',
    description:
      '🔐 SECURITY: Компания определяется автоматически из JWT токена. Нельзя создать пользователя в чужой компании.',
  })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ status: HttpStatus.CREATED, description: '✅ Пользователь успешно создан', type: UserResponseDto })
  @ApiConflictResponse({ description: '❌ Пользователь с таким email уже существует' })
  @ApiBadRequestResponse({ description: '❌ Некорректные данные или роль не принадлежит компании' })
  @ApiUnauthorizedResponse({ description: '❌ Требуется авторизация' })
  @ApiForbiddenResponse({ description: '❌ Недостаточно прав доступа или попытка назначить роль выше своей' })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 10 в минуту)' })
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.CREATED)
  async createUser(@Body() createUserDto: CreateUserDto, @Req() req: RequestWithUser): Promise<UserResponseDto> {
    const userData = { ...createUserDto, company_id: req.user.companyId };
    const context = { ipAddress: req.ip || '', userAgent: (req.headers['user-agent'] as string) || '' };
    return this.usersBusinessService.createUser(userData, req.user.id, context);
  }

  @Get()
  @Roles('company_admin', 'company_owner', 'manager', 'superadmin')
  @ApiOperation({
    summary: 'Получение списка пользователей компании',
    description: '🔐 SECURITY: Superadmin видит всех пользователей, остальные роли - только своей компании.',
  })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiQuery({ name: 'role', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: HttpStatus.OK, description: '✅ Список пользователей успешно получен' })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 30 в минуту)' })
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  async getUsers(
    @Req() req: RequestWithUser,
    @Query('search') search?: string,
    // ВАЖНО: убрали ParseBoolPipe, чтобы отсутствие параметра не вызывало 400
    @Query('isActive') isActive?: string,
    @Query('role') role?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number = 1,
    @Query('limit', new DefaultValuePipe(USERS_CONSTANTS.PAGINATION.DEFAULT_LIMIT), ParseIntPipe)
    limit: number = USERS_CONSTANTS.PAGINATION.DEFAULT_LIMIT,
  ) {
    // Мягкое преобразование: 'true'/'1'/'yes' => true, 'false'/'0'/'no' => false, отсутствие => undefined
    const norm = typeof isActive === 'string' ? isActive.trim().toLowerCase() : undefined;
    const isActiveBool =
      norm == null
        ? undefined
        : norm === 'true' || norm === '1' || norm === 'yes'
        ? true
        : norm === 'false' || norm === '0' || norm === 'no'
        ? false
        : undefined;

    const filter = {
      search,
      isActive: isActiveBool,
      role,
      page,
      limit: Math.min(limit, USERS_CONSTANTS.PAGINATION.MAX_LIMIT),
    };
    return this.usersService.getUsersSecure(filter, req.user);
  }

  /**
   * 🔐 ОБНОВЛЕНО: Доступные роли с использованием RoleHierarchyService
   */
  @Get('roles')
  @Roles('company_owner', 'company_admin', 'platform_admin', 'superadmin')
  @ApiOperation({
    summary: '🎚 Доступные роли для назначения',
    description: 'Возвращает только те роли, которые текущий пользователь может назначать согласно иерархии',
  })
  @ApiQuery({
    name: 'companyId',
    required: false,
    description: 'Для суперадмина/платформенного админа — ID компании, для которой нужно получить роли.',
  })
  @ApiResponse({ status: 200, description: '✅ Список доступных ролей' })
  async listAssignableRoles(@Req() req: RequestWithUser, @Query('companyId') companyId?: string) {
    // Используем RoleHierarchyService вместо ручной логики
    const roles = await this.roleHierarchyService.getAssignableRoles(req.user.id, companyId);

    return roles.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      isSystem: r.isSystem,
    }));
  }

  /**
   * 🔐 КРИТИЧЕСКОЕ ОБНОВЛЕНИЕ: Создание приглашения с SystemRoleProtectionGuard
   */
  @Post('invitations')
  @Roles('company_owner', 'company_admin', 'superadmin')
  @UseGuards(SystemRoleProtectionGuard) // 🔐 Новый guard!
  @ApiOperation({
    summary: '📨 Создать приглашение сотруднику',
    description:
      '🔐 SECURITY: Строгий контроль иерархии ролей. Нельзя пригласить роль выше своей. Системные роли только для superadmin.',
  })
  @ApiResponse({ status: 201, description: '✅ Инвайт создан' })
  @ApiForbiddenResponse({ description: '❌ Попытка пригласить роль выше своей или системную роль' })
  @HttpCode(HttpStatus.CREATED)
  async createInvite(@Req() req: RequestWithUser, @Body() dto: CreateInviteDto) {
    const { saved, inviteUrl } = await this.usersInvitationsService.createInvite({
      companyId: req.user.companyId,
      invitedByUserId: req.user.id,
      email: dto.email,
      roleId: dto.roleId,
      expiresInDays: dto.expiresInDays ?? 7,
    });
    return {
      id: saved.id,
      email: saved.email,
      roleId: saved.roleId,
      status: saved.status,
      expiresAt: saved.expiresAt,
      createdAt: saved.createdAt,
      inviteUrl,
    };
  }

  @Get('invitations')
  @Roles('company_owner', 'company_admin')
  @ApiOperation({ summary: '📬 Список приглашений компании' })
  @ApiResponse({ status: 200, description: '✅ Ок' })
  async listInvites(
    @Req() req: RequestWithUser,
    @Query('status') status?: 'pending' | 'accepted' | 'revoked' | 'expired',
  ) {
    const list = await this.usersInvitationsService.listInvites(req.user.companyId, status);
    return list.map((i) => ({
      id: i.id,
      email: i.email,
      roleId: i.roleId,
      status: i.status,
      expiresAt: i.expiresAt,
      createdAt: i.createdAt,
    }));
  }

  @Get(':id([0-9a-fA-F-]{36})')
  @Roles('company_admin', 'company_owner', 'manager', 'superadmin')
  @ApiOperation({
    summary: 'Получение пользователя по ID',
    description: '🔐 SECURITY: Проверяется принадлежность пользователя к компании.',
  })
  @ApiParam({ name: 'id', description: 'UUID пользователя' })
  @ApiResponse({ status: HttpStatus.OK, description: '✅ Пользователь найден', type: UserResponseDto })
  @ApiNotFoundResponse({ description: '❌ Пользователь не найден' })
  @ApiForbiddenResponse({ description: '❌ Пользователь принадлежит другой компании' })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 50 в минуту)' })
  @Throttle({ default: { limit: 50, ttl: 60_000 } })
  async getUserById(@Param('id') userId: string, @Req() req: RequestWithUser): Promise<UserResponseDto> {
    return this.usersService.getUserByIdSecure(userId, req.user);
  }

  @Post('invitations/:id/resend')
  @Roles('company_owner', 'company_admin')
  @ApiOperation({ summary: '🔁 Повторно отправить приглашение' })
  @ApiResponse({ status: 200, description: '✅ Отправлено' })
  @ApiParam({ name: 'id', description: 'UUID приглашения' })
  async resendInvite(@Req() req: RequestWithUser, @Param('id') id: string) {
    const result = await this.usersInvitationsService.resendInvite(req.user.companyId, id);
    return { success: true, inviteUrl: result.inviteUrl };
  }

  @Delete('invitations/:id')
  @Roles('company_owner', 'company_admin')
  @ApiOperation({ summary: '🗑️ Отозвать приглашение' })
  @ApiResponse({ status: 200, description: '✅ Отозвано' })
  @ApiParam({ name: 'id', description: 'UUID приглашения' })
  async revokeInvite(@Req() req: RequestWithUser, @Param('id') id: string) {
    await this.usersInvitationsService.revokeInvite(req.user.companyId, id);
    return { success: true };
  }

  @Patch(':id/profile')
  @Roles('company_admin', 'company_owner', 'superadmin')
  @ApiOperation({
    summary: '✏️ Обновление профиля пользователя',
    description:
      '🔐 SECURITY: Можно обновлять только пользователей своей компании. Проверяется уникальность email при изменении.',
  })
  @ApiParam({ name: 'id', description: 'UUID пользователя для обновления' })
  @ApiBody({ type: UpdateUserProfileDto })
  @ApiResponse({ status: HttpStatus.OK, description: '✅ Профиль пользователя успешно обновлен', type: UserResponseDto })
  @ApiNotFoundResponse({ description: '❌ Пользователь не найден' })
  @ApiConflictResponse({ description: '❌ Email уже используется другим пользователем' })
  @ApiBadRequestResponse({ description: '❌ Некорректные данные профиля' })
  @ApiForbiddenResponse({ description: '❌ Пользователь принадлежит другой компании' })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 20 в минуту)' })
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  async updateUserProfile(
    @Param('id') userId: string,
    @Body() updateProfileDto: UpdateUserProfileDto,
    @Req() req: RequestWithUser,
  ): Promise<UserResponseDto> {
    return this.usersBusinessService.updateUserProfile(userId, updateProfileDto, req.user.id);
  }

  /**
   * 🔐 КРИТИЧЕСКОЕ ОБНОВЛЕНИЕ: Изменение роли с SystemRoleProtectionGuard
   */
  @Patch(':id/role')
  @Roles('company_owner', 'superadmin')
  @UseGuards(SystemRoleProtectionGuard) // 🔐 Защита от назначения системных ролей
  @ApiOperation({
    summary: '🔄 Изменение роли пользователя',
    description:
      '🔐 SECURITY: Критическая операция! Можно назначать только роли строго ниже своей. Системные роли только для superadmin.',
  })
  @ApiParam({ name: 'id', description: 'UUID пользователя для изменения роли' })
  @ApiBody({ type: UpdateUserRoleDto })
  @ApiResponse({ status: HttpStatus.OK, description: '✅ Роль пользователя успешно изменена', type: UserResponseDto })
  @ApiNotFoundResponse({ description: '❌ Пользователь или роль не найдены' })
  @ApiBadRequestResponse({ description: '❌ Некорректный UUID роли' })
  @ApiForbiddenResponse({ description: '❌ Нарушение иерархии или попытка назначить системную роль' })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 5 в минуту)' })
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
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
    description:
      '🔐 SECURITY: Активация/деактивация пользователя. Можно применять только к пользователям своей компании.',
  })
  @ApiParam({ name: 'id', description: 'UUID пользователя для изменения статуса' })
  @ApiBody({ type: UpdateUserStatusDto })
  @ApiResponse({ status: HttpStatus.OK, description: '✅ Статус пользователя успешно изменен', type: UserResponseDto })
  @ApiNotFoundResponse({ description: '❌ Пользователь не найден' })
  @ApiBadRequestResponse({ description: '❌ Некорректное значение статуса/правила' })
  @ApiForbiddenResponse({ description: '❌ Пользователь принадлежит другой компании' })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 15 в минуту)' })
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
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
    description: '🔐 SECURITY: Только владельцы компании и суперадмины.',
  })
  @ApiParam({ name: 'id', description: 'UUID пользователя для сброса пароля' })
  @ApiBody({ type: ChangePasswordDto })
  @ApiResponse({ status: HttpStatus.OK, description: '✅ Пароль успешно сброшен' })
  @ApiNotFoundResponse({ description: '❌ Пользователь не найден' })
  @ApiBadRequestResponse({ description: '❌ Пароль не соответствует требованиям безопасности' })
  @ApiForbiddenResponse({ description: '❌ Недостаточно прав или пользователь из другой компании' })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 3 в минуту)' })
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  async resetUserPassword(
    @Param('id') userId: string,
    @Body() changePasswordDto: ChangePasswordDto,
    @Req() req: RequestWithUser,
  ): Promise<{ success: boolean; message: string }> {
    return this.usersBusinessService.resetUserPassword(userId, changePasswordDto.newPassword, req.user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('company_owner', 'superadmin')
  @ApiOperation({
    summary: '🚨 Удаление пользователя (деактивация)',
    description: '🔐 SECURITY: Мягкое удаление (деактивация). Нельзя удалить самого себя.',
  })
  @ApiParam({ name: 'id', description: 'UUID пользователя для удаления' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: '✅ Пользователь деактивирован' })
  @ApiNotFoundResponse({ description: '❌ Пользователь не найден' })
  @ApiForbiddenResponse({ description: '❌ Нельзя удалить самого себя или пользователя из другой компании' })
  @ApiTooManyRequestsResponse({ description: '⚠️ Слишком много запросов (лимит: 5 в минуту)' })
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async deleteUser(@Param('id') userId: string, @Req() req: RequestWithUser): Promise<void> {
    return this.usersService.deleteUserSecure(userId, req.user);
  }
}
