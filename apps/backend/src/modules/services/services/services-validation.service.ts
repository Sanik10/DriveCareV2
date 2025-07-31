import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Service, ServiceCategory } from '../../../database/entities';
import { 
  ServiceNotFoundException,
  ServiceCategoryNotFoundException,
  ResourceOwnershipException,
  ServiceNotAvailableException,
  ValidationDataException,
} from '../../../common/exceptions/domain.exceptions';
import { CreateServiceDto } from '../dto/request/create-service.dto';
import { UpdateServiceDto } from '../dto/request/update-service.dto';
import { SERVICES_CONSTANTS } from '../constants/services.constants';

@Injectable()
export class ServicesValidationService {
  constructor(
    @InjectRepository(Service)
    private readonly serviceRepository: Repository<Service>,
    @InjectRepository(ServiceCategory)
    private readonly categoryRepository: Repository<ServiceCategory>,
  ) {}

  /**
   * 🔒 КРИТИЧНО: Проверка принадлежности услуги компании
   * Используется в CompanyOwnershipGuard
   */
  async validateServiceOwnership(serviceId: string, companyId: string): Promise<Service> {
    const service = await this.serviceRepository.findOne({
      where: { id: serviceId }
    });

    if (!service) {
      throw new ServiceNotFoundException(serviceId);
    }

    if (service.companyId !== companyId) {
      throw new ResourceOwnershipException('service', serviceId);
    }

    return service;
  }

