// path: apps/backend/src/modules/users/services/role-hierarchy.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../../../database/entities/role.entity';
import { User } from '../../../database/entities/user.entity';
import { USERS_CONSTANTS, SystemRoleName, PlatformRoleName } from '../constants/users.constants';

/**
 * 🔐 ROLE HIERARCHY SERVICE
 * 
 * Единый источник истины для работы с иерархией ролей.
 * Все проверки прав назначения ролей проходят через этот сервис.
 * 
 * КРИТИЧЕСКИЕ ПРИНЦИПЫ:
 * 1. Системные роли может назначать ТОЛЬКО superadmin
 * 2. Нельзя назначить роль выше или равную своей
 * 3. Роль должна принадлежать той же компании (для компанейских ролей)
 * 4. Многоуровневая защита: isSystem + name + companyId
 */
@Injectable()
export class RoleHierarchyService {
  private readonly logger = new Logger(RoleHierarchyService.name);

  constructor(
    @InjectRepository(Role)
    private readonly rolesRepo: Repository<Role>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  /**
   * 🔐 КРИТИЧЕСКИЙ: Проверка, является ли роль системной
   * Многоуровневая защита
   */
  isSystemRole(role: Role): boolean {
    if (!role) return false;

    // 1. Проверка флага isSystem
    if (role.isSystem === true) {
      this.logger.debug(`Role is system by flag: ${role.name}`);
      return true;
    }

    // 2. Проверка по имени (защита от подделки флага)
    const systemRoleNames = USERS_CONSTANTS.ROLES.SYSTEM_ROLE_NAMES;
    const roleName = role.name.toLowerCase();
    
    // 🔧 FIX: Type-safe проверка через type assertion
    const isSystemByName = (systemRoleNames as readonly string[]).includes(roleName);
    
    if (isSystemByName) {
      this.logger.debug(`Role is system by name: ${role.name}`);
      return true;
    }

    // 3. Проверка companyId (системные роли имеют companyId = null)
    if (role.companyId === null) {
      this.logger.debug(`Role is system by companyId=null: ${role.name}`);
      return true;
    }

    return false;
  }

  /**
   * 🔐 КРИТИЧЕСКИЙ: Получить уровень иерархии роли
   */
  getRoleLevel(roleName: string): number {
    const hierarchy = USERS_CONSTANTS.ROLES.HIERARCHY;
    const normalizedName = roleName.toLowerCase();
    const level = hierarchy[normalizedName as keyof typeof hierarchy] || 0;
    
    this.logger.debug(`Role level: ${roleName} = ${level}`);
    return level;
  }

  /**
   * 🔐 КРИТИЧЕСКИЙ: Проверка, может ли assignerRole назначать targetRole
   * 
   * Правила:
   * - superadmin может назначать ВСЕ роли
   * - platform_admin может назначать только компанейские роли (НЕ системные)
   * - company_owner/company_admin могут назначать только роли СТРОГО ниже своей
   */
  canAssignRole(assignerRoleName: string, targetRoleName: string): boolean {
    const assignerLevel = this.getRoleLevel(assignerRoleName);
    const targetLevel = this.getRoleLevel(targetRoleName);

    this.logger.debug(
      `canAssignRole check: ${assignerRoleName}(${assignerLevel}) → ${targetRoleName}(${targetLevel})`
    );

    // Superadmin может назначать любые роли
    if (assignerRoleName.toLowerCase() === 'superadmin') {
      this.logger.debug('✅ Superadmin can assign any role');
      return true;
    }

    // Остальные роли: можно назначить только роли СТРОГО ниже своей
    const canAssign = assignerLevel > targetLevel;
    
    this.logger.debug(
      canAssign 
        ? `✅ Can assign: ${assignerLevel} > ${targetLevel}` 
        : `❌ Cannot assign: ${assignerLevel} <= ${targetLevel}`
    );

    return canAssign;
  }

  /**
   * 🔐 КРИТИЧЕСКИЙ: Валидация назначения роли (полная проверка)
   * 
   * @throws ForbiddenException если назначение невозможно
   */
  async validateRoleAssignment(params: {
    assignerId: string;
    targetRoleId: string;
    companyId: string;
  }): Promise<{ 
    assigner: User; 
    targetRole: Role; 
    canAssign: boolean;
    reason?: string;
  }> {
    const { assignerId, targetRoleId, companyId } = params;

    this.logger.log(
      `Validating role assignment: assignerId=${assignerId}, targetRoleId=${targetRoleId}, companyId=${companyId}`
    );

    // 1. Получить данные о назначающем
    const assigner = await this.usersRepo.findOne({
      where: { id: assignerId },
      relations: ['role'],
    });

    if (!assigner) {
      return {
        assigner: null as any,
        targetRole: null as any,
        canAssign: false,
        reason: 'Assigner not found',
      };
    }

    // 2. Получить целевую роль
    const targetRole = await this.rolesRepo.findOne({
      where: { id: targetRoleId },
    });

    if (!targetRole) {
      return {
        assigner,
        targetRole: null as any,
        canAssign: false,
        reason: 'Target role not found',
      };
    }

    this.logger.debug(
      `Assigner: ${assigner.role.name}, Target role: ${targetRole.name} (isSystem=${targetRole.isSystem}, companyId=${targetRole.companyId})`
    );

    // 3. Проверка системных ролей - ТОЛЬКО superadmin
    if (this.isSystemRole(targetRole)) {
      const isSuperadmin = assigner.role.name.toLowerCase() === 'superadmin';
      
      if (!isSuperadmin) {
        this.logger.warn(
          `SECURITY: Non-superadmin tried to assign system role: ${assigner.role.name} → ${targetRole.name}`
        );
        return {
          assigner,
          targetRole,
          canAssign: false,
          reason: 'System roles can only be assigned by superadmin',
        };
      }

      this.logger.log('✅ Superadmin assigning system role');
      return { assigner, targetRole, canAssign: true };
    }

    // 4. Проверка принадлежности роли к компании
    if (targetRole.companyId !== companyId && targetRole.companyId !== null) {
      this.logger.warn(
        `SECURITY: Role from different company: role.companyId=${targetRole.companyId}, expected=${companyId}`
      );
      return {
        assigner,
        targetRole,
        canAssign: false,
        reason: 'Role belongs to different company',
      };
    }

    // 5. Проверка иерархии
    const canAssignByHierarchy = this.canAssignRole(assigner.role.name, targetRole.name);
    
    if (!canAssignByHierarchy) {
      this.logger.warn(
        `SECURITY: Hierarchy violation: ${assigner.role.name} cannot assign ${targetRole.name}`
      );
      return {
        assigner,
        targetRole,
        canAssign: false,
        reason: 'Cannot assign role equal or higher than own role',
      };
    }

    // 6. Специальные ограничения
    const specialCheck = this.checkSpecialRestrictions(assigner.role.name, targetRole.name);
    if (!specialCheck.allowed) {
      this.logger.warn(
        `SECURITY: Special restriction: ${assigner.role.name} → ${targetRole.name}: ${specialCheck.reason}`
      );
      return {
        assigner,
        targetRole,
        canAssign: false,
        reason: specialCheck.reason,
      };
    }

    this.logger.log(`✅ Role assignment validated successfully`);
    return { assigner, targetRole, canAssign: true };
  }

  /**
   * 🔐 Специальные ограничения для некоторых ролей
   */
  private checkSpecialRestrictions(
    assignerRoleName: string,
    targetRoleName: string
  ): { allowed: boolean; reason?: string } {
    const assigner = assignerRoleName.toLowerCase();
    const target = targetRoleName.toLowerCase();

    // Только company_owner и superadmin могут назначать company_admin
    if (target === 'company_admin') {
      if (assigner !== 'company_owner' && assigner !== 'superadmin') {
        return {
          allowed: false,
          reason: 'Only company_owner or superadmin can assign company_admin role',
        };
      }
    }

    // Platform-level роли может назначать только superadmin
    const platformRoles = USERS_CONSTANTS.ROLES.PLATFORM_ROLE_NAMES;
    
    // 🔧 FIX: Type-safe проверка через type assertion
    const isPlatformRole = (platformRoles as readonly string[]).includes(target);
    
    if (isPlatformRole) {
      if (assigner !== 'superadmin') {
        return {
          allowed: false,
          reason: 'Platform roles can only be assigned by superadmin',
        };
      }
    }

    return { allowed: true };
  }

  /**
   * 🔐 Получить список ролей, которые может назначать данный пользователь
   */
  async getAssignableRoles(userId: string, companyId?: string): Promise<Role[]> {
    this.logger.debug(`Getting assignable roles for user=${userId}, company=${companyId}`);

    const user = await this.usersRepo.findOne({
      where: { id: userId },
      relations: ['role'],
    });

    if (!user) {
      this.logger.error(`User not found: ${userId}`);
      return [];
    }

    const userRoleName = user.role.name.toLowerCase();
    const userLevel = this.getRoleLevel(userRoleName);

    // Если superadmin и нет companyId - вернуть системные роли
    if (userRoleName === 'superadmin' && !companyId) {
      const systemRoles = await this.rolesRepo.find({
        where: { isSystem: true, companyId: null },
      });

      this.logger.debug(`Superadmin: returning ${systemRoles.length} system roles`);
      return systemRoles.filter(r => this.canAssignRole(userRoleName, r.name));
    }

    // Для остальных - роли компании
    const targetCompanyId = companyId || user.company_id;
    if (!targetCompanyId) {
      this.logger.warn(`No company context for user ${userId}`);
      return [];
    }

    const companyRoles = await this.rolesRepo.find({
      where: { companyId: targetCompanyId, isSystem: false },
    });

    // Фильтруем по иерархии
    const assignable = companyRoles.filter(role => {
      const targetLevel = this.getRoleLevel(role.name);
      return userLevel > targetLevel;
    });

    this.logger.debug(
      `User ${userRoleName}: can assign ${assignable.length}/${companyRoles.length} company roles`
    );

    return assignable;
  }
}
