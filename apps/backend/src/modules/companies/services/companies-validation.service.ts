import { Injectable } from '@nestjs/common';
import { CompaniesDataService } from './companies-data.service';
import { Company } from '../../../database/entities';
import { CreateCompanyData, UpdateCompanyData } from '../types/companies.types';
import { ICompaniesValidationService } from '../interfaces/companies.interface';
import { 
  CompanyNotFoundException, 
  CompanyEmailAlreadyExistsException,
  ValidationDataException 
} from '../../../common/exceptions/domain.exceptions'; // 🔥 ДОБАВЛЕНО

@Injectable()
export class CompaniesValidationService implements ICompaniesValidationService {
  constructor(
    private readonly companiesDataService: CompaniesDataService,
  ) {}

  /**
   * Валидация данных для создания компании
   */
  async validateCreateData(data: CreateCompanyData): Promise<void> {
    // Проверяем уникальность email
    await this.validateEmailUniqueness(data.email);

    // Дополнительные проверки
    this.validateWorkingHours(data.workingHours);
    this.validateContactInfo(data);
  }

  /**
   * Валидация данных для обновления компании
   */
  async validateUpdateData(id: string, data: UpdateCompanyData): Promise<void> {
    // Проверяем существование компании
    await this.validateCompanyExists(id);

    // Если меняется email, проверяем уникальность
    if (data.email) {
      await this.validateEmailUniqueness(data.email, id);
    }

    // Дополнительные проверки
    if (data.workingHours !== undefined) {
      this.validateWorkingHours(data.workingHours);
    }

    if (data.phone || data.email || data.website) {
      this.validateContactInfo(data);
    }
  }

  /**
   * Проверка существования компании
   */
  async validateCompanyExists(id: string): Promise<Company> {
    const company = await this.companiesDataService.findById(id);
    
    if (!company) {
      throw new CompanyNotFoundException(id); // 🔥 ИСПРАВЛЕНО: кастомное исключение
    }

    return company;
  }

  /**
   * Проверка уникальности email
   */
  private async validateEmailUniqueness(email: string, excludeId?: string): Promise<void> {
    const existingCompany = await this.companiesDataService.findByEmail(email);
    
    if (existingCompany && existingCompany.id !== excludeId) {
      throw new CompanyEmailAlreadyExistsException(email); // 🔥 ИСПРАВЛЕНО: кастомное исключение
    }
  }

  /**
   * Валидация часов работы
   */
  private validateWorkingHours(workingHours?: Record<string, any>): void {
    if (!workingHours) return;

    const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    
    for (const day of daysOfWeek) {
      if (workingHours[day]) {
        const daySchedule = workingHours[day];
        
        // Проверяем структуру дня
        if (typeof daySchedule !== 'object' || 
            typeof daySchedule.isOpen !== 'boolean') {
          throw new ValidationDataException( // 🔥 ИСПРАВЛЕНО: кастомное исключение
            'workingHours', 
            `Некорректный формат рабочих часов для ${day}. Ожидается объект с полем isOpen (boolean)`
          );
        }

        // Если день рабочий, проверяем время
        if (daySchedule.isOpen) {
          if (!daySchedule.open || !daySchedule.close) {
            throw new ValidationDataException( // 🔥 ИСПРАВЛЕНО: кастомное исключение
              'workingHours',
              `Не указано время открытия/закрытия для ${day}`
            );
          }

          // Проверяем формат времени (HH:mm)
          const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
          if (!timeRegex.test(daySchedule.open) || !timeRegex.test(daySchedule.close)) {
            throw new ValidationDataException( // 🔥 ИСПРАВЛЕНО: кастомное исключение
              'workingHours',
              `Некорректный формат времени для ${day}. Используйте HH:mm (например, 09:00)`
            );
          }

          // Проверяем, что время закрытия больше времени открытия
          const [openHour, openMin] = daySchedule.open.split(':').map(Number);
          const [closeHour, closeMin] = daySchedule.close.split(':').map(Number);
          const openMinutes = openHour * 60 + openMin;
          const closeMinutes = closeHour * 60 + closeMin;

          if (closeMinutes <= openMinutes) {
            throw new ValidationDataException( // 🔥 ИСПРАВЛЕНО: кастомное исключение
              'workingHours',
              `Время закрытия должно быть позже времени открытия для ${day}`
            );
          }
        }
      }
    }
  }

  /**
   * Валидация контактной информации
   */
  private validateContactInfo(data: Partial<CreateCompanyData | UpdateCompanyData>): void {
    // Проверка телефона (если есть)
    if (data.phone) {
      const phoneRegex = /^[\+]?[1-9][\d\s\-\(\)]{7,15}$/;
      if (!phoneRegex.test(data.phone.replace(/\s/g, ''))) {
        throw new ValidationDataException( // 🔥 ИСПРАВЛЕНО: кастомное исключение
          'phone',
          'Некорректный формат телефона. Используйте формат: +7 (XXX) XXX-XX-XX'
        );
      }
    }

    // Дополнительные проверки email (помимо @IsEmail декоратора)
    if (data.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        throw new ValidationDataException( // 🔥 ИСПРАВЛЕНО: кастомное исключение
          'email',
          'Некорректный формат email'
        );
      }

      // Проверяем длину email
      if (data.email.length > 255) {
        throw new ValidationDataException( // 🔥 ИСПРАВЛЕНО: кастомное исключение
          'email',
          'Email не может превышать 255 символов'
        );
      }
    }

    // Проверка website URL (если есть)
    if (data.website) {
      try {
        new URL(data.website);
        if (!data.website.startsWith('http://') && !data.website.startsWith('https://')) {
          throw new ValidationDataException( // 🔥 ИСПРАВЛЕНО: кастомное исключение
            'website',
            'URL веб-сайта должен начинаться с http:// или https://'
          );
        }
      } catch {
        throw new ValidationDataException( // 🔥 ИСПРАВЛЕНО: кастомное исключение
          'website',
          'Некорректный формат URL веб-сайта'
        );
      }
    }

    // Проверка logo URL (если есть)
    if (data.logoUrl) {
      try {
        new URL(data.logoUrl);
        if (!data.logoUrl.startsWith('http://') && !data.logoUrl.startsWith('https://')) {
          throw new ValidationDataException( // 🔥 ИСПРАВЛЕНО: кастомное исключение
            'logoUrl',
            'URL логотипа должен начинаться с http:// или https://'
          );
        }
      } catch {
        throw new ValidationDataException( // 🔥 ИСПРАВЛЕНО: кастомное исключение
          'logoUrl',
          'Некорректный формат URL логотипа'
        );
      }
    }
  }

  /**
   * 🔥 НОВОЕ: Валидация изменения статуса компании
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
   * 🔥 НОВОЕ: Валидация прав доступа к компании
   */
  validateCompanyAccess(userCompanyId: string | null, targetCompanyId: string, userRole: string): void {
    // Superadmin имеет доступ ко всем компаниям
    if (userRole === 'superadmin') {
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
}
