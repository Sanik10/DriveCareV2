// path: apps/backend/src/modules/vehicles-catalogue/dto/types/type-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TypeResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'Седан' })
  name: string;

  @ApiPropertyOptional({ example: 'Легковой автомобиль с четырьмя дверями и отдельным багажным отделением' })
  description?: string;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional({ example: 89 })
  vehiclesCount?: number;
}
