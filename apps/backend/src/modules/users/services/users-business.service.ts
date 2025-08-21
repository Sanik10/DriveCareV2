import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { AuditService, AuditAction } from '../../../common/audit/audit.service';
import { UsersDataService } from './users-data.service';
import { UsersMapperService } from './users-mapper.service';
import { UsersValidationService } from './users-validation.service';

import { CreateUserDto } from '../dto/request/create-user.dto';
import { UpdateUserProfileDto } from '../dto/request/update-user-profile.dto';
import { UpdateUserRoleDto } from '../dto/request/update-user-role.dto';
import { UpdateUserStatusDto } from '../dto/request/update-user-status.dto';
import { UserResponseDto } from '../dto/response/user-response.dto';
import { PaginatedUsersResponseDto } from '../dto/response/paginated-users-response.dto';
import { UserFilter } from '../types/users.types';
import { User } from '../../../database/entities/user.entity';
import { UsersConsentsService } from './users-consents.service';
import { UserConsentType } from '../../../database/entities/user-consent.entity';

@Injectable()
export class UsersBusinessService {
  private readonly logger = new Logger(UsersBusinessService.name);

  constructor(
    private readonly usersData: UsersDataService,
    private readonly usersMapper: UsersMapperService,
    private readonly usersValidation: UsersValidationService,
    private readonly audit: AuditService,
    private readonly consents: UsersConsentsService,
  ) {}

  private async getActor(actorId: string): Promise<User> {
    return this.usersData.findByIdWithRole(actorId);
  }

  private ensureSameCompanyOrSuperadmin(actor: User, target: User) {
    if (actor.role?.name !== 'superadmin' && actor.company_id !== target.company_id) {
      throw new ForbiddenException('Пользователь принадлежит другой компании');
    }
  }

  async createUser(
    userData: CreateUserDto & { company_id: string },
    createdBy: string,
    context?: { ipAddress?: string; userAgent?: string }
  ): Promise<UserResponseDto> {
    const t0 = Date.now();
    try {
      const actor = await this.getActor(createdBy);
      await this.usersValidation.validateCreateData(userData);

      const created = await this.usersData.createUserWithTransaction(userData);
      this.ensureSameCompanyOrSuperadmin(actor, created);

      // 152‑ФЗ: фиксация согласия на обработку ПДн при создании админом
      await this.consents.recordRegistrationConsent(created.id, {
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
      });

      await this.audit.log(AuditAction.USER_CREATED, {
        userId: createdBy,
        entityId: created.id,
        entityType: 'User',
        companyId: created.company_id,
        details: { email: created.email, role: created.role.name },
        metadata: { createdBy, executionTime: Date.now() - t0 },
      });

      return this.usersMapper.mapToResponseDto(created);
    } catch (error) {
      await this.audit.log(AuditAction.USER_CREATION_FAILED, {
        userId: createdBy,
        entityType: 'User',
        companyId: userData.company_id,
        details: { email: userData.email, error: error.message, errorType: error.constructor?.name },
        metadata: { createdBy, executionTime: Date.now() - t0 },
      });
      throw error;
    }
  }

  async getUsers(filter: UserFilter): Promise<PaginatedUsersResponseDto> {
    const { users, total } = await this.usersData.findUsersWithFilter(filter);
    const dtos = this.usersMapper.mapArrayToResponseDto(users);
    const totalPages = Math.ceil(total / filter.limit);
    return {
      users: dtos,
      page: filter.page,
      limit: filter.limit,
      total,
      totalPages,
      hasNext: filter.page < totalPages,
      hasPrev: filter.page > 1,
      appliedFilters: { search: filter.search, isActive: filter.isActive, role: filter.role as any },
    };
  }

  async getUserById(userId: string): Promise<UserResponseDto> {
    const u = await this.usersData.findByIdWithRole(userId);
    return this.usersMapper.mapToResponseDto(u);
  }

