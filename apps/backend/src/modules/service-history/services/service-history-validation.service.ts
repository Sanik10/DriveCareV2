// path: apps/backend/src/modules/service-history/services/service-history-validation.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceHistoryDataService } from './service-history-data.service';
import { VehicleServiceHistory } from '../../../database/entities/service-history.entity';
import { Vehicle } from '../../../database/entities/vehicle.entity';
import { CreateServiceHistoryData, UpdateServiceHistoryData } from '../types/service-history.types';
import { IServiceHistoryValidationService } from '../interfaces/service-history.interface';
import { 
  ServiceHistoryNotFoundException,
  ValidationDataException,
  ResourceOwnershipException,
  VehicleNotFoundException
} from '../../../common/exceptions/domain.exceptions';
import { SERVICE_HISTORY_CONSTANTS } from '../constants/service-history.constants';

@Injectable()
export class ServiceHistoryValidationService implements IServiceHistoryValidationService {
  constructor(
    private readonly serviceHistoryDataService: ServiceHistoryDataService,
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>,
  ) {}

  async validateCreateData(data: CreateServiceHistoryData): Promise<void> {
    await this.validateVehicleOwnership(data.vehicleId, data.companyId);
    await this.validateServiceDate(data.date, data.vehicleId);
    
    if (data.mileage !== undefined) {
      await this.validateMileageProgression(data.vehicleId, data.mileage, data.date);
    }

    this.validateServiceHistoryData(data);
  }

  async validateUpdateData(id: string, data: UpdateServiceHistoryData): Promise<void> {
    const serviceHistory = await this.validateServiceHistoryExists(id);

    if (data.date) {
      await this.validateServiceDate(data.date, serviceHistory.vehicleId);
    }

    if (data.mileage !== undefined) {
      await this.validateMileageProgression(
        serviceHistory.vehicleId, 
        data.mileage, 
        data.date || serviceHistory.date
      );
    }

    this.validateServiceHistoryData(data);
  }

  async validateServiceHistoryExists(id: string): Promise<VehicleServiceHistory> {
    const serviceHistory = await this.serviceHistoryDataService.findById(id);
    
    if (!serviceHistory) {
      throw new ServiceHistoryNotFoundException(id);
    }

    return serviceHistory;
  }

  async validateServiceHistoryOwnership(serviceHistoryId: string, userCompanyId: string): Promise<VehicleServiceHistory> {
    const serviceHistory = await this.validateServiceHistoryExists(serviceHistoryId);
    
    if (serviceHistory.companyId !== userCompanyId) {
      throw new ResourceOwnershipException('service-history', serviceHistoryId);
    }

    return serviceHistory;
  }

  async validateVehicleOwnership(vehicleId: string, userCompanyId: string): Promise<Vehicle> {
    const vehicle = await this.vehicleRepository.findOne({
      where: { id: vehicleId, isDeleted: false },
      relations: ['customer'],
    });

    if (!vehicle) {
      throw new VehicleNotFoundException(vehicleId);
    }

    if (vehicle.companyId !== userCompanyId) {
      throw new ResourceOwnershipException('vehicle', vehicleId);
    }

    return vehicle;
  }

  async validateServiceDate(date: Date, vehicleId: string): Promise<void> {
    const now = new Date();
    
    // Проверка: дата не слишком далеко в прошлом
    const maxPastDate = new Date();
    maxPastDate.setDate(maxPastDate.getDate() - SERVICE_HISTORY_CONSTANTS.VALIDATION.MAX_DAYS_IN_PAST);
    
    if (date < maxPastDate) {
      throw new ValidationDataException(
        'date',
        `Дата обслуживания не может быть раньше ${maxPastDate.toLocaleDateString()}`
      );
    }

    // Проверка: дата не слишком далеко в будущем
    const maxFutureDate = new Date();
    maxFutureDate.setDate(maxFutureDate.getDate() + SERVICE_HISTORY_CONSTANTS.VALIDATION.MAX_DAYS_IN_FUTURE);
    
    if (date > maxFutureDate) {
      throw new ValidationDataException(
        'date',
        `Дата обслуживания не может быть позже ${maxFutureDate.toLocaleDateString()}`
      );
    }

    // Проверка хронологического порядка (опционально)
    if (SERVICE_HISTORY_CONSTANTS.BUSINESS_RULES.VALIDATE_CHRONOLOGICAL_ORDER) {
      await this.validateChronologicalOrder(vehicleId, date);
    }
  }

