// path: apps/backend/src/modules/service-history/dto/response/paginated-service-history-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServiceHistoryResponseDto } from './service-history-response.dto';

export class PaginatedServiceHistoryResponseDto {
  @ApiProperty({ type: [ServiceHistoryResponseDto] })
  items: ServiceHistoryResponseDto[];

  @ApiProperty({ example: 150 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  limit: number;

  @ApiProperty({ example: 8 })
  totalPages: number;

  @ApiProperty({ example: true })
  hasNext: boolean;

  @ApiProperty({ example: false })
  hasPrev: boolean;

  @ApiPropertyOptional({ 
    description: 'Мета-информация для UI',
    example: {
      totalRecords: 150,
      upcomingServices: 12,
      overdueServices: 3,
      averageServiceInterval: 180
    }
  })
  meta?: {
    totalRecords: number;
    upcomingServices: number;
    overdueServices: number;
    averageServiceInterval: number;
  };
}
