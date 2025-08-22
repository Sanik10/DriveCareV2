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

@Injectable()
export class VehiclesService {
  private readonly logger = new Logger(VehiclesService.name);

  constructor(
    private readonly vehiclesDataService: VehiclesDataService,
    private readonly vehiclesBusinessService: VehiclesBusinessService,
    private readonly vehiclesValidationService: VehiclesValidationService,
    private readonly vehiclesMapperService: VehiclesMapperService,
  ) {}

  async create(createVehicleDto: CreateVehicleDto): Promise<VehicleResponseDto> {
    throw new Error('Direct create method not allowed. Use createForUser instead for security.');
  }

  async createForUser(createVehicleDto: CreateVehicleDto, user: RequestWithUser['user']): Promise<VehicleResponseDto> {
    // Проверка что customer принадлежит компании пользователя
    await this.vehiclesValidationService.validateCustomerOwnership(createVehicleDto.customerId, user.companyId!);

    const vehicleData: CreateVehicleData = {
      ...createVehicleDto,
      companyId: user.companyId!,
    };

    const vehicle = await this.vehiclesBusinessService.createVehicle(vehicleData);
    return this.vehiclesMapperService.mapToResponseDto(vehicle);
  }

  async findAll(filter: VehicleFilter): Promise<PaginatedVehiclesResponseDto> {
    const [vehicles, total] = await this.vehiclesDataService.findWithFilters(filter);

    const items = vehicles.map((vehicle) => {
      const dto = this.vehiclesMapperService.mapToResponseDto(vehicle);
      return dto;
    });

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

  async findAllForUser(user: RequestWithUser['user'], filter: Partial<VehicleFilter> = {}): Promise<PaginatedVehiclesResponseDto> {
    // Superadmin-policy: требуем явный companyId для листингов
    if (user.role === 'superadmin' && !filter.companyId) {
      throw new BadRequestException('companyId is required for superadmin listings');
    }

    const userFilter: VehicleFilter = {
      ...filter,
      companyId: user.role === 'superadmin' ? filter.companyId : user.companyId,
    };

    const result = await this.findAll(userFilter);

    // Добавляем мета-информацию для UI
    if (userFilter.companyId) {
      const stats = await this.vehiclesDataService.getStats(userFilter.companyId);
      result.meta = {
        totalByEngineType: stats.totalByEngineType,
        averageMileage: stats.averageMileage,
        vehiclesNeedingService: stats.vehiclesNeedingService,
        averageAge: stats.averageAge,
      };
    }

    return result;
  }

  async findOne(id: string): Promise<VehicleResponseDto> {
    const vehicle = await this.vehiclesValidationService.validateVehicleExists(id);
    return this.vehiclesMapperService.mapToResponseDto(vehicle);
  }

  async findOneForUser(id: string, user: RequestWithUser['user']): Promise<VehicleResponseDto> {
    const vehicle = await this.vehiclesValidationService.validateVehicleOwnership(id, user.companyId!);
    return this.vehiclesMapperService.mapToResponseDto(vehicle);
  }

  async update(id: string, updateVehicleDto: UpdateVehicleDto): Promise<VehicleResponseDto> {
    const updateData = {
      ...updateVehicleDto,
      // Преобразуем строки дат в Date объекты
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
    // Проверяем что customer принадлежит компании пользователя
    await this.vehiclesValidationService.validateCustomerOwnership(customerId, user.companyId!);

    const filter: VehicleFilter = {
      customerId,
      companyId: user.companyId!,
    };

    const [vehicles] = await this.vehiclesDataService.findWithFilters(filter);
    return this.vehiclesMapperService.mapArrayToResponseDto(vehicles);
  }
}
