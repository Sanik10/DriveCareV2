// path: apps/backend/src/modules/vehicles/services/vehicles-mapper.service.ts
import { Injectable } from '@nestjs/common';
import { Vehicle } from '../../../database/entities/vehicle.entity';
import { VehicleResponseDto } from '../dto/response/vehicle-response.dto';
import { VehicleBasicInfo, VehicleWithDetails } from '../types/vehicles.types';

@Injectable()
export class VehiclesMapperService {
  
  mapToResponseDto(vehicle: Vehicle): VehicleResponseDto {
    const dto: VehicleResponseDto = {
      id: vehicle.id,
      customerId: vehicle.customerId,
      companyId: vehicle.companyId,
      modelId: vehicle.modelId,
      vehicleTypeId: vehicle.vehicleTypeId,
      vin: vehicle.vin,
      licensePlate: vehicle.licensePlate,
      year: vehicle.year,
      color: vehicle.color,
      engineType: vehicle.engineType,
      engineVolume: vehicle.engineVolume,
      mileage: vehicle.mileage,
      lastServiceDate: vehicle.lastServiceDate,
      nextServiceDate: vehicle.nextServiceDate,
      notes: vehicle.notes,
      createdAt: vehicle.createdAt,
      updatedAt: vehicle.updatedAt,
      displayName: this.formatVehicleDisplayName(vehicle),
    };

    // Дополнительные поля из relations
    if (vehicle.customer) {
      dto.customerName = this.formatCustomerName(vehicle.customer);
    }

    if (vehicle.model) {
      dto.modelName = vehicle.model.name;
      if (vehicle.model.brand) {
        dto.brandName = vehicle.model.brand.name;
        dto.modelName = `${vehicle.model.brand.name} ${vehicle.model.name}`;
      }
    }

    if (vehicle.vehicleType) {
      dto.vehicleTypeName = vehicle.vehicleType.name;
    }

    if (vehicle.serviceHistory) {
      dto.serviceHistoryCount = vehicle.serviceHistory.length;
    }

    // Проверка необходимости ТО
    if (vehicle.nextServiceDate) {
      const today = new Date();
      const nextService = new Date(vehicle.nextServiceDate);
      dto.needsService = nextService <= today;
      
      const diffTime = nextService.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      dto.daysUntilService = diffDays;
    }

    return dto;
  }

  mapArrayToResponseDto(vehicles: Vehicle[]): VehicleResponseDto[] {
    return vehicles.map(vehicle => this.mapToResponseDto(vehicle));
  }

  mapToBasicInfo(vehicle: Vehicle): VehicleBasicInfo {
    return {
      id: vehicle.id,
      displayName: this.formatVehicleDisplayName(vehicle),
      licensePlate: vehicle.licensePlate,
      vin: vehicle.vin,
      year: vehicle.year,
      customerId: vehicle.customerId,
      customerName: vehicle.customer ? this.formatCustomerName(vehicle.customer) : '',
      companyId: vehicle.companyId,
      isActive: true, // Assuming active if not deleted
    };
  }

  mapToWithDetails(vehicle: Vehicle): VehicleWithDetails {
    const basicInfo = this.mapToBasicInfo(vehicle);
    
    return {
      ...basicInfo,
      model: {
        id: vehicle.modelId,
        name: vehicle.model?.name || '',
        brand: {
          id: vehicle.model?.brandId || '',
          name: vehicle.model?.brand?.name || '',
        },
      },
      vehicleType: {
        id: vehicle.vehicleTypeId,
        name: vehicle.vehicleType?.name || '',
      },
      serviceHistoryCount: vehicle.serviceHistory?.length || 0,
      lastServiceDate: vehicle.lastServiceDate,
      nextServiceDate: vehicle.nextServiceDate,
      mileage: vehicle.mileage,
    };
  }

  mapToSelectOption(vehicle: Vehicle): { value: string; label: string; disabled?: boolean } {
    return {
      value: vehicle.id,
      label: this.formatVehicleDisplayName(vehicle),
      disabled: vehicle.isDeleted,
    };
  }

  formatVehicleDisplayName(vehicle: Vehicle): string {
    const parts: string[] = [];

    // Бренд и модель
    if (vehicle.model) {
      if (vehicle.model.brand) {
        parts.push(`${vehicle.model.brand.name} ${vehicle.model.name}`);
      } else {
        parts.push(vehicle.model.name);
      }
    }

    // Год
    if (vehicle.year) {
      parts.push(`(${vehicle.year})`);
    }

    // Номер или VIN
    if (vehicle.licensePlate) {
      parts.push(`[${vehicle.licensePlate}]`);
    } else if (vehicle.vin) {
      parts.push(`[VIN: ${vehicle.vin.slice(-6)}]`); // Последние 6 символов VIN
    }

    return parts.length > 0 ? parts.join(' ') : `Автомобиль ${vehicle.id.slice(-8)}`;
  }

  formatVehicleShortInfo(vehicle: Vehicle): string {
    if (vehicle.licensePlate) {
      return vehicle.licensePlate;
    }
    
    if (vehicle.vin) {
      return `VIN: ${vehicle.vin.slice(-6)}`;
    }

    if (vehicle.model?.name) {
      return vehicle.model.name;
    }

    return `ID: ${vehicle.id.slice(-8)}`;
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
}
