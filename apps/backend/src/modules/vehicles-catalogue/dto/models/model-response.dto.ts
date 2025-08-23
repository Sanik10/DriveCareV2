// path: apps/backend/src/modules/vehicles-catalogue/dto/models/model-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BrandResponseDto } from '../brands/brand-response.dto';

export class ModelResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174001' })
  brandId: string;

  @ApiProperty({ example: 'Corolla' })
  name: string;

  @ApiPropertyOptional({ example: 1995 })
  yearFrom?: number;

  @ApiPropertyOptional({ example: 2023 })
  yearTo?: number;

  @ApiPropertyOptional({ example: 'Седан' })
  class?: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional({ type: BrandResponseDto })
  brand?: BrandResponseDto;

  @ApiPropertyOptional({ example: 'Toyota Corolla' })
  fullName?: string;

  @ApiPropertyOptional({ example: 125 })
  vehiclesCount?: number;
}
