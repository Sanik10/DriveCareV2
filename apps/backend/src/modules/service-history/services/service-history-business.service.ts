// path: apps/backend/src/modules/service-history/services/service-history-business.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceHistoryDataService } from './service-history-data.service';
import { ServiceHistoryValidationService } from './service-history-validation.service';
import { VehicleServiceHistory } from '../../../database/entities/service-history.entity';
import { Vehicle } from '../../../database/entities/vehicle.entity';
import { CreateServiceHistoryData, UpdateServiceHistoryData } from '../types/service-history.types';
import { IServiceHistoryBusinessService } from '../interfaces/service-history.interface';
import { SERVICE_HISTORY_CONSTANTS } from '../constants/service-history.constants';

@Injectable()
export class ServiceHistoryBusinessService implements IServiceHistoryBusinessService {
  private readonly logger = new Logger(ServiceHistoryBusinessService.name);

  constructor(
    private readonly serviceHistoryDataService: ServiceHistoryDataService,
    private readonly serviceHistoryValidationService: ServiceHistoryValidationService,
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>,
  ) {}

  async createServiceHistory(data: CreateServiceHistoryData): Promise<VehicleServiceHistory> {
    await this.serviceHistoryValidationService.validateCreateData(data);

    const serviceHistory = await this.serviceHistoryDataService.create(data);
    
    this.logger.log(`Created service history: ${serviceHistory.id} for vehicle ${serviceHistory.vehicleId}`);
    
    // Обновляем даты ТО автомобиля
    if (SERVICE_HISTORY_CONSTANTS.BUSINESS_RULES.AUTO_UPDATE_VEHICLE_SERVICE_DATES) {
      await this.updateVehicleServiceDates(serviceHistory.vehicleId);
    }

    // TODO: Добавить audit логирование позже

    return serviceHistory;
  }

  async updateServiceHistory(id: string, data: UpdateServiceHistoryData): Promise<VehicleServiceHistory> {
    await this.serviceHistoryValidationService.validateUpdateData(id, data);
    
    const oldServiceHistory = await this.serviceHistoryDataService.findById(id);
    const updatedServiceHistory = await this.serviceHistoryDataService.update(id, data);
    
    this.logger.log(`Updated service history: ${updatedServiceHistory.id}`);
    
    // Обновляем даты ТО автомобиля если изменились критичные поля
    if (data.date || data.mileage !== undefined || data.nextServiceDate !== undefined) {
      await this.updateVehicleServiceDates(updatedServiceHistory.vehicleId);
    }

    // TODO: Добавить audit логирование позже

    return updatedServiceHistory;
  }

  async deactivateServiceHistory(id: string): Promise<void> {
    const serviceHistory = await this.serviceHistoryValidationService.validateServiceHistoryExists(id);
    
    await this.serviceHistoryDataService.softDelete(id);
    
    this.logger.log(`Deactivated service history: ${serviceHistory.id}`);
    
    // Пересчитываем даты ТО автомобиля
    await this.updateVehicleServiceDates(serviceHistory.vehicleId);

    // TODO: Добавить audit логирование позже
  }

  async updateVehicleServiceDates(vehicleId: string): Promise<void> {
    const vehicle = await this.vehicleRepository.findOne({
      where: { id: vehicleId },
    });

    if (!vehicle) {
      this.logger.warn(`Vehicle ${vehicleId} not found for service dates update`);
      return;
    }

    // Получаем последнее обслуживание
    const latestService = await this.serviceHistoryDataService.getLatestByVehicle(vehicleId);
    
    if (latestService) {
      // Обновляем последнюю дату обслуживания и пробег
      await this.vehicleRepository.update(vehicleId, {
        lastServiceDate: latestService.date,
        mileage: latestService.mileage || vehicle.mileage,
        nextServiceDate: latestService.nextServiceDate || vehicle.nextServiceDate,
      });

      this.logger.log(`Updated vehicle ${vehicleId} service dates`);
    }
  }

  async calculateNextServiceDate(vehicleId: string, currentServiceDate: Date): Promise<Date | null> {
    // Простой расчет - добавляем 6 месяцев (можно усложнить логику)
    const nextService = new Date(currentServiceDate);
    nextService.setMonth(nextService.getMonth() + 6);
    
    return nextService;
  }

  async notifyUpcomingServices(companyId: string): Promise<void> {
    const upcomingServices = await this.serviceHistoryDataService.getUpcomingServices(companyId, 7);
    
    if (upcomingServices.length > 0) {
      this.logger.log(`Found ${upcomingServices.length} upcoming services for company ${companyId}`);
      // TODO: Реализовать отправку уведомлений
    }
  }

  private sanitizeServiceHistoryData(serviceHistory: VehicleServiceHistory | null): Partial<VehicleServiceHistory> {
    if (!serviceHistory) return {};
    
    const { id, vehicleId, companyId, date, mileage, description, nextServiceDate, notes, createdAt, updatedAt } = serviceHistory;
    return { id, vehicleId, companyId, date, mileage, description, nextServiceDate, notes, createdAt, updatedAt };
  }
}
