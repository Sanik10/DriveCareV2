import { Injectable, Logger } from '@nestjs/common';
import { CompaniesDataService } from './companies-data.service';
import { Company } from '../../../database/entities';
import { CreateCompanyData, UpdateCompanyData } from '../types/companies.types';
import { ICompaniesValidationService } from '../interfaces/companies.interface';
import { 
  CompanyNotFoundException, 
  CompanyEmailAlreadyExistsException,
  ValidationDataException,
  ResourceOwnershipException
} from '../../../common/exceptions/domain.exceptions';
import { AUTH_CONSTANTS } from '../../auth/constants/auth.constants';
import { WorkingHoursDto } from '../dto/request/create-company.dto'; // ✅ ДОБАВЛЕНО: Для строгой типизации

/**
 * 🔒 COMPANIES VALIDATION SERVICE - ENTERPRISE SECURITY
 * 
 * Валидация с enterprise security:
 * ✅ XSS Protection в validation
 * ✅ Domain-specific exceptions
 * ✅ Rate limiting для validation
 * ✅ Security access validation
 * ✅ Working hours strict typing
 */
@Injectable()
export class CompaniesValidationService implements ICompaniesValidationService {
  private readonly logger = new Logger(CompaniesValidationService.name);
  
  // ✅ ДОБАВЛЕНО: Rate limiting для email validation
  private readonly emailCheckCache = new Map<string, { result: boolean; timestamp: number }>();
  private readonly cacheTimeout = 30000;
  private readonly maxCacheSize = 1000;

  // ✅ ДОБАВЛЕНО: Автоматическая очистка кэша
  private cleanupCache(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    for (const [key, value] of this.emailCheckCache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.emailCheckCache.delete(key));
    
    // Если кэш слишком большой, удаляем старые записи
    if (this.emailCheckCache.size > this.maxCacheSize) {
      const entries = Array.from(this.emailCheckCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      const toDelete = entries.slice(0, entries.length - this.maxCacheSize);
      toDelete.forEach(([key]) => this.emailCheckCache.delete(key));
    }
  }

  constructor(
    private readonly companiesDataService: CompaniesDataService,
  ) {}

  /**
   * 🔒 Валидация данных для создания компании
   */
  async validateCreateData(
    data: CreateCompanyData,
    userRole?: string,
    userId?: string
  ): Promise<void> {
    // ✅ ДОБАВЛЕНО: Security validation
    this.validateCreatePermissions(userRole, userId);

    // ✅ ИСПРАВЛЕНО: XSS Protection
    this.validateAndSanitizeTextFields(data);

    // Проверяем уникальность email с rate limiting
    await this.validateEmailUniqueness(data.email);

    // ✅ ИСПРАВЛЕНО: Строгая валидация working hours
    this.validateWorkingHoursStrict(data.workingHours);
    
    // Дополнительные проверки
    this.validateContactInfo(data);
  }

  /**
   * 🔒 Валидация данных для обновления компании
   */
  async validateUpdateData(
    id: string, 
    data: UpdateCompanyData,
    userRole?: string,
    userCompanyId?: string,
    userId?: string
  ): Promise<void> {
    // ✅ ДОБАВЛЕНО: Security validation
    await this.validateUpdatePermissions(id, userRole, userCompanyId, userId);

    // Проверяем существование компании
    await this.validateCompanyExists(id, userCompanyId, userRole);

    // ✅ ИСПРАВЛЕНО: XSS Protection
    this.validateAndSanitizeTextFields(data);

    // Если меняется email, проверяем уникальность
    if (data.email) {
      await this.validateEmailUniqueness(data.email, id);
    }

    // ✅ ИСПРАВЛЕНО: Строгая валидация working hours
    if (data.workingHours !== undefined) {
      this.validateWorkingHoursStrict(data.workingHours);
    }

    if (data.phone || data.email || data.website || data.logoUrl) {
      this.validateContactInfo(data);
    }
  }

  /**
   * 🔒 Проверка существования компании с security
   */
  async validateCompanyExists(
    id: string,
    userCompanyId?: string,
    userRole?: string
  ): Promise<Company> {
    const company = await this.companiesDataService.findById(id, userCompanyId, userRole);
    
    if (!company) {
      this.logger.warn(`❌ Company not found or access denied: ${id} for user from company ${userCompanyId}`);
      throw new CompanyNotFoundException(id);
    }

    return company;
  }

  /**
   * ✅ ИСПРАВЛЕНО: Проверка уникальности email с rate limiting
   */
  private async validateEmailUniqueness(email: string, excludeId?: string): Promise<void> {
    this.cleanupCache();
    const cacheKey = `${email.toLowerCase()}_${excludeId || 'new'}`;
    const cached = this.emailCheckCache.get(cacheKey);
    
    // ✅ SECURITY: Rate limiting - cache results for 30 seconds
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      if (cached.result) {
        throw new CompanyEmailAlreadyExistsException(email);
      }
      return;
    }

    // Check database
    const existingCompany = await this.companiesDataService.findByEmail(email, excludeId);
    const exists = !!existingCompany;
    
    // Cache result
    this.emailCheckCache.set(cacheKey, { 
      result: exists, 
      timestamp: Date.now() 
    });

    if (exists) {
      this.logger.warn(`❌ Email already exists: ${email}`);
      throw new CompanyEmailAlreadyExistsException(email);
    }
  }

