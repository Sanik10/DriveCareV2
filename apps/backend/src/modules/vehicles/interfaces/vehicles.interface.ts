// path: apps/backend/src/modules/vehicles/interfaces/vehicles.interface.ts
import { Vehicle } from '../../../database/entities/vehicle.entity';
import { 
  CreateVehicleData, 
  UpdateVehicleData, 
  VehicleFilter,
  VehicleStats,
  VehicleBasicInfo,
  VehicleWithDetails
} from '../types/vehicles.types';

export interface IVehiclesDataService {
  create(data: CreateVehicleData): Promise<Vehicle>;
  findAll(): Promise<Vehicle[]>;
  findById(id: string): Promise<Vehicle | null>;
  findByVin(vin: string): Promise<Vehicle | null>;
  findByLicensePlate(licensePlate: string, companyId: string): Promise<Vehicle | null>;
  findWithFilters(filter: VehicleFilter): Promise<[Vehicle[], number]>;
  update(id: string, data: UpdateVehicleData): Promise<Vehicle>;
  softDelete(id: string): Promise<void>;
  hardDelete(id: string): Promise<void>;
  setActive(id: string, isActive: boolean): Promise<Vehicle>;
  updateMileage(id: string, mileage: number): Promise<Vehicle>;
  updateServiceDates(id: string, lastServiceDate?: Date, nextServiceDate?: Date): Promise<Vehicle>;
  getStats(companyId: string): Promise<VehicleStats>;
  countByCompany(companyId: string): Promise<number>;
  countByCustomer(customerId: string): Promise<number>;
  findVehiclesNeedingService(companyId: string): Promise<Vehicle[]>;
}

export interface IVehiclesValidationService {
  validateCreateData(data: CreateVehicleData): Promise<void>;
  validateUpdateData(id: string, data: UpdateVehicleData): Promise<void>;
  validateVehicleExists(id: string): Promise<Vehicle>;
  validateVehicleOwnership(vehicleId: string, userCompanyId: string): Promise<Vehicle>;
  validateCustomerOwnership(customerId: string, userCompanyId: string): Promise<void>;
  validateVehicleLimits(companyId: string): Promise<void>;
  validateVinUniqueness(vin: string, excludeId?: string): Promise<void>;
  validateLicensePlateUniqueness(licensePlate: string, companyId: string, excludeId?: string): Promise<void>;
  validateVehicleReferences(modelId: string, vehicleTypeId: string): Promise<void>;
  validateMileageUpdate(vehicleId: string, newMileage: number): Promise<void>;
}

export interface IVehiclesBusinessService {
  createVehicle(data: CreateVehicleData): Promise<Vehicle>;
  updateVehicle(id: string, data: UpdateVehicleData): Promise<Vehicle>;
  deactivateVehicle(id: string): Promise<void>;
  updateVehicleMileage(id: string, mileage: number, updateServiceDates?: boolean): Promise<Vehicle>;
  scheduleNextService(vehicleId: string, nextServiceDate: Date): Promise<Vehicle>;
  markServiceCompleted(vehicleId: string, serviceDate: Date, newMileage?: number): Promise<Vehicle>;
  getVehicleWithFullDetails(id: string, companyId: string): Promise<VehicleWithDetails>;
  transferVehicleToCustomer(vehicleId: string, newCustomerId: string, userCompanyId: string): Promise<Vehicle>;
  generateVehicleReport(vehicleId: string, companyId: string): Promise<any>;
}

export interface IVehiclesMapperService {
  mapToResponseDto(vehicle: Vehicle): any;
  mapArrayToResponseDto(vehicles: Vehicle[]): any[];
  mapToBasicInfo(vehicle: Vehicle): VehicleBasicInfo;
  mapToWithDetails(vehicle: Vehicle): VehicleWithDetails;
  mapToSelectOption(vehicle: Vehicle): { value: string; label: string; disabled?: boolean };
  formatVehicleDisplayName(vehicle: Vehicle): string;
  formatVehicleShortInfo(vehicle: Vehicle): string;
  mapToResponseDtoForRole(vehicle: Vehicle, role?: string): any;
  mapArrayToResponseDtoForRole(vehicles: Vehicle[], role?: string): any[];
}

export interface IVehiclesService {
  create(createVehicleDto: any): Promise<any>;
  createForUser(createVehicleDto: any, user: any): Promise<any>;
  findAll(filter: VehicleFilter): Promise<any>;
  findAllForUser(user: any, filter: Partial<VehicleFilter>): Promise<any>;
  findOne(id: string): Promise<any>;
  findOneForUser(id: string, user: any): Promise<any>;
  update(id: string, updateVehicleDto: any): Promise<any>;
  remove(id: string): Promise<void>;
  hardRemove(id: string): Promise<void>;
  setActive(id: string, isActive: boolean): Promise<any>;
  updateMileage(id: string, mileage: number): Promise<any>;
  getStats(companyId: string): Promise<VehicleStats>;
  getVehiclesByCustomer(customerId: string, user: any): Promise<any>;
}

export interface VehicleServiceIntegration {
  onServiceCompleted(vehicleId: string, serviceData: any): Promise<void>;
  onMileageUpdated(vehicleId: string, oldMileage: number, newMileage: number): Promise<void>;
  getServiceHistory(vehicleId: string): Promise<any[]>;
}

export interface VehicleLimitsInfo {
  maxVehicles: number | null;
  currentCount: number;
  remainingSlots: number | null;
  isLimitExceeded: boolean;
}
