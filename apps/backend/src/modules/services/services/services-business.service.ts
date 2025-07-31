import { Injectable } from '@nestjs/common';
import { ServicesDataService } from './services-data.service';
import { ServicesValidationService } from './services-validation.service';
import { ServicesMapperService } from './services-mapper.service';
import { Service } from '../../../database/entities';
import { CreateServiceDto } from '../dto/request/create-service.dto';
import { UpdateServiceDto } from '../dto/request/update-service.dto';
import { ServiceResponseDto } from '../dto/response/service-response.dto';
import { PaginatedServicesResponseDto } from '../dto/response/paginated-services-response.dto';
import { ServicesFilter, ServiceStats, BulkUpdateResult, UserWithCompany } from '../types/services.types';
import { SERVICES_CONSTANTS } from '../constants/services.constants';

@Injectable()
export class ServicesBusinessService {
  constructor(
    // 🔥 ИСПРАВЛЕНО: Делаем поля public для доступа из main сервиса
    public readonly dataService: ServicesDataService,
    public readonly validationService: ServicesValidationService,
    public readonly mapperService: ServicesMapperService,
  ) {}

  /**
   * 🔒 Получение всех услуг пользователя с пагинацией и фильтрацией
   */
  async findAllForUser(user: UserWithCompany, filter: ServicesFilter): Promise<PaginatedServicesResponseDto> {
    // 🔒 КРИТИЧНО: Всегда фильтруем по companyId пользователя
    if (!user.companyId) {
      throw new Error('Пользователь не принадлежит к компании');
    }

    // Подготавливаем фильтр с безопасными значениями
    const safeFilter = this.prepareSafeFilter(filter, user.companyId);

    // Валидируем фильтр
    this.validationService.validateServicesFilter(safeFilter);

    // Получаем данные
    const [services, total] = await this.dataService.findWithFilters(safeFilter);

    // Возвращаем маппированный результат
    return this.mapperService.mapToPaginatedResponse(
      services,
      total,
      safeFilter.page || 1,
      safeFilter.limit || SERVICES_CONSTANTS.DEFAULT_PAGE_SIZE
    );
  }

  /**
   * 🔒 Получение услуги по ID с проверкой прав доступа
   */
  async findOneSecurely(serviceId: string, user: UserWithCompany): Promise<ServiceResponseDto> {
    if (!user.companyId) {
      throw new Error('Пользователь не принадлежит к компании');
    }

    // Проверяем права доступа через ValidationService
    const service = await this.validationService.validateServiceOwnership(serviceId, user.companyId);

    return this.mapperService.mapToResponseDto(service);
  }

  /**
   * 🔒 Получение услуг по категории
   */
  async findByCategory(categoryId: string, user: UserWithCompany): Promise<ServiceResponseDto[]> {
    if (!user.companyId) {
      throw new Error('Пользователь не принадлежит к компании');
    }

    // Проверяем права доступа к категории
    await this.validationService.validateServiceCategoryOwnership(categoryId, user.companyId);

    // Получаем услуги
    const services = await this.dataService.findByCategory(categoryId, user.companyId);

    return this.mapperService.mapArrayToResponseDto(services);
  }

  /**
   * ➕ Создание новой услуги
   */
  async createService(dto: CreateServiceDto, user: UserWithCompany): Promise<ServiceResponseDto> {
    if (!user.companyId) {
      throw new Error('Пользователь не принадлежит к компании');
    }

    // Валидируем данные
    await this.validationService.validateCreateServiceData(dto, user.companyId);

    // Создаем услугу
    const service = await this.dataService.create(dto, user.companyId);

    // Логируем создание для audit
    console.log(`✅ Service created: ${service.id} by user ${user.id} in company ${user.companyId}`);

    return this.mapperService.mapToResponseDto(service);
  }

  /**
   * ✏️ Обновление услуги
   */
  async updateService(serviceId: string, dto: UpdateServiceDto, user: UserWithCompany): Promise<ServiceResponseDto> {
    if (!user.companyId) {
      throw new Error('Пользователь не принадлежит к компании');
    }

    // Валидируем права доступа и данные
    await this.validationService.validateUpdateServiceData(serviceId, dto, user.companyId);

    // Обновляем услугу
    const updatedService = await this.dataService.update(serviceId, dto);

    // Логируем обновление для audit
    console.log(`✅ Service updated: ${serviceId} by user ${user.id} in company ${user.companyId}`);

    return this.mapperService.mapToResponseDto(updatedService);
  }

  /**
   * 🗑️ Удаление услуги
   */
  async removeService(serviceId: string, user: UserWithCompany): Promise<void> {
    if (!user.companyId) {
      throw new Error('Пользователь не принадлежит к компании');
    }

    // Проверяем возможность удаления
    await this.validationService.validateServiceDeletion(serviceId, user.companyId);

    // Удаляем услугу
    await this.dataService.remove(serviceId);

    // Логируем удаление для audit
    console.log(`🗑️ Service deleted: ${serviceId} by user ${user.id} in company ${user.companyId}`);
  }

  /**
   * 🔄 Переключение статуса услуги
   */
  async toggleServiceStatus(serviceId: string, user: UserWithCompany): Promise<ServiceResponseDto> {
    if (!user.companyId) {
      throw new Error('Пользователь не принадлежит к компании');
    }

    // Проверяем права доступа
    await this.validationService.validateServiceOwnership(serviceId, user.companyId);

    // Переключаем статус
    const updatedService = await this.dataService.toggleStatus(serviceId);

    // Логируем изменение статуса для audit
    console.log(`🔄 Service status toggled: ${serviceId} -> ${updatedService.isActive} by user ${user.id}`);

    return this.mapperService.mapToResponseDto(updatedService);
  }

