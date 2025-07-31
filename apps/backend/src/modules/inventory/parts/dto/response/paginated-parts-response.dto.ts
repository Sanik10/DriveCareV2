// src/modules/inventory/parts/dto/response/paginated-parts-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { PartResponseDto } from './part-response.dto';

export class PaginatedPartsResponseDto {
  @ApiProperty({ 
    description: 'Список запчастей',
    type: [PartResponseDto]
  })
  items: PartResponseDto[];

  @ApiProperty({ description: 'Общее количество запчастей' })
  total: number;

  @ApiProperty({ description: 'Текущая страница' })
  page: number;

  @ApiProperty({ description: 'Размер страницы' })
  limit: number;

  @ApiProperty({ description: 'Общее количество страниц' })
  totalPages: number;

  @ApiProperty({ description: 'Есть ли следующая страница' })
  hasNext: boolean;

  @ApiProperty({ description: 'Есть ли предыдущая страница' })
  hasPrev: boolean;

  @ApiProperty({ description: 'Общая стоимость запчастей на странице' })
  totalValue: number;

  @ApiProperty({ description: 'Средняя цена запчасти' })
  averagePrice: number;

  @ApiProperty({ description: 'Количество активных запчастей' })
  activeCount: number;

  @ApiProperty({ description: 'Количество неактивных запчастей' })
  inactiveCount: number;
}
