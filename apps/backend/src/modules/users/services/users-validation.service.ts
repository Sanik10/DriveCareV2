// path: apps/backend/src/modules/users/services/users-validation.service.ts
import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Role } from '../../../database/entities/role.entity';
import { User } from '../../../database/entities/user.entity';
import { CreateUserDto } from '../dto/request/create-user.dto';
import { UpdateUserProfileDto } from '../dto/request/update-user-profile.dto';
import { AuthRole } from '../../auth/types/auth.types';
import { USERS_CONSTANTS } from '../constants/users.constants';

// 🔐 NEW: RoleHierarchyService для валидации иерархии
import { RoleHierarchyService } from './role-hierarchy.service';

/**
 * 🔐 USERS VALIDATION SERVICE
 * 
 * Критически важный сервис безопасности:
 * ✅ Role hierarchy validation (через RoleHierarchyService)
 * ✅ Multi-tenant isolation
 * ✅ XSS protection
 * ✅ Input sanitization
 * ✅ Business rules validation
 */
@Injectable()
export class UsersValidationService {
  private readonly logger = new Logger(UsersValidationService.name);

  constructor(
    @InjectRepository(Role)
    private rolesRepository: Repository<Role>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    // 🔐 NEW: RoleHierarchyService
    private roleHierarchyService: RoleHierarchyService,
  ) {}

  /**
   * 🔐 КРИТИЧЕСКОЕ ОБНОВЛЕНИЕ: Валидация назначения роли с использованием RoleHierarchyService
   * Предотвращает privilege escalation attacks
   */
  async validateRoleAssignment(
    assignerId: string, 
    targetRoleId: string, 
    companyId: string
  ): Promise<void> {
    this.logger.debug(`Validating role assignment: assignerId=${assignerId}, targetRoleId=${targetRoleId}, companyId=${companyId}`);

    // Используем RoleHierarchyService для полной валидации
    const validation = await this.roleHierarchyService.validateRoleAssignment({
      assignerId,
      targetRoleId,
      companyId,
    });

    if (!validation.canAssign) {
      this.logger.error(
        `SECURITY: Role assignment validation failed: ${validation.reason}, ` +
        `assignerId=${assignerId}, targetRoleId=${targetRoleId}`
      );

      // Формируем понятное сообщение об ошибке
      const errorMessage = this.formatRoleAssignmentError(validation.reason);
      throw new ForbiddenException(errorMessage);
    }

    this.logger.log(`✅ Role assignment validated successfully`);
  }

  /**
   * 🔐 Форматирование сообщения об ошибке назначения роли
   */
  private formatRoleAssignmentError(reason?: string): string {
    if (!reason) {
      return 'Невозможно назначить эту роль';
    }

    const errorMap: Record<string, string> = {
      'Assigner not found': 'Назначающий пользователь не найден',
      'Target role not found': 'Целевая роль не найдена',
      'System roles can only be assigned by superadmin': 
        'Системные роли может назначать только суперадминистратор. ' +
        'Для назначения этой роли обратитесь к администратору платформы.',
      'Role belongs to different company': 
        'Роль принадлежит другой компании. ' +
        'Вы можете назначать только роли своей компании.',
      'Cannot assign role equal or higher than own role': 
        'Нельзя назначить роль равную или выше вашей. ' +
        'Вы можете назначать только роли ниже по иерархии.',
      'Only company_owner or superadmin can assign company_admin role':
        'Роль "Администратор компании" может назначать только владелец компании или суперадминистратор.',
      'Platform roles can only be assigned by superadmin':
        'Платформенные роли может назначать только суперадминистратор.',
    };

    return errorMap[reason] || reason;
  }

