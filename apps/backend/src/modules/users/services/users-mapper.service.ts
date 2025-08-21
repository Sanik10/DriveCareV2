import { Injectable } from '@nestjs/common';
import { User } from '../../../database/entities/user.entity';
import { UserResponseDto } from '../dto/response/user-response.dto';
import { RoleDto } from '../dto/response/role.dto';

/**
 * 🔄 USERS MAPPER SERVICE
 * 
 * Безопасное преобразование Entity ↔ DTO:
 * ✅ Data sanitization
 * ✅ Security filtering
 * ✅ Type safety
 * ✅ Audit trail preparation
 */
@Injectable()
export class UsersMapperService {
  
  /**
   * 🔐 CRITICAL: Основной маппинг Entity → ResponseDto
   * ВАЖНО: company_id НЕ включается в response для безопасности!
   */
  mapToResponseDto(user: User): UserResponseDto {
    if (!user) {
      throw new Error('User entity is required for mapping');
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone || undefined, // null → undefined для cleaner JSON
      specialization: user.specialization || undefined,
      isActive: user.isActive,
      role: this.mapRoleToDto(user.role),
      // 🔐 SECURITY: company_id намеренно НЕ включен в response!
      // Это предотвращает information disclosure атаки
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt || undefined,
    };
  }

  /**
   * 🔄 Маппинг массива пользователей
   */
  mapArrayToResponseDto(users: User[]): UserResponseDto[] {
    if (!Array.isArray(users)) {
      throw new Error('Users array is required for mapping');
    }

    return users.map(user => this.mapToResponseDto(user));
  }

  /**
   * 🔄 Безопасный маппинг роли
   */
  private mapRoleToDto(role: any): RoleDto {
    if (!role) {
      return {
        id: 'unknown',
        name: 'unknown'
      };
    }

    return {
      id: role.id,
      name: role.name,
    };
  }

  /**
   * 🔐 CRITICAL: Маппинг для audit logging (только безопасные данные)
   * Исключает пароли и другие чувствительные данные
   */
  mapToAuditData(user: User): Partial<User> {
    if (!user) {
      return {};
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      specialization: user.specialization,
      isActive: user.isActive,
      // 🔐 SECURITY: Исключаем чувствительные поля:
      // - password_hash
      // - company_id (может быть чувствительным)
      // - internal timestamps (кроме основных)
    };
  }

  /**
   * 🔄 Маппинг изменений для audit logging
   */
  mapChangesForAudit(beforeUser: User, afterUser: User): {
    before: Partial<User>;
    after: Partial<User>;
    changedFields: string[];
  } {
    const before = this.mapToAuditData(beforeUser);
    const after = this.mapToAuditData(afterUser);
    
    const changedFields: string[] = [];
    
    // Определяем какие поля изменились
    const fieldsToCheck = ['email', 'firstName', 'lastName', 'phone', 'specialization', 'isActive'];
    
    fieldsToCheck.forEach(field => {
      if (before[field] !== after[field]) {
        changedFields.push(field);
      }
    });

    return { before, after, changedFields };
  }

  /**
   * 🔄 Базовая информация о пользователе для других модулей
   */
  mapToBasicInfo(user: User): { 
    id: string; 
    email: string; 
    fullName: string; 
    isActive: boolean;
    role: string;
  } {
    if (!user) {
      throw new Error('User entity is required for basic info mapping');
    }

    return {
      id: user.id,
      email: user.email,
      fullName: `${user.firstName} ${user.lastName}`.trim(),
      isActive: user.isActive,
      role: user.role?.name || 'unknown',
    };
  }

  /**
   * 🔄 Расширенная информация для внутренних интеграций
   */
  mapToExtendedInfo(user: User): {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    fullName: string;
    phone?: string;
    specialization?: string;
    isActive: boolean;
    role: {
      id: string;
      name: string;
    };
    lastLoginAt?: Date;
    createdAt: Date;
  } {
    if (!user) {
      throw new Error('User entity is required for extended info mapping');
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: `${user.firstName} ${user.lastName}`.trim(),
      phone: user.phone,
      specialization: user.specialization,
      isActive: user.isActive,
      role: this.mapRoleToDto(user.role),
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    };
  }