  async validateMileageProgression(vehicleId: string, mileage: number, serviceDate: Date): Promise<void> {
    // Получаем текущий пробег автомобиля
    const vehicle = await this.vehicleRepository.findOne({
      where: { id: vehicleId },
    });

    if (!vehicle) {
      throw new VehicleNotFoundException(vehicleId);
    }

    // Проверяем что пробег не уменьшился по сравнению с текущим
    if (vehicle.mileage && mileage < vehicle.mileage) {
      // Проверяем дату - если обслуживание в прошлом, то пробег может быть меньше
      const now = new Date();
      if (serviceDate >= now) {
        throw new ValidationDataException(
          'mileage',
          `Пробег при обслуживании (${mileage} км) не может быть меньше текущего пробега автомобиля (${vehicle.mileage} км)`
        );
      }
    }

    // Проверяем разумность пробега
    if (mileage > SERVICE_HISTORY_CONSTANTS.VALIDATION.MAX_MILEAGE) {
      throw new ValidationDataException(
        'mileage',
        `Пробег не может превышать ${SERVICE_HISTORY_CONSTANTS.VALIDATION.MAX_MILEAGE} км`
      );
    }
  }

  private async validateChronologicalOrder(vehicleId: string, newServiceDate: Date): Promise<void> {
    const latestService = await this.serviceHistoryDataService.getLatestByVehicle(vehicleId);
    
    if (latestService && newServiceDate < latestService.date) {
      throw new ValidationDataException(
        'date',
        `Дата обслуживания не может быть раньше последнего зарегистрированного обслуживания (${latestService.date.toLocaleDateString()})`
      );
    }
  }

  private validateServiceHistoryData(data: Partial<CreateServiceHistoryData | UpdateServiceHistoryData>): void {
    if (data.description) {
      if (data.description.length < SERVICE_HISTORY_CONSTANTS.VALIDATION.MIN_DESCRIPTION_LENGTH) {
        throw new ValidationDataException(
          'description',
          `Описание должно содержать минимум ${SERVICE_HISTORY_CONSTANTS.VALIDATION.MIN_DESCRIPTION_LENGTH} символов`
        );
      }

      if (data.description.length > SERVICE_HISTORY_CONSTANTS.VALIDATION.MAX_DESCRIPTION_LENGTH) {
        throw new ValidationDataException(
          'description',
          `Описание не может превышать ${SERVICE_HISTORY_CONSTANTS.VALIDATION.MAX_DESCRIPTION_LENGTH} символов`
        );
      }
    }

    if (data.notes && data.notes.length > SERVICE_HISTORY_CONSTANTS.VALIDATION.MAX_NOTES_LENGTH) {
      throw new ValidationDataException(
        'notes',
        `Примечания не могут превышать ${SERVICE_HISTORY_CONSTANTS.VALIDATION.MAX_NOTES_LENGTH} символов`
      );
    }

    if (data.mileage !== undefined && data.mileage < SERVICE_HISTORY_CONSTANTS.VALIDATION.MIN_MILEAGE) {
      throw new ValidationDataException(
        'mileage',
        'Пробег не может быть отрицательным'
      );
    }

    // Проверка логической связности дат
    if (data.date && data.nextServiceDate && data.nextServiceDate <= data.date) {
      throw new ValidationDataException(
        'nextServiceDate',
        'Дата следующего обслуживания должна быть позже даты текущего обслуживания'
      );
    }
  }
}
