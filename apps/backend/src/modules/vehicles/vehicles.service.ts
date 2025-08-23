// path: apps/backend/src/modules/vehicles/vehicles.service.ts
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { VehiclesDataService } from './services/vehicles-data.service';
import { VehiclesBusinessService } from './services/vehicles-business.service';
import { VehiclesValidationService } from './services/vehicles-validation.service';
import { VehiclesMapperService } from './services/vehicles-mapper.service';
import { CreateVehicleDto } from './dto/request/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/request/update-vehicle.dto';
import { VehicleResponseDto } from './dto/response/vehicle-response.dto';
import { PaginatedVehiclesResponseDto } from './dto/response/paginated-vehicles-response.dto';
import { VehicleFilter, CreateVehicleData, VehicleStats } from './types/vehicles.types';
import { RequestWithUser } from '../auth/interfaces/request-with-user.interface';
import { AuditService } from '../../common/audit/audit.service';

@Injectable()
export class VehiclesService {
  private readonly logger = new Logger(VehiclesService.name);

  constructor(
    private readonly vehiclesDataService: VehiclesDataService,
    private readonly vehiclesBusinessService: VehiclesBusinessService,
    private readonly vehiclesValidationService: VehiclesValidationService,
    private readonly vehiclesMapperService: VehiclesMapperService,
    private readonly auditService: AuditService,
  ) {}

  async create(createVehicleDto: CreateVehicleDto): Promise<VehicleResponseDto> {
    throw new Error('Direct create method not allowed. Use createForUser instead for security.');
  }

  async createForUser(createVehicleDto: CreateVehicleDto, user: RequestWithUser['user']): Promise<VehicleResponseDto> {
    await this.vehiclesValidationService.validateCustomerOwnership(createVehicleDto.customerId, user.companyId!);

    const vehicleData: CreateVehicleData = {
      ...createVehicleDto,
      companyId: user.companyId!,
    };

    const vehicle = await this.vehiclesBusinessService.createVehicle(vehicleData);
    return this.vehiclesMapperService.mapToResponseDto(vehicle);
  }

