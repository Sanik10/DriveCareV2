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

  /**
   * 🔒 КРИТИЧНО: Проверка принадлежности категории компании (или глобальная)
   */
  async validateCategoryOwnership(categoryId: string, companyId: string): Promise<ServiceCategory> {
    const category = await this.categoryRepository.findOne({
      where: { id: categoryId }
    });

    if (!category) {
      throw new ServiceCategoryNotFoundException(categoryId);
    }

    // 🔥 Глобальные категории (companyId === null) доступны всем
    if (category.companyId !== null && category.companyId !== companyId) {
      throw new ResourceOwnershipException('service-category', categoryId);
    }

    return category;
  }

  /**
   * ✅ Валидация данных при создании категории
   */
  async validateCreateCategoryData(dto: CreateCategoryDto, companyId: string): Promise<void> {
    // Проверяем уникальность названия в рамках компании
    await this.validateCategoryNameUniqueness(dto.name, companyId);

    // Дополнительные проверки
    this.validateCategoryBusinessRules(dto);
  }

  /**
   * ✅ Валидация данных при обновлении категории
   */
  async validateUpdateCategoryData(
    categoryId: string, 
    dto: UpdateCategoryDto, 
    companyId: string
  ): Promise<ServiceCategory> {
    // Проверяем права доступа к категории
    const category = await this.validateCategoryOwnership(categoryId, companyId);

    // Нельзя изменять глобальные категории
    if (category.companyId === null) {
      throw new ValidationDataException('category', 'Глобальные категории нельзя изменять');
    }

    // Если изменяется название - проверяем уникальность
    if (dto.name && dto.name !== category.name) {
      await this.validateCategoryNameUniqueness(dto.name, companyId, categoryId);
    }

    // Валидация бизнес-правил
    this.validateCategoryBusinessRules(dto as CreateCategoryDto);

    return category;
  }

  /**
   * 🗑️ Проверка возможности удаления категории
   */
  async validateCategoryDeletion(categoryId: string, companyId: string): Promise<void> {
    const category = await this.validateCategoryOwnership(categoryId, companyId);

    // Нельзя удалять глобальные категории
    if (category.companyId === null) {
      throw new ValidationDataException('category', 'Глобальные категории нельзя удалять');
    }

    // Проверяем, используется ли категория в услугах
    const servicesCount = await this.serviceRepository.count({
      where: { categoryId }
    });

    if (servicesCount > 0) {
      throw new ServiceCategoryInUseException(categoryId);
    }
  }

  /**
   * 🔒 Проверка уникальности названия категории в компании
   */
  private async validateCategoryNameUniqueness(
    name: string, 
    companyId: string, 
    excludeCategoryId?: string
  ): Promise<void> {
    const query = this.categoryRepository.createQueryBuilder('category')
      .where('category.name = :name', { name })
      .andWhere(
        '(category.companyId = :companyId OR category.companyId IS NULL)', 
        { companyId }
      );

    if (excludeCategoryId) {
      query.andWhere('category.id != :excludeCategoryId', { excludeCategoryId });
    }

    const existingCategory = await query.getOne();

    if (existingCategory) {
      if (existingCategory.companyId === null) {
        throw new ValidationDataException(
          'name', 
          `Категория "${name}" уже существует как глобальная`
        );
      } else {
        throw new ValidationDataException(
          'name', 
          `Категория "${name}" уже существует в вашей компании`
        );
      }
    }
  }

  /**
   * ✅ Валидация бизнес-правил для категории
   */
  private validateCategoryBusinessRules(dto: CreateCategoryDto | UpdateCategoryDto): void {
    // Валидация названия
    if (dto.name !== undefined) {
      if (!dto.name || dto.name.trim().length === 0) {
        throw new ValidationDataException('name', 'Название категории не может быть пустым');
      }

      if (dto.name.length > 100) {
        throw new ValidationDataException('name', 'Название категории не может быть длиннее 100 символов');
      }
    }

    // Валидация описания
    if (dto.description !== undefined && dto.description.length > 500) {
      throw new ValidationDataException('description', 'Описание категории не может быть длиннее 500 символов');
    }
  }
}