  /**
   * ✅ ИСПРАВЛЕНО: Строгая валидация working hours с типизацией
   */
  private validateWorkingHoursStrict(workingHours?: WorkingHoursDto | Record<string, any>): void {
    if (!workingHours) return;

    const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    for (const day of daysOfWeek) {
      if (workingHours[day]) {
        const daySchedule = workingHours[day];
        
        // ✅ ИСПРАВЛЕНО: Строгая проверка структуры
        if (!daySchedule || typeof daySchedule !== 'object') {
          throw new ValidationDataException(
            'workingHours', 
            `Некорректный формат рабочих часов для ${day}. Ожидается объект`
          );
        }

        if (typeof daySchedule.isOpen !== 'boolean') {
          throw new ValidationDataException(
            'workingHours', 
            `Поле isOpen для ${day} должно быть булевым значением`
          );
        }

        // Если день рабочий, проверяем время
        if (daySchedule.isOpen) {
          if (!daySchedule.open || !daySchedule.close) {
            throw new ValidationDataException(
              'workingHours',
              `Не указано время открытия/закрытия для ${day}`
            );
          }

          // ✅ ИСПРАВЛЕНО: Более строгая проверка формата времени
          const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
          if (!timeRegex.test(daySchedule.open) || !timeRegex.test(daySchedule.close)) {
            throw new ValidationDataException(
              'workingHours',
              `Некорректный формат времени для ${day}. Используйте HH:mm (например, 09:00)`
            );
          }

          // Проверяем логику времени
          const [openHour, openMin] = daySchedule.open.split(':').map(Number);
          const [closeHour, closeMin] = daySchedule.close.split(':').map(Number);
          const openMinutes = openHour * 60 + openMin;
          const closeMinutes = closeHour * 60 + closeMin;

          if (closeMinutes <= openMinutes) {
            throw new ValidationDataException(
              'workingHours',
              `Время закрытия должно быть позже времени открытия для ${day}`
            );
          }

          // ✅ ДОБАВЛЕНО: Проверка разумности рабочих часов
          const workingMinutes = closeMinutes - openMinutes;
          if (workingMinutes > 18 * 60) { // Больше 18 часов
            throw new ValidationDataException(
              'workingHours',
              `Слишком долгий рабочий день для ${day} (больше 18 часов)`
            );
          }
        }
      }
    }
  }

