// path: apps/backend/src/modules/service-history/dto/response/service-history-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ServiceHistoryResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174001' })
  vehicleId: string;

  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174002' })
  companyId: string;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174003' })
  orderId?: string;

  @ApiProperty({ example: '2024-01-15' })
  date: Date;

  @ApiPropertyOptional({ example: 75000 })
  mileage?: number;

  @ApiProperty({ example: 'Замена моторного масла Shell 5W-30, замена масляного фильтра' })
  description: string;

  @ApiPropertyOptional({ example: '2024-07-15' })
  nextServiceDate?: Date;

  @ApiPropertyOptional({ example: 'Рекомендуется замена тормозных колодок при следующем ТО' })
  notes?: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  // 🔥 ДОБАВЛЕНО: Дополнительные поля для UI
  @ApiPropertyOptional({ example: 'BMW X5 (А123БВ456)' })
  vehicleInfo?: string;

  @ApiPropertyOptional({ example: 'Иван Иванов' })
  customerName?: string;

  @ApiPropertyOptional({ example: 'BMW X5' })
  vehicleModelName?: string;

  @ApiPropertyOptional({ example: false })
  isOverdue?: boolean;

  @ApiPropertyOptional({ example: 45 })
  daysUntilNextService?: number;

  @ApiPropertyOptional({ example: 5000 })
  mileageSinceLastService?: number;

  @ApiPropertyOptional({ example: 180 })
  daysSinceService?: number;
}
