// path: apps/backend/src/modules/services/categories/services/categories-validation.service.ts
import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ServiceCategory, Service } from '../../../../database/entities';
import {
  ServiceCategoryNotFoundException,
  ResourceOwnershipException,
  ValidationDataException,
  ServiceCategoryInUseException,
} from '../../../../common/exceptions/domain.exceptions';
import { CreateCategoryDto } from '../dto/request/create-category.dto';
import { UpdateCategoryDto } from '../dto/request/update-category.dto';

@Injectable()
export class CategoriesValidationService {
  constructor(
    @InjectRepository(ServiceCategory)
    private readonly categoryRepository: Repository<ServiceCategory>,
    @InjectRepository(Service)
    private readonly serviceRepository: Repository<Service>,
  ) {}

  async validateCategoryOwnership(categoryId: string, companyId: string): Promise<ServiceCategory> {
    const category = await this.categoryRepository.findOne({ where: { id: categoryId } });
    if (!category) {
      throw new ServiceCategoryNotFoundException(categoryId);
    }
    if (category.companyId !== null && category.companyId !== companyId) {
      throw new ResourceOwnershipException('service-category', categoryId);
    }
    return category;
  }

  async validateCreateCategoryData(dto: CreateCategoryDto, companyId: string): Promise<void> {
    await this.validateCategoryNameUniqueness(dto.name, companyId);
    this.validateCategoryBusinessRules(dto);
  }

  async validateUpdateCategoryData(categoryId: string, dto: UpdateCategoryDto, companyId: string): Promise<ServiceCategory> {
    const category = await this.validateCategoryOwnership(categoryId, companyId);
    if (category.companyId === null) {
      throw new ValidationDataException('category', 'Глобальные категории нельзя изменять');
    }
    if (dto.name && dto.name !== category.name) {
      await this.validateCategoryNameUniqueness(dto.name, companyId, categoryId);
    }
    this.validateCategoryBusinessRules(dto as CreateCategoryDto);
    return category;
  }

  async validateCategoryDeletion(categoryId: string, companyId: string): Promise<void> {
    const category = await this.validateCategoryOwnership(categoryId, companyId);
    if (category.companyId === null) {
      throw new ValidationDataException('category', 'Глобальные категории нельзя удалять');
    }
    const servicesCount = await this.serviceRepository.count({ where: { categoryId } });
    if (servicesCount > 0) {
      throw new ServiceCategoryInUseException(categoryId);
    }
  }

  private async validateCategoryNameUniqueness(name: string, companyId: string, excludeCategoryId?: string): Promise<void> {
    const query = this.categoryRepository
      .createQueryBuilder('category')
      .where('category.name = :name', { name })
      .andWhere('(category.companyId = :companyId OR category.companyId IS NULL)', { companyId });

    if (excludeCategoryId) {
      query.andWhere('category.id != :excludeCategoryId', { excludeCategoryId });
    }

    const existingCategory = await query.getOne();
    if (existingCategory) {
      if (existingCategory.companyId === null) {
        throw new ValidationDataException('name', `Категория "${name}" уже существует как глобальная`);
      } else {
        throw new ValidationDataException('name', `Категория "${name}" уже существует в вашей компании`);
      }
    }
  }

  private validateCategoryBusinessRules(dto: CreateCategoryDto | UpdateCategoryDto): void {
    if (dto.name !== undefined) {
      if (!dto.name || dto.name.trim().length === 0) {
        throw new ValidationDataException('name', 'Название категории не может быть пустым');
      }
      if (dto.name.length > 100) {
        throw new ValidationDataException('name', 'Название категории не может быть длиннее 100 символов');
      }
    }
    if (dto.description !== undefined && dto.description.length > 500) {
      throw new ValidationDataException('description', 'Описание категории не может быть длиннее 500 символов');
    }
  }

  validateCategoriesFilter(filter: any): void {
    if (filter.page !== undefined) {
      const page = parseInt(String(filter.page), 10);
      if (isNaN(page) || page < 1) {
        throw new ValidationDataException('page', 'Номер страницы должен быть положительным числом');
      }
    }
    if (filter.limit !== undefined) {
      const limit = parseInt(String(filter.limit), 10);
      if (isNaN(limit) || limit < 1 || limit > 100) {
        throw new ValidationDataException('limit', 'Размер страницы должен быть от 1 до 100');
      }
    }

    const allowedSortBy = ['name', 'createdAt', 'updatedAt'];
    const allowedSortOrder = ['ASC', 'DESC'];

    if (filter.sortBy !== undefined && !allowedSortBy.includes(String(filter.sortBy))) {
      throw new ValidationDataException('sortBy', `Недопустимое поле сортировки: ${filter.sortBy}`);
    }
    if (filter.sortOrder !== undefined && !allowedSortOrder.includes(String(filter.sortOrder).toUpperCase())) {
      throw new ValidationDataException('sortOrder', `Недопустимое направление сортировки: ${filter.sortOrder}`);
    }
  }
}
