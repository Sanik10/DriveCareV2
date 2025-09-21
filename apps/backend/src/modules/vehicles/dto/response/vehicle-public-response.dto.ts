// path: apps/backend/src/modules/vehicles/dto/response/vehicle-public-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EngineType } from '../../../../database/entities/vehicle.entity';
import { ModelBriefDto } from './vehicle-response.dto';

export class VehiclePublicResponseDto {
  @ApiProperty({ example: '7f0a1a3c-1111-2222-3333-444455556666' })
  id: string;

  @ApiProperty({ example: 'b2c3d4e5-1111-2222-3333-444455556666' })
  modelId: string;

  @ApiProperty({ example: 'c3d4e5f6-1111-2222-3333-444455556666' })
  vehicleTypeId: string;

  @ApiPropertyOptional({ example: 2020 })
  year?: number;

  @ApiPropertyOptional({ example: 'Белый' })
  color?: string;

  @ApiPropertyOptional({ enum: EngineType, example: EngineType.PETROL })
  engineType?: EngineType;

  @ApiPropertyOptional({ example: 2.0 })
  engineVolume?: number;

  @ApiPropertyOptional({ example: 50000 })
  mileage?: number;

  @ApiPropertyOptional({ example: '2024-01-15' })
  lastServiceDate?: Date;

  @ApiPropertyOptional({ example: '2024-07-15' })
  nextServiceDate?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  // Плоские поля для UI
  @ApiPropertyOptional({ example: 'BMW X5 (2020)' })
  displayName?: string;

  @ApiPropertyOptional({ example: 'BMW X5' })
  modelName?: string;

  @ApiPropertyOptional({ example: 'BMW' })
  brandName?: string;

  @ApiPropertyOptional({ example: 'Внедорожник' })
  vehicleTypeName?: string;

  @ApiPropertyOptional({ example: 5 })
  serviceHistoryCount?: number;

  @ApiPropertyOptional({ example: true })
  needsService?: boolean;

  @ApiPropertyOptional({ example: 15 })
  daysUntilService?: number;

  // Вложенная модель (бренд) без владения/контактов
  @ApiPropertyOptional({ type: () => ModelBriefDto })
  model?: ModelBriefDto;
}
