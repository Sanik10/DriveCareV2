// path: apps/backend/src/modules/services/services/services-business.service.ts
import { Injectable } from '@nestjs/common';
import { ServicesDataService } from './services-data.service';
import { ServicesValidationService } from './services-validation.service';
import { ServicesMapperService } from './services-mapper.service';
import { CreateServiceDto } from '../dto/request/create-service.dto';
import { UpdateServiceDto } from '../dto/request/update-service.dto';
import { ServiceResponseDto } from '../dto/response/service-response.dto';
import { PaginatedServicesResponseDto } from '../dto/response/paginated-services-response.dto';
import { ServicesFilter, UserWithCompany } from '../types/services.types';
import { SERVICES_CONSTANTS } from '../constants/services.constants';

@Injectable()
export class ServicesBusinessService {
  constructor(
    public readonly dataService: ServicesDataService,
    public readonly validationService: ServicesValidationService,
    public readonly mapperService: ServicesMapperService,
  ) {}

  async findAllForUser(user: UserWithCompany, filter: ServicesFilter): Promise<PaginatedServicesResponseDto> {
    if (!user.companyId) {
      throw new Error('Пользователь не принадлежит к компании');
    }
    const safeFilter = this.prepareSafeFilter(filter, user.companyId);
    this.validationService.validateServicesFilter(safeFilter);
    const [services, total] = await this.dataService.findWithFilters(safeFilter);
    return this.mapperService.mapToPaginatedResponse(
      services,
      total,
      safeFilter.page || 1,
      safeFilter.limit || SERVICES_CONSTANTS.DEFAULT_PAGE_SIZE,
    );
  }

  async findOneSecurely(serviceId: string, user: UserWithCompany): Promise<ServiceResponseDto> {
    if (!user.companyId) {
      throw new Error('Пользователь не принадлежит к компании');
    }
    const service = await this.validationService.validateServiceOwnership(serviceId, user.companyId);
    return this.mapperService.mapToResponseDto(service);
  }

  async findByCategory(categoryId: string, user: UserWithCompany): Promise<ServiceResponseDto[]> {
    if (!user.companyId) {
      throw new Error('Пользователь не принадлежит к компании');
    }
    await this.validationService.validateServiceCategoryOwnership(categoryId, user.companyId);
    const services = await this.dataService.findByCategory(categoryId, user.companyId);
    return this.mapperService.mapArrayToResponseDto(services);
  }

  async createService(dto: CreateServiceDto, user: UserWithCompany): Promise<ServiceResponseDto> {
    if (!user.companyId) {
      throw new Error('Пользователь не принадлежит к компании');
    }
    await this.validationService.validateCreateServiceData(dto, user.companyId);
    const service = await this.dataService.create(dto, user.companyId);
    return this.mapperService.mapToResponseDto(service);
  }

  async updateService(serviceId: string, dto: UpdateServiceDto, user: UserWithCompany): Promise<ServiceResponseDto> {
    if (!user.companyId) {
      throw new Error('Пользователь не принадлежит к компании');
    }
    await this.validationService.validateUpdateServiceData(serviceId, dto, user.companyId);
    const updatedService = await this.dataService.update(serviceId, dto);
    return this.mapperService.mapToResponseDto(updatedService);
  }

  async removeService(serviceId: string, user: UserWithCompany): Promise<void> {
    if (!user.companyId) {
      throw new Error('Пользователь не принадлежит к компании');
    }
    await this.validationService.validateServiceDeletion(serviceId, user.companyId);
    await this.dataService.remove(serviceId);
  }

  async toggleServiceStatus(serviceId: string, user: UserWithCompany): Promise<ServiceResponseDto> {
    if (!user.companyId) {
      throw new Error('Пользователь не принадлежит к компании');
    }
    await this.validationService.validateServiceOwnership(serviceId, user.companyId);
    const updatedService = await this.dataService.toggleStatus(serviceId);
    return this.mapperService.mapToResponseDto(updatedService);
  }

  async bulkUpdateServices(serviceIds: string[], updates: UpdateServiceDto, user: UserWithCompany) {
    if (!user.companyId) {
      throw new Error('Пользователь не принадлежит к компании');
    }
    await this.validationService.validateBulkServicesOwnership(serviceIds, user.companyId);
    const updatedCount = await this.dataService.bulkUpdate(serviceIds, updates);
    return this.mapperService.mapBulkOperationResult(updatedCount, serviceIds.length);
  }

