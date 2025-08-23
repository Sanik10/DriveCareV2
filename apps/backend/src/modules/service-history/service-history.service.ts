// path: apps/backend/src/modules/service-history/service-history.service.ts
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
import { AuditService, AuditAction } from '../../common/audit/audit.service';

@Injectable()
export class ServiceHistoryService {
  private readonly logger = new Logger(ServiceHistoryService.name);

  constructor(
    private readonly serviceHistoryDataService: ServiceHistoryDataService,
    private readonly serviceHistoryBusinessService: ServiceHistoryBusinessService,
    private readonly serviceHistoryValidationService: ServiceHistoryValidationService,
    private readonly serviceHistoryMapperService: ServiceHistoryMapperService,
    private readonly auditService: AuditService,
  ) {}

  async createForUser(createServiceHistoryDto: CreateServiceHistoryDto, user: RequestWithUser['user']): Promise<ServiceHistoryResponseDto> {
    const vehicleOwnership = await this.serviceHistoryValidationService.validateVehicleOwnership(createServiceHistoryDto.vehicleId, user.companyId!);

    const serviceHistoryData: CreateServiceHistoryData = {
      ...createServiceHistoryDto,
      companyId: vehicleOwnership.companyId,
      date: new Date(createServiceHistoryDto.date),
      nextServiceDate: createServiceHistoryDto.nextServiceDate ? new Date(createServiceHistoryDto.nextServiceDate) : undefined,
    };

    const serviceHistory = await this.serviceHistoryBusinessService.createServiceHistory(serviceHistoryData);

    await this.auditService.logServiceHistoryCreated({
      userId: user.id,
      companyId: vehicleOwnership.companyId,
      resourceType: 'service-history',
      resourceId: serviceHistory.id,
      details: this.serviceHistoryMapperService.mapToAuditData(serviceHistory),
    });

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
      companyId: user.role === 'superadmin' ? filter.companyId : user.companyId,
    };

    const result = await this.findAll(userFilter);

    if (userFilter.companyId) {
      const stats = await this.serviceHistoryDataService.getStats(userFilter.companyId);
      result.meta = {
        totalRecords: stats.totalRecords,
        upcomingServices: stats.upcomingServices,
        overdueServices: stats.overdueServices,
        averageServiceInterval: stats.averageServiceInterval,
      };
    }

    await this.auditService.logServiceHistoriesListed({
      userId: user.id,
      companyId: userFilter.companyId,
      resourceType: 'service-history',
      details: {
        filter: {
          hasNextService: userFilter.hasNextService,
          vehicleId: userFilter.vehicleId,
          customerId: userFilter.customerId,
          dateFrom: userFilter.dateFrom,
          dateTo: userFilter.dateTo,
          sortField: userFilter.sortField,
          sortOrder: userFilter.sortOrder,
          page: userFilter.page,
          limit: userFilter.limit,
        },
        total: result.total,
      },
    });

    return result;
  }

  async findOne(id: string): Promise<ServiceHistoryResponseDto> {
    const serviceHistory = await this.serviceHistoryValidationService.validateServiceHistoryExists(id);
    await this.auditService.logServiceHistoryViewed({
      companyId: serviceHistory.companyId,
      resourceType: 'service-history',
      resourceId: serviceHistory.id,
      details: this.serviceHistoryMapperService.mapToAuditData(serviceHistory),
    });
    return this.serviceHistoryMapperService.mapToResponseDto(serviceHistory);
  }

  async update(id: string, updateServiceHistoryDto: UpdateServiceHistoryDto): Promise<ServiceHistoryResponseDto> {
    const updateData = {
      ...updateServiceHistoryDto,
      date: updateServiceHistoryDto.date ? new Date(updateServiceHistoryDto.date) : undefined,
      nextServiceDate: updateServiceHistoryDto.nextServiceDate ? new Date(updateServiceHistoryDto.nextServiceDate) : undefined,
    };

    const serviceHistory = await this.serviceHistoryBusinessService.updateServiceHistory(id, updateData);

    await this.auditService.logServiceHistoryUpdated({
      companyId: serviceHistory.companyId,
      resourceType: 'service-history',
      resourceId: serviceHistory.id,
      details: this.serviceHistoryMapperService.mapToAuditData(serviceHistory),
    });

    return this.serviceHistoryMapperService.mapToResponseDto(serviceHistory);
  }

  async remove(id: string): Promise<void> {
    const sh = await this.serviceHistoryValidationService.validateServiceHistoryExists(id);
    await this.serviceHistoryBusinessService.deactivateServiceHistory(id);

    await this.auditService.logServiceHistoryDeactivated({
      companyId: sh.companyId,
      resourceType: 'service-history',
      resourceId: id,
      details: { id, vehicleId: sh.vehicleId },
    });
  }

  async hardRemove(id: string): Promise<void> {
    const serviceHistory = await this.serviceHistoryValidationService.validateServiceHistoryExists(id);
    await this.serviceHistoryDataService.hardDelete(id);

    await this.auditService.logServiceHistoryDeleted({
      companyId: serviceHistory.companyId,
      resourceType: 'service-history',
      resourceId: id,
      details: { id, vehicleId: serviceHistory.vehicleId },
    });
  }

  async getStats(companyId: string): Promise<ServiceHistoryStats> {
    const stats = await this.serviceHistoryDataService.getStats(companyId);

    await this.auditService.logServiceHistoryStatsViewed({
      companyId,
      resourceType: 'service-history',
      details: {
        totalRecords: stats.totalRecords,
        upcomingServices: stats.upcomingServices,
        overdueServices: stats.overdueServices,
      },
    });

    return stats;
  }

  async getServiceHistoryByVehicle(vehicleId: string, user: RequestWithUser['user']): Promise<ServiceHistoryResponseDto[]> {
    await this.serviceHistoryValidationService.validateVehicleOwnership(vehicleId, user.companyId!);
    const filter: ServiceHistoryFilter = {
      vehicleId,
      companyId: user.companyId!,
    };
    const [serviceHistories] = await this.serviceHistoryDataService.findWithFilters(filter);

    await this.auditService.logVehicleHistoryViewed({
      userId: user.id,
      companyId: user.companyId,
      resourceType: 'vehicle',
      resourceId: vehicleId,
      details: { count: serviceHistories.length },
    });

    return this.serviceHistoryMapperService.mapArrayToResponseDto(serviceHistories);
  }
}
