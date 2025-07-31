import { Injectable } from '@nestjs/common';
import { CategoriesDataService } from './categories-data.service';
import { CategoriesValidationService } from './categories-validation.service';
import { CategoriesMapperService } from './categories-mapper.service';
import { ServiceCategory } from '../../../../database/entities';
import { CreateCategoryDto } from '../dto/request/create-category.dto';
import { UpdateCategoryDto } from '../dto/request/update-category.dto';
import { CategoryResponseDto } from '../dto/response/category-response.dto';
import { PaginatedCategoriesResponseDto } from '../dto/response/paginated-categories-response.dto';
import { CategoriesFilter, CategoryStats, UserWithCompany } from '../types/categories.types';
import { CATEGORIES_CONSTANTS } from '../constants/categories.constants';

@Injectable()
export class CategoriesBusinessService {
  constructor(
    public readonly dataService: CategoriesDataService,
    public readonly validationService: CategoriesValidationService,
    public readonly mapperService: CategoriesMapperService,
  ) {}

  /**
   * 🔒 Получение всех категорий пользователя с пагинацией и фильтрацией
   */
  async findAllForUser(user: UserWithCompany, filter: CategoriesFilter): Promise<PaginatedCategoriesResponseDto> {
    // 🔒 КРИТИЧНО: Всегда фильтруем по companyId пользователя
    if (!user.companyId) {
      throw new Error('Пользователь не принадлежит к компании');
    }

    // Подготавливаем фильтр с безопасными значениями
    const safeFilter = this.prepareSafeFilter(filter, user.companyId);

    // Получаем данные
    const [categories, total] = await this.dataService.findWithFilters(safeFilter);

    // Возвращаем маппированный результат
    return this.mapperService.mapToPaginatedResponse(
      categories,
      total,
      safeFilter.page || 1,
      safeFilter.limit || CATEGORIES_CONSTANTS.DEFAULT_PAGE_SIZE
    );
  }

  /**
   * 🔒 Получение категории по ID с проверкой прав доступа
   */
  async findOneSecurely(categoryId: string, user: UserWithCompany): Promise<CategoryResponseDto> {
    if (!user.companyId) {
      throw new Error('Пользователь не принадлежит к компании');
    }

    // Проверяем права доступа через ValidationService
    const category = await this.validationService.validateCategoryOwnership(categoryId, user.companyId);

    return this.mapperService.mapToResponseDto(category);
  }

  /**
   * ➕ Создание новой категории
   */
  async createCategory(dto: CreateCategoryDto, user: UserWithCompany): Promise<CategoryResponseDto> {
    if (!user.companyId) {
      throw new Error('Пользователь не принадлежит к компании');
    }

    // Валидируем данные
    await this.validationService.validateCreateCategoryData(dto, user.companyId);

    // Создаем категорию для компании (не глобальную)
    const category = await this.dataService.create(dto, user.companyId);

    // Логируем создание для audit
    console.log(`✅ Category created: ${category.id} by user ${user.id} in company ${user.companyId}`);

    return this.mapperService.mapToResponseDto(category);
  }

  /**
   * ✏️ Обновление категории
   */
  async updateCategory(categoryId: string, dto: UpdateCategoryDto, user: UserWithCompany): Promise<CategoryResponseDto> {
    if (!user.companyId) {
      throw new Error('Пользователь не принадлежит к компании');
    }

    // Валидируем права доступа и данные
    await this.validationService.validateUpdateCategoryData(categoryId, dto, user.companyId);

    // Обновляем категорию
    const updatedCategory = await this.dataService.update(categoryId, dto);

    // Логируем обновление для audit
    console.log(`✅ Category updated: ${categoryId} by user ${user.id} in company ${user.companyId}`);

    return this.mapperService.mapToResponseDto(updatedCategory);
  }

  /**
   * 🗑️ Удаление категории
   */
  async removeCategory(categoryId: string, user: UserWithCompany): Promise<void> {
    if (!user.companyId) {
      throw new Error('Пользователь не принадлежит к компании');
    }

    // Проверяем возможность удаления
    await this.validationService.validateCategoryDeletion(categoryId, user.companyId);

    // Удаляем категорию
    await this.dataService.remove(categoryId);

    // Логируем удаление для audit
    console.log(`🗑️ Category deleted: ${categoryId} by user ${user.id} in company ${user.companyId}`);
  }

