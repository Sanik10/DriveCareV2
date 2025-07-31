// src/modules/inventory/dto/response/paginated-inventory-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { InventoryResponseDto } from './inventory-response.dto';

export class PaginatedInventoryResponseDto {
  @ApiProperty({ 
    description: 'Список позиций склада', 
    type: [InventoryResponseDto] 
  })
  items: InventoryResponseDto[];

  @ApiProperty({ 
    description: 'Общее количество позиций', 
    example: 150 
  })
  total: number;

  @ApiProperty({ 
    description: 'Номер страницы', 
    example: 1 
  })
  page: number;

  @ApiProperty({ 
    description: 'Размер страницы', 
    example: 25 
  })
  limit: number;

  @ApiProperty({ 
    description: 'Общее количество страниц', 
    example: 6 
  })
  totalPages: number;

  @ApiProperty({ 
    description: 'Есть ли позиции с низким остатком', 
    example: true 
  })
  hasLowStock: boolean;

  @ApiProperty({ 
    description: 'Общая стоимость всех позиций на складе', 
    example: 2850000.00 
  })
  totalValue: number;
}
