// path: apps/backend/src/modules/services/categories/services/categories-business.service.ts
import { Injectable } from '@nestjs/common';
import { CategoriesDataService } from './categories-data.service';
import { CategoriesValidationService } from './categories-validation.service';
import { CategoriesMapperService } from './categories-mapper.service';
import { CreateCategoryDto } from '../dto/request/create-category.dto';
import { UpdateCategoryDto } from '../dto/request/update-category.dto';
import { CategoryResponseDto } from '../dto/response/category-response.dto';
import { PaginatedCategoriesResponseDto } from '../dto/response/paginated-categories-response.dto';
import { CategoriesFilter, UserWithCompany } from '../types/categories.types';
import { CATEGORIES_CONSTANTS } from '../constants/categories.constants';

@Injectable()
export class CategoriesBusinessService {
  constructor(
    public readonly dataService: CategoriesDataService,
    public readonly validationService: CategoriesValidationService,
    public readonly mapperService: CategoriesMapperService,
  ) {}

  async findAllForUser(user: UserWithCompany, filter: CategoriesFilter): Promise<PaginatedCategoriesResponseDto> {
    if (!user.companyId) {
      throw new Error('Пользователь не принадлежит к компании');
    }
    const safeFilter = this.prepareSafeFilter(filter, user.companyId);
    this.validationService.validateCategoriesFilter(safeFilter);
    const [categories, total] = await this.dataService.findWithFilters(safeFilter);
    return this.mapperService.mapToPaginatedResponse(
      categories,
      total,
      safeFilter.page || 1,
      safeFilter.limit || CATEGORIES_CONSTANTS.DEFAULT_PAGE_SIZE,
    );
  }

  async findOneSecurely(categoryId: string, user: UserWithCompany): Promise<CategoryResponseDto> {
    if (!user.companyId) {
      throw new Error('Пользователь не принадлежит к компании');
    }
    const category = await this.validationService.validateCategoryOwnership(categoryId, user.companyId);
    return this.mapperService.mapToResponseDto(category);
  }

  async createCategory(dto: CreateCategoryDto, user: UserWithCompany): Promise<CategoryResponseDto> {
    if (!user.companyId) {
      throw new Error('Пользователь не принадлежит к компании');
    }
    await this.validationService.validateCreateCategoryData(dto, user.companyId);
    const category = await this.dataService.create(dto, user.companyId);
    return this.mapperService.mapToResponseDto(category);
  }

  async updateCategory(categoryId: string, dto: UpdateCategoryDto, user: UserWithCompany): Promise<CategoryResponseDto> {
    if (!user.companyId) {
      throw new Error('Пользователь не принадлежит к компании');
    }
    await this.validationService.validateUpdateCategoryData(categoryId, dto, user.companyId);
    const updatedCategory = await this.dataService.update(categoryId, dto);
    return this.mapperService.mapToResponseDto(updatedCategory);
  }

  async removeCategory(categoryId: string, user: UserWithCompany): Promise<void> {
    if (!user.companyId) {
      throw new Error('Пользователь не принадлежит к компании');
    }
    await this.validationService.validateCategoryDeletion(categoryId, user.companyId);
    await this.dataService.remove(categoryId);
  }

  async getCategoriesStatistics(user: UserWithCompany): Promise<any> {
    if (!user.companyId) {
      throw new Error('Пользователь не принадлежит к компании');
    }
    const stats = await this.dataService.getCategoriesStats(user.companyId);
    return this.mapperService.mapStatsToResponse(stats);
  }

  async getCategoriesForSelect(
    user: UserWithCompany,
  ): Promise<Array<{ value: string; label: string; group?: string; disabled?: boolean }>> {
    if (!user.companyId) {
      throw new Error('Пользователь не принадлежит к компании');
    }
    const [categories] = await this.dataService.findWithFilters({
      companyId: user.companyId,
      includeGlobal: true,
    });
    return this.mapperService.mapToSelectOptions(categories);
  }

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

  async getCategoriesWithServicesCount(user: UserWithCompany): Promise<Array<CategoryResponseDto & { servicesCount: number }>> {
    if (!user.companyId) {
      throw new Error('Пользователь не принадлежит к компании');
    }
    const categoriesWithCount = await this.dataService.findWithServicesCount(user.companyId);
    return categoriesWithCount.map((cat) => this.mapperService.mapToDetailedResponseDto(cat));
  }

  async initializeGlobalCategories(user: UserWithCompany): Promise<CategoryResponseDto[]> {
    if (user.role !== 'superadmin') {
      throw new Error('Только superadmin может создавать глобальные категории');
    }
    const globalCategories = await this.dataService.createGlobalCategories();
    return this.mapperService.mapArrayToResponseDto(globalCategories);
  }

  async getGroupedCategories(
    user: UserWithCompany,
  ): Promise<{ global: CategoryResponseDto[]; company: CategoryResponseDto[] }> {
    if (!user.companyId) {
      throw new Error('Пользователь не принадлежит к компании');
    }
    const [categories] = await this.dataService.findWithFilters({
      companyId: user.companyId,
      includeGlobal: true,
    });
    return this.mapperService.mapToGroupedCategories(categories);
  }

  private prepareSafeFilter(filter: CategoriesFilter, companyId: string): CategoriesFilter {
    const page = filter.page ? Math.max(1, parseInt(String(filter.page), 10)) : 1;
    const limit = filter.limit
      ? Math.min(CATEGORIES_CONSTANTS.MAX_PAGE_SIZE, Math.max(1, parseInt(String(filter.limit), 10)))
      : CATEGORIES_CONSTANTS.DEFAULT_PAGE_SIZE;

    const allowedSortBy: NonNullable<CategoriesFilter['sortBy']>[] = ['name', 'createdAt', 'updatedAt'];
    const allowedSortOrder: NonNullable<CategoriesFilter['sortOrder']>[] = ['ASC', 'DESC'];

    const sortBy = allowedSortBy.includes(filter.sortBy as any) ? filter.sortBy : CATEGORIES_CONSTANTS.DEFAULT_SORT_BY;
    const sortOrder = allowedSortOrder.includes(filter.sortOrder as any)
      ? filter.sortOrder
      : CATEGORIES_CONSTANTS.DEFAULT_SORT_ORDER;

    return {
      ...filter,
      companyId,
      includeGlobal: filter.includeGlobal !== false,
      page,
      limit,
      offset: (page - 1) * limit,
      sortBy,
      sortOrder,
    };
  }
}
