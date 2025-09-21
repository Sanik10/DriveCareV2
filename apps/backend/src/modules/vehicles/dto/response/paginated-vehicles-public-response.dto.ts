// path: apps/backend/src/modules/vehicles/dto/response/paginated-vehicles-public-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { VehiclePublicResponseDto } from './vehicle-public-response.dto';

export class PaginatedVehiclesPublicResponseDto {
  @ApiProperty({ type: [VehiclePublicResponseDto] })
  items: VehiclePublicResponseDto[];

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

  // Публичная выдача метаданных минимальная (без company-specific статистики)
  @ApiProperty({ required: false, nullable: true, example: null })
  meta?: Record<string, unknown> | null;
}
