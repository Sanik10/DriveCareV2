// path: apps/backend/src/modules/users/guards/system-role-protection.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../../../database/entities/role.entity';
import { RoleHierarchyService } from '../services/role-hierarchy.service';
import { USERS_CONSTANTS } from '../constants/users.constants';

/**
 * 🔐 SYSTEM ROLE PROTECTION GUARD
 * 
 * Критический Guard для защиты от попыток назначения системных ролей.
 * 
 * ЛОГИКА:
 * 1. Проверяет roleId в body запроса
 * 2. Если роль системная - разрешает только superadmin
 * 3. Если roleId отсутствует или роль не найдена - пропускает (пусть валидация сработает позже)
 * 
 * ПРИМЕНЕНИЕ:
 * - POST /users/invitations
 * - PATCH /users/:id/role
 * - POST /users (если создание с roleId)
 */
@Injectable()
export class SystemRoleProtectionGuard implements CanActivate {
  private readonly logger = new Logger(SystemRoleProtectionGuard.name);

  constructor(
    @InjectRepository(Role)
    private readonly rolesRepo: Repository<Role>,
    private readonly roleHierarchy: RoleHierarchyService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // из JwtAuthGuard
    const body = request.body;

    // Извлекаем roleId из разных мест (зависит от endpoint)
    const roleId = body?.roleId || body?.role_id;

    if (!roleId) {
      // Нет roleId - пропускаем (может быть не требуется для этого endpoint)
      this.logger.debug('No roleId in request body, skipping guard');
      return true;
    }

    if (!user) {
      this.logger.error('No user in request (JwtAuthGuard должен быть раньше!)');
      throw new ForbiddenException('Authentication required');
    }

    this.logger.debug(`Checking role protection: roleId=${roleId}, user=${user.id}, userRole=${user.role}`);

    // Получаем целевую роль из БД
    const targetRole = await this.rolesRepo.findOne({ where: { id: roleId } });

    if (!targetRole) {
      // Роль не найдена - пропускаем, пусть валидация сервиса выдаст ошибку
      this.logger.warn(`Role not found: ${roleId}, will fail in service validation`);
      return true;
    }

    // Проверяем, является ли роль системной
    const isSystemRole = this.roleHierarchy.isSystemRole(targetRole);

    if (!isSystemRole) {
      // Не системная роль - пропускаем
      this.logger.debug(`Role is not system: ${targetRole.name}, allowing`);
      return true;
    }

    // Системная роль - проверяем, является ли пользователь superadmin
    const isSuperadmin = user.role?.toLowerCase() === 'superadmin';

    if (!isSuperadmin) {
      this.logger.error(
        `SECURITY VIOLATION: User ${user.id} (${user.role}) tried to assign system role: ${targetRole.name}`
      );
      
      throw new ForbiddenException(
        `Системные роли может назначать только суперадминистратор. ` +
        `Роль "${targetRole.name}" является системной и недоступна для назначения.`
      );
    }

    this.logger.log(`✅ Superadmin assigning system role: ${targetRole.name}`);
    return true;
  }
}
