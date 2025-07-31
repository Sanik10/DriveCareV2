// src/modules/inventory/stock-movements/dto/response/movement-summary-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class MovementSummaryResponseDto {
  @ApiProperty({ description: 'Период анализа' })
  period: {
    from: Date;
    to: Date;
  };

  @ApiProperty({ description: 'Общая статистика' })
  overview: {
    totalMovements: number;
    totalValue: number;
    netQuantityChange: number;
  };

  @ApiProperty({ description: 'Статистика по приходу' })
  receipts: {
    count: number;
    totalQuantity: number;
    totalValue: number;
    averageUnitCost: number;
  };

  @ApiProperty({ description: 'Статистика по расходу' })
  issues: {
    count: number;
    totalQuantity: number;
    totalValue: number;
    averageUnitCost: number;
  };

  @ApiProperty({ description: 'Статистика по корректировкам' })
  adjustments: {
    count: number;
    positiveAdjustments: number;
    negativeAdjustments: number;
    netAdjustment: number;
  };

  @ApiProperty({ description: 'Топ запчастей по движениям' })
  topParts: Array<{
    partId: string;
    partName: string;
    partNumber?: string;
    movementCount: number;
    netQuantity: number;
    totalValue: number;
  }>;

  @ApiProperty({ description: 'Топ категории по движениям' })
  topCategories: Array<{
    categoryId: string;
    categoryName: string;
    movementCount: number;
    totalValue: number;
  }>;

  @ApiProperty({ description: 'Активность по дням' })
  dailyActivity: Array<{
    date: string;
    movements: number;
    receipts: number;
    issues: number;
    value: number;
  }>;
}
