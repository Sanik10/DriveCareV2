// path: apps/backend/src/modules/vehicles/services/vehicles-business.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { VehiclesDataService } from './vehicles-data.service';
import { VehiclesValidationService } from './vehicles-validation.service';
import { Vehicle } from '../../../database/entities/vehicle.entity';
import { CreateVehicleData, UpdateVehicleData, VehicleWithDetails } from '../types/vehicles.types';
import { IVehiclesBusinessService } from '../interfaces/vehicles.interface';
import { AuditService } from '../../../common/audit/audit.service';
import { VehiclesMapperService } from './vehicles-mapper.service';

@Injectable()
export class VehiclesBusinessService implements IVehiclesBusinessService {
  private readonly logger = new Logger(VehiclesBusinessService.name);

  constructor(
    private readonly vehiclesDataService: VehiclesDataService,
    private readonly vehiclesValidationService: VehiclesValidationService,
    private readonly vehiclesMapperService: VehiclesMapperService,
    private readonly auditService: AuditService,
  ) {}

  async createVehicle(data: CreateVehicleData): Promise<Vehicle> {
    await this.vehiclesValidationService.validateCreateData(data);
    await this.vehiclesValidationService.validateVehicleLimits(data.companyId);

    const vehicle = await this.vehiclesDataService.create(data);

    this.logger.log(`Created vehicle: ${this.vehiclesMapperService.formatVehicleDisplayName(vehicle)} (${vehicle.id}) for company ${vehicle.companyId}`);

    await this.auditService.logVehicleCreated({
      entityId: vehicle.id,
      entityType: 'Vehicle',
      companyId: vehicle.companyId,
      changes: { after: this.sanitizeVehicleDataMasked(vehicle) },
      metadata: {
        vehicleInfo: this.vehiclesMapperService.formatVehicleDisplayName(vehicle),
        customerId: vehicle.customerId,
        vinLast6: vehicle.vin ? vehicle.vin.slice(-6) : undefined,
        licensePlateMasked: this.maskLicensePlate(vehicle.licensePlate),
      },
    });

    return vehicle;
  }

  async updateVehicle(id: string, data: UpdateVehicleData): Promise<Vehicle> {
    await this.vehiclesValidationService.validateUpdateData(id, data);

    const oldVehicle = await this.vehiclesDataService.findById(id);
    const updatedVehicle = await this.vehiclesDataService.update(id, data);

    this.logger.log(`Updated vehicle: ${this.vehiclesMapperService.formatVehicleDisplayName(updatedVehicle)} (${updatedVehicle.id})`);

    await this.auditService.logVehicleUpdated({
      entityId: updatedVehicle.id,
      entityType: 'Vehicle',
      companyId: updatedVehicle.companyId,
      changes: {
        before: this.sanitizeVehicleDataMasked(oldVehicle),
        after: this.sanitizeVehicleDataMasked(updatedVehicle),
      },
      metadata: {
        updatedFields: Object.keys(data),
        vehicleInfo: this.vehiclesMapperService.formatVehicleDisplayName(updatedVehicle),
      },
    });

    return updatedVehicle;
  }

  async deactivateVehicle(id: string): Promise<void> {
    const vehicle = await this.vehiclesValidationService.validateVehicleExists(id);

    await this.vehiclesDataService.softDelete(id);

    this.logger.log(`Deactivated vehicle: ${this.vehiclesMapperService.formatVehicleDisplayName(vehicle)} (${vehicle.id})`);

    await this.auditService.logVehicleStatusChanged({
      entityId: vehicle.id,
      entityType: 'Vehicle',
      companyId: vehicle.companyId,
      changes: {
        before: { isDeleted: false },
        after: { isDeleted: true },
      },
      metadata: {
        action: 'deactivated',
        vehicleInfo: this.vehiclesMapperService.formatVehicleDisplayName(vehicle),
      },
    });
  }

