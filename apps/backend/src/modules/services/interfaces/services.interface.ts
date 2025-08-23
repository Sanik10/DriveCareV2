// path: apps/backend/src/modules/services/interfaces/services.interface.ts
import { ServicesFilter, BulkUpdateResult, UserWithCompany } from '../types/services.types';
import { Service } from '../../../database/entities';
import { CreateServiceDto } from '../dto/request/create-service.dto';
import { UpdateServiceDto } from '../dto/request/update-service.dto';
import { ServiceResponseDto } from '../dto/response/service-response.dto';
import { PaginatedServicesResponseDto } from '../dto/response/paginated-services-response.dto';

export interface IServicesService {
  findAllForUser(user: UserWithCompany, filter: ServicesFilter): Promise<PaginatedServicesResponseDto>;
  findOne(id: string): Promise<ServiceResponseDto>;
  findByCategory(categoryId: string, user: UserWithCompany): Promise<ServiceResponseDto[]>;
  createForUser(dto: CreateServiceDto, user: UserWithCompany): Promise<ServiceResponseDto>;
  update(id: string, dto: UpdateServiceDto, user: UserWithCompany): Promise<ServiceResponseDto>;
  remove(id: string, user: UserWithCompany): Promise<void>;
  toggleStatus(id: string, user: UserWithCompany): Promise<ServiceResponseDto>;
  bulkUpdate(serviceIds: string[], updates: UpdateServiceDto, user: UserWithCompany): Promise<BulkUpdateResult>;
  getStats(user: UserWithCompany): Promise<any>;
}

export interface IServicesDataService {
  findWithFilters(filter: ServicesFilter): Promise<[Service[], number]>;
  findById(id: string): Promise<Service | null>;
  findByCategory(categoryId: string, companyId: string): Promise<Service[]>;
  create(dto: CreateServiceDto, companyId: string): Promise<Service>;
  update(id: string, dto: UpdateServiceDto): Promise<Service>;
  remove(id: string): Promise<void>;
  toggleStatus(id: string): Promise<Service>;
  bulkUpdate(serviceIds: string[], updates: Partial<UpdateServiceDto>): Promise<number>;
  getServicesStats(companyId: string): Promise<any>;
}