  /**
   * 🔥 Массовое обновление услуг
   */
  async bulkUpdateServices(
    serviceIds: string[], 
    updates: UpdateServiceDto, 
    user: UserWithCompany
  ): Promise<BulkUpdateResult> {
    if (!user.companyId) {
      throw new Error('Пользователь не принадлежит к компании');
    }

    // Валидируем права доступа ко всем услугам
    await this.validationService.validateBulkServicesOwnership(serviceIds, user.companyId);

    // Выполняем массовое обновление
    const updatedCount = await this.dataService.bulkUpdate(serviceIds, updates);

    // Логируем bulk операцию для audit
    console.log(`🔥 Bulk update: ${updatedCount}/${serviceIds.length} services updated by user ${user.id}`);

    return this.mapperService.mapBulkOperationResult(updatedCount, serviceIds.length);
  }

  /**
   * 📊 Получение статистики услуг
   */
  async getServicesStatistics(user: UserWithCompany): Promise<any> {
    if (!user.companyId) {
      throw new Error('Пользователь не принадлежит к компании');
    }

    const stats = await this.dataService.getServicesStats(user.companyId);

    return this.mapperService.mapStatsToResponse(stats);
  }

  /**
   * 🔍 Поиск услуг по названию
   */
  async searchServices(query: string, user: UserWithCompany): Promise<ServiceResponseDto[]> {
    if (!user.companyId) {
      throw new Error('Пользователь не принадлежит к компании');
    }

    if (!query || query.trim().length < 2) {
      throw new Error('Поисковый запрос должен содержать минимум 2 символа');
    }

    const services = await this.dataService.searchByName(query.trim(), user.companyId);

    return this.mapperService.mapArrayToResponseDto(services);
  }

  /**
   * 🔥 Получение активных услуг для быстрого доступа
   */
  async getActiveServicesQuick(user: UserWithCompany): Promise<Array<{
    id: string;
    name: string;
    price: number;
    duration: number;
  }>> {
    if (!user.companyId) {
      throw new Error('Пользователь не принадлежит к компании');
    }

    const services = await this.dataService.findActiveByCompany(user.companyId);

    return this.mapperService.mapToQuickListDto(services);
  }

  /**
   * 📱 Получение услуг для dropdown/select
   */
  async getServicesForSelect(user: UserWithCompany): Promise<Array<{
    value: string;
    label: string;
    disabled?: boolean;
    meta?: any;
  }>> {
    if (!user.companyId) {
      throw new Error('Пользователь не принадлежит к компании');
    }

    const services = await this.dataService.findActiveByCompany(user.companyId);

    return this.mapperService.mapToSelectOptions(services);
  }

  /**
   * 💰 Получение услуг в ценовом диапазоне
   */
  async getServicesByPriceRange(
    minPrice: number,
    maxPrice: number,
    user: UserWithCompany
  ): Promise<ServiceResponseDto[]> {
    if (!user.companyId) {
      throw new Error('Пользователь не принадлежит к компании');
    }

    if (minPrice < 0 || maxPrice < 0 || minPrice > maxPrice) {
      throw new Error('Некорректный ценовой диапазон');
    }

    const services = await this.dataService.findByPriceRange(user.companyId, minPrice, maxPrice);

    return this.mapperService.mapArrayToResponseDto(services);
  }

  /**
   * ⏱️ Получение быстрых услуг (до указанного времени)
   */
  async getQuickServices(maxDurationMinutes: number, user: UserWithCompany): Promise<ServiceResponseDto[]> {
    if (!user.companyId) {
      throw new Error('Пользователь не принадлежит к компании');
    }

    if (maxDurationMinutes <= 0 || maxDurationMinutes > SERVICES_CONSTANTS.MAX_DURATION_MINUTES) {
      throw new Error('Некорректная длительность');
    }

    const services = await this.dataService.findByDuration(user.companyId, maxDurationMinutes);

    return this.mapperService.mapArrayToResponseDto(services);
  }

  /**
   * 🔒 Подготовка безопасного фильтра с принудительной установкой companyId
   */
  private prepareSafeFilter(filter: ServicesFilter, companyId: string): ServicesFilter {
    const page = filter.page ? Math.max(1, parseInt(String(filter.page))) : 1;
    const limit = filter.limit ? 
      Math.min(SERVICES_CONSTANTS.MAX_PAGE_SIZE, Math.max(1, parseInt(String(filter.limit)))) : 
      SERVICES_CONSTANTS.DEFAULT_PAGE_SIZE;

    return {
      ...filter,
      companyId, // 🔒 ПРИНУДИТЕЛЬНО устанавливаем companyId
      page,
      limit,
      offset: (page - 1) * limit,
    };
  }

  /**
   * 🔥 Проверка доступности услуги для заказа
   */
  async checkServiceAvailability(serviceId: string, user: UserWithCompany): Promise<{
    available: boolean;
    service?: ServiceResponseDto;
    reason?: string;
  }> {
    if (!user.companyId) {
      throw new Error('Пользователь не принадлежит к компании');
    }

    try {
      const service = await this.validationService.validateServiceAvailability(serviceId, user.companyId);
      
      return {
        available: true,
        service: this.mapperService.mapToResponseDto(service),
      };
    } catch (error) {
      return {
        available: false,
        reason: error.message,
      };
    }
  }
}