  async getServicesStatistics(user: UserWithCompany): Promise<any> {
    if (!user.companyId) {
      throw new Error('Пользователь не принадлежит к компании');
    }
    const stats = await this.dataService.getServicesStats(user.companyId);
    return this.mapperService.mapStatsToResponse(stats);
  }

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

  async getActiveServicesQuick(
    user: UserWithCompany,
  ): Promise<Array<{ id: string; name: string; price: number; duration: number }>> {
    if (!user.companyId) {
      throw new Error('Пользователь не принадлежит к компании');
    }
    const services = await this.dataService.findActiveByCompany(user.companyId);
    return this.mapperService.mapToQuickListDto(services);
  }

  async getServicesForSelect(
    user: UserWithCompany,
  ): Promise<Array<{ value: string; label: string; disabled?: boolean; meta?: any }>> {
    if (!user.companyId) {
      throw new Error('Пользователь не принадлежит к компании');
    }
    const services = await this.dataService.findActiveByCompany(user.companyId);
    return this.mapperService.mapToSelectOptions(services);
  }

  async getServicesByPriceRange(minPrice: number, maxPrice: number, user: UserWithCompany): Promise<ServiceResponseDto[]> {
    if (!user.companyId) {
      throw new Error('Пользователь не принадлежит к компании');
    }
    if (minPrice < 0 || maxPrice < 0 || minPrice > maxPrice) {
      throw new Error('Некорректный ценовой диапазон');
    }
    const services = await this.dataService.findByPriceRange(user.companyId, minPrice, maxPrice);
    return this.mapperService.mapArrayToResponseDto(services);
  }

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

  async checkServiceAvailability(
    serviceId: string,
    user: UserWithCompany,
  ): Promise<{ available: boolean; service?: ServiceResponseDto; reason?: string }> {
    if (!user.companyId) {
      throw new Error('Пользователь не принадлежит к компании');
    }
    try {
      const service = await this.validationService.validateServiceAvailability(serviceId, user.companyId);
      return {
        available: true,
        service: this.mapperService.mapToResponseDto(service),
      };
    } catch (error: any) {
      return {
        available: false,
        reason: error.message,
      };
    }
  }

  private prepareSafeFilter(filter: ServicesFilter, companyId: string): ServicesFilter {
    const page = filter.page ? Math.max(1, parseInt(String(filter.page), 10)) : 1;
    const limit = filter.limit
      ? Math.min(SERVICES_CONSTANTS.MAX_PAGE_SIZE, Math.max(1, parseInt(String(filter.limit), 10)))
      : SERVICES_CONSTANTS.DEFAULT_PAGE_SIZE;

    const coerceNumber = (v: any): number | undefined => {
      if (v === undefined || v === null || v === '') return undefined;
      const n = typeof v === 'number' ? v : parseFloat(String(v));
      return Number.isFinite(n) ? n : undefined;
    };

    const coerceBoolean = (v: any): boolean | undefined => {
      if (v === undefined || v === null || v === '') return undefined;
      if (typeof v === 'boolean') return v;
      const s = String(v).toLowerCase();
      if (s === 'true') return true;
      if (s === 'false') return false;
      return undefined;
    };

    const allowedSortBy: ServicesFilter['sortBy'][] = ['name', 'price', 'durationMinutes', 'createdAt', 'updatedAt'];
    const allowedSortOrder: ServicesFilter['sortOrder'][] = ['ASC', 'DESC'];

    const sortBy = allowedSortBy.includes(filter.sortBy as any) ? filter.sortBy : SERVICES_CONSTANTS.DEFAULT_SORT_BY;
    const sortOrder = allowedSortOrder.includes(filter.sortOrder as any)
      ? filter.sortOrder
      : SERVICES_CONSTANTS.DEFAULT_SORT_ORDER;

    return {
      ...filter,
      companyId,
      page,
      limit,
      offset: (page - 1) * limit,
      isActive: coerceBoolean(filter.isActive),
      minPrice: coerceNumber(filter.minPrice),
      maxPrice: coerceNumber(filter.maxPrice),
      minDuration: coerceNumber(filter.minDuration),
      maxDuration: coerceNumber(filter.maxDuration),
      sortBy,
      sortOrder,
    };
  }
}