  async updateVehicleMileage(id: string, mileage: number, updateServiceDates: boolean = false): Promise<Vehicle> {
    await this.vehiclesValidationService.validateMileageUpdate(id, mileage);

    const oldVehicle = await this.vehiclesDataService.findById(id);
    const updatedVehicle = await this.vehiclesDataService.updateMileage(id, mileage);

    this.logger.log(`Updated mileage for vehicle ${id}: ${oldVehicle?.mileage || 0} -> ${mileage} km`);

    await this.auditService.logVehicleMileageUpdated({
      entityId: id,
      entityType: 'Vehicle',
      companyId: updatedVehicle.companyId,
      changes: {
        before: { mileage: oldVehicle?.mileage || 0 },
        after: { mileage },
      },
      metadata: {
        vehicleInfo: this.vehiclesMapperService.formatVehicleDisplayName(updatedVehicle),
        updateServiceDates,
        vinLast6: updatedVehicle.vin ? updatedVehicle.vin.slice(-6) : undefined,
      },
    });

    if (updateServiceDates && updatedVehicle.lastServiceDate) {
      const serviceMileageInterval = 10000;
      const lastServiceMileage = oldVehicle?.mileage || 0;
      const mileageSinceService = mileage - lastServiceMileage;

      if (mileageSinceService >= serviceMileageInterval) {
        const nextServiceMileage = mileage + serviceMileageInterval;
        const averageDailyMileage = 50;
        const daysToNextService = serviceMileageInterval / averageDailyMileage;
        const nextServiceDate = new Date();
        nextServiceDate.setDate(nextServiceDate.getDate() + daysToNextService);

        await this.vehiclesDataService.updateServiceDates(id, undefined, nextServiceDate);
      }
    }

    return updatedVehicle;
  }

  async scheduleNextService(vehicleId: string, nextServiceDate: Date): Promise<Vehicle> {
    const vehicle = await this.vehiclesValidationService.validateVehicleExists(vehicleId);

    const updatedVehicle = await this.vehiclesDataService.updateServiceDates(
      vehicleId,
      undefined,
      nextServiceDate,
    );

    this.logger.log(`Scheduled next service for vehicle ${vehicleId} on ${nextServiceDate.toISOString().split('T')[0]}`);

    return updatedVehicle;
  }

  async markServiceCompleted(vehicleId: string, serviceDate: Date, newMileage?: number): Promise<Vehicle> {
    const vehicle = await this.vehiclesValidationService.validateVehicleExists(vehicleId);

    let updatedVehicle = await this.vehiclesDataService.updateServiceDates(
      vehicleId,
      serviceDate,
      undefined,
    );

    if (newMileage !== undefined) {
      await this.vehiclesValidationService.validateMileageUpdate(vehicleId, newMileage);
      updatedVehicle = await this.vehiclesDataService.updateMileage(vehicleId, newMileage);
    }

    this.logger.log(`Marked service completed for vehicle ${vehicleId} on ${serviceDate.toISOString().split('T')[0]}`);

    await this.auditService.logVehicleServiceCompleted({
      entityId: vehicleId,
      entityType: 'Vehicle',
      companyId: vehicle.companyId,
      metadata: {
        serviceDate: serviceDate.toISOString(),
        oldMileage: vehicle.mileage,
        newMileage,
        vehicleInfo: this.vehiclesMapperService.formatVehicleDisplayName(vehicle),
        vinLast6: vehicle.vin ? vehicle.vin.slice(-6) : undefined,
        licensePlateMasked: this.maskLicensePlate(vehicle.licensePlate),
      },
    });

    return updatedVehicle;
  }

