import { Injectable } from '@nestjs/common';
import { ServicesBusinessService } from './services/services-business.service';
import { CreateServiceDto } from './dto/request/create-service.dto';
import { UpdateServiceDto } from './dto/request/update-service.dto';
import { ServiceResponseDto } from './dto/response/service-response.dto';
import { PaginatedServicesResponseDto } from './dto/response/paginated-services-response.dto';
import { ServicesFilter, BulkUpdateResult, UserWithCompany } from './types/services.types';
import { IServicesService } from './interfaces/services.interface';

/**
 * 🎯 Главный сервис для работы с услугами
 * Используется в контроллере и служит основным интерфейсом
 * Делегирует всю логику в ServicesBusinessService
 */
@Injectable()
export class ServicesService implements IServicesService {
  constructor(
    private readonly businessService: ServicesBusinessService,
  ) {}

  /**
   * 🔒 Получение всех услуг пользователя
   */
  async findAllForUser(user: UserWithCompany, filter: ServicesFilter): Promise<PaginatedServicesResponseDto> {
    return this.businessService.findAllForUser(user, filter);
  }

  /**
   * 🔒 Получение услуги по ID
   */
  async findOne(id: string): Promise<ServiceResponseDto> {
    // Note: Право доступа проверяется через @ServiceResource() decorator
    // который вызывает CompanyOwnershipGuard -> ServicesValidationService
    const service = await this.businessService.dataService.findById(id);
    
    if (!service) {
      throw new Error(`Услуга с ID ${id} не найдена`);
    }

    return this.businessService.mapperService.mapToResponseDto(service);
  }

  /**
   * 🔒 Получение услуг по категории
   */
  async findByCategory(categoryId: string, user: UserWithCompany): Promise<ServiceResponseDto[]> {
    return this.businessService.findByCategory(categoryId, user);
  }

  /**
   * ➕ Создание новой услуги
   */
  async createForUser(dto: CreateServiceDto, user: UserWithCompany): Promise<ServiceResponseDto> {
    return this.businessService.createService(dto, user);
  }

  /**
   * ✏️ Обновление услуги
   */
  async update(id: string, dto: UpdateServiceDto): Promise<ServiceResponseDto> {
    // Note: Право доступа проверяется через @ServiceResource() decorator
    const updatedService = await this.businessService.dataService.update(id, dto);
    return this.businessService.mapperService.mapToResponseDto(updatedService);
  }

  /**
   * 🗑️ Удаление услуги
   */
  async remove(id: string): Promise<void> {
    // Note: Право доступа проверяется через @ServiceResource() decorator
    await this.businessService.dataService.remove(id);
  }

  /**
   * 🔄 Переключение статуса услуги
   */
  async toggleStatus(id: string): Promise<ServiceResponseDto> {
    // Note: Право доступа проверяется через @ServiceResource() decorator
    const updatedService = await this.businessService.dataService.toggleStatus(id);
    return this.businessService.mapperService.mapToResponseDto(updatedService);
  }

  /**
   * 🔥 Массовое обновление услуг
   */
  async bulkUpdate(
    serviceIds: string[], 
    updates: UpdateServiceDto, 
    user: UserWithCompany
  ): Promise<BulkUpdateResult> {
    return this.businessService.bulkUpdateServices(serviceIds, updates, user);
  }

  /**
   * 📊 Получение статистики услуг
   */
  async getStats(user: UserWithCompany): Promise<any> {
    return this.businessService.getServicesStatistics(user);
  }

  // ========== ДОПОЛНИТЕЛЬНЫЕ МЕТОДЫ ==========

  /**
   * 🔍 Поиск услуг
   */
  async search(query: string, user: UserWithCompany): Promise<ServiceResponseDto[]> {
    return this.businessService.searchServices(query, user);
  }

  /**
   * 🔥 Получение активных услуг для быстрого доступа
   */
  async getActiveQuick(user: UserWithCompany): Promise<Array<{
    id: string;
    name: string;
    price: number;
    duration: number;
  }>> {
    return this.businessService.getActiveServicesQuick(user);
  }

  /**
   * 📱 Получение услуг для dropdown/select
   */
  async getForSelect(user: UserWithCompany): Promise<Array<{
    value: string;
    label: string;
    disabled?: boolean;
    meta?: any;
  }>> {
    return this.businessService.getServicesForSelect(user);
  }

  /**
   * 💰 Получение услуг в ценовом диапазоне
   */
  async findByPriceRange(
    minPrice: number,
    maxPrice: number,
    user: UserWithCompany
  ): Promise<ServiceResponseDto[]> {
    return this.businessService.getServicesByPriceRange(minPrice, maxPrice, user);
  }

  /**
   * ⏱️ Получение быстрых услуг
   */
  async findQuickServices(maxDurationMinutes: number, user: UserWithCompany): Promise<ServiceResponseDto[]> {
    return this.businessService.getQuickServices(maxDurationMinutes, user);
  }

  /**
   * 🔥 Проверка доступности услуги
   */
  async checkAvailability(serviceId: string, user: UserWithCompany): Promise<{
    available: boolean;
    service?: ServiceResponseDto;
    reason?: string;
  }> {
    return this.businessService.checkServiceAvailability(serviceId, user);
  }

  // ========== МЕТОДЫ ДЛЯ ДРУГИХ МОДУЛЕЙ ==========

  /**
   * 🔗 Получение услуги для заказа (используется в Orders модуле)
   */
  async getServiceForOrder(serviceId: string, companyId: string): Promise<ServiceResponseDto> {
    const service = await this.businessService.validationService.validateServiceAvailability(serviceId, companyId);
    return this.businessService.mapperService.mapToResponseDto(service);
  }

  /**
   * 🔗 Получение нескольких услуг для заказа
   */
  async getServicesForOrder(serviceIds: string[], companyId: string): Promise<ServiceResponseDto[]> {
    const services = await this.businessService.validationService.validateBulkServicesOwnership(serviceIds, companyId);
    const availableServices = services.filter(service => service.isActive);
    
    return this.businessService.mapperService.mapArrayToResponseDto(availableServices);
  }

  /**
   * 🔗 Проверка существования услуги (для других модулей)
   */
  async existsInCompany(serviceId: string, companyId: string): Promise<boolean> {
    try {
      await this.businessService.validationService.validateServiceOwnership(serviceId, companyId);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 🔗 Получение общей стоимости услуг
   */
  async calculateTotalCost(serviceIds: string[], companyId: string): Promise<{
    totalCost: number;
    totalDuration: number;
    services: Array<{ id: string; name: string; price: number; duration: number }>;
  }> {
    const services = await this.getServicesForOrder(serviceIds, companyId);
    
    const totalCost = services.reduce((sum, service) => sum + service.price, 0);
    const totalDuration = services.reduce((sum, service) => sum + service.durationMinutes, 0);
    
    return {
      totalCost,
      totalDuration,
      services: services.map(service => ({
        id: service.id,
        name: service.name,
        price: service.price,
        duration: service.durationMinutes,
      })),
    };
  }
}