  // Базовая реализация (без учёта роли) — оставляем для внутренних вызовов при необходимости
  async findAll(filter: VehicleFilter): Promise<PaginatedVehiclesResponseDto> {
    const [vehicles, total] = await this.vehiclesDataService.findWithFilters(filter);

    const items = vehicles.map((vehicle) => this.vehiclesMapperService.mapToResponseDto(vehicle));

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

  // User-aware: листинги с учётом роли (механики/диагносты получают маскированный ответ)
  async findAllForUser(user: RequestWithUser['user'], filter: Partial<VehicleFilter> = {}): Promise<PaginatedVehiclesResponseDto> {
    if (user.role === 'superadmin' && !filter.companyId) {
      throw new BadRequestException('companyId is required for superadmin listings');
    }

    const userFilter: VehicleFilter = {
      ...filter,
      companyId: user.role === 'superadmin' ? filter.companyId : user.companyId,
    } as VehicleFilter;

    const [vehicles, total] = await this.vehiclesDataService.findWithFilters(userFilter);

    const lowPIIRoles = new Set(['mechanic', 'diagnostic']);
    const items = lowPIIRoles.has(user.role as string)
      ? this.vehiclesMapperService.mapArrayToResponseDtoForRole(vehicles, user.role as any)
      : this.vehiclesMapperService.mapArrayToResponseDto(vehicles);

    const totalPages = Math.ceil(total / (userFilter.limit || 20));
    const page = userFilter.page || 1;

    const response: PaginatedVehiclesResponseDto = {
      items,
      total,
      page,
      limit: userFilter.limit || 20,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };

    if (userFilter.companyId) {
      const stats = await this.vehiclesDataService.getStats(userFilter.companyId);
      response.meta = {
        totalByEngineType: stats.totalByEngineType,
        averageMileage: stats.averageMileage,
        vehiclesNeedingService: stats.vehiclesNeedingService,
        averageAge: stats.averageAge,
      };
    }

    await this.auditService.logVehiclesListed({
      userId: user.id,
      companyId: userFilter.companyId,
      metadata: {
        page: userFilter.page || 1,
        limit: userFilter.limit || 20,
        sortField: userFilter.sortField || 'createdAt',
        sortOrder: userFilter.sortOrder || 'desc',
        hasSearch: Boolean(userFilter.search && String(userFilter.search).trim().length > 0),
      },
    });

    return response;
  }

  async findOne(id: string): Promise<VehicleResponseDto> {
    const vehicle = await this.vehiclesValidationService.validateVehicleExists(id);
    return this.vehiclesMapperService.mapToResponseDto(vehicle);
  }

  async findOneForUser(id: string, user: RequestWithUser['user']): Promise<VehicleResponseDto> {
    const vehicle = await this.vehiclesValidationService.validateVehicleOwnership(id, user.companyId!);

    await this.auditService.logVehicleViewed({
      userId: user.id,
      companyId: vehicle.companyId,
      entityId: vehicle.id,
      entityType: 'Vehicle',
      metadata: {
        vehicleId: vehicle.id,
        vinLast6: vehicle.vin ? vehicle.vin.slice(-6) : undefined,
        licensePlateMasked: this.maskLicensePlate(vehicle.licensePlate),
      },
    });

    return this.vehiclesMapperService.mapToResponseDtoForRole(vehicle, user.role as any);
  }

  async update(id: string, updateVehicleDto: UpdateVehicleDto): Promise<VehicleResponseDto> {
    const updateData = {
      ...updateVehicleDto,
      lastServiceDate: updateVehicleDto.lastServiceDate ? new Date(updateVehicleDto.lastServiceDate) : undefined,
      nextServiceDate: updateVehicleDto.nextServiceDate ? new Date(updateVehicleDto.nextServiceDate) : undefined,
    };

    const vehicle = await this.vehiclesBusinessService.updateVehicle(id, updateData);
    return this.vehiclesMapperService.mapToResponseDto(vehicle);
  }

  async remove(id: string): Promise<void> {
    await this.vehiclesBusinessService.deactivateVehicle(id);
  }

  async hardRemove(id: string): Promise<void> {
    const vehicle = await this.vehiclesValidationService.validateVehicleExists(id);
    await this.vehiclesDataService.hardDelete(id);
  }

  async setActive(id: string, isActive: boolean): Promise<VehicleResponseDto> {
    const vehicle = await this.vehiclesDataService.setActive(id, isActive);
    return this.vehiclesMapperService.mapToResponseDto(vehicle);
  }

  async updateMileage(id: string, mileage: number): Promise<VehicleResponseDto> {
    const vehicle = await this.vehiclesBusinessService.updateVehicleMileage(id, mileage, true);
    return this.vehiclesMapperService.mapToResponseDto(vehicle);
  }

  async getStats(companyId: string): Promise<VehicleStats> {
    return this.vehiclesDataService.getStats(companyId);
  }

  async getVehiclesByCustomer(customerId: string, user: RequestWithUser['user']): Promise<VehicleResponseDto[]> {
    await this.vehiclesValidationService.validateCustomerOwnership(customerId, user.companyId!);

    const filter: VehicleFilter = {
      customerId,
      companyId: user.companyId!,
    };

    const [vehicles] = await this.vehiclesDataService.findWithFilters(filter);
    return this.vehiclesMapperService.mapArrayToResponseDtoForRole(vehicles, user.role as any);
  }

  private maskLicensePlate(lp?: string): string | undefined {
    if (!lp) return undefined;
    const s = String(lp);
    if (s.length <= 2) return s[0] + '•';
    const start = s.slice(0, 2);
    const end = s.slice(-2);
    return `${start}••${end}`;
  }
}
