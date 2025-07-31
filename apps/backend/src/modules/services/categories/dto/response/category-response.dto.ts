import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CategoryResponseDto {
  @ApiProperty({
    description: 'ID категории',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  id: string;

  @ApiPropertyOptional({
    description: 'ID компании (null для глобальных категорий)',
    example: '123e4567-e89b-12d3-a456-426614174001'
  })
  companyId: string | null;

  @ApiProperty({
    description: 'Название категории',
    example: 'Техническое обслуживание'
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Описание категории',
    example: 'Плановое техническое обслуживание автомобилей'
  })
  description?: string;

  @ApiProperty({
    description: 'Является ли категория глобальной',
    example: false
  })
  isGlobal: boolean;

  @ApiPropertyOptional({
    description: 'Количество услуг в категории',
    example: 15
  })
  servicesCount?: number;

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
