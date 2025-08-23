// path: apps/backend/src/modules/service-history/services/service-history-mapper.service.ts
import { Injectable } from '@nestjs/common';
import { VehicleServiceHistory } from '../../../database/entities/service-history.entity';
import { ServiceHistoryResponseDto } from '../dto/response/service-history-response.dto';
import { ServiceHistoryBasicInfo } from '../types/service-history.types';

@Injectable()
export class ServiceHistoryMapperService {
  mapToResponseDto(serviceHistory: VehicleServiceHistory): ServiceHistoryResponseDto {
    const dto: ServiceHistoryResponseDto = {
      id: serviceHistory.id,
      vehicleId: serviceHistory.vehicleId,
      companyId: serviceHistory.companyId,
      orderId: serviceHistory.orderId,
      date: serviceHistory.date,
      mileage: serviceHistory.mileage,
      description: serviceHistory.description,
      nextServiceDate: serviceHistory.nextServiceDate,
      notes: serviceHistory.notes,
      createdAt: serviceHistory.createdAt,
      updatedAt: serviceHistory.updatedAt,
    };

    if (serviceHistory.vehicle) {
      dto.vehicleInfo = this.formatVehicleInfo(serviceHistory.vehicle);
      dto.vehicleModelName = this.formatVehicleModelName(serviceHistory.vehicle);
      if (serviceHistory.vehicle.customer) {
        dto.customerName = this.formatCustomerName(serviceHistory.vehicle.customer);
      }
    }

    if (serviceHistory.nextServiceDate) {
      dto.isOverdue = serviceHistory.nextServiceDate < new Date();
      dto.daysUntilNextService = this.calculateDaysUntilNextService(serviceHistory.nextServiceDate);
    }

    if (serviceHistory.date) {
      dto.daysSinceService = this.calculateDaysSinceService(serviceHistory.date);
    }

    return dto;
  }

  mapArrayToResponseDto(serviceHistories: VehicleServiceHistory[]): ServiceHistoryResponseDto[] {
    return serviceHistories.map((sh) => this.mapToResponseDto(sh));
  }

  mapToBasicInfo(serviceHistory: VehicleServiceHistory): ServiceHistoryBasicInfo {
    return {
      id: serviceHistory.id,
      vehicleId: serviceHistory.vehicleId,
      vehicleInfo: serviceHistory.vehicle ? this.formatVehicleInfo(serviceHistory.vehicle) : '',
      date: serviceHistory.date,
      description: serviceHistory.description,
      mileage: serviceHistory.mileage,
      companyId: serviceHistory.companyId,
      isOverdue: serviceHistory.nextServiceDate ? serviceHistory.nextServiceDate < new Date() : false,
      daysUntilNextService: serviceHistory.nextServiceDate ? this.calculateDaysUntilNextService(serviceHistory.nextServiceDate) : undefined,
    };
  }

  mapToAuditData(serviceHistory: VehicleServiceHistory): any {
    return {
      id: serviceHistory.id,
      vehicleId: serviceHistory.vehicleId,
      date: serviceHistory.date,
      description: (serviceHistory.description || '').substring(0, 100),
      mileage: serviceHistory.mileage,
      companyId: serviceHistory.companyId,
    };
  }

  formatServiceDescription(serviceHistory: VehicleServiceHistory): string {
    let description = serviceHistory.description || '';
    if (description.length > 50) {
      description = description.substring(0, 50) + '...';
    }
    if (serviceHistory.mileage) {
      description += ` (${(serviceHistory.mileage || 0).toLocaleString()} км)`;
    }
    return description;
  }

  calculateServiceMetrics(serviceHistory: VehicleServiceHistory): any {
    const metrics = {
      isRecent: false,
      isOverdue: false,
      urgencyLevel: 'normal' as 'low' | 'normal' | 'high' | 'critical',
    };

    const now = new Date();
    const daysSinceService = this.calculateDaysSinceService(serviceHistory.date);
    metrics.isRecent = daysSinceService <= 30;

    if (serviceHistory.nextServiceDate) {
      metrics.isOverdue = serviceHistory.nextServiceDate < now;
      const daysUntilNext = this.calculateDaysUntilNextService(serviceHistory.nextServiceDate);
      if (daysUntilNext < 0) {
        metrics.urgencyLevel = 'critical';
      } else if (daysUntilNext <= 7) {
        metrics.urgencyLevel = 'high';
      } else if (daysUntilNext <= 30) {
        metrics.urgencyLevel = 'normal';
      } else {
        metrics.urgencyLevel = 'low';
      }
    }

    return metrics;
  }

  // Helpers
  private maskLicensePlate(plate?: string): string | undefined {
    if (!plate) return plate;
    // Keep first 1 and last 2 characters, mask the middle with dots
    if (plate.length <= 3) return plate[0] + '••';
    const first = plate[0];
    const last2 = plate.slice(-2);
    return `${first}••${last2}`;
  }

  private formatVehicleInfo(vehicle: any): string {
    const parts: string[] = [];

    if (vehicle.model?.brand?.name) {
      parts.push(vehicle.model.brand.name);
    }
    if (vehicle.model?.name) {
      parts.push(vehicle.model.name);
    }

    if (vehicle.licensePlate) {
      parts.push(`(${this.maskLicensePlate(vehicle.licensePlate)})`);
    } else if (vehicle.vin) {
      const last6 = String(vehicle.vin).slice(-6);
      parts.push(`(VIN: ***${last6})`);
    }

    return parts.join(' ') || `Автомобиль #${String(vehicle.id).substring(0, 8)}`;
  }

  private formatVehicleModelName(vehicle: any): string {
    const parts: string[] = [];
    if (vehicle.model?.brand?.name) {
      parts.push(vehicle.model.brand.name);
    }
    if (vehicle.model?.name) {
      parts.push(vehicle.model.name);
    }
    return parts.join(' ') || 'Модель не указана';
  }

  private formatCustomerName(customer: any): string {
    if (customer.type === 'company' && customer.companyName) {
      return customer.companyName;
    }
    if (customer.firstName && customer.lastName) {
      return `${customer.firstName} ${customer.lastName}`;
    }
    return customer.firstName || customer.lastName || customer.companyName || customer.email;
  }

  private calculateDaysUntilNextService(nextServiceDate: Date): number {
    const now = new Date();
    const timeDiff = nextServiceDate.getTime() - now.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }

  private calculateDaysSinceService(serviceDate: Date): number {
    const now = new Date();
    const timeDiff = now.getTime() - serviceDate.getTime();
    return Math.floor(timeDiff / (1000 * 3600 * 24));
  }
}
