// src/modules/inventory/dto/response/stock-summary-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class StockSummaryResponseDto {
  @ApiProperty({ description: 'Общее количество позиций', example: 1250 })
  totalParts: number;

  @ApiProperty({ description: 'Общая стоимость склада', example: 5750000.00 })
  totalValue: number;

  @ApiProperty({ description: 'Количество позиций с низким остатком', example: 23 })
  lowStockCount: number;

  @ApiProperty({ description: 'Количество позиций отсутствующих на складе', example: 5 })
  outOfStockCount: number;

  @ApiProperty({ description: 'Средняя стоимость позиции', example: 4600.00 })
  averagePartValue: number;

  @ApiProperty({ 
    description: 'Топ категории по количеству',
    example: [
      { categoryName: 'Тормозная система', partCount: 45, totalValue: 850000 },
      { categoryName: 'Двигатель', partCount: 38, totalValue: 1200000 }
    ]
  })
  topCategories: Array<{
    categoryId: string;
    categoryName: string;
    partCount: number;
    totalValue: number;
  }>;

  @ApiProperty({ description: 'Количество движений за последние 7 дней', example: 156 })
  recentMovements: number;

  @ApiProperty({ 
    description: 'Статистика по статусам',
    example: {
      inStock: 1180,
      lowStock: 23,
      outOfStock: 5,
      overstock: 42
    }
  })
  statusBreakdown: {
    inStock: number;
    lowStock: number;
    outOfStock: number;
    overstock: number;
  };
}
