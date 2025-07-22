import { VehicleServiceHistory } from '../../../database/entities/service-history.entity';
import { 
  CreateServiceHistoryData, 
  UpdateServiceHistoryData, 
  ServiceHistoryFilter,
  ServiceHistoryStats,
  ServiceHistoryBasicInfo 
} from '../types/service-history.types';

export interface IServiceHistoryDataService {
  create(data: CreateServiceHistoryData): Promise<VehicleServiceHistory>;
  findAll(): Promise<VehicleServiceHistory[]>;
  findById(id: string): Promise<VehicleServiceHistory | null>;
  findWithFilters(filter: ServiceHistoryFilter): Promise<[VehicleServiceHistory[], number]>;
  update(id: string, data: UpdateServiceHistoryData): Promise<VehicleServiceHistory>;
  softDelete(id: string): Promise<void>;
  hardDelete(id: string): Promise<void>;
  getStats(companyId: string): Promise<ServiceHistoryStats>;
  countByCompany(companyId: string): Promise<number>;
  getLatestByVehicle(vehicleId: string): Promise<VehicleServiceHistory | null>;
  getUpcomingServices(companyId: string, days?: number): Promise<VehicleServiceHistory[]>;
  getOverdueServices(companyId: string): Promise<VehicleServiceHistory[]>;
}

export interface IServiceHistoryValidationService {
  validateCreateData(data: CreateServiceHistoryData): Promise<void>;
  validateUpdateData(id: string, data: UpdateServiceHistoryData): Promise<void>;
  validateServiceHistoryExists(id: string): Promise<VehicleServiceHistory>;
  validateServiceHistoryOwnership(serviceHistoryId: string, userCompanyId: string): Promise<VehicleServiceHistory>;
  validateVehicleOwnership(vehicleId: string, userCompanyId: string): Promise<any>;
  validateServiceDate(date: Date, vehicleId: string): Promise<void>;
  validateMileageProgression(vehicleId: string, mileage: number, serviceDate: Date): Promise<void>;
}

export interface IServiceHistoryBusinessService {
  createServiceHistory(data: CreateServiceHistoryData): Promise<VehicleServiceHistory>;
  updateServiceHistory(id: string, data: UpdateServiceHistoryData): Promise<VehicleServiceHistory>;
  deactivateServiceHistory(id: string): Promise<void>;
  updateVehicleServiceDates(vehicleId: string): Promise<void>;
  calculateNextServiceDate(vehicleId: string, currentServiceDate: Date): Promise<Date | null>;
  notifyUpcomingServices(companyId: string): Promise<void>;
}

export interface IServiceHistoryMapperService {
  mapToResponseDto(serviceHistory: VehicleServiceHistory): any;
  mapArrayToResponseDto(serviceHistories: VehicleServiceHistory[]): any[];
  mapToBasicInfo(serviceHistory: VehicleServiceHistory): ServiceHistoryBasicInfo;
  mapToAuditData(serviceHistory: VehicleServiceHistory): any;
  formatServiceDescription(serviceHistory: VehicleServiceHistory): string;
  calculateServiceMetrics(serviceHistory: VehicleServiceHistory): any;
}