  async updateUserProfile(userId: string, updateData: UpdateUserProfileDto, updatedBy: string): Promise<UserResponseDto> {
    const t0 = Date.now();
    try {
      const actor = await this.getActor(updatedBy);
      await this.usersValidation.validateUpdateProfileData(userId, updateData);
      const before = await this.usersData.findByIdWithRole(userId);
      this.ensureSameCompanyOrSuperadmin(actor, before);

      const after = await this.usersData.updateUserWithTransaction(userId, updateData);
      this.ensureSameCompanyOrSuperadmin(actor, after);

      const changes = this.usersMapper.mapChangesForAudit(before, after);
      await this.audit.log(AuditAction.USER_PROFILE_UPDATED, {
        userId: updatedBy,
        entityId: userId,
        entityType: 'User',
        companyId: after.company_id,
        changes: { before: changes.before, after: changes.after },
        details: { updatedFields: changes.changedFields },
        metadata: { updatedBy, executionTime: Date.now() - t0 },
      });

      return this.usersMapper.mapToResponseDto(after);
    } catch (error) {
      await this.audit.log(AuditAction.USER_PROFILE_UPDATE_FAILED, {
        userId: updatedBy,
        entityId: userId,
        entityType: 'User',
        details: { error: error.message, attemptedFields: Object.keys(updateData) },
        metadata: { updatedBy, executionTime: Date.now() - t0 },
      });
      throw error;
    }
  }

  async updateUserRole(userId: string, updateData: UpdateUserRoleDto, updatedBy: string): Promise<UserResponseDto> {
    const t0 = Date.now();
    try {
      const actor = await this.getActor(updatedBy);
      const before = await this.usersData.findByIdWithRole(userId);
      this.ensureSameCompanyOrSuperadmin(actor, before);

      await this.usersValidation.validateRoleAssignment(updatedBy, updateData.role_id, before.company_id);

      const after = await this.usersData.updateUserRoleWithTransaction(userId, updateData.role_id);

      await this.audit.log(AuditAction.USER_ROLE_CHANGED, {
        userId: updatedBy,
        entityId: userId,
        entityType: 'User',
        companyId: after.company_id,
        changes: {
          before: { roleId: before.role.id, roleName: before.role.name },
          after: { roleId: after.role.id, roleName: after.role.name },
        },
        details: { previousRole: before.role.name, newRole: after.role.name, securityLevel: 'CRITICAL' },
        metadata: { updatedBy, executionTime: Date.now() - t0 },
      });

      return this.usersMapper.mapToResponseDto(after);
    } catch (error) {
      await this.audit.log(AuditAction.USER_ROLE_CHANGE_FAILED, {
        userId: updatedBy,
        entityId: userId,
        entityType: 'User',
        details: { error: error.message, attemptedRoleId: updateData.role_id, securityLevel: 'CRITICAL' },
        metadata: { updatedBy, executionTime: Date.now() - t0 },
      });
      throw error;
    }
  }

  async updateUserStatus(userId: string, updateData: UpdateUserStatusDto, updatedBy: string): Promise<UserResponseDto> {
    const t0 = Date.now();
    try {
      const actor = await this.getActor(updatedBy);
      const before = await this.usersData.findByIdWithRole(userId);
      this.ensureSameCompanyOrSuperadmin(actor, before);

      this.usersValidation.validateStatusChange(before.isActive, updateData.isActive, before.email);

      const after = await this.usersData.updateUserStatus(userId, updateData.isActive);

      await this.audit.log(AuditAction.USER_STATUS_CHANGED, {
        userId: updatedBy,
        entityId: userId,
        entityType: 'User',
        companyId: after.company_id,
        changes: { before: { isActive: before.isActive }, after: { isActive: after.isActive } },
        details: { action: updateData.isActive ? 'activated' : 'deactivated', email: after.email },
        metadata: { updatedBy, executionTime: Date.now() - t0 },
      });

      return this.usersMapper.mapToResponseDto(after);
    } catch (error) {
      await this.audit.log(AuditAction.USER_STATUS_CHANGE_FAILED, {
        userId: updatedBy,
        entityId: userId,
        entityType: 'User',
        details: { error: error.message, attemptedStatus: updateData.isActive },
        metadata: { updatedBy, executionTime: Date.now() - t0 },
      });
      throw error;
    }
  }