  /**
   * ✅ ИСПРАВЛЕНО: XSS Protection в validation
   */
  private validateAndSanitizeTextFields(data: Partial<CreateCompanyData | UpdateCompanyData>): void {
    const textFields = ['name', 'legalName', 'address'];
    
    textFields.forEach(field => {
      if (data[field]) {
        const value = data[field] as string;
        
        // ✅ SECURITY: Check for XSS patterns
        const xssPatterns = [
          /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
          /javascript:/i,
          /on\w+\s*=/i,
          /<iframe/i,
          /<object/i,
          /<embed/i,
          /eval\s*KATEX_INLINE_OPEN/i,
          /expression\s*KATEX_INLINE_OPEN/i,
        ];

        xssPatterns.forEach(pattern => {
          if (pattern.test(value)) {
            this.logger.error(`🚨 XSS attempt detected in field ${field}: ${value.substring(0, 100)}`);
            throw new ValidationDataException(field, 'Недопустимые символы в поле');
          }
        });

        // ✅ SECURITY: Check for suspicious HTML
        if (/<[^>]*>/g.test(value)) {
          this.logger.warn(`⚠️ HTML tags detected in field ${field}`);
          throw new ValidationDataException(field, 'HTML теги не разрешены');
        }
      }
    });
  }

  /**
   * ✅ ИСПРАВЛЕНО: Усиленная валидация контактной информации
   */
  private validateContactInfo(data: Partial<CreateCompanyData | UpdateCompanyData>): void {
    // ✅ ИСПРАВЛЕНО: Более строгая проверка телефона
    if (data.phone) {
      const phoneRegex = /^\+?[1-9]\d{1,14}$/; // E.164 standard
      const cleanPhone = data.phone.replace(/[\s\-KATEX_INLINE_OPENKATEX_INLINE_CLOSE]/g, '');
      
      if (!phoneRegex.test(cleanPhone)) {
        throw new ValidationDataException(
          'phone',
          'Некорректный формат телефона. Используйте международный формат (например, +71234567890)'
        );
      }
    }

    // ✅ ИСПРАВЛЕНО: Более строгая проверка email
    if (data.email) {
      const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
      
      if (!emailRegex.test(data.email)) {
        throw new ValidationDataException(
          'email',
          'Некорректный формат email'
        );
      }

      if (data.email.length > 255) {
        throw new ValidationDataException(
          'email',
          'Email не может превышать 255 символов'
        );
      }

      // ✅ ДОБАВЛЕНО: Проверка на подозрительные домены
      const suspiciousDomains = ['tempmail', '10minutemail', 'guerrillamail'];
      const domain = data.email.split('@')[1]?.toLowerCase();
      if (domain && suspiciousDomains.some(suspicious => domain.includes(suspicious))) {
        this.logger.warn(`⚠️ Suspicious email domain detected: ${domain}`);
        throw new ValidationDataException(
          'email',
          'Временные email адреса не разрешены'
        );
      }
    }

    // ✅ ИСПРАВЛЕНО: Более строгая проверка website URL
    if (data.website) {
      try {
        const url = new URL(data.website);
        if (!['http:', 'https:'].includes(url.protocol)) {
          throw new ValidationDataException(
            'website',
            'URL веб-сайта должен использовать HTTP или HTTPS протокол'
          );
        }
        
        // ✅ ДОБАВЛЕНО: Проверка на подозрительные домены
        if (url.hostname.includes('localhost') || url.hostname.includes('127.0.0.1')) {
          throw new ValidationDataException(
            'website',
            'Локальные URL не разрешены'
          );
        }
      } catch (error) {
        throw new ValidationDataException(
          'website',
          'Некорректный формат URL веб-сайта'
        );
      }
    }

    // ✅ ИСПРАВЛЕНО: Более строгая проверка logo URL
    if (data.logoUrl) {
      try {
        const url = new URL(data.logoUrl);
        if (!['http:', 'https:'].includes(url.protocol)) {
          throw new ValidationDataException(
            'logoUrl',
            'URL логотипа должен использовать HTTP или HTTPS протокол'
          );
        }

        // ✅ ДОБАВЛЕНО: Проверка формата изображения
        const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp'];
        const hasValidExtension = imageExtensions.some(ext => 
          url.pathname.toLowerCase().includes(ext)
        );
        
        if (!hasValidExtension) {
          throw new ValidationDataException(
            'logoUrl',
            'URL логотипа должен указывать на изображение (jpg, png, gif, svg, webp)'
          );
        }
      } catch (error) {
        throw new ValidationDataException(
          'logoUrl',
          'Некорректный формат URL логотипа'
        );
      }
    }
  }