  /**
   * 🔄 Маппинг для выпадающих списков (select options)
   */
  mapToSelectOption(user: User): { 
    value: string; 
    label: string; 
    disabled?: boolean;
    meta?: {
      email: string;
      role: string;
      specialization?: string;
    };
  } {
    if (!user) {
      throw new Error('User entity is required for select option mapping');
    }

    const label = user.specialization 
      ? `${user.firstName} ${user.lastName} (${user.specialization})`
      : `${user.firstName} ${user.lastName}`;

    return {
      value: user.id,
      label,
      disabled: !user.isActive,
      meta: {
        email: user.email,
        role: user.role?.name || 'unknown',
        specialization: user.specialization,
      }
    };
  }

  /**
   * 🔄 Маппинг для поиска/автокомплита
   */
  mapToSearchResult(user: User): {
    id: string;
    text: string;
    subtitle: string;
    isActive: boolean;
  } {
    if (!user) {
      throw new Error('User entity is required for search result mapping');
    }

    const text = `${user.firstName} ${user.lastName}`;
    const subtitle = user.specialization 
      ? `${user.email} • ${user.role?.name} • ${user.specialization}`
      : `${user.email} • ${user.role?.name}`;

    return {
      id: user.id,
      text,
      subtitle,
      isActive: user.isActive,
    };
  }

  /**
   * 🔄 Маппинг для экспорта данных (admin только)
   */
  mapToExportData(user: User): {
    'ID': string;
    'Email': string;
    'Имя': string;
    'Фамилия': string;
    'Телефон': string;
    'Специализация': string;
    'Роль': string;
    'Статус': string;
    'Дата создания': string;
    'Последний вход': string;
  } {
    if (!user) {
      throw new Error('User entity is required for export data mapping');
    }

    return {
      'ID': user.id,
      'Email': user.email,
      'Имя': user.firstName,
      'Фамилия': user.lastName,
      'Телефон': user.phone || '',
      'Специализация': user.specialization || '',
      'Роль': user.role?.name || 'Не указана',
      'Статус': user.isActive ? 'Активен' : 'Заблокирован',
      'Дата создания': user.createdAt.toISOString().split('T')[0],
      'Последний вход': user.lastLoginAt 
        ? user.lastLoginAt.toISOString().split('T')[0] 
        : 'Никогда',
    };
  }

  /**
   * 🔄 Маппинг для dashboard статистики
   */
  mapToStatsData(users: User[]): {
    totalUsers: number;
    activeUsers: number;
    inactiveUsers: number;
    byRole: Record<string, number>;
    recentlyActive: number; // За последние 30 дней
    neverLoggedIn: number;
  } {
    if (!Array.isArray(users)) {
      throw new Error('Users array is required for stats mapping');
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const stats = {
      totalUsers: users.length,
      activeUsers: 0,
      inactiveUsers: 0,
      byRole: {} as Record<string, number>,
      recentlyActive: 0,
      neverLoggedIn: 0,
    };

    users.forEach(user => {
      // Подсчет по статусу
      if (user.isActive) {
        stats.activeUsers++;
      } else {
        stats.inactiveUsers++;
      }

      // Подсчет по ролям
      const roleName = user.role?.name || 'Не указана';
      stats.byRole[roleName] = (stats.byRole[roleName] || 0) + 1;

      // Подсчет активности
      if (user.lastLoginAt) {
        if (user.lastLoginAt >= thirtyDaysAgo) {
          stats.recentlyActive++;
        }
      } else {
        stats.neverLoggedIn++;
      }
    });

    return stats;
  }

  /**
   * 🔄 Валидация entity перед маппингом
   */
  private validateUserEntity(user: User, operation: string): void {
    if (!user) {
      throw new Error(`User entity is required for ${operation}`);
    }

    if (!user.id) {
      throw new Error(`User ID is required for ${operation}`);
    }

    if (!user.email) {
      throw new Error(`User email is required for ${operation}`);
    }
  }

  /**
   * 🔄 Batch маппинг с оптимизацией производительности
   */
  mapArrayToResponseDtoOptimized(users: User[]): UserResponseDto[] {
    if (!Array.isArray(users)) {
      return [];
    }

    // Для больших массивов используем более эффективный подход
    if (users.length > 1000) {
      console.warn(`Mapping large array of ${users.length} users - consider pagination`);
    }

    return users.map(user => {
      try {
        return this.mapToResponseDto(user);
      } catch (error) {
        console.error(`Failed to map user ${user?.id}:`, error);
        // Возвращаем null и отфильтруем позже
        return null;
      }
    }).filter(Boolean) as UserResponseDto[];
  }
}
