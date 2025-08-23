// path: apps/backend/src/modules/services/services.service.ts
import { Injectable } from '@nestjs/common';
import { ServicesBusinessService } from './services/services-business.service';
import { CreateServiceDto } from './dto/request/create-service.dto';
import { UpdateServiceDto } from './dto/request/update-service.dto';
import { ServiceResponseDto } from './dto/response/service-response.dto';
import { PaginatedServicesResponseDto } from './dto/response/paginated-services-response.dto';
import { ServicesFilter, BulkUpdateResult, UserWithCompany } from './types/services.types';
import { IServicesService } from './interfaces/services.interface';
import { ServiceNotFoundException } from '../../common/exceptions/domain.exceptions';

@Injectable()
export class ServicesService implements IServicesService {
  constructor(private readonly businessService: ServicesBusinessService) {}

  async findAllForUser(user: UserWithCompany, filter: ServicesFilter): Promise<PaginatedServicesResponseDto> {
    return this.businessService.findAllForUser(user, filter);
  }

  async findOne(id: string): Promise<ServiceResponseDto> {
    const service = await this.businessService.dataService.findById(id);
    if (!service) {
      throw new ServiceNotFoundException(id);
    }
    return this.businessService.mapperService.mapToResponseDto(service);
  }

  async findByCategory(categoryId: string, user: UserWithCompany): Promise<ServiceResponseDto[]> {
    return this.businessService.findByCategory(categoryId, user);
  }

  async createForUser(dto: CreateServiceDto, user: UserWithCompany): Promise<ServiceResponseDto> {
    return this.businessService.createService(dto, user);
  }

  async update(id: string, dto: UpdateServiceDto, user: UserWithCompany): Promise<ServiceResponseDto> {
    return this.businessService.updateService(id, dto, user);
  }

  async remove(id: string, user: UserWithCompany): Promise<void> {
    await this.businessService.removeService(id, user);
  }

  async toggleStatus(id: string, user: UserWithCompany): Promise<ServiceResponseDto> {
    return this.businessService.toggleServiceStatus(id, user);
  }

  async bulkUpdate(serviceIds: string[], updates: UpdateServiceDto, user: UserWithCompany): Promise<BulkUpdateResult> {
    return this.businessService.bulkUpdateServices(serviceIds, updates, user);
  }

  async getStats(user: UserWithCompany): Promise<any> {
    return this.businessService.getServicesStatistics(user);
  }

  async search(query: string, user: UserWithCompany): Promise<ServiceResponseDto[]> {
    return this.businessService.searchServices(query, user);
  }

  async getActiveQuick(
    user: UserWithCompany,
  ): Promise<Array<{ id: string; name: string; price: number; duration: number }>> {
    return this.businessService.getActiveServicesQuick(user);
  }

  async getForSelect(
    user: UserWithCompany,
  ): Promise<Array<{ value: string; label: string; disabled?: boolean; meta?: any }>> {
    return this.businessService.getServicesForSelect(user);
  }

  async findByPriceRange(minPrice: number, maxPrice: number, user: UserWithCompany): Promise<ServiceResponseDto[]> {
    return this.businessService.getServicesByPriceRange(minPrice, maxPrice, user);
  }

  async findQuickServices(maxDurationMinutes: number, user: UserWithCompany): Promise<ServiceResponseDto[]> {
    return this.businessService.getQuickServices(maxDurationMinutes, user);
  }

  async checkAvailability(
    serviceId: string,
    user: UserWithCompany,
  ): Promise<{ available: boolean; service?: ServiceResponseDto; reason?: string }> {
    return this.businessService.checkServiceAvailability(serviceId, user);
  }

  async getServiceForOrder(serviceId: string, companyId: string): Promise<ServiceResponseDto> {
    const service = await this.businessService.validationService.validateServiceAvailability(serviceId, companyId);
    return this.businessService.mapperService.mapToResponseDto(service);
  }

  async getServicesForOrder(serviceIds: string[], companyId: string): Promise<ServiceResponseDto[]> {
    const services = await this.businessService.validationService.validateBulkServicesOwnership(serviceIds, companyId);
    const availableServices = services.filter((service) => service.isActive);
    return this.businessService.mapperService.mapArrayToResponseDto(availableServices);
  }

  async existsInCompany(serviceId: string, companyId: string): Promise<boolean> {
    try {
      await this.businessService.validationService.validateServiceOwnership(serviceId, companyId);
      return true;
    } catch {
      return false;
    }
  }

  async calculateTotalCost(
    serviceIds: string[],
    companyId: string,
  ): Promise<{
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
      services: services.map((service) => ({
        id: service.id,
        name: service.name,
        price: service.price,
        duration: service.durationMinutes,
      })),
    };
  }
}