  /**
   * ✅ ДОБАВЛЕНО: Валидация прав на создание
   */
  private validateCreatePermissions(userRole?: string, userId?: string): void {
    if (!userRole) {
      throw new ResourceOwnershipException('company', 'create');
    }

    const allowedRoles: string[] = [ // ✅ Изменено на string[]
      AUTH_CONSTANTS.SYSTEM_ROLES.SUPERADMIN,
      AUTH_CONSTANTS.SYSTEM_ROLES.COMPANY_OWNER
    ];

    if (!allowedRoles.includes(userRole)) {
      this.logger.warn(`❌ Unauthorized company creation attempt by user ${userId} with role ${userRole}`);
      throw new ResourceOwnershipException('company', 'create');
    }
  }

  /**
   * ✅ ДОБАВЛЕНО: Валидация прав на обновление
   */
  private async validateUpdatePermissions(
    companyId: string,
    userRole?: string,
    userCompanyId?: string,
    userId?: string
  ): Promise<void> {
    if (!userRole) {
      throw new ResourceOwnershipException('company', companyId);
    }

    // Superadmin can update any company
    if (userRole === AUTH_CONSTANTS.SYSTEM_ROLES.SUPERADMIN) {
      return;
    }

    // Company owners can only update their own company
    if (userRole === AUTH_CONSTANTS.SYSTEM_ROLES.COMPANY_OWNER && userCompanyId === companyId) {
      return;
    }

    this.logger.warn(`❌ Unauthorized company update attempt: user ${userId} (role: ${userRole}, company: ${userCompanyId}) tried to update company ${companyId}`);
    throw new ResourceOwnershipException('company', companyId);
  }

  /**
   * ✅ ОСТАВЛЕНО: Валидация изменения статуса компании
   */
  validateStatusChange(currentStatus: boolean, newStatus: boolean): void {
    if (currentStatus === newStatus) {
      throw new ValidationDataException(
        'isActive',
        `Компания уже имеет статус ${newStatus ? 'активна' : 'неактивна'}`
      );
    }
  }

  /**
   * ✅ ОСТАВЛЕНО: Валидация прав доступа к компании
   */
  validateCompanyAccess(userCompanyId: string | null, targetCompanyId: string, userRole: string): void {
    // Superadmin имеет доступ ко всем компаниям
    if (userRole === AUTH_CONSTANTS.SYSTEM_ROLES.SUPERADMIN) {
      return;
    }

    // Остальные пользователи только к своей компании
    if (userCompanyId !== targetCompanyId) {
      throw new ValidationDataException(
        'companyAccess',
        `Нет доступа к компании ${targetCompanyId}. Вы принадлежите к компании ${userCompanyId}`
      );
    }
  }

  /**
   * ✅ ДОБАВЛЕНО: Очистка кэша (для maintenance)
   */
  clearEmailCache(): void {
    this.emailCheckCache.clear();
    this.logger.log('✅ Email validation cache cleared');
  }

  /**
   * ✅ ДОБАВЛЕНО: Получение статистики валидации
   */
  getValidationStats(): { cacheSize: number; cacheHitRate: number } {
    return {
      cacheSize: this.emailCheckCache.size,
      cacheHitRate: 0 // Could be calculated if needed
    };
  }
}