  async resetUserPassword(userId: string, newPassword: string, resetBy: string) {
    const t0 = Date.now();
    try {
      const actor = await this.getActor(resetBy);
      const target = await this.usersData.findByIdWithRole(userId);
      this.ensureSameCompanyOrSuperadmin(actor, target);

      if (target.role?.name === 'superadmin' && actor.role?.name !== 'superadmin') {
        throw new ForbiddenException('Нельзя сбросить пароль суперадмину');
      }

      const hashed = await this.usersData.hashPassword(newPassword);
      await this.usersData.updateUserPassword(userId, hashed);

      await this.audit.log(AuditAction.USER_PASSWORD_RESET_BY_ADMIN, {
        userId: resetBy,
        entityId: userId,
        entityType: 'User',
        companyId: target.company_id,
        details: { targetUserEmail: target.email, resetByAdmin: true, securityLevel: 'CRITICAL' },
        metadata: { resetBy, executionTime: Date.now() - t0 },
      });

      return { success: true, message: `Пароль пользователя ${target.firstName} ${target.lastName} успешно сброшен` };
    } catch (error) {
      await this.audit.log(AuditAction.USER_PASSWORD_RESET_FAILED, {
        userId: resetBy,
        entityId: userId,
        entityType: 'User',
        details: { error: error.message, securityLevel: 'CRITICAL' },
        metadata: { resetBy, executionTime: Date.now() - t0 },
      });
      throw error;
    }
  }

  async deleteUser(userId: string, deletedBy: string): Promise<void> {
    const t0 = Date.now();
    try {
      const actor = await this.getActor(deletedBy);
      const target = await this.usersData.findByIdWithRole(userId);
      this.ensureSameCompanyOrSuperadmin(actor, target);

      await this.usersData.softDeleteUser(userId, deletedBy);

      await this.audit.log(AuditAction.USER_SOFT_DELETED, {
        userId: deletedBy,
        entityId: userId,
        entityType: 'User',
        companyId: target.company_id,
        details: { deletedUserEmail: target.email, deletionType: 'soft_delete' },
        metadata: { deletedBy, executionTime: Date.now() - t0 },
      });
    } catch (error) {
      await this.audit.log(AuditAction.USER_DELETION_FAILED, {
        userId: deletedBy,
        entityId: userId,
        entityType: 'User',
        details: { error: error.message, deletionType: 'soft_delete' },
        metadata: { deletedBy, executionTime: Date.now() - t0 },
      });
      throw error;
    }
  }

  // 152‑ФЗ: право субъекта ПДн — деактивация своего аккаунта
  async deactivateSelf(userId: string): Promise<void> {
    const before = await this.usersData.findByIdWithRole(userId);
    if (!before.isActive) return;
    const after = await this.usersData.updateUserStatus(userId, false);
    await this.audit.log(AuditAction.USER_SELF_DEACTIVATED, {
      userId,
      entityId: userId,
      entityType: 'User',
      companyId: after.company_id,
      details: { action: 'self_deactivate' },
    });
  }

  // 152‑ФЗ: право на доступ к данным — экспорт своих данных
  async exportMyData(userId: string) {
    const user = await this.usersData.findByIdWithRole(userId);
    const dto = this.usersMapper.mapToExtendedInfo(user);
    const consents = await this.consents.listForUser(userId);

    await this.audit.log(AuditAction.USER_DATA_EXPORTED, {
      userId,
      entityId: userId,
      entityType: 'User',
      companyId: user.company_id,
      details: { exportedSections: ['profile', 'consents'] },
    });

    return {
      profile: dto,
      consents,
      exportedAt: new Date().toISOString(),
    };
  }

  // 152‑ФЗ: отзыв согласия ПДн
  async revokeMyConsent(userId: string, type: UserConsentType = UserConsentType.PDN_PROCESSING) {
    await this.consents.revokeConsent(userId, type);
    await this.audit.log(AuditAction.USER_CONSENT_REVOKED, {
      userId,
      entityId: userId,
      entityType: 'User',
      details: { consentType: type },
    });
    return { success: true };
  }
}
