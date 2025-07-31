import { CategoriesFilter, CategoryStats, UserWithCompany } from '../types/categories.types';
import { ServiceCategory } from '../../../../database/entities';
import { CreateCategoryDto } from '../dto/request/create-category.dto';
import { UpdateCategoryDto } from '../dto/request/update-category.dto';
import { CategoryResponseDto } from '../dto/response/category-response.dto';
import { PaginatedCategoriesResponseDto } from '../dto/response/paginated-categories-response.dto';

export interface ICategoriesService {
  findAllForUser(user: UserWithCompany, filter: CategoriesFilter): Promise<PaginatedCategoriesResponseDto>;
  findOne(id: string): Promise<CategoryResponseDto>;
  createForUser(dto: CreateCategoryDto, user: UserWithCompany): Promise<CategoryResponseDto>;
  update(id: string, dto: UpdateCategoryDto): Promise<CategoryResponseDto>;
  remove(id: string): Promise<void>;
  getStats(user: UserWithCompany): Promise<CategoryStats>;
}

export interface ICategoriesDataService {
  findWithFilters(filter: CategoriesFilter): Promise<[ServiceCategory[], number]>;
  findById(id: string): Promise<ServiceCategory | null>;
  findByName(name: string, companyId?: string): Promise<ServiceCategory | null>;
  create(dto: CreateCategoryDto, companyId: string | null): Promise<ServiceCategory>;
  update(id: string, dto: UpdateCategoryDto): Promise<ServiceCategory>;
  remove(id: string): Promise<void>;
  getCategoriesStats(companyId: string): Promise<CategoryStats>;
  createGlobalCategories(): Promise<ServiceCategory[]>;
}

export interface ICategoriesValidationService {
  validateCategoryOwnership(categoryId: string, companyId: string): Promise<ServiceCategory>;
  validateCreateCategoryData(dto: CreateCategoryDto, companyId: string): Promise<void>;
  validateUpdateCategoryData(categoryId: string, dto: UpdateCategoryDto, companyId: string): Promise<ServiceCategory>;
  validateCategoryDeletion(categoryId: string, companyId: string): Promise<void>;
}

export interface ICategoriesMapperService {
  mapToResponseDto(category: ServiceCategory): CategoryResponseDto;
  mapArrayToResponseDto(categories: ServiceCategory[]): CategoryResponseDto[];
  mapToPaginatedResponse(categories: ServiceCategory[], total: number, page: number, limit: number): PaginatedCategoriesResponseDto;
}
