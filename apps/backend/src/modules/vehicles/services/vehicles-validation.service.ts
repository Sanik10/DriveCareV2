// path: apps/backend/src/modules/vehicles/services/vehicles-validation.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VehiclesDataService } from './vehicles-data.service';
import { Vehicle } from '../../../database/entities/vehicle.entity';
import { Customer, Subscription, SubscriptionStatus, VehicleModel, VehicleType } from '../../../database/entities';
import { CreateVehicleData, UpdateVehicleData } from '../types/vehicles.types';
import { IVehiclesValidationService } from '../interfaces/vehicles.interface';
import { 
  VehicleNotFoundException, 
  VehicleVinAlreadyExistsException,
  VehicleLicensePlateAlreadyExistsException,
  ValidationDataException,
  ResourceOwnershipException,
  CompanyLimitExceededException,
  CustomerNotFoundException,
  VehicleModelNotFoundException,
  VehicleTypeNotFoundException
} from '../../../common/exceptions/domain.exceptions';
import { VEHICLES_CONSTANTS } from '../constants/vehicles.constants';

@Injectable()
export class VehiclesValidationService implements IVehiclesValidationService {
  constructor(
    private readonly vehiclesDataService: VehiclesDataService,
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepository: Repository<Subscription>,
    @InjectRepository(VehicleModel)
    private readonly vehicleModelRepository: Repository<VehicleModel>,
    @InjectRepository(VehicleType)
    private readonly vehicleTypeRepository: Repository<VehicleType>,
  ) {}

  async validateCreateData(data: CreateVehicleData): Promise<void> {
    await this.validateCustomerOwnership(data.customerId, data.companyId);
    await this.validateVehicleReferences(data.modelId, data.vehicleTypeId);
    
    if (data.vin) {
      await this.validateVinUniqueness(data.vin);
    }
    
    if (data.licensePlate) {
      await this.validateLicensePlateUniqueness(data.licensePlate, data.companyId);
    }

    this.validateVehicleData(data);
  }

  async validateUpdateData(id: string, data: UpdateVehicleData): Promise<void> {
    const vehicle = await this.validateVehicleExists(id);

    if (data.modelId || data.vehicleTypeId) {
      await this.validateVehicleReferences(
        data.modelId || vehicle.modelId,
        data.vehicleTypeId || vehicle.vehicleTypeId
      );
    }

    if (data.vin && data.vin !== vehicle.vin) {
      await this.validateVinUniqueness(data.vin, id);
    }

    if (data.licensePlate && data.licensePlate !== vehicle.licensePlate) {
      await this.validateLicensePlateUniqueness(data.licensePlate, vehicle.companyId, id);
    }

    this.validateVehicleData(data);
  }

  async validateVehicleExists(id: string): Promise<Vehicle> {
    const vehicle = await this.vehiclesDataService.findById(id);
    
    if (!vehicle) {
      throw new VehicleNotFoundException(id);
    }

    return vehicle;
  }

  async validateVehicleOwnership(vehicleId: string, userCompanyId: string): Promise<Vehicle> {
    const vehicle = await this.validateVehicleExists(vehicleId);
    
    if (vehicle.companyId !== userCompanyId) {
      throw new ResourceOwnershipException('vehicle', vehicleId);
    }

    return vehicle;
  }

  async validateCustomerOwnership(customerId: string, userCompanyId: string): Promise<void> {
    const customer = await this.customerRepository.findOne({
      where: { id: customerId, isDeleted: false },
    });

    if (!customer) {
      throw new CustomerNotFoundException(customerId);
    }

    if (customer.companyId !== userCompanyId) {
      throw new ResourceOwnershipException('customer', customerId);
    }
  }

  async validateVehicleLimits(companyId: string): Promise<void> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { 
        companyId, 
        status: SubscriptionStatus.ACTIVE
      },
      relations: ['tariff'],
    });

    if (!subscription || !subscription.tariff) {
      throw new ValidationDataException(
        'subscription',
        'У компании нет активной подписки'
      );
    }

    const maxVehicles = subscription.tariff.maxVehicles;
    if (maxVehicles === null) {
      return; // Безлимитный тариф
    }

    const currentCount = await this.vehiclesDataService.countByCompany(companyId);
    if (currentCount >= maxVehicles) {
      throw new CompanyLimitExceededException('vehicles', currentCount, maxVehicles);
    }
  }

  async validateVinUniqueness(vin: string, excludeId?: string): Promise<void> {
    if (!VEHICLES_CONSTANTS.FEATURES.VIN_VALIDATION_ENABLED) {
      return;
    }

    const existingVehicle = await this.vehiclesDataService.findByVin(vin);
    
    if (existingVehicle && existingVehicle.id !== excludeId) {
      throw new VehicleVinAlreadyExistsException(vin);
    }
  }

  async validateLicensePlateUniqueness(licensePlate: string, companyId: string, excludeId?: string): Promise<void> {
    if (!VEHICLES_CONSTANTS.FEATURES.LICENSE_PLATE_VALIDATION_ENABLED) {
      return;
    }

    const existingVehicle = await this.vehiclesDataService.findByLicensePlate(licensePlate, companyId);
    
    if (existingVehicle && existingVehicle.id !== excludeId) {
      throw new VehicleLicensePlateAlreadyExistsException(licensePlate, companyId);
    }
  }

  async validateVehicleReferences(modelId: string, vehicleTypeId: string): Promise<void> {
    const model = await this.vehicleModelRepository.findOne({
      where: { id: modelId, isDeleted: false },
    });

    if (!model) {
      throw new VehicleModelNotFoundException(modelId);
    }

    const vehicleType = await this.vehicleTypeRepository.findOne({
      where: { id: vehicleTypeId, isDeleted: false },
    });

    if (!vehicleType) {
      throw new VehicleTypeNotFoundException(vehicleTypeId);
    }
  }

  async validateMileageUpdate(vehicleId: string, newMileage: number): Promise<void> {
    const vehicle = await this.validateVehicleExists(vehicleId);
    
    if (vehicle.mileage && newMileage < vehicle.mileage) {
      throw new ValidationDataException(
        'mileage',
        `Новый пробег (${newMileage} км) не может быть меньше текущего (${vehicle.mileage} км)`
      );
    }
  }

  private validateVehicleData(data: Partial<CreateVehicleData | UpdateVehicleData>): void {
    if (data.year) {
      const currentYear = new Date().getFullYear();
      if (data.year < VEHICLES_CONSTANTS.VALIDATION.MIN_YEAR || data.year > currentYear + 2) {
        throw new ValidationDataException(
          'year',
          `Год выпуска должен быть от ${VEHICLES_CONSTANTS.VALIDATION.MIN_YEAR} до ${currentYear + 2}`
        );
      }
    }

    if (data.mileage !== undefined && data.mileage < 0) {
      throw new ValidationDataException(
        'mileage',
        'Пробег не может быть отрицательным'
      );
    }

    if (data.engineVolume !== undefined && (data.engineVolume < 0.1 || data.engineVolume > 20)) {
      throw new ValidationDataException(
        'engineVolume',
        'Объем двигателя должен быть от 0.1 до 20.0 литров'
      );
    }

    if (data.vin && data.vin.length !== VEHICLES_CONSTANTS.VALIDATION.VIN_LENGTH) {
      throw new ValidationDataException(
        'vin',
        `VIN должен содержать ровно ${VEHICLES_CONSTANTS.VALIDATION.VIN_LENGTH} символов`
      );
    }
  }
}