  /**
   * 📊 Получение статистики категорий
   */
  async getCategoriesStatistics(user: UserWithCompany): Promise<any> {
    if (!user.companyId) {
      throw new Error('Пользователь не принадлежит к компании');
    }

    const stats = await this.dataService.getCategoriesStats(user.companyId);

    return this.mapperService.mapStatsToResponse(stats);
  }

  /**
   * 📱 Получение категорий для dropdown/select
   */
  async getCategoriesForSelect(user: UserWithCompany): Promise<Array<{
    value: string;
    label: string;
    group?: string;
    disabled?: boolean;
  }>> {
    if (!user.companyId) {
      throw new Error('Пользователь не принадлежит к компании');
    }

    const [categories] = await this.dataService.findWithFilters({
      companyId: user.companyId,
      includeGlobal: true,
    });

    return this.mapperService.mapToSelectOptions(categories);
  }

  /**
   * 🔍 Поиск категорий по названию
   */
  async searchCategories(query: string, user: UserWithCompany): Promise<CategoryResponseDto[]> {
    if (!user.companyId) {
      throw new Error('Пользователь не принадлежит к компании');
    }

    if (!query || query.trim().length < 2) {
      throw new Error('Поисковый запрос должен содержать минимум 2 символа');
    }

    const [categories] = await this.dataService.findWithFilters({
      companyId: user.companyId,
      includeGlobal: true,
      search: query.trim(),
    });

    return this.mapperService.mapArrayToResponseDto(categories);
  }

  /**
   * 🔥 Получение категорий с количеством услуг
   */
  async getCategoriesWithServicesCount(user: UserWithCompany): Promise<Array<CategoryResponseDto & { servicesCount: number }>> {
    if (!user.companyId) {
      throw new Error('Пользователь не принадлежит к компании');
    }

    const categoriesWithCount = await this.dataService.findWithServicesCount(user.companyId);

    return categoriesWithCount.map(cat => this.mapperService.mapToDetailedResponseDto(cat));
  }

  /**
   * 🌍 Инициализация глобальных категорий (admin only)
   */
  async initializeGlobalCategories(user: UserWithCompany): Promise<CategoryResponseDto[]> {
    // Проверяем права superadmin
    if (user.role !== 'superadmin') {
      throw new Error('Только superadmin может создавать глобальные категории');
    }

    const globalCategories = await this.dataService.createGlobalCategories();

    console.log(`🌍 Global categories initialized by user ${user.id}`);

    return this.mapperService.mapArrayToResponseDto(globalCategories);
  }

  /**
   * 🔥 Получение сгруппированных категорий
   */
  async getGroupedCategories(user: UserWithCompany): Promise<{
    global: CategoryResponseDto[];
    company: CategoryResponseDto[];
  }> {
    if (!user.companyId) {
      throw new Error('Пользователь не принадлежит к компании');
    }

    const [categories] = await this.dataService.findWithFilters({
      companyId: user.companyId,
      includeGlobal: true,
    });

    return this.mapperService.mapToGroupedCategories(categories);
  }

  /**
   * 🔒 Подготовка безопасного фильтра с принудительной установкой companyId
   */
  private prepareSafeFilter(filter: CategoriesFilter, companyId: string): CategoriesFilter {
    const page = filter.page ? Math.max(1, parseInt(String(filter.page))) : 1;
    const limit = filter.limit ? 
      Math.min(CATEGORIES_CONSTANTS.MAX_PAGE_SIZE, Math.max(1, parseInt(String(filter.limit)))) : 
      CATEGORIES_CONSTANTS.DEFAULT_PAGE_SIZE;

    return {
      ...filter,
      companyId, // 🔒 ПРИНУДИТЕЛЬНО устанавливаем companyId
      includeGlobal: filter.includeGlobal !== false, // По умолчанию включаем глобальные
      page,
      limit,
      offset: (page - 1) * limit,
    };
  }
}
