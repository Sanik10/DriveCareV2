// src/modules/inventory/dto/response/low-stock-alerts-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AlertPriority } from '../../types/inventory.types';

class LowStockItem {
  @ApiProperty({ description: 'ID запчасти' })
  partId: string;

  @ApiProperty({ description: 'Название запчасти' })
  partName: string;

  @ApiPropertyOptional({ description: 'Номер запчасти' })
  partNumber?: string;

  @ApiProperty({ description: 'Текущий остаток', example: 2 })
  currentQuantity: number;

  @ApiProperty({ description: 'Минимальный остаток', example: 5 })
  minQuantity: number;

  @ApiProperty({ description: 'Нехватка', example: 3 })
  shortage: number;

  @ApiProperty({ description: 'Категория' })
  categoryName: string;

  @ApiPropertyOptional({ description: 'Местоположение' })
  location?: string;

  @ApiPropertyOptional({ description: 'Дата последнего движения' })
  lastMovementDate?: Date;

  @ApiProperty({ description: 'Приоритет', enum: ['low', 'medium', 'high', 'critical'] })
  priority: AlertPriority;

  @ApiPropertyOptional({ description: 'Прогноз исчерпания запаса (дни)', example: 7 })
  estimatedRunOutDays?: number;
}

export class LowStockAlertsResponseDto {
  @ApiProperty({ 
    description: 'Список позиций с низким остатком', 
    type: [LowStockItem] 
  })
  alerts: LowStockItem[];

  @ApiProperty({ 
    description: 'Общее количество уведомлений', 
    example: 23 
  })
  totalAlerts: number;

  @ApiProperty({ 
    description: 'Критичные уведомления', 
    example: 3 
  })
  criticalAlerts: number;

  @ApiProperty({ 
    description: 'Высокий приоритет', 
    example: 8 
  })
  highPriorityAlerts: number;

  @ApiProperty({ 
    description: 'Общая стоимость недостающих запчастей', 
    example: 125000.00 
  })
  totalShortageValue: number;

  @ApiProperty({ 
    description: 'Дата последнего обновления уведомлений' 
  })
  lastUpdated: Date;
}
