// src/modules/orders/dto/response/order-service-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ServiceInfo {
  @ApiProperty({ description: 'ID услуги' })
  id: string;

  @ApiProperty({ description: 'Название услуги' })
  name: string;

  @ApiPropertyOptional({ description: 'Описание услуги' })
  description?: string;

  @ApiProperty({ description: 'Базовая цена услуги' })
  price: number;

  @ApiProperty({ description: 'Длительность в минутах' })
  durationMinutes: number;
}

export class OrderServiceResponseDto {
  @ApiProperty({ description: 'ID записи услуги в заказе' })
  id: string;

  @ApiProperty({ description: 'ID заказа' })
  orderId: string;

  @ApiProperty({ description: 'ID услуги' })
  serviceId: string;

  @ApiProperty({ description: 'Цена услуги для данного заказа' })
  price: number;

  @ApiProperty({ description: 'Количество', example: 1 })
  quantity: number;

  @ApiProperty({ description: 'Процент скидки', example: 5.5 })
  discountPercent: number;

  @ApiProperty({ description: 'Общая сумма с учетом количества и скидки' })
  totalAmount: number;

  @ApiProperty({ description: 'Статус выполнения услуги', enum: ['planned', 'in_progress', 'completed'] })
  status: string;

  @ApiPropertyOptional({ description: 'ID механика, выполняющего услугу' })
  mechanicId?: string;

  @ApiPropertyOptional({ description: 'Время начала выполнения' })
  startTime?: Date;

  @ApiPropertyOptional({ description: 'Время завершения выполнения' })
  endTime?: Date;

  @ApiPropertyOptional({ description: 'Заметки по выполнению услуги' })
  notes?: string;

  @ApiProperty({ description: 'Дата создания записи' })
  createdAt: Date;

  @ApiProperty({ description: 'Дата обновления записи' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Информация об услуге' })
  service?: ServiceInfo;
}
