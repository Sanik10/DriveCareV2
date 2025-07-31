// src/modules/inventory/stock-movements/dto/response/paginated-movements-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { StockMovementResponseDto } from './movement-response.dto';

export class PaginatedMovementsResponseDto {
  @ApiProperty({ 
    description: 'Список движений', 
    type: [StockMovementResponseDto] 
  })
  items: StockMovementResponseDto[];

  @ApiProperty({ 
    description: 'Общее количество движений', 
    example: 1250 
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
    example: 50 
  })
  totalPages: number;

  @ApiProperty({ 
    description: 'Сводная информация по текущей странице'
  })
  summary: {
    receipts: number;
    issues: number;
    adjustments: number;
    totalValue: number;
    netQuantityChange: number;
  };

  @ApiProperty({ 
    description: 'Информация о фильтрах'
  })
  filters: {
    dateRange?: { from: Date; to: Date };
    partId?: string;
    type?: string;
    hasActiveFilters: boolean;
  };
}
