// path: apps/backend/src/modules/services/categories/services/categories-mapper.service.ts
import { Injectable } from '@nestjs/common';
import { ServiceCategory } from '../../../../database/entities';
import { CategoryResponseDto } from '../dto/response/category-response.dto';
import { PaginatedCategoriesResponseDto } from '../dto/response/paginated-categories-response.dto';
import { CategoryWithServicesCount, CategoryStats } from '../types/categories.types';

@Injectable()
export class CategoriesMapperService {
  /**
   * 🔥 Маппинг ServiceCategory entity -> CategoryResponseDto
   */
  mapToResponseDto(category: ServiceCategory): CategoryResponseDto {
    return {
      id: category.id,
      companyId: category.companyId, // null для глобальных категорий
      name: category.name,
      description: category.description,
      isGlobal: category.companyId === null,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }

  /**
   * 🔥 Маппинг массива categories -> array DTO
   */
  mapArrayToResponseDto(categories: ServiceCategory[]): CategoryResponseDto[] {
    return categories.map(category => this.mapToResponseDto(category));
  }

  /**
   * 🔥 Маппинг для пагинированного ответа
   */
  mapToPaginatedResponse(
    categories: ServiceCategory[],
    total: number,
    page: number,
    limit: number
  ): PaginatedCategoriesResponseDto {
    return {
      data: this.mapArrayToResponseDto(categories),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrevious: page > 1,
      },
    };
  }

  /**
   * 🔥 ИСПРАВЛЕНО: Маппинг категории с количеством услуг
   */
  mapToDetailedResponseDto(categoryWithCount: CategoryWithServicesCount): CategoryResponseDto & { servicesCount: number } {
    return {
      id: categoryWithCount.id,
      companyId: categoryWithCount.companyId,
      name: categoryWithCount.name,
      description: categoryWithCount.description,
      isGlobal: categoryWithCount.isGlobal,
      servicesCount: categoryWithCount.servicesCount,
      createdAt: categoryWithCount.createdAt,
      updatedAt: categoryWithCount.updatedAt,
    };
  }

  /**
   * 📊 Маппинг статистики категорий
   */
  mapStatsToResponse(stats: CategoryStats): any {
    return {
      summary: {
        total: stats.total,
        global: stats.global,
        company: stats.company,
        withServices: stats.withServices,
        withoutServices: stats.withoutServices,
        utilizationRate: stats.total > 0 ? Math.round((stats.withServices / stats.total) * 100) : 0,
      },
      distribution: {
        globalPercentage: stats.total > 0 ? Math.round((stats.global / stats.total) * 100) : 0,
        companyPercentage: stats.total > 0 ? Math.round((stats.company / stats.total) * 100) : 0,
      },
      mostUsed: stats.mostUsed.map((cat, index) => ({
        rank: index + 1,
        categoryId: cat.categoryId,
        categoryName: cat.categoryName,
        servicesCount: cat.servicesCount,
      })),
    };
  }

  /**
   * 🔥 Маппинг для dropdown/select компонентов
   */
  mapToSelectOptions(categories: ServiceCategory[]): Array<{
    value: string;
    label: string;
    group?: string;
    disabled?: boolean;
  }> {
    return categories.map(category => ({
      value: category.id,
      label: category.name,
      group: category.companyId === null ? 'Глобальные категории' : 'Категории компании',
      disabled: false,
    }));
  }

  /**
   * 🔥 Маппинг для экспорта данных
   */
  mapForExport(categories: ServiceCategory[]): Array<{
    name: string;
    description: string;
    type: string;
    created: string;
  }> {
    return categories.map(category => ({
      name: category.name,
      description: category.description || '',
      type: category.companyId === null ? 'Глобальная' : 'Компании',
      created: category.createdAt.toLocaleDateString('ru-RU'),
    }));
  }

  /**
   * 📱 Маппинг для мобильного API (упрощенный)
   */
  mapToMobileDto(categories: ServiceCategory[]): Array<{
    id: string;
    name: string;
    isGlobal: boolean;
  }> {
    return categories.map(category => ({
      id: category.id,
      name: category.name,
      isGlobal: category.companyId === null,
    }));
  }

  /**
   * 🔥 Маппинг категорий с группировкой
   */
  mapToGroupedCategories(categories: ServiceCategory[]): {
    global: CategoryResponseDto[];
    company: CategoryResponseDto[];
  } {
    const mapped = this.mapArrayToResponseDto(categories);
    
    return {
      global: mapped.filter(cat => cat.isGlobal),
      company: mapped.filter(cat => !cat.isGlobal),
    };
  }
}