  /**
   * 🔒 КРИТИЧНО: Проверка принадлежности категории компании (или глобальная)
   * Используется в CompanyOwnershipGuard
   */
  async validateServiceCategoryOwnership(categoryId: string, companyId: string): Promise<ServiceCategory> {
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
   * ✅ Валидация данных при создании услуги
   */
  async validateCreateServiceData(dto: CreateServiceDto, companyId: string): Promise<void> {
    // 1. Проверяем существование категории и права доступа
    await this.validateServiceCategoryOwnership(dto.categoryId, companyId);

    // 2. Проверяем уникальность названия в рамках компании
    await this.validateServiceNameUniqueness(dto.name, companyId);

    // 3. Валидация бизнес-правил
    this.validateServiceBusinessRules(dto);
  }

  /**
   * ✅ Валидация данных при обновлении услуги
   */
  async validateUpdateServiceData(
    serviceId: string, 
    dto: UpdateServiceDto, 
    companyId: string
  ): Promise<Service> {
    // 1. Проверяем права доступа к услуге
    const service = await this.validateServiceOwnership(serviceId, companyId);

    // 2. Если изменяется категория - проверяем права доступа
    if (dto.categoryId && dto.categoryId !== service.categoryId) {
      await this.validateServiceCategoryOwnership(dto.categoryId, companyId);
    }

    // 3. Если изменяется название - проверяем уникальность
    if (dto.name && dto.name !== service.name) {
      await this.validateServiceNameUniqueness(dto.name, companyId, serviceId);
    }

    // 4. Валидация бизнес-правил
    if (dto.price !== undefined || dto.durationMinutes !== undefined) {
      this.validateServiceBusinessRules(dto as CreateServiceDto);
    }

    return service;
  }

  /**
   * 🔥 Проверка доступности услуги для заказа
   */
  async validateServiceAvailability(serviceId: string, companyId: string): Promise<Service> {
    const service = await this.validateServiceOwnership(serviceId, companyId);

    if (!service.isActive) {
      throw new ServiceNotAvailableException(serviceId);
    }

    return service;
  }

  /**
   * 🔥 Массовая валидация услуг для bulk операций
   */
  async validateBulkServicesOwnership(serviceIds: string[], companyId: string): Promise<Service[]> {
    if (!serviceIds || serviceIds.length === 0) {
      throw new ValidationDataException('serviceIds', 'Список ID услуг не может быть пустым');
    }

    if (serviceIds.length > 100) {
      throw new ValidationDataException('serviceIds', 'Максимальное количество услуг для массовой операции: 100');
    }

    const services = await this.serviceRepository.find({
      where: serviceIds.map(id => ({ id, companyId }))
    });

    if (services.length !== serviceIds.length) {
      const foundIds = services.map(s => s.id);
      const missingIds = serviceIds.filter(id => !foundIds.includes(id));
      throw new ValidationDataException(
        'serviceIds', 
        `Услуги не найдены или нет доступа: ${missingIds.join(', ')}`
      );
    }

    return services;
  }

  /**
   * 🔒 Проверка уникальности названия услуги в компании
   */
  private async validateServiceNameUniqueness(
    name: string, 
    companyId: string, 
    excludeServiceId?: string
  ): Promise<void> {
    const query = this.serviceRepository.createQueryBuilder('service')
      .where('service.name = :name', { name })
      .andWhere('service.companyId = :companyId', { companyId });

    if (excludeServiceId) {
      query.andWhere('service.id != :excludeServiceId', { excludeServiceId });
    }

    const existingService = await query.getOne();

    if (existingService) {
      throw new ValidationDataException(
        'name', 
        `Услуга с названием "${name}" уже существует в вашей компании`
      );
    }
  }

  /**
   * ✅ Валидация бизнес-правил для услуги
   */
  private validateServiceBusinessRules(dto: CreateServiceDto | UpdateServiceDto): void {
    // Валидация цены
    if (dto.price !== undefined) {
      if (dto.price <= 0) {
        throw new ValidationDataException('price', 'Цена услуги должна быть больше 0');
      }

      if (dto.price > SERVICES_CONSTANTS.MAX_SERVICE_PRICE) {
        throw new ValidationDataException(
          'price', 
          `Цена не может превышать ${SERVICES_CONSTANTS.MAX_SERVICE_PRICE}`
        );
      }
    }

    // Валидация длительности
    if (dto.durationMinutes !== undefined) {
      if (dto.durationMinutes <= 0) {
        throw new ValidationDataException('durationMinutes', 'Длительность услуги должна быть больше 0 минут');
      }

      if (dto.durationMinutes > SERVICES_CONSTANTS.MAX_DURATION_MINUTES) {
        throw new ValidationDataException(
          'durationMinutes', 
          `Длительность не может превышать ${SERVICES_CONSTANTS.MAX_DURATION_MINUTES} минут`
        );
      }
    }

    // Валидация названия
    if (dto.name !== undefined) {
      if (!dto.name || dto.name.trim().length === 0) {
        throw new ValidationDataException('name', 'Название услуги не может быть пустым');
      }

      if (dto.name.length > 255) {
        throw new ValidationDataException('name', 'Название услуги не может быть длиннее 255 символов');
      }
    }

    // Валидация описания
    if (dto.description !== undefined && dto.description.length > 1000) {
      throw new ValidationDataException('description', 'Описание услуги не может быть длиннее 1000 символов');
    }
  }

  /**
   * 🔥 Проверка возможности удаления услуги
   */
  async validateServiceDeletion(serviceId: string, companyId: string): Promise<void> {
    const service = await this.validateServiceOwnership(serviceId, companyId);

    // TODO: Добавить проверки на использование услуги в:
    // - Активных заказах
    // - Запланированных записях
    // - Шаблонах услуг
    
    // Пока что простая проверка - можно удалить только неактивные услуги
    if (service.isActive) {
      throw new ValidationDataException(
        'isActive', 
        'Нельзя удалить активную услугу. Сначала деактивируйте её.'
      );
    }
  }

  /**
   * 📊 Валидация фильтров для поиска услуг
   */
  validateServicesFilter(filter: any): void {
    if (filter.page !== undefined) {
      const page = parseInt(filter.page);
      if (isNaN(page) || page < 1) {
        throw new ValidationDataException('page', 'Номер страницы должен быть положительным числом');
      }
    }

    if (filter.limit !== undefined) {
      const limit = parseInt(filter.limit);
      if (isNaN(limit) || limit < 1 || limit > SERVICES_CONSTANTS.MAX_PAGE_SIZE) {
        throw new ValidationDataException(
          'limit', 
          `Размер страницы должен быть от 1 до ${SERVICES_CONSTANTS.MAX_PAGE_SIZE}`
        );
      }
    }

    if (filter.minPrice !== undefined && filter.maxPrice !== undefined) {
      if (filter.minPrice > filter.maxPrice) {
        throw new ValidationDataException('price', 'Минимальная цена не может быть больше максимальной');
      }
    }

    if (filter.minDuration !== undefined && filter.maxDuration !== undefined) {
      if (filter.minDuration > filter.maxDuration) {
        throw new ValidationDataException('duration', 'Минимальная длительность не может быть больше максимальной');
      }
    }
  }
}