  /**
   * 🔐 CRITICAL: Валидация принадлежности пользователя к компании
   * Предотвращает multi-tenant data breach
   */
  async validateUserOwnership(userId: string, companyId: string): Promise<void> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      select: ['id', 'company_id', 'email', 'firstName', 'lastName']
    });
    
    if (!user) {
      throw new NotFoundException(`Пользователь с ID ${userId} не найден`);
    }
    
    if (user.company_id !== companyId) {
      this.logger.error(
        `SECURITY: Multi-tenant violation: userId=${userId}, user.companyId=${user.company_id}, expected=${companyId}`
      );
      
      throw new ForbiddenException(
        `Пользователь ${user.firstName} ${user.lastName} (${user.email}) ` +
        `принадлежит другой компании. Multi-tenant нарушение заблокировано.`
      );
    }
  }

  /**
   * 🔐 Валидация доступа к пользователю (для просмотра)
   */
  async validateUserAccess(userId: string, userCompanyId: string, userRole: AuthRole): Promise<void> {
    // Superadmin имеет доступ ко всем пользователям
    if (userRole === 'superadmin') {
      return;
    }
    
    // Platform-level роли имеют ограниченный доступ
    const platformRoles: AuthRole[] = ['platform_admin', 'auditor', 'support_engineer'];
    if (platformRoles.includes(userRole)) {
      // Platform роли могут просматривать, но не изменять
      return;
    }
    
    // Company-level роли только к своей компании
    await this.validateUserOwnership(userId, userCompanyId);
  }

  /**
   * 🔐 CRITICAL: Валидация данных создания пользователя
   */
  async validateCreateData(userData: CreateUserDto & { company_id: string }): Promise<void> {
    // 1. Проверка уникальности email (case-insensitive)
    await this.validateEmailUniqueness(userData.email);
    
    // 2. Проверка существования и принадлежности роли
    await this.validateRoleExistsAndBelongsToCompany(userData.role_id, userData.company_id);
    
    // 3. Валидация контактной информации и XSS protection
    this.validateContactInfo(userData);
    
    // 4. Дополнительные бизнес-правила
    await this.validateBusinessRules(userData);
  }

  /**
   * 🔐 Проверка уникальности email (case-insensitive)
   */
  private async validateEmailUniqueness(email: string, excludeUserId?: string): Promise<void> {
    const existingUser = await this.usersRepository
      .createQueryBuilder('user')
      .where('LOWER(user.email) = LOWER(:email)', { email })
      .andWhere(excludeUserId ? 'user.id != :excludeUserId' : '1=1', { excludeUserId })
      .getOne();
    
    if (existingUser) {
      throw new ConflictException(
        `Пользователь с email "${email}" уже существует. ` +
        `Email должен быть уникальным в системе.`
      );
    }
  }

  /**
   * 🔐 Проверка существования роли и принадлежности к компании
   */
  private async validateRoleExistsAndBelongsToCompany(roleId: string, companyId: string): Promise<Role> {
    const role = await this.rolesRepository.findOne({ 
      where: { id: roleId },
      select: ['id', 'name', 'companyId', 'isSystem']
    });
    
    if (!role) {
      throw new NotFoundException(
        `Роль с ID ${roleId} не найдена. Убедитесь, что роль существует.`
      );
    }
    
    // Системные роли (platform-level) имеют companyId = null
    if (role.companyId !== companyId && role.companyId !== null) {
      this.logger.error(
        `SECURITY: Role company mismatch: roleId=${roleId}, role.companyId=${role.companyId}, expected=${companyId}`
      );
      
      throw new ForbiddenException(
        `Роль "${role.name}" не принадлежит вашей компании. ` +
        `Нельзя назначить роль из другой компании.`
      );
    }
    
    return role;
  }

  /**
   * 🔐 Валидация данных обновления профиля
   */
  async validateUpdateProfileData(userId: string, updateData: UpdateUserProfileDto): Promise<void> {
    // Проверка уникальности email (если изменяется)
    if (updateData.email) {
      await this.validateEmailUniqueness(updateData.email, userId);
    }
    
    // XSS protection и валидация контактов
    this.validateContactInfo(updateData);
    
    // Проверка, что пользователь существует
    await this.validateUserExists(userId);
  }

  /**
   * 🔐 Проверка существования пользователя
   */
  private async validateUserExists(userId: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      select: ['id', 'email', 'firstName', 'lastName', 'isActive']
    });
    
    if (!user) {
      throw new NotFoundException(`Пользователь с ID ${userId} не найден`);
    }
    
    return user;
  }

  /**
   * 🔐 Валидация изменения статуса
   */
  validateStatusChange(currentStatus: boolean, newStatus: boolean, userEmail: string): void {
    if (currentStatus === newStatus) {
      throw new BadRequestException(
        `Пользователь ${userEmail} уже имеет статус "${newStatus ? 'активен' : 'заблокирован'}". ` +
        `Изменение статуса не требуется.`
      );
    }
  }

  /**
   * 🔐 Валидация что пользователь не удаляет сам себя
   */
  validateNotSelfDeletion(targetUserId: string, currentUserId: string): void {
    if (targetUserId === currentUserId) {
      throw new ForbiddenException(
        'Запрещено удалять самого себя. Для удаления собственного аккаунта ' +
        'обратитесь к администратору или владельцу компании.'
      );
    }
  }

  /**
   * 🔐 CRITICAL: Валидация контактной информации и XSS protection
   */
  private validateContactInfo(data: Partial<CreateUserDto | UpdateUserProfileDto>): void {
    // XSS protection для текстовых полей
    if (data.firstName) {
      this.validateTextFieldForXSS(data.firstName, 'firstName');
      this.validateNameFormat(data.firstName, 'firstName');
    }
    
    if (data.lastName) {
      this.validateTextFieldForXSS(data.lastName, 'lastName');
      this.validateNameFormat(data.lastName, 'lastName');
    }
    
    if (data.specialization) {
      this.validateTextFieldForXSS(data.specialization, 'specialization');
      this.validateSpecializationFormat(data.specialization);
    }
    
    // Дополнительная валидация телефона
    if (data.phone) {
      this.validatePhoneFormat(data.phone);
    }
  }

  /**
   * 🔐 CRITICAL: XSS Protection для текстовых полей
   */
  private validateTextFieldForXSS(value: string, fieldName: string): void {
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe/i,
      /<object/i,
      /<embed/i,
      /<form/i,
      /<input/i,
      /<meta/i,
      /<link/i,
      /vbscript:/i,
      /data:text\/html/i,
    ];
    
    for (const pattern of xssPatterns) {
      if (pattern.test(value)) {
        throw new BadRequestException(
          `Поле "${fieldName}" содержит недопустимые символы или потенциально опасный код. ` +
          `XSS атака заблокирована.`
        );
      }
    }
    
    // Проверка на подозрительные символы
    if (value.includes('<') || value.includes('>') || value.includes('&lt;') || value.includes('&gt;')) {
      throw new BadRequestException(
        `Поле "${fieldName}" содержит HTML символы. Использование HTML тегов запрещено.`
      );
    }
  }

  /**
   * 🔐 Валидация формата имени/фамилии
   */
  private validateNameFormat(value: string, fieldName: string): void {
    // Только буквы, пробелы, дефисы и апострофы
    const namePattern = /^[a-zA-Zа-яА-ЯёЁ\s\-']+$/;
    
    if (!namePattern.test(value)) {
      throw new BadRequestException(
        `${fieldName === 'firstName' ? 'Имя' : 'Фамилия'} может содержать только буквы, ` +
        `пробелы, дефисы и апострофы. Цифры и специальные символы запрещены.`
      );
    }
    
    // Проверка длины
    if (value.trim().length < 1 || value.trim().length > USERS_CONSTANTS.VALIDATION.MAX_NAME_LENGTH) {
      throw new BadRequestException(
        `${fieldName === 'firstName' ? 'Имя' : 'Фамилия'} должно быть от 1 до ${USERS_CONSTANTS.VALIDATION.MAX_NAME_LENGTH} символов`
      );
    }
  }

  /**
   * 🔐 Валидация формата специализации
   */
  private validateSpecializationFormat(value: string): void {
    // Разрешены буквы, цифры, пробелы, точки, запятые, скобки, дефисы
    const specializationPattern = /^[a-zA-Zа-яА-ЯёЁ0-9\s\-'.,()]+$/;
    
    if (!specializationPattern.test(value)) {
      throw new BadRequestException(
        'Специализация может содержать только буквы, цифры, пробелы, точки, запятые, скобки и дефисы'
      );
    }
    
    if (value.trim().length > USERS_CONSTANTS.VALIDATION.MAX_SPECIALIZATION_LENGTH) {
      throw new BadRequestException(
        `Специализация не может превышать ${USERS_CONSTANTS.VALIDATION.MAX_SPECIALIZATION_LENGTH} символов`
      );
    }
  }

  /**
   * 🔐 Дополнительная валидация телефона
   */
  private validatePhoneFormat(phone: string): void {
    const digitsOnly = phone.replace(/\D/g, '');
    if (!digitsOnly.startsWith('7') || digitsOnly.length !== 11) {
      throw new BadRequestException('Некорректный формат российского номера телефона. Ожидается формат: +7XXXXXXXXXX');
    }
    const invalidPatterns = [
      /^70000000000$/,   // все нули
      /^71111111111$/,   // все единицы
      /^7(.)\1{10}$/,    // один и тот же символ 10 раз после 7
    ];
    for (const pattern of invalidPatterns) {
      if (pattern.test(digitsOnly)) {
        throw new BadRequestException('Указан некорректный номер телефона');
      }
    }
  }

  /**
   * 🔐 Дополнительные бизнес-правила
   */
  private async validateBusinessRules(userData: CreateUserDto & { company_id: string }): Promise<void> {
    // Проверка лимитов пользователей в компании (если есть подписка)
    const userCount = await this.usersRepository.count({
      where: { company_id: userData.company_id, isActive: true }
    });
    
    // Базовое ограничение - максимум 1000 пользователей на компанию
    const maxUsers = 1000;
    
    if (userCount >= maxUsers) {
      throw new BadRequestException(
        `Достигнуто максимальное количество пользователей в компании (${maxUsers}). ` +
        `Обратитесь к администратору для увеличения лимита.`
      );
    }
  }

  /**
   * 🔐 Валидация массовых операций (для будущего использования)
   */
  validateBulkOperation(userIds: string[], maxBulkSize: number = 50): void {
    if (userIds.length === 0) {
      throw new BadRequestException('Список пользователей не может быть пустым');
    }
    
    if (userIds.length > maxBulkSize) {
      throw new BadRequestException(
        `Массовая операция не может включать более ${maxBulkSize} пользователей`
      );
    }
    
    // Проверка на дубликаты
    const uniqueIds = new Set(userIds);
    if (uniqueIds.size !== userIds.length) {
      throw new BadRequestException('Список содержит дублирующиеся ID пользователей');
    }
  }
}