  async getVehicleWithFullDetails(id: string, companyId: string): Promise<VehicleWithDetails> {
    const vehicle = await this.vehiclesValidationService.validateVehicleOwnership(id, companyId);

    await this.auditService.logVehicleViewed({
      entityId: vehicle.id,
      entityType: 'Vehicle',
      companyId: vehicle.companyId,
      metadata: {
        vehicleInfo: this.vehiclesMapperService.formatVehicleDisplayName(vehicle),
        viewType: 'detailed_with_relations',
      },
    });

    return this.vehiclesMapperService.mapToWithDetails(vehicle);
  }

  async transferVehicleToCustomer(vehicleId: string, newCustomerId: string, userCompanyId: string): Promise<Vehicle> {
    const vehicle = await this.vehiclesValidationService.validateVehicleOwnership(vehicleId, userCompanyId);
    await this.vehiclesValidationService.validateCustomerOwnership(newCustomerId, userCompanyId);

    const updatedVehicle = await this.vehiclesDataService.update(vehicleId, {
      customerId: newCustomerId,
    });

    this.logger.log(`Transferred vehicle ${vehicleId} from customer ${vehicle.customerId} to ${newCustomerId}`);

    await this.auditService.logVehicleTransferred({
      entityId: vehicleId,
      entityType: 'Vehicle',
      companyId: userCompanyId,
      changes: {
        before: { customerId: vehicle.customerId },
        after: { customerId: newCustomerId },
      },
      metadata: {
        vehicleInfo: this.vehiclesMapperService.formatVehicleDisplayName(vehicle),
        fromCustomerId: vehicle.customerId,
        toCustomerId: newCustomerId,
        vinLast6: vehicle.vin ? vehicle.vin.slice(-6) : undefined,
        licensePlateMasked: this.maskLicensePlate(vehicle.licensePlate),
      },
    });

    return updatedVehicle;
  }

  async generateVehicleReport(vehicleId: string, companyId: string): Promise<any> {
    const vehicle = await this.vehiclesValidationService.validateVehicleOwnership(vehicleId, companyId);

    const serviceHistory = vehicle.serviceHistory || [];

    const totalServiceCost = serviceHistory.length * 5000;

    let averageServiceInterval = 0;
    if (serviceHistory.length > 1) {
      const intervals: number[] = [];
      for (let i = 1; i < serviceHistory.length; i++) {
        const prevService = new Date(serviceHistory[i - 1].date);
        const currentService = new Date(serviceHistory[i].date);
        const diffDays = (currentService.getTime() - prevService.getTime()) / (1000 * 60 * 60 * 24);
        intervals.push(diffDays);
      }
      averageServiceInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    }

    const upcomingServices: any[] = [];
    if (vehicle.nextServiceDate) {
      upcomingServices.push({
        type: 'scheduled',
        date: vehicle.nextServiceDate,
        description: 'Плановое техническое обслуживание',
      });
    }

    return {
      vehicle: this.vehiclesMapperService.mapToWithDetails(vehicle),
      serviceHistory,
      totalServiceCost,
      averageServiceInterval: Math.round(averageServiceInterval),
      upcomingServices,
      stats: {
        totalServices: serviceHistory.length,
        totalMileage: vehicle.mileage || 0,
        averageMileagePerService: serviceHistory.length > 0 ? (vehicle.mileage || 0) / serviceHistory.length : 0,
      },
    };
  }

  private sanitizeVehicleDataMasked(vehicle: Vehicle | null): Partial<Vehicle> {
    if (!vehicle) return {};
    const {
      id, customerId, companyId, modelId, vehicleTypeId, vin, licensePlate,
      year, color, engineType, engineVolume, mileage, lastServiceDate,
      nextServiceDate, isActive, createdAt, updatedAt,
    } = vehicle;
    return {
      id, customerId, companyId, modelId, vehicleTypeId,
      vin: vin ? `***${vin.slice(-6)}` : undefined,
      licensePlate: this.maskLicensePlate(licensePlate),
      year, color, engineType, engineVolume, mileage, lastServiceDate,
      nextServiceDate, isActive, createdAt, updatedAt,
    };
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
