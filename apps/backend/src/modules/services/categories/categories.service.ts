import { Injectable } from '@nestjs/common';
import { CategoriesBusinessService } from './services/categories-business.service';
import { CreateCategoryDto } from './dto/request/create-category.dto';
import { UpdateCategoryDto } from './dto/request/update-category.dto';
import { CategoryResponseDto } from './dto/response/category-response.dto';
import { PaginatedCategoriesResponseDto } from './dto/response/paginated-categories-response.dto';
import { CategoriesFilter, CategoryStats, UserWithCompany } from './types/categories.types';
import { ICategoriesService } from './interfaces/categories.interface';

/**
 * 🎯 Главный сервис для работы с категориями услуг
 * Используется в контроллере и служит основным интерфейсом
 * Делегирует всю логику в CategoriesBusinessService
 */
@Injectable()
export class CategoriesService implements ICategoriesService {
  constructor(
    private readonly businessService: CategoriesBusinessService,
  ) {}

  /**
   * 🔒 Получение всех категорий пользователя
   */
  async findAllForUser(user: UserWithCompany, filter: CategoriesFilter): Promise<PaginatedCategoriesResponseDto> {
    return this.businessService.findAllForUser(user, filter);
  }

  /**
   * 🔒 Получение категории по ID
   */
  async findOne(id: string): Promise<CategoryResponseDto> {
    // Note: Право доступа проверяется через @ServiceCategoryResource() decorator
    // который вызывает CompanyOwnershipGuard -> ServicesValidationService
    const category = await this.businessService.dataService.findById(id);
    
    if (!category) {
      throw new Error(`Категория с ID ${id} не найдена`);
    }

    return this.businessService.mapperService.mapToResponseDto(category);
  }

  /**
   * ➕ Создание новой категории
   */
  async createForUser(dto: CreateCategoryDto, user: UserWithCompany): Promise<CategoryResponseDto> {
    return this.businessService.createCategory(dto, user);
  }

  /**
   * ✏️ Обновление категории
   */
  async update(id: string, dto: UpdateCategoryDto): Promise<CategoryResponseDto> {
    // Note: Право доступа проверяется через @ServiceCategoryResource() decorator
    const updatedCategory = await this.businessService.dataService.update(id, dto);
    return this.businessService.mapperService.mapToResponseDto(updatedCategory);
  }

  /**
   * 🗑️ Удаление категории
   */
  async remove(id: string): Promise<void> {
    // Note: Право доступа проверяется через @ServiceCategoryResource() decorator
    await this.businessService.dataService.remove(id);
  }

  /**
   * 📊 Получение статистики категорий
   */
  async getStats(user: UserWithCompany): Promise<CategoryStats> {
    return this.businessService.getCategoriesStatistics(user);
  }

  // ========== ДОПОЛНИТЕЛЬНЫЕ МЕТОДЫ ==========

  /**
   * 🔍 Поиск категорий
   */
  async search(query: string, user: UserWithCompany): Promise<CategoryResponseDto[]> {
    return this.businessService.searchCategories(query, user);
  }

  /**
   * 📱 Получение категорий для dropdown/select
   */
  async getForSelect(user: UserWithCompany): Promise<Array<{
    value: string;
    label: string;
    group?: string;
    disabled?: boolean;
  }>> {
    return this.businessService.getCategoriesForSelect(user);
  }

  /**
   * 🔥 Получение категорий с количеством услуг
   */
  async getWithServicesCount(user: UserWithCompany): Promise<Array<CategoryResponseDto & { servicesCount: number }>> {
    return this.businessService.getCategoriesWithServicesCount(user);
  }

  /**
   * 🔥 Получение сгруппированных категорий
   */
  async getGrouped(user: UserWithCompany): Promise<{
    global: CategoryResponseDto[];
    company: CategoryResponseDto[];
  }> {
    return this.businessService.getGroupedCategories(user);
  }

  /**
   * 🌍 Инициализация глобальных категорий (admin only)
   */
  async initializeGlobal(user: UserWithCompany): Promise<CategoryResponseDto[]> {
    return this.businessService.initializeGlobalCategories(user);
  }

  // ========== МЕТОДЫ ДЛЯ ДРУГИХ МОДУЛЕЙ ==========

  /**
   * 🔗 Проверка существования категории (для Services модуля)
   */
  async existsInCompany(categoryId: string, companyId: string): Promise<boolean> {
    try {
      await this.businessService.validationService.validateCategoryOwnership(categoryId, companyId);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 🔗 Получение категории для услуги (используется в Services модуле)
   */
  async getCategoryForService(categoryId: string, companyId: string): Promise<CategoryResponseDto> {
    const category = await this.businessService.validationService.validateCategoryOwnership(categoryId, companyId);
    return this.businessService.mapperService.mapToResponseDto(category);
  }

  /**
   * 🔗 Получение только доступных категорий (для Services модуля)
   */
  async getAvailableForCompany(companyId: string): Promise<CategoryResponseDto[]> {
    const [categories] = await this.businessService.dataService.findWithFilters({
      companyId,
      includeGlobal: true,
    });

    return this.businessService.mapperService.mapArrayToResponseDto(categories);
  }
}
