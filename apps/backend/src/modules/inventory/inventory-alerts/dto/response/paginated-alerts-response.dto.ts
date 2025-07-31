// src/modules/inventory/inventory-alerts/dto/response/paginated-alerts-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { AlertResponseDto } from './alert-response.dto';

export class PaginatedAlertsResponseDto {
  @ApiProperty({ 
    description: 'Список уведомлений', 
    type: [AlertResponseDto] 
  })
  items: AlertResponseDto[];

  @ApiProperty({ description: 'Общее количество уведомлений' })
  total: number;

  @ApiProperty({ description: 'Номер страницы' })
  page: number;

  @ApiProperty({ description: 'Размер страницы' })
  limit: number;

  @ApiProperty({ description: 'Общее количество страниц' })
  totalPages: number;

  @ApiProperty({ description: 'Сводная информация по странице' })
  summary: {
    active: number;
    dismissed: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    estimatedTotalShortageValue: number;
  };

  @ApiProperty({ description: 'Информация о фильтрах' })
  filters: {
    type?: string;
    priority?: string;
    isActive?: boolean;
    dateRange?: { from: Date; to: Date };
    hasActiveFilters: boolean;
  };

  @ApiProperty({ description: 'Статистика по типам' })
  typeStats: Array<{
    type: string;
    count: number;
    percentage: number;
  }>;

  @ApiProperty({ description: 'Дата последнего обновления' })
  lastUpdated: Date;
}
