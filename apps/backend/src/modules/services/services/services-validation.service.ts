// path: apps/backend/src/modules/services/services/services-validation.service.ts
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

  async validateServiceOwnership(serviceId: string, companyId: string): Promise<Service> {
    const service = await this.serviceRepository.findOne({ where: { id: serviceId } });
    if (!service) {
      throw new ServiceNotFoundException(serviceId);
    }
    if (service.companyId !== companyId) {
      throw new ResourceOwnershipException('service', serviceId);
    }
    return service;
  }

  async validateServiceCategoryOwnership(categoryId: string, companyId: string): Promise<ServiceCategory> {
    const category = await this.categoryRepository.findOne({ where: { id: categoryId } });
    if (!category) {
      throw new ServiceCategoryNotFoundException(categoryId);
    }
    if (category.companyId !== null && category.companyId !== companyId) {
      throw new ResourceOwnershipException('service-category', categoryId);
    }
    return category;
  }

  async validateCreateServiceData(dto: CreateServiceDto, companyId: string): Promise<void> {
    await this.validateServiceCategoryOwnership(dto.categoryId, companyId);
    await this.validateServiceNameUniqueness(dto.name, companyId);
    this.validateServiceBusinessRules(dto);
  }

  async validateUpdateServiceData(serviceId: string, dto: UpdateServiceDto, companyId: string): Promise<Service> {
    const service = await this.validateServiceOwnership(serviceId, companyId);
    if (dto.categoryId && dto.categoryId !== service.categoryId) {
      await this.validateServiceCategoryOwnership(dto.categoryId, companyId);
    }
    if (dto.name && dto.name !== service.name) {
      await this.validateServiceNameUniqueness(dto.name, companyId, serviceId);
    }
    if (
      dto.price !== undefined ||
      dto.durationMinutes !== undefined ||
      dto.name !== undefined ||
      dto.description !== undefined
    ) {
      this.validateServiceBusinessRules(dto as CreateServiceDto);
    }
    return service;
  }

  async validateServiceAvailability(serviceId: string, companyId: string): Promise<Service> {
    const service = await this.validateServiceOwnership(serviceId, companyId);
    if (!service.isActive) {
      throw new ServiceNotAvailableException(serviceId);
    }
    return service;
  }

  async validateBulkServicesOwnership(serviceIds: string[], companyId: string): Promise<Service[]> {
    if (!serviceIds || serviceIds.length === 0) {
      throw new ValidationDataException('serviceIds', 'Список ID услуг не может быть пустым');
    }
    if (serviceIds.length > 100) {
      throw new ValidationDataException('serviceIds', 'Максимальное количество услуг для массовой операции: 100');
    }
    const services = await this.serviceRepository.find({
      where: serviceIds.map((id) => ({ id, companyId })),
    });
    if (services.length !== serviceIds.length) {
      const foundIds = services.map((s) => s.id);
      const missingIds = serviceIds.filter((id) => !foundIds.includes(id));
      throw new ValidationDataException('serviceIds', `Услуги не найдены или нет доступа: ${missingIds.join(', ')}`);
    }
    return services;
  }

  private async validateServiceNameUniqueness(name: string, companyId: string, excludeServiceId?: string): Promise<void> {
    const query = this.serviceRepository
      .createQueryBuilder('service')
      .where('service.name = :name', { name })
      .andWhere('service.companyId = :companyId', { companyId });
    if (excludeServiceId) {
      query.andWhere('service.id != :excludeServiceId', { excludeServiceId });
    }
    const existingService = await query.getOne();
    if (existingService) {
      throw new ValidationDataException('name', `Услуга с названием "${name}" уже существует в вашей компании`);
    }
  }

  private validateServiceBusinessRules(dto: CreateServiceDto | UpdateServiceDto): void {
    if (dto.price !== undefined) {
      if (dto.price <= 0) {
        throw new ValidationDataException('price', 'Цена услуги должна быть больше 0');
      }
      if (dto.price > SERVICES_CONSTANTS.MAX_SERVICE_PRICE) {
        throw new ValidationDataException('price', `Цена не может превышать ${SERVICES_CONSTANTS.MAX_SERVICE_PRICE}`);
      }
    }
    if (dto.durationMinutes !== undefined) {
      if (dto.durationMinutes <= 0) {
        throw new ValidationDataException('durationMinutes', 'Длительность услуги должна быть больше 0 минут');
      }
      if (dto.durationMinutes > SERVICES_CONSTANTS.MAX_DURATION_MINUTES) {
        throw new ValidationDataException(
          'durationMinutes',
          `Длительность не может превышать ${SERVICES_CONSTANTS.MAX_DURATION_MINUTES} минут`,
        );
      }
    }
    if (dto.name !== undefined) {
      if (!dto.name || dto.name.trim().length === 0) {
        throw new ValidationDataException('name', 'Название услуги не может быть пустым');
      }
      if (dto.name.length > 255) {
        throw new ValidationDataException('name', 'Название услуги не может быть длиннее 255 символов');
      }
    }
    if (dto.description !== undefined && dto.description.length > 1000) {
      throw new ValidationDataException('description', 'Описание услуги не может быть длиннее 1000 символов');
    }
  }

  validateServicesFilter(filter: any): void {
    if (filter.page !== undefined) {
      const page = parseInt(String(filter.page), 10);
      if (isNaN(page) || page < 1) {
        throw new ValidationDataException('page', 'Номер страницы должен быть положительным числом');
      }
    }
    if (filter.limit !== undefined) {
      const limit = parseInt(String(filter.limit), 10);
      if (isNaN(limit) || limit < 1 || limit > SERVICES_CONSTANTS.MAX_PAGE_SIZE) {
        throw new ValidationDataException('limit', `Размер страницы должен быть от 1 до ${SERVICES_CONSTANTS.MAX_PAGE_SIZE}`);
      }
    }

    const allowedSortBy = ['name', 'price', 'durationMinutes', 'createdAt', 'updatedAt'];
    const allowedSortOrder = ['ASC', 'DESC'];

    if (filter.sortBy !== undefined && !allowedSortBy.includes(String(filter.sortBy))) {
      throw new ValidationDataException('sortBy', `Недопустимое поле сортировки: ${filter.sortBy}`);
    }
    if (filter.sortOrder !== undefined && !allowedSortOrder.includes(String(filter.sortOrder).toUpperCase())) {
      throw new ValidationDataException('sortOrder', `Недопустимое направление сортировки: ${filter.sortOrder}`);
    }

    const n = (v: any) => (v === undefined || v === null || v === '' ? undefined : parseFloat(String(v)));

    const minPrice = n(filter.minPrice);
    const maxPrice = n(filter.maxPrice);
    const minDuration = n(filter.minDuration);
    const maxDuration = n(filter.maxDuration);

    if (minPrice !== undefined && isNaN(minPrice)) {
      throw new ValidationDataException('minPrice', 'Некорректное значение минимальной цены');
    }
    if (maxPrice !== undefined && isNaN(maxPrice)) {
      throw new ValidationDataException('maxPrice', 'Некорректное значение максимальной цены');
    }
    if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
      throw new ValidationDataException('price', 'Минимальная цена не может быть больше максимальной');
    }

    if (minDuration !== undefined && isNaN(minDuration)) {
      throw new ValidationDataException('minDuration', 'Некорректное значение минимальной длительности');
    }
    if (maxDuration !== undefined && isNaN(maxDuration)) {
      throw new ValidationDataException('maxDuration', 'Некорректное значение максимальной длительности');
    }
    if (minDuration !== undefined && maxDuration !== undefined && minDuration > maxDuration) {
      throw new ValidationDataException('duration', 'Минимальная длительность не может быть больше максимальной');
    }
  }

  async validateServiceDeletion(serviceId: string, companyId: string): Promise<void> {
    const service = await this.validateServiceOwnership(serviceId, companyId);
    // TODO: добавить проверки связей (активные заказы/запланированные записи и т.д.)
    if (service.isActive) {
      throw new ValidationDataException('isActive', 'Нельзя удалить активную услугу. Сначала деактивируйте её.');
    }
  }
}
