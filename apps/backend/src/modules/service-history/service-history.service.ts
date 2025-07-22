import { Injectable, Logger } from '@nestjs/common';
import { ServiceHistoryDataService } from './services/service-history-data.service';
import { ServiceHistoryBusinessService } from './services/service-history-business.service';
import { ServiceHistoryValidationService } from './services/service-history-validation.service';
import { ServiceHistoryMapperService } from './services/service-history-mapper.service';
import { CreateServiceHistoryDto } from './dto/request/create-service-history.dto';
import { UpdateServiceHistoryDto } from './dto/request/update-service-history.dto';
import { ServiceHistoryResponseDto } from './dto/response/service-history-response.dto';
import { PaginatedServiceHistoryResponseDto } from './dto/response/paginated-service-history-response.dto';
import { ServiceHistoryFilter, CreateServiceHistoryData, ServiceHistoryStats } from './types/service-history.types';
import { RequestWithUser } from '../auth/interfaces/request-with-user.interface';

@Injectable()
export class ServiceHistoryService {
  private readonly logger = new Logger(ServiceHistoryService.name);

  constructor(
    private readonly serviceHistoryDataService: ServiceHistoryDataService,
    private readonly serviceHistoryBusinessService: ServiceHistoryBusinessService,
    private readonly serviceHistoryValidationService: ServiceHistoryValidationService,
    private readonly serviceHistoryMapperService: ServiceHistoryMapperService,
  ) {}

  async createForUser(createServiceHistoryDto: CreateServiceHistoryDto, user: RequestWithUser['user']): Promise<ServiceHistoryResponseDto> {
    // 🔒 КРИТИЧНО: companyId определяется через vehicle ownership
    const vehicleOwnership = await this.serviceHistoryValidationService.validateVehicleOwnership(
      createServiceHistoryDto.vehicleId, 
      user.companyId!
    );
    
    const serviceHistoryData: CreateServiceHistoryData = {
      ...createServiceHistoryDto,
      companyId: vehicleOwnership.companyId, // 🔒 Из владения автомобилем
      date: new Date(createServiceHistoryDto.date),
      nextServiceDate: createServiceHistoryDto.nextServiceDate ? new Date(createServiceHistoryDto.nextServiceDate) : undefined,
    };
    
    const serviceHistory = await this.serviceHistoryBusinessService.createServiceHistory(serviceHistoryData);
    return this.serviceHistoryMapperService.mapToResponseDto(serviceHistory);
  }

  async findAll(filter: ServiceHistoryFilter): Promise<PaginatedServiceHistoryResponseDto> {
    const [serviceHistories, total] = await this.serviceHistoryDataService.findWithFilters(filter);
    
    const items = this.serviceHistoryMapperService.mapArrayToResponseDto(serviceHistories);

    const totalPages = Math.ceil(total / (filter.limit || 20));
    const page = filter.page || 1;

    return {
      items,
      total,
      page,
      limit: filter.limit || 20,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  async findAllForUser(user: RequestWithUser['user'], filter: Partial<ServiceHistoryFilter> = {}): Promise<PaginatedServiceHistoryResponseDto> {
    const userFilter: ServiceHistoryFilter = {
      ...filter,
      // 🔒 КРИТИЧНО: Суперадмин видит все, остальные - только свои
      companyId: user.role === 'superadmin' ? filter.companyId : user.companyId,
    };

    const result = await this.findAll(userFilter);
    
    // Добавляем мета-информацию для UI
    if (userFilter.companyId) {
      const stats = await this.serviceHistoryDataService.getStats(userFilter.companyId);
      result.meta = {
        totalRecords: stats.totalRecords,
        upcomingServices: stats.upcomingServices,
        overdueServices: stats.overdueServices,
        averageServiceInterval: stats.averageServiceInterval,
      };
    }

    return result;
  }

  async findOne(id: string): Promise<ServiceHistoryResponseDto> {
    const serviceHistory = await this.serviceHistoryValidationService.validateServiceHistoryExists(id);
    return this.serviceHistoryMapperService.mapToResponseDto(serviceHistory);
  }

  async update(id: string, updateServiceHistoryDto: UpdateServiceHistoryDto): Promise<ServiceHistoryResponseDto> {
    const updateData = {
      ...updateServiceHistoryDto,
      date: updateServiceHistoryDto.date ? new Date(updateServiceHistoryDto.date) : undefined,
      nextServiceDate: updateServiceHistoryDto.nextServiceDate ? new Date(updateServiceHistoryDto.nextServiceDate) : undefined,
    };

    const serviceHistory = await this.serviceHistoryBusinessService.updateServiceHistory(id, updateData);
    return this.serviceHistoryMapperService.mapToResponseDto(serviceHistory);
  }

  async remove(id: string): Promise<void> {
    await this.serviceHistoryBusinessService.deactivateServiceHistory(id);
  }

  async hardRemove(id: string): Promise<void> {
    const serviceHistory = await this.serviceHistoryValidationService.validateServiceHistoryExists(id);
    await this.serviceHistoryDataService.hardDelete(id);
  }

  async getStats(companyId: string): Promise<ServiceHistoryStats> {
    return this.serviceHistoryDataService.getStats(companyId);
  }

  async getServiceHistoryByVehicle(vehicleId: string, user: RequestWithUser['user']): Promise<ServiceHistoryResponseDto[]> {
    // 🔒 Проверяем что vehicle принадлежит компании пользователя
    await this.serviceHistoryValidationService.validateVehicleOwnership(vehicleId, user.companyId!);
    
    const filter: ServiceHistoryFilter = {
      vehicleId,
      companyId: user.companyId!,
    };

    const [serviceHistories] = await this.serviceHistoryDataService.findWithFilters(filter);
    return this.serviceHistoryMapperService.mapArrayToResponseDto(serviceHistories);
  }
}
