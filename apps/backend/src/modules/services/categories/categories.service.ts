// path: apps/backend/src/modules/services/categories/categories.service.ts
import { Injectable } from '@nestjs/common';
import { CategoriesBusinessService } from './services/categories-business.service';
import { CreateCategoryDto } from './dto/request/create-category.dto';
import { UpdateCategoryDto } from './dto/request/update-category.dto';
import { CategoryResponseDto } from './dto/response/category-response.dto';
import { PaginatedCategoriesResponseDto } from './dto/response/paginated-categories-response.dto';
import { CategoriesFilter, UserWithCompany } from './types/categories.types';
import { ICategoriesService } from './interfaces/categories.interface';

@Injectable()
export class CategoriesService implements ICategoriesService {
  constructor(private readonly businessService: CategoriesBusinessService) {}

  async findAllForUser(user: UserWithCompany, filter: CategoriesFilter): Promise<PaginatedCategoriesResponseDto> {
    return this.businessService.findAllForUser(user, filter);
  }

  async findOne(id: string): Promise<CategoryResponseDto> {
    const category = await this.businessService.dataService.findById(id);
    if (!category) {
      throw new Error(`Категория с ID ${id} не найдена`);
    }
    return this.businessService.mapperService.mapToResponseDto(category);
  }

  async createForUser(dto: CreateCategoryDto, user: UserWithCompany): Promise<CategoryResponseDto> {
    return this.businessService.createCategory(dto, user);
  }

  async update(id: string, dto: UpdateCategoryDto, user: UserWithCompany): Promise<CategoryResponseDto> {
    return this.businessService.updateCategory(id, dto, user);
  }

  async remove(id: string, user: UserWithCompany): Promise<void> {
    await this.businessService.removeCategory(id, user);
  }

  async getStats(user: UserWithCompany): Promise<any> {
    return this.businessService.getCategoriesStatistics(user);
  }

  async search(query: string, user: UserWithCompany): Promise<CategoryResponseDto[]> {
    return this.businessService.searchCategories(query, user);
  }

  async getForSelect(
    user: UserWithCompany,
  ): Promise<Array<{ value: string; label: string; group?: string; disabled?: boolean }>> {
    return this.businessService.getCategoriesForSelect(user);
  }

  async getWithServicesCount(user: UserWithCompany): Promise<Array<CategoryResponseDto & { servicesCount: number }>> {
    return this.businessService.getCategoriesWithServicesCount(user);
  }

  async getGrouped(user: UserWithCompany): Promise<{ global: CategoryResponseDto[]; company: CategoryResponseDto[] }> {
    return this.businessService.getGroupedCategories(user);
  }

  async initializeGlobal(user: UserWithCompany): Promise<CategoryResponseDto[]> {
    return this.businessService.initializeGlobalCategories(user);
  }

  async existsInCompany(categoryId: string, companyId: string): Promise<boolean> {
    try {
      await this.businessService.validationService.validateCategoryOwnership(categoryId, companyId);
      return true;
    } catch {
      return false;
    }
  }

  async getCategoryForService(categoryId: string, companyId: string): Promise<CategoryResponseDto> {
    const category = await this.businessService.validationService.validateCategoryOwnership(categoryId, companyId);
    return this.businessService.mapperService.mapToResponseDto(category);
  }

  async getAvailableForCompany(companyId: string): Promise<CategoryResponseDto[]> {
    const [categories] = await this.businessService.dataService.findWithFilters({
      companyId,
      includeGlobal: true,
    });
    return this.businessService.mapperService.mapArrayToResponseDto(categories);
  }
}
