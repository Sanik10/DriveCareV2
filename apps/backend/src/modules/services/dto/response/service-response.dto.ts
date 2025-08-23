// path: apps/backend/src/modules/services/dto/response/service-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ServiceResponseDto {
  @ApiProperty({
    description: 'ID услуги',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  id: string;

  @ApiProperty({
    description: 'ID компании',
    example: '123e4567-e89b-12d3-a456-426614174001'
  })
  companyId: string;

  @ApiProperty({
    description: 'ID категории услуги',
    example: '123e4567-e89b-12d3-a456-426614174002'
  })
  categoryId: string;

  @ApiProperty({
    description: 'Название услуги',
    example: 'Замена масла'
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Описание услуги',
    example: 'Замена моторного масла с фильтром'
  })
  description?: string;

  @ApiProperty({
    description: 'Цена услуги',
    example: 2500.00
  })
  price: number;

  @ApiProperty({
    description: 'Длительность выполнения услуги в минутах',
    example: 60
  })
  durationMinutes: number;

  @ApiProperty({
    description: 'Активна ли услуга',
    example: true
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Дата создания',
    example: '2024-01-15T10:00:00Z'
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Дата последнего обновления',
    example: '2024-01-15T10:00:00Z'
  })
  updatedAt: Date;
}
