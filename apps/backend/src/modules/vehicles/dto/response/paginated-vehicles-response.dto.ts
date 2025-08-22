// path: apps/backend/src/modules/vehicles/dto/response/paginated-vehicles-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { VehicleResponseDto } from './vehicle-response.dto';

export class PaginatedVehiclesResponseDto {
  @ApiProperty({ type: [VehicleResponseDto] })
  items: VehicleResponseDto[];

  @ApiProperty({ example: 150 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 8 })
  totalPages: number;

  @ApiProperty({ example: true })
  hasNext: boolean;

  @ApiProperty({ example: false })
  hasPrev: boolean;

  @ApiProperty({ 
    example: {
      totalByEngineType: {
        petrol: 80,
        diesel: 45,
        electric: 15,
        hybrid: 10
      },
      averageMileage: 75000,
      vehiclesNeedingService: 12,
      averageAge: 5.2
    }
  })
  meta?: {
    totalByEngineType: Record<string, number>;
    averageMileage: number;
    vehiclesNeedingService: number;
    averageAge: number;
  };
}
