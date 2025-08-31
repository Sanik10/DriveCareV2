// path: apps/backend/src/modules/vehicles/dto/response/vehicle-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EngineType } from '../../../../database/entities/vehicle.entity';

export class BrandBriefDto {
  @ApiProperty({ example: 'b1a2b3c4-0000-1111-2222-333344445555' })
  id: string;

  @ApiProperty({ example: 'BMW' })
  name: string;
}

export class ModelBriefDto {
  @ApiProperty({ example: 'm1a2b3c4-0000-1111-2222-333344445555' })
  id: string;

  @ApiProperty({ example: 'X5' })
  name: string;

  @ApiPropertyOptional({ type: () => BrandBriefDto })
  brand?: BrandBriefDto;
}

export class OwnerBriefDto {
  @ApiProperty({ example: 'c1a2b3c4-0000-1111-2222-333344445555' })
  id: string;

  @ApiPropertyOptional({ example: 'Иван' })
  firstName?: string;

  @ApiPropertyOptional({ example: 'Иванов' })
  lastName?: string;

  @ApiPropertyOptional({ example: 'ООО "Такси-тур"' })
  companyName?: string;

  @ApiPropertyOptional({ example: 'owner@example.com' })
  email?: string;

  @ApiPropertyOptional({ example: '+7 999 123-45-67' })
  phone?: string;
}

export class VehicleResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174001' })
  customerId: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174002' })
  companyId: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174003' })
  modelId: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174004' })
  vehicleTypeId: string;

  @ApiPropertyOptional({ example: 'WBAFR9C50DD123456' })
  vin?: string;

  @ApiPropertyOptional({ example: 'А123БВ456' })
  licensePlate?: string;

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

  @ApiPropertyOptional({ example: 'Установлена сигнализация' })
  notes?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  // Дополнительные поля для UI (плоские)
  @ApiPropertyOptional({ example: 'BMW X5 (А123БВ456)' })
  displayName?: string;

  @ApiPropertyOptional({ example: 'Иван Иванов' })
  customerName?: string;

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

  // Вложенные объекты для фронтенда
  @ApiPropertyOptional({ type: () => ModelBriefDto })
  model?: ModelBriefDto;

  @ApiPropertyOptional({ type: () => OwnerBriefDto })
  customer?: OwnerBriefDto;
}
